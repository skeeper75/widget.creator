/**
 * Shopby Data Mapper
 *
 * Transforms between Widget Builder domain types and Shopby API formats.
 * Reference: SPEC-SHOPBY-001, SPEC-SHOPBY-INTEGRATION-DESIGN
 *
 * @MX:NOTE: This module contains bidirectional data transformation functions
 * for Huni DB <-> Shopby API data mapping.
 */

import type {
  ShopbyProduct,
  ShopbyOrder,
  ProductForShopbySync,
  ShopbyCategoryMapping,
  ShopbyMallProduct,
  ShopbyPrice,
  ShopbySaleStatusType,
  ShopbyCombinationOption,
  ShopbyRequiredOption,
  ShopbyStandardOption,
  ShopbyOptionValue,
  ShopbyOptionInputDefinition,
  ShopbyOptionInputValue,
  WidgetCreatorExtraJson,
  WidgetConfig,
  WidgetOptionMapping,
  WidgetPricingConfig,
  MesMappingInfo,
  PrintSpecification,
  PrintSizeSpec,
  PrintPaperSpec,
  PrintModeSpec,
  PostProcessSpec,
  WidgetPriceBreakdown,
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

// =============================================================================
// SECTION 2: Full mallProduct Transformations (NEW)
// =============================================================================

/**
 * Huni product data for full mallProduct transformation
 */
export interface HuniProductData {
  /** Product ID from Huni DB */
  id: number;
  /** Product code (e.g., "001-0001") */
  huniCode: string;
  /** Product name */
  name: string;
  /** Product description (HTML) */
  description?: string;
  /** Category ID */
  categoryId: number;
  /** Product type (digital-print, sticker, booklet, etc.) */
  productType: string;
  /** Pricing model identifier */
  pricingModel: string;
  /** Sheet standard (4x6, 4x8, etc.) */
  sheetStandard?: string;
  /** Order method (upload, editor) */
  orderMethod: 'upload' | 'editor';
  /** Whether online editor is enabled */
  editorEnabled: boolean;
  /** Whether product is active */
  isActive: boolean;
  /** Minimum selling price (for salePrice) */
  minSellingPrice: number;
  /** Optional delivery template ID */
  deliveryTemplateNo?: number;
}

/**
 * Widget configuration for extraJson
 */
export interface WidgetConfigData {
  /** Option mappings */
  options: WidgetOptionMapping[];
  /** Constraint definitions */
  constraints?: Array<{
    type: string;
    source: string;
    target: string;
    description?: string;
  }>;
  /** Dependency definitions */
  dependencies?: Array<{
    parent: string;
    child: string;
    type: string;
    description?: string;
  }>;
  /** Pricing configuration */
  pricing: WidgetPricingConfig;
  /** Enabled features */
  features: string[];
}

/**
 * Transform Huni product to full Shopby mallProduct
 *
 * @MX:ANCHOR: Primary function for Huni -> Shopby product sync
 * @MX:REASON: Creates complete mallProduct with extraJson for widget integration
 *
 * @param product - Huni product data
 * @param categoryNo - Shopby category number (from mapping)
 * @param widgetConfig - Widget configuration data
 * @param mesMapping - MES mapping information
 * @returns Complete ShopbyMallProduct for API creation
 */
export function toMallProduct(
  product: HuniProductData,
  categoryNo: number,
  widgetConfig: WidgetConfigData,
  mesMapping: MesMappingInfo
): ShopbyMallProduct {
  // Build extraJson with widgetCreator configuration
  const extraJson: WidgetCreatorExtraJson = {
    version: '1.0.0',
    huniProductId: product.id,
    huniCode: product.huniCode,
    productType: product.productType,
    pricingModel: product.pricingModel,
    sheetStandard: product.sheetStandard,
    orderMethod: product.orderMethod,
    editorEnabled: product.editorEnabled,
    widgetConfig: {
      options: widgetConfig.options,
      constraints: widgetConfig.constraints?.map(c => ({
        type: c.type as 'filter' | 'show' | 'hide' | 'set_value' | 'range',
        source: c.source,
        target: c.target,
        description: c.description,
      })),
      dependencies: widgetConfig.dependencies?.map(d => ({
        parent: d.parent,
        child: d.child,
        type: d.type as 'visibility' | 'filter',
        description: d.description,
      })),
      pricing: widgetConfig.pricing,
    },
    features: widgetConfig.features,
    mesMapping,
  };

  // Build price object
  const price: ShopbyPrice = {
    salePrice: product.minSellingPrice,
    vatIncluded: true,
  };

  // Build mallProduct
  const mallProduct: ShopbyMallProduct = {
    productName: product.name,
    content: product.description,
    price,
    saleStatusType: product.isActive ? 'ONSALE' : 'STOP',
    categoryNo,
    extraJson: { widgetCreator: extraJson },
  };

  // Add delivery if template provided
  if (product.deliveryTemplateNo) {
    mallProduct.delivery = {
      deliveryTemplateNo: product.deliveryTemplateNo,
      deliveryMethodType: 'DELIVERY',
    };
  }

  return mallProduct;
}

/**
 * Extract key data from Shopby mallProduct for sync back to Huni
 *
 * @param mallProduct - Shopby mallProduct data
 * @returns Partial Huni product data for update
 */
export function fromMallProduct(
  mallProduct: ShopbyMallProduct
): {
  shopbyId: number;
  name: string;
  isActive: boolean;
  extraJson: WidgetCreatorExtraJson | null;
} {
  // Parse extraJson if present
  let extraJson: WidgetCreatorExtraJson | null = null;
  if (mallProduct.extraJson && 'widgetCreator' in mallProduct.extraJson) {
    extraJson = mallProduct.extraJson.widgetCreator as WidgetCreatorExtraJson;
  }

  return {
    shopbyId: mallProduct.mallProductNo ?? 0,
    name: mallProduct.productName,
    isActive: mallProduct.saleStatusType === 'ONSALE',
    extraJson,
  };
}

// =============================================================================
// SECTION 3: Option Data Builders (NEW)
// =============================================================================

/**
 * Size data for option building
 */
export interface SizeOptionData {
  code: string;
  displayName: string;
  addPrice?: number;
}

/**
 * Paper/material data for option building
 */
export interface PaperOptionData {
  code: string;
  name: string;
  weight?: number;
  addPrice?: number;
}

/**
 * Print mode data for option building
 */
export interface PrintModeOptionData {
  code: string;
  name: string;
  addPrice?: number;
}

/**
 * Quantity tier data for option building
 */
export interface QuantityTierData {
  quantity: number;
  label: string;
  addPrice: number;
}

/**
 * Post-process data for option building
 */
export interface PostProcessOptionData {
  code: string;
  name: string;
  addPrice?: number;
}

/**
 * Build COMBINATION options from product data
 * Creates size x paper x quantity option matrix
 *
 * @param sizes - Available size options
 * @param papers - Available paper/material options
 * @param quantities - Available quantity tiers
 * @returns Array of COMBINATION options (up to 3)
 */
export function buildCombinationOptions(
  sizes: SizeOptionData[],
  papers: PaperOptionData[],
  quantities: QuantityTierData[]
): ShopbyCombinationOption[] {
  const combinations: ShopbyCombinationOption[] = [];

  // Option 1: Size (규격)
  if (sizes.length > 0) {
    combinations.push({
      kind: 'COMBINATION',
      optionName: '규격',
      optionValues: sizes.map(s => ({
        optionValue: s.displayName,
        addPrice: s.addPrice ?? 0,
        optionValueCode: s.code,
      })),
      required: true,
    });
  }

  // Option 2: Paper/Material (용지/재질)
  if (papers.length > 0) {
    combinations.push({
      kind: 'COMBINATION',
      optionName: '용지',
      optionValues: papers.map(p => ({
        optionValue: p.weight ? `${p.name} ${p.weight}g` : p.name,
        addPrice: p.addPrice ?? 0,
        optionValueCode: p.code,
      })),
      required: true,
    });
  }

  // Option 3: Quantity (수량)
  if (quantities.length > 0) {
    combinations.push({
      kind: 'COMBINATION',
      optionName: '수량',
      optionValues: quantities.map(q => ({
        optionValue: q.label,
        addPrice: q.addPrice,
        optionValueCode: `QTY_${q.quantity}`,
      })),
      required: true,
    });
  }

  return combinations;
}

/**
 * Build REQUIRED option from print mode data
 *
 * @param printModes - Available print modes
 * @param optionName - Option name (default: "인쇄방식")
 * @returns REQUIRED option
 */
export function buildRequiredPrintModeOption(
  printModes: PrintModeOptionData[],
  optionName: string = '인쇄방식'
): ShopbyRequiredOption {
  return {
    kind: 'REQUIRED',
    optionName,
    optionValues: printModes.map(pm => ({
      optionValue: pm.name,
      addPrice: pm.addPrice ?? 0,
      optionValueCode: pm.code,
    })),
  };
}

/**
 * Build binding option (REQUIRED) for booklet products
 *
 * @param bindings - Available binding options
 * @returns REQUIRED option for binding
 */
export function buildRequiredBindingOption(
  bindings: Array<{ code: string; name: string; addPrice?: number }>
): ShopbyRequiredOption {
  return {
    kind: 'REQUIRED',
    optionName: '제본방식',
    optionValues: bindings.map(b => ({
      optionValue: b.name,
      addPrice: b.addPrice ?? 0,
      optionValueCode: b.code,
    })),
  };
}

/**
 * Build STANDARD option from post-process data
 *
 * @param postProcesses - Available post-process options
 * @param optionName - Option name (default: "후가공")
 * @returns STANDARD option
 */
export function buildStandardPostProcessOption(
  postProcesses: PostProcessOptionData[],
  optionName: string = '후가공'
): ShopbyStandardOption {
  return {
    kind: 'STANDARD',
    optionName,
    optionValues: postProcesses.map(pp => ({
      optionValue: pp.name,
      addPrice: pp.addPrice ?? 0,
      optionValueCode: pp.code,
    })),
  };
}

// =============================================================================
// SECTION 4: optionInputs Builders (NEW)
// =============================================================================

/**
 * Default optionInputs definitions for print products
 * Creates file upload, print specification, and special request fields
 *
 * @returns Array of optionInputs definitions
 */
export function buildDefaultOptionInputDefinitions(): ShopbyOptionInputDefinition[] {
  return [
    {
      inputLabel: '디자인 파일 (PDF, AI, PSD)',
      inputType: 'TEXT',
      required: true,
      matchingType: 'OPTION',
      placeholderText: '파일 URL이 자동으로 입력됩니다',
      helpText: '최대 500MB까지 업로드 가능',
    },
    {
      inputLabel: '인쇄 사양 (자동 입력)',
      inputType: 'TEXTAREA',
      required: true,
      matchingType: 'OPTION',
      helpText: '위젯에서 선택한 옵션이 자동으로 입력됩니다',
    },
    {
      inputLabel: '특수 요청사항',
      inputType: 'TEXTAREA',
      required: false,
      matchingType: 'OPTION',
      maxLength: 500,
      placeholderText: '특별히 요청하실 사항을 입력해주세요',
    },
  ];
}

/**
 * Build optionInputs values from print specification
 *
 * @param fileUrl - S3 file URL
 * @param printSpec - Print specification from widget
 * @param specialRequest - Optional special request text
 * @returns Array of optionInputs values
 */
export function buildOptionInputValues(
  fileUrl: string,
  printSpec: PrintSpecification,
  specialRequest?: string
): ShopbyOptionInputValue[] {
  const inputs: ShopbyOptionInputValue[] = [
    // File URL
    {
      inputLabel: '디자인 파일 (PDF, AI, PSD)',
      inputValue: fileUrl,
    },
    // Print specification as JSON string
    {
      inputLabel: '인쇄 사양 (자동 입력)',
      inputValue: JSON.stringify(printSpec),
    },
  ];

  // Add special request if provided
  if (specialRequest) {
    inputs.push({
      inputLabel: '특수 요청사항',
      inputValue: specialRequest,
    });
  }

  return inputs;
}

// =============================================================================
// SECTION 5: extraJson Builders (NEW)
// =============================================================================

/**
 * Build complete WidgetCreator extraJson structure
 *
 * @param params - ExtraJson build parameters
 * @returns Complete WidgetCreatorExtraJson object
 */
export function buildExtraJson(params: {
  huniProductId: number;
  huniCode: string;
  productType: string;
  pricingModel: string;
  sheetStandard?: string;
  orderMethod: 'upload' | 'editor';
  editorEnabled: boolean;
  options: WidgetOptionMapping[];
  constraints?: WidgetConfig['constraints'];
  dependencies?: WidgetConfig['dependencies'];
  pricing: WidgetPricingConfig;
  features: string[];
  mesItemCode: string;
  mesHasOptions: boolean;
}): WidgetCreatorExtraJson {
  return {
    version: '1.0.0',
    huniProductId: params.huniProductId,
    huniCode: params.huniCode,
    productType: params.productType,
    pricingModel: params.pricingModel,
    sheetStandard: params.sheetStandard,
    orderMethod: params.orderMethod,
    editorEnabled: params.editorEnabled,
    widgetConfig: {
      options: params.options,
      constraints: params.constraints,
      dependencies: params.dependencies,
      pricing: params.pricing,
    },
    features: params.features,
    mesMapping: {
      itemCode: params.mesItemCode,
      hasOptions: params.mesHasOptions,
    },
  };
}

/**
 * Build widget option mapping
 *
 * @param key - Option key (size, paper, printType, quantity, finishing)
 * @param type - Widget option type
 * @param required - Whether option is required
 * @param shopbyMapping - Shopby mapping target
 * @returns WidgetOptionMapping object
 */
export function buildWidgetOptionMapping(
  key: string,
  type: 'select' | 'multiselect' | 'number' | 'text',
  required: boolean,
  shopbyMapping: 'COMBINATION_1' | 'COMBINATION_2' | 'COMBINATION_3' | 'REQUIRED' | 'STANDARD'
): WidgetOptionMapping {
  return {
    key,
    type,
    required,
    shopbyMapping,
  };
}

// =============================================================================
// SECTION 6: Print Specification Parser (NEW)
// =============================================================================

/**
 * Parse print specification from optionInputs JSON string
 *
 * @param optionInputs - optionInputs from Shopby order
 * @returns Parsed PrintSpecification or null if invalid
 */
export function parsePrintSpecFromOptionInputs(
  optionInputs: ShopbyOptionInputValue[]
): PrintSpecification | null {
  // Find the print specification input
  const specInput = optionInputs.find(
    input => input.inputLabel === '인쇄 사양 (자동 입력)'
  );

  if (!specInput || !specInput.inputValue) {
    return null;
  }

  try {
    const spec = JSON.parse(specInput.inputValue) as PrintSpecification;
    // Validate required fields exist
    if (
      spec.huniCode &&
      spec.size &&
      spec.paper &&
      spec.printMode &&
      spec.quantity &&
      spec.widgetPrice
    ) {
      return spec;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Extract file URL from optionInputs
 *
 * @param optionInputs - optionInputs from Shopby order
 * @returns File URL or null if not found
 */
export function extractFileUrlFromOptionInputs(
  optionInputs: ShopbyOptionInputValue[]
): string | null {
  const fileInput = optionInputs.find(
    input => input.inputLabel === '디자인 파일 (PDF, AI, PSD)'
  );
  return fileInput?.inputValue ?? null;
}

/**
 * Extract special request from optionInputs
 *
 * @param optionInputs - optionInputs from Shopby order
 * @returns Special request text or null if not found
 */
export function extractSpecialRequestFromOptionInputs(
  optionInputs: ShopbyOptionInputValue[]
): string | null {
  const requestInput = optionInputs.find(
    input => input.inputLabel === '특수 요청사항'
  );
  return requestInput?.inputValue ?? null;
}

// =============================================================================
// SECTION 7: Price Calculation Helpers (NEW)
// =============================================================================

/**
 * Calculate addPrice for option combinations
 * addPrice = combinationPrice - basePrice (lowest price)
 *
 * @param basePrice - Lowest price across all combinations
 * @param combinationPrice - Price for specific combination
 * @returns addPrice value
 */
export function calculateAddPrice(basePrice: number, combinationPrice: number): number {
  return Math.max(0, combinationPrice - basePrice);
}

/**
 * Find minimum price from fixed prices array
 *
 * @param prices - Array of selling prices
 * @returns Minimum price
 */
export function findMinSellingPrice(prices: number[]): number {
  if (prices.length === 0) return 0;
  return Math.min(...prices);
}

/**
 * Build price breakdown for widget
 *
 * @param params - Price breakdown parameters
 * @returns WidgetPriceBreakdown object
 */
export function buildPriceBreakdown(params: {
  printCost: number;
  paperCost: number;
  finishingCost: number;
  bindingCost?: number;
  vatRate?: number;
}): WidgetPriceBreakdown {
  const { printCost, paperCost, finishingCost, bindingCost = 0, vatRate = 0.1 } = params;

  const totalBeforeVat = printCost + paperCost + finishingCost + bindingCost;
  const vat = Math.round(totalBeforeVat * vatRate);
  const total = totalBeforeVat + vat;

  return {
    printCost,
    paperCost,
    finishingCost,
    bindingCost: bindingCost > 0 ? bindingCost : undefined,
    totalBeforeVat,
    vat,
    total,
  };
}
