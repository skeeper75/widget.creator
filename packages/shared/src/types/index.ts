/**
 * Barrel export for all shared types.
 */

// Core product types
export type {
  ProductCategory,
  PrintProduct,
  ProductSize,
  ProductPaper,
  ProductColor,
  ProductPrintMethod,
  PrsjobListItem,
  ProductPostProcess,
  JobGroupListItem,
  ProductOrderQty,
  PricingTable,
  DeliveryInfo,
} from "./print-product.js";

// Option engine types
export type {
  OptionSelection,
  AvailableOptions,
  ConstraintViolation,
  SizeOption,
  PaperOption,
  ColorOption,
  PrintMethodOption,
  ProductOptionItem,
  AwkjobItem,
  PostProcessGroup,
  AwkjobSelection,
  QuantityOption,
} from "./option-types.js";

// Pricing types
export type {
  PriceCalculationRequest,
  PriceCalculationResult,
  AwkjobCost,
  DeliveryCostRequest,
  DeliveryCostResult,
} from "./pricing-types.js";

// Constraint types
export type {
  ReqWidth,
  ReqHeight,
  ReqAwkjob,
  ReqPrsjob,
  ReqJoboption,
  ReqJobsize,
  ReqJobqty,
  RstOrdqty,
  RstPaper,
  RstAwkjob,
  RstPrsjob,
  RstColor,
  RstSize,
  RstJobqty,
  RstCutcnt,
  ConstraintEntityRef,
  RequirementConstraint,
  RestrictionConstraint,
  ConstraintEvaluationResult,
} from "./constraint-types.js";
