/**
 * data_import_log schema for tracking import pipeline executions
 * @MX:NOTE: [AUTO] Version management and skip-if-unchanged support
 * @MX:SPEC: SPEC-DATA-003 Milestone 1
 */
import {
  pgTable,
  serial,
  varchar,
  integer,
  text,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

// @MX:ANCHOR: [AUTO] Import log table schema used by version-manager and orchestrator
// @MX:REASON: fan_in >= 3 (shouldSkipImport, createImportLog, completeImportLog all reference this table)
export const dataImportLog = pgTable('data_import_log', {
  id: serial('id').primaryKey(),
  tableName: varchar('table_name', { length: 100 }).notNull(),
  sourceFile: varchar('source_file', { length: 500 }).notNull(),
  sourceHash: varchar('source_hash', { length: 128 }).notNull(),
  importVersion: integer('import_version').notNull(),
  recordsTotal: integer('records_total').default(0).notNull(),
  recordsInserted: integer('records_inserted').default(0).notNull(),
  recordsUpdated: integer('records_updated').default(0).notNull(),
  recordsSkipped: integer('records_skipped').default(0).notNull(),
  recordsErrored: integer('records_errored').default(0).notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  status: varchar('status', { length: 20 }).default('running').notNull(),
  errorMessage: text('error_message'),
  metadata: jsonb('metadata'),
}, (t) => [
  index('data_import_log_table_name_idx').on(t.tableName),
  index('data_import_log_status_idx').on(t.status),
]);
