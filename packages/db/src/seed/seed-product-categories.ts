import type { NewProductCategory } from '../schema/widget/02-product-categories';

// Standard product categories for Widget Builder (SPEC-WB-002 Section 2.1)
// @MX:NOTE: [AUTO] 11 Figma-based categories — authoritative category structure for all products.
// @MX:REASON: Seeded on system install; referenced by wbProducts FK and category APIs.
// @MX:SPEC: SPEC-WB-002 FR-WB002-01
export const STANDARD_PRODUCT_CATEGORIES: ReadonlyArray<NewProductCategory> = [
  {
    categoryKey: 'digital-print',
    categoryNameKo: '디지털인쇄',
    categoryNameEn: 'Digital Print',
    displayOrder: 1,
    isActive: true,
  },
  {
    categoryKey: 'sticker',
    categoryNameKo: '스티커',
    categoryNameEn: 'Sticker',
    displayOrder: 2,
    isActive: true,
  },
  {
    categoryKey: 'book',
    categoryNameKo: '책자',
    categoryNameEn: 'Book',
    displayOrder: 3,
    isActive: true,
  },
  {
    categoryKey: 'photobook',
    categoryNameKo: '포토북',
    categoryNameEn: 'Photobook',
    displayOrder: 4,
    isActive: true,
  },
  {
    categoryKey: 'calendar',
    categoryNameKo: '캘린더',
    categoryNameEn: 'Calendar',
    displayOrder: 5,
    isActive: true,
  },
  {
    categoryKey: 'design-calendar',
    categoryNameKo: '디자인캘린더',
    categoryNameEn: 'Design Calendar',
    displayOrder: 6,
    isActive: true,
  },
  {
    categoryKey: 'sign-poster',
    categoryNameKo: '사인/포스터',
    categoryNameEn: 'Sign / Poster',
    displayOrder: 7,
    isActive: true,
  },
  {
    categoryKey: 'acrylic',
    categoryNameKo: '아크릴',
    categoryNameEn: 'Acrylic',
    displayOrder: 8,
    isActive: true,
  },
  {
    categoryKey: 'goods',
    categoryNameKo: '굿즈',
    categoryNameEn: 'Goods',
    displayOrder: 9,
    isActive: true,
  },
  {
    categoryKey: 'stationery',
    categoryNameKo: '스테이셔너리',
    categoryNameEn: 'Stationery',
    displayOrder: 10,
    isActive: true,
  },
  {
    categoryKey: 'accessories',
    categoryNameKo: '상품악세사리',
    categoryNameEn: 'Accessories',
    displayOrder: 11,
    isActive: true,
  },
] as const;
