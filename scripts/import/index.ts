/**
 * Import orchestrator and CLI entry point
 * @MX:NOTE: [AUTO] Parses CLI flags and executes import phases in dependency order
 * @MX:SPEC: SPEC-DATA-003 Milestone 5
 *
 * Usage:
 *   npx tsx scripts/import/index.ts [--force] [--dry-run] [--table TABLE] [--domain DOMAIN] [--validate-only]
 *
 * Domains: options, integration, all
 * Tables: option_definitions, option_choices, product_options, option_dependencies,
 *         product_editor_mapping, product_mes_mapping
 */
import * as fs from 'node:fs';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import postgres from 'postgres';

import { products, optionDefinitions } from '@widget-creator/shared';
import { getConfig } from './config.js';
import { computeFileHash, shouldSkipImport, createImportLog, completeImportLog } from './version-manager.js';
import {
  parseMesJson,
  extractOptionDefinitions,
  extractOptionChoices,
  extractProductOptions,
  extractEditorMappings,
  type MesJsonData,
} from './parsers/mes-json-parser.js';
import { importOptionDefinitions } from './importers/option-definitions.js';
import { importOptionChoices } from './importers/option-choices.js';
import { importProductOptions } from './importers/product-options.js';
import { importProductEditorMappings } from './importers/product-editor-mapping.js';
import { importOptionDependencies } from './importers/option-dependencies.js';
import { validateCrossReferences } from './validators/cross-reference.js';
import { getTableCounts } from './validators/count-validator.js';

// ============================================================
// CLI argument parsing
// ============================================================

interface CliArgs {
  force: boolean;
  dryRun: boolean;
  table: string | null;
  domain: string;
  validateOnly: boolean;
}

function parseCliArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    force: false,
    dryRun: false,
    table: null,
    domain: 'all',
    validateOnly: false,
  };

  for (let i = 2; i < argv.length; i++) {
    switch (argv[i]) {
      case '--force':
        args.force = true;
        break;
      case '--dry-run':
        args.dryRun = true;
        break;
      case '--table':
        args.table = argv[++i];
        break;
      case '--domain':
        args.domain = argv[++i];
        break;
      case '--validate-only':
        args.validateOnly = true;
        break;
    }
  }

  return args;
}

// ============================================================
// Lookup map builders
// ============================================================

async function buildMesItemCdToProductId(
  db: any,
  mesProducts: MesJsonData['products'],
): Promise<Map<string, number>> {
  // Build shopbyId -> MesItemCd from MES data
  const shopbyToMesItemCd = new Map<number, string>();
  for (const p of mesProducts) {
    if (p.shopbyId !== null) {
      shopbyToMesItemCd.set(p.shopbyId, p.MesItemCd);
    }
  }

  // Query DB products by huni_code (which corresponds to shopbyId)
  const dbProducts = await db
    .select({ id: products.id, huniCode: products.huniCode, shopbyId: products.shopbyId })
    .from(products);

  const map = new Map<string, number>();
  for (const dbProd of dbProducts) {
    // Try shopbyId match first
    if (dbProd.shopbyId && shopbyToMesItemCd.has(dbProd.shopbyId)) {
      const mesItemCd = shopbyToMesItemCd.get(dbProd.shopbyId)!;
      map.set(mesItemCd, dbProd.id);
    }
  }

  return map;
}

async function buildShopbyIdToProductId(db: any): Promise<Map<number, number>> {
  const dbProducts = await db
    .select({ id: products.id, shopbyId: products.shopbyId })
    .from(products);

  const map = new Map<number, number>();
  for (const p of dbProducts) {
    if (p.shopbyId !== null) {
      map.set(p.shopbyId, p.id);
    }
  }
  return map;
}

async function buildOptionKeyToId(db: any): Promise<Map<string, number>> {
  const rows = await db
    .select({ id: optionDefinitions.id, key: optionDefinitions.key })
    .from(optionDefinitions);

  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.key, row.id);
  }
  return map;
}

// ============================================================
// Main orchestrator
// ============================================================

// @MX:ANCHOR: [AUTO] Import pipeline orchestrator executing phases in dependency order
// @MX:REASON: fan_in >= 3 (CLI entry point, all importers/validators are coordinated here)
async function main(): Promise<void> {
  const args = parseCliArgs(process.argv);
  const config = getConfig();

  console.log('=== SPEC-DATA-003 Import Pipeline ===');
  console.log(`Mode: ${args.dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`Force: ${args.force}`);
  console.log(`Domain: ${args.domain}`);
  if (args.table) console.log(`Table: ${args.table}`);
  console.log('');

  // Connect to DB
  // @MX:WARN: [AUTO] Non-null assertion on DATABASE_URL; runtime guard below prevents undefined usage
  // @MX:REASON: TypeScript non-null assertion (!) bypasses type safety; process.exit(1) mitigates
  const connectionString = process.env.DATABASE_URL!;
  if (!connectionString) {
    console.error('ERROR: DATABASE_URL environment variable is required');
    process.exit(1);
  }
  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client);

  try {
    // Load and parse MES JSON
    console.log(`Loading MES JSON from: ${config.mesJsonPath}`);
    const raw = fs.readFileSync(config.mesJsonPath, 'utf-8');
    const mesData = parseMesJson(JSON.parse(raw));
    const sourceHash = computeFileHash(config.mesJsonPath);
    console.log(`Source hash: ${sourceHash.substring(0, 16)}...`);
    console.log(`Products: ${mesData.products.length}, Options: ${mesData.options.length}, Choices: ${mesData.choices.length}`);
    console.log('');

    if (args.validateOnly) {
      console.log('--- Validation Only ---');
      const crossRef = await validateCrossReferences(db, {
        mesProductCount: mesData.products.length,
        mesEditorCount: mesData.products.filter(p => p.editor === 'O').length,
        mesOptionKeyCount: mesData.summary.optionKeys,
        mesPriceKeyFilledCount: mesData.summary.priceKeyFilled,
      });
      for (const check of crossRef.checks) {
        const status = check.passed ? 'PASS' : 'FAIL';
        console.log(`  [${status}] ${check.name}: expected=${check.expected}, actual=${check.actual}`);
      }
      console.log('');
      const counts = await getTableCounts(db);
      console.log('--- Table Counts ---');
      for (const c of counts) {
        console.log(`  ${c.tableName}: ${c.count}`);
      }
      await client.end();
      return;
    }

    // Extract data from MES JSON
    const optionDefs = extractOptionDefinitions(mesData.options);
    const optionChoicesData = extractOptionChoices(mesData.choices);
    const productOptsData = extractProductOptions(mesData.options);
    const editorMappingsData = extractEditorMappings(mesData.products);

    const shouldRunTable = (tableName: string): boolean => {
      if (args.table) return args.table === tableName;
      if (args.domain === 'options') {
        return ['option_definitions', 'option_choices', 'product_options', 'option_dependencies'].includes(tableName);
      }
      if (args.domain === 'integration') {
        return ['product_editor_mapping', 'product_mes_mapping'].includes(tableName);
      }
      return true; // domain=all
    };

    // Phase 1: Option Definitions
    if (shouldRunTable('option_definitions')) {
      console.log('--- Phase 1: Option Definitions ---');
      const skip = await shouldSkipImport(db, 'option_definitions', sourceHash, args.force);
      if (skip) {
        console.log('  SKIPPED (source unchanged)');
      } else {
        const logEntry = await createImportLog(db, {
          tableName: 'option_definitions',
          sourceFile: config.mesJsonPath,
          sourceHash,
          importVersion: 1,
        });
        const result = await importOptionDefinitions(db, optionDefs, { dryRun: args.dryRun });
        await completeImportLog(db, logEntry.id, {
          recordsTotal: result.total,
          recordsInserted: result.inserted,
          recordsUpdated: result.updated,
          recordsSkipped: result.skipped,
          recordsErrored: result.errored,
          status: 'completed',
        });
        console.log(`  Total: ${result.total}, Inserted: ${result.inserted}, Updated: ${result.updated}`);
      }
      console.log('');
    }

    // Phase 2: Option Choices
    if (shouldRunTable('option_choices')) {
      console.log('--- Phase 2: Option Choices ---');
      const skip = await shouldSkipImport(db, 'option_choices', sourceHash, args.force);
      if (skip) {
        console.log('  SKIPPED (source unchanged)');
      } else {
        const optionKeyToId = await buildOptionKeyToId(db);
        const logEntry = await createImportLog(db, {
          tableName: 'option_choices',
          sourceFile: config.mesJsonPath,
          sourceHash,
          importVersion: 1,
        });
        const result = await importOptionChoices(db, optionChoicesData, {
          optionKeyToId,
          dryRun: args.dryRun,
        });
        await completeImportLog(db, logEntry.id, {
          recordsTotal: result.total,
          recordsInserted: result.inserted,
          recordsUpdated: result.updated,
          recordsSkipped: result.skipped,
          recordsErrored: result.errored,
          status: 'completed',
        });
        console.log(`  Total: ${result.total}, Inserted: ${result.inserted}, Skipped: ${result.skipped}`);
      }
      console.log('');
    }

    // Phase 3: Product Options
    if (shouldRunTable('product_options')) {
      console.log('--- Phase 3: Product Options ---');
      const skip = await shouldSkipImport(db, 'product_options', sourceHash, args.force);
      if (skip) {
        console.log('  SKIPPED (source unchanged)');
      } else {
        const optionKeyToId = await buildOptionKeyToId(db);
        const mesItemCdToProductId = await buildMesItemCdToProductId(db, mesData.products);
        const logEntry = await createImportLog(db, {
          tableName: 'product_options',
          sourceFile: config.mesJsonPath,
          sourceHash,
          importVersion: 1,
        });
        const result = await importProductOptions(db, productOptsData, {
          optionKeyToId,
          mesItemCdToProductId,
          dryRun: args.dryRun,
        });
        await completeImportLog(db, logEntry.id, {
          recordsTotal: result.total,
          recordsInserted: result.inserted,
          recordsUpdated: result.updated,
          recordsSkipped: result.skipped,
          recordsErrored: result.errored,
          status: 'completed',
        });
        console.log(`  Total: ${result.total}, Inserted: ${result.inserted}, Skipped: ${result.skipped}`);
      }
      console.log('');
    }

    // Phase 4: Product Editor Mapping
    if (shouldRunTable('product_editor_mapping')) {
      console.log('--- Phase 4: Product Editor Mapping ---');
      const skip = await shouldSkipImport(db, 'product_editor_mapping', sourceHash, args.force);
      if (skip) {
        console.log('  SKIPPED (source unchanged)');
      } else {
        const shopbyIdToProductId = await buildShopbyIdToProductId(db);
        const logEntry = await createImportLog(db, {
          tableName: 'product_editor_mapping',
          sourceFile: config.mesJsonPath,
          sourceHash,
          importVersion: 1,
        });
        const result = await importProductEditorMappings(db, editorMappingsData, {
          shopbyIdToProductId,
          dryRun: args.dryRun,
        });
        await completeImportLog(db, logEntry.id, {
          recordsTotal: result.total,
          recordsInserted: result.inserted,
          recordsUpdated: result.updated,
          recordsSkipped: result.skipped,
          recordsErrored: result.errored,
          status: 'completed',
        });
        console.log(`  Total: ${result.total}, Inserted: ${result.inserted}, Skipped: ${result.skipped}`);
      }
      console.log('');
    }

    // Phase 5: Option Dependencies
    if (shouldRunTable('option_dependencies')) {
      console.log('--- Phase 5: Option Dependencies ---');
      const skip = await shouldSkipImport(db, 'option_dependencies', sourceHash, args.force);
      if (skip) {
        console.log('  SKIPPED (source unchanged)');
      } else {
        const optionKeyToId = await buildOptionKeyToId(db);
        const mesItemCdToProductId = await buildMesItemCdToProductId(db, mesData.products);

        // Build product-option mapping
        const productOptionMap = new Map<number, Set<string>>();
        for (const po of productOptsData) {
          const productId = mesItemCdToProductId.get(po.mesItemCd);
          if (!productId) continue;
          if (!productOptionMap.has(productId)) {
            productOptionMap.set(productId, new Set());
          }
          productOptionMap.get(productId)!.add(po.optionKey);
        }

        const logEntry = await createImportLog(db, {
          tableName: 'option_dependencies',
          sourceFile: config.mesJsonPath,
          sourceHash,
          importVersion: 1,
        });
        const result = await importOptionDependencies(db, {
          optionKeyToId,
          productOptionMap,
          dryRun: args.dryRun,
        });
        await completeImportLog(db, logEntry.id, {
          recordsTotal: result.total,
          recordsInserted: result.inserted,
          recordsUpdated: result.updated,
          recordsSkipped: result.skipped,
          recordsErrored: result.errored,
          status: 'completed',
        });
        console.log(`  Total: ${result.total}, Inserted: ${result.inserted}`);
      }
      console.log('');
    }

    // Phase 6: Validation
    console.log('--- Phase 6: Post-Import Validation ---');
    const crossRef = await validateCrossReferences(db, {
      mesProductCount: mesData.products.length,
      mesEditorCount: editorMappingsData.length,
      mesOptionKeyCount: mesData.summary.optionKeys,
      mesPriceKeyFilledCount: mesData.summary.priceKeyFilled,
    });
    for (const check of crossRef.checks) {
      const status = check.passed ? 'PASS' : 'FAIL';
      console.log(`  [${status}] ${check.name}: expected=${check.expected}, actual=${check.actual}`);
    }
    console.log('');

    const counts = await getTableCounts(db);
    console.log('--- Final Table Counts ---');
    for (const c of counts) {
      console.log(`  ${c.tableName}: ${c.count}`);
    }

    console.log('');
    console.log('=== Import Pipeline Complete ===');
  } catch (error) {
    console.error('Import pipeline failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
