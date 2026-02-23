/**
 * SPEC-INFRA-001 Drizzle Seed Script
 *
 * Seeds all Huni* models from JSON data files using Drizzle ORM.
 * Migrated from prisma/seed-normalized.ts.
 *
 * Usage: npx tsx scripts/seed.ts
 */
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Schema imports from shared package
import {
  categories,
  products,
  papers,
  printModes,
  postProcesses,
  bindings,
  impositionRules,
  priceTables,
  priceTiers,
  lossQuantityConfigs,
  mesItems,
  productMesMappings,
} from '@widget-creator/shared';

// DB connection (standalone for seed script, separate from shared db instance)
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

// ============================================================
// Data file paths
// ============================================================

const DATA_DIR = path.resolve(__dirname, '../data');
const PRICING_DIR = path.join(DATA_DIR, 'pricing');
const EXPORTS_DIR = path.join(DATA_DIR, 'exports');

function loadJson<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

// ============================================================
// Type definitions for source data
// ============================================================

interface MesCategory {
  categoryCode: string;
  categoryName: string;
  slug: string;
  subCategories: string;
  productCount: number;
}

interface MesProduct {
  categoryCode: string;
  categoryName: string;
  subCategory: string | null;
  shopbyId: number | null;
  MesItemCd: string;
  MesItemName: string;
  productName: string;
  productType: string;
  figmaSection: string | null;
  editor: string | null;
  materialOptions: string | null;
  processOptions: string | null;
  settingOptions: string | null;
}

interface MesData {
  categories: MesCategory[];
  products: MesProduct[];
}

// Raw product sheet data (product-master-raw.json)
interface RawSheetProduct {
  id?: number;
  mesItemCd?: string;
  category?: string;
  name: string;
}
interface RawProductData {
  sheets: Record<string, { products: RawSheetProduct[] }>;
}

interface PaperData {
  papers: Array<{
    name: string;
    weight: number | null;
    code: string;
    mesCode: string;
    paperSize: string | null;
    outputSize: string | null;
    pricePerSheet: number;
    baseSupplyQty: number | null;
    applicableProducts: string[];
  }>;
}

interface PrintType {
  name: string;
  code: number;
  label: string;
}

interface DigitalPrintData {
  printTypes: PrintType[];
  priceTable: Record<string, Record<string, number>>;
}

interface FinishingOption {
  label: string;
  code: number;
}

interface FinishingType {
  name: string;
  description: string;
  options: FinishingOption[];
  priceTable: Record<string, Record<string, number>>;
}

interface FinishingData {
  finishingTypes: Record<string, FinishingType>;
}

interface BindingType {
  name: string;
  code: number;
}

interface BindingData {
  bindingTypes: BindingType[];
  priceTable: Record<string, Record<string, number>>;
}

interface ImpositionRow {
  trimSize: string;
  workSize: string | null;
  note: string | null;
  imposition: number | null;
  basePaper: string;
}

interface ImpositionData {
  lookupTable: ImpositionRow[];
}

// ============================================================
// Helper functions
// ============================================================

function derivePricingModel(productType: string): string {
  const map: Record<string, string> = {
    'digital-print': 'formula',
    'sticker': 'formula_cutting',
    'booklet': 'component',
    'large-format': 'fixed_size',
    'acrylic': 'fixed_per_unit',
    'goods': 'fixed_per_unit',
    'stationery': 'fixed_per_unit',
  };
  return map[productType] ?? 'fixed_unit';
}

function deriveOrderMethod(editor: string | null, materialOptions: string | null): string {
  if (editor === 'O') return 'editor';
  if (materialOptions?.includes('소재')) return 'upload';
  return 'upload';
}

function parseSizeSpec(sizeStr: string): { w: number; h: number } | null {
  const base = sizeStr.split('(')[0];
  const parts = base.split('*');
  if (parts.length !== 2) return null;
  const w = parseFloat(parts[0].trim());
  const h = parseFloat(parts[1].trim());
  if (isNaN(w) || isNaN(h)) return null;
  return { w, h };
}

function makeCutSizeCode(trimSize: string): string {
  return (
    'CUT_' +
    trimSize
      .replace(/\*/g, 'X')
      .replace(/\(([^)]+)\)/g, (_, inner: string) => '_' + inner.replace(/\s+/g, ''))
      .replace(/[^A-Z0-9_]/gi, '')
      .toUpperCase()
  );
}

function mapPrintModeDetails(code: number): { sides: string; colorType: string } {
  const map: Record<number, { sides: string; colorType: string }> = {
    0: { sides: 'none', colorType: 'none' },
    1: { sides: 'single', colorType: 'mono' },
    2: { sides: 'double', colorType: 'mono' },
    4: { sides: 'single', colorType: 'color' },
    8: { sides: 'double', colorType: 'color' },
    11: { sides: 'single', colorType: 'white' },
    12: { sides: 'double', colorType: 'white' },
    21: { sides: 'single', colorType: 'clear' },
    22: { sides: 'double', colorType: 'clear' },
    31: { sides: 'single', colorType: 'pink' },
    32: { sides: 'double', colorType: 'pink' },
  };
  return map[code] ?? { sides: 'single', colorType: 'color' };
}

function makePrintModeCode(label: string, code: number): string {
  const codeMap: Record<number, string> = {
    0: 'PRINT_NONE',
    1: 'PRINT_SINGLE_MONO',
    2: 'PRINT_DOUBLE_MONO',
    4: 'PRINT_SINGLE_COLOR',
    8: 'PRINT_DOUBLE_COLOR',
    11: 'PRINT_SINGLE_WHITE',
    12: 'PRINT_DOUBLE_WHITE',
    21: 'PRINT_SINGLE_CLEAR',
    22: 'PRINT_DOUBLE_CLEAR',
    31: 'PRINT_SINGLE_PINK',
    32: 'PRINT_DOUBLE_PINK',
  };
  return codeMap[code] ?? `PRINT_${label.replace(/\s+/g, '_').toUpperCase()}`;
}

const FINISHING_CONFIG: Record<
  string,
  { groupCode: string; processType: string; priceBasis: string; sheetStandard?: string }
> = {
  perforation: { groupCode: 'PP001', processType: 'perforation', priceBasis: 'per_unit' },
  scoring: { groupCode: 'PP002', processType: 'creasing', priceBasis: 'per_unit' },
  folding: { groupCode: 'PP003', processType: 'folding', priceBasis: 'per_unit' },
  variableText: { groupCode: 'PP004', processType: 'vdp_text', priceBasis: 'per_unit' },
  variableImage: { groupCode: 'PP005', processType: 'vdp_image', priceBasis: 'per_unit' },
  cornerRounding: { groupCode: 'PP006', processType: 'corner', priceBasis: 'per_unit' },
  lamination: { groupCode: 'PP007', processType: 'coating', priceBasis: 'per_sheet' },
  lamination3Section: {
    groupCode: 'PP008',
    processType: 'coating',
    priceBasis: 'per_sheet',
    sheetStandard: 'T3',
  },
};

const BINDING_CODE_MAP: Record<string, string> = {
  '중철제본': 'BIND_SADDLE_STITCH',
  '무선제본': 'BIND_PERFECT',
  '트윈링제본': 'BIND_TWIN_RING',
  'PUR제본': 'BIND_PUR',
};

// @MX:NOTE: [AUTO] SPEC-SEED-001 Section 6.2: Internal-only products (gray background in Excel)
// @MX:SPEC: SPEC-SEED-001 §6.2
// These products should NOT be exposed on Shopby -> is_active = false
const INTERNAL_PRODUCT_NAMES = new Set([
  '링바인더',
  '아이스머그컵',
  '슬림하드 폰케이스',
  '블랙젤리',        // Note: not in v5.json
  '임팩트 젤하드',    // Note: not in v5.json
  '에어팟케이스',
  '버즈케이스',
]);

// ============================================================
// Phase 1a: Seed HuniCategory (2-level hierarchy)
// ============================================================

// Maps Excel sheet names to depth=0 upper categories
// Source: actual product sheets in product-master-raw.json (NOT the MAP sheet)
// - sheetName: the actual Excel sheet name (null = no direct sheet)
// - mesCategories: MES category codes that belong to this sheet category
// - extraSheets: additional sheets merged into this category (e.g., 디자인캘린더 → 캘린더)
const SHEET_CATEGORY_MAP: Record<string, {
  name: string;
  sheetName: string | null;
  mesCategories: string[];
  extraSheets?: string[];
}> = {
  CAT_DIGITAL_PRINT: { name: '디지털인쇄', sheetName: '디지털인쇄', mesCategories: ['01', '03'] },
  CAT_STICKER: { name: '스티커', sheetName: '스티커', mesCategories: ['02'] },
  CAT_BOOKLET: { name: '책자', sheetName: '책자', mesCategories: ['06'] },
  CAT_PHOTEBOOK: { name: '포토북', sheetName: '포토북', mesCategories: [] },
  CAT_CALENDAR: { name: '캘린더', sheetName: '캘린더', mesCategories: ['07'], extraSheets: ['디자인캘린더'] },
  CAT_SILSA: { name: '실사', sheetName: '실사', mesCategories: ['04', '05'] },
  CAT_ACRYLIC: { name: '아크릴', sheetName: '아크릴', mesCategories: ['09'] },
  CAT_GOODS: { name: '굿즈', sheetName: '굿즈', mesCategories: ['10', '11'] },
  CAT_STATIONERY: { name: '문구(노트)', sheetName: '문구(노트)', mesCategories: ['08'] },
  CAT_ACCESSORIES: { name: '상품악세사리', sheetName: '상품악세사리', mesCategories: ['12'] },
};

interface SeedCategoriesResult {
  subCategoryMap: Map<string, number>;
  mesCategoryToParentMap: Map<string, number>;
  // mesItemCd -> subCategoryId (depth=1), built from raw sheet data
  mesItemCdToSubCategoryId: Map<string, number>;
  // shopbyId (= Excel B col = huni_code) -> subCategoryId (depth=1), for 굿즈 (no mesItemCd in raw)
  shopbyIdToSubCategoryId: Map<number, number>;
  // MES category code -> first depth=1 sub-category id (fallback for products with no sub-cat match)
  mesCategoryToFirstSubCatId: Map<string, number>;
}

async function seedCategories(): Promise<SeedCategoriesResult> {
  console.log('Seeding HuniCategory (2-level hierarchy from actual sheet data)...');

  // Load raw sheet data for correct sub-category structure
  const rawData = loadJson<RawProductData>(path.join(DATA_DIR, '_raw/product-master-raw.json'));

  const subCategoryMap = new Map<string, number>();
  const mesCategoryToParentMap = new Map<string, number>();
  const mesItemCdToSubCategoryId = new Map<string, number>();
  // @MX:NOTE: Priority 0 map for 굿즈 - raw data id (= Excel B = huni_code = v5.json shopbyId) -> subCategoryId
  // @MX:SPEC: SPEC-SEED-001 §5.2 Priority 0
  const shopbyIdToSubCategoryId = new Map<number, number>();
  // Fallback: MES category code -> first depth=1 sub-category id (for products with no sub-cat match)
  const mesCategoryToFirstSubCatId = new Map<string, number>();

  let parentOrder = 0;
  let totalSubCategories = 0;

  for (const [parentCode, config] of Object.entries(SHEET_CATEGORY_MAP)) {
    // Create depth=0 upper category
    const [parentRow] = await db
      .insert(categories)
      .values({
        code: parentCode,
        name: config.name,
        parentId: null,
        depth: 0,
        displayOrder: parentOrder++,
        sheetName: config.sheetName,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: categories.code,
        set: {
          name: config.name,
          displayOrder: parentOrder - 1,
          sheetName: config.sheetName,
        },
      })
      .returning({ id: categories.id });

    const parentId = parentRow.id;

    // Map all MES category codes to this parent
    for (const mesCode of config.mesCategories) {
      mesCategoryToParentMap.set(mesCode, parentId);
    }

    // Build sub-categories from actual raw sheet data (NOT MES v5 subCategories string)
    // Collect products from main sheet + any extra merged sheets
    const sheetsToScan: string[] = [];
    if (config.sheetName) sheetsToScan.push(config.sheetName);
    if (config.extraSheets) sheetsToScan.push(...config.extraSheets);

    // Collect unique sub-category names preserving order of first appearance
    const subCatNames: string[] = [];
    const seenSubCats = new Set<string>();
    for (const sheetName of sheetsToScan) {
      const sheet = rawData.sheets[sheetName];
      if (!sheet) continue;
      for (const product of sheet.products) {
        if (product.category && !seenSubCats.has(product.category)) {
          seenSubCats.add(product.category);
          subCatNames.push(product.category);
        }
      }
    }

    // Sheets with no sub-categories (no '구분' column in Excel): create a single default
    // sub-category using the parent name so all products can reference depth=1
    if (subCatNames.length === 0 && sheetsToScan.length > 0) {
      subCatNames.push(config.name);
    }

    // Create depth=1 sub-categories
    let subOrder = 0;
    for (const subName of subCatNames) {
      const subCode = `${parentCode}_${subName.toUpperCase().replace(/[\s\/&()]/g, '_').replace(/__+/g, '_')}`;

      const [subRow] = await db
        .insert(categories)
        .values({
          code: subCode,
          name: subName,
          parentId,
          depth: 1,
          displayOrder: subOrder++,
          sheetName: null,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: categories.code,
          set: {
            name: subName,
            parentId,
            displayOrder: subOrder - 1,
          },
        })
        .returning({ id: categories.id });

      // Key for MES-code-based lookup (backward compat): mesCode:subName
      for (const mesCode of config.mesCategories) {
        subCategoryMap.set(`${mesCode}:${subName}`, subRow.id);
        // Record the first sub-category for each MES code as a fallback
        if (!mesCategoryToFirstSubCatId.has(mesCode)) {
          mesCategoryToFirstSubCatId.set(mesCode, subRow.id);
        }
      }
      totalSubCategories++;

      // Build mesItemCd/shopbyId -> subCategoryId maps from raw sheet products
      // isDefaultSub: sheets with no '구분' column use parent name as the single sub-category
      const isDefaultSub = subName === config.name;
      for (const sheetName of sheetsToScan) {
        const sheet = rawData.sheets[sheetName];
        if (!sheet) continue;
        for (const product of sheet.products) {
          // Match condition: explicit category match OR default sub (flat sheets)
          const matches = isDefaultSub ? !product.category : product.category === subName;
          if (matches && product.mesItemCd) {
            mesItemCdToSubCategoryId.set(product.mesItemCd, subRow.id);
          }
          // Priority 0: shopbyId (raw data id = Excel B = huni_code) -> subCategoryId
          // Used for 굿즈 which have no mesItemCd in raw sheet data
          if (matches && product.id) {
            shopbyIdToSubCategoryId.set(product.id, subRow.id);
          }
        }
      }
    }
  }

  console.log(`  Seeded ${Object.keys(SHEET_CATEGORY_MAP).length} parent categories + ${totalSubCategories} sub-categories`);
  console.log(`  shopbyIdToSubCategoryId map: ${shopbyIdToSubCategoryId.size} entries`);
  return { subCategoryMap, mesCategoryToParentMap, mesItemCdToSubCategoryId, shopbyIdToSubCategoryId, mesCategoryToFirstSubCatId };
}

// ============================================================
// Phase 1b: Seed HuniImpositionRule
// ============================================================

async function seedImpositionRules(): Promise<void> {
  console.log('Seeding HuniImpositionRule...');
  const data = loadJson<ImpositionData>(path.join(PRICING_DIR, 'imposition.json'));

  let count = 0;
  for (const row of data.lookupTable) {
    if (row.imposition === null || row.workSize === null) continue;

    const cutDims = parseSizeSpec(row.trimSize);
    const workDims = parseSizeSpec(row.workSize);

    if (!cutDims || !workDims) continue;

    let sheetStandard = row.basePaper;
    if (sheetStandard === '3절') sheetStandard = 'T3';

    const cutSizeCode = makeCutSizeCode(row.trimSize);

    try {
      await db
        .insert(impositionRules)
        .values({
          cutSizeCode,
          cutWidth: String(cutDims.w),
          cutHeight: String(cutDims.h),
          workWidth: String(workDims.w),
          workHeight: String(workDims.h),
          impositionCount: row.imposition,
          sheetStandard,
          description: row.note ?? undefined,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: [impositionRules.cutWidth, impositionRules.cutHeight, impositionRules.sheetStandard],
          set: {
            cutSizeCode,
            workWidth: String(workDims.w),
            workHeight: String(workDims.h),
            impositionCount: row.imposition,
            description: row.note ?? undefined,
          },
        });
      count++;
    } catch {
      // Skip duplicates that conflict on unique constraint with different cutSizeCode
    }
  }

  console.log(`  Seeded ${count} imposition rules`);
}

// ============================================================
// Phase 1c: Seed HuniPrintMode
// ============================================================

async function seedPrintModes(): Promise<Map<number, string>> {
  console.log('Seeding HuniPrintMode...');
  const data = loadJson<DigitalPrintData>(path.join(PRICING_DIR, 'digital-print.json'));
  const printModeCodeMap = new Map<number, string>();

  for (let i = 0; i < data.printTypes.length; i++) {
    const pt = data.printTypes[i];
    const code = makePrintModeCode(pt.label, pt.code);
    const { sides, colorType } = mapPrintModeDetails(pt.code);

    await db
      .insert(printModes)
      .values({
        code,
        name: pt.label,
        sides,
        colorType,
        priceCode: pt.code,
        displayOrder: i,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: printModes.code,
        set: {
          name: pt.label,
          sides,
          colorType,
          displayOrder: i,
        },
      });

    printModeCodeMap.set(pt.code, code);
  }

  console.log(`  Seeded ${data.printTypes.length} print modes`);
  return printModeCodeMap;
}

// ============================================================
// Phase 1d: Seed HuniPostProcess
// ============================================================

async function seedPostProcesses(): Promise<void> {
  console.log('Seeding HuniPostProcess...');
  const data = loadJson<FinishingData>(path.join(PRICING_DIR, 'finishing.json'));

  let count = 0;
  let displayOrder = 0;

  for (const [key, finishingType] of Object.entries(data.finishingTypes)) {
    const config = FINISHING_CONFIG[key];
    if (!config) {
      console.warn(`  Warning: No config for finishing type "${key}", skipping`);
      continue;
    }

    for (const option of finishingType.options) {
      const cleanLabel = option.label
        .replace(/\s+/g, '_')
        .replace(/[()*/]/g, '')
        .toUpperCase();
      const code = `PP_${config.groupCode}_${cleanLabel}`;

      await db
        .insert(postProcesses)
        .values({
          groupCode: config.groupCode,
          code,
          name: `${finishingType.name} - ${option.label}`,
          processType: config.processType,
          subOptionCode: option.code,
          subOptionName: option.label,
          priceBasis: config.priceBasis,
          sheetStandard: config.sheetStandard ?? null,
          displayOrder: displayOrder++,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: postProcesses.code,
          set: {
            name: `${finishingType.name} - ${option.label}`,
            processType: config.processType,
            subOptionCode: option.code,
            subOptionName: option.label,
          },
        });
      count++;
    }
  }

  console.log(`  Seeded ${count} post process entries`);
}

// ============================================================
// Phase 1e: Seed HuniBinding
// ============================================================

async function seedBindings(): Promise<void> {
  console.log('Seeding HuniBinding...');
  const data = loadJson<BindingData>(path.join(PRICING_DIR, 'binding.json'));

  for (let i = 0; i < data.bindingTypes.length; i++) {
    const bt = data.bindingTypes[i];
    const code = BINDING_CODE_MAP[bt.name] ?? `BIND_${bt.name.replace(/\s+/g, '_').toUpperCase()}`;

    await db
      .insert(bindings)
      .values({
        code,
        name: bt.name,
        displayOrder: i,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: bindings.code,
        set: {
          name: bt.name,
          displayOrder: i,
        },
      });
  }

  console.log(`  Seeded ${data.bindingTypes.length} bindings`);
}

// ============================================================
// Phase 1f: Seed HuniPaper
// ============================================================

async function seedPapers(): Promise<void> {
  console.log('Seeding HuniPaper...');
  const data = loadJson<PaperData>(path.join(PRICING_DIR, 'paper.json'));

  const seenCodes = new Set<string>();
  let count = 0;

  for (let i = 0; i < data.papers.length; i++) {
    const paper = data.papers[i];
    let baseCode = 'PAPER_' + paper.mesCode;

    let code = baseCode;
    let suffix = 1;
    while (seenCodes.has(code)) {
      code = `${baseCode}_${suffix++}`;
    }
    seenCodes.add(code);

    await db
      .insert(papers)
      .values({
        code,
        name: paper.name,
        weight: paper.weight ?? null,
        sheetSize: paper.paperSize ?? null,
        costPer4Cut: paper.pricePerSheet > 0 ? String(paper.pricePerSheet) : null,
        sellingPer4Cut: null,
        displayOrder: i,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: papers.code,
        set: {
          name: paper.name,
          weight: paper.weight ?? null,
          sheetSize: paper.paperSize ?? null,
          costPer4Cut: paper.pricePerSheet > 0 ? String(paper.pricePerSheet) : null,
          displayOrder: i,
        },
      });
    count++;
  }

  console.log(`  Seeded ${count} papers`);
}

// ============================================================
// Phase 1g: Seed HuniLossQuantityConfig
// ============================================================

async function seedLossQuantityConfig(): Promise<void> {
  console.log('Seeding HuniLossQuantityConfig...');

  await db
    .insert(lossQuantityConfigs)
    .values({
      scopeType: 'global',
      scopeId: null,
      lossRate: '0.03',
      minLossQty: 10,
      description: 'Global default loss rate 3% with minimum 10 units',
      isActive: true,
    })
    .onConflictDoUpdate({
      target: [lossQuantityConfigs.scopeType, lossQuantityConfigs.scopeId],
      set: {
        lossRate: '0.03',
        minLossQty: 10,
      },
    });

  console.log('  Seeded 1 loss quantity config (global default)');
}

// ============================================================
// Phase 2: Seed HuniProduct + HuniMesItem + HuniProductMesMapping
// ============================================================

async function seedProductsAndMes(
  subCategoryMap: Map<string, number>,
  mesCategoryToParentMap: Map<string, number>,
  mesItemCdToSubCategoryId: Map<string, number>,
  shopbyIdToSubCategoryId: Map<number, number>,
  mesCategoryToFirstSubCatId: Map<string, number>,
): Promise<void> {
  console.log('Seeding HuniProduct, HuniMesItem, HuniProductMesMapping...');
  const data = loadJson<MesData>(path.join(EXPORTS_DIR, 'MES_자재공정매핑_v5.json'));

  let productCount = 0;
  let mesItemCount = 0;
  let mappingCount = 0;

  let sequentialId = 90001;

  for (const product of data.products) {
    // Priority 0: shopbyId (= Excel B = huni_code) -> raw data id -> subCategoryId
    // Fixes 굿즈 (cat 10/11) which have no mesItemCd in raw sheet → map was empty
    // @MX:SPEC: SPEC-SEED-001 §5.2 Priority 0
    let categoryId = product.shopbyId
      ? shopbyIdToSubCategoryId.get(product.shopbyId)
      : undefined;

    // Priority 1: Use mesItemCd -> subCategoryId from raw sheet data (most accurate)
    if (!categoryId) categoryId = mesItemCdToSubCategoryId.get(product.MesItemCd);

    // Priority 2: MES subCategory name -> depth=1 sub-category (backward compat)
    if (!categoryId) {
      const subKey = `${product.categoryCode}:${product.subCategory ?? ''}`;
      categoryId = subCategoryMap.get(subKey);
    }

    // Priority 3: MES category name as fallback sub-category
    if (!categoryId && product.categoryName) {
      const fallbackKey = `${product.categoryCode}:${product.categoryName}`;
      categoryId = subCategoryMap.get(fallbackKey);
    }

    // Priority 4: First depth=1 sub-category of parent (products with cat=None in raw data)
    // Better than depth=0 fallback, avoids AC6 violation
    if (!categoryId) {
      categoryId = mesCategoryToFirstSubCatId.get(product.categoryCode);
    }

    // Final fallback: use depth=0 parent category (last resort)
    if (!categoryId) {
      categoryId = mesCategoryToParentMap.get(product.categoryCode);
    }

    if (!categoryId) {
      console.warn(`  Warning: No category found for code "${product.categoryCode}", skipping ${product.MesItemName}`);
      continue;
    }

    const huniCode = product.shopbyId
      ? String(product.shopbyId)
      : String(sequentialId++);

    // All products get edicus code regardless of shopbyId presence
    const edicusCode = `HU_${huniCode}`;

    // Slug: use MesItemCd as primary slug (always unique, URL-safe)
    // Korean product names produce empty strings with ASCII \w filter
    const slug = product.MesItemCd.toLowerCase();

    const pricingModel = derivePricingModel(product.productType);
    const orderMethod = deriveOrderMethod(product.editor, product.materialOptions);
    const editorEnabled = product.editor === 'O';

    try {
      // Upsert HuniProduct
      const [createdProduct] = await db
        .insert(products)
        .values({
          categoryId,
          huniCode,
          edicusCode,
          // @MX:NOTE: shopbyId is NULL - Shopby platform ID to be linked separately per SPEC-DATA-002
          // v5.json shopbyId field = Excel B col = huni_code (NOT Shopby platform ID)
          shopbyId: null,
          name: product.productName,
          slug,
          productType: product.productType,
          pricingModel,
          figmaSection: product.figmaSection ?? null,
          orderMethod,
          editorEnabled,
          // mesRegistered: true if product has a MES item code (MesItemCd present)
          mesRegistered: !!product.MesItemCd,
          // @MX:NOTE: [AUTO] Internal-only products (SPEC-SEED-001 §6.2) get is_active=false
          isActive: !INTERNAL_PRODUCT_NAMES.has(product.productName),
        })
        .onConflictDoUpdate({
          target: products.huniCode,
          set: {
            categoryId,
            name: product.productName,
            productType: product.productType,
            pricingModel,
            figmaSection: product.figmaSection ?? null,
            orderMethod,
            editorEnabled,
            mesRegistered: !!product.MesItemCd,
            isActive: !INTERNAL_PRODUCT_NAMES.has(product.productName),
          },
        })
        .returning({ id: products.id });
      productCount++;

      // Upsert HuniMesItem
      const [mesItem] = await db
        .insert(mesItems)
        .values({
          itemCode: product.MesItemCd,
          groupCode: product.categoryCode,
          name: product.MesItemName,
          itemType: 'finished',
          unit: 'EA',
          isActive: true,
        })
        .onConflictDoUpdate({
          target: mesItems.itemCode,
          set: {
            name: product.MesItemName,
            groupCode: product.categoryCode,
          },
        })
        .returning({ id: mesItems.id });
      mesItemCount++;

      // Upsert HuniProductMesMapping
      await db
        .insert(productMesMappings)
        .values({
          productId: createdProduct.id,
          mesItemId: mesItem.id,
          coverType: null,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: [productMesMappings.productId, productMesMappings.mesItemId, productMesMappings.coverType],
          set: {
            isActive: true,
          },
        });
      mappingCount++;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`  Warning: Failed to seed product "${product.MesItemName}": ${errMsg}`);
    }
  }

  console.log(`  Seeded ${productCount} products, ${mesItemCount} MES items, ${mappingCount} mappings`);
}

// ============================================================
// Phase 3: Seed Pricing Data
// ============================================================

async function seedPricingData(printModeCodeMap: Map<number, string>): Promise<void> {
  await seedDigitalPrintPricing(printModeCodeMap);
  await seedPostProcessPricing();
  await seedBindingPricing();
}

// Phase 3j: Digital Print Price Table
async function seedDigitalPrintPricing(printModeCodeMap: Map<number, string>): Promise<void> {
  console.log('Seeding digital print price table...');
  const data = loadJson<DigitalPrintData>(path.join(PRICING_DIR, 'digital-print.json'));

  // Create the price table header
  const [priceTable] = await db
    .insert(priceTables)
    .values({
      code: 'PT_OUTPUT_SELL_A3',
      name: '디지털출력비 판매가 A3',
      priceType: 'selling',
      quantityBasis: 'sheet_count',
      sheetStandard: 'A3',
      description: 'Digital print selling price per sheet (A3 basis)',
      isActive: true,
    })
    .onConflictDoUpdate({
      target: priceTables.code,
      set: {
        name: '디지털출력비 판매가 A3',
      },
    })
    .returning({ id: priceTables.id });

  // Parse price tiers
  const qtys = Object.keys(data.priceTable)
    .map(Number)
    .sort((a, b) => a - b);

  // Delete existing tiers for this table to re-seed cleanly
  await db.delete(priceTiers).where(eq(priceTiers.priceTableId, priceTable.id));

  const tiersToCreate: Array<{
    priceTableId: number;
    optionCode: string;
    minQty: number;
    maxQty: number;
    unitPrice: string;
    isActive: boolean;
  }> = [];

  let tierCount = 0;

  for (let i = 0; i < qtys.length; i++) {
    const qty = qtys[i];
    const nextQty = qtys[i + 1];
    const maxQty = nextQty ? nextQty - 1 : 999999;
    const prices = data.priceTable[String(qty)];

    for (const [printCodeStr, unitPrice] of Object.entries(prices)) {
      const printCode = Number(printCodeStr);
      const optionCode = printModeCodeMap.get(printCode);
      if (!optionCode) continue;

      tiersToCreate.push({
        priceTableId: priceTable.id,
        optionCode,
        minQty: qty,
        maxQty,
        unitPrice: String(unitPrice),
        isActive: true,
      });
      tierCount++;
    }
  }

  // Bulk insert
  if (tiersToCreate.length > 0) {
    await db.insert(priceTiers).values(tiersToCreate);
  }

  console.log(`  Seeded price table PT_OUTPUT_SELL_A3 with ${tierCount} tiers`);
}

// Phase 3k: Post-process price tables
async function seedPostProcessPricing(): Promise<void> {
  console.log('Seeding post-process price tables...');
  const data = loadJson<FinishingData>(path.join(PRICING_DIR, 'finishing.json'));

  let tableCount = 0;
  let totalTiers = 0;

  for (const [key, finishingType] of Object.entries(data.finishingTypes)) {
    const config = FINISHING_CONFIG[key];
    if (!config) continue;

    const tableCode = `PT_${config.groupCode}_SELL`;
    const tableName = `${finishingType.name} 판매가`;

    const [priceTable] = await db
      .insert(priceTables)
      .values({
        code: tableCode,
        name: tableName,
        priceType: 'selling',
        quantityBasis: config.priceBasis === 'per_sheet' ? 'sheet_count' : 'unit_count',
        sheetStandard: config.sheetStandard ?? null,
        description: finishingType.description,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: priceTables.code,
        set: {
          name: tableName,
        },
      })
      .returning({ id: priceTables.id });
    tableCount++;

    // Delete existing tiers
    await db.delete(priceTiers).where(eq(priceTiers.priceTableId, priceTable.id));

    const qtys = Object.keys(finishingType.priceTable)
      .map(Number)
      .sort((a, b) => a - b);

    const tiersToCreate: Array<{
      priceTableId: number;
      optionCode: string;
      minQty: number;
      maxQty: number;
      unitPrice: string;
      isActive: boolean;
    }> = [];

    for (let i = 0; i < qtys.length; i++) {
      const qty = qtys[i];
      const nextQty = qtys[i + 1];
      const maxQty = nextQty ? nextQty - 1 : 999999;
      const prices = finishingType.priceTable[String(qty)];

      for (const [optCodeStr, unitPrice] of Object.entries(prices)) {
        const optCode = Number(optCodeStr);
        const cleanLabel = (
          finishingType.options.find((o) => o.code === optCode)?.label ?? optCodeStr
        )
          .replace(/\s+/g, '_')
          .replace(/[()*/]/g, '')
          .toUpperCase();
        const optionCode = `PP_${config.groupCode}_${cleanLabel}`;

        tiersToCreate.push({
          priceTableId: priceTable.id,
          optionCode,
          minQty: qty,
          maxQty,
          unitPrice: String(unitPrice),
          isActive: true,
        });
        totalTiers++;
      }
    }

    if (tiersToCreate.length > 0) {
      await db.insert(priceTiers).values(tiersToCreate);
    }
  }

  console.log(`  Seeded ${tableCount} post-process price tables with ${totalTiers} total tiers`);
}

// Phase 3l: Binding price table
async function seedBindingPricing(): Promise<void> {
  console.log('Seeding binding price table...');
  const data = loadJson<BindingData>(path.join(PRICING_DIR, 'binding.json'));

  const [priceTable] = await db
    .insert(priceTables)
    .values({
      code: 'PT_BINDING_SELL',
      name: '제본비 판매가',
      priceType: 'selling',
      quantityBasis: 'unit_count',
      sheetStandard: null,
      description: 'Binding selling price per unit',
      isActive: true,
    })
    .onConflictDoUpdate({
      target: priceTables.code,
      set: {
        name: '제본비 판매가',
      },
    })
    .returning({ id: priceTables.id });

  // Delete existing tiers
  await db.delete(priceTiers).where(eq(priceTiers.priceTableId, priceTable.id));

  const qtys = Object.keys(data.priceTable)
    .map(Number)
    .sort((a, b) => a - b);

  const tiersToCreate: Array<{
    priceTableId: number;
    optionCode: string;
    minQty: number;
    maxQty: number;
    unitPrice: string;
    isActive: boolean;
  }> = [];

  let tierCount = 0;

  for (let i = 0; i < qtys.length; i++) {
    const qty = qtys[i];
    const nextQty = qtys[i + 1];
    const maxQty = nextQty ? nextQty - 1 : 999999;
    const prices = data.priceTable[String(qty)];

    for (const [bindingCodeStr, unitPrice] of Object.entries(prices)) {
      const bindingCode = Number(bindingCodeStr);
      const bindingType = data.bindingTypes.find((bt) => bt.code === bindingCode);
      const optionCode = bindingType
        ? (BINDING_CODE_MAP[bindingType.name] ?? `BIND_${bindingType.name.replace(/\s+/g, '_').toUpperCase()}`)
        : `BIND_${bindingCodeStr}`;

      tiersToCreate.push({
        priceTableId: priceTable.id,
        optionCode,
        minQty: qty,
        maxQty,
        unitPrice: String(unitPrice),
        isActive: true,
      });
      tierCount++;
    }
  }

  if (tiersToCreate.length > 0) {
    await db.insert(priceTiers).values(tiersToCreate);
  }

  console.log(`  Seeded price table PT_BINDING_SELL with ${tierCount} tiers`);
}

// ============================================================
// Main entry point
// ============================================================

async function main() {
  console.log('='.repeat(60));
  console.log('Seeding SPEC-DATA-002 normalized Huni* data (Drizzle)...');
  console.log('='.repeat(60));

  try {
    // Phase 1: Basic master data (order matters)
    const { subCategoryMap, mesCategoryToParentMap, mesItemCdToSubCategoryId, shopbyIdToSubCategoryId, mesCategoryToFirstSubCatId } = await seedCategories();
    await seedImpositionRules();
    const printModeCodeMap = await seedPrintModes();
    await seedPostProcesses();
    await seedBindings();
    await seedPapers();
    await seedLossQuantityConfig();

    // Phase 2: Products and MES
    await seedProductsAndMes(subCategoryMap, mesCategoryToParentMap, mesItemCdToSubCategoryId, shopbyIdToSubCategoryId, mesCategoryToFirstSubCatId);

    // Phase 3: Pricing data
    await seedPricingData(printModeCodeMap);

    console.log('='.repeat(60));
    console.log('SPEC-DATA-002 seed complete!');
    console.log('='.repeat(60));
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run
main();
