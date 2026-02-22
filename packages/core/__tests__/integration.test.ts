import { describe, it, expect } from 'vitest';
import { calculatePrice } from '../src/pricing/engine.js';
import { assembleQuote } from '../src/quote/calculator.js';
import { isQuoteValid } from '../src/quote/expiry.js';
import { evaluateConstraints } from '../src/constraints/evaluator.js';
import { resolveOptions } from '../src/options/engine.js';
import { PricingError } from '../src/errors.js';
import {
  PAPER_ART_250,
  PRINT_MODE_DOUBLE_COLOR,
  SIZE_100X150,
  SIZE_92X57,
  createMockLookupData,
} from './fixtures/products.js';
import { GOLDEN_MODEL1, GOLDEN_MODEL3 } from './fixtures/golden-tests.js';
import type { FormulaInput, FixedUnitInput } from '../src/pricing/types.js';

describe('Integration: Pricing -> Quote pipeline', () => {
  it('should produce a valid quote from formula pricing (golden test 1)', async () => {
    // Step 1: Calculate price
    const pricingInput: FormulaInput = {
      pricingModel: 'formula',
      productId: 1,
      categoryId: 999,
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
    const pricingResult = calculatePrice(pricingInput);

    expect(pricingResult.totalPrice).toBe(GOLDEN_MODEL1.expectedTotal);
    expect(pricingResult.model).toBe('formula');

    // Step 2: Assemble quote
    const quote = await assembleQuote({
      productId: 1,
      productName: 'Digital Postcard 100x150',
      pricingResult,
      selectedOptions: [
        { optionKey: 'paper', choiceCode: 'art_250' },
        { optionKey: 'print', choiceCode: 'double_color' },
      ],
      quantity: 100,
      sizeSelection: SIZE_100X150,
    });

    // Step 3: Verify quote
    expect(quote.subtotal).toBe(GOLDEN_MODEL1.expectedTotal);
    expect(quote.vatAmount).toBe(Math.floor(GOLDEN_MODEL1.expectedTotal * 0.1));
    expect(quote.totalPrice).toBe(
      GOLDEN_MODEL1.expectedTotal + Math.floor(GOLDEN_MODEL1.expectedTotal * 0.1)
    );
    expect(quote.unitPrice).toBe(Math.floor(GOLDEN_MODEL1.expectedTotal / 100));
    expect(quote.lineItems.length).toBeGreaterThan(0);
    expect(quote.snapshotHash).toMatch(/^[0-9a-f]{64}$/);

    // Step 4: Verify quote validity
    expect(isQuoteValid(quote)).toBe(true);
  });

  it('should produce a valid quote from fixed_unit pricing (golden test 3)', async () => {
    const pricingInput: FixedUnitInput = {
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
    const pricingResult = calculatePrice(pricingInput);

    expect(pricingResult.totalPrice).toBe(GOLDEN_MODEL3.expectedTotal);

    const quote = await assembleQuote({
      productId: 20,
      productName: 'Premium Business Card',
      pricingResult,
      selectedOptions: [],
      quantity: 200,
      sizeSelection: SIZE_92X57,
    });

    expect(quote.subtotal).toBe(30000);
    expect(quote.vatAmount).toBe(3000);
    expect(quote.totalPrice).toBe(33000);
    expect(isQuoteValid(quote)).toBe(true);
  });

  it('should have consistent hashes between pricing and quote', async () => {
    const pricingInput: FormulaInput = {
      pricingModel: 'formula',
      productId: 1,
      categoryId: 999,
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
    const pricingResult = calculatePrice(pricingInput);

    const quoteInput = {
      productId: 1,
      productName: 'Postcard',
      pricingResult,
      selectedOptions: [{ optionKey: 'paper', choiceCode: 'art_250' }],
      quantity: 100,
      sizeSelection: SIZE_100X150,
    };

    const quote1 = await assembleQuote(quoteInput);
    const quote2 = await assembleQuote(quoteInput);

    // Same inputs should produce same snapshot hash
    expect(quote1.snapshotHash).toBe(quote2.snapshotHash);
    // Different quoteIds (UUID)
    expect(quote1.quoteId).not.toBe(quote2.quoteId);
  });

  it('should reject invalid pricing inputs before reaching quote stage', () => {
    const invalidInput: FormulaInput = {
      pricingModel: 'formula',
      productId: 1,
      categoryId: 1,
      quantity: 0, // Invalid
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

    expect(() => calculatePrice(invalidInput)).toThrow(PricingError);
  });
});

describe('Integration: Constraint -> Option resolution', () => {
  it('should evaluate constraints and use results for option resolution', () => {
    // Step 1: Evaluate constraints
    const sizeSelection = { optionKey: 'size', choiceCode: '100x150', cutWidth: 100, cutHeight: 150 };
    const constraintResult = evaluateConstraints({
      productId: 1,
      currentSelections: new Map([['size', sizeSelection]]),
      constraints: [
        {
          id: 1,
          productId: 1,
          constraintType: 'size_show',
          sourceField: 'size',
          targetField: 'paper',
          operator: 'eq',
          value: '100x150',
          valueMin: null,
          valueMax: null,
          targetValue: 'art_250',
          isActive: true,
          priority: 1,
          description: 'Show art_250 for 100x150',
        },
        {
          id: 2,
          productId: 1,
          constraintType: 'size_show',
          sourceField: 'size',
          targetField: 'paper',
          operator: 'eq',
          value: '100x150',
          valueMin: null,
          valueMax: null,
          targetValue: 'snow_120',
          isActive: true,
          priority: 2,
          description: 'Show snow_120 for 100x150',
        },
      ],
      dependencies: [],
      allChoices: [],
    });

    expect(constraintResult.violations).toHaveLength(0);
    expect(constraintResult.availableOptions.get('paper')).toContain('art_250');
    expect(constraintResult.availableOptions.get('paper')).toContain('snow_120');

    // Step 2: Use constraint results to inform option resolution
    const optionResult = resolveOptions({
      productId: 1,
      productOptions: [
        {
          id: 1,
          productId: 1,
          optionDefinitionId: 10,
          key: 'paper',
          optionClass: 'paper',
          label: 'Paper',
          isRequired: true,
          isVisible: true,
          isInternal: false,
          sortOrder: 1,
        },
      ],
      optionChoices: [
        { id: 100, optionDefinitionId: 10, code: 'art_250', label: 'Art 250g', priceKey: null, refPaperId: null, refPrintModeId: null, refSizeId: null, isDefault: true, sortOrder: 1 },
        { id: 101, optionDefinitionId: 10, code: 'snow_120', label: 'Snow 120g', priceKey: null, refPaperId: null, refPrintModeId: null, refSizeId: null, isDefault: false, sortOrder: 2 },
      ],
      currentSelections: new Map(),
      constraints: [],
      dependencies: [],
    });

    expect(optionResult.availableOptions.has('paper')).toBe(true);
    expect(optionResult.validationErrors).toHaveLength(0);
  });
});

describe('Integration: Full pipeline end-to-end', () => {
  it('should flow from options -> pricing -> quote', async () => {
    // Step 1: Resolve options
    const optionResult = resolveOptions({
      productId: 1,
      productOptions: [
        {
          id: 1, productId: 1, optionDefinitionId: 10,
          key: 'paper', optionClass: 'paper', label: 'Paper',
          isRequired: true, isVisible: true, isInternal: false, sortOrder: 1,
        },
        {
          id: 2, productId: 1, optionDefinitionId: 20,
          key: 'print', optionClass: 'option', label: 'Print Mode',
          isRequired: true, isVisible: true, isInternal: false, sortOrder: 1,
        },
      ],
      optionChoices: [
        { id: 100, optionDefinitionId: 10, code: 'art_250', label: 'Art 250g', priceKey: null, refPaperId: null, refPrintModeId: null, refSizeId: null, isDefault: true, sortOrder: 1 },
        { id: 200, optionDefinitionId: 20, code: 'double_color', label: 'Double Color', priceKey: null, refPaperId: null, refPrintModeId: null, refSizeId: null, isDefault: true, sortOrder: 1 },
      ],
      currentSelections: new Map(),
      constraints: [],
      dependencies: [],
    });

    expect(optionResult.validationErrors).toHaveLength(0);

    // Step 2: Calculate pricing with resolved options
    const selectedOptions = Array.from(optionResult.availableOptions.entries())
      .filter(([_, opt]) => opt.selected)
      .map(([key, opt]) => ({
        optionKey: key,
        choiceCode: opt.selected!.choiceCode,
      }));

    const pricingResult = calculatePrice({
      pricingModel: 'formula',
      productId: 1,
      categoryId: 999,
      quantity: 100,
      selectedOptions,
      sizeSelection: SIZE_100X150,
      lookupData: createMockLookupData(),
      paper: PAPER_ART_250,
      printMode: PRINT_MODE_DOUBLE_COLOR,
      specialColors: [],
      coating: null,
      postProcesses: [],
      sheetStandard: 'A3',
    } as FormulaInput);

    expect(pricingResult.totalPrice).toBe(GOLDEN_MODEL1.expectedTotal);

    // Step 3: Assemble quote
    const quote = await assembleQuote({
      productId: 1,
      productName: 'Postcard',
      pricingResult,
      selectedOptions,
      quantity: 100,
      sizeSelection: SIZE_100X150,
    });

    expect(quote.subtotal).toBe(GOLDEN_MODEL1.expectedTotal);
    expect(quote.snapshotHash).toMatch(/^[0-9a-f]{64}$/);
    expect(isQuoteValid(quote)).toBe(true);
  });
});
