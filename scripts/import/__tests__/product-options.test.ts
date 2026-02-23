/**
 * RED Phase: product-options importer specification tests
 * @MX:SPEC: SPEC-DATA-003 Milestone 3
 */
import { describe, it, expect, vi } from 'vitest';
import { importProductOptions } from '../importers/product-options.js';
import type { ProductOptionRecord } from '../parsers/mes-json-parser.js';

describe('Product Options Importer', () => {
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

  const sampleProductOptions: ProductOptionRecord[] = [
    {
      mesItemCd: '001-0001',
      optionKey: 'size',
      isRequired: true,
      displayOrder: 1,
      optionClass: 'material',
    },
    {
      mesItemCd: '001-0001',
      optionKey: 'paper',
      isRequired: true,
      displayOrder: 2,
      optionClass: 'material',
    },
    {
      mesItemCd: '001-0001',
      optionKey: 'printType',
      isRequired: false,
      displayOrder: 10,
      optionClass: 'process',
    },
  ];

  it('should import product-option associations', async () => {
    const mockDb = createMockDb();
    const optionKeyToId = new Map([['size', 1], ['paper', 2], ['printType', 3]]);
    const mesItemCdToProductId = new Map([['001-0001', 100]]);

    const result = await importProductOptions(mockDb, sampleProductOptions, {
      optionKeyToId,
      mesItemCdToProductId,
    });

    expect(mockDb.transaction).toHaveBeenCalled();
    expect(result.total).toBe(3);
  });

  it('should upsert on (productId, optionDefinitionId) conflict', async () => {
    const mockDb = createMockDb();
    const optionKeyToId = new Map([['size', 1], ['paper', 2], ['printType', 3]]);
    const mesItemCdToProductId = new Map([['001-0001', 100]]);

    await importProductOptions(mockDb, sampleProductOptions, {
      optionKeyToId,
      mesItemCdToProductId,
    });

    expect(mockDb._tx.onConflictDoUpdate).toHaveBeenCalled();
  });

  it('should skip records with unresolved productId', async () => {
    const mockDb = createMockDb();
    const optionKeyToId = new Map([['size', 1], ['paper', 2], ['printType', 3]]);
    const mesItemCdToProductId = new Map<string, number>(); // empty map

    const result = await importProductOptions(mockDb, sampleProductOptions, {
      optionKeyToId,
      mesItemCdToProductId,
    });

    expect(result.skipped).toBe(3);
  });

  it('should handle dry-run mode', async () => {
    const mockDb = createMockDb();
    const optionKeyToId = new Map([['size', 1]]);
    const mesItemCdToProductId = new Map([['001-0001', 100]]);

    const result = await importProductOptions(mockDb, sampleProductOptions, {
      optionKeyToId,
      mesItemCdToProductId,
      dryRun: true,
    });

    expect(mockDb.transaction).not.toHaveBeenCalled();
  });
});
