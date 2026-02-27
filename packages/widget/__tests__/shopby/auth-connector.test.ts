/**
 * Shopby Auth Connector Tests
 * @see SPEC-SHOPBY-003 Section 3.3 (R-WDG-003)
 *
 * Tests authentication integration with Shopby session management.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ShopbyAuthConnector } from '@/shopby/auth-connector';
import { ShopbyWidgetErrorCode } from '@/shopby/types';

// Helper to create a simple JWT-like token with expiry
function createMockToken(exp?: number, grade?: string): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(
    JSON.stringify({
      exp: exp ?? Math.floor(Date.now() / 1000) + 3600,
      grade,
    })
  );
  const signature = btoa('signature');
  return `${header}.${payload}.${signature}`;
}

describe('shopby/auth-connector', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('initializes with provided access token', () => {
      const token = createMockToken();
      const auth = new ShopbyAuthConnector(token);

      expect(auth.isAuthenticated()).toBe(true);
    });

    it('initializes without token (guest mode)', () => {
      const auth = new ShopbyAuthConnector();

      expect(auth.isAuthenticated()).toBe(false);
    });

    it('initializes with undefined token as guest', () => {
      const auth = new ShopbyAuthConnector(undefined);

      expect(auth.isAuthenticated()).toBe(false);
    });

    it('initializes with empty string token (edge case)', () => {
      // Note: Implementation uses ?? null, so '' passes through (NOT converted to null)
      // But getAuthHeaders uses falsy check (!this.accessToken) which treats '' as falsy
      const auth = new ShopbyAuthConnector('');

      // isAuthenticated uses !== null check, so '' returns true
      expect(auth.isAuthenticated()).toBe(true);
      // getAuthHeaders uses !this.accessToken check, '' is falsy so returns empty object
      expect(auth.getAuthHeaders()['Authorization']).toBeUndefined();
    });

    it('extracts expiry from JWT token', () => {
      const exp = Math.floor(Date.now() / 1000) + 7200;
      const token = createMockToken(exp);
      const auth = new ShopbyAuthConnector(token);

      const state = auth.getState();
      expect(state.tokenExpiry).toBeDefined();
    });

    it('handles non-JWT token gracefully', () => {
      const auth = new ShopbyAuthConnector('not-a-jwt-token');

      // Should not throw, and should work without expiry info
      expect(auth.isAuthenticated()).toBe(true);
    });
  });

  describe('getAuthHeaders()', () => {
    it('returns Authorization header with valid token', () => {
      const token = createMockToken();
      const auth = new ShopbyAuthConnector(token);

      const headers = auth.getAuthHeaders();

      expect(headers['Authorization']).toBe(`Bearer ${token}`);
    });

    it('returns Bearer token format', () => {
      const token = 'simple-token';
      const auth = new ShopbyAuthConnector(token);

      const headers = auth.getAuthHeaders();

      expect(headers['Authorization']).toMatch(/^Bearer /);
    });

    it('returns empty object when no token', () => {
      const auth = new ShopbyAuthConnector();

      const headers = auth.getAuthHeaders();

      expect(headers).toEqual({});
    });

    it('returns empty object when token is null', () => {
      const auth = new ShopbyAuthConnector(null as unknown as string);

      const headers = auth.getAuthHeaders();

      expect(headers).toEqual({});
    });

    it('returns empty object when token is empty string', () => {
      const auth = new ShopbyAuthConnector('');

      const headers = auth.getAuthHeaders();

      expect(headers).toEqual({});
    });
  });

  describe('isAuthenticated()', () => {
    it('returns true when valid token exists', () => {
      const token = createMockToken(Math.floor(Date.now() / 1000) + 3600);
      const auth = new ShopbyAuthConnector(token);

      expect(auth.isAuthenticated()).toBe(true);
    });

    it('returns false when no token', () => {
      const auth = new ShopbyAuthConnector();

      expect(auth.isAuthenticated()).toBe(false);
    });

    it('returns true when token is empty string (treated as truthy non-null)', () => {
      // Note: '' ?? null returns '' (not null), so '' !== null is true
      const auth = new ShopbyAuthConnector('');

      // Empty string is treated as a truthy non-null value
      expect(auth.isAuthenticated()).toBe(true);
    });

    it('returns false after token is cleared', () => {
      const token = createMockToken();
      const auth = new ShopbyAuthConnector(token);

      expect(auth.isAuthenticated()).toBe(true);

      auth.clear();

      expect(auth.isAuthenticated()).toBe(false);
    });

    it('returns false when token is expired', () => {
      const expiredToken = createMockToken(Math.floor(Date.now() / 1000) - 3600);
      const auth = new ShopbyAuthConnector(expiredToken);

      expect(auth.isAuthenticated()).toBe(false);
    });
  });

  describe('validateToken()', () => {
    it('returns true for valid non-expired token', () => {
      const token = createMockToken(Math.floor(Date.now() / 1000) + 3600);
      const auth = new ShopbyAuthConnector(token);

      expect(auth.validateToken()).toBe(true);
    });

    it('returns false for expired token', () => {
      const expiredToken = createMockToken(Math.floor(Date.now() / 1000) - 3600);
      const auth = new ShopbyAuthConnector(expiredToken);

      expect(auth.validateToken()).toBe(false);
    });

    it('returns true for guest mode (no token)', () => {
      const auth = new ShopbyAuthConnector();

      expect(auth.validateToken()).toBe(true);
    });

    it('returns true for token without expiry claim', () => {
      const auth = new ShopbyAuthConnector('non-jwt-token');

      expect(auth.validateToken()).toBe(true);
    });
  });

  describe('needsRefresh()', () => {
    it('returns false when no token', () => {
      const auth = new ShopbyAuthConnector();

      expect(auth.needsRefresh()).toBe(false);
    });

    it('returns false when token is fresh', () => {
      const token = createMockToken(Math.floor(Date.now() / 1000) + 3600);
      const auth = new ShopbyAuthConnector(token);

      expect(auth.needsRefresh()).toBe(false);
    });

    it('returns true when token is close to expiry (within 5 min buffer)', () => {
      const token = createMockToken(Math.floor(Date.now() / 1000) + 120); // 2 min
      const auth = new ShopbyAuthConnector(token);

      expect(auth.needsRefresh()).toBe(true);
    });

    it('returns false when token has no expiry', () => {
      const auth = new ShopbyAuthConnector('non-jwt-token');

      expect(auth.needsRefresh()).toBe(false);
    });
  });

  describe('refreshToken()', () => {
    it('returns false when no token', async () => {
      const auth = new ShopbyAuthConnector();

      const result = await auth.refreshToken();

      expect(result).toBe(false);
    });

    it('updates token on successful refresh', async () => {
      const oldToken = createMockToken(Math.floor(Date.now() / 1000) + 120);
      const newToken = createMockToken(Math.floor(Date.now() / 1000) + 7200);
      const auth = new ShopbyAuthConnector(oldToken);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ accessToken: newToken, expiresIn: 7200 }),
      });

      const result = await auth.refreshToken();

      expect(result).toBe(true);
      expect(auth.getAuthHeaders()['Authorization']).toBe(`Bearer ${newToken}`);
    });

    it('returns false on refresh failure', async () => {
      const token = createMockToken();
      const auth = new ShopbyAuthConnector(token);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await auth.refreshToken();

      expect(result).toBe(false);
    });

    it('returns false on network error', async () => {
      const token = createMockToken();
      const auth = new ShopbyAuthConnector(token);

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await auth.refreshToken();

      expect(result).toBe(false);
    });

    it('clears token on refresh failure', async () => {
      const token = createMockToken();
      const auth = new ShopbyAuthConnector(token);

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      await auth.refreshToken();

      expect(auth.isAuthenticated()).toBe(false);
    });

    it('uses correct refresh endpoint', async () => {
      const token = createMockToken();
      const auth = new ShopbyAuthConnector(token);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ accessToken: 'new-token' }),
      });

      await auth.refreshToken();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/auth/token/refresh'),
        expect.any(Object)
      );
    });

    it('includes auth headers in refresh request', async () => {
      const token = createMockToken();
      const auth = new ShopbyAuthConnector(token);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ accessToken: 'new-token' }),
      });

      await auth.refreshToken();

      const [, init] = mockFetch.mock.calls[0];
      expect(init.headers['Authorization']).toBe(`Bearer ${token}`);
    });

    it('uses custom API base URL', async () => {
      const token = createMockToken();
      const auth = new ShopbyAuthConnector(token, 'https://custom.api.com');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ accessToken: 'new-token' }),
      });

      await auth.refreshToken();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://custom.api.com'),
        expect.any(Object)
      );
    });
  });

  describe('token management', () => {
    it('setAccessToken updates the stored token', () => {
      const auth = new ShopbyAuthConnector();
      const token = createMockToken();

      auth.setAccessToken(token);

      expect(auth.isAuthenticated()).toBe(true);
      expect(auth.getAuthHeaders()['Authorization']).toBe(`Bearer ${token}`);
    });

    it('clear removes the stored token', () => {
      const token = createMockToken();
      const auth = new ShopbyAuthConnector(token);

      auth.clear();

      expect(auth.isAuthenticated()).toBe(false);
      expect(auth.getAuthHeaders()).toEqual({});
    });

    it('clear clears member grade', () => {
      const auth = new ShopbyAuthConnector(createMockToken());
      auth.setMemberGrade('GOLD');

      auth.clear();

      expect(auth.getMemberGrade()).toBeNull();
    });
  });

  describe('getMemberGrade()', () => {
    it('returns null for guest users', () => {
      const auth = new ShopbyAuthConnector();

      expect(auth.getMemberGrade()).toBeNull();
    });

    it('returns null when grade not set', () => {
      const auth = new ShopbyAuthConnector(createMockToken());

      expect(auth.getMemberGrade()).toBeNull();
    });

    it('returns grade when set', () => {
      const auth = new ShopbyAuthConnector(createMockToken());
      auth.setMemberGrade('GOLD');

      expect(auth.getMemberGrade()).toBe('GOLD');
    });
  });

  describe('setMemberGrade()', () => {
    it('sets the member grade', () => {
      const auth = new ShopbyAuthConnector(createMockToken());

      auth.setMemberGrade('PLATINUM');

      expect(auth.getMemberGrade()).toBe('PLATINUM');
    });

    it('overwrites previous grade', () => {
      const auth = new ShopbyAuthConnector(createMockToken());
      auth.setMemberGrade('SILVER');

      auth.setMemberGrade('GOLD');

      expect(auth.getMemberGrade()).toBe('GOLD');
    });
  });

  describe('requireAuth()', () => {
    it('does not throw when authenticated', () => {
      const token = createMockToken(Math.floor(Date.now() / 1000) + 3600);
      const auth = new ShopbyAuthConnector(token);

      expect(() => auth.requireAuth()).not.toThrow();
    });

    it('throws AUTH_REQUIRED when not authenticated', () => {
      const auth = new ShopbyAuthConnector();

      expect(() => auth.requireAuth()).toThrow(
        expect.objectContaining({
          code: ShopbyWidgetErrorCode.AUTH_REQUIRED,
        })
      );
    });

    it('throws AUTH_EXPIRED when token expired', () => {
      const expiredToken = createMockToken(Math.floor(Date.now() / 1000) - 3600);
      const auth = new ShopbyAuthConnector(expiredToken);

      expect(() => auth.requireAuth()).toThrow(
        expect.objectContaining({
          code: ShopbyWidgetErrorCode.AUTH_EXPIRED,
        })
      );
    });

    it('throws with descriptive error message', () => {
      const auth = new ShopbyAuthConnector();

      try {
        auth.requireAuth();
        expect.fail('Should have thrown');
      } catch (error) {
        expect((error as Error).message).toContain('Authentication required');
      }
    });
  });

  describe('getState()', () => {
    it('returns complete auth state for authenticated user', () => {
      const token = createMockToken(Math.floor(Date.now() / 1000) + 3600);
      const auth = new ShopbyAuthConnector(token);
      auth.setMemberGrade('GOLD');

      const state = auth.getState();

      expect(state).toMatchObject({
        accessToken: token,
        isAuthenticated: true,
        memberGrade: 'GOLD',
      });
      expect(state.tokenExpiry).toBeDefined();
    });

    it('returns state for guest user', () => {
      const auth = new ShopbyAuthConnector();

      const state = auth.getState();

      expect(state).toMatchObject({
        accessToken: null,
        isAuthenticated: false,
      });
    });

    it('returns state without member grade if not set', () => {
      const auth = new ShopbyAuthConnector(createMockToken());

      const state = auth.getState();

      expect(state.memberGrade).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('handles token with special characters', () => {
      const token = 'token-with-special!@#$%';
      const auth = new ShopbyAuthConnector(token);

      expect(auth.isAuthenticated()).toBe(true);
      expect(auth.getAuthHeaders()['Authorization']).toContain(token);
    });

    it('handles very long token string', () => {
      const token = 'a'.repeat(10000);
      const auth = new ShopbyAuthConnector(token);

      expect(auth.isAuthenticated()).toBe(true);
    });

    it('handles concurrent auth checks', async () => {
      const token = createMockToken();
      const auth = new ShopbyAuthConnector(token);

      const results = await Promise.all([
        Promise.resolve(auth.isAuthenticated()),
        Promise.resolve(auth.isAuthenticated()),
        Promise.resolve(auth.isAuthenticated()),
      ]);

      expect(results).toEqual([true, true, true]);
    });

    it('handles malformed JWT gracefully', () => {
      const malformedToken = 'not.enough.parts';
      const auth = new ShopbyAuthConnector(malformedToken);

      expect(() => auth.isAuthenticated()).not.toThrow();
      expect(() => auth.validateToken()).not.toThrow();
    });

    it('handles JWT with invalid base64', () => {
      const token = 'header.payload-with-invalid-base64!!!.signature';
      const auth = new ShopbyAuthConnector(token);

      expect(() => auth.isAuthenticated()).not.toThrow();
    });
  });
});
