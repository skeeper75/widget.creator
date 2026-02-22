import { describe, it, expect } from 'vitest';
import { evaluateConstraints, evaluateSingleConstraint } from '../../src/constraints/evaluator.js';
import type { ConstraintEvalInput } from '../../src/constraints/types.js';
import type { OptionConstraint, SelectedOption } from '../../src/options/types.js';

function makeInput(overrides: Partial<ConstraintEvalInput> = {}): ConstraintEvalInput {
  return {
    productId: 1,
    currentSelections: new Map(),
    constraints: [],
    dependencies: [],
    allChoices: [],
    ...overrides,
  };
}

function makeConstraint(
  constraintType: string,
  overrides: Partial<OptionConstraint> = {},
): OptionConstraint {
  return {
    id: 1, productId: 1, constraintType,
    sourceField: 'size', targetField: 'option',
    operator: 'eq', value: '100x150',
    valueMin: null, valueMax: null, targetValue: 'val',
    priority: 1, isActive: true, description: 'test constraint',
    ...overrides,
  };
}

describe('evaluateConstraints', () => {
  it('returns empty result when no constraints exist', () => {
    const result = evaluateConstraints(makeInput());
    expect(result.availableOptions.size).toBe(0);
    expect(result.disabledOptions.size).toBe(0);
    expect(result.violations).toEqual([]);
    expect(result.evaluationTimeMs).toBeGreaterThanOrEqual(0);
  });

  it('filters constraints by productId and isActive', () => {
    const input = makeInput({
      productId: 1,
      constraints: [
        makeConstraint('size_show', { id: 1, productId: 1, isActive: true }),
        makeConstraint('size_show', { id: 2, productId: 2, isActive: true }), // wrong product
        makeConstraint('size_show', { id: 3, productId: 1, isActive: false }), // inactive
      ],
    });
    const result = evaluateConstraints(input);
    // Only constraint 1 should be evaluated
    // size_show with no size selection returns 'hide'
    expect(result.disabledOptions.size).toBe(1);
  });

  it('sorts constraints by priority ascending', () => {
    const input = makeInput({
      constraints: [
        makeConstraint('size_show', { id: 1, priority: 10, targetField: 'opt_a' }),
        makeConstraint('size_show', { id: 2, priority: 1, targetField: 'opt_b' }),
      ],
    });
    const result = evaluateConstraints(input);
    // Both should be disabled (no size selection), but priority 1 evaluated first
    expect(result.disabledOptions.has('opt_b')).toBe(true);
    expect(result.disabledOptions.has('opt_a')).toBe(true);
  });

  it('applies show action to availableOptions', () => {
    const selections = new Map<string, SelectedOption>([
      ['size', { optionKey: 'size', choiceCode: 'S1', cutWidth: 100, cutHeight: 150 }],
    ]);
    const input = makeInput({
      currentSelections: selections,
      constraints: [
        makeConstraint('size_show', { targetField: 'envelope', targetValue: 'env_a6' }),
      ],
    });
    const result = evaluateConstraints(input);
    expect(result.availableOptions.has('envelope')).toBe(true);
    expect(result.availableOptions.get('envelope')).toContain('env_a6');
  });

  it('applies hide action to disabledOptions', () => {
    const input = makeInput({
      constraints: [
        makeConstraint('size_show', { targetField: 'envelope' }),
      ],
    });
    const result = evaluateConstraints(input);
    expect(result.disabledOptions.has('envelope')).toBe(true);
    expect(result.disabledOptions.get('envelope')?.type).toBe('CONSTRAINT');
  });

  it('applies limit_range action', () => {
    const input = makeInput({
      constraints: [
        makeConstraint('size_range', {
          operator: 'between',
          valueMin: '30x30',
          valueMax: '125x125',
          targetField: 'foilSize',
        }),
      ],
    });
    const result = evaluateConstraints(input);
    expect(result.availableOptions.has('foilSize')).toBe(true);
    const rangeValues = result.availableOptions.get('foilSize');
    expect(rangeValues?.[0]).toContain('range:');
  });

  it('tracks evaluationTimeMs', () => {
    const result = evaluateConstraints(makeInput());
    expect(typeof result.evaluationTimeMs).toBe('number');
    expect(result.evaluationTimeMs).toBeGreaterThanOrEqual(0);
  });
});

describe('evaluateSingleConstraint', () => {
  it('dispatches to size_show handler', () => {
    const constraint = makeConstraint('size_show');
    const input = makeInput();
    const result = evaluateSingleConstraint(constraint, input);
    expect(result.action).toBe('hide'); // no size selected
  });

  it('dispatches to size_range handler', () => {
    const constraint = makeConstraint('size_range', {
      operator: 'between', valueMin: '10x10', valueMax: '50x50',
    });
    const input = makeInput();
    const result = evaluateSingleConstraint(constraint, input);
    expect(result.action).toBe('limit_range');
  });

  it('dispatches to paper_condition handler', () => {
    const constraint = makeConstraint('paper_condition', {
      operator: 'gte', value: '180', sourceField: 'paperType',
    });
    const input = makeInput();
    const result = evaluateSingleConstraint(constraint, input);
    expect(result.action).toBe('disable'); // no paper selected
  });

  it('returns show for unknown constraint type', () => {
    const constraint = makeConstraint('unknown_type');
    const input = makeInput();
    const result = evaluateSingleConstraint(constraint, input);
    expect(result.action).toBe('show');
    expect(result.violated).toBe(false);
  });
});
