import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@widget-creator/shared/db';
import { wbOrders } from '@widget-creator/db';
import { withMiddleware } from '../../../_lib/middleware/with-middleware.js';
import { withCors } from '../../../_lib/middleware/cors.js';
import { withRateLimit } from '../../../_lib/middleware/rate-limit.js';
import { notFound } from '../../../_lib/middleware/error-handler.js';
import type { MiddlewareContext } from '../../../_lib/middleware/with-middleware.js';

// SPEC-WB-006 FR-WB006-05 — Order status retrieval endpoint

export const GET = withMiddleware(
  withCors('public'),
  withRateLimit('anonymous'),
)(async (_req: NextRequest, ctx: MiddlewareContext) => {
  const { orderCode } = ctx.params;

  const [order] = await db
    .select({
      orderCode: wbOrders.orderCode,
      status: wbOrders.status,
      mesStatus: wbOrders.mesStatus,
      totalPrice: wbOrders.totalPrice,
      createdAt: wbOrders.createdAt,
      updatedAt: wbOrders.updatedAt,
    })
    .from(wbOrders)
    .where(eq(wbOrders.orderCode, orderCode))
    .limit(1);

  if (!order) {
    throw notFound('Order', orderCode);
  }

  return NextResponse.json({
    orderCode: order.orderCode,
    status: order.status,
    mesStatus: order.mesStatus,
    totalPrice: Number(order.totalPrice),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  });
});
