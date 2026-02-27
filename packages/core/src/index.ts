// Public API Surface for @widget-creator/core (SPEC 4.2)

// === Pricing Engine ===
export { calculatePrice } from './pricing/engine.js';
export { lookupTier, lookupImposition } from './pricing/lookup.js';
export { resolveLossConfig } from './pricing/loss.js';
export type {
  PricingInput,
  PricingResult,
  PricingModel,
  PriceBreakdown,
  FormulaInput,
  ComponentInput,
  FixedUnitInput,
  PackageInput,
  FixedSizeInput,
  FixedPerUnitInput,
  FormulaCuttingInput,
} from './pricing/types.js';

// === Option Engine ===
export { resolveOptions } from './options/engine.js';
export { createOptionState, transitionState } from './options/state-machine.js';
export { handleOptionChange } from './options/cascade.js';
export type {
  OptionState,
  OptionAction,
  OptionEngineState,
  OptionResolutionContext,
  OptionResolutionResult,
  AvailableOption,
  SelectedOption,
  DisabledReason,
} from './options/types.js';

// === Constraint Evaluator ===
export { evaluateConstraints } from './constraints/evaluator.js';
export { mergeConstraintLayers } from './constraints/merger.js';
export { detectCycles } from './constraints/cycle-detector.js';
export type {
  ConstraintEvalInput,
  ConstraintEvalResult,
  ImplicitConstraint,
} from './constraints/types.js';
export type { ConstraintViolation } from './options/types.js';

// === Quote Calculator ===
export { assembleQuote } from './quote/calculator.js';
export { isQuoteValid } from './quote/expiry.js';
export { computeSnapshotHash } from './quote/snapshot.js';
export type {
  QuoteInput,
  QuoteResult,
  QuoteLineItem,
  LineItemCategory,
} from './quote/types.js';

// === Simulation & Admin Console ===
export {
  checkCompleteness,
  checkProductCompleteness,
  generateCombinations,
  runSimulation,
  cartesianProduct,
  sampleN,
  runSimulationCases,
  resolveSimulationCombinations,
  SIMULATION_MAX_CASES,
  validatePublishReadiness,
  PublishError,
} from './simulation/index.js';
export type {
  CompletenessInput,
  CompletenessCheckInput,
  CompletenessResult,
  CompletenessItem,
  OptionType,
  SimOptionChoice,
  SimulationInput,
  SimulationConstraint,
  SimulationPriceConfig,
  OptionChoiceSet,
  CaseEvaluator,
  SimulationCaseResult,
  SimulationResult,
  TooLargeResult,
  SimulationRunResult,
  SimulationOptions,
  PublishOptions,
  PublishServiceInput,
  UnpublishServiceInput,
  PublishResult,
  UnpublishResult,
} from './simulation/index.js';

// === Errors ===
export {
  CoreError,
  PricingError,
  ConstraintError,
  OptionError,
} from './errors.js';
export type {
  PricingErrorCode,
  ConstraintErrorCode,
  OptionErrorCode,
} from './errors.js';

// === Shared Types (re-export from data layer) ===
export type {
  PriceTier,
  ImpositionRule,
  LossQuantityConfig,
  SizeSelection,
  PricingLookupData,
  Paper,
  PrintMode,
  PostProcess,
  Binding,
  FixedPriceRecord,
  PackagePriceRecord,
  FoilPriceRecord,
} from './pricing/types.js';
export type {
  OptionConstraint,
  OptionDependency,
  OptionChoice,
  ProductOption,
} from './options/types.js';
