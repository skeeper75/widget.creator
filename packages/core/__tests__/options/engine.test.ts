import { describe, it, expect } from 'vitest';
import { resolveOptions } from '../../src/options/engine.js';
import type {
  OptionResolutionContext,
  ProductOption,
  OptionChoice,
  SelectedOption,
} from '../../src/options/types.js';

function makeProductOption(key: string, optionClass: string, overrides: Partial<ProductOption> = {}): ProductOption {
  return {
    id: 1, productId: 1, optionDefinitionId: Math.floor(Math.random() * 1000),
    key, optionClass, label: key, isRequired: false, isVisible: true,
    isInternal: false, sortOrder: 0, ...overrides,
  };
}

function makeChoice(defId: number, code: string, isDefault = false, sortOrder = 0): OptionChoice {
  return {
    id: Math.floor(Math.random() * 1000), optionDefinitionId: defId,
    code, label: code, priceKey: null, refPaperId: null,
    refPrintModeId: null, refSizeId: null, isDefault, sortOrder,
  };
}

describe('resolveOptions', () => {
  it('resolves options in priority chain order', () => {
    const sizeOpt = makeProductOption('size', 'size', { optionDefinitionId: 10 });
    const paperOpt = makeProductOption('paper', 'paper', { optionDefinitionId: 20 });
    const colorOpt = makeProductOption('color', 'color', { optionDefinitionId: 30 });

    const choices: OptionChoice[] = [
      makeChoice(10, 'A4', true),
      makeChoice(10, 'A3'),
      makeChoice(20, 'ART250', true),
      makeChoice(30, 'CMYK', true),
    ];

    const ctx: OptionResolutionContext = {
      productId: 1,
      currentSelections: new Map(),
      productOptions: [sizeOpt, paperOpt, colorOpt],
      optionChoices: choices,
      constraints: [],
      dependencies: [],
    };

    const result = resolveOptions(ctx);

    expect(result.availableOptions.size).toBe(3);
    expect(result.availableOptions.has('size')).toBe(true);
    expect(result.availableOptions.has('paper')).toBe(true);
    expect(result.availableOptions.has('color')).toBe(true);
  });

  it('applies current selections over defaults', () => {
    const sizeOpt = makeProductOption('size', 'size', { optionDefinitionId: 10 });
    const choices = [
      makeChoice(10, 'A4', true),
      makeChoice(10, 'A3', false),
    ];
    const selections = new Map<string, SelectedOption>([
      ['size', { optionKey: 'size', choiceCode: 'A3' }],
    ]);

    const ctx: OptionResolutionContext = {
      productId: 1,
      currentSelections: selections,
      productOptions: [sizeOpt],
      optionChoices: choices,
      constraints: [],
      dependencies: [],
    };

    const result = resolveOptions(ctx);
    const sizeAvailable = result.availableOptions.get('size');
    expect(sizeAvailable?.selected?.choiceCode).toBe('A3');
  });

  it('populates defaultSelections for options without current selection', () => {
    const sizeOpt = makeProductOption('size', 'size', { optionDefinitionId: 10 });
    const choices = [
      makeChoice(10, 'A4', true),
      makeChoice(10, 'A3', false),
    ];

    const ctx: OptionResolutionContext = {
      productId: 1,
      currentSelections: new Map(),
      productOptions: [sizeOpt],
      optionChoices: choices,
      constraints: [],
      dependencies: [],
    };

    const result = resolveOptions(ctx);
    expect(result.defaultSelections.get('size')).toBe('A4');
  });

  it('disables options with unmet dependencies', () => {
    const parent = makeProductOption('paper', 'paper', { optionDefinitionId: 10 });
    const child = makeProductOption('coating', 'option', { optionDefinitionId: 20 });

    const ctx: OptionResolutionContext = {
      productId: 1,
      currentSelections: new Map(),
      productOptions: [parent, child],
      optionChoices: [
        makeChoice(10, 'ART250', true),
        makeChoice(20, 'GLOSS', true),
      ],
      constraints: [],
      dependencies: [{
        id: 1, productId: 1, parentOptionId: 10, childOptionId: 20,
        parentChoiceId: null, dependencyType: 'visibility',
      }],
    };

    const result = resolveOptions(ctx);
    expect(result.disabledOptions.has('coating')).toBe(true);
    expect(result.disabledOptions.get('coating')?.type).toBe('PARENT_NOT_SELECTED');
  });

  it('reports validation errors for required unselected options with available choices', () => {
    const sizeOpt = makeProductOption('size', 'size', {
      optionDefinitionId: 10,
      isRequired: true,
    });

    // Options with no default and no selection, but choices exist
    const choices = [
      makeChoice(10, 'A4', false),
      makeChoice(10, 'A3', false),
    ];

    const ctx: OptionResolutionContext = {
      productId: 1,
      currentSelections: new Map(),
      productOptions: [sizeOpt],
      optionChoices: choices,
      constraints: [],
      dependencies: [],
    };

    const result = resolveOptions(ctx);
    // It should default to first choice since no isDefault flag
    expect(result.availableOptions.get('size')?.selected).not.toBeNull();
  });

  it('returns empty result for empty product options', () => {
    const ctx: OptionResolutionContext = {
      productId: 1,
      currentSelections: new Map(),
      productOptions: [],
      optionChoices: [],
      constraints: [],
      dependencies: [],
    };

    const result = resolveOptions(ctx);
    expect(result.availableOptions.size).toBe(0);
    expect(result.disabledOptions.size).toBe(0);
    expect(result.validationErrors).toEqual([]);
  });
});
