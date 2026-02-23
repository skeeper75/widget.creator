/**
 * Base importer with common patterns
 * @MX:NOTE: [AUTO] Shared types and utilities for all importers
 * @MX:SPEC: SPEC-DATA-003 Milestone 1
 */

export interface ImportResult {
  total: number;
  inserted: number;
  updated: number;
  skipped: number;
  errored: number;
}

export interface ImportOptions {
  dryRun?: boolean;
  force?: boolean;
}

export function createEmptyResult(): ImportResult {
  return { total: 0, inserted: 0, updated: 0, skipped: 0, errored: 0 };
}
