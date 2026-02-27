/**
 * Unit tests for Shopby Authentication Service
 *
 * Tests cover token storage, token manager, OAuth flow helpers,
 * admin token manager, and validation helpers.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  InMemoryTokenStorage,
  TokenManager,
  AdminTokenManager,
  buildOAuthAuthorizationUrl,
  buildSocialLoginUrl,
  createSocialLoginRequest,
  createTokenRefreshRequest,
  isValidTokenFormat,
  extractJwtExpiry,
  isTokenExpired,
  getTimeUntilRefresh,
  createDefaultTokenStorage,
  createTokenManager,
} from '../auth.js';
import type { ShopbyOAuthToken, ShopbyAdminToken } from '../types.js';

// =============================================================================
// SECTION 1: InMemoryTokenStorage Tests
// =============================================================================

describe('InMemoryTokenStorage', () => {
  let storage: InMemoryTokenStorage;

  beforeEach(() => {
    storage = new InMemoryTokenStorage();
  });

  describe('access token', () => {
    it('should return null initially', () => {
      expect(storage.getAccessToken()).toBeNull();
    });

    it('should store and retrieve access token', () => {
      storage.setAccessToken('test-access-token');
      expect(storage.getAccessToken()).toBe('test-access-token');
    });
  });

  describe('refresh token', () => {
    it('should return null initially', () => {
      expect(storage.getRefreshToken()).toBeNull();
    });

    it('should store and retrieve refresh token', () => {
      storage.setRefreshToken('test-refresh-token');
      expect(storage.getRefreshToken()).toBe('test-refresh-token');
    });
  });

  describe('expires at', () => {
    it('should return null initially', () => {
      expect(storage.getExpiresAt()).toBeNull();
    });

    it('should store and retrieve expiry timestamp', () => {
      const timestamp = Date.now() + 3600000;
      storage.setExpiresAt(timestamp);
      expect(storage.getExpiresAt()).toBe(timestamp);
    });
  });

  describe('clear', () => {
    it('should clear all stored values', () => {
      storage.setAccessToken('access');
      storage.setRefreshToken('refresh');
      storage.setExpiresAt(1234567890);

      storage.clear();

      expect(storage.getAccessToken()).toBeNull();
      expect(storage.getRefreshToken()).toBeNull();
      expect(storage.getExpiresAt()).toBeNull();
    });
  });
});

// =============================================================================
// SECTION 2: TokenManager Tests
// =============================================================================

describe('TokenManager', () => {
  let storage: InMemoryTokenStorage;
  let refreshTokensMock: ReturnType<typeof vi.fn>;
  let tokenManager: TokenManager;

  const mockOAuthToken: ShopbyOAuthToken = {
    accessToken: 'new-access-token',
    refreshToken: 'new-refresh-token',
    tokenType: 'Bearer',
    expiresIn: 1800,
    refreshTokenExpiresIn: 86400,
  };

  beforeEach(() => {
    storage = new InMemoryTokenStorage();
    refreshTokensMock = vi.fn().mockResolvedValue(mockOAuthToken);
    tokenManager = new TokenManager({
      storage,
      refreshTokens: refreshTokensMock,
    });
  });

  describe('hasValidToken', () => {
    it('should return false when no token stored', () => {
      expect(tokenManager.hasValidToken()).toBe(false);
    });

    it('should return false when token is expired', () => {
      storage.setAccessToken('expired-token');
      storage.setExpiresAt(Date.now() - 1000);

      expect(tokenManager.hasValidToken()).toBe(false);
    });

    it('should return true when token is valid', () => {
      storage.setAccessToken('valid-token');
      storage.setExpiresAt(Date.now() + 3600000);

      expect(tokenManager.hasValidToken()).toBe(true);
    });
  });

  describe('needsRefresh', () => {
    it('should return false when no expiry set', () => {
      expect(tokenManager.needsRefresh()).toBe(false);
    });

    it('should return true when within buffer window', () => {
      // Set expiry to 2 minutes from now (within default 5 min buffer)
      storage.setExpiresAt(Date.now() + 120000);

      expect(tokenManager.needsRefresh()).toBe(true);
    });

    it('should return false when outside buffer window', () => {
      // Set expiry to 10 minutes from now (outside 5 min buffer)
      storage.setExpiresAt(Date.now() + 600000);

      expect(tokenManager.needsRefresh()).toBe(false);
    });

    it('should respect custom buffer', () => {
      const customManager = new TokenManager({
        storage,
        refreshTokens: refreshTokensMock,
        refreshBufferSeconds: 600, // 10 minutes
      });

      // Set expiry to 8 minutes from now
      storage.setExpiresAt(Date.now() + 480000);

      expect(customManager.needsRefresh()).toBe(true);
    });
  });

  describe('getValidToken', () => {
    it('should return existing valid token when not needing refresh', async () => {
      storage.setAccessToken('valid-token');
      storage.setRefreshToken('refresh-token');
      storage.setExpiresAt(Date.now() + 3600000);

      const token = await tokenManager.getValidToken();

      expect(token).toBe('valid-token');
      expect(refreshTokensMock).not.toHaveBeenCalled();
    });

    it('should refresh token when needed', async () => {
      storage.setAccessToken('expiring-token');
      storage.setRefreshToken('refresh-token');
      storage.setExpiresAt(Date.now() + 120000);

      const token = await tokenManager.getValidToken();

      expect(refreshTokensMock).toHaveBeenCalledWith('refresh-token');
      expect(token).toBe('new-access-token');
    });

    it('should throw when no refresh token available', async () => {
      await expect(tokenManager.getValidToken()).rejects.toThrow('No refresh token available');
    });
  });

  describe('setTokens', () => {
    it('should store all token data', () => {
      const tokens: ShopbyOAuthToken = {
        accessToken: 'access-123',
        refreshToken: 'refresh-456',
        tokenType: 'Bearer',
        expiresIn: 1800,
        refreshTokenExpiresIn: 86400,
      };

      tokenManager.setTokens(tokens);

      expect(storage.getAccessToken()).toBe('access-123');
      expect(storage.getRefreshToken()).toBe('refresh-456');
      expect(storage.getExpiresAt()).toBeGreaterThan(Date.now());
    });
  });

  describe('refresh', () => {
    it('should refresh tokens and store them', async () => {
      storage.setRefreshToken('existing-refresh');

      const tokens = await tokenManager.refresh();

      expect(tokens).toEqual(mockOAuthToken);
      expect(storage.getAccessToken()).toBe('new-access-token');
    });

    it('should prevent concurrent refresh calls', async () => {
      storage.setRefreshToken('refresh');
      refreshTokensMock.mockImplementation(() => new Promise(resolve => {
        setTimeout(() => resolve(mockOAuthToken), 100);
      }));

      const [result1, result2] = await Promise.all([
        tokenManager.refresh(),
        tokenManager.refresh(),
      ]);

      expect(refreshTokensMock).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(mockOAuthToken);
      expect(result2).toEqual(mockOAuthToken);
    });

    it('should call onTokensRefreshed callback', async () => {
      const onRefreshed = vi.fn();
      const manager = new TokenManager({
        storage,
        refreshTokens: refreshTokensMock,
        onTokensRefreshed: onRefreshed,
      });
      storage.setRefreshToken('refresh');

      await manager.refresh();

      expect(onRefreshed).toHaveBeenCalledWith(mockOAuthToken);
    });

    it('should call onRefreshError callback on failure', async () => {
      const error = new Error('Refresh failed');
      refreshTokensMock.mockRejectedValue(error);
      const onError = vi.fn();
      const manager = new TokenManager({
        storage,
        refreshTokens: refreshTokensMock,
        onRefreshError: onError,
      });
      storage.setRefreshToken('refresh');

      await expect(manager.refresh()).rejects.toThrow('Refresh failed');
      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  describe('clearTokens', () => {
    it('should clear all stored tokens', () => {
      storage.setAccessToken('access');
      storage.setRefreshToken('refresh');

      tokenManager.clearTokens();

      expect(storage.getAccessToken()).toBeNull();
      expect(storage.getRefreshToken()).toBeNull();
    });
  });

  describe('getRefreshToken', () => {
    it('should return stored refresh token', () => {
      storage.setRefreshToken('my-refresh');
      expect(tokenManager.getRefreshToken()).toBe('my-refresh');
    });
  });

  describe('getTimeUntilExpiry', () => {
    it('should return 0 when no expiry set', () => {
      expect(tokenManager.getTimeUntilExpiry()).toBe(0);
    });

    it('should return seconds until expiry', () => {
      const expiresAt = Date.now() + 1800000; // 30 minutes
      storage.setExpiresAt(expiresAt);

      const remaining = tokenManager.getTimeUntilExpiry();
      expect(remaining).toBeGreaterThan(1790);
      expect(remaining).toBeLessThanOrEqual(1800);
    });

    it('should return 0 when already expired', () => {
      storage.setExpiresAt(Date.now() - 1000);
      expect(tokenManager.getTimeUntilExpiry()).toBe(0);
    });
  });
});

// =============================================================================
// SECTION 3: OAuth Flow Helpers Tests
// =============================================================================

describe('buildOAuthAuthorizationUrl', () => {
  it('should build authorization URL with required params', () => {
    const url = buildOAuthAuthorizationUrl({
      baseUrl: 'https://api.shopby.co.kr',
      clientId: 'my-client-id',
      redirectUri: 'https://myapp.com/callback',
    });

    expect(url).toContain('https://api.shopby.co.kr/auth/oauth/authorize');
    expect(url).toContain('client_id=my-client-id');
    expect(url).toContain('redirect_uri=https%3A%2F%2Fmyapp.com%2Fcallback');
    expect(url).toContain('response_type=code');
  });

  it('should include optional scope', () => {
    const url = buildOAuthAuthorizationUrl({
      baseUrl: 'https://api.shopby.co.kr',
      clientId: 'my-client-id',
      redirectUri: 'https://myapp.com/callback',
      scope: 'read write',
    });

    expect(url).toContain('scope=read+write');
  });

  it('should include optional state', () => {
    const url = buildOAuthAuthorizationUrl({
      baseUrl: 'https://api.shopby.co.kr',
      clientId: 'my-client-id',
      redirectUri: 'https://myapp.com/callback',
      state: 'random-state-123',
    });

    expect(url).toContain('state=random-state-123');
  });
});

describe('buildSocialLoginUrl', () => {
  it('should build social login URL for naver', () => {
    const url = buildSocialLoginUrl({
      baseUrl: 'https://api.shopby.co.kr',
      provider: 'naver',
      redirectUri: 'https://myapp.com/callback',
    });

    expect(url).toContain('https://api.shopby.co.kr/auth/social/naver');
    expect(url).toContain('redirect_uri=');
  });

  it('should build social login URL for kakao', () => {
    const url = buildSocialLoginUrl({
      baseUrl: 'https://api.shopby.co.kr',
      provider: 'kakao',
      redirectUri: 'https://myapp.com/callback',
    });

    expect(url).toContain('/auth/social/kakao');
  });

  it('should include state parameter', () => {
    const url = buildSocialLoginUrl({
      baseUrl: 'https://api.shopby.co.kr',
      provider: 'google',
      redirectUri: 'https://myapp.com/callback',
      state: 'csrf-state',
    });

    expect(url).toContain('state=csrf-state');
  });
});

describe('createSocialLoginRequest', () => {
  it('should create request with required fields', () => {
    const request = createSocialLoginRequest('naver', 'auth-code-123');

    expect(request).toEqual({
      provider: 'naver',
      code: 'auth-code-123',
      state: undefined,
      keepLogin: false,
    });
  });

  it('should create request with all fields', () => {
    const request = createSocialLoginRequest('kakao', 'auth-code', 'state-xyz', true);

    expect(request).toEqual({
      provider: 'kakao',
      code: 'auth-code',
      state: 'state-xyz',
      keepLogin: true,
    });
  });
});

describe('createTokenRefreshRequest', () => {
  it('should create refresh request', () => {
    const request = createTokenRefreshRequest('refresh-token-123');

    expect(request).toEqual({
      refreshToken: 'refresh-token-123',
    });
  });
});

// =============================================================================
// SECTION 4: AdminTokenManager Tests
// =============================================================================

describe('AdminTokenManager', () => {
  let storage: InMemoryTokenStorage;
  let obtainTokenMock: ReturnType<typeof vi.fn>;
  let adminManager: AdminTokenManager;

  const mockAdminToken: ShopbyAdminToken = {
    accessToken: 'admin-access-token',
    tokenType: 'Bearer',
    expiresIn: 3600,
  };

  beforeEach(() => {
    storage = new InMemoryTokenStorage();
    obtainTokenMock = vi.fn().mockResolvedValue(mockAdminToken);
    adminManager = new AdminTokenManager({
      storage,
      obtainToken: obtainTokenMock,
    });
  });

  describe('hasValidToken', () => {
    it('should return false when no token stored', () => {
      expect(adminManager.hasValidToken()).toBe(false);
    });

    it('should return true when token is valid', () => {
      storage.setAccessToken('admin-token');
      storage.setExpiresAt(Date.now() + 3600000);

      expect(adminManager.hasValidToken()).toBe(true);
    });
  });

  describe('needsRefresh', () => {
    it('should return true when no expiry set', () => {
      expect(adminManager.needsRefresh()).toBe(true);
    });

    it('should return true when within buffer', () => {
      storage.setExpiresAt(Date.now() + 120000);

      expect(adminManager.needsRefresh()).toBe(true);
    });
  });

  describe('getValidToken', () => {
    it('should obtain new token when none exists', async () => {
      const token = await adminManager.getValidToken();

      expect(obtainTokenMock).toHaveBeenCalled();
      expect(token).toBe('admin-access-token');
    });

    it('should return existing token when valid', async () => {
      storage.setAccessToken('existing-admin-token');
      storage.setExpiresAt(Date.now() + 3600000);

      const token = await adminManager.getValidToken();

      expect(obtainTokenMock).not.toHaveBeenCalled();
      expect(token).toBe('existing-admin-token');
    });
  });

  describe('setToken', () => {
    it('should store admin token with calculated expiry', () => {
      adminManager.setToken(mockAdminToken);

      expect(storage.getAccessToken()).toBe('admin-access-token');
      expect(storage.getExpiresAt()).toBeGreaterThan(Date.now());
    });
  });

  describe('refresh', () => {
    it('should obtain and store new token', async () => {
      const token = await adminManager.refresh();

      expect(token).toEqual(mockAdminToken);
      expect(storage.getAccessToken()).toBe('admin-access-token');
    });

    it('should prevent concurrent refresh calls', async () => {
      obtainTokenMock.mockImplementation(() => new Promise(resolve => {
        setTimeout(() => resolve(mockAdminToken), 100);
      }));

      const [result1, result2] = await Promise.all([
        adminManager.refresh(),
        adminManager.refresh(),
      ]);

      expect(obtainTokenMock).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(mockAdminToken);
      expect(result2).toEqual(mockAdminToken);
    });

    it('should call onTokenRefreshed callback', async () => {
      const onRefreshed = vi.fn();
      const manager = new AdminTokenManager({
        storage,
        obtainToken: obtainTokenMock,
        onTokenRefreshed: onRefreshed,
      });

      await manager.refresh();

      expect(onRefreshed).toHaveBeenCalledWith(mockAdminToken);
    });

    it('should call onRefreshError callback on failure', async () => {
      const error = new Error('Token obtain failed');
      obtainTokenMock.mockRejectedValue(error);
      const onError = vi.fn();
      const manager = new AdminTokenManager({
        storage,
        obtainToken: obtainTokenMock,
        onRefreshError: onError,
      });

      await expect(manager.refresh()).rejects.toThrow('Token obtain failed');
      expect(onError).toHaveBeenCalledWith(error);
    });
  });

  describe('clearToken', () => {
    it('should clear stored token', () => {
      storage.setAccessToken('admin-token');

      adminManager.clearToken();

      expect(storage.getAccessToken()).toBeNull();
    });
  });
});

// =============================================================================
// SECTION 5: Token Validation Helpers Tests
// =============================================================================

describe('isValidTokenFormat', () => {
  it('should return true for valid JWT-like format', () => {
    const validToken = 'header.' + 'b'.repeat(50) + '.signature';
    expect(isValidTokenFormat(validToken)).toBe(true);
  });

  it('should return true for 2-part tokens', () => {
    const token = 'part1.' + 'b'.repeat(50);
    expect(isValidTokenFormat(token)).toBe(true);
  });

  it('should return false for short tokens', () => {
    expect(isValidTokenFormat('short')).toBe(false);
  });

  it('should return false for single-part tokens', () => {
    expect(isValidTokenFormat('a'.repeat(60))).toBe(false);
  });
});

describe('extractJwtExpiry', () => {
  it('should extract expiry from valid JWT', () => {
    const header = btoa(JSON.stringify({ alg: 'HS256' }));
    const payload = btoa(JSON.stringify({ exp: 1700000000 }));
    const signature = 'signature';
    const token = `${header}.${payload}.${signature}`;

    const expiry = extractJwtExpiry(token);

    expect(expiry).toBe(1700000000 * 1000);
  });

  it('should return null for non-JWT format', () => {
    expect(extractJwtExpiry('not-a-jwt')).toBeNull();
  });

  it('should return null for 2-part token', () => {
    expect(extractJwtExpiry('part1.part2')).toBeNull();
  });

  it('should return null when no exp in payload', () => {
    const header = btoa(JSON.stringify({ alg: 'HS256' }));
    const payload = btoa(JSON.stringify({ sub: 'user' }));
    const token = `${header}.${payload}.signature`;

    expect(extractJwtExpiry(token)).toBeNull();
  });

  it('should return null for invalid base64', () => {
    const token = 'not-base64.invalid.not-base64';
    expect(extractJwtExpiry(token)).toBeNull();
  });
});

describe('isTokenExpired', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return true for past timestamp', () => {
    const pastExpiry = new Date('2023-12-31T23:59:59Z').getTime();
    expect(isTokenExpired(pastExpiry)).toBe(true);
  });

  it('should return false for future timestamp', () => {
    const futureExpiry = new Date('2024-01-01T01:00:00Z').getTime();
    expect(isTokenExpired(futureExpiry)).toBe(false);
  });

  it('should return true when exactly at expiry', () => {
    const now = Date.now();
    expect(isTokenExpired(now)).toBe(true);
  });
});

describe('getTimeUntilRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return milliseconds until refresh time', () => {
    const expiresAt = Date.now() + 600000; // 10 minutes
    const bufferSeconds = 300; // 5 minutes

    // Refresh should happen at 5 minutes (300000ms from now)
    const timeUntilRefresh = getTimeUntilRefresh(expiresAt, bufferSeconds);

    expect(timeUntilRefresh).toBe(300000);
  });

  it('should return 0 when refresh needed now', () => {
    const expiresAt = Date.now() + 100000; // < 5 minutes
    const bufferSeconds = 300;

    expect(getTimeUntilRefresh(expiresAt, bufferSeconds)).toBe(0);
  });

  it('should use default buffer of 300 seconds', () => {
    const expiresAt = Date.now() + 600000; // 10 minutes

    const timeUntilRefresh = getTimeUntilRefresh(expiresAt);

    expect(timeUntilRefresh).toBe(300000);
  });
});

// =============================================================================
// SECTION 6: Factory Functions Tests
// =============================================================================

describe('createDefaultTokenStorage', () => {
  it('should create InMemoryTokenStorage instance', () => {
    const storage = createDefaultTokenStorage();

    expect(storage).toBeInstanceOf(InMemoryTokenStorage);
  });
});

describe('createTokenManager', () => {
  it('should create TokenManager with default storage', () => {
    const refreshTokens = vi.fn();
    const manager = createTokenManager(refreshTokens);

    expect(manager).toBeInstanceOf(TokenManager);
  });

  it('should pass options to TokenManager', () => {
    const onRefreshed = vi.fn();
    const onError = vi.fn();
    const manager = createTokenManager(vi.fn(), {
      refreshBufferSeconds: 600,
      onTokensRefreshed: onRefreshed,
      onRefreshError: onError,
    });

    expect(manager).toBeInstanceOf(TokenManager);
  });
});
