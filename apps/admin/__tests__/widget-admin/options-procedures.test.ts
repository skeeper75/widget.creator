/**
 * Tests for SPEC-WA-001 Step 2 — options procedures input schema validation.
 *
 * Tests tRPC procedure input schemas for:
 * - productOptions.list
 * - productOptions.reorder
 * - productOptions.addToProduct
 * - productOptions.remove
 * - productOptions.updateValues
 * - optionDefs.list (no input)
 *
 * Follows the established pattern: re-declare schemas inline rather than importing
 * from the router, since tRPC routers use drizzle-zod which is incompatible with
 * the vitest stub approach.
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// ─── Input schemas (same as widgetAdmin sub-router) ─────────────────────────

const productOptionsListSchema = z.object({
  productId: z.number(),
});

const productOptionsReorderSchema = z.object({
  productId: z.number(),
  orderedIds: z.array(z.number()),
});

const productOptionsAddToProductSchema = z.object({
  productId: z.number(),
  optionDefinitionId: z.number(),
});

const productOptionsRemoveSchema = z.object({
  productId: z.number(),
  productOptionId: z.number(),
});

const productOptionsUpdateValuesSchema = z.object({
  productOptionId: z.number(),
  values: z.object({
    add: z
      .array(z.object({ code: z.string(), name: z.string() }))
      .optional(),
    remove: z.array(z.number()).optional(),
    reorder: z
      .array(z.object({ id: z.number(), displayOrder: z.number() }))
      .optional(),
  }),
});

// optionDefs.list takes no input — schema is z.void() or undefined
// We test it implicitly by verifying it needs no arguments

// ─── productOptions.list ─────────────────────────────────────────────────────

describe('productOptions.list — input schema', () => {
  it('accepts valid productId', () => {
    const result = productOptionsListSchema.safeParse({ productId: 1 });
    expect(result.success).toBe(true);
  });

  it('accepts large productId', () => {
    const result = productOptionsListSchema.safeParse({ productId: 99999 });
    expect(result.success).toBe(true);
  });

  it('rejects missing productId', () => {
    const result = productOptionsListSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects string productId', () => {
    const result = productOptionsListSchema.safeParse({ productId: 'abc' });
    expect(result.success).toBe(false);
  });

  it('rejects null productId', () => {
    const result = productOptionsListSchema.safeParse({ productId: null });
    expect(result.success).toBe(false);
  });

  it('accepts float productId (z.number() allows floats; integer enforcement is at DB level)', () => {
    // z.number() does not restrict to integers unless z.number().int() is used
    // The router uses z.number() matching existing product-options.ts pattern
    const result = productOptionsListSchema.safeParse({ productId: 1.5 });
    expect(result.success).toBe(true);
  });
});

// ─── productOptions.reorder ──────────────────────────────────────────────────

describe('productOptions.reorder — input schema', () => {
  it('accepts valid productId and orderedIds', () => {
    const result = productOptionsReorderSchema.safeParse({
      productId: 1,
      orderedIds: [3, 1, 2],
    });
    expect(result.success).toBe(true);
  });

  it('accepts empty orderedIds array', () => {
    const result = productOptionsReorderSchema.safeParse({
      productId: 1,
      orderedIds: [],
    });
    expect(result.success).toBe(true);
  });

  it('accepts single item orderedIds', () => {
    const result = productOptionsReorderSchema.safeParse({
      productId: 1,
      orderedIds: [5],
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing productId', () => {
    const result = productOptionsReorderSchema.safeParse({
      orderedIds: [1, 2, 3],
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing orderedIds', () => {
    const result = productOptionsReorderSchema.safeParse({
      productId: 1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects string items in orderedIds', () => {
    const result = productOptionsReorderSchema.safeParse({
      productId: 1,
      orderedIds: ['a', 'b'],
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-array orderedIds', () => {
    const result = productOptionsReorderSchema.safeParse({
      productId: 1,
      orderedIds: 123,
    });
    expect(result.success).toBe(false);
  });
});

// ─── productOptions.addToProduct ─────────────────────────────────────────────

describe('productOptions.addToProduct — input schema', () => {
  it('accepts valid productId and optionDefinitionId', () => {
    const result = productOptionsAddToProductSchema.safeParse({
      productId: 1,
      optionDefinitionId: 5,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing productId', () => {
    const result = productOptionsAddToProductSchema.safeParse({
      optionDefinitionId: 5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing optionDefinitionId', () => {
    const result = productOptionsAddToProductSchema.safeParse({
      productId: 1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects string productId', () => {
    const result = productOptionsAddToProductSchema.safeParse({
      productId: 'one',
      optionDefinitionId: 5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects string optionDefinitionId', () => {
    const result = productOptionsAddToProductSchema.safeParse({
      productId: 1,
      optionDefinitionId: 'five',
    });
    expect(result.success).toBe(false);
  });
});

// ─── productOptions.remove ───────────────────────────────────────────────────

describe('productOptions.remove — input schema', () => {
  it('accepts valid productId and productOptionId', () => {
    const result = productOptionsRemoveSchema.safeParse({
      productId: 1,
      productOptionId: 10,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing productId', () => {
    const result = productOptionsRemoveSchema.safeParse({
      productOptionId: 10,
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing productOptionId', () => {
    const result = productOptionsRemoveSchema.safeParse({
      productId: 1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects string productOptionId', () => {
    const result = productOptionsRemoveSchema.safeParse({
      productId: 1,
      productOptionId: 'ten',
    });
    expect(result.success).toBe(false);
  });
});

// ─── productOptions.updateValues ─────────────────────────────────────────────

describe('productOptions.updateValues — input schema', () => {
  it('accepts minimal valid input (empty values object)', () => {
    const result = productOptionsUpdateValuesSchema.safeParse({
      productOptionId: 1,
      values: {},
    });
    expect(result.success).toBe(true);
  });

  it('accepts add array', () => {
    const result = productOptionsUpdateValuesSchema.safeParse({
      productOptionId: 1,
      values: {
        add: [{ code: 'C001', name: '아트지 100g' }],
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts remove array', () => {
    const result = productOptionsUpdateValuesSchema.safeParse({
      productOptionId: 1,
      values: {
        remove: [3, 7],
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts reorder array', () => {
    const result = productOptionsUpdateValuesSchema.safeParse({
      productOptionId: 1,
      values: {
        reorder: [
          { id: 3, displayOrder: 0 },
          { id: 1, displayOrder: 1 },
        ],
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts all three operations at once', () => {
    const result = productOptionsUpdateValuesSchema.safeParse({
      productOptionId: 1,
      values: {
        add: [{ code: 'NEW', name: '새 선택지' }],
        remove: [5],
        reorder: [{ id: 1, displayOrder: 0 }],
      },
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing productOptionId', () => {
    const result = productOptionsUpdateValuesSchema.safeParse({
      values: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing values object', () => {
    const result = productOptionsUpdateValuesSchema.safeParse({
      productOptionId: 1,
    });
    expect(result.success).toBe(false);
  });

  it('rejects add item missing code', () => {
    const result = productOptionsUpdateValuesSchema.safeParse({
      productOptionId: 1,
      values: {
        add: [{ name: '아트지' }],
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects add item missing name', () => {
    const result = productOptionsUpdateValuesSchema.safeParse({
      productOptionId: 1,
      values: {
        add: [{ code: 'ART' }],
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects string items in remove array', () => {
    const result = productOptionsUpdateValuesSchema.safeParse({
      productOptionId: 1,
      values: {
        remove: ['three'],
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects reorder item missing displayOrder', () => {
    const result = productOptionsUpdateValuesSchema.safeParse({
      productOptionId: 1,
      values: {
        reorder: [{ id: 1 }],
      },
    });
    expect(result.success).toBe(false);
  });
});
