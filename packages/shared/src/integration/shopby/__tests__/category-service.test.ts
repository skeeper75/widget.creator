/**
 * Unit tests for Category Service
 *
 * Tests cover category hierarchy, product type mapping,
 * category CRUD via admin client, and ensureCategories sync.
 *
 * SPEC: SPEC-SHOPBY-002 M3 - Category System
 * AC-005: Print product category hierarchy
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CategoryService,
  PRINT_CATEGORY_HIERARCHY,
} from '../category-service.js';

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockAdminClient() {
  return {
    listCategories: vi.fn().mockResolvedValue([]),
    createCategory: vi.fn().mockImplementation(async (data: { categoryName: string }) => ({
      categoryNo: Math.floor(Math.random() * 10000) + 100,
    })),
    getCategory: vi.fn(),
    updateCategory: vi.fn(),
    createProduct: vi.fn(),
    getProduct: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
    listProducts: vi.fn(),
    getProductOptions: vi.fn(),
    updateProductOptions: vi.fn(),
    healthCheck: vi.fn().mockResolvedValue(true),
    resetCircuitBreaker: vi.fn(),
  };
}

function createSilentLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

// =============================================================================
// SECTION 1: Category Hierarchy Definition (AC-005)
// =============================================================================

describe('PRINT_CATEGORY_HIERARCHY', () => {
  it('should define root category as "인쇄물"', () => {
    expect(PRINT_CATEGORY_HIERARCHY.root.name).toBe('인쇄물');
  });

  it('should have 6 child categories at depth 2', () => {
    expect(PRINT_CATEGORY_HIERARCHY.root.children).toHaveLength(6);
  });

  it('should include 명함 category', () => {
    const namecard = PRINT_CATEGORY_HIERARCHY.root.children.find(c => c.key === 'namecard');
    expect(namecard).toBeDefined();
    expect(namecard?.name).toBe('명함');
  });

  it('should include 스티커/라벨 category', () => {
    const sticker = PRINT_CATEGORY_HIERARCHY.root.children.find(c => c.key === 'sticker');
    expect(sticker).toBeDefined();
    expect(sticker?.name).toBe('스티커/라벨');
  });

  it('should include 전단/리플렛 category', () => {
    const flyer = PRINT_CATEGORY_HIERARCHY.root.children.find(c => c.key === 'flyer');
    expect(flyer).toBeDefined();
    expect(flyer?.name).toBe('전단/리플렛');
  });

  it('should include 책자/카탈로그 category', () => {
    const booklet = PRINT_CATEGORY_HIERARCHY.root.children.find(c => c.key === 'booklet');
    expect(booklet).toBeDefined();
    expect(booklet?.name).toBe('책자/카탈로그');
  });

  it('should include 봉투/서류 category', () => {
    const envelope = PRINT_CATEGORY_HIERARCHY.root.children.find(c => c.key === 'envelope');
    expect(envelope).toBeDefined();
    expect(envelope?.name).toBe('봉투/서류');
  });

  it('should include 포스터/배너 category', () => {
    const poster = PRINT_CATEGORY_HIERARCHY.root.children.find(c => c.key === 'poster');
    expect(poster).toBeDefined();
    expect(poster?.name).toBe('포스터/배너');
  });
});

// =============================================================================
// SECTION 2: CategoryService - Product Type Mapping (AC-005)
// =============================================================================

describe('CategoryService', () => {
  let service: CategoryService;

  beforeEach(() => {
    service = new CategoryService(createSilentLogger());
    service.loadCategoryMappings({
      namecard: 101,
      sticker: 102,
      flyer: 103,
      booklet: 104,
      envelope: 105,
      poster: 106,
    }, 100);
  });

  describe('getCategoryNo', () => {
    it('should map digital-print to namecard (명함) category', () => {
      expect(service.getCategoryNo('digital-print')).toBe(101);
    });

    it('should map namecard to namecard category', () => {
      expect(service.getCategoryNo('namecard')).toBe(101);
    });

    it('should map sticker to sticker category', () => {
      expect(service.getCategoryNo('sticker')).toBe(102);
    });

    it('should map label to sticker category', () => {
      expect(service.getCategoryNo('label')).toBe(102);
    });

    it('should map flyer to flyer category', () => {
      expect(service.getCategoryNo('flyer')).toBe(103);
    });

    it('should map leaflet to flyer category', () => {
      expect(service.getCategoryNo('leaflet')).toBe(103);
    });

    it('should map booklet to booklet category', () => {
      expect(service.getCategoryNo('booklet')).toBe(104);
    });

    it('should map catalog to booklet category', () => {
      expect(service.getCategoryNo('catalog')).toBe(104);
    });

    it('should map envelope to envelope category', () => {
      expect(service.getCategoryNo('envelope')).toBe(105);
    });

    it('should map poster to poster category', () => {
      expect(service.getCategoryNo('poster')).toBe(106);
    });

    it('should map banner to poster category', () => {
      expect(service.getCategoryNo('banner')).toBe(106);
    });

    it('should return undefined for unknown product type', () => {
      expect(service.getCategoryNo('unknown-type')).toBeUndefined();
    });
  });

  describe('getCategoryKey', () => {
    it('should return category key for known product type', () => {
      expect(service.getCategoryKey('digital-print')).toBe('namecard');
    });

    it('should return undefined for unknown product type', () => {
      expect(service.getCategoryKey('unknown')).toBeUndefined();
    });
  });

  // =============================================================================
  // SECTION 3: Category Mapping Management
  // =============================================================================

  describe('setCategoryMapping', () => {
    it('should set a single category mapping', () => {
      const svc = new CategoryService(createSilentLogger());
      svc.setCategoryMapping('namecard', 200);
      expect(svc.getCategoryNo('digital-print')).toBe(200);
    });
  });

  describe('setRootCategoryNo', () => {
    it('should set root category number', () => {
      const svc = new CategoryService(createSilentLogger());
      svc.setRootCategoryNo(999);
      expect(svc.getRootCategoryNo()).toBe(999);
    });
  });

  describe('loadCategoryMappings', () => {
    it('should load all mappings at once', () => {
      const svc = new CategoryService(createSilentLogger());
      svc.loadCategoryMappings({ namecard: 201, sticker: 202 });
      expect(svc.getCategoryNo('digital-print')).toBe(201);
      expect(svc.getCategoryNo('sticker')).toBe(202);
    });

    it('should set root category when provided', () => {
      const svc = new CategoryService(createSilentLogger());
      svc.loadCategoryMappings({}, 500);
      expect(svc.getRootCategoryNo()).toBe(500);
    });

    it('should not overwrite root when not provided', () => {
      const svc = new CategoryService(createSilentLogger());
      svc.setRootCategoryNo(100);
      svc.loadCategoryMappings({});
      expect(svc.getRootCategoryNo()).toBe(100);
    });
  });

  describe('getAllMappings', () => {
    it('should return copy of all mappings', () => {
      const mappings = service.getAllMappings();
      expect(mappings).toEqual({
        namecard: 101,
        sticker: 102,
        flyer: 103,
        booklet: 104,
        envelope: 105,
        poster: 106,
      });
    });
  });

  describe('isFullyMapped', () => {
    it('should return true when all categories are mapped', () => {
      expect(service.isFullyMapped()).toBe(true);
    });

    it('should return false when some categories are missing', () => {
      const svc = new CategoryService(createSilentLogger());
      svc.setCategoryMapping('namecard', 101);
      expect(svc.isFullyMapped()).toBe(false);
    });
  });

  describe('getUnmappedKeys', () => {
    it('should return empty array when fully mapped', () => {
      expect(service.getUnmappedKeys()).toHaveLength(0);
    });

    it('should return unmapped keys', () => {
      const svc = new CategoryService(createSilentLogger());
      svc.setCategoryMapping('namecard', 101);
      const unmapped = svc.getUnmappedKeys();
      expect(unmapped).toContain('sticker');
      expect(unmapped).toContain('flyer');
      expect(unmapped).not.toContain('namecard');
    });
  });

  describe('getHierarchy', () => {
    it('should return the category hierarchy definition', () => {
      const hierarchy = service.getHierarchy();
      expect(hierarchy.root.name).toBe('인쇄물');
      expect(hierarchy.root.children).toHaveLength(6);
    });
  });

  // =============================================================================
  // SECTION 4: ensureCategories (Shopby Sync)
  // =============================================================================

  describe('ensureCategories', () => {
    it('should create root and all child categories when none exist', async () => {
      const client = createMockAdminClient();
      let categoryCounter = 100;
      client.listCategories.mockResolvedValue([]);
      client.createCategory.mockImplementation(async () => ({
        categoryNo: categoryCounter++,
      }));

      const svc = new CategoryService(createSilentLogger());
      const result = await svc.ensureCategories(client as never);

      // 1 root + 6 children = 7 create calls
      expect(client.createCategory).toHaveBeenCalledTimes(7);
      expect(result.size).toBe(6);
    });

    it('should reuse existing root category', async () => {
      const client = createMockAdminClient();
      client.listCategories.mockResolvedValue([
        { categoryNo: 50, categoryName: '인쇄물', depth: 1 },
      ]);
      let childCounter = 200;
      client.createCategory.mockImplementation(async () => ({
        categoryNo: childCounter++,
      }));

      const svc = new CategoryService(createSilentLogger());
      await svc.ensureCategories(client as never);

      expect(svc.getRootCategoryNo()).toBe(50);
      // Only child categories created (6), root is reused
      expect(client.createCategory).toHaveBeenCalledTimes(6);
    });

    it('should reuse existing child categories matched by name and parent', async () => {
      const client = createMockAdminClient();
      client.listCategories.mockResolvedValue([
        { categoryNo: 50, categoryName: '인쇄물', depth: 1 },
        { categoryNo: 51, categoryName: '명함', parentCategoryNo: 50 },
        { categoryNo: 52, categoryName: '스티커/라벨', parentCategoryNo: 50 },
      ]);
      let childCounter = 300;
      client.createCategory.mockImplementation(async () => ({
        categoryNo: childCounter++,
      }));

      const svc = new CategoryService(createSilentLogger());
      const result = await svc.ensureCategories(client as never);

      // 4 new children created (6 total - 2 existing)
      expect(client.createCategory).toHaveBeenCalledTimes(4);
      expect(result.get('namecard')).toBe(51);
      expect(result.get('sticker')).toBe(52);
    });

    it('should create child categories with correct parent', async () => {
      const client = createMockAdminClient();
      client.listCategories.mockResolvedValue([]);
      let counter = 1;
      client.createCategory.mockImplementation(async () => ({
        categoryNo: counter++,
      }));

      const svc = new CategoryService(createSilentLogger());
      await svc.ensureCategories(client as never);

      // First call creates root, rest create children with parentCategoryNo
      const childCalls = client.createCategory.mock.calls.slice(1);
      for (const call of childCalls) {
        expect(call[0].parentCategoryNo).toBe(1); // root is 1
      }
    });

    it('should set displayable to true for new categories', async () => {
      const client = createMockAdminClient();
      client.listCategories.mockResolvedValue([]);
      let counter = 1;
      client.createCategory.mockImplementation(async () => ({
        categoryNo: counter++,
      }));

      const svc = new CategoryService(createSilentLogger());
      await svc.ensureCategories(client as never);

      // Root category should have displayable: true
      expect(client.createCategory.mock.calls[0][0].displayable).toBe(true);
    });
  });

  // =============================================================================
  // SECTION 5: Edge Cases
  // =============================================================================

  describe('edge cases', () => {
    it('should handle empty category map gracefully', () => {
      const svc = new CategoryService(createSilentLogger());
      expect(svc.getCategoryNo('digital-print')).toBeUndefined();
      expect(svc.getRootCategoryNo()).toBeUndefined();
    });

    it('should handle category number changes by overwriting', () => {
      const svc = new CategoryService(createSilentLogger());
      svc.setCategoryMapping('namecard', 101);
      svc.setCategoryMapping('namecard', 201);
      expect(svc.getCategoryNo('digital-print')).toBe(201);
    });

    it('should handle multiple product types mapping to same category', () => {
      // Both 'digital-print' and 'namecard' map to namecard key
      expect(service.getCategoryNo('digital-print')).toBe(service.getCategoryNo('namecard'));
    });

    it('should default to console logger when none provided', () => {
      // Should not throw
      const svc = new CategoryService();
      expect(svc).toBeDefined();
    });
  });
});
