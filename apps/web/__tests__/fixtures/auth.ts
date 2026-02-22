/**
 * Authentication test fixture data for SPEC-WIDGET-API-001.
 * Provides pre-configured tokens, sessions, and API keys for testing.
 */

// ─── Widget Token payloads ──────────────────────────────────────

export const VALID_WIDGET_PAYLOAD = {
  sub: 'wgt_test_001',
  iss: 'widget.huni.co.kr',
  allowed_origins: ['http://localhost:3000', 'https://shop.example.com'],
};

export const WIDGET_PAYLOAD_STRICT_ORIGIN = {
  sub: 'wgt_strict_001',
  iss: 'widget.huni.co.kr',
  allowed_origins: ['https://shop.example.com'],
};

export const WIDGET_PAYLOAD_WILDCARD_ORIGIN = {
  sub: 'wgt_wild_001',
  iss: 'widget.huni.co.kr',
  allowed_origins: ['*'],
};

export const WIDGET_PAYLOAD_NO_ORIGINS = {
  sub: 'wgt_noorigin_001',
  iss: 'widget.huni.co.kr',
  allowed_origins: [],
};

// ─── Admin sessions ─────────────────────────────────────────────

export const ADMIN_SESSION = {
  user: { id: 'admin_001', email: 'admin@huni.co.kr', role: 'ADMIN' as const },
};

export const MANAGER_SESSION = {
  user: { id: 'manager_001', email: 'manager@huni.co.kr', role: 'MANAGER' as const },
};

export const VIEWER_SESSION = {
  user: { id: 'viewer_001', email: 'viewer@huni.co.kr', role: 'VIEWER' as const },
};

// ─── API Keys ───────────────────────────────────────────────────

/** Valid API key (36 chars, UUID v4 format). */
export const VALID_API_KEY = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

/** Short API key (< 32 chars, should fail format validation). */
export const SHORT_API_KEY = 'too-short-key';

/** API key for Shopby integration client. */
export const SHOPBY_API_KEY = 'shopby01-e5f6-7890-abcd-ef1234567890';

/** API key for MES integration client. */
export const MES_API_KEY = 'mes00001-e5f6-7890-abcd-ef1234567890';

// ─── Test origins ───────────────────────────────────────────────

export const ALLOWED_ORIGIN = 'https://shop.example.com';
export const BLOCKED_ORIGIN = 'https://malicious.example.com';
export const ADMIN_ORIGIN = 'http://localhost:3000';

// ─── Rate limit test constants ──────────────────────────────────

export const RATE_LIMITS = {
  'widget-token': { maxRequests: 100, windowMs: 60_000 },
  'api-key': { maxRequests: 1000, windowMs: 60_000 },
  admin: { maxRequests: 5000, windowMs: 60_000 },
  anonymous: { maxRequests: 30, windowMs: 60_000 },
};
