import { z, type ZodType } from 'zod';
import { eq, sql, type SQL, asc, desc } from 'drizzle-orm';
import type { PgTableWithColumns, PgColumn } from 'drizzle-orm/pg-core';
import { router, publicProcedure, protectedProcedure } from '../trpc.js';

/**
 * Standard list query input for all CRUD routers.
 */
const ListQuerySchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).default('asc'),
  search: z.string().max(200).optional(),
});

const IdSchema = z.object({ id: z.number().int().positive() });

const BulkUpdateInputSchema = <T extends ZodType>(updateSchema: T) =>
  z.object({
    items: z.array(
      z.object({
        id: z.number().int().positive(),
        data: updateSchema,
      }),
    ),
  });

export interface CrudRouterConfig<TTable extends PgTableWithColumns<any>> {
  /** The Drizzle table definition */
  table: TTable;
  /** Zod schema for creating records (typically from drizzle-zod createInsertSchema, omitting id/timestamps) */
  createSchema: ZodType;
  /** Zod schema for updating records (typically partial of create schema) */
  updateSchema: ZodType;
  /** Column names that are searchable via the `search` input */
  searchableColumns?: string[];
  /** Default sort column name (default: 'id') */
  defaultSort?: string;
  /** Soft delete column name (default: 'isActive') */
  softDeleteColumn?: string;
}

/**
 * Generic CRUD router factory for tRPC.
 * Generates standard list/getById/create/update/softDelete/bulkUpdate procedures.
 *
 * Usage:
 * ```typescript
 * import { categories } from '@widget-creator/shared';
 * import { createInsertSchema } from 'drizzle-zod';
 *
 * const categoryBaseRouter = createCrudRouter({
 *   table: categories,
 *   createSchema: createInsertSchema(categories).omit({ id: true, createdAt: true, updatedAt: true }),
 *   updateSchema: createInsertSchema(categories).partial().omit({ id: true }),
 * });
 *
 * export const categoryRouter = router({
 *   ...categoryBaseRouter._def.procedures,
 *   // Add custom procedures here
 * });
 * ```
 */
export function createCrudRouter<TTable extends PgTableWithColumns<any>>(
  config: CrudRouterConfig<TTable>,
) {
  const {
    table,
    createSchema,
    updateSchema,
    defaultSort = 'id',
    softDeleteColumn = 'isActive',
  } = config;

  return router({
    list: publicProcedure
      .input(ListQuerySchema)
      .query(async ({ input, ctx }) => {
        const { page, limit, sort, order } = input;
        const offset = (page - 1) * limit;

        const sortColumn = (table as Record<string, PgColumn>)[sort || defaultSort];
        const orderFn = order === 'desc' ? desc : asc;

        const [countResult] = await ctx.db
          .select({ count: sql<number>`count(*)::int` })
          .from(table as any); // eslint-disable-line @typescript-eslint/no-explicit-any -- generic table type requires cast for drizzle-orm
        const total = countResult?.count ?? 0;

        const items = await ctx.db
          .select()
          .from(table as any) // eslint-disable-line @typescript-eslint/no-explicit-any
          .orderBy(sortColumn ? orderFn(sortColumn) : asc((table as Record<string, PgColumn>).id))
          .limit(limit)
          .offset(offset);

        return {
          data: items,
          meta: {
            page,
            limit,
            total,
            totalPages: total > 0 ? Math.ceil(total / limit) : 0,
          },
        };
      }),

    getById: publicProcedure
      .input(IdSchema)
      .query(async ({ input, ctx }) => {
        const idColumn = (table as Record<string, PgColumn>).id;
        const [item] = await ctx.db
          .select()
          .from(table as any) // eslint-disable-line @typescript-eslint/no-explicit-any
          .where(eq(idColumn, input.id));

        if (!item) {
          throw new Error(`Record with id ${input.id} not found`);
        }

        return item;
      }),

    create: protectedProcedure
      .input(createSchema)
      .mutation(async ({ input, ctx }) => {
        const [created] = await ctx.db
          .insert(table as any) // eslint-disable-line @typescript-eslint/no-explicit-any
          .values(input as Record<string, unknown>)
          .returning();
        return created;
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number().int().positive(), data: updateSchema }))
      .mutation(async ({ input, ctx }) => {
        const idColumn = (table as Record<string, PgColumn>).id;
        const [updated] = await ctx.db
          .update(table as any) // eslint-disable-line @typescript-eslint/no-explicit-any
          .set(input.data as Record<string, unknown>)
          .where(eq(idColumn, input.id))
          .returning();

        if (!updated) {
          throw new Error(`Record with id ${input.id} not found`);
        }

        return updated;
      }),

    softDelete: protectedProcedure
      .input(IdSchema)
      .mutation(async ({ input, ctx }) => {
        const idColumn = (table as Record<string, PgColumn>).id;
        const softCol = (table as Record<string, PgColumn>)[softDeleteColumn];

        if (!softCol) {
          throw new Error(`Table does not have column '${softDeleteColumn}' for soft delete`);
        }

        const [deleted] = await ctx.db
          .update(table as any) // eslint-disable-line @typescript-eslint/no-explicit-any
          .set({ [softDeleteColumn]: false } as Record<string, unknown>)
          .where(eq(idColumn, input.id))
          .returning();

        if (!deleted) {
          throw new Error(`Record with id ${input.id} not found`);
        }

        return deleted;
      }),

    bulkUpdate: protectedProcedure
      .input(BulkUpdateInputSchema(updateSchema))
      .mutation(async ({ input, ctx }) => {
        const idColumn = (table as Record<string, PgColumn>).id;
        const results = [];

        for (const item of input.items) {
          const [updated] = await ctx.db
            .update(table as any) // eslint-disable-line @typescript-eslint/no-explicit-any
            .set(item.data as Record<string, unknown>)
            .where(eq(idColumn, item.id))
            .returning();
          if (updated) results.push(updated);
        }

        return { updated: results.length, data: results };
      }),
  });
}
