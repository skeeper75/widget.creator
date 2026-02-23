import { NextRequest } from 'next/server';
import { eq, and, gte, lte, asc, desc, sql, count } from 'drizzle-orm';
import { db, orders, orderStatusHistory } from '@widget-creator/shared/db';
import { withMiddleware } from '../../_lib/middleware/with-middleware.js';
import { withAdminAuth } from '../../_lib/middleware/auth.js';
import { withCors } from '../../_lib/middleware/cors.js';
import { withRateLimit } from '../../_lib/middleware/rate-limit.js';
import { withValidation } from '../../_lib/middleware/validation.js';
import { successResponse, collectionResponse } from '../../_lib/utils/response.js';
import { paginate } from '../../_lib/utils/pagination.js';
import {
  CreateOrderSchema,
  ListOrdersQuerySchema,
  maskPhone,
  type OrderStatus,
} from '../../_lib/schemas/orders.js';

/**
 * Generate a unique order number based on the max existing order number for today.
 */
async function generateOrderNumber(txDb: typeof db): Promise<string> {
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

/**
 * POST /api/v1/orders - Create a new order (REQ-030).
 */
export const POST = withMiddleware(
  withCors('admin'),
  withRateLimit('admin'),
  withAdminAuth(),
  withValidation(CreateOrderSchema, 'body'),
)(async (_req: NextRequest, ctx) => {
  const body = ctx.validatedBody as {
    quote_data: {
      product_id: number;
      size_id: number;
      calculated_price: number;
      breakdown: Record<string, unknown>;
      [key: string]: unknown;
    };
    customer: { name: string; email: string; phone: string; company?: string };
    shipping: { method: string; address?: string; postal_code?: string; memo?: string };
    widget_id?: string;
  };

  const newOrder = await db.transaction(async (tx) => {
    const orderId = `ord_${crypto.randomUUID().replace(/-/g, '').substring(0, 12)}`;
    const orderNumber = await generateOrderNumber(tx);

    const [created] = await tx.insert(orders).values({
      orderId,
      orderNumber,
      status: 'unpaid',
      totalPrice: String(body.quote_data.calculated_price),
      currency: 'KRW',
      quoteData: body.quote_data,
      customerName: body.customer.name,
      customerEmail: body.customer.email,
      customerPhone: body.customer.phone,
      customerCompany: body.customer.company,
      shippingMethod: body.shipping.method,
      shippingAddress: body.shipping.address,
      shippingPostalCode: body.shipping.postal_code,
      shippingMemo: body.shipping.memo,
      widgetId: body.widget_id,
      productId: body.quote_data.product_id,
    }).returning();

    // Insert initial status history
    await tx.insert(orderStatusHistory).values({
      orderId: created.id,
      status: 'unpaid',
    });

    return created;
  });

  return successResponse(
    {
      id: newOrder.orderId,
      order_number: newOrder.orderNumber,
      status: newOrder.status,
      total_price: Number(newOrder.totalPrice),
      customer: { name: newOrder.customerName, email: newOrder.customerEmail },
      created_at: newOrder.createdAt.toISOString(),
    },
    201,
  );
});

/**
 * GET /api/v1/orders - List orders with filtering and pagination (REQ-031).
 */
export const GET = withMiddleware(
  withCors('admin'),
  withRateLimit('admin'),
  withAdminAuth(),
  withValidation(ListOrdersQuerySchema, 'query'),
)(async (req: NextRequest, ctx) => {
  const query = ctx.validatedQuery as {
    status?: OrderStatus;
    customer_email?: string;
    widget_id?: string;
    date_from?: string;
    date_to?: string;
    sort: string;
    order: 'asc' | 'desc';
    page: number;
    limit: number;
  };

  // Build where conditions
  const conditions = [];
  if (query.status) {
    conditions.push(eq(orders.status, query.status));
  }
  if (query.customer_email) {
    conditions.push(eq(orders.customerEmail, query.customer_email));
  }
  if (query.widget_id) {
    conditions.push(eq(orders.widgetId, query.widget_id));
  }
  if (query.date_from) {
    conditions.push(gte(orders.createdAt, new Date(query.date_from)));
  }
  if (query.date_to) {
    conditions.push(lte(orders.createdAt, new Date(query.date_to)));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count
  const [{ value: total }] = await db
    .select({ value: count() })
    .from(orders)
    .where(whereClause);

  // Determine sort column and direction
  const sortCol = query.sort === 'total_price'
    ? orders.totalPrice
    : query.sort === 'order_number'
      ? orders.orderNumber
      : orders.createdAt;
  const sortDir = query.order === 'asc' ? asc(sortCol) : desc(sortCol);

  const basePath = req.nextUrl.pathname;
  const { meta, links, offset } = paginate({
    page: query.page,
    limit: query.limit,
    total: Number(total),
    basePath,
  });

  const rows = await db
    .select()
    .from(orders)
    .where(whereClause)
    .orderBy(sortDir)
    .offset(offset)
    .limit(query.limit);

  const data = rows.map((o) => ({
    id: o.orderId,
    order_number: o.orderNumber,
    status: o.status,
    total_price: Number(o.totalPrice),
    customer: {
      name: o.customerName,
      email: o.customerEmail,
      phone: maskPhone(o.customerPhone),
    },
    has_design_file: false,
    created_at: o.createdAt.toISOString(),
    updated_at: o.updatedAt.toISOString(),
  }));

  return collectionResponse(data, meta, links);
});
