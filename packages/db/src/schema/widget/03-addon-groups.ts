import { sql } from 'drizzle-orm';
import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  integer,
  index,
  timestamp,
} from 'drizzle-orm/pg-core';

// addon_groups: Add-on product group definitions for ECA action show_addon_list
// SPEC-WB-003 FR-WB003-08
// display_mode: 'list' | 'grid' | 'carousel' — CHECK constraint applied at DB migration level
export const addonGroups = pgTable(
  'addon_groups',
  {
    id: serial('id').primaryKey(),
    groupName: varchar('group_name', { length: 100 }).notNull(),
    groupLabel: varchar('group_label', { length: 100 }),
    // display_mode: 'list' | 'grid' | 'carousel' — CHECK constraint not supported in Drizzle schema layer
    displayMode: varchar('display_mode', { length: 20 }).notNull().default('list'),
    isRequired: boolean('is_required').notNull().default(false),
    displayOrder: integer('display_order').notNull().default(0),
    description: text('description'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_ag_active').on(t.isActive).where(sql`${t.isActive} = true`),
  ],
);

export type AddonGroup = typeof addonGroups.$inferSelect;
export type NewAddonGroup = typeof addonGroups.$inferInsert;
