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
  productSizes,
  papers,
  materials,
  paperProductMappings,
  printModes,
  postProcesses,
  bindings,
  impositionRules,
  priceTables,
  priceTiers,
  fixedPrices,
  foilPrices,
  lossQuantityConfigs,
  optionDefinitions,
  optionChoices,
  optionConstraints,
  productOptions,
  mesItems,
  mesItemOptions,
  productMesMappings,
  productEditorMappings,
} from '@widget-creator/shared';

// DB connection (standalone for seed script, separate from shared db instance)
const connectionString = process.env.DATABASE_URL!;
const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

// ============================================================
// Data file paths (date-based version resolution)
// ============================================================

import { getCurrentVersion, getVersionDir } from './lib/data-paths';
import { loadAndValidate, GoodsJsonSchema } from './lib/schemas';

const DATA_ROOT = path.resolve(__dirname, '../data');
const currentVersion = getCurrentVersion();
const DATA_DIR = getVersionDir(currentVersion);
const PRICING_DIR = path.join(DATA_DIR, 'pricing');
// exports/ stays at top-level (not versioned -- source reference data)
const EXPORTS_DIR = path.join(DATA_ROOT, 'exports');

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
    abbreviation: string | null;
    gramWeight: number | null;
    fullSheetSize: string | null;
    // New fields from generate-pricing-json.py (extended to read pricing Excel)
    sellingPerReam?: number;
    costPerReam?: number | null;
    sellingPer4Cut?: number | null;
    // Legacy fields (older JSON versions used pricePerReam/pricePerSheet)
    pricePerReam?: number;
    pricePerSheet?: number;
    mesCode?: string;
    applicableProducts?: string[];
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
  name: string;
  code: number | null;
}

interface FinishingPriceTier {
  quantity: number;
  prices: Record<string, number>;
}

interface FinishingType {
  code: string;
  name: string;
  description?: string;
  subOptions: FinishingOption[];
  priceTiers: FinishingPriceTier[];
}

interface FinishingData {
  finishingTypes: Record<string, FinishingType>;
}

interface BindingPriceTier {
  quantity: number;
  unitPrice: number;
}

interface BindingType {
  name: string;
  code: number;
  priceTiers: BindingPriceTier[];
}

interface BindingData {
  bindingTypes: BindingType[];
}

interface ImpositionRow {
  trimSize: string;
  workSize: string | null;
  notes: string | null;
  impositionCount: number | null;
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
  Postprocess001: { groupCode: 'PP001', processType: 'perforation', priceBasis: 'per_unit' },
  Postprocess002: { groupCode: 'PP002', processType: 'creasing', priceBasis: 'per_unit' },
  Postprocess003: { groupCode: 'PP003', processType: 'folding', priceBasis: 'per_unit' },
  Postprocess004: { groupCode: 'PP004', processType: 'vdp_text', priceBasis: 'per_unit' },
  Postprocess005: { groupCode: 'PP005', processType: 'vdp_image', priceBasis: 'per_unit' },
  Postprocess006: { groupCode: 'PP006', processType: 'corner', priceBasis: 'per_unit' },
  Postprocess007: { groupCode: 'PP007', processType: 'coating', priceBasis: 'per_sheet' },
  Postprocess008: {
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

// ============================================================
// Phase 4+ Constants: Option definitions, materials metadata
// ============================================================

// @MX:NOTE: [AUTO] Maps JSON option keys to option_definitions table metadata
// @MX:SPEC: SPEC-DATA-002
// optionClass values: 'material' (자재, 9종), 'process' (공정, 14종), 'setting' (설정, 7종)
// uiComponent values match SPEC-DATA-002 Section 4.5.1 UI component definitions
const OPTION_DEFINITION_MAP: Record<
  string,
  { name: string; optionClass: string; optionType: string; uiComponent: string; description?: string }
> = {
  // === 자재 (Material) options ===
  size: { name: '사이즈', optionClass: 'material', optionType: 'size', uiComponent: 'toggle-group', description: 'Product size selection' },
  paper: { name: '용지', optionClass: 'material', optionType: 'paper', uiComponent: 'select', description: 'Paper type selection' },
  material: { name: '소재', optionClass: 'material', optionType: 'material', uiComponent: 'select', description: 'Material type selection' },
  innerPaper: { name: '내지용지', optionClass: 'material', optionType: 'paper', uiComponent: 'select', description: 'Inner pages paper' },
  coverPaper: { name: '표지용지', optionClass: 'material', optionType: 'paper', uiComponent: 'select', description: 'Cover paper' },
  ringColor: { name: '링색상', optionClass: 'material', optionType: 'accessory', uiComponent: 'radio-group:color-chip', description: 'Ring color selection' },
  transparentCover: { name: '투명커버', optionClass: 'material', optionType: 'accessory', uiComponent: 'toggle-group', description: 'Transparent cover option' },
  endpaper: { name: '면지', optionClass: 'material', optionType: 'accessory', uiComponent: 'select', description: 'Endpaper selection' },
  standColor: { name: '거치대색상', optionClass: 'material', optionType: 'accessory', uiComponent: 'radio-group:color-chip', description: 'Stand color' },
  // === 공정 (Process) options ===
  printType: { name: '인쇄방식', optionClass: 'process', optionType: 'print', uiComponent: 'select', description: 'Print mode selection' },
  finishing: { name: '후가공', optionClass: 'process', optionType: 'postprocess', uiComponent: 'collapsible', description: 'Post-processing options' },
  coating: { name: '코팅', optionClass: 'process', optionType: 'coating', uiComponent: 'toggle-group', description: 'Coating option' },
  specialPrint: { name: '특수인쇄', optionClass: 'process', optionType: 'special_color', uiComponent: 'toggle-group', description: 'Special printing options' },
  folding: { name: '접지', optionClass: 'process', optionType: 'postprocess', uiComponent: 'toggle-group', description: 'Folding option' },
  foilStamp: { name: '박가공', optionClass: 'process', optionType: 'postprocess', uiComponent: 'toggle-group', description: 'Foil stamping options' },
  cuttingType: { name: '칼선유형', optionClass: 'process', optionType: 'accessory', uiComponent: 'toggle-group', description: 'Cutting type selection' },
  processing: { name: '가공', optionClass: 'process', optionType: 'accessory', uiComponent: 'toggle-group', description: 'Processing option' },
  binding: { name: '제본방식', optionClass: 'process', optionType: 'binding', uiComponent: 'radio-group:image-chip', description: 'Binding method' },
  coverCoating: { name: '표지코팅', optionClass: 'process', optionType: 'coating', uiComponent: 'toggle-group', description: 'Cover coating option' },
  bindingDirection: { name: '제본방향', optionClass: 'process', optionType: 'binding', uiComponent: 'toggle-group', description: 'Binding direction' },
  calendarProcess: { name: '캘린더가공', optionClass: 'process', optionType: 'postprocess', uiComponent: 'radio-group:color-chip', description: 'Calendar processing' },
  bindingOption: { name: '제본옵션', optionClass: 'process', optionType: 'binding', uiComponent: 'radio-group:image-chip', description: 'Binding option' },
  bindingSpec: { name: '제본사양', optionClass: 'process', optionType: 'binding', uiComponent: 'radio-group:image-chip', description: 'Binding specification' },
  // === 설정 (Setting) options ===
  quantity: { name: '수량', optionClass: 'setting', optionType: 'quantity', uiComponent: 'input:number', description: 'Order quantity input' },
  additionalProduct: { name: '추가상품', optionClass: 'setting', optionType: 'accessory', uiComponent: 'select', description: 'Additional product options' },
  pieceCount: { name: '조각수', optionClass: 'setting', optionType: 'accessory', uiComponent: 'select', description: 'Piece count per item' },
  pageCount: { name: '페이지수', optionClass: 'setting', optionType: 'quantity', uiComponent: 'input:number', description: 'Page count for booklets' },
  packaging: { name: '개별포장', optionClass: 'setting', optionType: 'accessory', uiComponent: 'select', description: 'Packaging option' },
  innerType: { name: '내지종류', optionClass: 'setting', optionType: 'accessory', uiComponent: 'toggle-group', description: 'Inner type selection' },
  selection: { name: '상품선택', optionClass: 'setting', optionType: 'accessory', uiComponent: 'toggle-group', description: 'Product selection' },
};

// Maps material labels to material types for the materials table
const MATERIAL_TYPE_MAP: Record<string, { materialType: string; thickness?: string }> = {
  '유포스티커': { materialType: 'sticker' },
  '비코팅스티커': { materialType: 'sticker' },
  '미색스티커': { materialType: 'sticker' },
  '무광코팅스티커': { materialType: 'sticker' },
  '유광코팅스티커': { materialType: 'sticker' },
  '투명스티커': { materialType: 'sticker' },
  '전용지+엠보코팅': { materialType: 'sticker' },
  '투명전용지': { materialType: 'sticker' },
  '투명데드롱스티커': { materialType: 'sticker' },
  '은데드롱스티커': { materialType: 'sticker' },
  '타투전용지': { materialType: 'sticker' },
  '인화지': { materialType: 'photo' },
  '매트지': { materialType: 'photo' },
  'PET': { materialType: 'plastic', thickness: '3mm' },
  '투명PET': { materialType: 'plastic', thickness: '3mm' },
  'PVC': { materialType: 'plastic' },
  '투명PVC': { materialType: 'plastic' },
  '그래픽천': { materialType: 'fabric' },
  '린넨': { materialType: 'fabric' },
  '캔버스(옥스포드)': { materialType: 'fabric' },
  '레더(화이트)': { materialType: 'leather' },
  '타이벡(하드)': { materialType: 'synthetic', thickness: 'hard' },
  '타이벡(소프트)': { materialType: 'synthetic', thickness: 'soft' },
  '메쉬': { materialType: 'fabric' },
  '현수막천': { materialType: 'fabric' },
  '화이트': { materialType: 'acrylic', thickness: '3mm' },
  '블랙': { materialType: 'acrylic', thickness: '3mm' },
  '골드': { materialType: 'acrylic', thickness: '3mm' },
};

// Product JSON data type definition
interface ProductJsonData {
  id: string;
  mesItemCd: string;
  name: string;
  category: string;
  type: string;
  options: Record<string, {
    type: string;
    required?: boolean;
    choices?: Array<{
      label: string;
      value: string;
      code?: number;
      priceKey?: string;
      defaultDisabled?: boolean;
      specs?: Record<string, unknown>;
      sizeConstraint?: string;
    }>;
    min?: number;
    max?: number;
    step?: number;
    defaultDisabled?: boolean;
    subOptions?: Record<string, unknown>;
    supportMultiCount?: boolean;
  }>;
  fileSpec?: Record<string, unknown>;
  orderMethod?: Record<string, boolean>;
  innerPageSpec?: { mesItemCd: string };
  coverSpec?: { mesItemCd: string };
}

// Foil price data type
interface FoilData {
  copperPlate: {
    columnHeaders: string[];
    data: Array<{ height: number; prices: Record<string, number> }>;
  };
  basicFoil: {
    sizeHeaders: string[];
    priceTable: Array<{ quantity: number; prices: Record<string, number> }>;
  };
  specialFoil?: {
    sizeHeaders: string[];
    priceTable: Array<{ quantity: number; prices: Record<string, number> }>;
  };
  foilBusinessCard?: Record<string, unknown>;
}

// Goods pricing data type
interface GoodsData {
  data: Array<{
    category: string;
    productName: string;
    productOption: string | null;
    selectOption: string | null;
    cost: number;
    sellingPrice: number;
    sellingPriceVatIncl: number;
  }>;
}

// Acrylic pricing data type
interface AcrylicData {
  subTables: {
    customSizeGrid: {
      widths: number[];
      data: Array<{ height: number; prices: Record<string, number> }>;
    };
  };
}

// Business card pricing data type
interface BusinessCardData {
  data: Array<{
    productName: string;
    paper: string;
    singleSidePrice: number | null;
    doubleSidePrice: number | null;
    baseQty: number;
  }>;
}

// Option constraints data type (from option-constraints.json)
interface OptionConstraintRecord {
  product_code: string;
  sheet_name: string;
  constraint_type: 'size_show' | 'size_range' | 'paper_condition';
  rule_text: string;
  description: string;
  row: number;
  col: number;
  product_name: string;
}
interface OptionConstraintsData {
  metadata: { source: string; generated_at: string; total_constraints: number };
  constraints: OptionConstraintRecord[];
}

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
    if (row.impositionCount === null || row.workSize === null) continue;

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
          impositionCount: row.impositionCount,
          sheetStandard,
          description: row.notes ?? undefined,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: [impositionRules.cutWidth, impositionRules.cutHeight, impositionRules.sheetStandard],
          set: {
            cutSizeCode,
            workWidth: String(workDims.w),
            workHeight: String(workDims.h),
            impositionCount: row.impositionCount,
            description: row.notes ?? undefined,
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
    const code = makePrintModeCode(pt.name, pt.code);
    const { sides, colorType } = mapPrintModeDetails(pt.code);

    await db
      .insert(printModes)
      .values({
        code,
        name: pt.name,
        sides,
        colorType,
        priceCode: pt.code,
        displayOrder: i,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: printModes.code,
        set: {
          name: pt.name,
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

    for (const option of finishingType.subOptions) {
      // Skip entries with null code (comment/metadata rows in source data)
      if (option.code === null) continue;

      const cleanLabel = option.name
        .replace(/\s+/g, '_')
        .replace(/[()*/]/g, '')
        .toUpperCase();
      const code = `PP_${config.groupCode}_${cleanLabel}`;

      await db
        .insert(postProcesses)
        .values({
          groupCode: config.groupCode,
          code,
          name: `${finishingType.name} - ${option.name}`,
          processType: config.processType,
          subOptionCode: option.code,
          subOptionName: option.name,
          priceBasis: config.priceBasis,
          sheetStandard: config.sheetStandard ?? null,
          displayOrder: displayOrder++,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: postProcesses.code,
          set: {
            name: `${finishingType.name} - ${option.name}`,
            processType: config.processType,
            subOptionCode: option.code,
            subOptionName: option.name,
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

  let count = 0;

  await db.transaction(async (tx) => {
    // Clean up dependent tables before deleting papers (FK restrict on paperProductMappings)
    await tx.delete(paperProductMappings);
    await tx.delete(papers);

    for (let i = 0; i < data.papers.length; i++) {
      const paper = data.papers[i];
      // Generate deterministic code: use mesCode if available, otherwise index-based
      const code = paper.mesCode
        ? `PAPER_${paper.mesCode}`
        : `PAPER_${String(i + 1).padStart(3, '0')}`;

      await tx
        .insert(papers)
        .values({
          code,
          name: paper.name,
          abbreviation: paper.abbreviation ?? null,
          weight: paper.gramWeight ?? null,
          sheetSize: paper.fullSheetSize ?? null,
          // sellingPerReam: new field from extended parser (pricing Excel col I / master col G)
          // Legacy JSON uses pricePerReam; new JSON uses sellingPerReam directly.
          // costPerReam: from pricing Excel col H (구매원가). Null in legacy JSON.
          // sellingPer4Cut: from pricing Excel col K (국4절가). Null in legacy JSON.
          costPerReam: paper.costPerReam != null ? String(paper.costPerReam) : null,
          sellingPerReam: (() => {
            const v = paper.sellingPerReam ?? paper.pricePerReam ?? 0;
            return v > 0 ? String(v) : null;
          })(),
          costPer4Cut: null,
          sellingPer4Cut: paper.sellingPer4Cut != null ? String(paper.sellingPer4Cut) : null,
          displayOrder: i,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: papers.code,
          set: {
            name: paper.name,
            abbreviation: paper.abbreviation ?? null,
            weight: paper.gramWeight ?? null,
            sheetSize: paper.fullSheetSize ?? null,
            costPerReam: paper.costPerReam != null ? String(paper.costPerReam) : null,
            sellingPerReam: (() => {
              const v = paper.sellingPerReam ?? paper.pricePerReam ?? 0;
              return v > 0 ? String(v) : null;
            })(),
            costPer4Cut: null,
            sellingPer4Cut: paper.sellingPer4Cut != null ? String(paper.sellingPer4Cut) : null,
            displayOrder: i,
          },
        });
      count++;
    }
  });

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

  // Delete + insert in transaction for atomicity
  await db.transaction(async (tx) => {
    await tx.delete(priceTiers).where(eq(priceTiers.priceTableId, priceTable.id));
    if (tiersToCreate.length > 0) {
      await tx.insert(priceTiers).values(tiersToCreate);
    }
  });

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
        description: finishingType.description ?? null,
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

    // priceTiers is an array of {quantity, prices: {optionName: price}}
    const sortedTiers = [...finishingType.priceTiers].sort((a, b) => a.quantity - b.quantity);

    const tiersToCreate: Array<{
      priceTableId: number;
      optionCode: string;
      minQty: number;
      maxQty: number;
      unitPrice: string;
      isActive: boolean;
    }> = [];

    for (let i = 0; i < sortedTiers.length; i++) {
      const tier = sortedTiers[i];
      const nextTier = sortedTiers[i + 1];
      const maxQty = nextTier ? nextTier.quantity - 1 : 999999;

      for (const [optName, unitPrice] of Object.entries(tier.prices)) {
        const cleanLabel = optName
          .replace(/\s+/g, '_')
          .replace(/[()*/]/g, '')
          .toUpperCase();
        const optionCode = `PP_${config.groupCode}_${cleanLabel}`;

        tiersToCreate.push({
          priceTableId: priceTable.id,
          optionCode,
          minQty: tier.quantity,
          maxQty,
          unitPrice: String(unitPrice),
          isActive: true,
        });
        totalTiers++;
      }
    }

    // Delete + insert in transaction for atomicity
    await db.transaction(async (tx) => {
      await tx.delete(priceTiers).where(eq(priceTiers.priceTableId, priceTable.id));
      if (tiersToCreate.length > 0) {
        await tx.insert(priceTiers).values(tiersToCreate);
      }
    });
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

  const tiersToCreate: Array<{
    priceTableId: number;
    optionCode: string;
    minQty: number;
    maxQty: number;
    unitPrice: string;
    isActive: boolean;
  }> = [];

  let tierCount = 0;

  // Iterate over each binding type and its price tiers
  for (const bindingType of data.bindingTypes) {
    const optionCode =
      BINDING_CODE_MAP[bindingType.name] ??
      `BIND_${bindingType.name.replace(/\s+/g, '_').toUpperCase()}`;

    // Sort tiers by quantity for proper min/max calculation
    const sortedTiers = [...bindingType.priceTiers]
      .filter((tier) => tier.quantity > 0) // Skip tiers with quantity 0 (markers)
      .sort((a, b) => a.quantity - b.quantity);

    for (let i = 0; i < sortedTiers.length; i++) {
      const tier = sortedTiers[i];
      const nextTier = sortedTiers[i + 1];
      const maxQty = nextTier ? nextTier.quantity - 1 : 999999;

      tiersToCreate.push({
        priceTableId: priceTable.id,
        optionCode,
        minQty: tier.quantity,
        maxQty,
        unitPrice: String(tier.unitPrice),
        isActive: true,
      });
      tierCount++;
    }
  }

  // Delete + insert in transaction for atomicity
  await db.transaction(async (tx) => {
    await tx.delete(priceTiers).where(eq(priceTiers.priceTableId, priceTable.id));
    if (tiersToCreate.length > 0) {
      await tx.insert(priceTiers).values(tiersToCreate);
    }
  });

  console.log(`  Seeded price table PT_BINDING_SELL with ${tierCount} tiers`);
}

// ============================================================
// Phase 4: Seed HuniMaterial (non-paper materials)
// ============================================================

async function seedMaterials(): Promise<Map<string, number>> {
  console.log('Seeding HuniMaterial...');
  const materialNameToId = new Map<string, number>();

  let displayOrder = 0;
  for (const [name, config] of Object.entries(MATERIAL_TYPE_MAP)) {
    const code = 'MAT_' + name
      .replace(/[()]/g, '_')
      .replace(/\+/g, '_')
      .replace(/\s+/g, '_')
      .replace(/__+/g, '_')
      .toUpperCase();

    const [row] = await db
      .insert(materials)
      .values({
        code,
        name,
        materialType: config.materialType,
        thickness: config.thickness ?? null,
        description: null,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: materials.code,
        set: {
          name,
          materialType: config.materialType,
          thickness: config.thickness ?? null,
        },
      })
      .returning({ id: materials.id });

    materialNameToId.set(name, row.id);
    displayOrder++;
  }

  console.log(`  Seeded ${displayOrder} materials`);
  return materialNameToId;
}

// ============================================================
// Phase 5: Seed HuniOptionDefinition
// ============================================================

async function seedOptionDefinitions(): Promise<Map<string, number>> {
  console.log('Seeding HuniOptionDefinition...');
  const optionKeyToId = new Map<string, number>();

  let displayOrder = 0;
  for (const [key, config] of Object.entries(OPTION_DEFINITION_MAP)) {
    const [row] = await db
      .insert(optionDefinitions)
      .values({
        key,
        name: config.name,
        optionClass: config.optionClass,
        optionType: config.optionType,
        uiComponent: config.uiComponent,
        description: config.description ?? null,
        displayOrder,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: optionDefinitions.key,
        set: {
          name: config.name,
          optionClass: config.optionClass,
          optionType: config.optionType,
          uiComponent: config.uiComponent,
          description: config.description ?? null,
          displayOrder,
        },
      })
      .returning({ id: optionDefinitions.id });

    optionKeyToId.set(key, row.id);
    displayOrder++;
  }

  console.log(`  Seeded ${displayOrder} option definitions`);
  return optionKeyToId;
}

// ============================================================
// Phase 6: Seed HuniProductSize
// ============================================================

async function seedProductSizes(
  productSlugToId: Map<string, number>,
): Promise<void> {
  console.log('Seeding HuniProductSize...');

  const PRODUCTS_DIR = path.join(DATA_DIR, 'products');
  const files = fs.readdirSync(PRODUCTS_DIR).filter((f) => f.endsWith('.json'));

  let totalSizes = 0;

  for (const file of files) {
    const data = loadJson<ProductJsonData>(path.join(PRODUCTS_DIR, file));
    if (!data.options?.size?.choices) continue;

    const slug = data.mesItemCd.toLowerCase();
    const productId = productSlugToId.get(slug);
    if (!productId) continue;

    let displayOrder = 0;
    for (const choice of data.options.size.choices) {
      const specs = choice.specs ?? {};
      const trimSize = specs.trimSize as number[] | undefined;
      const workSize = specs.workSize as number[] | undefined;
      const customSize = specs.customSize as { width: { min: number; max: number }; height: { min: number; max: number } } | undefined;
      const bleed = specs.bleed as number | undefined;
      const imposition = specs.imposition as number | undefined;
      const isCustom = !!customSize;

      const code = choice.value
        .replace(/[^a-zA-Z0-9_x가-힣]/g, '_')
        .replace(/__+/g, '_')
        .toUpperCase();

      try {
        await db
          .insert(productSizes)
          .values({
            productId,
            code,
            displayName: choice.label,
            cutWidth: trimSize ? String(trimSize[0]) : null,
            cutHeight: trimSize ? String(trimSize[1]) : null,
            workWidth: workSize ? String(workSize[0]) : null,
            workHeight: workSize ? String(workSize[1]) : null,
            bleed: bleed !== undefined ? String(bleed) : '3.0',
            impositionCount: imposition ?? null,
            sheetStandard: null,
            displayOrder,
            isCustom,
            customMinW: customSize ? String(customSize.width.min) : null,
            customMinH: customSize ? String(customSize.height.min) : null,
            customMaxW: customSize ? String(customSize.width.max) : null,
            customMaxH: customSize ? String(customSize.height.max) : null,
            isActive: true,
          })
          .onConflictDoUpdate({
            target: [productSizes.productId, productSizes.code],
            set: {
              displayName: choice.label,
              cutWidth: trimSize ? String(trimSize[0]) : null,
              cutHeight: trimSize ? String(trimSize[1]) : null,
              workWidth: workSize ? String(workSize[0]) : null,
              workHeight: workSize ? String(workSize[1]) : null,
              bleed: bleed !== undefined ? String(bleed) : '3.0',
              impositionCount: imposition ?? null,
              displayOrder,
              isCustom,
              customMinW: customSize ? String(customSize.width.min) : null,
              customMinH: customSize ? String(customSize.height.min) : null,
              customMaxW: customSize ? String(customSize.width.max) : null,
              customMaxH: customSize ? String(customSize.height.max) : null,
            },
          });
        totalSizes++;
        displayOrder++;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn(`  Warning: Failed to seed size "${choice.label}" for ${data.mesItemCd}: ${errMsg}`);
      }
    }
  }

  console.log(`  Seeded ${totalSizes} product sizes`);
}

// ============================================================
// Phase 7: Seed HuniOptionChoice + HuniProductOption
// ============================================================

async function seedOptionChoicesAndProductOptions(
  optionKeyToId: Map<string, number>,
  productSlugToId: Map<string, number>,
  materialNameToId: Map<string, number>,
): Promise<void> {
  console.log('Seeding HuniOptionChoice + HuniProductOption...');

  // Build lookup maps from existing DB data
  const paperNameToId = new Map<string, number>();
  const paperRows = await db.select({ id: papers.id, name: papers.name }).from(papers);
  for (const row of paperRows) {
    paperNameToId.set(row.name, row.id);
  }

  const printModeCodeToId = new Map<number, number>();
  const printModeRows = await db.select({ id: printModes.id, priceCode: printModes.priceCode }).from(printModes);
  for (const row of printModeRows) {
    printModeCodeToId.set(row.priceCode, row.id);
  }

  const postProcessNameToId = new Map<string, number>();
  const postProcessRows = await db.select({ id: postProcesses.id, subOptionName: postProcesses.subOptionName }).from(postProcesses);
  for (const row of postProcessRows) {
    if (row.subOptionName) {
      postProcessNameToId.set(row.subOptionName, row.id);
    }
  }

  const bindingNameToId = new Map<string, number>();
  const bindingRows = await db.select({ id: bindings.id, name: bindings.name }).from(bindings);
  for (const row of bindingRows) {
    bindingNameToId.set(row.name, row.id);
  }

  const PRODUCTS_DIR = path.join(DATA_DIR, 'products');
  const files = fs.readdirSync(PRODUCTS_DIR).filter((f) => f.endsWith('.json'));

  // Track globally unique option choices by (optionDefinitionId, code) to avoid duplicates
  const seenChoices = new Map<string, number>(); // "defId:code" -> choiceId
  let totalChoices = 0;
  let totalProductOptions = 0;

  for (const file of files) {
    const data = loadJson<ProductJsonData>(path.join(PRODUCTS_DIR, file));
    if (!data.options) continue;

    const slug = data.mesItemCd.toLowerCase();
    const productId = productSlugToId.get(slug);
    if (!productId) continue;

    let optDisplayOrder = 0;

    for (const [optKey, optConfig] of Object.entries(data.options)) {
      const optDefId = optionKeyToId.get(optKey);
      if (!optDefId) continue;

      // Skip number-only options without choices (quantity, pageCount, pieceCount)
      // They still get a product_option entry but no choices
      const hasChoices = optConfig.choices && optConfig.choices.length > 0;

      // Create option choices if they exist
      let firstChoiceId: number | null = null;
      if (hasChoices) {
        let choiceOrder = 0;
        for (const choice of optConfig.choices!) {
          // Determine ref FKs based on option type
          let refPaperId: number | null = null;
          let refMaterialId: number | null = null;
          let refPrintModeId: number | null = null;
          let refPostProcessId: number | null = null;
          let refBindingId: number | null = null;

          if (optKey === 'paper' || optKey === 'innerPaper' || optKey === 'coverPaper') {
            if (choice.priceKey) refPaperId = paperNameToId.get(choice.priceKey) ?? null;
          } else if (optKey === 'material') {
            refMaterialId = materialNameToId.get(choice.label) ?? null;
          } else if (optKey === 'printType') {
            if (choice.code !== undefined) refPrintModeId = printModeCodeToId.get(choice.code) ?? null;
          } else if (optKey === 'finishing' || optKey === 'coating' || optKey === 'coverCoating') {
            if (choice.priceKey) refPostProcessId = postProcessNameToId.get(choice.priceKey) ?? null;
          } else if (optKey === 'binding') {
            refBindingId = bindingNameToId.get(choice.label) ?? null;
          }

          // Generate a unique code for the choice within this option definition
          const choiceCode = choice.value
            .replace(/[^a-zA-Z0-9_가-힣-]/g, '_')
            .replace(/__+/g, '_')
            .substring(0, 50);

          const seenKey = `${optDefId}:${choiceCode}`;

          if (!seenChoices.has(seenKey)) {
            try {
              const [choiceRow] = await db
                .insert(optionChoices)
                .values({
                  optionDefinitionId: optDefId,
                  code: choiceCode,
                  name: choice.label,
                  priceKey: choice.priceKey ?? null,
                  refPaperId,
                  refMaterialId,
                  refPrintModeId,
                  refPostProcessId,
                  refBindingId,
                  displayOrder: choiceOrder,
                  isActive: true,
                })
                .onConflictDoUpdate({
                  target: [optionChoices.optionDefinitionId, optionChoices.code],
                  set: {
                    name: choice.label,
                    priceKey: choice.priceKey ?? null,
                    refPaperId,
                    refMaterialId,
                    refPrintModeId,
                    refPostProcessId,
                    refBindingId,
                    displayOrder: choiceOrder,
                  },
                })
                .returning({ id: optionChoices.id });

              seenChoices.set(seenKey, choiceRow.id);
              totalChoices++;
            } catch (err) {
              const errMsg = err instanceof Error ? err.message : String(err);
              console.warn(`  Warning: Failed to seed choice "${choice.label}" for ${optKey}: ${errMsg}`);
            }
          }

          if (choiceOrder === 0) {
            firstChoiceId = seenChoices.get(seenKey) ?? null;
          }
          choiceOrder++;
        }
      }

      // Create product_option linking product to option definition
      const isRequired = optConfig.required ?? false;
      const isVisible = !(optConfig.defaultDisabled ?? false);

      try {
        await db
          .insert(productOptions)
          .values({
            productId,
            optionDefinitionId: optDefId,
            displayOrder: optDisplayOrder,
            isRequired,
            isVisible,
            isInternal: false,
            uiComponentOverride: null,
            defaultChoiceId: null,
            isActive: true,
          })
          .onConflictDoUpdate({
            target: [productOptions.productId, productOptions.optionDefinitionId],
            set: {
              displayOrder: optDisplayOrder,
              isRequired,
              isVisible,
            },
          });
        totalProductOptions++;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn(`  Warning: Failed to seed product option "${optKey}" for ${data.mesItemCd}: ${errMsg}`);
      }

      optDisplayOrder++;
    }
  }

  console.log(`  Seeded ${totalChoices} option choices, ${totalProductOptions} product options`);
}

// ============================================================
// Phase 8: Seed HuniPaperProductMapping
// ============================================================

// @MX:NOTE: [AUTO] Seeds option_constraints from Excel-extracted JSON (72 records)
// @MX:SPEC: P1 issue: option_constraints 미씨드
// Maps 3 constraint types: size_show (UI visibility), size_range (custom size bounds), paper_condition (paper weight gate)
async function seedOptionConstraints(
  productSlugToId: Map<string, number>,
): Promise<void> {
  console.log('Seeding HuniOptionConstraint...');
  const PRODUCTS_DIR = path.join(DATA_DIR, 'products');
  const data = loadJson<OptionConstraintsData>(
    path.join(PRODUCTS_DIR, 'option-constraints.json'),
  );

  let count = 0;
  let skipped = 0;

  for (const c of data.constraints) {
    const productId = productSlugToId.get(c.product_code.toLowerCase());
    if (!productId) {
      console.warn(`  Warning: No product found for code "${c.product_code}" (${c.product_name}), skipping`);
      skipped++;
      continue;
    }

    let sourceField: string;
    let operator: string;
    let value: string | null = null;
    let valueMin: string | null = null;
    let valueMax: string | null = null;
    let targetField: string;
    let targetAction: string;

    if (c.constraint_type === 'size_show') {
      // When a specific product subtype/variant is selected, show these size options
      sourceField = 'product_subtype';
      operator = 'eq';
      value = c.rule_text.substring(0, 200);
      targetField = 'size';
      targetAction = 'show';
    } else if (c.constraint_type === 'size_range') {
      // Custom size must be within min/max bounds
      sourceField = 'custom_size';
      operator = 'between';
      targetField = 'size';
      targetAction = 'constrain';
      // Parse min/max from English description: "Size range: min WxH, max WxH"
      const rangeMatch = c.description.match(/min\s+(\S+),\s*max\s+(\S+)/);
      if (rangeMatch) {
        valueMin = rangeMatch[1];
        valueMax = rangeMatch[2];
      } else {
        value = c.rule_text.substring(0, 200);
      }
    } else if (c.constraint_type === 'paper_condition') {
      // When paper weight >= threshold, enable coating option
      sourceField = 'paper_weight';
      operator = 'gte';
      targetField = 'coating';
      targetAction = 'enable';
      // Parse weight threshold from rule_text: "★종이두께선택시 : 180g이상 코팅가능"
      const weightMatch = c.rule_text.match(/(\d+)g/);
      value = weightMatch ? weightMatch[1] : c.rule_text.substring(0, 200);
    } else {
      sourceField = 'unknown';
      operator = 'eq';
      targetField = 'unknown';
      targetAction = 'apply';
      value = c.rule_text.substring(0, 200);
    }

    try {
      await db.insert(optionConstraints).values({
        productId,
        constraintType: c.constraint_type,
        sourceOptionId: null,
        sourceField,
        operator,
        value,
        valueMin,
        valueMax,
        targetOptionId: null,
        targetField,
        targetAction,
        description: c.description.substring(0, 500),
        priority: 0,
      });
      count++;
    } catch (err) {
      console.warn(`  Warning: Failed to insert constraint for ${c.product_code} (${c.constraint_type}): ${err}`);
    }
  }

  console.log(`  Seeded ${count} option constraints (${skipped} product codes not found)`);
}

// ============================================================

async function seedPaperProductMapping(): Promise<void> {
  console.log('Seeding HuniPaperProductMapping...');
  const paperData = loadJson<PaperData>(path.join(PRICING_DIR, 'paper.json'));

  // Build paper code -> id map
  const paperCodeToId = new Map<string, number>();
  const paperRows = await db.select({ id: papers.id, code: papers.code }).from(papers);
  for (const row of paperRows) {
    paperCodeToId.set(row.code, row.id);
  }

  // Build product name -> id map (products may share names across types)
  const productNameToId = new Map<string, number>();
  const productRows = await db.select({ id: products.id, name: products.name }).from(products);
  for (const row of productRows) {
    // Use first match for name (there may be duplicates)
    if (!productNameToId.has(row.name)) {
      productNameToId.set(row.name, row.id);
    }
  }

  // Also create a mapping from paper.json productColumns names to product names
  // These are display names that may differ from product.name in the DB
  // We'll match by checking if the product name contains the paper column name
  const columnNameToProductId = new Map<string, number>();
  for (const row of productRows) {
    // Store normalized name for fuzzy matching
    columnNameToProductId.set(row.name, row.id);
  }

  let totalMappings = 0;

  for (let i = 0; i < paperData.papers.length; i++) {
    const paper = paperData.papers[i];
    if (!paper.applicableProducts || paper.applicableProducts.length === 0) continue;

    // Reconstruct the code using the same logic as seedPapers()
    const code = paper.mesCode
      ? `PAPER_${paper.mesCode}`
      : `PAPER_${String(i + 1).padStart(3, '0')}`;

    const paperId = paperCodeToId.get(code);
    if (!paperId) continue;

    for (const applicableProductName of paper.applicableProducts) {
      // Try direct name match first
      let productId = productNameToId.get(applicableProductName);

      // Try partial match if direct fails
      if (!productId) {
        productNameToId.forEach((id, name) => {
          if (!productId && (name.includes(applicableProductName) || applicableProductName.includes(name))) {
            productId = id;
          }
        });
      }

      if (!productId) continue;

      // Determine coverType from applicable name
      let coverType: string | null = null;
      if (applicableProductName.includes('표지')) {
        coverType = 'cover';
      } else if (applicableProductName.includes('내지')) {
        coverType = 'inner';
      }

      try {
        await db
          .insert(paperProductMappings)
          .values({
            paperId,
            productId,
            coverType,
            isDefault: false,
            isActive: true,
          })
          .onConflictDoUpdate({
            target: [paperProductMappings.paperId, paperProductMappings.productId, paperProductMappings.coverType],
            set: {
              isActive: true,
            },
          });
        totalMappings++;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn(`  Warning: Failed to seed paper-product mapping "${paper.name}" -> "${applicableProductName}": ${errMsg}`);
      }
    }
  }

  console.log(`  Seeded ${totalMappings} paper-product mappings`);
}

// ============================================================
// Phase 9: Seed HuniProductEditorMapping
// ============================================================

async function seedProductEditorMapping(): Promise<void> {
  console.log('Seeding HuniProductEditorMapping...');
  const mesData = loadJson<MesData>(path.join(EXPORTS_DIR, 'MES_자재공정매핑_v5.json'));

  // Build product slug -> id map
  const productSlugToId = new Map<string, number>();
  const productRows = await db.select({ id: products.id, slug: products.slug }).from(products);
  for (const row of productRows) {
    productSlugToId.set(row.slug, row.id);
  }

  let count = 0;
  for (const product of mesData.products) {
    if (product.editor !== 'O') continue;

    const slug = product.MesItemCd.toLowerCase();
    const productId = productSlugToId.get(slug);
    if (!productId) continue;

    try {
      await db
        .insert(productEditorMappings)
        .values({
          productId,
          editorType: 'edicus',
          templateId: null,
          templateConfig: null,
          isActive: true,
        })
        .onConflictDoUpdate({
          target: productEditorMappings.productId,
          set: {
            editorType: 'edicus',
            isActive: true,
          },
        });
      count++;
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`  Warning: Failed to seed editor mapping for ${product.MesItemName}: ${errMsg}`);
    }
  }

  console.log(`  Seeded ${count} product editor mappings`);
}

// ============================================================
// Phase 10: Seed HuniFoilPrice (copper plate prices)
// ============================================================

async function seedFoilPrices(): Promise<void> {
  console.log('Seeding HuniFoilPrice...');
  const data = loadJson<FoilData>(path.join(PRICING_DIR, 'foil.json'));

  const rows: Array<{
    foilType: string;
    foilColor: string | null;
    plateMaterial: string | null;
    targetProductType: string | null;
    width: string;
    height: string;
    sellingPrice: string;
    costPrice: string | null;
    displayOrder: number;
    isActive: boolean;
  }> = [];

  let displayOrder = 0;

  // Seed copper plate prices (zinc plate cost by width x height)
  for (const row of data.copperPlate.data) {
    for (const [widthStr, price] of Object.entries(row.prices)) {
      rows.push({
        foilType: 'copper_plate',
        foilColor: null,
        plateMaterial: 'zinc',
        targetProductType: null,
        width: widthStr,
        height: String(row.height),
        sellingPrice: String(price),
        costPrice: null,
        displayOrder: displayOrder++,
        isActive: true,
      });
    }
  }

  // Delete + insert in transaction for atomicity (no unique constraint on this table)
  await db.transaction(async (tx) => {
    await tx.delete(foilPrices);
    if (rows.length > 0) {
      await tx.insert(foilPrices).values(rows);
    }
  });

  console.log(`  Seeded ${rows.length} foil prices`);
}

// ============================================================
// Phase 11: Seed HuniMesItemOption
// ============================================================

async function seedMesItemOptions(): Promise<void> {
  console.log('Seeding HuniMesItemOption...');
  const mesData = loadJson<MesData>(path.join(EXPORTS_DIR, 'MES_자재공정매핑_v5.json'));

  // Build mesItem itemCode -> id map
  const mesItemCodeToId = new Map<string, number>();
  const mesItemRows = await db.select({ id: mesItems.id, itemCode: mesItems.itemCode }).from(mesItems);
  for (const row of mesItemRows) {
    mesItemCodeToId.set(row.itemCode, row.id);
  }

  let count = 0;

  for (const product of mesData.products) {
    const mesItemId = mesItemCodeToId.get(product.MesItemCd);
    if (!mesItemId) continue;

    // Parse processOptions and settingOptions comma-separated strings
    const allOptions: string[] = [];
    if (product.processOptions) {
      allOptions.push(...product.processOptions.split(',').map((s) => s.trim()).filter(Boolean));
    }
    if (product.settingOptions) {
      allOptions.push(...product.settingOptions.split(',').map((s) => s.trim()).filter(Boolean));
    }

    for (let i = 0; i < allOptions.length; i++) {
      const optionNumber = i + 1;
      const optionValue = allOptions[i];

      try {
        await db
          .insert(mesItemOptions)
          .values({
            mesItemId,
            optionNumber,
            optionValue,
            isActive: true,
          })
          .onConflictDoUpdate({
            target: [mesItemOptions.mesItemId, mesItemOptions.optionNumber],
            set: {
              optionValue,
              isActive: true,
            },
          });
        count++;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn(`  Warning: Failed to seed MES item option for ${product.MesItemCd} #${optionNumber}: ${errMsg}`);
      }
    }
  }

  console.log(`  Seeded ${count} MES item options`);
}

// ============================================================
// Phase 12: Seed Fixed Prices (goods products)
// ============================================================

async function seedGoodsFixedPrices(): Promise<void> {
  console.log('Seeding fixed prices (goods)...');

  const goodsPricingPath = path.join(PRICING_DIR, 'products', 'goods.json');
  if (!fs.existsSync(goodsPricingPath)) {
    console.log('  Skipped: goods.json not found');
    return;
  }

  const goodsData = loadAndValidate(GoodsJsonSchema, goodsPricingPath);

  // Build product name -> id map
  const productNameToId = new Map<string, number>();
  const productRows = await db.select({ id: products.id, name: products.name }).from(products);
  for (const row of productRows) {
    if (!productNameToId.has(row.name)) {
      productNameToId.set(row.name, row.id);
    }
  }

  const fixedPriceRows: Array<{
    productId: number;
    sizeId: number | null;
    paperId: number | null;
    materialId: number | null;
    printModeId: number | null;
    optionLabel: string | null;
    baseQty: number;
    sellingPrice: string;
    costPrice: string | null;
    vatIncluded: boolean;
    isActive: boolean;
  }> = [];

  let skippedZeroPrice = 0;

  for (const item of goodsData.data) {
    if (item.sellingPrice === 0) {
      console.warn(`  Warning: skipping "${item.productName}" (sellingPrice=0)`);
      skippedZeroPrice++;
      continue;
    }

    const productId = productNameToId.get(item.productName);
    if (!productId) continue;

    const optionLabel = [item.productOption, item.selectOption].filter(Boolean).join(' / ') || null;

    fixedPriceRows.push({
      productId,
      sizeId: null,
      paperId: null,
      materialId: null,
      printModeId: null,
      optionLabel,
      baseQty: 1,
      sellingPrice: String(item.sellingPrice),
      costPrice: item.cost ? String(item.cost) : null,
      vatIncluded: false,
      isActive: true,
    });
  }

  if (skippedZeroPrice > 0) {
    console.warn(`  Skipped ${skippedZeroPrice} items with sellingPrice=0`);
  }

  // Delete + insert in transaction for atomicity (no unique constraint)
  await db.transaction(async (tx) => {
    await tx.delete(fixedPrices);
    for (let i = 0; i < fixedPriceRows.length; i += 500) {
      const batch = fixedPriceRows.slice(i, i + 500);
      await tx.insert(fixedPrices).values(batch);
    }
  });

  console.log(`  Seeded ${fixedPriceRows.length} goods fixed prices`);
}

// ============================================================
// Phase 13: Seed Fixed Prices (business card products)
// ============================================================

async function seedBusinessCardFixedPrices(): Promise<void> {
  console.log('Seeding fixed prices (business card)...');

  const bcPricingPath = path.join(PRICING_DIR, 'products', 'business-card.json');
  if (!fs.existsSync(bcPricingPath)) {
    console.log('  Skipped: business-card.json not found');
    return;
  }

  const bcData = loadJson<BusinessCardData>(bcPricingPath);

  // Build product name -> id map
  const productNameToId = new Map<string, number>();
  const productRows = await db.select({ id: products.id, name: products.name }).from(products);
  for (const row of productRows) {
    if (!productNameToId.has(row.name)) {
      productNameToId.set(row.name, row.id);
    }
  }

  // Build paper name -> id map
  const paperNameToId = new Map<string, number>();
  const paperRows = await db.select({ id: papers.id, name: papers.name }).from(papers);
  for (const row of paperRows) {
    paperNameToId.set(row.name, row.id);
  }

  // Build printMode label -> id map for single/double side
  const printModeCodeToId = new Map<number, number>();
  const printModeRows = await db.select({ id: printModes.id, priceCode: printModes.priceCode }).from(printModes);
  for (const row of printModeRows) {
    printModeCodeToId.set(row.priceCode, row.id);
  }

  const fixedPriceRows: Array<{
    productId: number;
    sizeId: number | null;
    paperId: number | null;
    materialId: number | null;
    printModeId: number | null;
    optionLabel: string | null;
    baseQty: number;
    sellingPrice: string;
    costPrice: string | null;
    vatIncluded: boolean;
    isActive: boolean;
  }> = [];

  for (const item of bcData.data) {
    const productId = productNameToId.get(item.productName);
    if (!productId) continue;

    const paperId = paperNameToId.get(item.paper) ?? null;
    // Single-side price (code 4)
    const singlePrintModeId = printModeCodeToId.get(4) ?? null;
    // Double-side price (code 8)
    const doublePrintModeId = printModeCodeToId.get(8) ?? null;

    // Add single-side price entry (skip if price is null/undefined)
    if (item.singleSidePrice != null) {
      fixedPriceRows.push({
        productId,
        sizeId: null,
        paperId,
        materialId: null,
        printModeId: singlePrintModeId,
        optionLabel: `${item.paper} / 단면`,
        baseQty: item.baseQty,
        sellingPrice: String(item.singleSidePrice),
        costPrice: null,
        vatIncluded: false,
        isActive: true,
      });
    }

    // Add double-side price entry (skip if price is null/undefined)
    if (item.doubleSidePrice != null) {
      fixedPriceRows.push({
        productId,
        sizeId: null,
        paperId,
        materialId: null,
        printModeId: doublePrintModeId,
        optionLabel: `${item.paper} / 양면`,
        baseQty: item.baseQty,
        sellingPrice: String(item.doubleSidePrice),
        costPrice: null,
        vatIncluded: false,
        isActive: true,
      });
    }
  }

  // Bulk insert in batches of 500
  for (let i = 0; i < fixedPriceRows.length; i += 500) {
    const batch = fixedPriceRows.slice(i, i + 500);
    await db.insert(fixedPrices).values(batch);
  }

  console.log(`  Seeded ${fixedPriceRows.length} business card fixed prices`);
}

// ============================================================
// Phase 14: Seed Acrylic Size Pricing Grid
// ============================================================

async function seedAcrylicFixedPrices(): Promise<void> {
  console.log('Seeding fixed prices (acrylic)...');

  const acrylicPricingPath = path.join(PRICING_DIR, 'products', 'acrylic.json');
  if (!fs.existsSync(acrylicPricingPath)) {
    console.log('  Skipped: acrylic.json not found');
    return;
  }

  const acrylicData = loadJson<AcrylicData>(acrylicPricingPath);
  const grid = acrylicData.subTables.customSizeGrid;

  // Find acrylic product IDs (products with type = acrylic)
  const acrylicProducts = await db.select({ id: products.id, name: products.name, pricingModel: products.pricingModel }).from(products);
  const acrylicProductIds = acrylicProducts
    .filter((p) => p.pricingModel === 'fixed_per_unit')
    .map((p) => p.id);

  if (acrylicProductIds.length === 0) {
    console.log('  Skipped: no acrylic products found in DB');
    return;
  }

  // Use the first acrylic product as the reference for the size grid pricing
  // (Acrylic size grid is shared across all acrylic products)
  const fixedPriceRows: Array<{
    productId: number;
    sizeId: number | null;
    paperId: number | null;
    materialId: number | null;
    printModeId: number | null;
    optionLabel: string;
    baseQty: number;
    sellingPrice: string;
    costPrice: string | null;
    vatIncluded: boolean;
    isActive: boolean;
  }> = [];

  for (const productId of acrylicProductIds) {
    for (const row of grid.data) {
      for (const [widthStr, price] of Object.entries(row.prices)) {
        fixedPriceRows.push({
          productId,
          sizeId: null,
          paperId: null,
          materialId: null,
          printModeId: null,
          optionLabel: `${widthStr}x${row.height}mm`,
          baseQty: 1,
          sellingPrice: String(price),
          costPrice: null,
          vatIncluded: false,
          isActive: true,
        });
      }
    }
  }

  // Bulk insert in batches of 500
  for (let i = 0; i < fixedPriceRows.length; i += 500) {
    const batch = fixedPriceRows.slice(i, i + 500);
    await db.insert(fixedPrices).values(batch);
  }

  console.log(`  Seeded ${fixedPriceRows.length} acrylic fixed prices`);
}

// ============================================================
// Main entry point
// ============================================================

async function main() {
  console.log('='.repeat(60));
  console.log('Seeding SPEC-DATA-002 normalized Huni* data (Drizzle)...');
  console.log(`Data version: ${currentVersion} (from ${DATA_DIR})`);
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

    // Build product slug -> id map for subsequent phases
    const productSlugToId = new Map<string, number>();
    const productRows = await db.select({ id: products.id, slug: products.slug }).from(products);
    for (const row of productRows) {
      productSlugToId.set(row.slug, row.id);
    }

    // Phase 4: Materials (non-paper)
    const materialNameToId = await seedMaterials();

    // Phase 5: Option definitions
    const optionKeyToId = await seedOptionDefinitions();

    // Phase 6: Product sizes
    await seedProductSizes(productSlugToId);

    // Phase 7: Option choices + Product options
    await seedOptionChoicesAndProductOptions(optionKeyToId, productSlugToId, materialNameToId);

    // Phase 7.5: Option constraints (size visibility rules, custom size ranges, paper conditions)
    await seedOptionConstraints(productSlugToId);

    // Phase 8: Paper-product mapping
    await seedPaperProductMapping();

    // Phase 9: Product editor mapping
    await seedProductEditorMapping();

    // Phase 10: Foil prices
    await seedFoilPrices();

    // Phase 11: MES item options
    await seedMesItemOptions();

    // Phase 12: Goods fixed prices
    await seedGoodsFixedPrices();

    // Phase 13: Business card fixed prices
    await seedBusinessCardFixedPrices();

    // Phase 14: Acrylic fixed prices
    await seedAcrylicFixedPrices();

    console.log('='.repeat(60));
    console.log('SPEC-DATA-002 seed complete (all phases)!');
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
