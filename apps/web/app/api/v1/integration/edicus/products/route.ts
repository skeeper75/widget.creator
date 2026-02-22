import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, productEditorMappings, products } from '@widget-creator/shared/db';
import { withMiddleware } from '../../../../_lib/middleware/with-middleware.js';
import { withApiKeyAuth } from '../../../../_lib/middleware/auth.js';
import { withRateLimit } from '../../../../_lib/middleware/rate-limit.js';
import { successResponse } from '../../../../_lib/utils/response.js';

/**
 * GET /api/v1/integration/edicus/products - List Edicus-linked products (REQ-052).
 */
export const GET = withMiddleware(
  withRateLimit('api-key'),
  withApiKeyAuth(),
)(async (_req: NextRequest) => {
  const mappings = await db
    .select({
      product_id: productEditorMappings.productId,
      edicus_code: products.edicusCode,
      editor_type: productEditorMappings.editorType,
      template_id: productEditorMappings.templateId,
      editor_enabled: products.editorEnabled,
    })
    .from(productEditorMappings)
    .leftJoin(products, eq(productEditorMappings.productId, products.id));

  return successResponse(mappings);
});
