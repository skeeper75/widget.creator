import type {
  Paper, PrintMode, PostProcess, Binding, SizeSelection,
  ImpositionRule, LossQuantityConfig, FixedPriceRecord,
  PackagePriceRecord, FoilPriceRecord, PricingLookupData,
} from '../../src/pricing/types.js';

// === Papers ===

export const PAPER_ART_250: Paper = {
  id: 1,
  name: 'Art Paper 250g',
  weight: 250,
  costPer4Cut: 180,
  sellingPer4Cut: 240,
};

export const PAPER_ART_300: Paper = {
  id: 2,
  name: 'Art Paper 300g',
  weight: 300,
  costPer4Cut: 220,
  sellingPer4Cut: 300,
};

export const PAPER_SNOW_120: Paper = {
  id: 3,
  name: 'Snow Paper 120g',
  weight: 120,
  costPer4Cut: 100,
  sellingPer4Cut: 140,
};

export const PAPER_LINEN_200: Paper = {
  id: 4,
  name: 'Linen Paper 200g',
  weight: 200,
  costPer4Cut: 250,
  sellingPer4Cut: 350,
};

// === Print Modes ===

export const PRINT_MODE_DOUBLE_COLOR: PrintMode = {
  id: 1,
  name: 'Double-sided Color',
  priceCode: '8',
  sides: 'double',
  colorType: 'full_color',
};

export const PRINT_MODE_SINGLE_COLOR: PrintMode = {
  id: 2,
  name: 'Single-sided Color',
  priceCode: '4',
  sides: 'single',
  colorType: 'full_color',
};

// === Post Processes ===

export const POST_PROCESS_ROUND_CUT: PostProcess = {
  id: 1,
  name: 'Round Cut',
  groupCode: 'cutting',
  processType: 'round_cut',
  priceCode: 'round_cut',
  priceBasis: 'per_sheet',
  sheetStandard: 'A3',
};

export const POST_PROCESS_LAMINATION: PostProcess = {
  id: 2,
  name: 'Lamination',
  groupCode: 'lamination',
  processType: 'matt_lamination',
  priceCode: 'lamination',
  priceBasis: 'per_unit',
  sheetStandard: null,
};

// === Bindings ===

export const BINDING_SADDLE_STITCH: Binding = {
  id: 1,
  name: 'Saddle Stitch',
  priceCode: 'saddle_stitch',
  minPages: 4,
  maxPages: 64,
  pageStep: 4,
};

export const BINDING_PERFECT: Binding = {
  id: 2,
  name: 'Perfect Binding',
  priceCode: 'perfect_binding',
  minPages: 16,
  maxPages: 1000,
  pageStep: 2,
};

// === Size Selections ===

export const SIZE_100X150: SizeSelection = {
  sizeId: 1,
  cutWidth: 100,
  cutHeight: 150,
  impositionCount: 8,
  isCustom: false,
};

export const SIZE_92X57: SizeSelection = {
  sizeId: 2,
  cutWidth: 92,
  cutHeight: 57,
  impositionCount: 16,
  isCustom: false,
};

export const SIZE_50X50: SizeSelection = {
  sizeId: 3,
  cutWidth: 50,
  cutHeight: 50,
  impositionCount: null,
  isCustom: false,
};

export const SIZE_A3: SizeSelection = {
  sizeId: 4,
  cutWidth: 297,
  cutHeight: 420,
  impositionCount: 1,
  isCustom: false,
};

export const SIZE_A5: SizeSelection = {
  sizeId: 5,
  cutWidth: 148,
  cutHeight: 210,
  impositionCount: 4,
  isCustom: false,
};

export const SIZE_CUSTOM: SizeSelection = {
  sizeId: 99,
  cutWidth: 0,
  cutHeight: 0,
  impositionCount: null,
  isCustom: true,
  customWidth: 200,
  customHeight: 300,
};

// === Imposition Rules ===

export const MOCK_IMPOSITION_RULES: ImpositionRule[] = [
  { cutWidth: 100, cutHeight: 150, sheetStandard: 'A3', impositionCount: 8 },
  { cutWidth: 92, cutHeight: 57, sheetStandard: 'A3', impositionCount: 16 },
  { cutWidth: 50, cutHeight: 50, sheetStandard: 'A3', impositionCount: 24 },
  { cutWidth: 148, cutHeight: 210, sheetStandard: 'A3', impositionCount: 4 },
  { cutWidth: 297, cutHeight: 420, sheetStandard: 'A3', impositionCount: 1 },
  { cutWidth: 100, cutHeight: 150, sheetStandard: 'T3', impositionCount: 12 },
];

// === Loss Quantity Configs ===

export const MOCK_LOSS_CONFIGS: LossQuantityConfig[] = [
  { scopeType: 'product', scopeId: 10, lossRate: 0.05, minLossQty: 20 },
  { scopeType: 'category', scopeId: 1, lossRate: 0.04, minLossQty: 15 },
  { scopeType: 'global', scopeId: null, lossRate: 0.03, minLossQty: 10 },
];

// === Fixed Prices ===

export const MOCK_FIXED_PRICES: FixedPriceRecord[] = [
  // Premium business card (product 20)
  { productId: 20, sizeId: 2, paperId: 1, printModeId: 1, sellingPrice: 15000, costPrice: 10000, baseQty: 100 },
  { productId: 20, sizeId: 2, paperId: 2, printModeId: 1, sellingPrice: 18000, costPrice: 12000, baseQty: 100 },
  // Art print poster (product 30)
  { productId: 30, sizeId: 4, paperId: null, printModeId: null, sellingPrice: 5000, costPrice: 3000, baseQty: 1 },
  // Acrylic keyring (product 100)
  { productId: 100, sizeId: 3, paperId: null, printModeId: null, sellingPrice: 3260, costPrice: 2000, baseQty: 1 },
];

// === Package Prices ===

export const MOCK_PACKAGE_PRICES: PackagePriceRecord[] = [
  // Postcard book (product 40), size 1, printMode 1, 24 pages
  { productId: 40, sizeId: 1, printModeId: 1, pageCount: 24, minQty: 1, maxQty: 29, sellingPrice: 25000 },
  { productId: 40, sizeId: 1, printModeId: 1, pageCount: 24, minQty: 30, maxQty: 99, sellingPrice: 20000 },
  { productId: 40, sizeId: 1, printModeId: 1, pageCount: 24, minQty: 100, maxQty: 999999, sellingPrice: 15000 },
];

// === Foil Prices ===

export const MOCK_FOIL_PRICES: FoilPriceRecord[] = [
  { foilType: 'gold', width: 50, height: 50, sellingPrice: 3000 },
  { foilType: 'silver', width: 50, height: 50, sellingPrice: 2500 },
  { foilType: 'gold', width: 100, height: 100, sellingPrice: 5000 },
];

// === Complete Lookup Data ===

import { MOCK_PRICE_TIERS } from './price-tiers.js';

export function createMockLookupData(overrides?: Partial<PricingLookupData>): PricingLookupData {
  return {
    priceTiers: MOCK_PRICE_TIERS,
    fixedPrices: MOCK_FIXED_PRICES,
    packagePrices: MOCK_PACKAGE_PRICES,
    foilPrices: MOCK_FOIL_PRICES,
    impositionRules: MOCK_IMPOSITION_RULES,
    lossConfigs: MOCK_LOSS_CONFIGS,
    papers: [PAPER_ART_250, PAPER_ART_300, PAPER_SNOW_120, PAPER_LINEN_200],
    printModes: [PRINT_MODE_DOUBLE_COLOR, PRINT_MODE_SINGLE_COLOR],
    postProcesses: [POST_PROCESS_ROUND_CUT, POST_PROCESS_LAMINATION],
    bindings: [BINDING_SADDLE_STITCH, BINDING_PERFECT],
    ...overrides,
  };
}
