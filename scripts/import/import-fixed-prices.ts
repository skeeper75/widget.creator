// @MX:NOTE: [AUTO] Fixed prices import — Step 11 of SPEC-IM-003 M3
// @MX:NOTE: [AUTO] Reads 명함 sheet from 가격표_extracted.json
// @MX:SPEC: SPEC-IM-003 M3-REQ-003

import * as path from "path";
import * as fs from "fs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql, like, eq } from "drizzle-orm";
import { fixedPrices } from "../../packages/shared/src/db/schema/huni-pricing.schema.js";
import { products, productSizes } from "../../packages/shared/src/db/schema/huni-catalog.schema.js";
import { papers } from "../../packages/shared/src/db/schema/huni-materials.schema.js";
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

const LABEL = "[import-fixed-prices]";
const BATCH_SIZE = 50;
const DATA_PATH = path.resolve(
  __dirname,
  "../../ref/huni/extracted/가격표_extracted.json"
);

// Business card base quantity (100 sheets = 1 unit order)
const BASE_QTY = 100;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Cell = { col: string; colIndex: number; value: unknown };
type Row = { rowIndex: number; cells: Cell[] };
type Sheet = { name: string; totalRows: number; rows: Row[] };
type ExtractedData = { sheets: Sheet[] };

type RawFixedPrice = {
  productName: string;  // column A
  paperName: string;    // column B
  singleSidePrice: number | null;  // column C (100장 단면)
  doubleSidePrice: number | null;  // column D (100장 양면)
};

// ---------------------------------------------------------------------------
// Paper code generation (matches import-papers.ts logic)
// ---------------------------------------------------------------------------

function generatePaperCode(name: string, weight: number | null): string {
  const namePart = name
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .replace(/[^\w\-가-힣]/g, "")
    .slice(0, 40);
  if (weight !== null) {
    return `${namePart}-${weight}g`.slice(0, 50);
  }
  return namePart.slice(0, 50);
}

// Extract weight from paper name like "백색모조지 220g" -> 220
function extractWeight(paperName: string): number | null {
  const match = paperName.match(/(\d+)\s*g\b/);
  if (match) return parseInt(match[1], 10);
  return null;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

function parseFixedPrices(data: ExtractedData): RawFixedPrice[] {
  const sheet = data.sheets.find((s) => s.name === "명함");
  if (!sheet) {
    throw new Error("Sheet '명함' not found in 가격표_extracted.json");
  }

  const result: RawFixedPrice[] = [];

  for (const row of sheet.rows) {
    if (row.rowIndex <= 2) continue; // skip headers

    const cells: Record<string, unknown> = {};
    for (const cell of row.cells) {
      cells[cell.col] = cell.value;
    }

    const productName = cells["A"];
    const paperName = cells["B"];
    const singlePrice = cells["C"];
    const doublePrice = cells["D"];

    if (!productName || typeof productName !== "string" || !productName.trim()) continue;
    if (!paperName || typeof paperName !== "string" || !paperName.trim()) continue;

    result.push({
      productName: String(productName).trim(),
      paperName: String(paperName).trim(),
      singleSidePrice: typeof singlePrice === "number" ? singlePrice : null,
      doubleSidePrice: typeof doublePrice === "number" ? doublePrice : null,
    });
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
      step: "import-fixed-prices",
      executionTime: Date.now() - opts.startedAt.getTime(),
    },
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`${LABEL} Starting fixed prices import (명함 sheet)`);

  if (!fs.existsSync(DATA_PATH)) {
    console.error(`${LABEL} ERROR: Data file not found: ${DATA_PATH}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(DATA_PATH, "utf-8");
  const data: ExtractedData = JSON.parse(rawData);

  const rawPrices = parseFixedPrices(data);
  console.log(`${LABEL} Parsed ${rawPrices.length} raw fixed price records`);

  if (VALIDATE_ONLY) {
    console.log(`${LABEL} Mode: validate-only`);
    if (rawPrices.length === 0) {
      console.error(`${LABEL} ERROR: No fixed prices found`);
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

  const dbPapers = await db
    .select({ id: papers.id, code: papers.code, name: papers.name })
    .from(papers);
  // Index by name (lowercase) and by generated code
  const paperNameToId = new Map(dbPapers.map((p) => [p.name.trim().toLowerCase(), p.id]));

  const dbPrintModes = await db
    .select({ id: printModes.id, code: printModes.code, priceCode: printModes.priceCode })
    .from(printModes);
  const singleColorModeId = dbPrintModes.find((m) => m.code === "SINGLE_COLOR")?.id ?? null;
  const doubleColorModeId = dbPrintModes.find((m) => m.code === "DOUBLE_COLOR")?.id ?? null;

  console.log(`${LABEL} Loaded: ${dbProducts.length} products, ${dbPapers.length} papers`);

  type FixedPriceRow = {
    productId: number;
    sizeId: number | null;
    paperId: number | null;
    printModeId: number | null;
    optionLabel: string | null;
    baseQty: number;
    sellingPrice: string;
    costPrice: string | null;
    vatIncluded: boolean;
  };

  const insertRows: FixedPriceRow[] = [];
  let skipped = 0;

  for (const raw of rawPrices) {
    // Find product by name (exact or partial)
    let productId = productNameToId.get(raw.productName.toLowerCase());
    if (!productId) {
      // Try partial match (e.g., "모양명함(심플형90*50)" -> "모양명함")
      for (const [name, id] of productNameToId) {
        if (raw.productName.toLowerCase().startsWith(name) || name.startsWith(raw.productName.toLowerCase())) {
          productId = id;
          break;
        }
      }
    }
    if (!productId) {
      console.warn(`${LABEL} WARN: Product not found: '${raw.productName}', skipping`);
      skipped++;
      continue;
    }

    // Find paper by name
    const weight = extractWeight(raw.paperName);
    let paperId = paperNameToId.get(raw.paperName.toLowerCase());
    if (!paperId && weight) {
      // Try generated code lookup
      const paperCode = generatePaperCode(raw.paperName, weight);
      const paperByCode = dbPapers.find((p) => p.code === paperCode);
      if (paperByCode) paperId = paperByCode.id;
    }
    // Paper may be null (per spec: NULL for unresolved papers)

    // Single side price entry
    if (raw.singleSidePrice !== null) {
      insertRows.push({
        productId,
        sizeId: null,
        paperId: paperId ?? null,
        printModeId: singleColorModeId,
        optionLabel: `${raw.paperName} 단면`,
        baseQty: BASE_QTY,
        sellingPrice: String(raw.singleSidePrice),
        costPrice: null,
        vatIncluded: false,
      });
    }

    // Double side price entry
    if (raw.doubleSidePrice !== null) {
      insertRows.push({
        productId,
        sizeId: null,
        paperId: paperId ?? null,
        printModeId: doubleColorModeId,
        optionLabel: `${raw.paperName} 양면`,
        baseQty: BASE_QTY,
        sellingPrice: String(raw.doubleSidePrice),
        costPrice: null,
        vatIncluded: false,
      });
    }
  }

  console.log(`${LABEL} Inserting ${insertRows.length} fixed price rows (skipped: ${skipped})`);

  let inserted = 0;
  let errored = 0;

  for (let i = 0; i < insertRows.length; i += BATCH_SIZE) {
    const batch = insertRows.slice(i, i + BATCH_SIZE);
    try {
      const result = await db
        .insert(fixedPrices)
        .values(batch)
        .onConflictDoNothing()
        .returning({ id: fixedPrices.id });
      inserted += result.length;
    } catch (err) {
      console.error(`${LABEL} ERROR inserting batch [${i}-${i + batch.length}]:`, err);
      errored += batch.length;
    }
  }

  const total = insertRows.length;
  const status = errored > 0 ? "partial" : "success";
  await writeImportLog(db, {
    tableName: "fixed_prices",
    total,
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
