/**
 * Pricing test fixture data for SPEC-WIDGET-API-001.
 * Matches huni-pricing.schema.ts tables.
 */

const BASE_DATE = new Date('2026-01-15T09:00:00Z');
const UPDATED_DATE = new Date('2026-02-20T14:30:00Z');

// ─── Price table rows ───────────────────────────────────────────

export interface PriceTableRow {
  id: number;
  code: string;
  name: string;
  priceType: string;
  quantityBasis: string;
  sheetStandard: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const PRICE_TABLE_ROWS: PriceTableRow[] = [
  {
    id: 1, code: 'BOOKLET-BASE', name: '책자 기본 가격표',
    priceType: 'unit', quantityBasis: 'per_set', sheetStandard: '4x6',
    description: null, isActive: true, createdAt: BASE_DATE, updatedAt: UPDATED_DATE,
  },
  {
    id: 2, code: 'STICKER-BASE', name: '스티커 기본 가격표',
    priceType: 'unit', quantityBasis: 'per_unit', sheetStandard: '4x6',
    description: null, isActive: true, createdAt: BASE_DATE, updatedAt: UPDATED_DATE,
  },
];

// ─── Price tier rows ────────────────────────────────────────────

export interface PriceTierRow {
  id: number;
  priceTableId: number;
  optionCode: string;
  minQty: number;
  maxQty: number;
  unitPrice: string; // numeric is returned as string by Drizzle
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const PRICE_TIER_ROWS: PriceTierRow[] = [
  { id: 501, priceTableId: 1, optionCode: 'A5-MOJ100-DOUBLE4', minQty: 1, maxQty: 99, unitPrice: '3000.00', isActive: true, createdAt: BASE_DATE, updatedAt: UPDATED_DATE },
  { id: 502, priceTableId: 1, optionCode: 'A5-MOJ100-DOUBLE4', minQty: 100, maxQty: 499, unitPrice: '2500.00', isActive: true, createdAt: BASE_DATE, updatedAt: UPDATED_DATE },
  { id: 503, priceTableId: 1, optionCode: 'A5-MOJ100-DOUBLE4', minQty: 500, maxQty: 999999, unitPrice: '2000.00', isActive: true, createdAt: BASE_DATE, updatedAt: UPDATED_DATE },
  { id: 504, priceTableId: 1, optionCode: 'B5-MOJ100-DOUBLE4', minQty: 1, maxQty: 99, unitPrice: '4000.00', isActive: true, createdAt: BASE_DATE, updatedAt: UPDATED_DATE },
  { id: 505, priceTableId: 1, optionCode: 'B5-MOJ100-DOUBLE4', minQty: 100, maxQty: 999999, unitPrice: '3500.00', isActive: true, createdAt: BASE_DATE, updatedAt: UPDATED_DATE },
];

// ─── Fixed price rows ───────────────────────────────────────────

export interface FixedPriceRow {
  id: number;
  productId: number;
  sizeId: number | null;
  paperId: number | null;
  materialId: number | null;
  printModeId: number | null;
  optionLabel: string | null;
  baseQty: number;
  sellingPrice: string;
  costPrice: string | null;
  vatIncluded: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const FIXED_PRICE_ROWS: FixedPriceRow[] = [
  {
    id: 601, productId: 42, sizeId: 15, paperId: 8, materialId: null, printModeId: 4,
    optionLabel: 'A5 / 아트250 / 양면4도', baseQty: 100,
    sellingPrice: '45000.00', costPrice: '30000.00', vatIncluded: false,
    isActive: true, createdAt: BASE_DATE, updatedAt: UPDATED_DATE,
  },
  {
    id: 602, productId: 42, sizeId: 16, paperId: 8, materialId: null, printModeId: 4,
    optionLabel: 'B5 / 아트250 / 양면4도', baseQty: 100,
    sellingPrice: '55000.00', costPrice: '38000.00', vatIncluded: false,
    isActive: true, createdAt: BASE_DATE, updatedAt: UPDATED_DATE,
  },
];

// ─── Package price rows ─────────────────────────────────────────

export interface PackagePriceRow {
  id: number;
  productId: number;
  sizeId: number;
  printModeId: number;
  pageCount: number;
  minQty: number;
  maxQty: number;
  sellingPrice: string;
  costPrice: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const PACKAGE_PRICE_ROWS: PackagePriceRow[] = [
  { id: 701, productId: 42, sizeId: 15, printModeId: 4, pageCount: 100, minQty: 100, maxQty: 499, sellingPrice: '35000.00', costPrice: '25000.00', isActive: true, createdAt: BASE_DATE, updatedAt: UPDATED_DATE },
  { id: 702, productId: 42, sizeId: 15, printModeId: 4, pageCount: 100, minQty: 500, maxQty: 999, sellingPrice: '30000.00', costPrice: '20000.00', isActive: true, createdAt: BASE_DATE, updatedAt: UPDATED_DATE },
];

// ─── Quote request test data ────────────────────────────────────

export const VALID_QUOTE_REQUEST = {
  product_id: 42,
  size_id: 15,
  paper_id: 8,
  print_mode_id: 4,
  quantity: 500,
  page_count: 100,
  binding_id: 3,
  post_processes: [{ id: 12, sub_option: '1line' }],
  accessories: [],
};

export const VALID_PREVIEW_REQUEST = {
  product_id: 42,
  quantity: 500,
  size_id: 15,
};

export const MINIMAL_PREVIEW_REQUEST = {
  product_id: 42,
  quantity: 500,
};
