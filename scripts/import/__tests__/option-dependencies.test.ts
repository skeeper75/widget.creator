/**
 * RED Phase: option-dependencies importer specification tests
 * @MX:SPEC: SPEC-DATA-003 Milestone 4
 */
import { describe, it, expect, vi } from 'vitest';
import { importOptionDependencies, generateDependencyRules } from '../importers/option-dependencies.js';

describe('Option Dependencies Importer', () => {
  const createMockDb = () => {
    const mockTx = {
      insert: vi.fn().mockReturnThis(),
      values: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue(undefined),
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
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

  describe('generateDependencyRules', () => {
    it('should generate paper -> printType dependency when both options exist', () => {
      const productOptionKeys = new Set(['paper', 'printType', 'quantity']);
      const rules = generateDependencyRules(productOptionKeys);

      const paperToPrint = rules.find(
        r => r.parentOptionKey === 'paper' && r.childOptionKey === 'printType'
      );
      expect(paperToPrint).toBeDefined();
      expect(paperToPrint?.dependencyType).toBe('choices');
    });

    it('should generate printType -> specialPrint dependency', () => {
      const productOptionKeys = new Set(['printType', 'specialPrint']);
      const rules = generateDependencyRules(productOptionKeys);

      const rule = rules.find(
        r => r.parentOptionKey === 'printType' && r.childOptionKey === 'specialPrint'
      );
      expect(rule).toBeDefined();
      expect(rule?.dependencyType).toBe('visibility');
    });

    it('should generate foilStamp -> foilStampSize visibility dependency', () => {
      const productOptionKeys = new Set(['foilStamp', 'size']);
      const rules = generateDependencyRules(productOptionKeys);
      // foilStamp -> foilStampSize only applies if foilStampSize exists
      // Since foilStampSize is not in the set, no rule should be generated
      const rule = rules.find(r => r.parentOptionKey === 'foilStamp');
      expect(rule).toBeUndefined();
    });

    it('should generate binding -> pageCount value dependency', () => {
      const productOptionKeys = new Set(['binding', 'pageCount']);
      const rules = generateDependencyRules(productOptionKeys);

      const rule = rules.find(
        r => r.parentOptionKey === 'binding' && r.childOptionKey === 'pageCount'
      );
      expect(rule).toBeDefined();
      expect(rule?.dependencyType).toBe('value');
    });

    it('should generate size -> quantity value dependency', () => {
      const productOptionKeys = new Set(['size', 'quantity']);
      const rules = generateDependencyRules(productOptionKeys);

      const rule = rules.find(
        r => r.parentOptionKey === 'size' && r.childOptionKey === 'quantity'
      );
      expect(rule).toBeDefined();
      expect(rule?.dependencyType).toBe('value');
    });

    it('should not generate rules for missing options', () => {
      const productOptionKeys = new Set(['size', 'quantity']);
      const rules = generateDependencyRules(productOptionKeys);

      // No paper -> printType rule because printType is missing
      const paperToPrint = rules.find(r => r.parentOptionKey === 'paper');
      expect(paperToPrint).toBeUndefined();
    });
  });

  describe('importOptionDependencies', () => {
    it('should delete existing dependencies per product and reinsert', async () => {
      const mockDb = createMockDb();
      const optionKeyToId = new Map([
        ['paper', 1], ['printType', 2], ['size', 3], ['quantity', 4],
      ]);
      const productOptionMap = new Map([
        [100, new Set(['paper', 'printType', 'size', 'quantity'])],
      ]);

      const result = await importOptionDependencies(mockDb, {
        optionKeyToId,
        productOptionMap,
      });

      expect(mockDb.transaction).toHaveBeenCalled();
      expect(result.total).toBeGreaterThan(0);
    });

    it('should handle dry-run mode', async () => {
      const mockDb = createMockDb();
      const optionKeyToId = new Map([['paper', 1], ['printType', 2]]);
      const productOptionMap = new Map([
        [100, new Set(['paper', 'printType'])],
      ]);

      const result = await importOptionDependencies(mockDb, {
        optionKeyToId,
        productOptionMap,
        dryRun: true,
      });

      expect(mockDb.transaction).not.toHaveBeenCalled();
    });

    it('should return total count of generated dependencies', async () => {
      const mockDb = createMockDb();
      const optionKeyToId = new Map([
        ['paper', 1], ['printType', 2], ['size', 3], ['quantity', 4],
      ]);
      const productOptionMap = new Map([
        [100, new Set(['paper', 'printType', 'size', 'quantity'])],
        [101, new Set(['paper', 'printType', 'size', 'quantity'])],
      ]);

      const result = await importOptionDependencies(mockDb, {
        optionKeyToId,
        productOptionMap,
      });

      // 2 products, each should have same dependency rules
      expect(result.total).toBeGreaterThanOrEqual(4);
    });
  });
});
