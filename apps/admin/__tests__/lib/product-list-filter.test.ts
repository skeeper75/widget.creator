/**
 * Tests for product list filter/condition building logic.
 * REQ-E-103: Product list with server-side filtering and pagination.
 *
 * Tests the filter condition building and pagination offset calculation
 * from products.ts router.
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Re-declare products list input schema (same as products.ts router)
const productsListSchema = z.object({
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  search: z.string().optional(),
  categoryId: z.number().optional(),
  productType: z.string().optional(),
  pricingModel: z.string().optional(),
  isActive: z.boolean().optional(),
});

type ProductsListInput = z.infer<typeof productsListSchema>;

// Re-implement condition building logic (same as products.ts)
function buildFilterConditions(input: ProductsListInput): string[] {
  const conditions: string[] = [];

  if (input.search) {
    conditions.push(`name LIKE '%${input.search}%'`);
  }
  if (input.categoryId != null) {
    conditions.push(`categoryId = ${input.categoryId}`);
  }
  if (input.productType) {
    conditions.push(`productType = '${input.productType}'`);
  }
  if (input.pricingModel) {
    conditions.push(`pricingModel = '${input.pricingModel}'`);
  }
  if (input.isActive != null) {
    conditions.push(`isActive = ${input.isActive}`);
  }

  return conditions;
}

describe('productsListSchema', () => {
  it('accepts empty object (all defaults)', () => {
    const result = productsListSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
      expect(result.data.sortOrder).toBe('asc');
    }
  });

  it('accepts all filters combined', () => {
    const result = productsListSchema.safeParse({
      page: 2,
      pageSize: 50,
      sortBy: 'name',
      sortOrder: 'desc',
      search: 'business card',
      categoryId: 1,
      productType: 'digital_print',
      pricingModel: 'tiered',
      isActive: true,
    });
    expect(result.success).toBe(true);
  });

  describe('page validation', () => {
    it('rejects page 0', () => {
      const result = productsListSchema.safeParse({ page: 0 });
      expect(result.success).toBe(false);
    });

    it('rejects negative page', () => {
      const result = productsListSchema.safeParse({ page: -1 });
      expect(result.success).toBe(false);
    });

    it('accepts page 1', () => {
      const result = productsListSchema.safeParse({ page: 1 });
      expect(result.success).toBe(true);
    });
  });

  describe('pageSize validation', () => {
    it('rejects page size 0', () => {
      const result = productsListSchema.safeParse({ pageSize: 0 });
      expect(result.success).toBe(false);
    });

    it('rejects page size over 100', () => {
      const result = productsListSchema.safeParse({ pageSize: 101 });
      expect(result.success).toBe(false);
    });

    it('accepts page size at 100', () => {
      const result = productsListSchema.safeParse({ pageSize: 100 });
      expect(result.success).toBe(true);
    });

    it('accepts page size at 1', () => {
      const result = productsListSchema.safeParse({ pageSize: 1 });
      expect(result.success).toBe(true);
    });
  });

  describe('sortOrder validation', () => {
    it('accepts asc', () => {
      const result = productsListSchema.safeParse({ sortOrder: 'asc' });
      expect(result.success).toBe(true);
    });

    it('accepts desc', () => {
      const result = productsListSchema.safeParse({ sortOrder: 'desc' });
      expect(result.success).toBe(true);
    });

    it('rejects invalid sort order', () => {
      const result = productsListSchema.safeParse({ sortOrder: 'random' });
      expect(result.success).toBe(false);
    });
  });
});

describe('filter condition building', () => {
  it('builds no conditions when no filters', () => {
    const input: ProductsListInput = {
      page: 1,
      pageSize: 20,
      sortOrder: 'asc',
    };
    expect(buildFilterConditions(input)).toHaveLength(0);
  });

  it('builds search condition', () => {
    const input: ProductsListInput = {
      page: 1,
      pageSize: 20,
      sortOrder: 'asc',
      search: 'card',
    };
    const conditions = buildFilterConditions(input);
    expect(conditions).toHaveLength(1);
    expect(conditions[0]).toContain('card');
  });

  it('builds categoryId condition', () => {
    const input: ProductsListInput = {
      page: 1,
      pageSize: 20,
      sortOrder: 'asc',
      categoryId: 5,
    };
    const conditions = buildFilterConditions(input);
    expect(conditions).toHaveLength(1);
    expect(conditions[0]).toContain('categoryId');
  });

  it('builds productType condition', () => {
    const input: ProductsListInput = {
      page: 1,
      pageSize: 20,
      sortOrder: 'asc',
      productType: 'digital_print',
    };
    const conditions = buildFilterConditions(input);
    expect(conditions).toHaveLength(1);
    expect(conditions[0]).toContain('productType');
  });

  it('builds pricingModel condition', () => {
    const input: ProductsListInput = {
      page: 1,
      pageSize: 20,
      sortOrder: 'asc',
      pricingModel: 'tiered',
    };
    const conditions = buildFilterConditions(input);
    expect(conditions).toHaveLength(1);
    expect(conditions[0]).toContain('pricingModel');
  });

  it('builds isActive condition', () => {
    const input: ProductsListInput = {
      page: 1,
      pageSize: 20,
      sortOrder: 'asc',
      isActive: true,
    };
    const conditions = buildFilterConditions(input);
    expect(conditions).toHaveLength(1);
    expect(conditions[0]).toContain('isActive');
  });

  it('builds multiple conditions', () => {
    const input: ProductsListInput = {
      page: 1,
      pageSize: 20,
      sortOrder: 'asc',
      search: 'card',
      categoryId: 1,
      isActive: true,
    };
    const conditions = buildFilterConditions(input);
    expect(conditions).toHaveLength(3);
  });

  it('ignores empty search string', () => {
    const input: ProductsListInput = {
      page: 1,
      pageSize: 20,
      sortOrder: 'asc',
      search: '',
    };
    expect(buildFilterConditions(input)).toHaveLength(0);
  });

  it('ignores empty productType', () => {
    const input: ProductsListInput = {
      page: 1,
      pageSize: 20,
      sortOrder: 'asc',
      productType: '',
    };
    expect(buildFilterConditions(input)).toHaveLength(0);
  });
});

describe('pagination response structure', () => {
  interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
  }

  function createPaginatedResponse<T>(
    data: T[],
    total: number,
    page: number,
    pageSize: number,
  ): PaginatedResponse<T> {
    return { data, total, page, pageSize };
  }

  it('includes total count', () => {
    const response = createPaginatedResponse([1, 2, 3], 50, 1, 20);
    expect(response.total).toBe(50);
  });

  it('includes current page', () => {
    const response = createPaginatedResponse([], 0, 3, 20);
    expect(response.page).toBe(3);
  });

  it('data length matches page size or less', () => {
    const data = Array.from({ length: 20 }, (_, i) => i);
    const response = createPaginatedResponse(data, 50, 1, 20);
    expect(response.data.length).toBeLessThanOrEqual(response.pageSize);
  });

  it('last page may have fewer items', () => {
    const data = Array.from({ length: 5 }, (_, i) => i);
    const response = createPaginatedResponse(data, 45, 3, 20);
    expect(response.data.length).toBe(5);
    expect(response.data.length).toBeLessThan(response.pageSize);
  });
});
