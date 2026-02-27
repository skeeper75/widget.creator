import { eq, and, asc } from 'drizzle-orm';

import { db } from '@widget-creator/shared/db';
import { productSizes } from '@widget-creator/shared/db/schema';
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
    .from(productSizes)
    .where(and(eq(productSizes.productId, id), eq(productSizes.isActive, true)))
    .orderBy(asc(productSizes.displayOrder));

  const data = rows.map((r) => {
    const item: Record<string, unknown> = {
      id: r.id,
      code: r.code,
      displayName: r.displayName,
      cutWidth: r.cutWidth ? Number(r.cutWidth) : null,
      cutHeight: r.cutHeight ? Number(r.cutHeight) : null,
      workWidth: r.workWidth ? Number(r.workWidth) : null,
      workHeight: r.workHeight ? Number(r.workHeight) : null,
      bleed: r.bleed ? Number(r.bleed) : null,
      impositionCount: r.impositionCount,
      isCustom: r.isCustom,
      displayOrder: r.displayOrder,
    };

    if (r.isCustom) {
      item.customMinW = r.customMinW ? Number(r.customMinW) : null;
      item.customMinH = r.customMinH ? Number(r.customMinH) : null;
      item.customMaxW = r.customMaxW ? Number(r.customMaxW) : null;
      item.customMaxH = r.customMaxH ? Number(r.customMaxH) : null;
    }

    return item;
  });

  return Response.json({ data: toSnakeCase(data) });
});
