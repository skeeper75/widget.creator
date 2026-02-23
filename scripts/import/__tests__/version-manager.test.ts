/**
 * RED Phase: version-manager.ts specification tests
 * @MX:SPEC: SPEC-DATA-003 Milestone 1
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { computeFileHash, shouldSkipImport, createImportLog, completeImportLog } from '../version-manager.js';
import * as fs from 'node:fs';
import * as crypto from 'node:crypto';

vi.mock('node:fs');

describe('Version Manager', () => {
  describe('computeFileHash', () => {
    it('should compute SHA-256 hash of file contents', () => {
      const mockContent = 'test file content';
      vi.mocked(fs.readFileSync).mockReturnValue(mockContent);

      const hash = computeFileHash('/path/to/file.json');

      expect(hash).toBe(
        crypto.createHash('sha256').update(mockContent).digest('hex')
      );
    });

    it('should return different hash for different content', () => {
      vi.mocked(fs.readFileSync)
        .mockReturnValueOnce('content1')
        .mockReturnValueOnce('content2');

      const hash1 = computeFileHash('/path/to/file1.json');
      const hash2 = computeFileHash('/path/to/file2.json');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('shouldSkipImport', () => {
    it('should return true when hash matches latest successful import', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          { sourceHash: 'abc123', status: 'completed' },
        ]),
      } as any;

      const result = await shouldSkipImport(mockDb, 'option_definitions', 'abc123');
      expect(result).toBe(true);
    });

    it('should return false when hash differs from latest import', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          { sourceHash: 'different_hash', status: 'completed' },
        ]),
      } as any;

      const result = await shouldSkipImport(mockDb, 'option_definitions', 'abc123');
      expect(result).toBe(false);
    });

    it('should return false when no previous import exists', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      } as any;

      const result = await shouldSkipImport(mockDb, 'option_definitions', 'abc123');
      expect(result).toBe(false);
    });

    it('should return false when force flag is true', async () => {
      const mockDb = {} as any;
      const result = await shouldSkipImport(mockDb, 'option_definitions', 'abc123', true);
      expect(result).toBe(false);
    });
  });

  describe('createImportLog', () => {
    it('should insert a new import log record', async () => {
      const insertedRow = { id: 1 };
      const mockDb = {
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue([insertedRow]),
      } as any;

      const result = await createImportLog(mockDb, {
        tableName: 'option_definitions',
        sourceFile: '/path/to/file.json',
        sourceHash: 'abc123',
        importVersion: 1,
      });

      expect(result.id).toBe(1);
    });
  });

  describe('completeImportLog', () => {
    it('should update import log with completion stats', async () => {
      const mockDb = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      } as any;

      await completeImportLog(mockDb, 1, {
        recordsTotal: 30,
        recordsInserted: 25,
        recordsUpdated: 5,
        recordsSkipped: 0,
        recordsErrored: 0,
        status: 'completed',
      });

      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should update import log with error status', async () => {
      const mockDb = {
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      } as any;

      await completeImportLog(mockDb, 1, {
        recordsTotal: 30,
        recordsInserted: 10,
        recordsUpdated: 0,
        recordsSkipped: 0,
        recordsErrored: 20,
        status: 'failed',
        errorMessage: 'FK violation',
      });

      expect(mockDb.update).toHaveBeenCalled();
    });
  });
});
