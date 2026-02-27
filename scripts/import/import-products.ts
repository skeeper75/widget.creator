// @MX:NOTE: [AUTO] Product master import — Step 6 of SPEC-IM-003 M1
// @MX:NOTE: [AUTO] Imports products + product_sizes from 상품마스터_extracted.json
// @MX:SPEC: SPEC-IM-003 M1-REQ-002, M1-REQ-003

import * as path from "path";
import * as fs from "fs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql, eq } from "drizzle-orm";
import { categories, products, productSizes } from "../../packages/shared/src/db/schema/huni-catalog.schema.js";
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

const LABEL = "[import-products]";
const BATCH_SIZE = 50;
const DATA_PATH = path.resolve(
  __dirname,
  "../../ref/huni/extracted/상품마스터_extracted.json"
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Cell = { col: string; colIndex: number; value: unknown; bgColor?: string };
type Row = { rowIndex: number; cells: Cell[] };
type Sheet = { name: string; totalRows: number; rows: Row[] };
type ExtractedData = { sheets: Sheet[] };

type ProductRecord = {
  huniId: number | null;     // column B (numeric ID)
  mesCode: string | null;    // column C (MES ITEM_CD like "001-0001")
  name: string;
  sheetName: string;         // source sheet name -> categoryCode mapping
  category: string;          // column A (group label, carries forward)
  sizes: SizeRecord[];
};

type SizeRecord = {
  displayName: string;       // column E raw value
  impositionCount: number | null;  // column F (판수)
  bleed: number | null;      // column G (도련 mm)
  workSize: string | null;   // column H (작업사이즈 "W x H")
  cutSize: string | null;    // column I (재단사이즈 "W x H")
  sheetOutputSize: string | null; // column J (출력용지규격 like "316x467")
};

// ---------------------------------------------------------------------------
// Sheet -> Category Code mapping
// ---------------------------------------------------------------------------

// @MX:ANCHOR: [AUTO] Sheet name to category code mapping — FK foundation for products import
// @MX:REASON: fan_in >= 3 — used by parseProducts, all product records, and import log
// @MX:SPEC: SPEC-IM-003 M1-REQ-002
const SHEET_TO_CATEGORY: Record<string, string> = {
  "디지털인쇄": "PRINT",
  "스티커":     "STICKER",
  "책자":       "BOOK",
  "포토북":     "PHOTOBOOK",
  "캘린더":     "CALENDAR",
  "디자인캘린더": "DESIGN_CALENDAR",
  "실사":       "POSTER",
  "아크릴":     "ACRYLIC",
  "굿즈":       "GOODS",
  "문구(노트)": "NOTE",
  "상품악세사리": "ACCESSORY",
};

// Sheet -> productType mapping
// @MX:NOTE: [AUTO] productType determines pricing model; formula for acrylic/sign, fixed for business_card, package for booklet/postcard_book, tiered for others
// @MX:SPEC: SPEC-IM-003 M1-REQ-002
const SHEET_TO_PRODUCT_TYPE: Record<string, string> = {
  "디지털인쇄": "digital_print",
  "스티커":     "sticker",
  "책자":       "booklet",
  "포토북":     "photobook",
  "캘린더":     "calendar",
  "디자인캘린더": "calendar",
  "실사":       "sign",
  "아크릴":     "acrylic",
  "굿즈":       "goods",
  "문구(노트)": "stationery",
  "상품악세사리": "accessory",
};

// pricingModel mapping per product type
const PRICING_MODEL_MAP: Record<string, string> = {
  "digital_print": "tiered",
  "sticker":       "tiered",
  "booklet":       "package",
  "photobook":     "package",
  "calendar":      "tiered",
  "sign":          "formula",
  "acrylic":       "formula",
  "goods":         "tiered",
  "stationery":    "tiered",
  "accessory":     "tiered",
};

// Product name to sub-category code hints for 디지털인쇄 sheet
const NAME_TO_SUBCATEGORY_HINT: Record<string, string> = {
  "엽서": "PRINT_POSTCARD",
  "코팅엽서": "PRINT_POSTCARD",
  "스탠다드엽서": "PRINT_POSTCARD",
  "투명엽서": "PRINT_POSTCARD",
  "박엽서": "PRINT_POSTCARD",
  "화이트인쇄엽서": "PRINT_POSTCARD",
  "접지카드": "PRINT_FOLDCARD",
  "접지카드(2단)": "PRINT_FOLDCARD",
  "접지카드(3단)": "PRINT_FOLDCARD",
  "엽서북": "PRINT_POSTCARD_BOOK",
  "포토카드": "PRINT_PHOTOCARD",
  "전단지": "PRINT_FLYER",
  "리플렛": "PRINT_FLYER",
  "명함": "PRINT_CARD",
  "쿠폰": "PRINT_VOUCHER",
  "상품권": "PRINT_VOUCHER",
  "봉투": "PRINT_ENVELOPE",
  "배경지": "PRINT_BG",
  "슬로건": "PRINT_SLOGAN",
  "헤더택": "PRINT_HEADERTAG",
  "라벨택": "PRINT_LABELTAG",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseDimension(raw: string | null): { w: number | null; h: number | null } {
  if (!raw) return { w: null, h: null };
  // Handles "73 x 98", "75 x 100", "316x467", "A3 (297 x 420 mm)", "사용자입력"
  const match = String(raw).match(/(\d+(?:\.\d+)?)\s*[xX×]\s*(\d+(?:\.\d+)?)/);
  if (!match) return { w: null, h: null };
  return { w: parseFloat(match[1]), h: parseFloat(match[2]) };
}

function deriveSheetStandard(outputSize: string | null): string | null {
  if (!outputSize) return null;
  // 316x467 or 315x467 → A3, 330x660 → T3
  const clean = outputSize.replace(/\s+/g, "").toLowerCase();
  if (clean.includes("316x467") || clean.includes("315x467") || clean.includes("320x450")) {
    return "A3";
  }
  if (clean.includes("330x660") || clean.includes("320x660")) {
    return "T3";
  }
  return null;
}

function buildSlug(name: string, huniId: number | null, mesCode: string | null): string {
  // Create URL-friendly slug from name + id
  const base = name
    .replace(/[^\w가-힣]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  const suffix = huniId ?? mesCode?.replace(/[^a-z0-9]/gi, "") ?? "unknown";
  return `${base}-${suffix}`;
}

function buildHuniCode(huniId: number | null, mesCode: string | null): string {
  if (huniId) return String(huniId);
  if (mesCode) return mesCode.replace(/[^a-z0-9-]/gi, "");
  return `unknown-${Date.now()}`;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

// @MX:ANCHOR: [AUTO] Main product parser — processes all 11 product sheets
// @MX:REASON: fan_in >= 3 — called from main, used by both product and size insert phases
// @MX:SPEC: SPEC-IM-003 M1-REQ-002, M1-REQ-003
function parseProducts(data: ExtractedData): ProductRecord[] {
  const result: ProductRecord[] = [];

  const productSheets = [
    "디지털인쇄", "스티커", "책자", "포토북", "캘린더",
    "디자인캘린더", "실사", "아크릴", "굿즈", "문구(노트)", "상품악세사리",
  ];

  for (const sheetName of productSheets) {
    const sheet = data.sheets.find((s) => s.name === sheetName);
    if (!sheet) {
      console.warn(`${LABEL} WARN: Sheet '${sheetName}' not found in JSON`);
      continue;
    }

    let current: ProductRecord | null = null;
    let currentCategory = "";

    for (const row of sheet.rows) {
      // Skip header rows (row 1 and 2 have text like '구분', 'ID')
      if (row.rowIndex <= 2) continue;

      const cells: Record<string, unknown> = {};
      for (const cell of row.cells) {
        cells[cell.col] = cell.value;
      }

      const colA = cells["A"];
      const colB = cells["B"];
      const colC = cells["C"];
      const colD = cells["D"];
      const colE = cells["E"];
      const colF = cells["F"];
      const colG = cells["G"];
      const colH = cells["H"];
      const colI = cells["I"];
      const colJ = cells["J"];

      // Track running category from col A
      if (colA && typeof colA === "string" && colA !== "구분") {
        currentCategory = colA;
      }

      // Detect new product row: B is numeric ID or C is MES code (for sheets without numeric B)
      const isNumericId = typeof colB === "number" && colB > 0;
      const hasMesCode = typeof colC === "string" && /^\d{3}-\d{4}$/.test(colC);

      if (isNumericId || (hasMesCode && typeof colD === "string" && colD)) {
        // New product
        const huniId = isNumericId ? Math.round(colB as number) : null;
        const mesCode = typeof colC === "string" ? colC : null;
        const name = typeof colD === "string" ? colD.trim() : "";

        if (!name) continue; // Skip rows without a product name

        current = {
          huniId,
          mesCode,
          name,
          sheetName,
          category: currentCategory,
          sizes: [],
        };
        result.push(current);
      }

      // Add size row (either the product's first row or continuation rows)
      if (current && colE) {
        const displayName = String(colE).trim();
        if (!displayName || displayName === "사이즈(필수)" || displayName === "사이즈") continue;

        // Skip non-size values like long descriptions
        if (displayName.length > 60) continue;

        const impositionCount = typeof colF === "number" ? Math.round(colF) : null;
        const bleed = typeof colG === "number" ? colG : null;
        const workSize = colH ? String(colH).trim() : null;
        const cutSize = colI ? String(colI).trim() : null;
        const sheetOutputSize = colJ
          ? String(colJ).replace(/\s+/g, "").match(/^\d+x\d+$/) ? String(colJ).replace(/\s+/g, "") : null
          : null;

        current.sizes.push({
          displayName,
          impositionCount,
          bleed,
          workSize,
          cutSize,
          sheetOutputSize,
        });
      }
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
    sourceFile: "상품마스터_extracted.json",
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
      step: "import-products",
      executionTime: Date.now() - opts.startedAt.getTime(),
    },
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`${LABEL} Starting product master import`);

  // Load JSON data
  if (!fs.existsSync(DATA_PATH)) {
    console.error(`${LABEL} ERROR: Data file not found: ${DATA_PATH}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(DATA_PATH, "utf-8");
  const data: ExtractedData = JSON.parse(rawData);

  const allProducts = parseProducts(data);
  console.log(`${LABEL} Parsed ${allProducts.length} products from JSON`);

  if (VALIDATE_ONLY) {
    console.log(`${LABEL} Mode: validate-only`);
    let sizeCount = 0;
    for (const p of allProducts) {
      sizeCount += p.sizes.length;
      if (!p.name) {
        console.error(`${LABEL} ERROR: Product missing name: ${JSON.stringify(p)}`);
        process.exit(1);
      }
    }
    console.log(`${LABEL} Total sizes: ${sizeCount}`);
    console.log(`${LABEL} Validation OK`);
    return;
  }

  if (DRY_RUN) {
    console.log(`${LABEL} Mode: dry-run (no DB writes)`);
    let sizeCount = 0;
    for (const p of allProducts) sizeCount += p.sizes.length;
    console.log(`${LABEL} Would import ${allProducts.length} products, ${sizeCount} sizes`);
    return;
  }

  const db = createDb();
  const startedAt = new Date();

  // Build category code->id map
  const existingCategories = await db
    .select({ code: categories.code, id: categories.id })
    .from(categories);
  const categoryCodeToId = new Map(existingCategories.map((c) => [c.code, c.id]));
  console.log(`${LABEL} Loaded ${categoryCodeToId.size} categories`);

  let productsInserted = 0;
  let productsErrored = 0;
  let sizesInserted = 0;
  let sizesErrored = 0;
  const productCodeToId = new Map<string, number>();

  // Insert products in batches
  for (let i = 0; i < allProducts.length; i += BATCH_SIZE) {
    const batch = allProducts.slice(i, i + BATCH_SIZE);
    const rows = batch
      .map((p) => {
        const categoryCode = SHEET_TO_CATEGORY[p.sheetName];
        const categoryId = categoryCode ? (categoryCodeToId.get(categoryCode) ?? null) : null;

        if (!categoryId) {
          console.warn(`${LABEL} WARN: No categoryId for sheet '${p.sheetName}' (code: ${categoryCode}), skipping product '${p.name}'`);
          return null;
        }

        const productType = SHEET_TO_PRODUCT_TYPE[p.sheetName] ?? "digital_print";
        const pricingModel = PRICING_MODEL_MAP[productType] ?? "tiered";
        const huniCode = buildHuniCode(p.huniId, p.mesCode);
        const slug = buildSlug(p.name, p.huniId, p.mesCode);
        const mesRegistered = !!p.mesCode;

        // Derive sheetStandard from first size with an output size
        const firstOutputSize = p.sizes.find((s) => s.sheetOutputSize)?.sheetOutputSize ?? null;
        const sheetStandard = deriveSheetStandard(firstOutputSize);

        return {
          categoryId,
          huniCode,
          edicusCode: null as string | null,
          shopbyId: null as number | null,
          name: p.name,
          slug,
          productType,
          pricingModel,
          sheetStandard,
          mesRegistered,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (rows.length === 0) continue;

    try {
      const result = await db
        .insert(products)
        .values(rows)
        .onConflictDoUpdate({
          target: [products.huniCode],
          set: {
            name: sql`excluded.name`,
            categoryId: sql`excluded.category_id`,
            productType: sql`excluded.product_type`,
            pricingModel: sql`excluded.pricing_model`,
            sheetStandard: sql`excluded.sheet_standard`,
            mesRegistered: sql`excluded.mes_registered`,
            updatedAt: sql`now()`,
          },
        })
        .returning({ id: products.id, huniCode: products.huniCode });

      for (const r of result) {
        productCodeToId.set(r.huniCode, r.id);
      }
      productsInserted += result.length;
    } catch (err) {
      console.error(`${LABEL} ERROR inserting product batch [${i}-${i + batch.length}]:`, err);
      productsErrored += rows.length;
    }
  }

  console.log(`${LABEL} Products: inserted=${productsInserted}, errored=${productsErrored}`);

  // Build huniCode->id map for size inserts (query DB for any missed by returning)
  if (productCodeToId.size < allProducts.length) {
    const dbProducts = await db
      .select({ id: products.id, huniCode: products.huniCode })
      .from(products);
    for (const p of dbProducts) {
      productCodeToId.set(p.huniCode, p.id);
    }
  }

  // Insert product sizes
  console.log(`${LABEL} Inserting product sizes...`);
  let sizeDisplayOrder = 0;

  for (const product of allProducts) {
    const huniCode = buildHuniCode(product.huniId, product.mesCode);
    const productId = productCodeToId.get(huniCode);
    if (!productId) {
      console.warn(`${LABEL} WARN: No productId for huniCode '${huniCode}', skipping sizes`);
      continue;
    }

    const sizeRows = product.sizes.map((s, idx) => {
      const cut = parseDimension(s.cutSize);
      const work = parseDimension(s.workSize);
      const sheetStandard = deriveSheetStandard(s.sheetOutputSize);

      // Build size code from cut dimensions or display name
      const sizeCode = s.cutSize
        ? `${Math.round(cut.w ?? 0)}x${Math.round(cut.h ?? 0)}`
        : s.displayName.replace(/[^\w]/g, "_").substring(0, 40);

      return {
        productId,
        code: sizeCode,
        displayName: s.displayName,
        cutWidth: cut.w ? String(cut.w) : null,
        cutHeight: cut.h ? String(cut.h) : null,
        workWidth: work.w ? String(work.w) : null,
        workHeight: work.h ? String(work.h) : null,
        bleed: s.bleed ? String(s.bleed) : null,
        impositionCount: s.impositionCount,
        sheetStandard,
        displayOrder: idx,
        isCustom: false,
      };
    });

    for (let i = 0; i < sizeRows.length; i += BATCH_SIZE) {
      const batch = sizeRows.slice(i, i + BATCH_SIZE);
      try {
        const result = await db
          .insert(productSizes)
          .values(batch)
          .onConflictDoUpdate({
            target: [productSizes.productId, productSizes.code],
            set: {
              displayName: sql`excluded.display_name`,
              cutWidth: sql`excluded.cut_width`,
              cutHeight: sql`excluded.cut_height`,
              workWidth: sql`excluded.work_width`,
              workHeight: sql`excluded.work_height`,
              bleed: sql`excluded.bleed`,
              impositionCount: sql`excluded.imposition_count`,
              sheetStandard: sql`excluded.sheet_standard`,
              updatedAt: sql`now()`,
            },
          })
          .returning({ id: productSizes.id });
        sizesInserted += result.length;
      } catch (err) {
        console.error(`${LABEL} ERROR inserting sizes for product '${product.name}':`, err);
        sizesErrored += batch.length;
      }
    }
  }

  console.log(`${LABEL} Sizes: inserted=${sizesInserted}, errored=${sizesErrored}`);

  // Write import log for products
  const totalProducts = allProducts.length;
  const statusProducts = productsErrored > 0 ? "partial" : "success";
  await writeImportLog(db, {
    tableName: "products",
    total: totalProducts,
    inserted: productsInserted,
    updated: 0,
    skipped: 0,
    errored: productsErrored,
    status: statusProducts,
    startedAt,
  });

  // Write import log for product_sizes
  const totalSizes = allProducts.reduce((acc, p) => acc + p.sizes.length, 0);
  const statusSizes = sizesErrored > 0 ? "partial" : "success";
  await writeImportLog(db, {
    tableName: "product_sizes",
    total: totalSizes,
    inserted: sizesInserted,
    updated: 0,
    skipped: 0,
    errored: sizesErrored,
    status: statusSizes,
    startedAt,
  });

  console.log(`${LABEL} Done: products=${productsInserted}, sizes=${sizesInserted}`);

  if (productsErrored > 0 || sizesErrored > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`${LABEL} Fatal error:`, err);
  process.exit(1);
});
