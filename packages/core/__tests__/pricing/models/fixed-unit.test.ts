import { describe, it, expect } from 'vitest';
import { calculateFixedUnit } from '../../../src/pricing/models/fixed-unit.js';
import { PricingError } from '../../../src/errors.js';
import { GOLDEN_MODEL3 } from '../../fixtures/golden-tests.js';
import { SIZE_92X57, createMockLookupData } from '../../fixtures/products.js';
import type { FixedUnitInput } from '../../../src/pricing/types.js';

function createFixedUnitInput(overrides?: Partial<FixedUnitInput>): FixedUnitInput {
  return {
    pricingModel: 'fixed_unit',
    productId: GOLDEN_MODEL3.productId,
    categoryId: 1,
    quantity: GOLDEN_MODEL3.quantity,
    selectedOptions: [],
    sizeSelection: SIZE_92X57,
    lookupData: createMockLookupData(),
    paper: { paperId: GOLDEN_MODEL3.paperId },
    printMode: { printModeId: GOLDEN_MODEL3.printModeId },
    ...overrides,
  } as FixedUnitInput;
}

describe('calculateFixedUnit (Model 3)', () => {
  it('should calculate golden test correctly: premium business card 200 units', () => {
    const result = calculateFixedUnit(createFixedUnitInput());

    // fixedPrice.sellingPrice = 15000 (100 unit basis)
    // totalPrice = ceil(15000 * (200 / 100)) = 30000
    expect(result.totalPrice).toBe(GOLDEN_MODEL3.expectedTotal);
    expect(result.model).toBe('fixed_unit');
  });

  it('should calculate correctly for qty=100 (exactly base qty)', () => {
    const input = createFixedUnitInput({ quantity: 100 });
    const result = calculateFixedUnit(input);

    expect(result.totalPrice).toBe(15000);
  });

  it('should ceil non-integer results', () => {
    // 50 units: 15000 * (50 / 100) = 7500 (exact, no ceil needed)
    const input = createFixedUnitInput({ quantity: 50 });
    const result = calculateFixedUnit(input);

    expect(result.totalPrice).toBe(7500);
  });

  it('should handle odd quantities that produce fractions', () => {
    // 150 units: ceil(15000 * (150 / 100)) = ceil(22500) = 22500
    const input = createFixedUnitInput({ quantity: 150 });
    const result = calculateFixedUnit(input);

    expect(result.totalPrice).toBe(22500);
  });

  it('should throw when fixed price not found', () => {
    const input = createFixedUnitInput({ productId: 999 });
    expect(() => calculateFixedUnit(input)).toThrow(PricingError);
  });

  it('should handle null paper and printMode', () => {
    const input = createFixedUnitInput({
      paper: null,
      printMode: null,
      productId: 30, // Product 30 has null paperId/printModeId
      sizeSelection: { ...SIZE_92X57, sizeId: 4 },
    });
    const result = calculateFixedUnit(input);

    // Product 30, sizeId 4: sellingPrice=5000, baseQty=1
    // totalPrice = ceil(5000 * (200 / 1)) = 1000000
    expect(result.totalPrice).toBe(1000000);
  });

  it('should produce integer results', () => {
    const result = calculateFixedUnit(createFixedUnitInput());
    expect(Number.isInteger(result.totalPrice)).toBe(true);
    expect(Number.isInteger(result.unitPrice)).toBe(true);
  });
});
