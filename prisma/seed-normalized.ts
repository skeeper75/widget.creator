/**
 * SPEC-DATA-002 Normalized Seed Script
 *
 * Seeds all Huni* models from JSON data files:
 * - HuniCategory (12 categories from MES v5)
 * - HuniImpositionRule (imposition lookup table)
 * - HuniPrintMode (digital print types)
 * - HuniPostProcess (finishing types and options)
 * - HuniBinding (binding types)
 * - HuniPaper (paper specifications)
 * - HuniLossQuantityConfig (global defaults)
 * - HuniProduct + HuniMesItem + HuniProductMesMapping (products & MES)
 * - HuniPriceTable + HuniPriceTier (pricing data)
 *
 * Usage: npx tsx prisma/seed-normalized.ts
 */
import { PrismaClient } from "@prisma/client";
import * as fs from "node:fs";
import * as path from "node:path";

const prisma = new PrismaClient();

// ============================================================
// Data file paths
// ============================================================

const DATA_DIR = path.resolve(__dirname, "../data");
const PRICING_DIR = path.join(DATA_DIR, "pricing");
const EXPORTS_DIR = path.join(DATA_DIR, "exports");

function loadJson<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, "utf-8");
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
    "digital-print": "formula",
    "sticker": "formula_cutting",
    "booklet": "component",
    "large-format": "fixed_size",
    "acrylic": "fixed_per_unit",
    "goods": "fixed_per_unit",
    "stationery": "fixed_per_unit",
  };
  return map[productType] ?? "fixed_unit";
}

function deriveOrderMethod(editor: string | null, materialOptions: string | null): string {
  if (editor === "O") return "editor";
  if (materialOptions?.includes("소재")) return "upload";
  return "upload";
}

function parseSizeSpec(sizeStr: string): { w: number; h: number } | null {
  // Handles "73*98", "100*150(2단)", "600*150", etc.
  const base = sizeStr.split("(")[0]; // Strip annotation like "(2단)"
  const parts = base.split("*");
  if (parts.length !== 2) return null;
  const w = parseFloat(parts[0].trim());
  const h = parseFloat(parts[1].trim());
  if (isNaN(w) || isNaN(h)) return null;
  return { w, h };
}

function makeCutSizeCode(trimSize: string): string {
  // "73*98" -> "CUT_73X98", "100*150(2단)" -> "CUT_100X150_2DAN"
  return (
    "CUT_" +
    trimSize
      .replace(/\*/g, "X")
      .replace(/\(([^)]+)\)/g, (_, inner: string) => "_" + inner.replace(/\s+/g, ""))
      .replace(/[^A-Z0-9_]/gi, "")
      .toUpperCase()
  );
}

function mapPrintModeDetails(code: number): { sides: string; colorType: string } {
  const map: Record<number, { sides: string; colorType: string }> = {
    0: { sides: "none", colorType: "none" },
    1: { sides: "single", colorType: "mono" },
    2: { sides: "double", colorType: "mono" },
    4: { sides: "single", colorType: "color" },
    8: { sides: "double", colorType: "color" },
    11: { sides: "single", colorType: "white" },
    12: { sides: "double", colorType: "white" },
    21: { sides: "single", colorType: "clear" },
    22: { sides: "double", colorType: "clear" },
    31: { sides: "single", colorType: "pink" },
    32: { sides: "double", colorType: "pink" },
  };
  return map[code] ?? { sides: "single", colorType: "color" };
}

function makePrintModeCode(label: string, code: number): string {
  // Generate code from label
  const codeMap: Record<number, string> = {
    0: "PRINT_NONE",
    1: "PRINT_SINGLE_MONO",
    2: "PRINT_DOUBLE_MONO",
    4: "PRINT_SINGLE_COLOR",
    8: "PRINT_DOUBLE_COLOR",
    11: "PRINT_SINGLE_WHITE",
    12: "PRINT_DOUBLE_WHITE",
    21: "PRINT_SINGLE_CLEAR",
    22: "PRINT_DOUBLE_CLEAR",
    31: "PRINT_SINGLE_PINK",
    32: "PRINT_DOUBLE_PINK",
  };
  return codeMap[code] ?? `PRINT_${label.replace(/\s+/g, "_").toUpperCase()}`;
}

// Finishing type to group code and process type mapping
const FINISHING_CONFIG: Record<
  string,
  { groupCode: string; processType: string; priceBasis: string; sheetStandard?: string }
> = {
  perforation: { groupCode: "PP001", processType: "perforation", priceBasis: "per_unit" },
  scoring: { groupCode: "PP002", processType: "creasing", priceBasis: "per_unit" },
  folding: { groupCode: "PP003", processType: "folding", priceBasis: "per_unit" },
  variableText: { groupCode: "PP004", processType: "vdp_text", priceBasis: "per_unit" },
  variableImage: { groupCode: "PP005", processType: "vdp_image", priceBasis: "per_unit" },
  cornerRounding: { groupCode: "PP006", processType: "corner", priceBasis: "per_unit" },
  lamination: { groupCode: "PP007", processType: "coating", priceBasis: "per_sheet" },
  lamination3Section: {
    groupCode: "PP008",
    processType: "coating",
    priceBasis: "per_sheet",
    sheetStandard: "T3",
  },
};

// Binding code map
const BINDING_CODE_MAP: Record<string, string> = {
  "중철제본": "BIND_SADDLE_STITCH",
  "무선제본": "BIND_PERFECT",
  "트윈링제본": "BIND_TWIN_RING",
  "PUR제본": "BIND_PUR",
};

// ============================================================
// Phase 1a: Seed HuniCategory
// ============================================================

async function seedCategories(): Promise<Map<string, number>> {
  console.log("Seeding HuniCategory...");
  const mesData = loadJson<MesData>(path.join(EXPORTS_DIR, "MES_자재공정매핑_v5.json"));
  const categoryMap = new Map<string, number>(); // categoryCode -> id

  for (let i = 0; i < mesData.categories.length; i++) {
    const cat = mesData.categories[i];
    const code = "CAT_" + cat.slug.toUpperCase().replace(/-/g, "_");

    const created = await prisma.huniCategory.upsert({
      where: { code },
      create: {
        code,
        name: cat.categoryName,
        parentId: null,
        depth: 0,
        displayOrder: i,
        isActive: true,
      },
      update: {
        name: cat.categoryName,
        displayOrder: i,
      },
    });

    categoryMap.set(cat.categoryCode, created.id);
  }

  console.log(`  Seeded ${categoryMap.size} categories`);
  return categoryMap;
}

// ============================================================
// Phase 1b: Seed HuniImpositionRule
// ============================================================

async function seedImpositionRules(): Promise<void> {
  console.log("Seeding HuniImpositionRule...");
  const data = loadJson<ImpositionData>(path.join(PRICING_DIR, "imposition.json"));

  let count = 0;
  for (const row of data.lookupTable) {
    // Skip rows with null imposition or null workSize
    if (row.imposition === null || row.workSize === null) continue;

    const cutDims = parseSizeSpec(row.trimSize);
    const workDims = parseSizeSpec(row.workSize);

    if (!cutDims || !workDims) continue;

    // Normalize sheetStandard: map "A4" -> "A4", "3절" -> "T3", others -> as-is
    let sheetStandard = row.basePaper;
    if (sheetStandard === "3절") sheetStandard = "T3";

    const cutSizeCode = makeCutSizeCode(row.trimSize);

    try {
      await prisma.huniImpositionRule.upsert({
        where: {
          cutWidth_cutHeight_sheetStandard: {
            cutWidth: cutDims.w,
            cutHeight: cutDims.h,
            sheetStandard,
          },
        },
        create: {
          cutSizeCode,
          cutWidth: cutDims.w,
          cutHeight: cutDims.h,
          workWidth: workDims.w,
          workHeight: workDims.h,
          impositionCount: row.imposition,
          sheetStandard,
          description: row.note ?? undefined,
          isActive: true,
        },
        update: {
          cutSizeCode,
          workWidth: workDims.w,
          workHeight: workDims.h,
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
  console.log("Seeding HuniPrintMode...");
  const data = loadJson<DigitalPrintData>(path.join(PRICING_DIR, "digital-print.json"));
  const printModeCodeMap = new Map<number, string>(); // priceCode -> code string

  for (let i = 0; i < data.printTypes.length; i++) {
    const pt = data.printTypes[i];
    const code = makePrintModeCode(pt.label, pt.code);
    const { sides, colorType } = mapPrintModeDetails(pt.code);

    await prisma.huniPrintMode.upsert({
      where: { code },
      create: {
        code,
        name: pt.label,
        sides,
        colorType,
        priceCode: pt.code,
        displayOrder: i,
        isActive: true,
      },
      update: {
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
  console.log("Seeding HuniPostProcess...");
  const data = loadJson<FinishingData>(path.join(PRICING_DIR, "finishing.json"));

  let count = 0;
  let displayOrder = 0;

  for (const [key, finishingType] of Object.entries(data.finishingTypes)) {
    const config = FINISHING_CONFIG[key];
    if (!config) {
      console.warn(`  Warning: No config for finishing type "${key}", skipping`);
      continue;
    }

    // Create one record per option (including "없음" option code 0)
    for (const option of finishingType.options) {
      const cleanLabel = option.label
        .replace(/\s+/g, "_")
        .replace(/[()*/]/g, "")
        .toUpperCase();
      const code = `PP_${config.groupCode}_${cleanLabel}`;

      await prisma.huniPostProcess.upsert({
        where: { code },
        create: {
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
        },
        update: {
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
  console.log("Seeding HuniBinding...");
  const data = loadJson<BindingData>(path.join(PRICING_DIR, "binding.json"));

  for (let i = 0; i < data.bindingTypes.length; i++) {
    const bt = data.bindingTypes[i];
    const code = BINDING_CODE_MAP[bt.name] ?? `BIND_${bt.name.replace(/\s+/g, "_").toUpperCase()}`;

    await prisma.huniBinding.upsert({
      where: { code },
      create: {
        code,
        name: bt.name,
        displayOrder: i,
        isActive: true,
      },
      update: {
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
  console.log("Seeding HuniPaper...");
  const data = loadJson<PaperData>(path.join(PRICING_DIR, "paper.json"));

  // Track codes to handle duplicates (same mesCode used for different colored variants)
  const seenCodes = new Set<string>();
  let count = 0;

  for (let i = 0; i < data.papers.length; i++) {
    const paper = data.papers[i];
    // Use mesCode as the unique identifier, prefixed
    let baseCode = "PAPER_" + paper.mesCode;

    // Handle duplicate codes by appending index
    let code = baseCode;
    let suffix = 1;
    while (seenCodes.has(code)) {
      code = `${baseCode}_${suffix++}`;
    }
    seenCodes.add(code);

    await prisma.huniPaper.upsert({
      where: { code },
      create: {
        code,
        name: paper.name,
        weight: paper.weight ?? null,
        sheetSize: paper.paperSize ?? null,
        costPer4Cut: paper.pricePerSheet > 0 ? paper.pricePerSheet : null,
        sellingPer4Cut: null, // Not available in source data
        displayOrder: i,
        isActive: true,
      },
      update: {
        name: paper.name,
        weight: paper.weight ?? null,
        sheetSize: paper.paperSize ?? null,
        costPer4Cut: paper.pricePerSheet > 0 ? paper.pricePerSheet : null,
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
  console.log("Seeding HuniLossQuantityConfig...");

  await prisma.huniLossQuantityConfig.upsert({
    where: {
      scopeType_scopeId: {
        scopeType: "global",
        scopeId: null,
      },
    },
    create: {
      scopeType: "global",
      scopeId: null,
      lossRate: 0.03,
      minLossQty: 10,
      description: "Global default loss rate 3% with minimum 10 units",
      isActive: true,
    },
    update: {
      lossRate: 0.03,
      minLossQty: 10,
    },
  });

  console.log("  Seeded 1 loss quantity config (global default)");
}

// ============================================================
// Phase 2: Seed HuniProduct + HuniMesItem + HuniProductMesMapping
// ============================================================

async function seedProductsAndMes(categoryMap: Map<string, number>): Promise<void> {
  console.log("Seeding HuniProduct, HuniMesItem, HuniProductMesMapping...");
  const data = loadJson<MesData>(path.join(EXPORTS_DIR, "MES_자재공정매핑_v5.json"));

  let productCount = 0;
  let mesItemCount = 0;
  let mappingCount = 0;

  // Sequential ID for products without shopbyId
  let sequentialId = 90001;

  for (const product of data.products) {
    const categoryId = categoryMap.get(product.categoryCode);
    if (!categoryId) {
      console.warn(`  Warning: No category found for code "${product.categoryCode}", skipping ${product.MesItemName}`);
      continue;
    }

    // Determine huniCode and edicusCode
    const huniCode = product.shopbyId
      ? String(product.shopbyId)
      : String(sequentialId++);

    const edicusCode = product.shopbyId ? `HU_${huniCode}` : null;

    // Generate slug from MesItemName
    const slug = product.MesItemName
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]/g, "")
      .replace(/--+/g, "-");

    const pricingModel = derivePricingModel(product.productType);
    const orderMethod = deriveOrderMethod(product.editor, product.materialOptions);
    const editorEnabled = product.editor === "O";

    try {
      // Upsert HuniProduct
      const createdProduct = await prisma.huniProduct.upsert({
        where: { huniCode },
        create: {
          categoryId,
          huniCode,
          edicusCode,
          shopbyId: product.shopbyId ?? null,
          name: product.productName,
          slug,
          productType: product.productType,
          pricingModel,
          figmaSection: product.figmaSection ?? null,
          orderMethod,
          editorEnabled,
          mesRegistered: product.shopbyId !== null,
          isActive: true,
        },
        update: {
          categoryId,
          name: product.productName,
          productType: product.productType,
          pricingModel,
          figmaSection: product.figmaSection ?? null,
          orderMethod,
          editorEnabled,
          mesRegistered: product.shopbyId !== null,
        },
      });
      productCount++;

      // Upsert HuniMesItem
      const mesItem = await prisma.huniMesItem.upsert({
        where: { itemCode: product.MesItemCd },
        create: {
          itemCode: product.MesItemCd,
          groupCode: product.categoryCode,
          name: product.MesItemName,
          itemType: "finished",
          unit: "EA",
          isActive: true,
        },
        update: {
          name: product.MesItemName,
          groupCode: product.categoryCode,
        },
      });
      mesItemCount++;

      // Upsert HuniProductMesMapping
      await prisma.huniProductMesMapping.upsert({
        where: {
          productId_mesItemId_coverType: {
            productId: createdProduct.id,
            mesItemId: mesItem.id,
            coverType: null,
          },
        },
        create: {
          productId: createdProduct.id,
          mesItemId: mesItem.id,
          coverType: null,
          isActive: true,
        },
        update: {
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
  console.log("Seeding digital print price table...");
  const data = loadJson<DigitalPrintData>(path.join(PRICING_DIR, "digital-print.json"));

  // Create the price table header
  const priceTable = await prisma.huniPriceTable.upsert({
    where: { code: "PT_OUTPUT_SELL_A3" },
    create: {
      code: "PT_OUTPUT_SELL_A3",
      name: "디지털출력비 판매가 A3",
      priceType: "selling",
      quantityBasis: "sheet_count",
      sheetStandard: "A3",
      description: "Digital print selling price per sheet (A3 basis)",
      isActive: true,
    },
    update: {
      name: "디지털출력비 판매가 A3",
    },
  });

  // Parse price tiers
  const qtys = Object.keys(data.priceTable)
    .map(Number)
    .sort((a, b) => a - b);

  // Delete existing tiers for this table to re-seed cleanly
  await prisma.huniPriceTier.deleteMany({
    where: { priceTableId: priceTable.id },
  });

  let tierCount = 0;
  const tiersToCreate: Array<{
    priceTableId: number;
    optionCode: string;
    minQty: number;
    maxQty: number;
    unitPrice: number;
    isActive: boolean;
  }> = [];

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
        unitPrice,
        isActive: true,
      });
      tierCount++;
    }
  }

  // Bulk insert
  if (tiersToCreate.length > 0) {
    await prisma.huniPriceTier.createMany({
      data: tiersToCreate,
      skipDuplicates: true,
    });
  }

  console.log(`  Seeded price table PT_OUTPUT_SELL_A3 with ${tierCount} tiers`);
}

// Phase 3k: Post-process price tables
async function seedPostProcessPricing(): Promise<void> {
  console.log("Seeding post-process price tables...");
  const data = loadJson<FinishingData>(path.join(PRICING_DIR, "finishing.json"));

  let tableCount = 0;
  let totalTiers = 0;

  for (const [key, finishingType] of Object.entries(data.finishingTypes)) {
    const config = FINISHING_CONFIG[key];
    if (!config) continue;

    const tableCode = `PT_${config.groupCode}_SELL`;
    const tableName = `${finishingType.name} 판매가`;

    const priceTable = await prisma.huniPriceTable.upsert({
      where: { code: tableCode },
      create: {
        code: tableCode,
        name: tableName,
        priceType: "selling",
        quantityBasis: config.priceBasis === "per_sheet" ? "sheet_count" : "unit_count",
        sheetStandard: config.sheetStandard ?? null,
        description: finishingType.description,
        isActive: true,
      },
      update: {
        name: tableName,
      },
    });
    tableCount++;

    // Delete existing tiers
    await prisma.huniPriceTier.deleteMany({
      where: { priceTableId: priceTable.id },
    });

    const qtys = Object.keys(finishingType.priceTable)
      .map(Number)
      .sort((a, b) => a - b);

    const tiersToCreate: Array<{
      priceTableId: number;
      optionCode: string;
      minQty: number;
      maxQty: number;
      unitPrice: number;
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
          .replace(/\s+/g, "_")
          .replace(/[()*/]/g, "")
          .toUpperCase();
        const optionCode = `PP_${config.groupCode}_${cleanLabel}`;

        tiersToCreate.push({
          priceTableId: priceTable.id,
          optionCode,
          minQty: qty,
          maxQty,
          unitPrice,
          isActive: true,
        });
        totalTiers++;
      }
    }

    if (tiersToCreate.length > 0) {
      await prisma.huniPriceTier.createMany({
        data: tiersToCreate,
        skipDuplicates: true,
      });
    }
  }

  console.log(`  Seeded ${tableCount} post-process price tables with ${totalTiers} total tiers`);
}

// Phase 3l: Binding price table
async function seedBindingPricing(): Promise<void> {
  console.log("Seeding binding price table...");
  const data = loadJson<BindingData>(path.join(PRICING_DIR, "binding.json"));

  const priceTable = await prisma.huniPriceTable.upsert({
    where: { code: "PT_BINDING_SELL" },
    create: {
      code: "PT_BINDING_SELL",
      name: "제본비 판매가",
      priceType: "selling",
      quantityBasis: "unit_count",
      sheetStandard: null,
      description: "Binding selling price per unit",
      isActive: true,
    },
    update: {
      name: "제본비 판매가",
    },
  });

  // Delete existing tiers
  await prisma.huniPriceTier.deleteMany({
    where: { priceTableId: priceTable.id },
  });

  const qtys = Object.keys(data.priceTable)
    .map(Number)
    .sort((a, b) => a - b);

  const tiersToCreate: Array<{
    priceTableId: number;
    optionCode: string;
    minQty: number;
    maxQty: number;
    unitPrice: number;
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
        ? (BINDING_CODE_MAP[bindingType.name] ?? `BIND_${bindingType.name.replace(/\s+/g, "_").toUpperCase()}`)
        : `BIND_${bindingCodeStr}`;

      tiersToCreate.push({
        priceTableId: priceTable.id,
        optionCode,
        minQty: qty,
        maxQty,
        unitPrice,
        isActive: true,
      });
      tierCount++;
    }
  }

  if (tiersToCreate.length > 0) {
    await prisma.huniPriceTier.createMany({
      data: tiersToCreate,
      skipDuplicates: true,
    });
  }

  console.log(`  Seeded price table PT_BINDING_SELL with ${tierCount} tiers`);
}

// ============================================================
// Main entry point
// ============================================================

async function main() {
  console.log("=".repeat(60));
  console.log("Seeding SPEC-DATA-002 normalized Huni* data...");
  console.log("=".repeat(60));

  try {
    // Phase 1: Basic master data (order matters)
    const categoryMap = await seedCategories();
    await seedImpositionRules();
    const printModeCodeMap = await seedPrintModes();
    await seedPostProcesses();
    await seedBindings();
    await seedPapers();
    await seedLossQuantityConfig();

    // Phase 2: Products and MES
    await seedProductsAndMes(categoryMap);

    // Phase 3: Pricing data
    await seedPricingData(printModeCodeMap);

    console.log("=".repeat(60));
    console.log("SPEC-DATA-002 seed complete!");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("Seed failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run
main();
