import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { productSizes } from '@widget-creator/shared/db/schema';
import { router, protectedProcedure } from '../server';
import { CreateProductSizeSchema, UpdateProductSizeSchema } from '@/lib/validations/schemas';

export const productSizesRouter = router({
  listByProduct: protectedProcedure
    .input(z.object({ productId: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(productSizes)
        .where(eq(productSizes.productId, input.productId))
        .orderBy(asc(productSizes.displayOrder));
    }),

  create: protectedProcedure
    .input(CreateProductSizeSchema)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.insert(productSizes).values(input).returning();
      return row;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), data: UpdateProductSizeSchema }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(productSizes)
        .set(input.data)
        .where(eq(productSizes.id, input.id))
        .returning();
      return row;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .delete(productSizes)
        .where(eq(productSizes.id, input.id))
        .returning();
      return row;
    }),

  batchUpdate: protectedProcedure
    .input(
      z.array(
        z.object({
          id: z.number(),
          data: UpdateProductSizeSchema,
        }),
      ),
    )
    .mutation(async ({ ctx, input }) => {
      const results = await Promise.all(
        input.map((item) =>
          ctx.db
            .update(productSizes)
            .set(item.data)
            .where(eq(productSizes.id, item.id))
            .returning(),
        ),
      );
      return results.flat();
    }),
});
