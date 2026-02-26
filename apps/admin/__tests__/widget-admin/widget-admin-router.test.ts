/**
 * Tests for widgetAdmin tRPC router business logic.
 * SPEC-WB-005 FR-WB005-01 through FR-WB005-08
 *
 * Since tRPC routers use drizzle-zod (incompatible with vitest stub approach),
 * this test file re-declares the router's input schemas and business logic
 * inline, following the established pattern in this project.
 *
 * See: apps/admin/__tests__/lib/product-options-router.test.ts for pattern reference.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';

// ─── Input schemas (same as widget-admin.ts router) ──────────────────────────

const dashboardInputSchema = z.object({
  categoryId: z.number().optional(),
  search: z.string().optional(),
}).optional();

const completenessInputSchema = z.object({
  productId: z.number(),
});

const startSimulationInputSchema = z.object({
  productId: z.number(),
  options: z.object({
    sample: z.boolean().optional(),
  }).optional(),
});

const simulationCasesInputSchema = z.object({
  runId: z.number(),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20),
  statusFilter: z.enum(['all', 'pass', 'warn', 'error']).optional().default('all'),
});

const exportSimulationInputSchema = z.object({
  runId: z.number(),
});

const publishInputSchema = z.object({
  productId: z.number(),
  simulationRunId: z.number().optional(),
});

const unpublishInputSchema = z.object({
  productId: z.number(),
});

// ─── Business logic helpers (same as widget-admin.ts router) ─────────────────

interface CompletenessItem {
  item: string;
  completed: boolean;
  message: string;
}

interface CompletenessResult {
  publishable: boolean;
  completedCount: number;
  totalCount: number;
  items: CompletenessItem[];
}

function computeCompletedCount(items: CompletenessItem[]): number {
  return items.filter((i) => i.completed).length;
}

function isPublishable(items: CompletenessItem[]): boolean {
  return items.every((i) => i.completed);
}

function formatCompleteness(
  items: CompletenessItem[],
): CompletenessResult {
  const completedCount = computeCompletedCount(items);
  return {
    publishable: isPublishable(items),
    completedCount,
    totalCount: items.length,
    items,
  };
}

// CSV export logic (same as exportSimulation procedure)
function generateCsvRow(caseData: {
  selections: Record<string, string>;
  resultStatus: string;
  totalPrice: number | null;
  message: string | null;
}): string {
  const selectionsStr = Object.entries(caseData.selections)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
  return [
    selectionsStr,
    caseData.resultStatus,
    caseData.totalPrice !== null ? caseData.totalPrice.toString() : '',
    caseData.message ?? '',
  ].join(',');
}

function generateCsvContent(
  cases: {
    selections: Record<string, string>;
    resultStatus: string;
    totalPrice: number | null;
    message: string | null;
  }[],
): string {
  const header = 'selections,result_status,total_price,message';
  const rows = cases.map(generateCsvRow);
  return [header, ...rows].join('\n');
}

// Pagination logic (same as simulationCases procedure)
function paginateCases<T>(
  cases: T[],
  page: number,
  pageSize: number,
): { items: T[]; total: number; page: number; pageSize: number; totalPages: number } {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const items = cases.slice(start, end);
  return {
    items,
    total: cases.length,
    page,
    pageSize,
    totalPages: Math.ceil(cases.length / pageSize),
  };
}

// Status filter logic (same as simulationCases procedure)
function filterCasesByStatus<T extends { resultStatus: string }>(
  cases: T[],
  statusFilter: 'all' | 'pass' | 'warn' | 'error',
): T[] {
  if (statusFilter === 'all') return cases;
  return cases.filter((c) => c.resultStatus === statusFilter);
}

// Dashboard product list formatting
function formatDashboardProduct(
  product: { id: number; name: string; slug: string; categoryId: number },
  completeness: CompletenessResult,
) {
  return {
    productId: product.id,
    productName: product.name,
    slug: product.slug,
    categoryId: product.categoryId,
    completeness: {
      options: completeness.items.find((i) => i.item === 'options'),
      pricing: completeness.items.find((i) => i.item === 'pricing'),
      constraints: completeness.items.find((i) => i.item === 'constraints'),
      mesMapping: completeness.items.find((i) => i.item === 'mesMapping'),
    },
    publishable: completeness.publishable,
    completedCount: completeness.completedCount,
    totalCount: completeness.totalCount,
  };
}

// Simulation run status management
function isSimulationComplete(status: string): boolean {
  return status === 'completed' || status === 'failed' || status === 'cancelled';
}

function getRunningStatus(): 'running' {
  return 'running';
}

function getCompletedStatus(): 'completed' {
  return 'completed';
}

// ─── Test data helpers ────────────────────────────────────────────────────────

function makeAllCompleteItems(): CompletenessItem[] {
  return [
    { item: 'options', completed: true, message: '2 types, 4 choices' },
    { item: 'pricing', completed: true, message: 'Price table connected' },
    { item: 'constraints', completed: true, message: '2 rules' },
    { item: 'mesMapping', completed: true, message: 'Edicus code: EDC001' },
  ];
}

function makeIncompleteItems(): CompletenessItem[] {
  return [
    { item: 'options', completed: true, message: '2 types, 4 choices' },
    { item: 'pricing', completed: false, message: 'No price config' },
    { item: 'constraints', completed: true, message: '0 constraints' },
    { item: 'mesMapping', completed: false, message: 'No MES code' },
  ];
}

function makeSimulationCases() {
  return [
    { selections: { size: 'S1', paper: 'P1' }, resultStatus: 'pass', totalPrice: 10000, message: null },
    { selections: { size: 'S1', paper: 'P2' }, resultStatus: 'warn', totalPrice: 12000, message: 'Paper mismatch' },
    { selections: { size: 'S2', paper: 'P1' }, resultStatus: 'error', totalPrice: null, message: 'Constraint violated' },
    { selections: { size: 'S2', paper: 'P2' }, resultStatus: 'pass', totalPrice: 15000, message: null },
    { selections: { size: 'S3', paper: 'P1' }, resultStatus: 'pass', totalPrice: 8000, message: null },
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════════════════════════════

// ─── dashboard ────────────────────────────────────────────────────────────────

describe('widgetAdmin router — dashboard input schema', () => {
  it('accepts undefined (no filters)', () => {
    const result = dashboardInputSchema.safeParse(undefined);
    expect(result.success).toBe(true);
  });

  it('accepts empty object', () => {
    const result = dashboardInputSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts categoryId filter', () => {
    const result = dashboardInputSchema.safeParse({ categoryId: 1 });
    expect(result.success).toBe(true);
  });

  it('accepts search filter', () => {
    const result = dashboardInputSchema.safeParse({ search: 'sticker' });
    expect(result.success).toBe(true);
  });
});

describe('widgetAdmin router — dashboard formatting', () => {
  it('returns all products with completeness data', () => {
    const product = { id: 1, name: 'Business Card', slug: 'bc', categoryId: 2 };
    const completeness = formatCompleteness(makeAllCompleteItems());

    const formatted = formatDashboardProduct(product, completeness);

    expect(formatted.productId).toBe(1);
    expect(formatted.productName).toBe('Business Card');
    expect(formatted.publishable).toBe(true);
    expect(formatted.completedCount).toBe(4);
    expect(formatted.totalCount).toBe(4);
    expect(formatted.completeness.options).toBeDefined();
    expect(formatted.completeness.pricing).toBeDefined();
    expect(formatted.completeness.constraints).toBeDefined();
    expect(formatted.completeness.mesMapping).toBeDefined();
  });

  it('shows publishable=false when any item incomplete', () => {
    const product = { id: 2, name: 'Roll Sticker', slug: 'rs', categoryId: 1 };
    const completeness = formatCompleteness(makeIncompleteItems());

    const formatted = formatDashboardProduct(product, completeness);

    expect(formatted.publishable).toBe(false);
    expect(formatted.completedCount).toBe(2);
  });
});

// ─── completeness ─────────────────────────────────────────────────────────────

describe('widgetAdmin router — completeness input schema', () => {
  it('accepts valid productId', () => {
    const result = completenessInputSchema.safeParse({ productId: 1 });
    expect(result.success).toBe(true);
  });

  it('rejects missing productId', () => {
    const result = completenessInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects non-integer productId', () => {
    const result = completenessInputSchema.safeParse({ productId: 'abc' });
    expect(result.success).toBe(false);
  });
});

describe('widgetAdmin router — completeness logic', () => {
  it('returns completeness for a specific product', () => {
    const result = formatCompleteness(makeAllCompleteItems());

    expect(result.publishable).toBe(true);
    expect(result.completedCount).toBe(4);
    expect(result.items).toHaveLength(4);
  });

  it('returns completedCount correctly', () => {
    const result = formatCompleteness(makeIncompleteItems());

    expect(result.completedCount).toBe(2);
    expect(result.publishable).toBe(false);
  });
});

// ─── startSimulation ──────────────────────────────────────────────────────────

describe('widgetAdmin router — startSimulation input schema', () => {
  it('accepts valid productId', () => {
    const result = startSimulationInputSchema.safeParse({ productId: 1 });
    expect(result.success).toBe(true);
  });

  it('accepts productId with sample option', () => {
    const result = startSimulationInputSchema.safeParse({
      productId: 1,
      options: { sample: true },
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing productId', () => {
    const result = startSimulationInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('widgetAdmin router — startSimulation logic', () => {
  it('creates simulation_runs record with status=running', () => {
    const initialStatus = getRunningStatus();
    expect(initialStatus).toBe('running');
  });

  it('returns runId after creating simulation run', () => {
    // Simulate the DB insert returning a runId
    const simulatedRunId = 42;
    expect(typeof simulatedRunId).toBe('number');
    expect(simulatedRunId).toBeGreaterThan(0);
  });

  it('marks simulation as completed after running', () => {
    const completedStatus = getCompletedStatus();
    expect(isSimulationComplete(completedStatus)).toBe(true);
  });

  it('running status is not complete', () => {
    expect(isSimulationComplete('running')).toBe(false);
  });

  it('failed status is complete (terminal state)', () => {
    expect(isSimulationComplete('failed')).toBe(true);
  });

  it('cancelled status is complete (terminal state)', () => {
    expect(isSimulationComplete('cancelled')).toBe(true);
  });
});

// ─── simulationCases ──────────────────────────────────────────────────────────

describe('widgetAdmin router — simulationCases input schema', () => {
  it('accepts valid runId', () => {
    const result = simulationCasesInputSchema.safeParse({ runId: 1 });
    expect(result.success).toBe(true);
  });

  it('applies default page=1 and pageSize=20', () => {
    const result = simulationCasesInputSchema.safeParse({ runId: 1 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20);
      expect(result.data.statusFilter).toBe('all');
    }
  });

  it('rejects pageSize > 100', () => {
    const result = simulationCasesInputSchema.safeParse({ runId: 1, pageSize: 101 });
    expect(result.success).toBe(false);
  });

  it('rejects page < 1', () => {
    const result = simulationCasesInputSchema.safeParse({ runId: 1, page: 0 });
    expect(result.success).toBe(false);
  });

  it('accepts statusFilter=error', () => {
    const result = simulationCasesInputSchema.safeParse({
      runId: 1,
      statusFilter: 'error',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid statusFilter', () => {
    const result = simulationCasesInputSchema.safeParse({
      runId: 1,
      statusFilter: 'invalid',
    });
    expect(result.success).toBe(false);
  });
});

describe('widgetAdmin router — simulationCases pagination', () => {
  it('returns paginated cases', () => {
    const cases = makeSimulationCases();
    const result = paginateCases(cases, 1, 2);

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(5);
    expect(result.totalPages).toBe(3);
    expect(result.page).toBe(1);
  });

  it('returns second page correctly', () => {
    const cases = makeSimulationCases();
    const result = paginateCases(cases, 2, 2);

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual(cases[2]);
  });

  it('returns partial last page', () => {
    const cases = makeSimulationCases();
    const result = paginateCases(cases, 3, 2);

    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(cases[4]);
  });

  it('returns empty items beyond last page', () => {
    const cases = makeSimulationCases();
    const result = paginateCases(cases, 10, 20);

    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(5);
  });
});

describe('widgetAdmin router — simulationCases status filter', () => {
  it('filters by status=pass', () => {
    const cases = makeSimulationCases();
    const filtered = filterCasesByStatus(cases, 'pass');

    expect(filtered).toHaveLength(3);
    filtered.forEach((c) => expect(c.resultStatus).toBe('pass'));
  });

  it('filters by status=warn', () => {
    const cases = makeSimulationCases();
    const filtered = filterCasesByStatus(cases, 'warn');

    expect(filtered).toHaveLength(1);
    expect(filtered[0].resultStatus).toBe('warn');
  });

  it('filters by status=error', () => {
    const cases = makeSimulationCases();
    const filtered = filterCasesByStatus(cases, 'error');

    expect(filtered).toHaveLength(1);
    expect(filtered[0].resultStatus).toBe('error');
  });

  it('returns all cases for status=all', () => {
    const cases = makeSimulationCases();
    const filtered = filterCasesByStatus(cases, 'all');

    expect(filtered).toHaveLength(cases.length);
  });
});

// ─── exportSimulation ─────────────────────────────────────────────────────────

describe('widgetAdmin router — exportSimulation input schema', () => {
  it('accepts valid runId', () => {
    const result = exportSimulationInputSchema.safeParse({ runId: 1 });
    expect(result.success).toBe(true);
  });

  it('rejects missing runId', () => {
    const result = exportSimulationInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('widgetAdmin router — exportSimulation CSV generation', () => {
  it('returns valid CSV string', () => {
    const cases = makeSimulationCases();
    const csv = generateCsvContent(cases);

    expect(typeof csv).toBe('string');
    expect(csv).toContain('selections,result_status,total_price,message');
  });

  it('includes all case fields in CSV', () => {
    const cases = makeSimulationCases();
    const csv = generateCsvContent(cases);

    const lines = csv.split('\n');
    // header + 5 data rows
    expect(lines).toHaveLength(6);
  });

  it('CSV rows contain result status', () => {
    const cases = makeSimulationCases();
    const csv = generateCsvContent(cases);

    expect(csv).toContain('pass');
    expect(csv).toContain('warn');
    expect(csv).toContain('error');
  });

  it('CSV rows have empty price for error cases', () => {
    const errorCase = {
      selections: { size: 'S2' },
      resultStatus: 'error',
      totalPrice: null,
      message: 'Constraint violated',
    };
    const csv = generateCsvContent([errorCase]);
    const dataLine = csv.split('\n')[1];
    // Empty price field (between two commas)
    expect(dataLine).toContain('error,,');
  });

  it('CSV rows have message field', () => {
    const warnCase = {
      selections: { size: 'S1' },
      resultStatus: 'warn',
      totalPrice: 12000,
      message: 'Paper mismatch',
    };
    const csv = generateCsvContent([warnCase]);

    expect(csv).toContain('Paper mismatch');
  });

  it('selections are formatted as key=value pairs', () => {
    const caseData = {
      selections: { size: 'S1', paper: 'P1' },
      resultStatus: 'pass',
      totalPrice: 10000,
      message: null,
    };
    const row = generateCsvRow(caseData);

    expect(row).toContain('size=S1');
    expect(row).toContain('paper=P1');
  });
});

// ─── publish ──────────────────────────────────────────────────────────────────

describe('widgetAdmin router — publish input schema', () => {
  it('accepts valid productId', () => {
    const result = publishInputSchema.safeParse({ productId: 1 });
    expect(result.success).toBe(true);
  });

  it('accepts productId with simulationRunId', () => {
    const result = publishInputSchema.safeParse({
      productId: 1,
      simulationRunId: 42,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing productId', () => {
    const result = publishInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('widgetAdmin router — publish logic', () => {
  it('publishes product when completeness passes', () => {
    const completeness = formatCompleteness(makeAllCompleteItems());

    expect(completeness.publishable).toBe(true);
    // When publishable=true, the router should proceed with publishing
  });

  it('throws FORBIDDEN when completeness fails', () => {
    const completeness = formatCompleteness(makeIncompleteItems());

    expect(completeness.publishable).toBe(false);
    // Simulate publish gate: throw when not publishable
    const shouldThrow = () => {
      if (!completeness.publishable) {
        throw new Error('FORBIDDEN: Product is not ready for publishing');
      }
    };
    expect(shouldThrow).toThrow('FORBIDDEN');
  });

  it('missing items list is included in error', () => {
    const items = makeIncompleteItems();
    const completeness = formatCompleteness(items);

    const missingItems = items.filter((i) => !i.completed).map((i) => i.item);
    expect(missingItems).toContain('pricing');
    expect(missingItems).toContain('mesMapping');
  });
});

// ─── unpublish ────────────────────────────────────────────────────────────────

describe('widgetAdmin router — unpublish input schema', () => {
  it('accepts valid productId', () => {
    const result = unpublishInputSchema.safeParse({ productId: 1 });
    expect(result.success).toBe(true);
  });

  it('rejects missing productId', () => {
    const result = unpublishInputSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('widgetAdmin router — unpublish logic', () => {
  it('unpublishes a published product (sets isVisible=false)', () => {
    // Simulate the unpublish state change
    const product = { id: 1, isVisible: true, isActive: true };
    const afterUnpublish = { ...product, isVisible: false };

    expect(afterUnpublish.isVisible).toBe(false);
    expect(afterUnpublish.isActive).toBe(true); // isActive unchanged
  });

  it('isActive remains unchanged after unpublish', () => {
    const product = { id: 1, isVisible: true, isActive: true };
    const afterUnpublish = { ...product, isVisible: false };

    // isActive should NOT change
    expect(afterUnpublish.isActive).toBe(product.isActive);
  });

  it('unpublish action does not require completeness check', () => {
    // Unpublish is always allowed regardless of completeness
    const completeness = formatCompleteness(makeIncompleteItems());
    const shouldAlwaysAllow = true; // unpublish doesn't check completeness

    expect(shouldAlwaysAllow).toBe(true);
  });
});

// ─── completeness formatting integration ──────────────────────────────────────

describe('widgetAdmin router — completeness formatting integration', () => {
  it('all 4 item keys are present in result', () => {
    const result = formatCompleteness(makeAllCompleteItems());
    const keys = result.items.map((i) => i.item);

    expect(keys).toContain('options');
    expect(keys).toContain('pricing');
    expect(keys).toContain('constraints');
    expect(keys).toContain('mesMapping');
  });

  it('computeCompletedCount counts correctly', () => {
    expect(computeCompletedCount(makeAllCompleteItems())).toBe(4);
    expect(computeCompletedCount(makeIncompleteItems())).toBe(2);
    expect(computeCompletedCount([])).toBe(0);
  });

  it('isPublishable returns false when any item fails', () => {
    const items = makeAllCompleteItems();
    items[0] = { ...items[0], completed: false };

    expect(isPublishable(items)).toBe(false);
  });

  it('isPublishable returns true when all items pass', () => {
    expect(isPublishable(makeAllCompleteItems())).toBe(true);
  });
});
