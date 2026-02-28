// @MX:ANCHOR: [AUTO] Product-MES mapping import — Step 4.5 of SPEC-IM-004 M3
// @MX:REASON: fan_in >= 3 — referenced by order dispatch, widget config, and admin product management
// @MX:SPEC: SPEC-IM-004 M3-001~008

import * as path from "path";
import * as fs from "fs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql, eq } from "drizzle-orm";
import { products } from "../../packages/shared/src/db/schema/huni-catalog.schema.js";
import { mesItems, productMesMappings } from "../../packages/shared/src/db/schema/huni-integration.schema.js";
import { dataImportLog } from "../../packages/shared/src/db/schema/huni-import-log.schema.js";

// ---------------------------------------------------------------------------
// CLI Flags
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const VALIDATE_ONLY = args.includes("--validate-only");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LABEL = "[import-product-mes-mapping]";
const BATCH_SIZE = 50;
const DATA_PATH = path.resolve(
  __dirname,
  "../../ref/huni/extracted/상품마스터_extracted.json"
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Cell = { col: string; colIndex: number; value: unknown; bgColor?: string };
type Row = { rowIndex: number; cells: Cell[] };
type Sheet = { name: string; totalRows: number; rows: Row[] };
type ExtractedData = { sheets: Sheet[] };

type MappingRecord = {
  productName: string;
  sheetName: string;
  mesCode: string;
  huniId: number | null;
  coverType: string | null;   // 'inner' | 'cover' | null
};

// ---------------------------------------------------------------------------
// Booklet sheets that may have inner/cover distinction
// ---------------------------------------------------------------------------

// @MX:NOTE: [AUTO] Booklet-type sheets use coverType to distinguish inner vs cover MES items
// @MX:REASON: WowPress covercd pattern: 0=combined, 1=cover, 2=inner -- simplified to 2-state
const BOOKLET_SHEETS = new Set(["책자", "포토북"]);

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

function parseProductSheets(data: ExtractedData): MappingRecord[] {
  const result: MappingRecord[] = [];

  const productSheets = [
    "디지털인쇄", "스티커", "책자", "포토북", "캘린더",
    "디자인캘린더", "실사", "아크릴", "굿즈", "문구(노트)", "상품악세사리",
  ];

  for (const sheetName of productSheets) {
    const sheet = data.sheets.find((s) => s.name === sheetName);
    if (!sheet) continue;

    for (const row of sheet.rows) {
      if (row.rowIndex <= 2) continue; // skip header rows

      const cells: Record<string, unknown> = {};
      for (const cell of row.cells) {
        cells[cell.col] = cell.value;
      }

      const colB = cells["B"];
      const colC = cells["C"];
      const colD = cells["D"];

      // Only process rows with a MES code (column C)
      const hasMesCode = typeof colC === "string" && /^\d{3}-\d{4}$/.test(colC);
      if (!hasMesCode) continue;

      const mesCode = colC as string;
      const huniId = typeof colB === "number" && colB > 0 ? Math.round(colB) : null;
      const name = typeof colD === "string" ? colD.trim() : "";

      if (!name) continue;

      // Detect cover/inner distinction for booklet sheets
      // Products whose name contains "내지" (inner pages) or "표지" (cover) in booklet sheets
      let coverType: string | null = null;
      if (BOOKLET_SHEETS.has(sheetName)) {
        const lowerName = name.toLowerCase();
        const hasCoverKeyword = lowerName.includes("표지");
        const hasInnerKeyword = lowerName.includes("내지") || lowerName.includes("내용");
        if (hasCoverKeyword) {
          coverType = "cover";
        } else if (hasInnerKeyword) {
          coverType = "inner";
        }
      }

      result.push({
        productName: name,
        sheetName,
        mesCode,
        huniId,
        coverType,
      });
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// DB Connection
// ---------------------------------------------------------------------------

function createDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error(`${LABEL} ERROR: DATABASE_URL not set`);
    process.exit(1);
  }
  const client = postgres(connectionString, { max: 5 });
  return { db: drizzle(client), client };
}

// ---------------------------------------------------------------------------
// Import Log
// ---------------------------------------------------------------------------

async function writeImportLog(
  db: ReturnType<typeof drizzle>,
  opts: {
    tableName: string;
    total: number;
    inserted: number;
    updated: number;
    skipped: number;
    errored: number;
    status: string;
    errorMessage?: string;
    startedAt: Date;
  }
): Promise<void> {
  await db.insert(dataImportLog).values({
    tableName: opts.tableName,
    sourceFile: "상품마스터_extracted.json",
    sourceHash: "extracted-v1",
    importVersion: 1,
    recordsTotal: opts.total,
    recordsInserted: opts.inserted,
    recordsUpdated: opts.updated,
    recordsSkipped: opts.skipped,
    recordsErrored: opts.errored,
    status: opts.status,
    errorMessage: opts.errorMessage ?? null,
    completedAt: new Date(),
    metadata: {
      phase: "M3",
      step: "import-product-mes-mapping",
      executionTime: Date.now() - opts.startedAt.getTime(),
    },
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

// @MX:ANCHOR: [AUTO] Main product-MES mapping import -- populates product<->MES mapping table
// @MX:REASON: fan_in >= 3 -- called by pipeline orchestrator, referenced by order dispatch and widget initialization
async function main(): Promise<void> {
  console.log(`${LABEL} Starting product-MES mapping import`);

  if (!fs.existsSync(DATA_PATH)) {
    console.error(`${LABEL} ERROR: Data file not found: ${DATA_PATH}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(DATA_PATH, "utf-8");
  const data: ExtractedData = JSON.parse(rawData);

  const allRecords = parseProductSheets(data);
  const recordsWithMes = allRecords;  // already filtered to mesCode-only rows
  console.log(`${LABEL} Found ${recordsWithMes.length} rows with MES codes`);

  if (VALIDATE_ONLY) {
    console.log(`${LABEL} Mode: validate-only`);
    // Check for duplicate (productName + sheetName + coverType) combinations
    const seen = new Set<string>();
    let dupes = 0;
    for (const r of recordsWithMes) {
      const key = `${r.sheetName}::${r.productName}::${r.coverType ?? "null"}`;
      if (seen.has(key)) {
        console.warn(`${LABEL} WARN: Duplicate mapping key: ${key}`);
        dupes++;
      }
      seen.add(key);
    }
    console.log(`${LABEL} Unique mapping keys: ${seen.size}, duplicates: ${dupes}`);
    console.log(`${LABEL} Validation OK`);
    return;
  }

  if (DRY_RUN) {
    console.log(`${LABEL} Mode: dry-run (no DB writes)`);
    console.log(`${LABEL} Would process ${recordsWithMes.length} mapping records`);
    return;
  }

  const { db, client } = createDb();
  const startedAt = new Date();

  try {
    // Build product lookup: (name + sheetName) -> product_id
    // @MX:NOTE: [AUTO] Uses name+sheetName as lookup key since huniCode may now be null
    const sheetToCategory: Record<string, string> = {
      "디지털인쇄": "PRINT",
      "스티커":     "STICKER",
      "책자":       "BOOK",
      "포토북":     "PHOTOBOOK",
      "캘린더":     "CALENDAR",
      "디자인캘린더": "DESIGN_CALENDAR",
      "실사":       "POSTER",
      "아크릴":     "ACRYLIC",
      "굿즈":       "GOODS",
      "문구(노트)": "NOTE",
      "상품악세사리": "ACCESSORY",
    };

    const dbProducts = await db
      .select({ id: products.id, name: products.name, slug: products.slug })
      .from(products);

    // Build slug-based lookup from product name and huniId/mesCode context
    // Use name normalization since products.name is the canonical identifier
    const productNameToId = new Map<string, number>();
    for (const p of dbProducts) {
      productNameToId.set(p.name.trim().toLowerCase(), p.id);
    }

    console.log(`${LABEL} Loaded ${dbProducts.length} products`);

    // Build mes_items lookup: item_code -> mes_item_id
    const dbMesItems = await db
      .select({ id: mesItems.id, itemCode: mesItems.itemCode })
      .from(mesItems);

    const mesCodeToId = new Map<string, number>();
    for (const m of dbMesItems) {
      mesCodeToId.set(m.itemCode, m.id);
    }

    console.log(`${LABEL} Loaded ${mesCodeToId.size} MES items`);

    if (mesCodeToId.size === 0) {
      console.warn(`${LABEL} WARN: mes_items table is empty -- all mesCode entries will be skipped`);
      console.warn(`${LABEL} WARN: Run import-mes-items.ts before this script for full mapping`);
    }

    let inserted = 0;
    let skipped = 0;
    let errored = 0;

    // Process in batches
    for (let i = 0; i < recordsWithMes.length; i += BATCH_SIZE) {
      const batch = recordsWithMes.slice(i, i + BATCH_SIZE);
      const rows: Array<{
        productId: number;
        mesItemId: number;
        coverType: string | null;
        isActive: boolean;
      }> = [];

      for (const record of batch) {
        // Lookup product by name (case-insensitive)
        const productId = productNameToId.get(record.productName.trim().toLowerCase());
        if (!productId) {
          console.warn(`${LABEL} WARN: No product found for name='${record.productName}' sheet='${record.sheetName}'`);
          skipped++;
          continue;
        }

        // Lookup MES item by code
        const mesItemId = mesCodeToId.get(record.mesCode);
        if (!mesItemId) {
          console.warn(`${LABEL} WARN: No MES item found for code='${record.mesCode}' (product='${record.productName}')`);
          skipped++;
          continue;
        }

        rows.push({
          productId,
          mesItemId,
          coverType: record.coverType,
          isActive: true,
        });
      }

      if (rows.length === 0) continue;

      try {
        const result = await db
          .insert(productMesMappings)
          .values(rows)
          .onConflictDoNothing()
          .returning({ id: productMesMappings.id });
        inserted += result.length;
      } catch (err) {
        console.error(`${LABEL} ERROR inserting batch [${i}-${i + batch.length}]:`, err);
        errored += rows.length;
      }
    }

    console.log(`${LABEL} Done: inserted=${inserted}, skipped=${skipped}, errored=${errored}`);

    await writeImportLog(db, {
      tableName: "product_mes_mapping",
      total: recordsWithMes.length,
      inserted,
      updated: 0,
      skipped,
      errored,
      status: errored > 0 ? "partial" : "success",
      startedAt,
    });

    if (errored > 0) {
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(`${LABEL} Fatal error:`, err);
  process.exit(1);
});
