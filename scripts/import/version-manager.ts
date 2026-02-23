/**
 * Version manager for import pipeline
 * SHA-256 checksumming + data_import_log operations
 * @MX:NOTE: [AUTO] Skip-if-unchanged behavior via source hash comparison
 * @MX:SPEC: SPEC-DATA-003 Milestone 1
 */
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';
import { eq, desc, and } from 'drizzle-orm';
import { dataImportLog } from '@widget-creator/shared';

type Db = any;

export function computeFileHash(filePath: string): string {
  const content = fs.readFileSync(filePath, 'utf-8');
  return crypto.createHash('sha256').update(content).digest('hex');
}

// @MX:ANCHOR: [AUTO] Determines if import can be skipped based on source hash
// @MX:REASON: fan_in >= 3 (orchestrator calls for each table import)
export async function shouldSkipImport(
  db: Db,
  tableName: string,
  currentHash: string,
  force: boolean = false,
): Promise<boolean> {
  if (force) return false;

  const latest = await db
    .select()
    .from(dataImportLog)
    .where(
      and(
        eq(dataImportLog.tableName, tableName),
        eq(dataImportLog.status, 'completed'),
      ),
    )
    .orderBy(desc(dataImportLog.id))
    .limit(1);

  if (latest.length === 0) return false;
  return latest[0].sourceHash === currentHash;
}

export interface CreateImportLogParams {
  tableName: string;
  sourceFile: string;
  sourceHash: string;
  importVersion: number;
}

export async function createImportLog(
  db: Db,
  params: CreateImportLogParams,
): Promise<{ id: number }> {
  const [row] = await db
    .insert(dataImportLog)
    .values({
      tableName: params.tableName,
      sourceFile: params.sourceFile,
      sourceHash: params.sourceHash,
      importVersion: params.importVersion,
    })
    .returning({ id: dataImportLog.id });
  return row;
}

export interface CompleteImportLogParams {
  recordsTotal: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsSkipped: number;
  recordsErrored: number;
  status: 'completed' | 'failed';
  errorMessage?: string;
}

export async function completeImportLog(
  db: Db,
  logId: number,
  params: CompleteImportLogParams,
): Promise<void> {
  await db
    .update(dataImportLog)
    .set({
      recordsTotal: params.recordsTotal,
      recordsInserted: params.recordsInserted,
      recordsUpdated: params.recordsUpdated,
      recordsSkipped: params.recordsSkipped,
      recordsErrored: params.recordsErrored,
      completedAt: new Date(),
      status: params.status,
      errorMessage: params.errorMessage ?? null,
    })
    .where(eq(dataImportLog.id, logId));
}
