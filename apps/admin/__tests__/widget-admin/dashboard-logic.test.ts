/**
 * Tests for Widget Admin Dashboard logic.
 * SPEC-WA-001 FR-WA001-01, FR-WA001-02, FR-WA001-03
 *
 * Pure function tests extracted from page.tsx following project test pattern.
 * NO React component testing, NO tRPC mocking — just pure TypeScript/Vitest.
 */
import { describe, it, expect } from 'vitest';

// Re-declare types inline (aligned with @widget-creator/core CompletenessResult)
// item field is union type matching the core package definition
interface CompletenessResult {
  completedCount: number;
  totalCount: number;
  publishable: boolean;
  items: Array<{
    item: 'options' | 'pricing' | 'constraints' | 'mesMapping';
    completed: boolean;
    message: string;
  }>;
}

interface DashboardProduct {
  id: number;
  productKey: string;
  productNameKo: string;
  isActive: boolean;
  isVisible: boolean;
  edicusCode: string | null;
  mesItemCd: string | null;
  categoryId: number;
  categoryNameKo: string;
  completeness: CompletenessResult;
}

interface DashboardStats {
  total: number;
  active: number;
  draft: number;
  incomplete: number;
}

// Import the functions under test from page.tsx
// These functions will be exported from page.tsx after GREEN phase
import {
  computeDashboardStats,
  filterByCategory,
  filterByStatus,
  filterProducts,
} from '../../src/app/(dashboard)/widget-admin/page';

// ─── Test data helpers ────────────────────────────────────────────────────────

function makeCompleteResult(publishable = true): CompletenessResult {
  return {
    completedCount: publishable ? 4 : 2,
    totalCount: 4,
    publishable,
    items: [
      { item: 'options', completed: true, message: '' },
      { item: 'pricing', completed: publishable, message: publishable ? '' : 'No price config' },
      { item: 'constraints', completed: true, message: '' },
      { item: 'mesMapping', completed: publishable, message: publishable ? '' : 'No MES code' },
    ],
  };
}

function makeProduct(
  overrides: Partial<DashboardProduct> & { id: number }
): DashboardProduct {
  return {
    id: overrides.id,
    productKey: `product-${overrides.id}`,
    productNameKo: `상품 ${overrides.id}`,
    isActive: true,
    isVisible: overrides.isVisible ?? false,
    edicusCode: null,
    mesItemCd: null,
    categoryId: overrides.categoryId ?? 1,
    categoryNameKo: overrides.categoryNameKo ?? '명함',
    completeness: overrides.completeness ?? makeCompleteResult(true),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// computeDashboardStats tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('computeDashboardStats', () => {
  it('returns all zeros for empty array', () => {
    const stats = computeDashboardStats([]);
    expect(stats).toEqual({ total: 0, active: 0, draft: 0, incomplete: 0 });
  });

  it('counts single active product (isVisible=true, publishable=true)', () => {
    const products: DashboardProduct[] = [
      makeProduct({
        id: 1,
        isVisible: true,
        completeness: makeCompleteResult(true),
      }),
    ];
    const stats = computeDashboardStats(products);
    expect(stats).toEqual({ total: 1, active: 1, draft: 0, incomplete: 0 });
  });

  it('counts single draft product (isVisible=false, publishable=true)', () => {
    const products: DashboardProduct[] = [
      makeProduct({
        id: 1,
        isVisible: false,
        completeness: makeCompleteResult(true),
      }),
    ];
    const stats = computeDashboardStats(products);
    expect(stats).toEqual({ total: 1, active: 0, draft: 1, incomplete: 0 });
  });

  it('counts single incomplete product (isVisible=false, publishable=false)', () => {
    const products: DashboardProduct[] = [
      makeProduct({
        id: 1,
        isVisible: false,
        completeness: makeCompleteResult(false),
      }),
    ];
    const stats = computeDashboardStats(products);
    expect(stats).toEqual({ total: 1, active: 0, draft: 0, incomplete: 1 });
  });

  it('counts mixed 5 products correctly', () => {
    // active=2, draft=1, incomplete=2
    const products: DashboardProduct[] = [
      makeProduct({ id: 1, isVisible: true, completeness: makeCompleteResult(true) }),
      makeProduct({ id: 2, isVisible: true, completeness: makeCompleteResult(true) }),
      makeProduct({ id: 3, isVisible: false, completeness: makeCompleteResult(true) }),
      makeProduct({ id: 4, isVisible: false, completeness: makeCompleteResult(false) }),
      makeProduct({ id: 5, isVisible: false, completeness: makeCompleteResult(false) }),
    ];
    const stats = computeDashboardStats(products);
    expect(stats).toEqual({ total: 5, active: 2, draft: 1, incomplete: 2 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// filterByCategory tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('filterByCategory', () => {
  const products: DashboardProduct[] = [
    makeProduct({ id: 1, categoryId: 1, categoryNameKo: '명함' }),
    makeProduct({ id: 2, categoryId: 1, categoryNameKo: '명함' }),
    makeProduct({ id: 3, categoryId: 2, categoryNameKo: '스티커' }),
  ];

  it('returns all products when categoryId is null', () => {
    const result = filterByCategory(products, null);
    expect(result).toHaveLength(3);
  });

  it('returns only products with matching categoryId=1', () => {
    const result = filterByCategory(products, 1);
    expect(result).toHaveLength(2);
    result.forEach((p) => expect(p.categoryId).toBe(1));
  });

  it('returns only products with matching categoryId=2', () => {
    const result = filterByCategory(products, 2);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(3);
  });

  it('returns empty array when no products match categoryId', () => {
    const result = filterByCategory(products, 99);
    expect(result).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// filterByStatus tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('filterByStatus', () => {
  const products: DashboardProduct[] = [
    // active: isVisible=true
    makeProduct({ id: 1, isVisible: true, completeness: makeCompleteResult(true) }),
    makeProduct({ id: 2, isVisible: true, completeness: makeCompleteResult(true) }),
    // draft: isVisible=false, publishable=true
    makeProduct({ id: 3, isVisible: false, completeness: makeCompleteResult(true) }),
    // incomplete: publishable=false
    makeProduct({ id: 4, isVisible: false, completeness: makeCompleteResult(false) }),
    makeProduct({ id: 5, isVisible: false, completeness: makeCompleteResult(false) }),
  ];

  it("returns all products for status 'all'", () => {
    const result = filterByStatus(products, 'all');
    expect(result).toHaveLength(5);
  });

  it("returns only isVisible=true products for '활성'", () => {
    const result = filterByStatus(products, '활성');
    expect(result).toHaveLength(2);
    result.forEach((p) => expect(p.isVisible).toBe(true));
  });

  it("returns only isVisible=false && publishable=true products for '임시저장'", () => {
    const result = filterByStatus(products, '임시저장');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(3);
    expect(result[0].isVisible).toBe(false);
    expect(result[0].completeness.publishable).toBe(true);
  });

  it("returns only publishable=false products for '미완성'", () => {
    const result = filterByStatus(products, '미완성');
    expect(result).toHaveLength(2);
    result.forEach((p) => expect(p.completeness.publishable).toBe(false));
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// filterProducts tests (combines both filters)
// ═══════════════════════════════════════════════════════════════════════════════

describe('filterProducts', () => {
  const products: DashboardProduct[] = [
    makeProduct({ id: 1, categoryId: 1, isVisible: true, completeness: makeCompleteResult(true) }),
    makeProduct({ id: 2, categoryId: 1, isVisible: false, completeness: makeCompleteResult(true) }),
    makeProduct({ id: 3, categoryId: 2, isVisible: true, completeness: makeCompleteResult(true) }),
    makeProduct({ id: 4, categoryId: 2, isVisible: false, completeness: makeCompleteResult(false) }),
  ];

  it('returns all products when no filters applied (null, all)', () => {
    const result = filterProducts(products, null, 'all');
    expect(result).toHaveLength(4);
  });

  it('applies category filter only', () => {
    const result = filterProducts(products, 1, 'all');
    expect(result).toHaveLength(2);
    result.forEach((p) => expect(p.categoryId).toBe(1));
  });

  it('applies status filter only', () => {
    const result = filterProducts(products, null, '활성');
    expect(result).toHaveLength(2);
    result.forEach((p) => expect(p.isVisible).toBe(true));
  });

  it('combines both category and status filters correctly', () => {
    // categoryId=1 + 활성 → only product id=1
    const result = filterProducts(products, 1, '활성');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('returns empty when combined filters match nothing', () => {
    // categoryId=1 + 미완성 → no products (id=2 is draft, not incomplete)
    const result = filterProducts(products, 1, '미완성');
    expect(result).toHaveLength(0);
  });
});
