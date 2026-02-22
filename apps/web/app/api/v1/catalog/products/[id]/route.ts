import { eq, and, count } from 'drizzle-orm';

import { db } from '@widget-creator/shared/db';
import {
  products,
  categories,
  productSizes,
  productOptions,
} from '@widget-creator/shared/db/schema';
import { notFound } from '@/api/_lib/middleware/error-handler';
import { successResponse } from '@/api/_lib/utils/response';
import { withMiddleware } from '@/api/_lib/middleware/with-middleware';
import { withCors } from '@/api/_lib/middleware/cors';
import { withRateLimit } from '@/api/_lib/middleware/rate-limit';
import { withWidgetAuth } from '@/api/_lib/middleware/auth';

export const GET = withMiddleware(
  withCors('widget'),
  withRateLimit('widget-token'),
  withWidgetAuth(),
)(async (_req, ctx) => {
  const id = Number(ctx.params.id);

  const [row] = await db
    .select({
      product: products,
      category: {
        id: categories.id,
        code: categories.code,
        name: categories.name,
      },
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.id, id));

  if (!row) {
    throw notFound('Product', id);
  }

  const [{ value: sizesCount }] = await db
    .select({ value: count() })
    .from(productSizes)
    .where(and(eq(productSizes.productId, id), eq(productSizes.isActive, true)));

  const [{ value: optionsCount }] = await db
    .select({ value: count() })
    .from(productOptions)
    .where(and(eq(productOptions.productId, id), eq(productOptions.isActive, true)));

  const { product, category } = row;

  return successResponse({
    id: product.id,
    categoryId: product.categoryId,
    huniCode: product.huniCode,
    edicusCode: product.edicusCode,
    shopbyId: product.shopbyId,
    name: product.name,
    slug: product.slug,
    productType: product.productType,
    pricingModel: product.pricingModel,
    sheetStandard: product.sheetStandard,
    orderMethod: product.orderMethod,
    editorEnabled: product.editorEnabled,
    description: product.description,
    isActive: product.isActive,
    mesRegistered: product.mesRegistered,
    category: category
      ? { id: category.id, code: category.code, name: category.name }
      : null,
    sizesCount,
    optionsCount,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  });
});
