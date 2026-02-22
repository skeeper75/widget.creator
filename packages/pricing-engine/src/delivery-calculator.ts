/**
 * Delivery cost calculator for the Widget Creator pricing engine.
 *
 * Computes shipping costs based on delivery method, region surcharges,
 * and free shipping eligibility determined by member grade thresholds.
 */
import type {
  DeliveryCostRequest,
  DeliveryCostResult,
} from "@widget-creator/shared";

/** Free shipping rule: grade threshold and minimum order amount */
export interface FreeShippingRule {
  grade: number;
  minAmount: number;
}

/** Delivery method definition */
export interface DeliveryMethod {
  code: number;
  name: string;
  baseCost: number;
}

/** Region with delivery surcharge */
export interface DeliveryRegion {
  code: number;
  name: string;
  surcharge: number;
}

/** Structured delivery data parsed from product DeliveryInfo */
export interface DeliveryData {
  freeShipping: FreeShippingRule[];
  methods: DeliveryMethod[];
  regions: DeliveryRegion[];
}

/**
 * Delivery cost calculation engine.
 *
 * Determines base delivery cost by method, adds region-specific
 * surcharges, and applies free shipping rules based on member grade.
 */
export class DeliveryCalculator {
  private readonly data: DeliveryData;

  constructor(data: DeliveryData) {
    this.data = data;
  }

  /**
   * Calculate the delivery cost for a given request.
   *
   * @param request - Delivery cost calculation parameters
   * @returns Delivery cost result with breakdown and free shipping status
   */
  calculate(request: DeliveryCostRequest): DeliveryCostResult {
    // Look up delivery method base cost
    const method = this.data.methods.find(
      (m) => m.code === request.deliveryMethodCode,
    );
    const baseCost = method?.baseCost ?? 0;

    // Look up region surcharge
    let regionSurcharge = 0;
    if (request.regionCode !== null) {
      const region = this.data.regions.find(
        (r) => r.code === request.regionCode,
      );
      regionSurcharge = region?.surcharge ?? 0;
    }

    // Check free shipping eligibility by member grade
    const freeShippingRule = this.data.freeShipping.find(
      (rule) => rule.grade === request.memberGrade,
    );

    const isFreeShipping =
      freeShippingRule !== undefined &&
      request.orderTotal >= freeShippingRule.minAmount;

    // Compute total
    const totalCost = isFreeShipping ? 0 : baseCost + regionSurcharge;

    return {
      baseCost,
      regionSurcharge,
      isFreeShipping,
      freeShippingReason: isFreeShipping
        ? `Grade ${request.memberGrade} free shipping at ${freeShippingRule!.minAmount}+`
        : null,
      totalCost,
    };
  }
}
