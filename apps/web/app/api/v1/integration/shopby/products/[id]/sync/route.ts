import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, products } from '@widget-creator/shared/db';
import { withMiddleware } from '../../../../../../_lib/middleware/with-middleware.js';
import { withApiKeyAuth } from '../../../../../../_lib/middleware/auth.js';
import { withRateLimit } from '../../../../../../_lib/middleware/rate-limit.js';
import { withValidation } from '../../../../../../_lib/middleware/validation.js';
import { successResponse } from '../../../../../../_lib/utils/response.js';
import { notFound } from '../../../../../../_lib/middleware/error-handler.js';
import { ShopbySyncRequestSchema } from '../../../../../../_lib/schemas/integration.js';

/**
 * POST /api/v1/integration/shopby/products/:id/sync - Sync product to Shopby (REQ-050).
 */
export const POST = withMiddleware(
  withRateLimit('api-key'),
  withApiKeyAuth(),
  withValidation(ShopbySyncRequestSchema, 'body'),
)(async (_req: NextRequest, ctx) => {
  const productId = Number(ctx.params.id);

  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId));

  if (!product) {
    throw notFound('Product', productId);
  }

  // Simulate sync - in production this would push data to Shopby API
  return successResponse({
    sync_status: 'synced',
    product_id: product.id,
    shopby_id: product.shopbyId,
    changes: [
      {
        field: 'name',
        action: 'synced',
        value: product.name,
      },
    ],
    synced_at: new Date().toISOString(),
  });
});
