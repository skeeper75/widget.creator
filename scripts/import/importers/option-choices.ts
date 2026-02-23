/**
 * Option choices importer
 * Upserts deduplicated choices with FK resolution
 * @MX:NOTE: [AUTO] Resolves optionDefinitionId from optionKey lookup map
 * @MX:SPEC: SPEC-DATA-003 Milestone 2
 */
import { optionChoices } from '@widget-creator/shared';
import type { OptionChoiceRecord } from '../parsers/mes-json-parser.js';
import { type ImportResult, createEmptyResult } from './base-importer.js';

type Db = any;

export interface OptionChoicesImportOptions {
  optionKeyToId: Map<string, number>;
  dryRun?: boolean;
}

export async function importOptionChoices(
  db: Db,
  choices: OptionChoiceRecord[],
  options: OptionChoicesImportOptions,
): Promise<ImportResult> {
  const result = createEmptyResult();
  result.total = choices.length;

  if (choices.length === 0) return result;

  if (options.dryRun) {
    result.skipped = choices.length;
    return result;
  }

  await db.transaction(async (tx: any) => {
    for (const choice of choices) {
      const optionDefinitionId = options.optionKeyToId.get(choice.optionKey);
      if (!optionDefinitionId) {
        result.skipped++;
        continue;
      }

      await tx
        .insert(optionChoices)
        .values({
          optionDefinitionId,
          code: choice.code,
          name: choice.name,
          priceKey: choice.priceKey,
          displayOrder: choice.displayOrder,
        })
        .onConflictDoUpdate({
          target: [optionChoices.optionDefinitionId, optionChoices.code],
          set: {
            name: choice.name,
            priceKey: choice.priceKey,
            displayOrder: choice.displayOrder,
          },
        });

      result.inserted++;
    }
  });

  return result;
}
