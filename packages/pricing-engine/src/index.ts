/**
 * @widget-creator/pricing-engine
 *
 * Pricing and option constraint engine for Widget Creator.
 */
export * from "./constraints/index.js";

// Core engine
export { OptionEngine } from "./option-engine.js";

// Cover handler
export { CoverHandler } from "./cover-handler.js";
export type { CoverType, CoverOptions } from "./cover-handler.js";

// Quantity resolver
export { QuantityResolver } from "./quantity-resolver.js";

// Non-standard size handler
export {
  validateNonStandardSize,
  type NonStandardSizeInput,
  type NonStandardSizeValidation,
} from "./non-standard-handler.js";

// Price calculator
export { PriceCalculator } from "./calculator.js";
export type { AwkjobPricingEntry } from "./calculator.js";

// Delivery calculator
export { DeliveryCalculator } from "./delivery-calculator.js";
export type {
  FreeShippingRule,
  DeliveryMethod,
  DeliveryRegion,
  DeliveryData,
} from "./delivery-calculator.js";

// Widget Builder 4-mode pricing engine
export { WbPricingEngine } from "./wb-pricing-engine.js";
export {
  calculateLookupPrice,
  calculateAreaPrice,
  calculatePagePrice,
  calculateCompositePrice,
  calculatePostprocessCost,
  findQtyDiscount,
  calculateFinalPrice,
} from "./wb-pricing-engine.js";
export type {
  PriceMode,
  LookupParams,
  AreaParams,
  PageParams,
  CompositeParams,
  PrintCostBaseEntry,
  PostprocessCostEntry,
  QtyDiscountEntry,
  PriceBreakdown,
  PriceCalculationResult,
  WbPricingInput,
} from "./wb-pricing-engine.js";

// Types
export type {
  ProductData,
  OptionLevel,
  OptionSelectionResult,
} from "./types.js";
