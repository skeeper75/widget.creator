import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db, widgets } from '@widget-creator/shared/db';
import { withMiddleware } from '../../../_lib/middleware/with-middleware.js';
import { withCors } from '../../../_lib/middleware/cors.js';
import { withRateLimit } from '../../../_lib/middleware/rate-limit.js';
import { notFound, forbidden } from '../../../_lib/middleware/error-handler.js';

/**
 * GET /api/widget/config/:widgetId - Widget configuration (REQ-060).
 * Public endpoint with 5-minute cache.
 */
export const GET = withMiddleware(
  withCors('public'),
  withRateLimit('anonymous'),
)(async (_req: NextRequest, ctx) => {
  const { widgetId } = ctx.params;

  const [widget] = await db
    .select()
    .from(widgets)
    .where(eq(widgets.widgetId, widgetId))
    .limit(1);

  if (!widget) {
    throw notFound('Widget', widgetId);
  }

  if (widget.status !== 'active') {
    throw forbidden('Widget is inactive');
  }

  return NextResponse.json(
    {
      data: {
        widget_id: widget.widgetId,
        name: widget.name,
        status: widget.status,
        theme: widget.theme,
        api_base_url: widget.apiBaseUrl || process.env.API_BASE_URL || 'http://localhost:3000/api/v1',
        allowed_origins: widget.allowedOrigins,
        features: widget.features,
      },
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=300',
        'Content-Type': 'application/json',
      },
    },
  );
});
