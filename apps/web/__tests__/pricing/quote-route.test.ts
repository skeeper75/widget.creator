import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@widget-creator/shared/db';
import { createMockWidgetToken } from '../setup.js';

const ORIGIN = 'http://localhost:3000';

// Mock @widget-creator/core pricing engine
const mockCalculatePrice = vi.fn();
const mockAssembleQuote = vi.fn();

vi.mock('@widget-creator/core', () => {
  class PricingError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.name = 'PricingError';
      this.code = code;
    }
  }
  class ConstraintError extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.name = 'ConstraintError';
      this.code = code;
    }
  }
  return {
    calculatePrice: mockCalculatePrice,
    assembleQuote: mockAssembleQuote,
    PricingError,
    ConstraintError,
  };
});

async function createAuthenticatedRequest(
  url: string,
  options: { method?: string; body?: unknown } = {},
): Promise<NextRequest> {
  const token = await createMockWidgetToken({ allowed_origins: [ORIGIN] });
  const init: RequestInit = {
    method: options.method ?? 'POST',
    headers: {
      'x-widget-token': token,
      'origin': ORIGIN,
      'content-type': 'application/json',
    },
  };
  if (options.body) {
    init.body = JSON.stringify(options.body);
  }
  return new NextRequest(new URL(url), { ...init, signal: undefined });
}

function routeCtx(params: Record<string, string> = {}) {
  return { params: Promise.resolve(params) };
}

// Standard mock data
const mockProduct = {
  id: 42,
  name: 'Business Card',
  categoryId: 1,
  pricingModel: 'tier',
  isActive: true,
};

const mockSize = {
  id: 10,
  productId: 42,
  cutWidth: '90',
  cutHeight: '50',
  impositionCount: 16,
  isCustom: false,
  isActive: true,
};

const mockPaperMapping = {
  id: 1,
  paperId: 5,
  productId: 42,
  isActive: true,
};

const mockPricingResult = {
  totalPrice: 50000,
  unitPrice: 50,
  breakdown: {
    printCost: 20000,
    paperCost: 15000,
    coatingCost: 5000,
    bindingCost: 0,
    postProcessCost: 10000,
    packagingCost: 0,
  },
};

const mockQuoteResult = {
  subtotal: 50000,
  vatAmount: 5000,
  totalPrice: 55000,
  unitPrice: 55,
  expiresAt: new Date('2026-03-01T00:00:00Z').getTime(),
};

const validQuoteBody = {
  product_id: 42,
  size_id: 10,
  paper_id: 5,
  quantity: 1000,
  post_processes: [],
  accessories: [],
};

describe('POST /api/v1/pricing/quote', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockCalculatePrice.mockReset();
    mockAssembleQuote.mockReset();
  });

  /**
   * Set up sequential DB mock for the quote route.
   * Call order: product lookup, size lookup, paper mapping lookup (optional),
   * then 10 parallel lookups via Promise.all.
   */
  function mockQuoteDbCalls(options: {
    product?: Record<string, unknown> | null;
    size?: Record<string, unknown> | null;
    paperMapping?: Record<string, unknown> | null;
    lookupData?: Record<string, unknown[]>;
  } = {}) {
    const {
      product = mockProduct,
      size = mockSize,
      paperMapping = mockPaperMapping,
      lookupData = {},
    } = options;

    let selectCall = 0;
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
      selectCall++;

      // Call 1: product lookup
      if (selectCall === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(product ? [product] : []),
          }),
        };
      }

      // Call 2: size lookup
      if (selectCall === 2) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(size ? [size] : []),
          }),
        };
      }

      // Call 3: paper mapping lookup (when paper_id is provided)
      if (selectCall === 3 && paperMapping !== undefined) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(paperMapping ? [paperMapping] : []),
          }),
        };
      }

      // Calls 4-13 (or 3-12 when no paper_id): parallel lookup data
      // Return empty arrays by default for all parallel lookups
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(lookupData.default ?? []),
        }),
      };
    });
  }

  it('should return a valid pricing quote', async () => {
    mockQuoteDbCalls();
    mockCalculatePrice.mockReturnValue(mockPricingResult);
    mockAssembleQuote.mockResolvedValue(mockQuoteResult);

    const { POST } = await import('../../app/api/v1/pricing/quote/route.js');
    const req = await createAuthenticatedRequest(
      'http://localhost:3000/api/v1/pricing/quote',
      { body: validQuoteBody },
    );

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toBeDefined();
    expect(body.data.product_id).toBe(42);
    expect(body.data.product_name).toBe('Business Card');
    expect(body.data.pricing_model).toBe('tier');
    expect(body.data.quantity).toBe(1000);
    expect(body.data.currency).toBe('KRW');
    expect(body.data.breakdown).toBeDefined();
    expect(body.data.breakdown.print_cost).toBe(20000);
    expect(body.data.breakdown.paper_cost).toBe(15000);
    expect(body.data.breakdown.subtotal).toBe(50000);
    expect(body.data.breakdown.vat).toBe(5000);
    expect(body.data.breakdown.total).toBe(55000);
    expect(body.data.unit_price).toBe(55);
    expect(body.data.valid_until).toBeDefined();

    // Verify calculatePrice was called with correct input shape
    expect(mockCalculatePrice).toHaveBeenCalledOnce();
    const priceInput = mockCalculatePrice.mock.calls[0][0];
    expect(priceInput.productId).toBe(42);
    expect(priceInput.quantity).toBe(1000);
    expect(priceInput.pricingModel).toBe('tier');
  });

  it('should return 404 when product not found', async () => {
    mockQuoteDbCalls({ product: null });

    const { POST } = await import('../../app/api/v1/pricing/quote/route.js');
    const req = await createAuthenticatedRequest(
      'http://localhost:3000/api/v1/pricing/quote',
      { body: validQuoteBody },
    );

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.type).toContain('not-found');
  });

  it('should return 400 when size is not valid for product', async () => {
    mockQuoteDbCalls({ size: null });

    const { POST } = await import('../../app/api/v1/pricing/quote/route.js');
    const req = await createAuthenticatedRequest(
      'http://localhost:3000/api/v1/pricing/quote',
      { body: validQuoteBody },
    );

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.type).toContain('validation');
    expect(body.errors).toBeDefined();
    expect(body.errors[0].field).toBe('size_id');
  });

  it('should return 400 when paper is not mapped to product', async () => {
    mockQuoteDbCalls({ paperMapping: null });

    const { POST } = await import('../../app/api/v1/pricing/quote/route.js');
    const req = await createAuthenticatedRequest(
      'http://localhost:3000/api/v1/pricing/quote',
      { body: validQuoteBody },
    );

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.type).toContain('validation');
    expect(body.errors[0].field).toBe('paper_id');
  });

  it('should return 400 when calculatePrice throws PricingError', async () => {
    mockQuoteDbCalls();

    // Import PricingError from the mocked module
    const { PricingError } = await import('@widget-creator/core');
    mockCalculatePrice.mockImplementation(() => {
      throw new PricingError('TIER_NOT_FOUND', { message: 'No price tier found for quantity 1000' });
    });

    const { POST } = await import('../../app/api/v1/pricing/quote/route.js');
    const req = await createAuthenticatedRequest(
      'http://localhost:3000/api/v1/pricing/quote',
      { body: validQuoteBody },
    );

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.type).toContain('price-calculation');
    expect(body.detail).toContain('No price tier found');
  });

  it('should return 422 when calculatePrice throws ConstraintError', async () => {
    mockQuoteDbCalls();

    const { ConstraintError } = await import('@widget-creator/core');
    mockCalculatePrice.mockImplementation(() => {
      throw new ConstraintError('INCOMPATIBLE_OPTIONS', { message: 'Lamination not available with this paper' });
    });

    const { POST } = await import('../../app/api/v1/pricing/quote/route.js');
    const req = await createAuthenticatedRequest(
      'http://localhost:3000/api/v1/pricing/quote',
      { body: validQuoteBody },
    );

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.type).toContain('option-constraint');
    expect(body.detail).toContain('Lamination not available');
  });

  it('should return 401 without widget token', async () => {
    const { POST } = await import('../../app/api/v1/pricing/quote/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/pricing/quote', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(validQuoteBody),
    });

    const response = await POST(req, routeCtx());

    expect(response.status).toBe(401);
  });

  it('should return 422 for invalid request body', async () => {
    const { POST } = await import('../../app/api/v1/pricing/quote/route.js');
    const req = await createAuthenticatedRequest(
      'http://localhost:3000/api/v1/pricing/quote',
      { body: { quantity: 100 } }, // missing required product_id and size_id
    );

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(422);
  });

  it('should work without optional paper_id', async () => {
    const bodyWithoutPaper = {
      product_id: 42,
      size_id: 10,
      quantity: 500,
      post_processes: [],
    };

    // When no paper_id, there are only 2 sequential calls (product, size) then 10 parallel
    let selectCall = 0;
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockProduct]),
          }),
        };
      }
      if (selectCall === 2) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockSize]),
          }),
        };
      }
      // All parallel lookups return empty arrays
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      };
    });

    mockCalculatePrice.mockReturnValue(mockPricingResult);
    mockAssembleQuote.mockResolvedValue(mockQuoteResult);

    const { POST } = await import('../../app/api/v1/pricing/quote/route.js');
    const req = await createAuthenticatedRequest(
      'http://localhost:3000/api/v1/pricing/quote',
      { body: bodyWithoutPaper },
    );

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.quantity).toBe(500);
  });

  it('should include selected options display in response', async () => {
    // Use lookup data with real papers and print modes
    let selectCall = 0;
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockProduct]),
          }),
        };
      }
      if (selectCall === 2) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockSize]),
          }),
        };
      }
      if (selectCall === 3) {
        // paper mapping
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([mockPaperMapping]),
          }),
        };
      }
      // Parallel lookups - return specific data for papers and print modes
      // The Promise.all order: priceTiers, fixedPrices, packagePrices, foilPrices,
      // impositionRules, lossConfigs, papers, printModes, postProcesses, bindings
      const parallelIndex = selectCall - 3;
      if (parallelIndex === 7) {
        // papers
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { id: 5, code: 'ART250', name: 'Art Paper 250g', weight: 250, costPer4Cut: '100', sellingPer4Cut: '150' },
            ]),
          }),
        };
      }
      if (parallelIndex === 8) {
        // printModes
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { id: 3, code: 'DOUBLE_COLOR', name: 'Double-sided Color', priceCode: 'DC', sides: 'double', colorType: 'color' },
            ]),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      };
    });

    mockCalculatePrice.mockReturnValue(mockPricingResult);
    mockAssembleQuote.mockResolvedValue(mockQuoteResult);

    const { POST } = await import('../../app/api/v1/pricing/quote/route.js');
    const req = await createAuthenticatedRequest(
      'http://localhost:3000/api/v1/pricing/quote',
      {
        body: {
          ...validQuoteBody,
          print_mode_id: 3,
        },
      },
    );

    const response = await POST(req, routeCtx());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.selected_options).toBeDefined();
    // The selectedOptions display is built from the matched paper/print_mode
    expect(body.data.selected_options.paper).toBe('Art Paper 250g');
    expect(body.data.selected_options.print_mode).toBe('Double-sided Color');
  });

  it('should reject quantity exceeding maximum', async () => {
    const { POST } = await import('../../app/api/v1/pricing/quote/route.js');
    const req = await createAuthenticatedRequest(
      'http://localhost:3000/api/v1/pricing/quote',
      {
        body: {
          ...validQuoteBody,
          quantity: 200000, // max is 100000
        },
      },
    );

    const response = await POST(req, routeCtx());

    expect(response.status).toBe(422);
  });
});
