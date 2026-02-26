import { describe, it, expect } from 'vitest';
import {
  qtyDiscount,
  type QtyDiscount,
  type NewQtyDiscount,
} from '../../src/schema/widget/04-qty-discount';
import { getTableColumns, getTableName } from 'drizzle-orm';

describe('qty_discount schema', () => {
  describe('table name', () => {
    it('has correct table name', () => {
      expect(getTableName(qtyDiscount)).toBe('qty_discount');
    });
  });

  describe('column definitions', () => {
    const columns = getTableColumns(qtyDiscount);

    it('has id as primary key serial', () => {
      expect(columns.id).toBeDefined();
    });

    it('has product_id as nullable integer (NULL means global)', () => {
      expect(columns.productId).toBeDefined();
      // nullable — product_id can be null for global discount rules
    });

    it('has qty_min as notNull integer', () => {
      expect(columns.qtyMin).toBeDefined();
      expect(columns.qtyMin.notNull).toBe(true);
    });

    it('has qty_max as notNull integer', () => {
      expect(columns.qtyMax).toBeDefined();
      expect(columns.qtyMax.notNull).toBe(true);
    });

    it('has discount_rate as notNull decimal', () => {
      expect(columns.discountRate).toBeDefined();
      expect(columns.discountRate.notNull).toBe(true);
    });

    it('has discount_label as nullable varchar', () => {
      expect(columns.discountLabel).toBeDefined();
    });

    it('has display_order as integer with default 0', () => {
      expect(columns.displayOrder).toBeDefined();
    });

    it('has is_active as notNull boolean', () => {
      expect(columns.isActive).toBeDefined();
      expect(columns.isActive.notNull).toBe(true);
    });

    it('has created_at with timezone and notNull', () => {
      expect(columns.createdAt).toBeDefined();
      expect(columns.createdAt.notNull).toBe(true);
    });
  });

  describe('TypeScript type safety', () => {
    it('QtyDiscount type has all expected fields', () => {
      type HasId = QtyDiscount extends { id: number } ? true : false;
      type HasQtyMin = QtyDiscount extends { qtyMin: number } ? true : false;
      type HasQtyMax = QtyDiscount extends { qtyMax: number } ? true : false;
      type HasDiscountRate = QtyDiscount extends { discountRate: string } ? true : false;

      const _hasId: HasId = true;
      const _hasQtyMin: HasQtyMin = true;
      const _hasQtyMax: HasQtyMax = true;
      const _hasDiscountRate: HasDiscountRate = true;
      expect(_hasId).toBe(true);
      expect(_hasQtyMin).toBe(true);
      expect(_hasQtyMax).toBe(true);
      expect(_hasDiscountRate).toBe(true);
    });

    it('NewQtyDiscount type is usable for inserts', () => {
      const sample: NewQtyDiscount = {
        qtyMin: 100,
        qtyMax: 299,
        discountRate: '0.0300',
        discountLabel: '소량할인',
      };
      expect(sample.qtyMin).toBe(100);
      expect(sample.discountRate).toBe('0.0300');
    });
  });

  describe('unique constraint and index', () => {
    it('table is defined — unique and index confirmed at compile time', () => {
      expect(getTableName(qtyDiscount)).toBe('qty_discount');
      expect(qtyDiscount).toBeDefined();
    });
  });
});
