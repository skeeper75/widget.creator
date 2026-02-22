import { describe, it, expect } from 'vitest';
import { calculateFormulaCutting } from '../../../src/pricing/models/formula-cutting.js';
import {
  PAPER_ART_250,
  PRINT_MODE_DOUBLE_COLOR,
  SIZE_50X50,
  SIZE_100X150,
  createMockLookupData,
} from '../../fixtures/products.js';
import type { FormulaCuttingInput } from '../../../src/pricing/types.js';

function createFormulaCuttingInput(overrides?: Partial<FormulaCuttingInput>): FormulaCuttingInput {
  return {
    pricingModel: 'formula_cutting',
    productId: 1,
    categoryId: 1,
    quantity: 200,
    selectedOptions: [],
    sizeSelection: SIZE_100X150,
    lookupData: createMockLookupData(),
    paper: PAPER_ART_250,
    printMode: PRINT_MODE_DOUBLE_COLOR,
    specialColors: [],
    coating: null,
    postProcesses: [],
    sheetStandard: 'A3',
    cuttingType: 'half_cut',
    ...overrides,
  } as FormulaCuttingInput;
}

describe('calculateFormulaCutting (Model 2)', () => {
  it('should include cutting cost on top of formula base', () => {
    const input = createFormulaCuttingInput();
    const result = calculateFormulaCutting(input);

    expect(result.model).toBe('formula_cutting');
    expect(result.breakdown.cuttingCost).toBeGreaterThan(0);
  });

  it('should calculate half_cut price correctly', () => {
    const input = createFormulaCuttingInput({ quantity: 50 });
    const result = calculateFormulaCutting(input);

    // half_cut tier for qty 50: unitPrice=80, cuttingCost = 80 * 50 = 4000
    expect(result.breakdown.cuttingCost).toBe(4000);
  });

  it('should calculate full_cut price correctly', () => {
    const input = createFormulaCuttingInput({
      quantity: 50,
      cuttingType: 'full_cut',
    });
    const result = calculateFormulaCutting(input);

    // full_cut tier for qty 50: unitPrice=120, cuttingCost = 120 * 50 = 6000
    expect(result.breakdown.cuttingCost).toBe(6000);
  });

  it('should have totalPrice = base formula + cutting cost', () => {
    const input = createFormulaCuttingInput({ quantity: 50 });
    const result = calculateFormulaCutting(input);

    const expectedCuttingCost = 4000; // half_cut * 50
    const nonCuttingTotal = result.totalPrice - expectedCuttingCost;

    // Non-cutting costs should match formula model with same parameters
    expect(result.breakdown.printCost).toBeGreaterThan(0);
    expect(result.breakdown.paperCost).toBeGreaterThan(0);
    expect(nonCuttingTotal).toBe(result.breakdown.printCost + result.breakdown.paperCost);
  });

  it('should preserve formula breakdown in output', () => {
    const result = calculateFormulaCutting(createFormulaCuttingInput());

    expect(result.breakdown.printCost).toBeGreaterThan(0);
    expect(result.breakdown.paperCost).toBeGreaterThan(0);
  });

  it('should return integer totalPrice', () => {
    const result = calculateFormulaCutting(createFormulaCuttingInput());
    expect(Number.isInteger(result.totalPrice)).toBe(true);
  });
});
