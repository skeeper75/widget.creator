/**
 * Shopby Widget SDK Types
 *
 * Type definitions and runtime validation for Shopby e-commerce integration.
 * Uses lightweight validation (no Zod) to minimize bundle size.
 *
 * @see SPEC-SHOPBY-003 Section: Widget SDK & Frontend Embedding
 * @MX:NOTE: Runtime validation avoids Zod for bundle size optimization (R-WDG-006)
 * @MX:SPEC: SPEC-SHOPBY-003
 */

// =============================================================================
// SECTION 1: Widget Lifecycle
// =============================================================================

/**
 * Widget lifecycle state machine
 */
export const WidgetLifecycleState = {
  IDLE: 'IDLE',
  LOADING: 'LOADING',
  READY: 'READY',
  ERROR: 'ERROR',
  DESTROYED: 'DESTROYED',
} as const;

export type WidgetLifecycleState =
  (typeof WidgetLifecycleState)[keyof typeof WidgetLifecycleState];

// =============================================================================
// SECTION 2: Init Configuration
// =============================================================================

/**
 * Theme configuration for the widget
 */
export interface ShopbyWidgetTheme {
  primaryColor?: string;
  fontFamily?: string;
  borderRadius?: string;
}

/**
 * Callback functions for widget events
 */
export interface ShopbyWidgetCallbacks {
  onAddToCart?: (payload: WidgetToShopbyPayload) => void;
  onBuyNow?: (payload: WidgetToShopbyPayload) => void;
  onPriceChange?: (price: PriceSyncResult) => void;
  onError?: (error: ShopbyWidgetError) => void;
}

/**
 * Widget initialization configuration
 */
export interface ShopbyWidgetInitConfig {
  /** CSS selector or DOM element to mount the widget */
  container: string | HTMLElement;
  /** Shopby product number to display */
  shopbyProductNo: number;
  /** Optional access token for authenticated features */
  shopbyAccessToken?: string;
  /** Theme overrides */
  theme?: ShopbyWidgetTheme;
  /** Event callbacks */
  callbacks?: ShopbyWidgetCallbacks;
  /** UI locale (default: 'ko') */
  locale?: string;
  /** Shopby Shop API base URL override */
  apiBaseUrl?: string;
}

// =============================================================================
// SECTION 3: Widget-to-Shopby Payload
// =============================================================================

/**
 * Option inputs sent with cart/order requests
 */
export interface WidgetOptionInputs {
  /** URL of uploaded design file */
  designFileUrl: string;
  /** Print specification JSON */
  printSpec: string;
  /** Special request from customer */
  specialRequest?: string;
  /** Whether proof approval is required */
  proofRequired?: boolean;
}

/**
 * Price breakdown from widget calculation
 */
export interface WidgetPricePayload {
  /** Base price before options */
  basePrice: number;
  /** Option-related price additions */
  optionPrice: number;
  /** Post-processing price additions */
  postProcessPrice: number;
  /** Delivery price */
  deliveryPrice: number;
  /** Total price including all components */
  totalPrice: number;
}

/**
 * Payload sent from widget to Shopby for cart/order operations
 */
export interface WidgetToShopbyPayload {
  /** Shopby product number */
  productNo: number;
  /** Selected option number (from combination matrix) */
  optionNo: number;
  /** Order quantity */
  orderCnt: number;
  /** Custom option inputs (design file, print spec, etc.) */
  optionInputs: WidgetOptionInputs;
  /** Calculated price breakdown */
  widgetPrice: WidgetPricePayload;
}

// =============================================================================
// SECTION 4: Authentication
// =============================================================================

/**
 * Shopby authentication state
 */
export interface ShopbyAuthState {
  /** Current access token (null for guest) */
  accessToken: string | null;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Member grade from Shopby (if authenticated) */
  memberGrade?: string;
  /** Token expiry timestamp in ms */
  tokenExpiry?: number;
}

// =============================================================================
// SECTION 5: Price Synchronization
// =============================================================================

/**
 * Result of price comparison between widget and Shopby
 */
export interface PriceSyncResult {
  /** Widget-calculated price */
  widgetPrice: number;
  /** Shopby option price */
  shopbyPrice: number;
  /** Absolute price difference */
  discrepancy: number;
  /** Whether discrepancy is within acceptable tolerance */
  isWithinTolerance: boolean;
  /** Tolerance threshold (0-1, e.g., 0.1 = 10%) */
  tolerance: number;
}

// =============================================================================
// SECTION 6: Cart & Order Requests
// =============================================================================

/**
 * Cart item for Shopby Add-to-Cart API
 */
export interface ShopbyCartItem {
  /** Product number */
  productNo: number;
  /** Option number (from combination) */
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
 * Cart request sent to Shopby Shop API
 */
export interface ShopbyCartRequest {
  /** Cart items to add */
  items: ShopbyCartItem[];
}

/**
 * Cart operation result
 */
export interface CartResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Cart item ID (if successful) */
  cartNo?: number;
  /** Error message (if failed) */
  error?: string;
}

/**
 * Order sheet request for Shopby buy-now flow
 */
export interface ShopbyOrderSheetRequest {
  /** Products to include in order sheet */
  products: Array<{
    productNo: number;
    optionNo: number;
    orderCnt: number;
    optionInputs?: Array<{
      inputLabel: string;
      inputValue: string;
    }>;
  }>;
}

/**
 * Order sheet creation result
 */
export interface OrderSheetResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** Order sheet number for redirect (if successful) */
  orderSheetNo?: string;
  /** Redirect URL for checkout page */
  redirectUrl?: string;
  /** Error message (if failed) */
  error?: string;
}

// =============================================================================
// SECTION 7: Error Types
// =============================================================================

/**
 * Widget error codes
 */
export const ShopbyWidgetErrorCode = {
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  PRODUCT_NOT_FOUND: 'PRODUCT_NOT_FOUND',
  INVALID_CONFIG: 'INVALID_CONFIG',
  NETWORK_ERROR: 'NETWORK_ERROR',
  API_ERROR: 'API_ERROR',
  PRICE_MISMATCH: 'PRICE_MISMATCH',
  CONTAINER_NOT_FOUND: 'CONTAINER_NOT_FOUND',
  ALREADY_INITIALIZED: 'ALREADY_INITIALIZED',
} as const;

export type ShopbyWidgetErrorCode =
  (typeof ShopbyWidgetErrorCode)[keyof typeof ShopbyWidgetErrorCode];

/**
 * Structured error for widget operations
 */
export interface ShopbyWidgetError {
  /** Error code for programmatic handling */
  code: ShopbyWidgetErrorCode;
  /** Human-readable error message */
  message: string;
  /** Original error (if wrapping) */
  cause?: unknown;
}

// =============================================================================
// SECTION 8: Event Types
// =============================================================================

/**
 * Widget event type names
 */
export type WidgetEventType =
  | 'addToCart'
  | 'buyNow'
  | 'priceChange'
  | 'error'
  | 'ready'
  | 'stateChange';

/**
 * Event payload map (type-safe event dispatch)
 */
export interface WidgetEventMap {
  addToCart: WidgetToShopbyPayload;
  buyNow: WidgetToShopbyPayload;
  priceChange: PriceSyncResult;
  error: ShopbyWidgetError;
  ready: { state: WidgetLifecycleState };
  stateChange: { from: WidgetLifecycleState; to: WidgetLifecycleState };
}

// =============================================================================
// SECTION 9: Product Data (from Shopby Shop API)
// =============================================================================

/**
 * Simplified product data loaded from Shopby for widget rendering
 */
export interface ShopbyProductData {
  /** Product number */
  productNo: number;
  /** Product name */
  productName: string;
  /** Sale price */
  salePrice: number;
  /** Product images */
  imageUrls: string[];
  /** Widget Creator extra JSON (embedded config) */
  extraJson: Record<string, unknown> | null;
  /** Product options */
  options: ShopbyProductOption[];
}

/**
 * Product option from Shopby API response
 */
export interface ShopbyProductOption {
  /** Option number */
  optionNo: number;
  /** Option name */
  optionName: string;
  /** Option value */
  optionValue: string;
  /** Additional price */
  addPrice: number;
  /** Stock quantity */
  stockQuantity?: number;
}

// =============================================================================
// SECTION 10: Runtime Validation
// =============================================================================

/**
 * Validation error detail
 */
export interface ValidationError {
  /** Field path (e.g., "container", "shopbyProductNo") */
  field: string;
  /** Error message */
  message: string;
}

/**
 * Validation result
 */
export interface ValidationResult<T> {
  /** Whether validation passed */
  success: boolean;
  /** Validated data (only when success = true) */
  data?: T;
  /** Validation errors (only when success = false) */
  errors?: ValidationError[];
}

/**
 * Validate ShopbyWidgetInitConfig at runtime.
 * Lightweight alternative to Zod for bundle size optimization.
 */
export function validateInitConfig(
  input: unknown,
): ValidationResult<ShopbyWidgetInitConfig> {
  const errors: ValidationError[] = [];

  if (input === null || typeof input !== 'object') {
    return {
      success: false,
      errors: [{ field: 'config', message: 'Config must be a non-null object' }],
    };
  }

  const config = input as Record<string, unknown>;

  // container: required, string or HTMLElement
  if (config.container === undefined || config.container === null) {
    errors.push({ field: 'container', message: 'container is required' });
  } else if (
    typeof config.container !== 'string' &&
    !(typeof HTMLElement !== 'undefined' && config.container instanceof HTMLElement)
  ) {
    errors.push({
      field: 'container',
      message: 'container must be a string selector or HTMLElement',
    });
  }

  // shopbyProductNo: required, positive integer
  if (config.shopbyProductNo === undefined || config.shopbyProductNo === null) {
    errors.push({
      field: 'shopbyProductNo',
      message: 'shopbyProductNo is required',
    });
  } else if (
    typeof config.shopbyProductNo !== 'number' ||
    !Number.isInteger(config.shopbyProductNo) ||
    config.shopbyProductNo <= 0
  ) {
    errors.push({
      field: 'shopbyProductNo',
      message: 'shopbyProductNo must be a positive integer',
    });
  }

  // shopbyAccessToken: optional string
  if (
    config.shopbyAccessToken !== undefined &&
    config.shopbyAccessToken !== null &&
    typeof config.shopbyAccessToken !== 'string'
  ) {
    errors.push({
      field: 'shopbyAccessToken',
      message: 'shopbyAccessToken must be a string',
    });
  }

  // theme: optional object
  if (config.theme !== undefined && config.theme !== null) {
    if (typeof config.theme !== 'object') {
      errors.push({ field: 'theme', message: 'theme must be an object' });
    } else {
      const theme = config.theme as Record<string, unknown>;
      if (theme.primaryColor !== undefined && typeof theme.primaryColor !== 'string') {
        errors.push({
          field: 'theme.primaryColor',
          message: 'primaryColor must be a string',
        });
      }
      if (theme.fontFamily !== undefined && typeof theme.fontFamily !== 'string') {
        errors.push({
          field: 'theme.fontFamily',
          message: 'fontFamily must be a string',
        });
      }
      if (theme.borderRadius !== undefined && typeof theme.borderRadius !== 'string') {
        errors.push({
          field: 'theme.borderRadius',
          message: 'borderRadius must be a string',
        });
      }
    }
  }

  // locale: optional string
  if (
    config.locale !== undefined &&
    config.locale !== null &&
    typeof config.locale !== 'string'
  ) {
    errors.push({ field: 'locale', message: 'locale must be a string' });
  }

  // apiBaseUrl: optional string
  if (
    config.apiBaseUrl !== undefined &&
    config.apiBaseUrl !== null &&
    typeof config.apiBaseUrl !== 'string'
  ) {
    errors.push({ field: 'apiBaseUrl', message: 'apiBaseUrl must be a string' });
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: config as unknown as ShopbyWidgetInitConfig,
  };
}

/**
 * Validate WidgetToShopbyPayload at runtime.
 */
export function validatePayload(
  input: unknown,
): ValidationResult<WidgetToShopbyPayload> {
  const errors: ValidationError[] = [];

  if (input === null || typeof input !== 'object') {
    return {
      success: false,
      errors: [{ field: 'payload', message: 'Payload must be a non-null object' }],
    };
  }

  const payload = input as Record<string, unknown>;

  if (typeof payload.productNo !== 'number' || payload.productNo <= 0) {
    errors.push({
      field: 'productNo',
      message: 'productNo must be a positive number',
    });
  }

  if (typeof payload.optionNo !== 'number' || payload.optionNo < 0) {
    errors.push({
      field: 'optionNo',
      message: 'optionNo must be a non-negative number',
    });
  }

  if (
    typeof payload.orderCnt !== 'number' ||
    !Number.isInteger(payload.orderCnt) ||
    payload.orderCnt <= 0
  ) {
    errors.push({
      field: 'orderCnt',
      message: 'orderCnt must be a positive integer',
    });
  }

  // optionInputs validation
  if (payload.optionInputs === undefined || payload.optionInputs === null) {
    errors.push({
      field: 'optionInputs',
      message: 'optionInputs is required',
    });
  } else if (typeof payload.optionInputs === 'object') {
    const inputs = payload.optionInputs as Record<string, unknown>;
    if (typeof inputs.designFileUrl !== 'string') {
      errors.push({
        field: 'optionInputs.designFileUrl',
        message: 'designFileUrl must be a string',
      });
    }
    if (typeof inputs.printSpec !== 'string') {
      errors.push({
        field: 'optionInputs.printSpec',
        message: 'printSpec must be a string',
      });
    }
  }

  // widgetPrice validation
  if (payload.widgetPrice === undefined || payload.widgetPrice === null) {
    errors.push({
      field: 'widgetPrice',
      message: 'widgetPrice is required',
    });
  } else if (typeof payload.widgetPrice === 'object') {
    const price = payload.widgetPrice as Record<string, unknown>;
    const priceFields = [
      'basePrice',
      'optionPrice',
      'postProcessPrice',
      'deliveryPrice',
      'totalPrice',
    ] as const;
    for (const field of priceFields) {
      if (typeof price[field] !== 'number') {
        errors.push({
          field: `widgetPrice.${field}`,
          message: `${field} must be a number`,
        });
      }
    }
  }

  if (errors.length > 0) {
    return { success: false, errors };
  }

  return {
    success: true,
    data: payload as unknown as WidgetToShopbyPayload,
  };
}
