import { NextRequest } from 'next/server';
import { z } from 'zod';
import { withMiddleware } from '../../../../_lib/middleware/with-middleware.js';
import { withApiKeyAuth } from '../../../../_lib/middleware/auth.js';
import { withRateLimit } from '../../../../_lib/middleware/rate-limit.js';
import { withValidation } from '../../../../_lib/middleware/validation.js';
import { successResponse } from '../../../../_lib/utils/response.js';

const EdicusRenderRequestSchema = z.object({
  designId: z.string(),
  outputFormat: z.enum(['pdf', 'png']).default('pdf'),
  quality: z.enum(['print', 'preview']).default('print'),
});

// In-memory render job store
interface RenderJob {
  jobId: string;
  designId: string;
  outputFormat: string;
  quality: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  resultUrl?: string;
  createdAt: string;
}

export const renderJobs = new Map<string, RenderJob>();

/**
 * POST /api/v1/integration/edicus/render - Trigger print-ready render (REQ-052).
 */
export const POST = withMiddleware(
  withRateLimit('api-key'),
  withApiKeyAuth(),
  withValidation(EdicusRenderRequestSchema, 'body'),
)(async (_req: NextRequest, ctx) => {
  const body = ctx.validatedBody as {
    designId: string;
    outputFormat: string;
    quality: string;
  };

  const jobId = `rnd_${crypto.randomUUID().replace(/-/g, '').substring(0, 8)}`;
  const job: RenderJob = {
    jobId,
    designId: body.designId,
    outputFormat: body.outputFormat,
    quality: body.quality,
    status: 'queued',
    createdAt: new Date().toISOString(),
  };

  renderJobs.set(jobId, job);

  return successResponse(
    {
      render_job_id: jobId,
      status: 'queued',
      design_id: body.designId,
    },
    202,
  );
});
