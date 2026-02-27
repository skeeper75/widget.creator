import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { optionConstraints } from '@widget-creator/shared/db/schema';
import { router, protectedProcedure } from '../server';
import { CreateOptionConstraintSchema, UpdateOptionConstraintSchema } from '@/lib/validations/schemas';
import { detectCircularDependency } from '@/lib/validations/circular-check';

export const optionConstraintsRouter = router({
  listByProduct: protectedProcedure
    .input(z.object({ productId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(optionConstraints)
        .where(eq(optionConstraints.productId, input.productId))
        .orderBy(asc(optionConstraints.priority), asc(optionConstraints.id));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(optionConstraints)
        .where(eq(optionConstraints.id, input.id));
      return row ?? null;
    }),

  create: protectedProcedure
    .input(CreateOptionConstraintSchema)
    .mutation(async ({ ctx, input }) => {
      // REQ-N-004: Validate no circular dependency before saving
      const existing = await ctx.db
        .select()
        .from(optionConstraints)
        .where(eq(optionConstraints.productId, input.productId));

      const newConstraint = {
        sourceOptionId: input.sourceOptionId,
        targetOptionId: input.targetOptionId,
      };

      if (detectCircularDependency(existing, newConstraint)) {
        throw new Error('Circular dependency detected. Cannot create this constraint.');
      }

      const [row] = await ctx.db.insert(optionConstraints).values(input).returning();
      return row;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), data: UpdateOptionConstraintSchema }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(optionConstraints)
        .set(input.data)
        .where(eq(optionConstraints.id, input.id))
        .returning();
      return row;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .delete(optionConstraints)
        .where(eq(optionConstraints.id, input.id))
        .returning();
      return row;
    }),

  validateCircular: protectedProcedure
    .input(
      z.object({
        productId: z.number(),
        sourceOptionId: z.number().nullable(),
        targetOptionId: z.number().nullable(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const existing = await ctx.db
        .select()
        .from(optionConstraints)
        .where(eq(optionConstraints.productId, input.productId));

      const isCircular = detectCircularDependency(existing, {
        sourceOptionId: input.sourceOptionId,
        targetOptionId: input.targetOptionId,
      });

      return { isCircular };
    }),
});
