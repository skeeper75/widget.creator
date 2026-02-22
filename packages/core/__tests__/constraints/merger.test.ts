import { describe, it, expect } from 'vitest';
import { mergeConstraintLayers } from '../../src/constraints/merger.js';
import type { OptionConstraint } from '../../src/options/types.js';
import type { ImplicitConstraint } from '../../src/constraints/types.js';

function createStarConstraint(overrides?: Partial<OptionConstraint>): OptionConstraint {
  return {
    id: 1,
    productId: 1,
    constraintType: 'size_show',
    sourceField: 'size',
    targetField: 'paper',
    operator: 'eq',
    value: '100x150',
    valueMin: null,
    valueMax: null,
    targetValue: null,
    priority: 10,
    isActive: true,
    description: 'Star constraint',
    ...overrides,
  };
}

function createImplicitConstraint(overrides?: Partial<ImplicitConstraint>): ImplicitConstraint {
  return {
    key: 'size:paper:1',
    sourceField: 'size',
    targetField: 'paper',
    productId: 1,
    operator: 'eq',
    value: '100x150',
    priority: 10,
    isActive: true,
    ...overrides,
  };
}

describe('mergeConstraintLayers', () => {
  it('should return empty result when both inputs are empty', () => {
    const result = mergeConstraintLayers([], []);
    expect(result.constraints).toHaveLength(0);
  });

  it('should include implicit constraints when no star constraints exist', () => {
    const implicit = [createImplicitConstraint()];
    const result = mergeConstraintLayers([], implicit);

    expect(result.constraints).toHaveLength(1);
    expect(result.constraints[0].source).toBe('implicit');
    expect(result.constraints[0].key).toBe('size:paper:1');
  });

  it('should include star constraints when no implicit constraints exist', () => {
    const star = [createStarConstraint()];
    const result = mergeConstraintLayers(star, []);

    expect(result.constraints).toHaveLength(1);
    expect(result.constraints[0].source).toBe('star');
  });

  it('should override implicit with star constraint when they share the same key', () => {
    const implicit = [createImplicitConstraint({
      key: 'size:paper:1',
      value: 'implicit_value',
    })];
    const star = [createStarConstraint({
      sourceField: 'size',
      targetField: 'paper',
      productId: 1,
      value: 'star_value',
    })];

    const result = mergeConstraintLayers(star, implicit);

    // Star override generates key "size:paper:1" which matches implicit key
    expect(result.constraints).toHaveLength(1);
    expect(result.constraints[0].source).toBe('star');
    expect(result.constraints[0].value).toBe('star_value');
  });

  it('should keep both when implicit and star have different keys', () => {
    const implicit = [createImplicitConstraint({
      key: 'size:paper:1',
    })];
    const star = [createStarConstraint({
      sourceField: 'color',
      targetField: 'coating',
      productId: 1,
    })];

    const result = mergeConstraintLayers(star, implicit);
    expect(result.constraints).toHaveLength(2);

    const sources = result.constraints.map(c => c.source);
    expect(sources).toContain('implicit');
    expect(sources).toContain('star');
  });

  it('should handle multiple implicit and multiple star constraints', () => {
    const implicit = [
      createImplicitConstraint({ key: 'size:paper:1' }),
      createImplicitConstraint({ key: 'color:coating:1' }),
    ];
    const star = [
      createStarConstraint({ sourceField: 'size', targetField: 'paper', productId: 1 }),
    ];

    const result = mergeConstraintLayers(star, implicit);
    // "size:paper:1" overridden, "color:coating:1" kept
    expect(result.constraints).toHaveLength(2);
  });

  it('should preserve all fields from implicit constraints', () => {
    const implicit = [createImplicitConstraint({
      key: 'unique:key:1',
      sourceField: 'sourceA',
      targetField: 'targetA',
      productId: 42,
      operator: 'gte',
      value: '180',
      priority: 30,
      isActive: false,
    })];

    const result = mergeConstraintLayers([], implicit);
    const c = result.constraints[0];
    expect(c.source).toBe('implicit');
    expect(c.sourceField).toBe('sourceA');
    expect(c.targetField).toBe('targetA');
    expect(c.productId).toBe(42);
    expect(c.operator).toBe('gte');
    expect(c.value).toBe('180');
    expect(c.priority).toBe(30);
    expect(c.isActive).toBe(false);
  });

  it('should preserve all fields from star constraints', () => {
    const star = [createStarConstraint({
      sourceField: 'foilSize',
      targetField: 'foilOption',
      productId: 5,
      operator: 'between',
      value: null,
      priority: 20,
      isActive: true,
    })];

    const result = mergeConstraintLayers(star, []);
    const c = result.constraints[0];
    expect(c.source).toBe('star');
    expect(c.sourceField).toBe('foilSize');
    expect(c.targetField).toBe('foilOption');
    expect(c.productId).toBe(5);
    expect(c.operator).toBe('between');
    expect(c.value).toBeNull();
    expect(c.priority).toBe(20);
    expect(c.isActive).toBe(true);
  });
});
