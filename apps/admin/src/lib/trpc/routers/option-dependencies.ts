import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { optionDependencies } from '@widget-creator/shared/db/schema';
import { router, protectedProcedure } from '../server';
import { CreateOptionDependencySchema, UpdateOptionDependencySchema } from '@/lib/validations/schemas';

export const optionDependenciesRouter = router({
  listByProduct: protectedProcedure
    .input(z.object({ productId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(optionDependencies)
        .where(eq(optionDependencies.productId, input.productId))
        .orderBy(asc(optionDependencies.id));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(optionDependencies)
        .where(eq(optionDependencies.id, input.id));
      return row ?? null;
    }),

  create: protectedProcedure
    .input(CreateOptionDependencySchema)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.insert(optionDependencies).values(input).returning();
      return row;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), data: UpdateOptionDependencySchema }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(optionDependencies)
        .set(input.data)
        .where(eq(optionDependencies.id, input.id))
        .returning();
      return row;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .delete(optionDependencies)
        .where(eq(optionDependencies.id, input.id))
        .returning();
      return row;
    }),

  getGraph: protectedProcedure
    .input(z.object({ productId: z.number() }))
    .query(async ({ ctx, input }) => {
      const deps = await ctx.db
        .select()
        .from(optionDependencies)
        .where(eq(optionDependencies.productId, input.productId));

      // Build graph data for visualization
      const nodes = new Set<number>();
      const edges: Array<{
        from: number;
        to: number;
        choiceId: number | null;
        type: string;
      }> = [];

      for (const dep of deps) {
        nodes.add(dep.parentOptionId);
        nodes.add(dep.childOptionId);
        edges.push({
          from: dep.parentOptionId,
          to: dep.childOptionId,
          choiceId: dep.parentChoiceId,
          type: dep.dependencyType,
        });
      }

      return {
        nodes: Array.from(nodes),
        edges,
      };
    }),
});
