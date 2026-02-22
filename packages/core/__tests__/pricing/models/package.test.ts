import { describe, it, expect } from 'vitest';
import { calculatePackage } from '../../../src/pricing/models/package.js';
import { PricingError } from '../../../src/errors.js';
import { GOLDEN_MODEL4 } from '../../fixtures/golden-tests.js';
import { SIZE_100X150, createMockLookupData } from '../../fixtures/products.js';
import type { PackageInput } from '../../../src/pricing/types.js';

function createPackageInput(overrides?: Partial<PackageInput>): PackageInput {
  return {
    pricingModel: 'package',
    productId: GOLDEN_MODEL4.productId,
    categoryId: 1,
    quantity: GOLDEN_MODEL4.quantity,
    selectedOptions: [],
    sizeSelection: SIZE_100X150,
    lookupData: createMockLookupData(),
    printMode: { printModeId: GOLDEN_MODEL4.printModeId },
    pageCount: GOLDEN_MODEL4.pageCount,
    ...overrides,
  } as PackageInput;
}

describe('calculatePackage (Model 4)', () => {
  it('should calculate golden test correctly: postcard book 50 units', () => {
    const result = calculatePackage(createPackageInput());

    // productId=40, sizeId=1, printModeId=1, pageCount=24
    // qty=50 falls in [30,99] tier -> sellingPrice=20000
    expect(result.totalPrice).toBe(GOLDEN_MODEL4.expectedTotal);
    expect(result.model).toBe('package');
  });

  it('should return lowest tier price for small quantities', () => {
    const input = createPackageInput({ quantity: 10 });
    const result = calculatePackage(input);

    expect(result.totalPrice).toBe(25000);
  });

  it('should return highest tier price for large quantities', () => {
    const input = createPackageInput({ quantity: 500 });
    const result = calculatePackage(input);

    expect(result.totalPrice).toBe(15000);
  });

  it('should throw for non-matching pageCount', () => {
    const input = createPackageInput({ pageCount: 48 });
    expect(() => calculatePackage(input)).toThrow(PricingError);
  });

  it('should throw for non-existent product', () => {
    const input = createPackageInput({ productId: 999 });
    expect(() => calculatePackage(input)).toThrow(PricingError);
  });

  it('should produce integer totalPrice', () => {
    const result = calculatePackage(createPackageInput());
    expect(Number.isInteger(result.totalPrice)).toBe(true);
  });
});
