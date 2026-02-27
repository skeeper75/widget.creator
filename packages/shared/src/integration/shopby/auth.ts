/**
 * Shopby Authentication Service
 *
 * Handles OAuth 2.0 and Admin token authentication for Shopby API.
 * Reference: SPEC-SHOPBY-001, SPEC-SHOPBY-INTEGRATION-DESIGN
 *
 * @MX:NOTE: Implements token lifecycle management with auto-refresh capability.
 * Access tokens expire in 30 minutes, refresh tokens in 1 day or 90 days.
 */

import type {
  ShopbyOAuthToken,
  ShopbyAdminToken,
  ShopbySocialProvider,
  ShopbySocialLoginRequest,
  ShopbyTokenRefreshRequest,
} from './types.js';

// =============================================================================
// SECTION 1: Token Storage Interface
// =============================================================================

/**
 * Token storage interface for flexible storage backends
 */
export interface TokenStorage {
  /** Get access token */
  getAccessToken(): string | null;
  /** Set access token */
  setAccessToken(token: string): void;
  /** Get refresh token */
  getRefreshToken(): string | null;
  /** Set refresh token */
  setRefreshToken(token: string): void;
  /** Get token expiry timestamp */
  getExpiresAt(): number | null;
  /** Set token expiry timestamp */
  setExpiresAt(timestamp: number): void;
  /** Clear all tokens */
  clear(): void;
}

/**
 * In-memory token storage implementation
 */
export class InMemoryTokenStorage implements TokenStorage {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private expiresAt: number | null = null;

  getAccessToken(): string | null {
    return this.accessToken;
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  setRefreshToken(token: string): void {
    this.refreshToken = token;
  }

  getExpiresAt(): number | null {
    return this.expiresAt;
  }

  setExpiresAt(timestamp: number): void {
    this.expiresAt = timestamp;
  }

  clear(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.expiresAt = null;
  }
}

// =============================================================================
// SECTION 2: Token Manager
// =============================================================================

/**
 * Configuration for TokenManager
 */
export interface TokenManagerConfig {
  /** Token storage backend */
  storage: TokenStorage;
  /** Function to refresh tokens via API */
  refreshTokens: (refreshToken: string) => Promise<ShopbyOAuthToken>;
  /** Seconds before expiry to trigger auto-refresh (default: 300 = 5 minutes) */
  refreshBufferSeconds?: number;
  /** Callback when tokens are refreshed */
  onTokensRefreshed?: (tokens: ShopbyOAuthToken) => void;
  /** Callback when refresh fails */
  onRefreshError?: (error: Error) => void;
}

/**
 * Token manager for OAuth 2.0 token lifecycle management
 *
 * @MX:ANCHOR: Core authentication token management for Shopby API
 * @MX:REASON: Handles automatic token refresh to prevent API auth failures
 */
export class TokenManager {
  private storage: TokenStorage;
  private refreshTokens: (refreshToken: string) => Promise<ShopbyOAuthToken>;
  private refreshBufferSeconds: number;
  private onTokensRefreshed?: (tokens: ShopbyOAuthToken) => void;
  private onRefreshError?: (error: Error) => void;
  private refreshPromise: Promise<ShopbyOAuthToken> | null = null;

  constructor(config: TokenManagerConfig) {
    this.storage = config.storage;
    this.refreshTokens = config.refreshTokens;
    this.refreshBufferSeconds = config.refreshBufferSeconds ?? 300; // 5 minutes
    this.onTokensRefreshed = config.onTokensRefreshed;
    this.onRefreshError = config.onRefreshError;
  }

  /**
   * Check if current access token is valid (not expired)
   *
   * @returns True if token is valid
   */
  hasValidToken(): boolean {
    const accessToken = this.storage.getAccessToken();
    const expiresAt = this.storage.getExpiresAt();

    if (!accessToken || !expiresAt) {
      return false;
    }

    return Date.now() < expiresAt;
  }

  /**
   * Check if token needs refresh (within buffer window)
   *
   * @returns True if refresh is needed
   */
  needsRefresh(): boolean {
    const expiresAt = this.storage.getExpiresAt();
    if (!expiresAt) return false;

    const bufferMs = this.refreshBufferSeconds * 1000;
    return Date.now() >= (expiresAt - bufferMs);
  }

  // @MX:WARN: [AUTO] Concurrent refresh deduplication via refreshPromise singleton — if refresh fails, all concurrent waiters receive the same rejection
  // @MX:REASON: The refreshPromise pattern prevents thundering herd but means a single network error silently fails all concurrent callers; onRefreshError callback is the only signal
  /**
   * Get valid access token, refreshing if necessary
   *
   * @returns Valid access token
   * @throws Error if no valid token available
   */
  async getValidToken(): Promise<string> {
    // Check if we already have a valid token that doesn't need refresh
    if (this.hasValidToken() && !this.needsRefresh()) {
      const token = this.storage.getAccessToken();
      if (token) return token;
    }

    // Try to refresh
    const newToken = await this.refresh();
    return newToken.accessToken;
  }

  /**
   * Store new tokens from OAuth response
   *
   * @param tokens - OAuth token response
   */
  setTokens(tokens: ShopbyOAuthToken): void {
    this.storage.setAccessToken(tokens.accessToken);
    this.storage.setRefreshToken(tokens.refreshToken);

    // Calculate expiry timestamp
    const expiresAt = Date.now() + (tokens.expiresIn * 1000);
    this.storage.setExpiresAt(expiresAt);
  }

  /**
   * Refresh tokens using refresh token
   *
   * @returns New OAuth tokens
   * @throws Error if refresh fails or no refresh token available
   */
  async refresh(): Promise<ShopbyOAuthToken> {
    // If refresh is already in progress, return existing promise
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = this.storage.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    this.refreshPromise = this.doRefresh(refreshToken);

    try {
      const tokens = await this.refreshPromise;
      return tokens;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Execute token refresh
   */
  private async doRefresh(refreshToken: string): Promise<ShopbyOAuthToken> {
    try {
      const tokens = await this.refreshTokens(refreshToken);
      this.setTokens(tokens);
      this.onTokensRefreshed?.(tokens);
      return tokens;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.onRefreshError?.(err);
      throw err;
    }
  }

  /**
   * Clear all stored tokens
   */
  clearTokens(): void {
    this.storage.clear();
  }

  /**
   * Get current refresh token
   *
   * @returns Refresh token or null
   */
  getRefreshToken(): string | null {
    return this.storage.getRefreshToken();
  }

  /**
   * Get time until token expires
   *
   * @returns Seconds until expiry, or 0 if already expired
   */
  getTimeUntilExpiry(): number {
    const expiresAt = this.storage.getExpiresAt();
    if (!expiresAt) return 0;

    const remaining = Math.floor((expiresAt - Date.now()) / 1000);
    return Math.max(0, remaining);
  }
}

// =============================================================================
// SECTION 3: OAuth 2.0 Flow Helpers
// =============================================================================

/**
 * OAuth 2.0 authorization URL builder
 */
export interface OAuthUrlParams {
  /** OAuth endpoint base URL */
  baseUrl: string;
  /** Client ID */
  clientId: string;
  /** Redirect URI */
  redirectUri: string;
  /** OAuth scope (optional) */
  scope?: string;
  /** State parameter for CSRF protection */
  state?: string;
}

/**
 * Build OAuth authorization URL for redirect
 *
 * @param params - OAuth URL parameters
 * @returns Full authorization URL
 */
export function buildOAuthAuthorizationUrl(params: OAuthUrlParams): string {
  const url = new URL(`${params.baseUrl}/auth/oauth/authorize`);

  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('response_type', 'code');

  if (params.scope) {
    url.searchParams.set('scope', params.scope);
  }

  if (params.state) {
    url.searchParams.set('state', params.state);
  }

  return url.toString();
}

/**
 * Build social login URL
 *
 * @param params - Social login parameters
 * @returns Social login redirect URL
 */
export function buildSocialLoginUrl(params: {
  baseUrl: string;
  provider: ShopbySocialProvider;
  redirectUri: string;
  state?: string;
}): string {
  const url = new URL(`${params.baseUrl}/auth/social/${params.provider}`);

  url.searchParams.set('redirect_uri', params.redirectUri);

  if (params.state) {
    url.searchParams.set('state', params.state);
  }

  return url.toString();
}

/**
 * Create social login request
 *
 * @param provider - Social provider
 * @param code - Authorization code from callback
 * @param state - State parameter for validation
 * @param keepLogin - Whether to extend refresh token lifetime
 * @returns Social login request object
 */
export function createSocialLoginRequest(
  provider: ShopbySocialProvider,
  code: string,
  state?: string,
  keepLogin: boolean = false
): ShopbySocialLoginRequest {
  return {
    provider,
    code,
    state,
    keepLogin,
  };
}

/**
 * Create token refresh request
 *
 * @param refreshToken - Current refresh token
 * @returns Token refresh request object
 */
export function createTokenRefreshRequest(refreshToken: string): ShopbyTokenRefreshRequest {
  return { refreshToken };
}

// =============================================================================
// SECTION 4: Admin Token Manager
// =============================================================================

/**
 * Admin token manager configuration
 */
export interface AdminTokenManagerConfig {
  /** Token storage backend */
  storage: TokenStorage;
  /** Function to obtain admin token via API */
  obtainToken: () => Promise<ShopbyAdminToken>;
  /** Seconds before expiry to trigger auto-refresh (default: 300) */
  refreshBufferSeconds?: number;
  /** Callback when token is refreshed */
  onTokenRefreshed?: (token: ShopbyAdminToken) => void;
  /** Callback when refresh fails */
  onRefreshError?: (error: Error) => void;
}

/**
 * Admin token manager for Admin API authentication
 */
export class AdminTokenManager {
  private storage: TokenStorage;
  private obtainToken: () => Promise<ShopbyAdminToken>;
  private refreshBufferSeconds: number;
  private onTokenRefreshed?: (token: ShopbyAdminToken) => void;
  private onRefreshError?: (error: Error) => void;
  private refreshPromise: Promise<ShopbyAdminToken> | null = null;

  constructor(config: AdminTokenManagerConfig) {
    this.storage = config.storage;
    this.obtainToken = config.obtainToken;
    this.refreshBufferSeconds = config.refreshBufferSeconds ?? 300;
    this.onTokenRefreshed = config.onTokenRefreshed;
    this.onRefreshError = config.onRefreshError;
  }

  /**
   * Check if current admin token is valid
   */
  hasValidToken(): boolean {
    const accessToken = this.storage.getAccessToken();
    const expiresAt = this.storage.getExpiresAt();

    if (!accessToken || !expiresAt) {
      return false;
    }

    return Date.now() < expiresAt;
  }

  /**
   * Check if token needs refresh
   */
  needsRefresh(): boolean {
    const expiresAt = this.storage.getExpiresAt();
    if (!expiresAt) return true; // No token, need to obtain

    const bufferMs = this.refreshBufferSeconds * 1000;
    return Date.now() >= (expiresAt - bufferMs);
  }

  // @MX:WARN: [AUTO] Concurrent refresh deduplication via refreshPromise singleton — same thundering-herd guard as TokenManager.getValidToken
  // @MX:REASON: AdminTokenManager has no refresh token — it calls obtainToken() (credential exchange) on every expiry; failures cascade to all concurrent API callers
  /**
   * Get valid admin access token
   */
  async getValidToken(): Promise<string> {
    if (this.hasValidToken() && !this.needsRefresh()) {
      const token = this.storage.getAccessToken();
      if (token) return token;
    }

    const newToken = await this.refresh();
    return newToken.accessToken;
  }

  /**
   * Store new admin token
   */
  setToken(token: ShopbyAdminToken): void {
    this.storage.setAccessToken(token.accessToken);

    const expiresAt = Date.now() + (token.expiresIn * 1000);
    this.storage.setExpiresAt(expiresAt);
  }

  /**
   * Obtain or refresh admin token
   */
  async refresh(): Promise<ShopbyAdminToken> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.doRefresh();

    try {
      const token = await this.refreshPromise;
      return token;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async doRefresh(): Promise<ShopbyAdminToken> {
    try {
      const token = await this.obtainToken();
      this.setToken(token);
      this.onTokenRefreshed?.(token);
      return token;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.onRefreshError?.(err);
      throw err;
    }
  }

  /**
   * Clear stored token
   */
  clearToken(): void {
    this.storage.clear();
  }
}

// =============================================================================
// SECTION 5: Token Validation Helpers
// =============================================================================

/**
 * Validate token format (basic check)
 *
 * @param token - Token string to validate
 * @returns True if token appears valid
 */
export function isValidTokenFormat(token: string): boolean {
  // Basic JWT-like format check (header.payload.signature)
  const parts = token.split('.');
  return parts.length >= 2 && token.length > 50;
}

/**
 * Extract expiry from JWT token (if applicable)
 *
 * @param token - JWT token
 * @returns Expiry timestamp or null if not a valid JWT
 */
export function extractJwtExpiry(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));
    if (typeof payload.exp === 'number') {
      return payload.exp * 1000; // Convert to milliseconds
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Check if token is expired based on expiry timestamp
 *
 * @param expiresAt - Expiry timestamp in milliseconds
 * @returns True if expired
 */
export function isTokenExpired(expiresAt: number): boolean {
  return Date.now() >= expiresAt;
}

/**
 * Calculate time until token should be refreshed
 *
 * @param expiresAt - Token expiry timestamp
 * @param bufferSeconds - Seconds before expiry to refresh
 * @returns Milliseconds until refresh, or 0 if refresh needed now
 */
export function getTimeUntilRefresh(expiresAt: number, bufferSeconds: number = 300): number {
  const refreshTime = expiresAt - (bufferSeconds * 1000);
  const remaining = refreshTime - Date.now();
  return Math.max(0, remaining);
}

// =============================================================================
// SECTION 6: Default Token Storage Factory
// =============================================================================

/**
 * Create default in-memory token storage
 *
 * @returns In-memory token storage instance
 */
export function createDefaultTokenStorage(): TokenStorage {
  return new InMemoryTokenStorage();
}

/**
 * Create a token manager with default in-memory storage
 *
 * @param refreshTokens - Token refresh function
 * @param options - Additional options
 * @returns TokenManager instance
 */
export function createTokenManager(
  refreshTokens: (refreshToken: string) => Promise<ShopbyOAuthToken>,
  options?: {
    refreshBufferSeconds?: number;
    onTokensRefreshed?: (tokens: ShopbyOAuthToken) => void;
    onRefreshError?: (error: Error) => void;
  }
): TokenManager {
  return new TokenManager({
    storage: createDefaultTokenStorage(),
    refreshTokens,
    ...options,
  });
}
