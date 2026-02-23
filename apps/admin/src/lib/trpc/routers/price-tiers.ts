import { z } from 'zod';
import { eq, asc, and, sql } from 'drizzle-orm';
import { priceTiers } from '@widget-creator/shared/db/schema';
import { router, protectedProcedure } from '../server';

export const priceTiersRouter = router({
  listByTable: protectedProcedure
    .input(z.object({ priceTableId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(priceTiers)
        .where(eq(priceTiers.priceTableId, input.priceTableId))
        .orderBy(asc(priceTiers.optionCode), asc(priceTiers.minQty));
    }),

  batchUpsert: protectedProcedure
    .input(
      z.object({
        priceTableId: z.number(),
        changes: z.array(
          z.object({
            id: z.number().optional(),
            optionCode: z.string(),
            minQty: z.number(),
            maxQty: z.number(),
            unitPrice: z.string().refine((val) => Number(val) >= 0, {
              message: 'unitPrice must not be negative',
            }),
            isActive: z.boolean().default(true),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const results = [];
      for (const change of input.changes) {
        if (change.id) {
          const [row] = await ctx.db
            .update(priceTiers)
            .set({
              optionCode: change.optionCode,
              minQty: change.minQty,
              maxQty: change.maxQty,
              unitPrice: change.unitPrice,
              isActive: change.isActive,
            })
            .where(eq(priceTiers.id, change.id))
            .returning();
          results.push(row);
        } else {
          const [row] = await ctx.db
            .insert(priceTiers)
            .values({
              priceTableId: input.priceTableId,
              optionCode: change.optionCode,
              minQty: change.minQty,
              maxQty: change.maxQty,
              unitPrice: change.unitPrice,
              isActive: change.isActive,
            })
            .returning();
          results.push(row);
        }
      }
      return results;
    }),

  addRow: protectedProcedure
    .input(
      z.object({
        priceTableId: z.number(),
        optionCode: z.string(),
        minQty: z.number(),
        maxQty: z.number(),
        unitPrice: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(priceTiers)
        .values(input)
        .returning();
      return row;
    }),

  deleteRow: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .delete(priceTiers)
        .where(eq(priceTiers.id, input.id))
        .returning();
      return row;
    }),
});
