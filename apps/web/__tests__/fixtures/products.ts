/**
 * Product test fixture data for SPEC-WIDGET-API-001.
 * Matches huni-catalog.schema.ts (products, productSizes, productOptions tables).
 */

const BASE_DATE = new Date('2026-01-10T09:00:00Z');
const UPDATED_DATE = new Date('2026-02-20T14:30:00Z');

// ─── Product rows ───────────────────────────────────────────────

export interface ProductRow {
  id: number;
  categoryId: number;
  huniCode: string;
  edicusCode: string | null;
  shopbyId: number | null;
  name: string;
  slug: string;
  productType: string;
  pricingModel: string;
  sheetStandard: string | null;
  figmaSection: string | null;
  orderMethod: string;
  editorEnabled: boolean;
  description: string | null;
  isActive: boolean;
  mesRegistered: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const PRODUCT_ROWS: ProductRow[] = [
  {
    id: 42, categoryId: 2, huniCode: '1001', edicusCode: 'ED-BOOK-001',
    shopbyId: 12345, name: '무선책자', slug: 'wireless-booklet',
    productType: 'booklet', pricingModel: 'package', sheetStandard: '4x6',
    figmaSection: null, orderMethod: 'upload', editorEnabled: true,
    description: '무선제본 책자 인쇄', isActive: true, mesRegistered: true,
    createdAt: BASE_DATE, updatedAt: UPDATED_DATE,
  },
  {
    id: 43, categoryId: 3, huniCode: '1002', edicusCode: null,
    shopbyId: 12346, name: '중철책자', slug: 'saddle-stitch-booklet',
    productType: 'booklet', pricingModel: 'package', sheetStandard: '4x6',
    figmaSection: null, orderMethod: 'upload', editorEnabled: false,
    description: '중철제본 책자 인쇄', isActive: true, mesRegistered: true,
    createdAt: BASE_DATE, updatedAt: UPDATED_DATE,
  },
  {
    id: 44, categoryId: 5, huniCode: '2001', edicusCode: null,
    shopbyId: null, name: '칼선스티커', slug: 'die-cut-sticker',
    productType: 'sticker', pricingModel: 'formula', sheetStandard: '4x6',
    figmaSection: null, orderMethod: 'upload', editorEnabled: false,
    description: '칼선 스티커 인쇄', isActive: true, mesRegistered: true,
    createdAt: BASE_DATE, updatedAt: UPDATED_DATE,
  },
  {
    id: 45, categoryId: 6, huniCode: '3001', edicusCode: null,
    shopbyId: null, name: '명함', slug: 'business-card',
    productType: 'card', pricingModel: 'fixed', sheetStandard: '4x6',
    figmaSection: null, orderMethod: 'upload', editorEnabled: true,
    description: '명함 인쇄', isActive: true, mesRegistered: true,
    createdAt: BASE_DATE, updatedAt: UPDATED_DATE,
  },
  {
    id: 46, categoryId: 2, huniCode: '1003', edicusCode: null,
    shopbyId: null, name: '비활성 상품', slug: 'inactive-product',
    productType: 'booklet', pricingModel: 'package', sheetStandard: null,
    figmaSection: null, orderMethod: 'upload', editorEnabled: false,
    description: null, isActive: false, mesRegistered: false,
    createdAt: BASE_DATE, updatedAt: UPDATED_DATE,
  },
];

export const ACTIVE_PRODUCT_ROWS = PRODUCT_ROWS.filter((r) => r.isActive);

// ─── Product size rows ──────────────────────────────────────────

export interface ProductSizeRow {
  id: number;
  productId: number;
  code: string;
  displayName: string;
  cutWidth: string | null;
  cutHeight: string | null;
  workWidth: string | null;
  workHeight: string | null;
  bleed: string;
  impositionCount: number | null;
  sheetStandard: string | null;
  displayOrder: number;
  isCustom: boolean;
  customMinW: string | null;
  customMinH: string | null;
  customMaxW: string | null;
  customMaxH: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const PRODUCT_SIZE_ROWS: ProductSizeRow[] = [
  {
    id: 15, productId: 42, code: 'A5', displayName: 'A5 (148x210mm)',
    cutWidth: '148.00', cutHeight: '210.00', workWidth: '154.00', workHeight: '216.00',
    bleed: '3.0', impositionCount: 4, sheetStandard: '4x6', displayOrder: 1,
    isCustom: false, customMinW: null, customMinH: null, customMaxW: null, customMaxH: null,
    isActive: true, createdAt: BASE_DATE, updatedAt: UPDATED_DATE,
  },
  {
    id: 16, productId: 42, code: 'B5', displayName: 'B5 (182x257mm)',
    cutWidth: '182.00', cutHeight: '257.00', workWidth: '188.00', workHeight: '263.00',
    bleed: '3.0', impositionCount: 2, sheetStandard: '4x6', displayOrder: 2,
    isCustom: false, customMinW: null, customMinH: null, customMaxW: null, customMaxH: null,
    isActive: true, createdAt: BASE_DATE, updatedAt: UPDATED_DATE,
  },
  {
    id: 17, productId: 42, code: 'A4', displayName: 'A4 (210x297mm)',
    cutWidth: '210.00', cutHeight: '297.00', workWidth: '216.00', workHeight: '303.00',
    bleed: '3.0', impositionCount: 2, sheetStandard: '4x6', displayOrder: 3,
    isCustom: false, customMinW: null, customMinH: null, customMaxW: null, customMaxH: null,
    isActive: true, createdAt: BASE_DATE, updatedAt: UPDATED_DATE,
  },
  {
    id: 18, productId: 42, code: 'B4', displayName: 'B4 (257x364mm)',
    cutWidth: '257.00', cutHeight: '364.00', workWidth: '263.00', workHeight: '370.00',
    bleed: '3.0', impositionCount: 1, sheetStandard: '4x6', displayOrder: 4,
    isCustom: false, customMinW: null, customMinH: null, customMaxW: null, customMaxH: null,
    isActive: true, createdAt: BASE_DATE, updatedAt: UPDATED_DATE,
  },
  {
    id: 19, productId: 42, code: 'CUSTOM', displayName: '맞춤 사이즈',
    cutWidth: null, cutHeight: null, workWidth: null, workHeight: null,
    bleed: '3.0', impositionCount: null, sheetStandard: null, displayOrder: 99,
    isCustom: true, customMinW: '50.00', customMinH: '50.00', customMaxW: '500.00', customMaxH: '700.00',
    isActive: true, createdAt: BASE_DATE, updatedAt: UPDATED_DATE,
  },
];

// ─── Paper-product mapping rows ─────────────────────────────────

export interface PaperProductMappingRow {
  id: number;
  paperId: number;
  productId: number;
  coverType: string | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const PAPER_PRODUCT_MAPPING_ROWS: PaperProductMappingRow[] = [
  { id: 1, paperId: 8, productId: 42, coverType: 'cover', isDefault: true, isActive: true, createdAt: BASE_DATE, updatedAt: UPDATED_DATE },
  { id: 2, paperId: 9, productId: 42, coverType: 'cover', isDefault: false, isActive: true, createdAt: BASE_DATE, updatedAt: UPDATED_DATE },
  { id: 3, paperId: 10, productId: 42, coverType: 'inner', isDefault: true, isActive: true, createdAt: BASE_DATE, updatedAt: UPDATED_DATE },
  { id: 4, paperId: 11, productId: 42, coverType: 'inner', isDefault: false, isActive: true, createdAt: BASE_DATE, updatedAt: UPDATED_DATE },
];

// ─── Paper rows (joined from papers table) ──────────────────────

export interface PaperRow {
  id: number;
  code: string;
  name: string;
  abbreviation: string | null;
  weight: number | null;
  displayOrder: number;
  isActive: boolean;
}

export const PAPER_ROWS: PaperRow[] = [
  { id: 8, code: 'ART250', name: '아트지 250g', abbreviation: '아트250', weight: 250, displayOrder: 1, isActive: true },
  { id: 9, code: 'ART300', name: '아트지 300g', abbreviation: '아트300', weight: 300, displayOrder: 2, isActive: true },
  { id: 10, code: 'MOJ100', name: '백색모조지 100g', abbreviation: '모조100', weight: 100, displayOrder: 1, isActive: true },
  { id: 11, code: 'MOJ120', name: '백색모조지 120g', abbreviation: '모조120', weight: 120, displayOrder: 2, isActive: true },
];

// ─── Category association (for product.category join) ───────────

export const CATEGORY_MAP: Record<number, { id: number; code: string; name: string }> = {
  2: { id: 2, code: 'booklet-wireless', name: '무선책자' },
  3: { id: 3, code: 'booklet-saddle', name: '중철책자' },
  5: { id: 5, code: 'sticker-cut', name: '칼선스티커' },
  6: { id: 6, code: 'card', name: '명함/카드' },
};
