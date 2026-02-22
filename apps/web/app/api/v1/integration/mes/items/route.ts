import { NextRequest } from 'next/server';
import { db, mesItems, mesItemOptions } from '@widget-creator/shared/db';
import { eq } from 'drizzle-orm';
import { withMiddleware } from '../../../../_lib/middleware/with-middleware.js';
import { withApiKeyAuth } from '../../../../_lib/middleware/auth.js';
import { withRateLimit } from '../../../../_lib/middleware/rate-limit.js';
import { successResponse } from '../../../../_lib/utils/response.js';

/**
 * GET /api/v1/integration/mes/items - List MES items with options (REQ-051).
 */
export const GET = withMiddleware(
  withRateLimit('api-key'),
  withApiKeyAuth(),
)(async (_req: NextRequest) => {
  const items = await db.select().from(mesItems).orderBy(mesItems.itemCode);

  // Fetch options for all items
  const data = await Promise.all(
    items.map(async (item) => {
      const options = await db
        .select({
          option_number: mesItemOptions.optionNumber,
          option_value: mesItemOptions.optionValue,
        })
        .from(mesItemOptions)
        .where(eq(mesItemOptions.mesItemId, item.id))
        .orderBy(mesItemOptions.optionNumber);

      return {
        id: item.id,
        item_code: item.itemCode,
        group_code: item.groupCode,
        name: item.name,
        item_type: item.itemType,
        options,
      };
    }),
  );

  return successResponse(data);
});
