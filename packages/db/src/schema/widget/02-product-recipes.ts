import {
  pgTable,
  serial,
  varchar,
  boolean,
  integer,
  text,
  index,
  unique,
  timestamp,
} from 'drizzle-orm/pg-core';
import { wbProducts } from './02-products';

// product_recipes: Recipe versioning for Widget Builder products
// SPEC-WB-002 FR-WB002-06
// @MX:NOTE: [AUTO] Recipe versioning pattern: modify = archive old (is_archived=true) + create new (version+1)
// @MX:REASON: Maintains order history integrity — existing orders reference immutable recipe versions
// @MX:SPEC: SPEC-WB-002 FR-WB002-06
export const productRecipes = pgTable(
  'product_recipes',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .notNull()
      .references(() => wbProducts.id),
    recipeName: varchar('recipe_name', { length: 100 }).notNull(),
    recipeVersion: integer('recipe_version').notNull().default(1),
    isDefault: boolean('is_default').notNull().default(false),
    isArchived: boolean('is_archived').notNull().default(false),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('uq_pr_version').on(t.productId, t.recipeVersion),
    index('idx_pr_product').on(t.productId),
    index('idx_pr_default').on(t.productId, t.isDefault),
  ],
);

export type ProductRecipe = typeof productRecipes.$inferSelect;
export type NewProductRecipe = typeof productRecipes.$inferInsert;
