import { z } from 'zod';
import { eq, and, gte, lte, asc, desc, count, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { db as dbInstance, orders, orderStatusHistory } from '@widget-creator/shared/db';
import { router, publicProcedure, protectedProcedure } from '../trpc.js';

/**
 * Order status type.
 */
export const ORDER_STATUSES = [
  'unpaid',
  'paid',
  'production_waiting',
  'producing',
  'production_done',
  'shipped',
  'cancelled',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * Valid order state transitions (REQ-033).
 */
export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  unpaid: ['paid', 'cancelled'],
  paid: ['production_waiting', 'cancelled'],
  production_waiting: ['producing', 'cancelled'],
  producing: ['production_done'],
  production_done: ['shipped'],
  shipped: [],
  cancelled: [],
};

/**
 * Validate if a state transition is allowed.
 */
function validateTransition(from: OrderStatus, to: OrderStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

function generateOrderId(): string {
  return `ord_${crypto.randomUUID().replace(/-/g, '').substring(0, 12)}`;
}

/**
 * Generate a unique order number based on the max existing order number for today.
 */
async function generateOrderNumber(txDb: typeof dbInstance): Promise<string> {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `HN-${today}-`;
  const [result] = await txDb
    .select({ maxNum: sql<string | null>`MAX(${orders.orderNumber})` })
    .from(orders)
    .where(sql`${orders.orderNumber} LIKE ${prefix + '%'}`);
  let nextCounter = 1;
  if (result?.maxNum) {
    const lastPart = result.maxNum.split('-').pop();
    if (lastPart) {
      nextCounter = parseInt(lastPart, 10) + 1;
    }
  }
  return `${prefix}${String(nextCounter).padStart(4, '0')}`;
}

const CreateOrderInput = z.object({
  quote_data: z.object({
    product_id: z.number().int().positive(),
    size_id: z.number().int().positive(),
    paper_id: z.number().int().positive().optional(),
    print_mode_id: z.number().int().positive().optional(),
    quantity: z.number().int().min(1),
    page_count: z.number().int().min(1).optional(),
    binding_id: z.number().int().positive().optional(),
    post_processes: z
      .array(
        z.object({
          id: z.number().int().positive(),
          sub_option: z.string().optional(),
        }),
      )
      .default([]),
    calculated_price: z.number().positive(),
    breakdown: z.record(z.unknown()),
  }),
  customer: z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    phone: z.string().min(1),
    company: z.string().max(200).optional(),
  }),
  shipping: z.object({
    method: z.enum(['delivery', 'quick', 'pickup']),
    address: z.string().min(1).max(500).optional(),
    postal_code: z.string().optional(),
    memo: z.string().max(500).optional(),
  }),
  widget_id: z.string().optional(),
});

const ListOrdersInput = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  customer_email: z.string().email().optional(),
  widget_id: z.string().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
  sort: z.enum(['created_at', 'total_price', 'order_number']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
});

const UpdateOrderStatusInput = z.object({
  id: z.string(),
  status: z.enum(ORDER_STATUSES),
  memo: z.string().max(500).optional(),
  estimated_date: z.string().optional(),
  tracking_number: z.string().max(100).optional(),
});

export const orderRouter = router({
  /**
   * Create a new order.
   */
  create: protectedProcedure
    .input(CreateOrderInput)
    .mutation(async ({ ctx, input }) => {
      const newOrder = await ctx.db.transaction(async (tx) => {
        const orderId = generateOrderId();
        const orderNumber = await generateOrderNumber(tx);

        const [created] = await tx.insert(orders).values({
          orderId,
          orderNumber,
          status: 'unpaid',
          totalPrice: String(input.quote_data.calculated_price),
          currency: 'KRW',
          quoteData: input.quote_data,
          customerName: input.customer.name,
          customerEmail: input.customer.email,
          customerPhone: input.customer.phone,
          customerCompany: input.customer.company,
          shippingMethod: input.shipping.method,
          shippingAddress: input.shipping.address,
          shippingPostalCode: input.shipping.postal_code,
          shippingMemo: input.shipping.memo,
          widgetId: input.widget_id,
          productId: input.quote_data.product_id,
        }).returning();

        await tx.insert(orderStatusHistory).values({
          orderId: created.id,
          status: 'unpaid',
        });

        return created;
      });

      return {
        id: newOrder.orderId,
        orderNumber: newOrder.orderNumber,
        status: newOrder.status,
        totalPrice: Number(newOrder.totalPrice),
        currency: newOrder.currency,
        createdAt: newOrder.createdAt.toISOString(),
      };
    }),

  /**
   * List orders with filtering and pagination.
   */
  list: publicProcedure
    .input(ListOrdersInput)
    .query(async ({ ctx, input }) => {
      const conditions = [];
      if (input.status) {
        conditions.push(eq(orders.status, input.status));
      }
      if (input.customer_email) {
        conditions.push(eq(orders.customerEmail, input.customer_email));
      }
      if (input.widget_id) {
        conditions.push(eq(orders.widgetId, input.widget_id));
      }
      if (input.date_from) {
        conditions.push(gte(orders.createdAt, new Date(input.date_from)));
      }
      if (input.date_to) {
        conditions.push(lte(orders.createdAt, new Date(input.date_to)));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [{ value: total }] = await ctx.db
        .select({ value: count() })
        .from(orders)
        .where(whereClause);

      const sortCol = input.sort === 'total_price'
        ? orders.totalPrice
        : input.sort === 'order_number'
          ? orders.orderNumber
          : orders.createdAt;
      const sortDir = input.order === 'asc' ? asc(sortCol) : desc(sortCol);

      const offset = (input.page - 1) * input.limit;
      const rows = await ctx.db
        .select()
        .from(orders)
        .where(whereClause)
        .orderBy(sortDir)
        .offset(offset)
        .limit(input.limit);

      return {
        data: rows.map((o) => ({
          id: o.orderId,
          orderNumber: o.orderNumber,
          status: o.status,
          totalPrice: Number(o.totalPrice),
          customer: {
            name: o.customerName,
            email: o.customerEmail,
            phone: o.customerPhone.replace(/(\d{3})-?\d{3,4}-?(\d{4})/, '$1-****-$2'),
          },
          createdAt: o.createdAt.toISOString(),
          updatedAt: o.updatedAt.toISOString(),
        })),
        meta: {
          page: input.page,
          limit: input.limit,
          total: Number(total),
          totalPages: Number(total) > 0 ? Math.ceil(Number(total) / input.limit) : 0,
        },
      };
    }),

  /**
   * Get order detail by ID.
   */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const [order] = await ctx.db
        .select()
        .from(orders)
        .where(eq(orders.orderId, input.id))
        .limit(1);

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Order ${input.id} not found`,
        });
      }

      const history = await ctx.db
        .select()
        .from(orderStatusHistory)
        .where(eq(orderStatusHistory.orderId, order.id));

      return {
        id: order.orderId,
        orderNumber: order.orderNumber,
        status: order.status,
        totalPrice: Number(order.totalPrice),
        currency: order.currency,
        quoteData: order.quoteData,
        customer: {
          name: order.customerName,
          email: order.customerEmail,
          phone: order.customerPhone,
          company: order.customerCompany,
        },
        shipping: {
          method: order.shippingMethod,
          address: order.shippingAddress,
          postalCode: order.shippingPostalCode,
          memo: order.shippingMemo,
          trackingNumber: order.shippingTrackingNumber,
          estimatedDate: order.shippingEstimatedDate,
        },
        statusHistory: history.map((h) => ({
          status: h.status,
          changedAt: h.changedAt.toISOString(),
          memo: h.memo,
        })),
        widgetId: order.widgetId,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
      };
    }),

  /**
   * Update order status with state machine validation (REQ-033).
   */
  updateStatus: protectedProcedure
    .input(UpdateOrderStatusInput)
    .mutation(async ({ ctx, input }) => {
      const [order] = await ctx.db
        .select()
        .from(orders)
        .where(eq(orders.orderId, input.id))
        .limit(1);

      if (!order) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Order ${input.id} not found`,
        });
      }

      const currentStatus = order.status as OrderStatus;
      if (!validateTransition(currentStatus, input.status)) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Cannot transition from '${currentStatus}' to '${input.status}'`,
        });
      }

      const updateValues: Record<string, unknown> = {
        status: input.status,
      };
      if (input.tracking_number) {
        updateValues.shippingTrackingNumber = input.tracking_number;
      }
      if (input.estimated_date) {
        updateValues.shippingEstimatedDate = input.estimated_date;
      }

      const updated = await ctx.db.transaction(async (tx) => {
        const [result] = await tx
          .update(orders)
          .set(updateValues)
          .where(eq(orders.id, order.id))
          .returning();

        await tx.insert(orderStatusHistory).values({
          orderId: order.id,
          status: input.status,
          memo: input.memo,
        });

        return result;
      });

      return {
        id: updated.orderId,
        orderNumber: updated.orderNumber,
        status: updated.status,
        totalPrice: Number(updated.totalPrice),
        updatedAt: updated.updatedAt.toISOString(),
      };
    }),
});
