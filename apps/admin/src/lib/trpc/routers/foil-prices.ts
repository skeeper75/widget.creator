import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { foilPrices } from '@widget-creator/shared/db/schema';
import { router, protectedProcedure } from '../server';
import { CreateFoilPriceSchema, UpdateFoilPriceSchema } from '@/lib/validations/schemas';

export const foilPricesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(foilPrices)
      .orderBy(asc(foilPrices.displayOrder), asc(foilPrices.id));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(foilPrices).where(eq(foilPrices.id, input.id));
      return row ?? null;
    }),

  create: protectedProcedure
    .input(CreateFoilPriceSchema)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.insert(foilPrices).values(input).returning();
      return row;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), data: UpdateFoilPriceSchema }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(foilPrices)
        .set(input.data)
        .where(eq(foilPrices.id, input.id))
        .returning();
      return row;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(foilPrices)
        .set({ isActive: false })
        .where(eq(foilPrices.id, input.id))
        .returning();
      return row;
    }),
});
