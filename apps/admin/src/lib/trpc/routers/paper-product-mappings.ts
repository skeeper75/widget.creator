import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { paperProductMappings, papers, products } from '@widget-creator/shared/db/schema';
import { router, protectedProcedure } from '../server';

export const paperProductMappingsRouter = router({
  getMatrix: protectedProcedure
    .input(z.object({ coverType: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const conditions = input.coverType
        ? [eq(paperProductMappings.coverType, input.coverType)]
        : [];

      const [allPapers, allProducts, mappings] = await Promise.all([
        ctx.db.select().from(papers).orderBy(papers.displayOrder),
        ctx.db.select().from(products).orderBy(products.id),
        ctx.db
          .select()
          .from(paperProductMappings)
          .where(conditions.length > 0 ? and(...conditions) : undefined),
      ]);

      return { papers: allPapers, products: allProducts, mappings };
    }),

  toggle: protectedProcedure
    .input(
      z.object({
        paperId: z.number(),
        productId: z.number(),
        coverType: z.string().optional(),
        active: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const conditions = [
        eq(paperProductMappings.paperId, input.paperId),
        eq(paperProductMappings.productId, input.productId),
      ];
      if (input.coverType) {
        conditions.push(eq(paperProductMappings.coverType, input.coverType));
      }

      const existing = await ctx.db
        .select()
        .from(paperProductMappings)
        .where(and(...conditions));

      if (existing.length > 0) {
        const [row] = await ctx.db
          .update(paperProductMappings)
          .set({ isActive: input.active })
          .where(eq(paperProductMappings.id, existing[0].id))
          .returning();
        return row;
      }

      const [row] = await ctx.db
        .insert(paperProductMappings)
        .values({
          paperId: input.paperId,
          productId: input.productId,
          coverType: input.coverType,
          isActive: input.active,
        })
        .returning();
      return row;
    }),

  batchToggle: protectedProcedure
    .input(
      z.array(
        z.object({
          paperId: z.number(),
          productId: z.number(),
          coverType: z.string().optional(),
          active: z.boolean(),
        }),
      ),
    )
    .mutation(async ({ ctx, input }) => {
      const results = [];
      for (const item of input) {
        const conditions = [
          eq(paperProductMappings.paperId, item.paperId),
          eq(paperProductMappings.productId, item.productId),
        ];
        if (item.coverType) {
          conditions.push(eq(paperProductMappings.coverType, item.coverType));
        }

        const existing = await ctx.db
          .select()
          .from(paperProductMappings)
          .where(and(...conditions));

        if (existing.length > 0) {
          const [row] = await ctx.db
            .update(paperProductMappings)
            .set({ isActive: item.active })
            .where(eq(paperProductMappings.id, existing[0].id))
            .returning();
          results.push(row);
        } else {
          const [row] = await ctx.db
            .insert(paperProductMappings)
            .values({
              paperId: item.paperId,
              productId: item.productId,
              coverType: item.coverType,
              isActive: item.active,
            })
            .returning();
          results.push(row);
        }
      }
      return results;
    }),
});
