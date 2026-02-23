/**
 * Product editor mapping importer
 * Imports editor (Edicus) mappings for products with editor="O"
 * @MX:NOTE: [AUTO] Upserts on productId unique constraint
 * @MX:SPEC: SPEC-DATA-003 Milestone 3
 */
import { productEditorMappings } from '@widget-creator/shared';
import type { EditorMappingRecord } from '../parsers/mes-json-parser.js';
import { type ImportResult, createEmptyResult } from './base-importer.js';

type Db = any;

export interface EditorMappingImportOptions {
  shopbyIdToProductId: Map<number, number>;
  dryRun?: boolean;
}

export async function importProductEditorMappings(
  db: Db,
  mappings: EditorMappingRecord[],
  options: EditorMappingImportOptions,
): Promise<ImportResult> {
  const result = createEmptyResult();
  result.total = mappings.length;

  if (mappings.length === 0) return result;

  if (options.dryRun) {
    result.skipped = mappings.length;
    return result;
  }

  await db.transaction(async (tx: any) => {
    for (const mapping of mappings) {
      const productId = options.shopbyIdToProductId.get(mapping.shopbyId);
      if (!productId) {
        result.skipped++;
        continue;
      }

      await tx
        .insert(productEditorMappings)
        .values({
          productId,
          editorType: mapping.editorType,
        })
        .onConflictDoUpdate({
          target: productEditorMappings.productId,
          set: {
            editorType: mapping.editorType,
          },
        });

      result.inserted++;
    }
  });

  return result;
}
