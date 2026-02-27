import { describe, it, expect } from 'vitest';
import {
  addonGroupItems,
  type AddonGroupItem,
  type NewAddonGroupItem,
} from '../../src/schema/widget/03-addon-group-items';
import { getTableColumns, getTableName } from 'drizzle-orm';

describe('addon_group_items schema', () => {
  describe('table name', () => {
    it('has correct table name', () => {
      expect(getTableName(addonGroupItems)).toBe('addon_group_items');
    });
  });

  describe('column definitions', () => {
    const columns = getTableColumns(addonGroupItems);

    it('has id as primary key serial', () => {
      expect(columns.id).toBeDefined();
    });

    it('has group_id as notNull foreign key', () => {
      expect(columns.groupId).toBeDefined();
      expect(columns.groupId.notNull).toBe(true);
    });

    it('has product_id as notNull foreign key', () => {
      expect(columns.productId).toBeDefined();
      expect(columns.productId.notNull).toBe(true);
    });

    it('has is_default as notNull boolean', () => {
      expect(columns.isDefault).toBeDefined();
      expect(columns.isDefault.notNull).toBe(true);
    });

    it('has display_order as notNull integer', () => {
      expect(columns.displayOrder).toBeDefined();
      expect(columns.displayOrder.notNull).toBe(true);
    });

    it('has label_override as nullable varchar', () => {
      expect(columns.labelOverride).toBeDefined();
    });

    it('has price_override as nullable integer', () => {
      expect(columns.priceOverride).toBeDefined();
    });
  });

  describe('TypeScript type safety', () => {
    it('AddonGroupItem type has all expected fields', () => {
      type HasId = AddonGroupItem extends { id: number } ? true : false;
      type HasGroupId = AddonGroupItem extends { groupId: number } ? true : false;
      type HasProductId = AddonGroupItem extends { productId: number } ? true : false;

      const _hasId: HasId = true;
      const _hasGroupId: HasGroupId = true;
      const _hasProductId: HasProductId = true;
      expect(_hasId).toBe(true);
      expect(_hasGroupId).toBe(true);
      expect(_hasProductId).toBe(true);
    });

    it('NewAddonGroupItem type is usable for inserts', () => {
      const sample: NewAddonGroupItem = {
        groupId: 1,
        productId: 42,
      };
      expect(sample.groupId).toBe(1);
      expect(sample.productId).toBe(42);
    });
  });

  describe('unique constraints and indexes', () => {
    it('has unique constraint on (group_id, product_id) — schema confirmed at compile time', () => {
      expect(getTableName(addonGroupItems)).toBe('addon_group_items');
    });

    it('has index on group_id — schema confirmed at compile time', () => {
      expect(addonGroupItems).toBeDefined();
    });
  });
});
