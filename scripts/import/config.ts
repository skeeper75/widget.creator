/**
 * Import pipeline configuration
 * @MX:NOTE: [AUTO] Path configuration with DATA_DIR, REF_DIR env vars
 * @MX:SPEC: SPEC-DATA-003 Milestone 1
 */
import * as path from 'node:path';

export interface ImportConfig {
  dataDir: string;
  refDir: string;
  exportsDir: string;
  mesJsonPath: string;
}

// @MX:ANCHOR: [AUTO] Central configuration factory used by all importers
// @MX:REASON: fan_in >= 5 (all importers + orchestrator + version-manager)
export function getConfig(): ImportConfig {
  const dataDir = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
  const refDir = process.env.REF_DIR || path.resolve(process.cwd(), 'ref/huni');
  const exportsDir = path.join(dataDir, 'exports');
  const mesJsonPath = path.join(exportsDir, 'MES_\uc790\uc7ac\uacf5\uc815\ub9e4\ud551_v5.json');

  return {
    dataDir,
    refDir,
    exportsDir,
    mesJsonPath,
  };
}
