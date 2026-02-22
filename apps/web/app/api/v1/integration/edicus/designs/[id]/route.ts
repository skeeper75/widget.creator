import { NextRequest } from 'next/server';
import { withMiddleware } from '../../../../../_lib/middleware/with-middleware.js';
import { withApiKeyAuth } from '../../../../../_lib/middleware/auth.js';
import { withRateLimit } from '../../../../../_lib/middleware/rate-limit.js';
import { successResponse } from '../../../../../_lib/utils/response.js';
import { notFound } from '../../../../../_lib/middleware/error-handler.js';
import { designs } from '../route.js';

/**
 * GET /api/v1/integration/edicus/designs/:id - Design detail (REQ-052).
 */
export const GET = withMiddleware(
  withRateLimit('api-key'),
  withApiKeyAuth(),
)(async (_req: NextRequest, ctx) => {
  const { id } = ctx.params;
  const design = designs.get(id);

  if (!design) {
    throw notFound('Design', id);
  }

  return successResponse({
    id: design.id,
    order_id: design.order_id,
    template_id: design.template_id,
    status: design.status,
    output_url: design.output_url,
    preview_url: design.preview_url,
    created_at: design.created_at,
  });
});
