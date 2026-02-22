import { describe, it, expect, vi } from 'vitest';
import { filterChoices, getDefaultChoice, getFilteredChoicesByDep } from '../../src/options/filters.js';
import type {
  ProductOption,
  OptionResolutionContext,
  OptionChoice,
  OptionDependency,
  SelectedOption,
} from '../../src/options/types.js';

// Mock the dependencies module
vi.mock('../../src/options/dependencies.js', () => ({
  evaluateDependencies: vi.fn(),
}));

import { evaluateDependencies } from '../../src/options/dependencies.js';
const mockEvaluateDependencies = vi.mocked(evaluateDependencies);

function createOption(overrides?: Partial<ProductOption>): ProductOption {
  return {
    id: 1,
    productId: 1,
    optionDefinitionId: 10,
    key: 'paper',
    optionClass: 'paper',
    label: 'Paper Type',
    isRequired: true,
    isVisible: true,
    isInternal: false,
    sortOrder: 1,
    ...overrides,
  };
}

function createChoice(overrides?: Partial<OptionChoice>): OptionChoice {
  return {
    id: 100,
    optionDefinitionId: 10,
    code: 'art_250',
    label: 'Art Paper 250g',
    priceKey: null,
    refPaperId: null,
    refPrintModeId: null,
    refSizeId: null,
    isDefault: false,
    sortOrder: 1,
    ...overrides,
  };
}

function createCtx(overrides?: Partial<OptionResolutionContext>): OptionResolutionContext {
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

describe('filterChoices', () => {
  it('should return all choices when no dependency restrictions', () => {
    const option = createOption({ optionDefinitionId: 10 });
    const choices = [
      createChoice({ code: 'art_250', sortOrder: 2 }),
      createChoice({ code: 'snow_120', sortOrder: 1 }),
    ];
    const ctx = createCtx({ optionChoices: choices });

    mockEvaluateDependencies.mockReturnValue({ visible: true });

    const result = filterChoices(option, ctx);
    expect(result).toHaveLength(2);
    // Should be sorted by sortOrder
    expect(result[0].code).toBe('snow_120');
    expect(result[1].code).toBe('art_250');
  });

  it('should filter choices when dependency provides filteredChoices', () => {
    const option = createOption({ optionDefinitionId: 10 });
    const choices = [
      createChoice({ code: 'art_250', sortOrder: 2 }),
      createChoice({ code: 'snow_120', sortOrder: 1 }),
      createChoice({ code: 'linen_200', sortOrder: 3 }),
    ];
    const ctx = createCtx({ optionChoices: choices });

    mockEvaluateDependencies.mockReturnValue({
      visible: true,
      filteredChoices: ['art_250', 'linen_200'],
    });

    const result = filterChoices(option, ctx);
    expect(result).toHaveLength(2);
    expect(result.map(c => c.code)).toEqual(['art_250', 'linen_200']);
  });

  it('should only include choices matching the option definition id', () => {
    const option = createOption({ optionDefinitionId: 10 });
    const choices = [
      createChoice({ optionDefinitionId: 10, code: 'art_250', sortOrder: 1 }),
      createChoice({ optionDefinitionId: 99, code: 'other', sortOrder: 1 }),
    ];
    const ctx = createCtx({ optionChoices: choices });

    mockEvaluateDependencies.mockReturnValue({ visible: true });

    const result = filterChoices(option, ctx);
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('art_250');
  });

  it('should return empty array when no choices match option definition', () => {
    const option = createOption({ optionDefinitionId: 10 });
    const ctx = createCtx({ optionChoices: [] });

    mockEvaluateDependencies.mockReturnValue({ visible: true });

    const result = filterChoices(option, ctx);
    expect(result).toHaveLength(0);
  });

  it('should sort filtered choices by sortOrder', () => {
    const option = createOption({ optionDefinitionId: 10 });
    const choices = [
      createChoice({ code: 'c', sortOrder: 3 }),
      createChoice({ code: 'a', sortOrder: 1 }),
      createChoice({ code: 'b', sortOrder: 2 }),
    ];
    const ctx = createCtx({ optionChoices: choices });

    mockEvaluateDependencies.mockReturnValue({
      visible: true,
      filteredChoices: ['c', 'a', 'b'],
    });

    const result = filterChoices(option, ctx);
    expect(result.map(c => c.code)).toEqual(['a', 'b', 'c']);
  });
});

describe('getDefaultChoice', () => {
  it('should return null when no choices available', () => {
    const option = createOption();
    const result = getDefaultChoice(option, []);
    expect(result).toBeNull();
  });

  it('should return the first choice when no default is marked', () => {
    const option = createOption({ key: 'paper' });
    const choices = [
      createChoice({ code: 'art_250', isDefault: false }),
      createChoice({ code: 'snow_120', isDefault: false }),
    ];

    const result = getDefaultChoice(option, choices);
    expect(result).not.toBeNull();
    expect(result!.optionKey).toBe('paper');
    expect(result!.choiceCode).toBe('art_250');
  });

  it('should return the choice marked as default', () => {
    const option = createOption({ key: 'paper' });
    const choices = [
      createChoice({ code: 'art_250', isDefault: false }),
      createChoice({ code: 'snow_120', isDefault: true }),
    ];

    const result = getDefaultChoice(option, choices);
    expect(result).not.toBeNull();
    expect(result!.choiceCode).toBe('snow_120');
  });

  it('should include refPaperId from the chosen choice', () => {
    const option = createOption({ key: 'paper' });
    const choices = [
      createChoice({ code: 'art_250', isDefault: true, refPaperId: 42 }),
    ];

    const result = getDefaultChoice(option, choices);
    expect(result!.refPaperId).toBe(42);
  });

  it('should set refPaperId to undefined when choice has null refPaperId', () => {
    const option = createOption({ key: 'paper' });
    const choices = [
      createChoice({ code: 'art_250', isDefault: true, refPaperId: null }),
    ];

    const result = getDefaultChoice(option, choices);
    expect(result!.refPaperId).toBeUndefined();
  });

  it('should include choiceId from the chosen choice', () => {
    const option = createOption({ key: 'paper' });
    const choices = [
      createChoice({ id: 555, code: 'art_250', isDefault: true }),
    ];

    const result = getDefaultChoice(option, choices);
    expect(result!.choiceId).toBe(555);
  });
});

describe('getFilteredChoicesByDep', () => {
  it('should return empty array when no parent selection', () => {
    const dep: OptionDependency = {
      id: 1,
      productId: 1,
      parentOptionId: 1,
      childOptionId: 10,
      parentChoiceId: null,
      dependencyType: 'choices',
    };
    const ctx = createCtx();

    const result = getFilteredChoicesByDep(dep, undefined, ctx);
    expect(result).toEqual([]);
  });

  it('should return all choice codes when parentChoiceId is null', () => {
    const dep: OptionDependency = {
      id: 1,
      productId: 1,
      parentOptionId: 1,
      childOptionId: 10,
      parentChoiceId: null,
      dependencyType: 'choices',
    };
    const parent: SelectedOption = { optionKey: 'size', choiceCode: '100x150' };
    const choices = [
      createChoice({ optionDefinitionId: 10, code: 'art_250' }),
      createChoice({ optionDefinitionId: 10, code: 'snow_120' }),
    ];
    const ctx = createCtx({ optionChoices: choices });

    const result = getFilteredChoicesByDep(dep, parent, ctx);
    expect(result).toEqual(['art_250', 'snow_120']);
  });

  it('should filter out choices matching parentChoiceId', () => {
    const dep: OptionDependency = {
      id: 1,
      productId: 1,
      parentOptionId: 1,
      childOptionId: 10,
      parentChoiceId: 100,
      dependencyType: 'choices',
    };
    const parent: SelectedOption = { optionKey: 'size', choiceCode: '100x150' };
    const choices = [
      createChoice({ id: 100, optionDefinitionId: 10, code: 'art_250' }),
      createChoice({ id: 200, optionDefinitionId: 10, code: 'snow_120' }),
    ];
    const ctx = createCtx({ optionChoices: choices });

    const result = getFilteredChoicesByDep(dep, parent, ctx);
    expect(result).toEqual(['snow_120']);
  });

  it('should only consider choices matching childOptionId', () => {
    const dep: OptionDependency = {
      id: 1,
      productId: 1,
      parentOptionId: 1,
      childOptionId: 10,
      parentChoiceId: null,
      dependencyType: 'choices',
    };
    const parent: SelectedOption = { optionKey: 'size', choiceCode: '100x150' };
    const choices = [
      createChoice({ optionDefinitionId: 10, code: 'art_250' }),
      createChoice({ optionDefinitionId: 99, code: 'unrelated' }),
    ];
    const ctx = createCtx({ optionChoices: choices });

    const result = getFilteredChoicesByDep(dep, parent, ctx);
    expect(result).toEqual(['art_250']);
  });
});
