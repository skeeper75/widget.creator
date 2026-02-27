import {
  pgTable,
  serial,
  varchar,
  boolean,
  integer,
  decimal,
  text,
  index,
  unique,
  timestamp,
} from 'drizzle-orm/pg-core';
import { wbProducts } from './02-products';

// product_price_configs: Price mode configuration per product
// SPEC-WB-004 FR-WB004-01, FR-WB004-02
// @MX:ANCHOR: [AUTO] Price config — core pricing table referenced by all 4 price mode calculations
// @MX:REASON: fan_in >= 3: LOOKUP engine, AREA engine, PAGE engine, COMPOSITE engine all read this table
// @MX:SPEC: SPEC-WB-004 FR-WB004-01, FR-WB004-02
export const productPriceConfigs = pgTable(
  'product_price_configs',
  {
    id: serial('id').primaryKey(),

    // FK to wb_products — one config per product (UNIQUE constraint)
    productId: integer('product_id')
      .notNull()
      .references(() => wbProducts.id, { onDelete: 'cascade' })
      ,

    // Price mode: LOOKUP | AREA | PAGE | COMPOSITE
    priceMode: varchar('price_mode', { length: 20 }).notNull(),

    // Admin notes for formula documentation
    formulaText: text('formula_text'),

    // AREA mode: price per square meter
    unitPriceSqm: decimal('unit_price_sqm', { precision: 12, scale: 2 }),

    // AREA mode: minimum chargeable area (default 0.1 sqm)
    minAreaSqm: decimal('min_area_sqm', { precision: 6, scale: 4 }).default('0.1'),

    // PAGE mode: pages per sheet (imposition)
    imposition: integer('imposition'),

    // PAGE mode: cover printing price
    coverPrice: decimal('cover_price', { precision: 12, scale: 2 }),

    // PAGE mode: binding cost
    bindingCost: decimal('binding_cost', { precision: 12, scale: 2 }),

    // COMPOSITE mode: base cost before process additions
    baseCost: decimal('base_cost', { precision: 12, scale: 2 }),

    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('uq_ppc_product').on(t.productId),
    index('idx_ppc_price_mode').on(t.priceMode),
  ],
);

export type ProductPriceConfig = typeof productPriceConfigs.$inferSelect;
export type NewProductPriceConfig = typeof productPriceConfigs.$inferInsert;
