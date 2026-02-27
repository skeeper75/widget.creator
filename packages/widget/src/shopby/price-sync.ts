/**
 * Shopby Price Synchronization
 *
 * Compares widget-calculated prices with Shopby option prices
 * and manages price breakdown serialization for optionInputs.
 *
 * Emits priceMismatch event when discrepancy exceeds 10% threshold.
 * Provides admin notification mechanism for price synchronization issues.
 *
 * @see SPEC-SHOPBY-003 Section: Price Synchronization (R-WDG-004)
 * @MX:ANCHOR: Price synchronization - ensures widget prices match Shopby
 * @MX:NOTE: Default tolerance is 10% (DEFAULT_TOLERANCE = 0.1)
 * @MX:SPEC: SPEC-SHOPBY-003
 */

import type { PriceSyncResult, ShopbyWidgetCallbacks } from './types';

/** Default price tolerance (10%) */
const DEFAULT_TOLERANCE = 0.1;

/**
 * Price breakdown from widget calculation.
 * Matches the widget's internal price state structure.
 */
export interface PriceBreakdown {
  /** Base print/product price */
  basePrice: number;
  /** Option-related additions */
  optionPrice: number;
  /** Post-processing price additions */
  postProcessPrice: number;
  /** Delivery/shipping price */
  deliveryPrice: number;
  /** Total price (sum of all components) */
  totalPrice: number;
}

/**
 * Price mismatch details for admin notification.
 */
export interface PriceMismatchDetails {
  /** Product number being compared */
  productNo: number;
  /** Option number if applicable */
  optionNo?: number;
  /** Widget-calculated price */
  widgetPrice: number;
  /** Shopby option price */
  shopbyPrice: number;
  /** Absolute difference */
  discrepancy: number;
  /** Percentage difference (0-1) */
  discrepancyPercent: number;
  /** Timestamp of mismatch detection */
  timestamp: string;
}

/**
 * Admin notification callback for price mismatch.
 */
export type AdminNotificationCallback = (details: PriceMismatchDetails) => void;

/**
 * Manages price synchronization between widget and Shopby.
 *
 * Emits 'priceMismatch' event when discrepancy exceeds tolerance.
 * Supports admin notification callback for external monitoring.
 */
export class PriceSyncManager {
  private tolerance: number;
  private onPriceChange: ShopbyWidgetCallbacks['onPriceChange'] | null;
  private adminNotifier: AdminNotificationCallback | null = null;
  private productNo: number | null = null;

  constructor(
    tolerance: number = DEFAULT_TOLERANCE,
    onPriceChange?: ShopbyWidgetCallbacks['onPriceChange'],
  ) {
    this.tolerance = tolerance;
    this.onPriceChange = onPriceChange ?? null;
  }

  /**
   * Set the admin notification callback.
   */
  setAdminNotifier(callback: AdminNotificationCallback | null): void {
    this.adminNotifier = callback;
  }

  /**
   * Set the current product number for mismatch reporting.
   */
  setProductNo(productNo: number): void {
    this.productNo = productNo;
  }

  /**
   * Compare widget-calculated price with Shopby option price.
   * Emits 'priceMismatch' event and triggers admin notification if discrepancy exceeds tolerance.
   * @MX:ANCHOR: Price comparison entry point - core R-WDG-004 implementation
   */
  comparePrices(
    widgetPrice: number,
    shopbyOptionPrice: number,
    optionNo?: number,
  ): PriceSyncResult {
    const discrepancy = Math.abs(widgetPrice - shopbyOptionPrice);
    const maxPrice = Math.max(widgetPrice, shopbyOptionPrice, 1);
    const discrepancyPercent = discrepancy / maxPrice;
    const isWithinTolerance = discrepancyPercent <= this.tolerance;

    const result: PriceSyncResult = {
      widgetPrice,
      shopbyPrice: shopbyOptionPrice,
      discrepancy,
      isWithinTolerance,
      tolerance: this.tolerance,
    };

    // Notify callback if registered
    if (this.onPriceChange) {
      this.onPriceChange(result);
    }

    // Emit priceMismatch event if discrepancy exceeds tolerance (R-WDG-004)
    if (!isWithinTolerance) {
      const mismatchDetails: PriceMismatchDetails = {
        productNo: this.productNo ?? 0,
        optionNo,
        widgetPrice,
        shopbyPrice: shopbyOptionPrice,
        discrepancy,
        discrepancyPercent,
        timestamp: new Date().toISOString(),
      };

      // Dispatch custom priceMismatch event for external listeners
      this.dispatchPriceMismatchEvent(mismatchDetails);

      // Trigger admin notification
      this.notifyAdmin(mismatchDetails);
    }

    return result;
  }

  /**
   * Notify admin about price mismatch.
   * Calls the registered admin notification callback if available.
   */
  private notifyAdmin(details: PriceMismatchDetails): void {
    if (this.adminNotifier) {
      try {
        this.adminNotifier(details);
      } catch (err) {
        console.error('[PriceSyncManager] Admin notification failed:', err);
      }
    }
  }

  /**
   * Dispatch a custom priceMismatch event on the document.
   * This allows external listeners (like Aurora Skin) to react to price discrepancies.
   */
  private dispatchPriceMismatchEvent(details: PriceMismatchDetails): void {
    if (typeof document === 'undefined') return;

    const customEvent = new CustomEvent('widgetCreator:priceMismatch', {
      detail: details,
      bubbles: true,
      cancelable: true,
    });

    document.dispatchEvent(customEvent);
  }

  /**
   * Calculate a price breakdown from widget selections.
   * Aggregates individual price components into a structured breakdown.
   */
  calculatePriceBreakdown(components: {
    basePrice: number;
    optionPrice?: number;
    postProcessPrice?: number;
    deliveryPrice?: number;
  }): PriceBreakdown {
    const basePrice = components.basePrice;
    const optionPrice = components.optionPrice ?? 0;
    const postProcessPrice = components.postProcessPrice ?? 0;
    const deliveryPrice = components.deliveryPrice ?? 0;
    const totalPrice = basePrice + optionPrice + postProcessPrice + deliveryPrice;

    return {
      basePrice,
      optionPrice,
      postProcessPrice,
      deliveryPrice,
      totalPrice,
    };
  }

  /**
   * Check if a price sync result has a significant discrepancy.
   * Returns true if discrepancy exceeds the configured tolerance.
   */
  checkDiscrepancy(result: PriceSyncResult): boolean {
    return !result.isWithinTolerance;
  }

  /**
   * Serialize price breakdown as JSON string for Shopby optionInputs.
   * This is passed as an optionInput value so Shopby can store
   * the widget's detailed price calculation.
   */
  serializePriceForOptionInputs(breakdown: PriceBreakdown): string {
    return JSON.stringify({
      basePrice: breakdown.basePrice,
      optionPrice: breakdown.optionPrice,
      postProcessPrice: breakdown.postProcessPrice,
      deliveryPrice: breakdown.deliveryPrice,
      totalPrice: breakdown.totalPrice,
    });
  }

  /**
   * Update the price change callback.
   */
  setOnPriceChange(
    callback: ShopbyWidgetCallbacks['onPriceChange'] | null,
  ): void {
    this.onPriceChange = callback;
  }

  /**
   * Update the tolerance threshold.
   */
  setTolerance(tolerance: number): void {
    this.tolerance = Math.max(0, Math.min(1, tolerance));
  }
}

/**
 * Create an admin notification callback that logs to console.
 * Useful for development and debugging.
 */
export function createConsoleAdminNotifier(): AdminNotificationCallback {
  return (details: PriceMismatchDetails) => {
    console.warn(
      '[Price Mismatch] Product %d: Widget=%d, Shopby=%d, Diff=%d (%.1f%%)',
      details.productNo,
      details.widgetPrice,
      details.shopbyPrice,
      details.discrepancy,
      details.discrepancyPercent * 100,
    );
  };
}

/**
 * Create an admin notification callback that sends to a webhook URL.
 * Uses fetch to POST the mismatch details to the specified endpoint.
 *
 * @param webhookUrl - URL to send POST request with mismatch details
 * @param headers - Optional additional headers for the request
 */
export function createWebhookAdminNotifier(
  webhookUrl: string,
  headers?: Record<string, string>,
): AdminNotificationCallback {
  return async (details: PriceMismatchDetails) => {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({
          type: 'priceMismatch',
          data: details,
        }),
      });
    } catch (err) {
      console.error('[PriceSyncManager] Webhook notification failed:', err);
    }
  };
}
