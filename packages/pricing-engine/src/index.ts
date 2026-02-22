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

// Types
export type {
  ProductData,
  OptionLevel,
  OptionSelectionResult,
} from "./types.js";
