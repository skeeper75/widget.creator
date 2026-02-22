/**
 * Pricing types for the price calculation engine.
 *
 * Handles unit price lookups, quantity-based pricing,
 * post-process cost calculation, and delivery cost estimation.
 */
import type { AwkjobSelection } from "./option-types.js";

/** Price calculation request */
export interface PriceCalculationRequest {
  productId: string;
  jobPresetNo: number | null;
  sizeNo: number | null;
  paperNo: number | null;
  colorNo: number | null;
  colorNoAdd: number | null;
  optNo: number | null;
  quantity: number;
  awkjobSelections: AwkjobSelection[];
}

/** Individual post-process cost entry */
export interface AwkjobCost {
  jobgroupno: number;
  jobno: number;
  jobname: string;
  cost: number;
}

/** Price calculation result */
export interface PriceCalculationResult {
  unitPrice: number;
  totalPrice: number;
  awkjobCosts: AwkjobCost[];
  subtotal: number;
  isAvailable: boolean;
  message: string | null;
}

/** Delivery cost calculation request */
export interface DeliveryCostRequest {
  productId: string;
  deliveryMethodCode: number;
  regionCode: number | null;
  orderTotal: number;
  memberGrade: number;
}

/** Delivery cost calculation result */
export interface DeliveryCostResult {
  baseCost: number;
  regionSurcharge: number;
  isFreeShipping: boolean;
  freeShippingReason: string | null;
  totalCost: number;
}
