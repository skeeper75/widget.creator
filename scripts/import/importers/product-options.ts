/**
 * Product options importer
 * Imports product-option associations with FK resolution
 * @MX:NOTE: [AUTO] Resolves productId via MesItemCd -> shopbyId -> huni_code mapping
 * @MX:SPEC: SPEC-DATA-003 Milestone 3
 */
import { productOptions } from '@widget-creator/shared';
import type { ProductOptionRecord } from '../parsers/mes-json-parser.js';
import { type ImportResult, createEmptyResult } from './base-importer.js';

type Db = any;

export interface ProductOptionsImportOptions {
  optionKeyToId: Map<string, number>;
  mesItemCdToProductId: Map<string, number>;
  dryRun?: boolean;
}

export async function importProductOptions(
  db: Db,
  records: ProductOptionRecord[],
  options: ProductOptionsImportOptions,
): Promise<ImportResult> {
  const result = createEmptyResult();
  result.total = records.length;

  if (records.length === 0) return result;

  if (options.dryRun) {
    result.skipped = records.length;
    return result;
  }

  await db.transaction(async (tx: any) => {
    for (const rec of records) {
      const productId = options.mesItemCdToProductId.get(rec.mesItemCd);
      const optionDefinitionId = options.optionKeyToId.get(rec.optionKey);

      if (!productId || !optionDefinitionId) {
        result.skipped++;
        continue;
      }

      await tx
        .insert(productOptions)
        .values({
          productId,
          optionDefinitionId,
          displayOrder: rec.displayOrder,
          isRequired: rec.isRequired,
        })
        .onConflictDoUpdate({
          target: [productOptions.productId, productOptions.optionDefinitionId],
          set: {
            displayOrder: rec.displayOrder,
            isRequired: rec.isRequired,
          },
        });

      result.inserted++;
    }
  });

  return result;
}
