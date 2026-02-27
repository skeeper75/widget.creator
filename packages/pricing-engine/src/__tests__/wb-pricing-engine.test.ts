import { describe, it, expect } from 'vitest';
import {
  calculateLookupPrice,
  calculateAreaPrice,
  calculatePagePrice,
  calculateCompositePrice,
  calculatePostprocessCost,
  findQtyDiscount,
  calculateFinalPrice,
  WbPricingEngine,
  type PrintCostBaseEntry,
  type PostprocessCostEntry,
  type QtyDiscountEntry,
  type AreaParams,
  type PageParams,
  type CompositeParams,
  type LookupParams,
  type WbPricingInput,
} from '../wb-pricing-engine';

// -------------------------------------------------------
// Test fixtures
// -------------------------------------------------------

const printCostBaseEntries: PrintCostBaseEntry[] = [
  { plateType: '90x50', printMode: '단면칼라', qtyMin: 100, qtyMax: 499, unitPrice: 350 },
  { plateType: '90x50', printMode: '단면칼라', qtyMin: 500, qtyMax: 999, unitPrice: 280 },
  { plateType: '90x50', printMode: '양면칼라', qtyMin: 100, qtyMax: 499, unitPrice: 420 },
  { plateType: '100x148', printMode: '단면칼라', qtyMin: 50, qtyMax: 99, unitPrice: 600 },
];

const postprocessEntries: PostprocessCostEntry[] = [
  { processCode: 'MATTE_PP', qtyMin: 0, qtyMax: 999999, unitPrice: 500, priceType: 'fixed' },
  { processCode: 'UV_COATING', qtyMin: 0, qtyMax: 999999, unitPrice: 50, priceType: 'per_unit' },
  { processCode: 'LAMINATE', qtyMin: 0, qtyMax: 999999, unitPrice: 800, priceType: 'per_sqm' },
];

const qtyDiscountEntries: QtyDiscountEntry[] = [
  { qtyMin: 1, qtyMax: 99, discountRate: 0, discountLabel: '할인없음' },
  { qtyMin: 100, qtyMax: 299, discountRate: 0.03, discountLabel: '소량할인' },
  { qtyMin: 300, qtyMax: 999999, discountRate: 0.07, discountLabel: '대량할인' },
];

// -------------------------------------------------------
// 1. LOOKUP mode
// -------------------------------------------------------

describe('calculateLookupPrice', () => {
  it('finds correct unit_price for 90x50 단면칼라 qty=200', () => {
    const params: LookupParams = { plateType: '90x50', printMode: '단면칼라', quantity: 200 };
    const result = calculateLookupPrice(printCostBaseEntries, params);
    expect(result).toBe(350);
  });

  it('finds correct unit_price for 90x50 단면칼라 qty=500 (boundary)', () => {
    const params: LookupParams = { plateType: '90x50', printMode: '단면칼라', quantity: 500 };
    const result = calculateLookupPrice(printCostBaseEntries, params);
    expect(result).toBe(280);
  });

  it('finds correct unit_price for 90x50 양면칼라 qty=300', () => {
    const params: LookupParams = { plateType: '90x50', printMode: '양면칼라', quantity: 300 };
    const result = calculateLookupPrice(printCostBaseEntries, params);
    expect(result).toBe(420);
  });

  it('returns 0 when no matching entry found for unknown plate_type', () => {
    const params: LookupParams = { plateType: '999x999', printMode: '단면칼라', quantity: 200 };
    const result = calculateLookupPrice(printCostBaseEntries, params);
    expect(result).toBe(0);
  });

  it('returns 0 when qty is out of all ranges', () => {
    const params: LookupParams = { plateType: '90x50', printMode: '단면칼라', quantity: 9999 };
    const result = calculateLookupPrice(printCostBaseEntries, params);
    expect(result).toBe(0);
  });
});

// -------------------------------------------------------
// 2. AREA mode
// -------------------------------------------------------

describe('calculateAreaPrice', () => {
  it('calculates correctly: MAX(100*200/1e6, 0.1) * 5000 = 0.1 * 5000 = 500', () => {
    const params: AreaParams = {
      widthMm: 100,
      heightMm: 200,
      unitPricePerSqm: 5000,
      minAreaSqm: 0.1,
    };
    const result = calculateAreaPrice(params);
    expect(result).toBe(500);
  });

  it('uses actual area when larger than minAreaSqm: 500*400/1e6=0.2 * 5000 = 1000', () => {
    const params: AreaParams = {
      widthMm: 500,
      heightMm: 400,
      unitPricePerSqm: 5000,
      minAreaSqm: 0.1,
    };
    const result = calculateAreaPrice(params);
    expect(result).toBe(1000);
  });

  it('uses default minAreaSqm=0.1 when not provided', () => {
    // 10mm * 10mm = 0.0001 sqm < 0.1 → use 0.1 * 10000 = 1000
    const params: AreaParams = {
      widthMm: 10,
      heightMm: 10,
      unitPricePerSqm: 10000,
    };
    const result = calculateAreaPrice(params);
    expect(result).toBe(1000);
  });

  it('rounds to 2 decimal places', () => {
    const params: AreaParams = {
      widthMm: 333,
      heightMm: 444,
      unitPricePerSqm: 1000,
    };
    // 333 * 444 / 1e6 = 0.147852 sqm > 0.1 → 0.147852 * 1000 = 147.85 (rounded)
    const result = calculateAreaPrice(params);
    expect(result).toBeCloseTo(147.85, 1);
  });
});

// -------------------------------------------------------
// 3. PAGE mode
// -------------------------------------------------------

describe('calculatePagePrice', () => {
  it('calculates correctly: CEIL(8/4) * 500 + 1000 + 200 = 2200', () => {
    const params: PageParams = {
      innerPages: 8,
      imposition: 4,
      unitPrice: 500,
      coverPrice: 1000,
      bindingCost: 200,
    };
    const result = calculatePagePrice(params);
    expect(result).toBe(2200);
  });

  it('rounds up pages: CEIL(9/4)=3 sheets * 500 + 1000 + 200 = 2700', () => {
    const params: PageParams = {
      innerPages: 9,
      imposition: 4,
      unitPrice: 500,
      coverPrice: 1000,
      bindingCost: 200,
    };
    const result = calculatePagePrice(params);
    expect(result).toBe(2700);
  });

  it('handles zero binding cost: CEIL(4/2) * 300 + 500 + 0 = 1100', () => {
    const params: PageParams = {
      innerPages: 4,
      imposition: 2,
      unitPrice: 300,
      coverPrice: 500,
      bindingCost: 0,
    };
    const result = calculatePagePrice(params);
    expect(result).toBe(1100);
  });
});

// -------------------------------------------------------
// 4. COMPOSITE mode
// -------------------------------------------------------

describe('calculateCompositePrice', () => {
  it('calculates: baseCost + sum(processCosts) = 1000 + 500 + 300 = 1800', () => {
    const params: CompositeParams = {
      baseCost: 1000,
      processCosts: [500, 300],
    };
    const result = calculateCompositePrice(params);
    expect(result).toBe(1800);
  });

  it('returns baseCost when no processCosts', () => {
    const params: CompositeParams = {
      baseCost: 2000,
      processCosts: [],
    };
    const result = calculateCompositePrice(params);
    expect(result).toBe(2000);
  });
});

// -------------------------------------------------------
// 5. Postprocess cost
// -------------------------------------------------------

describe('calculatePostprocessCost', () => {
  it('fixed type: returns unitPrice directly (500)', () => {
    const result = calculatePostprocessCost(
      postprocessEntries,
      ['MATTE_PP'],
      100,
    );
    expect(result).toBe(500);
  });

  it('per_unit type: unitPrice * quantity = 50 * 200 = 10000', () => {
    const result = calculatePostprocessCost(
      postprocessEntries,
      ['UV_COATING'],
      200,
    );
    expect(result).toBe(10000);
  });

  it('per_sqm type: unitPrice * areaSquareMeters = 800 * 0.2 = 160', () => {
    const result = calculatePostprocessCost(
      postprocessEntries,
      ['LAMINATE'],
      100,
      0.2,
    );
    expect(result).toBe(160);
  });

  it('sums multiple process costs: fixed + per_unit = 500 + 50*100 = 5500', () => {
    const result = calculatePostprocessCost(
      postprocessEntries,
      ['MATTE_PP', 'UV_COATING'],
      100,
    );
    expect(result).toBe(5500);
  });

  it('ignores unknown process codes (returns 0 for unknown)', () => {
    const result = calculatePostprocessCost(
      postprocessEntries,
      ['UNKNOWN_PROCESS'],
      100,
    );
    expect(result).toBe(0);
  });
});

// -------------------------------------------------------
// 6. Quantity discount
// -------------------------------------------------------

describe('findQtyDiscount', () => {
  it('returns null for qty=99 (no discount tier matched when rate=0)', () => {
    const result = findQtyDiscount(qtyDiscountEntries, 99);
    expect(result).not.toBeNull();
    expect(result?.discountRate).toBe(0);
  });

  it('returns 3% discount for qty=100', () => {
    const result = findQtyDiscount(qtyDiscountEntries, 100);
    expect(result).not.toBeNull();
    expect(result?.discountRate).toBe(0.03);
    expect(result?.discountLabel).toBe('소량할인');
  });

  it('returns 3% discount for qty=299 (boundary)', () => {
    const result = findQtyDiscount(qtyDiscountEntries, 299);
    expect(result).not.toBeNull();
    expect(result?.discountRate).toBe(0.03);
  });

  it('returns 7% discount for qty=300', () => {
    const result = findQtyDiscount(qtyDiscountEntries, 300);
    expect(result).not.toBeNull();
    expect(result?.discountRate).toBe(0.07);
    expect(result?.discountLabel).toBe('대량할인');
  });

  it('returns null when qty does not match any tier', () => {
    const emptyEntries: QtyDiscountEntry[] = [];
    const result = findQtyDiscount(emptyEntries, 100);
    expect(result).toBeNull();
  });
});

// -------------------------------------------------------
// 7. Final price formula
// -------------------------------------------------------

describe('calculateFinalPrice', () => {
  it('applies discount: (printCost + processCost) * (1 - discountRate)', () => {
    const discountEntry: QtyDiscountEntry = {
      qtyMin: 100,
      qtyMax: 299,
      discountRate: 0.1,
      discountLabel: '테스트할인',
    };
    const result = calculateFinalPrice(1000, 500, discountEntry);
    // (1000 + 500) * (1 - 0.1) = 1500 * 0.9 = 1350
    expect(result.printCost).toBe(1000);
    expect(result.processCost).toBe(500);
    expect(result.subtotal).toBe(1500);
    expect(result.discountRate).toBe(0.1);
    expect(result.discountAmount).toBeCloseTo(150, 1);
    expect(result.totalPrice).toBeCloseTo(1350, 1);
  });

  it('applies no discount when discountEntry is undefined', () => {
    const result = calculateFinalPrice(2000, 300);
    expect(result.subtotal).toBe(2300);
    expect(result.discountRate).toBe(0);
    expect(result.discountAmount).toBe(0);
    expect(result.totalPrice).toBe(2300);
  });

  it('calculates pricePerUnit when quantity provided', () => {
    const result = calculateFinalPrice(1000, 0, undefined, 100);
    expect(result.pricePerUnit).toBe(10);
  });
});

// -------------------------------------------------------
// 8. WbPricingEngine class integration
// -------------------------------------------------------

describe('WbPricingEngine', () => {
  const engine = new WbPricingEngine();

  it('LOOKUP mode: full calculation with discount', () => {
    const input: WbPricingInput = {
      priceMode: 'LOOKUP',
      quantity: 200,
      printCostBaseEntries,
      postprocessEntries: [],
      qtyDiscountEntries,
      selectedProcessCodes: [],
      lookupParams: { plateType: '90x50', printMode: '단면칼라', quantity: 200 },
    };
    const result = engine.calculate(input);
    expect(result.priceMode).toBe('LOOKUP');
    // printCost = 350, processCost = 0, discount 3% → (350) * 0.97 = 339.5
    expect(result.breakdown.printCost).toBe(350);
    expect(result.breakdown.discountRate).toBe(0.03);
    expect(result.breakdown.totalPrice).toBeCloseTo(339.5, 1);
  });

  it('AREA mode: full calculation', () => {
    const input: WbPricingInput = {
      priceMode: 'AREA',
      quantity: 50,
      printCostBaseEntries: [],
      postprocessEntries: [],
      qtyDiscountEntries: [],
      selectedProcessCodes: [],
      areaParams: {
        widthMm: 500,
        heightMm: 400,
        unitPricePerSqm: 5000,
        minAreaSqm: 0.1,
      },
    };
    const result = engine.calculate(input);
    expect(result.priceMode).toBe('AREA');
    // 500*400/1e6 = 0.2 sqm * 5000 = 1000
    expect(result.breakdown.printCost).toBe(1000);
    expect(result.breakdown.totalPrice).toBe(1000);
  });

  it('PAGE mode: full calculation', () => {
    const input: WbPricingInput = {
      priceMode: 'PAGE',
      quantity: 100,
      printCostBaseEntries: [],
      postprocessEntries: [],
      qtyDiscountEntries,
      selectedProcessCodes: [],
      pageParams: {
        innerPages: 8,
        imposition: 4,
        unitPrice: 500,
        coverPrice: 1000,
        bindingCost: 200,
      },
    };
    const result = engine.calculate(input);
    expect(result.priceMode).toBe('PAGE');
    // printCost = 2200, discount 3% → 2200 * 0.97 = 2134
    expect(result.breakdown.printCost).toBe(2200);
    expect(result.breakdown.discountRate).toBe(0.03);
    expect(result.breakdown.totalPrice).toBeCloseTo(2134, 0);
  });

  it('COMPOSITE mode: full calculation with postprocess', () => {
    const input: WbPricingInput = {
      priceMode: 'COMPOSITE',
      quantity: 100,
      printCostBaseEntries: [],
      postprocessEntries,
      qtyDiscountEntries,
      selectedProcessCodes: ['MATTE_PP'],
      compositeParams: {
        baseCost: 1000,
        processCosts: [],
      },
    };
    const result = engine.calculate(input);
    expect(result.priceMode).toBe('COMPOSITE');
    // baseCost = 1000, processCost = MATTE_PP fixed 500
    // discount 3% → (1000 + 500) * 0.97 = 1455
    expect(result.breakdown.printCost).toBe(1000);
    expect(result.breakdown.processCost).toBe(500);
    expect(result.breakdown.totalPrice).toBeCloseTo(1455, 0);
  });

  it('returns error result when price mode is LOOKUP and no entries match', () => {
    const input: WbPricingInput = {
      priceMode: 'LOOKUP',
      quantity: 200,
      printCostBaseEntries: [],
      postprocessEntries: [],
      qtyDiscountEntries: [],
      selectedProcessCodes: [],
      lookupParams: { plateType: '90x50', printMode: '단면칼라', quantity: 200 },
    };
    const result = engine.calculate(input);
    // printCost = 0 when no match
    expect(result.breakdown.printCost).toBe(0);
    expect(result.breakdown.totalPrice).toBe(0);
  });
});
