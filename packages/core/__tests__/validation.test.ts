import { describe, it, expect } from 'vitest';
import { validatePricingInput, validateQuantity, validatePageCount } from '../src/validation.js';
import { PricingError } from '../src/errors.js';
import type { PricingInput } from '../src/pricing/types.js';
import { SIZE_100X150, createMockLookupData } from './fixtures/products.js';

function createMinimalPricingInput(overrides?: Partial<PricingInput>): PricingInput {
  return {
    pricingModel: 'formula',
    productId: 1,
    categoryId: 1,
    quantity: 100,
    selectedOptions: [],
    sizeSelection: SIZE_100X150,
    lookupData: createMockLookupData(),
    ...overrides,
  };
}

describe('validatePricingInput', () => {
  it('should not throw for valid input', () => {
    expect(() => validatePricingInput(createMinimalPricingInput())).not.toThrow();
  });

  it('should throw PricingError for quantity < 1', () => {
    expect(() => validatePricingInput(createMinimalPricingInput({ quantity: 0 }))).toThrow(PricingError);
    expect(() => validatePricingInput(createMinimalPricingInput({ quantity: 0 }))).toThrow('INVALID_QUANTITY');
  });

  it('should throw PricingError for negative quantity', () => {
    expect(() => validatePricingInput(createMinimalPricingInput({ quantity: -1 }))).toThrow(PricingError);
  });

  it('should throw PricingError for quantity > 999999', () => {
    expect(() => validatePricingInput(createMinimalPricingInput({ quantity: 1_000_000 }))).toThrow(PricingError);
    expect(() => validatePricingInput(createMinimalPricingInput({ quantity: 1_000_000 }))).toThrow('INVALID_QUANTITY');
  });

  it('should accept boundary quantity = 1', () => {
    expect(() => validatePricingInput(createMinimalPricingInput({ quantity: 1 }))).not.toThrow();
  });

  it('should accept boundary quantity = 999999', () => {
    expect(() => validatePricingInput(createMinimalPricingInput({ quantity: 999_999 }))).not.toThrow();
  });
});

describe('validateQuantity', () => {
  it('should not throw for valid quantity', () => {
    expect(() => validateQuantity(100)).not.toThrow();
  });

  it('should throw for quantity < 1', () => {
    expect(() => validateQuantity(0)).toThrow(PricingError);
  });

  it('should throw for quantity > 999999', () => {
    expect(() => validateQuantity(1_000_000)).toThrow(PricingError);
  });

  it('should accept boundary values 1 and 999999', () => {
    expect(() => validateQuantity(1)).not.toThrow();
    expect(() => validateQuantity(999_999)).not.toThrow();
  });
});

describe('validatePageCount', () => {
  it('should not throw for valid page count', () => {
    expect(() => validatePageCount(24)).not.toThrow();
  });

  it('should throw for page count < 4', () => {
    expect(() => validatePageCount(3)).toThrow(PricingError);
    expect(() => validatePageCount(0)).toThrow(PricingError);
  });

  it('should throw for page count > 1000', () => {
    expect(() => validatePageCount(1001)).toThrow(PricingError);
  });

  it('should accept boundary values 4 and 1000', () => {
    expect(() => validatePageCount(4)).not.toThrow();
    expect(() => validatePageCount(1000)).not.toThrow();
  });
});
