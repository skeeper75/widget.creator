/**
 * Option dependencies importer
 * Generates and imports option dependency rules based on domain knowledge
 * @MX:NOTE: [AUTO] Uses delete+reinsert strategy since no unique constraint exists
 * @MX:SPEC: SPEC-DATA-003 Milestone 4
 */
import { eq } from 'drizzle-orm';
import { optionDependencies } from '@widget-creator/shared';
import { type ImportResult, createEmptyResult } from './base-importer.js';

type Db = any;

export interface DependencyRule {
  parentOptionKey: string;
  childOptionKey: string;
  dependencyType: 'visibility' | 'choices' | 'value';
  parentChoiceValue?: string;
}

// @MX:ANCHOR: [AUTO] Domain rules defining option dependencies
// @MX:REASON: Business logic for inter-option relationships across all products
const DEPENDENCY_RULES: DependencyRule[] = [
  { parentOptionKey: 'paper', childOptionKey: 'printType', dependencyType: 'choices' },
  { parentOptionKey: 'printType', childOptionKey: 'specialPrint', dependencyType: 'visibility' },
  { parentOptionKey: 'binding', childOptionKey: 'pageCount', dependencyType: 'value' },
  { parentOptionKey: 'foilStamp', childOptionKey: 'foilStampSize', dependencyType: 'visibility' },
  { parentOptionKey: 'size', childOptionKey: 'quantity', dependencyType: 'value' },
];

export function generateDependencyRules(
  productOptionKeys: Set<string>,
): DependencyRule[] {
  return DEPENDENCY_RULES.filter(
    rule =>
      productOptionKeys.has(rule.parentOptionKey) &&
      productOptionKeys.has(rule.childOptionKey),
  );
}

export interface OptionDependenciesImportOptions {
  optionKeyToId: Map<string, number>;
  productOptionMap: Map<number, Set<string>>;
  dryRun?: boolean;
}

export async function importOptionDependencies(
  db: Db,
  options: OptionDependenciesImportOptions,
): Promise<ImportResult> {
  const result = createEmptyResult();

  // Collect all dependency records to insert
  const allRecords: Array<{
    productId: number;
    parentOptionId: number;
    childOptionId: number;
    dependencyType: string;
  }> = [];

  for (const [productId, optionKeys] of options.productOptionMap) {
    const rules = generateDependencyRules(optionKeys);
    for (const rule of rules) {
      const parentOptionId = options.optionKeyToId.get(rule.parentOptionKey);
      const childOptionId = options.optionKeyToId.get(rule.childOptionKey);
      if (!parentOptionId || !childOptionId) continue;

      allRecords.push({
        productId,
        parentOptionId,
        childOptionId,
        dependencyType: rule.dependencyType,
      });
    }
  }

  result.total = allRecords.length;

  if (allRecords.length === 0) return result;

  if (options.dryRun) {
    result.skipped = allRecords.length;
    return result;
  }

  // @MX:WARN: [AUTO] Delete+reinsert strategy: all existing dependencies for affected products are deleted before reinsertion
  // @MX:REASON: No unique constraint on option_dependencies table; upsert not possible
  await db.transaction(async (tx: any) => {
    // Delete existing dependencies for all affected products
    const productIds = [...options.productOptionMap.keys()];
    for (const productId of productIds) {
      await tx
        .delete(optionDependencies)
        .where(eq(optionDependencies.productId, productId));
    }

    // Insert all new dependency records
    for (const rec of allRecords) {
      await tx
        .insert(optionDependencies)
        .values({
          productId: rec.productId,
          parentOptionId: rec.parentOptionId,
          childOptionId: rec.childOptionId,
          dependencyType: rec.dependencyType,
        });

      result.inserted++;
    }
  });

  return result;
}
