/**
 * Tests for detectCircularDependency function.
 * REQ-N-004: Circular dependency detection for option constraints.
 *
 * Directly imports the pure function - no mocking needed.
 */
import { describe, it, expect } from 'vitest';
import { detectCircularDependency } from '../../src/lib/validations/circular-check';

describe('detectCircularDependency', () => {
  describe('null/undefined edge handling', () => {
    it('returns false when sourceOptionId is null', () => {
      expect(
        detectCircularDependency([], { sourceOptionId: null, targetOptionId: 1 }),
      ).toBe(false);
    });

    it('returns false when targetOptionId is null', () => {
      expect(
        detectCircularDependency([], { sourceOptionId: 1, targetOptionId: null }),
      ).toBe(false);
    });

    it('returns false when both are null', () => {
      expect(
        detectCircularDependency([], { sourceOptionId: null, targetOptionId: null }),
      ).toBe(false);
    });

    it('returns false when sourceOptionId is undefined', () => {
      expect(
        detectCircularDependency([], { sourceOptionId: undefined, targetOptionId: 1 }),
      ).toBe(false);
    });
  });

  describe('self-reference detection', () => {
    it('detects self-referencing constraint (A -> A)', () => {
      expect(
        detectCircularDependency([], { sourceOptionId: 1, targetOptionId: 1 }),
      ).toBe(true);
    });
  });

  describe('no cycle scenarios', () => {
    it('allows simple chain (A -> B)', () => {
      expect(
        detectCircularDependency([], { sourceOptionId: 1, targetOptionId: 2 }),
      ).toBe(false);
    });

    it('allows linear chain (A -> B, B -> C)', () => {
      const existing = [{ sourceOptionId: 1, targetOptionId: 2 }];
      expect(
        detectCircularDependency(existing, { sourceOptionId: 2, targetOptionId: 3 }),
      ).toBe(false);
    });

    it('allows diamond shape (A -> B, A -> C, B -> D, C -> D)', () => {
      const existing = [
        { sourceOptionId: 1, targetOptionId: 2 },
        { sourceOptionId: 1, targetOptionId: 3 },
        { sourceOptionId: 2, targetOptionId: 4 },
      ];
      expect(
        detectCircularDependency(existing, { sourceOptionId: 3, targetOptionId: 4 }),
      ).toBe(false);
    });

    it('allows multiple independent chains', () => {
      const existing = [
        { sourceOptionId: 1, targetOptionId: 2 },
        { sourceOptionId: 3, targetOptionId: 4 },
      ];
      expect(
        detectCircularDependency(existing, { sourceOptionId: 5, targetOptionId: 6 }),
      ).toBe(false);
    });
  });

  describe('cycle detection', () => {
    it('detects simple cycle (A -> B, B -> A)', () => {
      const existing = [{ sourceOptionId: 1, targetOptionId: 2 }];
      expect(
        detectCircularDependency(existing, { sourceOptionId: 2, targetOptionId: 1 }),
      ).toBe(true);
    });

    it('detects 3-node cycle (A -> B, B -> C, C -> A)', () => {
      const existing = [
        { sourceOptionId: 1, targetOptionId: 2 },
        { sourceOptionId: 2, targetOptionId: 3 },
      ];
      expect(
        detectCircularDependency(existing, { sourceOptionId: 3, targetOptionId: 1 }),
      ).toBe(true);
    });

    it('detects 4-node cycle (A -> B -> C -> D -> A)', () => {
      const existing = [
        { sourceOptionId: 1, targetOptionId: 2 },
        { sourceOptionId: 2, targetOptionId: 3 },
        { sourceOptionId: 3, targetOptionId: 4 },
      ];
      expect(
        detectCircularDependency(existing, { sourceOptionId: 4, targetOptionId: 1 }),
      ).toBe(true);
    });

    it('detects cycle in larger graph with non-cycling branches', () => {
      const existing = [
        { sourceOptionId: 1, targetOptionId: 2 },
        { sourceOptionId: 2, targetOptionId: 3 },
        { sourceOptionId: 3, targetOptionId: 4 },
        { sourceOptionId: 5, targetOptionId: 6 }, // Independent branch
      ];
      expect(
        detectCircularDependency(existing, { sourceOptionId: 4, targetOptionId: 2 }),
      ).toBe(true);
    });
  });

  describe('existing edges with null values', () => {
    it('ignores existing edges with null sourceOptionId', () => {
      const existing = [
        { sourceOptionId: null, targetOptionId: 2 },
        { sourceOptionId: 1, targetOptionId: 2 },
      ];
      expect(
        detectCircularDependency(existing, { sourceOptionId: 2, targetOptionId: 3 }),
      ).toBe(false);
    });

    it('ignores existing edges with null targetOptionId', () => {
      const existing = [
        { sourceOptionId: 1, targetOptionId: null },
        { sourceOptionId: 1, targetOptionId: 2 },
      ];
      expect(
        detectCircularDependency(existing, { sourceOptionId: 2, targetOptionId: 3 }),
      ).toBe(false);
    });
  });

  describe('empty graph', () => {
    it('allows any edge in empty graph (no existing constraints)', () => {
      expect(
        detectCircularDependency([], { sourceOptionId: 1, targetOptionId: 2 }),
      ).toBe(false);
    });
  });
});
