import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { priceTables } from '@widget-creator/shared/db/schema';
import { router, protectedProcedure } from '../server';
import { CreatePriceTableSchema, UpdatePriceTableSchema } from '@/lib/validations/schemas';

export const priceTablesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(priceTables).orderBy(asc(priceTables.id));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(priceTables).where(eq(priceTables.id, input.id));
      return row ?? null;
    }),

  create: protectedProcedure
    .input(CreatePriceTableSchema)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.insert(priceTables).values(input).returning();
      return row;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), data: UpdatePriceTableSchema }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(priceTables)
        .set(input.data)
        .where(eq(priceTables.id, input.id))
        .returning();
      return row;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(priceTables)
        .set({ isActive: false })
        .where(eq(priceTables.id, input.id))
        .returning();
      return row;
    }),
});
