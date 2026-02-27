/**
 * Shopby Order Calculator
 *
 * Calculates order totals by calling Shopby's order calculation API.
 * Handles coupon application, discount processing, and final price computation.
 *
 * @see SPEC-SHOPBY-004 Section: Order Calculation
 * @MX:ANCHOR: Order price calculation - integrates with Shopby pricing API
 * @MX:NOTE: Uses POST /order-sheets/{id}/calculate for accurate server-side pricing
 * @MX:SPEC: SPEC-SHOPBY-004
 */

import type { ShopbyAuthConnector } from './auth-connector';
import type { ShopbyWidgetError } from './types';
import { ShopbyWidgetErrorCode } from './types';

/** Default Shopby Shop API base URL */
const DEFAULT_API_BASE = 'https://api.shopby.co.kr/shop/v1' as const;

/** Maximum retry attempts for network errors */
const MAX_RETRIES = 2;

/** Retry delay in ms (doubles on each retry) */
const RETRY_DELAY_MS = 1000;

/**
 * Order item for calculation request.
 */
export interface OrderCalculationItem {
  /** Product number */
  productNo: number;
  /** Option number */
  optionNo: number;
  /** Order quantity */
  orderCnt: number;
  /** Custom option inputs */
  optionInputs?: Array<{
    inputLabel: string;
    inputValue: string;
  }>;
}

/**
 * Coupon information for discount calculation.
 */
export interface CouponInfo {
  /** Coupon number to apply */
  couponNo: number;
  /** Whether to use product coupon */
  useProductCoupon?: boolean;
  /** Whether to use cart coupon */
  useCartCoupon?: boolean;
}

/**
 * Request payload for order calculation API.
 */
export interface OrderCalculationRequest {
  /** Order sheet number (if updating existing) */
  orderSheetNo?: string;
  /** Products to calculate */
  products: OrderCalculationItem[];
  /** Coupon to apply */
  coupon?: CouponInfo;
  /** Use point amount */
  usePoint?: number;
  /** Delivery coupon use flag */
  useDeliveryCoupon?: boolean;
}

/**
 * Calculated price breakdown from Shopby.
 */
export interface CalculatedPriceBreakdown {
  /** Total product price before discounts */
  totalProductPrice: number;
  /** Total option price additions */
  totalOptionPrice: number;
  /** Total discount amount */
  totalDiscountPrice: number;
  /** Product coupon discount amount */
  productCouponDiscountPrice: number;
  /** Cart coupon discount amount */
  cartCouponDiscountPrice: number;
  /** Point discount amount */
  pointDiscountPrice: number;
  /** Delivery price */
  deliveryPrice: number;
  /** Delivery discount amount */
  deliveryDiscountPrice: number;
  /** Final payment amount */
  totalPayPrice: number;
}

/**
 * Result of order calculation.
 */
export interface OrderCalculationResult {
  /** Whether the calculation succeeded */
  success: boolean;
  /** Order sheet number (new or existing) */
  orderSheetNo?: string;
  /** Calculated price breakdown */
  prices?: CalculatedPriceBreakdown;
  /** Error message (if failed) */
  error?: string;
  /** Error code (if failed) */
  errorCode?: ShopbyWidgetErrorCode;
}

/**
 * API response structure for order calculation.
 */
interface ShopbyCalculationResponse {
  orderSheetNo: string;
  totalProductPrice: number;
  totalOptionPrice: number;
  totalDiscountPrice: number;
  productCouponDiscountPrice: number;
  cartCouponDiscountPrice: number;
  pointDiscountPrice: number;
  deliveryPrice: number;
  deliveryDiscountPrice: number;
  totalPayPrice: number;
}

/**
 * Calculates order prices by calling Shopby's calculation API.
 *
 * Provides accurate server-side pricing including:
 * - Product and option prices
 * - Coupon discounts (product and cart)
 * - Point discounts
 * - Delivery fees and discounts
 * - Final payment amount
 *
 * @example
 * ```typescript
 * const calculator = new OrderCalculator(authConnector);
 *
 * const result = await calculator.calculateOrder('ORDER-123', {
 *   products: [{ productNo: 100, optionNo: 1, orderCnt: 10 }],
 *   coupon: { couponNo: 500, useProductCoupon: true },
 * });
 *
 * if (result.success) {
 *   console.log('Final price:', result.prices?.totalPayPrice);
 * }
 * ```
 */
export class OrderCalculator {
  private auth: ShopbyAuthConnector;
  private apiBaseUrl: string;

  constructor(auth: ShopbyAuthConnector, apiBaseUrl?: string) {
    this.auth = auth;
    this.apiBaseUrl = apiBaseUrl ?? DEFAULT_API_BASE;
  }

  /**
   * Calculate order prices by calling Shopby API.
   *
   * If orderSheetNo is provided, updates existing order sheet.
   * Otherwise, creates a new order sheet for calculation.
   *
   * @MX:ANCHOR: Core calculation entry - validates auth before API call
   * @param orderSheetNo - Optional existing order sheet number
   * @param request - Calculation request with products and discounts
   * @returns OrderCalculationResult with price breakdown
   */
  async calculateOrder(
    orderSheetNo: string | null,
    request: OrderCalculationRequest,
  ): Promise<OrderCalculationResult> {
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

    const url = orderSheetNo
      ? `${this.apiBaseUrl}/order-sheets/${orderSheetNo}/calculate`
      : `${this.apiBaseUrl}/order-sheets/calculate`;

    try {
      const response = await this.fetchWithRetry<ShopbyCalculationResponse>(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...this.auth.getAuthHeaders(),
          },
          body: JSON.stringify(request),
        },
      );

      const prices: CalculatedPriceBreakdown = {
        totalProductPrice: response.totalProductPrice ?? 0,
        totalOptionPrice: response.totalOptionPrice ?? 0,
        totalDiscountPrice: response.totalDiscountPrice ?? 0,
        productCouponDiscountPrice: response.productCouponDiscountPrice ?? 0,
        cartCouponDiscountPrice: response.cartCouponDiscountPrice ?? 0,
        pointDiscountPrice: response.pointDiscountPrice ?? 0,
        deliveryPrice: response.deliveryPrice ?? 0,
        deliveryDiscountPrice: response.deliveryDiscountPrice ?? 0,
        totalPayPrice: response.totalPayPrice ?? 0,
      };

      return {
        success: true,
        orderSheetNo: response.orderSheetNo ?? orderSheetNo ?? undefined,
        prices,
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
   * Apply coupon to an existing order sheet.
   * Convenience method that recalculates with coupon applied.
   */
  async applyCoupon(
    orderSheetNo: string,
    coupon: CouponInfo,
  ): Promise<OrderCalculationResult> {
    return this.calculateOrder(orderSheetNo, {
      orderSheetNo,
      products: [],
      coupon,
    });
  }

  /**
   * Apply point discount to an existing order sheet.
   */
  async applyPoint(
    orderSheetNo: string,
    usePoint: number,
  ): Promise<OrderCalculationResult> {
    return this.calculateOrder(orderSheetNo, {
      orderSheetNo,
      products: [],
      usePoint,
    });
  }

  /**
   * Calculate prices for a single product without creating order sheet.
   * Useful for price preview in widget.
   */
  async calculateProductPrice(
    product: OrderCalculationItem,
  ): Promise<OrderCalculationResult> {
    return this.calculateOrder(null, {
      products: [product],
    });
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
          message: 'Order sheet or product not found',
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
