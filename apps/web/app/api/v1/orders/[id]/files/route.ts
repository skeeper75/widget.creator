import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, orders, orderDesignFiles } from '@widget-creator/shared/db';
import { withMiddleware } from '../../../../_lib/middleware/with-middleware.js';
import { withAdminAuth } from '../../../../_lib/middleware/auth.js';
import { withCors } from '../../../../_lib/middleware/cors.js';
import { withRateLimit } from '../../../../_lib/middleware/rate-limit.js';
import { withValidation } from '../../../../_lib/middleware/validation.js';
import { successResponse } from '../../../../_lib/utils/response.js';
import { notFound } from '../../../../_lib/middleware/error-handler.js';
import { FileUploadRequestSchema, generateFileNumber } from '../../../../_lib/schemas/orders.js';

/**
 * POST /api/v1/orders/:id/files - Generate presigned upload URL (REQ-034).
 */
export const POST = withMiddleware(
  withCors('admin'),
  withRateLimit('admin'),
  withAdminAuth(),
  withValidation(FileUploadRequestSchema, 'body'),
)(async (_req: NextRequest, ctx) => {
  const { id } = ctx.params;
  const body = ctx.validatedBody as {
    filename: string;
    content_type: string;
    file_size: number;
  };

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.orderId, id))
    .limit(1);

  if (!order) {
    throw notFound('Order', id);
  }

  // Extract file extension
  const ext = body.filename.split('.').pop() || 'pdf';

  // Generate file_number from order data
  const quoteData = order.quoteData as Record<string, unknown>;
  const fileNumber = generateFileNumber({
    huniCode: String(quoteData.product_id || '0000'),
    productName: 'product',
    size: String(quoteData.size_id || 'CUSTOM'),
    printMode: String(quoteData.print_mode_id || 'D'),
    paper: String(quoteData.paper_id || 'default'),
    company: order.customerCompany || 'none',
    customerName: order.customerName,
    shopbyId: '00000000',
    qty: (quoteData.quantity as number) || 1,
    ext,
  });

  const fileId = `file_${crypto.randomUUID().replace(/-/g, '').substring(0, 8)}`;
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 min

  // Simulated presigned URL (S3 compatible)
  const uploadUrl = `https://s3.example.com/uploads/${id}/${fileId}/${encodeURIComponent(body.filename)}`;

  // Insert file record into DB
  await db.insert(orderDesignFiles).values({
    orderId: order.id,
    fileId,
    originalName: body.filename,
    fileNumber,
    fileSize: body.file_size,
    mimeType: body.content_type,
    storageUrl: uploadUrl,
    status: 'pending',
  });

  return successResponse({
    upload_url: uploadUrl,
    file_id: fileId,
    file_number: fileNumber,
    expires_at: expiresAt,
    max_size: 524_288_000, // 500MB
  });
});
