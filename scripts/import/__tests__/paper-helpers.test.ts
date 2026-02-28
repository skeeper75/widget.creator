// Tests for the business logic helper functions in import-papers.ts.
// These pure functions are re-implemented here for isolated unit testing.

import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Re-implementations matching import-papers.ts
// ---------------------------------------------------------------------------

const SKIP_COLORS = new Set(['A5A5A5', 'D8D8D8']);

interface ToonRow {
  _row: string;
  [column: string]: string;
}

function shouldSkipRow(row: ToonRow): boolean {
  const nameColor = (row['종이명_clr'] ?? '').trim().toUpperCase();
  const weightColor = (row['D_clr'] ?? '').trim().toUpperCase();
  return SKIP_COLORS.has(nameColor) || SKIP_COLORS.has(weightColor);
}

function parseWeight(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = parseFloat(trimmed);
  if (isNaN(n) || n <= 0) return null;
  return Math.round(n);
}

function parseNumeric(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '=undefined') return null;
  const cleaned = trimmed.replace(/,/g, '');
  const n = parseFloat(cleaned);
  if (isNaN(n)) return null;
  return n.toString();
}

function generateCode(name: string, weight: number | null): string {
  const namePart = name
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
    .replace(/[^\w\-가-힣]/g, '')
    .slice(0, 40);

  if (weight !== null) {
    return `${namePart}-${weight}g`.slice(0, 50);
  }
  return namePart.slice(0, 50);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('shouldSkipRow', () => {
  it('skips rows with A5A5A5 color in 종이명_clr', () => {
    const row: ToonRow = { _row: '5', '종이명_clr': 'A5A5A5', 'D_clr': '' };
    expect(shouldSkipRow(row)).toBe(true);
  });

  it('skips rows with D8D8D8 color in D_clr', () => {
    const row: ToonRow = { _row: '6', '종이명_clr': '', 'D_clr': 'D8D8D8' };
    expect(shouldSkipRow(row)).toBe(true);
  });

  it('skips rows with A5A5A5 in D_clr', () => {
    const row: ToonRow = { _row: '7', '종이명_clr': '', 'D_clr': 'A5A5A5' };
    expect(shouldSkipRow(row)).toBe(true);
  });

  it('skips rows with D8D8D8 in 종이명_clr', () => {
    const row: ToonRow = { _row: '8', '종이명_clr': 'D8D8D8', 'D_clr': '' };
    expect(shouldSkipRow(row)).toBe(true);
  });

  it('does not skip rows with valid colors', () => {
    const row: ToonRow = { _row: '9', '종이명_clr': 'D9EAD3', 'D_clr': 'D9EAD3' };
    expect(shouldSkipRow(row)).toBe(false);
  });

  it('does not skip rows with no color', () => {
    const row: ToonRow = { _row: '10', '종이명_clr': '', 'D_clr': '' };
    expect(shouldSkipRow(row)).toBe(false);
  });

  it('is case-insensitive for color comparison', () => {
    const row: ToonRow = { _row: '11', '종이명_clr': 'a5a5a5', 'D_clr': '' };
    expect(shouldSkipRow(row)).toBe(true);
  });

  it('handles missing color columns gracefully', () => {
    const row: ToonRow = { _row: '12' };
    expect(shouldSkipRow(row)).toBe(false);
  });
});

describe('parseWeight', () => {
  it('parses standard weight values', () => {
    expect(parseWeight('80')).toBe(80);
    expect(parseWeight('120')).toBe(120);
    expect(parseWeight('220')).toBe(220);
  });

  it('rounds float weights', () => {
    expect(parseWeight('80.5')).toBe(81);
    expect(parseWeight('119.9')).toBe(120);
  });

  it('returns null for empty string', () => {
    expect(parseWeight('')).toBeNull();
  });

  it('returns null for zero', () => {
    expect(parseWeight('0')).toBeNull();
  });

  it('returns null for negative values', () => {
    expect(parseWeight('-10')).toBeNull();
  });

  it('returns null for non-numeric strings', () => {
    expect(parseWeight('abc')).toBeNull();
    expect(parseWeight('g/m2')).toBeNull();
  });

  it('trims whitespace before parsing', () => {
    expect(parseWeight('  100  ')).toBe(100);
  });
});

describe('parseNumeric', () => {
  it('parses plain numeric strings', () => {
    expect(parseNumeric('1000')).toBe('1000');
    expect(parseNumeric('15000')).toBe('15000');
  });

  it('removes comma separators', () => {
    expect(parseNumeric('1,000')).toBe('1000');
    expect(parseNumeric('15,000')).toBe('15000');
    expect(parseNumeric('1,234,567')).toBe('1234567');
  });

  it('returns null for empty string', () => {
    expect(parseNumeric('')).toBeNull();
  });

  it('returns null for =undefined (Excel formula error)', () => {
    expect(parseNumeric('=undefined')).toBeNull();
  });

  it('returns null for non-numeric strings', () => {
    expect(parseNumeric('abc')).toBeNull();
  });

  it('parses floating point values', () => {
    expect(parseNumeric('157.5')).toBe('157.5');
  });

  it('trims whitespace', () => {
    expect(parseNumeric('  500  ')).toBe('500');
  });
});

describe('generateCode', () => {
  it('generates code with weight suffix', () => {
    expect(generateCode('백상지', 80)).toBe('백상지-80g');
  });

  it('generates code without weight', () => {
    expect(generateCode('특수지', null)).toBe('특수지');
  });

  it('replaces spaces with hyphens', () => {
    expect(generateCode('몽블랑 코팅지', 200)).toBe('몽블랑-코팅지-200g');
  });

  it('converts to lowercase for ASCII chars', () => {
    expect(generateCode('ART Paper', 150)).toBe('art-paper-150g');
  });

  it('truncates long names to 50 chars', () => {
    const longName = '가'.repeat(60);
    const code = generateCode(longName, null);
    expect(code.length).toBeLessThanOrEqual(50);
  });

  it('truncates code with weight to 50 chars', () => {
    const longName = '가'.repeat(50);
    const code = generateCode(longName, 200);
    expect(code.length).toBeLessThanOrEqual(50);
  });

  it('removes special characters except hyphens and Korean', () => {
    expect(generateCode('Art (Special)', 100)).toBe('art-special-100g');
  });

  it('replaces multiple consecutive spaces with a single hyphen', () => {
    // \s+ replaces all consecutive whitespace with a single hyphen
    expect(generateCode('백  상  지', 100)).toBe('백-상-지-100g');
  });
});
