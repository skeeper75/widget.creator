import {
  pgTable,
  serial,
  varchar,
  boolean,
  timestamp,
  text,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

// HuniWidget: Widget configuration for embeddable ordering interface
export const widgets = pgTable('widgets', {
  id: serial('id').primaryKey(),
  widgetId: varchar('widget_id', { length: 50 }).unique().notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  theme: jsonb('theme').default({
    primary_color: '#5538b6',
    secondary_color: '#eeebf9',
    font_family: 'Pretendard, sans-serif',
    border_radius: '8px',
  }).notNull(),
  apiBaseUrl: varchar('api_base_url', { length: 500 }),
  allowedOrigins: jsonb('allowed_origins').default(['*']).notNull(),
  features: jsonb('features').default({
    file_upload: true,
    editor_integration: true,
    price_preview: true,
  }).notNull(),
  tokenSecret: text('token_secret'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().$onUpdate(() => new Date()).notNull(),
}, (t) => [
  index('widgets_widget_id_idx').on(t.widgetId),
  index('widgets_status_idx').on(t.status),
]);
