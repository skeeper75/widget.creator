// @MX:NOTE: [AUTO] Category hierarchy import — Step 5 of SPEC-IM-003 M1
// @MX:NOTE: [AUTO] Hardcoded static data: 12 root categories + sub-categories derived from MAP sheet analysis
// @MX:REASON: Categories are foundational FK targets for products; must exist before any product import
// @MX:SPEC: SPEC-IM-003 M1-REQ-001

import * as path from "path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import { categories } from "../../packages/shared/src/db/schema/huni-catalog.schema.js";
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

const LABEL = "[import-categories]";
const BATCH_SIZE = 50;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CategoryRecord = {
  code: string;
  name: string;
  parentCode: string | null;
  depth: number;
  displayOrder: number;
  sheetName: string | null;
};

// ---------------------------------------------------------------------------
// Static Category Data (M1-REQ-001)
// ---------------------------------------------------------------------------

// @MX:ANCHOR: [AUTO] Root and sub-category definitions — FK foundation for all product imports
// @MX:REASON: fan_in >= 3 — referenced by import-products, import-paper-mappings, and admin UI
// @MX:SPEC: SPEC-IM-003 M1-REQ-001
const CATEGORIES: CategoryRecord[] = [
  // Root categories (depth=0)
  { code: "PRINT",          name: "디지털인쇄",   parentCode: null, depth: 0, displayOrder: 1,  sheetName: "디지털인쇄" },
  { code: "STICKER",        name: "스티커",       parentCode: null, depth: 0, displayOrder: 2,  sheetName: "스티커" },
  { code: "BOOK",           name: "책자",         parentCode: null, depth: 0, displayOrder: 3,  sheetName: "책자" },
  { code: "POSTER",         name: "실사",         parentCode: null, depth: 0, displayOrder: 4,  sheetName: "실사" },
  { code: "SIGN",           name: "사인",         parentCode: null, depth: 0, displayOrder: 5,  sheetName: "사인" },
  { code: "CALENDAR",       name: "캘린더",       parentCode: null, depth: 0, displayOrder: 6,  sheetName: "캘린더" },
  { code: "ACRYLIC",        name: "아크릴",       parentCode: null, depth: 0, displayOrder: 7,  sheetName: "아크릴" },
  { code: "GOODS",          name: "굿즈",         parentCode: null, depth: 0, displayOrder: 8,  sheetName: "굿즈" },
  { code: "NOTE",           name: "문구",         parentCode: null, depth: 0, displayOrder: 9,  sheetName: "문구(노트)" },
  { code: "ACCESSORY",      name: "악세사리",     parentCode: null, depth: 0, displayOrder: 10, sheetName: "상품악세사리" },
  { code: "PHOTOBOOK",      name: "포토북",       parentCode: null, depth: 0, displayOrder: 11, sheetName: "포토북" },
  { code: "DESIGN_CALENDAR",name: "디자인캘린더", parentCode: null, depth: 0, displayOrder: 12, sheetName: "디자인캘린더" },

  // Sub-categories for PRINT (depth=1) — derived from MAP sheet
  { code: "PRINT_POSTCARD",     name: "엽서",       parentCode: "PRINT", depth: 1, displayOrder: 1,  sheetName: null },
  { code: "PRINT_FOLDCARD",     name: "접지카드",   parentCode: "PRINT", depth: 1, displayOrder: 2,  sheetName: null },
  { code: "PRINT_POSTCARD_BOOK",name: "엽서북",     parentCode: "PRINT", depth: 1, displayOrder: 3,  sheetName: null },
  { code: "PRINT_PHOTOCARD",    name: "포토카드",   parentCode: "PRINT", depth: 1, displayOrder: 4,  sheetName: null },
  { code: "PRINT_FLYER",        name: "전단지/리플렛", parentCode: "PRINT", depth: 1, displayOrder: 5, sheetName: null },
  { code: "PRINT_CARD",         name: "명함",       parentCode: "PRINT", depth: 1, displayOrder: 6,  sheetName: null },
  { code: "PRINT_VOUCHER",      name: "쿠폰/상품권",parentCode: "PRINT", depth: 1, displayOrder: 7,  sheetName: null },
  { code: "PRINT_ENVELOPE",     name: "봉투",       parentCode: "PRINT", depth: 1, displayOrder: 8,  sheetName: null },
  { code: "PRINT_BG",           name: "인쇄배경지", parentCode: "PRINT", depth: 1, displayOrder: 9,  sheetName: null },
  { code: "PRINT_SLOGAN",       name: "종이슬로건", parentCode: "PRINT", depth: 1, displayOrder: 10, sheetName: null },
  { code: "PRINT_HEADERTAG",    name: "헤더택",     parentCode: "PRINT", depth: 1, displayOrder: 11, sheetName: null },
  { code: "PRINT_LABELTAG",     name: "라벨택",     parentCode: "PRINT", depth: 1, displayOrder: 12, sheetName: null },

  // Sub-categories for STICKER (depth=1)
  { code: "STICKER_DIECUT_FREE",  name: "자유형 스티커",  parentCode: "STICKER", depth: 1, displayOrder: 1, sheetName: null },
  { code: "STICKER_STANDARD",     name: "규격 스티커",    parentCode: "STICKER", depth: 1, displayOrder: 2, sheetName: null },
  { code: "STICKER_SPECIAL",      name: "특수 스티커",    parentCode: "STICKER", depth: 1, displayOrder: 3, sheetName: null },
  { code: "STICKER_PACK",         name: "스티커팩",       parentCode: "STICKER", depth: 1, displayOrder: 4, sheetName: null },

  // Sub-categories for BOOK (depth=1)
  { code: "BOOK_SADDLE",    name: "중철책자",   parentCode: "BOOK", depth: 1, displayOrder: 1, sheetName: null },
  { code: "BOOK_PERFECT",   name: "무선책자",   parentCode: "BOOK", depth: 1, displayOrder: 2, sheetName: null },
  { code: "BOOK_PUR",       name: "PUR책자",    parentCode: "BOOK", depth: 1, displayOrder: 3, sheetName: null },
  { code: "BOOK_RING",      name: "트윈링책자", parentCode: "BOOK", depth: 1, displayOrder: 4, sheetName: null },
  { code: "BOOK_HARDCOVER", name: "하드커버책자",parentCode: "BOOK", depth: 1, displayOrder: 5, sheetName: null },

  // Sub-categories for CALENDAR (depth=1)
  { code: "CAL_DESK",       name: "탁상형캘린더", parentCode: "CALENDAR", depth: 1, displayOrder: 1, sheetName: null },
  { code: "CAL_WALL",       name: "벽걸이캘린더", parentCode: "CALENDAR", depth: 1, displayOrder: 2, sheetName: null },
  { code: "CAL_POSTCARD",   name: "엽서캘린더",   parentCode: "CALENDAR", depth: 1, displayOrder: 3, sheetName: null },

  // Sub-categories for SIGN (depth=1)
  { code: "SIGN_BANNER",    name: "배너/현수막",    parentCode: "SIGN", depth: 1, displayOrder: 1, sheetName: null },
  { code: "SIGN_CUTTING",   name: "시트커팅/스티커",parentCode: "SIGN", depth: 1, displayOrder: 2, sheetName: null },
  { code: "SIGN_BOARD",     name: "보드/액자",      parentCode: "SIGN", depth: 1, displayOrder: 3, sheetName: null },
  { code: "SIGN_POP",       name: "POP",            parentCode: "SIGN", depth: 1, displayOrder: 4, sheetName: null },
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
  const client = postgres(connectionString);
  return drizzle(client);
}

// ---------------------------------------------------------------------------
// Import Log Helpers
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
      phase: "M1",
      step: "import-categories",
      executionTime: Date.now() - opts.startedAt.getTime(),
    },
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`${LABEL} Starting category import`);
  console.log(`${LABEL} Total categories: ${CATEGORIES.length}`);
  if (DRY_RUN) console.log(`${LABEL} Mode: dry-run (no DB writes)`);
  if (VALIDATE_ONLY) {
    console.log(`${LABEL} Mode: validate-only`);
    console.log(`${LABEL} Categories to import: ${CATEGORIES.length}`);
    // Validate parent references
    const codes = new Set(CATEGORIES.map((c) => c.code));
    for (const cat of CATEGORIES) {
      if (cat.parentCode && !codes.has(cat.parentCode)) {
        console.error(`${LABEL} ERROR: parentCode '${cat.parentCode}' not found for '${cat.code}'`);
        process.exit(1);
      }
    }
    console.log(`${LABEL} Validation OK`);
    return;
  }

  const db = createDb();
  const startedAt = new Date();

  // Separate roots from sub-categories
  const roots = CATEGORIES.filter((c) => c.depth === 0);
  const subs = CATEGORIES.filter((c) => c.depth > 0);

  let inserted = 0;
  let updated = 0;
  let errored = 0;

  // Step 1: Insert root categories (no parentId FK)
  console.log(`${LABEL} Inserting ${roots.length} root categories...`);
  for (let i = 0; i < roots.length; i += BATCH_SIZE) {
    const batch = roots.slice(i, i + BATCH_SIZE);
    if (!DRY_RUN) {
      try {
        const result = await db
          .insert(categories)
          .values(
            batch.map((c) => ({
              code: c.code,
              name: c.name,
              parentId: null,
              depth: c.depth,
              displayOrder: c.displayOrder,
              sheetName: c.sheetName,
            }))
          )
          .onConflictDoUpdate({
            target: [categories.code],
            set: {
              name: sql`excluded.name`,
              depth: sql`excluded.depth`,
              displayOrder: sql`excluded.display_order`,
              sheetName: sql`excluded.sheet_name`,
              updatedAt: sql`now()`,
            },
          })
          .returning({ id: categories.id });
        inserted += result.length;
      } catch (err) {
        console.error(`${LABEL} ERROR inserting root batch:`, err);
        errored += batch.length;
      }
    } else {
      inserted += batch.length;
    }
  }

  // Step 2: Insert sub-categories with parentId FK resolution
  console.log(`${LABEL} Inserting ${subs.length} sub-categories...`);

  // Build code->id map from DB
  const existingRoots = await db
    .select({ code: categories.code, id: categories.id })
    .from(categories)
    .where(sql`depth = 0`);
  const codeToId = new Map(existingRoots.map((r) => [r.code, r.id]));

  for (let i = 0; i < subs.length; i += BATCH_SIZE) {
    const batch = subs.slice(i, i + BATCH_SIZE);
    const rows = batch
      .map((c) => {
        const parentId = c.parentCode ? (codeToId.get(c.parentCode) ?? null) : null;
        if (c.parentCode && parentId === null) {
          console.warn(`${LABEL} WARN: parentCode '${c.parentCode}' not found for '${c.code}', skipping`);
          return null;
        }
        return {
          code: c.code,
          name: c.name,
          parentId,
          depth: c.depth,
          displayOrder: c.displayOrder,
          sheetName: c.sheetName,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (rows.length === 0) continue;

    if (!DRY_RUN) {
      try {
        const result = await db
          .insert(categories)
          .values(rows)
          .onConflictDoUpdate({
            target: [categories.code],
            set: {
              name: sql`excluded.name`,
              parentId: sql`excluded.parent_id`,
              depth: sql`excluded.depth`,
              displayOrder: sql`excluded.display_order`,
              sheetName: sql`excluded.sheet_name`,
              updatedAt: sql`now()`,
            },
          })
          .returning({ id: categories.id });
        inserted += result.length;
      } catch (err) {
        console.error(`${LABEL} ERROR inserting sub-category batch:`, err);
        errored += rows.length;
      }
    } else {
      inserted += rows.length;
    }
  }

  const total = CATEGORIES.length;
  const status = errored > 0 ? "partial" : "success";

  if (!DRY_RUN) {
    await writeImportLog(db, {
      tableName: "categories",
      total,
      inserted,
      updated,
      skipped: 0,
      errored,
      status,
      startedAt,
    });
  }

  console.log(`${LABEL} Done: inserted=${inserted}, updated=${updated}, errored=${errored}`);
  if (errored > 0) process.exit(1);
}

main().catch((err) => {
  console.error(`${LABEL} Fatal error:`, err);
  process.exit(1);
});
