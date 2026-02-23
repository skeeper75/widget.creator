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
} from 'drizzle-orm/pg-core';
import { products, productSizes } from './huni-catalog.schema.js';
import { papers, materials } from './huni-materials.schema.js';
import { printModes } from './huni-processes.schema.js';

// HuniPriceTable: Price table header
export const priceTables = pgTable('price_tables', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).unique().notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  priceType: varchar('price_type', { length: 10 }).notNull(),
  quantityBasis: varchar('quantity_basis', { length: 20 }).notNull(),
  sheetStandard: varchar('sheet_standard', { length: 5 }),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index('price_tables_price_type_idx').on(t.priceType),
  index('price_tables_sheet_standard_idx').on(t.sheetStandard),
]);

// HuniPriceTier: Price tier entries per table
export const priceTiers = pgTable('price_tiers', {
  id: serial('id').primaryKey(),
  priceTableId: integer('price_table_id').notNull().references(() => priceTables.id, { onDelete: 'cascade' }),
  optionCode: varchar('option_code', { length: 50 }).notNull(),
  minQty: integer('min_qty').notNull(),
  maxQty: integer('max_qty').default(999999).notNull(),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index('price_tiers_price_table_id_idx').on(t.priceTableId),
  index('price_tiers_option_code_idx').on(t.optionCode),
  index('price_tiers_price_table_id_option_code_min_qty_idx').on(t.priceTableId, t.optionCode, t.minQty),
]);

// HuniFixedPrice: Fixed unit prices for specific product configurations
export const fixedPrices = pgTable('fixed_prices', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),
  sizeId: integer('size_id').references(() => productSizes.id, { onDelete: 'set null' }),
  paperId: integer('paper_id').references(() => papers.id, { onDelete: 'set null' }),
  materialId: integer('material_id').references(() => materials.id, { onDelete: 'set null' }),
  printModeId: integer('print_mode_id').references(() => printModes.id, { onDelete: 'set null' }),
  optionLabel: varchar('option_label', { length: 100 }),
  baseQty: integer('base_qty').default(1).notNull(),
  sellingPrice: numeric('selling_price', { precision: 12, scale: 2 }).notNull(),
  costPrice: numeric('cost_price', { precision: 12, scale: 2 }),
  vatIncluded: boolean('vat_included').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index('fixed_prices_product_id_idx').on(t.productId),
  index('fixed_prices_size_id_idx').on(t.sizeId),
  index('fixed_prices_product_id_size_id_paper_id_print_mode_id_idx').on(t.productId, t.sizeId, t.paperId, t.printModeId),
]);

// HuniPackagePrice: Package-based pricing for booklets
export const packagePrices = pgTable('package_prices', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),
  sizeId: integer('size_id').notNull().references(() => productSizes.id, { onDelete: 'restrict' }),
  printModeId: integer('print_mode_id').notNull().references(() => printModes.id, { onDelete: 'restrict' }),
  pageCount: smallint('page_count').notNull(),
  minQty: integer('min_qty').notNull(),
  maxQty: integer('max_qty').default(999999).notNull(),
  sellingPrice: numeric('selling_price', { precision: 12, scale: 2 }).notNull(),
  costPrice: numeric('cost_price', { precision: 12, scale: 2 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index('package_prices_product_id_idx').on(t.productId),
  index('package_prices_product_id_size_id_print_mode_id_page_count_min_qty_idx').on(t.productId, t.sizeId, t.printModeId, t.pageCount, t.minQty),
]);

// HuniFoilPrice: Foil stamping price table
export const foilPrices = pgTable('foil_prices', {
  id: serial('id').primaryKey(),
  foilType: varchar('foil_type', { length: 30 }).notNull(),
  foilColor: varchar('foil_color', { length: 30 }),
  plateMaterial: varchar('plate_material', { length: 20 }),
  targetProductType: varchar('target_product_type', { length: 30 }),
  width: numeric('width', { precision: 8, scale: 2 }).notNull(),
  height: numeric('height', { precision: 8, scale: 2 }).notNull(),
  sellingPrice: numeric('selling_price', { precision: 12, scale: 2 }).notNull(),
  costPrice: numeric('cost_price', { precision: 12, scale: 2 }),
  displayOrder: smallint('display_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index('foil_prices_foil_type_idx').on(t.foilType),
  index('foil_prices_foil_type_width_height_idx').on(t.foilType, t.width, t.height),
  index('foil_prices_target_product_type_idx').on(t.targetProductType),
]);

// HuniLossQuantityConfig: Production loss rate configuration
export const lossQuantityConfigs = pgTable('loss_quantity_config', {
  id: serial('id').primaryKey(),
  scopeType: varchar('scope_type', { length: 20 }).notNull(),
  // @MX:WARN: [AUTO] Polymorphic FK - scopeId target determined by scopeType discriminator
  // @MX:REASON: Cannot use standard .references() for polymorphic pattern; validate at application level
  // @MX:SPEC: SPEC-DB-001
  scopeId: integer('scope_id'),
  lossRate: numeric('loss_rate', { precision: 5, scale: 4 }).notNull(),
  minLossQty: integer('min_loss_qty').default(0).notNull(),
  description: varchar('description', { length: 200 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  unique('loss_quantity_config_scope_type_scope_id_key').on(t.scopeType, t.scopeId),
  index('loss_quantity_config_scope_type_idx').on(t.scopeType),
]);
