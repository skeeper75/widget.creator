import { sql } from 'drizzle-orm';
import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  jsonb,
  index,
  unique,
  timestamp,
} from 'drizzle-orm/pg-core';

// constraint_templates: System-provided ECA constraint templates for Quick Pick seeding
// SPEC-WB-003 FR-WB003-09
export const constraintTemplates = pgTable(
  'constraint_templates',
  {
    id: serial('id').primaryKey(),
    templateKey: varchar('template_key', { length: 100 }).notNull().unique(),
    templateNameKo: varchar('template_name_ko', { length: 200 }).notNull(),
    description: text('description'),
    category: varchar('category', { length: 50 }),
    triggerOptionType: varchar('trigger_option_type', { length: 50 }),
    triggerOperator: varchar('trigger_operator', { length: 20 }),
    triggerValuesPattern: jsonb('trigger_values_pattern'),
    extraConditionsPattern: jsonb('extra_conditions_pattern'),
    // actionsPattern: ECA action array template — minimum 1 action required
    actionsPattern: jsonb('actions_pattern').notNull(),
    isSystem: boolean('is_system').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_ct_active').on(t.isActive).where(sql`${t.isActive} = true`),
  ],
);

export type ConstraintTemplate = typeof constraintTemplates.$inferSelect;
export type NewConstraintTemplate = typeof constraintTemplates.$inferInsert;
