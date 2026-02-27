// @MX:NOTE: [AUTO] Paper master import script — reads !디지털인쇄용지 sheet from product-master.toon
// @MX:NOTE: [AUTO] Target table: papers. Rows 1-3 are headers; data starts at row 4.
// @MX:REASON: Skip rows with color A5A5A5 (discontinued) or D8D8D8 (inactive) per product-master-mapping.yaml

import * as fs from "fs";
import * as path from "path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import { papers } from "../../packages/shared/src/db/schema/huni-materials.schema.js";

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
// TOON Parser (multi-sheet)
// ---------------------------------------------------------------------------
// @MX:NOTE: [AUTO] Reused parser pattern — same logic as import-mes-items.ts
// @MX:REASON: TOON is a project-wide format; parser logic must be consistent

function parseToon(filePath: string): Map<string, ParsedSheet> {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  const sheets = new Map<string, ParsedSheet>();
  let currentSheet: ParsedSheet | null = null;
  let headers: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    // Skip comment lines; detect sheet section headers
    if (line.startsWith("#")) {
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

    // Detect header row
    if (parts[0] === "_row") {
      headers = parts;
      currentSheet.headers = headers;
      continue;
    }

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

// @MX:NOTE: [AUTO] Color skip rules from product-master-mapping.yaml colorRules
// @MX:REASON: A5A5A5 = discontinued/unavailable; D8D8D8 = inactive/reference — both must be excluded
const SKIP_COLORS = new Set(["A5A5A5", "D8D8D8"]);

function shouldSkipRow(row: ToonRow): boolean {
  // Check if any key color column indicates row should be skipped
  // In TOON, color columns end with _clr suffix
  // The 종이명_clr and D_clr columns reliably indicate the row's display status
  const nameColor = (row["종이명_clr"] ?? "").trim().toUpperCase();
  const weightColor = (row["D_clr"] ?? "").trim().toUpperCase();

  if (SKIP_COLORS.has(nameColor) || SKIP_COLORS.has(weightColor)) {
    return true;
  }

  return false;
}

function parseWeight(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = parseFloat(trimmed);
  if (isNaN(n) || n <= 0) return null;
  return Math.round(n); // weight is stored as integer grams
}

function parseNumeric(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "=undefined") return null;
  // Remove comma separators if any
  const cleaned = trimmed.replace(/,/g, "");
  const n = parseFloat(cleaned);
  if (isNaN(n)) return null;
  return n.toString();
}

// @MX:NOTE: [AUTO] Code generation: name.trim().replace(/\s+/g, '-').toLowerCase() + '-' + weight + 'g'
// @MX:REASON: papers.code is UNIQUE NOT NULL; must be derived deterministically from paper attributes
function generateCode(name: string, weight: number | null): string {
  const namePart = name
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .replace(/[^\w\-가-힣]/g, "") // keep alphanumeric, hyphens, Korean
    .slice(0, 40); // limit length to fit within varchar(50)

  if (weight !== null) {
    return `${namePart}-${weight}g`.slice(0, 50);
  }
  return namePart.slice(0, 50);
}

// ---------------------------------------------------------------------------
// Import Runner
// ---------------------------------------------------------------------------

const LABEL = "[import-papers]";
const BATCH_SIZE = 50;

// @MX:NOTE: [AUTO] Header row numbers 1-3 are skipped per product-master-mapping.yaml
// @MX:REASON: Rows 1-3 contain multi-level headers (category labels, usage marks, processing marks)
const HEADER_ROW_THRESHOLD = 3;

async function run(): Promise<void> {
  const toonPath = path.resolve(
    __dirname,
    "../../ref/huni/toon/product-master.toon"
  );

  console.log(
    `${LABEL} Reading TOON file: ref/huni/toon/product-master.toon`
  );

  if (!fs.existsSync(toonPath)) {
    console.error(`${LABEL} ERROR: TOON file not found at ${toonPath}`);
    process.exit(1);
  }

  // Parse TOON
  const sheets = parseToon(toonPath);

  // @MX:NOTE: [AUTO] Target sheet is "!디지털인쇄용지" (note the leading "!")
  // @MX:REASON: Sheet name includes "!" prefix as stored in the TOON file's section header
  const SHEET_NAME = "!디지털인쇄용지";
  const sheet = sheets.get(SHEET_NAME);

  if (!sheet) {
    console.error(`${LABEL} ERROR: Sheet "${SHEET_NAME}" not found in TOON file`);
    console.error(
      `${LABEL} Available sheets: ${Array.from(sheets.keys()).join(", ")}`
    );
    process.exit(1);
  }

  console.log(`${LABEL} Parsing ${SHEET_NAME} (${sheet.rows.length} rows)...`);

  // Build database connection
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error(`${LABEL} ERROR: DATABASE_URL environment variable is not set`);
    process.exit(1);
  }

  const client = postgres(connectionString, { max: 5 });
  const db = drizzle(client);

  // Stats
  let processed = 0;
  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  type PaperRecord = {
    code: string;
    name: string;
    abbreviation: string | null;
    weight: number | null;
    sheetSize: string | null;
    costPerReam: string | null;
    costPer4Cut: string | null;
    sellingPerReam: string | null;
    displayOrder: number;
    isActive: boolean;
  };

  const records: PaperRecord[] = [];
  let displayOrder = 0;

  // @MX:NOTE: [AUTO] Column mapping for !디지털인쇄용지 sheet (verified from TOON header):
  //   구분 = category (A), 종이명 = name (G), 파일명약어 = abbreviation (H)
  //   D = weight (J index), 전지 = sheetSize (L), 연당가 = costPerReam (M)
  //   가격_(국4절) = costPer4Cut (N), 현재(A4) = sellingPerReam (O)
  // @MX:REASON: TOON uses Korean header names; must map explicitly to schema fields

  for (const row of sheet.rows) {
    processed++;

    const rowNum = parseInt(row._row, 10);

    // Skip header rows 1-3
    if (rowNum <= HEADER_ROW_THRESHOLD) {
      skipped++;
      continue;
    }

    // Skip rows with deprecated/discontinued colors
    if (shouldSkipRow(row)) {
      console.log(`${LABEL}   SKIP row ${rowNum}: deprecated color (A5A5A5 or D8D8D8)`);
      skipped++;
      continue;
    }

    const rawName = (row["종이명"] ?? "").trim();

    // Skip rows with empty name
    if (!rawName) {
      skipped++;
      continue;
    }

    // Skip names that are clearly formatting artifacts
    if (rawName.startsWith("=") || rawName === "-") {
      skipped++;
      continue;
    }

    const abbreviation = (row["파일명약어"] ?? "").trim() || null;
    const weight = parseWeight(row["D"] ?? "");
    const sheetSize = (row["전지"] ?? "").trim() || null;
    const costPerReam = parseNumeric(row["연당가"] ?? "");
    const costPer4Cut = parseNumeric(row["가격_(국4절)"] ?? "");
    const sellingPerReam = parseNumeric(row["현재(A4)"] ?? "");

    // Generate deterministic unique code
    const code = generateCode(rawName, weight);

    if (!code) {
      console.log(`${LABEL}   SKIP row ${rowNum}: could not generate code for name "${rawName}"`);
      skipped++;
      continue;
    }

    displayOrder++;

    records.push({
      code,
      name: rawName,
      abbreviation,
      weight,
      sheetSize,
      costPerReam,
      costPer4Cut,
      sellingPerReam,
      displayOrder,
      isActive: true,
    });
  }

  console.log(`${LABEL} Valid records to upsert: ${records.length}`);

  // Batch upsert
  const totalBatches = Math.ceil(records.length / BATCH_SIZE);

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const batchStart = batchIdx * BATCH_SIZE;
    const batch = records.slice(batchStart, batchStart + BATCH_SIZE);
    const batchNum = batchIdx + 1;

    console.log(
      `${LABEL} Inserting batch ${batchNum}/${totalBatches} (${batch.length} items)...`
    );

    try {
      // @MX:ANCHOR: [AUTO] Upsert entry point for papers — ON CONFLICT (code) DO UPDATE
      // @MX:REASON: Must be idempotent; code is the stable unique identifier derived from name+weight
      await db
        .insert(papers)
        .values(
          batch.map((r) => ({
            code: r.code,
            name: r.name,
            abbreviation: r.abbreviation,
            weight: r.weight !== null ? r.weight : undefined,
            sheetSize: r.sheetSize,
            costPerReam: r.costPerReam,
            costPer4Cut: r.costPer4Cut,
            sellingPerReam: r.sellingPerReam,
            displayOrder: r.displayOrder,
            isActive: r.isActive,
          }))
        )
        .onConflictDoUpdate({
          target: papers.code,
          set: {
            name: sql`excluded.name`,
            abbreviation: sql`excluded.abbreviation`,
            weight: sql`excluded.weight`,
            sheetSize: sql`excluded.sheet_size`,
            costPerReam: sql`excluded.cost_per_ream`,
            costPer4Cut: sql`excluded.cost_per4_cut`,
            sellingPerReam: sql`excluded.selling_per_ream`,
            displayOrder: sql`excluded.display_order`,
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
