import {
  boolean,
  decimal,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { wbProducts } from './02-products';
import { productPriceConfigs } from './04-product-price-configs';

// price_nl_history: Audit log for NL-to-price-rule interpretation sessions
// SPEC-WB-007 FR-WB007-04
export const priceNlHistory = pgTable(
  'price_nl_history',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .notNull()
      .references(() => wbProducts.id, { onDelete: 'cascade' }),
    priceConfigId: integer('price_config_id').references(() => productPriceConfigs.id, {
      onDelete: 'set null',
    }),
    ruleType: varchar('rule_type', { length: 30 }).notNull(),
    // 'qty_discount' | 'price_mode' | 'postprocess' | 'formula_hint'
    nlInputText: text('nl_input_text').notNull(),
    nlInterpretation: jsonb('nl_interpretation'),
    aiModelVersion: varchar('ai_model_version', { length: 50 }),
    interpretationScore: decimal('interpretation_score', { precision: 3, scale: 2 }),
    isApproved: boolean('is_approved').notNull().default(false),
    approvedBy: varchar('approved_by', { length: 100 }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    appliedTiers: jsonb('applied_tiers'),
    deviationNote: text('deviation_note'),
    createdBy: varchar('created_by', { length: 100 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_pnh_product').on(t.productId),
    index('idx_pnh_rule_type').on(t.ruleType),
    index('idx_pnh_approved').on(t.isApproved, t.productId),
  ],
);

export type PriceNlHistory = typeof priceNlHistory.$inferSelect;
export type NewPriceNlHistory = typeof priceNlHistory.$inferInsert;
