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

// @MX:NOTE: [AUTO] Import order matters — 14-step sequence with FK dependencies
// @MX:NOTE: [AUTO] M0: Foundation (Steps 1-2): MES Items, Papers
// @MX:NOTE: [AUTO] M1: Catalog (Steps 3-4): Categories → Products
// @MX:NOTE: [AUTO] M2: Manufacturing (Steps 5-7): Processes → Options → Product Options
// @MX:NOTE: [AUTO] M2b: Production rules (Steps 8-9): Imposition Rules → Paper Mappings
// @MX:NOTE: [AUTO] M3: Pricing (Steps 10-13): Price Tiers → Fixed Prices → Package Prices → Foil Prices
// @MX:NOTE: [AUTO] M4: Configuration (Step 14): Loss Config
// @MX:REASON: FK dependency order: categories → products; products+categories → product-opts; processes → options; papers → paper_product_mapping; price_tables → price_tiers; products+papers+print_modes → fixed/package prices
const STEPS: ImportStep[] = [
  // M0: Foundation layer (Steps 1-2)
  {
    name: "MES Items (item-management.toon)",
    script: "import-mes-items.ts",
  },
  {
    name: "Papers (출력소재관리_extracted.json → !출력소재)",
    script: "import-papers.ts",
  },
  // M1: Catalog layer (Steps 3-4)
  {
    name: "Categories (hardcoded 12 roots + ~36 subs)",
    script: "import-categories.ts",
  },
  {
    name: "Products (상품마스터_extracted.json → 11 sheets)",
    script: "import-products.ts",
  },
  // M2: Manufacturing layer (Steps 5-7)
  {
    name: "Processes (print modes + post-processes + bindings)",
    script: "import-processes.ts",
  },
  {
    name: "Options (option_definitions + option_choices)",
    script: "import-options.ts",
  },
  {
    name: "Product Options (product_options + special colors)",
    script: "import-product-opts.ts",
  },
  // M2b: Production rules layer (Steps 8-9)
  {
    name: "Imposition Rules (가격표_extracted.json → 사이즈별 판걸이수)",
    script: "import-imposition-rules.ts",
  },
  {
    name: "Paper Mappings (출력소재관리_extracted.json → !출력소재 K-Y columns)",
    script: "import-paper-mappings.ts",
  },
  // M3: Pricing layer (Steps 10-13)
  {
    name: "Price Tiers (가격표_extracted.json → 디지털출력비 + 후가공)",
    script: "import-price-tiers.ts",
  },
  {
    name: "Fixed Prices (가격표_extracted.json → 명함 sheet)",
    script: "import-fixed-prices.ts",
  },
  {
    name: "Package Prices (가격표_extracted.json → 옵션결합상품 sheet)",
    script: "import-package-prices.ts",
  },
  {
    name: "Foil Prices (가격표_extracted.json → 후가공_박 sheet)",
    script: "import-foil-prices.ts",
  },
  // M4: Configuration layer (Step 14)
  {
    name: "Loss Config (hardcoded defaults: global lossRate=0.05)",
    script: "import-loss-config.ts",
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
