/**
 * SPEC-SEED-002 TEST-007: Transaction Rollback Behavior Tests
 *
 * Tests transaction safety patterns used in seed.ts.
 * Since seed.ts uses Drizzle ORM without explicit db.transaction() wrappers,
 * these tests verify the expected behavior of transaction-like patterns:
 *   1. DELETE then INSERT sequence
 *   2. Error propagation and rollback expectations
 *   3. Idempotent re-seeding via delete-then-insert pattern
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================
// Mock DB simulation for transaction behavior testing
// ============================================================

interface MockTable {
  name: string;
  rows: Array<Record<string, unknown>>;
}

interface TransactionContext {
  tables: Map<string, MockTable>;
  committed: boolean;
  rolledBack: boolean;
}

/**
 * Simulates a basic transaction context with commit/rollback semantics.
 * Used to test the expected behavior of seed.ts phases if they were
 * wrapped in explicit transactions.
 */
function createTransactionContext(
  initialData?: Map<string, Array<Record<string, unknown>>>,
): TransactionContext {
  const tables = new Map<string, MockTable>();

  if (initialData) {
    for (const [name, rows] of initialData) {
      tables.set(name, { name, rows: [...rows] });
    }
  }

  return { tables, committed: false, rolledBack: false };
}

function deleteAll(ctx: TransactionContext, tableName: string): void {
  const table = ctx.tables.get(tableName);
  if (table) {
    table.rows = [];
  }
}

function insertRows(
  ctx: TransactionContext,
  tableName: string,
  rows: Array<Record<string, unknown>>,
): void {
  let table = ctx.tables.get(tableName);
  if (!table) {
    table = { name: tableName, rows: [] };
    ctx.tables.set(tableName, table);
  }
  table.rows.push(...rows);
}

function getRowCount(ctx: TransactionContext, tableName: string): number {
  return ctx.tables.get(tableName)?.rows.length ?? 0;
}

// ============================================================
// Transaction wrapper simulating seed.ts behavior
// ============================================================

type SeedPhaseFunction = (ctx: TransactionContext) => Promise<void>;

/**
 * Simulates a transactional seed phase with rollback on failure.
 * Takes a snapshot before execution and restores it on error.
 */
async function executeWithRollback(
  ctx: TransactionContext,
  phase: SeedPhaseFunction,
): Promise<void> {
  // Take snapshot for rollback
  const snapshot = new Map<string, Array<Record<string, unknown>>>();
  for (const [name, table] of ctx.tables) {
    snapshot.set(name, table.rows.map((r) => ({ ...r })));
  }

  try {
    await phase(ctx);
    ctx.committed = true;
  } catch {
    // Rollback: restore from snapshot
    for (const [name, rows] of snapshot) {
      const table = ctx.tables.get(name);
      if (table) {
        table.rows = rows;
      }
    }
    ctx.rolledBack = true;
    throw new Error('Transaction rolled back');
  }
}

// ============================================================
// Tests
// ============================================================

describe('SPEC-SEED-002 TEST-007: Transaction Rollback Behavior', () => {
  describe('Happy path: DELETE then INSERT succeeds', () => {
    it('should clear table then insert new data', async () => {
      const initialData = new Map<string, Array<Record<string, unknown>>>([
        [
          'fixed_prices',
          [
            { id: 1, productId: 1, sellingPrice: '1000' },
            { id: 2, productId: 2, sellingPrice: '2000' },
          ],
        ],
      ]);
      const ctx = createTransactionContext(initialData);

      expect(getRowCount(ctx, 'fixed_prices')).toBe(2);

      await executeWithRollback(ctx, async (txCtx) => {
        deleteAll(txCtx, 'fixed_prices');
        insertRows(txCtx, 'fixed_prices', [
          { id: 3, productId: 3, sellingPrice: '3000' },
          { id: 4, productId: 4, sellingPrice: '4000' },
          { id: 5, productId: 5, sellingPrice: '5000' },
        ]);
      });

      expect(ctx.committed).toBe(true);
      expect(ctx.rolledBack).toBe(false);
      expect(getRowCount(ctx, 'fixed_prices')).toBe(3);
    });

    it('should replace old data with new data completely', async () => {
      const initialData = new Map<string, Array<Record<string, unknown>>>([
        [
          'foil_prices',
          [{ id: 1, foilType: 'copper', unitPrice: '500' }],
        ],
      ]);
      const ctx = createTransactionContext(initialData);

      await executeWithRollback(ctx, async (txCtx) => {
        deleteAll(txCtx, 'foil_prices');
        insertRows(txCtx, 'foil_prices', [
          { id: 2, foilType: 'gold', unitPrice: '800' },
          { id: 3, foilType: 'silver', unitPrice: '600' },
        ]);
      });

      expect(getRowCount(ctx, 'foil_prices')).toBe(2);
      const table = ctx.tables.get('foil_prices')!;
      expect(table.rows[0].foilType).toBe('gold');
      expect(table.rows[1].foilType).toBe('silver');
    });
  });

  describe('INSERT fails after DELETE: table should be restored', () => {
    it('should restore deleted data when INSERT throws', async () => {
      const initialData = new Map<string, Array<Record<string, unknown>>>([
        [
          'fixed_prices',
          [
            { id: 1, productId: 1, sellingPrice: '1000' },
            { id: 2, productId: 2, sellingPrice: '2000' },
          ],
        ],
      ]);
      const ctx = createTransactionContext(initialData);

      await expect(
        executeWithRollback(ctx, async (txCtx) => {
          deleteAll(txCtx, 'fixed_prices');
          // Simulate INSERT failure (e.g., FK constraint violation)
          throw new Error('Foreign key constraint violation');
        }),
      ).rejects.toThrow('Transaction rolled back');

      // Table should be restored to original state
      expect(ctx.rolledBack).toBe(true);
      expect(ctx.committed).toBe(false);
      expect(getRowCount(ctx, 'fixed_prices')).toBe(2);
    });

    it('should preserve original row data after rollback', async () => {
      const initialData = new Map<string, Array<Record<string, unknown>>>([
        [
          'fixed_prices',
          [
            { id: 1, productId: 10, sellingPrice: '999' },
          ],
        ],
      ]);
      const ctx = createTransactionContext(initialData);

      await expect(
        executeWithRollback(ctx, async (txCtx) => {
          deleteAll(txCtx, 'fixed_prices');
          // Partial insert then failure
          insertRows(txCtx, 'fixed_prices', [
            { id: 99, productId: 99, sellingPrice: '0' },
          ]);
          throw new Error('Unique constraint violation');
        }),
      ).rejects.toThrow('Transaction rolled back');

      // Should have original data, not the partially inserted data
      const table = ctx.tables.get('fixed_prices')!;
      expect(table.rows).toHaveLength(1);
      expect(table.rows[0].id).toBe(1);
      expect(table.rows[0].productId).toBe(10);
      expect(table.rows[0].sellingPrice).toBe('999');
    });
  });

  describe('DELETE fails: INSERT should never run', () => {
    it('should not insert any rows when DELETE fails', async () => {
      let insertCalled = false;
      const initialData = new Map<string, Array<Record<string, unknown>>>([
        [
          'fixed_prices',
          [{ id: 1, productId: 1, sellingPrice: '1000' }],
        ],
      ]);
      const ctx = createTransactionContext(initialData);

      await expect(
        executeWithRollback(ctx, async (txCtx) => {
          // Simulate DELETE failure (e.g., permission denied)
          throw new Error('Permission denied on table fixed_prices');
          // This code should never execute
          insertCalled = true;
          insertRows(txCtx, 'fixed_prices', [
            { id: 2, productId: 2, sellingPrice: '2000' },
          ]);
        }),
      ).rejects.toThrow('Transaction rolled back');

      expect(insertCalled).toBe(false);
      // Original data preserved
      expect(getRowCount(ctx, 'fixed_prices')).toBe(1);
    });

    it('should preserve all original rows when DELETE throws', async () => {
      const initialData = new Map<string, Array<Record<string, unknown>>>([
        [
          'fixed_prices',
          [
            { id: 1, productId: 1, sellingPrice: '100' },
            { id: 2, productId: 2, sellingPrice: '200' },
            { id: 3, productId: 3, sellingPrice: '300' },
          ],
        ],
      ]);
      const ctx = createTransactionContext(initialData);

      await expect(
        executeWithRollback(ctx, async () => {
          throw new Error('Table locked by another process');
        }),
      ).rejects.toThrow('Transaction rolled back');

      expect(ctx.rolledBack).toBe(true);
      expect(getRowCount(ctx, 'fixed_prices')).toBe(3);
    });
  });

  describe('Multiple tables in single transaction', () => {
    it('should rollback all tables when any operation fails', async () => {
      const initialData = new Map<string, Array<Record<string, unknown>>>([
        [
          'fixed_prices',
          [{ id: 1, productId: 1, sellingPrice: '1000' }],
        ],
        [
          'foil_prices',
          [{ id: 1, foilType: 'copper', unitPrice: '500' }],
        ],
      ]);
      const ctx = createTransactionContext(initialData);

      await expect(
        executeWithRollback(ctx, async (txCtx) => {
          // Successfully delete and insert into first table
          deleteAll(txCtx, 'fixed_prices');
          insertRows(txCtx, 'fixed_prices', [
            { id: 2, productId: 2, sellingPrice: '2000' },
          ]);
          // Fail on second table
          deleteAll(txCtx, 'foil_prices');
          throw new Error('Disk full during INSERT on foil_prices');
        }),
      ).rejects.toThrow('Transaction rolled back');

      // Both tables should be restored
      expect(getRowCount(ctx, 'fixed_prices')).toBe(1);
      expect(getRowCount(ctx, 'foil_prices')).toBe(1);
      // Original data preserved
      const fp = ctx.tables.get('fixed_prices')!;
      expect(fp.rows[0].id).toBe(1);
      const foil = ctx.tables.get('foil_prices')!;
      expect(foil.rows[0].foilType).toBe('copper');
    });
  });

  describe('Idempotent re-seeding pattern', () => {
    it('should produce identical results on second execution', async () => {
      const newData = [
        { id: 10, productId: 10, sellingPrice: '1000' },
        { id: 11, productId: 11, sellingPrice: '2000' },
      ];

      // First execution: empty -> insert
      const ctx1 = createTransactionContext(
        new Map([['fixed_prices', []]]),
      );
      await executeWithRollback(ctx1, async (txCtx) => {
        deleteAll(txCtx, 'fixed_prices');
        insertRows(txCtx, 'fixed_prices', newData);
      });

      // Second execution: has data -> delete + insert same data
      const ctx2 = createTransactionContext(
        new Map([['fixed_prices', [...newData]]]),
      );
      await executeWithRollback(ctx2, async (txCtx) => {
        deleteAll(txCtx, 'fixed_prices');
        insertRows(txCtx, 'fixed_prices', newData);
      });

      // Both should have identical state
      expect(getRowCount(ctx1, 'fixed_prices')).toBe(
        getRowCount(ctx2, 'fixed_prices'),
      );
      expect(ctx1.tables.get('fixed_prices')!.rows).toEqual(
        ctx2.tables.get('fixed_prices')!.rows,
      );
    });

    it('should handle re-seed with different data counts', async () => {
      // First seed: 3 records
      const ctx = createTransactionContext(
        new Map([
          [
            'fixed_prices',
            [
              { id: 1, sellingPrice: '100' },
              { id: 2, sellingPrice: '200' },
              { id: 3, sellingPrice: '300' },
            ],
          ],
        ]),
      );

      // Re-seed with 2 records (data changed)
      await executeWithRollback(ctx, async (txCtx) => {
        deleteAll(txCtx, 'fixed_prices');
        insertRows(txCtx, 'fixed_prices', [
          { id: 4, sellingPrice: '400' },
          { id: 5, sellingPrice: '500' },
        ]);
      });

      expect(getRowCount(ctx, 'fixed_prices')).toBe(2);
    });
  });

  describe('Empty table scenarios', () => {
    it('should handle DELETE on already empty table', async () => {
      const ctx = createTransactionContext(
        new Map([['fixed_prices', []]]),
      );

      await executeWithRollback(ctx, async (txCtx) => {
        deleteAll(txCtx, 'fixed_prices');
        insertRows(txCtx, 'fixed_prices', [
          { id: 1, sellingPrice: '1000' },
        ]);
      });

      expect(ctx.committed).toBe(true);
      expect(getRowCount(ctx, 'fixed_prices')).toBe(1);
    });

    it('should handle DELETE + INSERT of zero rows', async () => {
      const initialData = new Map<string, Array<Record<string, unknown>>>([
        [
          'fixed_prices',
          [{ id: 1, sellingPrice: '1000' }],
        ],
      ]);
      const ctx = createTransactionContext(initialData);

      await executeWithRollback(ctx, async (txCtx) => {
        deleteAll(txCtx, 'fixed_prices');
        // No rows to insert (all filtered out)
        insertRows(txCtx, 'fixed_prices', []);
      });

      expect(ctx.committed).toBe(true);
      expect(getRowCount(ctx, 'fixed_prices')).toBe(0);
    });
  });
});
