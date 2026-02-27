import { z } from 'zod';
import { eq, asc, and } from 'drizzle-orm';
import { impositionRules } from '@widget-creator/shared/db/schema';
import { router, protectedProcedure } from '../server';
import { CreateImpositionRuleSchema, UpdateImpositionRuleSchema } from '@/lib/validations/schemas';

export const impositionRulesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(impositionRules)
      .orderBy(asc(impositionRules.sheetStandard), asc(impositionRules.id));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(impositionRules).where(eq(impositionRules.id, input.id));
      return row ?? null;
    }),

  create: protectedProcedure
    .input(CreateImpositionRuleSchema)
    .mutation(async ({ ctx, input }) => {
      // REQ-E-304: Validate uniqueness of cutWidth x cutHeight within sheetStandard
      const existing = await ctx.db
        .select({ id: impositionRules.id })
        .from(impositionRules)
        .where(
          and(
            eq(impositionRules.cutWidth, input.cutWidth),
            eq(impositionRules.cutHeight, input.cutHeight),
            eq(impositionRules.sheetStandard, input.sheetStandard),
          ),
        );

      if (existing.length > 0) {
        throw new Error('Duplicate cutWidth x cutHeight combination for this sheetStandard');
      }

      const [row] = await ctx.db.insert(impositionRules).values(input).returning();
      return row;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), data: UpdateImpositionRuleSchema }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(impositionRules)
        .set(input.data)
        .where(eq(impositionRules.id, input.id))
        .returning();
      return row;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(impositionRules)
        .set({ isActive: false })
        .where(eq(impositionRules.id, input.id))
        .returning();
      return row;
    }),
});
