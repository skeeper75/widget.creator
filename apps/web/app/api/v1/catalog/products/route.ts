import { eq, and, ilike, or, asc, desc, count } from 'drizzle-orm';

import { db } from '@widget-creator/shared/db';
import { products, categories } from '@widget-creator/shared/db/schema';
import { ProductListQuerySchema } from '@/api/_lib/schemas/catalog';
import type { ProductListQueryInput } from '@/api/_lib/schemas/catalog';
import { collectionResponse } from '@/api/_lib/utils/response';
import { paginate } from '@/api/_lib/utils/pagination';
import { withMiddleware } from '@/api/_lib/middleware/with-middleware';
import { withCors } from '@/api/_lib/middleware/cors';
import { withRateLimit } from '@/api/_lib/middleware/rate-limit';
import { withWidgetAuth } from '@/api/_lib/middleware/auth';
import { withValidation } from '@/api/_lib/middleware/validation';

const SORT_COLUMNS = {
  name: products.name,
  created_at: products.createdAt,
  display_order: products.id,
} as const;

export const GET = withMiddleware(
  withCors('widget'),
  withRateLimit('widget-token'),
  withWidgetAuth(),
  withValidation(ProductListQuerySchema, 'query'),
)(async (_req, ctx) => {
  const query = ctx.validatedQuery as ProductListQueryInput;

  const conditions = [];
  conditions.push(eq(products.isActive, query.is_active));

  if (query.category_id !== undefined) {
    conditions.push(eq(products.categoryId, query.category_id));
  }
  if (query.product_type !== undefined) {
    conditions.push(eq(products.productType, query.product_type));
  }
  if (query.pricing_model !== undefined) {
    conditions.push(eq(products.pricingModel, query.pricing_model));
  }
  if (query.search !== undefined && query.search.length > 0) {
    const term = `%${query.search}%`;
    conditions.push(or(ilike(products.name, term), ilike(products.slug, term))!);
  }

  const whereClause = and(...conditions);

  const [{ value: total }] = await db
    .select({ value: count() })
    .from(products)
    .where(whereClause);

  const { meta, links, offset } = paginate({
    page: query.page,
    limit: query.limit,
    total,
    basePath: '/api/v1/catalog/products',
  });

  const sortCol = SORT_COLUMNS[query.sort] ?? products.id;
  const orderFn = query.order === 'desc' ? desc : asc;

  const rows = await db
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
    .where(whereClause)
    .orderBy(orderFn(sortCol))
    .limit(query.limit)
    .offset(offset);

  const data = rows.map(({ product, category }) => ({
    id: product.id,
    categoryId: product.categoryId,
    huniCode: product.huniCode,
    name: product.name,
    slug: product.slug,
    productType: product.productType,
    pricingModel: product.pricingModel,
    orderMethod: product.orderMethod,
    editorEnabled: product.editorEnabled,
    description: product.description,
    isActive: product.isActive,
    category: category
      ? { id: category.id, code: category.code, name: category.name }
      : null,
  }));

  return collectionResponse(data, meta, links);
});
