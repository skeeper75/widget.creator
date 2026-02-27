import { z } from 'zod';
import { eq, asc, isNull, notInArray, sql } from 'drizzle-orm';
import { productEditorMappings, products } from '@widget-creator/shared/db/schema';
import { router, protectedProcedure } from '../server';
import { CreateProductEditorMappingSchema, UpdateProductEditorMappingSchema } from '@/lib/validations/schemas';

export const productEditorMappingsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: productEditorMappings.id,
        productId: productEditorMappings.productId,
        productName: products.name,
        editorType: productEditorMappings.editorType,
        templateId: productEditorMappings.templateId,
        templateConfig: productEditorMappings.templateConfig,
        isActive: productEditorMappings.isActive,
        createdAt: productEditorMappings.createdAt,
        updatedAt: productEditorMappings.updatedAt,
      })
      .from(productEditorMappings)
      .leftJoin(products, eq(productEditorMappings.productId, products.id))
      .orderBy(asc(productEditorMappings.id));
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(productEditorMappings)
        .where(eq(productEditorMappings.id, input.id));
      return row ?? null;
    }),

  create: protectedProcedure
    .input(CreateProductEditorMappingSchema)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(productEditorMappings)
        .values(input)
        .returning();
      return row;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), data: UpdateProductEditorMappingSchema }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(productEditorMappings)
        .set(input.data)
        .where(eq(productEditorMappings.id, input.id))
        .returning();
      return row;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .delete(productEditorMappings)
        .where(eq(productEditorMappings.id, input.id))
        .returning();
      return row;
    }),

  listUnmapped: protectedProcedure.query(async ({ ctx }) => {
    // Products that have editorEnabled=true but no editor mapping
    const mappedProductIds = ctx.db
      .select({ productId: productEditorMappings.productId })
      .from(productEditorMappings);

    return ctx.db
      .select()
      .from(products)
      .where(
        sql`${products.editorEnabled} = true AND ${products.id} NOT IN (${mappedProductIds})`,
      )
      .orderBy(asc(products.id));
  }),
});
