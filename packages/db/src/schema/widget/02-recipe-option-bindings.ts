import {
  pgTable,
  serial,
  boolean,
  integer,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { productRecipes } from './02-product-recipes';
import { optionElementTypes } from './01-element-types';
import { optionElementChoices } from './02-element-choices';

// recipe_option_bindings: Links product recipes to option element types with ordering
// SPEC-WB-002 FR-WB002-04
// @MX:NOTE: [AUTO] Dual ordering design: display_order (customer UI sequence) != processing_order (pricing/MES logic sequence)
// @MX:REASON: Customer sees options in display_order; backend processes in processing_order for price calculation.
// @MX:SPEC: SPEC-WB-002 Section 1.3, FR-WB002-04
export const recipeOptionBindings = pgTable(
  'recipe_option_bindings',
  {
    id: serial('id').primaryKey(),
    recipeId: integer('recipe_id')
      .notNull()
      .references(() => productRecipes.id, { onDelete: 'cascade' })
      ,
    typeId: integer('type_id')
      .notNull()
      .references(() => optionElementTypes.id)
      ,
    displayOrder: integer('display_order').notNull().default(0),
    processingOrder: integer('processing_order').notNull().default(0),
    isRequired: boolean('is_required').notNull().default(true),
    defaultChoiceId: integer('default_choice_id').references(() => optionElementChoices.id),
    isActive: boolean('is_active').notNull().default(true),
  },
  (t) => [
    unique('uq_rob_recipe_type').on(t.recipeId, t.typeId),
    index('idx_rob_recipe').on(t.recipeId),
    index('idx_rob_display').on(t.recipeId, t.displayOrder),
    index('idx_rob_processing').on(t.recipeId, t.processingOrder),
  ],
);

export type RecipeOptionBinding = typeof recipeOptionBindings.$inferSelect;
export type NewRecipeOptionBinding = typeof recipeOptionBindings.$inferInsert;
