// @MX:NOTE: [AUTO] Product options import script — SPEC-IM-002 Phase 4
// @MX:NOTE: [AUTO] Target table: product_options (maps products to option_definitions, including special colors)
// @MX:REASON: Requires products + option_definitions tables to be populated first (Phase 2 + Phase 3 dependency)

import * as fs from "fs";
import * as path from "path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql, eq } from "drizzle-orm";
import {
  optionDefinitions,
  productOptions,
} from "../../packages/shared/src/db/schema/huni-options.schema.js";
import {
  categories,
  products,
} from "../../packages/shared/src/db/schema/huni-catalog.schema.js";

// ---------------------------------------------------------------------------
// CLI Flags
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const VALIDATE_ONLY = args.includes("--validate-only");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LABEL = "[import-product-opts]";
const BATCH_SIZE = 50;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProductRecord = {
  id: number;
  name: string;
  huniCode: string;
  categoryId: number;
};

type OptionDefRecord = {
  id: number;
  key: string;
};

// @MX:NOTE: [AUTO] SPEC-IM-002 Section 5.9 — special color values extracted from JSON Excel columns R/S/T/U/V
// Values follow Korean pattern: "(없음)" = NONE, "(단면)" = SINGLE, "(양면)" = DUPLEX
type SpecialColorCodes = "NONE" | "SINGLE" | "DUPLEX";

type ProductOptionRecord = {
  productId: number;
  optionDefinitionId: number;
  displayOrder: number;
  isRequired: boolean;
  isVisible: boolean;
  isInternal: boolean;
  isActive: boolean;
  choiceFilter: string | null;
};

// ---------------------------------------------------------------------------
// Category-Option Mapping (from SPEC Section 3)
// ---------------------------------------------------------------------------

// @MX:ANCHOR: [AUTO] Category → option_definitions mapping derived from SPEC-IM-002 Section 3 (11 categories)
// @MX:REASON: Public mapping contract — used by product_options import to determine which options each category supports
const CATEGORY_OPTIONS: Record<
  string,
  Array<{ optionKey: string; isRequired: boolean; displayOrder: number }>
> = {
  PRINT: [
    { optionKey: "size", isRequired: true, displayOrder: 1 },
    { optionKey: "paper_type", isRequired: true, displayOrder: 2 },
    { optionKey: "print_side", isRequired: true, displayOrder: 3 },
    { optionKey: "special_color_white", isRequired: false, displayOrder: 4 },
    { optionKey: "special_color_clear", isRequired: false, displayOrder: 5 },
    { optionKey: "special_color_pink", isRequired: false, displayOrder: 6 },
    { optionKey: "special_color_gold", isRequired: false, displayOrder: 7 },
    { optionKey: "special_color_silver", isRequired: false, displayOrder: 8 },
    { optionKey: "coating", isRequired: false, displayOrder: 9 },
    { optionKey: "cutting", isRequired: false, displayOrder: 10 },
    { optionKey: "folding", isRequired: false, displayOrder: 11 },
    { optionKey: "print_run", isRequired: true, displayOrder: 12 },
    { optionKey: "quantity", isRequired: true, displayOrder: 13 },
    { optionKey: "rounded_corner", isRequired: false, displayOrder: 14 },
    { optionKey: "scoring", isRequired: false, displayOrder: 15 },
    { optionKey: "perforation", isRequired: false, displayOrder: 16 },
    { optionKey: "variable_print_text", isRequired: false, displayOrder: 17 },
    { optionKey: "variable_print_image", isRequired: false, displayOrder: 18 },
    { optionKey: "foil_front", isRequired: false, displayOrder: 19 },
    { optionKey: "foil_front_size", isRequired: false, displayOrder: 20 },
    { optionKey: "foil_front_color", isRequired: false, displayOrder: 21 },
    { optionKey: "foil_back", isRequired: false, displayOrder: 22 },
    { optionKey: "foil_back_size", isRequired: false, displayOrder: 23 },
    { optionKey: "foil_back_color", isRequired: false, displayOrder: 24 },
    { optionKey: "emboss", isRequired: false, displayOrder: 25 },
    { optionKey: "emboss_size", isRequired: false, displayOrder: 26 },
  ],
  STICKER: [
    { optionKey: "size", isRequired: true, displayOrder: 1 },
    { optionKey: "paper_type", isRequired: true, displayOrder: 2 },
    { optionKey: "print_side", isRequired: true, displayOrder: 3 },
    { optionKey: "special_color_white", isRequired: false, displayOrder: 4 },
    { optionKey: "cutting", isRequired: true, displayOrder: 5 },
    { optionKey: "piece_count", isRequired: true, displayOrder: 6 },
    { optionKey: "quantity", isRequired: true, displayOrder: 7 },
  ],
  BOOK: [
    { optionKey: "size", isRequired: true, displayOrder: 1 },
    { optionKey: "binding_type", isRequired: true, displayOrder: 2 },
    { optionKey: "binding_direction", isRequired: true, displayOrder: 3 },
    { optionKey: "ring_color", isRequired: true, displayOrder: 4 },
    { optionKey: "ring_size", isRequired: true, displayOrder: 5 },
    { optionKey: "endpaper", isRequired: false, displayOrder: 6 },
    { optionKey: "quantity", isRequired: true, displayOrder: 7 },
    { optionKey: "inner_paper", isRequired: true, displayOrder: 8 },
    { optionKey: "inner_print_side", isRequired: true, displayOrder: 9 },
    { optionKey: "page_count", isRequired: true, displayOrder: 10 },
    { optionKey: "cover_paper", isRequired: true, displayOrder: 11 },
    { optionKey: "cover_print_side", isRequired: true, displayOrder: 12 },
    { optionKey: "cover_coating", isRequired: false, displayOrder: 13 },
    { optionKey: "clear_cover", isRequired: false, displayOrder: 14 },
    { optionKey: "foil_cover", isRequired: false, displayOrder: 15 },
    { optionKey: "foil_cover_size", isRequired: false, displayOrder: 16 },
    { optionKey: "foil_cover_color", isRequired: false, displayOrder: 17 },
    { optionKey: "emboss", isRequired: false, displayOrder: 18 },
    { optionKey: "emboss_size", isRequired: false, displayOrder: 19 },
  ],
  PHOTOBOOK: [
    { optionKey: "size", isRequired: true, displayOrder: 1 },
    { optionKey: "cover_type", isRequired: true, displayOrder: 2 },
    { optionKey: "quantity", isRequired: true, displayOrder: 3 },
  ],
  CALENDAR: [
    { optionKey: "size", isRequired: true, displayOrder: 1 },
    { optionKey: "paper_type", isRequired: true, displayOrder: 2 },
    { optionKey: "print_side", isRequired: true, displayOrder: 3 },
    { optionKey: "sheet_count", isRequired: true, displayOrder: 4 },
    { optionKey: "stand_color", isRequired: true, displayOrder: 5 },
    { optionKey: "calendar_finishing", isRequired: true, displayOrder: 6 },
    { optionKey: "ring_color", isRequired: false, displayOrder: 7 },
    { optionKey: "quantity", isRequired: true, displayOrder: 8 },
    { optionKey: "individual_packaging", isRequired: false, displayOrder: 9 },
    { optionKey: "calendar_envelope", isRequired: false, displayOrder: 10 },
    { optionKey: "envelope_quantity", isRequired: false, displayOrder: 11 },
  ],
  DESIGN_CALENDAR: [
    { optionKey: "size", isRequired: true, displayOrder: 1 },
    { optionKey: "paper_type", isRequired: true, displayOrder: 2 },
    { optionKey: "page_count", isRequired: true, displayOrder: 3 },
    { optionKey: "quantity", isRequired: true, displayOrder: 4 },
    { optionKey: "calendar_envelope", isRequired: false, displayOrder: 5 },
    { optionKey: "envelope_quantity", isRequired: false, displayOrder: 6 },
  ],
  SIGN: [
    { optionKey: "size", isRequired: true, displayOrder: 1 },
    { optionKey: "custom_size", isRequired: false, displayOrder: 2 },
    { optionKey: "material", isRequired: true, displayOrder: 3 },
    { optionKey: "special_color_white", isRequired: false, displayOrder: 4 },
    { optionKey: "quantity", isRequired: true, displayOrder: 5 },
  ],
  ACRYLIC: [
    { optionKey: "size", isRequired: true, displayOrder: 1 },
    { optionKey: "custom_size", isRequired: false, displayOrder: 2 },
    { optionKey: "material", isRequired: true, displayOrder: 3 },
    { optionKey: "piece_count", isRequired: true, displayOrder: 4 },
    { optionKey: "hook_type", isRequired: false, displayOrder: 5 },
    { optionKey: "quantity", isRequired: true, displayOrder: 6 },
    { optionKey: "volume_discount", isRequired: false, displayOrder: 7 },
    { optionKey: "ball_chain", isRequired: false, displayOrder: 8 },
    { optionKey: "ball_chain_qty", isRequired: false, displayOrder: 9 },
  ],
  GOODS: [
    { optionKey: "size", isRequired: true, displayOrder: 1 },
    { optionKey: "pouch_color", isRequired: true, displayOrder: 2 },
    { optionKey: "label", isRequired: false, displayOrder: 3 },
    { optionKey: "quantity", isRequired: true, displayOrder: 4 },
    { optionKey: "volume_discount", isRequired: false, displayOrder: 5 },
    { optionKey: "ball_chain", isRequired: false, displayOrder: 6 },
    { optionKey: "ball_chain_qty", isRequired: false, displayOrder: 7 },
  ],
  NOTE: [
    { optionKey: "size", isRequired: true, displayOrder: 1 },
    { optionKey: "inner_type", isRequired: true, displayOrder: 2 },
    { optionKey: "paper_type", isRequired: true, displayOrder: 3 },
    { optionKey: "binding_option", isRequired: true, displayOrder: 4 },
    { optionKey: "ring_color", isRequired: true, displayOrder: 5 },
    { optionKey: "quantity", isRequired: true, displayOrder: 6 },
    { optionKey: "volume_discount", isRequired: false, displayOrder: 7 },
    { optionKey: "individual_packaging", isRequired: false, displayOrder: 8 },
  ],
  ACCESSORY: [
    { optionKey: "size", isRequired: true, displayOrder: 1 },
    { optionKey: "quantity", isRequired: true, displayOrder: 2 },
  ],
};

// ---------------------------------------------------------------------------
// Special Color JSON Parsing Helpers (SPEC-IM-002 Section 7.3.1)
// ---------------------------------------------------------------------------

// @MX:NOTE: [AUTO] SPEC-IM-002 Section 5.9 — special color column to option_key mapping
// @MX:REASON: Excel columns R/S/T/U/V each map to an independent option_key; TOON merges these causing data loss
const SPECIAL_COLOR_COLS: Array<{
  col: string;
  optionKey: string;
}> = [
  { col: "R", optionKey: "special_color_white" },
  { col: "S", optionKey: "special_color_clear" },
  { col: "T", optionKey: "special_color_pink" },
  { col: "U", optionKey: "special_color_gold" },
  { col: "V", optionKey: "special_color_silver" },
];

// @MX:NOTE: [AUTO] Korean choice value → code mapping for special color cells
// @MX:REASON: Excel cells contain Korean text patterns like "(없음)/(단면)/(양면)"; must map to NONE/SINGLE/DUPLEX
function parseSpecialColorValue(value: string): SpecialColorCodes | null {
  if (!value || typeof value !== "string") return null;
  const v = value.trim();
  if (v.includes("(없음)")) return "NONE";
  if (v.includes("(단면)")) return "SINGLE";
  if (v.includes("(양면)")) return "DUPLEX";
  // Some products only have "단면" without parens (e.g., "화이트인쇄단면")
  if (v.includes("단면") && !v.includes("양면")) return "SINGLE";
  if (v.includes("양면")) return "DUPLEX";
  return null;
}

// Check if a value looks like a valid special color cell (not a comment row)
// @MX:NOTE: [AUTO] Guard against rows that are comments/notes in the Excel file bleeding into color column parsing
function isValidSpecialColorValue(value: unknown): boolean {
  if (!value || typeof value !== "string") return false;
  const v = value.trim();
  // Must be short (real values like "화이트인쇄(없음)" are max ~20 chars)
  // Comment rows are very long strings
  if (v.length > 50) return false;
  // Must match color-related Korean text pattern
  const colorKeywords = ["인쇄(없음)", "인쇄(단면)", "인쇄(양면)", "인쇄단면", "인쇄양면", "별색(없음)", "별색(단면)", "별색(양면)"];
  return colorKeywords.some((kw) => v.includes(kw));
}

interface JsonSheetRow {
  rowIndex: number;
  cells: Array<{
    col: string;
    colIndex: number;
    value: unknown;
    type: string;
  }>;
}

interface JsonSheet {
  name: string;
  rows: JsonSheetRow[];
}

// @MX:NOTE: [AUTO] Build a map<productName, map<optionKey, Set<SpecialColorCode>>> from one JSON sheet
// @MX:REASON: Core parsing logic for Section 5.9 special color import — product blocks grouped by non-null col D
function buildSpecialColorMap(
  sheet: JsonSheet
): Map<string, Map<string, Set<SpecialColorCodes>>> {
  const productMap = new Map<string, Map<string, Set<SpecialColorCodes>>>();
  let currentProductName: string | null = null;
  let currentColorMap: Map<string, Set<SpecialColorCodes>> | null = null;

  // Skip header rows (rowIndex 1 and 2 are headers per SPEC-IM-002 Section 7.3.1)
  const dataRows = sheet.rows.filter((r) => r.rowIndex > 2);

  for (const row of dataRows) {
    // Build a quick col->value map for this row
    const cellMap = new Map<string, unknown>();
    for (const cell of row.cells) {
      cellMap.set(cell.col, cell.value);
    }

    // Check if col D (상품명) has a new product name
    const colD = cellMap.get("D");
    if (colD && typeof colD === "string" && colD.trim()) {
      const productName = colD.trim();
      // Start a new product block
      currentProductName = productName;
      currentColorMap = new Map();
      productMap.set(productName, currentColorMap);
    }

    // If we have a current product, collect special color values
    if (currentProductName && currentColorMap) {
      for (const { col, optionKey } of SPECIAL_COLOR_COLS) {
        const cellValue = cellMap.get(col);
        if (isValidSpecialColorValue(cellValue)) {
          const code = parseSpecialColorValue(cellValue as string);
          if (code) {
            let codeSet = currentColorMap.get(optionKey);
            if (!codeSet) {
              codeSet = new Set();
              currentColorMap.set(optionKey, codeSet);
            }
            codeSet.add(code);
          }
        }
      }
    }
  }

  return productMap;
}

// ---------------------------------------------------------------------------
// Upsert Helper
// ---------------------------------------------------------------------------

async function upsertProductOptionsBatch(
  db: ReturnType<typeof drizzle>,
  batch: ProductOptionRecord[],
  batchLabel: string,
  errors: string[]
): Promise<number> {
  if (batch.length === 0) return 0;

  try {
    await db
      .insert(productOptions)
      .values(
        batch.map((r) => ({
          productId: r.productId,
          optionDefinitionId: r.optionDefinitionId,
          displayOrder: r.displayOrder,
          isRequired: r.isRequired,
          isVisible: r.isVisible,
          isInternal: r.isInternal,
          isActive: r.isActive,
          choiceFilter: r.choiceFilter,
        }))
      )
      .onConflictDoUpdate({
        target: [productOptions.productId, productOptions.optionDefinitionId],
        set: {
          displayOrder: sql`excluded.display_order`,
          isRequired: sql`excluded.is_required`,
          isVisible: sql`excluded.is_visible`,
          isInternal: sql`excluded.is_internal`,
          isActive: sql`excluded.is_active`,
          choiceFilter: sql`excluded.choice_filter`,
          updatedAt: sql`now()`,
        },
      });
    return batch.length;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`${LABEL}   ERROR in ${batchLabel}: ${message}`);
    errors.push(`${batchLabel}: ${message}`);
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Main Run
// ---------------------------------------------------------------------------

async function run(): Promise<void> {
  if (DRY_RUN) {
    console.log(`${LABEL} DRY RUN mode — no database writes`);
  }
  if (VALIDATE_ONLY) {
    console.log(`${LABEL} VALIDATE ONLY mode — checking data consistency only`);
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error(`${LABEL} ERROR: DATABASE_URL environment variable is not set`);
    process.exit(1);
  }

  const client = postgres(connectionString, { max: 5 });
  const db = drizzle(client);

  // ---------------------------------------------------------------------------
  // Step 1: Build lookup maps
  // ---------------------------------------------------------------------------

  console.log(`${LABEL} Loading option_definitions from DB...`);
  const allOptionDefs = await db
    .select({ id: optionDefinitions.id, key: optionDefinitions.key })
    .from(optionDefinitions);

  const optDefMap = new Map<string, number>(); // key -> id
  for (const od of allOptionDefs) {
    optDefMap.set(od.key, od.id);
  }
  console.log(`${LABEL}   Loaded ${optDefMap.size} option_definitions`);

  if (optDefMap.size === 0) {
    console.warn(`${LABEL} WARN: option_definitions table is empty — run import-options.ts first`);
    await client.end();
    return;
  }

  console.log(`${LABEL} Loading categories from DB...`);
  const allCategories = await db
    .select({ id: categories.id, code: categories.code })
    .from(categories);

  const catMap = new Map<string, number>(); // code -> id
  for (const cat of allCategories) {
    catMap.set(cat.code, cat.id);
  }
  console.log(`${LABEL}   Loaded ${catMap.size} categories`);

  console.log(`${LABEL} Loading products from DB...`);
  const allProducts = await db
    .select({
      id: products.id,
      name: products.name,
      huniCode: products.huniCode,
      categoryId: products.categoryId,
    })
    .from(products);

  if (allProducts.length === 0) {
    console.warn(
      `${LABEL} products table is empty, skipping product_options import`
    );
    await client.end();
    return;
  }
  console.log(`${LABEL}   Loaded ${allProducts.length} products`);

  // Group products by category_id
  const productsByCatId = new Map<number, ProductRecord[]>();
  for (const p of allProducts) {
    let list = productsByCatId.get(p.categoryId);
    if (!list) {
      list = [];
      productsByCatId.set(p.categoryId, list);
    }
    list.push(p);
  }

  // Build product name -> product lookup for special color matching
  const productByName = new Map<string, ProductRecord>();
  for (const p of allProducts) {
    productByName.set(p.name.trim(), p);
  }

  // ---------------------------------------------------------------------------
  // Step 2: Generate general product_options records (category-based mapping)
  // ---------------------------------------------------------------------------

  console.log(`${LABEL} ── product_options (general)`);

  let generalProcessed = 0;
  let generalInserted = 0;
  let generalSkipped = 0;
  const generalErrors: string[] = [];
  const generalBatch: ProductOptionRecord[] = [];

  for (const [categoryCode, optionList] of Object.entries(CATEGORY_OPTIONS)) {
    const catId = catMap.get(categoryCode);
    if (!catId) {
      console.warn(
        `${LABEL}   WARN: category code "${categoryCode}" not found in DB — skipping`
      );
      continue;
    }

    const catProducts = productsByCatId.get(catId) ?? [];
    if (catProducts.length === 0) {
      console.warn(
        `${LABEL}   WARN: no products found for category "${categoryCode}" (catId=${catId})`
      );
      continue;
    }

    for (const product of catProducts) {
      for (const { optionKey, isRequired, displayOrder } of optionList) {
        generalProcessed++;

        const optDefId = optDefMap.get(optionKey);
        if (!optDefId) {
          // Log only once per unique key
          generalSkipped++;
          continue;
        }

        generalBatch.push({
          productId: product.id,
          optionDefinitionId: optDefId,
          displayOrder,
          isRequired,
          isVisible: true,
          isInternal: false,
          isActive: true,
          choiceFilter: null,
        });

        // Flush batch when full
        if (generalBatch.length >= BATCH_SIZE && !DRY_RUN && !VALIDATE_ONLY) {
          const batchNum = Math.ceil(generalProcessed / BATCH_SIZE);
          const inserted = await upsertProductOptionsBatch(
            db,
            generalBatch.splice(0, generalBatch.length),
            `general batch ${batchNum}`,
            generalErrors
          );
          generalInserted += inserted;
        }
      }
    }
  }

  // Flush remaining general batch
  if (generalBatch.length > 0 && !DRY_RUN && !VALIDATE_ONLY) {
    const inserted = await upsertProductOptionsBatch(
      db,
      generalBatch,
      "general final batch",
      generalErrors
    );
    generalInserted += inserted;
    generalBatch.length = 0;
  } else if (DRY_RUN || VALIDATE_ONLY) {
    generalInserted = generalBatch.length; // simulate insertion count
    generalBatch.length = 0;
  }

  console.log(
    `${LABEL}    ${generalProcessed} processed, ${generalInserted} inserted/updated, ${generalSkipped} skipped, ${generalErrors.length} errors`
  );

  // ---------------------------------------------------------------------------
  // Step 3: Special color JSON parsing (TASK-005)
  // ---------------------------------------------------------------------------

  // @MX:NOTE: [AUTO] SPEC-IM-002 Section 5.9 — special color data comes from JSON source ONLY
  // @MX:REASON: TOON merges all 5 color columns into one, losing per-column data; JSON preserves all 5 independently
  const jsonPath = path.resolve(
    __dirname,
    "../../ref/huni/extracted/상품마스터_extracted.json"
  );

  if (!fs.existsSync(jsonPath)) {
    console.warn(
      `${LABEL} WARN: JSON file not found at ${jsonPath} — skipping special color import`
    );
    await client.end();
    console.log(`${LABEL} Done.`);
    return;
  }

  console.log(`${LABEL} ── product_options (special colors from JSON)`);
  console.log(
    `${LABEL} Reading JSON: ref/huni/extracted/상품마스터_extracted.json`
  );

  let colorProcessed = 0;
  let colorInserted = 0;
  let colorSkipped = 0;
  const colorErrors: string[] = [];

  // @MX:NOTE: [AUTO] JSON sheet names that contain special color (별색) data
  // @MX:REASON: SPEC-IM-002 Section 5.9 — 디지털인쇄 and 스티커 sheets have R/S/T/U/V color cols; 실사 sheet has col T only
  const SHEETS_WITH_SPECIAL_COLORS = ["디지털인쇄", "스티커", "실사"];

  let jsonData: { sheets: JsonSheet[] };
  try {
    const raw = fs.readFileSync(jsonPath, "utf-8");
    jsonData = JSON.parse(raw) as { sheets: JsonSheet[] };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `${LABEL} ERROR: Failed to parse JSON file: ${message} — skipping special color import`
    );
    await client.end();
    console.log(`${LABEL} Done.`);
    return;
  }

  const colorBatch: ProductOptionRecord[] = [];

  for (const sheetName of SHEETS_WITH_SPECIAL_COLORS) {
    const sheet = jsonData.sheets.find((s: JsonSheet) => s.name === sheetName);
    if (!sheet) {
      console.warn(
        `${LABEL}   WARN: sheet "${sheetName}" not found in JSON — skipping`
      );
      continue;
    }

    const productColorMap = buildSpecialColorMap(sheet);
    console.log(
      `${LABEL}   Sheet "${sheetName}": found ${productColorMap.size} product blocks`
    );

    for (const [productName, colorMap] of Array.from(productColorMap.entries())) {
      if (colorMap.size === 0) continue; // product has no special colors

      // Match product in DB by name
      const product = productByName.get(productName);
      if (!product) {
        console.warn(
          `${LABEL}   WARN: product "${productName}" not found in DB — skipping`
        );
        colorSkipped++;
        continue;
      }

      for (const [optionKey, codeSet] of Array.from(colorMap.entries())) {
        colorProcessed++;

        const optDefId = optDefMap.get(optionKey);
        if (!optDefId) {
          console.warn(
            `${LABEL}   WARN: option_definition key "${optionKey}" not found in DB — skipping`
          );
          colorSkipped++;
          continue;
        }

        // Build choiceFilter: JSON array of supported choice codes (e.g., ["NONE","SINGLE","DUPLEX"])
        const choiceCodes = Array.from(codeSet).sort();
        const choiceFilter = JSON.stringify(choiceCodes);

        colorBatch.push({
          productId: product.id,
          optionDefinitionId: optDefId,
          displayOrder: 0, // will be overridden by general mapping if product also has category-based entry
          isRequired: false,
          isVisible: true,
          isInternal: false,
          isActive: true,
          choiceFilter,
        });

        // Flush batch when full
        if (colorBatch.length >= BATCH_SIZE && !DRY_RUN && !VALIDATE_ONLY) {
          const batchNum = Math.ceil(colorProcessed / BATCH_SIZE);
          const inserted = await upsertProductOptionsBatch(
            db,
            colorBatch.splice(0, colorBatch.length),
            `special color batch ${batchNum}`,
            colorErrors
          );
          colorInserted += inserted;
        }
      }
    }
  }

  // Flush remaining color batch
  if (colorBatch.length > 0 && !DRY_RUN && !VALIDATE_ONLY) {
    const inserted = await upsertProductOptionsBatch(
      db,
      colorBatch,
      "special color final batch",
      colorErrors
    );
    colorInserted += inserted;
    colorBatch.length = 0;
  } else if (DRY_RUN || VALIDATE_ONLY) {
    colorInserted = colorBatch.length; // simulate
    colorBatch.length = 0;
  }

  console.log(
    `${LABEL}    ${colorProcessed} processed, ${colorInserted} inserted/updated, ${colorSkipped} skipped, ${colorErrors.length} errors`
  );

  // ---------------------------------------------------------------------------
  // Cleanup + Final Report
  // ---------------------------------------------------------------------------

  await client.end();

  const totalErrors = [...generalErrors, ...colorErrors];

  console.log(`${LABEL} Done.`);

  if (totalErrors.length > 0) {
    console.error(`${LABEL} Errors summary:`);
    for (const e of totalErrors) {
      console.error(`  - ${e}`);
    }
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(`${LABEL} Fatal error:`, err);
  process.exit(1);
});
