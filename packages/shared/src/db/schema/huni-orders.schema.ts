import {
  pgTable,
  serial,
  varchar,
  integer,
  numeric,
  boolean,
  timestamp,
  text,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { products } from './huni-catalog.schema.js';

// HuniOrder: Master order record
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderId: varchar('order_id', { length: 50 }).unique().notNull(),
  orderNumber: varchar('order_number', { length: 30 }).unique().notNull(),
  status: varchar('status', { length: 30 }).default('unpaid').notNull(),
  totalPrice: numeric('total_price', { precision: 12, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 5 }).default('KRW').notNull(),
  quoteData: jsonb('quote_data').notNull(),
  customerName: varchar('customer_name', { length: 100 }).notNull(),
  customerEmail: varchar('customer_email', { length: 255 }).notNull(),
  customerPhone: varchar('customer_phone', { length: 20 }).notNull(),
  customerCompany: varchar('customer_company', { length: 200 }),
  shippingMethod: varchar('shipping_method', { length: 20 }).notNull(),
  shippingAddress: text('shipping_address'),
  shippingPostalCode: varchar('shipping_postal_code', { length: 10 }),
  shippingMemo: text('shipping_memo'),
  shippingTrackingNumber: varchar('shipping_tracking_number', { length: 100 }),
  shippingEstimatedDate: varchar('shipping_estimated_date', { length: 30 }),
  widgetId: varchar('widget_id', { length: 50 }),
  productId: integer('product_id').references(() => products.id, { onDelete: 'set null' }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index('orders_status_idx').on(t.status),
  index('orders_customer_email_idx').on(t.customerEmail),
  index('orders_widget_id_idx').on(t.widgetId),
  index('orders_created_at_idx').on(t.createdAt),
]);

// HuniOrderStatusHistory: Audit trail for order status changes
export const orderStatusHistory = pgTable('order_status_history', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 30 }).notNull(),
  memo: text('memo'),
  changedAt: timestamp('changed_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('order_status_history_order_id_idx').on(t.orderId),
]);

// HuniOrderDesignFile: Design file records attached to orders
export const orderDesignFiles = pgTable('order_design_files', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  fileId: varchar('file_id', { length: 50 }).unique().notNull(),
  originalName: varchar('original_name', { length: 500 }).notNull(),
  fileNumber: varchar('file_number', { length: 500 }),
  fileSize: integer('file_size').notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  storageUrl: text('storage_url'),
  status: varchar('status', { length: 20 }).default('pending').notNull(),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index('order_design_files_order_id_idx').on(t.orderId),
]);
