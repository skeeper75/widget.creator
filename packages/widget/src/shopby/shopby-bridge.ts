/**
 * Shopby API Bridge
 *
 * Bridges widget actions (add-to-cart, buy-now) to Shopby Shop API.
 * Handles request building, error classification, and retry logic.
 *
 * @see SPEC-SHOPBY-003 Section: Shopby Bridge
 * @MX:ANCHOR: Core cart/order API integration - called by SDK for e-commerce operations
 * @MX:SPEC: SPEC-SHOPBY-003
 */

import type { ShopbyAuthConnector } from './auth-connector';
import type { EventEmitter } from './event-emitter';
import type {
  WidgetToShopbyPayload,
  ShopbyCartRequest,
  ShopbyOrderSheetRequest,
  CartResult,
  OrderSheetResult,
  ShopbyWidgetError,
} from './types';
import { ShopbyWidgetErrorCode } from './types';

/** Default Shopby Shop API base URL */
const DEFAULT_API_BASE = 'https://api.shopby.co.kr/shop/v1' as const;

/** Maximum retry attempts for network errors */
const MAX_RETRIES = 2;

/** Retry delay in ms (doubles on each retry) */
const RETRY_DELAY_MS = 1000;

/**
 * Bridges widget operations to Shopby Shop API.
 * Handles cart and order sheet operations with authentication,
 * error handling, and retry logic.
 */
export class ShopbyBridge {
  private auth: ShopbyAuthConnector;
  private events: EventEmitter;
  private apiBaseUrl: string;

  constructor(
    auth: ShopbyAuthConnector,
    events: EventEmitter,
    apiBaseUrl?: string,
  ) {
    this.auth = auth;
    this.events = events;
    this.apiBaseUrl = apiBaseUrl ?? DEFAULT_API_BASE;
  }

  /**
   * Add item to Shopby cart.
   * Requires authentication; emits 'addToCart' on success or 'error' on failure.
   */
  async addToCart(payload: WidgetToShopbyPayload): Promise<CartResult> {
    try {
      this.auth.requireAuth();
    } catch (err) {
      const error = err as ShopbyWidgetError;
      this.events.emit('error', error);
      return { success: false, error: error.message };
    }

    const request = this.buildCartRequest(payload);

    try {
      const result = await this.fetchWithRetry<{ cartNo?: number }>(
        `${this.apiBaseUrl}/cart`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...this.auth.getAuthHeaders(),
          },
          body: JSON.stringify(request),
        },
      );

      const cartResult: CartResult = {
        success: true,
        cartNo: result.cartNo,
      };

      this.events.emit('addToCart', payload);
      return cartResult;
    } catch (err) {
      const error = this.classifyError(err);
      this.events.emit('error', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create order sheet for buy-now flow.
   * Requires authentication; emits 'buyNow' on success or 'error' on failure.
   */
  async buyNow(payload: WidgetToShopbyPayload): Promise<OrderSheetResult> {
    try {
      this.auth.requireAuth();
    } catch (err) {
      const error = err as ShopbyWidgetError;
      this.events.emit('error', error);
      return { success: false, error: error.message };
    }

    const request = this.buildOrderSheetRequest(payload);

    try {
      const result = await this.fetchWithRetry<{
        orderSheetNo?: string;
      }>(`${this.apiBaseUrl}/order-sheets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.auth.getAuthHeaders(),
        },
        body: JSON.stringify(request),
      });

      const orderResult: OrderSheetResult = {
        success: true,
        orderSheetNo: result.orderSheetNo,
        redirectUrl: result.orderSheetNo
          ? `/order/sheet/${result.orderSheetNo}`
          : undefined,
      };

      this.events.emit('buyNow', payload);
      return orderResult;
    } catch (err) {
      const error = this.classifyError(err);
      this.events.emit('error', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Build Shopby cart request from widget payload.
   */
  private buildCartRequest(payload: WidgetToShopbyPayload): ShopbyCartRequest {
    return {
      items: [
        {
          productNo: payload.productNo,
          optionNo: payload.optionNo,
          orderCnt: payload.orderCnt,
          optionInputs: this.buildOptionInputs(payload),
        },
      ],
    };
  }

  /**
   * Build Shopby order sheet request from widget payload.
   */
  private buildOrderSheetRequest(
    payload: WidgetToShopbyPayload,
  ): ShopbyOrderSheetRequest {
    return {
      products: [
        {
          productNo: payload.productNo,
          optionNo: payload.optionNo,
          orderCnt: payload.orderCnt,
          optionInputs: this.buildOptionInputs(payload),
        },
      ],
    };
  }

  /**
   * Build optionInputs array from widget payload.
   * Serializes design file URL, print spec, and optional fields.
   */
  private buildOptionInputs(
    payload: WidgetToShopbyPayload,
  ): Array<{ inputLabel: string; inputValue: string }> {
    const inputs: Array<{ inputLabel: string; inputValue: string }> = [
      {
        inputLabel: 'designFileUrl',
        inputValue: payload.optionInputs.designFileUrl,
      },
      {
        inputLabel: 'printSpec',
        inputValue: payload.optionInputs.printSpec,
      },
      {
        inputLabel: 'widgetPrice',
        inputValue: JSON.stringify(payload.widgetPrice),
      },
    ];

    if (payload.optionInputs.specialRequest) {
      inputs.push({
        inputLabel: 'specialRequest',
        inputValue: payload.optionInputs.specialRequest,
      });
    }

    if (payload.optionInputs.proofRequired !== undefined) {
      inputs.push({
        inputLabel: 'proofRequired',
        inputValue: String(payload.optionInputs.proofRequired),
      });
    }

    return inputs;
  }

  /**
   * Fetch with retry logic for network errors.
   * @MX:WARN: Retry logic with exponential backoff - network failures are retried up to MAX_RETRIES (2)
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

        // Only retry on network errors, not HTTP errors
        if (this.isNetworkError(err) && attempt < retries) {
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
    // Already a ShopbyWidgetError
    if (
      err !== null &&
      typeof err === 'object' &&
      'code' in err &&
      'message' in err
    ) {
      return err as ShopbyWidgetError;
    }

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

      return {
        code: ShopbyWidgetErrorCode.API_ERROR,
        message: `Shopby API error: ${httpErr.status} ${httpErr.statusText ?? ''}`.trim(),
        cause: err,
      };
    }

    // Network error
    if (err instanceof TypeError) {
      return {
        code: ShopbyWidgetErrorCode.NETWORK_ERROR,
        message: 'Network error: unable to reach Shopby API',
        cause: err,
      };
    }

    // Unknown error
    return {
      code: ShopbyWidgetErrorCode.API_ERROR,
      message: err instanceof Error ? err.message : 'Unknown error occurred',
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
