import { NextRequest, NextResponse } from 'next/server';
import { withMiddleware } from '../../../../../../_lib/middleware/with-middleware.js';
import { withApiKeyAuth } from '../../../../../../_lib/middleware/auth.js';
import { withRateLimit } from '../../../../../../_lib/middleware/rate-limit.js';
import { successResponse } from '../../../../../../_lib/utils/response.js';
import { renderJobs } from '../../route.js';

/**
 * GET /api/v1/integration/edicus/render/:id/status - Render job status (REQ-052).
 */
export const GET = withMiddleware(
  withRateLimit('api-key'),
  withApiKeyAuth(),
)(async (_req: NextRequest, ctx) => {
  const jobId = ctx.params.id;
  const job = renderJobs.get(jobId);

  if (!job) {
    return NextResponse.json(
      { type: 'not-found', message: 'Render job not found' },
      { status: 404 },
    );
  }

  return successResponse({
    render_job_id: job.jobId,
    design_id: job.designId,
    status: job.status,
    output_format: job.outputFormat,
    quality: job.quality,
    result_url: job.resultUrl ?? null,
    created_at: job.createdAt,
  });
});
