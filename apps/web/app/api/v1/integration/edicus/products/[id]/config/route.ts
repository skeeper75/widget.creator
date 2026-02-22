import { NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import {
  db,
  products,
  productSizes,
  productOptions,
  productEditorMappings,
} from '@widget-creator/shared/db';
import { withMiddleware } from '../../../../../../_lib/middleware/with-middleware.js';
import { withApiKeyAuth } from '../../../../../../_lib/middleware/auth.js';
import { withRateLimit } from '../../../../../../_lib/middleware/rate-limit.js';
import { successResponse } from '../../../../../../_lib/utils/response.js';
import { notFound } from '../../../../../../_lib/middleware/error-handler.js';

/**
 * GET /api/v1/integration/edicus/products/:id/config - Editor product config (REQ-052).
 */
export const GET = withMiddleware(
  withRateLimit('api-key'),
  withApiKeyAuth(),
)(async (_req: NextRequest, ctx) => {
  const productId = Number(ctx.params.id);

  const [product] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId));

  if (!product) {
    throw notFound('Product', productId);
  }

  const [editorMapping] = await db
    .select()
    .from(productEditorMappings)
    .where(eq(productEditorMappings.productId, productId));

  if (!editorMapping) {
    throw notFound('Editor mapping', productId);
  }

  const sizes = await db
    .select()
    .from(productSizes)
    .where(eq(productSizes.productId, productId))
    .orderBy(productSizes.displayOrder);

  const options = await db
    .select()
    .from(productOptions)
    .where(eq(productOptions.productId, productId))
    .orderBy(productOptions.displayOrder);

  return successResponse({
    product: {
      id: product.id,
      name: product.name,
      product_type: product.productType,
      editor_enabled: product.editorEnabled,
    },
    editor: {
      editor_type: editorMapping.editorType,
      template_id: editorMapping.templateId,
      template_config: editorMapping.templateConfig,
    },
    sizes,
    options,
  });
});
