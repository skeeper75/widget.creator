// Golden test expected values from SPEC-WIDGET-CORE-001
// These are known-answer tests with verified expected outputs

// Golden Test -- Model 1 (Digital postcard 100x150mm, 100 units)
// Paper: Art Paper 250g, sellingPer4Cut=240
// Print: Double-sided color (priceCode=8)
// impositionCount=8, sheetStandard=A3
// Loss config: productId=1, categoryId=999 -> global config: lossRate=0.03, minLossQty=10
export const GOLDEN_MODEL1 = {
  quantity: 100,
  impositionCount: 8,
  sellingPer4Cut: 240,
  sheetStandard: 'A3' as const,
  printPriceCode: '8',
  // requiredSheets = ceil(100/8) = 13
  requiredSheets: 13,
  // lossQty = max(ceil(100*0.03), 10) = max(3, 10) = 10
  lossRate: 0.03,
  minLossQty: 10,
  lossQty: 10,
  // paperCost = ceil((240/8) * (100+10)) = ceil(30 * 110) = 3300
  paperCost: 3300,
  // printCost = lookupTier('8', 13, 'A3') * 13
  // From mock tiers: qty 13 falls in [11,20] tier -> unitPrice=1500
  // printCost = 1500 * 13 = 19500
  printUnitPrice: 1500,
  printCost: 19500,
  // Total = printCost + specialColorCost + paperCost + coatingCost + postProcessCost
  // = 19500 + 0 + 3300 + 0 + 0 = 22800
  expectedTotal: 22800,
} as const;

// Golden Test -- Model 3 (Premium business card 92x57mm, Art250g, double-sided color, 200 units)
// fixedPrice.sellingPrice = 15000 (per 100), baseQty = 100
// totalPrice = ceil(15000 * (200 / 100)) = 30000
export const GOLDEN_MODEL3 = {
  productId: 20,
  sizeId: 2,
  paperId: 1,
  printModeId: 1,
  quantity: 200,
  fixedSellingPrice: 15000,
  baseQty: 100,
  expectedTotal: 30000,
} as const;

// Golden Test -- Model 4 (Postcard book 100x150mm, double-sided color, 24P, 50 units)
// Package price lookup: productId=40, sizeId=1, printModeId=1, pageCount=24
// qty=50 falls in [30, 99] tier -> sellingPrice=20000
export const GOLDEN_MODEL4 = {
  productId: 40,
  sizeId: 1,
  printModeId: 1,
  pageCount: 24,
  quantity: 50,
  expectedTotal: 20000,
} as const;

// Golden Test -- Model 6 (Art print poster A3, 10 units)
// sizePrice = lookupFixedPrice(30, A3_sizeId) = 5000
// optionPrice = 0 (no coating/processing)
// totalPrice = (5000 + 0) * 10 = 50000
export const GOLDEN_MODEL6 = {
  productId: 30,
  sizeId: 4,
  quantity: 10,
  sizePrice: 5000,
  optionPrice: 0,
  expectedTotal: 50000,
} as const;

// Golden Test -- Model 7 (Acrylic keyring 50x50mm, 30 units)
// sizePrice = 3260 (50x50 base)
// processingPrice = 500 (UV printing)
// additionalProductPrice = 0
// discountRate = 0.90 (30~99 tier: 10% discount)
// totalPrice = ceil((3260+500) * 30 * 0.90) = ceil(101520) = 101520
export const GOLDEN_MODEL7 = {
  productId: 100,
  sizeId: 3,
  quantity: 30,
  sizePrice: 3260,
  processingPrice: 500,
  additionalProductPrice: 0,
  discountRate: 0.90,
  expectedTotal: 101520,
} as const;
