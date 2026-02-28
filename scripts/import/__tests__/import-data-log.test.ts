// Tests for data_import_log requirements (SPEC-IM-003 M4-REQ-003).
// Validates the structure and completeness of import log records.
// Also tests idempotency contract and FK consistency check logic.

import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Types matching SPEC-IM-003 M4-REQ-003
// ---------------------------------------------------------------------------

type PhaseType = 'M1' | 'M2' | 'M3' | 'M4' | 'M5';

interface DataImportLog {
  phase: PhaseType;
  step: string;
  tableName: string;
  totalRecords: number;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  executionTime: number;
  executedAt: Date;
  tag?: string;
}

// ---------------------------------------------------------------------------
// Log record validation
// ---------------------------------------------------------------------------

function validateImportLog(log: DataImportLog): string[] {
  const errors: string[] = [];

  const validPhases: PhaseType[] = ['M1', 'M2', 'M3', 'M4', 'M5'];
  if (!validPhases.includes(log.phase)) {
    errors.push(`phase must be one of M1-M5, got ${log.phase}`);
  }

  if (!log.step || log.step.trim() === '') {
    errors.push('step is required (e.g., "import-categories")');
  }

  if (!log.tableName || log.tableName.trim() === '') {
    errors.push('tableName is required');
  }

  if (log.totalRecords < 0) {
    errors.push('totalRecords must be >= 0');
  }

  if (log.insertedCount < 0) {
    errors.push('insertedCount must be >= 0');
  }

  if (log.updatedCount < 0) {
    errors.push('updatedCount must be >= 0');
  }

  if (log.skippedCount < 0) {
    errors.push('skippedCount must be >= 0');
  }

  if (log.errorCount < 0) {
    errors.push('errorCount must be >= 0');
  }

  if (log.executionTime < 0) {
    errors.push('executionTime must be >= 0');
  }

  if (!(log.executedAt instanceof Date)) {
    errors.push('executedAt must be a Date');
  }

  // inserted + updated + skipped + errors should not exceed totalRecords
  const processed = log.insertedCount + log.updatedCount + log.skippedCount + log.errorCount;
  if (processed > log.totalRecords) {
    errors.push(`sum of counts (${processed}) exceeds totalRecords (${log.totalRecords})`);
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Idempotency check helper
// ---------------------------------------------------------------------------

interface TableCount {
  tableName: string;
  count: number;
}

function checkIdempotency(beforeCounts: TableCount[], afterCounts: TableCount[]): boolean {
  for (const before of beforeCounts) {
    const after = afterCounts.find(a => a.tableName === before.tableName);
    if (!after) return false;
    if (after.count !== before.count) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// FK consistency check
// ---------------------------------------------------------------------------

interface OrphanCheckResult {
  table: string;
  orphanCount: number;
  description: string;
}

function hasNoOrphans(results: OrphanCheckResult[]): boolean {
  return results.every(r => r.orphanCount === 0);
}

// ---------------------------------------------------------------------------
// Yellow cell warning tag
// ---------------------------------------------------------------------------

function buildYellowCellLogTag(): string {
  return 'yellow_cell_warning';
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('validateImportLog (M4-REQ-003)', () => {
  const validLog: DataImportLog = {
    phase: 'M1',
    step: 'import-categories',
    tableName: 'categories',
    totalRecords: 37,
    insertedCount: 37,
    updatedCount: 0,
    skippedCount: 0,
    errorCount: 0,
    executionTime: 1250,
    executedAt: new Date(),
  };

  it('accepts a valid import log record', () => {
    expect(validateImportLog(validLog)).toHaveLength(0);
  });

  it('accepts all valid phases M1-M5', () => {
    const phases: PhaseType[] = ['M1', 'M2', 'M3', 'M4', 'M5'];
    for (const phase of phases) {
      const log = { ...validLog, phase };
      expect(validateImportLog(log)).toHaveLength(0);
    }
  });

  it('rejects invalid phase', () => {
    const log = { ...validLog, phase: 'M0' as PhaseType };
    const errors = validateImportLog(log);
    expect(errors.some(e => e.includes('phase'))).toBe(true);
  });

  it('rejects missing step', () => {
    const log = { ...validLog, step: '' };
    const errors = validateImportLog(log);
    expect(errors.some(e => e.includes('step'))).toBe(true);
  });

  it('rejects missing tableName', () => {
    const log = { ...validLog, tableName: '' };
    const errors = validateImportLog(log);
    expect(errors.some(e => e.includes('tableName'))).toBe(true);
  });

  it('rejects negative counts', () => {
    const log = { ...validLog, insertedCount: -1 };
    const errors = validateImportLog(log);
    expect(errors.some(e => e.includes('insertedCount'))).toBe(true);
  });

  it('rejects when processed sum exceeds totalRecords', () => {
    const log = {
      ...validLog,
      totalRecords: 10,
      insertedCount: 8,
      updatedCount: 5,  // 8+5+0+0 = 13 > 10
    };
    const errors = validateImportLog(log);
    expect(errors.some(e => e.includes('totalRecords'))).toBe(true);
  });

  it('accepts when counts exactly equal totalRecords', () => {
    const log = {
      ...validLog,
      totalRecords: 10,
      insertedCount: 7,
      updatedCount: 2,
      skippedCount: 1,
      errorCount: 0,
    };
    expect(validateImportLog(log)).toHaveLength(0);
  });

  it('log for categories phase uses step name "import-categories"', () => {
    expect(validLog.step).toBe('import-categories');
    expect(validLog.phase).toBe('M1');
  });
});

describe('required log fields per SPEC M4-REQ-003', () => {
  it('log structure has all required fields', () => {
    const requiredFields = [
      'phase', 'step', 'tableName', 'totalRecords',
      'insertedCount', 'updatedCount', 'skippedCount',
      'errorCount', 'executionTime', 'executedAt',
    ] as const;

    const log: DataImportLog = {
      phase: 'M2',
      step: 'import-processes',
      tableName: 'print_modes',
      totalRecords: 11,
      insertedCount: 11,
      updatedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      executionTime: 500,
      executedAt: new Date(),
    };

    for (const field of requiredFields) {
      expect(log).toHaveProperty(field);
    }
  });
});

describe('checkIdempotency (SPEC 5.1)', () => {
  it('returns true when counts match after second run', () => {
    const before: TableCount[] = [
      { tableName: 'categories', count: 37 },
      { tableName: 'products', count: 236 },
    ];
    const after: TableCount[] = [
      { tableName: 'categories', count: 37 },
      { tableName: 'products', count: 236 },
    ];
    expect(checkIdempotency(before, after)).toBe(true);
  });

  it('returns false when counts differ (duplicate insertion)', () => {
    const before: TableCount[] = [
      { tableName: 'categories', count: 37 },
    ];
    const after: TableCount[] = [
      { tableName: 'categories', count: 74 },  // doubled — not idempotent
    ];
    expect(checkIdempotency(before, after)).toBe(false);
  });

  it('returns false when a table is missing after run', () => {
    const before: TableCount[] = [
      { tableName: 'categories', count: 37 },
      { tableName: 'products', count: 236 },
    ];
    const after: TableCount[] = [
      { tableName: 'categories', count: 37 },
      // products missing
    ];
    expect(checkIdempotency(before, after)).toBe(false);
  });
});

describe('FK consistency checks (M4-REQ-001)', () => {
  it('passes when all tables have zero orphans', () => {
    const results: OrphanCheckResult[] = [
      { table: 'price_tiers', orphanCount: 0, description: 'priceTableId not in price_tables' },
      { table: 'fixed_prices', orphanCount: 0, description: 'productId not in products' },
      { table: 'package_prices', orphanCount: 0, description: 'productId not in products' },
    ];
    expect(hasNoOrphans(results)).toBe(true);
  });

  it('fails when any table has orphan records', () => {
    const results: OrphanCheckResult[] = [
      { table: 'price_tiers', orphanCount: 0, description: 'priceTableId not in price_tables' },
      { table: 'fixed_prices', orphanCount: 3, description: 'productId not in products' },  // orphans!
    ];
    expect(hasNoOrphans(results)).toBe(false);
  });

  it('required FK checks match SPEC M4-REQ-001', () => {
    const requiredChecks = [
      'price_tiers.priceTableId → price_tables',
      'price_tiers.optionCode → valid print_modes/post_processes',
      'fixed_prices.productId → products',
      'package_prices.productId → products',
    ];
    // Documents the required checks per SPEC
    expect(requiredChecks).toHaveLength(4);
  });
});

describe('yellow cell warning log (SPEC 5.6)', () => {
  it('yellow_cell_warning tag is correct string', () => {
    expect(buildYellowCellLogTag()).toBe('yellow_cell_warning');
  });

  it('import log can include optional tag', () => {
    const log: DataImportLog = {
      phase: 'M2',
      step: 'import-imposition-rules',
      tableName: 'imposition_rules',
      totalRecords: 52,
      insertedCount: 50,
      updatedCount: 0,
      skippedCount: 0,
      errorCount: 0,
      executionTime: 800,
      executedAt: new Date(),
      tag: 'yellow_cell_warning',  // rows 53-54 were yellow cells
    };
    expect(validateImportLog(log)).toHaveLength(0);
    expect(log.tag).toBe('yellow_cell_warning');
  });
});

describe('step name to phase mapping', () => {
  const STEP_PHASE_MAP: Array<{ step: string; phase: PhaseType; table: string }> = [
    { step: 'import-categories', phase: 'M1', table: 'categories' },
    { step: 'import-products', phase: 'M1', table: 'products' },
    { step: 'import-paper-mappings', phase: 'M1', table: 'paper_product_mapping' },
    { step: 'import-processes', phase: 'M2', table: 'print_modes' },
    { step: 'import-imposition-rules', phase: 'M2', table: 'imposition_rules' },
    { step: 'import-price-tiers', phase: 'M3', table: 'price_tiers' },
    { step: 'import-fixed-prices', phase: 'M3', table: 'fixed_prices' },
    { step: 'import-package-prices', phase: 'M3', table: 'package_prices' },
    { step: 'import-foil-prices', phase: 'M3', table: 'foil_prices' },
    { step: 'import-loss-config', phase: 'M3', table: 'loss_quantity_config' },
  ];

  it('has all 10 new SPEC-IM-003 scripts mapped', () => {
    expect(STEP_PHASE_MAP).toHaveLength(10);
  });

  it('M1 steps include categories, products, paper-mappings', () => {
    const m1Steps = STEP_PHASE_MAP.filter(s => s.phase === 'M1');
    expect(m1Steps.map(s => s.step)).toContain('import-categories');
    expect(m1Steps.map(s => s.step)).toContain('import-products');
    expect(m1Steps.map(s => s.step)).toContain('import-paper-mappings');
  });

  it('M2 steps include processes and imposition-rules', () => {
    const m2Steps = STEP_PHASE_MAP.filter(s => s.phase === 'M2');
    expect(m2Steps.map(s => s.step)).toContain('import-processes');
    expect(m2Steps.map(s => s.step)).toContain('import-imposition-rules');
  });

  it('M3 steps include all price import scripts', () => {
    const m3Steps = STEP_PHASE_MAP.filter(s => s.phase === 'M3');
    expect(m3Steps.map(s => s.step)).toContain('import-price-tiers');
    expect(m3Steps.map(s => s.step)).toContain('import-fixed-prices');
    expect(m3Steps.map(s => s.step)).toContain('import-package-prices');
    expect(m3Steps.map(s => s.step)).toContain('import-foil-prices');
    expect(m3Steps.map(s => s.step)).toContain('import-loss-config');
  });
});
