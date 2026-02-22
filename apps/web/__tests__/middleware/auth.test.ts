import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { SignJWT } from 'jose';
import { verifyWidgetToken, verifyApiKey, withApiKeyAuth } from '../../app/api/_lib/middleware/auth.js';
import { ApiError } from '../../app/api/_lib/middleware/error-handler.js';

const TEST_SECRET = new TextEncoder().encode('widget-token-secret-change-in-production');

async function createWidgetToken(payload: Record<string, unknown>, expiresIn = '1h'): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer('widget.huni.co.kr')
    .setSubject(payload.sub as string || 'wgt_test')
    .setExpirationTime(expiresIn)
    .setIssuedAt()
    .sign(TEST_SECRET);
}

function createRequest(headers: Record<string, string> = {}, origin?: string): NextRequest {
  const h = new Headers(headers);
  if (origin) h.set('origin', origin);
  return new NextRequest('http://localhost:3000/api/v1/catalog/products', { headers: h });
}

describe('verifyWidgetToken', () => {
  it('should verify a valid widget token', async () => {
    const token = await createWidgetToken({
      sub: 'wgt_test123',
      allowed_origins: ['http://localhost:3000'],
    });
    const req = createRequest({ 'x-widget-token': token }, 'http://localhost:3000');

    const payload = await verifyWidgetToken(req);

    expect(payload.sub).toBe('wgt_test123');
    expect(payload.iss).toBe('widget.huni.co.kr');
    expect(payload.allowed_origins).toContain('http://localhost:3000');
  });

  it('should throw 401 when token is missing', async () => {
    const req = createRequest();

    await expect(verifyWidgetToken(req)).rejects.toThrow(ApiError);
    try {
      await verifyWidgetToken(req);
    } catch (e) {
      expect((e as ApiError).status).toBe(401);
    }
  });

  it('should throw 401 for expired token', async () => {
    const token = await createWidgetToken({ sub: 'wgt_test' }, '0s');
    // Wait a moment for expiry
    await new Promise((r) => setTimeout(r, 100));
    const req = createRequest({ 'x-widget-token': token });

    await expect(verifyWidgetToken(req)).rejects.toThrow(ApiError);
    try {
      await verifyWidgetToken(req);
    } catch (e) {
      expect((e as ApiError).status).toBe(401);
    }
  });

  it('should throw 401 for invalid signature', async () => {
    const wrongSecret = new TextEncoder().encode('wrong-secret');
    const token = await new SignJWT({ sub: 'wgt_test', allowed_origins: [] })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuer('widget.huni.co.kr')
      .setExpirationTime('1h')
      .sign(wrongSecret);

    const req = createRequest({ 'x-widget-token': token });

    await expect(verifyWidgetToken(req)).rejects.toThrow(ApiError);
  });

  it('should throw 403 when origin is not allowed', async () => {
    const token = await createWidgetToken({
      sub: 'wgt_test',
      allowed_origins: ['https://allowed.com'],
    });
    const req = createRequest({ 'x-widget-token': token }, 'https://evil.com');

    await expect(verifyWidgetToken(req)).rejects.toThrow(ApiError);
    try {
      await verifyWidgetToken(req);
    } catch (e) {
      expect((e as ApiError).status).toBe(403);
    }
  });

  it('should allow wildcard origin', async () => {
    const token = await createWidgetToken({
      sub: 'wgt_test',
      allowed_origins: ['*'],
    });
    const req = createRequest({ 'x-widget-token': token }, 'https://any-origin.com');

    const payload = await verifyWidgetToken(req);
    expect(payload.sub).toBe('wgt_test');
  });

  it('should skip origin check when no origin header', async () => {
    const token = await createWidgetToken({
      sub: 'wgt_test',
      allowed_origins: ['https://specific.com'],
    });
    const req = createRequest({ 'x-widget-token': token });

    const payload = await verifyWidgetToken(req);
    expect(payload.sub).toBe('wgt_test');
  });
});

describe('verifyApiKey', () => {
  it('should throw 401 when API key is missing', async () => {
    const req = createRequest();

    await expect(verifyApiKey(req)).rejects.toThrow(ApiError);
    try {
      await verifyApiKey(req);
    } catch (e) {
      expect((e as ApiError).status).toBe(401);
      expect((e as ApiError).detail).toContain('API key is required');
    }
  });

  it('should throw 401 for short API key (< 32 chars)', async () => {
    const req = createRequest({ 'x-api-key': 'short-key' });

    await expect(verifyApiKey(req)).rejects.toThrow(ApiError);
    try {
      await verifyApiKey(req);
    } catch (e) {
      expect((e as ApiError).status).toBe(401);
      expect((e as ApiError).detail).toContain('Invalid API key format');
    }
  });

  it('should accept valid API key (>= 32 chars)', async () => {
    const validKey = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const req = createRequest({ 'x-api-key': validKey });

    const result = await verifyApiKey(req);
    expect(result.clientId).toBe('client_a1b2c3d4');
  });
});

describe('withApiKeyAuth', () => {
  it('should add apiKey to context on valid key', async () => {
    const validKey = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const req = createRequest({ 'x-api-key': validKey });
    const ctx: Record<string, unknown> = {};

    const middleware = withApiKeyAuth();
    await middleware(req, ctx);

    expect(ctx.apiKey).toBeDefined();
    expect((ctx.apiKey as { clientId: string }).clientId).toBe('client_a1b2c3d4');
  });
});
