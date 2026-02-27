import { eq, and, count } from 'drizzle-orm';

import { db } from '@widget-creator/shared/db';
import { categories, products } from '@widget-creator/shared/db/schema';
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
    .select()
    .from(categories)
    .where(eq(categories.id, id));

  if (!row) {
    throw notFound('Category', id);
  }

  const [{ value: productCount }] = await db
    .select({ value: count() })
    .from(products)
    .where(and(eq(products.categoryId, id), eq(products.isActive, true)));

  const [{ value: childrenCount }] = await db
    .select({ value: count() })
    .from(categories)
    .where(eq(categories.parentId, id));

  return successResponse({
    id: row.id,
    code: row.code,
    name: row.name,
    depth: row.depth,
    displayOrder: row.displayOrder,
    iconUrl: row.iconUrl,
    isActive: row.isActive,
    parentId: row.parentId,
    productCount,
    childrenCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
});
