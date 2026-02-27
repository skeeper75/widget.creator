/**
 * Tests for SPEC-WA-001 Step 2 — option reorder business logic.
 *
 * Pure function tests (no DB required):
 * - computeDisplayOrders: given an ordered array of IDs, compute displayOrder updates
 * - validateReorderIds: validate that reorder IDs are unique and non-empty
 *
 * Follows the established inline pattern for tRPC business logic tests.
 */
import { describe, it, expect } from 'vitest';

// ─── Pure business logic helpers (same as router implementation) ─────────────

/**
 * Given an ordered list of productOption IDs, compute the displayOrder update
 * objects. Array index becomes the displayOrder value (0-based).
 *
 * Example: [3, 1, 2] → [{id: 3, displayOrder: 0}, {id: 1, displayOrder: 1}, {id: 2, displayOrder: 2}]
 */
function computeDisplayOrders(orderedIds: number[]): { id: number; displayOrder: number }[] {
  return orderedIds.map((id, index) => ({ id, displayOrder: index }));
}

/**
 * Validate that reorder IDs are non-empty and all unique.
 */
function validateReorderIds(orderedIds: number[]): { valid: boolean; reason?: string } {
  if (orderedIds.length === 0) {
    return { valid: false, reason: 'orderedIds must not be empty' };
  }
  const uniqueIds = new Set(orderedIds);
  if (uniqueIds.size !== orderedIds.length) {
    return { valid: false, reason: 'orderedIds must contain unique IDs' };
  }
  return { valid: true };
}

/**
 * Merge previous order with new order: items not in orderedIds retain their old order.
 * Used for partial reorder scenarios.
 */
function mergeDisplayOrders(
  allIds: number[],
  orderedIds: number[],
): { id: number; displayOrder: number }[] {
  const newOrderSet = new Set(orderedIds);
  const reordered = computeDisplayOrders(orderedIds);

  const maxNewOrder = orderedIds.length;
  const nonReordered = allIds
    .filter((id) => !newOrderSet.has(id))
    .map((id, index) => ({ id, displayOrder: maxNewOrder + index }));

  return [...reordered, ...nonReordered];
}

// ─── computeDisplayOrders ────────────────────────────────────────────────────

describe('computeDisplayOrders — basic reorder', () => {
  it('computes displayOrder from array index (0-based)', () => {
    const result = computeDisplayOrders([3, 1, 2]);

    expect(result).toEqual([
      { id: 3, displayOrder: 0 },
      { id: 1, displayOrder: 1 },
      { id: 2, displayOrder: 2 },
    ]);
  });

  it('handles single item', () => {
    const result = computeDisplayOrders([5]);

    expect(result).toEqual([{ id: 5, displayOrder: 0 }]);
  });

  it('handles empty array', () => {
    const result = computeDisplayOrders([]);

    expect(result).toEqual([]);
  });

  it('preserves original order as displayOrder values', () => {
    const ids = [10, 20, 30, 40];
    const result = computeDisplayOrders(ids);

    ids.forEach((id, index) => {
      expect(result[index]).toEqual({ id, displayOrder: index });
    });
  });

  it('first item always gets displayOrder 0', () => {
    const result = computeDisplayOrders([99, 1, 50]);

    expect(result[0].displayOrder).toBe(0);
    expect(result[0].id).toBe(99);
  });

  it('last item gets displayOrder equal to length - 1', () => {
    const ids = [3, 1, 2, 5, 4];
    const result = computeDisplayOrders(ids);

    expect(result[4].displayOrder).toBe(4);
  });
});

// ─── validateReorderIds ──────────────────────────────────────────────────────

describe('validateReorderIds — validation', () => {
  it('accepts valid unique ids', () => {
    const result = validateReorderIds([1, 2, 3]);

    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('accepts single id', () => {
    const result = validateReorderIds([42]);

    expect(result.valid).toBe(true);
  });

  it('rejects empty array', () => {
    const result = validateReorderIds([]);

    expect(result.valid).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it('rejects duplicate ids', () => {
    const result = validateReorderIds([1, 2, 1]);

    expect(result.valid).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it('rejects all same ids', () => {
    const result = validateReorderIds([5, 5, 5]);

    expect(result.valid).toBe(false);
  });
});

// ─── mergeDisplayOrders ──────────────────────────────────────────────────────

describe('mergeDisplayOrders — partial reorder', () => {
  it('reordered ids come first with correct displayOrder', () => {
    const allIds = [1, 2, 3, 4, 5];
    const orderedIds = [3, 1, 2];

    const result = mergeDisplayOrders(allIds, orderedIds);

    const reorderedPart = result.filter((r) => [3, 1, 2].includes(r.id));
    expect(reorderedPart).toEqual(
      expect.arrayContaining([
        { id: 3, displayOrder: 0 },
        { id: 1, displayOrder: 1 },
        { id: 2, displayOrder: 2 },
      ]),
    );
  });

  it('non-reordered ids get orders starting after reordered', () => {
    const allIds = [1, 2, 3, 4, 5];
    const orderedIds = [3, 1, 2];

    const result = mergeDisplayOrders(allIds, orderedIds);

    const nonReordered = result.filter((r) => [4, 5].includes(r.id));
    nonReordered.forEach((item) => {
      expect(item.displayOrder).toBeGreaterThanOrEqual(3);
    });
  });

  it('all items are represented in result', () => {
    const allIds = [1, 2, 3];
    const orderedIds = [2, 1, 3];

    const result = mergeDisplayOrders(allIds, orderedIds);

    const resultIds = result.map((r) => r.id).sort();
    expect(resultIds).toEqual([1, 2, 3]);
  });

  it('full reorder produces same result as computeDisplayOrders', () => {
    const allIds = [1, 2, 3];
    const orderedIds = [3, 1, 2];

    const merged = mergeDisplayOrders(allIds, orderedIds);
    const computed = computeDisplayOrders(orderedIds);

    // All orderedIds should match
    orderedIds.forEach((id, index) => {
      const mergedItem = merged.find((m) => m.id === id);
      expect(mergedItem?.displayOrder).toBe(computed[index].displayOrder);
    });
  });
});
