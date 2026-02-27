import {
  pgTable,
  serial,
  varchar,
  boolean,
  integer,
  decimal,
  index,
  timestamp,
} from 'drizzle-orm/pg-core';
import { wbProducts } from './02-products';

// postprocess_cost: Post-processing (후가공) cost table
// SPEC-WB-004 FR-WB004-05
// @MX:ANCHOR: [AUTO] product_id nullable for global rules — used by pricing engine, seed, admin UI
// @MX:REASON: fan_in >= 3 (pricing engine, seed data, admin interface)
// @MX:SPEC: SPEC-WB-004 FR-WB004-05
export const postprocessCost = pgTable(
  'postprocess_cost',
  {
    id: serial('id').primaryKey(),

    // NULL means global (applies to all products)
    productId: integer('product_id').references(() => wbProducts.id),

    // Process code e.g. 'MATTE_PP', 'UV_COATING'
    processCode: varchar('process_code', { length: 50 }).notNull(),

    // Korean display name
    processNameKo: varchar('process_name_ko', { length: 100 }).notNull(),

    // Quantity range (0 = applies to any quantity)
    qtyMin: integer('qty_min').default(0),
    qtyMax: integer('qty_max').default(999999),

    // Unit price
    unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),

    // Price calculation type: fixed | per_unit | per_sqm
    priceType: varchar('price_type', { length: 20 }).notNull().default('fixed'),

    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_ppc_product').on(t.productId),
    index('idx_ppc_code').on(t.processCode),
  ],
);

export type PostprocessCost = typeof postprocessCost.$inferSelect;
export type NewPostprocessCost = typeof postprocessCost.$inferInsert;
