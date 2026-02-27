/**
 * Shopby Widget Types Tests
 * @see SPEC-SHOPBY-003 Section 4.1, 4.2
 *
 * Tests runtime validation for Shopby widget configuration types.
 * Implementation uses lightweight validation (no Zod) for bundle size.
 */

import { describe, it, expect } from 'vitest';
import {
  validateInitConfig,
  validatePayload,
  WidgetLifecycleState,
  ShopbyWidgetErrorCode,
} from '@/shopby/types';
import type {
  ShopbyWidgetInitConfig,
  WidgetToShopbyPayload,
} from '@/shopby/types';

// ============================================================================
// Helpers
// ============================================================================

function validConfig(): Record<string, unknown> {
  return {
    container: '#widget-root',
    shopbyProductNo: 12345,
  };
}

function validPayload(): Record<string, unknown> {
  return {
    productNo: 100,
    optionNo: 1,
    orderCnt: 10,
    optionInputs: {
      designFileUrl: 'https://cdn.example.com/design.pdf',
      printSpec: '{"size":"A4"}',
    },
    widgetPrice: {
      basePrice: 10000,
      optionPrice: 2000,
      postProcessPrice: 1000,
      deliveryPrice: 3000,
      totalPrice: 16000,
    },
  };
}

// ============================================================================
// validateInitConfig
// ============================================================================

describe('shopby/types - validateInitConfig', () => {
  describe('valid configs', () => {
    it('accepts config with all required fields (string container)', () => {
      const result = validateInitConfig(validConfig());
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.container).toBe('#widget-root');
      expect(result.data!.shopbyProductNo).toBe(12345);
    });

    it('accepts config with HTMLElement container', () => {
      const el = document.createElement('div');
      const result = validateInitConfig({
        container: el,
        shopbyProductNo: 1,
      });
      expect(result.success).toBe(true);
    });

    it('accepts config with optional shopbyAccessToken', () => {
      const result = validateInitConfig({
        ...validConfig(),
        shopbyAccessToken: 'eyJhbGciOiJIUzI1NiJ9.test',
      });
      expect(result.success).toBe(true);
      expect(result.data!.shopbyAccessToken).toBe('eyJhbGciOiJIUzI1NiJ9.test');
    });

    it('accepts config with optional theme overrides', () => {
      const result = validateInitConfig({
        ...validConfig(),
        theme: {
          primaryColor: '#FF6B00',
          fontFamily: 'Noto Sans KR',
          borderRadius: '8px',
        },
      });
      expect(result.success).toBe(true);
    });

    it('accepts config with partial theme (only primaryColor)', () => {
      const result = validateInitConfig({
        ...validConfig(),
        theme: { primaryColor: '#000' },
      });
      expect(result.success).toBe(true);
    });

    it('accepts config with empty theme object', () => {
      const result = validateInitConfig({
        ...validConfig(),
        theme: {},
      });
      expect(result.success).toBe(true);
    });

    it('accepts config with optional callbacks', () => {
      const result = validateInitConfig({
        ...validConfig(),
        callbacks: {
          onAddToCart: () => {},
          onError: () => {},
        },
      });
      expect(result.success).toBe(true);
    });

    it('accepts config with optional locale', () => {
      const result = validateInitConfig({
        ...validConfig(),
        locale: 'ko-KR',
      });
      expect(result.success).toBe(true);
      expect(result.data!.locale).toBe('ko-KR');
    });

    it('accepts config with optional apiBaseUrl', () => {
      const result = validateInitConfig({
        ...validConfig(),
        apiBaseUrl: 'https://shop-api.example.com',
      });
      expect(result.success).toBe(true);
    });

    it('accepts config with null optional fields', () => {
      const result = validateInitConfig({
        ...validConfig(),
        shopbyAccessToken: null,
        theme: null,
        locale: null,
        apiBaseUrl: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid configs - top level', () => {
    it('rejects null input', () => {
      const result = validateInitConfig(null);
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0]!.field).toBe('config');
    });

    it('rejects undefined input', () => {
      const result = validateInitConfig(undefined);
      expect(result.success).toBe(false);
      expect(result.errors![0]!.field).toBe('config');
    });

    it('rejects non-object input (string)', () => {
      const result = validateInitConfig('not an object');
      expect(result.success).toBe(false);
    });

    it('rejects non-object input (number)', () => {
      const result = validateInitConfig(42);
      expect(result.success).toBe(false);
    });
  });

  describe('invalid configs - container', () => {
    it('rejects config missing container', () => {
      const result = validateInitConfig({ shopbyProductNo: 1 });
      expect(result.success).toBe(false);
      expect(result.errors!.some((e) => e.field === 'container')).toBe(true);
    });

    it('rejects config with null container', () => {
      const result = validateInitConfig({
        container: null,
        shopbyProductNo: 1,
      });
      expect(result.success).toBe(false);
      expect(result.errors!.some((e) => e.field === 'container')).toBe(true);
    });

    it('rejects config with non-string/non-element container', () => {
      const result = validateInitConfig({
        container: 123,
        shopbyProductNo: 1,
      });
      expect(result.success).toBe(false);
      expect(result.errors!.some((e) => e.field === 'container')).toBe(true);
    });

    it('rejects config with boolean container', () => {
      const result = validateInitConfig({
        container: true,
        shopbyProductNo: 1,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('invalid configs - shopbyProductNo', () => {
    it('rejects config missing shopbyProductNo', () => {
      const result = validateInitConfig({ container: '#root' });
      expect(result.success).toBe(false);
      expect(result.errors!.some((e) => e.field === 'shopbyProductNo')).toBe(true);
    });

    it('rejects config with null shopbyProductNo', () => {
      const result = validateInitConfig({
        container: '#root',
        shopbyProductNo: null,
      });
      expect(result.success).toBe(false);
    });

    it('rejects config with non-number shopbyProductNo', () => {
      const result = validateInitConfig({
        container: '#root',
        shopbyProductNo: 'abc',
      });
      expect(result.success).toBe(false);
    });

    it('rejects config with zero shopbyProductNo', () => {
      const result = validateInitConfig({
        container: '#root',
        shopbyProductNo: 0,
      });
      expect(result.success).toBe(false);
    });

    it('rejects config with negative shopbyProductNo', () => {
      const result = validateInitConfig({
        container: '#root',
        shopbyProductNo: -5,
      });
      expect(result.success).toBe(false);
    });

    it('rejects config with non-integer shopbyProductNo', () => {
      const result = validateInitConfig({
        container: '#root',
        shopbyProductNo: 3.14,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('invalid configs - optional fields type checks', () => {
    it('rejects non-string shopbyAccessToken', () => {
      const result = validateInitConfig({
        ...validConfig(),
        shopbyAccessToken: 12345,
      });
      expect(result.success).toBe(false);
      expect(result.errors!.some((e) => e.field === 'shopbyAccessToken')).toBe(true);
    });

    it('rejects non-object theme', () => {
      const result = validateInitConfig({
        ...validConfig(),
        theme: 'not-an-object',
      });
      expect(result.success).toBe(false);
      expect(result.errors!.some((e) => e.field === 'theme')).toBe(true);
    });

    it('rejects non-string theme.primaryColor', () => {
      const result = validateInitConfig({
        ...validConfig(),
        theme: { primaryColor: 123 },
      });
      expect(result.success).toBe(false);
      expect(result.errors!.some((e) => e.field === 'theme.primaryColor')).toBe(true);
    });

    it('rejects non-string theme.fontFamily', () => {
      const result = validateInitConfig({
        ...validConfig(),
        theme: { fontFamily: true },
      });
      expect(result.success).toBe(false);
      expect(result.errors!.some((e) => e.field === 'theme.fontFamily')).toBe(true);
    });

    it('rejects non-string theme.borderRadius', () => {
      const result = validateInitConfig({
        ...validConfig(),
        theme: { borderRadius: 8 },
      });
      expect(result.success).toBe(false);
      expect(result.errors!.some((e) => e.field === 'theme.borderRadius')).toBe(true);
    });

    it('rejects non-string locale', () => {
      const result = validateInitConfig({
        ...validConfig(),
        locale: 42,
      });
      expect(result.success).toBe(false);
      expect(result.errors!.some((e) => e.field === 'locale')).toBe(true);
    });

    it('rejects non-string apiBaseUrl', () => {
      const result = validateInitConfig({
        ...validConfig(),
        apiBaseUrl: false,
      });
      expect(result.success).toBe(false);
      expect(result.errors!.some((e) => e.field === 'apiBaseUrl')).toBe(true);
    });
  });

  describe('multiple errors', () => {
    it('collects all validation errors at once', () => {
      const result = validateInitConfig({});
      expect(result.success).toBe(false);
      expect(result.errors!.length).toBeGreaterThanOrEqual(2);
      const fields = result.errors!.map((e) => e.field);
      expect(fields).toContain('container');
      expect(fields).toContain('shopbyProductNo');
    });
  });
});

// ============================================================================
// validatePayload
// ============================================================================

describe('shopby/types - validatePayload', () => {
  describe('valid payloads', () => {
    it('accepts valid payload with all fields', () => {
      const result = validatePayload(validPayload());
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.productNo).toBe(100);
    });

    it('accepts payload with optional specialRequest', () => {
      const p = validPayload();
      (p.optionInputs as Record<string, unknown>).specialRequest = 'Rush order';
      const result = validatePayload(p);
      expect(result.success).toBe(true);
    });

    it('accepts payload with optional proofRequired', () => {
      const p = validPayload();
      (p.optionInputs as Record<string, unknown>).proofRequired = true;
      const result = validatePayload(p);
      expect(result.success).toBe(true);
    });

    it('accepts payload with zero optionNo', () => {
      const result = validatePayload({ ...validPayload(), optionNo: 0 });
      expect(result.success).toBe(true);
    });

    it('accepts payload with zero price values', () => {
      const result = validatePayload({
        ...validPayload(),
        widgetPrice: {
          basePrice: 0,
          optionPrice: 0,
          postProcessPrice: 0,
          deliveryPrice: 0,
          totalPrice: 0,
        },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('invalid payloads - top level', () => {
    it('rejects null input', () => {
      const result = validatePayload(null);
      expect(result.success).toBe(false);
      expect(result.errors![0]!.field).toBe('payload');
    });

    it('rejects non-object input', () => {
      const result = validatePayload('string');
      expect(result.success).toBe(false);
    });
  });

  describe('invalid payloads - productNo', () => {
    it('rejects missing productNo', () => {
      const { productNo, ...rest } = validPayload();
      const result = validatePayload(rest);
      expect(result.success).toBe(false);
      expect(result.errors!.some((e) => e.field === 'productNo')).toBe(true);
    });

    it('rejects zero productNo', () => {
      const result = validatePayload({ ...validPayload(), productNo: 0 });
      expect(result.success).toBe(false);
    });

    it('rejects negative productNo', () => {
      const result = validatePayload({ ...validPayload(), productNo: -1 });
      expect(result.success).toBe(false);
    });

    it('rejects string productNo', () => {
      const result = validatePayload({ ...validPayload(), productNo: 'abc' });
      expect(result.success).toBe(false);
    });
  });

  describe('invalid payloads - optionNo', () => {
    it('rejects negative optionNo', () => {
      const result = validatePayload({ ...validPayload(), optionNo: -1 });
      expect(result.success).toBe(false);
      expect(result.errors!.some((e) => e.field === 'optionNo')).toBe(true);
    });

    it('rejects string optionNo', () => {
      const result = validatePayload({ ...validPayload(), optionNo: 'x' });
      expect(result.success).toBe(false);
    });
  });

  describe('invalid payloads - orderCnt', () => {
    it('rejects zero orderCnt', () => {
      const result = validatePayload({ ...validPayload(), orderCnt: 0 });
      expect(result.success).toBe(false);
      expect(result.errors!.some((e) => e.field === 'orderCnt')).toBe(true);
    });

    it('rejects negative orderCnt', () => {
      const result = validatePayload({ ...validPayload(), orderCnt: -10 });
      expect(result.success).toBe(false);
    });

    it('rejects non-integer orderCnt', () => {
      const result = validatePayload({ ...validPayload(), orderCnt: 1.5 });
      expect(result.success).toBe(false);
    });
  });

  describe('invalid payloads - optionInputs', () => {
    it('rejects missing optionInputs', () => {
      const { optionInputs, ...rest } = validPayload();
      const result = validatePayload(rest);
      expect(result.success).toBe(false);
      expect(result.errors!.some((e) => e.field === 'optionInputs')).toBe(true);
    });

    it('rejects null optionInputs', () => {
      const result = validatePayload({ ...validPayload(), optionInputs: null });
      expect(result.success).toBe(false);
    });

    it('rejects optionInputs without designFileUrl', () => {
      const result = validatePayload({
        ...validPayload(),
        optionInputs: { printSpec: '{}' },
      });
      expect(result.success).toBe(false);
      expect(result.errors!.some((e) => e.field === 'optionInputs.designFileUrl')).toBe(true);
    });

    it('rejects optionInputs without printSpec', () => {
      const result = validatePayload({
        ...validPayload(),
        optionInputs: { designFileUrl: 'https://x.com/f.pdf' },
      });
      expect(result.success).toBe(false);
      expect(result.errors!.some((e) => e.field === 'optionInputs.printSpec')).toBe(true);
    });
  });

  describe('invalid payloads - widgetPrice', () => {
    it('rejects missing widgetPrice', () => {
      const { widgetPrice, ...rest } = validPayload();
      const result = validatePayload(rest);
      expect(result.success).toBe(false);
      expect(result.errors!.some((e) => e.field === 'widgetPrice')).toBe(true);
    });

    it('rejects widgetPrice with non-number basePrice', () => {
      const result = validatePayload({
        ...validPayload(),
        widgetPrice: { ...validPayload().widgetPrice as object, basePrice: 'free' },
      });
      expect(result.success).toBe(false);
      expect(result.errors!.some((e) => e.field === 'widgetPrice.basePrice')).toBe(true);
    });

    it('rejects widgetPrice with non-number totalPrice', () => {
      const result = validatePayload({
        ...validPayload(),
        widgetPrice: { ...validPayload().widgetPrice as object, totalPrice: null },
      });
      expect(result.success).toBe(false);
      expect(result.errors!.some((e) => e.field === 'widgetPrice.totalPrice')).toBe(true);
    });
  });
});

// ============================================================================
// Constants
// ============================================================================

describe('shopby/types - WidgetLifecycleState', () => {
  it('has IDLE state', () => {
    expect(WidgetLifecycleState.IDLE).toBe('IDLE');
  });

  it('has LOADING state', () => {
    expect(WidgetLifecycleState.LOADING).toBe('LOADING');
  });

  it('has READY state', () => {
    expect(WidgetLifecycleState.READY).toBe('READY');
  });

  it('has ERROR state', () => {
    expect(WidgetLifecycleState.ERROR).toBe('ERROR');
  });

  it('has DESTROYED state', () => {
    expect(WidgetLifecycleState.DESTROYED).toBe('DESTROYED');
  });

  it('has exactly 5 states', () => {
    expect(Object.keys(WidgetLifecycleState)).toHaveLength(5);
  });
});

describe('shopby/types - ShopbyWidgetErrorCode', () => {
  it('has AUTH_REQUIRED', () => {
    expect(ShopbyWidgetErrorCode.AUTH_REQUIRED).toBe('AUTH_REQUIRED');
  });

  it('has AUTH_EXPIRED', () => {
    expect(ShopbyWidgetErrorCode.AUTH_EXPIRED).toBe('AUTH_EXPIRED');
  });

  it('has PRODUCT_NOT_FOUND', () => {
    expect(ShopbyWidgetErrorCode.PRODUCT_NOT_FOUND).toBe('PRODUCT_NOT_FOUND');
  });

  it('has INVALID_CONFIG', () => {
    expect(ShopbyWidgetErrorCode.INVALID_CONFIG).toBe('INVALID_CONFIG');
  });

  it('has NETWORK_ERROR', () => {
    expect(ShopbyWidgetErrorCode.NETWORK_ERROR).toBe('NETWORK_ERROR');
  });

  it('has API_ERROR', () => {
    expect(ShopbyWidgetErrorCode.API_ERROR).toBe('API_ERROR');
  });

  it('has PRICE_MISMATCH', () => {
    expect(ShopbyWidgetErrorCode.PRICE_MISMATCH).toBe('PRICE_MISMATCH');
  });

  it('has CONTAINER_NOT_FOUND', () => {
    expect(ShopbyWidgetErrorCode.CONTAINER_NOT_FOUND).toBe('CONTAINER_NOT_FOUND');
  });

  it('has ALREADY_INITIALIZED', () => {
    expect(ShopbyWidgetErrorCode.ALREADY_INITIALIZED).toBe('ALREADY_INITIALIZED');
  });

  it('has exactly 9 error codes', () => {
    expect(Object.keys(ShopbyWidgetErrorCode)).toHaveLength(9);
  });
});
