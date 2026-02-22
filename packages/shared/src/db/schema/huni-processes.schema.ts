import {
  pgTable,
  serial,
  varchar,
  integer,
  smallint,
  numeric,
  boolean,
  timestamp,
  index,
  unique,
} from 'drizzle-orm/pg-core';

// HuniPrintMode: Print mode specifications
export const printModes = pgTable('print_modes', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).unique().notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  sides: varchar('sides', { length: 10 }).notNull(),
  colorType: varchar('color_type', { length: 20 }).notNull(),
  priceCode: smallint('price_code').notNull(),
  displayOrder: smallint('display_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index('print_modes_price_code_idx').on(t.priceCode),
]);

// HuniPostProcess: Post-processing specifications
export const postProcesses = pgTable('post_processes', {
  id: serial('id').primaryKey(),
  groupCode: varchar('group_code', { length: 20 }).notNull(),
  code: varchar('code', { length: 50 }).unique().notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  processType: varchar('process_type', { length: 30 }).notNull(),
  subOptionCode: smallint('sub_option_code'),
  subOptionName: varchar('sub_option_name', { length: 50 }),
  priceBasis: varchar('price_basis', { length: 15 }).default('per_unit').notNull(),
  sheetStandard: varchar('sheet_standard', { length: 5 }),
  displayOrder: smallint('display_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index('post_processes_group_code_idx').on(t.groupCode),
  index('post_processes_process_type_idx').on(t.processType),
]);

// HuniBinding: Binding specifications for booklets
export const bindings = pgTable('bindings', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).unique().notNull(),
  name: varchar('name', { length: 50 }).notNull(),
  minPages: smallint('min_pages'),
  maxPages: smallint('max_pages'),
  pageStep: smallint('page_step'),
  displayOrder: smallint('display_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
});

// HuniImpositionRule: Sheet imposition calculation rules
export const impositionRules = pgTable('imposition_rules', {
  id: serial('id').primaryKey(),
  cutSizeCode: varchar('cut_size_code', { length: 30 }).notNull(),
  cutWidth: numeric('cut_width', { precision: 8, scale: 2 }).notNull(),
  cutHeight: numeric('cut_height', { precision: 8, scale: 2 }).notNull(),
  workWidth: numeric('work_width', { precision: 8, scale: 2 }).notNull(),
  workHeight: numeric('work_height', { precision: 8, scale: 2 }).notNull(),
  impositionCount: smallint('imposition_count').notNull(),
  sheetStandard: varchar('sheet_standard', { length: 5 }).notNull(),
  description: varchar('description', { length: 200 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  unique('imposition_rules_cut_width_cut_height_sheet_standard_key').on(t.cutWidth, t.cutHeight, t.sheetStandard),
  index('imposition_rules_sheet_standard_idx').on(t.sheetStandard),
]);
