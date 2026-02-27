import { NextRequest, NextResponse } from 'next/server';
import { handleError } from './error-handler.js';
import type { WidgetTokenPayload, AdminUser } from './auth.js';

/**
 * Shared context passed through the middleware chain.
 * Each middleware can enrich this context for downstream middleware and the handler.
 */
export interface MiddlewareContext {
  params: Record<string, string>;
  validatedBody?: unknown;
  validatedQuery?: unknown;
  validatedParams?: unknown;
  widgetToken?: WidgetTokenPayload;
  session?: { user: AdminUser };
  apiKey?: { clientId: string };
  corsHeaders?: Record<string, string>;
  rateLimitHeaders?: Record<string, string>;
}

/**
 * A middleware function receives the request and a mutable context.
 * - Return void to continue to the next middleware.
 * - Return a NextResponse to short-circuit (e.g., OPTIONS preflight).
 * - Throw an ApiError to abort with an error response.
 */
export type MiddlewareFn = (
  req: NextRequest,
  ctx: MiddlewareContext,
) => Promise<NextResponse | void>;

/**
 * A route handler receives the request and the enriched context.
 */
export type RouteHandler = (
  req: NextRequest,
  ctx: MiddlewareContext,
) => Promise<NextResponse | Response>;

/**
 * Next.js App Router route handler signature.
 */
type NextRouteHandler = (
  req: NextRequest,
  routeCtx: { params: Promise<Record<string, string>> },
) => Promise<NextResponse | Response>;

/**
 * Higher-order function that composes middleware and a route handler.
 *
 * Middleware executes sequentially. If any middleware returns a NextResponse,
 * the chain short-circuits. The handler is wrapped with error handling.
 *
 * CORS and rate-limit headers from context are automatically applied to the final response.
 *
 * @example
 * export const GET = withMiddleware(
 *   withCors('widget'),
 *   withRateLimit('widget-token'),
 *   withWidgetAuth(),
 *   withValidation(ProductListQuerySchema, 'query'),
 * )(async (req, ctx) => {
 *   const { page, limit } = ctx.validatedQuery as { page: number; limit: number };
 *   return successResponse(data);
 * });
 */
export function withMiddleware(...middlewares: MiddlewareFn[]) {
  return (handler: RouteHandler): NextRouteHandler => {
    return async (req: NextRequest, routeCtx: { params: Promise<Record<string, string>> }) => {
      const ctx: MiddlewareContext = {
        params: await routeCtx.params,
      };

      try {
        // Execute middleware sequentially
        for (const mw of middlewares) {
          const result = await mw(req, ctx);
          if (result instanceof NextResponse) {
            // Short-circuit: middleware returned a response (e.g., OPTIONS preflight)
            return applyHeaders(result, ctx);
          }
        }

        // All middleware passed, execute handler
        const response = await handler(req, ctx);
        return applyHeaders(response, ctx);
      } catch (error) {
        const errorResponse = handleError(error, req.nextUrl.pathname);
        return applyHeaders(errorResponse, ctx);
      }
    };
  };
}

/**
 * Apply accumulated headers (CORS, rate-limit) from middleware context to the response.
 */
function applyHeaders(response: NextResponse | Response, ctx: MiddlewareContext): NextResponse | Response {
  if (ctx.corsHeaders) {
    for (const [key, value] of Object.entries(ctx.corsHeaders)) {
      response.headers.set(key, value);
    }
  }
  if (ctx.rateLimitHeaders) {
    for (const [key, value] of Object.entries(ctx.rateLimitHeaders)) {
      response.headers.set(key, value);
    }
  }
  return response;
}
