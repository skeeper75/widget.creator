// @MX:NOTE: [AUTO] Price tiers import — Step 10 of SPEC-IM-003 M3
// @MX:NOTE: [AUTO] Imports price_tables + price_tiers from 가격표_extracted.json
// @MX:NOTE: [AUTO] Sources: 디지털출력비 sheet (A3+T3 digital print) + 후가공 sheet (Postprocess001~008)
// @MX:SPEC: SPEC-IM-003 M3-REQ-001, M3-REQ-002

import * as path from "path";
import * as fs from "fs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import { priceTables, priceTiers } from "../../packages/shared/src/db/schema/huni-pricing.schema.js";
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

const LABEL = "[import-price-tiers]";
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

type PriceTableDef = {
  code: string;
  name: string;
  priceType: string;
  quantityBasis: string;
  sheetStandard: string | null;
};

type PriceTierRow = {
  priceTableCode: string;
  optionCode: string;
  minQty: number;
  maxQty: number;
  unitPrice: number;
};

// ---------------------------------------------------------------------------
// Price Table Definitions (hardcoded headers)
// ---------------------------------------------------------------------------

// @MX:ANCHOR: [AUTO] Price table definitions — FK targets for price_tiers
// @MX:REASON: fan_in >= 3 — referenced by digital print, post-process, and package price calculations
// @MX:SPEC: SPEC-IM-003 M3-REQ-001, M3-REQ-002
const PRICE_TABLE_DEFS: PriceTableDef[] = [
  { code: "DIGITAL_A3",     name: "디지털출력비 A3",      priceType: "tiered", quantityBasis: "sheets", sheetStandard: "A3" },
  { code: "DIGITAL_T3",     name: "디지털출력비 T3",      priceType: "tiered", quantityBasis: "sheets", sheetStandard: "T3" },
  { code: "POSTPROCESS001", name: "미싱",                  priceType: "tiered", quantityBasis: "units",  sheetStandard: null },
  { code: "POSTPROCESS002", name: "오시",                  priceType: "tiered", quantityBasis: "units",  sheetStandard: null },
  { code: "POSTPROCESS003", name: "접지",                  priceType: "tiered", quantityBasis: "units",  sheetStandard: null },
  { code: "POSTPROCESS004", name: "가변인쇄(텍스트)",      priceType: "tiered", quantityBasis: "units",  sheetStandard: null },
  { code: "POSTPROCESS005", name: "가변인쇄(이미지)",      priceType: "tiered", quantityBasis: "units",  sheetStandard: null },
  { code: "POSTPROCESS006", name: "귀돌이",                priceType: "tiered", quantityBasis: "units",  sheetStandard: null },
  { code: "POSTPROCESS007", name: "코팅(A3)",              priceType: "tiered", quantityBasis: "sheets", sheetStandard: "A3" },
  { code: "POSTPROCESS008", name: "코팅(T3)",              priceType: "tiered", quantityBasis: "sheets", sheetStandard: "T3" },
];

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

// @MX:NOTE: [AUTO] Parses a quantity-price block from sheets
// headerRow has optionCodes in columns B-onwards
// dataRows have qty in col A, prices in B-onwards (matching header columns)
function parseQtyPriceBlock(
  headerRow: Record<string, unknown>,
  dataRows: Record<string, unknown>[],
  priceTableCode: string
): PriceTierRow[] {
  // Map column letter -> optionCode from header row
  const colToOption: Record<string, string> = {};
  const cols = Object.keys(headerRow).filter((c) => c !== "A");
  for (const col of cols) {
    const val = headerRow[col];
    if (val !== null && val !== undefined && val !== "") {
      colToOption[col] = String(Math.round(Number(val)));
    }
  }

  // Extract qty breakpoints with prices
  const qtys: number[] = [];
  const pricesByOption: Record<string, number[]> = {};

  for (const row of dataRows) {
    const qty = row["A"];
    if (typeof qty !== "number" || qty <= 0) continue;
    qtys.push(Math.round(qty));
    for (const col of cols) {
      const price = row[col];
      if (typeof price === "number" && price > 0) {
        const optCode = colToOption[col];
        if (optCode) {
          if (!pricesByOption[optCode]) pricesByOption[optCode] = [];
          pricesByOption[optCode].push(price);
        }
      }
    }
  }

  if (qtys.length === 0) return [];

  // Build tier rows with minQty/maxQty ranges
  const result: PriceTierRow[] = [];
  for (const [optCode, prices] of Object.entries(pricesByOption)) {
    for (let i = 0; i < qtys.length; i++) {
      const minQty = qtys[i];
      const maxQty = i + 1 < qtys.length ? qtys[i + 1] - 1 : 999999;
      const unitPrice = prices[i];
      if (unitPrice === undefined) continue;
      result.push({
        priceTableCode,
        optionCode: optCode,
        minQty,
        maxQty,
        unitPrice,
      });
    }
  }

  return result;
}

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

// @MX:NOTE: [AUTO] Parses 디지털출력비 sheet — A3 block (rows 2-25) and T3 block (rows 32-55)
function parseDigitalPriceTiers(data: ExtractedData): PriceTierRow[] {
  const rows = getSheetRows(data, "디지털출력비");

  // Find section marker rows (row with "DigitalPrint A3" and "DigitalPrint T3" in col A)
  let a3HeaderRowIdx = -1;
  let t3HeaderRowIdx = -1;
  for (const row of rows) {
    const cells = rowToCells(row);
    const a = cells["A"];
    if (typeof a === "string" && a.includes("DigitalPrint A3")) a3HeaderRowIdx = row.rowIndex;
    if (typeof a === "string" && a.includes("DigitalPrint T3")) t3HeaderRowIdx = row.rowIndex;
  }

  const result: PriceTierRow[] = [];

  // A3 section
  if (a3HeaderRowIdx > 0) {
    const headerRow = rows.find((r) => r.rowIndex === a3HeaderRowIdx);
    const dataRows = rows.filter(
      (r) =>
        r.rowIndex > a3HeaderRowIdx &&
        (t3HeaderRowIdx < 0 || r.rowIndex < t3HeaderRowIdx) &&
        typeof rowToCells(r)["A"] === "number"
    );
    if (headerRow) {
      result.push(
        ...parseQtyPriceBlock(rowToCells(headerRow), dataRows.map(rowToCells), "DIGITAL_A3")
      );
    }
  }

  // T3 section
  if (t3HeaderRowIdx > 0) {
    const headerRow = rows.find((r) => r.rowIndex === t3HeaderRowIdx);
    const dataRows = rows.filter(
      (r) => r.rowIndex > t3HeaderRowIdx && typeof rowToCells(r)["A"] === "number"
    );
    if (headerRow) {
      result.push(
        ...parseQtyPriceBlock(rowToCells(headerRow), dataRows.map(rowToCells), "DIGITAL_T3")
      );
    }
  }

  return result;
}

// @MX:NOTE: [AUTO] Parses 후가공 sheet — 8 sections, each starts with "PostprocessNNN" row
function parsePostprocessPriceTiers(data: ExtractedData): PriceTierRow[] {
  const rows = getSheetRows(data, "후가공");
  const result: PriceTierRow[] = [];

  // Find all "PostprocessNNN" marker rows
  const sectionMarkers: { rowIdx: number; code: string }[] = [];
  for (const row of rows) {
    const cells = rowToCells(row);
    const a = cells["A"];
    if (typeof a === "string" && /^Postprocess\d{3}$/.test(a)) {
      sectionMarkers.push({ rowIdx: row.rowIndex, code: `POSTPROCESS${a.replace("Postprocess", "")}` });
    }
  }

  for (let s = 0; s < sectionMarkers.length; s++) {
    const { rowIdx, code } = sectionMarkers[s];
    const nextSectionRowIdx = s + 1 < sectionMarkers.length
      ? sectionMarkers[s + 1].rowIdx - 1
      : 999999;

    const headerRow = rows.find((r) => r.rowIndex === rowIdx);
    const dataRows = rows.filter(
      (r) =>
        r.rowIndex > rowIdx &&
        r.rowIndex <= nextSectionRowIdx &&
        typeof rowToCells(r)["A"] === "number"
    );

    if (headerRow) {
      const tiers = parseQtyPriceBlock(rowToCells(headerRow), dataRows.map(rowToCells), code);
      result.push(...tiers);
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
      step: "import-price-tiers",
      executionTime: Date.now() - opts.startedAt.getTime(),
    },
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`${LABEL} Starting price tiers import`);

  if (!fs.existsSync(DATA_PATH)) {
    console.error(`${LABEL} ERROR: Data file not found: ${DATA_PATH}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(DATA_PATH, "utf-8");
  const data: ExtractedData = JSON.parse(rawData);

  const digitalTiers = parseDigitalPriceTiers(data);
  const postprocessTiers = parsePostprocessPriceTiers(data);
  const allTiers = [...digitalTiers, ...postprocessTiers];

  console.log(`${LABEL} Parsed: digital=${digitalTiers.length}, postprocess=${postprocessTiers.length}`);

  if (VALIDATE_ONLY) {
    console.log(`${LABEL} Mode: validate-only`);
    if (digitalTiers.length === 0) {
      console.error(`${LABEL} ERROR: No digital price tiers found`);
      process.exit(1);
    }
    if (postprocessTiers.length === 0) {
      console.error(`${LABEL} ERROR: No postprocess price tiers found`);
      process.exit(1);
    }
    console.log(`${LABEL} Validation OK`);
    return;
  }

  if (DRY_RUN) {
    console.log(`${LABEL} Mode: dry-run (no DB writes)`);
    return;
  }

  const { db, client } = createDb();
  const startedAt = new Date();

  // Insert price table headers
  console.log(`${LABEL} Inserting ${PRICE_TABLE_DEFS.length} price tables...`);
  let tablesInserted = 0;
  let tablesErrored = 0;
  try {
    const result = await db
      .insert(priceTables)
      .values(PRICE_TABLE_DEFS)
      .onConflictDoUpdate({
        target: [priceTables.code],
        set: {
          name: sql`excluded.name`,
          priceType: sql`excluded.price_type`,
          quantityBasis: sql`excluded.quantity_basis`,
          sheetStandard: sql`excluded.sheet_standard`,
          updatedAt: sql`now()`,
        },
      })
      .returning({ id: priceTables.id, code: priceTables.code });
    tablesInserted = result.length;

    // Build code->id map
    const tableCodeToId = new Map(result.map((r) => [r.code, r.id]));

    // Insert price tiers in batches
    console.log(`${LABEL} Inserting ${allTiers.length} price tiers...`);
    let tiersInserted = 0;
    let tiersErrored = 0;

    // Convert tier rows to DB rows with FK
    const tierDbRows = allTiers
      .map((t) => {
        const priceTableId = tableCodeToId.get(t.priceTableCode);
        if (!priceTableId) {
          console.warn(`${LABEL} WARN: No priceTableId for code '${t.priceTableCode}'`);
          return null;
        }
        return {
          priceTableId,
          optionCode: t.optionCode,
          minQty: t.minQty,
          maxQty: t.maxQty,
          unitPrice: String(t.unitPrice),
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    for (let i = 0; i < tierDbRows.length; i += BATCH_SIZE) {
      const batch = tierDbRows.slice(i, i + BATCH_SIZE);
      try {
        const result2 = await db
          .insert(priceTiers)
          .values(batch)
          .onConflictDoNothing()  // price_tiers has no UNIQUE constraint, just insert fresh
          .returning({ id: priceTiers.id });
        tiersInserted += result2.length;
      } catch (err) {
        console.error(`${LABEL} ERROR inserting tier batch [${i}-${i + batch.length}]:`, err);
        tiersErrored += batch.length;
      }
    }

    await writeImportLog(db, {
      tableName: "price_tiers",
      total: allTiers.length,
      inserted: tiersInserted,
      updated: 0,
      skipped: 0,
      errored: tiersErrored,
      status: tiersErrored > 0 ? "partial" : "success",
      startedAt,
    });

    console.log(`${LABEL} Done: tables=${tablesInserted}, tiers=${tiersInserted}`);
    if (tiersErrored > 0) process.exit(1);

  } catch (err) {
    console.error(`${LABEL} ERROR inserting price tables:`, err);
    tablesErrored = PRICE_TABLE_DEFS.length;
    await writeImportLog(db, {
      tableName: "price_tables",
      total: PRICE_TABLE_DEFS.length,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errored: tablesErrored,
      status: "error",
      errorMessage: String(err),
      startedAt,
    });
    await client.end();
    process.exit(1);
  }

  await writeImportLog(db, {
    tableName: "price_tables",
    total: PRICE_TABLE_DEFS.length,
    inserted: tablesInserted,
    updated: 0,
    skipped: 0,
    errored: tablesErrored,
    status: tablesErrored > 0 ? "partial" : "success",
    startedAt,
  });

  await client.end();
}

main().catch((err) => {
  console.error(`${LABEL} Fatal error:`, err);
  process.exit(1);
});
