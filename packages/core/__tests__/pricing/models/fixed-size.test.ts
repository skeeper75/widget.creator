import { describe, it, expect } from 'vitest';
import { calculateFixedSize } from '../../../src/pricing/models/fixed-size.js';
import { PricingError } from '../../../src/errors.js';
import { GOLDEN_MODEL6 } from '../../fixtures/golden-tests.js';
import { SIZE_A3, createMockLookupData } from '../../fixtures/products.js';
import type { FixedSizeInput } from '../../../src/pricing/types.js';

function createFixedSizeInput(overrides?: Partial<FixedSizeInput>): FixedSizeInput {
  return {
    pricingModel: 'fixed_size',
    productId: GOLDEN_MODEL6.productId,
    categoryId: 1,
    quantity: GOLDEN_MODEL6.quantity,
    selectedOptions: [],
    sizeSelection: SIZE_A3,
    lookupData: createMockLookupData(),
    additionalOptions: [],
    ...overrides,
  } as FixedSizeInput;
}

describe('calculateFixedSize (Model 6)', () => {
  it('should calculate golden test correctly: art print poster A3, 10 units', () => {
    const result = calculateFixedSize(createFixedSizeInput());

    // sizePrice = 5000, optionPrice = 0
    // totalPrice = (5000 + 0) * 10 = 50000
    expect(result.totalPrice).toBe(GOLDEN_MODEL6.expectedTotal);
    expect(result.model).toBe('fixed_size');
  });

  it('should add option prices to base size price', () => {
    const input = createFixedSizeInput({
      additionalOptions: [
        { optionKey: 'coating', choiceCode: 'matte', unitPrice: 300 },
      ],
    });
    const result = calculateFixedSize(input);

    // (5000 + 300) * 10 = 53000
    expect(result.totalPrice).toBe(53000);
  });

  it('should accumulate multiple option prices', () => {
    const input = createFixedSizeInput({
      additionalOptions: [
        { optionKey: 'coating', choiceCode: 'matte', unitPrice: 300 },
        { optionKey: 'lamination', choiceCode: 'gloss', unitPrice: 200 },
      ],
    });
    const result = calculateFixedSize(input);

    // (5000 + 300 + 200) * 10 = 55000
    expect(result.totalPrice).toBe(55000);
  });

  it('should handle options with no unitPrice as 0', () => {
    const input = createFixedSizeInput({
      additionalOptions: [
        { optionKey: 'coating', choiceCode: 'matte' }, // no unitPrice
      ],
    });
    const result = calculateFixedSize(input);

    // (5000 + 0) * 10 = 50000
    expect(result.totalPrice).toBe(50000);
  });

  it('should throw for non-existent product', () => {
    const input = createFixedSizeInput({ productId: 999 });
    expect(() => calculateFixedSize(input)).toThrow(PricingError);
  });

  it('should produce integer totalPrice', () => {
    const result = calculateFixedSize(createFixedSizeInput());
    expect(Number.isInteger(result.totalPrice)).toBe(true);
  });
});
