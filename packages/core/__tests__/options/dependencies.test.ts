import { describe, it, expect } from 'vitest';
import { evaluateDependencies, getOptionKey } from '../../src/options/dependencies.js';
import type {
  ProductOption,
  OptionResolutionContext,
  OptionDependency,
  SelectedOption,
  OptionChoice,
} from '../../src/options/types.js';

function makeProductOption(
  overrides: Partial<ProductOption> = {},
): ProductOption {
  return {
    id: 1, productId: 1, optionDefinitionId: 1, key: 'size',
    optionClass: 'size', label: 'Size', isRequired: false,
    isVisible: true, isInternal: false, sortOrder: 0,
    ...overrides,
  };
}

function makeContext(
  overrides: Partial<OptionResolutionContext> = {},
): OptionResolutionContext {
  return {
    productId: 1,
    currentSelections: new Map(),
    productOptions: [],
    optionChoices: [],
    constraints: [],
    dependencies: [],
    ...overrides,
  };
}

describe('evaluateDependencies', () => {
  it('returns visible=true when option has no dependencies', () => {
    const option = makeProductOption();
    const ctx = makeContext();
    const result = evaluateDependencies(option, ctx);
    expect(result.visible).toBe(true);
  });

  it('returns visible=false when parent is not selected (visibility dep)', () => {
    const parent = makeProductOption({ optionDefinitionId: 10, key: 'paper' });
    const child = makeProductOption({ optionDefinitionId: 20, key: 'coating' });
    const dep: OptionDependency = {
      id: 1, productId: 1, parentOptionId: 10, childOptionId: 20,
      parentChoiceId: null, dependencyType: 'visibility',
    };
    const ctx = makeContext({
      productOptions: [parent, child],
      dependencies: [dep],
    });

    const result = evaluateDependencies(child, ctx);
    expect(result.visible).toBe(false);
    expect(result.reason?.type).toBe('PARENT_NOT_SELECTED');
  });

  it('returns visible=true when parent is selected (visibility dep)', () => {
    const parent = makeProductOption({ optionDefinitionId: 10, key: 'paper' });
    const child = makeProductOption({ optionDefinitionId: 20, key: 'coating' });
    const dep: OptionDependency = {
      id: 1, productId: 1, parentOptionId: 10, childOptionId: 20,
      parentChoiceId: null, dependencyType: 'visibility',
    };
    const selections = new Map<string, SelectedOption>([
      ['paper', { optionKey: 'paper', choiceCode: 'ART250', choiceId: 5 }],
    ]);
    const ctx = makeContext({
      productOptions: [parent, child],
      dependencies: [dep],
      currentSelections: selections,
    });

    const result = evaluateDependencies(child, ctx);
    expect(result.visible).toBe(true);
  });

  it('returns visible=false when parent choice does not match (visibility dep)', () => {
    const parent = makeProductOption({ optionDefinitionId: 10, key: 'paper' });
    const child = makeProductOption({ optionDefinitionId: 20, key: 'coating' });
    const dep: OptionDependency = {
      id: 1, productId: 1, parentOptionId: 10, childOptionId: 20,
      parentChoiceId: 99, dependencyType: 'visibility',
    };
    const selections = new Map<string, SelectedOption>([
      ['paper', { optionKey: 'paper', choiceCode: 'ART250', choiceId: 5 }],
    ]);
    const ctx = makeContext({
      productOptions: [parent, child],
      dependencies: [dep],
      currentSelections: selections,
    });

    const result = evaluateDependencies(child, ctx);
    expect(result.visible).toBe(false);
    expect(result.reason?.type).toBe('PARENT_CHOICE_MISMATCH');
  });

  it('returns filteredChoices for choices dependency type', () => {
    const parent = makeProductOption({ optionDefinitionId: 10, key: 'paper' });
    const child = makeProductOption({ optionDefinitionId: 20, key: 'coating' });
    const dep: OptionDependency = {
      id: 1, productId: 1, parentOptionId: 10, childOptionId: 20,
      parentChoiceId: null, dependencyType: 'choices',
    };
    const selections = new Map<string, SelectedOption>([
      ['paper', { optionKey: 'paper', choiceCode: 'ART250', choiceId: 5 }],
    ]);
    const choices: OptionChoice[] = [
      { id: 1, optionDefinitionId: 20, code: 'GLOSS', label: 'Gloss', priceKey: null, refPaperId: null, refPrintModeId: null, refSizeId: null, isDefault: false, sortOrder: 1 },
      { id: 2, optionDefinitionId: 20, code: 'MATT', label: 'Matt', priceKey: null, refPaperId: null, refPrintModeId: null, refSizeId: null, isDefault: false, sortOrder: 2 },
    ];
    const ctx = makeContext({
      productOptions: [parent, child],
      dependencies: [dep],
      currentSelections: selections,
      optionChoices: choices,
    });

    const result = evaluateDependencies(child, ctx);
    expect(result.visible).toBe(true);
    expect(result.filteredChoices).toBeDefined();
    expect(result.filteredChoices).toContain('GLOSS');
    expect(result.filteredChoices).toContain('MATT');
  });

  it('returns visible=true for value dependency type', () => {
    const parent = makeProductOption({ optionDefinitionId: 10, key: 'size' });
    const child = makeProductOption({ optionDefinitionId: 20, key: 'quantity' });
    const dep: OptionDependency = {
      id: 1, productId: 1, parentOptionId: 10, childOptionId: 20,
      parentChoiceId: null, dependencyType: 'value',
    };
    const selections = new Map<string, SelectedOption>([
      ['size', { optionKey: 'size', choiceCode: 'A4' }],
    ]);
    const ctx = makeContext({
      productOptions: [parent, child],
      dependencies: [dep],
      currentSelections: selections,
    });

    const result = evaluateDependencies(child, ctx);
    expect(result.visible).toBe(true);
  });
});

describe('getOptionKey', () => {
  it('returns the key for a matching option definition id', () => {
    const options = [
      makeProductOption({ optionDefinitionId: 10, key: 'paper' }),
      makeProductOption({ optionDefinitionId: 20, key: 'coating' }),
    ];
    expect(getOptionKey(10, options)).toBe('paper');
    expect(getOptionKey(20, options)).toBe('coating');
  });

  it('returns undefined for unknown option definition id', () => {
    const options = [makeProductOption({ optionDefinitionId: 10, key: 'paper' })];
    expect(getOptionKey(999, options)).toBeUndefined();
  });
});
