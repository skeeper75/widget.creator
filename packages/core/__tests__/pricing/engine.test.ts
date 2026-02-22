import { describe, it, expect } from 'vitest';
import { calculatePrice } from '../../src/pricing/engine.js';
import { PricingError } from '../../src/errors.js';
import {
  PAPER_ART_250,
  PRINT_MODE_DOUBLE_COLOR,
  SIZE_100X150,
  SIZE_92X57,
  SIZE_50X50,
  SIZE_A3,
  createMockLookupData,
} from '../fixtures/products.js';
import type { PricingInput, FormulaInput, FixedUnitInput, FixedSizeInput, FixedPerUnitInput, PackageInput } from '../../src/pricing/types.js';

describe('calculatePrice (Engine Dispatcher)', () => {
  it('should dispatch to formula strategy', () => {
    const input: FormulaInput = {
      pricingModel: 'formula',
      productId: 1,
      categoryId: 1,
      quantity: 100,
      selectedOptions: [],
      sizeSelection: SIZE_100X150,
      lookupData: createMockLookupData(),
      paper: PAPER_ART_250,
      printMode: PRINT_MODE_DOUBLE_COLOR,
      specialColors: [],
      coating: null,
      postProcesses: [],
      sheetStandard: 'A3',
    };
    const result = calculatePrice(input);

    expect(result.model).toBe('formula');
    expect(result.totalPrice).toBeGreaterThan(0);
  });

  it('should dispatch to fixed_unit strategy', () => {
    const input: FixedUnitInput = {
      pricingModel: 'fixed_unit',
      productId: 20,
      categoryId: 1,
      quantity: 200,
      selectedOptions: [],
      sizeSelection: SIZE_92X57,
      lookupData: createMockLookupData(),
      paper: { paperId: 1 },
      printMode: { printModeId: 1 },
    };
    const result = calculatePrice(input);

    expect(result.model).toBe('fixed_unit');
    expect(result.totalPrice).toBe(30000);
  });

  it('should dispatch to package strategy', () => {
    const input: PackageInput = {
      pricingModel: 'package',
      productId: 40,
      categoryId: 1,
      quantity: 50,
      selectedOptions: [],
      sizeSelection: SIZE_100X150,
      lookupData: createMockLookupData(),
      printMode: { printModeId: 1 },
      pageCount: 24,
    };
    const result = calculatePrice(input);

    expect(result.model).toBe('package');
    expect(result.totalPrice).toBe(20000);
  });

  it('should dispatch to fixed_size strategy', () => {
    const input: FixedSizeInput = {
      pricingModel: 'fixed_size',
      productId: 30,
      categoryId: 1,
      quantity: 10,
      selectedOptions: [],
      sizeSelection: SIZE_A3,
      lookupData: createMockLookupData(),
      additionalOptions: [],
    };
    const result = calculatePrice(input);

    expect(result.model).toBe('fixed_size');
    expect(result.totalPrice).toBe(50000);
  });

  it('should dispatch to fixed_per_unit strategy', () => {
    const input: FixedPerUnitInput = {
      pricingModel: 'fixed_per_unit',
      productId: 100,
      categoryId: 1,
      quantity: 30,
      selectedOptions: [],
      sizeSelection: SIZE_50X50,
      lookupData: createMockLookupData(),
      processingOptions: [
        { optionKey: 'uv', choiceCode: 'uv', unitPrice: 500 },
      ],
      additionalProducts: [],
    };
    const result = calculatePrice(input);

    expect(result.model).toBe('fixed_per_unit');
    expect(result.totalPrice).toBe(101520);
  });

  it('should throw UNKNOWN_MODEL for invalid pricing model', () => {
    const input = {
      pricingModel: 'nonexistent_model' as any,
      productId: 1,
      categoryId: 1,
      quantity: 100,
      selectedOptions: [],
      sizeSelection: SIZE_100X150,
      lookupData: createMockLookupData(),
    };

    expect(() => calculatePrice(input)).toThrow(PricingError);
    try {
      calculatePrice(input);
    } catch (e) {
      expect((e as PricingError).code).toBe('UNKNOWN_MODEL');
    }
  });

  it('should throw INVALID_QUANTITY for quantity < 1', () => {
    const input: FormulaInput = {
      pricingModel: 'formula',
      productId: 1,
      categoryId: 1,
      quantity: 0,
      selectedOptions: [],
      sizeSelection: SIZE_100X150,
      lookupData: createMockLookupData(),
      paper: PAPER_ART_250,
      printMode: PRINT_MODE_DOUBLE_COLOR,
      specialColors: [],
      coating: null,
      postProcesses: [],
      sheetStandard: 'A3',
    };

    expect(() => calculatePrice(input)).toThrow(PricingError);
  });

  it('should throw INVALID_QUANTITY for quantity > 999999', () => {
    const input: FormulaInput = {
      pricingModel: 'formula',
      productId: 1,
      categoryId: 1,
      quantity: 1000000,
      selectedOptions: [],
      sizeSelection: SIZE_100X150,
      lookupData: createMockLookupData(),
      paper: PAPER_ART_250,
      printMode: PRINT_MODE_DOUBLE_COLOR,
      specialColors: [],
      coating: null,
      postProcesses: [],
      sheetStandard: 'A3',
    };

    expect(() => calculatePrice(input)).toThrow(PricingError);
  });

  it('should include all PricingResult fields', () => {
    const input: FixedUnitInput = {
      pricingModel: 'fixed_unit',
      productId: 20,
      categoryId: 1,
      quantity: 200,
      selectedOptions: [],
      sizeSelection: SIZE_92X57,
      lookupData: createMockLookupData(),
      paper: { paperId: 1 },
      printMode: { printModeId: 1 },
    };
    const result = calculatePrice(input);

    expect(result).toHaveProperty('totalPrice');
    expect(result).toHaveProperty('totalPriceWithVat');
    expect(result).toHaveProperty('unitPrice');
    expect(result).toHaveProperty('breakdown');
    expect(result).toHaveProperty('model');
    expect(result).toHaveProperty('calculatedAt');
  });
});
