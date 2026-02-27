import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { packagePrices } from '@widget-creator/shared/db/schema';
import { router, protectedProcedure } from '../server';
import { CreatePackagePriceSchema, UpdatePackagePriceSchema } from '@/lib/validations/schemas';

export const packagePricesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(packagePrices).orderBy(asc(packagePrices.id));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(packagePrices).where(eq(packagePrices.id, input.id));
      return row ?? null;
    }),

  create: protectedProcedure
    .input(CreatePackagePriceSchema)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.insert(packagePrices).values(input).returning();
      return row;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), data: UpdatePackagePriceSchema }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(packagePrices)
        .set(input.data)
        .where(eq(packagePrices.id, input.id))
        .returning();
      return row;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(packagePrices)
        .set({ isActive: false })
        .where(eq(packagePrices.id, input.id))
        .returning();
      return row;
    }),
});
