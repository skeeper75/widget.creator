import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, orders, orderStatusHistory, orderDesignFiles } from '@widget-creator/shared/db';
import { withMiddleware } from '../../../_lib/middleware/with-middleware.js';
import { withAdminAuth } from '../../../_lib/middleware/auth.js';
import { withCors } from '../../../_lib/middleware/cors.js';
import { withRateLimit } from '../../../_lib/middleware/rate-limit.js';
import { withValidation } from '../../../_lib/middleware/validation.js';
import { successResponse } from '../../../_lib/utils/response.js';
import { notFound, invalidStateTransition } from '../../../_lib/middleware/error-handler.js';
import {
  UpdateOrderStatusSchema,
  VALID_TRANSITIONS,
  type OrderStatus,
} from '../../../_lib/schemas/orders.js';

/**
 * GET /api/v1/orders/:id - Order detail (REQ-032).
 */
export const GET = withMiddleware(
  withCors('admin'),
  withRateLimit('admin'),
  withAdminAuth(),
)(async (_req: NextRequest, ctx) => {
  const { id } = ctx.params;

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.orderId, id))
    .limit(1);

  if (!order) {
    throw notFound('Order', id);
  }

  // Fetch related status history and design files
  const history = await db
    .select()
    .from(orderStatusHistory)
    .where(eq(orderStatusHistory.orderId, order.id));

  const files = await db
    .select()
    .from(orderDesignFiles)
    .where(eq(orderDesignFiles.orderId, order.id));

  return successResponse({
    id: order.orderId,
    order_number: order.orderNumber,
    status: order.status,
    total_price: Number(order.totalPrice),
    currency: order.currency,
    quote_data: order.quoteData,
    customer: {
      name: order.customerName,
      email: order.customerEmail,
      phone: order.customerPhone,
      company: order.customerCompany,
    },
    shipping: {
      method: order.shippingMethod,
      address: order.shippingAddress,
      postal_code: order.shippingPostalCode,
      memo: order.shippingMemo,
      tracking_number: order.shippingTrackingNumber,
      estimated_date: order.shippingEstimatedDate,
    },
    design_files: files.map((f) => ({
      id: f.fileId,
      original_name: f.originalName,
      file_number: f.fileNumber,
      file_size: f.fileSize,
      mime_type: f.mimeType,
      status: f.status,
      uploaded_at: f.uploadedAt.toISOString(),
    })),
    status_history: history.map((h) => ({
      status: h.status,
      changed_at: h.changedAt.toISOString(),
      memo: h.memo,
    })),
    widget_id: order.widgetId,
    created_at: order.createdAt.toISOString(),
    updated_at: order.updatedAt.toISOString(),
  });
});

/**
 * PATCH /api/v1/orders/:id - Update order status (REQ-033).
 */
export const PATCH = withMiddleware(
  withCors('admin'),
  withRateLimit('admin'),
  withAdminAuth(),
  withValidation(UpdateOrderStatusSchema, 'body'),
)(async (_req: NextRequest, ctx) => {
  const { id } = ctx.params;
  const body = ctx.validatedBody as {
    status: OrderStatus;
    memo?: string;
    estimated_date?: string;
    tracking_number?: string;
  };

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.orderId, id))
    .limit(1);

  if (!order) {
    throw notFound('Order', id);
  }

  // Validate state transition (REQ-033)
  const currentStatus = order.status as OrderStatus;
  const validNextStatuses = VALID_TRANSITIONS[currentStatus];
  if (!validNextStatuses || !validNextStatuses.includes(body.status)) {
    throw invalidStateTransition(currentStatus, body.status);
  }

  // Update order status and optional shipping fields
  const updateValues: Record<string, unknown> = {
    status: body.status,
  };
  if (body.tracking_number) {
    updateValues.shippingTrackingNumber = body.tracking_number;
  }
  if (body.estimated_date) {
    updateValues.shippingEstimatedDate = body.estimated_date;
  }

  const [updated] = await db
    .update(orders)
    .set(updateValues)
    .where(eq(orders.id, order.id))
    .returning();

  // Insert status history record
  await db.insert(orderStatusHistory).values({
    orderId: order.id,
    status: body.status,
    memo: body.memo,
  });

  return successResponse({
    id: updated.orderId,
    order_number: updated.orderNumber,
    status: updated.status,
    total_price: Number(updated.totalPrice),
    updated_at: updated.updatedAt.toISOString(),
  });
});
