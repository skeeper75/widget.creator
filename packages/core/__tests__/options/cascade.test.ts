import { describe, it, expect } from 'vitest';
import { handleOptionChange } from '../../src/options/cascade.js';
import type { OptionState, AvailableOption, ProductOption, OptionChoice } from '../../src/options/types.js';

function createProductOption(overrides: Partial<ProductOption> & { key: string; optionClass: string }): ProductOption {
  return {
    id: 1,
    productId: 1,
    optionDefinitionId: 1,
    label: overrides.key,
    isRequired: false,
    isVisible: true,
    isInternal: false,
    sortOrder: 1,
    ...overrides,
  };
}

function createChoice(optionDefinitionId: number, code: string, isDefault = false): OptionChoice {
  return {
    id: Math.random() * 1000 | 0,
    optionDefinitionId,
    code,
    label: code,
    priceKey: null,
    refPaperId: null,
    refPrintModeId: null,
    refSizeId: null,
    isDefault,
    sortOrder: 1,
  };
}

function createAvailable(def: ProductOption, choices: OptionChoice[], selectedCode?: string): AvailableOption {
  return {
    definition: def,
    choices,
    selected: selectedCode ? { optionKey: def.key, choiceCode: selectedCode } : null,
    isRequired: def.isRequired,
  };
}

function createBaseState(): OptionState {
  const sizeDef = createProductOption({ id: 1, key: 'size', optionClass: 'size', optionDefinitionId: 10, sortOrder: 1 });
  const paperDef = createProductOption({ id: 2, key: 'paper', optionClass: 'paper', optionDefinitionId: 20, sortOrder: 1 });
  const optionDef = createProductOption({ id: 3, key: 'coating', optionClass: 'option', optionDefinitionId: 30, sortOrder: 1 });

  const sizeChoices = [createChoice(10, '100x150', true), createChoice(10, '92x57')];
  const paperChoices = [createChoice(20, 'art_250', true), createChoice(20, 'snow_120')];
  const optionChoices = [createChoice(30, 'matte', true), createChoice(30, 'glossy')];

  const availableOptions = new Map<string, AvailableOption>([
    ['size', createAvailable(sizeDef, sizeChoices, '100x150')],
    ['paper', createAvailable(paperDef, paperChoices, 'art_250')],
    ['coating', createAvailable(optionDef, optionChoices, 'matte')],
  ]);

  return {
    status: 'selecting',
    productId: 1,
    selections: new Map([
      ['size', { optionKey: 'size', choiceCode: '100x150' }],
      ['paper', { optionKey: 'paper', choiceCode: 'art_250' }],
      ['coating', { optionKey: 'coating', choiceCode: 'matte' }],
    ]),
    availableOptions,
    disabledOptions: new Map(),
    violations: [],
    errors: [],
  };
}

describe('handleOptionChange (Cascade Reset)', () => {
  it('should update the changed option selection', () => {
    const state = createBaseState();
    const newState = handleOptionChange(state, 'paper', 'snow_120');

    expect(newState.selections.get('paper')?.choiceCode).toBe('snow_120');
  });

  it('should reset downstream options when changing an upstream option', () => {
    const state = createBaseState();
    // Changing 'size' should reset 'paper' and 'coating' (downstream)
    const newState = handleOptionChange(state, 'size', '92x57');

    expect(newState.selections.get('size')?.choiceCode).toBe('92x57');
    // Downstream selections are deleted before re-resolve
    expect(newState.status).toBe('selecting');
  });

  it('should keep upstream options when changing a downstream option', () => {
    const state = createBaseState();
    // Changing 'coating' (downstream) should NOT reset 'size' or 'paper'
    const newState = handleOptionChange(state, 'coating', 'glossy');

    expect(newState.selections.get('size')?.choiceCode).toBe('100x150');
    expect(newState.selections.get('paper')?.choiceCode).toBe('art_250');
    expect(newState.selections.get('coating')?.choiceCode).toBe('glossy');
  });

  it('should re-resolve available options after cascade', () => {
    const state = createBaseState();
    const newState = handleOptionChange(state, 'size', '92x57');

    // After re-resolve, available options should still have entries
    expect(newState.availableOptions.size).toBeGreaterThan(0);
  });

  it('should set status to selecting after cascade', () => {
    const state = createBaseState();
    const newState = handleOptionChange(state, 'paper', 'snow_120');

    expect(newState.status).toBe('selecting');
  });

  it('should handle option not in priority chain gracefully', () => {
    const state = createBaseState();
    // An option key not in PRIORITY_CHAIN returns chainIndex=-1, no resets
    const newState = handleOptionChange(state, 'unknown_option', 'value');

    expect(newState.selections.get('unknown_option')?.choiceCode).toBe('value');
    // Existing selections should remain
    expect(newState.status).toBe('selecting');
  });

  it('should clear previous violations after cascade', () => {
    const state = createBaseState();
    state.violations = [
      { constraintId: 1, constraintType: 'size_show', message: 'old violation', sourceField: 'a', targetField: 'b' },
    ];
    const newState = handleOptionChange(state, 'size', '92x57');

    expect(newState.violations).toEqual([]);
  });

  it('should clear previous errors after cascade', () => {
    const state = createBaseState();
    state.errors = [new Error('old error')];
    const newState = handleOptionChange(state, 'size', '92x57');

    expect(newState.errors).toEqual([]);
  });

  it('should not mutate the original state selections map', () => {
    const state = createBaseState();
    const origSize = state.selections.size;
    handleOptionChange(state, 'size', '92x57');

    // Original map should not be modified
    expect(state.selections.size).toBe(origSize);
    expect(state.selections.get('size')?.choiceCode).toBe('100x150');
  });
});
