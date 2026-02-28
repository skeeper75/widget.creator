// @MX:NOTE: [AUTO] Paper-product mapping import — Step 9 of SPEC-IM-003 M1
// @MX:NOTE: [AUTO] Reads 출력소재관리_extracted.json K-Y columns (● markers) to build paper_product_mapping
// @MX:SPEC: SPEC-IM-003 M1-REQ-004

import * as path from "path";
import * as fs from "fs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql, eq, like } from "drizzle-orm";
import { generatePaperCode } from "./helpers/code-generators.js";
import { papers, paperProductMappings } from "../../packages/shared/src/db/schema/huni-materials.schema.js";
import { products } from "../../packages/shared/src/db/schema/huni-catalog.schema.js";
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

const LABEL = "[import-paper-mappings]";
const BATCH_SIZE = 50;
const DATA_PATH = path.resolve(
  __dirname,
  "../../ref/huni/extracted/출력소재관리_extracted.json"
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Cell = { col: string; colIndex: number; value: unknown; bgColor?: string };
type Row = { rowIndex: number; cells: Cell[] };
type Sheet = { name: string; totalRows: number; rows: Row[] };
type ExtractedData = { sheets: Sheet[] };

type MappingRecord = {
  paperName: string;
  paperWeight: number | null;
  paperCode: string;    // generated code matching papers.code
  productTypeColKey: string;  // e.g. "K", "L", etc.
  productTypeLabel: string;   // e.g. "프리미엄엽서"
};

// ---------------------------------------------------------------------------
// Column K-Y -> product type mapping
// Based on SPEC M1-REQ-004 and 출력소재관리.xlsx column headers
// ---------------------------------------------------------------------------

// @MX:ANCHOR: [AUTO] Column-to-product-type mapping — FK foundation for paper_product_mapping
// @MX:REASON: fan_in >= 3 — referenced by mapping parser, product lookup, and import log
// @MX:SPEC: SPEC-IM-004 M4-A-003 -- keywords must match actual products.name values in DB
const COL_TO_PRODUCT_KEYWORDS: Record<string, string[]> = {
  K: ["엽서", "투명엽서", "박엽서", "화이트인쇄엽서"],
  L: ["스탠다드엽서", "코팅엽서"],
  M: ["접지카드", "접지카드(2단)", "접지카드(3단)"],
  N: ["명함", "코팅명함", "투명명함", "화이트인쇄명함", "포토카드"],
  O: ["전단지", "리플렛"],
  P: ["중철책자"],    // 중철 내지
  Q: ["중철책자"],    // 중철 표지 (same product, different coverType)
  R: ["무선책자"],    // 무선 내지
  S: ["무선책자"],    // 무선 표지
  T: ["트윈링책자"],  // 트윈링 내지
  U: ["트윈링책자"],  // 트윈링 표지
  V: ["탁상형캘린더"],
  W: ["미니탁상형캘린더"],
  X: ["엽서캘린더"],
  Y: ["벽걸이캘린더"],
};

// Cover type for booklet columns (inner page vs cover)
const COL_TO_COVER_TYPE: Record<string, string | null> = {
  P: "inner",
  Q: "cover",
  R: "inner",
  S: "cover",
  T: "inner",
  U: "cover",
};

// Skip colors indicating discontinued or deprecated papers
const SKIP_COLORS = new Set(["D8D8D8", "A5A5A5"]);

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

// @MX:NOTE: [AUTO] Returns paper records with product-type column flags from 출력소재관리 sheet
function parsePaperMappings(data: ExtractedData): { paperCode: string; paperName: string; cols: string[] }[] {
  const sheet = data.sheets.find((s) => s.name === "!출력소재");
  if (!sheet) {
    throw new Error("Sheet '!출력소재' not found in 출력소재관리_extracted.json");
  }

  const result: { paperCode: string; paperName: string; cols: string[] }[] = [];

  for (const row of sheet.rows) {
    if (row.rowIndex <= 3) continue; // skip 3 header rows

    const cellsMap: Record<string, string | number | null> = {};
    const colorsMap: Record<string, string> = {};

    for (const cell of row.cells) {
      cellsMap[cell.col] = cell.value as string | number | null;
      if (cell.bgColor) colorsMap[cell.col] = cell.bgColor.toUpperCase();
    }

    const name = cellsMap["C"];
    if (!name || typeof name !== "string" || name.trim() === "") continue;
    if (name.trim() === "종이명" || name.trim() === "대분류") continue;

    // Skip discontinued papers
    const nameColor = colorsMap["C"] ?? colorsMap["B"] ?? "";
    if (SKIP_COLORS.has(nameColor)) continue;

    const weightRaw = cellsMap["D"];
    const weight = typeof weightRaw === "number" ? Math.round(weightRaw) : null;

    // Skip papers with weight "X" or no numeric weight for sticker/PET special cases
    // (rows 86-88 with D='X' are non-standard formats)
    if (weightRaw === "X" || weightRaw === null || weightRaw === undefined) {
      // Still process if there are product mapping markers
    }

    const paperCode = generatePaperCode(name.trim(), weight as number | null);

    // Find which product-type columns have ● marker
    const markedCols: string[] = [];
    for (const col of Object.keys(COL_TO_PRODUCT_KEYWORDS)) {
      const val = cellsMap[col];
      if (val === "●" || val === "●") {
        markedCols.push(col);
      }
    }

    if (markedCols.length > 0) {
      result.push({
        paperCode,
        paperName: name.trim(),
        cols: markedCols,
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
      step: "import-paper-mappings",
      executionTime: Date.now() - opts.startedAt.getTime(),
    },
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`${LABEL} Starting paper-product mapping import`);

  if (!fs.existsSync(DATA_PATH)) {
    console.error(`${LABEL} ERROR: Data file not found: ${DATA_PATH}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(DATA_PATH, "utf-8");
  const data: ExtractedData = JSON.parse(rawData);

  const parsedMappings = parsePaperMappings(data);
  console.log(`${LABEL} Parsed ${parsedMappings.length} papers with product mappings`);

  if (VALIDATE_ONLY) {
    console.log(`${LABEL} Mode: validate-only`);
    let totalMappings = 0;
    for (const m of parsedMappings) {
      totalMappings += m.cols.length;
    }
    console.log(`${LABEL} Total mapping records to insert: ${totalMappings}`);
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
  // Load papers from DB (by code)
  const dbPapers = await db
    .select({ id: papers.id, code: papers.code })
    .from(papers);
  const paperCodeToId = new Map(dbPapers.map((p) => [p.code, p.id]));
  console.log(`${LABEL} Loaded ${paperCodeToId.size} papers from DB`);

  // Load products from DB (by name for fuzzy matching)
  const dbProducts = await db
    .select({ id: products.id, name: products.name })
    .from(products);

  // Build a name -> id lookup (lowercase for case-insensitive matching)
  const productNameToId = new Map(
    dbProducts.map((p) => [p.name.trim().toLowerCase(), p.id])
  );
  console.log(`${LABEL} Loaded ${productNameToId.size} products from DB`);

  // Build mapping rows
  type MappingRow = {
    paperId: number;
    productId: number;
    coverType: string | null;
    isDefault: boolean;
  };

  const allMappingRows: MappingRow[] = [];
  let skipped = 0;

  for (const { paperCode, paperName, cols } of parsedMappings) {
    const paperId = paperCodeToId.get(paperCode);
    if (!paperId) {
      console.warn(`${LABEL} WARN: Paper not found in DB: '${paperName}' (code: ${paperCode})`);
      skipped++;
      continue;
    }

    for (const col of cols) {
      const keywords = COL_TO_PRODUCT_KEYWORDS[col] ?? [];
      const coverType = COL_TO_COVER_TYPE[col] ?? null;

      for (const keyword of keywords) {
        const productId = productNameToId.get(keyword.toLowerCase());
        if (!productId) {
          // Try partial match
          let found: number | undefined;
          for (const [name, id] of productNameToId) {
            if (name.includes(keyword.toLowerCase()) || keyword.toLowerCase().includes(name)) {
              found = id;
              break;
            }
          }
          if (!found) {
            // This is expected for products not yet imported; just skip
            continue;
          }
          allMappingRows.push({
            paperId,
            productId: found,
            coverType,
            isDefault: false,
          });
        } else {
          allMappingRows.push({
            paperId,
            productId,
            coverType,
            isDefault: false,
          });
        }
      }
    }
  }

  console.log(`${LABEL} Building ${allMappingRows.length} mapping rows...`);

  // Deduplicate by (paperId, productId, coverType)
  const seen = new Set<string>();
  const uniqueRows = allMappingRows.filter((r) => {
    const key = `${r.paperId}:${r.productId}:${r.coverType ?? "null"}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`${LABEL} Unique mapping rows: ${uniqueRows.length} (deduped from ${allMappingRows.length})`);

  let inserted = 0;
  let errored = 0;

  for (let i = 0; i < uniqueRows.length; i += BATCH_SIZE) {
    const batch = uniqueRows.slice(i, i + BATCH_SIZE);
    try {
      const result = await db
        .insert(paperProductMappings)
        .values(batch)
        .onConflictDoUpdate({
          target: [
            paperProductMappings.paperId,
            paperProductMappings.productId,
            paperProductMappings.coverType,
          ],
          set: {
            isDefault: sql`excluded.is_default`,
            updatedAt: sql`now()`,
          },
        })
        .returning({ id: paperProductMappings.id });
      inserted += result.length;
    } catch (err) {
      console.error(`${LABEL} ERROR inserting mapping batch [${i}-${i + batch.length}]:`, err);
      errored += batch.length;
    }
  }

  const total = uniqueRows.length;
  const status = errored > 0 ? "partial" : "success";
  await writeImportLog(db, {
    tableName: "paper_product_mapping",
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
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(`${LABEL} Fatal error:`, err);
  process.exit(1);
});
