/**
 * Tests for product-options router input validation and logic.
 * Tests the assignToProduct, reorder, and softDeleteChoice input schemas.
 *
 * Re-declares schemas from product-options.ts router.
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// --- listByProduct input (same as router) ---
const listByProductInput = z.object({ productId: z.number() });

// --- assignToProduct input (same as router) ---
const assignToProductInput = z.object({
  productId: z.number(),
  optionDefinitionId: z.number(),
  displayOrder: z.number().default(0),
  isRequired: z.boolean().default(false),
  isVisible: z.boolean().default(true),
  isInternal: z.boolean().default(false),
});

// --- update input (same as router) ---
const updateInput = z.object({
  id: z.number(),
  data: z.object({
    displayOrder: z.number().optional(),
    isRequired: z.boolean().optional(),
    isVisible: z.boolean().optional(),
    isInternal: z.boolean().optional(),
    uiComponentOverride: z.string().nullable().optional(),
    defaultChoiceId: z.number().nullable().optional(),
    isActive: z.boolean().optional(),
  }),
});

// --- softDeleteChoice input (same as router) ---
const softDeleteInput = z.object({ id: z.number() });

// --- reorder input (same as router) ---
const reorderInput = z.array(z.object({ id: z.number(), displayOrder: z.number() }));

// --- Product configurator logic: pending assignments ---
function computeUnassignedDefinitions(
  allDefs: { id: number; key: string; name: string; isActive: boolean }[],
  assignedDefIds: number[],
): { id: number; key: string; name: string }[] {
  const assignedSet = new Set(assignedDefIds);
  return allDefs
    .filter((d) => d.isActive && !assignedSet.has(d.id))
    .map(({ id, key, name }) => ({ id, key, name }));
}

// --- Option assignment deduplication (same as assignToProduct onConflictDoNothing) ---
function wouldConflict(
  existing: { productId: number; optionDefinitionId: number }[],
  productId: number,
  optionDefinitionId: number,
): boolean {
  return existing.some(
    (e) => e.productId === productId && e.optionDefinitionId === optionDefinitionId,
  );
}

// --- UI component options (same as product-configurator.tsx) ---
const UI_COMPONENTS = ['dropdown', 'radio', 'checkbox', 'slider', 'input'];

// ===================================================================
// Tests
// ===================================================================

describe('listByProductInput', () => {
  it('accepts valid productId', () => {
    const result = listByProductInput.safeParse({ productId: 1 });
    expect(result.success).toBe(true);
  });

  it('rejects missing productId', () => {
    const result = listByProductInput.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects non-number productId', () => {
    const result = listByProductInput.safeParse({ productId: 'abc' });
    expect(result.success).toBe(false);
  });

  it('accepts zero productId', () => {
    const result = listByProductInput.safeParse({ productId: 0 });
    expect(result.success).toBe(true);
  });

  it('accepts negative productId (no constraint)', () => {
    const result = listByProductInput.safeParse({ productId: -1 });
    expect(result.success).toBe(true);
  });
});

describe('assignToProductInput', () => {
  it('accepts minimal required fields', () => {
    const result = assignToProductInput.safeParse({
      productId: 1,
      optionDefinitionId: 5,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayOrder).toBe(0);
      expect(result.data.isRequired).toBe(false);
      expect(result.data.isVisible).toBe(true);
      expect(result.data.isInternal).toBe(false);
    }
  });

  it('accepts all fields', () => {
    const result = assignToProductInput.safeParse({
      productId: 1,
      optionDefinitionId: 5,
      displayOrder: 3,
      isRequired: true,
      isVisible: false,
      isInternal: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing productId', () => {
    const result = assignToProductInput.safeParse({
      optionDefinitionId: 5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing optionDefinitionId', () => {
    const result = assignToProductInput.safeParse({
      productId: 1,
    });
    expect(result.success).toBe(false);
  });

  it('defaults displayOrder to 0', () => {
    const result = assignToProductInput.safeParse({
      productId: 1,
      optionDefinitionId: 5,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.displayOrder).toBe(0);
    }
  });

  it('defaults isRequired to false', () => {
    const result = assignToProductInput.safeParse({
      productId: 1,
      optionDefinitionId: 5,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isRequired).toBe(false);
    }
  });

  it('defaults isVisible to true', () => {
    const result = assignToProductInput.safeParse({
      productId: 1,
      optionDefinitionId: 5,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isVisible).toBe(true);
    }
  });

  it('defaults isInternal to false', () => {
    const result = assignToProductInput.safeParse({
      productId: 1,
      optionDefinitionId: 5,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isInternal).toBe(false);
    }
  });
});

describe('updateInput', () => {
  it('accepts id with empty data', () => {
    const result = updateInput.safeParse({ id: 1, data: {} });
    expect(result.success).toBe(true);
  });

  it('accepts partial data update', () => {
    const result = updateInput.safeParse({
      id: 1,
      data: { isRequired: true, displayOrder: 5 },
    });
    expect(result.success).toBe(true);
  });

  it('accepts uiComponentOverride as string', () => {
    const result = updateInput.safeParse({
      id: 1,
      data: { uiComponentOverride: 'radio' },
    });
    expect(result.success).toBe(true);
  });

  it('accepts uiComponentOverride as null', () => {
    const result = updateInput.safeParse({
      id: 1,
      data: { uiComponentOverride: null },
    });
    expect(result.success).toBe(true);
  });

  it('accepts defaultChoiceId as number', () => {
    const result = updateInput.safeParse({
      id: 1,
      data: { defaultChoiceId: 42 },
    });
    expect(result.success).toBe(true);
  });

  it('accepts defaultChoiceId as null', () => {
    const result = updateInput.safeParse({
      id: 1,
      data: { defaultChoiceId: null },
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing id', () => {
    const result = updateInput.safeParse({ data: {} });
    expect(result.success).toBe(false);
  });
});

describe('softDeleteInput', () => {
  it('accepts valid id', () => {
    const result = softDeleteInput.safeParse({ id: 1 });
    expect(result.success).toBe(true);
  });

  it('rejects missing id', () => {
    const result = softDeleteInput.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('reorderInput', () => {
  it('accepts empty array', () => {
    const result = reorderInput.safeParse([]);
    expect(result.success).toBe(true);
  });

  it('accepts valid reorder array', () => {
    const result = reorderInput.safeParse([
      { id: 1, displayOrder: 0 },
      { id: 2, displayOrder: 1 },
      { id: 3, displayOrder: 2 },
    ]);
    expect(result.success).toBe(true);
  });

  it('rejects item without id', () => {
    const result = reorderInput.safeParse([{ displayOrder: 0 }]);
    expect(result.success).toBe(false);
  });

  it('rejects item without displayOrder', () => {
    const result = reorderInput.safeParse([{ id: 1 }]);
    expect(result.success).toBe(false);
  });

  it('accepts single item', () => {
    const result = reorderInput.safeParse([{ id: 1, displayOrder: 0 }]);
    expect(result.success).toBe(true);
  });
});

describe('computeUnassignedDefinitions', () => {
  const allDefs = [
    { id: 1, key: 'paper', name: 'Paper Type', isActive: true },
    { id: 2, key: 'size', name: 'Size', isActive: true },
    { id: 3, key: 'color', name: 'Color', isActive: true },
    { id: 4, key: 'deprecated', name: 'Deprecated', isActive: false },
  ];

  it('returns all active definitions when none assigned', () => {
    const result = computeUnassignedDefinitions(allDefs, []);
    expect(result).toHaveLength(3);
    expect(result.map((d) => d.id)).toEqual([1, 2, 3]);
  });

  it('excludes assigned definitions', () => {
    const result = computeUnassignedDefinitions(allDefs, [1, 3]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it('excludes inactive definitions', () => {
    const result = computeUnassignedDefinitions(allDefs, []);
    expect(result.every((d) => d.id !== 4)).toBe(true);
  });

  it('returns empty when all active definitions are assigned', () => {
    const result = computeUnassignedDefinitions(allDefs, [1, 2, 3]);
    expect(result).toHaveLength(0);
  });

  it('returns correct shape (id, key, name only)', () => {
    const result = computeUnassignedDefinitions(allDefs, []);
    for (const def of result) {
      expect(Object.keys(def).sort()).toEqual(['id', 'key', 'name']);
    }
  });
});

describe('wouldConflict (assignToProduct dedup)', () => {
  it('returns true for duplicate assignment', () => {
    const existing = [{ productId: 1, optionDefinitionId: 5 }];
    expect(wouldConflict(existing, 1, 5)).toBe(true);
  });

  it('returns false for new assignment', () => {
    const existing = [{ productId: 1, optionDefinitionId: 5 }];
    expect(wouldConflict(existing, 1, 6)).toBe(false);
  });

  it('returns false for different product', () => {
    const existing = [{ productId: 1, optionDefinitionId: 5 }];
    expect(wouldConflict(existing, 2, 5)).toBe(false);
  });

  it('returns false for empty existing', () => {
    expect(wouldConflict([], 1, 5)).toBe(false);
  });
});

describe('UI_COMPONENTS constant', () => {
  it('contains 5 component types', () => {
    expect(UI_COMPONENTS).toHaveLength(5);
  });

  it('includes dropdown', () => {
    expect(UI_COMPONENTS).toContain('dropdown');
  });

  it('includes radio', () => {
    expect(UI_COMPONENTS).toContain('radio');
  });

  it('includes checkbox', () => {
    expect(UI_COMPONENTS).toContain('checkbox');
  });

  it('includes slider', () => {
    expect(UI_COMPONENTS).toContain('slider');
  });

  it('includes input', () => {
    expect(UI_COMPONENTS).toContain('input');
  });
});
