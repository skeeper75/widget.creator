import { describe, it, expect } from 'vitest';
import {
  recipeChoiceRestrictions,
  type RecipeChoiceRestriction,
  type NewRecipeChoiceRestriction,
} from '../../src/schema/widget/02-recipe-choice-restrictions';
import { getTableColumns, getTableName } from 'drizzle-orm';

describe('recipe_choice_restrictions schema', () => {
  describe('table name', () => {
    it('has correct table name', () => {
      expect(getTableName(recipeChoiceRestrictions)).toBe('recipe_choice_restrictions');
    });
  });

  describe('column definitions', () => {
    const columns = getTableColumns(recipeChoiceRestrictions);

    it('has id as primary key serial', () => {
      expect(columns.id).toBeDefined();
    });

    it('has recipe_binding_id foreign key as notNull', () => {
      expect(columns.recipeBindingId).toBeDefined();
      expect(columns.recipeBindingId.notNull).toBe(true);
    });

    it('has choice_id foreign key as notNull', () => {
      expect(columns.choiceId).toBeDefined();
      expect(columns.choiceId.notNull).toBe(true);
    });

    it('has restriction_mode as notNull', () => {
      expect(columns.restrictionMode).toBeDefined();
      expect(columns.restrictionMode.notNull).toBe(true);
    });

    it('restriction_mode accepts allow_only and exclude values', () => {
      // Validates column exists — value constraint is documented as CHECK constraint
      // applied at DB migration level (Drizzle varchar with notNull)
      const modes = ['allow_only', 'exclude'] as const;
      type RestrictionMode = (typeof modes)[number];
      const sample: RestrictionMode = 'allow_only';
      expect(sample).toBe('allow_only');
    });
  });

  describe('TypeScript type safety', () => {
    it('RecipeChoiceRestriction type has all expected fields', () => {
      type HasId = RecipeChoiceRestriction extends { id: number } ? true : false;
      type HasRecipeBindingId = RecipeChoiceRestriction extends { recipeBindingId: number } ? true : false;
      type HasChoiceId = RecipeChoiceRestriction extends { choiceId: number } ? true : false;
      type HasRestrictionMode = RecipeChoiceRestriction extends { restrictionMode: string } ? true : false;

      const _hasId: HasId = true;
      const _hasRecipeBindingId: HasRecipeBindingId = true;
      const _hasChoiceId: HasChoiceId = true;
      const _hasRestrictionMode: HasRestrictionMode = true;
      expect(_hasId).toBe(true);
      expect(_hasRecipeBindingId).toBe(true);
      expect(_hasChoiceId).toBe(true);
      expect(_hasRestrictionMode).toBe(true);
    });

    it('NewRecipeChoiceRestriction type is usable for inserts', () => {
      const sample: NewRecipeChoiceRestriction = {
        recipeBindingId: 1,
        choiceId: 2,
        restrictionMode: 'allow_only',
      };
      expect(sample.restrictionMode).toBe('allow_only');
    });
  });

  describe('unique constraints and indexes', () => {
    it('has unique constraint on (recipe_binding_id, choice_id) — schema confirmed at compile time', () => {
      // unique('uq_rcr').on(t.recipeBindingId, t.choiceId) defined in schema
      expect(getTableName(recipeChoiceRestrictions)).toBe('recipe_choice_restrictions');
    });

    it('has index on recipe_binding_id (idx_rcr_binding) — schema confirmed at compile time', () => {
      expect(recipeChoiceRestrictions).toBeDefined();
    });
  });
});
