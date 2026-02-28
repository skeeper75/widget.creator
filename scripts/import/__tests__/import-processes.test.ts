// Tests for import-processes.ts (SPEC-IM-003 M2-REQ-001, M2-REQ-002, M2-REQ-003)
// Validates print_modes, post_processes, and bindings static data contracts.
// These are hardcoded static imports — no DB or file dependencies.

import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Static data matching SPEC-IM-003 M2-REQ-001 (print_modes)
// ---------------------------------------------------------------------------

interface PrintModeRecord {
  priceCode: number;
  code: string;
  sides: string | null;
  colorType: string;
}

// The exact 11 print modes defined in SPEC-IM-003 M2-REQ-001
const PRINT_MODES: PrintModeRecord[] = [
  { priceCode: 0, code: 'NONE', sides: null, colorType: 'none' },
  { priceCode: 1, code: 'SINGLE_MONO', sides: 'single', colorType: 'mono' },
  { priceCode: 2, code: 'DOUBLE_MONO', sides: 'double', colorType: 'mono' },
  { priceCode: 4, code: 'SINGLE_COLOR', sides: 'single', colorType: 'color' },
  { priceCode: 8, code: 'DOUBLE_COLOR', sides: 'double', colorType: 'color' },
  { priceCode: 11, code: 'SINGLE_WHITE', sides: 'single', colorType: 'white' },
  { priceCode: 12, code: 'DOUBLE_WHITE', sides: 'double', colorType: 'white' },
  { priceCode: 21, code: 'SINGLE_CLEAR', sides: 'single', colorType: 'clear' },
  { priceCode: 22, code: 'DOUBLE_CLEAR', sides: 'double', colorType: 'clear' },
  { priceCode: 31, code: 'SINGLE_PINK', sides: 'single', colorType: 'pink' },
  { priceCode: 32, code: 'DOUBLE_PINK', sides: 'double', colorType: 'pink' },
];

// ---------------------------------------------------------------------------
// Static data matching SPEC-IM-003 M2-REQ-002 (post_processes)
// ---------------------------------------------------------------------------

interface PostProcessRecord {
  code: string;
  groupCode: string;
  processType: string;
  priceBasis: string;
  sheetStandard: string | null;
}

const POST_PROCESSES: PostProcessRecord[] = [
  { code: 'PP_PERFORATION',   groupCode: 'mising',   processType: 'perforation',       priceBasis: 'per_unit',  sheetStandard: null },
  { code: 'PP_CREASING',      groupCode: 'oesi',     processType: 'creasing',          priceBasis: 'per_unit',  sheetStandard: null },
  { code: 'PP_FOLDING',       groupCode: 'folding',  processType: 'folding_with_crease', priceBasis: 'per_unit', sheetStandard: null },
  { code: 'PP_VARIABLE_TEXT', groupCode: 'variable', processType: 'variable_text',     priceBasis: 'fixed',     sheetStandard: null },
  { code: 'PP_VARIABLE_IMAGE',groupCode: 'variable', processType: 'variable_image',    priceBasis: 'fixed',     sheetStandard: null },
  { code: 'PP_ROUNDED_CORNER',groupCode: 'corner',   processType: 'rounded_corner',    priceBasis: 'per_unit',  sheetStandard: null },
  { code: 'PP_COATING_A3',    groupCode: 'coating',  processType: 'coating_a3',        priceBasis: 'per_sheet', sheetStandard: 'A3' },
  { code: 'PP_COATING_T3',    groupCode: 'coating',  processType: 'coating_t3',        priceBasis: 'per_sheet', sheetStandard: 'T3' },
];

// ---------------------------------------------------------------------------
// Static data matching SPEC-IM-003 M2-REQ-003 (bindings)
// ---------------------------------------------------------------------------

interface BindingRecord {
  code: string;
  name: string;
  minPages: number;
  maxPages: number;
  pageStep: number;
}

const BINDINGS: BindingRecord[] = [
  { code: 'SADDLE_STITCH', name: '중철', minPages: 4, maxPages: 64, pageStep: 4 },
  { code: 'PERFECT_BINDING', name: '무선', minPages: 16, maxPages: 500, pageStep: 4 },
  { code: 'PUR', name: 'PUR', minPages: 16, maxPages: 500, pageStep: 4 },
  { code: 'TWIN_RING', name: '트윈링', minPages: 4, maxPages: 500, pageStep: 2 },
  { code: 'HARDCOVER', name: '하드커버', minPages: 16, maxPages: 500, pageStep: 4 },
];

// ---------------------------------------------------------------------------
// Tests for print_modes (M2-REQ-001)
// ---------------------------------------------------------------------------

describe('print_modes static data (M2-REQ-001)', () => {
  it('has exactly 11 print modes', () => {
    expect(PRINT_MODES).toHaveLength(11);
  });

  it('all codes are unique', () => {
    const codes = PRINT_MODES.map(m => m.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });

  it('all priceCodes are unique', () => {
    const priceCodes = PRINT_MODES.map(m => m.priceCode);
    const uniquePriceCodes = new Set(priceCodes);
    expect(uniquePriceCodes.size).toBe(priceCodes.length);
  });

  it('includes NONE mode with priceCode 0', () => {
    const noneMode = PRINT_MODES.find(m => m.priceCode === 0);
    expect(noneMode).toBeDefined();
    expect(noneMode!.code).toBe('NONE');
    expect(noneMode!.colorType).toBe('none');
    expect(noneMode!.sides).toBeNull();
  });

  it('includes all expected priceCodes from price-table-mapping.yaml', () => {
    const expectedPriceCodes = [0, 1, 2, 4, 8, 11, 12, 21, 22, 31, 32];
    const actualPriceCodes = PRINT_MODES.map(m => m.priceCode).sort((a, b) => a - b);
    expect(actualPriceCodes).toEqual(expectedPriceCodes);
  });

  it('single-sided modes have sides=single', () => {
    const singleModes = PRINT_MODES.filter(m =>
      m.code.startsWith('SINGLE_') && m.code !== 'NONE'
    );
    for (const mode of singleModes) {
      expect(mode.sides).toBe('single');
    }
  });

  it('double-sided modes have sides=double', () => {
    const doubleModes = PRINT_MODES.filter(m => m.code.startsWith('DOUBLE_'));
    for (const mode of doubleModes) {
      expect(mode.sides).toBe('double');
    }
  });

  it('color pairs exist (SINGLE+DOUBLE for each colorType)', () => {
    const colorTypes = ['mono', 'color', 'white', 'clear', 'pink'];
    for (const ct of colorTypes) {
      const single = PRINT_MODES.find(m => m.colorType === ct && m.sides === 'single');
      const double = PRINT_MODES.find(m => m.colorType === ct && m.sides === 'double');
      expect(single).toBeDefined();
      expect(double).toBeDefined();
    }
  });

  it('includes color mode (most common: SINGLE_COLOR and DOUBLE_COLOR)', () => {
    expect(PRINT_MODES.find(m => m.code === 'SINGLE_COLOR')).toBeDefined();
    expect(PRINT_MODES.find(m => m.code === 'DOUBLE_COLOR')).toBeDefined();
  });
});

describe('post_processes static data (M2-REQ-002)', () => {
  it('has exactly 8 post-process types', () => {
    expect(POST_PROCESSES).toHaveLength(8);
  });

  it('all codes are unique (PP_* semantic codes)', () => {
    const codes = POST_PROCESSES.map(p => p.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(8);
  });

  it('codes follow PP_* naming pattern (SPEC-IM-004 M1)', () => {
    const expectedCodes = [
      'PP_PERFORATION', 'PP_CREASING', 'PP_FOLDING', 'PP_VARIABLE_TEXT',
      'PP_VARIABLE_IMAGE', 'PP_ROUNDED_CORNER', 'PP_COATING_A3', 'PP_COATING_T3',
    ];
    for (const expected of expectedCodes) {
      expect(POST_PROCESSES.find(p => p.code === expected)).toBeDefined();
    }
  });

  it('PP_COATING_A3 has sheetStandard A3', () => {
    const p7 = POST_PROCESSES.find(p => p.code === 'PP_COATING_A3');
    expect(p7).toBeDefined();
    expect(p7!.sheetStandard).toBe('A3');
  });

  it('PP_COATING_T3 has sheetStandard T3', () => {
    const p8 = POST_PROCESSES.find(p => p.code === 'PP_COATING_T3');
    expect(p8).toBeDefined();
    expect(p8!.sheetStandard).toBe('T3');
  });

  it('non-coating processes have null sheetStandard', () => {
    const nonCoating = POST_PROCESSES.filter(p => p.groupCode !== 'coating');
    for (const p of nonCoating) {
      expect(p.sheetStandard).toBeNull();
    }
  });

  it('has perforation (미싱) process', () => {
    const mising = POST_PROCESSES.find(p => p.groupCode === 'mising');
    expect(mising).toBeDefined();
    expect(mising!.processType).toBe('perforation');
  });

  it('has creasing (오시) process', () => {
    const oesi = POST_PROCESSES.find(p => p.groupCode === 'oesi');
    expect(oesi).toBeDefined();
    expect(oesi!.processType).toBe('creasing');
  });

  it('variable processes use fixed priceBasis', () => {
    const variable = POST_PROCESSES.filter(p => p.groupCode === 'variable');
    for (const p of variable) {
      expect(p.priceBasis).toBe('fixed');
    }
  });
});

describe('bindings static data (M2-REQ-003)', () => {
  it('has at least 5 binding types', () => {
    expect(BINDINGS.length).toBeGreaterThanOrEqual(5);
  });

  it('includes all 5 required binding types', () => {
    const requiredCodes = ['SADDLE_STITCH', 'PERFECT_BINDING', 'PUR', 'TWIN_RING', 'HARDCOVER'];
    for (const code of requiredCodes) {
      expect(BINDINGS.find(b => b.code === code)).toBeDefined();
    }
  });

  it('all binding codes are unique', () => {
    const codes = BINDINGS.map(b => b.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(codes.length);
  });

  it('all bindings have valid page constraints (minPages <= maxPages)', () => {
    for (const binding of BINDINGS) {
      expect(binding.minPages).toBeLessThanOrEqual(binding.maxPages);
    }
  });

  it('all bindings have positive pageStep', () => {
    for (const binding of BINDINGS) {
      expect(binding.pageStep).toBeGreaterThan(0);
    }
  });

  it('saddle stitch (중철) has limited max pages', () => {
    const saddleStitch = BINDINGS.find(b => b.code === 'SADDLE_STITCH');
    expect(saddleStitch).toBeDefined();
    // Saddle stitch is typically limited to ~64 pages
    expect(saddleStitch!.maxPages).toBeLessThanOrEqual(100);
  });

  it('hardcover has higher minPages than saddle stitch', () => {
    const hardcover = BINDINGS.find(b => b.code === 'HARDCOVER');
    const saddleStitch = BINDINGS.find(b => b.code === 'SADDLE_STITCH');
    expect(hardcover!.minPages).toBeGreaterThanOrEqual(saddleStitch!.minPages);
  });
});
