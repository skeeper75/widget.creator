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

// print_cost_base: LOOKUP mode price table — lookup by (plate_type, print_mode, qty_tier)
// SPEC-WB-004 FR-WB004-03
// @MX:ANCHOR: [AUTO] Print cost base table — primary data source for LOOKUP price mode
// @MX:REASON: fan_in >= 3: LOOKUP engine reads this, seed script populates this, admin UI manages this
// @MX:SPEC: SPEC-WB-004 FR-WB004-03
export const printCostBase = pgTable(
  'print_cost_base',
  {
    id: serial('id').primaryKey(),

    productId: integer('product_id')
      .notNull()
      .references(() => wbProducts.id)
      ,

    // Size code e.g. '90x50', '100x148'
    plateType: varchar('plate_type', { length: 50 }).notNull(),

    // Print method e.g. '단면칼라', '양면칼라'
    printMode: varchar('print_mode', { length: 50 }).notNull(),

    // Quantity range start (inclusive)
    qtyMin: integer('qty_min').notNull(),

    // Quantity range end (inclusive)
    qtyMax: integer('qty_max').notNull(),

    // Unit price in KRW
    unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),

    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_pcb_product').on(t.productId),
    index('idx_pcb_lookup').on(t.productId, t.plateType, t.printMode, t.qtyMin),
  ],
);

export type PrintCostBase = typeof printCostBase.$inferSelect;
export type NewPrintCostBase = typeof printCostBase.$inferInsert;
