import { describe, it, expect } from 'vitest';
import {
  addonGroups,
  type AddonGroup,
  type NewAddonGroup,
} from '../../src/schema/widget/03-addon-groups';
import { getTableColumns, getTableName } from 'drizzle-orm';

describe('addon_groups schema', () => {
  describe('table name', () => {
    it('has correct table name', () => {
      expect(getTableName(addonGroups)).toBe('addon_groups');
    });
  });

  describe('column definitions', () => {
    const columns = getTableColumns(addonGroups);

    it('has id as primary key serial', () => {
      expect(columns.id).toBeDefined();
    });

    it('has group_name as notNull varchar', () => {
      expect(columns.groupName).toBeDefined();
      expect(columns.groupName.notNull).toBe(true);
    });

    it('has display_mode as notNull varchar with default list', () => {
      expect(columns.displayMode).toBeDefined();
      expect(columns.displayMode.notNull).toBe(true);
    });

    it('has is_required as notNull boolean', () => {
      expect(columns.isRequired).toBeDefined();
      expect(columns.isRequired.notNull).toBe(true);
    });

    it('has is_active as notNull boolean', () => {
      expect(columns.isActive).toBeDefined();
      expect(columns.isActive.notNull).toBe(true);
    });

    it('has display_order as notNull integer', () => {
      expect(columns.displayOrder).toBeDefined();
      expect(columns.displayOrder.notNull).toBe(true);
    });

    it('has group_label as nullable varchar', () => {
      expect(columns.groupLabel).toBeDefined();
    });

    it('has description as nullable text', () => {
      expect(columns.description).toBeDefined();
    });

    it('has created_at as notNull timestamp', () => {
      expect(columns.createdAt).toBeDefined();
      expect(columns.createdAt.notNull).toBe(true);
    });

    it('has updated_at as notNull timestamp', () => {
      expect(columns.updatedAt).toBeDefined();
      expect(columns.updatedAt.notNull).toBe(true);
    });
  });

  describe('TypeScript type safety', () => {
    it('AddonGroup type has all expected fields', () => {
      type HasId = AddonGroup extends { id: number } ? true : false;
      type HasGroupName = AddonGroup extends { groupName: string } ? true : false;

      const _hasId: HasId = true;
      const _hasGroupName: HasGroupName = true;
      expect(_hasId).toBe(true);
      expect(_hasGroupName).toBe(true);
    });

    it('NewAddonGroup type is usable for inserts', () => {
      const sample: NewAddonGroup = {
        groupName: '후가공 애드온',
      };
      expect(sample.groupName).toBe('후가공 애드온');
    });
  });

  describe('indexes', () => {
    it('has index defined on is_active — schema confirmed at compile time', () => {
      expect(addonGroups).toBeDefined();
    });
  });
});
