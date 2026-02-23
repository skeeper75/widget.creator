/**
 * Unit tests for Shopby mapper functions
 *
 * Tests cover toShopbyProduct, fromShopbyOrder,
 * toShopbyStatusNotification, and mapToShopbyStatus.
 */
import { describe, it, expect } from 'vitest';
import {
  toShopbyProduct,
  fromShopbyOrder,
  toShopbyProductWithCategory,
  toShopbyStatusNotification,
  mapToShopbyStatus,
  buildProductSyncRequest,
} from '../mapper.js';
import type { ShopbyOrder, ProductForShopbySync, ShopbyCategoryMapping } from '../types.js';

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
