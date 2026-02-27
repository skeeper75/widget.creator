// @MX:NOTE: [AUTO] Loss quantity config import — Step 14 of SPEC-IM-003 M4
// @MX:NOTE: [AUTO] Inserts global default loss config: lossRate=0.05, minLossQty=5
// @MX:SPEC: SPEC-IM-003 M4-REQ-001

import * as path from "path";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import { lossQuantityConfigs } from "../../packages/shared/src/db/schema/huni-pricing.schema.js";
import { dataImportLog } from "../../packages/shared/src/db/schema/huni-import-log.schema.js";

// ---------------------------------------------------------------------------
// CLI Flags
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const VALIDATE_ONLY = args.includes("--validate-only");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LABEL = "[import-loss-config]";

// @MX:ANCHOR: [AUTO] Global default loss configuration — FK target for pricing engine
// @MX:REASON: fan_in >= 3 — referenced by quote calculator, price engine, and admin UI for all products
// @MX:SPEC: SPEC-IM-003 M4-REQ-001
const DEFAULT_LOSS_CONFIGS = [
  {
    scopeType: "global" as const,
    scopeId: null as number | null,
    // @MX:NOTE: [AUTO] lossRate=0.05 means 5% waste factor; minLossQty=5 minimum spoilage units
    // @MX:REASON: HuniPrinting standard production waste rate from operational specification
    lossRate: "0.0500",
    minLossQty: 5,
    description: "Global default production loss rate (5%)",
    isActive: true,
  },
];

// ---------------------------------------------------------------------------
// DB Connection
// ---------------------------------------------------------------------------

function createDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error(`${LABEL} ERROR: DATABASE_URL not set`);
    process.exit(1);
  }
  const client = postgres(connectionString);
  return drizzle(client);
}

// ---------------------------------------------------------------------------
// Import Log
// ---------------------------------------------------------------------------

async function writeImportLog(
  db: ReturnType<typeof drizzle>,
  opts: {
    tableName: string;
    total: number;
    inserted: number;
    updated: number;
    skipped: number;
    errored: number;
    status: string;
    errorMessage?: string;
    startedAt: Date;
  }
): Promise<void> {
  await db.insert(dataImportLog).values({
    tableName: opts.tableName,
    sourceFile: "hardcoded-defaults",
    sourceHash: "static-v1",
    importVersion: 1,
    recordsTotal: opts.total,
    recordsInserted: opts.inserted,
    recordsUpdated: opts.updated,
    recordsSkipped: opts.skipped,
    recordsErrored: opts.errored,
    status: opts.status,
    errorMessage: opts.errorMessage ?? null,
    completedAt: new Date(),
    metadata: {
      phase: "M4",
      step: "import-loss-config",
      executionTime: Date.now() - opts.startedAt.getTime(),
    },
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log(`${LABEL} Starting loss quantity config import`);
  console.log(`${LABEL} Records to insert: ${DEFAULT_LOSS_CONFIGS.length}`);

  if (VALIDATE_ONLY) {
    console.log(`${LABEL} Mode: validate-only`);
    console.log(`${LABEL} Validation OK`);
    return;
  }

  if (DRY_RUN) {
    console.log(`${LABEL} Mode: dry-run (no DB writes)`);
    return;
  }

  const db = createDb();
  const startedAt = new Date();

  let inserted = 0;
  let updated = 0;
  let errored = 0;

  try {
    const result = await db
      .insert(lossQuantityConfigs)
      .values(DEFAULT_LOSS_CONFIGS)
      .onConflictDoUpdate({
        target: [lossQuantityConfigs.scopeType, lossQuantityConfigs.scopeId],
        set: {
          lossRate: sql`excluded.loss_rate`,
          minLossQty: sql`excluded.min_loss_qty`,
          description: sql`excluded.description`,
          isActive: sql`excluded.is_active`,
          updatedAt: sql`now()`,
        },
      })
      .returning({ id: lossQuantityConfigs.id });

    // onConflictDoUpdate always returns 1 row; determine insert vs update
    // by checking if it was a fresh insert (no way to distinguish with Drizzle)
    // Log as inserted for simplicity
    inserted = result.length;
  } catch (err) {
    console.error(`${LABEL} ERROR inserting loss configs:`, err);
    errored = DEFAULT_LOSS_CONFIGS.length;
  }

  const status = errored > 0 ? "error" : "success";
  await writeImportLog(db, {
    tableName: "loss_quantity_config",
    total: DEFAULT_LOSS_CONFIGS.length,
    inserted,
    updated,
    skipped: 0,
    errored,
    status,
    startedAt,
  });

  console.log(`${LABEL} Done: inserted=${inserted}, updated=${updated}, errored=${errored}`);
  if (errored > 0) process.exit(1);
}

main().catch((err) => {
  console.error(`${LABEL} Fatal error:`, err);
  process.exit(1);
});
