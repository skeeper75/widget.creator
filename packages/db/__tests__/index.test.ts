// Integration test: verify all public exports are accessible via main package entry
import { describe, it, expect } from 'vitest';
import {
  optionElementTypes,
  optionElementChoices,
  productCategories,
  wbProducts,
  productRecipes,
  recipeOptionBindings,
  recipeChoiceRestrictions,
  STANDARD_OPTION_TYPES,
  STANDARD_PRODUCT_CATEGORIES,
} from '../src/index';
import { getTableName } from 'drizzle-orm';

describe('Package exports (barrel integration)', () => {
  describe('WB-001 schema exports', () => {
    it('exports optionElementTypes from main entry', () => {
      expect(optionElementTypes).toBeDefined();
      expect(getTableName(optionElementTypes)).toBe('option_element_types');
    });

    it('exports optionElementChoices from main entry', () => {
      expect(optionElementChoices).toBeDefined();
      expect(getTableName(optionElementChoices)).toBe('option_element_choices');
    });
  });

  describe('WB-002 schema exports', () => {
    it('exports productCategories from main entry', () => {
      expect(productCategories).toBeDefined();
      expect(getTableName(productCategories)).toBe('product_categories');
    });

    it('exports wbProducts from main entry', () => {
      expect(wbProducts).toBeDefined();
      expect(getTableName(wbProducts)).toBe('wb_products');
    });

    it('exports productRecipes from main entry', () => {
      expect(productRecipes).toBeDefined();
      expect(getTableName(productRecipes)).toBe('product_recipes');
    });

    it('exports recipeOptionBindings from main entry', () => {
      expect(recipeOptionBindings).toBeDefined();
      expect(getTableName(recipeOptionBindings)).toBe('recipe_option_bindings');
    });

    it('exports recipeChoiceRestrictions from main entry', () => {
      expect(recipeChoiceRestrictions).toBeDefined();
      expect(getTableName(recipeChoiceRestrictions)).toBe('recipe_choice_restrictions');
    });
  });

  describe('Seed exports', () => {
    it('exports STANDARD_OPTION_TYPES from main entry', () => {
      expect(STANDARD_OPTION_TYPES).toBeDefined();
      expect(STANDARD_OPTION_TYPES).toHaveLength(12);
    });

    it('exports STANDARD_PRODUCT_CATEGORIES from main entry', () => {
      expect(STANDARD_PRODUCT_CATEGORIES).toBeDefined();
      expect(STANDARD_PRODUCT_CATEGORIES).toHaveLength(11);
    });
  });
});
