/**
 * Price Types - Price breakdown and calculation types
 * @see SPEC-WIDGET-SDK-001 Section 4.6
 */

/**
 * Single price breakdown item
 */
export interface PriceBreakdownItem {
  /** Display label */
  label: string;
  /** Amount in KRW */
  amount: number;
  /** Optional detail text */
  detail?: string;
}

/**
 * Price tier for quantity-based pricing
 */
export interface PriceTier {
  /** Minimum quantity */
  minQty: number;
  /** Maximum quantity (null = unlimited) */
  maxQty: number | null;
  /** Unit price at this tier */
  unitPrice: number;
  /** Display label for tier */
  label?: string;
}

/**
 * Price state for reactive display
 */
export interface PriceState {
  /** Itemized breakdown */
  breakdown: PriceBreakdownItem[];
  /** Subtotal before VAT */
  subtotal: number;
  /** VAT amount (10% in Korea) */
  vatAmount: number;
  /** Total including VAT */
  total: number;
  /** Whether calculation is in progress */
  isCalculating: boolean;
}

/**
 * Quote payload for API submission
 */
export interface QuotePayload {
  /** Product ID */
  productId: number;
  /** Selected size ID */
  sizeId: number;
  /** Selected paper ID */
  paperId: number | null;
  /** Cover paper ID (for books) */
  paperCoverId: number | null;
  /** Quantity */
  quantity: number;
  /** Custom width (for custom sizes) */
  customWidth: number | null;
  /** Custom height (for custom sizes) */
  customHeight: number | null;
  /** Selected options as key-value pairs */
  options: Record<string, string>;
  /** Post-process selections */
  postProcesses: Record<string, string>;
}

/**
 * Quote response from API
 */
export interface QuoteResponse {
  /** Unique quote ID */
  quoteId: string;
  /** Calculated price breakdown */
  price: PriceState;
  /** Valid until timestamp */
  validUntil: string;
}

/**
 * Price table data structure
 */
export interface PriceTableData {
  /** Table ID */
  id: number;
  /** Size ID this table applies to */
  sizeId: number;
  /** Paper ID this table applies to (null = all papers) */
  paperId: number | null;
  /** Price tiers */
  tiers: PriceTier[];
}

/**
 * Fixed price data
 */
export interface FixedPriceData {
  /** Option key */
  optionKey: string;
  /** Choice code */
  choiceCode: string;
  /** Fixed price amount */
  amount: number;
}
