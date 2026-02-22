import { eq, and } from 'drizzle-orm';

import { db } from '@widget-creator/shared/db';
import { products, fixedPrices } from '@widget-creator/shared/db/schema';
import { FixedPriceQuerySchema } from '@/api/_lib/schemas/pricing';
import type { FixedPriceQueryInput } from '@/api/_lib/schemas/pricing';
import { notFound } from '@/api/_lib/middleware/error-handler';
import { toSnakeCase } from '@/api/_lib/utils/transform';
import { withMiddleware } from '@/api/_lib/middleware/with-middleware';
import { withCors } from '@/api/_lib/middleware/cors';
import { withRateLimit } from '@/api/_lib/middleware/rate-limit';
import { withWidgetAuth } from '@/api/_lib/middleware/auth';
import { withValidation } from '@/api/_lib/middleware/validation';

export const GET = withMiddleware(
  withCors('widget'),
  withRateLimit('widget-token'),
  withWidgetAuth(),
  withValidation(FixedPriceQuerySchema, 'query'),
)(async (_req, ctx) => {
  const id = Number(ctx.params.id);
  const query = ctx.validatedQuery as FixedPriceQueryInput;

  // Verify product exists
  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.id, id));

  if (!product) {
    throw notFound('Product', id);
  }

  const conditions = [
    eq(fixedPrices.productId, id),
    eq(fixedPrices.isActive, true),
  ];

  if (query.size_id !== undefined) {
    conditions.push(eq(fixedPrices.sizeId, query.size_id));
  }
  if (query.paper_id !== undefined) {
    conditions.push(eq(fixedPrices.paperId, query.paper_id));
  }
  if (query.print_mode_id !== undefined) {
    conditions.push(eq(fixedPrices.printModeId, query.print_mode_id));
  }

  const rows = await db
    .select()
    .from(fixedPrices)
    .where(and(...conditions));

  const data = rows.map((r) => ({
    id: r.id,
    sizeId: r.sizeId,
    paperId: r.paperId,
    printModeId: r.printModeId,
    optionLabel: r.optionLabel,
    baseQty: r.baseQty,
    sellingPrice: Number(r.sellingPrice),
    vatIncluded: r.vatIncluded,
  }));

  return Response.json({ data: toSnakeCase(data) });
});
