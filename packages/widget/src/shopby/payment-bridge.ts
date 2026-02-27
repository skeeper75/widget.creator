/**
 * Shopby Payment Bridge
 *
 * Handles payment reservation and confirmation with Shopby Payment Gateway.
 * Manages PG (Payment Gateway) integration with error handling and retry logic.
 *
 * @see SPEC-SHOPBY-004 Section: Payment Integration
 * @MX:ANCHOR: Payment gateway integration - handles PG reservation and confirmation
 * @MX:NOTE: Supports multiple payment types via payType parameter
 * @MX:SPEC: SPEC-SHOPBY-004
 */

import type { ShopbyAuthConnector } from './auth-connector';
import type { ShopbyWidgetError } from './types';
import { ShopbyWidgetErrorCode } from './types';

/** Default Shopby Payment API base URL */
const DEFAULT_PAYMENT_API_BASE = 'https://api.shopby.co.kr/pay/v1' as const;

/** Maximum retry attempts for payment confirmation */
const MAX_RETRIES = 3;

/** Retry delay in ms (doubles on each retry) */
const RETRY_DELAY_MS = 2000;

/**
 * Supported payment types.
 */
export const PaymentType = {
  /** Credit card */
  CARD: 'CARD',
  /** Bank transfer */
  BANK: 'BANK',
  /** Virtual account */
  VBANK: 'VBANK',
  /** Mobile payment */
  CELLPHONE: 'CELLPHONE',
  /** Kakao Pay */
  KAKAO: 'KAKAO',
  /** Naver Pay */
  NAVER: 'NAVER',
  /** Payco */
  PAYCO: 'PAYCO',
  /** Toss */
  TOSS: 'TOSS',
} as const;

export type PaymentType =
  (typeof PaymentType)[keyof typeof PaymentType];

/**
 * Payment reservation request.
 */
export interface PaymentReserveRequest {
  /** Order sheet number */
  orderSheetNo: string;
  /** Payment type */
  payType: PaymentType;
  /** Payment amount in KRW */
  payAmt: number;
  /** Return URL after payment completion */
  returnUrl?: string;
  /** Cancel URL if payment fails */
  cancelUrl?: string;
  /** Additional payment options (PG-specific) */
  payOption?: Record<string, unknown>;
}

/**
 * Payment reservation result.
 */
export interface PaymentReserveResult {
  /** Whether the reservation succeeded */
  success: boolean;
  /** Payment transaction ID (if successful) */
  paymentId?: string;
  /** PG redirect URL for payment page (if required) */
  redirectUrl?: string;
  /** Payment reservation token */
  reserveToken?: string;
  /** Error message (if failed) */
  error?: string;
  /** Error code (if failed) */
  errorCode?: ShopbyWidgetErrorCode;
}

/**
 * Payment confirmation data from PG callback.
 */
export interface PaymentConfirmData {
  /** Payment transaction ID */
  paymentId: string;
  /** Order sheet number */
  orderSheetNo: string;
  /** PG authentication result token */
  authResult?: string;
  /** PG-specific parameters */
  pgParams?: Record<string, string>;
}

/**
 * Payment confirmation result.
 */
export interface PaymentConfirmResult {
  /** Whether the confirmation succeeded */
  success: boolean;
  /** Confirmed order number */
  orderNo?: string;
  /** Payment transaction ID */
  paymentId?: string;
  /** Final payment amount */
  paidAmount?: number;
  /** Payment timestamp */
  paidAt?: string;
  /** Error message (if failed) */
  error?: string;
  /** Error code (if failed) */
  errorCode?: ShopbyWidgetErrorCode;
  /** Whether retry is recommended */
  retryRecommended?: boolean;
}

/**
 * Payment status information.
 */
export interface PaymentStatus {
  /** Payment ID */
  paymentId: string;
  /** Order sheet number */
  orderSheetNo: string;
  /** Current payment status */
  status: 'RESERVED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  /** Payment type */
  payType: PaymentType;
  /** Payment amount */
  amount: number;
  /** Created timestamp */
  createdAt: string;
  /** Updated timestamp */
  updatedAt?: string;
}

/**
 * Bridges payment operations to Shopby Payment Gateway.
 *
 * Handles the complete payment flow:
 * 1. Reserve payment (creates payment intent)
 * 2. Redirect to PG or process inline
 * 3. Confirm payment (validates with Shopby)
 *
 * Includes retry logic for transient PG failures and proper
 * error classification for user feedback.
 *
 * @example
 * ```typescript
 * const bridge = new PaymentBridge(authConnector);
 *
 * // Step 1: Reserve payment
 * const reserve = await bridge.reservePayment('ORDER-123', 'CARD', 50000);
 * if (!reserve.success) {
 *   console.error('Reservation failed:', reserve.error);
 *   return;
 * }
 *
 * // Step 2: Redirect user to PG page (if redirectUrl provided)
 * if (reserve.redirectUrl) {
 *   window.location.href = reserve.redirectUrl;
 * }
 *
 * // Step 3: Confirm after PG callback
 * const confirm = await bridge.confirmPayment({
 *   paymentId: reserve.paymentId!,
 *   orderSheetNo: 'ORDER-123',
 *   pgParams: callbackParams,
 * });
 * ```
 */
export class PaymentBridge {
  private auth: ShopbyAuthConnector;
  private apiBaseUrl: string;

  constructor(auth: ShopbyAuthConnector, apiBaseUrl?: string) {
    this.auth = auth;
    this.apiBaseUrl = apiBaseUrl ?? DEFAULT_PAYMENT_API_BASE;
  }

  /**
   * Reserve a payment with Shopby Payment Gateway.
   *
   * Creates a payment intent and optionally returns a redirect URL
   * for PG payment pages.
   *
   * @MX:ANCHOR: Payment reservation entry - validates auth before API call
   * @param orderSheetNo - Order sheet to pay for
   * @param payType - Payment method type
   * @param payAmt - Payment amount in KRW
   * @param options - Additional payment options
   * @returns PaymentReserveResult with redirect URL or error
   */
  async reservePayment(
    orderSheetNo: string,
    payType: PaymentType,
    payAmt: number,
    options?: {
      returnUrl?: string;
      cancelUrl?: string;
      payOption?: Record<string, unknown>;
    },
  ): Promise<PaymentReserveResult> {
    try {
      this.auth.requireAuth();
    } catch (err) {
      const error = err as ShopbyWidgetError;
      return {
        success: false,
        error: error.message,
        errorCode: error.code,
      };
    }

    const request: PaymentReserveRequest = {
      orderSheetNo,
      payType,
      payAmt,
      returnUrl: options?.returnUrl,
      cancelUrl: options?.cancelUrl,
      payOption: options?.payOption,
    };

    try {
      const response = await this.fetchWithRetry<{
        paymentId: string;
        redirectUrl?: string;
        reserveToken: string;
      }>(`${this.apiBaseUrl}/payments/reserve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.auth.getAuthHeaders(),
        },
        body: JSON.stringify(request),
      });

      return {
        success: true,
        paymentId: response.paymentId,
        redirectUrl: response.redirectUrl,
        reserveToken: response.reserveToken,
      };
    } catch (err) {
      const error = this.classifyError(err);
      return {
        success: false,
        error: error.message,
        errorCode: error.code,
      };
    }
  }

  /**
   * Confirm a payment after PG authentication.
   *
   * Validates the payment with Shopby and finalizes the transaction.
   * Uses increased retry count for payment confirmation due to
   * potential PG-side delays.
   *
   * @MX:ANCHOR: Payment confirmation - validates PG authentication result
   * @param paymentData - Payment confirmation data from PG callback
   * @returns PaymentConfirmResult with order number or error
   */
  async confirmPayment(
    paymentData: PaymentConfirmData,
  ): Promise<PaymentConfirmResult> {
    try {
      this.auth.requireAuth();
    } catch (err) {
      const error = err as ShopbyWidgetError;
      return {
        success: false,
        error: error.message,
        errorCode: error.code,
        retryRecommended: false,
      };
    }

    try {
      const response = await this.fetchWithRetry<{
        orderNo: string;
        paymentId: string;
        paidAmount: number;
        paidAt: string;
      }>(
        `${this.apiBaseUrl}/payments/confirm`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...this.auth.getAuthHeaders(),
          },
          body: JSON.stringify(paymentData),
        },
        MAX_RETRIES, // Use more retries for payment confirmation
      );

      return {
        success: true,
        orderNo: response.orderNo,
        paymentId: response.paymentId,
        paidAmount: response.paidAmount,
        paidAt: response.paidAt,
      };
    } catch (err) {
      const error = this.classifyError(err);
      const isRetryable = this.isRetryableError(err);

      return {
        success: false,
        error: error.message,
        errorCode: error.code,
        retryRecommended: isRetryable,
      };
    }
  }

  /**
   * Get payment status for a payment ID.
   * Useful for polling payment status after redirect.
   */
  async getPaymentStatus(paymentId: string): Promise<{
    success: boolean;
    status?: PaymentStatus;
    error?: string;
  }> {
    try {
      this.auth.requireAuth();
    } catch (err) {
      const error = err as ShopbyWidgetError;
      return { success: false, error: error.message };
    }

    try {
      const response = await this.fetchWithRetry<PaymentStatus>(
        `${this.apiBaseUrl}/payments/${paymentId}/status`,
        {
          method: 'GET',
          headers: {
            ...this.auth.getAuthHeaders(),
          },
        },
      );

      return { success: true, status: response };
    } catch (err) {
      const error = this.classifyError(err);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cancel a reserved payment.
   */
  async cancelPayment(paymentId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      this.auth.requireAuth();
    } catch (err) {
      const error = err as ShopbyWidgetError;
      return { success: false, error: error.message };
    }

    try {
      await this.fetchWithRetry<void>(
        `${this.apiBaseUrl}/payments/${paymentId}/cancel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...this.auth.getAuthHeaders(),
          },
        },
      );

      return { success: true };
    } catch (err) {
      const error = this.classifyError(err);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if an error is retryable (transient network or PG issues).
   */
  private isRetryableError(err: unknown): boolean {
    if (this.isNetworkError(err)) {
      return true;
    }

    if (
      err !== null &&
      typeof err === 'object' &&
      'status' in err
    ) {
      const httpErr = err as { status: number };
      // 5xx errors and 429 (rate limit) are retryable
      return httpErr.status >= 500 || httpErr.status === 429;
    }

    return false;
  }

  /**
   * Fetch with retry logic for payment operations.
   * @MX:WARN: Retry logic with exponential backoff - PG failures are retried up to specified retries
   */
  private async fetchWithRetry<T>(
    url: string,
    init: RequestInit,
    retries: number = MAX_RETRIES,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, init);

        if (!response.ok) {
          const body = await response.text().catch(() => '');
          throw {
            status: response.status,
            statusText: response.statusText,
            body,
          };
        }

        return (await response.json()) as T;
      } catch (err) {
        lastError = err;

        // Only retry on network errors or retryable HTTP errors
        if (this.isRetryableError(err) && attempt < retries) {
          await this.delay(RETRY_DELAY_MS * Math.pow(2, attempt));
          continue;
        }

        throw err;
      }
    }

    throw lastError;
  }

  /**
   * Check if error is a network-level error (vs HTTP error).
   */
  private isNetworkError(err: unknown): boolean {
    return err instanceof TypeError && 'message' in err;
  }

  /**
   * Classify an error into a ShopbyWidgetError.
   */
  private classifyError(err: unknown): ShopbyWidgetError {
    // HTTP error with status
    if (
      err !== null &&
      typeof err === 'object' &&
      'status' in err
    ) {
      const httpErr = err as { status: number; statusText?: string; body?: string };

      if (httpErr.status === 401 || httpErr.status === 403) {
        return {
          code: ShopbyWidgetErrorCode.AUTH_EXPIRED,
          message: 'Authentication expired or insufficient permissions',
          cause: err,
        };
      }

      if (httpErr.status === 404) {
        return {
          code: ShopbyWidgetErrorCode.PRODUCT_NOT_FOUND,
          message: 'Payment or order not found',
          cause: err,
        };
      }

      if (httpErr.status === 400) {
        return {
          code: ShopbyWidgetErrorCode.API_ERROR,
          message: `Payment validation failed: ${httpErr.body ?? httpErr.statusText}`,
          cause: err,
        };
      }

      return {
        code: ShopbyWidgetErrorCode.API_ERROR,
        message: `Payment API error: ${httpErr.status} ${httpErr.statusText ?? ''}`.trim(),
        cause: err,
      };
    }

    // Network error
    if (err instanceof TypeError) {
      return {
        code: ShopbyWidgetErrorCode.NETWORK_ERROR,
        message: 'Network error: unable to reach Payment Gateway',
        cause: err,
      };
    }

    // Unknown error
    return {
      code: ShopbyWidgetErrorCode.API_ERROR,
      message: err instanceof Error ? err.message : 'Unknown payment error occurred',
      cause: err,
    };
  }

  /**
   * Delay helper for retry logic.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
