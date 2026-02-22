import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@widget-creator/shared/db';
import { createMockWidgetToken } from '../setup.js';

const ORIGIN = 'http://localhost:3000';

async function createAuthenticatedRequest(
  url: string,
  searchParams?: Record<string, string>,
): Promise<NextRequest> {
  const token = await createMockWidgetToken({ allowed_origins: [ORIGIN] });
  const fullUrl = new URL(url);
  if (searchParams) {
    for (const [k, v] of Object.entries(searchParams)) {
      fullUrl.searchParams.set(k, v);
    }
  }
  return new NextRequest(fullUrl, {
    headers: { 'x-widget-token': token, 'origin': ORIGIN },
  });
}

function routeCtx(params: Record<string, string> = {}) {
  return { params: Promise.resolve(params) };
}

const NOW = new Date('2026-02-22T10:00:00.000Z');

const MOCK_PRODUCT = {
  id: 42,
  categoryId: 1,
  huniCode: '1001',
  edicusCode: 'ED-001',
  shopbyId: '30146712',
  name: 'Wireless Booklet',
  slug: 'wireless-booklet',
  productType: 'booklet',
  pricingModel: 'fixed_unit',
  sheetStandard: 'A4',
  orderMethod: 'standard',
  editorEnabled: true,
  description: 'Test product',
  isActive: true,
  mesRegistered: false,
  createdAt: NOW,
  updatedAt: NOW,
};

const MOCK_CATEGORY = { id: 1, code: 'BOK', name: 'Booklets' };

// ─── GET /api/v1/catalog/products/:id ─────────────────────────

describe('GET /api/v1/catalog/products/:id', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function mockDetailQueries(
    row: { product: Record<string, unknown>; category: Record<string, unknown> | null } | null,
    sizesCount = 5,
    optionsCount = 3,
  ) {
    let selectCall = 0;
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) {
        // product + category join
        return {
          from: vi.fn().mockReturnValue({
            leftJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(row ? [row] : []),
            }),
          }),
        };
      }
      // count queries (sizes then options)
      const countVal = selectCall === 2 ? sizesCount : optionsCount;
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ value: countVal }]),
        }),
      };
    });
  }

  it('should return product detail with category and counts', async () => {
    mockDetailQueries({ product: MOCK_PRODUCT, category: MOCK_CATEGORY });

    const { GET } = await import('../../app/api/v1/catalog/products/[id]/route.js');
    const req = await createAuthenticatedRequest('http://localhost:3000/api/v1/catalog/products/42');

    const response = await GET(req, routeCtx({ id: '42' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.id).toBe(42);
    expect(body.data.name).toBe('Wireless Booklet');
    expect(body.data.category).toEqual({ id: 1, code: 'BOK', name: 'Booklets' });
    expect(body.data.sizes_count).toBe(5);
    expect(body.data.options_count).toBe(3);
  });

  it('should return 404 for non-existent product', async () => {
    mockDetailQueries(null);

    const { GET } = await import('../../app/api/v1/catalog/products/[id]/route.js');
    const req = await createAuthenticatedRequest('http://localhost:3000/api/v1/catalog/products/999');

    const response = await GET(req, routeCtx({ id: '999' }));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.type).toContain('not-found');
  });

  it('should handle product without category', async () => {
    mockDetailQueries({ product: MOCK_PRODUCT, category: null });

    const { GET } = await import('../../app/api/v1/catalog/products/[id]/route.js');
    const req = await createAuthenticatedRequest('http://localhost:3000/api/v1/catalog/products/42');

    const response = await GET(req, routeCtx({ id: '42' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.category).toBeNull();
  });

  it('should return 401 without widget token', async () => {
    const { GET } = await import('../../app/api/v1/catalog/products/[id]/route.js');
    const req = new NextRequest('http://localhost:3000/api/v1/catalog/products/42');

    const response = await GET(req, routeCtx({ id: '42' }));

    expect(response.status).toBe(401);
  });
});

// ─── GET /api/v1/catalog/products/:id/sizes ──────────────────

describe('GET /api/v1/catalog/products/:id/sizes', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function mockSizesQuery(rows: Record<string, unknown>[]) {
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockResolvedValue(rows),
        }),
      }),
    });
  }

  it('should return product sizes list', async () => {
    const sizeRows = [
      {
        id: 1, code: 'A4', displayName: 'A4 (210x297)',
        cutWidth: '210', cutHeight: '297',
        workWidth: '216', workHeight: '303',
        bleed: '3', impositionCount: 1,
        isCustom: false, displayOrder: 1,
        customMinW: null, customMinH: null, customMaxW: null, customMaxH: null,
      },
      {
        id: 2, code: 'CUSTOM', displayName: 'Custom Size',
        cutWidth: null, cutHeight: null,
        workWidth: null, workHeight: null,
        bleed: '3', impositionCount: 1,
        isCustom: true, displayOrder: 2,
        customMinW: '100', customMinH: '100', customMaxW: '500', customMaxH: '500',
      },
    ];
    mockSizesQuery(sizeRows);

    const { GET } = await import('../../app/api/v1/catalog/products/[id]/sizes/route.js');
    const req = await createAuthenticatedRequest('http://localhost:3000/api/v1/catalog/products/42/sizes');

    const response = await GET(req, routeCtx({ id: '42' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].code).toBe('A4');
    expect(body.data[0].cut_width).toBe(210);
    // Custom size should include custom bounds
    expect(body.data[1].is_custom).toBe(true);
    expect(body.data[1].custom_min_w).toBe(100);
    expect(body.data[1].custom_max_w).toBe(500);
  });

  it('should return empty array when no sizes', async () => {
    mockSizesQuery([]);

    const { GET } = await import('../../app/api/v1/catalog/products/[id]/sizes/route.js');
    const req = await createAuthenticatedRequest('http://localhost:3000/api/v1/catalog/products/42/sizes');

    const response = await GET(req, routeCtx({ id: '42' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
  });
});

// ─── GET /api/v1/catalog/products/:id/papers ─────────────────

describe('GET /api/v1/catalog/products/:id/papers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function mockPapersQuery(rows: Record<string, unknown>[]) {
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(rows),
          }),
        }),
      }),
    });
  }

  it('should return product papers list', async () => {
    const paperRows = [{
      paper: { id: 10, code: 'ART250', name: 'Art Paper 250g', abbreviation: 'art250', weight: 250, displayOrder: 1 },
      mapping: { coverType: 'body', isDefault: true },
    }];
    mockPapersQuery(paperRows);

    const { GET } = await import('../../app/api/v1/catalog/products/[id]/papers/route.js');
    const req = await createAuthenticatedRequest('http://localhost:3000/api/v1/catalog/products/42/papers');

    const response = await GET(req, routeCtx({ id: '42' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].code).toBe('ART250');
    expect(body.data[0].cover_type).toBe('body');
    expect(body.data[0].is_default).toBe(true);
  });

  it('should return empty array when no papers', async () => {
    mockPapersQuery([]);

    const { GET } = await import('../../app/api/v1/catalog/products/[id]/papers/route.js');
    const req = await createAuthenticatedRequest('http://localhost:3000/api/v1/catalog/products/42/papers');

    const response = await GET(req, routeCtx({ id: '42' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
  });
});

// ─── GET /api/v1/catalog/products/:id/options ────────────────

describe('GET /api/v1/catalog/products/:id/options', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function mockOptionsQuery(
    poRows: Record<string, unknown>[],
    choiceRows: Record<string, unknown>[] = [],
  ) {
    let selectCall = 0;
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => {
      selectCall++;
      if (selectCall === 1) {
        // product options + option definitions join
        return {
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                orderBy: vi.fn().mockResolvedValue(poRows),
              }),
            }),
          }),
        };
      }
      // option choices
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(choiceRows),
          }),
        }),
      };
    });
  }

  it('should return product options with choices', async () => {
    const poRows = [{
      po: {
        id: 1, productId: 42, optionDefinitionId: 10,
        uiComponentOverride: null, displayOrder: 1,
        isRequired: true, isVisible: true, defaultChoiceId: 100,
      },
      od: {
        id: 10, key: 'paper_weight', name: 'Paper Weight',
        optionClass: 'material', optionType: 'select', uiComponent: 'dropdown',
        isActive: true,
      },
    }];
    const choiceRows = [
      { id: 100, optionDefinitionId: 10, code: 'ART250', name: 'Art 250g', priceKey: 'paper_art250', refPaperId: 1, displayOrder: 1, isActive: true },
      { id: 101, optionDefinitionId: 10, code: 'ART300', name: 'Art 300g', priceKey: 'paper_art300', refPaperId: 2, displayOrder: 2, isActive: true },
    ];
    mockOptionsQuery(poRows, choiceRows);

    const { GET } = await import('../../app/api/v1/catalog/products/[id]/options/route.js');
    const req = await createAuthenticatedRequest('http://localhost:3000/api/v1/catalog/products/42/options');

    const response = await GET(req, routeCtx({ id: '42' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].option_definition.key).toBe('paper_weight');
    expect(body.data[0].choices).toHaveLength(2);
    expect(body.data[0].choices[0].code).toBe('ART250');
  });

  it('should return empty array when no options', async () => {
    mockOptionsQuery([]);

    const { GET } = await import('../../app/api/v1/catalog/products/[id]/options/route.js');
    const req = await createAuthenticatedRequest('http://localhost:3000/api/v1/catalog/products/42/options');

    const response = await GET(req, routeCtx({ id: '42' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
  });
});

// ─── GET /api/v1/catalog/products/:id/constraints ────────────

describe('GET /api/v1/catalog/products/:id/constraints', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function mockConstraintsQuery(rows: Record<string, unknown>[]) {
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(rows),
      }),
    });
  }

  it('should return product option constraints', async () => {
    const constraintRows = [{
      id: 1,
      constraintType: 'visibility',
      sourceOptionId: 10,
      sourceField: 'value',
      operator: 'equals',
      value: 'glossy',
      targetOptionId: 20,
      targetField: null,
      targetAction: 'hide',
      description: 'Hide binding when glossy',
      priority: 1,
    }];
    mockConstraintsQuery(constraintRows);

    const { GET } = await import('../../app/api/v1/catalog/products/[id]/constraints/route.js');
    const req = await createAuthenticatedRequest('http://localhost:3000/api/v1/catalog/products/42/constraints');

    const response = await GET(req, routeCtx({ id: '42' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].constraint_type).toBe('visibility');
    expect(body.data[0].target_action).toBe('hide');
  });

  it('should return empty array when no constraints', async () => {
    mockConstraintsQuery([]);

    const { GET } = await import('../../app/api/v1/catalog/products/[id]/constraints/route.js');
    const req = await createAuthenticatedRequest('http://localhost:3000/api/v1/catalog/products/42/constraints');

    const response = await GET(req, routeCtx({ id: '42' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
  });
});

// ─── GET /api/v1/catalog/products/:id/dependencies ───────────

describe('GET /api/v1/catalog/products/:id/dependencies', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function mockDependenciesQuery(rows: Record<string, unknown>[]) {
    (db.select as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(rows),
      }),
    });
  }

  it('should return product option dependencies', async () => {
    const depRows = [{
      id: 1,
      parentOptionId: 10,
      parentChoiceId: 100,
      childOptionId: 20,
      dependencyType: 'visibility',
    }];
    mockDependenciesQuery(depRows);

    const { GET } = await import('../../app/api/v1/catalog/products/[id]/dependencies/route.js');
    const req = await createAuthenticatedRequest('http://localhost:3000/api/v1/catalog/products/42/dependencies');

    const response = await GET(req, routeCtx({ id: '42' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].parent_option_id).toBe(10);
    expect(body.data[0].dependency_type).toBe('visibility');
  });

  it('should return empty array when no dependencies', async () => {
    mockDependenciesQuery([]);

    const { GET } = await import('../../app/api/v1/catalog/products/[id]/dependencies/route.js');
    const req = await createAuthenticatedRequest('http://localhost:3000/api/v1/catalog/products/42/dependencies');

    const response = await GET(req, routeCtx({ id: '42' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
  });
});
