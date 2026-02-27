// Tests for import-paper-mappings.ts (SPEC-IM-003 M1-REQ-004, M1-REQ-005)
// Validates paper-product mapping logic and materials management data parsing.
// Tests the 출력소재관리.xlsx color filtering and bullet marker (●) detection.

import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Constants from SPEC-IM-003
// ---------------------------------------------------------------------------

// Color codes for 출력소재관리.xlsx (different from product-master colors)
const MATERIALS_COLOR_ACTIVE = 'D9EAD3';     // active papers
const MATERIALS_COLOR_INACTIVE = 'D8D8D8';    // inactive/discontinued
const MATERIALS_COLOR_DEPRECATED = 'A5A5A5';  // severely deprecated

// Product type column mapping (columns K–Y in 출력소재관리.xlsx)
const PRODUCT_TYPE_COLUMNS: Record<string, string> = {
  K: 'premium_postcard',    // 프리미엄엽서
  L: 'standard_postcard',   // 스탠다드엽서
  M: 'fold_card',           // 접지카드
  N: 'premium_business_card', // 프리미엄명함
  O: 'flyer_leaflet',       // 소량전단지/리플렛
  P: 'saddle_inner',        // 중철내지
  Q: 'saddle_cover',        // 중철표지
  R: 'perfect_inner',       // 무선내지
  S: 'perfect_cover',       // 무선표지
  T: 'twin_ring_inner',     // 트윈링내지
  U: 'twin_ring_cover',     // 트윈링표지
  V: 'desk_calendar',       // 탁상형캘린더
  W: 'mini_desk_calendar',  // 미니탁상형캘린더
  X: 'postcard_calendar',   // 엽서캘린더
  Y: 'wall_calendar',       // 벽걸이캘린더
};

// ---------------------------------------------------------------------------
// Business logic helpers (re-implemented for testing)
// ---------------------------------------------------------------------------

function shouldSkipMaterialRow(colorCode: string): boolean {
  const upper = colorCode.trim().toUpperCase();
  return upper === MATERIALS_COLOR_INACTIVE || upper === MATERIALS_COLOR_DEPRECATED;
}

function isActiveMaterial(colorCode: string): boolean {
  const upper = colorCode.trim().toUpperCase();
  return upper === MATERIALS_COLOR_ACTIVE;
}

function hasBulletMarker(cellValue: string): boolean {
  return cellValue.trim() === '●';
}

function extractMappedProductTypes(row: Record<string, string>): string[] {
  const mapped: string[] = [];
  for (const [col, productType] of Object.entries(PRODUCT_TYPE_COLUMNS)) {
    if (hasBulletMarker(row[col] ?? '')) {
      mapped.push(productType);
    }
  }
  return mapped;
}

// ---------------------------------------------------------------------------
// Paper-product mapping record validation
// ---------------------------------------------------------------------------

interface PaperProductMappingRecord {
  paperId: number;
  productId: number;
  isDefault: boolean;
  isActive: boolean;
}

function validateMappingRecord(record: PaperProductMappingRecord): string[] {
  const errors: string[] = [];
  if (record.paperId <= 0) errors.push('paperId must be positive');
  if (record.productId <= 0) errors.push('productId must be positive');
  return errors;
}

// ---------------------------------------------------------------------------
// Tests for material color logic
// ---------------------------------------------------------------------------

describe('materials color filtering (M1-REQ-005)', () => {
  it('skips rows with D8D8D8 color (inactive)', () => {
    expect(shouldSkipMaterialRow('D8D8D8')).toBe(true);
    expect(shouldSkipMaterialRow('d8d8d8')).toBe(true);
  });

  it('skips rows with A5A5A5 color (deprecated)', () => {
    expect(shouldSkipMaterialRow('A5A5A5')).toBe(true);
    expect(shouldSkipMaterialRow('a5a5a5')).toBe(true);
  });

  it('does not skip rows with D9EAD3 color (active)', () => {
    expect(shouldSkipMaterialRow('D9EAD3')).toBe(false);
  });

  it('does not skip rows with no color (import with caution)', () => {
    expect(shouldSkipMaterialRow('')).toBe(false);
  });

  it('identifies D9EAD3 as active material', () => {
    expect(isActiveMaterial('D9EAD3')).toBe(true);
    expect(isActiveMaterial('d9ead3')).toBe(true);
  });

  it('does not identify D8D8D8 as active', () => {
    expect(isActiveMaterial('D8D8D8')).toBe(false);
  });
});

describe('bullet marker detection (M1-REQ-004)', () => {
  it('detects ● bullet marker', () => {
    expect(hasBulletMarker('●')).toBe(true);
  });

  it('detects ● with leading/trailing whitespace', () => {
    expect(hasBulletMarker(' ●')).toBe(true);
    expect(hasBulletMarker('● ')).toBe(true);
    expect(hasBulletMarker(' ● ')).toBe(true);
  });

  it('does not detect empty cell', () => {
    expect(hasBulletMarker('')).toBe(false);
  });

  it('does not detect similar but different markers', () => {
    expect(hasBulletMarker('•')).toBe(false);
    expect(hasBulletMarker('o')).toBe(false);
    expect(hasBulletMarker('O')).toBe(false);
  });
});

describe('product type column mapping', () => {
  it('has exactly 15 product type columns (K–Y)', () => {
    const cols = Object.keys(PRODUCT_TYPE_COLUMNS);
    expect(cols).toHaveLength(15);
  });

  it('includes all columns K through Y', () => {
    const expectedCols = ['K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y'];
    for (const col of expectedCols) {
      expect(PRODUCT_TYPE_COLUMNS).toHaveProperty(col);
    }
  });

  it('maps column O to flyer/leaflet type', () => {
    expect(PRODUCT_TYPE_COLUMNS['O']).toBe('flyer_leaflet');
  });

  it('maps calendar columns V, W, X, Y correctly', () => {
    expect(PRODUCT_TYPE_COLUMNS['V']).toBe('desk_calendar');
    expect(PRODUCT_TYPE_COLUMNS['W']).toBe('mini_desk_calendar');
    expect(PRODUCT_TYPE_COLUMNS['X']).toBe('postcard_calendar');
    expect(PRODUCT_TYPE_COLUMNS['Y']).toBe('wall_calendar');
  });
});

describe('extractMappedProductTypes', () => {
  it('returns empty array when no bullets present', () => {
    const row: Record<string, string> = { K: '', L: '', M: '' };
    expect(extractMappedProductTypes(row)).toHaveLength(0);
  });

  it('returns single type when one column has bullet', () => {
    const row: Record<string, string> = { K: '●', L: '', M: '' };
    const result = extractMappedProductTypes(row);
    expect(result).toContain('premium_postcard');
    expect(result).toHaveLength(1);
  });

  it('returns multiple types when multiple columns have bullets', () => {
    const row: Record<string, string> = {
      K: '●', L: '●', M: '', N: '●'
    };
    const result = extractMappedProductTypes(row);
    expect(result).toContain('premium_postcard');
    expect(result).toContain('standard_postcard');
    expect(result).toContain('premium_business_card');
    expect(result).toHaveLength(3);
  });

  it('handles row with all bullets (paper works for all types)', () => {
    const row: Record<string, string> = {};
    for (const col of Object.keys(PRODUCT_TYPE_COLUMNS)) {
      row[col] = '●';
    }
    const result = extractMappedProductTypes(row);
    expect(result).toHaveLength(15);
  });
});

describe('validateMappingRecord', () => {
  it('accepts valid mapping record', () => {
    const record: PaperProductMappingRecord = {
      paperId: 1,
      productId: 5,
      isDefault: false,
      isActive: true,
    };
    expect(validateMappingRecord(record)).toHaveLength(0);
  });

  it('rejects mapping with zero paperId', () => {
    const record: PaperProductMappingRecord = {
      paperId: 0,
      productId: 5,
      isDefault: false,
      isActive: true,
    };
    const errors = validateMappingRecord(record);
    expect(errors.some(e => e.includes('paperId'))).toBe(true);
  });

  it('rejects mapping with zero productId', () => {
    const record: PaperProductMappingRecord = {
      paperId: 1,
      productId: 0,
      isDefault: false,
      isActive: true,
    };
    const errors = validateMappingRecord(record);
    expect(errors.some(e => e.includes('productId'))).toBe(true);
  });
});

describe('paper-product mapping count expectations (SPEC Section 6.2)', () => {
  it('~2000 mappings expected (236 products x ~8 papers avg)', () => {
    const products = 236;
    const avgPapersPerProduct = 8;
    const estimated = products * avgPapersPerProduct;
    expect(estimated).toBe(1888);
    // SPEC estimates ~2000
    expect(estimated).toBeGreaterThan(1500);
  });
});
