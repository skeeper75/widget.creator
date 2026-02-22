import { describe, it, expect } from 'vitest';
import { evaluateSizeRange } from '../../../src/constraints/handlers/size-range.js';
import { ConstraintError } from '../../../src/errors.js';
import type { OptionConstraint, SelectedOption } from '../../../src/options/types.js';

function makeConstraint(overrides: Partial<OptionConstraint> = {}): OptionConstraint {
  return {
    id: 1, productId: 1, constraintType: 'size_range',
    sourceField: 'size', targetField: 'foilSize',
    operator: 'between', value: null,
    valueMin: '30x30', valueMax: '125x125',
    targetValue: null, priority: 1, isActive: true, description: null,
    ...overrides,
  };
}

describe('evaluateSizeRange', () => {
  it('returns limit_range with correct min/max', () => {
    const result = evaluateSizeRange(makeConstraint(), new Map());
    expect(result.action).toBe('limit_range');
    expect(result.min).toEqual({ width: 30, height: 30 });
    expect(result.max).toEqual({ width: 125, height: 125 });
  });

  it('handles asymmetric size ranges', () => {
    const constraint = makeConstraint({ valueMin: '20x40', valueMax: '100x200' });
    const result = evaluateSizeRange(constraint, new Map());
    expect(result.min).toEqual({ width: 20, height: 40 });
    expect(result.max).toEqual({ width: 100, height: 200 });
  });

  it('throws ConstraintError for non-between operator', () => {
    const constraint = makeConstraint({ operator: 'eq' });
    expect(() => evaluateSizeRange(constraint, new Map())).toThrow(ConstraintError);
  });

  it('throws ConstraintError with INVALID_OPERATOR code', () => {
    const constraint = makeConstraint({ operator: 'eq' });
    try {
      evaluateSizeRange(constraint, new Map());
    } catch (e) {
      expect((e as ConstraintError).code).toBe('INVALID_OPERATOR');
    }
  });

  it('always returns violated=false', () => {
    const result = evaluateSizeRange(makeConstraint(), new Map());
    expect(result.violated).toBe(false);
  });
});
