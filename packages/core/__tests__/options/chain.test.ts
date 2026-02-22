import { describe, it, expect } from 'vitest';
import {
  PRIORITY_CHAIN,
  getChainIndex,
  getOptionsForPhase,
  getOptionsAfterIndex,
} from '../../src/options/chain.js';
import type { AvailableOption, ProductOption, OptionChoice } from '../../src/options/types.js';

function makeOption(key: string, optionClass: string, sortOrder = 0): ProductOption {
  return {
    id: 1, productId: 1, optionDefinitionId: 1, key, optionClass,
    label: key, isRequired: false, isVisible: true, isInternal: false, sortOrder,
  };
}

function makeAvailableOption(key: string, optionClass: string): [string, AvailableOption] {
  return [key, {
    definition: makeOption(key, optionClass),
    choices: [],
    selected: null,
    isRequired: false,
  }];
}

describe('PRIORITY_CHAIN', () => {
  it('has exactly 6 phases in correct order', () => {
    expect(PRIORITY_CHAIN).toEqual([
      'jobPreset', 'size', 'paper', 'option', 'color', 'additionalColor',
    ]);
  });
});

describe('getChainIndex', () => {
  it('returns correct index for each phase', () => {
    expect(getChainIndex('jobPreset')).toBe(0);
    expect(getChainIndex('size')).toBe(1);
    expect(getChainIndex('paper')).toBe(2);
    expect(getChainIndex('option')).toBe(3);
    expect(getChainIndex('color')).toBe(4);
    expect(getChainIndex('additionalColor')).toBe(5);
  });

  it('returns -1 for unknown key', () => {
    expect(getChainIndex('unknown')).toBe(-1);
  });
});

describe('getOptionsForPhase', () => {
  it('returns options matching the phase class', () => {
    const options: ProductOption[] = [
      makeOption('paperType', 'paper', 1),
      makeOption('sizeType', 'size', 1),
      makeOption('paperWeight', 'paper', 2),
    ];

    const result = getOptionsForPhase('paper', options);
    expect(result).toHaveLength(2);
    expect(result[0]!.key).toBe('paperType');
    expect(result[1]!.key).toBe('paperWeight');
  });

  it('returns empty array when no options match', () => {
    const result = getOptionsForPhase('color', [makeOption('size', 'size')]);
    expect(result).toEqual([]);
  });

  it('sorts by sortOrder ascending', () => {
    const options: ProductOption[] = [
      makeOption('b', 'paper', 3),
      makeOption('a', 'paper', 1),
      makeOption('c', 'paper', 2),
    ];
    const result = getOptionsForPhase('paper', options);
    expect(result.map(o => o.key)).toEqual(['a', 'c', 'b']);
  });
});

describe('getOptionsAfterIndex', () => {
  it('returns keys of options in later chain phases', () => {
    const available = new Map<string, AvailableOption>([
      makeAvailableOption('jobPreset1', 'jobPreset'),
      makeAvailableOption('size1', 'size'),
      makeAvailableOption('paper1', 'paper'),
      makeAvailableOption('color1', 'color'),
    ]);

    const result = getOptionsAfterIndex(1, available); // after 'size' (index 1)
    expect(result).toContain('paper1');
    expect(result).toContain('color1');
    expect(result).not.toContain('jobPreset1');
    expect(result).not.toContain('size1');
  });

  it('returns empty array for negative index', () => {
    const available = new Map<string, AvailableOption>([
      makeAvailableOption('size1', 'size'),
    ]);
    expect(getOptionsAfterIndex(-1, available)).toEqual([]);
  });

  it('returns empty array for last chain index', () => {
    const available = new Map<string, AvailableOption>([
      makeAvailableOption('addColor', 'additionalColor'),
    ]);
    expect(getOptionsAfterIndex(5, available)).toEqual([]);
  });
});
