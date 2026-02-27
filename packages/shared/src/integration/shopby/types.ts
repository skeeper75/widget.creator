/**
 * Shopby Integration Types
 *
 * Types for Shopby e-commerce platform integration.
 * Reference: SPEC-SHOPBY-001, SPEC-SHOPBY-INTEGRATION-DESIGN
 *
 * @MX:NOTE: This file contains comprehensive Shopby API type definitions
 * covering Shop API, Admin API, and Server API integration.
 */

// =============================================================================
// SECTION 1: Core API Configuration
// =============================================================================

/**
 * Shopby API configuration
 */
export interface ShopbyApiConfig {
  /** Base URL for Shopby API */
  baseUrl: string;
  /** API key for authentication (optional) */
  apiKey?: string;
  /** Partner ID for multi-tenant scenarios */
  partnerId?: string;
  /** Mall ID for specific mall */
  mallId?: string;
}

/**
 * Shopby API endpoint categories
 */
export type ShopbyApiCategory = 'shop' | 'admin' | 'server' | 'internal';

/**
 * API configuration by category
 */
export interface ShopbyApiConfigMap {
  shop: ShopbyApiConfig;
  admin: ShopbyApiConfig;
  server?: ShopbyApiConfig;
  internal?: ShopbyApiConfig;
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

// =============================================================================
// SECTION 2: mallProduct Types (Shopby Product Data Model)
// =============================================================================

/**
 * Shopby sale status type
 */
export type ShopbySaleStatusType = 'ONSALE' | 'STOP' | 'EXHAUST';

/**
 * Shopby display type
 */
export type ShopbyDisplayType = 'DISPLAY' | 'HIDDEN';

/**
 * Price type for mallProduct
 */
export interface ShopbyPrice {
  /** Basic sale price (KRW) */
  salePrice: number;
  /** List price before discount (KRW) */
  listPrice?: number;
  /** Whether VAT is included */
  vatIncluded?: boolean;
}

/**
 * Stock information
 */
export interface ShopbyStock {
  /** Whether inventory is managed */
  inventoryManagement: boolean;
  /** Whether sold out is allowed */
  soldoutDisplay?: 'SHOW' | 'HIDE';
  /** Stock quantity (if inventory management is enabled) */
  stockQuantity?: number;
}

/**
 * Delivery information
 */
export interface ShopbyDelivery {
  /** Delivery template ID */
  deliveryTemplateNo: number;
  /** Delivery type */
  deliveryMethodType: 'DELIVERY' | 'VISIT_RECEIPT' | 'DIRECT_DELIVERY';
  /** Whether free delivery is applied */
  freeDeliveryCondition?: number;
}

/**
 * Full mallProduct structure for Shopby API
 * @MX:ANCHOR: Core data model for Shopby product integration
 * @MX:REASON: This is the primary interface for product sync with Shopby
 */
export interface ShopbyMallProduct {
  /** Product number (assigned by Shopby after creation) */
  mallProductNo?: number;
  /** Product name */
  productName: string;
  /** Product description/content (HTML supported) */
  content?: string;
  /** Mobile-only description */
  mobileContent?: string;
  /** Sale price information */
  price: ShopbyPrice;
  /** Sale status: ONSALE, STOP, EXHAUST */
  saleStatusType: ShopbySaleStatusType;
  /** Display status */
  displayType?: ShopbyDisplayType;
  /** Category number */
  categoryNo?: number;
  /** Stock information */
  stock?: ShopbyStock;
  /** Delivery information */
  delivery?: ShopbyDelivery;
  /** Product summary for list display */
  productNameSummary?: string;
  /** Thumbnail image URL */
  productImageUrls?: string[];
  /** Custom JSON data (used for widgetCreator config) */
  extraJson?: Record<string, unknown>;
  /** Created timestamp */
  createdAt?: string;
  /** Last updated timestamp */
  updatedAt?: string;
}

// =============================================================================
// SECTION 3: Option Types (COMBINATION, REQUIRED, STANDARD)
// =============================================================================

/**
 * Shopby option type classification
 */
export type ShopbyOptionKind = 'COMBINATION' | 'REQUIRED' | 'STANDARD';

/**
 * Option value definition
 */
export interface ShopbyOptionValue {
  /** Option value label */
  optionValue: string;
  /** Additional price for this option */
  addPrice?: number;
  /** Stock quantity for this option combination */
  stockQuantity?: number;
  /** Option value code (for internal reference) */
  optionValueCode?: string;
}

/**
 * COMBINATION option (used for size x paper x quantity matrix)
 */
export interface ShopbyCombinationOption {
  /** Option kind - always 'COMBINATION' */
  kind: 'COMBINATION';
  /** Option name (e.g., "규격", "용지", "수량") */
  optionName: string;
  /** Option values */
  optionValues: ShopbyOptionValue[];
  /** Whether this option is required */
  required?: boolean;
}

/**
 * REQUIRED option (single selection, mandatory)
 */
export interface ShopbyRequiredOption {
  /** Option kind - always 'REQUIRED' */
  kind: 'REQUIRED';
  /** Option name (e.g., "인쇄방식", "제본방식") */
  optionName: string;
  /** Available option values */
  optionValues: ShopbyOptionValue[];
}

/**
 * STANDARD option (optional add-ons)
 */
export interface ShopbyStandardOption {
  /** Option kind - always 'STANDARD' */
  kind: 'STANDARD';
  /** Option name (e.g., "후가공") */
  optionName: string;
  /** Available option values */
  optionValues: ShopbyOptionValue[];
}

/**
 * Union type for all Shopby option types
 */
export type ShopbyOption = ShopbyCombinationOption | ShopbyRequiredOption | ShopbyStandardOption;

/**
 * Complete option data for a product
 */
export interface ShopbyProductOptionData {
  /** COMBINATION options (up to 3 levels) */
  combinations?: ShopbyCombinationOption[];
  /** REQUIRED options */
  required?: ShopbyRequiredOption[];
  /** STANDARD options */
  standard?: ShopbyStandardOption[];
}

// =============================================================================
// SECTION 4: optionInputs Types (Custom Buyer Input Fields)
// =============================================================================

/**
 * Input type for optionInputs
 */
export type ShopbyInputType = 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'DATE' | 'EMAIL' | 'PHONE';

/**
 * Matching type for optionInputs
 */
export type ShopbyMatchingType = 'OPTION' | 'SENDER' | 'RECEIVER';

/**
 * optionInputs definition for custom buyer input
 */
export interface ShopbyOptionInputDefinition {
  /** Input label displayed to buyer */
  inputLabel: string;
  /** Input type */
  inputType: ShopbyInputType;
  /** Whether this input is required */
  required: boolean;
  /** How this input matches to order data */
  matchingType: ShopbyMatchingType;
  /** Maximum length for text inputs */
  maxLength?: number;
  /** Placeholder text */
  placeholderText?: string;
  /** Help text for guidance */
  helpText?: string;
}

/**
 * optionInputs actual data submitted with order
 */
export interface ShopbyOptionInputValue {
  /** Input label (must match definition) */
  inputLabel: string;
  /** Submitted value */
  inputValue: string;
}

// =============================================================================
// SECTION 5: extraJson Structure (Widget Creator Integration)
// =============================================================================

/**
 * Option mapping configuration for Shopby integration
 */
export interface WidgetOptionMapping {
  /** Option key (size, paper, printType, quantity, finishing) */
  key: string;
  /** Widget option type */
  type: 'select' | 'multiselect' | 'number' | 'text';
  /** Whether this option is required */
  required: boolean;
  /** Shopby option mapping (COMBINATION_1, COMBINATION_2, COMBINATION_3, REQUIRED, STANDARD) */
  shopbyMapping: string;
}

/**
 * Constraint definition for widget options
 */
export interface WidgetConstraintDefinition {
  /** Constraint type */
  type: 'filter' | 'show' | 'hide' | 'set_value' | 'range';
  /** Source option */
  source: string;
  /** Target option */
  target: string;
  /** Description */
  description?: string;
}

/**
 * Dependency definition for widget options
 */
export interface WidgetDependencyDefinition {
  /** Parent option */
  parent: string;
  /** Child option */
  child: string;
  /** Dependency type */
  type: 'visibility' | 'filter';
  /** Description */
  description?: string;
}

/**
 * Pricing configuration for widget
 */
export interface WidgetPricingConfig {
  /** Pricing source: 'widget' or 'shopby' */
  source: 'widget' | 'shopby';
  /** Pricing model identifier */
  model: string;
  /** Currency code */
  currency: string;
  /** Whether VAT is included */
  vatIncluded: boolean;
}

/**
 * Widget configuration stored in extraJson
 */
export interface WidgetConfig {
  /** Option definitions with Shopby mapping */
  options: WidgetOptionMapping[];
  /** Option constraints */
  constraints?: WidgetConstraintDefinition[];
  /** Option dependencies */
  dependencies?: WidgetDependencyDefinition[];
  /** Pricing configuration */
  pricing: WidgetPricingConfig;
}

/**
 * MES mapping information
 */
export interface MesMappingInfo {
  /** MES item code */
  itemCode: string;
  /** Whether product has options */
  hasOptions: boolean;
}

/**
 * Widget Creator extraJson structure
 * @MX:ANCHOR: Core integration data structure stored in Shopby mallProduct
 * @MX:REASON: This enables bidirectional sync between Widget Creator and Shopby
 */
export interface WidgetCreatorExtraJson {
  /** Schema version */
  version: string;
  /** Huni DB product ID */
  huniProductId: number;
  /** Huni product code (e.g., "001-0001") */
  huniCode: string;
  /** Product type (digital-print, sticker, booklet, etc.) */
  productType: string;
  /** Pricing model (digital-print-calc, sticker-direct, etc.) */
  pricingModel: string;
  /** Sheet standard (4x6, 4x8, etc.) */
  sheetStandard?: string;
  /** Order method (upload, editor) */
  orderMethod: 'upload' | 'editor';
  /** Whether online editor is enabled */
  editorEnabled: boolean;
  /** Widget configuration */
  widgetConfig: WidgetConfig;
  /** Enabled features */
  features: string[];
  /** MES mapping information */
  mesMapping: MesMappingInfo;
}

// =============================================================================
// SECTION 6: Order Types
// =============================================================================

/**
 * Shopby order status types
 */
export type ShopbyOrderStatusType =
  | 'DEPOSIT_WAIT'
  | 'PAY_DONE'
  | 'PRODUCT_PREPARE'
  | 'DELIVERY_ING'
  | 'DELIVERY_DONE'
  | 'BUY_CONFIRM'
  | 'CANCEL_DONE'
  | 'RETURN_DONE'
  | 'EXCHANGE_DONE';

/**
 * Order item information
 */
export interface ShopbyOrderItem {
  /** Product number */
  productNo: number;
  /** Product name */
  productName: string;
  /** Option number (for COMBINATION options) */
  optionNo?: number;
  /** Selected option values */
  optionValues?: string[];
  /** Order quantity */
  orderCnt: number;
  /** Unit price */
  unitPrice: number;
  /** Total price for this item */
  totalPrice: number;
  /** optionInputs submitted by buyer */
  optionInputs?: ShopbyOptionInputValue[];
}

/**
 * Order sheet for order creation
 */
export interface ShopbyOrderSheet {
  /** Order sheet number (assigned by Shopby) */
  orderSheetNo?: string;
  /** Order items */
  items: ShopbyOrderItem[];
  /** Orderer information */
  orderer?: {
    name: string;
    phone1: string;
    email?: string;
  };
  /** Shipping information */
  shipping?: {
    name: string;
    phone1: string;
    zipCode: string;
    address1: string;
    address2?: string;
    message?: string;
  };
  /** Created timestamp */
  createdAt?: string;
}

/**
 * Full order information from Shopby
 */
export interface ShopbyOrderDetail {
  /** Order number */
  orderNo: string;
  /** Order status */
  orderStatus: ShopbyOrderStatusType;
  /** Order items */
  items: ShopbyOrderItem[];
  /** Total payment amount */
  totalPaymentAmount: number;
  /** Orderer information */
  orderer: {
    name: string;
    phone1: string;
    email: string;
  };
  /** Shipping information */
  shipping?: {
    name: string;
    phone1: string;
    zipCode: string;
    address1: string;
    address2?: string;
    deliveryCompany?: string;
    trackingNo?: string;
  };
  /** Payment information */
  payment?: {
    paymentMethod: string;
    paymentAmount: number;
    paidAt?: string;
  };
  /** Order timestamp */
  orderTimestamp: string;
  /** Last updated timestamp */
  updatedAt?: string;
}

// =============================================================================
// SECTION 7: Authentication Types
// =============================================================================

/**
 * OAuth 2.0 token response
 */
export interface ShopbyOAuthToken {
  /** Access token */
  accessToken: string;
  /** Refresh token */
  refreshToken: string;
  /** Token type (usually "Bearer") */
  tokenType: string;
  /** Access token expiry in seconds (default: 1800 = 30 minutes) */
  expiresIn: number;
  /** Refresh token expiry in seconds (1 day or 90 days based on keepLogin) */
  refreshTokenExpiresIn: number;
  /** Member ID */
  memberId?: string;
  /** Member type */
  memberType?: string;
}

/**
 * Admin token for Admin API access
 */
export interface ShopbyAdminToken {
  /** Access token */
  accessToken: string;
  /** Token type */
  tokenType: string;
  /** Expiry in seconds */
  expiresIn: number;
  /** Partner ID */
  partnerId?: string;
}

/**
 * Social login provider types
 */
export type ShopbySocialProvider = 'naver' | 'kakao' | 'google' | 'apple';

/**
 * Social login request
 */
export interface ShopbySocialLoginRequest {
  /** Social provider */
  provider: ShopbySocialProvider;
  /** OAuth authorization code */
  code: string;
  /** State parameter for CSRF protection */
  state?: string;
  /** Whether to keep login (affects refresh token expiry) */
  keepLogin?: boolean;
}

/**
 * Token refresh request
 */
export interface ShopbyTokenRefreshRequest {
  /** Refresh token */
  refreshToken: string;
}

// =============================================================================
// SECTION 8: API Response Types
// =============================================================================

/**
 * Generic API response wrapper
 */
export interface ShopbyApiResponse<T> {
  /** Response data */
  data: T;
  /** Response code */
  code?: string;
  /** Response message */
  message?: string;
  /** Pagination info (for list responses) */
  pagination?: {
    page: number;
    pageSize: number;
    total: number;
    hasNext: boolean;
  };
}

/**
 * API error response
 */
export interface ShopbyApiError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Field-level errors */
  errors?: Array<{
    field: string;
    message: string;
  }>;
  /** HTTP status code */
  status?: number;
}

// =============================================================================
// SECTION 9: File Upload Types
// =============================================================================

/**
 * Temporary image upload response
 */
export interface ShopbyTemporaryImage {
  /** Temporary image URL */
  url: string;
  /** Image file name */
  fileName: string;
  /** Expiry timestamp */
  expiresAt?: string;
}

// =============================================================================
// SECTION 10: Print Specification Types (for optionInputs parsing)
// =============================================================================

/**
 * Size specification from widget
 */
export interface PrintSizeSpec {
  code: string;
  name: string;
  cutWidth: number;
  cutHeight: number;
}

/**
 * Paper specification from widget
 */
export interface PrintPaperSpec {
  code: string;
  name: string;
}

/**
 * Print mode specification from widget
 */
export interface PrintModeSpec {
  code: string;
  name: string;
  priceCode: number;
}

/**
 * Post-process specification from widget
 */
export interface PostProcessSpec {
  code: string;
  name: string;
}

/**
 * Widget price breakdown
 */
export interface WidgetPriceBreakdown {
  printCost: number;
  paperCost: number;
  finishingCost: number;
  bindingCost?: number;
  totalBeforeVat: number;
  vat: number;
  total: number;
}

/**
 * Complete print specification parsed from optionInputs
 */
export interface PrintSpecification {
  huniCode: string;
  size: PrintSizeSpec;
  paper: PrintPaperSpec;
  printMode: PrintModeSpec;
  quantity: number;
  postProcess?: PostProcessSpec[];
  binding?: {
    code: string;
    name: string;
    pageCount: number;
  };
  widgetPrice: WidgetPriceBreakdown;
}

// =============================================================================
// SECTION 11: Admin Client & Registration Types (SPEC-SHOPBY-002)
// =============================================================================

/**
 * Shopby category from Admin API
 */
export interface ShopbyCategory {
  /** Category number (assigned by Shopby) */
  categoryNo: number;
  /** Category display name */
  categoryName: string;
  /** Parent category number (undefined for root) */
  parentCategoryNo?: number;
  /** Category depth (0 = root, 1 = 1depth, 2 = 2depth) */
  depth: number;
  /** Sort order within parent */
  sortOrder?: number;
  /** Whether category is visible */
  displayable?: boolean;
}

/**
 * Product list query parameters for Admin API
 */
export interface ShopbyProductListQuery {
  page?: number;
  pageSize?: number;
  categoryNo?: number;
  saleStatusType?: ShopbySaleStatusType;
  keyword?: string;
}

/**
 * Single option combination entry with per-combination pricing
 */
export interface OptionCombinationEntry {
  /** Display values for each dimension [size, paper, quantity] */
  values: string[];
  /** Internal codes for each dimension */
  codes: string[];
  /** Additional price over base salePrice */
  addPrice: number;
}

/**
 * Complete option matrix for product registration
 * @MX:NOTE: Combines axis definitions with flat combination entries
 */
export interface OptionMatrix {
  /** COMBINATION option axis definitions */
  combinations: ShopbyCombinationOption[];
  /** Flat combination entries with per-entry addPrice */
  combinationEntries: OptionCombinationEntry[];
  /** REQUIRED options (e.g., print mode) */
  required: ShopbyRequiredOption[];
  /** STANDARD options (e.g., post-processing) */
  standard: ShopbyStandardOption[];
  /** Base sale price (minimum across all combinations) */
  basePrice: number;
  /** Total possible combination count before limiting */
  totalCombinationCount: number;
  /** Number of combinations registered */
  registeredCombinationCount: number;
  /** Whether only a representative subset was selected */
  isRepresentativeSubset: boolean;
}

/**
 * Price validation result between widget and Shopby prices
 */
export interface PriceValidationResult {
  /** Whether the price difference is within tolerance */
  isValid: boolean;
  /** Widget-calculated price */
  widgetPrice: number;
  /** Shopby option price (salePrice + addPrice) */
  shopbyPrice: number;
  /** Absolute price difference */
  difference: number;
  /** Percentage difference */
  differencePercent: number;
  /** Tolerance threshold percentage */
  tolerancePercent: number;
}

/**
 * Product registration request from Widget Creator
 */
export interface ProductRegistrationRequest {
  /** Huni DB product ID */
  huniProductId: number;
  /** Huni product code (e.g., "001-0001") */
  huniCode: string;
  /** Product display name */
  productName: string;
  /** Product description HTML */
  description?: string;
  /** Widget Creator category ID */
  categoryId: number;
  /** Product type (digital-print, sticker, etc.) */
  productType: string;
  /** Pricing model identifier */
  pricingModel: string;
  /** Sheet standard (4x6, 4x8, etc.) */
  sheetStandard?: string;
  /** Order method */
  orderMethod: 'upload' | 'editor';
  /** Whether online editor is enabled */
  editorEnabled: boolean;
  /** Whether product is active */
  isActive: boolean;
  /** Delivery template number */
  deliveryTemplateNo?: number;
  /** Available sizes */
  sizes: Array<{ code: string; displayName: string }>;
  /** Available papers */
  papers: Array<{ code: string; name: string; weight?: number }>;
  /** Available quantity tiers */
  quantities: Array<{ quantity: number; label: string }>;
  /** Available print modes */
  printModes?: Array<{ code: string; name: string }>;
  /** Available post-processes */
  postProcesses?: Array<{ code: string; name: string }>;
  /** Price lookup table: [sizeCode, paperCode, quantity] -> sellingPrice */
  prices: Array<{
    sizeCode: string;
    paperCode: string;
    quantity: number;
    sellingPrice: number;
  }>;
  /** MES item code for production mapping */
  mesItemCode: string;
}

/**
 * Result of a single product registration
 */
export interface ProductRegistrationResult {
  /** Huni DB product ID */
  huniProductId: number;
  /** Huni product code */
  huniCode: string;
  /** Shopby product number (if successful) */
  shopbyProductNo?: number;
  /** Whether registration succeeded */
  success: boolean;
  /** Option counts registered */
  optionCounts?: {
    combinations: number;
    required: number;
    standard: number;
  };
  /** Error message (if failed) */
  error?: string;
}

/**
 * Result of batch product registration
 */
export interface BatchRegistrationResult {
  /** Total products attempted */
  total: number;
  /** Successfully registered count */
  succeeded: number;
  /** Failed registration count */
  failed: number;
  /** Individual results */
  results: ProductRegistrationResult[];
  /** Batch start timestamp */
  startedAt: string;
  /** Batch completion timestamp */
  completedAt: string;
}
