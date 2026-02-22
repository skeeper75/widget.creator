import { describe, it, expect, vi } from 'vitest';
import { assembleQuote, buildLineItems, formatSizeDisplay, buildOptionSummary } from '../../src/quote/calculator.js';
import type { QuoteInput } from '../../src/quote/types.js';
import type { PricingResult, PriceBreakdown, SizeSelection, SelectedOption } from '../../src/pricing/types.js';

function createBreakdown(overrides?: Partial<PriceBreakdown>): PriceBreakdown {
  return {
    printCost: 19500,
    paperCost: 3300,
    specialColorCost: 0,
    coatingCost: 0,
    postProcessCost: 0,
    bindingCost: 0,
    foilCost: 0,
    packagingCost: 0,
    cuttingCost: 0,
    discountAmount: 0,
    ...overrides,
  };
}

function createPricingResult(overrides?: Partial<PricingResult>): PricingResult {
  const breakdown = overrides?.breakdown ?? createBreakdown();
  const totalPrice = overrides?.totalPrice ?? 22800;
  return {
    totalPrice,
    totalPriceWithVat: Math.floor(totalPrice * 1.1),
    unitPrice: Math.floor(totalPrice / 100),
    breakdown,
    model: 'formula',
    calculatedAt: Date.now(),
    ...overrides,
  };
}

function createQuoteInput(overrides?: Partial<QuoteInput>): QuoteInput {
  return {
    productId: 1,
    productName: 'Digital Postcard',
    pricingResult: createPricingResult(),
    selectedOptions: [
      { optionKey: 'paper', choiceCode: 'art_250' },
      { optionKey: 'print', choiceCode: 'double_color' },
    ],
    quantity: 100,
    sizeSelection: {
      sizeId: 1,
      cutWidth: 100,
      cutHeight: 150,
      impositionCount: 8,
      isCustom: false,
    },
    ...overrides,
  };
}

describe('buildLineItems', () => {
  it('should create line items for non-zero breakdown entries', () => {
    const breakdown = createBreakdown({ printCost: 19500, paperCost: 3300 });
    const items = buildLineItems(breakdown);

    expect(items).toHaveLength(2);
    expect(items[0].category).toBe('print');
    expect(items[0].amount).toBe(19500);
    expect(items[1].category).toBe('paper');
    expect(items[1].amount).toBe(3300);
  });

  it('should skip zero-amount entries', () => {
    const breakdown = createBreakdown();
    const items = buildLineItems(breakdown);

    // Only printCost=19500 and paperCost=3300 are non-zero
    expect(items).toHaveLength(2);
    const categories = items.map(i => i.category);
    expect(categories).not.toContain('special_color');
    expect(categories).not.toContain('coating');
  });

  it('should include all non-zero costs', () => {
    const breakdown = createBreakdown({
      printCost: 10000,
      paperCost: 5000,
      specialColorCost: 3000,
      coatingCost: 2000,
      postProcessCost: 1000,
      bindingCost: 500,
      foilCost: 300,
      packagingCost: 200,
      cuttingCost: 100,
      discountAmount: 50,
    });
    const items = buildLineItems(breakdown);

    expect(items).toHaveLength(10);
  });

  it('should return empty array when all costs are zero', () => {
    const breakdown = createBreakdown({
      printCost: 0,
      paperCost: 0,
    });
    const items = buildLineItems(breakdown);

    expect(items).toHaveLength(0);
  });

  it('should set label and description from breakdown key', () => {
    const breakdown = createBreakdown({ printCost: 1000, paperCost: 0 });
    const items = buildLineItems(breakdown);

    expect(items[0].label).toBe('Print Cost');
    expect(items[0].description).toBe('Print Cost');
  });

  it('should set quantity to 1 and unitPrice equal to amount', () => {
    const breakdown = createBreakdown({ printCost: 5000, paperCost: 0 });
    const items = buildLineItems(breakdown);

    expect(items[0].quantity).toBe(1);
    expect(items[0].unitPrice).toBe(5000);
    expect(items[0].amount).toBe(5000);
  });
});

describe('formatSizeDisplay', () => {
  it('should format standard size', () => {
    const size: SizeSelection = {
      sizeId: 1,
      cutWidth: 100,
      cutHeight: 150,
      impositionCount: 8,
      isCustom: false,
    };
    expect(formatSizeDisplay(size)).toBe('100 x 150 mm');
  });

  it('should format custom size using customWidth/customHeight', () => {
    const size: SizeSelection = {
      sizeId: 99,
      cutWidth: 0,
      cutHeight: 0,
      impositionCount: null,
      isCustom: true,
      customWidth: 210,
      customHeight: 297,
    };
    expect(formatSizeDisplay(size)).toBe('210 x 297 mm');
  });
});

describe('buildOptionSummary', () => {
  it('should join choice codes with comma', () => {
    const options: SelectedOption[] = [
      { optionKey: 'paper', choiceCode: 'art_250' },
      { optionKey: 'print', choiceCode: 'double_color' },
    ];
    expect(buildOptionSummary(options)).toBe('art_250, double_color');
  });

  it('should return empty string for no options', () => {
    expect(buildOptionSummary([])).toBe('');
  });

  it('should handle single option', () => {
    const options: SelectedOption[] = [
      { optionKey: 'paper', choiceCode: 'art_250' },
    ];
    expect(buildOptionSummary(options)).toBe('art_250');
  });
});

describe('assembleQuote', () => {
  it('should assemble a complete quote with all fields', async () => {
    const input = createQuoteInput();
    const quote = await assembleQuote(input);

    expect(quote.productId).toBe(1);
    expect(quote.productName).toBe('Digital Postcard');
    expect(quote.quantity).toBe(100);
    expect(quote.subtotal).toBe(22800);
    expect(quote.vatAmount).toBe(Math.floor(22800 * 0.1));
    expect(quote.totalPrice).toBe(22800 + Math.floor(22800 * 0.1));
    expect(quote.unitPrice).toBe(Math.floor(22800 / 100));
    expect(quote.sizeDisplay).toBe('100 x 150 mm');
    expect(quote.optionSummary).toBe('art_250, double_color');
  });

  it('should generate a valid quoteId (UUID format)', async () => {
    const quote = await assembleQuote(createQuoteInput());
    // UUID v4 format
    expect(quote.quoteId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it('should set expiresAt to 30 minutes after createdAt', async () => {
    const quote = await assembleQuote(createQuoteInput());
    expect(quote.expiresAt - quote.createdAt).toBe(30 * 60 * 1000);
  });

  it('should compute a snapshotHash string', async () => {
    const quote = await assembleQuote(createQuoteInput());
    // SHA-256 hex is 64 chars
    expect(quote.snapshotHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should build line items from pricing breakdown', async () => {
    const quote = await assembleQuote(createQuoteInput());
    expect(quote.lineItems.length).toBeGreaterThan(0);
    expect(quote.lineItems.every(li => li.amount > 0)).toBe(true);
  });

  it('should calculate VAT as floor(subtotal * 0.1)', async () => {
    // Use a price that would cause fractional VAT
    const input = createQuoteInput({
      pricingResult: createPricingResult({ totalPrice: 22801 }),
    });
    const quote = await assembleQuote(input);

    expect(quote.vatAmount).toBe(Math.floor(22801 * 0.1));
    expect(quote.totalPrice).toBe(22801 + Math.floor(22801 * 0.1));
  });

  it('should floor unitPrice', async () => {
    // 22800 / 7 = 3257.14... -> floor = 3257
    const input = createQuoteInput({
      quantity: 7,
      pricingResult: createPricingResult({ totalPrice: 22800 }),
    });
    const quote = await assembleQuote(input);

    expect(quote.unitPrice).toBe(Math.floor(22800 / 7));
  });

  it('should produce deterministic snapshotHash for same input', async () => {
    const input = createQuoteInput();
    const quote1 = await assembleQuote(input);
    const quote2 = await assembleQuote(input);

    expect(quote1.snapshotHash).toBe(quote2.snapshotHash);
  });

  it('should produce different snapshotHash for different quantities', async () => {
    const input1 = createQuoteInput({ quantity: 100 });
    const input2 = createQuoteInput({ quantity: 200 });

    const quote1 = await assembleQuote(input1);
    const quote2 = await assembleQuote(input2);

    expect(quote1.snapshotHash).not.toBe(quote2.snapshotHash);
  });
});
