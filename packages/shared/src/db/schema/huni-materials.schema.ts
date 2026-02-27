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
import { products } from './huni-catalog.schema';

// HuniPaper: Paper specifications
export const papers = pgTable('papers', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).unique().notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  abbreviation: varchar('abbreviation', { length: 20 }),
  weight: smallint('weight'),
  sheetSize: varchar('sheet_size', { length: 50 }),
  costPerReam: numeric('cost_per_ream', { precision: 12, scale: 2 }),
  sellingPerReam: numeric('selling_per_ream', { precision: 12, scale: 2 }),
  costPer4Cut: numeric('cost_per4_cut', { precision: 10, scale: 2 }),
  sellingPer4Cut: numeric('selling_per4_cut', { precision: 10, scale: 2 }),
  displayOrder: smallint('display_order').default(0).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index('papers_weight_idx').on(t.weight),
]);

// HuniMaterial: Non-paper material specifications
export const materials = pgTable('materials', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).unique().notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  materialType: varchar('material_type', { length: 30 }).notNull(),
  thickness: varchar('thickness', { length: 20 }),
  description: text('description'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index('materials_material_type_idx').on(t.materialType),
]);

// HuniPaperProductMapping: Paper-to-product associations
export const paperProductMappings = pgTable('paper_product_mapping', {
  id: serial('id').primaryKey(),
  paperId: integer('paper_id').notNull().references(() => papers.id, { onDelete: 'restrict' }),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),
  coverType: varchar('cover_type', { length: 10 }),
  isDefault: boolean('is_default').default(false).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  unique('paper_product_mapping_paper_id_product_id_cover_type_key').on(t.paperId, t.productId, t.coverType),
]);
