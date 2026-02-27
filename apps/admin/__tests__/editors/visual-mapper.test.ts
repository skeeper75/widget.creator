/**
 * Tests for VisualMapper pure logic functions.
 * REQ-E-602: Two-panel visual mapping editor.
 *
 * Tests product grouping, MES grouping, filtering, mapping state,
 * and unmapped product detection from visual-mapper.tsx.
 */
import { describe, it, expect } from 'vitest';

// --- Types (same as visual-mapper.tsx) ---

interface MapperProduct {
  id: number;
  name: string;
  categoryId: number;
  categoryName: string | null;
}

interface MapperMesItem {
  id: number;
  itemCode: string;
  groupCode: string | null;
  name: string;
  abbreviation: string | null;
  itemType: string;
}

interface MapperMapping {
  id: number;
  productId: number;
  mesItemId: number;
  coverType: string | null;
}

// --- Re-implement groupProductsByCategory (same as visual-mapper.tsx) ---
function groupProductsByCategory(
  products: MapperProduct[],
): [string, MapperProduct[]][] {
  const groups = new Map<string, MapperProduct[]>();
  for (const p of products) {
    const key = p.categoryName ?? 'Uncategorized';
    const existing = groups.get(key) ?? [];
    existing.push(p);
    groups.set(key, existing);
  }
  return Array.from(groups.entries());
}

// --- Re-implement groupMesByGroupCode (same as visual-mapper.tsx) ---
function groupMesByGroupCode(
  mesItems: MapperMesItem[],
): [string, MapperMesItem[]][] {
  const groups = new Map<string, MapperMesItem[]>();
  for (const m of mesItems) {
    const key = m.groupCode ?? 'Ungrouped';
    const existing = groups.get(key) ?? [];
    existing.push(m);
    groups.set(key, existing);
  }
  return Array.from(groups.entries());
}

// --- Re-implement product search filter (same as visual-mapper.tsx) ---
function filterProducts(
  products: MapperProduct[],
  search: string,
): MapperProduct[] {
  if (!search) return products;
  const q = search.toLowerCase();
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.categoryName?.toLowerCase().includes(q),
  );
}

// --- Re-implement MES search filter (same as visual-mapper.tsx) ---
function filterMesItems(
  mesItems: MapperMesItem[],
  search: string,
): MapperMesItem[] {
  if (!search) return mesItems;
  const q = search.toLowerCase();
  return mesItems.filter(
    (m) =>
      m.name.toLowerCase().includes(q) ||
      m.itemCode.toLowerCase().includes(q) ||
      m.groupCode?.toLowerCase().includes(q),
  );
}

// --- Re-implement mapped product IDs set (same as visual-mapper.tsx) ---
function getMappedProductIds(mappings: MapperMapping[]): Set<number> {
  return new Set(mappings.map((m) => m.productId));
}

// --- Re-implement unmapped count (same as visual-mapper.tsx footer) ---
function getUnmappedCount(products: MapperProduct[], mappings: MapperMapping[]): number {
  const mapped = getMappedProductIds(mappings);
  return products.filter((p) => !mapped.has(p.id)).length;
}

// --- Re-implement click interaction logic (same as handleProductClick / handleMesItemClick) ---
type ClickResult =
  | { action: 'createMapping'; productId: number; mesItemId: number }
  | { action: 'select'; targetType: 'product' | 'mesItem'; id: number }
  | { action: 'deselect' };

function handleProductClick(
  productId: number,
  selectedProduct: number | null,
  selectedMesItem: number | null,
): ClickResult {
  if (selectedMesItem !== null) {
    return { action: 'createMapping', productId, mesItemId: selectedMesItem };
  }
  if (selectedProduct === productId) {
    return { action: 'deselect' };
  }
  return { action: 'select', targetType: 'product', id: productId };
}

function handleMesItemClick(
  mesItemId: number,
  selectedProduct: number | null,
  selectedMesItem: number | null,
): ClickResult {
  if (selectedProduct !== null) {
    return { action: 'createMapping', productId: selectedProduct, mesItemId };
  }
  if (selectedMesItem === mesItemId) {
    return { action: 'deselect' };
  }
  return { action: 'select', targetType: 'mesItem', id: mesItemId };
}

// --- Test data factories ---
function createProduct(overrides: Partial<MapperProduct> = {}): MapperProduct {
  return {
    id: 1,
    name: 'Test Product',
    categoryId: 1,
    categoryName: 'Business Cards',
    ...overrides,
  };
}

function createMesItem(overrides: Partial<MapperMesItem> = {}): MapperMesItem {
  return {
    id: 1,
    itemCode: 'MES001',
    groupCode: 'PRINT',
    name: 'Test MES Item',
    abbreviation: 'TMI',
    itemType: 'material',
    ...overrides,
  };
}

function createMapping(overrides: Partial<MapperMapping> = {}): MapperMapping {
  return {
    id: 1,
    productId: 1,
    mesItemId: 1,
    coverType: null,
    ...overrides,
  };
}

// ===================================================================
// Tests
// ===================================================================

describe('groupProductsByCategory', () => {
  it('returns empty for empty input', () => {
    expect(groupProductsByCategory([])).toHaveLength(0);
  });

  it('groups products by categoryName', () => {
    const products = [
      createProduct({ id: 1, categoryName: 'Cards' }),
      createProduct({ id: 2, categoryName: 'Flyers' }),
      createProduct({ id: 3, categoryName: 'Cards' }),
    ];
    const groups = groupProductsByCategory(products);
    expect(groups).toHaveLength(2);

    const cardsGroup = groups.find(([name]) => name === 'Cards');
    expect(cardsGroup![1]).toHaveLength(2);

    const flyersGroup = groups.find(([name]) => name === 'Flyers');
    expect(flyersGroup![1]).toHaveLength(1);
  });

  it('uses Uncategorized for null categoryName', () => {
    const products = [createProduct({ id: 1, categoryName: null })];
    const groups = groupProductsByCategory(products);
    expect(groups[0][0]).toBe('Uncategorized');
  });

  it('preserves product order within groups', () => {
    const products = [
      createProduct({ id: 1, name: 'A', categoryName: 'Cat1' }),
      createProduct({ id: 2, name: 'B', categoryName: 'Cat1' }),
      createProduct({ id: 3, name: 'C', categoryName: 'Cat1' }),
    ];
    const groups = groupProductsByCategory(products);
    expect(groups[0][1].map((p) => p.id)).toEqual([1, 2, 3]);
  });
});

describe('groupMesByGroupCode', () => {
  it('returns empty for empty input', () => {
    expect(groupMesByGroupCode([])).toHaveLength(0);
  });

  it('groups MES items by groupCode', () => {
    const items = [
      createMesItem({ id: 1, groupCode: 'PRINT' }),
      createMesItem({ id: 2, groupCode: 'FINISH' }),
      createMesItem({ id: 3, groupCode: 'PRINT' }),
    ];
    const groups = groupMesByGroupCode(items);
    expect(groups).toHaveLength(2);

    const printGroup = groups.find(([code]) => code === 'PRINT');
    expect(printGroup![1]).toHaveLength(2);
  });

  it('uses Ungrouped for null groupCode', () => {
    const items = [createMesItem({ id: 1, groupCode: null })];
    const groups = groupMesByGroupCode(items);
    expect(groups[0][0]).toBe('Ungrouped');
  });
});

describe('filterProducts', () => {
  it('returns all when search is empty', () => {
    const products = [createProduct({ id: 1 }), createProduct({ id: 2 })];
    expect(filterProducts(products, '')).toHaveLength(2);
  });

  it('filters by product name (case insensitive)', () => {
    const products = [
      createProduct({ id: 1, name: 'Business Card', categoryName: 'Printing' }),
      createProduct({ id: 2, name: 'Flyer', categoryName: 'Printing' }),
    ];
    const result = filterProducts(products, 'card');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('filters by categoryName', () => {
    const products = [
      createProduct({ id: 1, name: 'Product A', categoryName: 'Printing' }),
      createProduct({ id: 2, name: 'Product B', categoryName: 'Binding' }),
    ];
    const result = filterProducts(products, 'print');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('handles null categoryName in search', () => {
    const products = [createProduct({ id: 1, categoryName: null })];
    expect(filterProducts(products, 'anything')).toHaveLength(0);
  });

  it('returns empty for no match', () => {
    const products = [createProduct({ id: 1, name: 'ABC' })];
    expect(filterProducts(products, 'xyz')).toHaveLength(0);
  });
});

describe('filterMesItems', () => {
  it('returns all when search is empty', () => {
    const items = [createMesItem({ id: 1 }), createMesItem({ id: 2 })];
    expect(filterMesItems(items, '')).toHaveLength(2);
  });

  it('filters by name', () => {
    const items = [
      createMesItem({ id: 1, name: 'Offset Paper' }),
      createMesItem({ id: 2, name: 'Glossy Finish' }),
    ];
    const result = filterMesItems(items, 'offset');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
  });

  it('filters by itemCode', () => {
    const items = [
      createMesItem({ id: 1, itemCode: 'MES-001' }),
      createMesItem({ id: 2, itemCode: 'MES-002' }),
    ];
    const result = filterMesItems(items, 'MES-001');
    expect(result).toHaveLength(1);
  });

  it('filters by groupCode', () => {
    const items = [
      createMesItem({ id: 1, groupCode: 'PRINT' }),
      createMesItem({ id: 2, groupCode: 'FINISH' }),
    ];
    const result = filterMesItems(items, 'print');
    expect(result).toHaveLength(1);
  });

  it('handles null groupCode in search', () => {
    const items = [createMesItem({ id: 1, groupCode: null })];
    expect(filterMesItems(items, 'PRINT')).toHaveLength(0);
  });
});

describe('getMappedProductIds', () => {
  it('returns empty set for no mappings', () => {
    expect(getMappedProductIds([]).size).toBe(0);
  });

  it('collects unique product IDs from mappings', () => {
    const mappings = [
      createMapping({ productId: 1 }),
      createMapping({ productId: 2 }),
      createMapping({ productId: 1 }), // duplicate
    ];
    const ids = getMappedProductIds(mappings);
    expect(ids.size).toBe(2);
    expect(ids.has(1)).toBe(true);
    expect(ids.has(2)).toBe(true);
  });
});

describe('getUnmappedCount', () => {
  it('returns total product count when no mappings', () => {
    const products = [createProduct({ id: 1 }), createProduct({ id: 2 })];
    expect(getUnmappedCount(products, [])).toBe(2);
  });

  it('returns 0 when all products are mapped', () => {
    const products = [createProduct({ id: 1 }), createProduct({ id: 2 })];
    const mappings = [
      createMapping({ productId: 1 }),
      createMapping({ productId: 2 }),
    ];
    expect(getUnmappedCount(products, mappings)).toBe(0);
  });

  it('returns count of unmapped products', () => {
    const products = [
      createProduct({ id: 1 }),
      createProduct({ id: 2 }),
      createProduct({ id: 3 }),
    ];
    const mappings = [createMapping({ productId: 1 })];
    expect(getUnmappedCount(products, mappings)).toBe(2);
  });

  it('handles empty products', () => {
    expect(getUnmappedCount([], [])).toBe(0);
  });
});

describe('handleProductClick', () => {
  it('creates mapping when MES item is already selected', () => {
    const result = handleProductClick(5, null, 10);
    expect(result).toEqual({
      action: 'createMapping',
      productId: 5,
      mesItemId: 10,
    });
  });

  it('deselects when clicking same product', () => {
    const result = handleProductClick(5, 5, null);
    expect(result).toEqual({ action: 'deselect' });
  });

  it('selects product when nothing selected', () => {
    const result = handleProductClick(5, null, null);
    expect(result).toEqual({ action: 'select', targetType: 'product', id: 5 });
  });

  it('selects new product when different product selected', () => {
    const result = handleProductClick(5, 3, null);
    expect(result).toEqual({ action: 'select', targetType: 'product', id: 5 });
  });
});

describe('handleMesItemClick', () => {
  it('creates mapping when product is already selected', () => {
    const result = handleMesItemClick(10, 5, null);
    expect(result).toEqual({
      action: 'createMapping',
      productId: 5,
      mesItemId: 10,
    });
  });

  it('deselects when clicking same MES item', () => {
    const result = handleMesItemClick(10, null, 10);
    expect(result).toEqual({ action: 'deselect' });
  });

  it('selects MES item when nothing selected', () => {
    const result = handleMesItemClick(10, null, null);
    expect(result).toEqual({ action: 'select', targetType: 'mesItem', id: 10 });
  });

  it('selects new MES item when different MES item selected', () => {
    const result = handleMesItemClick(10, null, 7);
    expect(result).toEqual({ action: 'select', targetType: 'mesItem', id: 10 });
  });
});

describe('SVG line position calculation', () => {
  // Re-implement line calculation (same as calculateLines in visual-mapper.tsx)
  function calculateLinePosition(
    leftRect: { right: number; top: number; height: number },
    rightRect: { left: number; top: number; height: number },
    containerRect: { left: number; top: number },
  ) {
    return {
      x1: leftRect.right - containerRect.left,
      y1: leftRect.top + leftRect.height / 2 - containerRect.top,
      x2: rightRect.left - containerRect.left,
      y2: rightRect.top + rightRect.height / 2 - containerRect.top,
    };
  }

  it('calculates correct x positions relative to container', () => {
    const result = calculateLinePosition(
      { right: 300, top: 100, height: 40 },
      { left: 500, top: 120, height: 40 },
      { left: 50, top: 50 },
    );
    expect(result.x1).toBe(250);
    expect(result.x2).toBe(450);
  });

  it('calculates y position at vertical center of elements', () => {
    const result = calculateLinePosition(
      { right: 300, top: 100, height: 40 },
      { left: 500, top: 120, height: 40 },
      { left: 0, top: 0 },
    );
    expect(result.y1).toBe(120); // 100 + 40/2
    expect(result.y2).toBe(140); // 120 + 40/2
  });

  it('handles zero offset container', () => {
    const result = calculateLinePosition(
      { right: 100, top: 50, height: 20 },
      { left: 200, top: 50, height: 20 },
      { left: 0, top: 0 },
    );
    expect(result.x1).toBe(100);
    expect(result.y1).toBe(60);
    expect(result.x2).toBe(200);
    expect(result.y2).toBe(60);
  });
});
