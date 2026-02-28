// @MX:NOTE: [AUTO] Process definitions import — Step 7 of SPEC-IM-003 M2
// @MX:NOTE: [AUTO] Hardcoded static data: 11 print modes, 8 post-processes, 5 bindings
// @MX:REASON: Process definitions are FK targets for price_tiers and package_prices; must exist before any pricing import
// @MX:SPEC: SPEC-IM-003 M2-REQ-001, M2-REQ-002, M2-REQ-003

import * as path from "path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import {
  printModes,
  postProcesses,
  bindings,
} from "../../packages/shared/src/db/schema/huni-processes.schema.js";
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

const LABEL = "[import-processes]";

// ---------------------------------------------------------------------------
// Static Data Definitions
// ---------------------------------------------------------------------------

// @MX:ANCHOR: [AUTO] Print mode definitions — FK target for price_tiers.optionCode
// @MX:REASON: fan_in >= 3 — referenced by price_tiers, package_prices, and fixed_prices
// @MX:SPEC: SPEC-IM-003 M2-REQ-001
const PRINT_MODES = [
  { priceCode: 0,  code: "NONE",          name: "없음",          sides: "none",   colorType: "none",  displayOrder: 0 },
  { priceCode: 1,  code: "SINGLE_MONO",   name: "단면 흑백",      sides: "single", colorType: "mono",  displayOrder: 1 },
  { priceCode: 2,  code: "DOUBLE_MONO",   name: "양면 흑백",      sides: "double", colorType: "mono",  displayOrder: 2 },
  { priceCode: 4,  code: "SINGLE_COLOR",  name: "단면 컬러",      sides: "single", colorType: "color", displayOrder: 3 },
  { priceCode: 8,  code: "DOUBLE_COLOR",  name: "양면 컬러",      sides: "double", colorType: "color", displayOrder: 4 },
  { priceCode: 11, code: "SINGLE_WHITE",  name: "단면 화이트",    sides: "single", colorType: "white", displayOrder: 5 },
  { priceCode: 12, code: "DOUBLE_WHITE",  name: "양면 화이트",    sides: "double", colorType: "white", displayOrder: 6 },
  { priceCode: 21, code: "SINGLE_CLEAR",  name: "단면 클리어",    sides: "single", colorType: "clear", displayOrder: 7 },
  { priceCode: 22, code: "DOUBLE_CLEAR",  name: "양면 클리어",    sides: "double", colorType: "clear", displayOrder: 8 },
  { priceCode: 31, code: "SINGLE_PINK",   name: "단면 핑크",      sides: "single", colorType: "pink",  displayOrder: 9 },
  { priceCode: 32, code: "DOUBLE_PINK",   name: "양면 핑크",      sides: "double", colorType: "pink",  displayOrder: 10 },
];

// @MX:ANCHOR: [AUTO] Post-process definitions — Postprocess001~008
// @MX:REASON: fan_in >= 3 — referenced by price_tiers (optionCode), product_options, and admin UI
// @MX:SPEC: SPEC-IM-003 M2-REQ-002
const POST_PROCESSES = [
  {
    groupCode: "mising",
    code: "Postprocess001",
    name: "미싱",
    processType: "perforation",
    priceBasis: "per_unit",
    sheetStandard: null as string | null,
    displayOrder: 1,
  },
  {
    groupCode: "oesi",
    code: "Postprocess002",
    name: "오시",
    processType: "creasing",
    priceBasis: "per_unit",
    sheetStandard: null as string | null,
    displayOrder: 2,
  },
  {
    groupCode: "folding",
    code: "Postprocess003",
    name: "접지",
    processType: "folding_with_crease",
    priceBasis: "per_unit",
    sheetStandard: null as string | null,
    displayOrder: 3,
  },
  {
    groupCode: "variable",
    code: "Postprocess004",
    name: "가변인쇄(텍스트)",
    processType: "variable_text",
    priceBasis: "fixed",
    sheetStandard: null as string | null,
    displayOrder: 4,
  },
  {
    groupCode: "variable",
    code: "Postprocess005",
    name: "가변인쇄(이미지)",
    processType: "variable_image",
    priceBasis: "fixed",
    sheetStandard: null as string | null,
    displayOrder: 5,
  },
  {
    groupCode: "corner",
    code: "Postprocess006",
    name: "귀돌이",
    processType: "rounded_corner",
    priceBasis: "per_unit",
    sheetStandard: null as string | null,
    displayOrder: 6,
  },
  {
    groupCode: "coating",
    code: "Postprocess007",
    name: "코팅(A3)",
    processType: "coating_a3",
    priceBasis: "per_sheet",
    sheetStandard: "A3",
    displayOrder: 7,
  },
  {
    groupCode: "coating",
    code: "Postprocess008",
    name: "코팅(T3)",
    processType: "coating_t3",
    priceBasis: "per_sheet",
    sheetStandard: "T3",
    displayOrder: 8,
  },
];

// @MX:ANCHOR: [AUTO] Binding type definitions — 5 book binding types
// @MX:REASON: fan_in >= 3 — referenced by booklet products, package_prices, and admin UI
// @MX:SPEC: SPEC-IM-003 M2-REQ-003
const BINDINGS = [
  { code: "SADDLE",    name: "중철",      minPages: 8,  maxPages: 64,  pageStep: 4,  displayOrder: 1 },
  { code: "PERFECT",   name: "무선",      minPages: 16, maxPages: 500, pageStep: 4,  displayOrder: 2 },
  { code: "PUR",       name: "PUR",       minPages: 16, maxPages: 500, pageStep: 4,  displayOrder: 3 },
  { code: "TWIN_RING", name: "트윈링",    minPages: 16, maxPages: 200, pageStep: 4,  displayOrder: 4 },
  { code: "HARDCOVER", name: "하드커버",  minPages: 16, maxPages: 300, pageStep: 4,  displayOrder: 5 },
];

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
    sourceFile: "static-data",
    sourceHash: "hardcoded-v1",
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
      step: "import-processes",
      executionTime: Date.now() - opts.startedAt.getTime(),
    },
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`${LABEL} Starting process definitions import`);
  console.log(`${LABEL} Print modes: ${PRINT_MODES.length}, Post-processes: ${POST_PROCESSES.length}, Bindings: ${BINDINGS.length}`);

  if (VALIDATE_ONLY) {
    console.log(`${LABEL} Mode: validate-only`);
    const codes = new Set(PRINT_MODES.map((m) => m.code));
    if (codes.size !== PRINT_MODES.length) {
      console.error(`${LABEL} ERROR: Duplicate print mode codes detected`);
      process.exit(1);
    }
    const ppCodes = new Set(POST_PROCESSES.map((p) => p.code));
    if (ppCodes.size !== POST_PROCESSES.length) {
      console.error(`${LABEL} ERROR: Duplicate post-process codes detected`);
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

  try {
  let totalErrored = 0;

  // --- Insert print modes ---
  console.log(`${LABEL} Inserting ${PRINT_MODES.length} print modes...`);
  let pmInserted = 0;
  try {
    const result = await db
      .insert(printModes)
      .values(PRINT_MODES)
      .onConflictDoUpdate({
        target: [printModes.code],
        set: {
          name: sql`excluded.name`,
          sides: sql`excluded.sides`,
          colorType: sql`excluded.color_type`,
          priceCode: sql`excluded.price_code`,
          displayOrder: sql`excluded.display_order`,
          updatedAt: sql`now()`,
        },
      })
      .returning({ id: printModes.id });
    pmInserted = result.length;
  } catch (err) {
    console.error(`${LABEL} ERROR inserting print modes:`, err);
    totalErrored += PRINT_MODES.length;
  }

  await writeImportLog(db, {
    tableName: "print_modes",
    total: PRINT_MODES.length,
    inserted: pmInserted,
    updated: 0,
    skipped: 0,
    errored: totalErrored,
    status: totalErrored > 0 ? "partial" : "success",
    startedAt,
  });

  // --- Insert post-processes ---
  console.log(`${LABEL} Inserting ${POST_PROCESSES.length} post-processes...`);
  let ppInserted = 0;
  let ppErrored = 0;
  try {
    const result = await db
      .insert(postProcesses)
      .values(
        POST_PROCESSES.map((p) => ({
          groupCode: p.groupCode,
          code: p.code,
          name: p.name,
          processType: p.processType,
          priceBasis: p.priceBasis,
          sheetStandard: p.sheetStandard,
          displayOrder: p.displayOrder,
        }))
      )
      .onConflictDoUpdate({
        target: [postProcesses.code],
        set: {
          name: sql`excluded.name`,
          groupCode: sql`excluded.group_code`,
          processType: sql`excluded.process_type`,
          priceBasis: sql`excluded.price_basis`,
          sheetStandard: sql`excluded.sheet_standard`,
          updatedAt: sql`now()`,
        },
      })
      .returning({ id: postProcesses.id });
    ppInserted = result.length;
  } catch (err) {
    console.error(`${LABEL} ERROR inserting post-processes:`, err);
    ppErrored = POST_PROCESSES.length;
  }

  await writeImportLog(db, {
    tableName: "post_processes",
    total: POST_PROCESSES.length,
    inserted: ppInserted,
    updated: 0,
    skipped: 0,
    errored: ppErrored,
    status: ppErrored > 0 ? "partial" : "success",
    startedAt,
  });

  // --- Insert bindings ---
  console.log(`${LABEL} Inserting ${BINDINGS.length} binding types...`);
  let bindInserted = 0;
  let bindErrored = 0;
  try {
    const result = await db
      .insert(bindings)
      .values(BINDINGS)
      .onConflictDoUpdate({
        target: [bindings.code],
        set: {
          name: sql`excluded.name`,
          minPages: sql`excluded.min_pages`,
          maxPages: sql`excluded.max_pages`,
          pageStep: sql`excluded.page_step`,
          updatedAt: sql`now()`,
        },
      })
      .returning({ id: bindings.id });
    bindInserted = result.length;
  } catch (err) {
    console.error(`${LABEL} ERROR inserting bindings:`, err);
    bindErrored = BINDINGS.length;
  }

  await writeImportLog(db, {
    tableName: "bindings",
    total: BINDINGS.length,
    inserted: bindInserted,
    updated: 0,
    skipped: 0,
    errored: bindErrored,
    status: bindErrored > 0 ? "partial" : "success",
    startedAt,
  });

  console.log(`${LABEL} Done: print_modes=${pmInserted}, post_processes=${ppInserted}, bindings=${bindInserted}`);

  if (totalErrored > 0 || ppErrored > 0 || bindErrored > 0) {
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
