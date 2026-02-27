import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { printModes } from '@widget-creator/shared/db/schema';
import { router, protectedProcedure } from '../server';
import { CreatePrintModeSchema, UpdatePrintModeSchema } from '@/lib/validations/schemas';

export const printModesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(printModes)
      .orderBy(asc(printModes.displayOrder), asc(printModes.id));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(printModes).where(eq(printModes.id, input.id));
      return row ?? null;
    }),

  create: protectedProcedure
    .input(CreatePrintModeSchema)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.insert(printModes).values(input).returning();
      return row;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), data: UpdatePrintModeSchema }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(printModes)
        .set(input.data)
        .where(eq(printModes.id, input.id))
        .returning();
      return row;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(printModes)
        .set({ isActive: false })
        .where(eq(printModes.id, input.id))
        .returning();
      return row;
    }),
});
