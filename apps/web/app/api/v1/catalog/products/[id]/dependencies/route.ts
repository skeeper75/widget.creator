import { eq, and } from 'drizzle-orm';

import { db } from '@widget-creator/shared/db';
import { optionDependencies } from '@widget-creator/shared/db/schema';
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
    .from(optionDependencies)
    .where(
      and(
        eq(optionDependencies.productId, id),
        eq(optionDependencies.isActive, true),
      ),
    );

  const data = rows.map((r) => ({
    id: r.id,
    parentOptionId: r.parentOptionId,
    parentChoiceId: r.parentChoiceId,
    childOptionId: r.childOptionId,
    dependencyType: r.dependencyType,
  }));

  return Response.json({ data: toSnakeCase(data) });
});
