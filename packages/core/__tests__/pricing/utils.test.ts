import { describe, it, expect } from 'vitest';
import { parseSize, formatSize, assemblePricingResult } from '../../src/pricing/utils.js';
import { PricingError } from '../../src/errors.js';
import type { SizeSelection } from '../../src/pricing/types.js';
import { SIZE_100X150, SIZE_50X50, SIZE_CUSTOM } from '../fixtures/products.js';

describe('parseSize', () => {
  it('should parse "100x150" to [100, 150]', () => {
    expect(parseSize('100x150')).toEqual([100, 150]);
  });

  it('should parse "50x50" to [50, 50]', () => {
    expect(parseSize('50x50')).toEqual([50, 50]);
  });

  it('should be case-insensitive (handles uppercase X)', () => {
    expect(parseSize('100X150')).toEqual([100, 150]);
  });

  it('should throw PricingError for invalid format "invalid"', () => {
    expect(() => parseSize('invalid')).toThrow(PricingError);
  });

  it('should throw PricingError with code INVALID_SIZE', () => {
    try {
      parseSize('invalid');
    } catch (e) {
      expect(e).toBeInstanceOf(PricingError);
      expect((e as PricingError).code).toBe('INVALID_SIZE');
    }
  });

  it('should throw for single number "100"', () => {
    expect(() => parseSize('100')).toThrow(PricingError);
  });

  it('should throw for "100xabc"', () => {
    expect(() => parseSize('100xabc')).toThrow(PricingError);
  });

  it('should throw for empty string', () => {
    expect(() => parseSize('')).toThrow(PricingError);
  });
});

describe('formatSize', () => {
  it('should format standard size as "100 x 150 mm"', () => {
    expect(formatSize(SIZE_100X150)).toBe('100 x 150 mm');
  });

  it('should format another standard size', () => {
    expect(formatSize(SIZE_50X50)).toBe('50 x 50 mm');
  });

  it('should use customWidth/customHeight when isCustom is true', () => {
    expect(formatSize(SIZE_CUSTOM)).toBe('200 x 300 mm');
  });

  it('should fall back to cutWidth/cutHeight when isCustom is true but custom dims are undefined', () => {
    const size: SizeSelection = {
      sizeId: 99,
      cutWidth: 100,
      cutHeight: 200,
      impositionCount: null,
      isCustom: true,
      // customWidth and customHeight not provided
    };
    expect(formatSize(size)).toBe('100 x 200 mm');
  });

  it('should use cutWidth/cutHeight when isCustom is false', () => {
    const size: SizeSelection = {
      sizeId: 1,
      cutWidth: 210,
      cutHeight: 297,
      impositionCount: 4,
      isCustom: false,
    };
    expect(formatSize(size)).toBe('210 x 297 mm');
  });
});

describe('assemblePricingResult', () => {
  it('should floor totalPrice', () => {
    const result = assemblePricingResult(22800.7, 100, 'formula');
    expect(result.totalPrice).toBe(22800);
  });

  it('should calculate totalPriceWithVat as floor(totalPrice * 1.1)', () => {
    const result = assemblePricingResult(22800, 100, 'formula');
    expect(result.totalPriceWithVat).toBe(Math.floor(22800 * 1.1));
  });

  it('should calculate unitPrice as floor(totalPrice / quantity)', () => {
    const result = assemblePricingResult(22800, 100, 'formula');
    expect(result.unitPrice).toBe(Math.floor(22800 / 100));
  });

  it('should handle non-divisible unitPrice with floor', () => {
    const result = assemblePricingResult(10000, 3, 'formula');
    expect(result.unitPrice).toBe(Math.floor(10000 / 3));
  });

  it('should set model from parameter', () => {
    const result = assemblePricingResult(10000, 100, 'fixed_unit');
    expect(result.model).toBe('fixed_unit');
  });

  it('should set calculatedAt to a timestamp', () => {
    const before = Date.now();
    const result = assemblePricingResult(10000, 100, 'formula');
    const after = Date.now();
    expect(result.calculatedAt).toBeGreaterThanOrEqual(before);
    expect(result.calculatedAt).toBeLessThanOrEqual(after);
  });

  it('should set default breakdown values to 0', () => {
    const result = assemblePricingResult(10000, 100, 'formula');
    expect(result.breakdown.printCost).toBe(0);
    expect(result.breakdown.paperCost).toBe(0);
    expect(result.breakdown.specialColorCost).toBe(0);
    expect(result.breakdown.coatingCost).toBe(0);
    expect(result.breakdown.postProcessCost).toBe(0);
    expect(result.breakdown.bindingCost).toBe(0);
    expect(result.breakdown.foilCost).toBe(0);
    expect(result.breakdown.packagingCost).toBe(0);
    expect(result.breakdown.cuttingCost).toBe(0);
    expect(result.breakdown.discountAmount).toBe(0);
  });

  it('should merge partial breakdown overrides', () => {
    const result = assemblePricingResult(10000, 100, 'formula', {
      printCost: 5000,
      paperCost: 3000,
    });
    expect(result.breakdown.printCost).toBe(5000);
    expect(result.breakdown.paperCost).toBe(3000);
    expect(result.breakdown.coatingCost).toBe(0);
  });

  it('should apply floor to fractional VAT', () => {
    // 22801 * 1.1 = 25081.1 -> floor = 25081
    const result = assemblePricingResult(22801, 100, 'formula');
    expect(result.totalPriceWithVat).toBe(Math.floor(22801 * 1.1));
  });
});
