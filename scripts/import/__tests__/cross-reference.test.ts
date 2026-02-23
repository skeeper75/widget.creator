/**
 * RED Phase: cross-reference validator specification tests
 * @MX:SPEC: SPEC-DATA-003 Milestone 6
 */
import { describe, it, expect, vi } from 'vitest';
import { validateCrossReferences, type CrossReferenceResult } from '../validators/cross-reference.js';

describe('Cross-Reference Validator', () => {
  const createMockDb = () => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    execute: vi.fn().mockResolvedValue([]),
  } as any);

  it('should validate product count between MES JSON and DB', async () => {
    const mockDb = createMockDb();

    const result = await validateCrossReferences(mockDb, {
      mesProductCount: 221,
      mesEditorCount: 111,
      mesOptionKeyCount: 30,
      mesPriceKeyFilledCount: 342,
    });

    expect(result).toHaveProperty('checks');
    expect(result.checks).toBeInstanceOf(Array);
    expect(result.checks.length).toBeGreaterThan(0);
  });

  it('should return pass/fail status for each check', async () => {
    const mockDb = createMockDb();

    const result = await validateCrossReferences(mockDb, {
      mesProductCount: 221,
      mesEditorCount: 111,
      mesOptionKeyCount: 30,
      mesPriceKeyFilledCount: 342,
    });

    for (const check of result.checks) {
      expect(check).toHaveProperty('name');
      expect(check).toHaveProperty('expected');
      expect(check).toHaveProperty('actual');
      expect(check).toHaveProperty('passed');
    }
  });

  it('should return overall pass status when all checks pass', async () => {
    const mockDb = createMockDb();

    const result = await validateCrossReferences(mockDb, {
      mesProductCount: 0,
      mesEditorCount: 0,
      mesOptionKeyCount: 0,
      mesPriceKeyFilledCount: 0,
    });

    expect(result).toHaveProperty('allPassed');
  });
});
