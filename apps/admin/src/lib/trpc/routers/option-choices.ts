import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { optionChoices } from '@widget-creator/shared/db/schema';
import { router, protectedProcedure } from '../server';
import { CreateOptionChoiceSchema, UpdateOptionChoiceSchema } from '@/lib/validations/schemas';

export const optionChoicesRouter = router({
  listByDefinition: protectedProcedure
    .input(z.object({ optionDefinitionId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(optionChoices)
        .where(eq(optionChoices.optionDefinitionId, input.optionDefinitionId))
        .orderBy(asc(optionChoices.displayOrder));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(optionChoices)
        .where(eq(optionChoices.id, input.id));
      return row ?? null;
    }),

  create: protectedProcedure
    .input(CreateOptionChoiceSchema)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.insert(optionChoices).values(input).returning();
      return row;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), data: UpdateOptionChoiceSchema }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(optionChoices)
        .set(input.data)
        .where(eq(optionChoices.id, input.id))
        .returning();
      return row;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(optionChoices)
        .set({ isActive: false })
        .where(eq(optionChoices.id, input.id))
        .returning();
      return row;
    }),
});
