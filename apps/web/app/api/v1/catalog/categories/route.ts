import { eq, and } from 'drizzle-orm';

import { db } from '@widget-creator/shared/db';
import { categories } from '@widget-creator/shared/db/schema';
import { CategoryTreeQuerySchema } from '@/api/_lib/schemas/catalog';
import type { CategoryNode, CategoryTreeQueryInput } from '@/api/_lib/schemas/catalog';
import { withMiddleware } from '@/api/_lib/middleware/with-middleware';
import { withCors } from '@/api/_lib/middleware/cors';
import { withRateLimit } from '@/api/_lib/middleware/rate-limit';
import { withWidgetAuth } from '@/api/_lib/middleware/auth';
import { withValidation } from '@/api/_lib/middleware/validation';

function buildTree(
  rows: typeof categories.$inferSelect[],
  parentId: number | null,
  currentDepth: number,
  maxDepth?: number,
): CategoryNode[] {
  if (maxDepth !== undefined && currentDepth > maxDepth) return [];

  return rows
    .filter((r) => r.parentId === parentId)
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      depth: r.depth,
      display_order: r.displayOrder,
      icon_url: r.iconUrl,
      is_active: r.isActive,
      children: buildTree(rows, r.id, currentDepth + 1, maxDepth),
    }));
}

export const GET = withMiddleware(
  withCors('widget'),
  withRateLimit('widget-token'),
  withWidgetAuth(),
  withValidation(CategoryTreeQuerySchema, 'query'),
)(async (_req, ctx) => {
  const query = ctx.validatedQuery as CategoryTreeQueryInput;

  const conditions = [];
  if (!query.include_inactive) {
    conditions.push(eq(categories.isActive, true));
  }

  const rows = await db
    .select()
    .from(categories)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const tree = buildTree(rows, null, 0, query.depth);

  return Response.json({
    data: tree,
    meta: { total: rows.length },
  });
});
