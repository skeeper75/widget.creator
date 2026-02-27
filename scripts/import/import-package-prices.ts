// @MX:NOTE: [AUTO] Package prices import — Step 12 of SPEC-IM-003 M3
// @MX:NOTE: [AUTO] Reads 옵션결합상품 sheet from 가격표_extracted.json (엽서북 section)
// @MX:SPEC: SPEC-IM-003 M3-REQ-004

import * as path from "path";
import * as fs from "fs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import { packagePrices } from "../../packages/shared/src/db/schema/huni-pricing.schema.js";
import { products, productSizes } from "../../packages/shared/src/db/schema/huni-catalog.schema.js";
import { printModes } from "../../packages/shared/src/db/schema/huni-processes.schema.js";
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

const LABEL = "[import-package-prices]";
const BATCH_SIZE = 50;
const DATA_PATH = path.resolve(
  __dirname,
  "../../ref/huni/extracted/가격표_extracted.json"
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Cell = { col: string; colIndex: number; value: unknown };
type Row = { rowIndex: number; cells: Cell[] };
type Sheet = { name: string; totalRows: number; rows: Row[] };
type ExtractedData = { sheets: Sheet[] };

type ColumnSpec = {
  col: string;        // e.g. "B"
  sizeCode: string;   // e.g. "100x150"
  printModeCode: string; // e.g. "SINGLE_COLOR"
  pageCount: number;  // e.g. 20
};

type PackagePriceRow = {
  productName: string;
  sizeCode: string;
  printModeCode: string;
  pageCount: number;
  minQty: number;
  maxQty: number;
  sellingPrice: number;
};

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

// @MX:NOTE: [AUTO] Parses 엽서북 section from 옵션결합상품 sheet (rows 1-47)
// Row 2: sizes (100*150, 150*100, 135*135)
// Row 4: print modes (단면/양면) - text labels
// Row 5: print mode price codes (4/8)
// Row 6: page counts (20/30)
// Row 9+: qty -> price data (row 8 is a special "1부" row)
function parsePackagePrices(data: ExtractedData): PackagePriceRow[] {
  const sheet = data.sheets.find((s) => s.name === "옵션결합상품");
  if (!sheet) {
    throw new Error("Sheet '옵션결합상품' not found in 가격표_extracted.json");
  }

  const result: PackagePriceRow[] = [];

  // Find the 엽서북 section (stops at next product marker)
  const endRowIndex = (() => {
    for (const row of sheet.rows) {
      const cells: Record<string, unknown> = {};
      for (const cell of row.cells) cells[cell.col] = cell.value;
      const a = cells["A"];
      if (typeof a === "string" && a === "떡메모지") return row.rowIndex;
    }
    return 999999;
  })();

  // Collect all 엽서북 rows (rowIndex 1 to endRowIndex-1)
  const sectionRows = sheet.rows.filter((r) => r.rowIndex >= 1 && r.rowIndex < endRowIndex);

  // Get header rows by rowIndex
  const getRowCells = (rowIdx: number): Record<string, unknown> => {
    const row = sectionRows.find((r) => r.rowIndex === rowIdx);
    if (!row) return {};
    const cells: Record<string, unknown> = {};
    for (const cell of row.cells) cells[cell.col] = cell.value;
    return cells;
  };

  const sizeRow = getRowCells(2);      // row 2: sizes
  const printModeRow = getRowCells(5); // row 5: print mode price codes (4=단면, 8=양면)
  const pageCountRow = getRowCells(6); // row 6: page counts

  // Build column specs from col B onwards
  const colSpecs: ColumnSpec[] = [];
  const allCols = new Set<string>();
  for (const row of sectionRows) {
    for (const cell of row.cells) {
      if (cell.col !== "A") allCols.add(cell.col);
    }
  }

  for (const col of [...allCols].sort()) {
    const sizeRaw = sizeRow[col];
    const modeCodeRaw = printModeRow[col];
    const pageRaw = pageCountRow[col];

    if (!sizeRaw || !modeCodeRaw || !pageRaw) continue;

    // Parse size "100*150" -> "100x150"
    const sizeStr = String(sizeRaw).replace("*", "x");
    // Parse print mode code (4=SINGLE_COLOR, 8=DOUBLE_COLOR)
    const modeNum = typeof modeCodeRaw === "number" ? modeCodeRaw : parseInt(String(modeCodeRaw));
    const printModeCode = modeNum === 4 ? "SINGLE_COLOR" : modeNum === 8 ? "DOUBLE_COLOR" : null;
    if (!printModeCode) continue;

    const pageCount = typeof pageRaw === "number" ? Math.round(pageRaw) : null;
    if (!pageCount) continue;

    colSpecs.push({ col, sizeCode: sizeStr, printModeCode, pageCount });
  }

  // Extract qty-price data rows (rowIndex 9+, where A is numeric)
  const dataRows = sectionRows.filter((r) => {
    const cells: Record<string, unknown> = {};
    for (const cell of r.cells) cells[cell.col] = cell.value;
    return typeof cells["A"] === "number" && (cells["A"] as number) > 0;
  });

  const qtys = dataRows.map((r) => {
    const cells: Record<string, unknown> = {};
    for (const cell of r.cells) cells[cell.col] = cell.value;
    return Math.round(cells["A"] as number);
  });

  // Build price tiers for each column spec
  for (const spec of colSpecs) {
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const cells: Record<string, unknown> = {};
      for (const cell of row.cells) cells[cell.col] = cell.value;

      const price = cells[spec.col];
      if (typeof price !== "number" || price <= 0) continue;

      const minQty = qtys[i];
      const maxQty = i + 1 < qtys.length ? qtys[i + 1] - 1 : 999999;

      result.push({
        productName: "엽서북",
        sizeCode: spec.sizeCode,
        printModeCode: spec.printModeCode,
        pageCount: spec.pageCount,
        minQty,
        maxQty,
        sellingPrice: price,
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
  const client = postgres(connectionString);
  return drizzle(client);
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
    sourceFile: "가격표_extracted.json",
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
      step: "import-package-prices",
      executionTime: Date.now() - opts.startedAt.getTime(),
    },
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`${LABEL} Starting package prices import (옵션결합상품 sheet)`);

  if (!fs.existsSync(DATA_PATH)) {
    console.error(`${LABEL} ERROR: Data file not found: ${DATA_PATH}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(DATA_PATH, "utf-8");
  const data: ExtractedData = JSON.parse(rawData);

  const rawPrices = parsePackagePrices(data);
  console.log(`${LABEL} Parsed ${rawPrices.length} package price records`);

  if (VALIDATE_ONLY) {
    console.log(`${LABEL} Mode: validate-only`);
    if (rawPrices.length === 0) {
      console.error(`${LABEL} ERROR: No package prices found`);
      process.exit(1);
    }
    console.log(`${LABEL} Validation OK`);
    return;
  }

  if (DRY_RUN) {
    console.log(`${LABEL} Mode: dry-run (no DB writes)`);
    return;
  }

  const db = createDb();
  const startedAt = new Date();

  // Load lookup tables
  const dbProducts = await db
    .select({ id: products.id, name: products.name })
    .from(products);
  const productNameToId = new Map(dbProducts.map((p) => [p.name.trim().toLowerCase(), p.id]));

  const dbSizes = await db
    .select({ id: productSizes.id, productId: productSizes.productId, code: productSizes.code })
    .from(productSizes);

  const dbPrintModes = await db
    .select({ id: printModes.id, code: printModes.code })
    .from(printModes);
  const printModeCodeToId = new Map(dbPrintModes.map((m) => [m.code, m.id]));

  console.log(`${LABEL} Loaded lookup tables`);

  type PackagePriceDbRow = {
    productId: number;
    sizeId: number;
    printModeId: number;
    pageCount: number;
    minQty: number;
    maxQty: number;
    sellingPrice: string;
    costPrice: string | null;
  };

  const insertRows: PackagePriceDbRow[] = [];
  let skipped = 0;

  for (const raw of rawPrices) {
    // Find product
    const productId = productNameToId.get(raw.productName.toLowerCase());
    if (!productId) {
      // Try partial match
      let found: number | undefined;
      for (const [name, id] of productNameToId) {
        if (name.includes(raw.productName.toLowerCase())) {
          found = id;
          break;
        }
      }
      if (!found) {
        skipped++;
        continue;
      }
    }

    const resolvedProductId = productId ?? (() => {
      for (const [name, id] of productNameToId) {
        if (name.includes(raw.productName.toLowerCase())) return id;
      }
      return undefined;
    })();

    if (!resolvedProductId) {
      skipped++;
      continue;
    }

    // Find size by code (e.g., "100x150")
    const sizeRow = dbSizes.find(
      (s) => s.productId === resolvedProductId && s.code === raw.sizeCode
    );
    if (!sizeRow) {
      console.warn(`${LABEL} WARN: Size '${raw.sizeCode}' not found for product '${raw.productName}', skipping`);
      skipped++;
      continue;
    }

    // Find print mode
    const printModeId = printModeCodeToId.get(raw.printModeCode);
    if (!printModeId) {
      console.warn(`${LABEL} WARN: PrintMode '${raw.printModeCode}' not found, skipping`);
      skipped++;
      continue;
    }

    insertRows.push({
      productId: resolvedProductId,
      sizeId: sizeRow.id,
      printModeId,
      pageCount: raw.pageCount,
      minQty: raw.minQty,
      maxQty: raw.maxQty,
      sellingPrice: String(raw.sellingPrice),
      costPrice: null,
    });
  }

  console.log(`${LABEL} Inserting ${insertRows.length} rows (skipped: ${skipped})`);

  let inserted = 0;
  let errored = 0;

  for (let i = 0; i < insertRows.length; i += BATCH_SIZE) {
    const batch = insertRows.slice(i, i + BATCH_SIZE);
    try {
      const result = await db
        .insert(packagePrices)
        .values(batch)
        .onConflictDoNothing()
        .returning({ id: packagePrices.id });
      inserted += result.length;
    } catch (err) {
      console.error(`${LABEL} ERROR inserting batch [${i}-${i + batch.length}]:`, err);
      errored += batch.length;
    }
  }

  const status = errored > 0 ? "partial" : "success";
  await writeImportLog(db, {
    tableName: "package_prices",
    total: insertRows.length,
    inserted,
    updated: 0,
    skipped,
    errored,
    status,
    startedAt,
  });

  console.log(`${LABEL} Done: inserted=${inserted}, skipped=${skipped}, errored=${errored}`);
  if (errored > 0) process.exit(1);
}

main().catch((err) => {
  console.error(`${LABEL} Fatal error:`, err);
  process.exit(1);
});
