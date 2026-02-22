import { eq, and, asc } from 'drizzle-orm';

import { db } from '@widget-creator/shared/db';
import { papers, paperProductMappings } from '@widget-creator/shared/db/schema';
import { ProductPaperQuerySchema } from '@/api/_lib/schemas/catalog';
import type { ProductPaperQueryInput } from '@/api/_lib/schemas/catalog';
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
  withValidation(ProductPaperQuerySchema, 'query'),
)(async (_req, ctx) => {
  const id = Number(ctx.params.id);
  const query = ctx.validatedQuery as ProductPaperQueryInput;

  const conditions = [
    eq(paperProductMappings.productId, id),
    eq(paperProductMappings.isActive, true),
    eq(papers.isActive, true),
  ];

  if (query.cover_type !== undefined) {
    conditions.push(eq(paperProductMappings.coverType, query.cover_type));
  }

  const rows = await db
    .select({
      paper: papers,
      mapping: paperProductMappings,
    })
    .from(paperProductMappings)
    .innerJoin(papers, eq(paperProductMappings.paperId, papers.id))
    .where(and(...conditions))
    .orderBy(asc(papers.displayOrder));

  const data = rows.map(({ paper, mapping }) => ({
    id: paper.id,
    code: paper.code,
    name: paper.name,
    abbreviation: paper.abbreviation,
    weight: paper.weight,
    coverType: mapping.coverType,
    isDefault: mapping.isDefault,
    displayOrder: paper.displayOrder,
  }));

  return Response.json({ data: toSnakeCase(data) });
});
