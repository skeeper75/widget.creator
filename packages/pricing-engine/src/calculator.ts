/**
 * Price calculator for the Widget Creator pricing engine.
 *
 * Matches user option selections to pricing table entries and
 * computes total costs including post-process (awkjob) surcharges.
 *
 * Pricing lookup strategy:
 * - Match by (jobPresetNo, sizeNo, paperNo, colorNo, colorNoAdd, optNo, quantity)
 * - Null fields in pricing table act as wildcards
 * - Exact matches are preferred over wildcard matches
 * - Returns explicit error when no price is found (R-PRC-005)
 */
import type {
  PriceCalculationRequest,
  PriceCalculationResult,
  AwkjobCost,
  PricingTable,
} from "@widget-creator/shared";

/** Awkjob (post-process) pricing entry for cost lookups */
export interface AwkjobPricingEntry {
  awkjobNo: number;
  awkjobName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

/**
 * Price calculation engine.
 *
 * Computes base print price from the pricing table and adds
 * post-process costs from the awkjob pricing table.
 */
export class PriceCalculator {
  private readonly pricingTable: PricingTable[];
  private readonly awkjobPricing: AwkjobPricingEntry[];

  constructor(
    pricingTable: PricingTable[],
    awkjobPricing: AwkjobPricingEntry[],
  ) {
    this.pricingTable = pricingTable;
    this.awkjobPricing = awkjobPricing;
  }

  /**
   * Calculate the total price for a given selection.
   *
   * @param request - The price calculation request with option selections
   * @returns Calculation result with breakdown and availability status
   */
  calculate(request: PriceCalculationRequest): PriceCalculationResult {
    // Validate quantity
    if (request.quantity <= 0) {
      return this.errorResult("INVALID_QUANTITY: Quantity must be greater than 0");
    }

    // Validate required selection fields
    if (request.sizeNo == null || request.paperNo == null || request.colorNo == null) {
      const missing: string[] = [];
      if (request.sizeNo == null) missing.push("sizeNo");
      if (request.paperNo == null) missing.push("paperNo");
      if (request.colorNo == null) missing.push("colorNo");
      return this.errorResult(
        `INCOMPLETE_SELECTION: Missing required fields: ${missing.join(", ")}`,
      );
    }

    // Look up base price from pricing table
    const basePriceEntry = this.findPricingEntry(request);
    if (basePriceEntry === null) {
      return this.errorResult(
        "PRICE_NOT_FOUND: No pricing entry found for the selected combination and quantity",
      );
    }

    // Calculate post-process (awkjob) costs
    const awkjobCosts: AwkjobCost[] = [];
    for (const selection of request.awkjobSelections) {
      const awkjobEntry = this.findAwkjobPricing(selection.jobno, request.quantity);
      if (awkjobEntry === null) {
        return this.errorResult(
          `PRICE_NOT_FOUND: No pricing entry found for post-process ${selection.jobno} at quantity ${request.quantity}`,
        );
      }
      awkjobCosts.push({
        jobgroupno: selection.jobgroupno,
        jobno: selection.jobno,
        jobname: awkjobEntry.awkjobName,
        cost: awkjobEntry.totalPrice,
      });
    }

    const subtotal = basePriceEntry.totalPrice;
    const awkjobTotal = awkjobCosts.reduce((sum, c) => sum + c.cost, 0);
    const totalPrice = subtotal + awkjobTotal;
    const unitPrice = Math.round(totalPrice / request.quantity);

    return {
      unitPrice,
      totalPrice,
      awkjobCosts,
      subtotal,
      isAvailable: true,
      message: null,
    };
  }

  /**
   * Find the best matching pricing table entry for a request.
   * Exact matches on non-null fields are preferred over wildcard matches.
   */
  private findPricingEntry(request: PriceCalculationRequest): PricingTable | null {
    const matchingFields: Array<keyof Pick<
      PricingTable,
      "jobPresetNo" | "sizeNo" | "paperNo" | "colorNo" | "colorNoAdd" | "optNo"
    >> = ["jobPresetNo", "sizeNo", "paperNo", "colorNo", "colorNoAdd", "optNo"];

    // Filter entries that match the selection (null in table = wildcard)
    const candidates = this.pricingTable.filter((entry) => {
      // Quantity must match exactly
      if (entry.quantity !== request.quantity) return false;

      // Check each selection field
      for (const field of matchingFields) {
        const entryVal = entry[field];
        const requestVal = request[field];

        // If the pricing table entry has a non-null value, it must match the request
        if (entryVal !== null && entryVal !== requestVal) {
          return false;
        }

        // If the request has a null value but the entry has a non-null value,
        // it should not match
        // (already covered by the check above: entryVal !== requestVal handles this)
      }
      return true;
    });

    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0];

    // Score candidates: prefer entries with more exact (non-null) matches
    return candidates.reduce((best, current) => {
      const bestScore = this.specificityScore(best, matchingFields);
      const currentScore = this.specificityScore(current, matchingFields);
      return currentScore > bestScore ? current : best;
    });
  }

  /**
   * Count the number of non-null fields in a pricing entry.
   * Higher score means more specific (exact) match.
   */
  private specificityScore(
    entry: PricingTable,
    fields: Array<keyof Pick<
      PricingTable,
      "jobPresetNo" | "sizeNo" | "paperNo" | "colorNo" | "colorNoAdd" | "optNo"
    >>,
  ): number {
    return fields.reduce((score, field) => score + (entry[field] !== null ? 1 : 0), 0);
  }

  /**
   * Find the awkjob pricing entry matching the given awkjob number and quantity.
   * Requires exact quantity match.
   */
  private findAwkjobPricing(
    awkjobNo: number,
    quantity: number,
  ): AwkjobPricingEntry | null {
    return (
      this.awkjobPricing.find(
        (entry) => entry.awkjobNo === awkjobNo && entry.quantity === quantity,
      ) ?? null
    );
  }

  /** Build an error result with zero prices and unavailable status. */
  private errorResult(message: string): PriceCalculationResult {
    return {
      unitPrice: 0,
      totalPrice: 0,
      awkjobCosts: [],
      subtotal: 0,
      isAvailable: false,
      message,
    };
  }
}
