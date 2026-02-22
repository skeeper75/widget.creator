// Constraint Type C -- Paper Condition handler (REQ-CONST-004)

import type { OptionConstraint, SelectedOption } from '../../options/types.js';
import type { Paper, SingleConstraintResult } from '../types.js';

/**
 * Evaluate a paper_condition constraint.
 * Enable/disable post-process options based on paper weight conditions.
 */
export function evaluatePaperCondition(
  constraint: OptionConstraint,
  selections: Map<string, SelectedOption>,
  papers: Paper[],
): SingleConstraintResult {
  const paperSelection = selections.get('paperType');
  if (!paperSelection) {
    return { action: 'disable', violated: false };
  }

  const paper = papers.find(p => p.id === paperSelection.refPaperId);
  if (!paper) {
    return { action: 'disable', violated: false };
  }

  let conditionMet = false;
  const paperWeight = paper.weight ?? 0;
  const constraintValue = Number(constraint.value);

  switch (constraint.operator) {
    case 'gte':
      conditionMet = paperWeight >= constraintValue;
      break;
    case 'lte':
      conditionMet = paperWeight <= constraintValue;
      break;
    case 'eq':
      conditionMet = String(paperWeight) === constraint.value;
      break;
    default:
      conditionMet = false;
  }

  return {
    action: conditionMet ? 'enable' : 'disable',
    violated: false,
  };
}
