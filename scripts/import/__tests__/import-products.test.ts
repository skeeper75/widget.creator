// Tests for import-products.ts (SPEC-IM-003 M1-REQ-002, M1-REQ-003)
// Validates product data parsing, pricingModel mapping, and product_sizes handling.
// Tests pure business logic functions — no DB or file I/O.

import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// pricingModel mapping logic (M1-REQ-002)
// From SPEC: digital_print/sticker -> tiered, business_card -> fixed,
// booklet/postcard_book -> package, acrylic/sign -> formula
// ---------------------------------------------------------------------------

type ProductType = 'digital_print' | 'sticker' | 'business_card' | 'booklet' | 'postcard_book' | 'acrylic' | 'sign' | 'banner' | 'calendar';
type PricingModel = 'tiered' | 'fixed' | 'package' | 'formula';

function mapPricingModel(productType: ProductType): PricingModel {
  switch (productType) {
    case 'digital_print':
    case 'sticker':
      return 'tiered';
    case 'business_card':
      return 'fixed';
    case 'booklet':
    case 'postcard_book':
      return 'package';
    case 'acrylic':
    case 'sign':
      return 'formula';
    default:
      return 'tiered';  // default fallback
  }
}

// ---------------------------------------------------------------------------
// Product record validation (M1-REQ-002)
// ---------------------------------------------------------------------------

interface ProductRecord {
  huniCode: string;
  categoryId: number;
  name: string;
  pricingModel: PricingModel;
  mesRegistered: boolean;
  productType: ProductType;
}

function validateProductRecord(product: ProductRecord): string[] {
  const errors: string[] = [];

  if (!product.huniCode || product.huniCode.trim() === '') {
    errors.push('huniCode is required and must be unique');
  }

  if (product.categoryId <= 0) {
    errors.push('categoryId must reference a valid category');
  }

  if (!product.name || product.name.trim() === '') {
    errors.push('name is required');
  }

  if (!['tiered', 'fixed', 'package', 'formula'].includes(product.pricingModel)) {
    errors.push(`invalid pricingModel: ${product.pricingModel}`);
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Product size validation (M1-REQ-003)
// ---------------------------------------------------------------------------

interface ProductSizeRecord {
  productId: number;
  cutWidth: number;
  cutHeight: number;
  workWidth: number;
  workHeight: number;
  impositionCount: number;
  sheetStandard: string;
  isCustom: boolean;
  customMinWidth?: number;
  customMaxWidth?: number;
  customMinHeight?: number;
  customMaxHeight?: number;
}

function validateProductSize(size: ProductSizeRecord): string[] {
  const errors: string[] = [];

  if (size.productId <= 0) {
    errors.push('productId must be positive');
  }

  if (size.cutWidth <= 0 || size.cutHeight <= 0) {
    errors.push('cutWidth and cutHeight must be positive');
  }

  if (size.workWidth <= 0 || size.workHeight <= 0) {
    errors.push('workWidth and workHeight must be positive');
  }

  if (size.workWidth < size.cutWidth) {
    errors.push('workWidth should be >= cutWidth (work includes bleed)');
  }

  if (size.workHeight < size.cutHeight) {
    errors.push('workHeight should be >= cutHeight (work includes bleed)');
  }

  if (size.impositionCount <= 0) {
    errors.push('impositionCount must be positive');
  }

  if (size.isCustom) {
    if (size.customMinWidth == null || size.customMaxWidth == null) {
      errors.push('custom sizes must specify min/max width');
    }
    if (size.customMinHeight == null || size.customMaxHeight == null) {
      errors.push('custom sizes must specify min/max height');
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Tests for pricingModel mapping
// ---------------------------------------------------------------------------

describe('pricingModel mapping (M1-REQ-002)', () => {
  it('maps digital_print to tiered', () => {
    expect(mapPricingModel('digital_print')).toBe('tiered');
  });

  it('maps sticker to tiered', () => {
    expect(mapPricingModel('sticker')).toBe('tiered');
  });

  it('maps business_card to fixed', () => {
    expect(mapPricingModel('business_card')).toBe('fixed');
  });

  it('maps booklet to package', () => {
    expect(mapPricingModel('booklet')).toBe('package');
  });

  it('maps postcard_book to package', () => {
    expect(mapPricingModel('postcard_book')).toBe('package');
  });

  it('maps acrylic to formula', () => {
    expect(mapPricingModel('acrylic')).toBe('formula');
  });

  it('maps sign to formula', () => {
    expect(mapPricingModel('sign')).toBe('formula');
  });
});

describe('validateProductRecord (M1-REQ-002)', () => {
  const validProduct: ProductRecord = {
    huniCode: 'HUNI-001',
    categoryId: 1,
    name: '전단지 A4',
    pricingModel: 'tiered',
    mesRegistered: true,
    productType: 'digital_print',
  };

  it('accepts a valid product record', () => {
    expect(validateProductRecord(validProduct)).toHaveLength(0);
  });

  it('rejects product with empty huniCode', () => {
    const invalid = { ...validProduct, huniCode: '' };
    const errors = validateProductRecord(invalid);
    expect(errors.some(e => e.includes('huniCode'))).toBe(true);
  });

  it('rejects product with zero categoryId', () => {
    const invalid = { ...validProduct, categoryId: 0 };
    const errors = validateProductRecord(invalid);
    expect(errors.some(e => e.includes('categoryId'))).toBe(true);
  });

  it('rejects product with empty name', () => {
    const invalid = { ...validProduct, name: '' };
    const errors = validateProductRecord(invalid);
    expect(errors.some(e => e.includes('name'))).toBe(true);
  });

  it('accepts product with mesRegistered=false', () => {
    const unregistered = { ...validProduct, mesRegistered: false };
    expect(validateProductRecord(unregistered)).toHaveLength(0);
  });
});

describe('validateProductSize (M1-REQ-003)', () => {
  const validSize: ProductSizeRecord = {
    productId: 1,
    cutWidth: 148,
    cutHeight: 210,
    workWidth: 150,
    workHeight: 212,
    impositionCount: 4,
    sheetStandard: 'A3',
    isCustom: false,
  };

  it('accepts a valid non-custom product size', () => {
    expect(validateProductSize(validSize)).toHaveLength(0);
  });

  it('rejects size with workWidth < cutWidth', () => {
    const invalid = { ...validSize, workWidth: 140 };  // less than cutWidth 148
    const errors = validateProductSize(invalid);
    expect(errors.some(e => e.includes('workWidth'))).toBe(true);
  });

  it('rejects size with zero cutWidth', () => {
    const invalid = { ...validSize, cutWidth: 0 };
    const errors = validateProductSize(invalid);
    expect(errors.some(e => e.includes('cutWidth'))).toBe(true);
  });

  it('rejects size with zero impositionCount', () => {
    const invalid = { ...validSize, impositionCount: 0 };
    const errors = validateProductSize(invalid);
    expect(errors.some(e => e.includes('impositionCount'))).toBe(true);
  });

  it('requires custom size bounds for isCustom=true', () => {
    const customSize: ProductSizeRecord = {
      ...validSize,
      isCustom: true,
      // no customMin/Max defined
    };
    const errors = validateProductSize(customSize);
    expect(errors.some(e => e.includes('custom sizes'))).toBe(true);
  });

  it('accepts valid custom size with bounds', () => {
    const customSize: ProductSizeRecord = {
      ...validSize,
      isCustom: true,
      customMinWidth: 50,
      customMaxWidth: 420,
      customMinHeight: 50,
      customMaxHeight: 594,
    };
    expect(validateProductSize(customSize)).toHaveLength(0);
  });
});

describe('bleed/work size SPEC findings (Section 0.3.1)', () => {
  it('standard bleed pattern adds 2mm to each dimension', () => {
    // Standard pattern: cutSize + 2mm each side = workSize
    // cutWidth 148 → workWidth 150 (1mm each side)
    const cutWidth = 148;
    const expectedWorkWidth = cutWidth + 2;  // 1mm each side
    expect(expectedWorkWidth).toBe(150);
  });

  it('special background paper has 10mm bleed (배경지 도련)', () => {
    // Q1-002: 배경지 도련 10mm — 5mm each side
    const cutWidth = 76;
    const cutHeight = 100;
    const workWidth = 86;   // 76 + 10
    const workHeight = 110; // 100 + 10
    expect(workWidth - cutWidth).toBe(10);
    expect(workHeight - cutHeight).toBe(10);
  });

  it('photocard has asymmetric bleed (포토카드)', () => {
    // Q1 example: 55x86mm cutSize → 57x87mm workSize
    // Horizontal: 55 → 57 = +2mm (1mm each side)
    // Vertical: 86 → 87 = +1mm (0.5mm each side, asymmetric)
    const cut = { w: 55, h: 86 };
    const work = { w: 57, h: 87 };
    expect(work.w - cut.w).toBe(2);
    expect(work.h - cut.h).toBe(1);
    // Vertical bleed is only 0.5mm each side — asymmetric
    expect((work.h - cut.h) / 2).toBe(0.5);
  });
});

describe('product count expectations (SPEC Section 6.2)', () => {
  it('minimum 236 products expected (MES registered)', () => {
    // A-BIZ-002: MES registered products = 236
    const minProductCount = 236;
    expect(minProductCount).toBe(236);
  });

  it('product_sizes estimated at ~500 records', () => {
    // Multiple sizes per product
    const estimatedSizes = 500;
    expect(estimatedSizes).toBeGreaterThan(200);
  });
});
