/**
 * Category test fixture data for SPEC-WIDGET-API-001.
 * Matches huni-catalog.schema.ts (categories table).
 */

/** A row shape matching `categories.$inferSelect` (camelCase from Drizzle). */
export interface CategoryRow {
  id: number;
  code: string;
  name: string;
  parentId: number | null;
  depth: number;
  displayOrder: number;
  iconUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BASE_DATE = new Date('2026-01-15T09:00:00Z');
const UPDATED_DATE = new Date('2026-02-20T14:30:00Z');

/**
 * Hierarchical category tree test data.
 * Structure:
 *   booklet (1)
 *     booklet-wireless (2)
 *     booklet-saddle (3)
 *   sticker (4)
 *     sticker-cut (5)
 *   card (6)
 *   inactive-cat (7) -- is_active: false
 */
export const CATEGORY_ROWS: CategoryRow[] = [
  {
    id: 1, code: 'booklet', name: '책자', parentId: null, depth: 0,
    displayOrder: 1, iconUrl: '/icons/booklet.svg', isActive: true,
    createdAt: BASE_DATE, updatedAt: UPDATED_DATE,
  },
  {
    id: 2, code: 'booklet-wireless', name: '무선책자', parentId: 1, depth: 1,
    displayOrder: 1, iconUrl: null, isActive: true,
    createdAt: BASE_DATE, updatedAt: UPDATED_DATE,
  },
  {
    id: 3, code: 'booklet-saddle', name: '중철책자', parentId: 1, depth: 1,
    displayOrder: 2, iconUrl: null, isActive: true,
    createdAt: BASE_DATE, updatedAt: UPDATED_DATE,
  },
  {
    id: 4, code: 'sticker', name: '스티커', parentId: null, depth: 0,
    displayOrder: 2, iconUrl: '/icons/sticker.svg', isActive: true,
    createdAt: BASE_DATE, updatedAt: UPDATED_DATE,
  },
  {
    id: 5, code: 'sticker-cut', name: '칼선스티커', parentId: 4, depth: 1,
    displayOrder: 1, iconUrl: null, isActive: true,
    createdAt: BASE_DATE, updatedAt: UPDATED_DATE,
  },
  {
    id: 6, code: 'card', name: '명함/카드', parentId: null, depth: 0,
    displayOrder: 3, iconUrl: '/icons/card.svg', isActive: true,
    createdAt: BASE_DATE, updatedAt: UPDATED_DATE,
  },
  {
    id: 7, code: 'inactive-cat', name: '비활성 카테고리', parentId: null, depth: 0,
    displayOrder: 99, iconUrl: null, isActive: false,
    createdAt: BASE_DATE, updatedAt: UPDATED_DATE,
  },
];

/** Active-only categories (default filter). */
export const ACTIVE_CATEGORY_ROWS = CATEGORY_ROWS.filter((r) => r.isActive);

/** Expected tree structure for active categories (depth unlimited). */
export const EXPECTED_CATEGORY_TREE = [
  {
    id: 1, code: 'booklet', name: '책자', depth: 0,
    display_order: 1, icon_url: '/icons/booklet.svg', is_active: true,
    children: [
      {
        id: 2, code: 'booklet-wireless', name: '무선책자', depth: 1,
        display_order: 1, icon_url: null, is_active: true, children: [],
      },
      {
        id: 3, code: 'booklet-saddle', name: '중철책자', depth: 1,
        display_order: 2, icon_url: null, is_active: true, children: [],
      },
    ],
  },
  {
    id: 4, code: 'sticker', name: '스티커', depth: 0,
    display_order: 2, icon_url: '/icons/sticker.svg', is_active: true,
    children: [
      {
        id: 5, code: 'sticker-cut', name: '칼선스티커', depth: 1,
        display_order: 1, icon_url: null, is_active: true, children: [],
      },
    ],
  },
  {
    id: 6, code: 'card', name: '명함/카드', depth: 0,
    display_order: 3, icon_url: '/icons/card.svg', is_active: true,
    children: [],
  },
];

/** Expected tree with depth=0 only (top-level). */
export const EXPECTED_CATEGORY_TREE_DEPTH0 = EXPECTED_CATEGORY_TREE.map((c) => ({
  ...c,
  children: [],
}));
