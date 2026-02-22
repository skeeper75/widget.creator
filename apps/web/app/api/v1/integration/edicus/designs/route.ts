import { NextRequest } from 'next/server';
import { withMiddleware } from '../../../../_lib/middleware/with-middleware.js';
import { withApiKeyAuth } from '../../../../_lib/middleware/auth.js';
import { withRateLimit } from '../../../../_lib/middleware/rate-limit.js';
import { withValidation } from '../../../../_lib/middleware/validation.js';
import { successResponse } from '../../../../_lib/utils/response.js';
import { EdicusDesignCreateSchema } from '../../../../_lib/schemas/integration.js';

// In-memory design store
interface Design {
  id: string;
  order_id: string;
  template_id: string;
  render_data: Record<string, unknown>;
  output_url: string;
  preview_url: string | null;
  status: 'rendering' | 'completed' | 'failed';
  created_at: string;
}

const designs = new Map<string, Design>();

/**
 * POST /api/v1/integration/edicus/designs - Register a design (REQ-052).
 */
export const POST = withMiddleware(
  withRateLimit('api-key'),
  withApiKeyAuth(),
  withValidation(EdicusDesignCreateSchema, 'body'),
)(async (_req: NextRequest, ctx) => {
  const body = ctx.validatedBody as {
    order_id: string;
    template_id: string;
    render_data: Record<string, unknown>;
    output_url: string;
  };

  const designId = `des_${crypto.randomUUID().replace(/-/g, '').substring(0, 8)}`;
  const design: Design = {
    id: designId,
    order_id: body.order_id,
    template_id: body.template_id,
    render_data: body.render_data,
    output_url: body.output_url,
    preview_url: null,
    status: 'rendering',
    created_at: new Date().toISOString(),
  };

  designs.set(designId, design);

  return successResponse(
    {
      design_id: designId,
      status: 'rendering',
    },
    201,
  );
});

// Export for use by detail route
export { designs };
