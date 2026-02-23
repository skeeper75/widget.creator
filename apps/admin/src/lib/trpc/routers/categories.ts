import { z } from 'zod';
import { eq, asc, isNull } from 'drizzle-orm';
import { categories } from '@widget-creator/shared/db/schema';
import { router, protectedProcedure } from '../server';
import { CreateCategorySchema, UpdateCategorySchema } from '@/lib/validations/schemas';

export const categoriesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(categories)
      .orderBy(asc(categories.displayOrder), asc(categories.id));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(categories)
        .where(eq(categories.id, input.id));
      return row ?? null;
    }),

  create: protectedProcedure
    .input(CreateCategorySchema)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.insert(categories).values(input).returning();
      return row;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), data: UpdateCategorySchema }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(categories)
        .set(input.data)
        .where(eq(categories.id, input.id))
        .returning();
      return row;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // REQ-N-001: Check for children before deleting
      const children = await ctx.db
        .select({ id: categories.id })
        .from(categories)
        .where(eq(categories.parentId, input.id));

      if (children.length > 0) {
        throw new Error('Cannot delete category with children. Move or delete child categories first.');
      }

      const [row] = await ctx.db
        .delete(categories)
        .where(eq(categories.id, input.id))
        .returning();
      return row;
    }),

  reorder: protectedProcedure
    .input(
      z.array(
        z.object({
          id: z.number(),
          parentId: z.number().nullable(),
          depth: z.number(),
          displayOrder: z.number(),
        }),
      ),
    )
    .mutation(async ({ ctx, input }) => {
      const results = await Promise.all(
        input.map((item) =>
          ctx.db
            .update(categories)
            .set({
              parentId: item.parentId,
              depth: item.depth,
              displayOrder: item.displayOrder,
            })
            .where(eq(categories.id, item.id))
            .returning(),
        ),
      );
      return results.flat();
    }),
});
