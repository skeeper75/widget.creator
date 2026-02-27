import { NextRequest } from 'next/server';
import { withMiddleware } from '../../../../../../_lib/middleware/with-middleware.js';
import { withApiKeyAuth } from '../../../../../../_lib/middleware/auth.js';
import { withRateLimit } from '../../../../../../_lib/middleware/rate-limit.js';
import { withValidation } from '../../../../../../_lib/middleware/validation.js';
import { successResponse } from '../../../../../../_lib/utils/response.js';
import { MesStatusUpdateSchema } from '../../../../../../_lib/schemas/integration.js';

/**
 * PUT /api/v1/integration/mes/orders/:id/status - MES order status callback (REQ-051).
 */
export const PUT = withMiddleware(
  withRateLimit('api-key'),
  withApiKeyAuth(),
  withValidation(MesStatusUpdateSchema, 'body'),
)(async (_req: NextRequest, ctx) => {
  const { id } = ctx.params;
  const body = ctx.validatedBody as {
    mes_status: string;
    barcode?: string;
  };

  return successResponse({
    order_id: id,
    mes_status: body.mes_status,
    barcode: body.barcode || null,
    received_at: new Date().toISOString(),
  });
});
