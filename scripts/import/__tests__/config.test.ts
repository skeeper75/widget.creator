/**
 * RED Phase: config.ts specification tests
 * @MX:SPEC: SPEC-DATA-003 Milestone 1
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should use default DATA_DIR when env not set', async () => {
    delete process.env.DATA_DIR;
    const { getConfig } = await import('../config.js');
    const config = getConfig();
    expect(config.dataDir).toContain('data');
  });

  it('should use DATA_DIR from environment', async () => {
    process.env.DATA_DIR = '/custom/data';
    const { getConfig } = await import('../config.js');
    const config = getConfig();
    expect(config.dataDir).toBe('/custom/data');
  });

  it('should use default REF_DIR when env not set', async () => {
    delete process.env.REF_DIR;
    const { getConfig } = await import('../config.js');
    const config = getConfig();
    expect(config.refDir).toContain('ref/huni');
  });

  it('should use REF_DIR from environment', async () => {
    process.env.REF_DIR = '/custom/ref';
    const { getConfig } = await import('../config.js');
    const config = getConfig();
    expect(config.refDir).toBe('/custom/ref');
  });

  it('should provide mesJsonPath pointing to MES v5 JSON file', async () => {
    const { getConfig } = await import('../config.js');
    const config = getConfig();
    expect(config.mesJsonPath).toContain('MES_');
    expect(config.mesJsonPath).toContain('_v5.json');
  });

  it('should provide exportsDir path', async () => {
    const { getConfig } = await import('../config.js');
    const config = getConfig();
    expect(config.exportsDir).toContain('exports');
  });
});
