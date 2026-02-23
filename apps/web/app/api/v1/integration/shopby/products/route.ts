import { NextRequest } from 'next/server';
import { isNotNull } from 'drizzle-orm';
import { db, products } from '@widget-creator/shared/db';
import { withMiddleware } from '../../../../_lib/middleware/with-middleware.js';
import { withApiKeyAuth } from '../../../../_lib/middleware/auth.js';
import { withRateLimit } from '../../../../_lib/middleware/rate-limit.js';
import { successResponse } from '../../../../_lib/utils/response.js';

/**
 * GET /api/v1/integration/shopby/products - List Shopby-linked products (REQ-050).
 */
export const GET = withMiddleware(
  withRateLimit('api-key'),
  withApiKeyAuth(),
)(async (_req: NextRequest) => {
  const shopbyProducts = await db
    .select({
      product_id: products.id,
      shopby_id: products.shopbyId,
      name: products.name,
      huni_code: products.huniCode,
      is_active: products.isActive,
      updated_at: products.updatedAt,
    })
    .from(products)
    .where(isNotNull(products.shopbyId));

  const data = shopbyProducts.map((p: typeof shopbyProducts[number]) => ({
    product_id: p.product_id,
    shopby_id: p.shopby_id,
    name: p.name,
    sync_status: 'synced' as const,
    last_synced_at: p.updated_at.toISOString(),
  }));

  return successResponse(data);
});
