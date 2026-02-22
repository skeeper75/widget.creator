import type { PriceTier } from '../../src/pricing/types.js';

// Mock PriceTier[] data for testing pricing engine
// optionCode '8' = double-sided color printing (양면칼라)
// optionCode '4' = single-sided color printing (단면칼라)

export const MOCK_PRICE_TIERS: PriceTier[] = [
  // Digital output tiers for A3 sheet (양면칼라 priceCode='8')
  { optionCode: '8', minQty: 1, maxQty: 10, unitPrice: 2000, sheetStandard: 'A3' },
  { optionCode: '8', minQty: 11, maxQty: 20, unitPrice: 1500, sheetStandard: 'A3' },
  { optionCode: '8', minQty: 21, maxQty: 50, unitPrice: 1200, sheetStandard: 'A3' },
  { optionCode: '8', minQty: 51, maxQty: 100, unitPrice: 900, sheetStandard: 'A3' },
  { optionCode: '8', minQty: 101, maxQty: 500, unitPrice: 700, sheetStandard: 'A3' },
  { optionCode: '8', minQty: 501, maxQty: 999999, unitPrice: 500, sheetStandard: 'A3' },

  // Digital output tiers for T3 sheet (양면칼라 priceCode='8')
  { optionCode: '8', minQty: 1, maxQty: 10, unitPrice: 2500, sheetStandard: 'T3' },
  { optionCode: '8', minQty: 11, maxQty: 50, unitPrice: 1800, sheetStandard: 'T3' },

  // Single-sided color (단면칼라 priceCode='4')
  { optionCode: '4', minQty: 1, maxQty: 10, unitPrice: 1500, sheetStandard: 'A3' },
  { optionCode: '4', minQty: 11, maxQty: 50, unitPrice: 1000, sheetStandard: 'A3' },
  { optionCode: '4', minQty: 51, maxQty: 100, unitPrice: 700, sheetStandard: 'A3' },
  { optionCode: '4', minQty: 101, maxQty: 500, unitPrice: 500, sheetStandard: 'A3' },

  // Coating tiers (priceCode='coating_matte')
  { optionCode: 'coating_matte', minQty: 1, maxQty: 20, unitPrice: 500, sheetStandard: 'A3' },
  { optionCode: 'coating_matte', minQty: 21, maxQty: 100, unitPrice: 350, sheetStandard: 'A3' },
  { optionCode: 'coating_matte', minQty: 101, maxQty: 999999, unitPrice: 250, sheetStandard: 'A3' },

  // Post-process tiers per_sheet (priceCode='round_cut')
  { optionCode: 'round_cut', minQty: 1, maxQty: 50, unitPrice: 300, sheetStandard: 'A3' },
  { optionCode: 'round_cut', minQty: 51, maxQty: 999999, unitPrice: 200, sheetStandard: 'A3' },

  // Post-process tiers per_unit (priceCode='lamination')
  { optionCode: 'lamination', minQty: 1, maxQty: 100, unitPrice: 50, sheetStandard: null },
  { optionCode: 'lamination', minQty: 101, maxQty: 999999, unitPrice: 30, sheetStandard: null },

  // Special color tiers (priceCode='spot_white')
  { optionCode: 'spot_white', minQty: 1, maxQty: 20, unitPrice: 800, sheetStandard: 'A3' },
  { optionCode: 'spot_white', minQty: 21, maxQty: 100, unitPrice: 600, sheetStandard: 'A3' },

  // Binding tiers (priceCode='saddle_stitch')
  { optionCode: 'saddle_stitch', minQty: 1, maxQty: 50, unitPrice: 200, sheetStandard: null },
  { optionCode: 'saddle_stitch', minQty: 51, maxQty: 999999, unitPrice: 150, sheetStandard: null },

  // Binding tiers (priceCode='perfect_binding')
  { optionCode: 'perfect_binding', minQty: 1, maxQty: 50, unitPrice: 500, sheetStandard: null },
  { optionCode: 'perfect_binding', minQty: 51, maxQty: 999999, unitPrice: 350, sheetStandard: null },

  // Cutting type tiers (half_cut)
  { optionCode: 'half_cut', minQty: 1, maxQty: 100, unitPrice: 80, sheetStandard: null },
  { optionCode: 'half_cut', minQty: 101, maxQty: 999999, unitPrice: 50, sheetStandard: null },

  // Cutting type tiers (full_cut)
  { optionCode: 'full_cut', minQty: 1, maxQty: 100, unitPrice: 120, sheetStandard: null },
  { optionCode: 'full_cut', minQty: 101, maxQty: 999999, unitPrice: 80, sheetStandard: null },

  // Discount rate tiers for product 100 (acrylic keyring)
  { optionCode: 'discount_100', minQty: 1, maxQty: 9, unitPrice: 1.0, sheetStandard: null },
  { optionCode: 'discount_100', minQty: 10, maxQty: 29, unitPrice: 0.95, sheetStandard: null },
  { optionCode: 'discount_100', minQty: 30, maxQty: 99, unitPrice: 0.90, sheetStandard: null },
  { optionCode: 'discount_100', minQty: 100, maxQty: 999999, unitPrice: 0.85, sheetStandard: null },
];
