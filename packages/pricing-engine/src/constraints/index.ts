/**
 * Constraint evaluation engine.
 *
 * Evaluates req_* (requirement) and rst_* (restriction) constraints
 * to determine available options for a given selection state.
 */

export const CONSTRAINT_ENGINE_VERSION = "0.1.0";

// Requirement constraints (req_*)
export {
  parseRequirement,
  evaluateRequirement,
} from "./requirement-parser.js";
export type {
  ParsedRequirement,
  RequirementResult,
} from "./requirement-parser.js";

// Restriction constraints (rst_*)
export {
  parseRestriction,
  evaluateRestriction,
} from "./restriction-parser.js";
export type { ParsedRestriction } from "./restriction-parser.js";

// Size constraints
export {
  filterSizesBySelection,
  evaluateSizeConstraints,
} from "./size-constraint.js";

// Paper constraints
export {
  filterPapersBySelection,
  evaluatePaperConstraints,
} from "./paper-constraint.js";

// Color constraints
export {
  filterColorsBySelection,
  evaluateColorConstraints,
} from "./color-constraint.js";

// Print method constraints
export {
  filterPrintMethodsBySelection,
  evaluatePrintMethodConstraints,
} from "./print-method-constraint.js";

// Post-process constraints
export { PostProcessEvaluator } from "./post-process-constraint.js";
export type {
  AwkjobData,
  RequiredPostProcess,
  RestrictedPostProcess,
  PostProcessEvaluationResult,
} from "./post-process-constraint.js";
