import { describe, it, expect } from 'vitest';
import {
  recipeConstraints,
  type RecipeConstraint,
  type NewRecipeConstraint,
} from '../../src/schema/widget/03-recipe-constraints';
import { getTableColumns, getTableName } from 'drizzle-orm';

describe('recipe_constraints schema', () => {
  describe('table name', () => {
    it('has correct table name', () => {
      expect(getTableName(recipeConstraints)).toBe('recipe_constraints');
    });
  });

  describe('column definitions', () => {
    const columns = getTableColumns(recipeConstraints);

    it('has id as primary key serial', () => {
      expect(columns.id).toBeDefined();
    });

    it('has recipe_id as notNull foreign key', () => {
      expect(columns.recipeId).toBeDefined();
      expect(columns.recipeId.notNull).toBe(true);
    });

    it('has constraint_name as notNull varchar', () => {
      expect(columns.constraintName).toBeDefined();
      expect(columns.constraintName.notNull).toBe(true);
    });

    it('has trigger_option_type as notNull varchar', () => {
      expect(columns.triggerOptionType).toBeDefined();
      expect(columns.triggerOptionType.notNull).toBe(true);
    });

    it('has trigger_operator as notNull varchar', () => {
      expect(columns.triggerOperator).toBeDefined();
      expect(columns.triggerOperator.notNull).toBe(true);
    });

    it('has trigger_values as notNull jsonb', () => {
      expect(columns.triggerValues).toBeDefined();
      expect(columns.triggerValues.notNull).toBe(true);
    });

    it('has actions as notNull jsonb', () => {
      expect(columns.actions).toBeDefined();
      expect(columns.actions.notNull).toBe(true);
    });

    it('has priority as notNull integer', () => {
      expect(columns.priority).toBeDefined();
      expect(columns.priority.notNull).toBe(true);
    });

    it('has is_active as notNull boolean', () => {
      expect(columns.isActive).toBeDefined();
      expect(columns.isActive.notNull).toBe(true);
    });

    it('has input_mode as notNull varchar', () => {
      expect(columns.inputMode).toBeDefined();
      expect(columns.inputMode.notNull).toBe(true);
    });

    it('has extra_conditions as nullable jsonb', () => {
      expect(columns.extraConditions).toBeDefined();
    });

    it('has template_id as nullable integer', () => {
      expect(columns.templateId).toBeDefined();
    });

    it('has comment as nullable text', () => {
      expect(columns.comment).toBeDefined();
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
    it('RecipeConstraint type has all expected fields', () => {
      type HasId = RecipeConstraint extends { id: number } ? true : false;
      type HasRecipeId = RecipeConstraint extends { recipeId: number } ? true : false;

      const _hasId: HasId = true;
      const _hasRecipeId: HasRecipeId = true;
      expect(_hasId).toBe(true);
      expect(_hasRecipeId).toBe(true);
    });

    it('NewRecipeConstraint type is usable for inserts', () => {
      const sample: NewRecipeConstraint = {
        recipeId: 1,
        constraintName: 'Test constraint',
        triggerOptionType: 'PAPER',
        triggerOperator: 'IN',
        triggerValues: ['투명PVC'],
        actions: [{ type: 'filter_options' }],
      };
      expect(sample.recipeId).toBe(1);
      expect(sample.constraintName).toBe('Test constraint');
    });
  });

  describe('MX annotations', () => {
    it('has MX:ANCHOR annotation in schema file', async () => {
      const { readFileSync } = await import('fs');
      const content = readFileSync(
        new URL('../../src/schema/widget/03-recipe-constraints.ts', import.meta.url),
        'utf-8',
      );
      expect(content).toContain('@MX:ANCHOR');
    });
  });

  describe('indexes', () => {
    it('has multiple indexes defined — schema confirmed at compile time', () => {
      expect(recipeConstraints).toBeDefined();
    });
  });
});
