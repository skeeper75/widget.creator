// Layered Constraint Evaluation algorithm (REQ-CONST-001)

import type { OptionConstraint, SelectedOption, DisabledReason, ConstraintViolation } from '../options/types.js';
import type { ConstraintEvalInput, ConstraintEvalResult, SingleConstraintResult } from './types.js';
import { evaluateSizeShow } from './handlers/size-show.js';
import { evaluateSizeRange } from './handlers/size-range.js';
import { evaluatePaperCondition } from './handlers/paper-condition.js';

/**
 * Evaluate all constraints using 4-phase LCE algorithm.
 * Phase 1: Filter applicable constraints for current product
 * Phase 2: Sort by priority, evaluate each constraint
 * Phase 3: Post-process special cases
 * Phase 4: Return combined result with timing
 */
export function evaluateConstraints(input: ConstraintEvalInput): ConstraintEvalResult {
  const startTime = performance.now();

  const results = new Map<string, string[]>();
  const disabled = new Map<string, DisabledReason>();
  const violations: ConstraintViolation[] = [];

  // Phase 1: Filter applicable constraints
  const applicable = input.constraints.filter(
    c => c.productId === input.productId && c.isActive,
  );

  // Phase 2: Sort by priority (ascending) and evaluate
  const sorted = applicable.sort((a, b) => a.priority - b.priority);

  for (const constraint of sorted) {
    const evalResult = evaluateSingleConstraint(constraint, input);

    if (evalResult.action === 'show') {
      mergeAvailable(results, constraint.targetField, evalResult.values ?? []);
    } else if (evalResult.action === 'hide' || evalResult.action === 'disable') {
      disabled.set(constraint.targetField, {
        type: 'CONSTRAINT',
        constraintId: constraint.id,
        description: constraint.description ?? '',
      });
    } else if (evalResult.action === 'limit_range') {
      // Range limits are applied as metadata, stored via values encoding
      if (evalResult.min && evalResult.max) {
        mergeAvailable(results, constraint.targetField, [
          `range:${evalResult.min.width}x${evalResult.min.height}:${evalResult.max.width}x${evalResult.max.height}`,
        ]);
      }
    }

    if (evalResult.violated) {
      violations.push({
        constraintId: constraint.id,
        constraintType: constraint.constraintType,
        message: constraint.description ?? `Constraint ${constraint.id} violated`,
        sourceField: constraint.sourceField,
        targetField: constraint.targetField,
      });
    }
  }

  // Phase 3: Post-process special cases
  postProcessSizeConstraints(results, disabled, input);
  postProcessPaperConstraints(results, disabled, input);
  postProcessQuantityConstraints(results, disabled, input);
  postProcessCuttingConstraints(results, disabled, input);

  // Phase 4: Return combined result
  return {
    availableOptions: results,
    disabledOptions: disabled,
    violations,
    evaluationTimeMs: performance.now() - startTime,
  };
}

/** Dispatch single constraint evaluation to the correct handler */
export function evaluateSingleConstraint(
  constraint: OptionConstraint,
  input: ConstraintEvalInput,
): SingleConstraintResult {
  switch (constraint.constraintType) {
    case 'size_show':
      return evaluateSizeShow(constraint, input.currentSelections);

    case 'size_range':
      return evaluateSizeRange(constraint, input.currentSelections);

    case 'paper_condition':
      return evaluatePaperCondition(constraint, input.currentSelections, input.papers ?? []);

    default:
      // Unknown constraint type - treat as non-action
      return { action: 'show', violated: false };
  }
}

/** Merge available choice codes into the results map */
function mergeAvailable(
  results: Map<string, string[]>,
  targetField: string,
  values: string[],
): void {
  const existing = results.get(targetField) ?? [];
  results.set(targetField, [...existing, ...values]);
}

/** Post-process size constraints for special edge cases */
export function postProcessSizeConstraints(
  _results: Map<string, string[]>,
  _disabled: Map<string, DisabledReason>,
  _input: ConstraintEvalInput,
): void {
  // Size post-processing: validate custom size ranges
  // Implementation depends on specific business rules
}

/** Post-process paper constraints for weight-based rules */
export function postProcessPaperConstraints(
  _results: Map<string, string[]>,
  _disabled: Map<string, DisabledReason>,
  _input: ConstraintEvalInput,
): void {
  // Paper post-processing: validate weight-based coating requirements
}

/** Post-process quantity constraints for min/max enforcement */
export function postProcessQuantityConstraints(
  _results: Map<string, string[]>,
  _disabled: Map<string, DisabledReason>,
  _input: ConstraintEvalInput,
): void {
  // Quantity post-processing: enforce min/max order quantities
}

/** Post-process cutting constraints for cutting type requirements */
export function postProcessCuttingConstraints(
  _results: Map<string, string[]>,
  _disabled: Map<string, DisabledReason>,
  _input: ConstraintEvalInput,
): void {
  // Cutting post-processing: validate cutting type + size compatibility
}
