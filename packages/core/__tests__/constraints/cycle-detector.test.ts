import { describe, it, expect } from 'vitest';
import { detectCycles } from '../../src/constraints/cycle-detector.js';
import type { OptionDependency } from '../../src/options/types.js';

function makeDep(parentOptionId: number, childOptionId: number): OptionDependency {
  return {
    id: 0, productId: 1, parentOptionId, childOptionId,
    parentChoiceId: null, dependencyType: 'visibility',
  };
}

describe('detectCycles', () => {
  it('returns null for empty dependencies', () => {
    expect(detectCycles([])).toBeNull();
  });

  it('returns null for a linear chain (no cycles)', () => {
    const deps = [
      makeDep(1, 2),
      makeDep(2, 3),
      makeDep(3, 4),
    ];
    expect(detectCycles(deps)).toBeNull();
  });

  it('returns null for a tree structure (no cycles)', () => {
    const deps = [
      makeDep(1, 2),
      makeDep(1, 3),
      makeDep(2, 4),
      makeDep(3, 5),
    ];
    expect(detectCycles(deps)).toBeNull();
  });

  it('detects a simple 2-node cycle', () => {
    const deps = [
      makeDep(1, 2),
      makeDep(2, 1),
    ];
    const result = detectCycles(deps);
    expect(result).not.toBeNull();
    expect(result).toContain('1');
    expect(result).toContain('2');
  });

  it('detects a 3-node cycle', () => {
    const deps = [
      makeDep(1, 2),
      makeDep(2, 3),
      makeDep(3, 1),
    ];
    const result = detectCycles(deps);
    expect(result).not.toBeNull();
    expect(result!.length).toBeGreaterThanOrEqual(2);
  });

  it('detects cycle in mixed graph (some nodes acyclic)', () => {
    const deps = [
      makeDep(1, 2),     // linear
      makeDep(2, 3),     // cycle start
      makeDep(3, 4),
      makeDep(4, 2),     // cycle back to 2
      makeDep(1, 5),     // another linear branch
    ];
    const result = detectCycles(deps);
    expect(result).not.toBeNull();
    // Nodes 2, 3, 4 are in the cycle
    expect(result).toContain('2');
    expect(result).toContain('3');
    expect(result).toContain('4');
    // Node 1 and 5 are not in the cycle
    expect(result).not.toContain('1');
    expect(result).not.toContain('5');
  });

  it('handles self-loop', () => {
    const deps = [
      makeDep(1, 1), // self-reference
    ];
    const result = detectCycles(deps);
    expect(result).not.toBeNull();
    expect(result).toContain('1');
  });

  it('returns string array of cyclic node IDs', () => {
    const deps = [
      makeDep(10, 20),
      makeDep(20, 10),
    ];
    const result = detectCycles(deps);
    expect(result).not.toBeNull();
    result!.forEach(id => {
      expect(typeof id).toBe('string');
    });
  });
});
