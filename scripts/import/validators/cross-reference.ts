/**
 * Cross-reference validator
 * Validates data consistency between MES JSON and DB state
 * @MX:NOTE: [AUTO] Compares expected counts from MES JSON against actual DB counts
 * @MX:SPEC: SPEC-DATA-003 Milestone 6
 */
import { sql } from 'drizzle-orm';
import {
  products,
  optionDefinitions,
  productEditorMappings,
  optionChoices,
} from '@widget-creator/shared';

type Db = any;

export interface CrossReferenceCheck {
  name: string;
  expected: number;
  actual: number;
  passed: boolean;
}

export interface CrossReferenceResult {
  checks: CrossReferenceCheck[];
  allPassed: boolean;
}

export interface CrossReferenceInput {
  mesProductCount: number;
  mesEditorCount: number;
  mesOptionKeyCount: number;
  mesPriceKeyFilledCount: number;
}

export async function validateCrossReferences(
  db: Db,
  input: CrossReferenceInput,
): Promise<CrossReferenceResult> {
  const checks: CrossReferenceCheck[] = [];

  // Check 1: Product count
  try {
    const dbProducts = await db.select({ count: sql<number>`count(*)` }).from(products);
    const actual = Number(dbProducts[0]?.count ?? 0);
    checks.push({
      name: 'Product count (MES JSON vs DB)',
      expected: input.mesProductCount,
      actual,
      passed: actual >= input.mesProductCount,
    });
  } catch {
    checks.push({
      name: 'Product count (MES JSON vs DB)',
      expected: input.mesProductCount,
      actual: 0,
      passed: false,
    });
  }

  // Check 2: Editor mapping count
  try {
    const dbEditors = await db.select({ count: sql<number>`count(*)` }).from(productEditorMappings);
    const actual = Number(dbEditors[0]?.count ?? 0);
    checks.push({
      name: 'Editor mapping count (MES JSON vs DB)',
      expected: input.mesEditorCount,
      actual,
      passed: actual >= input.mesEditorCount,
    });
  } catch {
    checks.push({
      name: 'Editor mapping count (MES JSON vs DB)',
      expected: input.mesEditorCount,
      actual: 0,
      passed: false,
    });
  }

  // Check 3: Option definition count
  try {
    const dbOptions = await db.select({ count: sql<number>`count(*)` }).from(optionDefinitions);
    const actual = Number(dbOptions[0]?.count ?? 0);
    checks.push({
      name: 'Option key count (MES JSON vs DB)',
      expected: input.mesOptionKeyCount,
      actual,
      passed: actual >= input.mesOptionKeyCount,
    });
  } catch {
    checks.push({
      name: 'Option key count (MES JSON vs DB)',
      expected: input.mesOptionKeyCount,
      actual: 0,
      passed: false,
    });
  }

  // Check 4: PriceKey filled count
  try {
    const dbPriceKeys = await db
      .select({ count: sql<number>`count(*)` })
      .from(optionChoices)
      .where(sql`${optionChoices.priceKey} IS NOT NULL`);
    const actual = Number(dbPriceKeys[0]?.count ?? 0);
    checks.push({
      name: 'PriceKey filled count (MES JSON vs DB)',
      expected: input.mesPriceKeyFilledCount,
      actual,
      passed: actual >= input.mesPriceKeyFilledCount,
    });
  } catch {
    checks.push({
      name: 'PriceKey filled count (MES JSON vs DB)',
      expected: input.mesPriceKeyFilledCount,
      actual: 0,
      passed: false,
    });
  }

  return {
    checks,
    allPassed: checks.every(c => c.passed),
  };
}
