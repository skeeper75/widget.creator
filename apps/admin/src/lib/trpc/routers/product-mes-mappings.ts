import { z } from 'zod';
import { eq, asc } from 'drizzle-orm';
import { productMesMappings, products, mesItems, categories } from '@widget-creator/shared/db/schema';
import { router, protectedProcedure } from '../server';

export const productMesMappingsRouter = router({
  getMapperData: protectedProcedure.query(async ({ ctx }) => {
    const [allProducts, allMesItems, mappings] = await Promise.all([
      ctx.db
        .select({
          id: products.id,
          name: products.name,
          categoryId: products.categoryId,
          categoryName: categories.name,
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(eq(products.isActive, true))
        .orderBy(asc(products.categoryId), asc(products.id)),
      ctx.db
        .select()
        .from(mesItems)
        .where(eq(mesItems.isActive, true))
        .orderBy(asc(mesItems.groupCode), asc(mesItems.id)),
      ctx.db.select().from(productMesMappings),
    ]);

    return { products: allProducts, mesItems: allMesItems, mappings };
  }),

  create: protectedProcedure
    .input(
      z.object({
        productId: z.number(),
        mesItemId: z.number(),
        coverType: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(productMesMappings)
        .values(input)
        .returning();
      return row;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .delete(productMesMappings)
        .where(eq(productMesMappings.id, input.id))
        .returning();
      return row;
    }),
});
