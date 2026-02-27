/**
 * Shopby Category Service
 *
 * Manages the 2-depth print product category hierarchy for Shopby.
 * Maps Widget Creator product types to Shopby categories.
 *
 * Category hierarchy:
 * - 1depth: 인쇄물
 *   - 2depth: 명함, 스티커/라벨, 전단/리플렛, 책자/카탈로그, 봉투/서류, 포스터/배너
 *
 * Reference: SPEC-SHOPBY-002, R-PRD-005
 *
 * @MX:NOTE: Category mappings must be initialized before use by calling
 * ensureCategories() or loadCategoryMappings() with Shopby category numbers.
 */

import type { ShopbyCategory } from './types.js';
import type { ShopbyAdminClient } from './admin-client.js';

// =============================================================================
// SECTION 1: Category Hierarchy Definition
// =============================================================================

/**
 * Category child definition
 */
export interface CategoryChild {
  /** Internal key for mapping */
  key: string;
  /** Display name in Korean */
  name: string;
}

/**
 * Category hierarchy definition
 */
export interface CategoryHierarchy {
  root: {
    name: string;
    children: readonly CategoryChild[];
  };
}

/**
 * Print product category hierarchy (2-depth)
 */
export const PRINT_CATEGORY_HIERARCHY: CategoryHierarchy = {
  root: {
    name: '인쇄물',
    children: [
      { key: 'namecard', name: '명함' },
      { key: 'sticker', name: '스티커/라벨' },
      { key: 'flyer', name: '전단/리플렛' },
      { key: 'booklet', name: '책자/카탈로그' },
      { key: 'envelope', name: '봉투/서류' },
      { key: 'poster', name: '포스터/배너' },
    ],
  },
} as const;

// =============================================================================
// SECTION 2: Product Type to Category Mapping
// =============================================================================

/**
 * Maps Widget Creator product types to category keys
 *
 * Multiple product types can map to the same category.
 * Keys must match PRINT_CATEGORY_HIERARCHY children keys.
 */
const PRODUCT_TYPE_TO_CATEGORY_KEY: Record<string, string> = {
  'namecard': 'namecard',
  'digital-print': 'namecard',
  'sticker': 'sticker',
  'label': 'sticker',
  'flyer': 'flyer',
  'leaflet': 'flyer',
  'booklet': 'booklet',
  'catalog': 'booklet',
  'envelope': 'envelope',
  'document': 'envelope',
  'poster': 'poster',
  'banner': 'poster',
};

// =============================================================================
// SECTION 3: Category Service
// =============================================================================

/**
 * Logger interface for category service
 */
interface CategoryServiceLogger {
  info: (message: string, context?: Record<string, unknown>) => void;
  warn: (message: string, context?: Record<string, unknown>) => void;
  error: (message: string, context?: Record<string, unknown>) => void;
}

/**
 * Shopby Category Service
 *
 * Manages the mapping between Widget Creator product types and Shopby categories.
 * Must be initialized with Shopby category numbers before use.
 */
export class CategoryService {
  /** Root category number in Shopby */
  private rootCategoryNo: number | undefined;
  /** Map of category key -> Shopby categoryNo */
  private categoryMap = new Map<string, number>();
  /** Logger */
  private readonly logger: CategoryServiceLogger;

  constructor(logger?: CategoryServiceLogger) {
    this.logger = logger ?? {
      info: console.log,
      warn: console.warn,
      error: console.error,
    };
  }

  // ============ Category Mapping ============

  /**
   * Set a single category mapping
   *
   * @param key - Category key (e.g., 'namecard', 'sticker')
   * @param categoryNo - Shopby category number
   */
  setCategoryMapping(key: string, categoryNo: number): void {
    this.categoryMap.set(key, categoryNo);
  }

  /**
   * Set the root category number
   *
   * @param categoryNo - Shopby category number for root '인쇄물'
   */
  setRootCategoryNo(categoryNo: number): void {
    this.rootCategoryNo = categoryNo;
  }

  /**
   * Load all category mappings at once
   *
   * @param mappings - Map of category key -> Shopby categoryNo
   * @param rootCategoryNo - Root category number
   */
  loadCategoryMappings(
    mappings: Record<string, number>,
    rootCategoryNo?: number
  ): void {
    if (rootCategoryNo !== undefined) {
      this.rootCategoryNo = rootCategoryNo;
    }
    for (const [key, no] of Object.entries(mappings)) {
      this.categoryMap.set(key, no);
    }
  }

  /**
   * Get Shopby categoryNo for a product type
   *
   * @param productType - Widget Creator product type (e.g., 'digital-print', 'sticker')
   * @returns Shopby category number or undefined if not mapped
   */
  getCategoryNo(productType: string): number | undefined {
    const key = PRODUCT_TYPE_TO_CATEGORY_KEY[productType];
    if (!key) return undefined;
    return this.categoryMap.get(key);
  }

  /**
   * Get the category key for a product type
   *
   * @param productType - Widget Creator product type
   * @returns Category key or undefined
   */
  getCategoryKey(productType: string): string | undefined {
    return PRODUCT_TYPE_TO_CATEGORY_KEY[productType];
  }

  /**
   * Get all current category mappings
   *
   * @returns Copy of category mappings
   */
  getAllMappings(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const [key, no] of this.categoryMap) {
      result[key] = no;
    }
    return result;
  }

  /**
   * Get root category number
   */
  getRootCategoryNo(): number | undefined {
    return this.rootCategoryNo;
  }

  /**
   * Check if all categories are mapped
   *
   * @returns True if all hierarchy children have Shopby category numbers
   */
  isFullyMapped(): boolean {
    return PRINT_CATEGORY_HIERARCHY.root.children.every(
      child => this.categoryMap.has(child.key)
    );
  }

  /**
   * Get unmapped category keys
   *
   * @returns List of category keys without Shopby mappings
   */
  getUnmappedKeys(): string[] {
    return PRINT_CATEGORY_HIERARCHY.root.children
      .filter(child => !this.categoryMap.has(child.key))
      .map(child => child.key);
  }

  // ============ Hierarchy ============

  /**
   * Get the category hierarchy definition
   *
   * @returns The print category hierarchy
   */
  getHierarchy(): CategoryHierarchy {
    return PRINT_CATEGORY_HIERARCHY;
  }

  // ============ Shopby Sync ============

  /**
   * Ensure all categories exist in Shopby
   *
   * Creates the root category and all child categories if they don't exist.
   * Matches existing categories by name to avoid duplicates.
   *
   * @param client - Shopby Admin Client
   * @returns Map of category key -> Shopby categoryNo
   */
  async ensureCategories(
    client: ShopbyAdminClient
  ): Promise<Map<string, number>> {
    // Fetch existing categories from Shopby
    const existing = await client.listCategories();

    // Find or create root category
    let rootCategory = existing.find(
      c => c.categoryName === PRINT_CATEGORY_HIERARCHY.root.name && c.depth === 1
    );

    if (!rootCategory) {
      const result = await client.createCategory({
        categoryName: PRINT_CATEGORY_HIERARCHY.root.name,
        displayable: true,
      });
      this.rootCategoryNo = result.categoryNo;
      this.logger.info('Created root category', {
        name: PRINT_CATEGORY_HIERARCHY.root.name,
        categoryNo: result.categoryNo,
      });
    } else {
      this.rootCategoryNo = rootCategory.categoryNo;
    }

    // Find or create child categories
    for (const child of PRINT_CATEGORY_HIERARCHY.root.children) {
      let childCategory = existing.find(
        c => c.categoryName === child.name && c.parentCategoryNo === this.rootCategoryNo
      );

      if (!childCategory) {
        const result = await client.createCategory({
          categoryName: child.name,
          parentCategoryNo: this.rootCategoryNo,
          displayable: true,
        });
        this.categoryMap.set(child.key, result.categoryNo);
        this.logger.info('Created child category', {
          key: child.key,
          name: child.name,
          categoryNo: result.categoryNo,
        });
      } else {
        this.categoryMap.set(child.key, childCategory.categoryNo);
      }
    }

    return new Map(this.categoryMap);
  }
}
