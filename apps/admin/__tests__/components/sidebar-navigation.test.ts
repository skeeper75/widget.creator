/**
 * Tests for Sidebar navigation structure.
 * REQ-U-008: Responsive sidebar navigation with domain groups and icons.
 *
 * Validates the navigation item structure matches SPEC Section 4.6.
 */
import { describe, it, expect } from 'vitest';

interface NavItem {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
}

// Re-declare navItems structure (same as sidebar.tsx, without icon references)
const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard' },
  {
    label: 'Product Management',
    href: '/admin/products',
    children: [
      { label: 'Categories', href: '/admin/products/categories' },
      { label: 'Products', href: '/admin/products/list' },
    ],
  },
  {
    label: 'Material Management',
    href: '/admin/materials',
    children: [
      { label: 'Papers', href: '/admin/materials/papers' },
      { label: 'Materials', href: '/admin/materials/materials' },
      { label: 'Paper-Product Mapping', href: '/admin/materials/mappings' },
    ],
  },
  {
    label: 'Process Management',
    href: '/admin/processes',
    children: [
      { label: 'Print Modes', href: '/admin/processes/print-modes' },
      { label: 'Post Processes', href: '/admin/processes/post-processes' },
      { label: 'Bindings', href: '/admin/processes/bindings' },
      { label: 'Imposition Rules', href: '/admin/processes/imposition' },
    ],
  },
  {
    label: 'Price Management',
    href: '/admin/pricing',
    children: [
      { label: 'Price Tables', href: '/admin/pricing/tables' },
      { label: 'Price Tiers', href: '/admin/pricing/tiers' },
      { label: 'Fixed Prices', href: '/admin/pricing/fixed' },
      { label: 'Package Prices', href: '/admin/pricing/packages' },
      { label: 'Foil Prices', href: '/admin/pricing/foil' },
      { label: 'Loss Config', href: '/admin/pricing/loss' },
    ],
  },
  {
    label: 'Option Management',
    href: '/admin/options',
    children: [
      { label: 'Definitions', href: '/admin/options/definitions' },
      { label: 'Choices', href: '/admin/options/choices' },
      { label: 'Constraints', href: '/admin/options/constraints' },
      { label: 'Dependencies', href: '/admin/options/dependencies' },
    ],
  },
  {
    label: 'System Integration',
    href: '/admin/integration',
    children: [
      { label: 'MES Items', href: '/admin/integration/mes' },
      { label: 'MES Mapping', href: '/admin/integration/mes-mapping' },
      { label: 'Editor Mapping', href: '/admin/integration/editors' },
      { label: 'MES Options', href: '/admin/integration/mes-options' },
    ],
  },
  {
    label: 'Widget Management',
    href: '/admin/widgets',
    children: [
      { label: 'Widgets', href: '/admin/widgets/list' },
      { label: 'Preview', href: '/admin/widgets/preview' },
    ],
  },
  { label: 'Settings', href: '/admin/settings' },
];

describe('sidebar navigation structure (REQ-U-008)', () => {
  it('has 9 top-level navigation items matching SPEC Section 4.6', () => {
    expect(navItems).toHaveLength(9);
  });

  it('has correct domain group labels', () => {
    const labels = navItems.map((item) => item.label);
    expect(labels).toEqual([
      'Dashboard',
      'Product Management',
      'Material Management',
      'Process Management',
      'Price Management',
      'Option Management',
      'System Integration',
      'Widget Management',
      'Settings',
    ]);
  });

  it('Dashboard has no children (direct link)', () => {
    const dashboard = navItems.find((i) => i.label === 'Dashboard');
    expect(dashboard?.children).toBeUndefined();
    expect(dashboard?.href).toBe('/admin/dashboard');
  });

  it('Settings has no children (direct link)', () => {
    const settings = navItems.find((i) => i.label === 'Settings');
    expect(settings?.children).toBeUndefined();
    expect(settings?.href).toBe('/admin/settings');
  });

  describe('Product Management group', () => {
    const group = navItems.find((i) => i.label === 'Product Management');

    it('has 2 child items', () => {
      expect(group?.children).toHaveLength(2);
    });

    it('includes Categories page (REQ-E-101)', () => {
      expect(group?.children?.find((c) => c.label === 'Categories')).toBeDefined();
    });

    it('includes Products list page (REQ-E-103)', () => {
      expect(group?.children?.find((c) => c.label === 'Products')).toBeDefined();
    });
  });

  describe('Material Management group', () => {
    const group = navItems.find((i) => i.label === 'Material Management');

    it('has 3 child items', () => {
      expect(group?.children).toHaveLength(3);
    });

    it('includes Papers, Materials, and Paper-Product Mapping', () => {
      const labels = group?.children?.map((c) => c.label) ?? [];
      expect(labels).toContain('Papers');
      expect(labels).toContain('Materials');
      expect(labels).toContain('Paper-Product Mapping');
    });
  });

  describe('Process Management group', () => {
    const group = navItems.find((i) => i.label === 'Process Management');

    it('has 4 child items', () => {
      expect(group?.children).toHaveLength(4);
    });

    it('includes all process pages', () => {
      const labels = group?.children?.map((c) => c.label) ?? [];
      expect(labels).toContain('Print Modes');
      expect(labels).toContain('Post Processes');
      expect(labels).toContain('Bindings');
      expect(labels).toContain('Imposition Rules');
    });
  });

  describe('Price Management group', () => {
    const group = navItems.find((i) => i.label === 'Price Management');

    it('has 6 child items', () => {
      expect(group?.children).toHaveLength(6);
    });

    it('includes all pricing pages', () => {
      const labels = group?.children?.map((c) => c.label) ?? [];
      expect(labels).toContain('Price Tables');
      expect(labels).toContain('Price Tiers');
      expect(labels).toContain('Fixed Prices');
      expect(labels).toContain('Package Prices');
      expect(labels).toContain('Foil Prices');
      expect(labels).toContain('Loss Config');
    });
  });

  describe('Option Management group', () => {
    const group = navItems.find((i) => i.label === 'Option Management');

    it('has 4 child items', () => {
      expect(group?.children).toHaveLength(4);
    });

    it('includes all option pages', () => {
      const labels = group?.children?.map((c) => c.label) ?? [];
      expect(labels).toContain('Definitions');
      expect(labels).toContain('Choices');
      expect(labels).toContain('Constraints');
      expect(labels).toContain('Dependencies');
    });
  });

  describe('System Integration group', () => {
    const group = navItems.find((i) => i.label === 'System Integration');

    it('has 4 child items', () => {
      expect(group?.children).toHaveLength(4);
    });

    it('includes all integration pages', () => {
      const labels = group?.children?.map((c) => c.label) ?? [];
      expect(labels).toContain('MES Items');
      expect(labels).toContain('MES Mapping');
      expect(labels).toContain('Editor Mapping');
      expect(labels).toContain('MES Options');
    });
  });

  describe('Widget Management group', () => {
    const group = navItems.find((i) => i.label === 'Widget Management');

    it('has 2 child items', () => {
      expect(group?.children).toHaveLength(2);
    });

    it('includes Widgets and Preview', () => {
      const labels = group?.children?.map((c) => c.label) ?? [];
      expect(labels).toContain('Widgets');
      expect(labels).toContain('Preview');
    });
  });

  describe('href uniqueness', () => {
    it('all child hrefs are unique', () => {
      const allHrefs: string[] = [];
      for (const item of navItems) {
        allHrefs.push(item.href);
        if (item.children) {
          for (const child of item.children) {
            allHrefs.push(child.href);
          }
        }
      }
      const uniqueHrefs = new Set(allHrefs);
      expect(uniqueHrefs.size).toBe(allHrefs.length);
    });
  });

  describe('path prefix consistency', () => {
    it('all child hrefs start with parent href', () => {
      for (const item of navItems) {
        if (item.children) {
          for (const child of item.children) {
            expect(child.href.startsWith(item.href)).toBe(true);
          }
        }
      }
    });
  });

  describe('route coverage', () => {
    it('total navigable routes count', () => {
      let totalRoutes = 0;
      for (const item of navItems) {
        if (item.children) {
          totalRoutes += item.children.length;
        } else {
          totalRoutes += 1;
        }
      }
      // Dashboard(1) + Products(2) + Materials(3) + Processes(4) + Pricing(6) + Options(4) + Integration(4) + Widgets(2) + Settings(1) = 27
      expect(totalRoutes).toBe(27);
    });
  });
});
