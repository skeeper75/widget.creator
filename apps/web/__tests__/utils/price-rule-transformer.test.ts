/**
 * Tests for price-rule-transformer.ts
 * SPEC-WB-007 FR-WB007-03, FR-WB007-04
 *
 * Covers:
 * - extractQtyDiscountTiers: qty_discount output → validated tier array
 * - extractQtyDiscountTiers: non-qty_discount (mixed_rules) → empty array
 * - transformPriceRuleToHistory: produces correct PriceNlHistoryInsertData shape
 * - Edge cases: empty tiers, null qtyMax (open-ended tier), out-of-range discountRate
 */
import { describe, it, expect } from 'vitest';
import {
  extractQtyDiscountTiers,
  transformPriceRuleToHistory,
  QtyDiscountTierSchema,
  type QtyDiscountTier,
  type PriceNlHistoryInsertData,
} from '../../app/api/trpc/utils/price-rule-transformer';
import type { GlmPriceRuleOutput } from '../../app/api/_lib/services/glm.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeQtyDiscountOutput(
  tiers: Array<{
    qtyMin: number;
    qtyMax: number | null;
    discountRate: number;
    discountLabel: string;
  }>,
  confidence = 0.97,
): GlmPriceRuleOutput {
  return {
    outputType: 'qty_discount',
    qtyDiscountTiers: tiers,
    confidence,
    explanationKo: '수량할인 규칙입니다',
  };
}

function makeMixedRulesOutput(): GlmPriceRuleOutput {
  return {
    outputType: 'mixed_rules',
    constraints: [],
    priceRules: null,
    totalActions: 0,
    confidence: 0.80,
    explanationKo: '혼합 규칙',
  };
}

// ---------------------------------------------------------------------------
// QtyDiscountTierSchema validation
// ---------------------------------------------------------------------------

describe('QtyDiscountTierSchema', () => {
  it('parses valid tier with qtyMax as number', () => {
    const tier = { qtyMin: 1, qtyMax: 99, discountRate: 0.05, discountLabel: '소량할인' };
    expect(() => QtyDiscountTierSchema.parse(tier)).not.toThrow();
  });

  it('parses valid tier with qtyMax as null (open-ended)', () => {
    const tier = { qtyMin: 1000, qtyMax: null, discountRate: 0.15, discountLabel: '대량특가' };
    const parsed = QtyDiscountTierSchema.parse(tier);
    expect(parsed.qtyMax).toBeNull();
  });

  it('parses tier with discountRate = 0 (no discount)', () => {
    const tier = { qtyMin: 1, qtyMax: 99, discountRate: 0, discountLabel: '기본가' };
    const parsed = QtyDiscountTierSchema.parse(tier);
    expect(parsed.discountRate).toBe(0);
  });

  it('parses tier with discountRate = 1 (maximum discount)', () => {
    const tier = { qtyMin: 1000, qtyMax: null, discountRate: 1, discountLabel: '무료' };
    const parsed = QtyDiscountTierSchema.parse(tier);
    expect(parsed.discountRate).toBe(1);
  });

  it('rejects discountRate > 1', () => {
    const tier = { qtyMin: 1, qtyMax: 99, discountRate: 1.5, discountLabel: '잘못된 할인' };
    expect(() => QtyDiscountTierSchema.parse(tier)).toThrow();
  });

  it('rejects negative discountRate', () => {
    const tier = { qtyMin: 1, qtyMax: 99, discountRate: -0.1, discountLabel: '잘못된 할인' };
    expect(() => QtyDiscountTierSchema.parse(tier)).toThrow();
  });

  it('rejects negative qtyMin', () => {
    const tier = { qtyMin: -1, qtyMax: 99, discountRate: 0.05, discountLabel: '소량할인' };
    expect(() => QtyDiscountTierSchema.parse(tier)).toThrow();
  });

  it('accepts qtyMin = 0', () => {
    const tier = { qtyMin: 0, qtyMax: 99, discountRate: 0.05, discountLabel: '소량' };
    expect(() => QtyDiscountTierSchema.parse(tier)).not.toThrow();
  });

  it('rejects non-integer qtyMin', () => {
    const tier = { qtyMin: 1.5, qtyMax: 99, discountRate: 0.05, discountLabel: '소량' };
    expect(() => QtyDiscountTierSchema.parse(tier)).toThrow();
  });

  it('rejects qtyMax = 0 (must be positive or null)', () => {
    const tier = { qtyMin: 0, qtyMax: 0, discountRate: 0.05, discountLabel: '소량' };
    expect(() => QtyDiscountTierSchema.parse(tier)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// extractQtyDiscountTiers
// ---------------------------------------------------------------------------

describe('extractQtyDiscountTiers', () => {
  it('returns all tiers for qty_discount output', () => {
    const glm = makeQtyDiscountOutput([
      { qtyMin: 1, qtyMax: 99, discountRate: 0, discountLabel: '기본가' },
      { qtyMin: 100, qtyMax: 499, discountRate: 0.05, discountLabel: '소량할인' },
      { qtyMin: 500, qtyMax: 999, discountRate: 0.10, discountLabel: '중량할인' },
      { qtyMin: 1000, qtyMax: null, discountRate: 0.15, discountLabel: '대량특가' },
    ]);
    const tiers = extractQtyDiscountTiers(glm);
    expect(tiers).toHaveLength(4);
  });

  it('returns validated QtyDiscountTier objects', () => {
    const glm = makeQtyDiscountOutput([
      { qtyMin: 1, qtyMax: 99, discountRate: 0, discountLabel: '기본가' },
    ]);
    const tiers: QtyDiscountTier[] = extractQtyDiscountTiers(glm);
    expect(tiers[0].qtyMin).toBe(1);
    expect(tiers[0].qtyMax).toBe(99);
    expect(tiers[0].discountRate).toBe(0);
    expect(tiers[0].discountLabel).toBe('기본가');
  });

  it('handles single-tier output (no discount baseline)', () => {
    const glm = makeQtyDiscountOutput([
      { qtyMin: 1, qtyMax: null, discountRate: 0, discountLabel: '기본가' },
    ]);
    const tiers = extractQtyDiscountTiers(glm);
    expect(tiers).toHaveLength(1);
    expect(tiers[0].qtyMax).toBeNull();
  });

  it('correctly identifies open-ended tier with null qtyMax', () => {
    const glm = makeQtyDiscountOutput([
      { qtyMin: 1, qtyMax: 99, discountRate: 0, discountLabel: '기본가' },
      { qtyMin: 100, qtyMax: null, discountRate: 0.10, discountLabel: '할인' },
    ]);
    const tiers = extractQtyDiscountTiers(glm);
    expect(tiers[1].qtyMax).toBeNull();
    expect(tiers[1].discountRate).toBe(0.10);
  });

  it('returns empty array for empty tiers list', () => {
    const glm = makeQtyDiscountOutput([]);
    const tiers = extractQtyDiscountTiers(glm);
    expect(tiers).toHaveLength(0);
    expect(Array.isArray(tiers)).toBe(true);
  });

  it('returns empty array for mixed_rules output', () => {
    const glm = makeMixedRulesOutput();
    const tiers = extractQtyDiscountTiers(glm);
    expect(tiers).toHaveLength(0);
  });

  it('preserves tier ordering from GLM output', () => {
    const glm = makeQtyDiscountOutput([
      { qtyMin: 1, qtyMax: 99, discountRate: 0, discountLabel: '기본가' },
      { qtyMin: 100, qtyMax: 499, discountRate: 0.05, discountLabel: '소량할인' },
      { qtyMin: 500, qtyMax: null, discountRate: 0.15, discountLabel: '대량특가' },
    ]);
    const tiers = extractQtyDiscountTiers(glm);
    expect(tiers[0].qtyMin).toBe(1);
    expect(tiers[1].qtyMin).toBe(100);
    expect(tiers[2].qtyMin).toBe(500);
  });

  it('correctly parses discount rates as decimals', () => {
    const glm = makeQtyDiscountOutput([
      { qtyMin: 1, qtyMax: 99, discountRate: 0, discountLabel: '기본가' },
      { qtyMin: 100, qtyMax: 499, discountRate: 0.05, discountLabel: '5% 할인' },
      { qtyMin: 500, qtyMax: null, discountRate: 0.15, discountLabel: '15% 할인' },
    ]);
    const tiers = extractQtyDiscountTiers(glm);
    expect(tiers[1].discountRate).toBe(0.05);
    expect(tiers[2].discountRate).toBe(0.15);
  });

  it('handles five-tier progressive discount structure', () => {
    const glm = makeQtyDiscountOutput([
      { qtyMin: 1, qtyMax: 99, discountRate: 0, discountLabel: '기본가' },
      { qtyMin: 100, qtyMax: 299, discountRate: 0.03, discountLabel: '3% 할인' },
      { qtyMin: 300, qtyMax: 499, discountRate: 0.05, discountLabel: '5% 할인' },
      { qtyMin: 500, qtyMax: 999, discountRate: 0.10, discountLabel: '10% 할인' },
      { qtyMin: 1000, qtyMax: null, discountRate: 0.15, discountLabel: '15% 할인' },
    ]);
    const tiers = extractQtyDiscountTiers(glm);
    expect(tiers).toHaveLength(5);
    expect(tiers[4].qtyMax).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// transformPriceRuleToHistory
// ---------------------------------------------------------------------------

describe('transformPriceRuleToHistory', () => {
  it('returns PriceNlHistoryInsertData with correct shape', () => {
    const glm = makeQtyDiscountOutput([
      { qtyMin: 1, qtyMax: 99, discountRate: 0, discountLabel: '기본가' },
    ]);
    const result: PriceNlHistoryInsertData = transformPriceRuleToHistory(
      glm,
      1,
      '100장 5% 할인',
      'glm-5.0',
      'admin@test.com',
    );

    expect(result).toHaveProperty('productId');
    expect(result).toHaveProperty('priceConfigId');
    expect(result).toHaveProperty('ruleType');
    expect(result).toHaveProperty('nlInputText');
    expect(result).toHaveProperty('nlInterpretation');
    expect(result).toHaveProperty('aiModelVersion');
    expect(result).toHaveProperty('interpretationScore');
    expect(result).toHaveProperty('isApproved');
    expect(result).toHaveProperty('createdBy');
  });

  it('maps productId and createdBy correctly', () => {
    const glm = makeQtyDiscountOutput([]);
    const result = transformPriceRuleToHistory(glm, 42, '테스트', 'glm-5.0', 'manager@huni.co.kr');
    expect(result.productId).toBe(42);
    expect(result.createdBy).toBe('manager@huni.co.kr');
  });

  it('sets ruleType to "qty_discount" for qty_discount output', () => {
    const glm = makeQtyDiscountOutput([]);
    const result = transformPriceRuleToHistory(glm, 1, '할인없음', 'glm-5.0', 'admin');
    expect(result.ruleType).toBe('qty_discount');
  });

  it('sets ruleType to "formula_hint" for mixed_rules output', () => {
    const glm = makeMixedRulesOutput();
    const result = transformPriceRuleToHistory(glm, 1, '복합 규칙', 'glm-5.0', 'admin');
    expect(result.ruleType).toBe('formula_hint');
  });

  it('stores the full GLM output as nlInterpretation', () => {
    const glm = makeQtyDiscountOutput([
      { qtyMin: 1, qtyMax: null, discountRate: 0.10, discountLabel: '10% 할인' },
    ]);
    const result = transformPriceRuleToHistory(glm, 1, '100장 10% 할인', 'glm-5.0', 'admin');
    expect(result.nlInterpretation).toEqual(glm);
  });

  it('stores the original NL input text', () => {
    const glm = makeQtyDiscountOutput([]);
    const nlText = '100장부터 5%, 500장부터 10%, 1000장 이상 15%';
    const result = transformPriceRuleToHistory(glm, 1, nlText, 'glm-5.0', 'admin');
    expect(result.nlInputText).toBe(nlText);
  });

  it('converts confidence to interpretationScore string', () => {
    const glm = makeQtyDiscountOutput([], 0.97);
    const result = transformPriceRuleToHistory(glm, 1, '테스트', 'glm-5.0', 'admin');
    expect(result.interpretationScore).toBe('0.97');
    expect(typeof result.interpretationScore).toBe('string');
  });

  it('stores aiModelVersion correctly', () => {
    const glm = makeQtyDiscountOutput([]);
    const result = transformPriceRuleToHistory(glm, 1, '테스트', 'glm-z-plus-0701', 'admin');
    expect(result.aiModelVersion).toBe('glm-z-plus-0701');
  });

  it('sets isApproved to false (pending approval)', () => {
    const glm = makeQtyDiscountOutput([]);
    const result = transformPriceRuleToHistory(glm, 1, '테스트', 'glm-5.0', 'admin');
    expect(result.isApproved).toBe(false);
  });

  it('sets priceConfigId to null (unlinked until approved)', () => {
    const glm = makeQtyDiscountOutput([]);
    const result = transformPriceRuleToHistory(glm, 1, '테스트', 'glm-5.0', 'admin');
    expect(result.priceConfigId).toBeNull();
  });
});
