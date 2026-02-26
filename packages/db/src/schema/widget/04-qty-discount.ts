import {
  pgTable,
  serial,
  varchar,
  boolean,
  integer,
  decimal,
  index,
  unique,
  timestamp,
} from 'drizzle-orm/pg-core';
import { wbProducts } from './02-products';

// qty_discount: Quantity-based discount tier table
// SPEC-WB-004 FR-WB004-06
// @MX:NOTE: [AUTO] product_id is nullable — NULL means global discount rules applied to all products
// @MX:SPEC: SPEC-WB-004 FR-WB004-06
export const qtyDiscount = pgTable(
  'qty_discount',
  {
    id: serial('id').primaryKey(),

    // NULL means global (applies to all products)
    productId: integer('product_id').references(() => wbProducts.id),

    // Quantity range (inclusive)
    qtyMin: integer('qty_min').notNull(),
    qtyMax: integer('qty_max').notNull(),

    // Discount rate e.g. 0.0300 = 3%
    discountRate: decimal('discount_rate', { precision: 5, scale: 4 }).notNull(),

    // Display label e.g. '소량할인'
    discountLabel: varchar('discount_label', { length: 50 }),

    displayOrder: integer('display_order').notNull().default(0),

    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('uq_qd_product_range').on(t.productId, t.qtyMin, t.qtyMax),
    index('idx_qd_product').on(t.productId),
  ],
);

export type QtyDiscount = typeof qtyDiscount.$inferSelect;
export type NewQtyDiscount = typeof qtyDiscount.$inferInsert;
