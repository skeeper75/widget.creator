/**
 * Option definitions importer
 * Upserts 30 unique option definitions from MES JSON
 * @MX:NOTE: [AUTO] Upserts on key UNIQUE constraint
 * @MX:SPEC: SPEC-DATA-003 Milestone 2
 */
import { optionDefinitions } from '@widget-creator/shared';
import type { OptionDefinitionRecord } from '../parsers/mes-json-parser.js';
import { type ImportResult, type ImportOptions, createEmptyResult } from './base-importer.js';

type Db = any;

export async function importOptionDefinitions(
  db: Db,
  definitions: OptionDefinitionRecord[],
  options: ImportOptions = {},
): Promise<ImportResult> {
  const result = createEmptyResult();
  result.total = definitions.length;

  if (definitions.length === 0) return result;

  if (options.dryRun) {
    result.skipped = definitions.length;
    return result;
  }

  await db.transaction(async (tx: any) => {
    for (const def of definitions) {
      await tx
        .insert(optionDefinitions)
        .values({
          key: def.key,
          name: def.name,
          optionClass: def.optionClass,
          optionType: def.optionType,
          uiComponent: def.uiComponent,
          description: def.description,
          displayOrder: def.displayOrder,
        })
        .onConflictDoUpdate({
          target: optionDefinitions.key,
          set: {
            name: def.name,
            optionClass: def.optionClass,
            optionType: def.optionType,
            uiComponent: def.uiComponent,
            description: def.description,
            displayOrder: def.displayOrder,
          },
        });
    }
  });

  result.inserted = definitions.length;
  return result;
}
