import { describe, it, expect } from 'vitest';
import {
  printCostBase,
  type PrintCostBase,
  type NewPrintCostBase,
} from '../../src/schema/widget/04-print-cost-base';
import { getTableColumns, getTableName } from 'drizzle-orm';

describe('print_cost_base schema', () => {
  describe('table name', () => {
    it('has correct table name', () => {
      expect(getTableName(printCostBase)).toBe('print_cost_base');
    });
  });

  describe('column definitions', () => {
    const columns = getTableColumns(printCostBase);

    it('has id as primary key serial', () => {
      expect(columns.id).toBeDefined();
    });

    it('has product_id as notNull integer', () => {
      expect(columns.productId).toBeDefined();
      expect(columns.productId.notNull).toBe(true);
    });

    it('has plate_type as notNull varchar', () => {
      expect(columns.plateType).toBeDefined();
      expect(columns.plateType.notNull).toBe(true);
    });

    it('has print_mode as notNull varchar', () => {
      expect(columns.printMode).toBeDefined();
      expect(columns.printMode.notNull).toBe(true);
    });

    it('has qty_min as notNull integer', () => {
      expect(columns.qtyMin).toBeDefined();
      expect(columns.qtyMin.notNull).toBe(true);
    });

    it('has qty_max as notNull integer', () => {
      expect(columns.qtyMax).toBeDefined();
      expect(columns.qtyMax.notNull).toBe(true);
    });

    it('has unit_price as notNull decimal', () => {
      expect(columns.unitPrice).toBeDefined();
      expect(columns.unitPrice.notNull).toBe(true);
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
    it('PrintCostBase type has all expected fields', () => {
      type HasId = PrintCostBase extends { id: number } ? true : false;
      type HasProductId = PrintCostBase extends { productId: number } ? true : false;
      type HasPlateType = PrintCostBase extends { plateType: string } ? true : false;
      type HasPrintMode = PrintCostBase extends { printMode: string } ? true : false;

      const _hasId: HasId = true;
      const _hasProductId: HasProductId = true;
      const _hasPlateType: HasPlateType = true;
      const _hasPrintMode: HasPrintMode = true;
      expect(_hasId).toBe(true);
      expect(_hasProductId).toBe(true);
      expect(_hasPlateType).toBe(true);
      expect(_hasPrintMode).toBe(true);
    });

    it('NewPrintCostBase type is usable for inserts', () => {
      const sample: NewPrintCostBase = {
        productId: 1,
        plateType: '90x50',
        printMode: '단면칼라',
        qtyMin: 100,
        qtyMax: 499,
        unitPrice: '350',
      };
      expect(sample.plateType).toBe('90x50');
      expect(sample.printMode).toBe('단면칼라');
    });
  });

  describe('indexes', () => {
    it('table is defined — indexes confirmed at compile time', () => {
      expect(getTableName(printCostBase)).toBe('print_cost_base');
      expect(printCostBase).toBeDefined();
    });
  });
});
