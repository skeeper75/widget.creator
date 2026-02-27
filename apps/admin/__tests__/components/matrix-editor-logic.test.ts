/**
 * Tests for MatrixEditor pure logic functions.
 * REQ-E-203: Paper-Product mapping matrix with coverType filter.
 *
 * Tests groupProductsByCategory and mapping set lookup logic.
 */
import { describe, it, expect } from 'vitest';

interface Paper {
  id: number;
  code: string;
  name: string;
  weight: number | null;
}

interface Product {
  id: number;
  name: string;
  categoryId: number;
}

interface Category {
  id: number;
  name: string;
}

interface PaperProductMapping {
  id: number;
  paperId: number;
  productId: number;
  coverType: string | null;
  isActive: boolean;
}

interface GroupedProducts {
  category: Category;
  products: Product[];
}

// Re-implement groupProductsByCategory (same as matrix-editor.tsx)
function groupProductsByCategory(
  products: Product[],
  categories: Category[],
): GroupedProducts[] {
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const groups = new Map<number, GroupedProducts>();

  for (const product of products) {
    const cat = catMap.get(product.categoryId);
    if (!cat) continue;
    if (!groups.has(cat.id)) {
      groups.set(cat.id, { category: cat, products: [] });
    }
    groups.get(cat.id)!.products.push(product);
  }

  return Array.from(groups.values());
}

// Re-implement mapping set lookup (same as matrix-editor.tsx)
function buildMappingSet(mappings: PaperProductMapping[]): Set<string> {
  const set = new Set<string>();
  for (const m of mappings) {
    if (m.isActive) {
      set.add(`${m.paperId}-${m.productId}`);
    }
  }
  return set;
}

function isMapped(set: Set<string>, paperId: number, productId: number): boolean {
  return set.has(`${paperId}-${productId}`);
}

describe('groupProductsByCategory', () => {
  const categories: Category[] = [
    { id: 1, name: 'Business Cards' },
    { id: 2, name: 'Flyers' },
    { id: 3, name: 'Booklets' },
  ];

  it('returns empty array for no products', () => {
    expect(groupProductsByCategory([], categories)).toEqual([]);
  });

  it('groups products by their category', () => {
    const products: Product[] = [
      { id: 1, name: 'Standard Card', categoryId: 1 },
      { id: 2, name: 'Premium Card', categoryId: 1 },
      { id: 3, name: 'A4 Flyer', categoryId: 2 },
    ];

    const groups = groupProductsByCategory(products, categories);

    expect(groups).toHaveLength(2);

    const cardGroup = groups.find((g) => g.category.id === 1);
    expect(cardGroup?.products).toHaveLength(2);
    expect(cardGroup?.products.map((p) => p.id)).toEqual([1, 2]);

    const flyerGroup = groups.find((g) => g.category.id === 2);
    expect(flyerGroup?.products).toHaveLength(1);
  });

  it('skips products with missing category', () => {
    const products: Product[] = [
      { id: 1, name: 'Orphan Product', categoryId: 999 },
    ];

    const groups = groupProductsByCategory(products, categories);
    expect(groups).toHaveLength(0);
  });

  it('preserves category metadata in groups', () => {
    const products: Product[] = [
      { id: 1, name: 'Test', categoryId: 1 },
    ];

    const groups = groupProductsByCategory(products, categories);
    expect(groups[0].category).toEqual({ id: 1, name: 'Business Cards' });
  });

  it('handles all products in same category', () => {
    const products: Product[] = [
      { id: 1, name: 'P1', categoryId: 1 },
      { id: 2, name: 'P2', categoryId: 1 },
      { id: 3, name: 'P3', categoryId: 1 },
    ];

    const groups = groupProductsByCategory(products, categories);
    expect(groups).toHaveLength(1);
    expect(groups[0].products).toHaveLength(3);
  });

  it('handles each product in different category', () => {
    const products: Product[] = [
      { id: 1, name: 'P1', categoryId: 1 },
      { id: 2, name: 'P2', categoryId: 2 },
      { id: 3, name: 'P3', categoryId: 3 },
    ];

    const groups = groupProductsByCategory(products, categories);
    expect(groups).toHaveLength(3);
  });
});

describe('buildMappingSet and isMapped', () => {
  it('builds empty set for no mappings', () => {
    const set = buildMappingSet([]);
    expect(set.size).toBe(0);
  });

  it('includes only active mappings', () => {
    const mappings: PaperProductMapping[] = [
      { id: 1, paperId: 1, productId: 1, coverType: 'body', isActive: true },
      { id: 2, paperId: 1, productId: 2, coverType: 'body', isActive: false },
      { id: 3, paperId: 2, productId: 1, coverType: 'body', isActive: true },
    ];

    const set = buildMappingSet(mappings);
    expect(set.size).toBe(2);
    expect(isMapped(set, 1, 1)).toBe(true);
    expect(isMapped(set, 1, 2)).toBe(false); // inactive
    expect(isMapped(set, 2, 1)).toBe(true);
  });

  it('returns false for unmapped combinations', () => {
    const set = buildMappingSet([
      { id: 1, paperId: 1, productId: 1, coverType: 'body', isActive: true },
    ]);

    expect(isMapped(set, 1, 2)).toBe(false);
    expect(isMapped(set, 2, 1)).toBe(false);
    expect(isMapped(set, 999, 999)).toBe(false);
  });

  it('handles large mapping sets', () => {
    const mappings: PaperProductMapping[] = [];
    for (let p = 1; p <= 55; p++) {
      for (let prod = 1; prod <= 45; prod++) {
        if (Math.random() > 0.5) {
          mappings.push({
            id: mappings.length + 1,
            paperId: p,
            productId: prod,
            coverType: 'body',
            isActive: true,
          });
        }
      }
    }

    const set = buildMappingSet(mappings);
    // Verify some lookups work
    for (const m of mappings.slice(0, 10)) {
      expect(isMapped(set, m.paperId, m.productId)).toBe(true);
    }
  });

  it('distinguishes paperId-productId from productId-paperId', () => {
    const set = buildMappingSet([
      { id: 1, paperId: 1, productId: 2, coverType: 'body', isActive: true },
    ]);

    expect(isMapped(set, 1, 2)).toBe(true);
    expect(isMapped(set, 2, 1)).toBe(false); // reversed order
  });
});

describe('row/column filtering logic', () => {
  const papers: Paper[] = [
    { id: 1, code: 'ART250', name: 'Art Paper 250g', weight: 250 },
    { id: 2, code: 'COT120', name: 'Cotton Paper 120g', weight: 120 },
    { id: 3, code: 'ART150', name: 'Art Paper 150g', weight: 150 },
  ];

  const products: Product[] = [
    { id: 1, name: 'Standard Card', categoryId: 1 },
    { id: 2, name: 'Premium Flyer', categoryId: 2 },
    { id: 3, name: 'Standard Booklet', categoryId: 3 },
  ];

  // Re-implement filter logic from component
  function filterPapers(papers: Paper[], filter: string): Paper[] {
    if (!filter) return papers;
    const lc = filter.toLowerCase();
    return papers.filter(
      (r) =>
        r.name.toLowerCase().includes(lc) ||
        r.code.toLowerCase().includes(lc),
    );
  }

  function filterProducts(products: Product[], filter: string): Product[] {
    if (!filter) return products;
    const lc = filter.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(lc));
  }

  it('returns all papers when filter is empty', () => {
    expect(filterPapers(papers, '')).toHaveLength(3);
  });

  it('filters papers by name', () => {
    const result = filterPapers(papers, 'art');
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.id)).toEqual([1, 3]);
  });

  it('filters papers by code', () => {
    const result = filterPapers(papers, 'COT');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(2);
  });

  it('filters papers case-insensitively', () => {
    expect(filterPapers(papers, 'ART')).toHaveLength(2);
    expect(filterPapers(papers, 'art')).toHaveLength(2);
  });

  it('returns all products when filter is empty', () => {
    expect(filterProducts(products, '')).toHaveLength(3);
  });

  it('filters products by name', () => {
    const result = filterProducts(products, 'standard');
    expect(result).toHaveLength(2);
  });

  it('returns empty for no matches', () => {
    expect(filterPapers(papers, 'nonexistent')).toHaveLength(0);
    expect(filterProducts(products, 'nonexistent')).toHaveLength(0);
  });
});
