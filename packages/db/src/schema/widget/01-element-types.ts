import { sql } from 'drizzle-orm';
import {
  pgTable,
  serial,
  varchar,
  boolean,
  integer,
  text,
  index,
  timestamp,
} from 'drizzle-orm/pg-core';

// TypeScript literal union types for type safety
export type UiControl =
  | 'toggle-group'
  | 'toggle-multi'
  | 'select'
  | 'number-stepper'
  | 'slider'
  | 'checkbox'
  | 'collapsible'
  | 'color-swatch'
  | 'image-toggle'
  | 'text-input';

export type OptionCategory = 'material' | 'process' | 'spec' | 'quantity' | 'group';

// option_element_types: Widget Builder option type vocabulary
// SPEC-WB-001 Section 4.1
// @MX:ANCHOR: [AUTO] Foundation of SPEC-WB-001 -> WB-002 -> WB-003 -> WB-005 chain.
// @MX:REASON: High fan_in — referenced by option_element_choices and future recipe tables.
// @MX:NOTE: [AUTO] This table defines the option type vocabulary for Widget Builder.
// @MX:NOTE: Core domain model — independent of external systems (MES, Shopby, WowPress).
export const optionElementTypes = pgTable(
  'option_element_types',
  {
    id: serial('id').primaryKey(),
    typeKey: varchar('type_key', { length: 50 }).unique().notNull(),
    typeNameKo: varchar('type_name_ko', { length: 100 }).notNull(),
    typeNameEn: varchar('type_name_en', { length: 100 }).notNull(),
    uiControl: varchar('ui_control', { length: 30 }).notNull(),
    optionCategory: varchar('option_category', { length: 20 }).notNull().default('spec'),
    allowsCustom: boolean('allows_custom').notNull().default(false),
    displayOrder: integer('display_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_oet_type_key').on(t.typeKey),
    index('idx_oet_active').on(t.isActive).where(sql`${t.isActive} = true`),
    index('idx_oet_category').on(t.optionCategory),
  ],
);

export type OptionElementType = typeof optionElementTypes.$inferSelect;
export type NewOptionElementType = typeof optionElementTypes.$inferInsert;
