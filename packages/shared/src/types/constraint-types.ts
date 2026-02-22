/**
 * Constraint types for the option engine.
 *
 * req_* types represent requirement constraints that ACTIVATE options.
 * rst_* types represent restriction constraints that DEACTIVATE options.
 *
 * These map directly to the WowPress raw JSON constraint fields.
 */

// ============================================================
// Requirement constraints (req_*) - force activation of options
// ============================================================

/** Width input requirement for non-standard sizes */
export interface ReqWidth {
  type: "input";
  unit: string;
  min: number;
  max: number;
  interval: number;
}

/** Height input requirement for non-standard sizes */
export interface ReqHeight {
  type: "input";
  unit: string;
  min: number;
  max: number;
  interval: number;
}

/** Awkjob (post-process) requirement reference */
export interface ReqAwkjob {
  jobno: number;
  jobname: string;
}

/** Print job requirement with preset reference */
export interface ReqPrsjob {
  jobpresetno: number;
  jobno: number;
  jobname: string;
}

/** Job option requirement for post-process */
export interface ReqJoboption {
  optno: number;
  optname: string;
}

/** Job size input requirement for post-process */
export interface ReqJobsize {
  type: "input";
  unit: string;
  min: number;
  max: number;
  interval: number;
}

/** Job quantity input requirement for post-process */
export interface ReqJobqty {
  type: "input";
  unit: string;
  min: number;
  max: number;
  interval: number;
}

// ============================================================
// Restriction constraints (rst_*) - force deactivation of options
// ============================================================

/** Order quantity restriction */
export interface RstOrdqty {
  ordqtymin: number;
  ordqtymax: number;
}

/** Paper restriction reference */
export interface RstPaper {
  paperno: number;
  papername: string;
}

/** Awkjob (post-process) restriction reference */
export interface RstAwkjob {
  jobno: number;
  jobname: string;
}

/** Print job restriction reference */
export interface RstPrsjob {
  jobno: number;
  jobname: string;
}

/** Color restriction reference */
export interface RstColor {
  colorno: number;
  colorname: string;
}

/** Size restriction reference */
export interface RstSize {
  sizeno: number;
  sizename: string;
}

/** Job quantity restriction for post-process */
export interface RstJobqty {
  type: "input";
  min: number;
  max: number;
}

/** Cut count restriction for post-process */
export interface RstCutcnt {
  min: number;
  max: number;
}

// ============================================================
// Composite constraint evaluation types
// ============================================================

/** Entity reference for constraint source/target */
export interface ConstraintEntityRef {
  entity: string;
  id: number;
}

/** A requirement constraint that activates a target option */
export interface RequirementConstraint {
  type: "required";
  source: ConstraintEntityRef;
  target: ConstraintEntityRef;
  data: Record<string, unknown>;
}

/** A restriction constraint that deactivates a target option */
export interface RestrictionConstraint {
  type: "restricted";
  source: ConstraintEntityRef;
  target: ConstraintEntityRef;
  data: Record<string, unknown>;
}

/** Result of evaluating constraints for a given selection */
export interface ConstraintEvaluationResult {
  isValid: boolean;
  requiredActivations: RequirementConstraint[];
  restrictedDeactivations: RestrictionConstraint[];
  violations: import("./option-types.js").ConstraintViolation[];
}
