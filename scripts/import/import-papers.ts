// @MX:NOTE: [AUTO] Paper master import — Step 2 of SPEC-IM-003
// @MX:NOTE: [AUTO] Primary source: 출력소재관리_extracted.json (!출력소재 sheet, columns C-I)
// @MX:NOTE: [AUTO] Fallback: 랑데뷰 WH 240g/310g use hardcoded values from 상품마스터.xlsx (Q19-001)
// @MX:SPEC: SPEC-IM-003 M1-REQ-005

import * as fs from "fs";
import * as path from "path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import { papers } from "../../packages/shared/src/db/schema/huni-materials.schema.js";
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

const LABEL = "[import-papers]";
const BATCH_SIZE = 50;

const DATA_PATH = path.resolve(
  __dirname,
  "../../ref/huni/extracted/출력소재관리_extracted.json"
);

// @MX:NOTE: [AUTO] Color skip rules: A5A5A5 = deprecated/unavailable, D8D8D8 = discontinued
// @MX:REASON: Must exclude non-active papers from pricing engine
const SKIP_COLORS = new Set(["A5A5A5", "D8D8D8"]);

// @MX:NOTE: [AUTO] 랑데뷰 WH hardcoded overrides per Q19-001 decision
// @MX:REASON: 출력소재관리.xlsx values are incorrect for 랑데뷰; use 상품마스터.xlsx values (157원/203원)
const RANDEVOO_OVERRIDES: Record<string, { sellingPer4Cut: string }> = {
  "랑데뷰 WH 240g": { sellingPer4Cut: "157" },
  "랑데뷰 WH 310g": { sellingPer4Cut: "203" },
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Cell = { col: string; colIndex: number; value: unknown; bgColor?: string };
type Row = { rowIndex: number; cells: Cell[] };
type Sheet = { name: string; totalRows: number; rows: Row[] };
type ExtractedData = { sheets: Sheet[] };

type PaperRecord = {
  code: string;
  name: string;
  abbreviation: string | null;
  weight: number | null;
  sheetSize: string | null;
  costPerReam: string | null;
  costPer4Cut: string | null;
  sellingPerReam: string | null;
  sellingPer4Cut: string | null;
  displayOrder: number;
  isActive: boolean;
};

// ---------------------------------------------------------------------------
// Code generation — must match import-paper-mappings.ts logic exactly
// ---------------------------------------------------------------------------

// @MX:ANCHOR: [AUTO] Paper code generation — FK foundation for paper_product_mapping
// @MX:REASON: fan_in >= 3 — referenced by import-paper-mappings.ts, import-fixed-prices.ts, and pricing engine
function generateCode(name: string, weight: number | null): string {
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

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

function parseNumericField(val: unknown): string | null {
  if (typeof val === "number" && val > 0) return String(val);
  if (typeof val === "string") {
    const cleaned = val.replace(/,/g, "").trim();
    const n = parseFloat(cleaned);
    if (!isNaN(n) && n > 0) return String(n);
  }
  return null;
}

// @MX:NOTE: [AUTO] Parses !출력소재 sheet from 출력소재관리_extracted.json
// Column C = name, D = weight, E = abbreviation, F = purchaseInfo (unused — not in schema)
// Column G = sheetSize (전지), H = sellingPerReam (연당가), I = sellingPer4Cut (국4절 단가)
// Active papers have D9EAD3 bgColor on column I; skip A5A5A5/D8D8D8 on column B or C
function parsePapersFromJson(data: ExtractedData): PaperRecord[] {
  const sheet = data.sheets.find((s) => s.name === "!출력소재");
  if (!sheet) {
    throw new Error("Sheet '!출력소재' not found in 출력소재관리_extracted.json");
  }

  const result: PaperRecord[] = [];
  let displayOrder = 0;

  for (const row of sheet.rows) {
    if (row.rowIndex <= 3) continue; // skip 3 header rows

    const cellsMap: Record<string, unknown> = {};
    const colorsMap: Record<string, string> = {};

    for (const cell of row.cells) {
      cellsMap[cell.col] = cell.value;
      if (cell.bgColor) colorsMap[cell.col] = cell.bgColor.toUpperCase();
    }

    const name = cellsMap["C"];
    if (!name || typeof name !== "string" || name.trim() === "") continue;
    if (name.trim() === "종이명" || name.trim() === "대분류" || name.trim() === "구분") continue;

    // Skip discontinued papers (A5A5A5 on column C or B)
    const nameColor = colorsMap["C"] ?? colorsMap["B"] ?? "";
    if (SKIP_COLORS.has(nameColor)) continue;

    // Skip rows without active pricing (no D9EAD3 on column I)
    // Rows 86+ have no D9EAD3 pricing — they use Roll/Box pricing not in scope
    const pricingColor = colorsMap["I"] ?? "";
    if (pricingColor && pricingColor !== "D9EAD3") continue;
    // If I column has no color at all and I value is empty/null, skip
    if (!pricingColor && !cellsMap["I"]) continue;

    const nameStr = name.trim();

    const weightRaw = cellsMap["D"];
    let weight: number | null = null;
    if (typeof weightRaw === "number") {
      weight = Math.round(weightRaw);
    }
    // Skip rows with D="X" (non-standard sticker rolls — no weight)
    if (weightRaw === "X") continue;

    const abbreviation = cellsMap["E"];
    const sheetSizeRaw = cellsMap["G"];
    const sellingPerReamRaw = cellsMap["H"];
    const sellingPer4CutRaw = cellsMap["I"];

    const code = generateCode(nameStr, weight);
    if (!code) continue;

    displayOrder++;

    let sellingPer4Cut = parseNumericField(sellingPer4CutRaw);

    // Apply 랑데뷰 override (Q19-001: 출력소재관리.xlsx values are incorrect)
    const override = RANDEVOO_OVERRIDES[nameStr];
    if (override) {
      sellingPer4Cut = override.sellingPer4Cut;
    }

    result.push({
      code,
      name: nameStr,
      abbreviation: typeof abbreviation === "string" && abbreviation.trim() ? abbreviation.trim() : null,
      weight,
      sheetSize: typeof sheetSizeRaw === "string" && sheetSizeRaw.trim() ? sheetSizeRaw.trim() : null,
      costPerReam: null,  // cost data not in 출력소재관리.xlsx
      costPer4Cut: null,
      sellingPerReam: parseNumericField(sellingPerReamRaw),
      sellingPer4Cut,
      displayOrder,
      isActive: true,
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
  const client = postgres(connectionString, { max: 5 });
  return { db: drizzle(client), client };
}

// ---------------------------------------------------------------------------
// Import Log
// ---------------------------------------------------------------------------

async function writeImportLog(
  db: ReturnType<typeof drizzle>,
  opts: {
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
    tableName: "papers",
    sourceFile: "출력소재관리_extracted.json",
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
      phase: "M1",
      step: "import-papers",
      executionTime: Date.now() - opts.startedAt.getTime(),
    },
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`${LABEL} Starting papers import (출력소재관리_extracted.json)`);

  if (!fs.existsSync(DATA_PATH)) {
    console.error(`${LABEL} ERROR: Data file not found: ${DATA_PATH}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(DATA_PATH, "utf-8");
  const data: ExtractedData = JSON.parse(rawData);

  const records = parsePapersFromJson(data);
  console.log(`${LABEL} Parsed ${records.length} active paper records`);

  if (VALIDATE_ONLY) {
    console.log(`${LABEL} Mode: validate-only`);
    if (records.length === 0) {
      console.error(`${LABEL} ERROR: No paper records found`);
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
  let inserted = 0;
  let errored = 0;

  const totalBatches = Math.ceil(records.length / BATCH_SIZE);

  for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
    const batchStart = batchIdx * BATCH_SIZE;
    const batch = records.slice(batchStart, batchStart + BATCH_SIZE);
    console.log(`${LABEL} Inserting batch ${batchIdx + 1}/${totalBatches} (${batch.length} items)...`);

    try {
      // @MX:ANCHOR: [AUTO] Paper upsert entry point — ON CONFLICT (code) DO UPDATE
      // @MX:REASON: fan_in >= 3 — called by import orchestrator, paper-mappings, and pricing engine FK lookups
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
            sellingPer4Cut: r.sellingPer4Cut,
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
            sellingPer4Cut: sql`excluded.selling_per4_cut`,
            displayOrder: sql`excluded.display_order`,
            updatedAt: sql`now()`,
          },
        });

      inserted += batch.length;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`${LABEL} ERROR in batch ${batchIdx + 1}: ${message}`);
      errored += batch.length;
    }
  }

  const status = errored > 0 ? "partial" : "success";
  await writeImportLog(db, {
    total: records.length,
    inserted,
    updated: 0,
    skipped: 0,
    errored,
    status,
    startedAt,
  });

  await client.end();

  console.log(`${LABEL} Done: inserted/updated=${inserted}, errored=${errored}`);
  if (errored > 0) process.exit(1);
}

main().catch((err) => {
  console.error(`${LABEL} Fatal error:`, err);
  process.exit(1);
});
