/**
 * Unit tests for Price Mapper
 *
 * Tests cover salePrice calculation, addPrice mapping,
 * price tolerance validation (10%), batch validation, and KRW rounding.
 *
 * SPEC: SPEC-SHOPBY-002 M2 - Price Mapping & extraJson
 * AC-006: Dual price strategy (addPrice accuracy, tolerance validation)
 */
import { describe, it, expect } from 'vitest';
import {
  calculateSalePrice,
  calculateCombinationAddPrice,
  validatePriceTolerance,
  batchValidatePrices,
  buildPriceMap,
  roundKrwPrice,
} from '../price-mapper.js';

// =============================================================================
// Test Fixtures
// =============================================================================

const SAMPLE_PRICES = [
  { sizeCode: 'S1', paperCode: 'P1', quantity: 100, sellingPrice: 10000 },
  { sizeCode: 'S1', paperCode: 'P1', quantity: 200, sellingPrice: 15000 },
  { sizeCode: 'S1', paperCode: 'P2', quantity: 100, sellingPrice: 12000 },
  { sizeCode: 'S1', paperCode: 'P2', quantity: 200, sellingPrice: 18000 },
  { sizeCode: 'S2', paperCode: 'P1', quantity: 100, sellingPrice: 20000 },
  { sizeCode: 'S2', paperCode: 'P2', quantity: 100, sellingPrice: 25000 },
];

// =============================================================================
// SECTION 1: salePrice Calculation
// =============================================================================

describe('calculateSalePrice', () => {
  it('should return minimum price across all combinations', () => {
    const result = calculateSalePrice([10000, 15000, 12000, 18000, 20000, 25000]);
    expect(result).toBe(10000);
  });

  it('should return 10000 for the sample data', () => {
    const prices = SAMPLE_PRICES.map(p => p.sellingPrice);
    expect(calculateSalePrice(prices)).toBe(10000);
  });

  it('should return 0 for empty price list', () => {
    expect(calculateSalePrice([])).toBe(0);
  });

  it('should handle single combination', () => {
    expect(calculateSalePrice([5000])).toBe(5000);
  });

  it('should handle all combinations with same price', () => {
    expect(calculateSalePrice([7000, 7000, 7000])).toBe(7000);
  });
});

// =============================================================================
// SECTION 2: addPrice Calculation
// =============================================================================

describe('calculateCombinationAddPrice', () => {
  it('should calculate addPrice as combination price minus salePrice', () => {
    expect(calculateCombinationAddPrice(10000, 15000)).toBe(5000);
  });

  it('should set addPrice to 0 for the minimum-price combination', () => {
    expect(calculateCombinationAddPrice(10000, 10000)).toBe(0);
  });

  it('should set addPrice to 5000 for 15000 - 10000', () => {
    expect(calculateCombinationAddPrice(10000, 15000)).toBe(5000);
  });

  it('should never return negative addPrice', () => {
    // When combination price is less than base price, max(0, diff) = 0
    expect(calculateCombinationAddPrice(10000, 8000)).toBe(0);
  });

  it('should handle zero base price', () => {
    expect(calculateCombinationAddPrice(0, 5000)).toBe(5000);
  });

  it('should handle both zero', () => {
    expect(calculateCombinationAddPrice(0, 0)).toBe(0);
  });
});

// =============================================================================
// SECTION 3: Price Tolerance Validation (AC-006)
// =============================================================================

describe('validatePriceTolerance', () => {
  describe('within tolerance (10%)', () => {
    it('should pass when widget price equals Shopby price', () => {
      const result = validatePriceTolerance(10000, 10000);
      expect(result.isValid).toBe(true);
      expect(result.difference).toBe(0);
      expect(result.differencePercent).toBe(0);
    });

    it('should pass when widget price is 5% higher', () => {
      const result = validatePriceTolerance(10500, 10000);
      expect(result.isValid).toBe(true);
      expect(result.differencePercent).toBeLessThanOrEqual(10);
    });

    it('should pass when widget price is 5% lower', () => {
      const result = validatePriceTolerance(9500, 10000);
      expect(result.isValid).toBe(true);
    });

    it('should pass when widget price is exactly 10% higher', () => {
      const result = validatePriceTolerance(11000, 10000);
      // differencePercent = 1000/11000*100 = ~9.09% (reference is max)
      expect(result.isValid).toBe(true);
    });

    it('should pass when difference is at tolerance boundary', () => {
      // 10% tolerance: difference/max(widget, shopby) <= 10%
      const result = validatePriceTolerance(10000, 10000, 10);
      expect(result.isValid).toBe(true);
      expect(result.tolerancePercent).toBe(10);
    });
  });

  describe('exceeding tolerance', () => {
    it('should fail when widget price is 15% higher than Shopby price', () => {
      // widget=11500, shopby=10000 -> diff=1500, ref=11500, pct=13.04%
      const result = validatePriceTolerance(11500, 10000);
      expect(result.isValid).toBe(false);
    });

    it('should fail when difference exceeds tolerance', () => {
      // widget=12000, shopby=10000 -> diff=2000, ref=12000, pct=16.67%
      const result = validatePriceTolerance(12000, 10000);
      expect(result.isValid).toBe(false);
      expect(result.differencePercent).toBeGreaterThan(10);
    });

    it('should fail when widget price is much lower', () => {
      // widget=8000, shopby=10000 -> diff=2000, ref=10000, pct=20%
      const result = validatePriceTolerance(8000, 10000);
      expect(result.isValid).toBe(false);
    });

    it('should include difference percentage in result', () => {
      const result = validatePriceTolerance(12000, 10000);
      expect(result.differencePercent).toBeGreaterThan(0);
      expect(typeof result.differencePercent).toBe('number');
    });

    it('should include all price details in result', () => {
      const result = validatePriceTolerance(12000, 10000);
      expect(result.widgetPrice).toBe(12000);
      expect(result.shopbyPrice).toBe(10000);
      expect(result.difference).toBe(2000);
    });
  });

  describe('edge cases', () => {
    it('should handle zero Shopby price', () => {
      const result = validatePriceTolerance(1000, 0);
      expect(result.isValid).toBe(false);
    });

    it('should handle zero widget price', () => {
      const result = validatePriceTolerance(0, 1000);
      expect(result.isValid).toBe(false);
    });

    it('should handle both prices zero (pass)', () => {
      const result = validatePriceTolerance(0, 0);
      expect(result.isValid).toBe(true);
      expect(result.differencePercent).toBe(0);
    });

    it('should handle very small price differences', () => {
      const result = validatePriceTolerance(10001, 10000);
      expect(result.isValid).toBe(true);
    });

    it('should handle very large prices', () => {
      const result = validatePriceTolerance(1000000, 1050000);
      expect(result.isValid).toBe(true);
    });

    it('should accept custom tolerance percentage', () => {
      // 5% tolerance
      const result = validatePriceTolerance(10500, 10000, 5);
      expect(result.tolerancePercent).toBe(5);
    });
  });
});

// =============================================================================
// SECTION 4: Batch Price Validation
// =============================================================================

describe('batchValidatePrices', () => {
  it('should validate all combinations and return summary', () => {
    const combos = [
      { entry: { values: ['S1', 'P1', '100'], codes: ['S1', 'P1', 'QTY_100'], addPrice: 0 }, widgetPrice: 10000, shopbyPrice: 10000 },
      { entry: { values: ['S1', 'P2', '100'], codes: ['S1', 'P2', 'QTY_100'], addPrice: 2000 }, widgetPrice: 12000, shopbyPrice: 12000 },
    ];
    const result = batchValidatePrices(combos);
    expect(result.allValid).toBe(true);
    expect(result.invalidCount).toBe(0);
    expect(result.results).toHaveLength(2);
  });

  it('should count invalid entries', () => {
    const combos = [
      { entry: { values: ['S1'], codes: ['S1'], addPrice: 0 }, widgetPrice: 10000, shopbyPrice: 10000 },
      { entry: { values: ['S2'], codes: ['S2'], addPrice: 0 }, widgetPrice: 15000, shopbyPrice: 10000 },
    ];
    const result = batchValidatePrices(combos);
    expect(result.allValid).toBe(false);
    expect(result.invalidCount).toBe(1);
  });

  it('should accept custom tolerance', () => {
    const combos = [
      { entry: { values: ['S1'], codes: ['S1'], addPrice: 0 }, widgetPrice: 10500, shopbyPrice: 10000 },
    ];
    // 5% tolerance -> diff 500/10500 = ~4.76% -> valid
    const result = batchValidatePrices(combos, 5);
    expect(result.allValid).toBe(true);
  });

  it('should handle empty array', () => {
    const result = batchValidatePrices([]);
    expect(result.allValid).toBe(true);
    expect(result.invalidCount).toBe(0);
    expect(result.results).toHaveLength(0);
  });
});

// =============================================================================
// SECTION 5: buildPriceMap
// =============================================================================

describe('buildPriceMap', () => {
  it('should produce complete price mapping with salePrice and addPrices', () => {
    const result = buildPriceMap(SAMPLE_PRICES);
    expect(result.salePrice).toBe(10000);
    expect(result.addPrices.size).toBe(6);
  });

  it('should set salePrice to minimum combination price', () => {
    const result = buildPriceMap(SAMPLE_PRICES);
    expect(result.salePrice).toBe(10000);
  });

  it('should set addPrice to 0 for minimum-price combination', () => {
    const result = buildPriceMap(SAMPLE_PRICES);
    expect(result.addPrices.get('S1|P1|100')).toBe(0);
  });

  it('should calculate correct addPrice for each combination', () => {
    const result = buildPriceMap(SAMPLE_PRICES);
    expect(result.addPrices.get('S1|P1|200')).toBe(5000);  // 15000 - 10000
    expect(result.addPrices.get('S1|P2|100')).toBe(2000);  // 12000 - 10000
    expect(result.addPrices.get('S1|P2|200')).toBe(8000);  // 18000 - 10000
    expect(result.addPrices.get('S2|P1|100')).toBe(10000); // 20000 - 10000
    expect(result.addPrices.get('S2|P2|100')).toBe(15000); // 25000 - 10000
  });

  it('should handle single price entry', () => {
    const result = buildPriceMap([
      { sizeCode: 'S1', paperCode: 'P1', quantity: 100, sellingPrice: 5000 },
    ]);
    expect(result.salePrice).toBe(5000);
    expect(result.addPrices.get('S1|P1|100')).toBe(0);
  });

  it('should handle empty price array', () => {
    const result = buildPriceMap([]);
    expect(result.salePrice).toBe(0);
    expect(result.addPrices.size).toBe(0);
  });
});

// =============================================================================
// SECTION 6: roundKrwPrice
// =============================================================================

describe('roundKrwPrice', () => {
  it('should round to nearest integer', () => {
    expect(roundKrwPrice(100.5)).toBe(101);
    expect(roundKrwPrice(100.4)).toBe(100);
  });

  it('should handle already-integer prices', () => {
    expect(roundKrwPrice(10000)).toBe(10000);
  });

  it('should handle zero', () => {
    expect(roundKrwPrice(0)).toBe(0);
  });

  it('should handle negative rounding', () => {
    // Math.round(-0.5) returns -0 in JavaScript
    expect(roundKrwPrice(-0.5)).toBe(-0);
  });
});
