import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { optionDefinitions } from '@widget-creator/shared/db/schema';
import { router, protectedProcedure } from '../server';
import { CreateOptionDefinitionSchema, UpdateOptionDefinitionSchema } from '@/lib/validations/schemas';

export const optionDefinitionsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(optionDefinitions)
      .orderBy(asc(optionDefinitions.displayOrder), asc(optionDefinitions.id));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(optionDefinitions)
        .where(eq(optionDefinitions.id, input.id));
      return row ?? null;
    }),

  create: protectedProcedure
    .input(CreateOptionDefinitionSchema)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.insert(optionDefinitions).values(input).returning();
      return row;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), data: UpdateOptionDefinitionSchema }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(optionDefinitions)
        .set(input.data)
        .where(eq(optionDefinitions.id, input.id))
        .returning();
      return row;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(optionDefinitions)
        .set({ isActive: false })
        .where(eq(optionDefinitions.id, input.id))
        .returning();
      return row;
    }),

  reorder: protectedProcedure
    .input(z.array(z.object({ id: z.number(), displayOrder: z.number() })))
    .mutation(async ({ ctx, input }) => {
      const results = await Promise.all(
        input.map((item) =>
          ctx.db
            .update(optionDefinitions)
            .set({ displayOrder: item.displayOrder })
            .where(eq(optionDefinitions.id, item.id))
            .returning(),
        ),
      );
      return results.flat();
    }),
});
