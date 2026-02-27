import { NextRequest } from 'next/server';
import { type ZodType, ZodError } from 'zod';
import { validationError, type ValidationErrorDetail } from './error-handler.js';
import type { MiddlewareFn } from './with-middleware.js';

export type ValidationSource = 'body' | 'query' | 'params';

function parseQueryParams(req: NextRequest): Record<string, string> {
  const params: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

/**
 * Zod validation middleware.
 * Validates request data from the specified source and stores the result in context.
 *
 * @param schema - Zod schema to validate against
 * @param source - Where to read input from: 'body' (JSON), 'query' (URL params), or 'params' (route params)
 */
export function withValidation(schema: ZodType, source: ValidationSource = 'body'): MiddlewareFn {
  return async (req, ctx) => {
    let rawData: unknown;

    switch (source) {
      case 'body':
        try {
          rawData = await req.json();
        } catch {
          const errors: ValidationErrorDetail[] = [
            { code: 'invalid_json', message: 'Request body must be valid JSON' },
          ];
          throw validationError(errors);
        }
        break;
      case 'query':
        rawData = parseQueryParams(req);
        break;
      case 'params':
        rawData = ctx.params;
        break;
    }

    const result = schema.safeParse(rawData);

    if (!result.success) {
      const details: ValidationErrorDetail[] = result.error.issues.map((issue) => ({
        field: issue.path.length > 0 ? issue.path.join('.') : undefined,
        code: issue.code,
        message: issue.message,
        received: 'received' in issue ? (issue as { received?: unknown }).received : undefined,
      }));
      throw validationError(details);
    }

    switch (source) {
      case 'body':
        ctx.validatedBody = result.data;
        break;
      case 'query':
        ctx.validatedQuery = result.data;
        break;
      case 'params':
        ctx.validatedParams = result.data;
        break;
    }
  };
}
