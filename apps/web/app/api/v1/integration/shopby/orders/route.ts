import { NextRequest } from 'next/server';
import { withMiddleware } from '../../../../_lib/middleware/with-middleware.js';
import { withApiKeyAuth } from '../../../../_lib/middleware/auth.js';
import { withRateLimit } from '../../../../_lib/middleware/rate-limit.js';
import { withValidation } from '../../../../_lib/middleware/validation.js';
import { successResponse } from '../../../../_lib/utils/response.js';
import { ShopbyOrderCreateSchema } from '../../../../_lib/schemas/integration.js';

/**
 * POST /api/v1/integration/shopby/orders - Create Shopby order (REQ-050).
 */
export const POST = withMiddleware(
  withRateLimit('api-key'),
  withApiKeyAuth(),
  withValidation(ShopbyOrderCreateSchema, 'body'),
)(async (_req: NextRequest, ctx) => {
  const body = ctx.validatedBody as {
    order_id: string;
    shopby_product_id: number;
    quantity: number;
    customer_name: string;
    customer_email: string;
  };

  // Simulate Shopby order creation
  const shopbyOrderId = `SB-${Date.now()}`;

  return successResponse(
    {
      shopby_order_id: shopbyOrderId,
      order_id: body.order_id,
      status: 'created',
      created_at: new Date().toISOString(),
    },
    201,
  );
});
