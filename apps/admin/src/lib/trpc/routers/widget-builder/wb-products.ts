import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq as _eq, asc as _asc, and as _and } from 'drizzle-orm';
import { wbProducts, productCategories } from '@widget-creator/db';
import { router, protectedProcedure } from '../../server';

// pnpm resolves two drizzle-orm instances (postgres + libsql), causing SQL<unknown> type conflicts.
// Cast helpers to any-accepting variants to bypass structural incompatibility at type level.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyArg = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const eq = _eq as (a: AnyArg, b: AnyArg) => any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asc = _asc as (col: AnyArg) => any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const and = _and as (...conditions: AnyArg[]) => any;

const CreateWbProductSchema = z.object({
  productKey: z.string().min(1).max(50),
  productNameKo: z.string().min(1).max(100),
  productNameEn: z.string().max(100).optional(),
  categoryId: z.number().int().nullable().optional(),
  subcategory: z.string().nullable().optional(),
  productType: z.string().nullable().optional(),
  isPremium: z.boolean().default(false),
  hasEditor: z.boolean().default(false),
  hasUpload: z.boolean().default(true),
  thumbnailUrl: z.string().nullable().optional(),
  displayOrder: z.number().int().default(0),
  isVisible: z.boolean().default(true),
});

const UpdateWbProductSchema = z.object({
  id: z.number().int(),
  productNameKo: z.string().min(1).max(100).optional(),
  productNameEn: z.string().max(100).optional(),
  categoryId: z.number().int().nullable().optional(),
  subcategory: z.string().nullable().optional(),
  productType: z.string().nullable().optional(),
  isPremium: z.boolean().optional(),
  hasEditor: z.boolean().optional(),
  hasUpload: z.boolean().optional(),
  thumbnailUrl: z.string().nullable().optional(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  isVisible: z.boolean().optional(),
});

// @MX:ANCHOR: [AUTO] wbProductsRouter — SPEC-MDM-001 router for widget builder product CRUD
// @MX:REASON: Fan_in >= 3: used by index router, category join query, and page components
export const wbProductsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        isActive: z.boolean().optional(),
        categoryId: z.number().int().nullable().optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];
      if (input?.isActive !== undefined) {
        conditions.push(eq(wbProducts.isActive, input.isActive));
      }
      if (input?.categoryId !== undefined && input.categoryId !== null) {
        conditions.push(eq(wbProducts.categoryId, input.categoryId));
      }

      const rows = await ctx.db
        .select({
          id: wbProducts.id,
          productKey: wbProducts.productKey,
          productNameKo: wbProducts.productNameKo,
          productNameEn: wbProducts.productNameEn,
          categoryId: wbProducts.categoryId,
          categoryNameKo: productCategories.categoryNameKo,
          subcategory: wbProducts.subcategory,
          productType: wbProducts.productType,
          isPremium: wbProducts.isPremium,
          hasEditor: wbProducts.hasEditor,
          hasUpload: wbProducts.hasUpload,
          thumbnailUrl: wbProducts.thumbnailUrl,
          displayOrder: wbProducts.displayOrder,
          isActive: wbProducts.isActive,
          isVisible: wbProducts.isVisible,
          createdAt: wbProducts.createdAt,
          updatedAt: wbProducts.updatedAt,
        })
        .from(wbProducts)
        .leftJoin(productCategories, eq(wbProducts.categoryId, productCategories.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(wbProducts.displayOrder));

      return rows;
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(wbProducts)
        .where(eq(wbProducts.id, input.id));
      if (!row) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' });
      }
      return row;
    }),

  create: protectedProcedure
    .input(CreateWbProductSchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(wbProducts)
        .where(eq(wbProducts.productKey, input.productKey));
      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Product key already exists' });
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const insertValues: any = {
        productKey: input.productKey,
        productNameKo: input.productNameKo,
        productNameEn: input.productNameEn ?? null,
        categoryId: input.categoryId ?? null,
        subcategory: input.subcategory ?? null,
        productType: input.productType ?? null,
        isPremium: input.isPremium,
        hasEditor: input.hasEditor,
        hasUpload: input.hasUpload,
        thumbnailUrl: input.thumbnailUrl ?? null,
        displayOrder: input.displayOrder,
        isVisible: input.isVisible,
      };
      const [created] = await ctx.db
        .insert(wbProducts)
        .values(insertValues)
        .returning();
      return created;
    }),

  update: protectedProcedure
    .input(UpdateWbProductSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [updated] = await ctx.db
        .update(wbProducts)
        .set({ ...(data as any), updatedAt: new Date() })
        .where(eq(wbProducts.id, id))
        .returning();
      if (!updated) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' });
      }
      return updated;
    }),

  deactivate: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(wbProducts)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(wbProducts.id, input.id))
        .returning();
      if (!updated) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' });
      }
      return { success: true as const };
    }),
});
