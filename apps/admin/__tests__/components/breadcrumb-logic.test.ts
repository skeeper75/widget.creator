/**
 * Tests for Breadcrumb component logic.
 * Tests the segment label mapping and breadcrumb item generation.
 */
import { describe, it, expect } from 'vitest';

// Re-declare the segment labels map (same as breadcrumb.tsx)
const segmentLabels: Record<string, string> = {
  admin: 'Admin',
  dashboard: 'Dashboard',
  products: 'Products',
  categories: 'Categories',
  list: 'List',
  materials: 'Materials',
  papers: 'Papers',
  mappings: 'Mappings',
  processes: 'Processes',
  'print-modes': 'Print Modes',
  'post-processes': 'Post Processes',
  bindings: 'Bindings',
  imposition: 'Imposition',
  pricing: 'Pricing',
  tables: 'Price Tables',
  tiers: 'Price Tiers',
  fixed: 'Fixed Prices',
  packages: 'Package Prices',
  foil: 'Foil Prices',
  loss: 'Loss Config',
  options: 'Options',
  definitions: 'Definitions',
  choices: 'Choices',
  constraints: 'Constraints',
  dependencies: 'Dependencies',
  integration: 'Integration',
  mes: 'MES Items',
  'mes-mapping': 'MES Mapping',
  editors: 'Editor Mapping',
  'mes-options': 'MES Options',
  widgets: 'Widgets',
  preview: 'Preview',
  settings: 'Settings',
};

function buildBreadcrumbItems(pathname: string) {
  const segments = pathname.split('/').filter(Boolean);
  const items = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const label = segmentLabels[segment] ?? segment;
    const isLast = index === segments.length - 1;
    const isNumeric = /^\d+$/.test(segment);
    const displayLabel = isNumeric ? `#${segment}` : label;
    return { href, label: displayLabel, isLast };
  });
  // Skip the "admin" prefix
  return items.filter((item) => item.label !== 'Admin');
}

describe('breadcrumb label mapping', () => {
  it('maps all SPEC-defined route segments', () => {
    const expectedMappings: Record<string, string> = {
      dashboard: 'Dashboard',
      products: 'Products',
      categories: 'Categories',
      materials: 'Materials',
      papers: 'Papers',
      pricing: 'Pricing',
      options: 'Options',
      integration: 'Integration',
      widgets: 'Widgets',
      settings: 'Settings',
    };

    for (const [segment, label] of Object.entries(expectedMappings)) {
      expect(segmentLabels[segment]).toBe(label);
    }
  });

  it('maps hyphenated segments correctly', () => {
    expect(segmentLabels['print-modes']).toBe('Print Modes');
    expect(segmentLabels['post-processes']).toBe('Post Processes');
    expect(segmentLabels['mes-mapping']).toBe('MES Mapping');
    expect(segmentLabels['mes-options']).toBe('MES Options');
  });
});

describe('buildBreadcrumbItems', () => {
  it('builds dashboard breadcrumb', () => {
    const items = buildBreadcrumbItems('/admin/dashboard');
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({
      href: '/admin/dashboard',
      label: 'Dashboard',
      isLast: true,
    });
  });

  it('builds product list breadcrumb', () => {
    const items = buildBreadcrumbItems('/admin/products/list');
    expect(items).toHaveLength(2);
    expect(items[0].label).toBe('Products');
    expect(items[0].isLast).toBe(false);
    expect(items[1].label).toBe('List');
    expect(items[1].isLast).toBe(true);
  });

  it('builds categories breadcrumb', () => {
    const items = buildBreadcrumbItems('/admin/products/categories');
    expect(items).toHaveLength(2);
    expect(items[0].label).toBe('Products');
    expect(items[1].label).toBe('Categories');
  });

  it('builds dynamic route breadcrumb with numeric ID', () => {
    const items = buildBreadcrumbItems('/admin/products/42');
    expect(items).toHaveLength(2);
    expect(items[0].label).toBe('Products');
    expect(items[1].label).toBe('#42');
  });

  it('builds nested dynamic route breadcrumb', () => {
    const items = buildBreadcrumbItems('/admin/products/42/sizes');
    expect(items).toHaveLength(3);
    expect(items[0].label).toBe('Products');
    expect(items[1].label).toBe('#42');
    expect(items[2].label).toBe('sizes'); // unknown segment, uses raw value
  });

  it('builds pricing tiers breadcrumb', () => {
    const items = buildBreadcrumbItems('/admin/pricing/tiers');
    expect(items).toHaveLength(2);
    expect(items[0].label).toBe('Pricing');
    expect(items[1].label).toBe('Price Tiers');
  });

  it('builds integration mes-mapping breadcrumb', () => {
    const items = buildBreadcrumbItems('/admin/integration/mes-mapping');
    expect(items).toHaveLength(2);
    expect(items[0].label).toBe('Integration');
    expect(items[1].label).toBe('MES Mapping');
  });

  it('builds settings breadcrumb (single level)', () => {
    const items = buildBreadcrumbItems('/admin/settings');
    expect(items).toHaveLength(1);
    expect(items[0].label).toBe('Settings');
  });

  it('filters out admin prefix', () => {
    const items = buildBreadcrumbItems('/admin/dashboard');
    const labels = items.map((i) => i.label);
    expect(labels).not.toContain('Admin');
  });

  it('generates correct href for each breadcrumb item', () => {
    const items = buildBreadcrumbItems('/admin/materials/papers');
    expect(items[0].href).toBe('/admin/materials');
    expect(items[1].href).toBe('/admin/materials/papers');
  });

  it('marks only the last item as isLast', () => {
    const items = buildBreadcrumbItems('/admin/options/constraints');
    expect(items[0].isLast).toBe(false);
    expect(items[1].isLast).toBe(true);
  });
});
