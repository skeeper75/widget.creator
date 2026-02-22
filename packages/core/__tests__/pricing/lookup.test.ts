import { describe, it, expect } from 'vitest';
import {
  lookupTier,
  lookupImposition,
  lookupFixedPrice,
  lookupPackagePrice,
  lookupOptionPrice,
  lookupCuttingPrice,
  lookupQuantityDiscount,
} from '../../src/pricing/lookup.js';
import { PricingError } from '../../src/errors.js';
import { MOCK_PRICE_TIERS } from '../fixtures/price-tiers.js';
import {
  MOCK_IMPOSITION_RULES,
  MOCK_FIXED_PRICES,
  MOCK_PACKAGE_PRICES,
  createMockLookupData,
} from '../fixtures/products.js';

describe('lookupTier', () => {
  it('should return unitPrice for matching tier', () => {
    const result = lookupTier(MOCK_PRICE_TIERS, '8', 13, 'A3');
    expect(result).toBe(1500);
  });

  it('should match exact boundary minQty', () => {
    const result = lookupTier(MOCK_PRICE_TIERS, '8', 11, 'A3');
    expect(result).toBe(1500);
  });

  it('should match exact boundary maxQty', () => {
    const result = lookupTier(MOCK_PRICE_TIERS, '8', 20, 'A3');
    expect(result).toBe(1500);
  });

  it('should return correct tier for qty=1 (lowest tier)', () => {
    const result = lookupTier(MOCK_PRICE_TIERS, '8', 1, 'A3');
    expect(result).toBe(2000);
  });

  it('should return correct tier for large quantity', () => {
    const result = lookupTier(MOCK_PRICE_TIERS, '8', 999, 'A3');
    expect(result).toBe(500);
  });

  it('should filter by sheetStandard', () => {
    // Same optionCode '8' but T3 sheet standard
    const resultT3 = lookupTier(MOCK_PRICE_TIERS, '8', 5, 'T3');
    expect(resultT3).toBe(2500);

    const resultA3 = lookupTier(MOCK_PRICE_TIERS, '8', 5, 'A3');
    expect(resultA3).toBe(2000);
  });

  it('should allow null sheetStandard to match any', () => {
    // lamination tiers have sheetStandard=null
    const result = lookupTier(MOCK_PRICE_TIERS, 'lamination', 50, null);
    expect(result).toBe(50);
  });

  it('should match tiers with null sheetStandard when searching with specific standard', () => {
    // lamination has sheetStandard=null, should match when searching for 'A3'
    const result = lookupTier(MOCK_PRICE_TIERS, 'lamination', 50, 'A3');
    expect(result).toBe(50);
  });

  it('should throw TIER_NOT_FOUND for non-existent optionCode', () => {
    expect(() => lookupTier(MOCK_PRICE_TIERS, 'nonexistent', 10, 'A3'))
      .toThrow(PricingError);

    try {
      lookupTier(MOCK_PRICE_TIERS, 'nonexistent', 10, 'A3');
    } catch (e) {
      expect(e).toBeInstanceOf(PricingError);
      expect((e as PricingError).code).toBe('TIER_NOT_FOUND');
      expect((e as PricingError).context.optionCode).toBe('nonexistent');
    }
  });

  it('should throw TIER_NOT_FOUND when quantity is out of all tier ranges', () => {
    // T3 tiers for '8' only go up to 50
    expect(() => lookupTier(MOCK_PRICE_TIERS, '8', 100, 'T3'))
      .toThrow(PricingError);
  });

  it('should throw TIER_NOT_FOUND with correct context', () => {
    try {
      lookupTier(MOCK_PRICE_TIERS, 'missing', 42, 'A3');
    } catch (e) {
      const error = e as PricingError;
      expect(error.code).toBe('TIER_NOT_FOUND');
      expect(error.context).toEqual({
        optionCode: 'missing',
        quantity: 42,
        sheetStandard: 'A3',
      });
    }
  });

  it('should return number type (coerce from unitPrice)', () => {
    const result = lookupTier(MOCK_PRICE_TIERS, '8', 5, 'A3');
    expect(typeof result).toBe('number');
  });
});

describe('lookupImposition', () => {
  it('should find matching imposition rule', () => {
    const result = lookupImposition(100, 150, 'A3', MOCK_IMPOSITION_RULES);
    expect(result).toBe(8);
  });

  it('should find imposition for different sizes', () => {
    expect(lookupImposition(92, 57, 'A3', MOCK_IMPOSITION_RULES)).toBe(16);
    expect(lookupImposition(50, 50, 'A3', MOCK_IMPOSITION_RULES)).toBe(24);
    expect(lookupImposition(148, 210, 'A3', MOCK_IMPOSITION_RULES)).toBe(4);
    expect(lookupImposition(297, 420, 'A3', MOCK_IMPOSITION_RULES)).toBe(1);
  });

  it('should handle 0.5mm tolerance (within tolerance)', () => {
    // 100.4 is within 0.5 of 100, 150.3 is within 0.5 of 150
    const result = lookupImposition(100.4, 150.3, 'A3', MOCK_IMPOSITION_RULES);
    expect(result).toBe(8);
  });

  it('should handle exact boundary at 0.5mm tolerance', () => {
    // Math.abs(100.49 - 100) = 0.49 < 0.5 -- should match
    const result = lookupImposition(100.49, 150, 'A3', MOCK_IMPOSITION_RULES);
    expect(result).toBe(8);
  });

  it('should fail when outside 0.5mm tolerance', () => {
    // 100.5 - 100 = 0.5, not < 0.5, should NOT match
    expect(() => lookupImposition(100.5, 150, 'A3', MOCK_IMPOSITION_RULES))
      .toThrow(PricingError);
  });

  it('should filter by sheetStandard', () => {
    const a3Result = lookupImposition(100, 150, 'A3', MOCK_IMPOSITION_RULES);
    const t3Result = lookupImposition(100, 150, 'T3', MOCK_IMPOSITION_RULES);
    expect(a3Result).toBe(8);
    expect(t3Result).toBe(12);
  });

  it('should throw IMPOSITION_NOT_FOUND for non-matching dimensions', () => {
    expect(() => lookupImposition(999, 999, 'A3', MOCK_IMPOSITION_RULES))
      .toThrow(PricingError);

    try {
      lookupImposition(999, 999, 'A3', MOCK_IMPOSITION_RULES);
    } catch (e) {
      expect(e).toBeInstanceOf(PricingError);
      expect((e as PricingError).code).toBe('IMPOSITION_NOT_FOUND');
    }
  });

  it('should throw IMPOSITION_NOT_FOUND for non-matching sheetStandard', () => {
    // 50x50 only has A3 rule, no B4 rule
    expect(() => lookupImposition(50, 50, 'B4', MOCK_IMPOSITION_RULES))
      .toThrow(PricingError);
  });
});

describe('lookupFixedPrice', () => {
  it('should find exact match for all parameters', () => {
    const result = lookupFixedPrice(20, 2, 1, 1, MOCK_FIXED_PRICES);
    expect(result.sellingPrice).toBe(15000);
    expect(result.baseQty).toBe(100);
  });

  it('should return full FixedPriceRecord', () => {
    const result = lookupFixedPrice(20, 2, 1, 1, MOCK_FIXED_PRICES);
    expect(result).toEqual({
      productId: 20,
      sizeId: 2,
      paperId: 1,
      printModeId: 1,
      sellingPrice: 15000,
      costPrice: 10000,
      baseQty: 100,
    });
  });

  it('should match when search params are null (wildcard)', () => {
    // Product 30 has paperId=null, printModeId=null
    const result = lookupFixedPrice(30, 4, null, null, MOCK_FIXED_PRICES);
    expect(result.sellingPrice).toBe(5000);
  });

  it('should match record with null fields against specific search params', () => {
    // Product 30 record has paperId=null -> should match any paperId
    const result = lookupFixedPrice(30, 4, 999, 999, MOCK_FIXED_PRICES);
    expect(result.sellingPrice).toBe(5000);
  });

  it('should throw FIXED_PRICE_NOT_FOUND for non-existent product', () => {
    expect(() => lookupFixedPrice(999, 1, 1, 1, MOCK_FIXED_PRICES))
      .toThrow(PricingError);

    try {
      lookupFixedPrice(999, 1, 1, 1, MOCK_FIXED_PRICES);
    } catch (e) {
      expect((e as PricingError).code).toBe('FIXED_PRICE_NOT_FOUND');
    }
  });

  it('should throw FIXED_PRICE_NOT_FOUND for wrong size', () => {
    // Product 20 has sizeId 2, not 99
    expect(() => lookupFixedPrice(20, 99, 1, 1, MOCK_FIXED_PRICES))
      .toThrow(PricingError);
  });
});

describe('lookupPackagePrice', () => {
  it('should find matching package price within quantity tier', () => {
    const result = lookupPackagePrice(40, 1, 1, 24, 50, MOCK_PACKAGE_PRICES);
    expect(result).toBe(20000);
  });

  it('should match lowest tier for small quantities', () => {
    const result = lookupPackagePrice(40, 1, 1, 24, 1, MOCK_PACKAGE_PRICES);
    expect(result).toBe(25000);
  });

  it('should match highest tier for large quantities', () => {
    const result = lookupPackagePrice(40, 1, 1, 24, 500, MOCK_PACKAGE_PRICES);
    expect(result).toBe(15000);
  });

  it('should match exact boundary minQty', () => {
    const result = lookupPackagePrice(40, 1, 1, 24, 30, MOCK_PACKAGE_PRICES);
    expect(result).toBe(20000);
  });

  it('should match exact boundary maxQty', () => {
    const result = lookupPackagePrice(40, 1, 1, 24, 99, MOCK_PACKAGE_PRICES);
    expect(result).toBe(20000);
  });

  it('should throw PACKAGE_PRICE_NOT_FOUND for wrong pageCount', () => {
    expect(() => lookupPackagePrice(40, 1, 1, 48, 50, MOCK_PACKAGE_PRICES))
      .toThrow(PricingError);

    try {
      lookupPackagePrice(40, 1, 1, 48, 50, MOCK_PACKAGE_PRICES);
    } catch (e) {
      expect((e as PricingError).code).toBe('PACKAGE_PRICE_NOT_FOUND');
    }
  });

  it('should throw PACKAGE_PRICE_NOT_FOUND for non-existent product', () => {
    expect(() => lookupPackagePrice(999, 1, 1, 24, 50, MOCK_PACKAGE_PRICES))
      .toThrow(PricingError);
  });
});

describe('lookupOptionPrice', () => {
  it('should return unitPrice when available on option', () => {
    const result = lookupOptionPrice(
      { optionKey: 'coating', choiceCode: 'matte', unitPrice: 500 },
      createMockLookupData(),
    );
    expect(result).toBe(500);
  });

  it('should return 0 when unitPrice is undefined', () => {
    const result = lookupOptionPrice(
      { optionKey: 'coating', choiceCode: 'matte' },
      createMockLookupData(),
    );
    expect(result).toBe(0);
  });
});

describe('lookupCuttingPrice', () => {
  it('should calculate cutting price as tier unit price * quantity', () => {
    const result = lookupCuttingPrice(
      'half_cut',
      { cutWidth: 50, cutHeight: 50 },
      50,
      createMockLookupData(),
    );
    // half_cut tier for qty 50: unitPrice=80, result = 80 * 50 = 4000
    expect(result).toBe(4000);
  });

  it('should use correct tier for higher quantities', () => {
    const result = lookupCuttingPrice(
      'half_cut',
      { cutWidth: 50, cutHeight: 50 },
      200,
      createMockLookupData(),
    );
    // half_cut tier for qty 200: unitPrice=50, result = 50 * 200 = 10000
    expect(result).toBe(10000);
  });

  it('should handle full_cut cutting type', () => {
    const result = lookupCuttingPrice(
      'full_cut',
      { cutWidth: 50, cutHeight: 50 },
      50,
      createMockLookupData(),
    );
    // full_cut tier for qty 50: unitPrice=120, result = 120 * 50 = 6000
    expect(result).toBe(6000);
  });
});

describe('lookupQuantityDiscount', () => {
  it('should return correct discount rate for matching tier', () => {
    const result = lookupQuantityDiscount(100, 30, createMockLookupData());
    // discount_100 tier for qty 30: unitPrice=0.90
    expect(result).toBe(0.90);
  });

  it('should return 1.0 (no discount) when no tier exists for product', () => {
    // Product 999 has no discount tiers
    const result = lookupQuantityDiscount(999, 30, createMockLookupData());
    expect(result).toBe(1.0);
  });

  it('should return higher discount for larger quantities', () => {
    const rate30 = lookupQuantityDiscount(100, 30, createMockLookupData());
    const rate100 = lookupQuantityDiscount(100, 100, createMockLookupData());
    expect(rate30).toBe(0.90);
    expect(rate100).toBe(0.85);
    expect(rate100).toBeLessThan(rate30);
  });

  it('should return no discount for small quantities', () => {
    const result = lookupQuantityDiscount(100, 5, createMockLookupData());
    expect(result).toBe(1.0);
  });
});
