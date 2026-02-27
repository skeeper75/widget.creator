// @MX:NOTE: [AUTO] Foil prices import — Step 13 of SPEC-IM-003 M3
// @MX:NOTE: [AUTO] Reads "후가공_박" sheet from 가격표_extracted.json
// @MX:NOTE: [AUTO] Three pricing sections: 동판비 (copper plate), 일반박 (general foil), 특수박 (special foil)
// @MX:SPEC: SPEC-IM-003 M3-REQ-005

import * as path from "path";
import * as fs from "fs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import { foilPrices } from "../../packages/shared/src/db/schema/huni-pricing.schema.js";
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

const LABEL = "[import-foil-prices]";
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

type FoilPriceRow = {
  foilType: string;          // "standard", "special", "plate_cost"
  foilColor: string | null;  // null for copper plate
  plateMaterial: string | null; // "zinc" or null
  targetProductType: string | null;
  width: number;             // mm for foil; area breakpoint for copper plate
  height: number;            // mm for foil; same area breakpoint for copper plate
  sellingPrice: number;
  displayOrder: number;
};

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

function getSheetRows(data: ExtractedData, sheetName: string): Row[] {
  const sheet = data.sheets.find((s) => s.name === sheetName);
  if (!sheet) throw new Error(`Sheet '${sheetName}' not found`);
  return sheet.rows;
}

function rowToCells(row: Row): Record<string, unknown> {
  const cells: Record<string, unknown> = {};
  for (const cell of row.cells) {
    cells[cell.col] = cell.value;
  }
  return cells;
}

// @MX:NOTE: [AUTO] Parses 동판비 (copper plate) pricing block
// Row 2: header — "Copper_Plate_01" in A, area breakpoints in B-J (1, 30, 50, 70, 90, 110, 130, 150, 170)
// Rows 4-11: qty tiers with prices for each area column
// Copper plate uses area-based pricing: each column represents max area (sq mm)
function parseCopperPlatePrices(rows: Row[], headerRowIdx: number): FoilPriceRow[] {
  const result: FoilPriceRow[] = [];

  const headerRow = rows.find((r) => r.rowIndex === headerRowIdx);
  if (!headerRow) return result;

  const headerCells = rowToCells(headerRow);

  // Build column -> area breakpoint mapping (skip A which has "Copper_Plate_01", skip B which has "1")
  const colToArea: Record<string, number> = {};
  for (const [col, val] of Object.entries(headerCells)) {
    if (col === "A" || col === "B") continue;
    if (typeof val === "number" && val > 0) {
      colToArea[col] = val;
    }
  }

  // Find data rows: rows after header with numeric values in columns
  const dataRows = rows.filter(
    (r) =>
      r.rowIndex > headerRowIdx &&
      r.rowIndex <= headerRowIdx + 15 &&
      (() => {
        const cells = rowToCells(r);
        // Row must have a numeric price in one of the area columns
        return Object.keys(colToArea).some(
          (col) => typeof cells[col] === "number" && (cells[col] as number) > 0
        );
      })()
  );

  // Each data row is a different qty tier; but copper plate prices don't vary by qty in the source data
  // The area breakpoints define the pricing grid: each column = area <= N sq cm
  // We model as minQty=1, maxQty=999999 since qty is not the axis here
  // Instead, width/height encode the area breakpoint as equal dimensions
  let displayOrder = 0;
  for (const [col, area] of Object.entries(colToArea)) {
    // Take the first data row price for this area column (use lowest qty price)
    const firstDataRow = dataRows[0];
    if (!firstDataRow) continue;

    const cells = rowToCells(firstDataRow);
    const price = cells[col];
    if (typeof price !== "number" || price <= 0) continue;

    displayOrder++;
    result.push({
      foilType: "plate_cost",
      foilColor: null,
      plateMaterial: "zinc",
      targetProductType: null,
      width: area,    // area breakpoint in mm (max dimension)
      height: area,   // symmetric — copper plate measured by max dimension
      sellingPrice: price,
      displayOrder,
    });
  }

  return result;
}

// @MX:NOTE: [AUTO] Parses 일반박/특수박 (standard/special foil) pricing blocks
// Row 14 (일반박) or row 23 (특수박): header — "foil_stamp_01" in A, B=1 (min qty), sizes "WxH" in C-BN (57 combos)
// Rows 16-19 (일반박) or 25-28 (특수박): 4 qty tiers — qty in col A (10, 200, 500, 1000), prices in C-BN
// @MX:ANCHOR: [AUTO] Foil price parser — primary pricing engine for foil stamping
// @MX:REASON: fan_in >= 3 — called by parseFoilPrices, standard section, and special section
function parseFoilSectionPrices(
  rows: Row[],
  headerRowIdx: number,
  foilType: "standard" | "special",
  dataStartRowIdx: number,
  dataEndRowIdx: number
): FoilPriceRow[] {
  const result: FoilPriceRow[] = [];

  const headerRow = rows.find((r) => r.rowIndex === headerRowIdx);
  if (!headerRow) return result;

  const headerCells = rowToCells(headerRow);

  // Build column -> size spec mapping from header row (skip A and B which hold code and min-qty)
  const colToSize: Record<string, { width: number; height: number }> = {};
  for (const [col, val] of Object.entries(headerCells)) {
    if (col === "A" || col === "B") continue;
    if (typeof val === "string" && /^\d+x\d+$/i.test(val)) {
      const parts = val.split("x");
      const w = parseInt(parts[0], 10);
      const h = parseInt(parts[1], 10);
      if (w > 0 && h > 0) {
        colToSize[col] = { width: w, height: h };
      }
    }
  }

  // Find qty-tier data rows — qty is in column A (numeric: 10, 200, 500, 1000)
  const dataRows = rows.filter(
    (r) =>
      r.rowIndex >= dataStartRowIdx &&
      r.rowIndex <= dataEndRowIdx &&
      (() => {
        const cells = rowToCells(r);
        return typeof cells["A"] === "number" && (cells["A"] as number) > 0;
      })()
  );

  let displayOrder = 0;

  for (const [col, size] of Object.entries(colToSize)) {
    // Import only the first qty tier (minimum qty = 10 base price)
    // The sheet models qty discounts — import only the lowest-qty price row
    // to avoid duplicating (foilType, width, height) entries
    const firstDataRow = dataRows[0];
    if (!firstDataRow) continue;

    const cells = rowToCells(firstDataRow);
    const price = cells[col];
    if (typeof price !== "number" || price <= 0) continue;

    displayOrder++;
    result.push({
      foilType,
      foilColor: null,  // color not specified in source data
      plateMaterial: null,
      targetProductType: null,
      width: size.width,
      height: size.height,
      sellingPrice: price,
      displayOrder,
    });
  }

  return result;
}

function parseFoilPrices(data: ExtractedData): FoilPriceRow[] {
  const rows = getSheetRows(data, "후가공_박");
  const result: FoilPriceRow[] = [];

  // Find section marker rows
  let copperHeaderRowIdx = -1;
  let standardFoilHeaderRowIdx = -1;
  let specialFoilHeaderRowIdx = -1;

  for (const row of rows) {
    const cells = rowToCells(row);
    const a = cells["A"];
    if (typeof a === "string") {
      if (a.includes("Copper_Plate")) {
        copperHeaderRowIdx = row.rowIndex;
      } else if (a === "foil_stamp_01") {
        if (standardFoilHeaderRowIdx < 0) {
          standardFoilHeaderRowIdx = row.rowIndex;
        } else {
          specialFoilHeaderRowIdx = row.rowIndex;
        }
      }
    }
  }

  // Parse copper plate prices (동판비)
  if (copperHeaderRowIdx > 0) {
    const copperPrices = parseCopperPlatePrices(rows, copperHeaderRowIdx);
    result.push(...copperPrices);
    console.log(`${LABEL} Copper plate prices: ${copperPrices.length}`);
  }

  // Parse standard foil prices (일반박) — 4 data rows starting 2 rows after header
  if (standardFoilHeaderRowIdx > 0) {
    const dataStart = standardFoilHeaderRowIdx + 2;
    const dataEnd = specialFoilHeaderRowIdx > 0
      ? specialFoilHeaderRowIdx - 2
      : standardFoilHeaderRowIdx + 10;

    const standardPrices = parseFoilSectionPrices(
      rows,
      standardFoilHeaderRowIdx,
      "standard",
      dataStart,
      dataEnd
    );
    result.push(...standardPrices);
    console.log(`${LABEL} Standard foil prices: ${standardPrices.length}`);
  }

  // Parse special foil prices (특수박) — 4 data rows starting 2 rows after header
  if (specialFoilHeaderRowIdx > 0) {
    const dataStart = specialFoilHeaderRowIdx + 2;
    const dataEnd = specialFoilHeaderRowIdx + 10;

    const specialPrices = parseFoilSectionPrices(
      rows,
      specialFoilHeaderRowIdx,
      "special",
      dataStart,
      dataEnd
    );
    result.push(...specialPrices);
    console.log(`${LABEL} Special foil prices: ${specialPrices.length}`);
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
      step: "import-foil-prices",
      executionTime: Date.now() - opts.startedAt.getTime(),
    },
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`${LABEL} Starting foil prices import (후가공_박 sheet)`);

  if (!fs.existsSync(DATA_PATH)) {
    console.error(`${LABEL} ERROR: Data file not found: ${DATA_PATH}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(DATA_PATH, "utf-8");
  const data: ExtractedData = JSON.parse(rawData);

  const foilRows = parseFoilPrices(data);
  console.log(`${LABEL} Parsed ${foilRows.length} foil price records`);

  if (VALIDATE_ONLY) {
    console.log(`${LABEL} Mode: validate-only`);
    if (foilRows.length === 0) {
      console.error(`${LABEL} ERROR: No foil prices found`);
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

  let inserted = 0;
  let errored = 0;

  for (let i = 0; i < foilRows.length; i += BATCH_SIZE) {
    const batch = foilRows.slice(i, i + BATCH_SIZE);
    try {
      const result = await db
        .insert(foilPrices)
        .values(
          batch.map((r) => ({
            foilType: r.foilType,
            foilColor: r.foilColor,
            plateMaterial: r.plateMaterial,
            targetProductType: r.targetProductType,
            width: String(r.width),
            height: String(r.height),
            sellingPrice: String(r.sellingPrice),
            costPrice: null,
            displayOrder: r.displayOrder,
            isActive: true,
          }))
        )
        .onConflictDoNothing()
        .returning({ id: foilPrices.id });
      inserted += result.length;
    } catch (err) {
      console.error(`${LABEL} ERROR inserting batch [${i}-${i + batch.length}]:`, err);
      errored += batch.length;
    }
  }

  const status = errored > 0 ? "partial" : "success";
  await writeImportLog(db, {
    tableName: "foil_prices",
    total: foilRows.length,
    inserted,
    updated: 0,
    skipped: 0,
    errored,
    status,
    startedAt,
  });

  console.log(`${LABEL} Done: inserted=${inserted}, errored=${errored}`);
  if (errored > 0) process.exit(1);
}

main().catch((err) => {
  console.error(`${LABEL} Fatal error:`, err);
  process.exit(1);
});
