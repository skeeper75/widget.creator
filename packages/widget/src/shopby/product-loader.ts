/**
 * Shopby Product Loader
 *
 * Loads product data from Shopby Shop API for widget rendering.
 * Includes in-memory caching with TTL and widget config extraction.
 *
 * Features:
 * - In-memory caching with configurable TTL
 * - Graceful handling of missing/malformed extraJson
 * - Support for multiple API response formats
 *
 * @see SPEC-SHOPBY-003 Section: Product Loader (R-WDG-003)
 * @MX:ANCHOR: Product data loading - fetches product info from Shopby API
 * @MX:NOTE: Cache TTL defaults to 5 minutes (DEFAULT_CACHE_TTL_MS)
 * @MX:SPEC: SPEC-SHOPBY-003
 */

import type {
  ShopbyProductData,
  ShopbyProductOption,
  ShopbyWidgetError,
} from './types';
import { ShopbyWidgetErrorCode } from './types';

/** Default Shopby Shop API base URL */
const DEFAULT_API_BASE = 'https://api.shopby.co.kr/shop/v1' as const;

/** Default cache TTL in milliseconds (5 minutes) */
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

/** Cache entry with timestamp for TTL support */
interface CacheEntry {
  data: ShopbyProductData;
  timestamp: number;
  ttl: number;
}

/** In-memory product cache with TTL support */
const productCache = new Map<number, CacheEntry>();

/**
 * Widget Creator configuration stored in Shopby extraJson.
 * This is a subset of the full type to minimize bundle size.
 * @see packages/shared/src/integration/shopby/types.ts for full definition
 */
export interface WidgetCreatorExtraJson {
  version: string;
  huniProductId: number;
  huniCode: string | null;
  productType: string;
  pricingModel: string;
  sheetStandard?: string;
  orderMethod: 'upload' | 'editor';
  editorEnabled: boolean;
  widgetConfig: {
    options: Array<{
      key: string;
      type: 'select' | 'multiselect' | 'number' | 'text';
      required: boolean;
      shopbyMapping: string;
    }>;
    constraints?: unknown[];
    dependencies?: unknown[];
    pricing: {
      source: 'widget' | 'shopby';
      model: string;
      currency: string;
      vatIncluded: boolean;
    };
  };
  features: string[];
  mesMapping: {
    itemCode: string;
    hasOptions: boolean;
  };
}

/**
 * Raw product response from Shopby Shop API
 */
interface ShopbyProductApiResponse {
  mallProductNo?: number;
  productNo?: number;
  productName: string;
  price?: {
    salePrice: number;
    listPrice?: number;
  };
  salePrice?: number;
  productImageUrls?: string[];
  imageUrls?: Array<{ url: string }>;
  extraJson?: Record<string, unknown>;
  options?: ShopbyProductOption[];
  baseInfo?: {
    productName: string;
    salePrice: number;
    imageUrls?: string[];
  };
}

/**
 * Load a Shopby product by product number.
 * Results are cached in memory for subsequent calls.
 *
 * @param productNo - Shopby product number
 * @param apiBaseUrl - Optional API base URL override
 * @param cacheTtl - Optional cache TTL in milliseconds (default: 5 minutes)
 * @returns Product data for widget rendering
 * @MX:ANCHOR: Primary product loading function - called during SDK initialization
 */
export async function loadShopbyProduct(
  productNo: number,
  apiBaseUrl?: string,
  cacheTtl?: number,
): Promise<ShopbyProductData> {
  const ttl = cacheTtl ?? DEFAULT_CACHE_TTL_MS;

  // Check cache first (with TTL validation)
  const cached = productCache.get(productNo);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data;
  }

  // Remove stale cache entry
  if (cached) {
    productCache.delete(productNo);
  }

  const baseUrl = apiBaseUrl ?? DEFAULT_API_BASE;
  const url = `${baseUrl}/products/${productNo}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });
  } catch (cause) {
    const error: ShopbyWidgetError = {
      code: ShopbyWidgetErrorCode.NETWORK_ERROR,
      message: `Failed to fetch product ${productNo}`,
      cause,
    };
    throw error;
  }

  if (!response.ok) {
    if (response.status === 404) {
      const error: ShopbyWidgetError = {
        code: ShopbyWidgetErrorCode.PRODUCT_NOT_FOUND,
        message: `Product ${productNo} not found`,
      };
      throw error;
    }

    const error: ShopbyWidgetError = {
      code: ShopbyWidgetErrorCode.API_ERROR,
      message: `Shopby API error: ${response.status} ${response.statusText}`,
    };
    throw error;
  }

  let raw: ShopbyProductApiResponse;
  try {
    raw = (await response.json()) as ShopbyProductApiResponse;
  } catch (cause) {
    const error: ShopbyWidgetError = {
      code: ShopbyWidgetErrorCode.API_ERROR,
      message: `Failed to parse product ${productNo} response: invalid JSON`,
      cause,
    };
    throw error;
  }

  const product = normalizeProductData(productNo, raw);

  // Cache the result with timestamp
  productCache.set(productNo, {
    data: product,
    timestamp: Date.now(),
    ttl,
  });

  return product;
}

/**
 * Normalize raw API response into ShopbyProductData.
 */
function normalizeProductData(
  productNo: number,
  raw: ShopbyProductApiResponse,
): ShopbyProductData {
  // Handle nested baseInfo structure vs flat structure
  const productName =
    raw.baseInfo?.productName ?? raw.productName ?? `Product ${productNo}`;
  const salePrice =
    raw.baseInfo?.salePrice ?? raw.price?.salePrice ?? raw.salePrice ?? 0;

  // Normalize image URLs (various API response formats)
  let imageUrls: string[] = [];
  if (raw.baseInfo?.imageUrls) {
    imageUrls = raw.baseInfo.imageUrls;
  } else if (raw.productImageUrls) {
    imageUrls = raw.productImageUrls;
  } else if (raw.imageUrls) {
    imageUrls = raw.imageUrls.map((img) => img.url);
  }

  return {
    productNo: raw.mallProductNo ?? raw.productNo ?? productNo,
    productName,
    salePrice,
    imageUrls,
    extraJson: raw.extraJson ?? null,
    options: raw.options ?? [],
  };
}

/**
 * Extract WidgetCreatorExtraJson from a product's extraJson field.
 * Returns null if the product doesn't have widget config or format is invalid.
 */
export function extractWidgetConfig(
  extraJson: Record<string, unknown> | null,
): WidgetCreatorExtraJson | null {
  if (!extraJson) {
    return null;
  }

  // The widget config may be nested under a 'widgetCreator' key
  // or be the top-level extraJson itself
  const candidate =
    (extraJson.widgetCreator as Record<string, unknown> | undefined) ?? extraJson;

  const result = validateWidgetConfig(candidate);
  return result;
}

/**
 * Validate that an object conforms to WidgetCreatorExtraJson structure.
 * Returns the validated config or null if validation fails.
 */
export function validateWidgetConfig(
  config: unknown,
): WidgetCreatorExtraJson | null {
  if (config === null || typeof config !== 'object') {
    return null;
  }

  const obj = config as Record<string, unknown>;

  // Required fields check
  if (typeof obj.version !== 'string') return null;
  if (typeof obj.huniProductId !== 'number') return null;
  if (obj.huniCode !== null && typeof obj.huniCode !== 'string') return null;
  if (typeof obj.productType !== 'string') return null;
  if (typeof obj.pricingModel !== 'string') return null;
  if (obj.orderMethod !== 'upload' && obj.orderMethod !== 'editor') return null;
  if (typeof obj.editorEnabled !== 'boolean') return null;
  if (!obj.widgetConfig || typeof obj.widgetConfig !== 'object') return null;
  if (!Array.isArray(obj.features)) return null;
  if (!obj.mesMapping || typeof obj.mesMapping !== 'object') return null;

  return config as WidgetCreatorExtraJson;
}

/**
 * Clear the product cache entirely, or for a specific product.
 */
export function clearProductCache(productNo?: number): void {
  if (productNo !== undefined) {
    productCache.delete(productNo);
  } else {
    productCache.clear();
  }
}

/**
 * Get cached product data without making an API call.
 * Returns undefined if not cached or if cache entry has expired.
 */
export function getCachedProduct(
  productNo: number,
): ShopbyProductData | undefined {
  const entry = productCache.get(productNo);
  if (!entry) {
    return undefined;
  }

  // Check TTL
  if (Date.now() - entry.timestamp >= entry.ttl) {
    productCache.delete(productNo);
    return undefined;
  }

  return entry.data;
}

/**
 * Load product and extract widget config in one call.
 * Convenience function that combines loadShopbyProduct and extractWidgetConfig.
 *
 * @param productNo - Shopby product number
 * @param apiBaseUrl - Optional API base URL override
 * @param cacheTtl - Optional cache TTL in milliseconds
 * @returns Object containing product data and widget config (or null if invalid)
 */
export async function loadProductWithWidgetConfig(
  productNo: number,
  apiBaseUrl?: string,
  cacheTtl?: number,
): Promise<{
  product: ShopbyProductData;
  widgetConfig: WidgetCreatorExtraJson | null;
}> {
  const product = await loadShopbyProduct(productNo, apiBaseUrl, cacheTtl);
  const widgetConfig = extractWidgetConfig(product.extraJson);

  return { product, widgetConfig };
}

/**
 * Get cache statistics for monitoring.
 */
export function getCacheStats(): {
  size: number;
  entries: Array<{ productNo: number; age: number; ttl: number }>;
} {
  const now = Date.now();
  const entries = Array.from(productCache.entries()).map(([productNo, entry]) => ({
    productNo,
    age: now - entry.timestamp,
    ttl: entry.ttl,
  }));

  return {
    size: productCache.size,
    entries,
  };
}
