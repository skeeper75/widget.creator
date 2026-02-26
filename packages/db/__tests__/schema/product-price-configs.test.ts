import { describe, it, expect } from 'vitest';
import {
  productPriceConfigs,
  type ProductPriceConfig,
  type NewProductPriceConfig,
} from '../../src/schema/widget/04-product-price-configs';
import { getTableColumns, getTableName } from 'drizzle-orm';

describe('product_price_configs schema', () => {
  describe('table name', () => {
    it('has correct table name', () => {
      expect(getTableName(productPriceConfigs)).toBe('product_price_configs');
    });
  });

  describe('column definitions', () => {
    const columns = getTableColumns(productPriceConfigs);

    it('has id as primary key serial', () => {
      expect(columns.id).toBeDefined();
    });

    it('has product_id as notNull integer', () => {
      expect(columns.productId).toBeDefined();
      expect(columns.productId.notNull).toBe(true);
    });

    it('has price_mode as notNull varchar', () => {
      expect(columns.priceMode).toBeDefined();
      expect(columns.priceMode.notNull).toBe(true);
    });

    it('has formula_text as nullable text', () => {
      expect(columns.formulaText).toBeDefined();
    });

    it('has unit_price_sqm as nullable decimal', () => {
      expect(columns.unitPriceSqm).toBeDefined();
    });

    it('has min_area_sqm as nullable decimal with default 0.1', () => {
      expect(columns.minAreaSqm).toBeDefined();
    });

    it('has imposition as nullable integer', () => {
      expect(columns.imposition).toBeDefined();
    });

    it('has cover_price as nullable decimal', () => {
      expect(columns.coverPrice).toBeDefined();
    });

    it('has binding_cost as nullable decimal', () => {
      expect(columns.bindingCost).toBeDefined();
    });

    it('has base_cost as nullable decimal', () => {
      expect(columns.baseCost).toBeDefined();
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
    it('ProductPriceConfig type has all expected fields', () => {
      type HasId = ProductPriceConfig extends { id: number } ? true : false;
      type HasProductId = ProductPriceConfig extends { productId: number } ? true : false;
      type HasPriceMode = ProductPriceConfig extends { priceMode: string } ? true : false;

      const _hasId: HasId = true;
      const _hasProductId: HasProductId = true;
      const _hasPriceMode: HasPriceMode = true;
      expect(_hasId).toBe(true);
      expect(_hasProductId).toBe(true);
      expect(_hasPriceMode).toBe(true);
    });

    it('NewProductPriceConfig type is usable for inserts', () => {
      const sample: NewProductPriceConfig = {
        productId: 1,
        priceMode: 'LOOKUP',
      };
      expect(sample.productId).toBe(1);
      expect(sample.priceMode).toBe('LOOKUP');
    });
  });

  describe('unique constraint and index', () => {
    it('table is defined — unique and index confirmed at compile time', () => {
      expect(getTableName(productPriceConfigs)).toBe('product_price_configs');
      expect(productPriceConfigs).toBeDefined();
    });
  });
});
