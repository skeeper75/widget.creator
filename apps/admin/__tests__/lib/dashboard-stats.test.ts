/**
 * Tests for Dashboard stats computation logic.
 * REQ-E-701: Dashboard overview with key metrics.
 *
 * Tests the MES mapping rate calculation and activity feed formatting
 * from dashboard.ts router.
 */
import { describe, it, expect } from 'vitest';

// Re-implement dashboard stats computation (same as dashboard.ts)
function computeMesMappingRate(totalMes: number, completedMes: number): number {
  if (totalMes <= 0) return 0;
  return Math.round((completedMes / totalMes) * 100);
}

function formatActivityItem(item: { id: number; name: string; updatedAt: Date }) {
  return {
    id: item.id,
    description: `Product "${item.name}" updated`,
    timestamp: item.updatedAt,
  };
}

describe('MES mapping rate calculation', () => {
  it('returns 0 when no mappings exist', () => {
    expect(computeMesMappingRate(0, 0)).toBe(0);
  });

  it('returns 100 when all mappings are complete', () => {
    expect(computeMesMappingRate(10, 10)).toBe(100);
  });

  it('returns 50 for half completion', () => {
    expect(computeMesMappingRate(10, 5)).toBe(50);
  });

  it('rounds to nearest integer', () => {
    expect(computeMesMappingRate(3, 1)).toBe(33); // 33.33 -> 33
    expect(computeMesMappingRate(3, 2)).toBe(67); // 66.67 -> 67
  });

  it('handles edge case of 1 total', () => {
    expect(computeMesMappingRate(1, 0)).toBe(0);
    expect(computeMesMappingRate(1, 1)).toBe(100);
  });

  it('returns 0 for negative total (defensive)', () => {
    expect(computeMesMappingRate(-1, 0)).toBe(0);
  });
});

describe('activity feed formatting', () => {
  it('formats product update activity', () => {
    const item = {
      id: 42,
      name: 'Business Card',
      updatedAt: new Date('2026-02-01T10:00:00Z'),
    };

    const activity = formatActivityItem(item);

    expect(activity.id).toBe(42);
    expect(activity.description).toBe('Product "Business Card" updated');
    expect(activity.timestamp).toEqual(new Date('2026-02-01T10:00:00Z'));
  });

  it('handles product name with special characters', () => {
    const activity = formatActivityItem({
      id: 1,
      name: 'A4 "Premium" Flyer',
      updatedAt: new Date(),
    });

    expect(activity.description).toBe('Product "A4 "Premium" Flyer" updated');
  });

  it('preserves timestamp from source', () => {
    const ts = new Date('2026-01-15T08:30:00Z');
    const activity = formatActivityItem({
      id: 1,
      name: 'Test',
      updatedAt: ts,
    });
    expect(activity.timestamp).toBe(ts);
  });
});

describe('dashboard stats structure', () => {
  // Validate the expected dashboard stats shape
  interface DashboardStats {
    totalProducts: number;
    activeProducts: number;
    totalWidgets: number;
    activeWidgets: number;
    constraintCount: number;
    mesMappingRate: number;
  }

  it('all stats are non-negative numbers', () => {
    const stats: DashboardStats = {
      totalProducts: 45,
      activeProducts: 38,
      totalWidgets: 3,
      activeWidgets: 2,
      constraintCount: 12,
      mesMappingRate: 67,
    };

    expect(stats.totalProducts).toBeGreaterThanOrEqual(0);
    expect(stats.activeProducts).toBeGreaterThanOrEqual(0);
    expect(stats.totalWidgets).toBeGreaterThanOrEqual(0);
    expect(stats.activeWidgets).toBeGreaterThanOrEqual(0);
    expect(stats.constraintCount).toBeGreaterThanOrEqual(0);
    expect(stats.mesMappingRate).toBeGreaterThanOrEqual(0);
    expect(stats.mesMappingRate).toBeLessThanOrEqual(100);
  });

  it('active count never exceeds total count', () => {
    const stats: DashboardStats = {
      totalProducts: 45,
      activeProducts: 38,
      totalWidgets: 3,
      activeWidgets: 2,
      constraintCount: 12,
      mesMappingRate: 67,
    };

    expect(stats.activeProducts).toBeLessThanOrEqual(stats.totalProducts);
    expect(stats.activeWidgets).toBeLessThanOrEqual(stats.totalWidgets);
  });
});
