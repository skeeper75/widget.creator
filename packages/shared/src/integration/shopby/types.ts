/**
 * Shopby Integration Types
 *
 * Types for Shopby e-commerce platform integration.
 */

/**
 * Shopby API configuration
 */
export interface ShopbyApiConfig {
  /** Base URL for Shopby API */
  baseUrl: string;
  /** API key for authentication (optional) */
  apiKey?: string;
}

/**
 * Shopby product data for sync
 */
export interface ShopbyProduct {
  /** Product name */
  productName: string;
  /** Sale price */
  salePrice: number;
  /** Category number (optional) */
  categoryNo?: number;
  /** Product description (optional) */
  productDescription?: string;
  /** Whether product is on sale (optional) */
  saleStatus?: 'T' | 'F';
}

/**
 * Shopby product sync response
 */
export interface ShopbyProductSyncResponse {
  /** Shopby product number */
  productNo: number;
  /** Product name */
  productName: string;
  /** Sync status */
  status: 'created' | 'updated' | 'failed';
  /** Error message if failed */
  errorMessage?: string;
}

/**
 * Shopby order from webhook
 */
export interface ShopbyOrder {
  /** Shopby order number */
  orderNo: string;
  /** Shopby product number */
  productNo: number;
  /** Selected option values */
  optionValues: string[];
  /** Order amount (total price) */
  orderAmount: number;
  /** Customer name */
  customerName: string;
  /** Customer email */
  customerEmail: string;
  /** Order timestamp */
  orderTimestamp?: string;
  /** Payment status */
  paymentStatus?: string;
}

/**
 * Order source type
 */
export type ShopbyOrderSource = 'widget' | 'shopby' | 'admin';

/**
 * Order status notification for Shopby
 */
export interface ShopbyOrderStatusNotification {
  /** Shopby order number */
  orderNo: string;
  /** New order status */
  status: string;
  /** Status change timestamp */
  timestamp: string;
  /** Optional tracking number */
  trackingNo?: string;
  /** Optional delivery company */
  deliveryCompany?: string;
}

/**
 * Widget Builder order data for Shopby sync
 */
export interface OrderForShopbySync {
  orderId: string;
  source: ShopbyOrderSource;
  shopbyOrderNo: string | null;
  status: string;
}

/**
 * Product data for Shopby sync
 */
export interface ProductForShopbySync {
  productId: number;
  huniCode: string;
  shopbyId: number | null;
  name: string;
  categoryId: number;
  sellingPrice: number;
  description?: string;
}

/**
 * Shopby category mapping
 */
export interface ShopbyCategoryMapping {
  widgetBuilderCategoryId: number;
  shopbyCategoryNo: number;
  categoryName: string;
}

/**
 * Sync result for product sync operation
 */
export interface ShopbySyncResult {
  productId: number;
  success: boolean;
  shopbyId?: number;
  error?: string;
}
