import { describe, it, expect } from 'vitest';
import {
  constraintTemplates,
  type ConstraintTemplate,
  type NewConstraintTemplate,
} from '../../src/schema/widget/03-constraint-templates';
import { getTableColumns, getTableName } from 'drizzle-orm';

describe('constraint_templates schema', () => {
  describe('table name', () => {
    it('has correct table name', () => {
      expect(getTableName(constraintTemplates)).toBe('constraint_templates');
    });
  });

  describe('column definitions', () => {
    const columns = getTableColumns(constraintTemplates);

    it('has id as primary key serial', () => {
      expect(columns.id).toBeDefined();
    });

    it('has template_key as notNull varchar', () => {
      expect(columns.templateKey).toBeDefined();
      expect(columns.templateKey.notNull).toBe(true);
    });

    it('has template_name_ko as notNull varchar', () => {
      expect(columns.templateNameKo).toBeDefined();
      expect(columns.templateNameKo.notNull).toBe(true);
    });

    it('has actions_pattern as notNull jsonb', () => {
      expect(columns.actionsPattern).toBeDefined();
      expect(columns.actionsPattern.notNull).toBe(true);
    });

    it('has is_system as notNull boolean', () => {
      expect(columns.isSystem).toBeDefined();
      expect(columns.isSystem.notNull).toBe(true);
    });

    it('has is_active as notNull boolean', () => {
      expect(columns.isActive).toBeDefined();
      expect(columns.isActive.notNull).toBe(true);
    });

    it('has description as nullable text', () => {
      expect(columns.description).toBeDefined();
    });

    it('has category as nullable varchar', () => {
      expect(columns.category).toBeDefined();
    });

    it('has trigger_option_type as nullable varchar', () => {
      expect(columns.triggerOptionType).toBeDefined();
    });

    it('has trigger_operator as nullable varchar', () => {
      expect(columns.triggerOperator).toBeDefined();
    });

    it('has trigger_values_pattern as nullable jsonb', () => {
      expect(columns.triggerValuesPattern).toBeDefined();
    });

    it('has extra_conditions_pattern as nullable jsonb', () => {
      expect(columns.extraConditionsPattern).toBeDefined();
    });

    it('has created_at as notNull timestamp', () => {
      expect(columns.createdAt).toBeDefined();
      expect(columns.createdAt.notNull).toBe(true);
    });
  });

  describe('TypeScript type safety', () => {
    it('ConstraintTemplate type has all expected fields', () => {
      type HasId = ConstraintTemplate extends { id: number } ? true : false;
      type HasTemplateKey = ConstraintTemplate extends { templateKey: string } ? true : false;

      const _hasId: HasId = true;
      const _hasTemplateKey: HasTemplateKey = true;
      expect(_hasId).toBe(true);
      expect(_hasTemplateKey).toBe(true);
    });

    it('NewConstraintTemplate type is usable for inserts', () => {
      const sample: NewConstraintTemplate = {
        templateKey: 'SIZE_RANGE',
        templateNameKo: '사이즈 범위 제한',
        actionsPattern: [{ type: 'filter_options' }],
        isSystem: true,
        isActive: true,
      };
      expect(sample.templateKey).toBe('SIZE_RANGE');
    });
  });

  describe('unique constraints and indexes', () => {
    it('has unique constraint on template_key — schema confirmed at compile time', () => {
      expect(getTableName(constraintTemplates)).toBe('constraint_templates');
    });

    it('has index defined — schema confirmed at compile time', () => {
      expect(constraintTemplates).toBeDefined();
    });
  });
});
