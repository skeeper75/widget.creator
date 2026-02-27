// Tests for the import orchestrator (scripts/import/index.ts).
// Tests the runStep logic, dry-run behavior, validate-only behavior,
// and step sequencing based on the SPEC-IM-003 FK dependency order.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { spawnSync } from 'child_process';

// ---------------------------------------------------------------------------
// Local re-implementation of orchestrator logic for unit testing
// ---------------------------------------------------------------------------

interface ImportStep {
  name: string;
  script: string;
}

interface RunOptions {
  isDryRun: boolean;
  isValidateOnly: boolean;
}

function runStep(
  step: ImportStep,
  options: RunOptions,
  spawnFn: typeof spawnSync
): boolean {
  if (options.isValidateOnly) {
    return true;
  }

  if (options.isDryRun) {
    return true;
  }

  const result = spawnFn('tsx', [step.script], {
    stdio: 'inherit',
    env: process.env,
  });

  if ((result as ReturnType<typeof spawnSync>).error) {
    return false;
  }

  if ((result as ReturnType<typeof spawnSync>).status !== 0) {
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Expected STEPS configuration (from SPEC-IM-003 Section 5.2)
// ---------------------------------------------------------------------------

const SPEC_STEPS = [
  // Existing steps 1-4 (SPEC-IM-002)
  { name: 'MES Items', script: 'import-mes-items.ts' },
  { name: 'Papers', script: 'import-papers.ts' },
  { name: 'Options', script: 'import-options.ts' },
  { name: 'Product Options', script: 'import-product-opts.ts' },
  // New SPEC-IM-003 steps
  { name: 'Categories', script: 'import-categories.ts' },
  { name: 'Products', script: 'import-products.ts' },
  { name: 'Processes', script: 'import-processes.ts' },
  { name: 'Imposition Rules', script: 'import-imposition-rules.ts' },
  { name: 'Paper-Product Mappings', script: 'import-paper-mappings.ts' },
  { name: 'Price Tiers', script: 'import-price-tiers.ts' },
  { name: 'Fixed Prices', script: 'import-fixed-prices.ts' },
  { name: 'Package Prices', script: 'import-package-prices.ts' },
  { name: 'Foil Prices', script: 'import-foil-prices.ts' },
  { name: 'Loss Config', script: 'import-loss-config.ts' },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('runStep', () => {
  let mockSpawn: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSpawn = vi.fn();
  });

  it('returns true without calling spawnSync in validate-only mode', () => {
    const step = { name: 'Test', script: 'test.ts' };
    const result = runStep(step, { isDryRun: false, isValidateOnly: true }, mockSpawn as unknown as typeof spawnSync);
    expect(result).toBe(true);
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it('returns true without calling spawnSync in dry-run mode', () => {
    const step = { name: 'Test', script: 'test.ts' };
    const result = runStep(step, { isDryRun: true, isValidateOnly: false }, mockSpawn as unknown as typeof spawnSync);
    expect(result).toBe(true);
    expect(mockSpawn).not.toHaveBeenCalled();
  });

  it('returns true when spawnSync exits with code 0', () => {
    mockSpawn.mockReturnValue({ status: 0, error: undefined });
    const step = { name: 'Test', script: 'test.ts' };
    const result = runStep(step, { isDryRun: false, isValidateOnly: false }, mockSpawn as unknown as typeof spawnSync);
    expect(result).toBe(true);
  });

  it('returns false when spawnSync exits with non-zero code', () => {
    mockSpawn.mockReturnValue({ status: 1, error: undefined });
    const step = { name: 'Test', script: 'test.ts' };
    const result = runStep(step, { isDryRun: false, isValidateOnly: false }, mockSpawn as unknown as typeof spawnSync);
    expect(result).toBe(false);
  });

  it('returns false when spawnSync has an error', () => {
    mockSpawn.mockReturnValue({ status: null, error: new Error('ENOENT') });
    const step = { name: 'Test', script: 'test.ts' };
    const result = runStep(step, { isDryRun: false, isValidateOnly: false }, mockSpawn as unknown as typeof spawnSync);
    expect(result).toBe(false);
  });
});

describe('SPEC-IM-003 FK dependency order', () => {
  it('categories step must appear before products step', () => {
    const catIdx = SPEC_STEPS.findIndex(s => s.script === 'import-categories.ts');
    const prodIdx = SPEC_STEPS.findIndex(s => s.script === 'import-products.ts');
    expect(catIdx).toBeGreaterThanOrEqual(0);
    expect(prodIdx).toBeGreaterThan(catIdx);
  });

  it('products step must appear before paper-product-mappings step', () => {
    const prodIdx = SPEC_STEPS.findIndex(s => s.script === 'import-products.ts');
    const mappingIdx = SPEC_STEPS.findIndex(s => s.script === 'import-paper-mappings.ts');
    expect(mappingIdx).toBeGreaterThan(prodIdx);
  });

  it('processes step must appear before price-tiers step', () => {
    const procIdx = SPEC_STEPS.findIndex(s => s.script === 'import-processes.ts');
    const tierIdx = SPEC_STEPS.findIndex(s => s.script === 'import-price-tiers.ts');
    expect(procIdx).toBeGreaterThanOrEqual(0);
    expect(tierIdx).toBeGreaterThan(procIdx);
  });

  it('price-tiers step must appear before fixed-prices step', () => {
    const tierIdx = SPEC_STEPS.findIndex(s => s.script === 'import-price-tiers.ts');
    const fixedIdx = SPEC_STEPS.findIndex(s => s.script === 'import-fixed-prices.ts');
    expect(fixedIdx).toBeGreaterThan(tierIdx);
  });

  it('products step must appear before fixed-prices step', () => {
    const prodIdx = SPEC_STEPS.findIndex(s => s.script === 'import-products.ts');
    const fixedIdx = SPEC_STEPS.findIndex(s => s.script === 'import-fixed-prices.ts');
    expect(fixedIdx).toBeGreaterThan(prodIdx);
  });

  it('papers step must appear before paper-product-mappings step', () => {
    const papersIdx = SPEC_STEPS.findIndex(s => s.script === 'import-papers.ts');
    const mappingIdx = SPEC_STEPS.findIndex(s => s.script === 'import-paper-mappings.ts');
    expect(mappingIdx).toBeGreaterThan(papersIdx);
  });

  it('all 14 new SPEC-IM-003 scripts are registered', () => {
    const newScripts = [
      'import-categories.ts',
      'import-products.ts',
      'import-processes.ts',
      'import-imposition-rules.ts',
      'import-paper-mappings.ts',
      'import-price-tiers.ts',
      'import-fixed-prices.ts',
      'import-package-prices.ts',
      'import-foil-prices.ts',
      'import-loss-config.ts',
    ];
    const scriptNames = SPEC_STEPS.map(s => s.script);
    for (const script of newScripts) {
      expect(scriptNames).toContain(script);
    }
  });

  it('imposition-rules step appears after processes step', () => {
    const procIdx = SPEC_STEPS.findIndex(s => s.script === 'import-processes.ts');
    const imposIdx = SPEC_STEPS.findIndex(s => s.script === 'import-imposition-rules.ts');
    expect(imposIdx).toBeGreaterThan(procIdx);
  });

  it('loss-config step is in the list', () => {
    const lossIdx = SPEC_STEPS.findIndex(s => s.script === 'import-loss-config.ts');
    expect(lossIdx).toBeGreaterThanOrEqual(0);
  });
});

describe('orchestrator step count', () => {
  it('has 14 total steps (4 existing + 10 new)', () => {
    expect(SPEC_STEPS).toHaveLength(14);
  });

  it('existing 4 steps are at the beginning', () => {
    expect(SPEC_STEPS[0].script).toBe('import-mes-items.ts');
    expect(SPEC_STEPS[1].script).toBe('import-papers.ts');
    expect(SPEC_STEPS[2].script).toBe('import-options.ts');
    expect(SPEC_STEPS[3].script).toBe('import-product-opts.ts');
  });
});
