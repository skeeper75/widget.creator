import { NextRequest } from 'next/server';
import { withMiddleware } from '../../../../_lib/middleware/with-middleware.js';
import { withApiKeyAuth } from '../../../../_lib/middleware/auth.js';
import { withRateLimit } from '../../../../_lib/middleware/rate-limit.js';
import { successResponse } from '../../../../_lib/utils/response.js';

/**
 * GET /api/v1/integration/shopby/categories - Category mapping list (REQ-050).
 */
export const GET = withMiddleware(
  withRateLimit('api-key'),
  withApiKeyAuth(),
)(async (_req: NextRequest) => {
  // MVP: return empty mapping list (category sync is part of SPEC-SHOPBY-002)
  return successResponse([]);
});
