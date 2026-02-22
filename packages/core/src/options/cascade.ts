// Cascade reset logic (REQ-OPT-004)

import type { OptionState, SelectedOption, OptionResolutionContext } from './types.js';
import { getChainIndex, getOptionsAfterIndex } from './chain.js';
import { resolveOptions } from './engine.js';

/**
 * Handle an option change by resetting all downstream options in the priority chain
 * and re-resolving the full state.
 */
export function handleOptionChange(
  state: OptionState,
  changedOptionKey: string,
  newChoiceCode: string,
): OptionState {
  const chainIndex = getChainIndex(changedOptionKey);

  // Reset all options after the changed option in priority chain
  const resetKeys = getOptionsAfterIndex(chainIndex, state.availableOptions);

  const newSelections = new Map(state.selections);
  newSelections.set(changedOptionKey, {
    optionKey: changedOptionKey,
    choiceCode: newChoiceCode,
  });

  for (const key of resetKeys) {
    newSelections.delete(key);
  }

  // Re-resolve all options with new selections
  return resolveFullState(state, newSelections);
}

/** Re-resolve the full option state with updated selections */
function resolveFullState(
  state: OptionState,
  newSelections: Map<string, SelectedOption>,
): OptionState {
  // Build a resolution context from the current state
  const productOptions = [...state.availableOptions.values()].map(o => o.definition);
  const allChoices = [...state.availableOptions.values()].flatMap(o => o.choices);

  const ctx: OptionResolutionContext = {
    productId: state.productId!,
    currentSelections: newSelections,
    productOptions,
    optionChoices: allChoices,
    constraints: [],
    dependencies: [],
  };

  const result = resolveOptions(ctx);

  return {
    ...state,
    status: 'selecting',
    selections: newSelections,
    availableOptions: result.availableOptions,
    disabledOptions: result.disabledOptions,
    violations: [],
    errors: [],
  };
}
