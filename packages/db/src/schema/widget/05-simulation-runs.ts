import {
  pgTable,
  serial,
  varchar,
  integer,
  decimal,
  text,
  jsonb,
  index,
  timestamp,
} from 'drizzle-orm/pg-core';
import { wbProducts } from './02-products';

// simulation_runs: Tracks bulk simulation executions per product
// SPEC-WB-005 FR-WB005-03, FR-WB005-04
// @MX:ANCHOR: [AUTO] simulation_runs — entry point for all simulation result queries and status tracking
// @MX:REASON: fan_in >= 3: simulation_cases FK, publish_history FK, widget-admin tRPC router, simulation status endpoint
// @MX:SPEC: SPEC-WB-005 FR-WB005-03, FR-WB005-04
export const simulationRuns = pgTable(
  'simulation_runs',
  {
    id: serial('id').primaryKey(),
    productId: integer('product_id')
      .notNull()
      .references(() => wbProducts.id, { onDelete: 'cascade' })
      ,
    totalCases: integer('total_cases').notNull(),
    passedCount: integer('passed_count').notNull().default(0),
    warnedCount: integer('warned_count').notNull().default(0),
    erroredCount: integer('errored_count').notNull().default(0),
    // status: 'running' | 'completed' | 'failed' | 'cancelled'
    status: varchar('status', { length: 20 }).notNull().default('running'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdBy: varchar('created_by', { length: 100 }),
  },
  (t) => [
    index('idx_sr_product').on(t.productId),
    index('idx_sr_status').on(t.status),
  ],
);

export type SimulationRun = typeof simulationRuns.$inferSelect;
export type NewSimulationRun = typeof simulationRuns.$inferInsert;

// simulation_cases: Individual combination results within a simulation run
// SPEC-WB-005 FR-WB005-04
export const simulationCases = pgTable(
  'simulation_cases',
  {
    id: serial('id').primaryKey(),
    runId: integer('run_id')
      .notNull()
      .references(() => simulationRuns.id, { onDelete: 'cascade' })
      ,
    // selections: {SIZE: "90x50mm", PAPER: "아트지", ...}
    selections: jsonb('selections').notNull(),
    // result_status: 'pass' | 'warn' | 'error'
    resultStatus: varchar('result_status', { length: 10 }).notNull(),
    totalPrice: decimal('total_price', { precision: 12, scale: 2 }),
    constraintViolations: jsonb('constraint_violations'),
    priceBreakdown: jsonb('price_breakdown'),
    message: text('message'),
  },
  (t) => [
    index('idx_sc_run').on(t.runId),
    index('idx_sc_status').on(t.runId, t.resultStatus),
  ],
);

export type SimulationCase = typeof simulationCases.$inferSelect;
export type NewSimulationCase = typeof simulationCases.$inferInsert;
