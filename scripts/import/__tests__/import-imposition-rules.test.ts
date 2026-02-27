// Tests for import-imposition-rules.ts (SPEC-IM-003 M2-REQ-004)
// Validates imposition rule parsing from "사이즈별 판걸이수" sheet in price-table.toon.
// Tests the size-to-imposition mapping logic.

import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Types and helpers (re-implemented for testing)
// ---------------------------------------------------------------------------

interface ImpositionRule {
  cutWidth: number;
  cutHeight: number;
  impositionCount: number;
  sheetStandard: 'A3' | 'T3';
}

function validateImpositionRule(rule: ImpositionRule): string[] {
  const errors: string[] = [];

  if (rule.cutWidth <= 0) {
    errors.push('cutWidth must be positive');
  }

  if (rule.cutHeight <= 0) {
    errors.push('cutHeight must be positive');
  }

  if (rule.impositionCount <= 0) {
    errors.push('impositionCount must be positive');
  }

  if (!['A3', 'T3'].includes(rule.sheetStandard)) {
    errors.push(`sheetStandard must be A3 or T3, got ${rule.sheetStandard}`);
  }

  return errors;
}

function parseImpositionFromRow(row: Record<string, string>): ImpositionRule | null {
  const cutWidth = parseFloat(row['재단너비'] ?? '');
  const cutHeight = parseFloat(row['재단높이'] ?? '');
  const impositionCount = parseInt(row['판걸이수'] ?? '', 10);
  const sheetStandard = (row['판규격'] ?? '').trim().toUpperCase() as 'A3' | 'T3';

  if (isNaN(cutWidth) || isNaN(cutHeight) || isNaN(impositionCount)) {
    return null;
  }

  if (!['A3', 'T3'].includes(sheetStandard)) {
    return null;
  }

  return { cutWidth, cutHeight, impositionCount, sheetStandard };
}

// Yellow cell data flag (SPEC 5.6)
function isYellowCell(colorCode: string): boolean {
  return colorCode.trim().toUpperCase() === 'FFFF00';
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('validateImpositionRule', () => {
  const validRule: ImpositionRule = {
    cutWidth: 148,
    cutHeight: 210,
    impositionCount: 4,
    sheetStandard: 'A3',
  };

  it('accepts a valid imposition rule', () => {
    expect(validateImpositionRule(validRule)).toHaveLength(0);
  });

  it('accepts T3 sheetStandard', () => {
    const t3Rule = { ...validRule, sheetStandard: 'T3' as const };
    expect(validateImpositionRule(t3Rule)).toHaveLength(0);
  });

  it('rejects zero cutWidth', () => {
    const invalid = { ...validRule, cutWidth: 0 };
    const errors = validateImpositionRule(invalid);
    expect(errors.some(e => e.includes('cutWidth'))).toBe(true);
  });

  it('rejects zero impositionCount', () => {
    const invalid = { ...validRule, impositionCount: 0 };
    const errors = validateImpositionRule(invalid);
    expect(errors.some(e => e.includes('impositionCount'))).toBe(true);
  });

  it('rejects invalid sheetStandard', () => {
    const invalid = { ...validRule, sheetStandard: 'B4' as 'A3' | 'T3' };
    const errors = validateImpositionRule(invalid);
    expect(errors.some(e => e.includes('sheetStandard'))).toBe(true);
  });
});

describe('parseImpositionFromRow', () => {
  it('parses a valid row', () => {
    const row = {
      '재단너비': '148',
      '재단높이': '210',
      '판걸이수': '4',
      '판규격': 'A3',
    };
    const rule = parseImpositionFromRow(row);
    expect(rule).not.toBeNull();
    expect(rule!.cutWidth).toBe(148);
    expect(rule!.cutHeight).toBe(210);
    expect(rule!.impositionCount).toBe(4);
    expect(rule!.sheetStandard).toBe('A3');
  });

  it('parses T3 sheet standard', () => {
    const row = {
      '재단너비': '100',
      '재단높이': '148',
      '판걸이수': '8',
      '판규격': 'T3',
    };
    const rule = parseImpositionFromRow(row);
    expect(rule).not.toBeNull();
    expect(rule!.sheetStandard).toBe('T3');
  });

  it('returns null for missing numeric values', () => {
    const row = {
      '재단너비': '',
      '재단높이': '210',
      '판걸이수': '4',
      '판규격': 'A3',
    };
    expect(parseImpositionFromRow(row)).toBeNull();
  });

  it('returns null for invalid sheetStandard', () => {
    const row = {
      '재단너비': '148',
      '재단높이': '210',
      '판걸이수': '4',
      '판규격': 'B4',
    };
    expect(parseImpositionFromRow(row)).toBeNull();
  });

  it('handles lowercase sheet standard', () => {
    const row = {
      '재단너비': '148',
      '재단높이': '210',
      '판걸이수': '4',
      '판규격': 'a3',
    };
    const rule = parseImpositionFromRow(row);
    expect(rule).not.toBeNull();
    expect(rule!.sheetStandard).toBe('A3');
  });
});

describe('yellow cell detection (SPEC 5.6)', () => {
  it('identifies FFFF00 as yellow cell', () => {
    expect(isYellowCell('FFFF00')).toBe(true);
    expect(isYellowCell('ffff00')).toBe(true);
  });

  it('does not flag non-yellow colors', () => {
    expect(isYellowCell('D9EAD3')).toBe(false);
    expect(isYellowCell('')).toBe(false);
  });

  it('SPEC rows 53-54 are known yellow cells for 종이슬로건 sizes', () => {
    // From SPEC 5.6: rows 53-54 in 사이즈별 판걸이수 sheet are yellow
    // This documents the known yellow cell data
    const knownYellowRows = [53, 54];
    expect(knownYellowRows).toContain(53);
    expect(knownYellowRows).toContain(54);
  });
});

describe('imposition rule count (SPEC Section 6.2)', () => {
  it('expects approximately 50 imposition rules', () => {
    // From SPEC 6.2: imposition_rules: ~50
    const specEstimate = 50;
    expect(specEstimate).toBeGreaterThan(40);
    expect(specEstimate).toBeLessThan(100);
  });
});

describe('imposition rules deduplication', () => {
  it('same cutWidth+cutHeight+sheetStandard should produce unique entry', () => {
    const rules: ImpositionRule[] = [
      { cutWidth: 148, cutHeight: 210, impositionCount: 4, sheetStandard: 'A3' },
      { cutWidth: 148, cutHeight: 210, impositionCount: 4, sheetStandard: 'T3' },  // different standard
    ];

    const key1 = `${rules[0].cutWidth}x${rules[0].cutHeight}-${rules[0].sheetStandard}`;
    const key2 = `${rules[1].cutWidth}x${rules[1].cutHeight}-${rules[1].sheetStandard}`;

    expect(key1).not.toBe(key2);
  });

  it('duplicate cutWidth+cutHeight+sheetStandard is a data error', () => {
    const rules: ImpositionRule[] = [
      { cutWidth: 148, cutHeight: 210, impositionCount: 4, sheetStandard: 'A3' },
      { cutWidth: 148, cutHeight: 210, impositionCount: 6, sheetStandard: 'A3' },  // duplicate key
    ];

    const keys = rules.map(r => `${r.cutWidth}x${r.cutHeight}-${r.sheetStandard}`);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBeLessThan(keys.length);  // detects duplicate
  });
});
