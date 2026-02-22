import { describe, it, expect } from 'vitest';
import { evaluateSizeShow } from '../../../src/constraints/handlers/size-show.js';
import type { OptionConstraint, SelectedOption } from '../../../src/options/types.js';

function makeConstraint(overrides: Partial<OptionConstraint> = {}): OptionConstraint {
  return {
    id: 1, productId: 1, constraintType: 'size_show',
    sourceField: 'size', targetField: 'envelopeOption',
    operator: 'eq', value: '100x150', valueMin: null, valueMax: null,
    targetValue: 'envelope_a6', priority: 1, isActive: true, description: null,
    ...overrides,
  };
}

describe('evaluateSizeShow', () => {
  it('returns hide when no size is selected', () => {
    const result = evaluateSizeShow(makeConstraint(), new Map());
    expect(result.action).toBe('hide');
    expect(result.violated).toBe(false);
  });

  it('returns show when size matches (eq operator)', () => {
    const selections = new Map<string, SelectedOption>([
      ['size', { optionKey: 'size', choiceCode: 'S1', cutWidth: 100, cutHeight: 150 }],
    ]);
    const result = evaluateSizeShow(makeConstraint(), selections);
    expect(result.action).toBe('show');
    expect(result.values).toContain('envelope_a6');
  });

  it('returns hide when size does not match (eq operator)', () => {
    const selections = new Map<string, SelectedOption>([
      ['size', { optionKey: 'size', choiceCode: 'S2', cutWidth: 200, cutHeight: 300 }],
    ]);
    const result = evaluateSizeShow(makeConstraint(), selections);
    expect(result.action).toBe('hide');
  });

  it('returns show when size does not match (neq operator)', () => {
    const selections = new Map<string, SelectedOption>([
      ['size', { optionKey: 'size', choiceCode: 'S2', cutWidth: 200, cutHeight: 300 }],
    ]);
    const constraint = makeConstraint({ operator: 'neq' });
    const result = evaluateSizeShow(constraint, selections);
    expect(result.action).toBe('show');
  });

  it('returns hide when size matches (neq operator)', () => {
    const selections = new Map<string, SelectedOption>([
      ['size', { optionKey: 'size', choiceCode: 'S1', cutWidth: 100, cutHeight: 150 }],
    ]);
    const constraint = makeConstraint({ operator: 'neq' });
    const result = evaluateSizeShow(constraint, selections);
    expect(result.action).toBe('hide');
  });

  it('always returns violated=false', () => {
    const result = evaluateSizeShow(makeConstraint(), new Map());
    expect(result.violated).toBe(false);
  });
});
