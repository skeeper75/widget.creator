// Option resolution engine (REQ-OPT-001)

import type {
  OptionResolutionContext,
  OptionResolutionResult,
  AvailableOption,
  DisabledReason,
  SelectedOption,
  ValidationError,
} from './types.js';
import { PRIORITY_CHAIN, getOptionsForPhase } from './chain.js';
import { evaluateDependencies } from './dependencies.js';
import { filterChoices, getDefaultChoice } from './filters.js';

/**
 * Resolve all options following the priority chain order.
 * For each phase: evaluate dependencies -> filter choices -> apply selection/default.
 */
export function resolveOptions(ctx: OptionResolutionContext): OptionResolutionResult {
  const availableOptions = new Map<string, AvailableOption>();
  const disabledOptions = new Map<string, DisabledReason>();
  const defaultSelections = new Map<string, string>();
  const validationErrors: ValidationError[] = [];

  for (const phase of PRIORITY_CHAIN) {
    const phaseOptions = getOptionsForPhase(phase, ctx.productOptions);

    for (const opt of phaseOptions) {
      // 1. Evaluate dependencies (parent selected?)
      const depResult = evaluateDependencies(opt, ctx);
      if (!depResult.visible) {
        if (depResult.reason) {
          disabledOptions.set(opt.key, depResult.reason);
        }
        continue;
      }

      // 2. Filter choices by constraints and dependencies
      const availableChoices = filterChoices(opt, ctx);

      // 3. Apply current selection or default
      const selected = ctx.currentSelections.get(opt.key)
        ?? getDefaultChoice(opt, availableChoices);

      // 4. Track default selection
      if (!ctx.currentSelections.has(opt.key) && selected) {
        defaultSelections.set(opt.key, selected.choiceCode);
      }

      // 5. Validate required options
      if (opt.isRequired && !selected && availableChoices.length > 0) {
        validationErrors.push({
          optionKey: opt.key,
          code: 'REQUIRED_OPTION_MISSING',
          message: `Required option "${opt.label}" is not selected`,
        });
      }

      availableOptions.set(opt.key, {
        definition: opt,
        choices: availableChoices,
        selected,
        isRequired: opt.isRequired,
      });
    }
  }

  return {
    availableOptions,
    disabledOptions,
    defaultSelections,
    validationErrors,
  };
}
