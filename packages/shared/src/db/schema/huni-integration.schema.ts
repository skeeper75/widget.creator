import {
  pgTable,
  serial,
  varchar,
  integer,
  smallint,
  boolean,
  timestamp,
  text,
  jsonb,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { products } from './huni-catalog.schema';
import { optionChoices } from './huni-options.schema';

// HuniMesItem: MES system item master
export const mesItems = pgTable('mes_items', {
  id: serial('id').primaryKey(),
  itemCode: varchar('item_code', { length: 20 }).unique().notNull(),
  groupCode: varchar('group_code', { length: 20 }),
  name: varchar('name', { length: 200 }).notNull(),
  abbreviation: varchar('abbreviation', { length: 50 }),
  itemType: varchar('item_type', { length: 20 }).notNull(),
  unit: varchar('unit', { length: 10 }).default('EA').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index('mes_items_group_code_idx').on(t.groupCode),
  index('mes_items_item_type_idx').on(t.itemType),
]);

// HuniMesItemOption: MES item option values (up to 10 per item)
export const mesItemOptions = pgTable('mes_item_options', {
  id: serial('id').primaryKey(),
  mesItemId: integer('mes_item_id').notNull().references(() => mesItems.id, { onDelete: 'cascade' }),
  optionNumber: smallint('option_number').notNull(),
  optionValue: varchar('option_value', { length: 200 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  unique('mes_item_options_mes_item_id_option_number_key').on(t.mesItemId, t.optionNumber),
  index('mes_item_options_mes_item_id_idx').on(t.mesItemId),
]);

// HuniProductMesMapping: Product-to-MES item mapping
export const productMesMappings = pgTable('product_mes_mapping', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),
  mesItemId: integer('mes_item_id').notNull().references(() => mesItems.id, { onDelete: 'restrict' }),
  coverType: varchar('cover_type', { length: 10 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  unique('product_mes_mapping_product_id_mes_item_id_cover_type_key').on(t.productId, t.mesItemId, t.coverType),
  index('product_mes_mapping_product_id_idx').on(t.productId),
  index('product_mes_mapping_mes_item_id_idx').on(t.mesItemId),
]);

// HuniProductEditorMapping: Product-to-editor (Edicus) 1:1 mapping
export const productEditorMappings = pgTable('product_editor_mapping', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').unique().notNull().references(() => products.id, { onDelete: 'restrict' }),
  editorType: varchar('editor_type', { length: 30 }).default('edicus').notNull(),
  templateId: varchar('template_id', { length: 100 }),
  templateConfig: jsonb('template_config'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index('product_editor_mapping_editor_type_idx').on(t.editorType),
]);

// HuniOptionChoiceMesMapping: Option choice to MES item mapping
export const optionChoiceMesMappings = pgTable('option_choice_mes_mapping', {
  id: serial('id').primaryKey(),
  optionChoiceId: integer('option_choice_id').notNull().references(() => optionChoices.id, { onDelete: 'restrict' }),
  mesItemId: integer('mes_item_id').references(() => mesItems.id, { onDelete: 'set null' }),
  mesCode: varchar('mes_code', { length: 50 }),
  mappingType: varchar('mapping_type', { length: 20 }).notNull(),
  mappingStatus: varchar('mapping_status', { length: 20 }).default('pending').notNull(),
  mappedBy: varchar('mapped_by', { length: 100 }),
  mappedAt: timestamp('mapped_at', { withTimezone: true }),
  notes: text('notes'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  unique('option_choice_mes_mapping_option_choice_id_mapping_type_key').on(t.optionChoiceId, t.mappingType),
  index('option_choice_mes_mapping_option_choice_id_idx').on(t.optionChoiceId),
  index('option_choice_mes_mapping_mes_item_id_idx').on(t.mesItemId),
  index('option_choice_mes_mapping_mapping_status_idx').on(t.mappingStatus),
]);

// IntegrationDeadLetter: Dead letter queue for failed integration events
export const integrationDeadLetters = pgTable('integration_dead_letters', {
  id: serial('id').primaryKey(),
  eventType: varchar('event_type', { length: 100 }).notNull(),
  eventPayload: jsonb('event_payload').notNull(),
  adapterName: varchar('adapter_name', { length: 50 }).notNull(),
  errorMessage: text('error_message').notNull(),
  retryCount: integer('retry_count').default(0).notNull(),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  replayedAt: timestamp('replayed_at', { withTimezone: true }),
}, (t) => [
  index('integration_dead_letters_status_idx').on(t.status),
  index('integration_dead_letters_adapter_name_idx').on(t.adapterName),
  index('integration_dead_letters_created_at_idx').on(t.createdAt),
]);
