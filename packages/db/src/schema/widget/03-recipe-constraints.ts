import { sql } from 'drizzle-orm';
import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  integer,
  jsonb,
  index,
  timestamp,
} from 'drizzle-orm/pg-core';
import { productRecipes } from './02-product-recipes';
import { constraintTemplates } from './03-constraint-templates';

// @MX:ANCHOR: [AUTO] recipe_constraints — Core ECA table, referenced by constraint service, evaluate endpoint, admin routes, nl_history FK
// @MX:REASON: fan_in >= 3 (constraint service, evaluate endpoint, admin routes, nl_history FK)
// @MX:SPEC: SPEC-WB-003

// recipe_constraints: ECA (Event-Condition-Action) constraint rules per product recipe
// SPEC-WB-003 FR-WB003-01 through FR-WB003-09
export const recipeConstraints = pgTable(
  'recipe_constraints',
  {
    id: serial('id').primaryKey(),
    recipeId: integer('recipe_id')
      .notNull()
      .references(() => productRecipes.id, { onDelete: 'cascade' })
      ,
    constraintName: varchar('constraint_name', { length: 100 }).notNull(),
    triggerOptionType: varchar('trigger_option_type', { length: 50 }).notNull(),
    triggerOperator: varchar('trigger_operator', { length: 20 }).notNull(),
    // @MX:NOTE: [AUTO] trigger_values — JSONB magic — array of trigger match values (e.g. ["투명PVC", "OPP"])
    triggerValues: jsonb('trigger_values').notNull(),
    extraConditions: jsonb('extra_conditions'),
    // @MX:NOTE: [AUTO] actions — JSONB magic — ECA action array, minimum 1 required (validated at API level)
    actions: jsonb('actions').notNull(),
    priority: integer('priority').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    // input_mode: 'manual' | 'template' | 'nl' — how this constraint was created
    inputMode: varchar('input_mode', { length: 20 }).notNull().default('manual'),
    templateId: integer('template_id').references(() => constraintTemplates.id),
    comment: text('comment'),
    createdBy: varchar('created_by', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_rc_recipe').on(t.recipeId),
    index('idx_rc_trigger').on(t.recipeId, t.triggerOptionType),
    index('idx_rc_active').on(t.recipeId, t.isActive).where(sql`${t.isActive} = true`),
    index('idx_rc_priority').on(t.recipeId, t.priority),
  ],
);

export type RecipeConstraint = typeof recipeConstraints.$inferSelect;
export type NewRecipeConstraint = typeof recipeConstraints.$inferInsert;
