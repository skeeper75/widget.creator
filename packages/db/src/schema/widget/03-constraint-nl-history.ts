import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  integer,
  jsonb,
  decimal,
  index,
  timestamp,
} from 'drizzle-orm/pg-core';
import { productRecipes } from './02-product-recipes';
import { recipeConstraints } from './03-recipe-constraints';

// constraint_nl_history: Audit log for NL-to-constraint interpretation sessions
// SPEC-WB-003 FR-WB003-10
export const constraintNlHistory = pgTable(
  'constraint_nl_history',
  {
    id: serial('id').primaryKey(),
    constraintId: integer('constraint_id').references(() => recipeConstraints.id, {
      onDelete: 'set null',
    }),
    recipeId: integer('recipe_id')
      .notNull()
      .references(() => productRecipes.id),
    nlInputText: text('nl_input_text').notNull(),
    nlInterpretation: jsonb('nl_interpretation'),
    aiModelVersion: varchar('ai_model_version', { length: 50 }),
    interpretationScore: decimal('interpretation_score', { precision: 3, scale: 2 }),
    isApproved: boolean('is_approved').notNull().default(false),
    approvedBy: varchar('approved_by', { length: 100 }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    deviationNote: text('deviation_note'),
    createdBy: varchar('created_by', { length: 100 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_cnlh_constraint').on(t.constraintId),
    index('idx_cnlh_recipe').on(t.recipeId),
  ],
);

export type ConstraintNlHistory = typeof constraintNlHistory.$inferSelect;
export type NewConstraintNlHistory = typeof constraintNlHistory.$inferInsert;
