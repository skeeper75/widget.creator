/**
 * Count validator - verifies row counts per table
 * @MX:NOTE: [AUTO] Post-import verification for expected record counts
 * @MX:SPEC: SPEC-DATA-003 Milestone 6
 */
import { sql } from 'drizzle-orm';
import {
  optionDefinitions,
  optionChoices,
  productOptions,
  productEditorMappings,
  optionDependencies,
} from '@widget-creator/shared';

type Db = any;

export interface CountCheck {
  tableName: string;
  count: number;
}

export async function getTableCounts(db: Db): Promise<CountCheck[]> {
  const tables = [
    { name: 'option_definitions', table: optionDefinitions },
    { name: 'option_choices', table: optionChoices },
    { name: 'product_options', table: productOptions },
    { name: 'product_editor_mapping', table: productEditorMappings },
    { name: 'option_dependencies', table: optionDependencies },
  ];

  const results: CountCheck[] = [];

  for (const { name, table } of tables) {
    try {
      const rows = await db.select({ count: sql<number>`count(*)` }).from(table);
      results.push({ tableName: name, count: Number(rows[0]?.count ?? 0) });
    } catch {
      results.push({ tableName: name, count: -1 });
    }
  }

  return results;
}
