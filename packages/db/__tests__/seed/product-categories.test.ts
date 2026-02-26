import { describe, it, expect } from 'vitest';
import { STANDARD_PRODUCT_CATEGORIES } from '../../src/seed/seed-product-categories';

const EXPECTED_CATEGORY_KEYS = [
  'digital-print',
  'sticker',
  'book',
  'photobook',
  'calendar',
  'design-calendar',
  'sign-poster',
  'acrylic',
  'goods',
  'stationery',
  'accessories',
] as const;

describe('STANDARD_PRODUCT_CATEGORIES seed data', () => {
  it('contains exactly 11 categories', () => {
    expect(STANDARD_PRODUCT_CATEGORIES).toHaveLength(11);
  });

  it('has no duplicate category_key values', () => {
    const keys = STANDARD_PRODUCT_CATEGORIES.map((c) => c.categoryKey);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  it('contains all expected category keys', () => {
    const actualKeys = STANDARD_PRODUCT_CATEGORIES.map((c) => c.categoryKey);
    for (const expected of EXPECTED_CATEGORY_KEYS) {
      expect(actualKeys).toContain(expected);
    }
  });

  it.each(STANDARD_PRODUCT_CATEGORIES)('$categoryKey has required fields', (category) => {
    expect(category.categoryKey).toBeTruthy();
    expect(category.categoryNameKo).toBeTruthy();
    expect(typeof category.displayOrder).toBe('number');
  });

  it('has display_order sequential from 1 to 11', () => {
    const orders = STANDARD_PRODUCT_CATEGORIES.map((c) => c.displayOrder as number).sort((a, b) => a - b);
    expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  describe('specific category validations', () => {
    it('digital-print is first with display_order 1', () => {
      const cat = STANDARD_PRODUCT_CATEGORIES.find((c) => c.categoryKey === 'digital-print');
      expect(cat).toBeDefined();
      expect(cat?.categoryNameKo).toBe('디지털인쇄');
      expect(cat?.displayOrder).toBe(1);
    });

    it('sticker has display_order 2', () => {
      const cat = STANDARD_PRODUCT_CATEGORIES.find((c) => c.categoryKey === 'sticker');
      expect(cat?.displayOrder).toBe(2);
    });

    it('accessories is last with display_order 11', () => {
      const cat = STANDARD_PRODUCT_CATEGORIES.find((c) => c.categoryKey === 'accessories');
      expect(cat?.displayOrder).toBe(11);
    });

    it('design-calendar key matches exactly', () => {
      const cat = STANDARD_PRODUCT_CATEGORIES.find((c) => c.categoryKey === 'design-calendar');
      expect(cat).toBeDefined();
      expect(cat?.categoryNameKo).toBe('디자인캘린더');
    });

    it('sign-poster key matches exactly', () => {
      const cat = STANDARD_PRODUCT_CATEGORIES.find((c) => c.categoryKey === 'sign-poster');
      expect(cat).toBeDefined();
      expect(cat?.categoryNameKo).toBe('사인/포스터');
    });
  });
});
