import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq as _eq, asc as _asc, and as _and } from 'drizzle-orm';
import { productCategories } from '@widget-creator/db';
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

const CreateCategorySchema = z.object({
  categoryKey: z.string().min(1).max(50),
  categoryNameKo: z.string().min(1).max(100),
  categoryNameEn: z.string().max(100).optional(),
  displayOrder: z.number().int().default(0),
  description: z.string().nullable().optional(),
});

const UpdateCategorySchema = z.object({
  id: z.number().int(),
  categoryNameKo: z.string().min(1).max(100).optional(),
  categoryNameEn: z.string().max(100).optional(),
  displayOrder: z.number().int().optional(),
  description: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

// @MX:ANCHOR: [AUTO] productCategoriesRouter — SPEC-MDM-001 router for product category CRUD
// @MX:REASON: Fan_in >= 3: used by index router, wb-products router (join), and page components
export const productCategoriesRouter = router({
  list: protectedProcedure
    .input(z.object({ isActive: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const conditions = [];
      if (input?.isActive !== undefined) {
        conditions.push(eq(productCategories.isActive, input.isActive));
      }
      return ctx.db
        .select()
        .from(productCategories)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(productCategories.displayOrder));
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const [category] = await ctx.db
        .select()
        .from(productCategories)
        .where(eq(productCategories.id, input.id));
      if (!category) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Category not found' });
      }
      return category;
    }),

  create: protectedProcedure
    .input(CreateCategorySchema)
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select()
        .from(productCategories)
        .where(eq(productCategories.categoryKey, input.categoryKey));
      if (existing) {
        throw new TRPCError({ code: 'CONFLICT', message: 'Category key already exists' });
      }
      const [created] = await ctx.db
        .insert(productCategories)
        .values({ ...input, description: input.description ?? null })
        .returning();
      return created;
    }),

  update: protectedProcedure
    .input(UpdateCategorySchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const [updated] = await ctx.db
        .update(productCategories)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(productCategories.id, id))
        .returning();
      if (!updated) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Category not found' });
      }
      return updated;
    }),

  deactivate: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(productCategories)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(productCategories.id, input.id))
        .returning();
      if (!updated) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Category not found' });
      }
      return { success: true as const };
    }),
});
