import {
  pgTable,
  serial,
  varchar,
  boolean,
  integer,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { wbProducts } from './02-products';
import { addonGroups } from './03-addon-groups';

// addon_group_items: Product members within an addon group
// SPEC-WB-003 FR-WB003-08
export const addonGroupItems = pgTable(
  'addon_group_items',
  {
    id: serial('id').primaryKey(),
    groupId: integer('group_id')
      .notNull()
      .references(() => addonGroups.id, { onDelete: 'cascade' })
      ,
    productId: integer('product_id')
      .notNull()
      .references(() => wbProducts.id)
      ,
    labelOverride: varchar('label_override', { length: 100 }),
    isDefault: boolean('is_default').notNull().default(false),
    displayOrder: integer('display_order').notNull().default(0),
    priceOverride: integer('price_override'),
  },
  (t) => [
    unique('uq_agi').on(t.groupId, t.productId),
    index('idx_agi_group').on(t.groupId),
  ],
);

export type AddonGroupItem = typeof addonGroupItems.$inferSelect;
export type NewAddonGroupItem = typeof addonGroupItems.$inferInsert;
