/**
 * WbPricingEngine — 4-mode pricing calculation engine for 후니프린팅 Widget Builder
 *
 * Supported price modes:
 * - LOOKUP: Table-based price lookup by (plate_type, print_mode, qty_tier)
 * - AREA:   MAX(W×H/1e6, minAreaSqm) × unitPricePerSqm
 * - PAGE:   CEIL(innerPages / imposition) × unitPrice + coverPrice + bindingCost
 * - COMPOSITE: baseCost + SUM(selected process costs)
 *
 * Final price formula: total = (printCost + processCost) × (1 - discountRate)
 *
 * SPEC-WB-004 FR-WB004-01 through FR-WB004-09
 */

// @MX:ANCHOR: [AUTO] WbPricingEngine — core pricing engine for widget builder
// @MX:REASON: fan_in >= 3: widget frontend, admin preview, order creation all depend on this engine
// @MX:SPEC: SPEC-WB-004 FR-WB004-01

// -------------------------------------------------------
// Type definitions
// -------------------------------------------------------

export type PriceMode = 'LOOKUP' | 'AREA' | 'PAGE' | 'COMPOSITE';

export interface LookupParams {
  plateType: string;
  printMode: string;
  quantity: number;
}

export interface AreaParams {
  widthMm: number;
  heightMm: number;
  unitPricePerSqm: number;
  /** Minimum chargeable area in sqm. Defaults to 0.1 */
  minAreaSqm?: number;
}

export interface PageParams {
  innerPages: number;
  imposition: number;
  unitPrice: number;
  coverPrice: number;
  bindingCost: number;
}

export interface CompositeParams {
  baseCost: number;
  processCosts: number[];
}

export interface PrintCostBaseEntry {
  plateType: string;
  printMode: string;
  qtyMin: number;
  qtyMax: number;
  unitPrice: number;
}

export interface PostprocessCostEntry {
  processCode: string;
  qtyMin: number;
  qtyMax: number;
  unitPrice: number;
  priceType: 'fixed' | 'per_unit' | 'per_sqm';
}

export interface QtyDiscountEntry {
  qtyMin: number;
  qtyMax: number;
  discountRate: number;
  discountLabel?: string;
}

export interface PriceBreakdown {
  printCost: number;
  processCost: number;
  subtotal: number;
  discountRate: number;
  discountAmount: number;
  totalPrice: number;
  pricePerUnit: number;
}

export interface PriceCalculationResult {
  priceMode: PriceMode;
  breakdown: PriceBreakdown;
  appliedDiscount?: {
    tier: string;
    rate: string;
    label?: string;
  };
  error?: string;
}

export interface WbPricingInput {
  priceMode: PriceMode;
  quantity: number;
  printCostBaseEntries: PrintCostBaseEntry[];
  postprocessEntries: PostprocessCostEntry[];
  qtyDiscountEntries: QtyDiscountEntry[];
  selectedProcessCodes: string[];
  /** Required for LOOKUP mode */
  lookupParams?: LookupParams;
  /** Required for AREA mode */
  areaParams?: AreaParams;
  /** Required for PAGE mode */
  pageParams?: PageParams;
  /** Required for COMPOSITE mode */
  compositeParams?: CompositeParams;
  /** Optional: product area in sqm for per_sqm postprocess calculation */
  productAreaSqm?: number;
}

// -------------------------------------------------------
// Pure calculation functions
// -------------------------------------------------------

/**
 * LOOKUP mode: find unit_price from print_cost_base by matching
 * plate_type + print_mode + quantity within [qtyMin, qtyMax].
 *
 * Returns 0 if no matching entry found.
 */
export function calculateLookupPrice(
  entries: PrintCostBaseEntry[],
  params: LookupParams,
): number {
  const match = entries.find(
    (e) =>
      e.plateType === params.plateType &&
      e.printMode === params.printMode &&
      params.quantity >= e.qtyMin &&
      params.quantity <= e.qtyMax,
  );
  return match?.unitPrice ?? 0;
}

/**
 * AREA mode: MAX(widthMm × heightMm / 1_000_000, minAreaSqm) × unitPricePerSqm
 *
 * Rounds to 2 decimal places.
 */
export function calculateAreaPrice(params: AreaParams): number {
  const { widthMm, heightMm, unitPricePerSqm, minAreaSqm = 0.1 } = params;
  const actualAreaSqm = (widthMm * heightMm) / 1_000_000;
  const chargeableArea = Math.max(actualAreaSqm, minAreaSqm);
  const price = chargeableArea * unitPricePerSqm;
  return Math.round(price * 100) / 100;
}

/**
 * PAGE mode: Math.ceil(innerPages / imposition) × unitPrice + coverPrice + bindingCost
 */
export function calculatePagePrice(params: PageParams): number {
  const { innerPages, imposition, unitPrice, coverPrice, bindingCost } = params;
  const sheets = Math.ceil(innerPages / imposition);
  return sheets * unitPrice + coverPrice + bindingCost;
}

/**
 * COMPOSITE mode: baseCost + sum(processCosts)
 */
export function calculateCompositePrice(params: CompositeParams): number {
  const { baseCost, processCosts } = params;
  return baseCost + processCosts.reduce((sum, cost) => sum + cost, 0);
}

/**
 * Calculate total postprocess cost for selected process codes.
 *
 * Price type logic:
 * - fixed: unitPrice directly
 * - per_unit: unitPrice × quantity
 * - per_sqm: unitPrice × areaSquareMeters
 *
 * Unknown process codes contribute 0.
 */
export function calculatePostprocessCost(
  entries: PostprocessCostEntry[],
  selectedCodes: string[],
  quantity: number,
  areaSquareMeters = 0,
): number {
  return selectedCodes.reduce((total, code) => {
    const entry = entries.find(
      (e) =>
        e.processCode === code &&
        quantity >= e.qtyMin &&
        quantity <= e.qtyMax,
    );
    if (!entry) return total;

    switch (entry.priceType) {
      case 'fixed':
        return total + entry.unitPrice;
      case 'per_unit':
        return total + entry.unitPrice * quantity;
      case 'per_sqm':
        return total + entry.unitPrice * areaSquareMeters;
      default:
        return total;
    }
  }, 0);
}

/**
 * Find the applicable discount entry for a given quantity.
 *
 * Returns null if no entry matches (no discount applies).
 */
export function findQtyDiscount(
  entries: QtyDiscountEntry[],
  quantity: number,
): QtyDiscountEntry | null {
  return (
    entries.find((e) => quantity >= e.qtyMin && quantity <= e.qtyMax) ?? null
  );
}

/**
 * Apply final price formula:
 * total = (printCost + processCost) × (1 - discountRate)
 *
 * @param printCost   - Cost from print mode calculation
 * @param processCost - Cost from postprocess calculation
 * @param discountEntry - Optional matched discount tier
 * @param quantity    - Optional: used to compute pricePerUnit
 */
export function calculateFinalPrice(
  printCost: number,
  processCost: number,
  discountEntry?: QtyDiscountEntry | null,
  quantity?: number,
): PriceBreakdown {
  const subtotal = printCost + processCost;
  const discountRate = discountEntry?.discountRate ?? 0;
  const discountAmount = Math.round(subtotal * discountRate * 100) / 100;
  const totalPrice = Math.round((subtotal - discountAmount) * 100) / 100;
  const pricePerUnit = quantity && quantity > 0
    ? Math.round((totalPrice / quantity) * 100) / 100
    : 0;

  return {
    printCost,
    processCost,
    subtotal,
    discountRate,
    discountAmount,
    totalPrice,
    pricePerUnit,
  };
}

// -------------------------------------------------------
// WbPricingEngine class — combines all modes
// -------------------------------------------------------

/**
 * WbPricingEngine orchestrates all 4 price mode calculations.
 *
 * Usage:
 * ```typescript
 * const engine = new WbPricingEngine();
 * const result = engine.calculate(input);
 * ```
 */
export class WbPricingEngine {
  calculate(input: WbPricingInput): PriceCalculationResult {
    const {
      priceMode,
      quantity,
      printCostBaseEntries,
      postprocessEntries,
      qtyDiscountEntries,
      selectedProcessCodes,
      lookupParams,
      areaParams,
      pageParams,
      compositeParams,
      productAreaSqm = 0,
    } = input;

    // Step 1: Calculate print cost by mode
    let printCost = 0;

    switch (priceMode) {
      case 'LOOKUP': {
        if (lookupParams) {
          printCost = calculateLookupPrice(printCostBaseEntries, lookupParams);
        }
        break;
      }
      case 'AREA': {
        if (areaParams) {
          printCost = calculateAreaPrice(areaParams);
        }
        break;
      }
      case 'PAGE': {
        if (pageParams) {
          printCost = calculatePagePrice(pageParams);
        }
        break;
      }
      case 'COMPOSITE': {
        if (compositeParams) {
          printCost = calculateCompositePrice(compositeParams);
        }
        break;
      }
    }

    // Step 2: Calculate postprocess cost
    const processCost = calculatePostprocessCost(
      postprocessEntries,
      selectedProcessCodes,
      quantity,
      productAreaSqm,
    );

    // Step 3: Find applicable quantity discount
    const discountEntry = findQtyDiscount(qtyDiscountEntries, quantity);

    // Step 4: Apply final price formula
    const breakdown = calculateFinalPrice(printCost, processCost, discountEntry, quantity);

    // Step 5: Build result
    const result: PriceCalculationResult = {
      priceMode,
      breakdown,
    };

    if (discountEntry && discountEntry.discountRate > 0) {
      result.appliedDiscount = {
        tier: `${discountEntry.qtyMin}-${discountEntry.qtyMax}`,
        rate: `${(discountEntry.discountRate * 100).toFixed(0)}%`,
        label: discountEntry.discountLabel,
      };
    }

    return result;
  }
}
