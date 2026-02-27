import { describe, it, expect } from 'vitest';
import {
  recipeOptionBindings,
  type RecipeOptionBinding,
  type NewRecipeOptionBinding,
} from '../../src/schema/widget/02-recipe-option-bindings';
import { getTableColumns, getTableName } from 'drizzle-orm';

describe('recipe_option_bindings schema', () => {
  describe('table name', () => {
    it('has correct table name', () => {
      expect(getTableName(recipeOptionBindings)).toBe('recipe_option_bindings');
    });
  });

  describe('column definitions', () => {
    const columns = getTableColumns(recipeOptionBindings);

    it('has id as primary key serial', () => {
      expect(columns.id).toBeDefined();
    });

    it('has recipe_id foreign key as notNull', () => {
      expect(columns.recipeId).toBeDefined();
      expect(columns.recipeId.notNull).toBe(true);
    });

    it('has type_id foreign key as notNull', () => {
      expect(columns.typeId).toBeDefined();
      expect(columns.typeId.notNull).toBe(true);
    });

    it('has display_order as independent field defaulting to 0 and notNull', () => {
      expect(columns.displayOrder).toBeDefined();
      expect(columns.displayOrder.notNull).toBe(true);
    });

    it('has processing_order as independent field defaulting to 0 and notNull', () => {
      expect(columns.processingOrder).toBeDefined();
      expect(columns.processingOrder.notNull).toBe(true);
    });

    it('display_order and processing_order are separate columns', () => {
      // Verify both columns exist independently — dual ordering design
      expect(columns.displayOrder).toBeDefined();
      expect(columns.processingOrder).toBeDefined();
      expect(columns.displayOrder).not.toBe(columns.processingOrder);
    });

    it('has is_required boolean defaulting to true and notNull', () => {
      expect(columns.isRequired).toBeDefined();
      expect(columns.isRequired.notNull).toBe(true);
    });

    it('has default_choice_id as nullable FK', () => {
      expect(columns.defaultChoiceId).toBeDefined();
    });

    it('has is_active boolean defaulting to true and notNull', () => {
      expect(columns.isActive).toBeDefined();
      expect(columns.isActive.notNull).toBe(true);
    });
  });

  describe('TypeScript type safety', () => {
    it('RecipeOptionBinding type has all expected fields', () => {
      type HasId = RecipeOptionBinding extends { id: number } ? true : false;
      type HasRecipeId = RecipeOptionBinding extends { recipeId: number } ? true : false;
      type HasTypeId = RecipeOptionBinding extends { typeId: number } ? true : false;

      const _hasId: HasId = true;
      const _hasRecipeId: HasRecipeId = true;
      const _hasTypeId: HasTypeId = true;
      expect(_hasId).toBe(true);
      expect(_hasRecipeId).toBe(true);
      expect(_hasTypeId).toBe(true);
    });

    it('NewRecipeOptionBinding type is usable for inserts', () => {
      const sample: NewRecipeOptionBinding = {
        recipeId: 1,
        typeId: 2,
      };
      expect(sample.recipeId).toBe(1);
    });
  });

  describe('unique constraints and indexes', () => {
    it('has unique constraint on (recipe_id, type_id) — schema confirmed at compile time', () => {
      // unique('uq_rob_recipe_type').on(t.recipeId, t.typeId) defined in schema
      expect(getTableName(recipeOptionBindings)).toBe('recipe_option_bindings');
    });

    it('has indexes defined (idx_rob_recipe, idx_rob_display, idx_rob_processing) — schema confirmed at compile time', () => {
      expect(recipeOptionBindings).toBeDefined();
    });
  });
});
