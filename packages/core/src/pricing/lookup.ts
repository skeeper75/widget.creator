// Tier and imposition lookup functions (REQ-PRICE-009, REQ-PRICE-010)

import { PricingError } from '../errors.js';
import type { PriceTier, ImpositionRule, FixedPriceRecord, PackagePriceRecord, PricingLookupData, SelectedOption } from './types.js';

/**
 * Look up unit price from price tiers by option code and quantity range.
 * Finds first tier where optionCode matches AND minQty <= quantity <= maxQty
 * AND (sheetStandard null OR matches).
 */
export function lookupTier(
  tiers: PriceTier[],
  optionCode: string,
  quantity: number,
  sheetStandard: string | null,
): number {
  const matched = tiers.find(t =>
    t.optionCode === optionCode &&
    t.minQty <= quantity &&
    quantity <= t.maxQty &&
    (sheetStandard === null || t.sheetStandard === null || t.sheetStandard === sheetStandard),
  );

  if (!matched) {
    throw new PricingError('TIER_NOT_FOUND', {
      optionCode,
      quantity,
      sheetStandard,
    });
  }

  return Number(matched.unitPrice);
}

/**
 * Look up imposition count from rules by cut dimensions and sheet standard.
 * Uses tolerance of 0.5mm for floating point comparison.
 */
export function lookupImposition(
  cutWidth: number,
  cutHeight: number,
  sheetStandard: string,
  rules: ImpositionRule[],
): number {
  const matched = rules.find(r =>
    Math.abs(r.cutWidth - cutWidth) < 0.5 &&
    Math.abs(r.cutHeight - cutHeight) < 0.5 &&
    r.sheetStandard === sheetStandard,
  );

  if (!matched) {
    throw new PricingError('IMPOSITION_NOT_FOUND', {
      cutWidth,
      cutHeight,
      sheetStandard,
    });
  }

  return matched.impositionCount;
}

/**
 * Look up fixed price by product, size, paper, and print mode.
 * Null parameters act as wildcards (match any).
 */
export function lookupFixedPrice(
  productId: number,
  sizeId: number | null,
  paperId: number | null,
  printModeId: number | null,
  fixedPrices: FixedPriceRecord[],
): FixedPriceRecord {
  const matched = fixedPrices.find(fp =>
    fp.productId === productId &&
    (sizeId === null || fp.sizeId === null || fp.sizeId === sizeId) &&
    (paperId === null || fp.paperId === null || fp.paperId === paperId) &&
    (printModeId === null || fp.printModeId === null || fp.printModeId === printModeId),
  );

  if (!matched) {
    throw new PricingError('FIXED_PRICE_NOT_FOUND', {
      productId,
      sizeId,
      paperId,
      printModeId,
    });
  }

  return matched;
}

/**
 * Look up package price by product+size+printMode+pageCount, then find tier by quantity.
 */
export function lookupPackagePrice(
  productId: number,
  sizeId: number,
  printModeId: number,
  pageCount: number,
  quantity: number,
  packagePrices: PackagePriceRecord[],
): number {
  const matched = packagePrices.find(pp =>
    pp.productId === productId &&
    pp.sizeId === sizeId &&
    pp.printModeId === printModeId &&
    pp.pageCount === pageCount &&
    pp.minQty <= quantity &&
    quantity <= pp.maxQty,
  );

  if (!matched) {
    throw new PricingError('PACKAGE_PRICE_NOT_FOUND', {
      productId,
      sizeId,
      printModeId,
      pageCount,
      quantity,
    });
  }

  return matched.sellingPrice;
}

/**
 * Look up option price from lookup data for additional options.
 */
export function lookupOptionPrice(
  opt: SelectedOption,
  lookupData: PricingLookupData,
): number {
  if (opt.unitPrice !== undefined) {
    return opt.unitPrice;
  }
  return 0;
}

/**
 * Look up cutting price based on cutting type, size, and quantity.
 */
export function lookupCuttingPrice(
  cuttingType: string,
  sizeSelection: { cutWidth: number; cutHeight: number },
  quantity: number,
  lookupData: PricingLookupData,
): number {
  // Cutting price is looked up from price tiers using cutting type as option code
  const tier = lookupTier(
    lookupData.priceTiers,
    cuttingType,
    quantity,
    null,
  );
  return tier * quantity;
}

/**
 * Look up quantity discount rate for a product.
 */
export function lookupQuantityDiscount(
  productId: number,
  quantity: number,
  lookupData: PricingLookupData,
): number {
  // Discount rate tiers use productId-based option code
  const discountCode = `discount_${productId}`;
  try {
    const rate = lookupTier(
      lookupData.priceTiers,
      discountCode,
      quantity,
      null,
    );
    return rate;
  } catch {
    // No discount tier found - return 1.0 (no discount)
    return 1.0;
  }
}
