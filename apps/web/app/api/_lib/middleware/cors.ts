import { NextRequest, NextResponse } from 'next/server';
import type { MiddlewareFn } from './with-middleware.js';

export type CorsScope = 'widget' | 'admin' | 'integration' | 'public';

const ADMIN_ORIGIN = process.env.ADMIN_ORIGIN || 'http://localhost:3000';

const CORS_HEADERS_BASE = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Widget-Token, X-API-Key',
  'Access-Control-Max-Age': '86400',
};

function getAllowedOrigin(
  scope: CorsScope,
  origin: string | null,
  widgetOrigins?: string[],
): string | null {
  switch (scope) {
    case 'public':
      return '*';
    case 'admin':
      return origin === ADMIN_ORIGIN ? ADMIN_ORIGIN : null;
    case 'widget':
      if (!origin) return null;
      if (widgetOrigins?.includes(origin) || widgetOrigins?.includes('*')) {
        return origin;
      }
      return null;
    case 'integration':
      // Server-to-server, no CORS needed
      return null;
    default:
      return null;
  }
}

/**
 * CORS middleware with scope-specific origin policies.
 * Handles OPTIONS preflight automatically.
 */
export function withCors(scope: CorsScope): MiddlewareFn {
  return async (req, ctx) => {
    const origin = req.headers.get('origin');

    // Integration scope: no CORS headers needed
    if (scope === 'integration') return;

    const widgetOrigins = ctx.widgetToken?.allowed_origins;
    const allowedOrigin = getAllowedOrigin(scope, origin, widgetOrigins);

    // For preflight OPTIONS requests, always respond
    if (req.method === 'OPTIONS') {
      const headers: Record<string, string> = { ...CORS_HEADERS_BASE };
      if (allowedOrigin) {
        headers['Access-Control-Allow-Origin'] = allowedOrigin;
        if (allowedOrigin !== '*') {
          headers['Vary'] = 'Origin';
        }
      }
      return new NextResponse(null, { status: 204, headers });
    }

    // For non-preflight, set CORS headers on the response
    // We store the headers in context for the final response to pick up
    if (allowedOrigin) {
      const corsHeaders: Record<string, string> = {
        'Access-Control-Allow-Origin': allowedOrigin,
      };
      if (allowedOrigin !== '*') {
        corsHeaders['Vary'] = 'Origin';
      }
      ctx.corsHeaders = corsHeaders;
    }
  };
}
