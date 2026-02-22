import { describe, it, expect } from 'vitest';
import { computeSnapshotHash } from '../../src/quote/snapshot.js';
import type { QuoteInput } from '../../src/quote/types.js';
import type { PricingResult, PriceBreakdown } from '../../src/pricing/types.js';

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

function createQuoteInput(overrides?: Partial<QuoteInput>): QuoteInput {
  return {
    productId: 1,
    productName: 'Test Product',
    pricingResult: {
      totalPrice: 22800,
      totalPriceWithVat: 25080,
      unitPrice: 228,
      breakdown: createBreakdown(),
      model: 'formula',
      calculatedAt: 1000000,
    },
    selectedOptions: [
      { optionKey: 'paper', choiceCode: 'art_250' },
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

describe('computeSnapshotHash', () => {
  it('should return a 64-character hex string (SHA-256)', async () => {
    const hash = await computeSnapshotHash(createQuoteInput());
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('should be deterministic for same input', async () => {
    const input = createQuoteInput();
    const hash1 = await computeSnapshotHash(input);
    const hash2 = await computeSnapshotHash(input);
    expect(hash1).toBe(hash2);
  });

  it('should change when productId changes', async () => {
    const hash1 = await computeSnapshotHash(createQuoteInput({ productId: 1 }));
    const hash2 = await computeSnapshotHash(createQuoteInput({ productId: 2 }));
    expect(hash1).not.toBe(hash2);
  });

  it('should change when quantity changes', async () => {
    const hash1 = await computeSnapshotHash(createQuoteInput({ quantity: 100 }));
    const hash2 = await computeSnapshotHash(createQuoteInput({ quantity: 200 }));
    expect(hash1).not.toBe(hash2);
  });

  it('should change when sizeSelection changes', async () => {
    const hash1 = await computeSnapshotHash(createQuoteInput({
      sizeSelection: { sizeId: 1, cutWidth: 100, cutHeight: 150, impositionCount: 8, isCustom: false },
    }));
    const hash2 = await computeSnapshotHash(createQuoteInput({
      sizeSelection: { sizeId: 2, cutWidth: 92, cutHeight: 57, impositionCount: 16, isCustom: false },
    }));
    expect(hash1).not.toBe(hash2);
  });

  it('should change when selectedOptions change', async () => {
    const hash1 = await computeSnapshotHash(createQuoteInput({
      selectedOptions: [{ optionKey: 'paper', choiceCode: 'art_250' }],
    }));
    const hash2 = await computeSnapshotHash(createQuoteInput({
      selectedOptions: [{ optionKey: 'paper', choiceCode: 'snow_120' }],
    }));
    expect(hash1).not.toBe(hash2);
  });

  it('should change when totalPrice changes', async () => {
    const hash1 = await computeSnapshotHash(createQuoteInput({
      pricingResult: {
        totalPrice: 22800,
        totalPriceWithVat: 25080,
        unitPrice: 228,
        breakdown: createBreakdown(),
        model: 'formula',
        calculatedAt: 1000000,
      },
    }));
    const hash2 = await computeSnapshotHash(createQuoteInput({
      pricingResult: {
        totalPrice: 30000,
        totalPriceWithVat: 33000,
        unitPrice: 300,
        breakdown: createBreakdown(),
        model: 'formula',
        calculatedAt: 1000000,
      },
    }));
    expect(hash1).not.toBe(hash2);
  });

  it('should NOT change when productName changes (not in hash input)', async () => {
    const hash1 = await computeSnapshotHash(createQuoteInput({ productName: 'Name A' }));
    const hash2 = await computeSnapshotHash(createQuoteInput({ productName: 'Name B' }));
    expect(hash1).toBe(hash2);
  });

  it('should NOT change when calculatedAt changes (not in hash input)', async () => {
    const input1 = createQuoteInput();
    input1.pricingResult.calculatedAt = 1000;
    const input2 = createQuoteInput();
    input2.pricingResult.calculatedAt = 2000;

    const hash1 = await computeSnapshotHash(input1);
    const hash2 = await computeSnapshotHash(input2);
    expect(hash1).toBe(hash2);
  });

  it('should only include optionKey and choiceCode from selectedOptions', async () => {
    // Extra fields on selectedOptions should be stripped
    const input1 = createQuoteInput({
      selectedOptions: [{ optionKey: 'paper', choiceCode: 'art_250' }],
    });
    const input2 = createQuoteInput({
      selectedOptions: [{ optionKey: 'paper', choiceCode: 'art_250', choiceId: 999 }],
    });

    const hash1 = await computeSnapshotHash(input1);
    const hash2 = await computeSnapshotHash(input2);
    expect(hash1).toBe(hash2);
  });
});
