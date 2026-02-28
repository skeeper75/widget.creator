import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, asc, desc, like, and, sql, SQL } from 'drizzle-orm';
import { products, categories } from '@widget-creator/shared/db/schema';
import { router, protectedProcedure } from '../server';
import { CreateProductSchema, UpdateProductSchema } from '@/lib/validations/schemas';

export const productsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        sortBy: z.string().optional(),
        sortOrder: z.enum(['asc', 'desc']).default('asc'),
        search: z.string().optional(),
        categoryId: z.number().optional(),
        productType: z.string().optional(),
        pricingModel: z.string().optional(),
        isActive: z.boolean().optional(),
      }).default({}),
    )
    .query(async ({ ctx, input }) => {
      const conditions: SQL[] = [];

      if (input.search) {
        conditions.push(like(products.name, `%${input.search}%`));
      }
      if (input.categoryId != null) {
        conditions.push(eq(products.categoryId, input.categoryId));
      }
      if (input.productType) {
        conditions.push(eq(products.productType, input.productType));
      }
      if (input.pricingModel) {
        conditions.push(eq(products.pricingModel, input.pricingModel));
      }
      if (input.isActive != null) {
        conditions.push(eq(products.isActive, input.isActive));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [data, countResult] = await Promise.all([
        ctx.db
          .select({
            id: products.id,
            categoryId: products.categoryId,
            categoryName: categories.name,
            huniCode: products.huniCode,
            edicusCode: products.edicusCode,
            shopbyId: products.shopbyId,
            name: products.name,
            slug: products.slug,
            productType: products.productType,
            pricingModel: products.pricingModel,
            sheetStandard: products.sheetStandard,
            orderMethod: products.orderMethod,
            editorEnabled: products.editorEnabled,
            mesRegistered: products.mesRegistered,
            isActive: products.isActive,
            createdAt: products.createdAt,
            updatedAt: products.updatedAt,
          })
          .from(products)
          .leftJoin(categories, eq(products.categoryId, categories.id))
          .where(where)
          .orderBy(
            input.sortBy === 'name'
              ? input.sortOrder === 'desc'
                ? desc(products.name)
                : asc(products.name)
              : asc(products.id),
          )
          .limit(input.pageSize)
          .offset((input.page - 1) * input.pageSize),
        ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(products)
          .where(where),
      ]);

      return {
        data,
        total: Number(countResult[0]?.count ?? 0),
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(products)
        .where(eq(products.id, input.id));
      return row ?? null;
    }),

  create: protectedProcedure
    .input(CreateProductSchema)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.insert(products).values(input).returning();
      return row;
    }),

  update: protectedProcedure
    .input(z.object({ id: z.number(), data: UpdateProductSchema }))
    .mutation(async ({ ctx, input }) => {
      // NFR-WBADMIN-001: edicusCode is immutable after initial save
      if (input.data.edicusCode !== undefined) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'edicusCode cannot be changed after product creation',
        });
      }
      const [row] = await ctx.db
        .update(products)
        .set(input.data)
        .where(eq(products.id, input.id))
        .returning();
      return row;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // REQ-N-002: Soft delete for products
      const [row] = await ctx.db
        .update(products)
        .set({ isActive: false })
        .where(eq(products.id, input.id))
        .returning();
      return row;
    }),
});
