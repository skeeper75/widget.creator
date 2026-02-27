/**
 * Shopby Auth Connector
 *
 * Lightweight authentication management for the widget SDK.
 * Supports guest browsing (no token) and authenticated mode.
 *
 * @see SPEC-SHOPBY-003 Section: Auth Connector
 * @MX:ANCHOR: Authentication management - used by ShopbyBridge for all API calls
 * @MX:NOTE: Token refresh uses 5-minute buffer (TOKEN_REFRESH_BUFFER_MS)
 * @MX:SPEC: SPEC-SHOPBY-003
 */

import type { ShopbyAuthState, ShopbyWidgetError } from './types';
import { ShopbyWidgetErrorCode } from './types';

/** Default Shopby Shop API base URL */
const DEFAULT_SHOPBY_API_BASE = 'https://shop-api.e-ncp.com' as const;

/** Buffer before expiry to consider token stale (5 minutes in ms) */
const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

/**
 * Manages Shopby authentication state for widget operations.
 * Supports guest mode (no token) for browsing and authenticated mode
 * for cart/order operations.
 */
export class ShopbyAuthConnector {
  private accessToken: string | null;
  private tokenExpiry: number | null = null;
  private memberGrade: string | null = null;
  private apiBaseUrl: string;

  constructor(accessToken?: string, apiBaseUrl?: string) {
    this.accessToken = accessToken ?? null;
    this.apiBaseUrl = apiBaseUrl ?? DEFAULT_SHOPBY_API_BASE;

    if (this.accessToken) {
      this.tokenExpiry = this.extractExpiry(this.accessToken);
    }
  }

  /**
   * Get Authorization headers for API requests.
   * Returns empty object for guest mode.
   */
  getAuthHeaders(): Record<string, string> {
    if (!this.accessToken) {
      return {};
    }
    return { Authorization: `Bearer ${this.accessToken}` };
  }

  /**
   * Check if user is authenticated (has a valid token).
   */
  isAuthenticated(): boolean {
    return this.accessToken !== null && this.validateToken();
  }

  /**
   * Validate current token (check expiry).
   * Returns true if no token (guest mode is valid).
   */
  validateToken(): boolean {
    if (!this.accessToken) {
      return true; // Guest mode is valid
    }

    if (!this.tokenExpiry) {
      return true; // No expiry info, assume valid
    }

    return Date.now() < this.tokenExpiry;
  }

  /**
   * Check if token is close to expiring and needs refresh.
   */
  needsRefresh(): boolean {
    if (!this.accessToken || !this.tokenExpiry) {
      return false;
    }

    return Date.now() >= this.tokenExpiry - TOKEN_REFRESH_BUFFER_MS;
  }

  /**
   * Attempt to refresh the access token via Shopby endpoint.
   * Returns true if refresh succeeded, false otherwise.
   */
  async refreshToken(): Promise<boolean> {
    if (!this.accessToken) {
      return false;
    }

    try {
      const response = await fetch(`${this.apiBaseUrl}/auth/token/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
      });

      if (!response.ok) {
        this.accessToken = null;
        this.tokenExpiry = null;
        return false;
      }

      const data = (await response.json()) as {
        accessToken?: string;
        expiresIn?: number;
      };

      if (data.accessToken) {
        this.accessToken = data.accessToken;
        this.tokenExpiry = data.expiresIn
          ? Date.now() + data.expiresIn * 1000
          : this.extractExpiry(data.accessToken);
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Get the member's grade from Shopby (if authenticated).
   */
  getMemberGrade(): string | null {
    return this.memberGrade;
  }

  /**
   * Set member grade (called after fetching profile data).
   */
  setMemberGrade(grade: string): void {
    this.memberGrade = grade;
  }

  /**
   * Require authentication for protected operations (cart, order).
   * Throws a structured error if not authenticated.
   * @MX:ANCHOR: Auth guard - called before all cart/order operations
   */
  requireAuth(): void {
    if (!this.accessToken) {
      const error: ShopbyWidgetError = {
        code: ShopbyWidgetErrorCode.AUTH_REQUIRED,
        message: 'Authentication required for this operation',
      };
      throw error;
    }

    if (!this.validateToken()) {
      const error: ShopbyWidgetError = {
        code: ShopbyWidgetErrorCode.AUTH_EXPIRED,
        message: 'Access token has expired',
      };
      throw error;
    }
  }

  /**
   * Get current authentication state snapshot.
   */
  getState(): ShopbyAuthState {
    return {
      accessToken: this.accessToken,
      isAuthenticated: this.isAuthenticated(),
      memberGrade: this.memberGrade ?? undefined,
      tokenExpiry: this.tokenExpiry ?? undefined,
    };
  }

  /**
   * Update access token (e.g., after external login flow).
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
    this.tokenExpiry = this.extractExpiry(token);
  }

  /**
   * Clear authentication state (logout).
   */
  clear(): void {
    this.accessToken = null;
    this.tokenExpiry = null;
    this.memberGrade = null;
  }

  /**
   * Extract expiry from a JWT-like token.
   * Returns null if token format is not JWT.
   */
  private extractExpiry(token: string): number | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = JSON.parse(atob(parts[1]));
      if (typeof payload.exp === 'number') {
        return payload.exp * 1000; // Convert seconds to ms
      }
      return null;
    } catch {
      return null;
    }
  }
}
