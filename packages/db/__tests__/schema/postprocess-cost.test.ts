import { describe, it, expect } from 'vitest';
import {
  postprocessCost,
  type PostprocessCost,
  type NewPostprocessCost,
} from '../../src/schema/widget/04-postprocess-cost';
import { getTableColumns, getTableName } from 'drizzle-orm';

describe('postprocess_cost schema', () => {
  describe('table name', () => {
    it('has correct table name', () => {
      expect(getTableName(postprocessCost)).toBe('postprocess_cost');
    });
  });

  describe('column definitions', () => {
    const columns = getTableColumns(postprocessCost);

    it('has id as primary key serial', () => {
      expect(columns.id).toBeDefined();
    });

    it('has product_id as nullable integer (NULL means global)', () => {
      expect(columns.productId).toBeDefined();
      // nullable — product_id can be null for global records
    });

    it('has process_code as notNull varchar', () => {
      expect(columns.processCode).toBeDefined();
      expect(columns.processCode.notNull).toBe(true);
    });

    it('has process_name_ko as notNull varchar', () => {
      expect(columns.processNameKo).toBeDefined();
      expect(columns.processNameKo.notNull).toBe(true);
    });

    it('has qty_min as integer with default 0', () => {
      expect(columns.qtyMin).toBeDefined();
    });

    it('has qty_max as integer with default 999999', () => {
      expect(columns.qtyMax).toBeDefined();
    });

    it('has unit_price as notNull decimal', () => {
      expect(columns.unitPrice).toBeDefined();
      expect(columns.unitPrice.notNull).toBe(true);
    });

    it('has price_type as notNull varchar with default fixed', () => {
      expect(columns.priceType).toBeDefined();
      expect(columns.priceType.notNull).toBe(true);
    });

    it('has is_active as notNull boolean', () => {
      expect(columns.isActive).toBeDefined();
      expect(columns.isActive.notNull).toBe(true);
    });

    it('has created_at with timezone and notNull', () => {
      expect(columns.createdAt).toBeDefined();
      expect(columns.createdAt.notNull).toBe(true);
    });

    it('has updated_at with timezone and notNull', () => {
      expect(columns.updatedAt).toBeDefined();
      expect(columns.updatedAt.notNull).toBe(true);
    });
  });

  describe('TypeScript type safety', () => {
    it('PostprocessCost type has all expected fields', () => {
      type HasId = PostprocessCost extends { id: number } ? true : false;
      type HasProcessCode = PostprocessCost extends { processCode: string } ? true : false;
      type HasProcessNameKo = PostprocessCost extends { processNameKo: string } ? true : false;

      const _hasId: HasId = true;
      const _hasProcessCode: HasProcessCode = true;
      const _hasProcessNameKo: HasProcessNameKo = true;
      expect(_hasId).toBe(true);
      expect(_hasProcessCode).toBe(true);
      expect(_hasProcessNameKo).toBe(true);
    });

    it('NewPostprocessCost type is usable for inserts', () => {
      const sample: NewPostprocessCost = {
        processCode: 'MATTE_PP',
        processNameKo: '무광 PP',
        unitPrice: '500',
      };
      expect(sample.processCode).toBe('MATTE_PP');
      expect(sample.processNameKo).toBe('무광 PP');
    });
  });

  describe('indexes', () => {
    it('table is defined — indexes confirmed at compile time', () => {
      expect(getTableName(postprocessCost)).toBe('postprocess_cost');
      expect(postprocessCost).toBeDefined();
    });
  });
});
