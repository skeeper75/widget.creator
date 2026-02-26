import {
  pgTable,
  serial,
  varchar,
  integer,
  jsonb,
  index,
  timestamp,
} from 'drizzle-orm/pg-core';
import { wbProducts } from './02-products';
import { simulationRuns } from './05-simulation-runs';

// publish_history: Audit trail for product publish/unpublish actions
// SPEC-WB-005 FR-WB005-05, FR-WB005-06
// @MX:NOTE: [AUTO] publish_history — immutable audit log; completeness snapshot stored at time of action
// @MX:SPEC: SPEC-WB-005 FR-WB005-06, FR-WB005-08
export const publishHistory = pgTable(
  'publish_history',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .notNull()
      .references(() => wbProducts.id),
    // action: 'publish' | 'unpublish'
    action: varchar('action', { length: 20 }).notNull(),
    // completeness: snapshot of completeness state at time of action
    completeness: jsonb('completeness').notNull(),
    // nullable: not every publish action has an associated simulation run
    simulationRunId: integer('simulation_run_id').references(() => simulationRuns.id),
    createdBy: varchar('created_by', { length: 100 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_ph_product').on(t.productId),
  ],
);

export type PublishHistory = typeof publishHistory.$inferSelect;
export type NewPublishHistory = typeof publishHistory.$inferInsert;
