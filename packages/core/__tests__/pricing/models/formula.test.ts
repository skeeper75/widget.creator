import { describe, it, expect } from 'vitest';
import { calculateFormula } from '../../../src/pricing/models/formula.js';
import { GOLDEN_MODEL1 } from '../../fixtures/golden-tests.js';
import {
  PAPER_ART_250,
  PRINT_MODE_DOUBLE_COLOR,
  PRINT_MODE_SINGLE_COLOR,
  POST_PROCESS_ROUND_CUT,
  POST_PROCESS_LAMINATION,
  SIZE_100X150,
  createMockLookupData,
} from '../../fixtures/products.js';
import type { FormulaInput } from '../../../src/pricing/types.js';

function createFormulaInput(overrides?: Partial<FormulaInput>): FormulaInput {
  return {
    pricingModel: 'formula',
    productId: 1,
    categoryId: 999, // No matching loss config → uses global (lossRate=0.03, minLossQty=10)
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
    ...overrides,
  } as FormulaInput;
}

describe('calculateFormula (Model 1)', () => {
  it('should calculate golden test correctly: 100x150mm, Art250g, double-sided, 100 units', () => {
    const input = createFormulaInput();
    const result = calculateFormula(input);

    // requiredSheets = ceil(100/8) = 13
    // lossQty = max(ceil(100*0.03), 10) = 10
    // printCost = lookupTier('8', 13, 'A3') * 13 = 1500 * 13 = 19500
    // paperCost = ceil((240/8) * (100+10)) = ceil(30 * 110) = 3300
    // Total = 19500 + 0 + 3300 + 0 + 0 = 22800
    expect(result.breakdown.printCost).toBe(GOLDEN_MODEL1.printCost);
    expect(result.breakdown.paperCost).toBe(GOLDEN_MODEL1.paperCost);
    expect(result.totalPrice).toBe(GOLDEN_MODEL1.expectedTotal);
    expect(result.model).toBe('formula');
  });

  it('should use lookupImposition when impositionCount is null', () => {
    const input = createFormulaInput({
      sizeSelection: { ...SIZE_100X150, impositionCount: null },
    });
    const result = calculateFormula(input);

    // impositionCount should be looked up: 100x150 A3 = 8
    // Same golden test result expected
    expect(result.totalPrice).toBe(GOLDEN_MODEL1.expectedTotal);
  });

  it('should include special color cost when present', () => {
    const input = createFormulaInput({
      specialColors: [{ priceCode: 'spot_white' }],
    });
    const result = calculateFormula(input);

    // requiredSheets = 13
    // spot_white tier for qty 13: [11,20] -> 800
    // specialColorCost = 800 * 13 = 10400
    expect(result.breakdown.specialColorCost).toBe(10400);
    expect(result.totalPrice).toBe(GOLDEN_MODEL1.expectedTotal + 10400);
  });

  it('should include coating cost when present', () => {
    const input = createFormulaInput({
      coating: { priceCode: 'coating_matte' },
    });
    const result = calculateFormula(input);

    // requiredSheets = 13
    // coating_matte tier for qty 13: [1,20] -> 500
    // coatingCost = 500 * 13 = 6500
    expect(result.breakdown.coatingCost).toBe(6500);
    expect(result.totalPrice).toBe(GOLDEN_MODEL1.expectedTotal + 6500);
  });

  it('should calculate per_sheet post-process cost', () => {
    const input = createFormulaInput({
      postProcesses: [POST_PROCESS_ROUND_CUT],
    });
    const result = calculateFormula(input);

    // round_cut tier for requiredSheets=13: [1,50] -> 300
    // postProcessCost = 300 * 13 = 3900
    expect(result.breakdown.postProcessCost).toBe(3900);
  });

  it('should calculate per_unit post-process cost', () => {
    const input = createFormulaInput({
      postProcesses: [POST_PROCESS_LAMINATION],
    });
    const result = calculateFormula(input);

    // lamination tier for qty=100: [1,100] -> 50
    // postProcessCost = 50 * 100 = 5000
    expect(result.breakdown.postProcessCost).toBe(5000);
  });

  it('should produce integer results (no floating point)', () => {
    const input = createFormulaInput({ quantity: 7 });
    const result = calculateFormula(input);

    expect(Number.isInteger(result.totalPrice)).toBe(true);
    expect(Number.isInteger(result.totalPriceWithVat)).toBe(true);
    expect(Number.isInteger(result.unitPrice)).toBe(true);
  });

  it('should floor totalPrice', () => {
    const result = calculateFormula(createFormulaInput());
    expect(result.totalPrice).toBe(Math.floor(result.totalPrice));
  });

  it('should calculate VAT correctly', () => {
    const result = calculateFormula(createFormulaInput());
    expect(result.totalPriceWithVat).toBe(Math.floor(result.totalPrice * 1.1));
  });

  it('should calculate unitPrice correctly', () => {
    const input = createFormulaInput();
    const result = calculateFormula(input);
    expect(result.unitPrice).toBe(Math.floor(result.totalPrice / input.quantity));
  });

  it('should handle quantity=1 (boundary)', () => {
    const input = createFormulaInput({ quantity: 1 });
    const result = calculateFormula(input);

    // requiredSheets = ceil(1/8) = 1
    // lossQty = max(ceil(1*0.03), 10) = 10
    // printCost = lookupTier('8', 1, 'A3') * 1 = 2000 * 1 = 2000
    // paperCost = ceil((240/8) * (1+10)) = ceil(30 * 11) = 330
    expect(result.breakdown.printCost).toBe(2000);
    expect(result.breakdown.paperCost).toBe(330);
    expect(result.totalPrice).toBe(2330);
  });

  it('should handle large quantity (boundary)', () => {
    const input = createFormulaInput({ quantity: 999999 });
    const result = calculateFormula(input);

    expect(result.totalPrice).toBeGreaterThan(0);
    expect(result.model).toBe('formula');
  });

  it('should set calculatedAt timestamp', () => {
    const before = Date.now();
    const result = calculateFormula(createFormulaInput());
    const after = Date.now();

    expect(result.calculatedAt).toBeGreaterThanOrEqual(before);
    expect(result.calculatedAt).toBeLessThanOrEqual(after);
  });
});
