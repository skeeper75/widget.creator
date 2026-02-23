/**
 * RED Phase: product-editor-mapping importer specification tests
 * @MX:SPEC: SPEC-DATA-003 Milestone 3
 */
import { describe, it, expect, vi } from 'vitest';
import { importProductEditorMappings } from '../importers/product-editor-mapping.js';
import type { EditorMappingRecord } from '../parsers/mes-json-parser.js';

describe('Product Editor Mapping Importer', () => {
  const createMockDb = () => {
    const mockTx = {
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      onConflictDoUpdate: vi.fn().mockResolvedValue([]),
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: 1 }]),
    };
    return {
      transaction: vi.fn(async (fn: any) => fn(mockTx)),
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      _tx: mockTx,
    } as any;
  };

  const sampleMappings: EditorMappingRecord[] = [
    { shopbyId: 14529, editorType: 'edicus' },
    { shopbyId: 14530, editorType: 'edicus' },
  ];

  it('should import editor mappings for products with editor enabled', async () => {
    const mockDb = createMockDb();
    const shopbyIdToProductId = new Map([[14529, 100], [14530, 101]]);

    const result = await importProductEditorMappings(mockDb, sampleMappings, {
      shopbyIdToProductId,
    });

    expect(mockDb.transaction).toHaveBeenCalled();
    expect(result.total).toBe(2);
  });

  it('should upsert on productId unique constraint', async () => {
    const mockDb = createMockDb();
    const shopbyIdToProductId = new Map([[14529, 100], [14530, 101]]);

    await importProductEditorMappings(mockDb, sampleMappings, { shopbyIdToProductId });

    expect(mockDb._tx.onConflictDoUpdate).toHaveBeenCalled();
  });

  it('should skip mappings with unresolved shopbyId', async () => {
    const mockDb = createMockDb();
    const shopbyIdToProductId = new Map([[14529, 100]]);
    // 14530 is missing

    const result = await importProductEditorMappings(mockDb, sampleMappings, {
      shopbyIdToProductId,
    });

    expect(result.skipped).toBe(1);
  });

  it('should handle dry-run mode', async () => {
    const mockDb = createMockDb();
    const shopbyIdToProductId = new Map([[14529, 100], [14530, 101]]);

    const result = await importProductEditorMappings(mockDb, sampleMappings, {
      shopbyIdToProductId,
      dryRun: true,
    });

    expect(result.total).toBe(2);
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('should handle empty mappings array', async () => {
    const mockDb = createMockDb();
    const shopbyIdToProductId = new Map<number, number>();

    const result = await importProductEditorMappings(mockDb, [], { shopbyIdToProductId });

    expect(result.total).toBe(0);
  });
});
