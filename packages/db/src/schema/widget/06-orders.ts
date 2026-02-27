import {
  pgTable,
  serial,
  varchar,
  integer,
  decimal,
  jsonb,
  index,
  timestamp,
} from 'drizzle-orm/pg-core';
import { wbProducts } from './02-products';
import { productRecipes } from './02-product-recipes';

// orders: Widget Builder order snapshots with MES status tracking
// SPEC-WB-006 FR-WB006-05, FR-WB006-06
// @MX:ANCHOR: [AUTO] wbOrders — public API boundary for order lifecycle management
// @MX:REASON: fan_in >= 3: OrderService create, status API, MES dispatch, Shopby sync
// @MX:SPEC: SPEC-WB-006 FR-WB006-05, FR-WB006-06
export const wbOrders = pgTable(
  'orders',
  {
    id: serial('id').primaryKey(),
    orderCode: varchar('order_code', { length: 50 }).unique().notNull(),
    productId: integer('product_id').notNull().references(() => wbProducts.id),
    recipeId: integer('recipe_id').notNull().references(() => productRecipes.id),
    recipeVersion: integer('recipe_version').notNull(),
    selections: jsonb('selections').notNull(),
    priceBreakdown: jsonb('price_breakdown').notNull(),
    totalPrice: decimal('total_price', { precision: 12, scale: 2 }).notNull(),
    appliedConstraints: jsonb('applied_constraints'),
    addonItems: jsonb('addon_items'),
    shopbyOrderNo: varchar('shopby_order_no', { length: 50 }),
    mesOrderId: varchar('mes_order_id', { length: 50 }),
    // @MX:NOTE: [AUTO] mesStatus state machine — pending→sent→confirmed/failed or not_linked if no mesItemCd
    mesStatus: varchar('mes_status', { length: 20 }).default('pending'),
    customerName: varchar('customer_name', { length: 100 }),
    customerEmail: varchar('customer_email', { length: 200 }),
    customerPhone: varchar('customer_phone', { length: 20 }),
    // @MX:NOTE: [AUTO] status state machine — created→paid→in_production→shipped→completed/cancelled
    status: varchar('status', { length: 20 }).notNull().default('created'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_ord_product').on(t.productId),
    index('idx_ord_status').on(t.status),
    index('idx_ord_mes').on(t.mesOrderId),
    index('idx_ord_shopby').on(t.shopbyOrderNo),
    index('idx_ord_created').on(t.createdAt),
  ],
);

export type WbOrder = typeof wbOrders.$inferSelect;
export type NewWbOrder = typeof wbOrders.$inferInsert;

// quote_logs: Quote calculation audit log for debugging and analytics
// SPEC-WB-006 FR-WB006-04
export const wbQuoteLogs = pgTable(
  'quote_logs',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id').notNull().references(() => wbProducts.id),
    selections: jsonb('selections').notNull(),
    quoteResult: jsonb('quote_result').notNull(),
    // source: 'client' | 'server' | 'simulation'
    source: varchar('source', { length: 20 }).notNull(),
    responseMs: integer('response_ms'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_ql_product').on(t.productId),
    index('idx_ql_created').on(t.createdAt),
  ],
);

export type WbQuoteLog = typeof wbQuoteLogs.$inferSelect;
export type NewWbQuoteLog = typeof wbQuoteLogs.$inferInsert;
