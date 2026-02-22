import { NextRequest } from 'next/server';
import { withMiddleware } from '../../../../../../_lib/middleware/with-middleware.js';
import { withApiKeyAuth } from '../../../../../../_lib/middleware/auth.js';
import { withRateLimit } from '../../../../../../_lib/middleware/rate-limit.js';
import { withValidation } from '../../../../../../_lib/middleware/validation.js';
import { successResponse } from '../../../../../../_lib/utils/response.js';
import { MesDispatchRequestSchema } from '../../../../../../_lib/schemas/integration.js';

/**
 * POST /api/v1/integration/mes/orders/:id/dispatch - Dispatch order to MES (REQ-051).
 */
export const POST = withMiddleware(
  withRateLimit('api-key'),
  withApiKeyAuth(),
  withValidation(MesDispatchRequestSchema, 'body'),
)(async (_req: NextRequest, ctx) => {
  const { id } = ctx.params;
  const body = ctx.validatedBody as {
    production_memo?: string;
  };

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const mesOrderId = `MES-ORD-${dateStr}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

  return successResponse({
    order_id: id,
    mes_order_id: mesOrderId,
    production_memo: body.production_memo || null,
    dispatched_at: now.toISOString(),
    status: 'dispatched',
  });
});
