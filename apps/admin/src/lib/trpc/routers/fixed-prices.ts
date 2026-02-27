import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { fixedPrices } from '@widget-creator/shared/db/schema';
import { router, protectedProcedure } from '../server';
import { CreateFixedPriceSchema, UpdateFixedPriceSchema } from '@/lib/validations/schemas';

export const fixedPricesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(fixedPrices).orderBy(asc(fixedPrices.id));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(fixedPrices).where(eq(fixedPrices.id, input.id));
      return row ?? null;
    }),

  create: protectedProcedure
    .input(CreateFixedPriceSchema)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.insert(fixedPrices).values(input).returning();
      return row;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), data: UpdateFixedPriceSchema }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(fixedPrices)
        .set(input.data)
        .where(eq(fixedPrices.id, input.id))
        .returning();
      return row;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(fixedPrices)
        .set({ isActive: false })
        .where(eq(fixedPrices.id, input.id))
        .returning();
      return row;
    }),
});
