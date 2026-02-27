/**
 * Unit tests for Option Combination Generator
 *
 * Tests cover combination generation, representative selection,
 * price lookup, and full option matrix building.
 *
 * SPEC: SPEC-SHOPBY-002 M1 - Product-Option Mapper
 */
import { describe, it, expect } from 'vitest';
import {
  createPriceLookup,
  generateCombinations,
  selectRepresentativeCombos,
  buildOptionMatrix,
  DEFAULT_MAX_COMBINATIONS,
} from '../option-generator.js';
import type { PriceLookupFn } from '../option-generator.js';
import type { SizeOptionData, PaperOptionData, QuantityTierData } from '../mapper.js';

// =============================================================================
// Test Fixtures
// =============================================================================

const BUSINESS_CARD_SIZES: SizeOptionData[] = [
  { code: 'S1', displayName: '90x50mm' },
  { code: 'S2', displayName: '86x50mm' },
  { code: 'S3', displayName: '90x55mm' },
];

const BUSINESS_CARD_PAPERS: PaperOptionData[] = [
  { code: 'P1', name: '스노우화이트', weight: 250 },
  { code: 'P2', name: '아르떼', weight: 300 },
  { code: 'P3', name: '랑데부', weight: 300 },
  { code: 'P4', name: '마쉬멜로우', weight: 300 },
  { code: 'P5', name: '에코그린', weight: 250 },
];

const BUSINESS_CARD_QUANTITIES: QuantityTierData[] = [
  { quantity: 100, label: '100매', addPrice: 0 },
  { quantity: 200, label: '200매', addPrice: 0 },
  { quantity: 500, label: '500매', addPrice: 0 },
  { quantity: 1000, label: '1000매', addPrice: 0 },
];

const STICKER_SIZES: SizeOptionData[] = [
  { code: 'S1', displayName: '50x50mm' },
  { code: 'S2', displayName: '100x100mm' },
];

const STICKER_PAPERS: PaperOptionData[] = [
  { code: 'P1', name: '아트지' },
  { code: 'P2', name: '유포지' },
];

const STICKER_QUANTITIES: QuantityTierData[] = [
  { quantity: 100, label: '100매', addPrice: 0 },
  { quantity: 500, label: '500매', addPrice: 0 },
];

function createTestPriceLookup(basePrice: number, increment: number): PriceLookupFn {
  let counter = 0;
  const cache = new Map<string, number>();
  return (sizeCode: string, paperCode: string, quantity: number): number => {
    const key = `${sizeCode}|${paperCode}|${quantity}`;
    if (!cache.has(key)) {
      cache.set(key, basePrice + increment * counter);
      counter++;
    }
    return cache.get(key)!;
  };
}

// =============================================================================
// SECTION 1: createPriceLookup
// =============================================================================

describe('createPriceLookup', () => {
  it('should create a lookup function from flat price array', () => {
    const lookup = createPriceLookup([
      { sizeCode: 'S1', paperCode: 'P1', quantity: 100, sellingPrice: 10000 },
      { sizeCode: 'S1', paperCode: 'P1', quantity: 200, sellingPrice: 15000 },
    ]);
    expect(lookup('S1', 'P1', 100)).toBe(10000);
    expect(lookup('S1', 'P1', 200)).toBe(15000);
  });

  it('should return undefined for non-existent key', () => {
    const lookup = createPriceLookup([
      { sizeCode: 'S1', paperCode: 'P1', quantity: 100, sellingPrice: 10000 },
    ]);
    expect(lookup('S2', 'P1', 100)).toBeUndefined();
  });

  it('should overwrite duplicate entries with last value', () => {
    const lookup = createPriceLookup([
      { sizeCode: 'S1', paperCode: 'P1', quantity: 100, sellingPrice: 10000 },
      { sizeCode: 'S1', paperCode: 'P1', quantity: 100, sellingPrice: 12000 },
    ]);
    expect(lookup('S1', 'P1', 100)).toBe(12000);
  });

  it('should handle empty array', () => {
    const lookup = createPriceLookup([]);
    expect(lookup('S1', 'P1', 100)).toBeUndefined();
  });
});

// =============================================================================
// SECTION 2: generateCombinations
// =============================================================================

describe('generateCombinations', () => {
  describe('basic combination generation', () => {
    it('should generate all combinations for size x paper x quantity', () => {
      const lookup = createTestPriceLookup(10000, 1000);
      const result = generateCombinations(
        STICKER_SIZES, STICKER_PAPERS, STICKER_QUANTITIES, lookup
      );
      // 2 sizes x 2 papers x 2 quantities = 8
      expect(result.entries).toHaveLength(8);
    });

    it('should generate 60 combinations for 3 sizes x 5 papers x 4 quantities', () => {
      const lookup = createTestPriceLookup(10000, 500);
      const result = generateCombinations(
        BUSINESS_CARD_SIZES, BUSINESS_CARD_PAPERS, BUSINESS_CARD_QUANTITIES, lookup
      );
      expect(result.entries).toHaveLength(60);
    });

    it('should include all three option values in each combination', () => {
      const lookup = createTestPriceLookup(10000, 1000);
      const result = generateCombinations(
        [{ code: 'S1', displayName: '90x50mm' }],
        [{ code: 'P1', name: '스노우화이트', weight: 250 }],
        [{ quantity: 100, label: '100매', addPrice: 0 }],
        lookup
      );
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].values).toHaveLength(3);
      expect(result.entries[0].codes).toHaveLength(3);
    });

    it('should include size displayName in values[0]', () => {
      const lookup = createTestPriceLookup(10000, 1000);
      const result = generateCombinations(
        [{ code: 'S1', displayName: '90x50mm' }],
        [{ code: 'P1', name: '스노우화이트', weight: 250 }],
        [{ quantity: 100, label: '100매', addPrice: 0 }],
        lookup
      );
      expect(result.entries[0].values[0]).toBe('90x50mm');
    });

    it('should include paper name with weight in values[1]', () => {
      const lookup = createTestPriceLookup(10000, 1000);
      const result = generateCombinations(
        [{ code: 'S1', displayName: '90x50mm' }],
        [{ code: 'P1', name: '스노우화이트', weight: 250 }],
        [{ quantity: 100, label: '100매', addPrice: 0 }],
        lookup
      );
      expect(result.entries[0].values[1]).toBe('스노우화이트 250g');
    });

    it('should include paper name without weight suffix when weight is absent', () => {
      const lookup = createTestPriceLookup(10000, 1000);
      const result = generateCombinations(
        [{ code: 'S1', displayName: '90x50mm' }],
        [{ code: 'P1', name: '아트지' }],
        [{ quantity: 100, label: '100매', addPrice: 0 }],
        lookup
      );
      expect(result.entries[0].values[1]).toBe('아트지');
    });

    it('should include quantity label in values[2]', () => {
      const lookup = createTestPriceLookup(10000, 1000);
      const result = generateCombinations(
        [{ code: 'S1', displayName: '90x50mm' }],
        [{ code: 'P1', name: '스노우화이트' }],
        [{ quantity: 100, label: '100매', addPrice: 0 }],
        lookup
      );
      expect(result.entries[0].values[2]).toBe('100매');
    });

    it('should use QTY_ prefix in codes for quantity', () => {
      const lookup = createTestPriceLookup(10000, 1000);
      const result = generateCombinations(
        [{ code: 'S1', displayName: '90x50mm' }],
        [{ code: 'P1', name: '스노우화이트' }],
        [{ quantity: 100, label: '100매', addPrice: 0 }],
        lookup
      );
      expect(result.entries[0].codes[2]).toBe('QTY_100');
    });
  });

  describe('addPrice calculation', () => {
    it('should set addPrice to 0 for minimum-price combination', () => {
      const lookup = createPriceLookup([
        { sizeCode: 'S1', paperCode: 'P1', quantity: 100, sellingPrice: 10000 },
        { sizeCode: 'S1', paperCode: 'P2', quantity: 100, sellingPrice: 15000 },
      ]);
      const result = generateCombinations(
        [{ code: 'S1', displayName: '90x50mm' }],
        [{ code: 'P1', name: 'A' }, { code: 'P2', name: 'B' }],
        [{ quantity: 100, label: '100매', addPrice: 0 }],
        lookup
      );
      const minEntry = result.entries.find(e => e.codes[1] === 'P1');
      expect(minEntry?.addPrice).toBe(0);
    });

    it('should calculate correct addPrice differential', () => {
      const lookup = createPriceLookup([
        { sizeCode: 'S1', paperCode: 'P1', quantity: 100, sellingPrice: 10000 },
        { sizeCode: 'S1', paperCode: 'P2', quantity: 100, sellingPrice: 15000 },
      ]);
      const result = generateCombinations(
        [{ code: 'S1', displayName: '90x50mm' }],
        [{ code: 'P1', name: 'A' }, { code: 'P2', name: 'B' }],
        [{ quantity: 100, label: '100매', addPrice: 0 }],
        lookup
      );
      const expensiveEntry = result.entries.find(e => e.codes[1] === 'P2');
      expect(expensiveEntry?.addPrice).toBe(5000);
    });

    it('should return the base price (minimum of all prices)', () => {
      const lookup = createPriceLookup([
        { sizeCode: 'S1', paperCode: 'P1', quantity: 100, sellingPrice: 10000 },
        { sizeCode: 'S1', paperCode: 'P2', quantity: 100, sellingPrice: 15000 },
      ]);
      const result = generateCombinations(
        [{ code: 'S1', displayName: '90x50mm' }],
        [{ code: 'P1', name: 'A' }, { code: 'P2', name: 'B' }],
        [{ quantity: 100, label: '100매', addPrice: 0 }],
        lookup
      );
      expect(result.basePrice).toBe(10000);
    });
  });

  describe('edge cases', () => {
    it('should handle single size', () => {
      const lookup = createTestPriceLookup(10000, 1000);
      const result = generateCombinations(
        [{ code: 'S1', displayName: '90x50mm' }],
        STICKER_PAPERS,
        STICKER_QUANTITIES,
        lookup
      );
      expect(result.entries).toHaveLength(4); // 1x2x2
    });

    it('should handle single paper', () => {
      const lookup = createTestPriceLookup(10000, 1000);
      const result = generateCombinations(
        STICKER_SIZES,
        [{ code: 'P1', name: '아트지' }],
        STICKER_QUANTITIES,
        lookup
      );
      expect(result.entries).toHaveLength(4); // 2x1x2
    });

    it('should handle single quantity', () => {
      const lookup = createTestPriceLookup(10000, 1000);
      const result = generateCombinations(
        STICKER_SIZES,
        STICKER_PAPERS,
        [{ quantity: 100, label: '100매', addPrice: 0 }],
        lookup
      );
      expect(result.entries).toHaveLength(4); // 2x2x1
    });

    it('should return empty entries for empty sizes', () => {
      const lookup = createTestPriceLookup(10000, 1000);
      const result = generateCombinations(
        [],
        STICKER_PAPERS,
        STICKER_QUANTITIES,
        lookup
      );
      expect(result.entries).toHaveLength(0);
    });

    it('should skip combinations with undefined price', () => {
      const lookup = createPriceLookup([
        { sizeCode: 'S1', paperCode: 'P1', quantity: 100, sellingPrice: 10000 },
        // S1-P2-100 intentionally missing
      ]);
      const result = generateCombinations(
        [{ code: 'S1', displayName: '90x50mm' }],
        [{ code: 'P1', name: 'A' }, { code: 'P2', name: 'B' }],
        [{ quantity: 100, label: '100매', addPrice: 0 }],
        lookup
      );
      expect(result.entries).toHaveLength(1);
    });
  });
});

// =============================================================================
// SECTION 3: selectRepresentativeCombos
// =============================================================================

describe('selectRepresentativeCombos', () => {
  describe('when within limit', () => {
    it('should return all combinations when count is within limit', () => {
      const entries = [
        { values: ['S1', 'P1', '100'], codes: ['S1', 'P1', 'QTY_100'], addPrice: 0 },
        { values: ['S1', 'P2', '100'], codes: ['S1', 'P2', 'QTY_100'], addPrice: 5000 },
      ];
      const result = selectRepresentativeCombos(entries, 500);
      expect(result).toHaveLength(2);
    });

    it('should not modify combination data', () => {
      const entries = [
        { values: ['S1', 'P1', '100'], codes: ['S1', 'P1', 'QTY_100'], addPrice: 3000 },
      ];
      const result = selectRepresentativeCombos(entries, 500);
      expect(result[0].addPrice).toBe(3000);
    });
  });

  describe('when exceeding limit', () => {
    it('should return exactly maxCount items', () => {
      const entries = Array.from({ length: 20 }, (_, i) => ({
        values: [`S${i % 3}`, `P${i % 4}`, `${(i + 1) * 100}`],
        codes: [`S${i % 3}`, `P${i % 4}`, `QTY_${(i + 1) * 100}`],
        addPrice: i * 500,
      }));
      const result = selectRepresentativeCombos(entries, 10);
      expect(result).toHaveLength(10);
    });

    it('should include at least one entry per unique size', () => {
      const entries = Array.from({ length: 20 }, (_, i) => ({
        values: [`Size${i % 5}`, `Paper${i % 4}`, 'Qty'],
        codes: [`S${i % 5}`, `P${i % 4}`, 'QTY_100'],
        addPrice: i * 1000,
      }));
      const result = selectRepresentativeCombos(entries, 8);
      const sizeCodes = new Set(result.map(r => r.codes[0]));
      // Should have entries for all 5 sizes
      expect(sizeCodes.size).toBe(5);
    });

    it('should include at least one entry per unique paper', () => {
      const entries = Array.from({ length: 20 }, (_, i) => ({
        values: [`Size${i % 5}`, `Paper${i % 4}`, 'Qty'],
        codes: [`S${i % 5}`, `P${i % 4}`, 'QTY_100'],
        addPrice: i * 1000,
      }));
      const result = selectRepresentativeCombos(entries, 10);
      const paperCodes = new Set(result.map(r => r.codes[1]));
      expect(paperCodes.size).toBe(4);
    });

    it('should prioritize cheaper combinations', () => {
      const entries = Array.from({ length: 20 }, (_, i) => ({
        values: ['S1', 'P1', `${i}`],
        codes: ['S1', 'P1', `QTY_${i}`],
        addPrice: i * 1000,
      }));
      const result = selectRepresentativeCombos(entries, 5);
      // The cheapest entries should be selected
      expect(result.every(r => r.addPrice <= 4000)).toBe(true);
    });
  });

  describe('default limit', () => {
    it('should use DEFAULT_MAX_COMBINATIONS as default limit', () => {
      expect(DEFAULT_MAX_COMBINATIONS).toBe(500);
    });

    it('should return all entries if length <= default limit', () => {
      const entries = Array.from({ length: 100 }, (_, i) => ({
        values: ['S1', 'P1', `${i}`],
        codes: ['S1', 'P1', `QTY_${i}`],
        addPrice: i * 100,
      }));
      const result = selectRepresentativeCombos(entries);
      expect(result).toHaveLength(100);
    });
  });
});

// =============================================================================
// SECTION 4: buildOptionMatrix
// =============================================================================

describe('buildOptionMatrix', () => {
  it('should build complete option matrix with combinations', () => {
    const prices = [
      { sizeCode: 'S1', paperCode: 'P1', quantity: 100, sellingPrice: 10000 },
      { sizeCode: 'S1', paperCode: 'P2', quantity: 100, sellingPrice: 15000 },
    ];
    const lookup = createPriceLookup(prices);

    const result = buildOptionMatrix({
      sizes: [{ code: 'S1', displayName: '90x50mm' }],
      papers: [{ code: 'P1', name: 'A' }, { code: 'P2', name: 'B' }],
      quantities: [{ quantity: 100, label: '100매', addPrice: 0 }],
      priceLookup: lookup,
    });

    expect(result.combinations.length).toBeGreaterThan(0);
    expect(result.combinationEntries).toHaveLength(2);
    expect(result.basePrice).toBe(10000);
  });

  it('should include REQUIRED options when printModes provided', () => {
    const prices = [
      { sizeCode: 'S1', paperCode: 'P1', quantity: 100, sellingPrice: 10000 },
    ];
    const lookup = createPriceLookup(prices);

    const result = buildOptionMatrix({
      sizes: [{ code: 'S1', displayName: '90x50mm' }],
      papers: [{ code: 'P1', name: 'A' }],
      quantities: [{ quantity: 100, label: '100매', addPrice: 0 }],
      priceLookup: lookup,
      printModes: [{ code: 'PM1', name: '양면컬러' }],
    });

    expect(result.required).toHaveLength(1);
    expect(result.required[0].kind).toBe('REQUIRED');
  });

  it('should include STANDARD options when postProcesses provided', () => {
    const prices = [
      { sizeCode: 'S1', paperCode: 'P1', quantity: 100, sellingPrice: 10000 },
    ];
    const lookup = createPriceLookup(prices);

    const result = buildOptionMatrix({
      sizes: [{ code: 'S1', displayName: '90x50mm' }],
      papers: [{ code: 'P1', name: 'A' }],
      quantities: [{ quantity: 100, label: '100매', addPrice: 0 }],
      priceLookup: lookup,
      postProcesses: [{ code: 'PP1', name: '코팅' }],
    });

    expect(result.standard).toHaveLength(1);
    expect(result.standard[0].kind).toBe('STANDARD');
  });

  it('should mark as representative subset when exceeding max', () => {
    const allPrices: Array<{ sizeCode: string; paperCode: string; quantity: number; sellingPrice: number }> = [];
    const sizes: SizeOptionData[] = [];
    const papers: PaperOptionData[] = [];
    const quantities: QuantityTierData[] = [];

    // 10 sizes x 10 papers x 10 quantities = 1000 > 500
    for (let s = 0; s < 10; s++) {
      sizes.push({ code: `S${s}`, displayName: `Size${s}` });
      for (let p = 0; p < 10; p++) {
        if (s === 0) papers.push({ code: `P${p}`, name: `Paper${p}` });
        for (let q = 0; q < 10; q++) {
          if (s === 0 && p === 0) quantities.push({ quantity: (q + 1) * 100, label: `${(q + 1) * 100}매`, addPrice: 0 });
          allPrices.push({
            sizeCode: `S${s}`,
            paperCode: `P${p}`,
            quantity: (q + 1) * 100,
            sellingPrice: 10000 + s * 1000 + p * 500 + q * 200,
          });
        }
      }
    }

    const lookup = createPriceLookup(allPrices);
    const result = buildOptionMatrix({
      sizes, papers, quantities, priceLookup: lookup,
    });

    expect(result.totalCombinationCount).toBe(1000);
    expect(result.registeredCombinationCount).toBe(500);
    expect(result.isRepresentativeSubset).toBe(true);
  });

  it('should not be representative subset when within limit', () => {
    const prices = [
      { sizeCode: 'S1', paperCode: 'P1', quantity: 100, sellingPrice: 10000 },
    ];
    const lookup = createPriceLookup(prices);

    const result = buildOptionMatrix({
      sizes: [{ code: 'S1', displayName: '90x50mm' }],
      papers: [{ code: 'P1', name: 'A' }],
      quantities: [{ quantity: 100, label: '100매', addPrice: 0 }],
      priceLookup: lookup,
    });

    expect(result.isRepresentativeSubset).toBe(false);
  });

  it('should omit REQUIRED and STANDARD when not provided', () => {
    const prices = [
      { sizeCode: 'S1', paperCode: 'P1', quantity: 100, sellingPrice: 10000 },
    ];
    const lookup = createPriceLookup(prices);

    const result = buildOptionMatrix({
      sizes: [{ code: 'S1', displayName: '90x50mm' }],
      papers: [{ code: 'P1', name: 'A' }],
      quantities: [{ quantity: 100, label: '100매', addPrice: 0 }],
      priceLookup: lookup,
    });

    expect(result.required).toHaveLength(0);
    expect(result.standard).toHaveLength(0);
  });

  it('should accept custom maxCombinations limit', () => {
    const allPrices: Array<{ sizeCode: string; paperCode: string; quantity: number; sellingPrice: number }> = [];
    const sizes: SizeOptionData[] = [];

    for (let s = 0; s < 5; s++) {
      sizes.push({ code: `S${s}`, displayName: `Size${s}` });
      allPrices.push({
        sizeCode: `S${s}`, paperCode: 'P1', quantity: 100, sellingPrice: 10000 + s * 1000,
      });
    }

    const lookup = createPriceLookup(allPrices);
    const result = buildOptionMatrix({
      sizes,
      papers: [{ code: 'P1', name: 'A' }],
      quantities: [{ quantity: 100, label: '100매', addPrice: 0 }],
      priceLookup: lookup,
      maxCombinations: 3,
    });

    expect(result.registeredCombinationCount).toBe(3);
    expect(result.isRepresentativeSubset).toBe(true);
  });
});
