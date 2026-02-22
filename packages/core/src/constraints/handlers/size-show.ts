// Constraint Type A -- Size Show handler (REQ-CONST-002)

import type { OptionConstraint, SelectedOption } from '../../options/types.js';
import type { SingleConstraintResult } from '../types.js';

/**
 * Evaluate a size_show constraint.
 * When source size matches the constraint value, show the target option.
 */
export function evaluateSizeShow(
  constraint: OptionConstraint,
  selections: Map<string, SelectedOption>,
): SingleConstraintResult {
  const sizeSelection = selections.get('size');
  if (!sizeSelection) {
    return { action: 'hide', violated: false };
  }

  const sizeValue = `${sizeSelection.cutWidth}x${sizeSelection.cutHeight}`;
  const matches = constraint.operator === 'eq'
    ? sizeValue === constraint.value
    : sizeValue !== constraint.value;

  return {
    action: matches ? 'show' : 'hide',
    violated: false,
    values: matches ? [constraint.targetValue ?? ''] : [],
  };
}
