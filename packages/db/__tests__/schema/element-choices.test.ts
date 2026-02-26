import { describe, it, expect } from 'vitest';
import { optionElementChoices } from '../../src/schema/widget/02-element-choices';
import { getTableColumns, getTableName } from 'drizzle-orm';

describe('option_element_choices schema', () => {
  describe('column definitions', () => {
    const columns = getTableColumns(optionElementChoices);

    it('has id as serial primary key', () => {
      expect(columns.id).toBeDefined();
    });

    it('has type_id foreign key column', () => {
      expect(columns.typeId).toBeDefined();
      expect(columns.typeId.notNull).toBe(true);
    });

    it('has choice_key column', () => {
      expect(columns.choiceKey).toBeDefined();
      expect(columns.choiceKey.notNull).toBe(true);
    });

    it('has display_name column', () => {
      expect(columns.displayName).toBeDefined();
      expect(columns.displayName.notNull).toBe(true);
    });

    it('has nullable value column', () => {
      expect(columns.value).toBeDefined();
    });

    it('has nullable mes_code column', () => {
      expect(columns.mesCode).toBeDefined();
    });

    it('has display_order with default 0', () => {
      expect(columns.displayOrder).toBeDefined();
      expect(columns.displayOrder.notNull).toBe(true);
    });

    it('has is_active boolean', () => {
      expect(columns.isActive).toBeDefined();
      expect(columns.isActive.notNull).toBe(true);
    });

    it('has is_default boolean', () => {
      expect(columns.isDefault).toBeDefined();
      expect(columns.isDefault.notNull).toBe(true);
    });

    it('has SIZE-specific fields (nullable decimals)', () => {
      expect(columns.widthMm).toBeDefined();
      expect(columns.heightMm).toBeDefined();
      expect(columns.bleedMm).toBeDefined();
    });

    it('has PAPER-specific field (nullable integer)', () => {
      expect(columns.basisWeightGsm).toBeDefined();
    });

    it('has FINISHING-specific field finish_category', () => {
      expect(columns.finishCategory).toBeDefined();
    });

    it('has UI metadata fields', () => {
      expect(columns.thumbnailUrl).toBeDefined();
      expect(columns.colorHex).toBeDefined();
      expect(columns.priceImpact).toBeDefined();
    });

    it('has price_key column', () => {
      expect(columns.priceKey).toBeDefined();
    });

    it('has metadata jsonb column', () => {
      expect(columns.metadata).toBeDefined();
    });

    it('has created_at and updated_at', () => {
      expect(columns.createdAt).toBeDefined();
      expect(columns.updatedAt).toBeDefined();
    });
  });

  describe('table name', () => {
    it('has correct table name', () => {
      expect(getTableName(optionElementChoices)).toBe('option_element_choices');
    });
  });
});
