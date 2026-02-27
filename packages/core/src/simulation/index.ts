// Simulation module public API
// SPEC-WB-005

export {
  checkCompleteness,
  checkProductCompleteness,
} from './completeness.js';
export type {
  CompletenessInput,
  CompletenessCheckInput,
  CompletenessResult,
} from './completeness.js';

export {
  generateCombinations,
  runSimulation,
  cartesianProduct,
  sampleN,
  runSimulationCases,
  resolveSimulationCombinations,
  SIMULATION_MAX_CASES,
} from './engine.js';
export type {
  OptionType,
  SimOptionChoice,
  SimulationInput,
  SimulationOptions,
  SimulationConstraint,
  SimulationPriceConfig,
  OptionChoiceSet,
  CaseEvaluator,
} from './engine.js';

export {
  validatePublishReadiness,
  PublishError,
} from './publish.js';
export type {
  PublishServiceInput,
  UnpublishServiceInput,
  PublishResult,
  UnpublishResult,
  PublishOptions,
} from './publish.js';

export type {
  CompletenessItem,
  SimulationCaseResult,
  SimulationResult,
  TooLargeResult,
  SimulationRunResult,
} from './types.js';
