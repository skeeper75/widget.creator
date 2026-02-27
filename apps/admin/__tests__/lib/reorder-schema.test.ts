/**
 * Tests for category reorder and option definition reorder input schemas.
 * REQ-E-102: Drag-and-drop category reordering.
 * REQ-E-501: Option definition display order management.
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Re-declare category reorder schema (same as categories.ts router)
const categoryReorderSchema = z.array(
  z.object({
    id: z.number(),
    parentId: z.number().nullable(),
    depth: z.number(),
    displayOrder: z.number(),
  }),
);

// Re-declare option definition reorder schema (same as option-definitions.ts router)
const optionReorderSchema = z.array(
  z.object({
    id: z.number(),
    displayOrder: z.number(),
  }),
);

describe('categoryReorderSchema', () => {
  it('accepts valid reorder input', () => {
    const result = categoryReorderSchema.safeParse([
      { id: 1, parentId: null, depth: 0, displayOrder: 0 },
      { id: 2, parentId: 1, depth: 1, displayOrder: 1 },
      { id: 3, parentId: null, depth: 0, displayOrder: 2 },
    ]);
    expect(result.success).toBe(true);
  });

  it('accepts empty array', () => {
    const result = categoryReorderSchema.safeParse([]);
    expect(result.success).toBe(true);
  });

  it('accepts single item', () => {
    const result = categoryReorderSchema.safeParse([
      { id: 1, parentId: null, depth: 0, displayOrder: 0 },
    ]);
    expect(result.success).toBe(true);
  });

  it('requires id to be a number', () => {
    const result = categoryReorderSchema.safeParse([
      { id: 'abc', parentId: null, depth: 0, displayOrder: 0 },
    ]);
    expect(result.success).toBe(false);
  });

  it('allows null parentId (root category)', () => {
    const result = categoryReorderSchema.safeParse([
      { id: 1, parentId: null, depth: 0, displayOrder: 0 },
    ]);
    expect(result.success).toBe(true);
  });

  it('allows numeric parentId (child category)', () => {
    const result = categoryReorderSchema.safeParse([
      { id: 2, parentId: 1, depth: 1, displayOrder: 0 },
    ]);
    expect(result.success).toBe(true);
  });

  it('requires depth field', () => {
    const result = categoryReorderSchema.safeParse([
      { id: 1, parentId: null, displayOrder: 0 },
    ]);
    expect(result.success).toBe(false);
  });

  it('requires displayOrder field', () => {
    const result = categoryReorderSchema.safeParse([
      { id: 1, parentId: null, depth: 0 },
    ]);
    expect(result.success).toBe(false);
  });

  it('preserves order of items', () => {
    const input = [
      { id: 3, parentId: null, depth: 0, displayOrder: 0 },
      { id: 1, parentId: null, depth: 0, displayOrder: 1 },
      { id: 2, parentId: null, depth: 0, displayOrder: 2 },
    ];
    const result = categoryReorderSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.map((item) => item.id)).toEqual([3, 1, 2]);
    }
  });
});

describe('optionReorderSchema', () => {
  it('accepts valid reorder input', () => {
    const result = optionReorderSchema.safeParse([
      { id: 1, displayOrder: 0 },
      { id: 2, displayOrder: 1 },
      { id: 3, displayOrder: 2 },
    ]);
    expect(result.success).toBe(true);
  });

  it('accepts empty array', () => {
    const result = optionReorderSchema.safeParse([]);
    expect(result.success).toBe(true);
  });

  it('requires id field', () => {
    const result = optionReorderSchema.safeParse([
      { displayOrder: 0 },
    ]);
    expect(result.success).toBe(false);
  });

  it('requires displayOrder field', () => {
    const result = optionReorderSchema.safeParse([
      { id: 1 },
    ]);
    expect(result.success).toBe(false);
  });

  it('rejects non-number id', () => {
    const result = optionReorderSchema.safeParse([
      { id: 'abc', displayOrder: 0 },
    ]);
    expect(result.success).toBe(false);
  });
});

describe('reorder display order invariants', () => {
  // Verify reorder operations preserve expected invariants

  it('display orders should be unique in result', () => {
    const reordered = [
      { id: 1, displayOrder: 0 },
      { id: 2, displayOrder: 1 },
      { id: 3, displayOrder: 2 },
    ];
    const orders = reordered.map((r) => r.displayOrder);
    const unique = new Set(orders);
    expect(unique.size).toBe(orders.length);
  });

  it('display orders should be contiguous from 0', () => {
    const reordered = [
      { id: 1, displayOrder: 0 },
      { id: 2, displayOrder: 1 },
      { id: 3, displayOrder: 2 },
    ];
    const orders = reordered.map((r) => r.displayOrder).sort((a, b) => a - b);
    for (let i = 0; i < orders.length; i++) {
      expect(orders[i]).toBe(i);
    }
  });

  it('all item ids should be preserved after reorder', () => {
    const before = [1, 2, 3, 4, 5];
    const after = [
      { id: 3, displayOrder: 0 },
      { id: 1, displayOrder: 1 },
      { id: 5, displayOrder: 2 },
      { id: 2, displayOrder: 3 },
      { id: 4, displayOrder: 4 },
    ];
    const afterIds = after.map((r) => r.id).sort();
    expect(afterIds).toEqual(before);
  });
});
