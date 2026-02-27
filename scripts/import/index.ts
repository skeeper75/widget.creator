// @MX:NOTE: [AUTO] Master import orchestrator — runs all HuniPrinting data imports in sequence
// @MX:NOTE: [AUTO] Supports --dry-run and --validate-only flags (passed through to child scripts via env)
// @MX:REASON: Single entry point for db:import; allows full re-seeding of master data in one command

import { spawnSync } from "child_process";
import * as path from "path";

// ---------------------------------------------------------------------------
// CLI Flags
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const isValidateOnly = args.includes("--validate-only");

// ---------------------------------------------------------------------------
// Import Steps
// ---------------------------------------------------------------------------

interface ImportStep {
  name: string;
  script: string;
}

// @MX:NOTE: [AUTO] Import order matters — 4-step sequence with FK dependencies
// @MX:NOTE: [AUTO] 1) MES Items — no FK deps, must be first; 2) Papers — paper data for FK refs;
// @MX:NOTE: [AUTO] 3) Options — option_definitions needed before product_options;
// @MX:NOTE: [AUTO] 4) Product Options — requires option_definitions + products
// @MX:REASON: papers table has no FK to mes_items, but conceptually MES items are foundational; option_definitions must exist before product_options can reference them
const STEPS: ImportStep[] = [
  {
    name: "MES Items (item-management.toon)",
    script: "import-mes-items.ts",
  },
  {
    name: "Papers (product-master.toon → !디지털인쇄용지)",
    script: "import-papers.ts",
  },
  {
    name: "Options (option_definitions + option_choices)",
    script: "import-options.ts",
  },
  {
    name: "Product Options (product_options + special colors)",
    script: "import-product-opts.ts",
  },
];

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

const LABEL = "[import/index]";

function runStep(step: ImportStep): boolean {
  const scriptPath = path.resolve(__dirname, step.script);
  console.log(`\n${LABEL} ── Running: ${step.name}`);
  console.log(`${LABEL}    Script:  ${step.script}`);

  if (isValidateOnly) {
    console.log(`${LABEL}    [validate-only] Skipping execution.`);
    return true;
  }

  if (isDryRun) {
    console.log(`${LABEL}    [dry-run] Would execute: tsx ${scriptPath}`);
    return true;
  }

  const result = spawnSync("tsx", [scriptPath], {
    stdio: "inherit",
    env: process.env,
  });

  if (result.error) {
    console.error(`${LABEL}    ERROR: ${result.error.message}`);
    return false;
  }

  if (result.status !== 0) {
    console.error(`${LABEL}    FAILED with exit code ${result.status}`);
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`${LABEL} HuniPrinting master data import`);
  console.log(`${LABEL} Steps: ${STEPS.length}`);

  if (isDryRun) console.log(`${LABEL} Mode: dry-run (no DB writes)`);
  if (isValidateOnly) console.log(`${LABEL} Mode: validate-only (no execution)`);

  let failed = 0;

  for (const step of STEPS) {
    const ok = runStep(step);
    if (!ok) {
      failed++;
      console.error(`${LABEL} Step failed: ${step.name}`);
    }
  }

  console.log(`\n${LABEL} ── Summary`);
  console.log(
    `${LABEL} ${STEPS.length - failed}/${STEPS.length} steps completed successfully`
  );

  if (failed > 0) {
    console.error(`${LABEL} ${failed} step(s) failed`);
    process.exit(1);
  }

  console.log(`${LABEL} All imports complete.`);
}

main().catch((err) => {
  console.error(`${LABEL} Fatal error:`, err);
  process.exit(1);
});
