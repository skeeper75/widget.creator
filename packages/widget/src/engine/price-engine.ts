/**
 * Price Engine - Client-side price calculator
 * @see SPEC-WIDGET-SDK-001 Section 4.8
 */

import type {
  PriceBreakdownItem,
  PriceTier,
  PriceTableData,
  FixedPriceData,
  ProductSize,
} from '../types';

/**
 * Price calculation input
 */
export interface PriceCalculationInput {
  /** Selected size */
  size: ProductSize;
  /** Quantity */
  quantity: number;
  /** Base price from price table */
  basePrice: number;
  /** Fixed price options */
  fixedPrices: Map<string, FixedPriceData>;
  /** Selected options with codes */
  selectedOptions: Map<string, string>;
}

/**
 * Price calculation result
 */
export interface PriceCalculationResult {
  /** Itemized breakdown */
  breakdown: PriceBreakdownItem[];
  /** Subtotal before VAT */
  subtotal: number;
}

/**
 * Price Engine - Calculates prices on the client side
 */
export class PriceEngine {
  private priceTables: Map<number, PriceTableData>;
  private fixedPrices: Map<string, FixedPriceData>;

  constructor(
    priceTables: PriceTableData[],
    fixedPrices: FixedPriceData[]
  ) {
    this.priceTables = new Map(priceTables.map((t) => [t.sizeId, t]));
    this.fixedPrices = new Map(
      fixedPrices.map((p) => [`${p.optionKey}:${p.choiceCode}`, p])
    );
  }

  // @MX:ANCHOR: [AUTO] Core price calculator - called by state layer, option change pipeline, and PriceSummary component
  // @MX:REASON: Public API boundary with fan_in >= 3; all price updates flow through this method
  // @MX:SPEC: SPEC-WIDGET-SDK-001 Section 4.8 (Price Engine)
  /**
   * Calculate price for given inputs
   */
  calculate(input: PriceCalculationInput): PriceCalculationResult {
    const breakdown: PriceBreakdownItem[] = [];
    let subtotal = 0;

    // 1. Base price (quantity * unit price from tier)
    const unitPrice = this.getUnitPrice(input.size.id, input.quantity);
    const baseTotal = unitPrice * input.quantity;

    breakdown.push({
      label: '기본 가격',
      amount: baseTotal,
      detail: `${input.quantity}개 × ${unitPrice.toLocaleString('ko-KR')}원`,
    });
    subtotal += baseTotal;

    // 2. Fixed price options
    for (const [optionKey, choiceCode] of input.selectedOptions) {
      const key = `${optionKey}:${choiceCode}`;
      const fixedPrice = this.fixedPrices.get(key);

      if (fixedPrice && fixedPrice.amount > 0) {
        breakdown.push({
          label: this.getOptionLabel(optionKey),
          amount: fixedPrice.amount,
        });
        subtotal += fixedPrice.amount;
      }
    }

    // 3. Custom size premium (if applicable)
    if (input.size.isCustom && input.size.customMinW !== undefined) {
      // Could add custom size premium here
    }

    return {
      breakdown,
      subtotal,
    };
  }

  /**
   * Get unit price for size and quantity
   */
  getUnitPrice(sizeId: number, quantity: number): number {
    const table = this.priceTables.get(sizeId);

    if (!table || table.tiers.length === 0) {
      return 0;
    }

    // Find applicable tier
    for (const tier of table.tiers) {
      if (quantity >= tier.minQty) {
        if (tier.maxQty === null || quantity <= tier.maxQty) {
          return tier.unitPrice;
        }
      }
    }

    // Default to last tier
    return table.tiers[table.tiers.length - 1]?.unitPrice ?? 0;
  }

  /**
   * Get price tiers for a size
   */
  getTiersForSize(sizeId: number): PriceTier[] {
    const table = this.priceTables.get(sizeId);
    return table?.tiers ?? [];
  }

  /**
   * Get option label from key (simplified)
   */
  private getOptionLabel(optionKey: string): string {
    const labelMap: Record<string, string> = {
      coating: '코팅',
      color: '인쇄 색상',
      binding: '제본',
      foil: '박',
      emboss: '형압',
      scoring: '오시',
      diecut: '미싱',
      variable: '가변',
      eyelet: '귀돌이',
    };
    return labelMap[optionKey] ?? optionKey;
  }

  /**
   * Update price tables
   */
  updatePriceTables(tables: PriceTableData[]): void {
    this.priceTables = new Map(tables.map((t) => [t.sizeId, t]));
  }

  /**
   * Update fixed prices
   */
  updateFixedPrices(prices: FixedPriceData[]): void {
    this.fixedPrices = new Map(
      prices.map((p) => [`${p.optionKey}:${p.choiceCode}`, p])
    );
  }
}

/**
 * Create price engine instance
 */
export function createPriceEngine(
  priceTables: PriceTableData[],
  fixedPrices: FixedPriceData[]
): PriceEngine {
  return new PriceEngine(priceTables, fixedPrices);
}
