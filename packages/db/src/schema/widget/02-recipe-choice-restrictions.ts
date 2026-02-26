import {
  pgTable,
  serial,
  varchar,
  integer,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { recipeOptionBindings } from './02-recipe-option-bindings';
import { optionElementChoices } from './02-element-choices';

// recipe_choice_restrictions: Allow/exclude choice lists for specific recipe-option bindings
// SPEC-WB-002 FR-WB002-05
export const recipeChoiceRestrictions = pgTable(
  'recipe_choice_restrictions',
  {
    id: serial('id').primaryKey(),
    recipeBindingId: integer('recipe_binding_id')
      .notNull()
      .references(() => recipeOptionBindings.id, { onDelete: 'cascade' }),
    choiceId: integer('choice_id')
      .notNull()
      .references(() => optionElementChoices.id),
    // restriction_mode: 'allow_only' | 'exclude' — CHECK constraint applied at DB migration level
    restrictionMode: varchar('restriction_mode', { length: 20 }).notNull(),
  },
  (t) => [
    unique('uq_rcr').on(t.recipeBindingId, t.choiceId),
    index('idx_rcr_binding').on(t.recipeBindingId),
  ],
);

export type RecipeChoiceRestriction = typeof recipeChoiceRestrictions.$inferSelect;
export type NewRecipeChoiceRestriction = typeof recipeChoiceRestrictions.$inferInsert;
