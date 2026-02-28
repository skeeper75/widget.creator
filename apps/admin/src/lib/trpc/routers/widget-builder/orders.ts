import { z } from 'zod';
import { eq as _eq, and as _and, desc as _desc } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { wbOrders, wbProducts } from '@widget-creator/db';
import { router, protectedProcedure } from '../../server';

// pnpm resolves two drizzle-orm instances (postgres + libsql), causing SQL<unknown> type conflicts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyArg = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const eq = _eq as (a: AnyArg, b: AnyArg) => any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const and = _and as (...conditions: AnyArg[]) => any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const desc = _desc as (col: AnyArg) => any;

// ─── Status enums ─────────────────────────────────────────────────────────────

const OrderStatusEnum = z.enum([
  'created',
  'paid',
  'in_production',
  'shipped',
  'completed',
  'cancelled',
]);

const MesStatusEnum = z.enum([
  'pending',
  'sent',
  'confirmed',
  'failed',
  'not_linked',
]);

// @MX:ANCHOR: [AUTO] wbOrdersRouter — SPEC-WIDGET-ADMIN-001 Phase 4 router for order management
// @MX:REASON: Fan_in >= 3: used by index router, orders page, and OrderDetailPanel component
// @MX:SPEC: SPEC-WIDGET-ADMIN-001 FR-WBADMIN-007
export const wbOrdersRouter = router({
  // list: paginated order list with filters
  list: protectedProcedure
    .input(
      z.object({
        productId: z.number().int().positive().optional(),
        status: OrderStatusEnum.optional(),
        mesStatus: MesStatusEnum.optional(),
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];

      if (input.productId !== undefined) {
        conditions.push(eq(wbOrders.productId, input.productId));
      }
      if (input.status !== undefined) {
        conditions.push(eq(wbOrders.status, input.status));
      }
      if (input.mesStatus !== undefined) {
        conditions.push(eq(wbOrders.mesStatus, input.mesStatus));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const rows = await ctx.db
        .select({
          id: wbOrders.id,
          orderCode: wbOrders.orderCode,
          productId: wbOrders.productId,
          productName: wbProducts.productNameKo,
          recipeId: wbOrders.recipeId,
          recipeVersion: wbOrders.recipeVersion,
          totalPrice: wbOrders.totalPrice,
          status: wbOrders.status,
          mesStatus: wbOrders.mesStatus,
          customerName: wbOrders.customerName,
          customerEmail: wbOrders.customerEmail,
          shopbyOrderNo: wbOrders.shopbyOrderNo,
          mesOrderId: wbOrders.mesOrderId,
          createdAt: wbOrders.createdAt,
          updatedAt: wbOrders.updatedAt,
        })
        .from(wbOrders)
        .leftJoin(wbProducts, eq(wbOrders.productId, wbProducts.id))
        .where(whereClause)
        .orderBy(desc(wbOrders.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return {
        data: rows,
        limit: input.limit,
        offset: input.offset,
      };
    }),

  // getById: get single order with all details
  getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const [order] = await ctx.db
        .select({
          id: wbOrders.id,
          orderCode: wbOrders.orderCode,
          productId: wbOrders.productId,
          productName: wbProducts.productNameKo,
          recipeId: wbOrders.recipeId,
          recipeVersion: wbOrders.recipeVersion,
          selections: wbOrders.selections,
          priceBreakdown: wbOrders.priceBreakdown,
          totalPrice: wbOrders.totalPrice,
          appliedConstraints: wbOrders.appliedConstraints,
          addonItems: wbOrders.addonItems,
          shopbyOrderNo: wbOrders.shopbyOrderNo,
          mesOrderId: wbOrders.mesOrderId,
          mesStatus: wbOrders.mesStatus,
          customerName: wbOrders.customerName,
          customerEmail: wbOrders.customerEmail,
          customerPhone: wbOrders.customerPhone,
          status: wbOrders.status,
          createdAt: wbOrders.createdAt,
          updatedAt: wbOrders.updatedAt,
        })
        .from(wbOrders)
        .leftJoin(wbProducts, eq(wbOrders.productId, wbProducts.id))
        .where(eq(wbOrders.id, input.id));

      if (!order) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
      }

      return order;
    }),

  // @MX:NOTE: [AUTO] resendToMes is idempotent — sets mesStatus='pending' to trigger MES dispatch retry
  // @MX:REASON: Setting to 'pending' allows the MES dispatcher to pick it up again without data loss
  resendToMes: protectedProcedure
    .input(z.object({ orderId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ id: wbOrders.id, mesStatus: wbOrders.mesStatus })
        .from(wbOrders)
        .where(eq(wbOrders.id, input.orderId));

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
      }

      const [row] = await ctx.db
        .update(wbOrders)
        .set({ mesStatus: 'pending', updatedAt: new Date() })
        .where(eq(wbOrders.id, input.orderId))
        .returning();

      return row;
    }),

  // overrideStatus: manual admin status override with enum validation
  overrideStatus: protectedProcedure
    .input(
      z.object({
        orderId: z.number().int().positive(),
        newStatus: OrderStatusEnum,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [existing] = await ctx.db
        .select({ id: wbOrders.id })
        .from(wbOrders)
        .where(eq(wbOrders.id, input.orderId));

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Order not found' });
      }

      const [row] = await ctx.db
        .update(wbOrders)
        .set({ status: input.newStatus, updatedAt: new Date() })
        .where(eq(wbOrders.id, input.orderId))
        .returning();

      return row;
    }),
});
