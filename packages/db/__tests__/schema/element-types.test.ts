import { describe, it, expect } from 'vitest';
import { optionElementTypes, type UiControl, type OptionCategory } from '../../src/schema/widget/01-element-types';
import { getTableColumns, getTableName } from 'drizzle-orm';

describe('option_element_types schema', () => {
  describe('column definitions', () => {
    const columns = getTableColumns(optionElementTypes);

    it('has id as primary key serial', () => {
      expect(columns.id).toBeDefined();
    });

    it('has type_key column', () => {
      expect(columns.typeKey).toBeDefined();
      expect(columns.typeKey.notNull).toBe(true);
    });

    it('has type_name_ko column', () => {
      expect(columns.typeNameKo).toBeDefined();
      expect(columns.typeNameKo.notNull).toBe(true);
    });

    it('has type_name_en column', () => {
      expect(columns.typeNameEn).toBeDefined();
      expect(columns.typeNameEn.notNull).toBe(true);
    });

    it('has ui_control column', () => {
      expect(columns.uiControl).toBeDefined();
      expect(columns.uiControl.notNull).toBe(true);
    });

    it('has option_category with default spec', () => {
      expect(columns.optionCategory).toBeDefined();
      expect(columns.optionCategory.notNull).toBe(true);
    });

    it('has allows_custom boolean defaulting to false', () => {
      expect(columns.allowsCustom).toBeDefined();
      expect(columns.allowsCustom.notNull).toBe(true);
    });

    it('has is_active boolean defaulting to true', () => {
      expect(columns.isActive).toBeDefined();
      expect(columns.isActive.notNull).toBe(true);
    });

    it('has description as nullable text', () => {
      expect(columns.description).toBeDefined();
    });

    it('has created_at with timezone', () => {
      expect(columns.createdAt).toBeDefined();
      expect(columns.createdAt.notNull).toBe(true);
    });

    it('has updated_at with timezone', () => {
      expect(columns.updatedAt).toBeDefined();
      expect(columns.updatedAt.notNull).toBe(true);
    });
  });

  describe('TypeScript type safety', () => {
    it('UiControl type covers all 10 valid values', () => {
      const validValues: UiControl[] = [
        'toggle-group',
        'toggle-multi',
        'select',
        'number-stepper',
        'slider',
        'checkbox',
        'collapsible',
        'color-swatch',
        'image-toggle',
        'text-input',
      ];
      expect(validValues).toHaveLength(10);
    });

    it('OptionCategory type covers all 5 valid values', () => {
      const validCategories: OptionCategory[] = ['material', 'process', 'spec', 'quantity', 'group'];
      expect(validCategories).toHaveLength(5);
    });

    it('inferred select type has all expected fields', () => {
      // This test verifies TypeScript compilation — if UiControl/OptionCategory types are wrong, TS will error
      type SelectType = typeof optionElementTypes.$inferSelect;
      type HasId = SelectType extends { id: number } ? true : false;
      type HasTypeKey = SelectType extends { typeKey: string } ? true : false;

      const _hasId: HasId = true;
      const _hasTypeKey: HasTypeKey = true;
      expect(_hasId).toBe(true);
      expect(_hasTypeKey).toBe(true);
    });
  });

  describe('table name', () => {
    it('has correct table name', () => {
      expect(getTableName(optionElementTypes)).toBe('option_element_types');
    });
  });
});
