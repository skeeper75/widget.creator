/**
 * Tests for Pricing domain form validation schemas.
 * REQ-N-003: Negative value blocking for unit prices.
 *
 * Re-declares pricing schemas from page components.
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// --- Price tier schema with negative blocking (REQ-N-003) ---
const priceTierFormSchema = z.object({
  priceTableId: z.number().int().positive(),
  optionCode: z.string().min(1, 'Option code is required').max(50),
  minQty: z.coerce.number().int().min(1, 'Min quantity must be at least 1'),
  maxQty: z.coerce.number().int().positive('Max quantity must be positive'),
  unitPrice: z.string().refine((val) => Number(val) >= 0, {
    message: 'unitPrice must not be negative (REQ-N-003)',
  }),
  isActive: z.boolean().default(true),
});

// --- Price table schema ---
const priceTableFormSchema = z.object({
  code: z.string().min(1, 'Code is required').max(50),
  name: z.string().min(1, 'Name is required').max(100),
  priceType: z.enum(['selling', 'cost']),
  quantityBasis: z.enum(['sheet', 'piece', 'set']),
  sheetStandard: z.enum(['A3', 'T3', 'A4']).nullable().default(null),
  description: z.string().max(500).nullable().default(null),
  isActive: z.boolean().default(true),
});

// --- Fixed price schema ---
const fixedPriceFormSchema = z.object({
  productId: z.number().int().positive(),
  sizeId: z.number().int().positive().nullable().default(null),
  paperId: z.number().int().positive().nullable().default(null),
  materialId: z.number().int().positive().nullable().default(null),
  printModeId: z.number().int().positive().nullable().default(null),
  optionLabel: z.string().max(100).nullable().default(null),
  baseQty: z.coerce.number().int().positive(),
  sellingPrice: z.string().refine((val) => Number(val) >= 0, {
    message: 'Selling price must not be negative',
  }),
  costPrice: z.string().refine((val) => Number(val) >= 0, {
    message: 'Cost price must not be negative',
  }),
  vatIncluded: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

// --- Package price schema ---
const packagePriceFormSchema = z.object({
  productId: z.number().int().positive(),
  sizeId: z.number().int().positive().nullable().default(null),
  printModeId: z.number().int().positive().nullable().default(null),
  pageCount: z.coerce.number().int().positive(),
  minQty: z.coerce.number().int().positive(),
  maxQty: z.coerce.number().int().positive(),
  sellingPrice: z.string().refine((val) => Number(val) >= 0, {
    message: 'Selling price must not be negative',
  }),
  costPrice: z.string().refine((val) => Number(val) >= 0, {
    message: 'Cost price must not be negative',
  }),
  isActive: z.boolean().default(true),
});

// --- Foil price schema ---
const foilPriceFormSchema = z.object({
  foilType: z.string().min(1, 'Foil type is required'),
  foilColor: z.string().min(1, 'Foil color is required'),
  plateMaterial: z.string().min(1, 'Plate material is required'),
  targetProductType: z.string().min(1, 'Target product type is required'),
  width: z.string().min(1, 'Width is required'),
  height: z.string().min(1, 'Height is required'),
  sellingPrice: z.string().refine((val) => Number(val) >= 0, {
    message: 'Selling price must not be negative',
  }),
  costPrice: z.string().refine((val) => Number(val) >= 0, {
    message: 'Cost price must not be negative',
  }),
  displayOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});

// --- Loss quantity config schema ---
const lossQuantityFormSchema = z.object({
  scopeType: z.enum(['global', 'product', 'category']),
  scopeId: z.number().int().nullable().default(null),
  lossRate: z.string().refine(
    (val) => {
      const num = Number(val);
      return !isNaN(num) && num >= 0 && num <= 100;
    },
    { message: 'Loss rate must be between 0 and 100' },
  ),
  minLossQty: z.coerce.number().int().min(0, 'Min loss quantity must be >= 0'),
  description: z.string().max(200).nullable().default(null),
  isActive: z.boolean().default(true),
});

// ===================================================================
// Tests
// ===================================================================

describe('priceTierFormSchema (REQ-N-003)', () => {
  const validTier = {
    priceTableId: 1,
    optionCode: 'OPT001',
    minQty: 1,
    maxQty: 100,
    unitPrice: '500.00',
    isActive: true,
  };

  it('accepts valid price tier', () => {
    const result = priceTierFormSchema.safeParse(validTier);
    expect(result.success).toBe(true);
  });

  it('accepts zero unit price', () => {
    const result = priceTierFormSchema.safeParse({ ...validTier, unitPrice: '0' });
    expect(result.success).toBe(true);
  });

  it('accepts zero-point-zero unit price', () => {
    const result = priceTierFormSchema.safeParse({ ...validTier, unitPrice: '0.00' });
    expect(result.success).toBe(true);
  });

  it('rejects negative unit price', () => {
    const result = priceTierFormSchema.safeParse({ ...validTier, unitPrice: '-1' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('REQ-N-003');
    }
  });

  it('rejects negative decimal unit price', () => {
    const result = priceTierFormSchema.safeParse({ ...validTier, unitPrice: '-0.01' });
    expect(result.success).toBe(false);
  });

  it('rejects empty option code', () => {
    const result = priceTierFormSchema.safeParse({ ...validTier, optionCode: '' });
    expect(result.success).toBe(false);
  });

  it('rejects minQty less than 1', () => {
    const result = priceTierFormSchema.safeParse({ ...validTier, minQty: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects negative maxQty', () => {
    const result = priceTierFormSchema.safeParse({ ...validTier, maxQty: -1 });
    expect(result.success).toBe(false);
  });

  it('accepts large positive unit price', () => {
    const result = priceTierFormSchema.safeParse({ ...validTier, unitPrice: '999999.99' });
    expect(result.success).toBe(true);
  });
});

describe('priceTableFormSchema', () => {
  const validTable = {
    code: 'PT001',
    name: 'Standard Price Table',
    priceType: 'selling' as const,
    quantityBasis: 'sheet' as const,
    sheetStandard: 'A3' as const,
    description: null,
    isActive: true,
  };

  it('accepts valid price table', () => {
    const result = priceTableFormSchema.safeParse(validTable);
    expect(result.success).toBe(true);
  });

  it('rejects empty code', () => {
    const result = priceTableFormSchema.safeParse({ ...validTable, code: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty name', () => {
    const result = priceTableFormSchema.safeParse({ ...validTable, name: '' });
    expect(result.success).toBe(false);
  });

  it('accepts priceType selling', () => {
    const result = priceTableFormSchema.safeParse({ ...validTable, priceType: 'selling' });
    expect(result.success).toBe(true);
  });

  it('accepts priceType cost', () => {
    const result = priceTableFormSchema.safeParse({ ...validTable, priceType: 'cost' });
    expect(result.success).toBe(true);
  });

  it('rejects invalid priceType', () => {
    const result = priceTableFormSchema.safeParse({ ...validTable, priceType: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('accepts all quantityBasis values', () => {
    for (const basis of ['sheet', 'piece', 'set'] as const) {
      const result = priceTableFormSchema.safeParse({ ...validTable, quantityBasis: basis });
      expect(result.success).toBe(true);
    }
  });

  it('accepts null sheetStandard', () => {
    const result = priceTableFormSchema.safeParse({ ...validTable, sheetStandard: null });
    expect(result.success).toBe(true);
  });

  it('accepts all sheetStandard values', () => {
    for (const std of ['A3', 'T3', 'A4'] as const) {
      const result = priceTableFormSchema.safeParse({ ...validTable, sheetStandard: std });
      expect(result.success).toBe(true);
    }
  });

  it('rejects description exceeding 500 chars', () => {
    const result = priceTableFormSchema.safeParse({
      ...validTable,
      description: 'X'.repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

describe('fixedPriceFormSchema (REQ-N-003)', () => {
  const validFixed = {
    productId: 1,
    sizeId: 1,
    paperId: 1,
    materialId: null,
    printModeId: 1,
    optionLabel: 'Standard',
    baseQty: 100,
    sellingPrice: '15000',
    costPrice: '10000',
    vatIncluded: true,
    isActive: true,
  };

  it('accepts valid fixed price', () => {
    const result = fixedPriceFormSchema.safeParse(validFixed);
    expect(result.success).toBe(true);
  });

  it('rejects negative selling price', () => {
    const result = fixedPriceFormSchema.safeParse({ ...validFixed, sellingPrice: '-100' });
    expect(result.success).toBe(false);
  });

  it('rejects negative cost price', () => {
    const result = fixedPriceFormSchema.safeParse({ ...validFixed, costPrice: '-1' });
    expect(result.success).toBe(false);
  });

  it('accepts zero prices', () => {
    const result = fixedPriceFormSchema.safeParse({
      ...validFixed,
      sellingPrice: '0',
      costPrice: '0',
    });
    expect(result.success).toBe(true);
  });

  it('accepts null optional foreign keys', () => {
    const result = fixedPriceFormSchema.safeParse({
      ...validFixed,
      sizeId: null,
      paperId: null,
      materialId: null,
      printModeId: null,
    });
    expect(result.success).toBe(true);
  });
});

describe('packagePriceFormSchema (REQ-N-003)', () => {
  const validPackage = {
    productId: 1,
    sizeId: 1,
    printModeId: 1,
    pageCount: 32,
    minQty: 100,
    maxQty: 500,
    sellingPrice: '25000',
    costPrice: '18000',
    isActive: true,
  };

  it('accepts valid package price', () => {
    const result = packagePriceFormSchema.safeParse(validPackage);
    expect(result.success).toBe(true);
  });

  it('rejects negative selling price', () => {
    const result = packagePriceFormSchema.safeParse({ ...validPackage, sellingPrice: '-1' });
    expect(result.success).toBe(false);
  });

  it('rejects zero page count', () => {
    const result = packagePriceFormSchema.safeParse({ ...validPackage, pageCount: 0 });
    expect(result.success).toBe(false);
  });
});

describe('foilPriceFormSchema (REQ-N-003)', () => {
  const validFoil = {
    foilType: 'hot_stamping',
    foilColor: 'gold',
    plateMaterial: 'magnesium',
    targetProductType: 'digital_print',
    width: '50.00',
    height: '30.00',
    sellingPrice: '5000',
    costPrice: '3000',
    displayOrder: 1,
    isActive: true,
  };

  it('accepts valid foil price', () => {
    const result = foilPriceFormSchema.safeParse(validFoil);
    expect(result.success).toBe(true);
  });

  it('rejects empty foilType', () => {
    const result = foilPriceFormSchema.safeParse({ ...validFoil, foilType: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty foilColor', () => {
    const result = foilPriceFormSchema.safeParse({ ...validFoil, foilColor: '' });
    expect(result.success).toBe(false);
  });

  it('rejects negative selling price', () => {
    const result = foilPriceFormSchema.safeParse({ ...validFoil, sellingPrice: '-100' });
    expect(result.success).toBe(false);
  });

  it('rejects negative cost price', () => {
    const result = foilPriceFormSchema.safeParse({ ...validFoil, costPrice: '-50' });
    expect(result.success).toBe(false);
  });

  it('rejects empty width', () => {
    const result = foilPriceFormSchema.safeParse({ ...validFoil, width: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty height', () => {
    const result = foilPriceFormSchema.safeParse({ ...validFoil, height: '' });
    expect(result.success).toBe(false);
  });
});

describe('lossQuantityFormSchema', () => {
  const validLoss = {
    scopeType: 'global' as const,
    scopeId: null,
    lossRate: '5.0',
    minLossQty: 10,
    description: 'Default 5% loss rate',
    isActive: true,
  };

  it('accepts valid loss config', () => {
    const result = lossQuantityFormSchema.safeParse(validLoss);
    expect(result.success).toBe(true);
  });

  it('accepts all scopeType values', () => {
    for (const scope of ['global', 'product', 'category'] as const) {
      const result = lossQuantityFormSchema.safeParse({ ...validLoss, scopeType: scope });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid scopeType', () => {
    const result = lossQuantityFormSchema.safeParse({ ...validLoss, scopeType: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('accepts lossRate of 0', () => {
    const result = lossQuantityFormSchema.safeParse({ ...validLoss, lossRate: '0' });
    expect(result.success).toBe(true);
  });

  it('accepts lossRate of 100', () => {
    const result = lossQuantityFormSchema.safeParse({ ...validLoss, lossRate: '100' });
    expect(result.success).toBe(true);
  });

  it('rejects lossRate over 100', () => {
    const result = lossQuantityFormSchema.safeParse({ ...validLoss, lossRate: '101' });
    expect(result.success).toBe(false);
  });

  it('rejects negative lossRate', () => {
    const result = lossQuantityFormSchema.safeParse({ ...validLoss, lossRate: '-1' });
    expect(result.success).toBe(false);
  });

  it('rejects non-numeric lossRate', () => {
    const result = lossQuantityFormSchema.safeParse({ ...validLoss, lossRate: 'abc' });
    expect(result.success).toBe(false);
  });

  it('accepts minLossQty of 0', () => {
    const result = lossQuantityFormSchema.safeParse({ ...validLoss, minLossQty: 0 });
    expect(result.success).toBe(true);
  });

  it('rejects negative minLossQty', () => {
    const result = lossQuantityFormSchema.safeParse({ ...validLoss, minLossQty: -1 });
    expect(result.success).toBe(false);
  });

  it('accepts null description', () => {
    const result = lossQuantityFormSchema.safeParse({ ...validLoss, description: null });
    expect(result.success).toBe(true);
  });
});
