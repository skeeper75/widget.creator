/**
 * Formatting Utilities Tests
 * @see SPEC-WIDGET-SDK-001 Section 4
 */

import { describe, it, expect } from 'vitest';
import {
  formatKRW,
  formatNumber,
  parseNumber,
  calculateVAT,
  formatQuantity,
  formatDimensions,
  formatPercent,
  clamp,
  roundToStep,
} from '@/utils/formatting';

describe('formatKRW', () => {
  it('formats 0 correctly', () => {
    expect(formatKRW(0)).toBe('0원');
  });

  it('formats small numbers correctly', () => {
    expect(formatKRW(100)).toBe('100원');
    expect(formatKRW(1000)).toBe('1,000원');
  });

  it('formats large numbers with thousand separators', () => {
    expect(formatKRW(10000)).toBe('10,000원');
    expect(formatKRW(1000000)).toBe('1,000,000원');
    expect(formatKRW(12345678)).toBe('12,345,678원');
  });

  it('handles negative numbers', () => {
    expect(formatKRW(-1000)).toBe('-1,000원');
    expect(formatKRW(-12345)).toBe('-12,345원');
  });

  it('handles decimal numbers', () => {
    // Korean locale rounds decimals
    expect(formatKRW(1000.5)).toBe('1,000.5원');
    expect(formatKRW(1000.123)).toBe('1,000.123원');
  });
});

describe('formatNumber', () => {
  it('formats numbers with thousand separators', () => {
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(10000)).toBe('10,000');
    expect(formatNumber(1000000)).toBe('1,000,000');
  });

  it('formats small numbers without separators', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(100)).toBe('100');
    expect(formatNumber(999)).toBe('999');
  });

  it('handles negative numbers', () => {
    expect(formatNumber(-1000)).toBe('-1,000');
    expect(formatNumber(-999999)).toBe('-999,999');
  });
});

describe('parseNumber', () => {
  it('parses plain numbers', () => {
    expect(parseNumber('100')).toBe(100);
    expect(parseNumber('1000')).toBe(1000);
  });

  it('parses numbers with commas', () => {
    expect(parseNumber('1,000')).toBe(1000);
    expect(parseNumber('10,000')).toBe(10000);
    expect(parseNumber('1,000,000')).toBe(1000000);
  });

  it('parses numbers with currency symbols', () => {
    expect(parseNumber('1,000원')).toBe(1000);
    expect(parseNumber('$1,000')).toBe(1000);
  });

  it('parses negative numbers', () => {
    expect(parseNumber('-1,000')).toBe(-1000);
  });

  it('parses decimal numbers', () => {
    expect(parseNumber('1,000.50')).toBe(1000.5);
  });

  it('returns 0 for invalid input', () => {
    expect(parseNumber('')).toBe(0);
    expect(parseNumber('abc')).toBe(0);
    expect(parseNumber('원')).toBe(0);
  });
});

describe('calculateVAT', () => {
  it('calculates 10% VAT correctly', () => {
    expect(calculateVAT(1000)).toBe(100);
    expect(calculateVAT(10000)).toBe(1000);
    expect(calculateVAT(50000)).toBe(5000);
  });

  it('rounds to nearest integer', () => {
    expect(calculateVAT(333)).toBe(33); // 33.3 -> 33
    expect(calculateVAT(335)).toBe(34); // 33.5 -> 34
    expect(calculateVAT(337)).toBe(34); // 33.7 -> 34
  });

  it('returns 0 for 0 subtotal', () => {
    expect(calculateVAT(0)).toBe(0);
  });

  it('handles large numbers', () => {
    expect(calculateVAT(1000000)).toBe(100000);
    expect(calculateVAT(9999999)).toBe(1000000); // rounds 999999.9 to 1000000
  });
});

describe('formatQuantity', () => {
  it('formats quantity with default unit', () => {
    expect(formatQuantity(100)).toBe('100장');
    expect(formatQuantity(1000)).toBe('1,000장');
  });

  it('formats quantity with custom unit', () => {
    expect(formatQuantity(100, '개')).toBe('100개');
    expect(formatQuantity(100, '매')).toBe('100매');
    expect(formatQuantity(100, '')).toBe('100');
  });

  it('formats large quantities', () => {
    expect(formatQuantity(10000)).toBe('10,000장');
    expect(formatQuantity(100000)).toBe('100,000장');
  });
});

describe('formatDimensions', () => {
  it('formats width x height in mm', () => {
    expect(formatDimensions(210, 297)).toBe('210 x 297mm');
    expect(formatDimensions(100, 100)).toBe('100 x 100mm');
  });

  it('handles standard paper sizes', () => {
    // A4
    expect(formatDimensions(210, 297)).toBe('210 x 297mm');
    // A3
    expect(formatDimensions(297, 420)).toBe('297 x 420mm');
    // B5
    expect(formatDimensions(176, 250)).toBe('176 x 250mm');
  });

  it('handles custom sizes', () => {
    expect(formatDimensions(150, 200)).toBe('150 x 200mm');
    expect(formatDimensions(999, 999)).toBe('999 x 999mm');
  });
});

describe('formatPercent', () => {
  it('formats decimal as percentage', () => {
    expect(formatPercent(0.1)).toBe('10%');
    expect(formatPercent(0.5)).toBe('50%');
    expect(formatPercent(1.0)).toBe('100%');
  });

  it('rounds to nearest integer', () => {
    expect(formatPercent(0.155)).toBe('16%'); // 15.5 -> 16
    expect(formatPercent(0.154)).toBe('15%'); // 15.4 -> 15
  });

  it('handles small percentages', () => {
    expect(formatPercent(0.01)).toBe('1%');
    expect(formatPercent(0.001)).toBe('0%');
  });

  it('handles percentages over 100%', () => {
    expect(formatPercent(1.5)).toBe('150%');
    expect(formatPercent(2.0)).toBe('200%');
  });
});

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(50, 0, 100)).toBe(50);
  });

  it('returns min when value is below range', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(0, 100, 200)).toBe(100);
  });

  it('returns max when value is above range', () => {
    expect(clamp(15, 0, 10)).toBe(10);
    expect(clamp(250, 0, 100)).toBe(100);
  });

  it('handles edge cases', () => {
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });

  it('handles negative ranges', () => {
    expect(clamp(-5, -10, -1)).toBe(-5);
    expect(clamp(-15, -10, -1)).toBe(-10);
  });
});

describe('roundToStep', () => {
  it('rounds to step of 10', () => {
    expect(roundToStep(15, 10)).toBe(20);
    expect(roundToStep(14, 10)).toBe(10);
    expect(roundToStep(10, 10)).toBe(10);
    expect(roundToStep(20, 10)).toBe(20);
  });

  it('rounds to step of 100', () => {
    expect(roundToStep(150, 100)).toBe(200);
    expect(roundToStep(149, 100)).toBe(100);
    expect(roundToStep(100, 100)).toBe(100);
  });

  it('rounds to step of 50', () => {
    expect(roundToStep(75, 50)).toBe(100);
    expect(roundToStep(74, 50)).toBe(50);
    expect(roundToStep(25, 50)).toBe(50);
    expect(roundToStep(24, 50)).toBe(0);
  });

  it('handles step of 1', () => {
    expect(roundToStep(1.4, 1)).toBe(1);
    expect(roundToStep(1.5, 1)).toBe(2);
    expect(roundToStep(1.6, 1)).toBe(2);
  });

  it('handles 0', () => {
    expect(roundToStep(0, 10)).toBe(0);
    expect(roundToStep(5, 10)).toBe(10);
    expect(roundToStep(4, 10)).toBe(0);
  });
});
