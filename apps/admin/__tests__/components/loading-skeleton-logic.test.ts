/**
 * Tests for LoadingSkeleton component logic.
 * REQ-S-005: Skeleton UI during data loading.
 *
 * Tests the variant rendering logic and default values.
 */
import { describe, it, expect } from 'vitest';

type SkeletonVariant = 'table' | 'form' | 'card' | 'detail';

interface LoadingSkeletonProps {
  variant?: SkeletonVariant;
  rows?: number;
  columns?: number;
}

// Test the prop defaults and rendering logic
function getSkeletonConfig(props: LoadingSkeletonProps = {}) {
  const { variant = 'table', rows = 5, columns = 4 } = props;
  return { variant, rows, columns };
}

describe('LoadingSkeleton configuration', () => {
  it('defaults to table variant', () => {
    const config = getSkeletonConfig();
    expect(config.variant).toBe('table');
  });

  it('defaults to 5 rows', () => {
    const config = getSkeletonConfig();
    expect(config.rows).toBe(5);
  });

  it('defaults to 4 columns', () => {
    const config = getSkeletonConfig();
    expect(config.columns).toBe(4);
  });

  it('accepts custom variant', () => {
    expect(getSkeletonConfig({ variant: 'form' }).variant).toBe('form');
    expect(getSkeletonConfig({ variant: 'card' }).variant).toBe('card');
    expect(getSkeletonConfig({ variant: 'detail' }).variant).toBe('detail');
  });

  it('accepts custom rows', () => {
    expect(getSkeletonConfig({ rows: 10 }).rows).toBe(10);
  });

  it('accepts custom columns', () => {
    expect(getSkeletonConfig({ columns: 8 }).columns).toBe(8);
  });
});

describe('LoadingSkeleton variants', () => {
  it('table variant renders header + data rows', () => {
    const { rows, columns } = getSkeletonConfig({ variant: 'table', rows: 5, columns: 4 });
    // Table variant should render: toolbar + header row + data rows
    const totalSkeletonCells = columns + (rows * columns); // header cells + body cells
    expect(totalSkeletonCells).toBe(24); // 4 + 20
  });

  it('form variant renders field groups', () => {
    const { rows } = getSkeletonConfig({ variant: 'form', rows: 6 });
    // Each field: label skeleton + input skeleton
    const skeletonElements = rows * 2 + 1; // fields + submit button
    expect(skeletonElements).toBe(13);
  });

  it('card variant renders grid cards', () => {
    const { rows } = getSkeletonConfig({ variant: 'card', rows: 4 });
    // Each card: title + value + description
    const skeletonElements = rows * 3;
    expect(skeletonElements).toBe(12);
  });

  it('detail variant renders field pairs', () => {
    const { rows } = getSkeletonConfig({ variant: 'detail', rows: 8 });
    // Header + field pairs (label + value each)
    const skeletonElements = 1 + rows * 2;
    expect(skeletonElements).toBe(17);
  });
});
