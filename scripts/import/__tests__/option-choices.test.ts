/**
 * RED Phase: option-choices importer specification tests
 * @MX:SPEC: SPEC-DATA-003 Milestone 2
 */
import { describe, it, expect, vi } from 'vitest';
import { importOptionChoices } from '../importers/option-choices.js';
import type { OptionChoiceRecord } from '../parsers/mes-json-parser.js';

describe('Option Choices Importer', () => {
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

  const sampleChoices: OptionChoiceRecord[] = [
    {
      optionKey: 'size',
      code: '73x98',
      name: '73 x 98 mm',
      choiceValue: '73x98',
      priceKey: null,
      displayOrder: 0,
    },
    {
      optionKey: 'paper',
      code: 'ART250',
      name: 'Art Paper 250g',
      choiceValue: 'art250',
      priceKey: 'paper_art250',
      displayOrder: 0,
    },
  ];

  it('should import choices with FK resolution for optionDefinitionId', async () => {
    const mockDb = createMockDb();
    const optionKeyToId = new Map<string, number>([
      ['size', 1],
      ['paper', 2],
    ]);

    const result = await importOptionChoices(mockDb, sampleChoices, { optionKeyToId });

    expect(mockDb.transaction).toHaveBeenCalled();
    expect(result.total).toBe(2);
  });

  it('should upsert on (optionDefinitionId, code) conflict', async () => {
    const mockDb = createMockDb();
    const optionKeyToId = new Map([['size', 1], ['paper', 2]]);

    await importOptionChoices(mockDb, sampleChoices, { optionKeyToId });

    expect(mockDb._tx.onConflictDoUpdate).toHaveBeenCalled();
  });

  it('should skip choices with unresolved optionKey', async () => {
    const mockDb = createMockDb();
    const optionKeyToId = new Map([['size', 1]]);
    // paper key is not in the map

    const result = await importOptionChoices(mockDb, sampleChoices, { optionKeyToId });

    expect(result.skipped).toBeGreaterThan(0);
  });

  it('should handle dry-run mode', async () => {
    const mockDb = createMockDb();
    const optionKeyToId = new Map([['size', 1], ['paper', 2]]);

    const result = await importOptionChoices(mockDb, sampleChoices, { optionKeyToId, dryRun: true });

    expect(result.total).toBe(2);
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('should handle empty choices array', async () => {
    const mockDb = createMockDb();
    const optionKeyToId = new Map<string, number>();

    const result = await importOptionChoices(mockDb, [], { optionKeyToId });

    expect(result.total).toBe(0);
  });
});
