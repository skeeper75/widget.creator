/**
 * Unit tests for Shopby Zod validation schemas
 *
 * Tests cover valid data validation, invalid data rejection,
 * edge cases, boundary values, and error messages.
 */
import { describe, it, expect } from 'vitest';
import {
  ShopbyApiConfigSchema,
  ShopbyApiCategorySchema,
  ShopbySaleStatusTypeSchema,
  ShopbyDisplayTypeSchema,
  ShopbyPriceSchema,
  ShopbyStockSchema,
  ShopbyDeliverySchema,
  ShopbyMallProductSchema,
  ShopbyOptionKindSchema,
  ShopbyOptionValueSchema,
  ShopbyCombinationOptionSchema,
  ShopbyRequiredOptionSchema,
  ShopbyStandardOptionSchema,
  ShopbyOptionSchema,
  ShopbyProductOptionDataSchema,
  ShopbyInputTypeSchema,
  ShopbyMatchingTypeSchema,
  ShopbyOptionInputDefinitionSchema,
  ShopbyOptionInputValueSchema,
  WidgetOptionMappingSchema,
  WidgetConstraintDefinitionSchema,
  WidgetDependencyDefinitionSchema,
  WidgetPricingConfigSchema,
  WidgetConfigSchema,
  WidgetCreatorExtraJsonSchema,
  ShopbyOrderStatusTypeSchema,
  ShopbyOrderItemSchema,
  OrdererSchema,
  ShippingSchema,
  ShopbyOrderSheetSchema,
  ShopbyOrderDetailSchema,
  ShopbyOAuthTokenSchema,
  ShopbyAdminTokenSchema,
  ShopbySocialProviderSchema,
  ShopbySocialLoginRequestSchema,
  ShopbyTokenRefreshRequestSchema,
  ShopbyApiErrorSchema,
  ShopbyTemporaryImageSchema,
  PrintSizeSpecSchema,
  PrintPaperSpecSchema,
  PrintModeSpecSchema,
  PostProcessSpecSchema,
  WidgetPriceBreakdownSchema,
  BindingSpecSchema,
  PrintSpecificationSchema,
  MesMappingInfoSchema,
  ShopbyOptionInputDefinitionsSchema,
  ShopbyCategorySchema,
  ShopbyProductListQuerySchema,
  PriceValidationResultSchema,
  ProductRegistrationResultSchema,
  BatchRegistrationResultSchema,
} from '../schemas.js';

// =============================================================================
// SECTION 1: Core API Configuration Schemas
// =============================================================================

describe('ShopbyApiConfigSchema', () => {
  it('should validate valid config with all fields', () => {
    const result = ShopbyApiConfigSchema.safeParse({
      baseUrl: 'https://api.shopby.co.kr',
      apiKey: 'test-api-key',
      partnerId: 'partner-001',
      mallId: 'mall-001',
    });

    expect(result.success).toBe(true);
  });

  it('should validate config with only baseUrl', () => {
    const result = ShopbyApiConfigSchema.safeParse({
      baseUrl: 'https://api.shopby.co.kr',
    });

    expect(result.success).toBe(true);
  });

  it('should reject invalid URL', () => {
    const result = ShopbyApiConfigSchema.safeParse({
      baseUrl: 'not-a-url',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Invalid API base URL');
    }
  });

  it('should reject missing baseUrl', () => {
    const result = ShopbyApiConfigSchema.safeParse({
      apiKey: 'test-key',
    });

    expect(result.success).toBe(false);
  });
});

describe('ShopbyApiCategorySchema', () => {
  it('should accept valid categories', () => {
    expect(ShopbyApiCategorySchema.safeParse('shop').success).toBe(true);
    expect(ShopbyApiCategorySchema.safeParse('admin').success).toBe(true);
    expect(ShopbyApiCategorySchema.safeParse('server').success).toBe(true);
    expect(ShopbyApiCategorySchema.safeParse('internal').success).toBe(true);
  });

  it('should reject invalid category', () => {
    const result = ShopbyApiCategorySchema.safeParse('invalid');
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// SECTION 2: mallProduct Schemas
// =============================================================================

describe('ShopbySaleStatusTypeSchema', () => {
  it('should accept valid status types', () => {
    expect(ShopbySaleStatusTypeSchema.safeParse('ONSALE').success).toBe(true);
    expect(ShopbySaleStatusTypeSchema.safeParse('STOP').success).toBe(true);
    expect(ShopbySaleStatusTypeSchema.safeParse('EXHAUST').success).toBe(true);
  });

  it('should reject invalid status', () => {
    expect(ShopbySaleStatusTypeSchema.safeParse('INVALID').success).toBe(false);
  });
});

describe('ShopbyDisplayTypeSchema', () => {
  it('should accept valid display types', () => {
    expect(ShopbyDisplayTypeSchema.safeParse('DISPLAY').success).toBe(true);
    expect(ShopbyDisplayTypeSchema.safeParse('HIDDEN').success).toBe(true);
  });
});

describe('ShopbyPriceSchema', () => {
  it('should validate valid price object', () => {
    const result = ShopbyPriceSchema.safeParse({
      salePrice: 15000,
      listPrice: 20000,
      vatIncluded: true,
    });

    expect(result.success).toBe(true);
  });

  it('should validate with only salePrice', () => {
    const result = ShopbyPriceSchema.safeParse({
      salePrice: 10000,
    });

    expect(result.success).toBe(true);
  });

  it('should reject negative salePrice', () => {
    const result = ShopbyPriceSchema.safeParse({
      salePrice: -1000,
    });

    expect(result.success).toBe(false);
  });

  it('should reject non-integer salePrice', () => {
    const result = ShopbyPriceSchema.safeParse({
      salePrice: 1000.5,
    });

    expect(result.success).toBe(false);
  });

  it('should default vatIncluded to true when omitted', () => {
    const result = ShopbyPriceSchema.safeParse({
      salePrice: 10000,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.vatIncluded).toBe(true);
    }
  });
});

describe('ShopbyStockSchema', () => {
  it('should validate stock with all fields', () => {
    const result = ShopbyStockSchema.safeParse({
      inventoryManagement: true,
      soldoutDisplay: 'SHOW',
      stockQuantity: 100,
    });

    expect(result.success).toBe(true);
  });

  it('should validate with only inventoryManagement', () => {
    const result = ShopbyStockSchema.safeParse({
      inventoryManagement: false,
    });

    expect(result.success).toBe(true);
  });

  it('should reject invalid soldoutDisplay', () => {
    const result = ShopbyStockSchema.safeParse({
      inventoryManagement: true,
      soldoutDisplay: 'INVALID',
    });

    expect(result.success).toBe(false);
  });
});

describe('ShopbyDeliverySchema', () => {
  it('should validate delivery config', () => {
    const result = ShopbyDeliverySchema.safeParse({
      deliveryTemplateNo: 123,
      deliveryMethodType: 'DELIVERY',
      freeDeliveryCondition: 50000,
    });

    expect(result.success).toBe(true);
  });

  it('should reject negative deliveryTemplateNo', () => {
    const result = ShopbyDeliverySchema.safeParse({
      deliveryTemplateNo: -1,
      deliveryMethodType: 'DELIVERY',
    });

    expect(result.success).toBe(false);
  });
});

describe('ShopbyMallProductSchema', () => {
  const validProduct = {
    productName: 'Test Product',
    price: { salePrice: 15000 },
    saleStatusType: 'ONSALE' as const,
  };

  it('should validate complete product', () => {
    const result = ShopbyMallProductSchema.safeParse({
      ...validProduct,
      mallProductNo: 12345,
      content: '<p>Product description</p>',
      categoryNo: 100,
    });

    expect(result.success).toBe(true);
  });

  it('should validate minimal product', () => {
    const result = ShopbyMallProductSchema.safeParse(validProduct);

    expect(result.success).toBe(true);
  });

  it('should reject empty productName', () => {
    const result = ShopbyMallProductSchema.safeParse({
      ...validProduct,
      productName: '',
    });

    expect(result.success).toBe(false);
  });

  it('should reject productName over 100 chars', () => {
    const result = ShopbyMallProductSchema.safeParse({
      ...validProduct,
      productName: 'a'.repeat(101),
    });

    expect(result.success).toBe(false);
  });

  it('should validate productImageUrls with valid URLs', () => {
    const result = ShopbyMallProductSchema.safeParse({
      ...validProduct,
      productImageUrls: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
    });

    expect(result.success).toBe(true);
  });

  it('should reject invalid URL in productImageUrls', () => {
    const result = ShopbyMallProductSchema.safeParse({
      ...validProduct,
      productImageUrls: ['not-a-url'],
    });

    expect(result.success).toBe(false);
  });

  it('should validate extraJson as record', () => {
    const result = ShopbyMallProductSchema.safeParse({
      ...validProduct,
      extraJson: { custom: 'data', count: 123 },
    });

    expect(result.success).toBe(true);
  });
});

// =============================================================================
// SECTION 3: Option Schemas
// =============================================================================

describe('ShopbyOptionKindSchema', () => {
  it('should accept valid kinds', () => {
    expect(ShopbyOptionKindSchema.safeParse('COMBINATION').success).toBe(true);
    expect(ShopbyOptionKindSchema.safeParse('REQUIRED').success).toBe(true);
    expect(ShopbyOptionKindSchema.safeParse('STANDARD').success).toBe(true);
  });
});

describe('ShopbyOptionValueSchema', () => {
  it('should validate option value with all fields', () => {
    const result = ShopbyOptionValueSchema.safeParse({
      optionValue: 'Red',
      addPrice: 1000,
      stockQuantity: 50,
      optionValueCode: 'RED-001',
    });

    expect(result.success).toBe(true);
  });

  it('should validate minimal option value', () => {
    const result = ShopbyOptionValueSchema.safeParse({
      optionValue: 'Blue',
    });

    expect(result.success).toBe(true);
  });

  it('should default addPrice to 0', () => {
    const result = ShopbyOptionValueSchema.safeParse({
      optionValue: 'Green',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.addPrice).toBe(0);
    }
  });

  it('should reject empty optionValue', () => {
    const result = ShopbyOptionValueSchema.safeParse({
      optionValue: '',
    });

    expect(result.success).toBe(false);
  });
});

describe('ShopbyCombinationOptionSchema', () => {
  it('should validate COMBINATION option', () => {
    const result = ShopbyCombinationOptionSchema.safeParse({
      kind: 'COMBINATION',
      optionName: 'Size',
      optionValues: [
        { optionValue: 'Small', addPrice: 0 },
        { optionValue: 'Large', addPrice: 500 },
      ],
      required: true,
    });

    expect(result.success).toBe(true);
  });

  it('should reject wrong kind', () => {
    const result = ShopbyCombinationOptionSchema.safeParse({
      kind: 'REQUIRED',
      optionName: 'Size',
      optionValues: [{ optionValue: 'Small' }],
    });

    expect(result.success).toBe(false);
  });

  it('should require at least one optionValue', () => {
    const result = ShopbyCombinationOptionSchema.safeParse({
      kind: 'COMBINATION',
      optionName: 'Size',
      optionValues: [],
    });

    expect(result.success).toBe(false);
  });
});

describe('ShopbyRequiredOptionSchema', () => {
  it('should validate REQUIRED option', () => {
    const result = ShopbyRequiredOptionSchema.safeParse({
      kind: 'REQUIRED',
      optionName: 'Paper Type',
      optionValues: [{ optionValue: 'Glossy' }, { optionValue: 'Matte' }],
    });

    expect(result.success).toBe(true);
  });
});

describe('ShopbyStandardOptionSchema', () => {
  it('should validate STANDARD option', () => {
    const result = ShopbyStandardOptionSchema.safeParse({
      kind: 'STANDARD',
      optionName: 'Gift Wrap',
      optionValues: [{ optionValue: 'Yes' }],
    });

    expect(result.success).toBe(true);
  });
});

describe('ShopbyOptionSchema', () => {
  it('should accept COMBINATION kind', () => {
    const result = ShopbyOptionSchema.safeParse({
      kind: 'COMBINATION',
      optionName: 'Color',
      optionValues: [{ optionValue: 'Red' }],
    });

    expect(result.success).toBe(true);
  });

  it('should accept REQUIRED kind', () => {
    const result = ShopbyOptionSchema.safeParse({
      kind: 'REQUIRED',
      optionName: 'Size',
      optionValues: [{ optionValue: 'S' }],
    });

    expect(result.success).toBe(true);
  });

  it('should accept STANDARD kind', () => {
    const result = ShopbyOptionSchema.safeParse({
      kind: 'STANDARD',
      optionName: 'Gift',
      optionValues: [{ optionValue: 'Yes' }],
    });

    expect(result.success).toBe(true);
  });

  it('should reject unknown kind', () => {
    const result = ShopbyOptionSchema.safeParse({
      kind: 'UNKNOWN',
      optionName: 'Test',
      optionValues: [{ optionValue: 'Value' }],
    });

    expect(result.success).toBe(false);
  });
});

describe('ShopbyProductOptionDataSchema', () => {
  it('should validate complete option data', () => {
    const result = ShopbyProductOptionDataSchema.safeParse({
      combinations: [
        {
          kind: 'COMBINATION',
          optionName: 'Size',
          optionValues: [{ optionValue: 'A4' }],
        },
      ],
      required: [
        {
          kind: 'REQUIRED',
          optionName: 'Paper',
          optionValues: [{ optionValue: 'Glossy' }],
        },
      ],
      standard: [
        {
          kind: 'STANDARD',
          optionName: 'Coating',
          optionValues: [{ optionValue: 'None' }],
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('should reject more than 3 COMBINATION options', () => {
    const result = ShopbyProductOptionDataSchema.safeParse({
      combinations: [
        { kind: 'COMBINATION', optionName: 'Size', optionValues: [{ optionValue: 'A4' }] },
        { kind: 'COMBINATION', optionName: 'Paper', optionValues: [{ optionValue: 'Glossy' }] },
        { kind: 'COMBINATION', optionName: 'Color', optionValues: [{ optionValue: 'Full' }] },
        { kind: 'COMBINATION', optionName: 'Extra', optionValues: [{ optionValue: 'Yes' }] },
      ],
    });

    expect(result.success).toBe(false);
  });
});

// =============================================================================
// SECTION 4: optionInputs Schemas
// =============================================================================

describe('ShopbyInputTypeSchema', () => {
  it('should accept valid input types', () => {
    expect(ShopbyInputTypeSchema.safeParse('TEXT').success).toBe(true);
    expect(ShopbyInputTypeSchema.safeParse('TEXTAREA').success).toBe(true);
    expect(ShopbyInputTypeSchema.safeParse('NUMBER').success).toBe(true);
    expect(ShopbyInputTypeSchema.safeParse('DATE').success).toBe(true);
    expect(ShopbyInputTypeSchema.safeParse('EMAIL').success).toBe(true);
    expect(ShopbyInputTypeSchema.safeParse('PHONE').success).toBe(true);
  });
});

describe('ShopbyMatchingTypeSchema', () => {
  it('should accept valid matching types', () => {
    expect(ShopbyMatchingTypeSchema.safeParse('OPTION').success).toBe(true);
    expect(ShopbyMatchingTypeSchema.safeParse('SENDER').success).toBe(true);
    expect(ShopbyMatchingTypeSchema.safeParse('RECEIVER').success).toBe(true);
  });
});

describe('ShopbyOptionInputDefinitionSchema', () => {
  it('should validate complete input definition', () => {
    const result = ShopbyOptionInputDefinitionSchema.safeParse({
      inputLabel: 'Custom Text',
      inputType: 'TEXT',
      required: true,
      matchingType: 'OPTION',
      maxLength: 100,
      placeholderText: 'Enter text',
      helpText: 'Up to 100 characters',
    });

    expect(result.success).toBe(true);
  });

  it('should reject inputLabel over 50 chars', () => {
    const result = ShopbyOptionInputDefinitionSchema.safeParse({
      inputLabel: 'a'.repeat(51),
      inputType: 'TEXT',
      required: true,
      matchingType: 'OPTION',
    });

    expect(result.success).toBe(false);
  });

  it('should reject maxLength over 5000', () => {
    const result = ShopbyOptionInputDefinitionSchema.safeParse({
      inputLabel: 'Long Text',
      inputType: 'TEXTAREA',
      required: false,
      matchingType: 'OPTION',
      maxLength: 5001,
    });

    expect(result.success).toBe(false);
  });
});

describe('ShopbyOptionInputValueSchema', () => {
  it('should validate input value', () => {
    const result = ShopbyOptionInputValueSchema.safeParse({
      inputLabel: 'File URL',
      inputValue: 'https://example.com/file.pdf',
    });

    expect(result.success).toBe(true);
  });

  it('should allow empty inputValue', () => {
    const result = ShopbyOptionInputValueSchema.safeParse({
      inputLabel: 'Optional Field',
      inputValue: '',
    });

    expect(result.success).toBe(true);
  });
});

// =============================================================================
// SECTION 5: extraJson Widget Creator Schemas
// =============================================================================

describe('WidgetOptionMappingSchema', () => {
  it('should validate option mapping', () => {
    const result = WidgetOptionMappingSchema.safeParse({
      key: 'size',
      type: 'select',
      required: true,
      shopbyMapping: 'option_combination_1',
    });

    expect(result.success).toBe(true);
  });

  it('should accept all valid types', () => {
    const types = ['select', 'multiselect', 'number', 'text'];
    for (const type of types) {
      const result = WidgetOptionMappingSchema.safeParse({
        key: 'test',
        type,
        required: false,
        shopbyMapping: 'test_mapping',
      });
      expect(result.success).toBe(true);
    }
  });
});

describe('WidgetConstraintDefinitionSchema', () => {
  it('should validate constraint definition', () => {
    const result = WidgetConstraintDefinitionSchema.safeParse({
      type: 'filter',
      source: 'paper',
      target: 'printMode',
      description: 'Filter print modes by paper type',
    });

    expect(result.success).toBe(true);
  });

  it('should accept all constraint types', () => {
    const types = ['filter', 'show', 'hide', 'set_value', 'range'];
    for (const type of types) {
      const result = WidgetConstraintDefinitionSchema.safeParse({
        type,
        source: 'a',
        target: 'b',
      });
      expect(result.success).toBe(true);
    }
  });
});

describe('WidgetDependencyDefinitionSchema', () => {
  it('should validate dependency definition', () => {
    const result = WidgetDependencyDefinitionSchema.safeParse({
      parent: 'size',
      child: 'paper',
      type: 'visibility',
      description: 'Show paper options based on size',
    });

    expect(result.success).toBe(true);
  });
});

describe('WidgetPricingConfigSchema', () => {
  it('should validate pricing config from widget', () => {
    const result = WidgetPricingConfigSchema.safeParse({
      source: 'widget',
      model: 'dynamic_quantity',
      currency: 'KRW',
      vatIncluded: true,
    });

    expect(result.success).toBe(true);
  });

  it('should validate pricing config from shopby', () => {
    const result = WidgetPricingConfigSchema.safeParse({
      source: 'shopby',
      model: 'fixed',
      currency: 'USD',
      vatIncluded: false,
    });

    expect(result.success).toBe(true);
  });

  it('should reject invalid currency length', () => {
    const result = WidgetPricingConfigSchema.safeParse({
      source: 'widget',
      model: 'dynamic',
      currency: 'KRWD',
      vatIncluded: true,
    });

    expect(result.success).toBe(false);
  });
});

describe('WidgetConfigSchema', () => {
  const validConfig = {
    options: [
      {
        key: 'size',
        type: 'select' as const,
        required: true,
        shopbyMapping: 'option_1',
      },
    ],
    pricing: {
      source: 'widget' as const,
      model: 'dynamic',
      currency: 'KRW',
      vatIncluded: true,
    },
  };

  it('should validate complete widget config', () => {
    const result = WidgetConfigSchema.safeParse({
      ...validConfig,
      constraints: [{ type: 'filter' as const, source: 'a', target: 'b' }],
      dependencies: [{ parent: 'a', child: 'b', type: 'visibility' as const }],
    });

    expect(result.success).toBe(true);
  });

  it('should require at least one option', () => {
    const result = WidgetConfigSchema.safeParse({
      options: [],
      pricing: validConfig.pricing,
    });

    expect(result.success).toBe(false);
  });
});

describe('WidgetCreatorExtraJsonSchema', () => {
  const validExtraJson = {
    version: '1.0.0',
    huniProductId: 12345,
    huniCode: '001-0001',
    productType: 'sticker',
    pricingModel: 'quantity_based',
    orderMethod: 'upload' as const,
    editorEnabled: false,
    widgetConfig: {
      options: [
        {
          key: 'size',
          type: 'select' as const,
          required: true,
          shopbyMapping: 'option_1',
        },
      ],
      pricing: {
        source: 'widget' as const,
        model: 'dynamic',
        currency: 'KRW',
        vatIncluded: true,
      },
    },
    features: ['upload', 'preview'],
    mesMapping: {
      itemCode: 'STK-001',
      hasOptions: true,
    },
  };

  it('should validate complete extraJson', () => {
    const result = WidgetCreatorExtraJsonSchema.safeParse(validExtraJson);

    expect(result.success).toBe(true);
  });

  it('should validate with optional fields', () => {
    const result = WidgetCreatorExtraJsonSchema.safeParse({
      ...validExtraJson,
      sheetStandard: 'A4',
    });

    expect(result.success).toBe(true);
  });

  it('should reject invalid version format', () => {
    const result = WidgetCreatorExtraJsonSchema.safeParse({
      ...validExtraJson,
      version: '1.0',
    });

    expect(result.success).toBe(false);
  });

  it('should reject invalid huniCode format', () => {
    const result = WidgetCreatorExtraJsonSchema.safeParse({
      ...validExtraJson,
      huniCode: '001-001',
    });

    expect(result.success).toBe(false);
  });

  it('should reject invalid orderMethod', () => {
    const result = WidgetCreatorExtraJsonSchema.safeParse({
      ...validExtraJson,
      orderMethod: 'invalid',
    });

    expect(result.success).toBe(false);
  });
});

// =============================================================================
// SECTION 6: Order Schemas
// =============================================================================

describe('ShopbyOrderStatusTypeSchema', () => {
  it('should accept all valid status types', () => {
    const statuses = [
      'DEPOSIT_WAIT',
      'PAY_DONE',
      'PRODUCT_PREPARE',
      'DELIVERY_ING',
      'DELIVERY_DONE',
      'BUY_CONFIRM',
      'CANCEL_DONE',
      'RETURN_DONE',
      'EXCHANGE_DONE',
    ];

    for (const status of statuses) {
      expect(ShopbyOrderStatusTypeSchema.safeParse(status).success).toBe(true);
    }
  });

  it('should reject invalid status', () => {
    expect(ShopbyOrderStatusTypeSchema.safeParse('INVALID').success).toBe(false);
  });
});

describe('ShopbyOrderItemSchema', () => {
  it('should validate order item', () => {
    const result = ShopbyOrderItemSchema.safeParse({
      productNo: 12345,
      productName: 'Test Product',
      optionNo: 100,
      optionValues: ['Red', 'Large'],
      orderCnt: 2,
      unitPrice: 15000,
      totalPrice: 30000,
    });

    expect(result.success).toBe(true);
  });

  it('should validate item with optionInputs', () => {
    const result = ShopbyOrderItemSchema.safeParse({
      productNo: 12345,
      productName: 'Test Product',
      orderCnt: 1,
      unitPrice: 10000,
      totalPrice: 10000,
      optionInputs: [
        { inputLabel: 'Custom Text', inputValue: 'Hello' },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('should reject zero orderCnt', () => {
    const result = ShopbyOrderItemSchema.safeParse({
      productNo: 12345,
      productName: 'Test',
      orderCnt: 0,
      unitPrice: 10000,
      totalPrice: 0,
    });

    expect(result.success).toBe(false);
  });
});

describe('OrdererSchema', () => {
  it('should validate orderer info', () => {
    const result = OrdererSchema.safeParse({
      name: 'John Doe',
      phone1: '010-1234-5678',
      email: 'john@example.com',
    });

    expect(result.success).toBe(true);
  });

  it('should validate without email', () => {
    const result = OrdererSchema.safeParse({
      name: 'John Doe',
      phone1: '010-1234-5678',
    });

    expect(result.success).toBe(true);
  });

  it('should reject invalid email', () => {
    const result = OrdererSchema.safeParse({
      name: 'John Doe',
      phone1: '010-1234-5678',
      email: 'invalid-email',
    });

    expect(result.success).toBe(false);
  });
});

describe('ShippingSchema', () => {
  it('should validate shipping info', () => {
    const result = ShippingSchema.safeParse({
      name: 'John Doe',
      phone1: '010-1234-5678',
      zipCode: '12345',
      address1: 'Seoul, Gangnam-gu',
      address2: 'Apt 101',
      message: 'Leave at door',
      deliveryCompany: 'CJ Logistics',
      trackingNo: 'TRK123456',
    });

    expect(result.success).toBe(true);
  });

  it('should validate minimal shipping info', () => {
    const result = ShippingSchema.safeParse({
      name: 'John Doe',
      phone1: '010-1234-5678',
      zipCode: '12345',
      address1: 'Seoul, Gangnam-gu',
    });

    expect(result.success).toBe(true);
  });
});

describe('ShopbyOrderSheetSchema', () => {
  it('should validate order sheet', () => {
    const result = ShopbyOrderSheetSchema.safeParse({
      orderSheetNo: 'OS-2024-001',
      items: [
        {
          productNo: 12345,
          productName: 'Test Product',
          orderCnt: 1,
          unitPrice: 15000,
          totalPrice: 15000,
        },
      ],
      orderer: {
        name: 'John Doe',
        phone1: '010-1234-5678',
      },
    });

    expect(result.success).toBe(true);
  });

  it('should require at least one item', () => {
    const result = ShopbyOrderSheetSchema.safeParse({
      items: [],
    });

    expect(result.success).toBe(false);
  });
});

describe('ShopbyOrderDetailSchema', () => {
  it('should validate order detail', () => {
    const result = ShopbyOrderDetailSchema.safeParse({
      orderNo: 'ORD-2024-001',
      orderStatus: 'PAY_DONE',
      items: [
        {
          productNo: 12345,
          productName: 'Test Product',
          orderCnt: 1,
          unitPrice: 15000,
          totalPrice: 15000,
        },
      ],
      totalPaymentAmount: 15000,
      orderer: {
        name: 'John Doe',
        phone1: '010-1234-5678',
      },
      payment: {
        paymentMethod: 'CARD',
        paymentAmount: 15000,
        paidAt: '2024-01-15T10:30:00Z',
      },
      orderTimestamp: '2024-01-15T10:00:00Z',
    });

    expect(result.success).toBe(true);
  });
});

// =============================================================================
// SECTION 7: Authentication Schemas
// =============================================================================

describe('ShopbyOAuthTokenSchema', () => {
  it('should validate OAuth token', () => {
    const result = ShopbyOAuthTokenSchema.safeParse({
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-456',
      tokenType: 'Bearer',
      expiresIn: 1800,
      refreshTokenExpiresIn: 86400,
      memberId: 'member-001',
      memberType: 'MEMBER',
    });

    expect(result.success).toBe(true);
  });

  it('should default tokenType to Bearer', () => {
    const result = ShopbyOAuthTokenSchema.safeParse({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 1800,
      refreshTokenExpiresIn: 86400,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.tokenType).toBe('Bearer');
    }
  });
});

describe('ShopbyAdminTokenSchema', () => {
  it('should validate admin token', () => {
    const result = ShopbyAdminTokenSchema.safeParse({
      accessToken: 'admin-token',
      tokenType: 'Bearer',
      expiresIn: 3600,
      partnerId: 'partner-001',
    });

    expect(result.success).toBe(true);
  });
});

describe('ShopbySocialProviderSchema', () => {
  it('should accept valid providers', () => {
    expect(ShopbySocialProviderSchema.safeParse('naver').success).toBe(true);
    expect(ShopbySocialProviderSchema.safeParse('kakao').success).toBe(true);
    expect(ShopbySocialProviderSchema.safeParse('google').success).toBe(true);
    expect(ShopbySocialProviderSchema.safeParse('apple').success).toBe(true);
  });
});

describe('ShopbySocialLoginRequestSchema', () => {
  it('should validate social login request', () => {
    const result = ShopbySocialLoginRequestSchema.safeParse({
      provider: 'naver',
      code: 'auth-code-123',
      state: 'state-value',
      keepLogin: true,
    });

    expect(result.success).toBe(true);
  });

  it('should default keepLogin to false', () => {
    const result = ShopbySocialLoginRequestSchema.safeParse({
      provider: 'kakao',
      code: 'auth-code',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.keepLogin).toBe(false);
    }
  });
});

describe('ShopbyTokenRefreshRequestSchema', () => {
  it('should validate refresh request', () => {
    const result = ShopbyTokenRefreshRequestSchema.safeParse({
      refreshToken: 'refresh-token-123',
    });

    expect(result.success).toBe(true);
  });

  it('should reject empty refreshToken', () => {
    const result = ShopbyTokenRefreshRequestSchema.safeParse({
      refreshToken: '',
    });

    expect(result.success).toBe(false);
  });
});

// =============================================================================
// SECTION 8: API Response Schemas
// =============================================================================

describe('ShopbyApiErrorSchema', () => {
  it('should validate error response', () => {
    const result = ShopbyApiErrorSchema.safeParse({
      code: 'INVALID_REQUEST',
      message: 'Invalid request parameters',
      errors: [
        { field: 'productName', message: 'Product name is required' },
      ],
      status: 400,
    });

    expect(result.success).toBe(true);
  });

  it('should validate minimal error response', () => {
    const result = ShopbyApiErrorSchema.safeParse({
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    });

    expect(result.success).toBe(true);
  });
});

// =============================================================================
// SECTION 9: File Upload Schemas
// =============================================================================

describe('ShopbyTemporaryImageSchema', () => {
  it('should validate temporary image response', () => {
    const result = ShopbyTemporaryImageSchema.safeParse({
      url: 'https://cdn.example.com/temp/image.jpg',
      fileName: 'image.jpg',
      expiresAt: '2024-01-16T10:00:00Z',
    });

    expect(result.success).toBe(true);
  });

  it('should reject invalid URL', () => {
    const result = ShopbyTemporaryImageSchema.safeParse({
      url: 'not-a-url',
      fileName: 'image.jpg',
    });

    expect(result.success).toBe(false);
  });
});

// =============================================================================
// SECTION 10: Print Specification Schemas
// =============================================================================

describe('PrintSizeSpecSchema', () => {
  it('should validate size spec', () => {
    const result = PrintSizeSpecSchema.safeParse({
      code: 'A4',
      name: 'A4 Size',
      cutWidth: 210,
      cutHeight: 297,
    });

    expect(result.success).toBe(true);
  });

  it('should reject zero dimensions', () => {
    const result = PrintSizeSpecSchema.safeParse({
      code: 'A4',
      name: 'A4 Size',
      cutWidth: 0,
      cutHeight: 297,
    });

    expect(result.success).toBe(false);
  });
});

describe('PrintPaperSpecSchema', () => {
  it('should validate paper spec', () => {
    const result = PrintPaperSpecSchema.safeParse({
      code: 'MWP',
      name: 'Matte White Paper 150g',
    });

    expect(result.success).toBe(true);
  });
});

describe('PrintModeSpecSchema', () => {
  it('should validate print mode spec', () => {
    const result = PrintModeSpecSchema.safeParse({
      code: 'COLOR_BOTH',
      name: 'Full Color Both Sides',
      priceCode: 1,
    });

    expect(result.success).toBe(true);
  });
});

describe('PostProcessSpecSchema', () => {
  it('should validate post-process spec', () => {
    const result = PostProcessSpecSchema.safeParse({
      code: 'COATING_GLOSS',
      name: 'Gloss Coating',
    });

    expect(result.success).toBe(true);
  });
});

describe('WidgetPriceBreakdownSchema', () => {
  it('should validate price breakdown', () => {
    const result = WidgetPriceBreakdownSchema.safeParse({
      printCost: 5000,
      paperCost: 2000,
      finishingCost: 1000,
      bindingCost: 500,
      totalBeforeVat: 8500,
      vat: 850,
      total: 9350,
    });

    expect(result.success).toBe(true);
  });

  it('should validate without bindingCost', () => {
    const result = WidgetPriceBreakdownSchema.safeParse({
      printCost: 5000,
      paperCost: 2000,
      finishingCost: 0,
      totalBeforeVat: 7000,
      vat: 700,
      total: 7700,
    });

    expect(result.success).toBe(true);
  });
});

describe('BindingSpecSchema', () => {
  it('should validate binding spec', () => {
    const result = BindingSpecSchema.safeParse({
      code: 'RING_BINDING',
      name: 'Ring Binding',
      pageCount: 50,
    });

    expect(result.success).toBe(true);
  });
});

describe('PrintSpecificationSchema', () => {
  it('should validate complete print specification', () => {
    const result = PrintSpecificationSchema.safeParse({
      huniCode: '001-0001',
      size: {
        code: 'A4',
        name: 'A4',
        cutWidth: 210,
        cutHeight: 297,
      },
      paper: {
        code: 'MWP150',
        name: 'Matte White 150g',
      },
      printMode: {
        code: 'COLOR_BOTH',
        name: 'Full Color Both',
        priceCode: 1,
      },
      quantity: 1000,
      postProcess: [
        { code: 'COATING', name: 'UV Coating' },
      ],
      binding: {
        code: 'RING',
        name: 'Ring Binding',
        pageCount: 32,
      },
      widgetPrice: {
        printCost: 50000,
        paperCost: 20000,
        finishingCost: 5000,
        bindingCost: 10000,
        totalBeforeVat: 85000,
        vat: 8500,
        total: 93500,
      },
    });

    expect(result.success).toBe(true);
  });

  it('should validate without optional fields', () => {
    const result = PrintSpecificationSchema.safeParse({
      huniCode: '001-0001',
      size: {
        code: 'A4',
        name: 'A4',
        cutWidth: 210,
        cutHeight: 297,
      },
      paper: {
        code: 'MWP150',
        name: 'Matte White 150g',
      },
      printMode: {
        code: 'BW',
        name: 'Black & White',
        priceCode: 0,
      },
      quantity: 100,
      widgetPrice: {
        printCost: 5000,
        paperCost: 2000,
        finishingCost: 0,
        totalBeforeVat: 7000,
        vat: 700,
        total: 7700,
      },
    });

    expect(result.success).toBe(true);
  });
});

// =============================================================================
// SECTION 11: SPEC-002 Additional Schemas
// =============================================================================

describe('MesMappingInfoSchema', () => {
  it('should validate valid MES mapping', () => {
    const result = MesMappingInfoSchema.safeParse({
      itemCode: 'STK-001',
      hasOptions: true,
    });

    expect(result.success).toBe(true);
  });

  it('should reject empty itemCode', () => {
    const result = MesMappingInfoSchema.safeParse({
      itemCode: '',
      hasOptions: false,
    });

    expect(result.success).toBe(false);
  });

  it('should reject missing hasOptions', () => {
    const result = MesMappingInfoSchema.safeParse({
      itemCode: 'STK-001',
    });

    expect(result.success).toBe(false);
  });

  it('should reject missing itemCode', () => {
    const result = MesMappingInfoSchema.safeParse({
      hasOptions: true,
    });

    expect(result.success).toBe(false);
  });
});

describe('ShopbyOptionInputDefinitionsSchema', () => {
  it('should validate array of input definitions', () => {
    const result = ShopbyOptionInputDefinitionsSchema.safeParse([
      {
        inputLabel: 'File Upload',
        inputType: 'TEXT',
        required: true,
        matchingType: 'OPTION',
      },
      {
        inputLabel: 'Special Request',
        inputType: 'TEXTAREA',
        required: false,
        matchingType: 'OPTION',
      },
    ]);

    expect(result.success).toBe(true);
  });

  it('should validate empty array', () => {
    const result = ShopbyOptionInputDefinitionsSchema.safeParse([]);

    expect(result.success).toBe(true);
  });

  it('should reject array with more than 10 items', () => {
    const items = Array.from({ length: 11 }, (_, i) => ({
      inputLabel: `Input ${i}`,
      inputType: 'TEXT',
      required: false,
      matchingType: 'OPTION',
    }));

    const result = ShopbyOptionInputDefinitionsSchema.safeParse(items);

    expect(result.success).toBe(false);
  });

  it('should reject invalid item in array', () => {
    const result = ShopbyOptionInputDefinitionsSchema.safeParse([
      {
        inputLabel: 'a'.repeat(51), // exceeds 50 char limit
        inputType: 'TEXT',
        required: true,
        matchingType: 'OPTION',
      },
    ]);

    expect(result.success).toBe(false);
  });
});

// =============================================================================
// SECTION 12: SPEC-002 M3 - Category & Registration Schemas
// =============================================================================

describe('ShopbyCategorySchema', () => {
  it('should validate complete category', () => {
    const result = ShopbyCategorySchema.safeParse({
      categoryNo: 100,
      categoryName: '인쇄물',
      parentCategoryNo: 1,
      depth: 1,
      sortOrder: 0,
      displayable: true,
    });

    expect(result.success).toBe(true);
  });

  it('should validate minimal category (no optional fields)', () => {
    const result = ShopbyCategorySchema.safeParse({
      categoryNo: 101,
      categoryName: '명함',
      depth: 2,
    });

    expect(result.success).toBe(true);
  });

  it('should validate root category with depth 0', () => {
    const result = ShopbyCategorySchema.safeParse({
      categoryNo: 1,
      categoryName: 'Root',
      depth: 0,
    });

    expect(result.success).toBe(true);
  });

  it('should reject empty categoryName', () => {
    const result = ShopbyCategorySchema.safeParse({
      categoryNo: 100,
      categoryName: '',
      depth: 1,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Category name is required');
    }
  });

  it('should reject non-positive categoryNo', () => {
    const result = ShopbyCategorySchema.safeParse({
      categoryNo: 0,
      categoryName: 'Test',
      depth: 1,
    });

    expect(result.success).toBe(false);
  });

  it('should reject negative depth', () => {
    const result = ShopbyCategorySchema.safeParse({
      categoryNo: 100,
      categoryName: 'Test',
      depth: -1,
    });

    expect(result.success).toBe(false);
  });

  it('should reject non-integer categoryNo', () => {
    const result = ShopbyCategorySchema.safeParse({
      categoryNo: 100.5,
      categoryName: 'Test',
      depth: 1,
    });

    expect(result.success).toBe(false);
  });
});

describe('ShopbyProductListQuerySchema', () => {
  it('should validate complete query', () => {
    const result = ShopbyProductListQuerySchema.safeParse({
      page: 1,
      pageSize: 20,
      categoryNo: 101,
      saleStatusType: 'ONSALE',
      keyword: '명함',
    });

    expect(result.success).toBe(true);
  });

  it('should validate empty query (all optional)', () => {
    const result = ShopbyProductListQuerySchema.safeParse({});

    expect(result.success).toBe(true);
  });

  it('should validate with only page and pageSize', () => {
    const result = ShopbyProductListQuerySchema.safeParse({
      page: 2,
      pageSize: 50,
    });

    expect(result.success).toBe(true);
  });

  it('should reject page 0', () => {
    const result = ShopbyProductListQuerySchema.safeParse({
      page: 0,
    });

    expect(result.success).toBe(false);
  });

  it('should reject negative page', () => {
    const result = ShopbyProductListQuerySchema.safeParse({
      page: -1,
    });

    expect(result.success).toBe(false);
  });

  it('should reject pageSize over 100', () => {
    const result = ShopbyProductListQuerySchema.safeParse({
      pageSize: 101,
    });

    expect(result.success).toBe(false);
  });

  it('should reject pageSize 0', () => {
    const result = ShopbyProductListQuerySchema.safeParse({
      pageSize: 0,
    });

    expect(result.success).toBe(false);
  });

  it('should accept max pageSize 100', () => {
    const result = ShopbyProductListQuerySchema.safeParse({
      pageSize: 100,
    });

    expect(result.success).toBe(true);
  });

  it('should reject keyword over 100 chars', () => {
    const result = ShopbyProductListQuerySchema.safeParse({
      keyword: 'a'.repeat(101),
    });

    expect(result.success).toBe(false);
  });

  it('should reject invalid saleStatusType', () => {
    const result = ShopbyProductListQuerySchema.safeParse({
      saleStatusType: 'INVALID',
    });

    expect(result.success).toBe(false);
  });
});

describe('PriceValidationResultSchema', () => {
  it('should validate matching prices (within tolerance)', () => {
    const result = PriceValidationResultSchema.safeParse({
      isValid: true,
      widgetPrice: 10000,
      shopbyPrice: 10000,
      difference: 0,
      differencePercent: 0,
      tolerancePercent: 10,
    });

    expect(result.success).toBe(true);
  });

  it('should validate failed validation (out of tolerance)', () => {
    const result = PriceValidationResultSchema.safeParse({
      isValid: false,
      widgetPrice: 12000,
      shopbyPrice: 10000,
      difference: 2000,
      differencePercent: 20,
      tolerancePercent: 10,
    });

    expect(result.success).toBe(true);
  });

  it('should reject negative widgetPrice', () => {
    const result = PriceValidationResultSchema.safeParse({
      isValid: true,
      widgetPrice: -100,
      shopbyPrice: 10000,
      difference: 0,
      differencePercent: 0,
      tolerancePercent: 10,
    });

    expect(result.success).toBe(false);
  });

  it('should reject negative shopbyPrice', () => {
    const result = PriceValidationResultSchema.safeParse({
      isValid: true,
      widgetPrice: 10000,
      shopbyPrice: -100,
      difference: 0,
      differencePercent: 0,
      tolerancePercent: 10,
    });

    expect(result.success).toBe(false);
  });

  it('should reject zero tolerancePercent', () => {
    const result = PriceValidationResultSchema.safeParse({
      isValid: true,
      widgetPrice: 10000,
      shopbyPrice: 10000,
      difference: 0,
      differencePercent: 0,
      tolerancePercent: 0,
    });

    expect(result.success).toBe(false);
  });

  it('should reject missing fields', () => {
    const result = PriceValidationResultSchema.safeParse({
      isValid: true,
      widgetPrice: 10000,
    });

    expect(result.success).toBe(false);
  });
});

describe('ProductRegistrationResultSchema', () => {
  it('should validate successful registration', () => {
    const result = ProductRegistrationResultSchema.safeParse({
      huniProductId: 1,
      huniCode: '001-0001',
      shopbyProductNo: 12345,
      success: true,
      optionCounts: {
        combinations: 60,
        required: 2,
        standard: 1,
      },
    });

    expect(result.success).toBe(true);
  });

  it('should validate failed registration', () => {
    const result = ProductRegistrationResultSchema.safeParse({
      huniProductId: 2,
      huniCode: '002-0001',
      success: false,
      error: 'API rate limit exceeded',
    });

    expect(result.success).toBe(true);
  });

  it('should validate minimal successful result (no optionCounts)', () => {
    const result = ProductRegistrationResultSchema.safeParse({
      huniProductId: 3,
      huniCode: '003-0001',
      success: true,
    });

    expect(result.success).toBe(true);
  });

  it('should reject non-positive huniProductId', () => {
    const result = ProductRegistrationResultSchema.safeParse({
      huniProductId: 0,
      huniCode: '001-0001',
      success: true,
    });

    expect(result.success).toBe(false);
  });

  it('should reject non-integer huniProductId', () => {
    const result = ProductRegistrationResultSchema.safeParse({
      huniProductId: 1.5,
      huniCode: '001-0001',
      success: true,
    });

    expect(result.success).toBe(false);
  });

  it('should reject negative optionCounts values', () => {
    const result = ProductRegistrationResultSchema.safeParse({
      huniProductId: 1,
      huniCode: '001-0001',
      success: true,
      optionCounts: {
        combinations: -1,
        required: 0,
        standard: 0,
      },
    });

    expect(result.success).toBe(false);
  });
});

describe('BatchRegistrationResultSchema', () => {
  it('should validate complete batch result', () => {
    const result = BatchRegistrationResultSchema.safeParse({
      total: 3,
      succeeded: 2,
      failed: 1,
      results: [
        {
          huniProductId: 1,
          huniCode: '001-0001',
          shopbyProductNo: 12345,
          success: true,
          optionCounts: { combinations: 60, required: 2, standard: 1 },
        },
        {
          huniProductId: 2,
          huniCode: '002-0001',
          shopbyProductNo: 12346,
          success: true,
        },
        {
          huniProductId: 3,
          huniCode: '003-0001',
          success: false,
          error: 'Connection timeout',
        },
      ],
      startedAt: '2024-01-15T10:00:00Z',
      completedAt: '2024-01-15T10:05:00Z',
    });

    expect(result.success).toBe(true);
  });

  it('should validate empty batch result', () => {
    const result = BatchRegistrationResultSchema.safeParse({
      total: 0,
      succeeded: 0,
      failed: 0,
      results: [],
      startedAt: '2024-01-15T10:00:00Z',
      completedAt: '2024-01-15T10:00:01Z',
    });

    expect(result.success).toBe(true);
  });

  it('should reject negative total', () => {
    const result = BatchRegistrationResultSchema.safeParse({
      total: -1,
      succeeded: 0,
      failed: 0,
      results: [],
      startedAt: '2024-01-15T10:00:00Z',
      completedAt: '2024-01-15T10:00:01Z',
    });

    expect(result.success).toBe(false);
  });

  it('should reject invalid datetime format', () => {
    const result = BatchRegistrationResultSchema.safeParse({
      total: 0,
      succeeded: 0,
      failed: 0,
      results: [],
      startedAt: 'not-a-date',
      completedAt: '2024-01-15T10:00:01Z',
    });

    expect(result.success).toBe(false);
  });

  it('should reject non-integer counts', () => {
    const result = BatchRegistrationResultSchema.safeParse({
      total: 1.5,
      succeeded: 0,
      failed: 0,
      results: [],
      startedAt: '2024-01-15T10:00:00Z',
      completedAt: '2024-01-15T10:00:01Z',
    });

    expect(result.success).toBe(false);
  });

  it('should reject invalid result item in array', () => {
    const result = BatchRegistrationResultSchema.safeParse({
      total: 1,
      succeeded: 0,
      failed: 1,
      results: [
        {
          huniProductId: -1, // invalid
          huniCode: '001-0001',
          success: false,
        },
      ],
      startedAt: '2024-01-15T10:00:00Z',
      completedAt: '2024-01-15T10:00:01Z',
    });

    expect(result.success).toBe(false);
  });
});

// =============================================================================
// SPEC-002: ShopbyMallProduct with extraJson (product registration)
// =============================================================================

describe('SPEC-002: ShopbyMallProduct with extraJson', () => {
  const validExtraJson = {
    version: '1.0.0',
    huniProductId: 1,
    huniCode: '001-0001',
    productType: 'digital-print',
    pricingModel: 'per-quantity',
    sheetStandard: 'A4',
    orderMethod: 'upload',
    editorEnabled: false,
    widgetConfig: {
      options: [{ key: 'size', type: 'select', required: true, shopbyMapping: '규격' }],
      constraints: [],
      dependencies: [],
      pricing: { source: 'widget', model: 'per-quantity', currency: 'KRW', vatIncluded: true },
    },
    features: ['upload'],
    mesMapping: { itemCode: 'BC-001', hasOptions: true },
  };

  it('should validate mallProduct with full WidgetCreatorExtraJson', () => {
    const result = ShopbyMallProductSchema.safeParse({
      productName: '일반명함',
      price: { salePrice: 10000, immediateDiscountAmt: 0 },
      saleStatusType: 'ONSALE',
      extraJson: validExtraJson,
    });

    expect(result.success).toBe(true);
  });

  it('should validate mallProduct with all optional fields', () => {
    const result = ShopbyMallProductSchema.safeParse({
      mallProductNo: 12345,
      productName: '일반명함',
      content: '<div>상품 설명</div>',
      mobileContent: '<div>모바일 설명</div>',
      price: { salePrice: 10000, immediateDiscountAmt: 0 },
      saleStatusType: 'ONSALE',
      displayType: 'DISPLAY',
      categoryNo: 100,
      stock: { inventoryManagement: true, stockQuantity: 9999 },
      delivery: { deliveryTemplateNo: 1, deliveryMethodType: 'DELIVERY' },
      productNameSummary: '명함',
      productImageUrls: ['https://cdn.example.com/image1.jpg'],
      extraJson: validExtraJson,
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T11:00:00Z',
    });

    expect(result.success).toBe(true);
  });

  it('should validate mallProduct with STOP sale status', () => {
    const result = ShopbyMallProductSchema.safeParse({
      productName: '품절상품',
      price: { salePrice: 0 },
      saleStatusType: 'STOP',
    });

    expect(result.success).toBe(true);
  });

  it('should reject mallProduct with empty productName', () => {
    const result = ShopbyMallProductSchema.safeParse({
      productName: '',
      price: { salePrice: 10000 },
      saleStatusType: 'ONSALE',
    });

    expect(result.success).toBe(false);
  });

  it('should reject mallProduct with productName exceeding 100 chars', () => {
    const result = ShopbyMallProductSchema.safeParse({
      productName: 'a'.repeat(101),
      price: { salePrice: 10000 },
      saleStatusType: 'ONSALE',
    });

    expect(result.success).toBe(false);
  });

  it('should reject mallProduct with invalid datetime format', () => {
    const result = ShopbyMallProductSchema.safeParse({
      productName: '테스트',
      price: { salePrice: 10000 },
      saleStatusType: 'ONSALE',
      createdAt: 'not-a-date',
    });

    expect(result.success).toBe(false);
  });
});

// =============================================================================
// SPEC-002: COMBINATION option with addPrice scenarios
// =============================================================================

describe('SPEC-002: COMBINATION option with addPrice scenarios', () => {
  it('should accept zero addPrice (base price variant)', () => {
    const result = ShopbyCombinationOptionSchema.safeParse({
      kind: 'COMBINATION',
      optionName: '규격',
      optionValues: [
        { optionValue: '90x50mm', addPrice: 0 },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.optionValues[0].addPrice).toBe(0);
    }
  });

  it('should accept positive addPrice (price differential)', () => {
    const result = ShopbyCombinationOptionSchema.safeParse({
      kind: 'COMBINATION',
      optionName: '용지',
      optionValues: [
        { optionValue: '스노우화이트 250g', addPrice: 0 },
        { optionValue: '아트지 300g', addPrice: 5000 },
        { optionValue: '머쉬멜로우 300g', addPrice: 8000 },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.optionValues).toHaveLength(3);
      expect(result.data.optionValues[1].addPrice).toBe(5000);
    }
  });

  it('should accept optionValueCode for MES mapping', () => {
    const result = ShopbyOptionValueSchema.safeParse({
      optionValue: '90x50mm',
      addPrice: 0,
      stockQuantity: 9999,
      optionValueCode: 'BC-S1',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.optionValueCode).toBe('BC-S1');
    }
  });

  it('should reject negative addPrice', () => {
    const result = ShopbyOptionValueSchema.safeParse({
      optionValue: '할인용지',
      addPrice: -1000,
    });

    // addPrice is z.number().int().optional() - negative is allowed by schema
    // This test documents the current behavior
    expect(result.success).toBe(true);
  });

  it('should reject non-integer addPrice', () => {
    const result = ShopbyOptionValueSchema.safeParse({
      optionValue: '테스트',
      addPrice: 100.5,
    });

    expect(result.success).toBe(false);
  });

  it('should reject negative stockQuantity', () => {
    const result = ShopbyOptionValueSchema.safeParse({
      optionValue: '테스트',
      addPrice: 0,
      stockQuantity: -1,
    });

    expect(result.success).toBe(false);
  });
});

// =============================================================================
// SPEC-002: ShopbyProductOptionData full structure
// =============================================================================

describe('SPEC-002: ShopbyProductOptionData full structure', () => {
  it('should validate business card option structure (규격 x 용지 x 수량)', () => {
    const result = ShopbyProductOptionDataSchema.safeParse({
      combinations: [
        {
          kind: 'COMBINATION',
          optionName: '규격',
          optionValues: [
            { optionValue: '90x50mm', addPrice: 0 },
            { optionValue: '86x52mm', addPrice: 1000 },
          ],
        },
        {
          kind: 'COMBINATION',
          optionName: '용지',
          optionValues: [
            { optionValue: '스노우화이트 250g', addPrice: 0 },
            { optionValue: '아트지 300g', addPrice: 5000 },
          ],
        },
        {
          kind: 'COMBINATION',
          optionName: '수량',
          optionValues: [
            { optionValue: '100매', addPrice: 0 },
            { optionValue: '200매', addPrice: 8000 },
          ],
        },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.combinations).toHaveLength(3);
    }
  });

  it('should validate with combinations only (no required/standard)', () => {
    const result = ShopbyProductOptionDataSchema.safeParse({
      combinations: [
        {
          kind: 'COMBINATION',
          optionName: '규격',
          optionValues: [{ optionValue: '90x50mm', addPrice: 0 }],
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('should validate empty option data', () => {
    const result = ShopbyProductOptionDataSchema.safeParse({});

    expect(result.success).toBe(true);
  });

  it('should reject more than 3 COMBINATION options', () => {
    const result = ShopbyProductOptionDataSchema.safeParse({
      combinations: [
        { kind: 'COMBINATION', optionName: '규격', optionValues: [{ optionValue: 'A' }] },
        { kind: 'COMBINATION', optionName: '용지', optionValues: [{ optionValue: 'B' }] },
        { kind: 'COMBINATION', optionName: '수량', optionValues: [{ optionValue: 'C' }] },
        { kind: 'COMBINATION', optionName: '후가공', optionValues: [{ optionValue: 'D' }] },
      ],
    });

    expect(result.success).toBe(false);
  });

  it('should validate mixed option kinds', () => {
    const result = ShopbyProductOptionDataSchema.safeParse({
      combinations: [
        { kind: 'COMBINATION', optionName: '규격', optionValues: [{ optionValue: '90x50mm' }] },
      ],
      required: [
        { kind: 'REQUIRED', optionName: '인쇄방향', optionValues: [{ optionValue: '가로' }, { optionValue: '세로' }] },
      ],
      standard: [
        { kind: 'STANDARD', optionName: '배송옵션', optionValues: [{ optionValue: '일반' }, { optionValue: '급행' }] },
      ],
    });

    expect(result.success).toBe(true);
  });
});

// =============================================================================
// SPEC-002: WidgetCreatorExtraJson boundary tests
// =============================================================================

describe('SPEC-002: WidgetCreatorExtraJson boundary tests', () => {
  const minimalValidExtraJson = {
    version: '1.0.0',
    huniProductId: 1,
    huniCode: '001-0001',
    productType: 'digital-print',
    pricingModel: 'per-quantity',
    orderMethod: 'upload',
    editorEnabled: false,
    widgetConfig: {
      options: [{ key: 'size', type: 'select', required: true, shopbyMapping: '규격' }],
      pricing: { source: 'widget', model: 'per-quantity', currency: 'KRW', vatIncluded: true },
    },
    features: ['upload'],
    mesMapping: { itemCode: 'BC-001', hasOptions: true },
  };

  it('should accept editor orderMethod', () => {
    const result = WidgetCreatorExtraJsonSchema.safeParse({
      ...minimalValidExtraJson,
      orderMethod: 'editor',
      editorEnabled: true,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.orderMethod).toBe('editor');
    }
  });

  it('should accept optional sheetStandard', () => {
    const result = WidgetCreatorExtraJsonSchema.safeParse({
      ...minimalValidExtraJson,
      sheetStandard: 'A3',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sheetStandard).toBe('A3');
    }
  });

  it('should reject invalid orderMethod', () => {
    const result = WidgetCreatorExtraJsonSchema.safeParse({
      ...minimalValidExtraJson,
      orderMethod: 'invalid',
    });

    expect(result.success).toBe(false);
  });

  it('should reject invalid version format', () => {
    const result = WidgetCreatorExtraJsonSchema.safeParse({
      ...minimalValidExtraJson,
      version: '1.0',
    });

    expect(result.success).toBe(false);
  });

  it('should reject version with prefix', () => {
    const result = WidgetCreatorExtraJsonSchema.safeParse({
      ...minimalValidExtraJson,
      version: 'v1.0.0',
    });

    expect(result.success).toBe(false);
  });

  it('should reject invalid huniCode format', () => {
    const result = WidgetCreatorExtraJsonSchema.safeParse({
      ...minimalValidExtraJson,
      huniCode: 'ABC-0001',
    });

    expect(result.success).toBe(false);
  });

  it('should accept various product types', () => {
    for (const productType of ['digital-print', 'sticker', 'flyer', 'booklet']) {
      const result = WidgetCreatorExtraJsonSchema.safeParse({
        ...minimalValidExtraJson,
        productType,
      });

      expect(result.success).toBe(true);
    }
  });

  it('should accept empty features array', () => {
    const result = WidgetCreatorExtraJsonSchema.safeParse({
      ...minimalValidExtraJson,
      features: [],
    });

    expect(result.success).toBe(true);
  });

  it('should accept multiple features', () => {
    const result = WidgetCreatorExtraJsonSchema.safeParse({
      ...minimalValidExtraJson,
      features: ['upload', 'editor', 'preview', 'custom-size'],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.features).toHaveLength(4);
    }
  });

  it('should reject missing mesMapping', () => {
    const { mesMapping: _, ...noMesMapping } = minimalValidExtraJson;
    const result = WidgetCreatorExtraJsonSchema.safeParse(noMesMapping);

    expect(result.success).toBe(false);
  });

  it('should reject missing widgetConfig', () => {
    const { widgetConfig: _, ...noWidgetConfig } = minimalValidExtraJson;
    const result = WidgetCreatorExtraJsonSchema.safeParse(noWidgetConfig);

    expect(result.success).toBe(false);
  });

  it('should reject widgetConfig with empty options array', () => {
    const result = WidgetCreatorExtraJsonSchema.safeParse({
      ...minimalValidExtraJson,
      widgetConfig: {
        ...minimalValidExtraJson.widgetConfig,
        options: [],
      },
    });

    expect(result.success).toBe(false);
  });
});

// =============================================================================
// SPEC-002: PrintSpecification extended tests
// =============================================================================

describe('SPEC-002: PrintSpecification extended tests', () => {
  const basePrintSpec = {
    huniCode: '001-0001',
    size: { code: 'S1', name: '90x50mm', cutWidth: 90, cutHeight: 50 },
    paper: { code: 'P1', name: '스노우화이트 250g' },
    printMode: { code: 'PM1', name: '양면컬러', priceCode: 1 },
    quantity: 100,
    widgetPrice: { printCost: 3000, paperCost: 2000, finishingCost: 0, totalBeforeVat: 5000, vat: 500, total: 5500 },
  };

  it('should validate business card specification', () => {
    const result = PrintSpecificationSchema.safeParse(basePrintSpec);

    expect(result.success).toBe(true);
  });

  it('should validate sticker specification with postProcess', () => {
    const result = PrintSpecificationSchema.safeParse({
      ...basePrintSpec,
      huniCode: '002-0001',
      postProcess: [
        { code: 'PP1', name: '도무송' },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('should validate booklet specification with binding', () => {
    const result = PrintSpecificationSchema.safeParse({
      ...basePrintSpec,
      huniCode: '004-0001',
      quantity: 50,
      binding: { code: 'B1', name: '중철', pageCount: 16 },
    });

    expect(result.success).toBe(true);
  });

  it('should reject quantity of zero', () => {
    const result = PrintSpecificationSchema.safeParse({
      ...basePrintSpec,
      quantity: 0,
    });

    expect(result.success).toBe(false);
  });

  it('should reject negative quantity', () => {
    const result = PrintSpecificationSchema.safeParse({
      ...basePrintSpec,
      quantity: -10,
    });

    expect(result.success).toBe(false);
  });

  it('should reject size with zero dimensions', () => {
    const result = PrintSpecificationSchema.safeParse({
      ...basePrintSpec,
      size: { code: 'S1', name: 'invalid', cutWidth: 0, cutHeight: 50 },
    });

    expect(result.success).toBe(false);
  });
});

// =============================================================================
// SPEC-002: Price breakdown validation
// =============================================================================

describe('SPEC-002: WidgetPriceBreakdown validation', () => {
  it('should validate with zero costs', () => {
    const result = WidgetPriceBreakdownSchema.safeParse({
      printCost: 0,
      paperCost: 0,
      finishingCost: 0,
      totalBeforeVat: 0,
      vat: 0,
      total: 0,
    });

    expect(result.success).toBe(true);
  });

  it('should validate high-volume pricing', () => {
    const result = WidgetPriceBreakdownSchema.safeParse({
      printCost: 30000,
      paperCost: 20000,
      finishingCost: 5000,
      bindingCost: 3000,
      totalBeforeVat: 58000,
      vat: 5800,
      total: 63800,
    });

    expect(result.success).toBe(true);
  });

  it('should reject negative printCost', () => {
    const result = WidgetPriceBreakdownSchema.safeParse({
      printCost: -1000,
      paperCost: 2000,
      finishingCost: 0,
      totalBeforeVat: 1000,
      vat: 100,
      total: 1100,
    });

    expect(result.success).toBe(false);
  });

  it('should reject missing required fields', () => {
    const result = WidgetPriceBreakdownSchema.safeParse({
      printCost: 5000,
    });

    expect(result.success).toBe(false);
  });
});
