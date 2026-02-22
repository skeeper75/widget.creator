import { describe, it, expect } from 'vitest';
import { calculateFixedPerUnit } from '../../../src/pricing/models/fixed-per-unit.js';
import { PricingError } from '../../../src/errors.js';
import { GOLDEN_MODEL7 } from '../../fixtures/golden-tests.js';
import { SIZE_50X50, createMockLookupData } from '../../fixtures/products.js';
import type { FixedPerUnitInput } from '../../../src/pricing/types.js';

function createFixedPerUnitInput(overrides?: Partial<FixedPerUnitInput>): FixedPerUnitInput {
  return {
    pricingModel: 'fixed_per_unit',
    productId: GOLDEN_MODEL7.productId,
    categoryId: 1,
    quantity: GOLDEN_MODEL7.quantity,
    selectedOptions: [],
    sizeSelection: SIZE_50X50,
    lookupData: createMockLookupData(),
    processingOptions: [
      { optionKey: 'uv_print', choiceCode: 'uv', unitPrice: GOLDEN_MODEL7.processingPrice },
    ],
    additionalProducts: [],
    ...overrides,
  } as FixedPerUnitInput;
}

describe('calculateFixedPerUnit (Model 7)', () => {
  it('should calculate golden test correctly: acrylic keyring 50x50mm, 30 units', () => {
    const result = calculateFixedPerUnit(createFixedPerUnitInput());

    // sizePrice = 3260
    // processingPrice = 500
    // baseUnitPrice = 3260 + 500 + 0 = 3760
    // discountRate = 0.90 (30-99 tier)
    // totalPrice = ceil(3760 * 30 * 0.90) = ceil(101520) = 101520
    expect(result.totalPrice).toBe(GOLDEN_MODEL7.expectedTotal);
    expect(result.model).toBe('fixed_per_unit');
  });

  it('should apply no discount for small quantities', () => {
    const input = createFixedPerUnitInput({ quantity: 5 });
    const result = calculateFixedPerUnit(input);

    // discountRate for qty 5: 1.0
    // totalPrice = ceil(3760 * 5 * 1.0) = 18800
    expect(result.totalPrice).toBe(18800);
  });

  it('should apply larger discount for bigger quantities', () => {
    const input = createFixedPerUnitInput({ quantity: 100 });
    const result = calculateFixedPerUnit(input);

    // discountRate for qty 100: 0.85
    // totalPrice = ceil(3760 * 100 * 0.85) = ceil(319600) = 319600
    expect(result.totalPrice).toBe(319600);
  });

  it('should include additional product prices', () => {
    const input = createFixedPerUnitInput({
      additionalProducts: [{ unitPrice: 200 }],
    });
    const result = calculateFixedPerUnit(input);

    // baseUnitPrice = 3260 + 500 + 200 = 3960
    // totalPrice = ceil(3960 * 30 * 0.90) = ceil(106920) = 106920
    expect(result.totalPrice).toBe(106920);
  });

  it('should handle no processing options', () => {
    const input = createFixedPerUnitInput({ processingOptions: [] });
    const result = calculateFixedPerUnit(input);

    // baseUnitPrice = 3260 + 0 + 0 = 3260
    // totalPrice = ceil(3260 * 30 * 0.90) = ceil(88020) = 88020
    expect(result.totalPrice).toBe(88020);
  });

  it('should track discount amount in breakdown', () => {
    const result = calculateFixedPerUnit(createFixedPerUnitInput());

    // baseUnitPrice=3760, qty=30, discountRate=0.90
    // discountAmount = floor(3760 * 30 * (1 - 0.90)) = floor(11280) = 11280
    expect(result.breakdown.discountAmount).toBe(11280);
  });

  it('should throw for non-existent product', () => {
    const input = createFixedPerUnitInput({ productId: 999 });
    expect(() => calculateFixedPerUnit(input)).toThrow(PricingError);
  });

  it('should produce integer totalPrice', () => {
    const result = calculateFixedPerUnit(createFixedPerUnitInput());
    expect(Number.isInteger(result.totalPrice)).toBe(true);
  });
});
