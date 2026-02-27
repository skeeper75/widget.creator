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

// product_categories: Category hierarchy root for Widget Builder products
// SPEC-WB-002 Section 2.1, FR-WB002-01
// @MX:ANCHOR: [AUTO] Category hierarchy root — referenced by products, seed, API, category queries
// @MX:REASON: fan_in >= 3 callers: wbProducts (FK), seedProductCategories, widget category API
// @MX:SPEC: SPEC-WB-002 FR-WB002-01
export const productCategories = pgTable(
  'product_categories',
  {
    id: serial('id').primaryKey(),
    // @MX:NOTE: [AUTO] 11 standard categories based on Figma design (NOT old catalog.json 12 categories)
    // @MX:REASON: Figma defines the authoritative category structure. catalog.json uses deprecated Excel Map sheet structure.
    // @MX:SPEC: SPEC-WB-002 Section 2.1
    categoryKey: varchar('category_key', { length: 50 }).unique().notNull(),
    categoryNameKo: varchar('category_name_ko', { length: 100 }).notNull(),
    categoryNameEn: varchar('category_name_en', { length: 100 }),
    displayOrder: integer('display_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_pc_active').on(t.isActive).where(sql`${t.isActive} = true`),
  ],
);

export type ProductCategory = typeof productCategories.$inferSelect;
export type NewProductCategory = typeof productCategories.$inferInsert;
