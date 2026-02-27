/**
 * Shopby Integration Zod Validation Schemas
 *
 * Runtime validation schemas for Shopby API data structures.
 * Reference: SPEC-SHOPBY-001, SPEC-SHOPBY-INTEGRATION-DESIGN
 *
 * @MX:NOTE: All schemas use Zod for runtime validation with detailed error messages.
 */

import { z } from 'zod';

// =============================================================================
// SECTION 1: Core API Configuration Schemas
// =============================================================================

/**
 * Shopby API configuration schema
 */
export const ShopbyApiConfigSchema = z.object({
  baseUrl: z.string().url('Invalid API base URL'),
  apiKey: z.string().optional(),
  partnerId: z.string().optional(),
  mallId: z.string().optional(),
});

/**
 * Shopby API category schema
 */
export const ShopbyApiCategorySchema = z.enum(['shop', 'admin', 'server', 'internal']);

// =============================================================================
// SECTION 2: mallProduct Schemas
// =============================================================================

/**
 * Shopby sale status type schema
 */
export const ShopbySaleStatusTypeSchema = z.enum(['ONSALE', 'STOP', 'EXHAUST']);

/**
 * Shopby display type schema
 */
export const ShopbyDisplayTypeSchema = z.enum(['DISPLAY', 'HIDDEN']);

/**
 * Price schema for mallProduct
 */
export const ShopbyPriceSchema = z.object({
  salePrice: z.number().int().nonnegative('Sale price must be non-negative'),
  listPrice: z.number().int().nonnegative().optional(),
  vatIncluded: z.boolean().optional().default(true),
});

/**
 * Stock information schema
 */
export const ShopbyStockSchema = z.object({
  inventoryManagement: z.boolean(),
  soldoutDisplay: z.enum(['SHOW', 'HIDE']).optional(),
  stockQuantity: z.number().int().nonnegative().optional(),
});

/**
 * Delivery information schema
 */
export const ShopbyDeliverySchema = z.object({
  deliveryTemplateNo: z.number().int().positive(),
  deliveryMethodType: z.enum(['DELIVERY', 'VISIT_RECEIPT', 'DIRECT_DELIVERY']),
  freeDeliveryCondition: z.number().int().nonnegative().optional(),
});

/**
 * Full mallProduct schema
 * @MX:ANCHOR: Primary validation schema for Shopby product sync
 * @MX:REASON: Validates all mallProduct fields before API submission
 */
export const ShopbyMallProductSchema = z.object({
  mallProductNo: z.number().int().positive().optional(),
  productName: z.string().min(1, 'Product name is required').max(100, 'Product name too long'),
  content: z.string().optional(),
  mobileContent: z.string().optional(),
  price: ShopbyPriceSchema,
  saleStatusType: ShopbySaleStatusTypeSchema,
  displayType: ShopbyDisplayTypeSchema.optional(),
  categoryNo: z.number().int().positive().optional(),
  stock: ShopbyStockSchema.optional(),
  delivery: ShopbyDeliverySchema.optional(),
  productNameSummary: z.string().max(50).optional(),
  productImageUrls: z.array(z.string().url()).max(10).optional(),
  extraJson: z.record(z.unknown()).optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

// =============================================================================
// SECTION 3: Option Schemas
// =============================================================================

/**
 * Shopby option kind schema
 */
export const ShopbyOptionKindSchema = z.enum(['COMBINATION', 'REQUIRED', 'STANDARD']);

/**
 * Option value schema
 */
export const ShopbyOptionValueSchema = z.object({
  optionValue: z.string().min(1, 'Option value is required'),
  addPrice: z.number().int().optional().default(0),
  stockQuantity: z.number().int().nonnegative().optional(),
  optionValueCode: z.string().optional(),
});

/**
 * COMBINATION option schema
 */
export const ShopbyCombinationOptionSchema = z.object({
  kind: z.literal('COMBINATION'),
  optionName: z.string().min(1, 'Option name is required'),
  optionValues: z.array(ShopbyOptionValueSchema).min(1, 'At least one option value required'),
  required: z.boolean().optional().default(true),
});

/**
 * REQUIRED option schema
 */
export const ShopbyRequiredOptionSchema = z.object({
  kind: z.literal('REQUIRED'),
  optionName: z.string().min(1, 'Option name is required'),
  optionValues: z.array(ShopbyOptionValueSchema).min(1, 'At least one option value required'),
});

/**
 * STANDARD option schema
 */
export const ShopbyStandardOptionSchema = z.object({
  kind: z.literal('STANDARD'),
  optionName: z.string().min(1, 'Option name is required'),
  optionValues: z.array(ShopbyOptionValueSchema).min(1, 'At least one option value required'),
});

/**
 * Union type for all Shopby option schemas
 */
export const ShopbyOptionSchema = z.discriminatedUnion('kind', [
  ShopbyCombinationOptionSchema,
  ShopbyRequiredOptionSchema,
  ShopbyStandardOptionSchema,
]);

/**
 * Complete option data schema for a product
 */
export const ShopbyProductOptionDataSchema = z.object({
  combinations: z.array(ShopbyCombinationOptionSchema).max(3, 'Maximum 3 COMBINATION options allowed').optional(),
  required: z.array(ShopbyRequiredOptionSchema).optional(),
  standard: z.array(ShopbyStandardOptionSchema).optional(),
});

// =============================================================================
// SECTION 4: optionInputs Schemas
// =============================================================================

/**
 * Input type schema
 */
export const ShopbyInputTypeSchema = z.enum(['TEXT', 'TEXTAREA', 'NUMBER', 'DATE', 'EMAIL', 'PHONE']);

/**
 * Matching type schema
 */
export const ShopbyMatchingTypeSchema = z.enum(['OPTION', 'SENDER', 'RECEIVER']);

/**
 * optionInputs definition schema
 */
export const ShopbyOptionInputDefinitionSchema = z.object({
  inputLabel: z.string().min(1, 'Input label is required').max(50),
  inputType: ShopbyInputTypeSchema,
  required: z.boolean(),
  matchingType: ShopbyMatchingTypeSchema,
  maxLength: z.number().int().positive().max(5000).optional(),
  placeholderText: z.string().max(100).optional(),
  helpText: z.string().max(200).optional(),
});

/**
 * optionInputs value schema
 */
export const ShopbyOptionInputValueSchema = z.object({
  inputLabel: z.string().min(1, 'Input label is required'),
  inputValue: z.string(),
});

/**
 * Array of optionInputs definitions for product creation
 */
export const ShopbyOptionInputDefinitionsSchema = z.array(ShopbyOptionInputDefinitionSchema).max(10);

// =============================================================================
// SECTION 5: extraJson Widget Creator Schemas
// =============================================================================

/**
 * Widget option mapping schema
 */
export const WidgetOptionMappingSchema = z.object({
  key: z.string().min(1),
  type: z.enum(['select', 'multiselect', 'number', 'text']),
  required: z.boolean(),
  shopbyMapping: z.string().min(1),
});

/**
 * Widget constraint definition schema
 */
export const WidgetConstraintDefinitionSchema = z.object({
  type: z.enum(['filter', 'show', 'hide', 'set_value', 'range']),
  source: z.string(),
  target: z.string(),
  description: z.string().optional(),
});

/**
 * Widget dependency definition schema
 */
export const WidgetDependencyDefinitionSchema = z.object({
  parent: z.string(),
  child: z.string(),
  type: z.enum(['visibility', 'filter']),
  description: z.string().optional(),
});

/**
 * Widget pricing configuration schema
 */
export const WidgetPricingConfigSchema = z.object({
  source: z.enum(['widget', 'shopby']),
  model: z.string().min(1),
  currency: z.string().length(3),
  vatIncluded: z.boolean(),
});

/**
 * Widget configuration schema
 */
export const WidgetConfigSchema = z.object({
  options: z.array(WidgetOptionMappingSchema).min(1, 'At least one option required'),
  constraints: z.array(WidgetConstraintDefinitionSchema).optional(),
  dependencies: z.array(WidgetDependencyDefinitionSchema).optional(),
  pricing: WidgetPricingConfigSchema,
});

/**
 * MES mapping information schema
 */
export const MesMappingInfoSchema = z.object({
  itemCode: z.string().min(1),
  hasOptions: z.boolean(),
});

/**
 * Widget Creator extraJson schema
 * @MX:ANCHOR: Validates widget configuration stored in Shopby extraJson
 * @MX:REASON: Ensures valid bidirectional sync configuration
 */
export const WidgetCreatorExtraJsonSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be semver format'),
  huniProductId: z.number().int().positive(),
  huniCode: z.string().regex(/^\d{3}-\d{4}$/, 'Huni code must be XXX-XXXX format'),
  productType: z.string().min(1),
  pricingModel: z.string().min(1),
  sheetStandard: z.string().optional(),
  orderMethod: z.enum(['upload', 'editor']),
  editorEnabled: z.boolean(),
  widgetConfig: WidgetConfigSchema,
  features: z.array(z.string()),
  mesMapping: MesMappingInfoSchema,
});

// =============================================================================
// SECTION 6: Order Schemas
// =============================================================================

/**
 * Shopby order status type schema
 */
export const ShopbyOrderStatusTypeSchema = z.enum([
  'DEPOSIT_WAIT',
  'PAY_DONE',
  'PRODUCT_PREPARE',
  'DELIVERY_ING',
  'DELIVERY_DONE',
  'BUY_CONFIRM',
  'CANCEL_DONE',
  'RETURN_DONE',
  'EXCHANGE_DONE',
]);

/**
 * Order item schema
 */
export const ShopbyOrderItemSchema = z.object({
  productNo: z.number().int().positive(),
  productName: z.string(),
  optionNo: z.number().int().positive().optional(),
  optionValues: z.array(z.string()).optional(),
  orderCnt: z.number().int().positive(),
  unitPrice: z.number().int().nonnegative(),
  totalPrice: z.number().int().nonnegative(),
  optionInputs: z.array(ShopbyOptionInputValueSchema).optional(),
});

/**
 * Orderer information schema
 */
export const OrdererSchema = z.object({
  name: z.string().min(1),
  phone1: z.string().min(1),
  email: z.string().email().optional(),
});

/**
 * Shipping information schema
 */
export const ShippingSchema = z.object({
  name: z.string().min(1),
  phone1: z.string().min(1),
  zipCode: z.string().min(1),
  address1: z.string().min(1),
  address2: z.string().optional(),
  message: z.string().optional(),
  deliveryCompany: z.string().optional(),
  trackingNo: z.string().optional(),
});

/**
 * Order sheet schema for creation
 */
export const ShopbyOrderSheetSchema = z.object({
  orderSheetNo: z.string().optional(),
  items: z.array(ShopbyOrderItemSchema).min(1, 'At least one item required'),
  orderer: OrdererSchema.optional(),
  shipping: ShippingSchema.optional(),
  createdAt: z.string().datetime().optional(),
});

/**
 * Full order detail schema
 */
export const ShopbyOrderDetailSchema = z.object({
  orderNo: z.string().min(1),
  orderStatus: ShopbyOrderStatusTypeSchema,
  items: z.array(ShopbyOrderItemSchema).min(1),
  totalPaymentAmount: z.number().int().nonnegative(),
  orderer: OrdererSchema,
  shipping: ShippingSchema.optional(),
  payment: z.object({
    paymentMethod: z.string(),
    paymentAmount: z.number().int().nonnegative(),
    paidAt: z.string().datetime().optional(),
  }).optional(),
  orderTimestamp: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
});

// =============================================================================
// SECTION 7: Authentication Schemas
// =============================================================================

/**
 * OAuth 2.0 token response schema
 */
export const ShopbyOAuthTokenSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  tokenType: z.string().default('Bearer'),
  expiresIn: z.number().int().positive(),
  refreshTokenExpiresIn: z.number().int().positive(),
  memberId: z.string().optional(),
  memberType: z.string().optional(),
});

/**
 * Admin token schema
 */
export const ShopbyAdminTokenSchema = z.object({
  accessToken: z.string().min(1),
  tokenType: z.string().default('Bearer'),
  expiresIn: z.number().int().positive(),
  partnerId: z.string().optional(),
});

/**
 * Social login provider schema
 */
export const ShopbySocialProviderSchema = z.enum(['naver', 'kakao', 'google', 'apple']);

/**
 * Social login request schema
 */
export const ShopbySocialLoginRequestSchema = z.object({
  provider: ShopbySocialProviderSchema,
  code: z.string().min(1),
  state: z.string().optional(),
  keepLogin: z.boolean().optional().default(false),
});

/**
 * Token refresh request schema
 */
export const ShopbyTokenRefreshRequestSchema = z.object({
  refreshToken: z.string().min(1),
});

// =============================================================================
// SECTION 8: API Response Schemas
// =============================================================================

/**
 * Generic API response wrapper schema
 */
export const ShopbyApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    code: z.string().optional(),
    message: z.string().optional(),
    pagination: z.object({
      page: z.number().int().positive(),
      pageSize: z.number().int().positive(),
      total: z.number().int().nonnegative(),
      hasNext: z.boolean(),
    }).optional(),
  });

/**
 * API error response schema
 */
export const ShopbyApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  errors: z.array(z.object({
    field: z.string(),
    message: z.string(),
  })).optional(),
  status: z.number().int().optional(),
});

// =============================================================================
// SECTION 9: File Upload Schemas
// =============================================================================

/**
 * Temporary image upload response schema
 */
export const ShopbyTemporaryImageSchema = z.object({
  url: z.string().url(),
  fileName: z.string(),
  expiresAt: z.string().datetime().optional(),
});

// =============================================================================
// SECTION 10: Print Specification Schemas (for optionInputs parsing)
// =============================================================================

/**
 * Print size specification schema
 */
export const PrintSizeSpecSchema = z.object({
  code: z.string(),
  name: z.string(),
  cutWidth: z.number().positive(),
  cutHeight: z.number().positive(),
});

/**
 * Print paper specification schema
 */
export const PrintPaperSpecSchema = z.object({
  code: z.string(),
  name: z.string(),
});

/**
 * Print mode specification schema
 */
export const PrintModeSpecSchema = z.object({
  code: z.string(),
  name: z.string(),
  priceCode: z.number().int().nonnegative(),
});

/**
 * Post-process specification schema
 */
export const PostProcessSpecSchema = z.object({
  code: z.string(),
  name: z.string(),
});

/**
 * Widget price breakdown schema
 */
export const WidgetPriceBreakdownSchema = z.object({
  printCost: z.number().nonnegative(),
  paperCost: z.number().nonnegative(),
  finishingCost: z.number().nonnegative(),
  bindingCost: z.number().nonnegative().optional(),
  totalBeforeVat: z.number().nonnegative(),
  vat: z.number().nonnegative(),
  total: z.number().nonnegative(),
});

/**
 * Binding specification schema
 */
export const BindingSpecSchema = z.object({
  code: z.string(),
  name: z.string(),
  pageCount: z.number().int().positive(),
});

/**
 * Complete print specification schema
 */
export const PrintSpecificationSchema = z.object({
  huniCode: z.string(),
  size: PrintSizeSpecSchema,
  paper: PrintPaperSpecSchema,
  printMode: PrintModeSpecSchema,
  quantity: z.number().int().positive(),
  postProcess: z.array(PostProcessSpecSchema).optional(),
  binding: BindingSpecSchema.optional(),
  widgetPrice: WidgetPriceBreakdownSchema,
});

// =============================================================================
// SECTION 11: Admin Client & Registration Schemas (SPEC-SHOPBY-002)
// =============================================================================

/**
 * Shopby category schema
 */
export const ShopbyCategorySchema = z.object({
  categoryNo: z.number().int().positive(),
  categoryName: z.string().min(1, 'Category name is required'),
  parentCategoryNo: z.number().int().positive().optional(),
  depth: z.number().int().nonnegative(),
  sortOrder: z.number().int().optional(),
  displayable: z.boolean().optional(),
});

/**
 * Product list query schema
 */
export const ShopbyProductListQuerySchema = z.object({
  page: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().max(100).optional(),
  categoryNo: z.number().int().positive().optional(),
  saleStatusType: ShopbySaleStatusTypeSchema.optional(),
  keyword: z.string().max(100).optional(),
});

/**
 * Price validation result schema
 */
export const PriceValidationResultSchema = z.object({
  isValid: z.boolean(),
  widgetPrice: z.number().nonnegative(),
  shopbyPrice: z.number().nonnegative(),
  difference: z.number().nonnegative(),
  differencePercent: z.number().nonnegative(),
  tolerancePercent: z.number().positive(),
});

/**
 * Product registration result schema
 */
export const ProductRegistrationResultSchema = z.object({
  huniProductId: z.number().int().positive(),
  huniCode: z.string(),
  shopbyProductNo: z.number().int().positive().optional(),
  success: z.boolean(),
  optionCounts: z.object({
    combinations: z.number().int().nonnegative(),
    required: z.number().int().nonnegative(),
    standard: z.number().int().nonnegative(),
  }).optional(),
  error: z.string().optional(),
});

/**
 * Batch registration result schema
 */
export const BatchRegistrationResultSchema = z.object({
  total: z.number().int().nonnegative(),
  succeeded: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  results: z.array(ProductRegistrationResultSchema),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime(),
});

// =============================================================================
// SECTION 12: Schema Type Exports
// =============================================================================

/**
 * Type exports for inferred types from schemas
 * These can be used as alternatives to manual type definitions
 */
export type ShopbyApiConfigInput = z.infer<typeof ShopbyApiConfigSchema>;
export type ShopbyMallProductInput = z.infer<typeof ShopbyMallProductSchema>;
export type ShopbyOptionValueInput = z.infer<typeof ShopbyOptionValueSchema>;
export type ShopbyCombinationOptionInput = z.infer<typeof ShopbyCombinationOptionSchema>;
export type ShopbyRequiredOptionInput = z.infer<typeof ShopbyRequiredOptionSchema>;
export type ShopbyStandardOptionInput = z.infer<typeof ShopbyStandardOptionSchema>;
export type ShopbyOptionInputDefinitionInput = z.infer<typeof ShopbyOptionInputDefinitionSchema>;
export type ShopbyOptionInputValueInput = z.infer<typeof ShopbyOptionInputValueSchema>;
export type WidgetCreatorExtraJsonInput = z.infer<typeof WidgetCreatorExtraJsonSchema>;
export type ShopbyOrderSheetInput = z.infer<typeof ShopbyOrderSheetSchema>;
export type ShopbyOrderDetailInput = z.infer<typeof ShopbyOrderDetailSchema>;
export type ShopbyOAuthTokenInput = z.infer<typeof ShopbyOAuthTokenSchema>;
export type PrintSpecificationInput = z.infer<typeof PrintSpecificationSchema>;
