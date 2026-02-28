import {
  pgTable,
  serial,
  varchar,
  integer,
  smallint,
  numeric,
  boolean,
  timestamp,
  text,
  index,
  unique,
  AnyPgColumn,
} from 'drizzle-orm/pg-core';

// HuniCategory: Hierarchical product categories
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).unique().notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  parentId: integer('parent_id').references((): AnyPgColumn => categories.id, { onDelete: 'set null' }),
  depth: smallint('depth').default(0).notNull(),
  displayOrder: smallint('display_order').default(0).notNull(),
  sheetName: varchar('sheet_name', { length: 50 }),
  iconUrl: varchar('icon_url', { length: 500 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index('categories_parent_id_idx').on(t.parentId),
  index('categories_sheet_name_idx').on(t.sheetName),
]);

// HuniProduct: Master product record for Huni system
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id').notNull().references(() => categories.id, { onDelete: 'restrict' }),
  huniCode: varchar('huni_code', { length: 10 }).unique(),
  legacyHuniId: varchar('legacy_huni_id', { length: 50 }),
  excelMesCode: varchar('excel_mes_code', { length: 50 }),
  edicusCode: varchar('edicus_code', { length: 15 }).unique(),
  shopbyId: integer('shopby_id').unique(),
  name: varchar('name', { length: 200 }).notNull(),
  slug: varchar('slug', { length: 200 }).unique().notNull(),
  productType: varchar('product_type', { length: 30 }).notNull(),
  pricingModel: varchar('pricing_model', { length: 30 }).notNull(),
  sheetStandard: varchar('sheet_standard', { length: 5 }),
  figmaSection: varchar('figma_section', { length: 50 }),
  orderMethod: varchar('order_method', { length: 20 }).default('upload').notNull(),
  editorEnabled: boolean('editor_enabled').default(false).notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  mesRegistered: boolean('mes_registered').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index('products_category_id_idx').on(t.categoryId),
  index('products_product_type_idx').on(t.productType),
  index('products_pricing_model_idx').on(t.pricingModel),
]);

// HuniProductSize: Size specifications per product
export const productSizes = pgTable('product_sizes', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 50 }).notNull(),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  cutWidth: numeric('cut_width', { precision: 8, scale: 2 }),
  cutHeight: numeric('cut_height', { precision: 8, scale: 2 }),
  workWidth: numeric('work_width', { precision: 8, scale: 2 }),
  workHeight: numeric('work_height', { precision: 8, scale: 2 }),
  bleed: numeric('bleed', { precision: 5, scale: 2 }).default('3.0'),
  impositionCount: smallint('imposition_count'),
  sheetStandard: varchar('sheet_standard', { length: 5 }),
  displayOrder: smallint('display_order').default(0).notNull(),
  isCustom: boolean('is_custom').default(false).notNull(),
  customMinW: numeric('custom_min_w', { precision: 8, scale: 2 }),
  customMinH: numeric('custom_min_h', { precision: 8, scale: 2 }),
  customMaxW: numeric('custom_max_w', { precision: 8, scale: 2 }),
  customMaxH: numeric('custom_max_h', { precision: 8, scale: 2 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  unique('product_sizes_product_id_code_key').on(t.productId, t.code),
  index('product_sizes_product_id_idx').on(t.productId),
]);
