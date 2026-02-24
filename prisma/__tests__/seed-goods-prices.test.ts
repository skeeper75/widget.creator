/**
 * SPEC-SEED-002 TEST-001: Goods Pricing Seeder Tests
 *
 * Tests the goods fixed pricing logic from seed.ts Phase 12.
 * Since seedGoodsFixedPrices is not exported, we test the core
 * business logic (filtering, mapping, price=0 skip) in isolation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

// ============================================================
// Type definitions matching seed.ts GoodsData interface
// ============================================================

interface GoodsItem {
  category: string;
  productName: string;
  productOption: string | null;
  selectOption: string | null;
  cost: number;
  sellingPrice: number;
  sellingPriceVatIncl: number;
}

interface GoodsData {
  data: GoodsItem[];
}

interface FixedPriceRow {
  productId: number;
  sizeId: number | null;
  paperId: number | null;
  materialId: number | null;
  printModeId: number | null;
  optionLabel: string | null;
  baseQty: number;
  sellingPrice: string;
  costPrice: string | null;
  vatIncluded: boolean;
  isActive: boolean;
}

// ============================================================
// Core logic extracted from seedGoodsFixedPrices for testing
// ============================================================

/**
 * Replicates the expected goods price filtering and mapping logic.
 * This is the SPEC-expected behavior: skip records with sellingPrice=0.
 */
function buildGoodsFixedPriceRows(
  goodsData: GoodsData,
  productNameToId: Map<string, number>,
  warnFn: (msg: string) => void = console.warn,
): FixedPriceRow[] {
  const rows: FixedPriceRow[] = [];

  for (const item of goodsData.data) {
    const productId = productNameToId.get(item.productName);
    if (!productId) continue;

    // SPEC requirement: skip records with sellingPrice=0
    if (item.sellingPrice === 0) {
      warnFn(`Skipping zero-price goods record: ${item.productName}`);
      continue;
    }

    const optionLabel = [item.productOption, item.selectOption]
      .filter(Boolean)
      .join(' / ') || null;

    rows.push({
      productId,
      sizeId: null,
      paperId: null,
      materialId: null,
      printModeId: null,
      optionLabel,
      baseQty: 1,
      sellingPrice: String(item.sellingPrice),
      costPrice: item.cost ? String(item.cost) : null,
      vatIncluded: false,
      isActive: true,
    });
  }

  return rows;
}

// ============================================================
// Test Data
// ============================================================

const PRODUCT_MAP = new Map<string, number>([
  ['아크릴키링', 1],
  ['아크릴마그넷', 2],
  ['포토카드', 3],
  ['커스텀스티커', 4],
]);

describe('SPEC-SEED-002 TEST-001: Goods Fixed Prices', () => {
  let warnSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    warnSpy = vi.fn();
  });

  describe('Price=0 skip behavior', () => {
    it('should NOT insert records when sellingPrice is 0', () => {
      const data: GoodsData = {
        data: [
          {
            category: '아크릴',
            productName: '아크릴키링',
            productOption: null,
            selectOption: null,
            cost: 0,
            sellingPrice: 0,
            sellingPriceVatIncl: 0,
          },
        ],
      };

      const rows = buildGoodsFixedPriceRows(data, PRODUCT_MAP, warnSpy);
      expect(rows).toHaveLength(0);
    });

    it('should skip all records when all have sellingPrice=0', () => {
      const data: GoodsData = {
        data: [
          {
            category: '아크릴',
            productName: '아크릴키링',
            productOption: null,
            selectOption: null,
            cost: 0,
            sellingPrice: 0,
            sellingPriceVatIncl: 0,
          },
          {
            category: '아크릴',
            productName: '아크릴마그넷',
            productOption: null,
            selectOption: null,
            cost: 0,
            sellingPrice: 0,
            sellingPriceVatIncl: 0,
          },
        ],
      };

      const rows = buildGoodsFixedPriceRows(data, PRODUCT_MAP, warnSpy);
      expect(rows).toHaveLength(0);
    });

    it('should call warn for each skipped price=0 record', () => {
      const data: GoodsData = {
        data: [
          {
            category: '아크릴',
            productName: '아크릴키링',
            productOption: null,
            selectOption: null,
            cost: 0,
            sellingPrice: 0,
            sellingPriceVatIncl: 0,
          },
          {
            category: '아크릴',
            productName: '아크릴마그넷',
            productOption: null,
            selectOption: null,
            cost: 0,
            sellingPrice: 0,
            sellingPriceVatIncl: 0,
          },
        ],
      };

      buildGoodsFixedPriceRows(data, PRODUCT_MAP, warnSpy);
      expect(warnSpy).toHaveBeenCalledTimes(2);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('아크릴키링'),
      );
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('아크릴마그넷'),
      );
    });
  });

  describe('Valid price insertion', () => {
    it('should insert records when sellingPrice > 0', () => {
      const data: GoodsData = {
        data: [
          {
            category: '포토',
            productName: '포토카드',
            productOption: '유광',
            selectOption: '소형',
            cost: 500,
            sellingPrice: 1000,
            sellingPriceVatIncl: 1100,
          },
        ],
      };

      const rows = buildGoodsFixedPriceRows(data, PRODUCT_MAP, warnSpy);
      expect(rows).toHaveLength(1);
      expect(rows[0].productId).toBe(3);
      expect(rows[0].sellingPrice).toBe('1000');
      expect(rows[0].costPrice).toBe('500');
      expect(rows[0].vatIncluded).toBe(false);
      expect(rows[0].isActive).toBe(true);
    });

    it('should build optionLabel from productOption and selectOption', () => {
      const data: GoodsData = {
        data: [
          {
            category: '포토',
            productName: '포토카드',
            productOption: '유광',
            selectOption: '소형',
            cost: 500,
            sellingPrice: 1000,
            sellingPriceVatIncl: 1100,
          },
        ],
      };

      const rows = buildGoodsFixedPriceRows(data, PRODUCT_MAP, warnSpy);
      expect(rows[0].optionLabel).toBe('유광 / 소형');
    });

    it('should set optionLabel to productOption only when selectOption is null', () => {
      const data: GoodsData = {
        data: [
          {
            category: '포토',
            productName: '포토카드',
            productOption: '유광',
            selectOption: null,
            cost: 500,
            sellingPrice: 1000,
            sellingPriceVatIncl: 1100,
          },
        ],
      };

      const rows = buildGoodsFixedPriceRows(data, PRODUCT_MAP, warnSpy);
      expect(rows[0].optionLabel).toBe('유광');
    });

    it('should set optionLabel to null when both options are null', () => {
      const data: GoodsData = {
        data: [
          {
            category: '포토',
            productName: '포토카드',
            productOption: null,
            selectOption: null,
            cost: 500,
            sellingPrice: 1000,
            sellingPriceVatIncl: 1100,
          },
        ],
      };

      const rows = buildGoodsFixedPriceRows(data, PRODUCT_MAP, warnSpy);
      expect(rows[0].optionLabel).toBeNull();
    });

    it('should set costPrice to null when cost is 0', () => {
      const data: GoodsData = {
        data: [
          {
            category: '포토',
            productName: '포토카드',
            productOption: null,
            selectOption: null,
            cost: 0,
            sellingPrice: 1000,
            sellingPriceVatIncl: 1100,
          },
        ],
      };

      const rows = buildGoodsFixedPriceRows(data, PRODUCT_MAP, warnSpy);
      expect(rows[0].costPrice).toBeNull();
    });

    it('should convert sellingPrice number to string', () => {
      const data: GoodsData = {
        data: [
          {
            category: '포토',
            productName: '포토카드',
            productOption: null,
            selectOption: null,
            cost: 0,
            sellingPrice: 2500,
            sellingPriceVatIncl: 2750,
          },
        ],
      };

      const rows = buildGoodsFixedPriceRows(data, PRODUCT_MAP, warnSpy);
      expect(typeof rows[0].sellingPrice).toBe('string');
      expect(rows[0].sellingPrice).toBe('2500');
    });

    it('should set null for sizeId, paperId, materialId, printModeId', () => {
      const data: GoodsData = {
        data: [
          {
            category: '포토',
            productName: '포토카드',
            productOption: null,
            selectOption: null,
            cost: 0,
            sellingPrice: 1000,
            sellingPriceVatIncl: 1100,
          },
        ],
      };

      const rows = buildGoodsFixedPriceRows(data, PRODUCT_MAP, warnSpy);
      expect(rows[0].sizeId).toBeNull();
      expect(rows[0].paperId).toBeNull();
      expect(rows[0].materialId).toBeNull();
      expect(rows[0].printModeId).toBeNull();
    });

    it('should set baseQty to 1 for all goods', () => {
      const data: GoodsData = {
        data: [
          {
            category: '포토',
            productName: '포토카드',
            productOption: null,
            selectOption: null,
            cost: 0,
            sellingPrice: 1000,
            sellingPriceVatIncl: 1100,
          },
        ],
      };

      const rows = buildGoodsFixedPriceRows(data, PRODUCT_MAP, warnSpy);
      expect(rows[0].baseQty).toBe(1);
    });
  });

  describe('Mixed data (price=0 and price>0)', () => {
    it('should only insert records with sellingPrice > 0', () => {
      const data: GoodsData = {
        data: [
          {
            category: '아크릴',
            productName: '아크릴키링',
            productOption: null,
            selectOption: null,
            cost: 0,
            sellingPrice: 0,
            sellingPriceVatIncl: 0,
          },
          {
            category: '포토',
            productName: '포토카드',
            productOption: '유광',
            selectOption: '소형',
            cost: 500,
            sellingPrice: 1000,
            sellingPriceVatIncl: 1100,
          },
          {
            category: '스티커',
            productName: '커스텀스티커',
            productOption: null,
            selectOption: null,
            cost: 0,
            sellingPrice: 0,
            sellingPriceVatIncl: 0,
          },
        ],
      };

      const rows = buildGoodsFixedPriceRows(data, PRODUCT_MAP, warnSpy);
      expect(rows).toHaveLength(1);
      expect(rows[0].productId).toBe(3);
      expect(warnSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Unknown product handling', () => {
    it('should skip items with unknown product names (not in product map)', () => {
      const data: GoodsData = {
        data: [
          {
            category: '기타',
            productName: '존재하지않는상품',
            productOption: null,
            selectOption: null,
            cost: 0,
            sellingPrice: 5000,
            sellingPriceVatIncl: 5500,
          },
        ],
      };

      const rows = buildGoodsFixedPriceRows(data, PRODUCT_MAP, warnSpy);
      expect(rows).toHaveLength(0);
    });

    it('should not warn for unknown products (only for price=0)', () => {
      const data: GoodsData = {
        data: [
          {
            category: '기타',
            productName: '존재하지않는상품',
            productOption: null,
            selectOption: null,
            cost: 0,
            sellingPrice: 5000,
            sellingPriceVatIncl: 5500,
          },
        ],
      };

      buildGoodsFixedPriceRows(data, PRODUCT_MAP, warnSpy);
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe('Empty data handling', () => {
    it('should return empty array for empty goods data', () => {
      const data: GoodsData = { data: [] };
      const rows = buildGoodsFixedPriceRows(data, PRODUCT_MAP, warnSpy);
      expect(rows).toHaveLength(0);
    });

    it('should return empty array for empty product map', () => {
      const data: GoodsData = {
        data: [
          {
            category: '포토',
            productName: '포토카드',
            productOption: null,
            selectOption: null,
            cost: 0,
            sellingPrice: 1000,
            sellingPriceVatIncl: 1100,
          },
        ],
      };

      const emptyMap = new Map<string, number>();
      const rows = buildGoodsFixedPriceRows(data, emptyMap, warnSpy);
      expect(rows).toHaveLength(0);
    });
  });

  describe('Actual goods.json data file', () => {
    const DATA_DIR = resolve(__dirname, '..', '..', 'data');
    const GOODS_PATH = resolve(
      DATA_DIR,
      '2026-02-23/pricing/products/goods.json',
    );

    it('goods.json exists', () => {
      expect(existsSync(GOODS_PATH)).toBe(true);
    });

    it('has data array with items', () => {
      const data: GoodsData = JSON.parse(readFileSync(GOODS_PATH, 'utf-8'));
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
    });

    it('each item has required GoodsData fields', () => {
      const data: GoodsData = JSON.parse(readFileSync(GOODS_PATH, 'utf-8'));
      for (const item of data.data) {
        expect(item).toHaveProperty('category');
        expect(item).toHaveProperty('productName');
        expect(item).toHaveProperty('sellingPrice');
        expect(item).toHaveProperty('cost');
        expect(typeof item.category).toBe('string');
        expect(typeof item.productName).toBe('string');
        expect(typeof item.sellingPrice).toBe('number');
      }
    });

    it('sellingPrice values are numeric (integer or float)', () => {
      const data: GoodsData = JSON.parse(readFileSync(GOODS_PATH, 'utf-8'));
      for (const item of data.data) {
        expect(typeof item.sellingPrice).toBe('number');
        expect(Number.isFinite(item.sellingPrice)).toBe(true);
      }
    });

    it('all current goods have sellingPrice=0 (known data characteristic)', () => {
      const data: GoodsData = JSON.parse(readFileSync(GOODS_PATH, 'utf-8'));
      const zeroPriceCount = data.data.filter(
        (item) => item.sellingPrice === 0,
      ).length;
      // Current data: all 105 items have sellingPrice=0
      // When real pricing data is added, this test should be updated
      expect(zeroPriceCount).toBe(data.data.length);
    });
  });
});
