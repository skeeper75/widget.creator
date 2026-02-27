import { NextRequest } from 'next/server';
import {
  db,
  productMesMappings,
  optionChoiceMesMappings,
  products,
  mesItems,
  optionChoices,
} from '@widget-creator/shared/db';
import { eq } from 'drizzle-orm';
import { withMiddleware } from '../../../../_lib/middleware/with-middleware.js';
import { withApiKeyAuth } from '../../../../_lib/middleware/auth.js';
import { withRateLimit } from '../../../../_lib/middleware/rate-limit.js';
import { successResponse } from '../../../../_lib/utils/response.js';

/**
 * GET /api/v1/integration/mes/mappings - List product-to-MES mappings (REQ-051).
 */
export const GET = withMiddleware(
  withRateLimit('api-key'),
  withApiKeyAuth(),
)(async (_req: NextRequest) => {
  // Product-MES mappings
  const productMappings = await db
    .select({
      id: productMesMappings.id,
      product_id: productMesMappings.productId,
      product_name: products.name,
      mes_item_id: productMesMappings.mesItemId,
      mes_item_code: mesItems.itemCode,
      cover_type: productMesMappings.coverType,
      is_active: productMesMappings.isActive,
    })
    .from(productMesMappings)
    .leftJoin(products, eq(productMesMappings.productId, products.id))
    .leftJoin(mesItems, eq(productMesMappings.mesItemId, mesItems.id));

  // Option choice-MES mappings
  const choiceMappings = await db
    .select({
      id: optionChoiceMesMappings.id,
      option_choice_id: optionChoiceMesMappings.optionChoiceId,
      option_choice_name: optionChoices.name,
      mes_item_id: optionChoiceMesMappings.mesItemId,
      mes_code: optionChoiceMesMappings.mesCode,
      mapping_type: optionChoiceMesMappings.mappingType,
      mapping_status: optionChoiceMesMappings.mappingStatus,
    })
    .from(optionChoiceMesMappings)
    .leftJoin(optionChoices, eq(optionChoiceMesMappings.optionChoiceId, optionChoices.id));

  return successResponse({
    product_mappings: productMappings,
    choice_mappings: choiceMappings,
  });
});
