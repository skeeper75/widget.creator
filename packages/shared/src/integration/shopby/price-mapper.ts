/**
 * Shopby Price Mapper
 *
 * Handles price calculation and validation for Shopby product registration.
 * Implements the dual pricing strategy: Shopby static addPrice + Widget dynamic price.
 *
 * Reference: SPEC-SHOPBY-002, R-PRD-006
 *
 * @MX:NOTE: Implements the dual pricing strategy where Shopby uses static addPrice
 * and Widget uses dynamic pricing. A 10% tolerance validation ensures consistency.
 */

import type { PriceValidationResult, OptionCombinationEntry } from './types.js';
import { calculateAddPrice, findMinSellingPrice } from './mapper.js';

// =============================================================================
// SECTION 1: Constants
// =============================================================================

/** Default price tolerance percentage */
const DEFAULT_TOLERANCE_PERCENT = 10;

// =============================================================================
// SECTION 2: Sale Price Calculation
// =============================================================================

/**
 * Calculate the base salePrice from all combination prices
 *
 * The salePrice is the minimum price across all option combinations.
 * All addPrice values are calculated relative to this base.
 *
 * @param prices - Array of selling prices for all combinations
 * @returns Base sale price (minimum price)
 */
export function calculateSalePrice(prices: number[]): number {
  return findMinSellingPrice(prices);
}

/**
 * Calculate addPrice for a specific combination
 *
 * addPrice = combinationPrice - basePrice
 * Always >= 0 (base combination has addPrice = 0)
 *
 * @param basePrice - Base sale price (minimum combination price)
 * @param combinationPrice - Selling price for this specific combination
 * @returns Additional price over base
 */
export function calculateCombinationAddPrice(
  basePrice: number,
  combinationPrice: number
): number {
  return calculateAddPrice(basePrice, combinationPrice);
}

// =============================================================================
// SECTION 3: Price Validation
// =============================================================================

// @MX:NOTE: [AUTO] Dual pricing strategy: Shopby uses static addPrice at registration time; Widget recalculates dynamically at order time. 10% tolerance bridges the drift.
// @MX:SPEC: SPEC-WB-005
/**
 * Validate price difference between widget dynamic price and Shopby static price
 *
 * The widget calculates prices dynamically (with finishing, special options, etc.)
 * while Shopby uses pre-calculated static addPrice values. This function validates
 * that the difference is within acceptable tolerance.
 *
 * @param widgetPrice - Dynamically calculated widget price
 * @param shopbyPrice - Static Shopby price (salePrice + addPrice)
 * @param tolerancePercent - Maximum allowed difference percentage (default: 10%)
 * @returns Validation result with detailed comparison
 */
export function validatePriceTolerance(
  widgetPrice: number,
  shopbyPrice: number,
  tolerancePercent: number = DEFAULT_TOLERANCE_PERCENT
): PriceValidationResult {
  const difference = Math.abs(widgetPrice - shopbyPrice);
  const referencePrice = Math.max(widgetPrice, shopbyPrice);
  const differencePercent = referencePrice > 0
    ? (difference / referencePrice) * 100
    : 0;

  return {
    isValid: differencePercent <= tolerancePercent,
    widgetPrice,
    shopbyPrice,
    difference,
    differencePercent: Math.round(differencePercent * 100) / 100,
    tolerancePercent,
  };
}

/**
 * Batch validate prices for multiple combinations
 *
 * @param combinations - Array of entries with widget and shopby prices
 * @param tolerancePercent - Maximum allowed difference percentage (default: 10%)
 * @returns Array of validation results with overall summary
 */
export function batchValidatePrices(
  combinations: Array<{
    entry: OptionCombinationEntry;
    widgetPrice: number;
    shopbyPrice: number;
  }>,
  tolerancePercent: number = DEFAULT_TOLERANCE_PERCENT
): { results: PriceValidationResult[]; allValid: boolean; invalidCount: number } {
  const results = combinations.map(combo =>
    validatePriceTolerance(combo.widgetPrice, combo.shopbyPrice, tolerancePercent)
  );

  const invalidCount = results.filter(r => !r.isValid).length;

  return {
    results,
    allValid: invalidCount === 0,
    invalidCount,
  };
}

// =============================================================================
// SECTION 4: Price Mapping Utilities
// =============================================================================

// @MX:ANCHOR: [AUTO] Price map builder - produces salePrice + addPrice map consumed by product registration
// @MX:REASON: Called by product-registration.ts to transform widget pricing into Shopby static pricing format; base price = minimum combination price
// @MX:SPEC: SPEC-WB-005
/**
 * Build a complete price map from option combinations
 *
 * Given all combination prices, calculates the salePrice and
 * addPrice for each combination.
 *
 * @param prices - Array of combination prices
 * @returns Base price and per-combination addPrices
 */
export function buildPriceMap(
  prices: Array<{
    sizeCode: string;
    paperCode: string;
    quantity: number;
    sellingPrice: number;
  }>
): {
  salePrice: number;
  addPrices: Map<string, number>;
} {
  const sellingPrices = prices.map(p => p.sellingPrice);
  const salePrice = calculateSalePrice(sellingPrices);

  const addPrices = new Map<string, number>();
  for (const price of prices) {
    const key = `${price.sizeCode}|${price.paperCode}|${price.quantity}`;
    addPrices.set(key, calculateCombinationAddPrice(salePrice, price.sellingPrice));
  }

  return { salePrice, addPrices };
}

/**
 * Round price to nearest integer (KRW has no decimal places)
 *
 * @param price - Price to round
 * @returns Rounded price
 */
export function roundKrwPrice(price: number): number {
  return Math.round(price);
}
