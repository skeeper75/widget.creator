import { NextRequest } from 'next/server';
import { withMiddleware } from '../../../../../../_lib/middleware/with-middleware.js';
import { withApiKeyAuth } from '../../../../../../_lib/middleware/auth.js';
import { withRateLimit } from '../../../../../../_lib/middleware/rate-limit.js';
import { withValidation } from '../../../../../../_lib/middleware/validation.js';
import { successResponse } from '../../../../../../_lib/utils/response.js';
import { ShopbyOrderStatusSchema } from '../../../../../../_lib/schemas/integration.js';

/**
 * PUT /api/v1/integration/shopby/orders/:id/status - Update Shopby order status (REQ-050).
 */
export const PUT = withMiddleware(
  withRateLimit('api-key'),
  withApiKeyAuth(),
  withValidation(ShopbyOrderStatusSchema, 'body'),
)(async (_req: NextRequest, ctx) => {
  const { id } = ctx.params;
  const body = ctx.validatedBody as {
    status: string;
    tracking_number?: string;
  };

  return successResponse({
    order_id: id,
    shopby_status: body.status,
    tracking_number: body.tracking_number || null,
    updated_at: new Date().toISOString(),
  });
});
