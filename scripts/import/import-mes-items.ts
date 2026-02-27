// @MX:NOTE: [AUTO] MES item master import script — reads item-management.toon and upserts into mes_items table
// @MX:NOTE: [AUTO] Source: ref/huni/toon/item-management.toon (Sheet, 261 rows)
// @MX:REASON: Idempotent upsert pattern ensures re-runs do not duplicate data

import * as fs from "fs";
import * as path from "path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import { mesItems } from "../../packages/shared/src/db/schema/huni-integration.schema.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ToonRow {
  _row: string;
  [column: string]: string;
}

interface ParsedSheet {
  name: string;
  headers: string[];
  rows: ToonRow[];
}

// ---------------------------------------------------------------------------
// TOON Parser
// ---------------------------------------------------------------------------
// @MX:NOTE: [AUTO] TOON format: pipe-delimited, first non-comment/section line is the header row
// @MX:NOTE: [AUTO] Section separator: "## Sheet: <name>" starts a new sheet
// @MX:REASON: The TOON format is a compact pipe-delimited representation of Excel sheets

function parseToon(filePath: string): Map<string, ParsedSheet> {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  const sheets = new Map<string, ParsedSheet>();
  let currentSheet: ParsedSheet | null = null;
  let headers: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    // Skip comment lines
    if (line.startsWith("#")) {
      // Detect sheet section header: "## Sheet: <name> ..."
      const sheetMatch = line.match(/^##\s+Sheet:\s+(.+?)\s*\(/);
      if (sheetMatch) {
        const sheetName = sheetMatch[1].trim();
        currentSheet = { name: sheetName, headers: [], rows: [] };
        headers = [];
        sheets.set(sheetName, currentSheet);
      }
      continue;
    }

    if (!line.trim() || !currentSheet) continue;

    const parts = line.split("|");

    // Detect header row (starts with "_row")
    if (parts[0] === "_row") {
      headers = parts;
      currentSheet.headers = headers;
      continue;
    }

    // Data rows — must have headers already set
    if (headers.length === 0) continue;

    const row: ToonRow = { _row: parts[0] ?? "" };
    for (let i = 1; i < headers.length; i++) {
      const colName = headers[i];
      if (colName) {
        row[colName] = parts[i] ?? "";
      }
    }
    currentSheet.rows.push(row);
  }

  return sheets;
}

// ---------------------------------------------------------------------------
// Business Logic Helpers
// ---------------------------------------------------------------------------

// @MX:NOTE: [AUTO] Item code validation: must match NNN-NNNN pattern (e.g., 002-0008)
// @MX:REASON: MES system requires exactly this format; other codes are metadata rows
const ITEM_CODE_PATTERN = /^\d{3}-\d{4}$/;

function isValidItemCode(code: string): boolean {
  return ITEM_CODE_PATTERN.test(code.trim());
}

function parseIsActive(value: string): boolean {
  const v = value.trim().toUpperCase();
  if (v === "N") return false;
  return true; // Default to true for Y or empty
}

// ---------------------------------------------------------------------------
// Import Runner
// ---------------------------------------------------------------------------

const LABEL = "[import-mes-items]";
const BATCH_SIZE = 100;

async function run(): Promise<void> {
  const toonPath = path.resolve(
    __dirname,
    "../../ref/huni/toon/item-management.toon"
  );

  console.log(`${LABEL} Reading TOON file: ref/huni/toon/item-management.toon`);

  if (!fs.existsSync(toonPath)) {
    console.error(`${LABEL} ERROR: TOON file not found at ${toonPath}`);
    process.exit(1);
  }

  // Parse TOON
  const sheets = parseToon(toonPath);
  const sheet = sheets.get("Sheet");

  if (!sheet) {
    console.error(`${LABEL} ERROR: Sheet named "Sheet" not found in TOON file`);
    console.error(`${LABEL} Available sheets: ${Array.from(sheets.keys()).join(", ")}`);
    process.exit(1);
  }

  console.log(`${LABEL} Parsing Sheet (${sheet.rows.length} rows)...`);

  // Build database connection
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error(`${LABEL} ERROR: DATABASE_URL environment variable is not set`);
    process.exit(1);
  }

  const client = postgres(connectionString, { max: 5 });
  const db = drizzle(client);

  // Stats tracking
  let processed = 0;
  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Collect valid rows
  type MesItemRecord = {
    itemCode: string;
    groupCode: string | null;
    name: string;
    abbreviation: string | null;
    itemType: string;
    unit: string;
    isActive: boolean;
  };

  const records: MesItemRecord[] = [];

  // @MX:NOTE: [AUTO] Row mapping: A=groupCode, B=itemCode, C=name, D=abbrev, E=type, F=unit, I=isActive
  // @MX:REASON: Columns are named by Korean header labels in TOON; mapping defined in item-management-mapping.yaml
  for (const row of sheet.rows) {
    processed++;

    // Row 1 is the header — already handled by parser, but skip defensive check
    const rowNum = parseInt(row._row, 10);
    if (rowNum === 1) {
      skipped++;
      continue;
    }

    const rawItemCode = (row["품목 코드"] ?? "").trim();

    // Skip rows with empty item code
    if (!rawItemCode) {
      skipped++;
      continue;
    }

    // Skip rows where item code does not match NNN-NNNN pattern
    if (!isValidItemCode(rawItemCode)) {
      console.log(`${LABEL}   SKIP row ${rowNum}: invalid item_code format "${rawItemCode}"`);
      skipped++;
      continue;
    }

    // @MX:NOTE: [AUTO] groupCode is extracted from column A (품목 그룹)
    // Group code is a 10-digit number like "0020020000"; we store the full code
    const rawGroupCode = (row["품목 그룹"] ?? "").trim();
    const groupCode = rawGroupCode || null;

    const name = (row["품목 명"] ?? "").trim();
    const abbreviation = (row["품목 약어명"] ?? "").trim() || null;

    // @MX:NOTE: [AUTO] itemType default: "완제품" maps to "PRODUCT"; empty → default 'PRODUCT'
    const rawItemType = (row["품목 유형"] ?? "").trim();
    const itemType = rawItemType || "PRODUCT";

    // @MX:NOTE: [AUTO] Unit: EA (default) or 매 (sheet/leaf unit for stickers)
    const rawUnit = (row["단위"] ?? "").trim();
    const unit = rawUnit || "EA";

    // @MX:NOTE: [AUTO] isActive: column I (사용유무) — "Y" = true, "N" = false, empty = true
    const rawIsActive = (row["사용유무"] ?? "").trim();
    const isActive = parseIsActive(rawIsActive);

    if (!name) {
      console.log(`${LABEL}   SKIP row ${rowNum}: empty name for itemCode "${rawItemCode}"`);
      skipped++;
      continue;
    }

    records.push({
      itemCode: rawItemCode,
      groupCode,
      name,
      abbreviation,
      itemType,
      unit,
      isActive,
    });
  }

  console.log(`${LABEL} Valid records to upsert: ${records.length}`);

  // Batch upsert
  const totalBatches = Math.ceil(records.length / BATCH_SIZE);

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const batchStart = batchIdx * BATCH_SIZE;
    const batch = records.slice(batchStart, batchStart + BATCH_SIZE);
    const batchNum = batchIdx + 1;

    console.log(`${LABEL} Inserting batch ${batchNum}/${totalBatches} (${batch.length} items)...`);

    try {
      // @MX:ANCHOR: [AUTO] Upsert entry point — ON CONFLICT updates name, abbreviation, groupCode, isActive
      // @MX:REASON: Must be idempotent; re-running the import should not create duplicates
      await db
        .insert(mesItems)
        .values(
          batch.map((r) => ({
            itemCode: r.itemCode,
            groupCode: r.groupCode,
            name: r.name,
            abbreviation: r.abbreviation,
            itemType: r.itemType,
            unit: r.unit,
            isActive: r.isActive,
          }))
        )
        .onConflictDoUpdate({
          target: mesItems.itemCode,
          set: {
            name: sql`excluded.name`,
            abbreviation: sql`excluded.abbreviation`,
            groupCode: sql`excluded.group_code`,
            unit: sql`excluded.unit`,
            isActive: sql`excluded.is_active`,
            updatedAt: sql`now()`,
          },
        });

      inserted += batch.length;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`${LABEL}   ERROR in batch ${batchNum}: ${message}`);
      errors.push(`batch ${batchNum}: ${message}`);
    }
  }

  await client.end();

  // Summary
  console.log(
    `${LABEL} Done: ${processed} processed, ${inserted} inserted/updated, ${skipped} skipped${
      errors.length > 0 ? `, ${errors.length} errors` : ""
    }`
  );

  if (errors.length > 0) {
    console.error(`${LABEL} Errors summary:`);
    for (const e of errors) {
      console.error(`  - ${e}`);
    }
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(`${LABEL} Fatal error:`, err);
  process.exit(1);
});
