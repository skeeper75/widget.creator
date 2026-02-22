import { describe, it, expect } from 'vitest';
import { calculateComponent } from '../../../src/pricing/models/component.js';
import {
  PAPER_ART_250,
  PAPER_ART_300,
  PRINT_MODE_DOUBLE_COLOR,
  BINDING_PERFECT,
  SIZE_A5,
  createMockLookupData,
} from '../../fixtures/products.js';
import type { ComponentInput } from '../../../src/pricing/types.js';

function createComponentInput(overrides?: Partial<ComponentInput>): ComponentInput {
  return {
    pricingModel: 'component',
    productId: 50,
    categoryId: 2,
    quantity: 50,
    selectedOptions: [],
    sizeSelection: SIZE_A5,
    lookupData: createMockLookupData(),
    innerBody: {
      paper: PAPER_ART_250,
      printMode: PRINT_MODE_DOUBLE_COLOR,
      pageCount: 100,
      impositionCount: 4,
      sheetStandard: 'A3',
    },
    cover: {
      paper: PAPER_ART_300,
      printMode: PRINT_MODE_DOUBLE_COLOR,
      impositionCount: 4,
      sheetStandard: 'A3',
    },
    binding: { ...BINDING_PERFECT, priceCode: 'perfect_binding' },
    coverCoating: null,
    foilEmboss: null,
    packaging: null,
    ...overrides,
  } as ComponentInput;
}

describe('calculateComponent (Model 5)', () => {
  it('should calculate inner paper + inner print + cover paper + cover print + binding', () => {
    const result = calculateComponent(createComponentInput());

    expect(result.model).toBe('component');
    expect(result.totalPrice).toBeGreaterThan(0);
    expect(result.breakdown.paperCost).toBeGreaterThan(0);
    expect(result.breakdown.printCost).toBeGreaterThan(0);
    expect(result.breakdown.bindingCost).toBeGreaterThan(0);
  });

  it('should calculate binding cost as unitPrice * quantity', () => {
    const result = calculateComponent(createComponentInput());

    // perfect_binding tier for qty=50: [1,50] -> 500
    // bindingCost = 500 * 50 = 25000
    expect(result.breakdown.bindingCost).toBe(25000);
  });

  it('should add cover coating cost when provided', () => {
    const input = createComponentInput({
      coverCoating: { priceCode: 'coating_matte' },
    });
    const result = calculateComponent(input);

    expect(result.breakdown.coatingCost).toBeGreaterThan(0);
  });

  it('should have zero coating cost when coverCoating is null', () => {
    const result = calculateComponent(createComponentInput());
    expect(result.breakdown.coatingCost).toBe(0);
  });

  it('should add foil cost when provided', () => {
    const input = createComponentInput({
      foilEmboss: { foilType: 'gold', width: 50, height: 50 },
    });
    const result = calculateComponent(input);

    // gold 50x50 = 3000
    expect(result.breakdown.foilCost).toBe(3000);
  });

  it('should have zero foil cost when foilEmboss is null', () => {
    const result = calculateComponent(createComponentInput());
    expect(result.breakdown.foilCost).toBe(0);
  });

  it('should add packaging cost when provided', () => {
    const input = createComponentInput({
      packaging: { unitPrice: 100 },
    });
    const result = calculateComponent(input);

    // 100 * 50 = 5000
    expect(result.breakdown.packagingCost).toBe(5000);
  });

  it('should have zero packaging cost when packaging is null', () => {
    const result = calculateComponent(createComponentInput());
    expect(result.breakdown.packagingCost).toBe(0);
  });

  it('should combine paper costs from inner and cover', () => {
    const result = calculateComponent(createComponentInput());

    // paperCost in breakdown is innerPaperCost + coverPaperCost
    expect(result.breakdown.paperCost).toBeGreaterThan(0);
  });

  it('should combine print costs from inner and cover', () => {
    const result = calculateComponent(createComponentInput());

    // printCost in breakdown is innerPrintCost + coverPrintCost
    expect(result.breakdown.printCost).toBeGreaterThan(0);
  });

  it('should produce integer totalPrice', () => {
    const result = calculateComponent(createComponentInput());
    expect(Number.isInteger(result.totalPrice)).toBe(true);
  });

  it('should sum all components correctly', () => {
    const input = createComponentInput({
      coverCoating: { priceCode: 'coating_matte' },
      foilEmboss: { foilType: 'gold', width: 50, height: 50 },
      packaging: { unitPrice: 100 },
    });
    const result = calculateComponent(input);

    const expectedSum = result.breakdown.paperCost
      + result.breakdown.printCost
      + result.breakdown.coatingCost
      + result.breakdown.bindingCost
      + result.breakdown.foilCost
      + result.breakdown.packagingCost;

    expect(result.totalPrice).toBe(Math.floor(expectedSum));
  });
});
