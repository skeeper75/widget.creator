/**
 * Unit tests for Shopby mapper functions
 *
 * Tests cover:
 * - Section 1: toShopbyProduct, fromShopbyOrder, toShopbyStatusNotification, mapToShopbyStatus
 * - Section 2: toMallProduct, fromMallProduct (full mallProduct transformations)
 * - Section 3: buildCombinationOptions, buildRequiredPrintModeOption, buildRequiredBindingOption, buildStandardPostProcessOption
 * - Section 4: buildDefaultOptionInputDefinitions, buildOptionInputValues
 * - Section 5: buildExtraJson, buildWidgetOptionMapping
 * - Section 6: parsePrintSpecFromOptionInputs, extractFileUrlFromOptionInputs, extractSpecialRequestFromOptionInputs
 * - Section 7: calculateAddPrice, findMinSellingPrice, buildPriceBreakdown
 */
import { describe, it, expect } from 'vitest';
import {
  toShopbyProduct,
  fromShopbyOrder,
  toShopbyProductWithCategory,
  toShopbyStatusNotification,
  mapToShopbyStatus,
  buildProductSyncRequest,
  toMallProduct,
  fromMallProduct,
  buildCombinationOptions,
  buildRequiredPrintModeOption,
  buildRequiredBindingOption,
  buildStandardPostProcessOption,
  buildDefaultOptionInputDefinitions,
  buildOptionInputValues,
  buildExtraJson,
  buildWidgetOptionMapping,
  parsePrintSpecFromOptionInputs,
  extractFileUrlFromOptionInputs,
  extractSpecialRequestFromOptionInputs,
  calculateAddPrice,
  findMinSellingPrice,
  buildPriceBreakdown,
} from '../mapper.js';
import type {
  ShopbyOrder,
  ProductForShopbySync,
  ShopbyCategoryMapping,
  ShopbyMallProduct,
  PrintSpecification,
  WidgetCreatorExtraJson,
} from '../types.js';
import type {
  HuniProductData,
  WidgetConfigData,
  SizeOptionData,
  PaperOptionData,
  QuantityTierData,
  PrintModeOptionData,
  PostProcessOptionData,
} from '../mapper.js';

describe('toShopbyProduct', () => {
  it('should map product name to productName', () => {
    const result = toShopbyProduct(
      { name: 'Test Product', huniCode: 'HC001' },
      15000
    );

    expect(result.productName).toBe('Test Product');
  });

  it('should map sellingPrice to salePrice', () => {
    const result = toShopbyProduct(
      { name: 'Test Product', huniCode: 'HC001' },
      25000
    );

    expect(result.salePrice).toBe(25000);
  });

  it('should set saleStatus to T by default', () => {
    const result = toShopbyProduct(
      { name: 'Test Product', huniCode: 'HC001' },
      10000
    );

    expect(result.saleStatus).toBe('T');
  });
});

describe('toShopbyProductWithCategory', () => {
  it('should include category number from mapping', () => {
    const product: ProductForShopbySync = {
      productId: 1,
      huniCode: 'HC001',
      shopbyId: null,
      name: 'Test Product',
      categoryId: 10,
      sellingPrice: 15000,
      description: 'A test product',
    };
    const categoryMapping: ShopbyCategoryMapping = {
      widgetBuilderCategoryId: 10,
      shopbyCategoryNo: 500,
      categoryName: 'Stickers',
    };

    const result = toShopbyProductWithCategory(product, categoryMapping);

    expect(result.categoryNo).toBe(500);
    expect(result.productDescription).toBe('A test product');
  });

  it('should handle null category mapping', () => {
    const product: ProductForShopbySync = {
      productId: 1,
      huniCode: 'HC001',
      shopbyId: null,
      name: 'Test Product',
      categoryId: 10,
      sellingPrice: 15000,
    };

    const result = toShopbyProductWithCategory(product, null);

    expect(result.categoryNo).toBeUndefined();
  });
});

describe('fromShopbyOrder', () => {
  const shopbyOrder: ShopbyOrder = {
    orderNo: 'SB-2024-001',
    productNo: 12345,
    optionValues: ['90x100', 'Art paper 80g', 'Color'],
    orderAmount: 45000,
    customerName: 'John Doe',
    customerEmail: 'john@example.com',
  };

  it('should map orderNo to externalOrderId', () => {
    const result = fromShopbyOrder(shopbyOrder);
    expect(result.externalOrderId).toBe('SB-2024-001');
  });

  it('should map orderAmount to totalPrice', () => {
    const result = fromShopbyOrder(shopbyOrder);
    expect(result.totalPrice).toBe(45000);
  });

  it('should map optionValues to selectedOptions', () => {
    const result = fromShopbyOrder(shopbyOrder);
    expect(result.selectedOptions).toEqual(['90x100', 'Art paper 80g', 'Color']);
  });

  it('should map customer information', () => {
    const result = fromShopbyOrder(shopbyOrder);
    expect(result.customerName).toBe('John Doe');
    expect(result.customerEmail).toBe('john@example.com');
  });
});

describe('toShopbyStatusNotification', () => {
  it('should create notification for order with shopbyOrderNo', () => {
    const order = { shopbyOrderNo: 'SB-001' };
    const result = toShopbyStatusNotification(order, 'DELIVERING');

    expect(result).not.toBeNull();
    expect(result!.orderNo).toBe('SB-001');
    expect(result!.status).toBe('DELIVERING');
    expect(result!.timestamp).toBeDefined();
  });

  it('should return null when shopbyOrderNo is null', () => {
    const order = { shopbyOrderNo: null };
    const result = toShopbyStatusNotification(order, 'DELIVERING');

    expect(result).toBeNull();
  });

  it('should include tracking info when provided', () => {
    const order = { shopbyOrderNo: 'SB-001' };
    const result = toShopbyStatusNotification(order, 'DELIVERING', {
      trackingNo: 'TRK-123',
      deliveryCompany: 'Express',
    });

    expect(result!.trackingNo).toBe('TRK-123');
    expect(result!.deliveryCompany).toBe('Express');
  });
});

describe('mapToShopbyStatus', () => {
  it('should map PENDING to PAYMENT_WAITING', () => {
    expect(mapToShopbyStatus('PENDING')).toBe('PAYMENT_WAITING');
  });

  it('should map CONFIRMED to PAYMENT_DONE', () => {
    expect(mapToShopbyStatus('CONFIRMED')).toBe('PAYMENT_DONE');
  });

  it('should map PRODUCTION_WAITING to PREPARING', () => {
    expect(mapToShopbyStatus('PRODUCTION_WAITING')).toBe('PREPARING');
  });

  it('should map SHIPPED to DELIVERING', () => {
    expect(mapToShopbyStatus('SHIPPED')).toBe('DELIVERING');
  });

  it('should map DELIVERED to DELIVERY_COMPLETE', () => {
    expect(mapToShopbyStatus('DELIVERED')).toBe('DELIVERY_COMPLETE');
  });

  it('should map CANCELLED to CANCEL', () => {
    expect(mapToShopbyStatus('CANCELLED')).toBe('CANCEL');
  });

  it('should return original status for unknown status', () => {
    expect(mapToShopbyStatus('CUSTOM_STATUS')).toBe('CUSTOM_STATUS');
  });
});

describe('buildProductSyncRequest', () => {
  it('should build request without existing shopbyId for new product', () => {
    const product: ProductForShopbySync = {
      productId: 1,
      huniCode: 'HC001',
      shopbyId: null,
      name: 'Test Product',
      categoryId: 10,
      sellingPrice: 15000,
    };

    const result = buildProductSyncRequest(product, null);

    expect(result.productNo).toBeUndefined();
    expect(result.huniCode).toBe('HC001');
    expect(result.product.productName).toBe('Test Product');
  });

  it('should include existing shopbyId for update', () => {
    const product: ProductForShopbySync = {
      productId: 1,
      huniCode: 'HC001',
      shopbyId: 999,
      name: 'Test Product',
      categoryId: 10,
      sellingPrice: 15000,
    };

    const result = buildProductSyncRequest(product, null, 999);

    expect(result.productNo).toBe(999);
  });
});

// =============================================================================
// SECTION 2: Full mallProduct Transformations
// =============================================================================

function createTestHuniProduct(overrides: Partial<HuniProductData> = {}): HuniProductData {
  return {
    id: 1,
    huniCode: '001-0001',
    name: '일반명함',
    description: '<p>일반명함 상품입니다</p>',
    categoryId: 10,
    productType: 'digital-print',
    pricingModel: 'digital-print-calc',
    sheetStandard: '4x6',
    orderMethod: 'upload',
    editorEnabled: false,
    isActive: true,
    minSellingPrice: 10000,
    deliveryTemplateNo: 100,
    ...overrides,
  };
}

function createTestWidgetConfig(overrides: Partial<WidgetConfigData> = {}): WidgetConfigData {
  return {
    options: [
      { key: 'size', type: 'select', required: true, shopbyMapping: 'COMBINATION_1' },
      { key: 'paper', type: 'select', required: true, shopbyMapping: 'COMBINATION_2' },
      { key: 'quantity', type: 'number', required: true, shopbyMapping: 'COMBINATION_3' },
    ],
    pricing: {
      source: 'widget',
      model: 'digital-print-calc',
      currency: 'KRW',
      vatIncluded: true,
    },
    features: ['fileUpload', 'dynamicPricing'],
    ...overrides,
  };
}

describe('toMallProduct', () => {
  const mesMapping = { itemCode: 'MES-001', hasOptions: true };

  it('should create mallProduct with correct productName', () => {
    const product = createTestHuniProduct();
    const widgetConfig = createTestWidgetConfig();

    const result = toMallProduct(product, 500, widgetConfig, mesMapping);

    expect(result.productName).toBe('일반명함');
  });

  it('should set salePrice from minSellingPrice', () => {
    const product = createTestHuniProduct({ minSellingPrice: 15000 });
    const widgetConfig = createTestWidgetConfig();

    const result = toMallProduct(product, 500, widgetConfig, mesMapping);

    expect(result.price.salePrice).toBe(15000);
    expect(result.price.vatIncluded).toBe(true);
  });

  it('should set categoryNo from parameter', () => {
    const product = createTestHuniProduct();
    const widgetConfig = createTestWidgetConfig();

    const result = toMallProduct(product, 500, widgetConfig, mesMapping);

    expect(result.categoryNo).toBe(500);
  });

  it('should set saleStatusType to ONSALE when product is active', () => {
    const product = createTestHuniProduct({ isActive: true });
    const widgetConfig = createTestWidgetConfig();

    const result = toMallProduct(product, 500, widgetConfig, mesMapping);

    expect(result.saleStatusType).toBe('ONSALE');
  });

  it('should set saleStatusType to STOP when product is inactive', () => {
    const product = createTestHuniProduct({ isActive: false });
    const widgetConfig = createTestWidgetConfig();

    const result = toMallProduct(product, 500, widgetConfig, mesMapping);

    expect(result.saleStatusType).toBe('STOP');
  });

  it('should include product description as content', () => {
    const product = createTestHuniProduct({ description: '<div>Hello</div>' });
    const widgetConfig = createTestWidgetConfig();

    const result = toMallProduct(product, 500, widgetConfig, mesMapping);

    expect(result.content).toBe('<div>Hello</div>');
  });

  it('should include delivery when deliveryTemplateNo is provided', () => {
    const product = createTestHuniProduct({ deliveryTemplateNo: 200 });
    const widgetConfig = createTestWidgetConfig();

    const result = toMallProduct(product, 500, widgetConfig, mesMapping);

    expect(result.delivery).toEqual({
      deliveryTemplateNo: 200,
      deliveryMethodType: 'DELIVERY',
    });
  });

  it('should not include delivery when deliveryTemplateNo is undefined', () => {
    const product = createTestHuniProduct({ deliveryTemplateNo: undefined });
    const widgetConfig = createTestWidgetConfig();

    const result = toMallProduct(product, 500, widgetConfig, mesMapping);

    expect(result.delivery).toBeUndefined();
  });

  it('should embed widgetCreator extraJson with correct version', () => {
    const product = createTestHuniProduct();
    const widgetConfig = createTestWidgetConfig();

    const result = toMallProduct(product, 500, widgetConfig, mesMapping);

    const extra = result.extraJson as { widgetCreator: WidgetCreatorExtraJson };
    expect(extra.widgetCreator.version).toBe('1.0.0');
    expect(extra.widgetCreator.huniProductId).toBe(1);
    expect(extra.widgetCreator.huniCode).toBe('001-0001');
  });

  it('should embed product type and pricing model in extraJson', () => {
    const product = createTestHuniProduct({ productType: 'sticker', pricingModel: 'sticker-direct' });
    const widgetConfig = createTestWidgetConfig();

    const result = toMallProduct(product, 500, widgetConfig, mesMapping);

    const extra = result.extraJson as { widgetCreator: WidgetCreatorExtraJson };
    expect(extra.widgetCreator.productType).toBe('sticker');
    expect(extra.widgetCreator.pricingModel).toBe('sticker-direct');
  });

  it('should embed mesMapping in extraJson', () => {
    const product = createTestHuniProduct();
    const widgetConfig = createTestWidgetConfig();

    const result = toMallProduct(product, 500, widgetConfig, mesMapping);

    const extra = result.extraJson as { widgetCreator: WidgetCreatorExtraJson };
    expect(extra.widgetCreator.mesMapping).toEqual({ itemCode: 'MES-001', hasOptions: true });
  });

  it('should embed widgetConfig options in extraJson', () => {
    const product = createTestHuniProduct();
    const widgetConfig = createTestWidgetConfig();

    const result = toMallProduct(product, 500, widgetConfig, mesMapping);

    const extra = result.extraJson as { widgetCreator: WidgetCreatorExtraJson };
    expect(extra.widgetCreator.widgetConfig.options).toHaveLength(3);
    expect(extra.widgetCreator.widgetConfig.pricing.source).toBe('widget');
  });

  it('should embed constraints and dependencies when provided', () => {
    const product = createTestHuniProduct();
    const widgetConfig = createTestWidgetConfig({
      constraints: [{ type: 'filter', source: 'size', target: 'paper', description: 'test' }],
      dependencies: [{ parent: 'size', child: 'paper', type: 'filter', description: 'dep' }],
    });

    const result = toMallProduct(product, 500, widgetConfig, mesMapping);

    const extra = result.extraJson as { widgetCreator: WidgetCreatorExtraJson };
    expect(extra.widgetCreator.widgetConfig.constraints).toHaveLength(1);
    expect(extra.widgetCreator.widgetConfig.dependencies).toHaveLength(1);
  });

  it('should embed features in extraJson', () => {
    const product = createTestHuniProduct();
    const widgetConfig = createTestWidgetConfig({ features: ['fileUpload', 'preview'] });

    const result = toMallProduct(product, 500, widgetConfig, mesMapping);

    const extra = result.extraJson as { widgetCreator: WidgetCreatorExtraJson };
    expect(extra.widgetCreator.features).toEqual(['fileUpload', 'preview']);
  });

  it('should handle product with no sheetStandard', () => {
    const product = createTestHuniProduct({ sheetStandard: undefined });
    const widgetConfig = createTestWidgetConfig();

    const result = toMallProduct(product, 500, widgetConfig, mesMapping);

    const extra = result.extraJson as { widgetCreator: WidgetCreatorExtraJson };
    expect(extra.widgetCreator.sheetStandard).toBeUndefined();
  });
});

describe('fromMallProduct', () => {
  it('should extract shopbyId from mallProductNo', () => {
    const mallProduct: ShopbyMallProduct = {
      mallProductNo: 500,
      productName: 'Test',
      price: { salePrice: 10000 },
      saleStatusType: 'ONSALE',
    };

    const result = fromMallProduct(mallProduct);

    expect(result.shopbyId).toBe(500);
  });

  it('should return 0 for shopbyId when mallProductNo is undefined', () => {
    const mallProduct: ShopbyMallProduct = {
      productName: 'Test',
      price: { salePrice: 10000 },
      saleStatusType: 'ONSALE',
    };

    const result = fromMallProduct(mallProduct);

    expect(result.shopbyId).toBe(0);
  });

  it('should extract product name', () => {
    const mallProduct: ShopbyMallProduct = {
      mallProductNo: 500,
      productName: '일반명함',
      price: { salePrice: 10000 },
      saleStatusType: 'ONSALE',
    };

    const result = fromMallProduct(mallProduct);

    expect(result.name).toBe('일반명함');
  });

  it('should set isActive to true for ONSALE products', () => {
    const mallProduct: ShopbyMallProduct = {
      mallProductNo: 500,
      productName: 'Test',
      price: { salePrice: 10000 },
      saleStatusType: 'ONSALE',
    };

    const result = fromMallProduct(mallProduct);

    expect(result.isActive).toBe(true);
  });

  it('should set isActive to false for STOP products', () => {
    const mallProduct: ShopbyMallProduct = {
      mallProductNo: 500,
      productName: 'Test',
      price: { salePrice: 10000 },
      saleStatusType: 'STOP',
    };

    const result = fromMallProduct(mallProduct);

    expect(result.isActive).toBe(false);
  });

  it('should set isActive to false for EXHAUST products', () => {
    const mallProduct: ShopbyMallProduct = {
      mallProductNo: 500,
      productName: 'Test',
      price: { salePrice: 10000 },
      saleStatusType: 'EXHAUST',
    };

    const result = fromMallProduct(mallProduct);

    expect(result.isActive).toBe(false);
  });

  it('should extract widgetCreator extraJson when present', () => {
    const extraJson: WidgetCreatorExtraJson = {
      version: '1.0.0',
      huniProductId: 1,
      huniCode: '001-0001',
      productType: 'digital-print',
      pricingModel: 'digital-print-calc',
      orderMethod: 'upload',
      editorEnabled: false,
      widgetConfig: {
        options: [],
        pricing: { source: 'widget', model: 'test', currency: 'KRW', vatIncluded: true },
      },
      features: [],
      mesMapping: { itemCode: 'MES-001', hasOptions: true },
    };
    const mallProduct: ShopbyMallProduct = {
      mallProductNo: 500,
      productName: 'Test',
      price: { salePrice: 10000 },
      saleStatusType: 'ONSALE',
      extraJson: { widgetCreator: extraJson },
    };

    const result = fromMallProduct(mallProduct);

    expect(result.extraJson).not.toBeNull();
    expect(result.extraJson!.huniCode).toBe('001-0001');
    expect(result.extraJson!.version).toBe('1.0.0');
  });

  it('should return null extraJson when not present', () => {
    const mallProduct: ShopbyMallProduct = {
      mallProductNo: 500,
      productName: 'Test',
      price: { salePrice: 10000 },
      saleStatusType: 'ONSALE',
    };

    const result = fromMallProduct(mallProduct);

    expect(result.extraJson).toBeNull();
  });

  it('should return null extraJson when extraJson has no widgetCreator key', () => {
    const mallProduct: ShopbyMallProduct = {
      mallProductNo: 500,
      productName: 'Test',
      price: { salePrice: 10000 },
      saleStatusType: 'ONSALE',
      extraJson: { otherKey: 'value' },
    };

    const result = fromMallProduct(mallProduct);

    expect(result.extraJson).toBeNull();
  });
});

// =============================================================================
// SECTION 3: Option Data Builders
// =============================================================================

describe('buildCombinationOptions', () => {
  const sizes: SizeOptionData[] = [
    { code: 'S1', displayName: '90x50mm', addPrice: 0 },
    { code: 'S2', displayName: 'A4', addPrice: 2000 },
  ];
  const papers: PaperOptionData[] = [
    { code: 'P1', name: '스노우화이트', weight: 250, addPrice: 0 },
    { code: 'P2', name: '아르떼', weight: 300, addPrice: 1000 },
  ];
  const quantities: QuantityTierData[] = [
    { quantity: 100, label: '100매', addPrice: 0 },
    { quantity: 200, label: '200매', addPrice: 5000 },
  ];

  it('should create 3 COMBINATION options for size, paper, quantity', () => {
    const result = buildCombinationOptions(sizes, papers, quantities);

    expect(result).toHaveLength(3);
    expect(result[0].optionName).toBe('규격');
    expect(result[1].optionName).toBe('용지');
    expect(result[2].optionName).toBe('수량');
  });

  it('should set all options to kind COMBINATION', () => {
    const result = buildCombinationOptions(sizes, papers, quantities);

    result.forEach(opt => {
      expect(opt.kind).toBe('COMBINATION');
      expect(opt.required).toBe(true);
    });
  });

  it('should map size display names to optionValue', () => {
    const result = buildCombinationOptions(sizes, papers, quantities);

    expect(result[0].optionValues).toHaveLength(2);
    expect(result[0].optionValues[0].optionValue).toBe('90x50mm');
    expect(result[0].optionValues[1].optionValue).toBe('A4');
  });

  it('should map paper name with weight to optionValue', () => {
    const result = buildCombinationOptions(sizes, papers, quantities);

    expect(result[1].optionValues[0].optionValue).toBe('스노우화이트 250g');
    expect(result[1].optionValues[1].optionValue).toBe('아르떼 300g');
  });

  it('should map paper name without weight', () => {
    const papersNoWeight: PaperOptionData[] = [
      { code: 'P1', name: '모조지' },
    ];
    const result = buildCombinationOptions([], papersNoWeight, []);

    expect(result[0].optionValues[0].optionValue).toBe('모조지');
  });

  it('should map quantity labels', () => {
    const result = buildCombinationOptions(sizes, papers, quantities);

    expect(result[2].optionValues[0].optionValue).toBe('100매');
    expect(result[2].optionValues[0].optionValueCode).toBe('QTY_100');
  });

  it('should include addPrice in option values', () => {
    const result = buildCombinationOptions(sizes, papers, quantities);

    expect(result[0].optionValues[0].addPrice).toBe(0);
    expect(result[0].optionValues[1].addPrice).toBe(2000);
    expect(result[1].optionValues[1].addPrice).toBe(1000);
    expect(result[2].optionValues[1].addPrice).toBe(5000);
  });

  it('should default addPrice to 0 when not provided', () => {
    const sizesNoPrice: SizeOptionData[] = [{ code: 'S1', displayName: '90x50mm' }];
    const result = buildCombinationOptions(sizesNoPrice, [], []);

    expect(result[0].optionValues[0].addPrice).toBe(0);
  });

  it('should include option value codes', () => {
    const result = buildCombinationOptions(sizes, papers, quantities);

    expect(result[0].optionValues[0].optionValueCode).toBe('S1');
    expect(result[1].optionValues[0].optionValueCode).toBe('P1');
    expect(result[2].optionValues[0].optionValueCode).toBe('QTY_100');
  });

  it('should return empty array when all inputs are empty', () => {
    const result = buildCombinationOptions([], [], []);
    expect(result).toHaveLength(0);
  });

  it('should create only size option when only sizes are provided', () => {
    const result = buildCombinationOptions(sizes, [], []);

    expect(result).toHaveLength(1);
    expect(result[0].optionName).toBe('규격');
  });

  it('should create 2 options when only sizes and papers are provided', () => {
    const result = buildCombinationOptions(sizes, papers, []);

    expect(result).toHaveLength(2);
    expect(result[0].optionName).toBe('규격');
    expect(result[1].optionName).toBe('용지');
  });
});

describe('buildRequiredPrintModeOption', () => {
  const printModes: PrintModeOptionData[] = [
    { code: 'PM1', name: '양면', addPrice: 3000 },
    { code: 'PM2', name: '단면', addPrice: 0 },
  ];

  it('should create REQUIRED option with default name', () => {
    const result = buildRequiredPrintModeOption(printModes);

    expect(result.kind).toBe('REQUIRED');
    expect(result.optionName).toBe('인쇄방식');
  });

  it('should create REQUIRED option with custom name', () => {
    const result = buildRequiredPrintModeOption(printModes, '제본방식');

    expect(result.optionName).toBe('제본방식');
  });

  it('should map print mode names to option values', () => {
    const result = buildRequiredPrintModeOption(printModes);

    expect(result.optionValues).toHaveLength(2);
    expect(result.optionValues[0].optionValue).toBe('양면');
    expect(result.optionValues[1].optionValue).toBe('단면');
  });

  it('should include addPrice for each mode', () => {
    const result = buildRequiredPrintModeOption(printModes);

    expect(result.optionValues[0].addPrice).toBe(3000);
    expect(result.optionValues[1].addPrice).toBe(0);
  });

  it('should include option value codes', () => {
    const result = buildRequiredPrintModeOption(printModes);

    expect(result.optionValues[0].optionValueCode).toBe('PM1');
    expect(result.optionValues[1].optionValueCode).toBe('PM2');
  });

  it('should default addPrice to 0 when not provided', () => {
    const modes: PrintModeOptionData[] = [{ code: 'PM1', name: '양면' }];
    const result = buildRequiredPrintModeOption(modes);

    expect(result.optionValues[0].addPrice).toBe(0);
  });
});

describe('buildRequiredBindingOption', () => {
  const bindings = [
    { code: 'B1', name: '무선제본', addPrice: 5000 },
    { code: 'B2', name: '중철제본', addPrice: 3000 },
    { code: 'B3', name: '스프링제본' },
  ];

  it('should create REQUIRED option with name "제본방식"', () => {
    const result = buildRequiredBindingOption(bindings);

    expect(result.kind).toBe('REQUIRED');
    expect(result.optionName).toBe('제본방식');
  });

  it('should map binding names to option values', () => {
    const result = buildRequiredBindingOption(bindings);

    expect(result.optionValues).toHaveLength(3);
    expect(result.optionValues[0].optionValue).toBe('무선제본');
    expect(result.optionValues[1].optionValue).toBe('중철제본');
    expect(result.optionValues[2].optionValue).toBe('스프링제본');
  });

  it('should include addPrice and default to 0', () => {
    const result = buildRequiredBindingOption(bindings);

    expect(result.optionValues[0].addPrice).toBe(5000);
    expect(result.optionValues[2].addPrice).toBe(0);
  });
});

describe('buildStandardPostProcessOption', () => {
  const postProcesses: PostProcessOptionData[] = [
    { code: 'PP1', name: '코팅', addPrice: 2000 },
    { code: 'PP2', name: '오시', addPrice: 1500 },
    { code: 'PP3', name: '미싱' },
  ];

  it('should create STANDARD option with default name', () => {
    const result = buildStandardPostProcessOption(postProcesses);

    expect(result.kind).toBe('STANDARD');
    expect(result.optionName).toBe('후가공');
  });

  it('should create STANDARD option with custom name', () => {
    const result = buildStandardPostProcessOption(postProcesses, '추가옵션');

    expect(result.optionName).toBe('추가옵션');
  });

  it('should map post-process names to option values', () => {
    const result = buildStandardPostProcessOption(postProcesses);

    expect(result.optionValues).toHaveLength(3);
    expect(result.optionValues[0].optionValue).toBe('코팅');
    expect(result.optionValues[1].optionValue).toBe('오시');
    expect(result.optionValues[2].optionValue).toBe('미싱');
  });

  it('should include addPrice and default to 0', () => {
    const result = buildStandardPostProcessOption(postProcesses);

    expect(result.optionValues[0].addPrice).toBe(2000);
    expect(result.optionValues[2].addPrice).toBe(0);
  });

  it('should include option value codes', () => {
    const result = buildStandardPostProcessOption(postProcesses);

    expect(result.optionValues[0].optionValueCode).toBe('PP1');
  });
});

// =============================================================================
// SECTION 4: optionInputs Builders
// =============================================================================

describe('buildDefaultOptionInputDefinitions', () => {
  it('should return 3 definitions', () => {
    const result = buildDefaultOptionInputDefinitions();
    expect(result).toHaveLength(3);
  });

  it('should include design file input as required TEXT', () => {
    const result = buildDefaultOptionInputDefinitions();
    const fileInput = result[0];

    expect(fileInput.inputLabel).toBe('디자인 파일 (PDF, AI, PSD)');
    expect(fileInput.inputType).toBe('TEXT');
    expect(fileInput.required).toBe(true);
    expect(fileInput.matchingType).toBe('OPTION');
  });

  it('should include print spec input as required TEXTAREA', () => {
    const result = buildDefaultOptionInputDefinitions();
    const specInput = result[1];

    expect(specInput.inputLabel).toBe('인쇄 사양 (자동 입력)');
    expect(specInput.inputType).toBe('TEXTAREA');
    expect(specInput.required).toBe(true);
  });

  it('should include special request as optional TEXTAREA with maxLength', () => {
    const result = buildDefaultOptionInputDefinitions();
    const requestInput = result[2];

    expect(requestInput.inputLabel).toBe('특수 요청사항');
    expect(requestInput.inputType).toBe('TEXTAREA');
    expect(requestInput.required).toBe(false);
    expect(requestInput.maxLength).toBe(500);
  });

  it('should include placeholder and help texts', () => {
    const result = buildDefaultOptionInputDefinitions();

    expect(result[0].placeholderText).toBeDefined();
    expect(result[0].helpText).toBeDefined();
    expect(result[1].helpText).toBeDefined();
    expect(result[2].placeholderText).toBeDefined();
  });
});

describe('buildOptionInputValues', () => {
  const printSpec: PrintSpecification = {
    huniCode: '001-0001',
    size: { code: 'S1', name: '90x50mm', cutWidth: 90, cutHeight: 50 },
    paper: { code: 'P1', name: '스노우화이트' },
    printMode: { code: 'PM1', name: '양면', priceCode: 1 },
    quantity: 100,
    widgetPrice: {
      printCost: 5000,
      paperCost: 3000,
      finishingCost: 0,
      totalBeforeVat: 8000,
      vat: 800,
      total: 8800,
    },
  };

  it('should include file URL as first input', () => {
    const result = buildOptionInputValues('https://s3.example.com/file.pdf', printSpec);

    expect(result[0].inputLabel).toBe('디자인 파일 (PDF, AI, PSD)');
    expect(result[0].inputValue).toBe('https://s3.example.com/file.pdf');
  });

  it('should include print spec as JSON string', () => {
    const result = buildOptionInputValues('https://s3.example.com/file.pdf', printSpec);

    expect(result[1].inputLabel).toBe('인쇄 사양 (자동 입력)');
    const parsed = JSON.parse(result[1].inputValue);
    expect(parsed.huniCode).toBe('001-0001');
    expect(parsed.quantity).toBe(100);
  });

  it('should return 2 inputs when no special request', () => {
    const result = buildOptionInputValues('https://s3.example.com/file.pdf', printSpec);
    expect(result).toHaveLength(2);
  });

  it('should include special request when provided', () => {
    const result = buildOptionInputValues(
      'https://s3.example.com/file.pdf',
      printSpec,
      '흰색 배경으로 인쇄 부탁드립니다'
    );

    expect(result).toHaveLength(3);
    expect(result[2].inputLabel).toBe('특수 요청사항');
    expect(result[2].inputValue).toBe('흰색 배경으로 인쇄 부탁드립니다');
  });

  it('should not include special request when empty string', () => {
    const result = buildOptionInputValues('https://s3.example.com/file.pdf', printSpec, '');
    expect(result).toHaveLength(2);
  });
});

// =============================================================================
// SECTION 5: extraJson Builders
// =============================================================================

describe('buildExtraJson', () => {
  const baseParams = {
    huniProductId: 1,
    huniCode: '001-0001',
    productType: 'digital-print',
    pricingModel: 'digital-print-calc',
    orderMethod: 'upload' as const,
    editorEnabled: false,
    options: [
      { key: 'size', type: 'select' as const, required: true, shopbyMapping: 'COMBINATION_1' },
    ],
    pricing: {
      source: 'widget' as const,
      model: 'digital-print-calc',
      currency: 'KRW',
      vatIncluded: true,
    },
    features: ['fileUpload'],
    mesItemCode: 'MES-001',
    mesHasOptions: true,
  };

  it('should set version to 1.0.0', () => {
    const result = buildExtraJson(baseParams);
    expect(result.version).toBe('1.0.0');
  });

  it('should set product identifiers', () => {
    const result = buildExtraJson(baseParams);
    expect(result.huniProductId).toBe(1);
    expect(result.huniCode).toBe('001-0001');
    expect(result.productType).toBe('digital-print');
  });

  it('should set pricing model and order method', () => {
    const result = buildExtraJson(baseParams);
    expect(result.pricingModel).toBe('digital-print-calc');
    expect(result.orderMethod).toBe('upload');
    expect(result.editorEnabled).toBe(false);
  });

  it('should include widgetConfig with options and pricing', () => {
    const result = buildExtraJson(baseParams);
    expect(result.widgetConfig.options).toHaveLength(1);
    expect(result.widgetConfig.pricing.source).toBe('widget');
  });

  it('should include mesMapping', () => {
    const result = buildExtraJson(baseParams);
    expect(result.mesMapping.itemCode).toBe('MES-001');
    expect(result.mesMapping.hasOptions).toBe(true);
  });

  it('should handle optional sheetStandard', () => {
    const result = buildExtraJson({ ...baseParams, sheetStandard: '4x6' });
    expect(result.sheetStandard).toBe('4x6');
  });

  it('should handle undefined sheetStandard', () => {
    const result = buildExtraJson(baseParams);
    expect(result.sheetStandard).toBeUndefined();
  });

  it('should include constraints when provided', () => {
    const result = buildExtraJson({
      ...baseParams,
      constraints: [{ type: 'filter', source: 'size', target: 'paper' }],
    });
    expect(result.widgetConfig.constraints).toHaveLength(1);
  });

  it('should include dependencies when provided', () => {
    const result = buildExtraJson({
      ...baseParams,
      dependencies: [{ parent: 'size', child: 'paper', type: 'visibility' }],
    });
    expect(result.widgetConfig.dependencies).toHaveLength(1);
  });

  it('should include features array', () => {
    const result = buildExtraJson({ ...baseParams, features: ['fileUpload', 'dynamicPricing', 'preview'] });
    expect(result.features).toEqual(['fileUpload', 'dynamicPricing', 'preview']);
  });
});

describe('buildWidgetOptionMapping', () => {
  it('should create mapping for COMBINATION_1', () => {
    const result = buildWidgetOptionMapping('size', 'select', true, 'COMBINATION_1');

    expect(result.key).toBe('size');
    expect(result.type).toBe('select');
    expect(result.required).toBe(true);
    expect(result.shopbyMapping).toBe('COMBINATION_1');
  });

  it('should create mapping for STANDARD optional', () => {
    const result = buildWidgetOptionMapping('finishing', 'multiselect', false, 'STANDARD');

    expect(result.key).toBe('finishing');
    expect(result.type).toBe('multiselect');
    expect(result.required).toBe(false);
    expect(result.shopbyMapping).toBe('STANDARD');
  });

  it('should create mapping for REQUIRED', () => {
    const result = buildWidgetOptionMapping('printType', 'select', true, 'REQUIRED');

    expect(result.shopbyMapping).toBe('REQUIRED');
  });
});

// =============================================================================
// SECTION 6: Print Specification Parser
// =============================================================================

describe('parsePrintSpecFromOptionInputs', () => {
  const validPrintSpec: PrintSpecification = {
    huniCode: '001-0001',
    size: { code: 'S1', name: '90x50mm', cutWidth: 90, cutHeight: 50 },
    paper: { code: 'P1', name: '스노우화이트' },
    printMode: { code: 'PM1', name: '양면', priceCode: 1 },
    quantity: 100,
    widgetPrice: {
      printCost: 5000,
      paperCost: 3000,
      finishingCost: 0,
      totalBeforeVat: 8000,
      vat: 800,
      total: 8800,
    },
  };

  it('should parse valid print specification from optionInputs', () => {
    const inputs = [
      { inputLabel: '인쇄 사양 (자동 입력)', inputValue: JSON.stringify(validPrintSpec) },
    ];

    const result = parsePrintSpecFromOptionInputs(inputs);

    expect(result).not.toBeNull();
    expect(result!.huniCode).toBe('001-0001');
    expect(result!.quantity).toBe(100);
    expect(result!.size.code).toBe('S1');
  });

  it('should return null when no print spec input found', () => {
    const inputs = [
      { inputLabel: '디자인 파일 (PDF, AI, PSD)', inputValue: 'https://example.com/file.pdf' },
    ];

    const result = parsePrintSpecFromOptionInputs(inputs);
    expect(result).toBeNull();
  });

  it('should return null for empty optionInputs', () => {
    const result = parsePrintSpecFromOptionInputs([]);
    expect(result).toBeNull();
  });

  it('should return null when inputValue is empty', () => {
    const inputs = [
      { inputLabel: '인쇄 사양 (자동 입력)', inputValue: '' },
    ];

    const result = parsePrintSpecFromOptionInputs(inputs);
    expect(result).toBeNull();
  });

  it('should return null for invalid JSON', () => {
    const inputs = [
      { inputLabel: '인쇄 사양 (자동 입력)', inputValue: 'not-json' },
    ];

    const result = parsePrintSpecFromOptionInputs(inputs);
    expect(result).toBeNull();
  });

  it('should return null when required fields are missing', () => {
    const incomplete = { huniCode: '001-0001', size: { code: 'S1', name: 'test', cutWidth: 90, cutHeight: 50 } };
    const inputs = [
      { inputLabel: '인쇄 사양 (자동 입력)', inputValue: JSON.stringify(incomplete) },
    ];

    const result = parsePrintSpecFromOptionInputs(inputs);
    expect(result).toBeNull();
  });

  it('should parse spec with optional postProcess', () => {
    const specWithPostProcess = {
      ...validPrintSpec,
      postProcess: [{ code: 'PP1', name: '코팅' }],
    };
    const inputs = [
      { inputLabel: '인쇄 사양 (자동 입력)', inputValue: JSON.stringify(specWithPostProcess) },
    ];

    const result = parsePrintSpecFromOptionInputs(inputs);

    expect(result).not.toBeNull();
    expect(result!.postProcess).toHaveLength(1);
  });

  it('should parse spec with optional binding', () => {
    const specWithBinding = {
      ...validPrintSpec,
      binding: { code: 'B1', name: '무선제본', pageCount: 32 },
    };
    const inputs = [
      { inputLabel: '인쇄 사양 (자동 입력)', inputValue: JSON.stringify(specWithBinding) },
    ];

    const result = parsePrintSpecFromOptionInputs(inputs);

    expect(result).not.toBeNull();
    expect(result!.binding!.name).toBe('무선제본');
    expect(result!.binding!.pageCount).toBe(32);
  });
});

describe('extractFileUrlFromOptionInputs', () => {
  it('should extract file URL from inputs', () => {
    const inputs = [
      { inputLabel: '디자인 파일 (PDF, AI, PSD)', inputValue: 'https://s3.example.com/file.pdf' },
      { inputLabel: '인쇄 사양 (자동 입력)', inputValue: '{}' },
    ];

    const result = extractFileUrlFromOptionInputs(inputs);
    expect(result).toBe('https://s3.example.com/file.pdf');
  });

  it('should return null when no file URL input found', () => {
    const inputs = [
      { inputLabel: '인쇄 사양 (자동 입력)', inputValue: '{}' },
    ];

    const result = extractFileUrlFromOptionInputs(inputs);
    expect(result).toBeNull();
  });

  it('should return null for empty inputs', () => {
    const result = extractFileUrlFromOptionInputs([]);
    expect(result).toBeNull();
  });
});

describe('extractSpecialRequestFromOptionInputs', () => {
  it('should extract special request text', () => {
    const inputs = [
      { inputLabel: '특수 요청사항', inputValue: '흰색 배경으로 부탁드립니다' },
    ];

    const result = extractSpecialRequestFromOptionInputs(inputs);
    expect(result).toBe('흰색 배경으로 부탁드립니다');
  });

  it('should return null when no special request found', () => {
    const inputs = [
      { inputLabel: '디자인 파일 (PDF, AI, PSD)', inputValue: 'https://example.com' },
    ];

    const result = extractSpecialRequestFromOptionInputs(inputs);
    expect(result).toBeNull();
  });

  it('should return null for empty inputs', () => {
    const result = extractSpecialRequestFromOptionInputs([]);
    expect(result).toBeNull();
  });
});

// =============================================================================
// SECTION 7: Price Calculation Helpers
// =============================================================================

describe('calculateAddPrice', () => {
  it('should calculate addPrice as difference from base price', () => {
    expect(calculateAddPrice(10000, 15000)).toBe(5000);
  });

  it('should return 0 when combination price equals base price', () => {
    expect(calculateAddPrice(10000, 10000)).toBe(0);
  });

  it('should return 0 when combination price is less than base price', () => {
    expect(calculateAddPrice(10000, 8000)).toBe(0);
  });

  it('should handle zero base price', () => {
    expect(calculateAddPrice(0, 5000)).toBe(5000);
  });

  it('should handle both zero', () => {
    expect(calculateAddPrice(0, 0)).toBe(0);
  });

  it('should handle large price differences', () => {
    expect(calculateAddPrice(1000, 1000000)).toBe(999000);
  });
});

describe('findMinSellingPrice', () => {
  it('should find minimum price from array', () => {
    expect(findMinSellingPrice([15000, 10000, 20000, 12000])).toBe(10000);
  });

  it('should return 0 for empty array', () => {
    expect(findMinSellingPrice([])).toBe(0);
  });

  it('should handle single element', () => {
    expect(findMinSellingPrice([5000])).toBe(5000);
  });

  it('should handle all same prices', () => {
    expect(findMinSellingPrice([10000, 10000, 10000])).toBe(10000);
  });

  it('should handle minimum at different positions', () => {
    expect(findMinSellingPrice([5000, 3000, 7000])).toBe(3000);
    expect(findMinSellingPrice([3000, 5000, 7000])).toBe(3000);
    expect(findMinSellingPrice([5000, 7000, 3000])).toBe(3000);
  });
});

describe('buildPriceBreakdown', () => {
  it('should calculate total with default VAT rate (10%)', () => {
    const result = buildPriceBreakdown({
      printCost: 5000,
      paperCost: 3000,
      finishingCost: 2000,
    });

    expect(result.totalBeforeVat).toBe(10000);
    expect(result.vat).toBe(1000);
    expect(result.total).toBe(11000);
  });

  it('should include individual cost components', () => {
    const result = buildPriceBreakdown({
      printCost: 5000,
      paperCost: 3000,
      finishingCost: 2000,
    });

    expect(result.printCost).toBe(5000);
    expect(result.paperCost).toBe(3000);
    expect(result.finishingCost).toBe(2000);
  });

  it('should include binding cost when provided', () => {
    const result = buildPriceBreakdown({
      printCost: 5000,
      paperCost: 3000,
      finishingCost: 2000,
      bindingCost: 4000,
    });

    expect(result.bindingCost).toBe(4000);
    expect(result.totalBeforeVat).toBe(14000);
    expect(result.vat).toBe(1400);
    expect(result.total).toBe(15400);
  });

  it('should not include bindingCost when it is 0', () => {
    const result = buildPriceBreakdown({
      printCost: 5000,
      paperCost: 3000,
      finishingCost: 0,
      bindingCost: 0,
    });

    expect(result.bindingCost).toBeUndefined();
  });

  it('should use custom VAT rate', () => {
    const result = buildPriceBreakdown({
      printCost: 10000,
      paperCost: 0,
      finishingCost: 0,
      vatRate: 0.2,
    });

    expect(result.vat).toBe(2000);
    expect(result.total).toBe(12000);
  });

  it('should round VAT to nearest integer', () => {
    const result = buildPriceBreakdown({
      printCost: 3333,
      paperCost: 0,
      finishingCost: 0,
    });

    expect(result.vat).toBe(Math.round(3333 * 0.1));
    expect(result.vat).toBe(333);
  });

  it('should handle zero costs', () => {
    const result = buildPriceBreakdown({
      printCost: 0,
      paperCost: 0,
      finishingCost: 0,
    });

    expect(result.totalBeforeVat).toBe(0);
    expect(result.vat).toBe(0);
    expect(result.total).toBe(0);
  });
});
