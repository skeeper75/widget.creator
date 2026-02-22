import { describe, it, expect, vi, afterEach } from 'vitest';
import { isQuoteValid } from '../../src/quote/expiry.js';
import type { QuoteResult } from '../../src/quote/types.js';

function createQuoteResult(overrides?: Partial<QuoteResult>): QuoteResult {
  const now = Date.now();
  return {
    quoteId: 'test-uuid',
    productId: 1,
    productName: 'Test',
    lineItems: [],
    subtotal: 22800,
    vatAmount: 2280,
    totalPrice: 25080,
    unitPrice: 228,
    quantity: 100,
    sizeDisplay: '100 x 150 mm',
    optionSummary: 'art_250',
    createdAt: now,
    expiresAt: now + 30 * 60 * 1000,
    snapshotHash: 'abc123',
    ...overrides,
  };
}

describe('isQuoteValid', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return true for a fresh quote', () => {
    const quote = createQuoteResult();
    expect(isQuoteValid(quote)).toBe(true);
  });

  it('should return false for an expired quote', () => {
    vi.useFakeTimers();
    const now = Date.now();
    const quote = createQuoteResult({
      createdAt: now - 31 * 60 * 1000,
      expiresAt: now - 1 * 60 * 1000,
    });
    expect(isQuoteValid(quote)).toBe(false);
    vi.useRealTimers();
  });

  it('should return false when current time equals expiresAt', () => {
    vi.useFakeTimers();
    const now = Date.now();
    const quote = createQuoteResult({
      createdAt: now - 30 * 60 * 1000,
      expiresAt: now,
    });
    // Date.now() === expiresAt -> !(now < expiresAt) -> false
    expect(isQuoteValid(quote)).toBe(false);
    vi.useRealTimers();
  });

  it('should return true 1ms before expiry', () => {
    vi.useFakeTimers();
    const now = Date.now();
    const quote = createQuoteResult({
      createdAt: now - 30 * 60 * 1000 + 1,
      expiresAt: now + 1,
    });
    expect(isQuoteValid(quote)).toBe(true);
    vi.useRealTimers();
  });
});
