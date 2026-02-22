// Constraint Type B -- Size Range handler (REQ-CONST-003)

import { ConstraintError } from '../../errors.js';
import type { OptionConstraint, SelectedOption } from '../../options/types.js';
import type { SingleConstraintResult } from '../types.js';

/**
 * Evaluate a size_range constraint.
 * Restricts processing (foil/emboss) sizes to min/max range.
 */
export function evaluateSizeRange(
  constraint: OptionConstraint,
  _selections: Map<string, SelectedOption>,
): SingleConstraintResult {
  if (constraint.operator !== 'between') {
    throw new ConstraintError('INVALID_OPERATOR', { expected: 'between', got: constraint.operator });
  }

  const [minW, minH] = parseSize(constraint.valueMin!);
  const [maxW, maxH] = parseSize(constraint.valueMax!);

  return {
    action: 'limit_range',
    violated: false,
    min: { width: minW, height: minH },
    max: { width: maxW, height: maxH },
  };
}

/** Parse "30x30" format to [width, height] */
function parseSize(sizeStr: string): [number, number] {
  const parts = sizeStr.toLowerCase().split('x').map(Number);
  if (parts.length !== 2 || parts.some(isNaN)) {
    throw new ConstraintError('INVALID_OPERATOR', {
      message: `Invalid size format: ${sizeStr}`,
    });
  }
  return [parts[0]!, parts[1]!];
}
