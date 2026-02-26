import { sql } from 'drizzle-orm';
import {
  pgTable,
  serial,
  varchar,
  boolean,
  integer,
  index,
  decimal,
  jsonb,
  unique,
  timestamp,
} from 'drizzle-orm/pg-core';
import { optionElementTypes } from './01-element-types';

// option_element_choices: Choice library for each option element type
// SPEC-WB-001 Section 4.2
// @MX:NOTE: [AUTO] Sparse column design — SIZE/PAPER/FINISHING have dedicated columns, others use metadata jsonb.
// @MX:NOTE: mes_code is a reference-only field; internal logic must not depend on it.
export const optionElementChoices = pgTable(
  'option_element_choices',
  {
    id: serial('id').primaryKey(),
    typeId: integer('type_id')
      .notNull()
      .references(() => optionElementTypes.id, { onDelete: 'cascade' }),
    choiceKey: varchar('choice_key', { length: 100 }).notNull(),
    displayName: varchar('display_name', { length: 200 }).notNull(),
    value: varchar('value', { length: 100 }),
    mesCode: varchar('mes_code', { length: 100 }),
    displayOrder: integer('display_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    isDefault: boolean('is_default').notNull().default(false),

    // SIZE type fields
    widthMm: decimal('width_mm', { precision: 8, scale: 2 }),
    heightMm: decimal('height_mm', { precision: 8, scale: 2 }),
    bleedMm: decimal('bleed_mm', { precision: 4, scale: 2 }),

    // PAPER type field
    basisWeightGsm: integer('basis_weight_gsm'),

    // FINISHING type field
    finishCategory: varchar('finish_category', { length: 50 }),

    // Visual UI metadata
    thumbnailUrl: varchar('thumbnail_url', { length: 500 }),
    colorHex: varchar('color_hex', { length: 7 }),
    priceImpact: varchar('price_impact', { length: 50 }),

    // Pricing linkage (SPEC-WB-005)
    priceKey: varchar('price_key', { length: 200 }),

    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('uq_oec_type_choice').on(t.typeId, t.choiceKey),
    index('idx_oec_type_id').on(t.typeId),
    index('idx_oec_mes_code').on(t.mesCode).where(sql`${t.mesCode} IS NOT NULL`),
    index('idx_oec_active').on(t.typeId, t.isActive).where(sql`${t.isActive} = true`),
  ],
);

export type OptionElementChoice = typeof optionElementChoices.$inferSelect;
export type NewOptionElementChoice = typeof optionElementChoices.$inferInsert;
