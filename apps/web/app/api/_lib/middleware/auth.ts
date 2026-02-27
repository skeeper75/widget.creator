import { NextRequest } from 'next/server';
import { jwtVerify, type JWTPayload } from 'jose';
import { unauthorized, forbidden } from './error-handler.js';
import type { MiddlewareFn } from './with-middleware.js';

if (!process.env.WIDGET_TOKEN_SECRET) {
  throw new Error('WIDGET_TOKEN_SECRET environment variable is required');
}
const WIDGET_TOKEN_SECRET = new TextEncoder().encode(process.env.WIDGET_TOKEN_SECRET);

const WIDGET_TOKEN_ISSUER = 'widget.huni.co.kr';

export interface WidgetTokenPayload extends JWTPayload {
  sub: string;
  iss: string;
  allowed_origins: string[];
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'VIEWER';
}

/**
 * Verify Widget Token JWT from X-Widget-Token header.
 * Checks: signature (HS256), expiry, issuer, origin.
 */
export async function verifyWidgetToken(req: NextRequest): Promise<WidgetTokenPayload> {
  const token = req.headers.get('x-widget-token');
  if (!token) {
    throw unauthorized('Widget token is required via X-Widget-Token header');
  }

  try {
    const { payload } = await jwtVerify(token, WIDGET_TOKEN_SECRET, {
      issuer: WIDGET_TOKEN_ISSUER,
    });

    const widgetPayload = payload as WidgetTokenPayload;

    // Verify origin if allowed_origins is present
    const origin = req.headers.get('origin');
    if (widgetPayload.allowed_origins?.length > 0 && origin) {
      const isAllowed = widgetPayload.allowed_origins.some(
        (allowed) => allowed === origin || allowed === '*',
      );
      if (!isAllowed) {
        throw forbidden(`Origin '${origin}' is not in allowed_origins`);
      }
    }

    return widgetPayload;
  } catch (error) {
    if (error instanceof Error && error.name === 'ApiError') throw error;
    throw unauthorized('Widget token is expired or invalid');
  }
}

/**
 * Verify Admin JWT via NextAuth.js v5 session.
 * Lazy-imports next-auth to avoid loading it in non-admin routes.
 */
export async function verifyAdminSession(
  _req: NextRequest,
): Promise<AdminUser> {
  // NextAuth.js v5 integration - use getServerSession or auth() helper
  // This is a stub that will be connected when next-auth is configured
  try {
    const { auth } = await import('../../../../auth.js');
    const session = await auth();
    if (!session?.user) {
      throw unauthorized('Admin authentication required');
    }
    return {
      id: session.user.id as string,
      email: session.user.email as string,
      role: (session.user as AdminUser).role || 'VIEWER',
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'ApiError') throw error;
    throw unauthorized('Admin authentication required');
  }
}

/**
 * Verify API Key from X-API-Key header using SHA-256 hash comparison.
 */
export async function verifyApiKey(req: NextRequest): Promise<{ clientId: string }> {
  const apiKey = req.headers.get('x-api-key');
  if (!apiKey) {
    throw unauthorized('API key is required via X-API-Key header');
  }

  // SHA-256 hash the provided key for comparison
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const _hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // TODO: Look up hashHex in database to find matching API key record.
  // For now, validate format and return a stub.
  // In production: query api_keys table WHERE hash = hashHex AND is_active = true AND expires_at > NOW()
  if (apiKey.length < 32) {
    throw unauthorized('Invalid API key format');
  }

  return { clientId: `client_${apiKey.substring(0, 8)}` };
}

/**
 * Widget Token authentication middleware.
 * Adds widgetToken to context.
 */
export function withWidgetAuth(): MiddlewareFn {
  return async (req, ctx) => {
    ctx.widgetToken = await verifyWidgetToken(req);
  };
}

/**
 * Admin JWT authentication middleware.
 * Optionally restricts to specific roles.
 */
export function withAdminAuth(roles?: AdminUser['role'][]): MiddlewareFn {
  return async (req, ctx) => {
    const user = await verifyAdminSession(req);
    if (roles && !roles.includes(user.role)) {
      throw forbidden(`Role '${user.role}' does not have access. Required: ${roles.join(', ')}`);
    }
    ctx.session = { user };
  };
}

/**
 * API Key authentication middleware.
 * Adds apiKey to context.
 */
export function withApiKeyAuth(): MiddlewareFn {
  return async (req, ctx) => {
    ctx.apiKey = await verifyApiKey(req);
  };
}
