import { describe, it, expect } from 'vitest';
import { resolveLossConfig } from '../../src/pricing/loss.js';
import { MOCK_LOSS_CONFIGS } from '../fixtures/products.js';
import type { LossQuantityConfig } from '../../src/pricing/types.js';

describe('resolveLossConfig', () => {
  it('should return product-specific config when available (highest priority)', () => {
    const result = resolveLossConfig(10, 1, MOCK_LOSS_CONFIGS);
    expect(result).toEqual({ lossRate: 0.05, minLossQty: 20 });
  });

  it('should return category config when no product config exists', () => {
    const result = resolveLossConfig(99, 1, MOCK_LOSS_CONFIGS);
    expect(result).toEqual({ lossRate: 0.04, minLossQty: 15 });
  });

  it('should return global config when no product or category config exists', () => {
    const result = resolveLossConfig(99, 99, MOCK_LOSS_CONFIGS);
    expect(result).toEqual({ lossRate: 0.03, minLossQty: 10 });
  });

  it('should return fallback defaults when no configs exist', () => {
    const result = resolveLossConfig(99, 99, []);
    expect(result).toEqual({ lossRate: 0.03, minLossQty: 10 });
  });

  it('should prioritize product over category even when both exist', () => {
    // Product 10, category 1 -- both have configs
    const result = resolveLossConfig(10, 1, MOCK_LOSS_CONFIGS);
    expect(result.lossRate).toBe(0.05); // product config, not category's 0.04
  });

  it('should prioritize category over global', () => {
    // Product 99 (no product config), category 1 (has category config)
    const result = resolveLossConfig(99, 1, MOCK_LOSS_CONFIGS);
    expect(result.lossRate).toBe(0.04); // category config, not global's 0.03
  });

  it('should handle configs with only global scope', () => {
    const globalOnly: LossQuantityConfig[] = [
      { scopeType: 'global', scopeId: null, lossRate: 0.02, minLossQty: 5 },
    ];
    const result = resolveLossConfig(1, 1, globalOnly);
    expect(result).toEqual({ lossRate: 0.02, minLossQty: 5 });
  });

  it('should handle configs with only product scope', () => {
    const productOnly: LossQuantityConfig[] = [
      { scopeType: 'product', scopeId: 42, lossRate: 0.10, minLossQty: 50 },
    ];
    // Match product
    expect(resolveLossConfig(42, 1, productOnly)).toEqual({ lossRate: 0.10, minLossQty: 50 });
    // No match -> fallback
    expect(resolveLossConfig(99, 1, productOnly)).toEqual({ lossRate: 0.03, minLossQty: 10 });
  });

  it('should not mutate input configs array', () => {
    const configs = [...MOCK_LOSS_CONFIGS];
    const originalLength = configs.length;
    resolveLossConfig(10, 1, configs);
    expect(configs.length).toBe(originalLength);
  });
});
