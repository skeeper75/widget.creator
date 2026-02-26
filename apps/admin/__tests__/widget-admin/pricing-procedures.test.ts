/**
 * Tests for SPEC-WA-001 Step 3 — pricing procedures input schema validation
 * and business logic for the widget admin pricing configuration panel.
 *
 * Covers:
 * - pricingTest: real-time quote preview (FR-WA001-15)
 * - priceConfig.get / priceConfig.update
 * - printCostBase.list / printCostBase.upsert
 * - postprocessCost.list / postprocessCost.upsert
 * - qtyDiscount.list / qtyDiscount.upsert
 *
 * Pattern: re-declare schemas inline (drizzle-zod incompatible with vitest stubs).
 * See: constraints-procedures.test.ts for reference.
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// ─── Schema mirrors ───────────────────────────────────────────────────────────

const priceModeSchema = z.enum(['LOOKUP', 'AREA', 'PAGE', 'COMPOSITE']);

// pricingTest input
const pricingTestInputSchema = z.object({
  productId: z.number().int().positive(),
  plateType: z.string().optional(),
  printMode: z.string().optional(),
  qty: z.number().int().min(1).default(100),
  selectedProcessCodes: z.array(z.string()).default([]),
});

// priceConfig.get input
const priceConfigGetInputSchema = z.object({
  productId: z.number().int().positive(),
});

// priceConfig.update input
const priceConfigUpdateInputSchema = z.object({
  productId: z.number().int().positive(),
  priceMode: priceModeSchema.optional(),
  formulaText: z.string().optional(),
  unitPriceSqm: z.string().optional(),
  minAreaSqm: z.string().optional(),
  imposition: z.number().int().optional(),
  coverPrice: z.string().optional(),
  bindingCost: z.string().optional(),
  baseCost: z.string().optional(),
});

// printCostBase row
const printCostBaseRowSchema = z.object({
  plateType: z.string().min(1).max(50),
  printMode: z.string().min(1).max(100),
  qtyMin: z.number().int().min(1),
  qtyMax: z.number().int().positive(),
  unitPrice: z.string().refine((v) => Number(v) >= 0, { message: 'unitPrice must be >= 0' }),
  isActive: z.boolean(),
});

const printCostBaseUpsertInputSchema = z.object({
  productId: z.number().int().positive(),
  rows: z.array(printCostBaseRowSchema),
});

// postprocessCost row
const priceTypeSchema = z.enum(['FIXED', 'PERCENT']);

const postprocessCostRowSchema = z.object({
  processCode: z.string().min(1).max(50),
  processNameKo: z.string().min(1).max(100),
  qtyMin: z.number().int().nullable().optional(),
  qtyMax: z.number().int().nullable().optional(),
  unitPrice: z.string().refine((v) => Number(v) >= 0, { message: 'unitPrice must be >= 0' }),
  priceType: priceTypeSchema,
  isActive: z.boolean(),
});

const postprocessCostUpsertInputSchema = z.object({
  productId: z.number().int().positive(),
  rows: z.array(postprocessCostRowSchema),
});

// qtyDiscount row
const qtyDiscountRowSchema = z.object({
  qtyMin: z.number().int().min(1),
  qtyMax: z.number().int().positive(),
  discountRate: z.string().refine(
    (v) => {
      const n = Number(v);
      return !isNaN(n) && n >= 0 && n <= 1;
    },
    { message: 'discountRate must be between 0 and 1' },
  ),
  discountLabel: z.string().max(100).optional(),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean(),
});

const qtyDiscountUpsertInputSchema = z.object({
  productId: z.number().int().positive(),
  rows: z.array(qtyDiscountRowSchema),
});

// shared list input
const listInputSchema = z.object({
  productId: z.number().int().positive(),
});

// ─── Business logic helpers (same as price-test-panel.tsx) ───────────────────

function formatKRW(val: string | number): string {
  return Number(val).toLocaleString('ko-KR') + '원';
}

function formatDiscountRateDisplay(discountRate: string): string {
  return (parseFloat(discountRate) * 100).toFixed(1) + '%';
}

function calculatePriceTotal(params: {
  baseCost: number;
  postprocessTotal: number;
  discountAmount: number;
}): number {
  return params.baseCost + params.postprocessTotal - params.discountAmount;
}

function calculatePerUnit(total: number, qty: number): number {
  if (qty <= 0) return 0;
  return Math.round(total / qty);
}

function discountRateToDisplay(rate: string): string {
  return (parseFloat(rate) * 100).toFixed(4);
}

function discountRateToStore(displayPercent: number): string {
  return (displayPercent / 100).toFixed(4);
}

// ═══════════════════════════════════════════════════════════════════════════════
// pricingTest input schema
// ═══════════════════════════════════════════════════════════════════════════════

describe('pricingTest — input schema', () => {
  it('accepts valid productId with defaults', () => {
    const result = pricingTestInputSchema.safeParse({ productId: 1 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.qty).toBe(100);
      expect(result.data.selectedProcessCodes).toEqual([]);
    }
  });

  it('accepts full valid input', () => {
    const input = {
      productId: 42,
      plateType: '90x50',
      printMode: '단면칼라',
      qty: 500,
      selectedProcessCodes: ['laminate', 'round_corner'],
    };
    expect(pricingTestInputSchema.safeParse(input).success).toBe(true);
  });

  it('rejects zero productId', () => {
    expect(pricingTestInputSchema.safeParse({ productId: 0 }).success).toBe(false);
  });

  it('rejects negative productId', () => {
    expect(pricingTestInputSchema.safeParse({ productId: -1 }).success).toBe(false);
  });

  it('rejects qty < 1', () => {
    expect(pricingTestInputSchema.safeParse({ productId: 1, qty: 0 }).success).toBe(false);
  });

  it('accepts qty = 1', () => {
    expect(pricingTestInputSchema.safeParse({ productId: 1, qty: 1 }).success).toBe(true);
  });

  it('accepts large qty', () => {
    expect(pricingTestInputSchema.safeParse({ productId: 1, qty: 100000 }).success).toBe(true);
  });

  it('accepts optional plateType omitted', () => {
    const result = pricingTestInputSchema.safeParse({ productId: 1, qty: 100 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.plateType).toBeUndefined();
    }
  });

  it('accepts empty selectedProcessCodes array', () => {
    const result = pricingTestInputSchema.safeParse({
      productId: 1,
      selectedProcessCodes: [],
    });
    expect(result.success).toBe(true);
  });

  it('accepts multiple selectedProcessCodes', () => {
    const result = pricingTestInputSchema.safeParse({
      productId: 1,
      selectedProcessCodes: ['code1', 'code2', 'code3'],
    });
    expect(result.success).toBe(true);
  });

  it('rejects non-integer qty', () => {
    expect(pricingTestInputSchema.safeParse({ productId: 1, qty: 1.5 }).success).toBe(false);
  });

  it('rejects missing productId', () => {
    expect(pricingTestInputSchema.safeParse({}).success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// priceConfig.get input schema
// ═══════════════════════════════════════════════════════════════════════════════

describe('priceConfig.get — input schema', () => {
  it('accepts valid productId', () => {
    expect(priceConfigGetInputSchema.safeParse({ productId: 1 }).success).toBe(true);
  });

  it('rejects zero productId', () => {
    expect(priceConfigGetInputSchema.safeParse({ productId: 0 }).success).toBe(false);
  });

  it('rejects negative productId', () => {
    expect(priceConfigGetInputSchema.safeParse({ productId: -5 }).success).toBe(false);
  });

  it('rejects missing productId', () => {
    expect(priceConfigGetInputSchema.safeParse({}).success).toBe(false);
  });

  it('rejects string productId', () => {
    expect(priceConfigGetInputSchema.safeParse({ productId: 'abc' }).success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// priceConfig.update input schema
// ═══════════════════════════════════════════════════════════════════════════════

describe('priceConfig.update — input schema', () => {
  it('accepts minimal update with productId only', () => {
    expect(priceConfigUpdateInputSchema.safeParse({ productId: 1 }).success).toBe(true);
  });

  it('accepts LOOKUP priceMode', () => {
    expect(
      priceConfigUpdateInputSchema.safeParse({ productId: 1, priceMode: 'LOOKUP' }).success,
    ).toBe(true);
  });

  it('accepts all 4 price modes', () => {
    for (const mode of ['LOOKUP', 'AREA', 'PAGE', 'COMPOSITE'] as const) {
      expect(
        priceConfigUpdateInputSchema.safeParse({ productId: 1, priceMode: mode }).success,
      ).toBe(true);
    }
  });

  it('rejects invalid priceMode', () => {
    expect(
      priceConfigUpdateInputSchema.safeParse({ productId: 1, priceMode: 'FIXED' }).success,
    ).toBe(false);
  });

  it('accepts AREA update with unitPriceSqm and minAreaSqm', () => {
    const input = {
      productId: 1,
      priceMode: 'AREA' as const,
      unitPriceSqm: '1500.00',
      minAreaSqm: '0.25',
    };
    expect(priceConfigUpdateInputSchema.safeParse(input).success).toBe(true);
  });

  it('accepts PAGE update with imposition, coverPrice, bindingCost', () => {
    const input = {
      productId: 1,
      priceMode: 'PAGE' as const,
      imposition: 4,
      coverPrice: '5000',
      bindingCost: '1000',
    };
    expect(priceConfigUpdateInputSchema.safeParse(input).success).toBe(true);
  });

  it('accepts COMPOSITE update with baseCost', () => {
    const input = {
      productId: 1,
      priceMode: 'COMPOSITE' as const,
      baseCost: '20000',
    };
    expect(priceConfigUpdateInputSchema.safeParse(input).success).toBe(true);
  });

  it('accepts formulaText', () => {
    const input = {
      productId: 1,
      formulaText: 'base * qty / 100',
    };
    expect(priceConfigUpdateInputSchema.safeParse(input).success).toBe(true);
  });

  it('rejects non-integer imposition', () => {
    expect(
      priceConfigUpdateInputSchema.safeParse({ productId: 1, imposition: 1.5 }).success,
    ).toBe(false);
  });

  it('rejects zero productId', () => {
    expect(priceConfigUpdateInputSchema.safeParse({ productId: 0 }).success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// printCostBase schemas
// ═══════════════════════════════════════════════════════════════════════════════

describe('printCostBase.list — input schema', () => {
  it('accepts valid productId', () => {
    expect(listInputSchema.safeParse({ productId: 1 }).success).toBe(true);
  });

  it('rejects zero productId', () => {
    expect(listInputSchema.safeParse({ productId: 0 }).success).toBe(false);
  });
});

describe('printCostBase.upsert — input schema', () => {
  const validRow = {
    plateType: '90x50',
    printMode: '단면칼라',
    qtyMin: 1,
    qtyMax: 100,
    unitPrice: '500',
    isActive: true,
  };

  it('accepts valid upsert with one row', () => {
    expect(
      printCostBaseUpsertInputSchema.safeParse({ productId: 1, rows: [validRow] }).success,
    ).toBe(true);
  });

  it('accepts empty rows array (clear all)', () => {
    expect(
      printCostBaseUpsertInputSchema.safeParse({ productId: 1, rows: [] }).success,
    ).toBe(true);
  });

  it('accepts multiple rows', () => {
    const rows = [
      { ...validRow, plateType: '90x50', printMode: '단면칼라' },
      { ...validRow, plateType: '90x50', printMode: '양면칼라' },
      { ...validRow, plateType: '86x54', printMode: '단면칼라' },
    ];
    expect(
      printCostBaseUpsertInputSchema.safeParse({ productId: 1, rows }).success,
    ).toBe(true);
  });

  it('rejects empty plateType', () => {
    expect(
      printCostBaseUpsertInputSchema.safeParse({
        productId: 1,
        rows: [{ ...validRow, plateType: '' }],
      }).success,
    ).toBe(false);
  });

  it('rejects plateType over 50 chars', () => {
    expect(
      printCostBaseUpsertInputSchema.safeParse({
        productId: 1,
        rows: [{ ...validRow, plateType: 'x'.repeat(51) }],
      }).success,
    ).toBe(false);
  });

  it('rejects negative unitPrice', () => {
    expect(
      printCostBaseUpsertInputSchema.safeParse({
        productId: 1,
        rows: [{ ...validRow, unitPrice: '-1' }],
      }).success,
    ).toBe(false);
  });

  it('accepts zero unitPrice', () => {
    expect(
      printCostBaseUpsertInputSchema.safeParse({
        productId: 1,
        rows: [{ ...validRow, unitPrice: '0' }],
      }).success,
    ).toBe(true);
  });

  it('rejects qtyMin < 1', () => {
    expect(
      printCostBaseUpsertInputSchema.safeParse({
        productId: 1,
        rows: [{ ...validRow, qtyMin: 0 }],
      }).success,
    ).toBe(false);
  });

  it('rejects non-integer qtyMin', () => {
    expect(
      printCostBaseUpsertInputSchema.safeParse({
        productId: 1,
        rows: [{ ...validRow, qtyMin: 1.5 }],
      }).success,
    ).toBe(false);
  });

  it('rejects zero productId', () => {
    expect(
      printCostBaseUpsertInputSchema.safeParse({ productId: 0, rows: [validRow] }).success,
    ).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// postprocessCost schemas
// ═══════════════════════════════════════════════════════════════════════════════

describe('postprocessCost.upsert — input schema', () => {
  const validRow = {
    processCode: 'laminate',
    processNameKo: '코팅',
    qtyMin: null,
    qtyMax: null,
    unitPrice: '3000',
    priceType: 'FIXED' as const,
    isActive: true,
  };

  it('accepts valid FIXED row', () => {
    expect(
      postprocessCostUpsertInputSchema.safeParse({ productId: 1, rows: [validRow] }).success,
    ).toBe(true);
  });

  it('accepts PERCENT priceType', () => {
    expect(
      postprocessCostUpsertInputSchema.safeParse({
        productId: 1,
        rows: [{ ...validRow, priceType: 'PERCENT' }],
      }).success,
    ).toBe(true);
  });

  it('rejects invalid priceType', () => {
    expect(
      postprocessCostUpsertInputSchema.safeParse({
        productId: 1,
        rows: [{ ...validRow, priceType: 'FLAT' }],
      }).success,
    ).toBe(false);
  });

  it('accepts both FIXED and PERCENT in one batch', () => {
    const rows = [
      { ...validRow, processCode: 'p1', priceType: 'FIXED' as const },
      { ...validRow, processCode: 'p2', priceType: 'PERCENT' as const },
    ];
    expect(
      postprocessCostUpsertInputSchema.safeParse({ productId: 1, rows }).success,
    ).toBe(true);
  });

  it('rejects empty processCode', () => {
    expect(
      postprocessCostUpsertInputSchema.safeParse({
        productId: 1,
        rows: [{ ...validRow, processCode: '' }],
      }).success,
    ).toBe(false);
  });

  it('rejects processCode over 50 chars', () => {
    expect(
      postprocessCostUpsertInputSchema.safeParse({
        productId: 1,
        rows: [{ ...validRow, processCode: 'x'.repeat(51) }],
      }).success,
    ).toBe(false);
  });

  it('rejects empty processNameKo', () => {
    expect(
      postprocessCostUpsertInputSchema.safeParse({
        productId: 1,
        rows: [{ ...validRow, processNameKo: '' }],
      }).success,
    ).toBe(false);
  });

  it('rejects processNameKo over 100 chars', () => {
    expect(
      postprocessCostUpsertInputSchema.safeParse({
        productId: 1,
        rows: [{ ...validRow, processNameKo: 'x'.repeat(101) }],
      }).success,
    ).toBe(false);
  });

  it('rejects negative unitPrice', () => {
    expect(
      postprocessCostUpsertInputSchema.safeParse({
        productId: 1,
        rows: [{ ...validRow, unitPrice: '-1' }],
      }).success,
    ).toBe(false);
  });

  it('accepts null qtyMin and qtyMax (global row)', () => {
    expect(
      postprocessCostUpsertInputSchema.safeParse({
        productId: 1,
        rows: [{ ...validRow, qtyMin: null, qtyMax: null }],
      }).success,
    ).toBe(true);
  });

  it('accepts row with qtyMin and qtyMax set', () => {
    expect(
      postprocessCostUpsertInputSchema.safeParse({
        productId: 1,
        rows: [{ ...validRow, qtyMin: 1, qtyMax: 100 }],
      }).success,
    ).toBe(true);
  });

  it('accepts empty rows (clear all product-specific rows)', () => {
    expect(
      postprocessCostUpsertInputSchema.safeParse({ productId: 1, rows: [] }).success,
    ).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// qtyDiscount schemas
// ═══════════════════════════════════════════════════════════════════════════════

describe('qtyDiscount.upsert — input schema', () => {
  const validRow = {
    qtyMin: 100,
    qtyMax: 499,
    discountRate: '0.0300',
    discountLabel: '100장 이상 3% 할인',
    displayOrder: 1,
    isActive: true,
  };

  it('accepts valid discount row', () => {
    expect(
      qtyDiscountUpsertInputSchema.safeParse({ productId: 1, rows: [validRow] }).success,
    ).toBe(true);
  });

  it('accepts discountRate = 0', () => {
    expect(
      qtyDiscountUpsertInputSchema.safeParse({
        productId: 1,
        rows: [{ ...validRow, discountRate: '0' }],
      }).success,
    ).toBe(true);
  });

  it('accepts discountRate = 1 (100%)', () => {
    expect(
      qtyDiscountUpsertInputSchema.safeParse({
        productId: 1,
        rows: [{ ...validRow, discountRate: '1' }],
      }).success,
    ).toBe(true);
  });

  it('accepts discountRate = 0.5000', () => {
    expect(
      qtyDiscountUpsertInputSchema.safeParse({
        productId: 1,
        rows: [{ ...validRow, discountRate: '0.5000' }],
      }).success,
    ).toBe(true);
  });

  it('rejects discountRate > 1', () => {
    expect(
      qtyDiscountUpsertInputSchema.safeParse({
        productId: 1,
        rows: [{ ...validRow, discountRate: '1.01' }],
      }).success,
    ).toBe(false);
  });

  it('rejects negative discountRate', () => {
    expect(
      qtyDiscountUpsertInputSchema.safeParse({
        productId: 1,
        rows: [{ ...validRow, discountRate: '-0.01' }],
      }).success,
    ).toBe(false);
  });

  it('rejects non-numeric discountRate', () => {
    expect(
      qtyDiscountUpsertInputSchema.safeParse({
        productId: 1,
        rows: [{ ...validRow, discountRate: 'abc' }],
      }).success,
    ).toBe(false);
  });

  it('rejects qtyMin < 1', () => {
    expect(
      qtyDiscountUpsertInputSchema.safeParse({
        productId: 1,
        rows: [{ ...validRow, qtyMin: 0 }],
      }).success,
    ).toBe(false);
  });

  it('accepts optional discountLabel omitted', () => {
    const { discountLabel: _, ...rowWithoutLabel } = validRow;
    expect(
      qtyDiscountUpsertInputSchema.safeParse({ productId: 1, rows: [rowWithoutLabel] }).success,
    ).toBe(true);
  });

  it('applies default displayOrder = 0 when omitted', () => {
    const { displayOrder: _, ...rowWithoutOrder } = validRow;
    const result = qtyDiscountUpsertInputSchema.safeParse({
      productId: 1,
      rows: [rowWithoutOrder],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rows[0].displayOrder).toBe(0);
    }
  });

  it('accepts multiple discount tiers', () => {
    const rows = [
      { ...validRow, qtyMin: 100, qtyMax: 499, discountRate: '0.0300', displayOrder: 1 },
      { ...validRow, qtyMin: 500, qtyMax: 999, discountRate: '0.0500', displayOrder: 2 },
      { ...validRow, qtyMin: 1000, qtyMax: 9999, discountRate: '0.1000', displayOrder: 3 },
    ];
    expect(
      qtyDiscountUpsertInputSchema.safeParse({ productId: 1, rows }).success,
    ).toBe(true);
  });

  it('accepts empty rows (clear all product-specific discounts)', () => {
    expect(
      qtyDiscountUpsertInputSchema.safeParse({ productId: 1, rows: [] }).success,
    ).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Business logic: formatKRW (price display — FR-WA001-15)
// ═══════════════════════════════════════════════════════════════════════════════

describe('formatKRW — Korean Won formatting', () => {
  it('formats integer correctly', () => {
    expect(formatKRW(10000)).toBe('10,000원');
  });

  it('formats large integer with thousand separators', () => {
    expect(formatKRW(1234567)).toBe('1,234,567원');
  });

  it('formats zero', () => {
    expect(formatKRW(0)).toBe('0원');
  });

  it('accepts string numeric input', () => {
    expect(formatKRW('5000')).toBe('5,000원');
  });

  it('accepts string decimal input (rounds via Number())', () => {
    // Number('5000.50').toLocaleString('ko-KR') may vary by env,
    // but must end with '원'
    const result = formatKRW('5000.50');
    expect(result).toContain('원');
    expect(result).toContain('5,000');
  });

  it('formats small amount', () => {
    expect(formatKRW(100)).toBe('100원');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Business logic: discount rate conversion
// ═══════════════════════════════════════════════════════════════════════════════

describe('discount rate conversion', () => {
  it('converts stored 0.03 to display 3.0%', () => {
    expect(formatDiscountRateDisplay('0.0300')).toBe('3.0%');
  });

  it('converts stored 0.05 to display 5.0%', () => {
    expect(formatDiscountRateDisplay('0.0500')).toBe('5.0%');
  });

  it('converts stored 0.10 to display 10.0%', () => {
    expect(formatDiscountRateDisplay('0.1000')).toBe('10.0%');
  });

  it('converts stored 0 to display 0.0%', () => {
    expect(formatDiscountRateDisplay('0')).toBe('0.0%');
  });

  it('converts stored 1 to display 100.0%', () => {
    expect(formatDiscountRateDisplay('1')).toBe('100.0%');
  });

  it('stores 3% as 0.0300 (4 decimal places)', () => {
    expect(discountRateToStore(3)).toBe('0.0300');
  });

  it('stores 5% as 0.0500', () => {
    expect(discountRateToStore(5)).toBe('0.0500');
  });

  it('stores 10% as 0.1000', () => {
    expect(discountRateToStore(10)).toBe('0.1000');
  });

  it('stores 0% as 0.0000', () => {
    expect(discountRateToStore(0)).toBe('0.0000');
  });

  it('round-trips: store then display gives original value', () => {
    const original = 7.5;
    const stored = discountRateToStore(original);
    const display = parseFloat(formatDiscountRateDisplay(stored));
    expect(display).toBeCloseTo(original, 1);
  });

  it('discountRateToDisplay shows 4 decimal places internally', () => {
    expect(discountRateToDisplay('0.0300')).toBe('3.0000');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Business logic: price calculation
// ═══════════════════════════════════════════════════════════════════════════════

describe('pricing calculation logic', () => {
  it('calculates total as baseCost + postprocessTotal - discountAmount', () => {
    const total = calculatePriceTotal({
      baseCost: 10000,
      postprocessTotal: 2000,
      discountAmount: 500,
    });
    expect(total).toBe(11500);
  });

  it('total equals baseCost when no postprocess and no discount', () => {
    const total = calculatePriceTotal({
      baseCost: 15000,
      postprocessTotal: 0,
      discountAmount: 0,
    });
    expect(total).toBe(15000);
  });

  it('total reduces when discount applied', () => {
    const total = calculatePriceTotal({
      baseCost: 10000,
      postprocessTotal: 0,
      discountAmount: 1000,
    });
    expect(total).toBe(9000);
  });

  it('total includes postprocess even with discount', () => {
    const total = calculatePriceTotal({
      baseCost: 10000,
      postprocessTotal: 3000,
      discountAmount: 1300,
    });
    expect(total).toBe(11700);
  });

  it('calculates per-unit price correctly', () => {
    expect(calculatePerUnit(10000, 100)).toBe(100);
  });

  it('calculates per-unit price with rounding', () => {
    expect(calculatePerUnit(1000, 3)).toBe(333);
  });

  it('returns 0 for zero quantity', () => {
    expect(calculatePerUnit(10000, 0)).toBe(0);
  });

  it('per-unit increases for smaller quantities', () => {
    const perUnit100 = calculatePerUnit(10000, 100);
    const perUnit50 = calculatePerUnit(10000, 50);
    expect(perUnit50).toBeGreaterThan(perUnit100);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// priceMode enum validation
// ═══════════════════════════════════════════════════════════════════════════════

describe('priceMode enum', () => {
  it('accepts LOOKUP', () => {
    expect(priceModeSchema.safeParse('LOOKUP').success).toBe(true);
  });

  it('accepts AREA', () => {
    expect(priceModeSchema.safeParse('AREA').success).toBe(true);
  });

  it('accepts PAGE', () => {
    expect(priceModeSchema.safeParse('PAGE').success).toBe(true);
  });

  it('accepts COMPOSITE', () => {
    expect(priceModeSchema.safeParse('COMPOSITE').success).toBe(true);
  });

  it('rejects lowercase lookup', () => {
    expect(priceModeSchema.safeParse('lookup').success).toBe(false);
  });

  it('rejects FIXED (not a valid priceMode)', () => {
    expect(priceModeSchema.safeParse('FIXED').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(priceModeSchema.safeParse('').success).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// postprocessCost priceType enum
// ═══════════════════════════════════════════════════════════════════════════════

describe('postprocessCost priceType enum', () => {
  it('accepts FIXED', () => {
    expect(priceTypeSchema.safeParse('FIXED').success).toBe(true);
  });

  it('accepts PERCENT', () => {
    expect(priceTypeSchema.safeParse('PERCENT').success).toBe(true);
  });

  it('rejects lowercase fixed', () => {
    expect(priceTypeSchema.safeParse('fixed').success).toBe(false);
  });

  it('rejects FLAT (not valid)', () => {
    expect(priceTypeSchema.safeParse('FLAT').success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(priceTypeSchema.safeParse('').success).toBe(false);
  });
});
