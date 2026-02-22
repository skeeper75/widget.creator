import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@widget-creator/shared/db';

// ─── GET /api/widget/config/:widgetId ──────────────────────────

describe('GET /api/widget/config/:widgetId', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  function routeCtx(params: Record<string, string> = {}) {
    return { params: Promise.resolve(params) };
  }

  const mockWidget = {
    id: 1,
    widgetId: 'wgt_test_001',
    name: 'Test Widget',
    status: 'active',
    theme: { primary_color: '#000', secondary_color: '#ccc', font_family: 'Arial', border_radius: '8px' },
    apiBaseUrl: 'http://localhost:3000/api/v1',
    allowedOrigins: ['http://localhost:3000'],
    features: { quote: true, order: true },
  };

  function mockWidgetQuery(widget: Record<string, unknown> | null) {
    (db.select as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(widget ? [widget] : []),
        }),
      }),
    }));
  }

  it('should return widget configuration', async () => {
    mockWidgetQuery(mockWidget);

    const { GET } = await import('../../app/api/widget/config/[widgetId]/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/config/wgt_test_001');

    const response = await GET(req, routeCtx({ widgetId: 'wgt_test_001' }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.widget_id).toBe('wgt_test_001');
    expect(body.data.name).toBe('Test Widget');
    expect(body.data.status).toBe('active');
    expect(body.data.theme).toBeDefined();
    expect(body.data.allowed_origins).toEqual(['http://localhost:3000']);
    expect(response.headers.get('Cache-Control')).toContain('max-age=300');
  });

  it('should return 404 for non-existent widget', async () => {
    mockWidgetQuery(null);

    const { GET } = await import('../../app/api/widget/config/[widgetId]/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/config/wgt_none');

    const response = await GET(req, routeCtx({ widgetId: 'wgt_none' }));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.type).toContain('not-found');
  });

  it('should return 403 for inactive widget', async () => {
    mockWidgetQuery({ ...mockWidget, status: 'inactive' });

    const { GET } = await import('../../app/api/widget/config/[widgetId]/route.js');
    const req = new NextRequest('http://localhost:3000/api/widget/config/wgt_test_001');

    const response = await GET(req, routeCtx({ widgetId: 'wgt_test_001' }));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.type).toContain('forbidden');
  });
});

// ─── GET /api/widget/embed.js ──────────────────────────────────

describe('GET /api/widget/embed.js', () => {
  it('should return JavaScript embed script', async () => {
    const { GET } = await import('../../app/api/widget/embed.js/route.js');

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/javascript');
    expect(response.headers.get('Cache-Control')).toContain('public');
    expect(response.headers.get('X-Widget-Version')).toBe('1.0.0');
    expect(response.headers.get('ETag')).toBeTruthy();

    const body = await response.text();
    expect(body).toContain('WidgetCreator');
    expect(body).toContain('widgetId');
  });

  it('should include cache headers for CDN', async () => {
    const { GET } = await import('../../app/api/widget/embed.js/route.js');

    const response = await GET();

    const cacheControl = response.headers.get('Cache-Control');
    expect(cacheControl).toContain('max-age=86400');
    expect(cacheControl).toContain('s-maxage=604800');
  });
});
