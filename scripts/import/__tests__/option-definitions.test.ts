/**
 * RED Phase: option-definitions importer specification tests
 * @MX:SPEC: SPEC-DATA-003 Milestone 2
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { importOptionDefinitions } from '../importers/option-definitions.js';
import type { OptionDefinitionRecord } from '../parsers/mes-json-parser.js';

describe('Option Definitions Importer', () => {
  const createMockDb = () => {
    const mockTx = {
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      onConflictDoUpdate: vi.fn().mockResolvedValue([]),
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([{ id: 1 }]),
    };
    return {
      transaction: vi.fn(async (fn: any) => fn(mockTx)),
      _tx: mockTx,
    } as any;
  };

  const sampleDefinitions: OptionDefinitionRecord[] = [
    {
      key: 'size',
      name: 'Size',
      optionClass: 'material',
      optionType: 'material',
      uiComponent: 'toggle-group',
      description: null,
      displayOrder: 1,
    },
    {
      key: 'paper',
      name: 'Paper',
      optionClass: 'material',
      optionType: 'material',
      uiComponent: 'select',
      description: null,
      displayOrder: 2,
    },
    {
      key: 'printType',
      name: 'Print Type',
      optionClass: 'process',
      optionType: 'process',
      uiComponent: 'toggle-group',
      description: null,
      displayOrder: 10,
    },
  ];

  it('should call insert with all option definitions', async () => {
    const mockDb = createMockDb();

    const result = await importOptionDefinitions(mockDb, sampleDefinitions);

    expect(mockDb.transaction).toHaveBeenCalled();
    expect(result.total).toBe(3);
  });

  it('should use onConflictDoUpdate for idempotent upsert', async () => {
    const mockDb = createMockDb();

    await importOptionDefinitions(mockDb, sampleDefinitions);

    expect(mockDb._tx.onConflictDoUpdate).toHaveBeenCalled();
  });

  it('should return import statistics', async () => {
    const mockDb = createMockDb();

    const result = await importOptionDefinitions(mockDb, sampleDefinitions);

    expect(result).toHaveProperty('total');
    expect(result).toHaveProperty('inserted');
    expect(result).toHaveProperty('updated');
  });

  it('should handle empty definitions array', async () => {
    const mockDb = createMockDb();

    const result = await importOptionDefinitions(mockDb, []);

    expect(result.total).toBe(0);
  });

  it('should handle dry-run mode without DB writes', async () => {
    const mockDb = createMockDb();

    const result = await importOptionDefinitions(mockDb, sampleDefinitions, { dryRun: true });

    expect(result.total).toBe(3);
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });
});
