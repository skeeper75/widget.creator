import { eq, and } from 'drizzle-orm';

import { db } from '@widget-creator/shared/db';
import { optionConstraints } from '@widget-creator/shared/db/schema';
import { toSnakeCase } from '@/api/_lib/utils/transform';
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

  const rows = await db
    .select()
    .from(optionConstraints)
    .where(
      and(
        eq(optionConstraints.productId, id),
        eq(optionConstraints.isActive, true),
      ),
    );

  const data = rows.map((r) => ({
    id: r.id,
    constraintType: r.constraintType,
    sourceOptionId: r.sourceOptionId,
    sourceField: r.sourceField,
    operator: r.operator,
    value: r.value,
    targetOptionId: r.targetOptionId,
    targetField: r.targetField,
    targetAction: r.targetAction,
    description: r.description,
    priority: r.priority,
  }));

  return Response.json({ data: toSnakeCase(data) });
});
