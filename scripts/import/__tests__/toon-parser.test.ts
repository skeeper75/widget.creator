// Tests for the TOON file parser logic shared across all import scripts.
// The parseToon function is duplicated in each script; we re-implement and test it here
// to ensure the parser contract holds for all scripts.

import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Local re-implementation of parseToon (matches import-papers.ts / import-mes-items.ts)
// ---------------------------------------------------------------------------

interface ToonRow {
  _row: string;
  [column: string]: string;
}

interface ParsedSheet {
  name: string;
  headers: string[];
  rows: ToonRow[];
}

function parseToon(content: string): Map<string, ParsedSheet> {
  const lines = content.split('\n');
  const sheets = new Map<string, ParsedSheet>();
  let currentSheet: ParsedSheet | null = null;
  let headers: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.startsWith('#')) {
      const sheetMatch = line.match(/^##\s+Sheet:\s+(.+?)\s*\(/);
      if (sheetMatch) {
        const sheetName = sheetMatch[1].trim();
        currentSheet = { name: sheetName, headers: [], rows: [] };
        headers = [];
        sheets.set(sheetName, currentSheet);
      }
      continue;
    }

    if (!line.trim() || !currentSheet) continue;

    const parts = line.split('|');

    if (parts[0] === '_row') {
      headers = parts;
      currentSheet.headers = headers;
      continue;
    }

    if (headers.length === 0) continue;

    const row: ToonRow = { _row: parts[0] ?? '' };
    for (let i = 1; i < headers.length; i++) {
      const colName = headers[i];
      if (colName) {
        row[colName] = parts[i] ?? '';
      }
    }
    currentSheet.rows.push(row);
  }

  return sheets;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('parseToon', () => {
  const sampleToon = `# Comment line — should be skipped
# Another comment

## Sheet: TestSheet (5 rows, 3 cols)
_row|colA|colB|colC
1|val1|val2|val3
2|hello|world|foo
3|bar||baz
`;

  it('parses a single sheet correctly', () => {
    const sheets = parseToon(sampleToon);
    expect(sheets.has('TestSheet')).toBe(true);
    const sheet = sheets.get('TestSheet')!;
    expect(sheet.name).toBe('TestSheet');
    expect(sheet.rows).toHaveLength(3);
  });

  it('maps column headers correctly', () => {
    const sheets = parseToon(sampleToon);
    const sheet = sheets.get('TestSheet')!;
    const row1 = sheet.rows[0];
    expect(row1._row).toBe('1');
    expect(row1['colA']).toBe('val1');
    expect(row1['colB']).toBe('val2');
    expect(row1['colC']).toBe('val3');
  });

  it('handles empty cell values', () => {
    const sheets = parseToon(sampleToon);
    const sheet = sheets.get('TestSheet')!;
    const row3 = sheet.rows[2];
    expect(row3['colB']).toBe('');
    expect(row3['colC']).toBe('baz');
  });

  it('returns empty map for empty content', () => {
    const sheets = parseToon('');
    expect(sheets.size).toBe(0);
  });

  it('skips comment lines starting with #', () => {
    const sheets = parseToon(sampleToon);
    // Should not have any sheet named starting with '#'
    for (const key of sheets.keys()) {
      expect(key.startsWith('#')).toBe(false);
    }
  });

  it('parses multiple sheets independently', () => {
    const multiSheetToon = `## Sheet: Sheet1 (1 row)
_row|A|B
1|x|y

## Sheet: Sheet2 (1 row)
_row|C|D
1|p|q
`;
    const sheets = parseToon(multiSheetToon);
    expect(sheets.size).toBe(2);
    expect(sheets.has('Sheet1')).toBe(true);
    expect(sheets.has('Sheet2')).toBe(true);
    expect(sheets.get('Sheet1')!.rows[0]['A']).toBe('x');
    expect(sheets.get('Sheet2')!.rows[0]['C']).toBe('p');
  });

  it('handles sheet names with Korean characters', () => {
    const toon = `## Sheet: !디지털인쇄용지 (10 rows)
_row|종이명|평량
4|백상지|80
`;
    const sheets = parseToon(toon);
    expect(sheets.has('!디지털인쇄용지')).toBe(true);
  });

  it('handles sheet names with special characters like ! prefix', () => {
    const toon = `## Sheet: !출력소재 (5 rows)
_row|A|B
1|test|value
`;
    const sheets = parseToon(toon);
    expect(sheets.has('!출력소재')).toBe(true);
  });

  it('stores row number in _row field', () => {
    const toon = `## Sheet: Data (3 rows)
_row|X
10|first
20|second
30|third
`;
    const sheets = parseToon(toon);
    const rows = sheets.get('Data')!.rows;
    expect(rows[0]._row).toBe('10');
    expect(rows[1]._row).toBe('20');
    expect(rows[2]._row).toBe('30');
  });

  it('skips rows before header row', () => {
    const toon = `## Sheet: Test (2 rows)
1|orphan|row|without|header
_row|A|B
5|a|b
`;
    const sheets = parseToon(toon);
    const rows = sheets.get('Test')!.rows;
    // Only rows after _row header should appear
    expect(rows).toHaveLength(1);
    expect(rows[0]['A']).toBe('a');
  });
});
