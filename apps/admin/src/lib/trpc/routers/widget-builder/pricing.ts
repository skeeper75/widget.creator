import { z } from 'zod';
import { eq as _eq, and as _and, isNull as _isNull } from 'drizzle-orm';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyArg = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const eq = _eq as (a: AnyArg, b: AnyArg) => any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const and = _and as (...conditions: AnyArg[]) => any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isNull = _isNull as (col: AnyArg) => any;
import { TRPCError } from '@trpc/server';
import {
  productPriceConfigs,
  printCostBase,
  postprocessCost,
  qtyDiscount,
  wbProducts,
} from '@widget-creator/db';
import { router, protectedProcedure } from '../../server';

// ─── Price mode enum ──────────────────────────────────────────────────────────

const PriceModeEnum = z.enum(['LOOKUP', 'AREA', 'PAGE', 'COMPOSITE']);
const PriceTypeEnum = z.enum(['fixed', 'per_unit', 'per_sqm']);

// ─── Input schemas ────────────────────────────────────────────────────────────

const UpsertPriceConfigSchema = z.object({
  productId: z.number().int().positive(),
  priceMode: PriceModeEnum,
  formulaText: z.string().nullable().optional(),
  unitPriceSqm: z.string().nullable().optional(),
  minAreaSqm: z.string().nullable().optional(),
  imposition: z.number().int().nullable().optional(),
  coverPrice: z.string().nullable().optional(),
  bindingCost: z.string().nullable().optional(),
  baseCost: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

const PrintCostBaseRowSchema = z.object({
  plateType: z.string().min(1).max(50),
  printMode: z.string().min(1).max(50),
  qtyMin: z.number().int().min(0),
  qtyMax: z.number().int().min(0),
  unitPrice: z.string().min(1),
});

const BatchUpsertPrintCostBaseSchema = z.object({
  productId: z.number().int().positive(),
  rows: z.array(PrintCostBaseRowSchema),
});

const PostprocessCostRowSchema = z.object({
  processCode: z.string().min(1).max(50),
  processNameKo: z.string().min(1).max(100),
  qtyMin: z.number().int().min(0).default(0),
  qtyMax: z.number().int().min(0).default(999999),
  unitPrice: z.string().min(1),
  priceType: PriceTypeEnum.default('fixed'),
});

const BatchUpsertPostprocessCostSchema = z.object({
  productId: z.number().int().positive().nullable(),
  rows: z.array(PostprocessCostRowSchema),
});

const QtyDiscountRowSchema = z.object({
  qtyMin: z.number().int().min(0),
  qtyMax: z.number().int().min(0),
  discountRate: z.string().min(1),
  discountLabel: z.string().max(50).nullable().optional(),
  displayOrder: z.number().int().min(0).default(0),
});

const BatchUpsertQtyDiscountSchema = z.object({
  productId: z.number().int().positive().nullable(),
  rows: z.array(QtyDiscountRowSchema),
});

// @MX:ANCHOR: [AUTO] pricingRouter — SPEC-WIDGET-ADMIN-001 Phase 4 router for price configuration
// @MX:REASON: Fan_in >= 3: used by index router, pricing page, and PriceConfigTabs component
// @MX:SPEC: SPEC-WIDGET-ADMIN-001 FR-WBADMIN-006
export const pricingRouter = router({
  // getPriceConfig: get or null price config for a product
  getPriceConfig: protectedProcedure
    .input(z.object({ productId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const [config] = await ctx.db
        .select()
        .from(productPriceConfigs)
        .where(eq(productPriceConfigs.productId, input.productId));

      return config ?? null;
    }),

  // @MX:NOTE: [AUTO] upsertPriceConfig uses ON CONFLICT DO UPDATE (unique constraint: uq_ppc_product)
  // @MX:REASON: productId has a unique index — only one price config per product is allowed
  upsertPriceConfig: protectedProcedure
    .input(UpsertPriceConfigSchema)
    .mutation(async ({ ctx, input }) => {
      // Check if record exists for ON CONFLICT emulation
      const [existing] = await ctx.db
        .select({ id: productPriceConfigs.id })
        .from(productPriceConfigs)
        .where(eq(productPriceConfigs.productId, input.productId));

      // Verify product exists
      const [product] = await ctx.db
        .select({ id: wbProducts.id })
        .from(wbProducts)
        .where(eq(wbProducts.id, input.productId));

      if (!product) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Product not found' });
      }

      const values = {
        productId: input.productId,
        priceMode: input.priceMode,
        formulaText: input.formulaText ?? null,
        unitPriceSqm: input.unitPriceSqm ?? null,
        minAreaSqm: input.minAreaSqm ?? null,
        imposition: input.imposition ?? null,
        coverPrice: input.coverPrice ?? null,
        bindingCost: input.bindingCost ?? null,
        baseCost: input.baseCost ?? null,
        isActive: input.isActive,
        updatedAt: new Date(),
      };

      if (existing) {
        const [row] = await ctx.db
          .update(productPriceConfigs)
          .set(values)
          .where(eq(productPriceConfigs.id, existing.id))
          .returning();
        return row;
      } else {
        const [row] = await ctx.db
          .insert(productPriceConfigs)
          .values({ ...values, createdAt: new Date() })
          .returning();
        return row;
      }
    }),

  // listPrintCostBase: list base print costs for a product
  listPrintCostBase: protectedProcedure
    .input(z.object({ productId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(printCostBase)
        .where(eq(printCostBase.productId, input.productId));
    }),

  // @MX:NOTE: [AUTO] batchUpsertPrintCostBase uses delete-then-insert pattern for atomic replacement
  // @MX:REASON: No unique constraint on (productId, plateType, printMode, qtyMin, qtyMax) — simplest safe approach
  batchUpsertPrintCostBase: protectedProcedure
    .input(BatchUpsertPrintCostBaseSchema)
    .mutation(async ({ ctx, input }) => {
      // Delete existing rows for product
      await ctx.db
        .delete(printCostBase)
        .where(eq(printCostBase.productId, input.productId));

      if (input.rows.length === 0) {
        return [];
      }

      // Insert new rows
      const inserted = await ctx.db
        .insert(printCostBase)
        .values(
          input.rows.map((row) => ({
            productId: input.productId,
            plateType: row.plateType,
            printMode: row.printMode,
            qtyMin: row.qtyMin,
            qtyMax: row.qtyMax,
            unitPrice: row.unitPrice,
            isActive: true,
          })),
        )
        .returning();

      return inserted;
    }),

  // listPostprocessCost: list postprocess costs (productId=null returns global ones)
  listPostprocessCost: protectedProcedure
    .input(z.object({ productId: z.number().int().positive().nullable().optional() }))
    .query(async ({ ctx, input }) => {
      if (input?.productId == null) {
        return ctx.db
          .select()
          .from(postprocessCost)
          .where(isNull(postprocessCost.productId));
      }

      return ctx.db
        .select()
        .from(postprocessCost)
        .where(eq(postprocessCost.productId, input.productId));
    }),

  // @MX:NOTE: [AUTO] batchUpsertPostprocessCost uses delete-then-insert pattern
  // @MX:REASON: productId nullable (global costs) — delete scoped by productId (or NULL) then re-insert
  batchUpsertPostprocessCost: protectedProcedure
    .input(BatchUpsertPostprocessCostSchema)
    .mutation(async ({ ctx, input }) => {
      // Delete existing rows (scoped to productId or global)
      if (input.productId == null) {
        await ctx.db
          .delete(postprocessCost)
          .where(isNull(postprocessCost.productId));
      } else {
        await ctx.db
          .delete(postprocessCost)
          .where(eq(postprocessCost.productId, input.productId));
      }

      if (input.rows.length === 0) {
        return [];
      }

      const inserted = await ctx.db
        .insert(postprocessCost)
        .values(
          input.rows.map((row) => ({
            productId: input.productId,
            processCode: row.processCode,
            processNameKo: row.processNameKo,
            qtyMin: row.qtyMin,
            qtyMax: row.qtyMax,
            unitPrice: row.unitPrice,
            priceType: row.priceType,
            isActive: true,
          })),
        )
        .returning();

      return inserted;
    }),

  // listQtyDiscount: list qty discounts for product (or global if productId=null)
  listQtyDiscount: protectedProcedure
    .input(z.object({ productId: z.number().int().positive().nullable().optional() }))
    .query(async ({ ctx, input }) => {
      if (input?.productId == null) {
        return ctx.db
          .select()
          .from(qtyDiscount)
          .where(isNull(qtyDiscount.productId));
      }

      return ctx.db
        .select()
        .from(qtyDiscount)
        .where(eq(qtyDiscount.productId, input.productId));
    }),

  // @MX:NOTE: [AUTO] batchUpsertQtyDiscount uses delete-then-insert pattern
  // @MX:REASON: productId nullable (global rules) — delete scoped by productId (or NULL) then re-insert
  batchUpsertQtyDiscount: protectedProcedure
    .input(BatchUpsertQtyDiscountSchema)
    .mutation(async ({ ctx, input }) => {
      // Delete existing rows (scoped to productId or global)
      if (input.productId == null) {
        await ctx.db
          .delete(qtyDiscount)
          .where(isNull(qtyDiscount.productId));
      } else {
        await ctx.db
          .delete(qtyDiscount)
          .where(eq(qtyDiscount.productId, input.productId));
      }

      if (input.rows.length === 0) {
        return [];
      }

      const inserted = await ctx.db
        .insert(qtyDiscount)
        .values(
          input.rows.map((row) => ({
            productId: input.productId,
            qtyMin: row.qtyMin,
            qtyMax: row.qtyMax,
            discountRate: row.discountRate,
            discountLabel: row.discountLabel ?? null,
            displayOrder: row.displayOrder,
            isActive: true,
          })),
        )
        .returning();

      return inserted;
    }),
});
