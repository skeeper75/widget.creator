// @MX:NOTE: [AUTO] Imposition rules import — Step 8 of SPEC-IM-003 M2
// @MX:NOTE: [AUTO] Reads "사이즈별 판걸이수" sheet from 가격표_extracted.json
// @MX:SPEC: SPEC-IM-003 M2-REQ-004

import * as path from "path";
import * as fs from "fs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import { impositionRules } from "../../packages/shared/src/db/schema/huni-processes.schema.js";
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

const LABEL = "[import-imposition-rules]";
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

type ImpositionRecord = {
  cutSizeCode: string;   // raw column A e.g. "73*98" or "100*150(2단)"
  cutWidth: number;
  cutHeight: number;
  workWidth: number;
  workHeight: number;
  impositionCount: number;
  sheetStandard: string; // "A3" or "T3"
  description: string | null;
};

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

function parseSizeString(raw: string): { w: number; h: number } | null {
  // Handles "73*98", "100*150", "202*152", "75*100" etc.
  const match = String(raw).match(/^(\d+(?:\.\d+)?)\s*[*xX×]\s*(\d+(?:\.\d+)?)/);
  if (!match) return null;
  return { w: parseFloat(match[1]), h: parseFloat(match[2]) };
}

// @MX:NOTE: [AUTO] Parses imposition count string — handles "15자리" format and numeric values
function parseImpositionCount(raw: unknown): number | null {
  if (typeof raw === "number") return Math.round(raw);
  if (typeof raw === "string") {
    const match = raw.match(/^(\d+)/);
    if (match) return parseInt(match[1], 10);
  }
  return null;
}

function parseImpositionSheet(data: ExtractedData): ImpositionRecord[] {
  const sheet = data.sheets.find((s) => s.name === "사이즈별 판걸이수");
  if (!sheet) {
    throw new Error("Sheet '사이즈별 판걸이수' not found in 가격표_extracted.json");
  }

  const result: ImpositionRecord[] = [];

  for (const row of sheet.rows) {
    if (row.rowIndex === 1) continue; // header row

    const cells: Record<string, unknown> = {};
    for (const cell of row.cells) {
      cells[cell.col] = cell.value;
    }

    const colA = cells["A"];
    const colB = cells["B"];
    const colD = cells["D"];
    const colE = cells["E"];
    const colC = cells["C"];

    // Skip rows without a cut size (col A)
    if (!colA || typeof colA !== "string" || colA === "재단사이즈") continue;

    const cutSizeCode = String(colA).trim();
    const sheetStandard = colE ? String(colE).trim() : "A3";

    // Skip if no imposition count
    const impositionCount = parseImpositionCount(colD);
    if (impositionCount === null) continue;

    // Parse cut size from col A (take base dimensions before any "(2단)" suffix)
    const baseCutCode = cutSizeCode.replace(/\(.*?\)/, "").trim();
    const cut = parseSizeString(baseCutCode);
    if (!cut) {
      console.warn(`${LABEL} WARN: Cannot parse cut size '${cutSizeCode}', skipping`);
      continue;
    }

    // Parse work size from col B
    const workSizeRaw = colB ? String(colB).trim() : null;
    const work = workSizeRaw ? parseSizeString(workSizeRaw) : null;
    if (!work) {
      // Use cut size as fallback (some rows lack work size)
      result.push({
        cutSizeCode,
        cutWidth: cut.w,
        cutHeight: cut.h,
        workWidth: cut.w,
        workHeight: cut.h,
        impositionCount,
        sheetStandard,
        description: colC ? String(colC) : null,
      });
      continue;
    }

    result.push({
      cutSizeCode,
      cutWidth: cut.w,
      cutHeight: cut.h,
      workWidth: work.w,
      workHeight: work.h,
      impositionCount,
      sheetStandard,
      description: colC ? String(colC) : null,
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
      phase: "M2",
      step: "import-imposition-rules",
      executionTime: Date.now() - opts.startedAt.getTime(),
    },
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`${LABEL} Starting imposition rules import`);

  if (!fs.existsSync(DATA_PATH)) {
    console.error(`${LABEL} ERROR: Data file not found: ${DATA_PATH}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(DATA_PATH, "utf-8");
  const data: ExtractedData = JSON.parse(rawData);

  const records = parseImpositionSheet(data);
  console.log(`${LABEL} Parsed ${records.length} imposition rules`);

  if (VALIDATE_ONLY) {
    console.log(`${LABEL} Mode: validate-only`);
    for (const r of records) {
      if (!r.cutWidth || !r.cutHeight || !r.impositionCount) {
        console.error(`${LABEL} ERROR: Invalid record: ${JSON.stringify(r)}`);
        process.exit(1);
      }
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

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);
    try {
      const result = await db
        .insert(impositionRules)
        .values(
          batch.map((r) => ({
            cutSizeCode: r.cutSizeCode,
            cutWidth: String(r.cutWidth),
            cutHeight: String(r.cutHeight),
            workWidth: String(r.workWidth),
            workHeight: String(r.workHeight),
            impositionCount: r.impositionCount,
            sheetStandard: r.sheetStandard,
            description: r.description,
          }))
        )
        .onConflictDoUpdate({
          target: [
            impositionRules.cutWidth,
            impositionRules.cutHeight,
            impositionRules.sheetStandard,
          ],
          set: {
            cutSizeCode: sql`excluded.cut_size_code`,
            workWidth: sql`excluded.work_width`,
            workHeight: sql`excluded.work_height`,
            impositionCount: sql`excluded.imposition_count`,
            description: sql`excluded.description`,
            updatedAt: sql`now()`,
          },
        })
        .returning({ id: impositionRules.id });
      inserted += result.length;
    } catch (err) {
      console.error(`${LABEL} ERROR inserting batch [${i}-${i + batch.length}]:`, err);
      errored += batch.length;
    }
  }

  const status = errored > 0 ? "partial" : "success";
  await writeImportLog(db, {
    tableName: "imposition_rules",
    total: records.length,
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
