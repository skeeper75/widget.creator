/**
 * Shopby Data Mapper
 *
 * Transforms between Widget Builder domain types and Shopby API formats.
 */

import type {
  ShopbyProduct,
  ShopbyOrder,
  ProductForShopbySync,
  ShopbyCategoryMapping,
} from './types.js';

/**
 * Product data with huni_code for Shopby mapping
 */
export interface ProductForShopbyProduct {
  name: string;
  huniCode: string;
  shopbyId?: number | null;
}

/**
 * Transform Widget Builder product to Shopby product format
 *
 * @param product - Product data from Widget Builder
 * @param sellingPrice - Selling price from fixed_prices
 * @returns ShopbyProduct for API sync
 */
export function toShopbyProduct(
  product: ProductForShopbyProduct,
  sellingPrice: number
): ShopbyProduct {
  return {
    productName: product.name,
    salePrice: sellingPrice,
    // categoryNo would be looked up via category mapping
    // saleStatus defaults to 'T' (on sale)
    saleStatus: 'T',
  };
}

/**
 * Transform Widget Builder product with category to Shopby format
 *
 * @param product - Full product data
 * @param categoryMapping - Category mapping for Shopby
 * @returns ShopbyProduct with category number
 */
export function toShopbyProductWithCategory(
  product: ProductForShopbySync,
  categoryMapping: ShopbyCategoryMapping | null
): ShopbyProduct {
  return {
    productName: product.name,
    salePrice: product.sellingPrice,
    categoryNo: categoryMapping?.shopbyCategoryNo,
    productDescription: product.description,
    saleStatus: 'T',
  };
}

/**
 * Transformed Shopby order for Widget Builder
 */
export interface TransformedShopbyOrder {
  externalOrderId: string;
  selectedOptions: string[];
  totalPrice: number;
  customerName: string;
  customerEmail: string;
}

/**
 * Transform Shopby order to Widget Builder format
 *
 * @param shopbyOrder - Order from Shopby webhook
 * @returns Transformed order data
 */
export function fromShopbyOrder(shopbyOrder: ShopbyOrder): TransformedShopbyOrder {
  return {
    externalOrderId: shopbyOrder.orderNo,
    selectedOptions: shopbyOrder.optionValues,
    totalPrice: shopbyOrder.orderAmount,
    customerName: shopbyOrder.customerName,
    customerEmail: shopbyOrder.customerEmail,
  };
}

/**
 * Order status notification for Shopby
 */
export interface OrderStatusNotification {
  orderNo: string;
  status: string;
  timestamp: string;
  trackingNo?: string;
  deliveryCompany?: string;
}

/**
 * Transform Widget Builder order status to Shopby notification
 *
 * @param order - Order data with Shopby info
 * @param status - New status
 * @param trackingInfo - Optional tracking information
 * @returns ShopbyOrderStatusNotification
 */
export function toShopbyStatusNotification(
  order: { shopbyOrderNo: string | null },
  status: string,
  trackingInfo?: { trackingNo: string; deliveryCompany: string }
): OrderStatusNotification | null {
  if (!order.shopbyOrderNo) {
    return null;
  }

  return {
    orderNo: order.shopbyOrderNo,
    status,
    timestamp: new Date().toISOString(),
    ...trackingInfo,
  };
}

/**
 * Widget Builder order status to Shopby status mapping
 */
const WB_TO_SHOPBY_STATUS_MAP: Record<string, string> = {
  PENDING: 'PAYMENT_WAITING',
  CONFIRMED: 'PAYMENT_DONE',
  PRODUCTION_WAITING: 'PREPARING',
  PRODUCING: 'PREPARING',
  PRODUCTION_DONE: 'PREPARING',
  SHIPPED: 'DELIVERING',
  DELIVERED: 'DELIVERY_COMPLETE',
  CANCELLED: 'CANCEL',
};

/**
 * Map Widget Builder order status to Shopby status
 *
 * @param wbStatus - Widget Builder order status
 * @returns Shopby status string
 */
export function mapToShopbyStatus(wbStatus: string): string {
  return WB_TO_SHOPBY_STATUS_MAP[wbStatus] ?? wbStatus;
}

/**
 * Product sync request for API
 */
export interface ShopbyProductSyncRequest {
  productNo?: number; // For update (existing product)
  product: ShopbyProduct;
  huniCode: string; // For reference
}

/**
 * Build Shopby product sync request
 *
 * @param product - Product data
 * @param categoryMapping - Category mapping
 * @param existingShopbyId - Existing Shopby ID (for update)
 * @returns Sync request
 */
export function buildProductSyncRequest(
  product: ProductForShopbySync,
  categoryMapping: ShopbyCategoryMapping | null,
  existingShopbyId?: number
): ShopbyProductSyncRequest {
  return {
    productNo: existingShopbyId,
    product: toShopbyProductWithCategory(product, categoryMapping),
    huniCode: product.huniCode,
  };
}
