import { sql } from 'drizzle-orm';
import {
  pgTable,
  serial,
  varchar,
  boolean,
  integer,
  jsonb,
  index,
  timestamp,
} from 'drizzle-orm/pg-core';
import { productCategories } from './02-product-categories';

// wb_products: Product master for Widget Builder product configuration
// SPEC-WB-002 FR-WB002-02, FR-WB002-07, FR-WB002-08
// @MX:ANCHOR: [AUTO] Product master — core entity for widget builder product configuration
// @MX:REASON: fan_in >= 3: productRecipes (FK), Edicus integration, Shopby integration, MES integration
// @MX:SPEC: SPEC-WB-002 FR-WB002-02, FR-WB002-07, FR-WB002-08
export const wbProducts = pgTable(
  'wb_products',
  {
    id: serial('id').primaryKey(),

    // External reference codes (nullable — can register before integration)
    mesItemCd: varchar('mes_item_cd', { length: 20 }).unique(),
    // @MX:NOTE: [AUTO] edicus_code is IMMUTABLE once set — enforced at application layer + DB trigger
    // @MX:REASON: Edicus editor identifies products by this code. Change breaks all existing Edicus projects.
    // @MX:SPEC: SPEC-WB-002 Section 1.3, FR-WB002-07
    edicusCode: varchar('edicus_code', { length: 20 }).unique(),
    edicusPsCode: varchar('edicus_ps_code', { length: 50 }),
    shopbyProductNo: varchar('shopby_product_no', { length: 50 }).unique(),

    // @MX:WARN: [AUTO] DB trigger for edicus_code immutability NOT implemented in this schema
    // @MX:REASON: Drizzle ORM schema layer cannot define triggers. Must be added via migration SQL separately.
    // @MX:SPEC: SPEC-WB-002 Section 4.2 (IMMUTABILITY RULE comment)

    // @MX:NOTE: [AUTO] huni_code isolation — internal serial ID (NOT edicus_code). Never expose externally.
    // @MX:REASON: huni_code is internal auto-increment id. Using it in Edicus/Shopby/MES is a design violation.
    // @MX:SPEC: SPEC-WB-002 Section 1.3 huni_code isolation principle

    // Internal business identifier
    productKey: varchar('product_key', { length: 100 }).unique().notNull(),

    productNameKo: varchar('product_name_ko', { length: 200 }).notNull(),
    productNameEn: varchar('product_name_en', { length: 200 }),
    categoryId: integer('category_id')
      .notNull()
      .references(() => productCategories.id),
    subcategory: varchar('subcategory', { length: 100 }),
    productType: varchar('product_type', { length: 50 }),
    isPremium: boolean('is_premium').notNull().default(false),
    hasEditor: boolean('has_editor').notNull().default(false),
    hasUpload: boolean('has_upload').notNull().default(true),
    fileSpec: jsonb('file_spec'),
    thumbnailUrl: varchar('thumbnail_url', { length: 500 }),
    displayOrder: integer('display_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    isVisible: boolean('is_visible').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_prod_category').on(t.categoryId),
    index('idx_prod_mes_item').on(t.mesItemCd),
    index('idx_prod_edicus').on(t.edicusCode),
    index('idx_prod_edicus_ps').on(t.edicusPsCode),
    index('idx_prod_shopby').on(t.shopbyProductNo),
    index('idx_prod_subcategory').on(t.categoryId, t.subcategory),
    index('idx_prod_active').on(t.isActive).where(sql`${t.isActive} = true`),
  ],
);

export type WbProduct = typeof wbProducts.$inferSelect;
export type NewWbProduct = typeof wbProducts.$inferInsert;
