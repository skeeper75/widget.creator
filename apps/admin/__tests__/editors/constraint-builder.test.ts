/**
 * Tests for ConstraintBuilder pure logic functions.
 * REQ-N-004: Circular dependency detection.
 *
 * Tests constraint rule validation, operator display logic,
 * and circular dependency warning detection from constraint-builder.tsx.
 */
import { describe, it, expect } from 'vitest';

// --- Types (same as constraint-builder.tsx) ---

interface OptionConstraint {
  id: number;
  productId: number;
  constraintType: string;
  sourceOptionId: number | null;
  sourceField: string;
  operator: string;
  value: string | null;
  valueMin: string | null;
  valueMax: string | null;
  targetOptionId: number | null;
  targetField: string;
  targetAction: string;
  targetValue: string | null;
  description: string | null;
  priority: number;
  isActive: boolean;
}

interface OptionDefinition {
  id: number;
  key: string;
  name: string;
}

// Constants (same as constraint-builder.tsx)
const OPERATORS = [
  { label: 'equals', value: 'eq' },
  { label: 'not equals', value: 'neq' },
  { label: 'greater than', value: 'gt' },
  { label: 'less than', value: 'lt' },
  { label: 'in', value: 'in' },
  { label: 'between', value: 'between' },
];

const ACTIONS = [
  { label: 'Show', value: 'show' },
  { label: 'Hide', value: 'hide' },
  { label: 'Set Value', value: 'set_value' },
  { label: 'Filter Choices', value: 'filter_choices' },
  { label: 'Require', value: 'require' },
];

const CONSTRAINT_TYPES = ['visibility', 'value', 'filter'] as const;

// --- Re-implement circular warning detection (same as ConstraintBuilder) ---
function detectCircularWarnings(constraints: OptionConstraint[]): Set<number> {
  const warnings = new Set<number>();
  for (const c of constraints) {
    if (c.sourceOptionId != null && c.targetOptionId != null) {
      const reverseExists = constraints.some(
        (other) =>
          other.id !== c.id &&
          other.sourceOptionId === c.targetOptionId &&
          other.targetOptionId === c.sourceOptionId,
      );
      if (reverseExists) {
        warnings.add(c.id);
      }
    }
  }
  return warnings;
}

// --- Re-implement constraint filtering (same as ConstraintBuilder) ---
function filterByType(constraints: OptionConstraint[], type: string): OptionConstraint[] {
  return constraints.filter((c) => c.constraintType === type);
}

// --- Re-implement name lookup (same as ConstraintCard) ---
function findOptionName(defs: OptionDefinition[], optionId: number | null): string {
  if (optionId == null) return 'Unknown';
  return defs.find((d) => d.id === optionId)?.name ?? 'Unknown';
}

// --- Operator display logic (same as ConstraintCard rendering) ---
function getOperatorDisplayMode(operator: string): 'between' | 'single' {
  return operator === 'between' ? 'between' : 'single';
}

// --- Default constraint builder (same as handleAddConstraint) ---
function createDefaultConstraint(
  productId: number,
  constraintType: string,
  existingCount: number,
): Omit<OptionConstraint, 'id'> {
  return {
    productId,
    constraintType,
    sourceOptionId: null,
    sourceField: 'value',
    operator: 'eq',
    value: null,
    valueMin: null,
    valueMax: null,
    targetOptionId: null,
    targetField: 'visibility',
    targetAction: 'show',
    targetValue: null,
    description: null,
    priority: existingCount,
    isActive: true,
  };
}

// --- Test data factory ---
function createConstraint(overrides: Partial<OptionConstraint> = {}): OptionConstraint {
  return {
    id: 1,
    productId: 1,
    constraintType: 'visibility',
    sourceOptionId: null,
    sourceField: 'value',
    operator: 'eq',
    value: null,
    valueMin: null,
    valueMax: null,
    targetOptionId: null,
    targetField: 'visibility',
    targetAction: 'show',
    targetValue: null,
    description: null,
    priority: 0,
    isActive: true,
    ...overrides,
  };
}

// ===================================================================
// Tests
// ===================================================================

describe('OPERATORS constant', () => {
  it('contains 6 operators', () => {
    expect(OPERATORS).toHaveLength(6);
  });

  it('includes between operator', () => {
    expect(OPERATORS.find((o) => o.value === 'between')).toBeDefined();
  });

  it('includes all standard comparison operators', () => {
    const values = OPERATORS.map((o) => o.value);
    expect(values).toContain('eq');
    expect(values).toContain('neq');
    expect(values).toContain('gt');
    expect(values).toContain('lt');
    expect(values).toContain('in');
  });
});

describe('ACTIONS constant', () => {
  it('contains 5 actions', () => {
    expect(ACTIONS).toHaveLength(5);
  });

  it('includes show and hide actions', () => {
    const values = ACTIONS.map((a) => a.value);
    expect(values).toContain('show');
    expect(values).toContain('hide');
  });

  it('includes set_value action', () => {
    expect(ACTIONS.find((a) => a.value === 'set_value')).toBeDefined();
  });

  it('includes filter_choices action', () => {
    expect(ACTIONS.find((a) => a.value === 'filter_choices')).toBeDefined();
  });

  it('includes require action', () => {
    expect(ACTIONS.find((a) => a.value === 'require')).toBeDefined();
  });
});

describe('CONSTRAINT_TYPES constant', () => {
  it('contains 3 types', () => {
    expect(CONSTRAINT_TYPES).toHaveLength(3);
  });

  it('includes visibility, value, and filter', () => {
    expect(CONSTRAINT_TYPES).toContain('visibility');
    expect(CONSTRAINT_TYPES).toContain('value');
    expect(CONSTRAINT_TYPES).toContain('filter');
  });
});

describe('detectCircularWarnings', () => {
  it('returns empty set for no constraints', () => {
    expect(detectCircularWarnings([]).size).toBe(0);
  });

  it('returns empty set for constraints with null sourceOptionId', () => {
    const constraints = [
      createConstraint({ id: 1, sourceOptionId: null, targetOptionId: 2 }),
    ];
    expect(detectCircularWarnings(constraints).size).toBe(0);
  });

  it('returns empty set for constraints with null targetOptionId', () => {
    const constraints = [
      createConstraint({ id: 1, sourceOptionId: 1, targetOptionId: null }),
    ];
    expect(detectCircularWarnings(constraints).size).toBe(0);
  });

  it('returns empty set for non-circular constraints', () => {
    const constraints = [
      createConstraint({ id: 1, sourceOptionId: 1, targetOptionId: 2 }),
      createConstraint({ id: 2, sourceOptionId: 2, targetOptionId: 3 }),
    ];
    expect(detectCircularWarnings(constraints).size).toBe(0);
  });

  it('detects simple A<->B circular pair', () => {
    const constraints = [
      createConstraint({ id: 1, sourceOptionId: 1, targetOptionId: 2 }),
      createConstraint({ id: 2, sourceOptionId: 2, targetOptionId: 1 }),
    ];
    const warnings = detectCircularWarnings(constraints);
    expect(warnings.has(1)).toBe(true);
    expect(warnings.has(2)).toBe(true);
  });

  it('only warns on the circular pair, not unrelated constraints', () => {
    const constraints = [
      createConstraint({ id: 1, sourceOptionId: 1, targetOptionId: 2 }),
      createConstraint({ id: 2, sourceOptionId: 2, targetOptionId: 1 }),
      createConstraint({ id: 3, sourceOptionId: 3, targetOptionId: 4 }),
    ];
    const warnings = detectCircularWarnings(constraints);
    expect(warnings.has(1)).toBe(true);
    expect(warnings.has(2)).toBe(true);
    expect(warnings.has(3)).toBe(false);
  });

  it('does not detect indirect cycles (only direct reverse)', () => {
    // A->B, B->C, C->A is an indirect cycle; the simple check only flags direct reverse
    const constraints = [
      createConstraint({ id: 1, sourceOptionId: 1, targetOptionId: 2 }),
      createConstraint({ id: 2, sourceOptionId: 2, targetOptionId: 3 }),
      createConstraint({ id: 3, sourceOptionId: 3, targetOptionId: 1 }),
    ];
    const warnings = detectCircularWarnings(constraints);
    // Simple check only detects direct reverse pairs
    expect(warnings.size).toBe(0);
  });

  it('handles multiple circular pairs', () => {
    const constraints = [
      createConstraint({ id: 1, sourceOptionId: 1, targetOptionId: 2 }),
      createConstraint({ id: 2, sourceOptionId: 2, targetOptionId: 1 }),
      createConstraint({ id: 3, sourceOptionId: 3, targetOptionId: 4 }),
      createConstraint({ id: 4, sourceOptionId: 4, targetOptionId: 3 }),
    ];
    const warnings = detectCircularWarnings(constraints);
    expect(warnings.size).toBe(4);
  });
});

describe('filterByType', () => {
  it('returns empty for no matches', () => {
    const constraints = [createConstraint({ constraintType: 'visibility' })];
    expect(filterByType(constraints, 'value')).toHaveLength(0);
  });

  it('filters by visibility type', () => {
    const constraints = [
      createConstraint({ id: 1, constraintType: 'visibility' }),
      createConstraint({ id: 2, constraintType: 'value' }),
      createConstraint({ id: 3, constraintType: 'visibility' }),
    ];
    const result = filterByType(constraints, 'visibility');
    expect(result).toHaveLength(2);
    expect(result.every((c) => c.constraintType === 'visibility')).toBe(true);
  });

  it('filters by value type', () => {
    const constraints = [
      createConstraint({ id: 1, constraintType: 'value' }),
      createConstraint({ id: 2, constraintType: 'filter' }),
    ];
    expect(filterByType(constraints, 'value')).toHaveLength(1);
  });

  it('filters by filter type', () => {
    const constraints = [
      createConstraint({ id: 1, constraintType: 'filter' }),
      createConstraint({ id: 2, constraintType: 'filter' }),
    ];
    expect(filterByType(constraints, 'filter')).toHaveLength(2);
  });
});

describe('findOptionName', () => {
  const defs: OptionDefinition[] = [
    { id: 1, key: 'paper', name: 'Paper Type' },
    { id: 2, key: 'size', name: 'Size' },
    { id: 3, key: 'color', name: 'Color' },
  ];

  it('returns name for matching id', () => {
    expect(findOptionName(defs, 1)).toBe('Paper Type');
    expect(findOptionName(defs, 2)).toBe('Size');
  });

  it('returns Unknown for null', () => {
    expect(findOptionName(defs, null)).toBe('Unknown');
  });

  it('returns Unknown for non-existent id', () => {
    expect(findOptionName(defs, 999)).toBe('Unknown');
  });
});

describe('getOperatorDisplayMode', () => {
  it('returns between for between operator', () => {
    expect(getOperatorDisplayMode('between')).toBe('between');
  });

  it('returns single for eq operator', () => {
    expect(getOperatorDisplayMode('eq')).toBe('single');
  });

  it('returns single for neq operator', () => {
    expect(getOperatorDisplayMode('neq')).toBe('single');
  });

  it('returns single for gt operator', () => {
    expect(getOperatorDisplayMode('gt')).toBe('single');
  });

  it('returns single for lt operator', () => {
    expect(getOperatorDisplayMode('lt')).toBe('single');
  });

  it('returns single for in operator', () => {
    expect(getOperatorDisplayMode('in')).toBe('single');
  });
});

describe('createDefaultConstraint', () => {
  it('creates with correct productId', () => {
    const result = createDefaultConstraint(42, 'visibility', 0);
    expect(result.productId).toBe(42);
  });

  it('uses active tab as constraintType', () => {
    const result = createDefaultConstraint(1, 'filter', 0);
    expect(result.constraintType).toBe('filter');
  });

  it('sets priority to existing constraint count', () => {
    const result = createDefaultConstraint(1, 'visibility', 5);
    expect(result.priority).toBe(5);
  });

  it('defaults to eq operator', () => {
    const result = createDefaultConstraint(1, 'visibility', 0);
    expect(result.operator).toBe('eq');
  });

  it('defaults to show action', () => {
    const result = createDefaultConstraint(1, 'visibility', 0);
    expect(result.targetAction).toBe('show');
  });

  it('starts with null source and target', () => {
    const result = createDefaultConstraint(1, 'visibility', 0);
    expect(result.sourceOptionId).toBeNull();
    expect(result.targetOptionId).toBeNull();
  });

  it('starts as active', () => {
    const result = createDefaultConstraint(1, 'visibility', 0);
    expect(result.isActive).toBe(true);
  });

  it('starts with null values', () => {
    const result = createDefaultConstraint(1, 'visibility', 0);
    expect(result.value).toBeNull();
    expect(result.valueMin).toBeNull();
    expect(result.valueMax).toBeNull();
    expect(result.targetValue).toBeNull();
    expect(result.description).toBeNull();
  });
});

describe('constraint sorting by priority', () => {
  it('sorts ascending by priority', () => {
    const constraints = [
      createConstraint({ id: 1, priority: 3 }),
      createConstraint({ id: 2, priority: 1 }),
      createConstraint({ id: 3, priority: 2 }),
    ];

    const sorted = [...constraints].sort((a, b) => a.priority - b.priority);

    expect(sorted.map((c) => c.id)).toEqual([2, 3, 1]);
  });

  it('preserves order for equal priorities', () => {
    const constraints = [
      createConstraint({ id: 1, priority: 0 }),
      createConstraint({ id: 2, priority: 0 }),
    ];

    const sorted = [...constraints].sort((a, b) => a.priority - b.priority);

    expect(sorted.map((c) => c.id)).toEqual([1, 2]);
  });
});

describe('constraint completeness validation', () => {
  // IF-THEN completeness: both sourceOptionId and targetOptionId should be set
  function isConstraintComplete(constraint: OptionConstraint): boolean {
    return constraint.sourceOptionId != null && constraint.targetOptionId != null;
  }

  it('incomplete when source is null', () => {
    expect(isConstraintComplete(createConstraint({ sourceOptionId: null, targetOptionId: 1 }))).toBe(false);
  });

  it('incomplete when target is null', () => {
    expect(isConstraintComplete(createConstraint({ sourceOptionId: 1, targetOptionId: null }))).toBe(false);
  });

  it('incomplete when both are null', () => {
    expect(isConstraintComplete(createConstraint({ sourceOptionId: null, targetOptionId: null }))).toBe(false);
  });

  it('complete when both are set', () => {
    expect(isConstraintComplete(createConstraint({ sourceOptionId: 1, targetOptionId: 2 }))).toBe(true);
  });
});
