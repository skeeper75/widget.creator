import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, mesItemOptions } from '@widget-creator/shared/db';
import { withMiddleware } from '../../../../../../_lib/middleware/with-middleware.js';
import { withApiKeyAuth } from '../../../../../../_lib/middleware/auth.js';
import { withRateLimit } from '../../../../../../_lib/middleware/rate-limit.js';
import { successResponse } from '../../../../../../_lib/utils/response.js';

/**
 * GET /api/v1/integration/mes/items/:id/options - MES item options (REQ-051).
 */
export const GET = withMiddleware(
  withRateLimit('api-key'),
  withApiKeyAuth(),
)(async (_req: NextRequest, ctx) => {
  const mesItemId = Number(ctx.params.id);

  const options = await db
    .select({
      id: mesItemOptions.id,
      option_number: mesItemOptions.optionNumber,
      option_value: mesItemOptions.optionValue,
      is_active: mesItemOptions.isActive,
    })
    .from(mesItemOptions)
    .where(eq(mesItemOptions.mesItemId, mesItemId))
    .orderBy(mesItemOptions.optionNumber);

  return successResponse(options);
});
