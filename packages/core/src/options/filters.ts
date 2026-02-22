// Option choice filtering

import type {
  ProductOption,
  OptionResolutionContext,
  OptionChoice,
  OptionDependency,
  SelectedOption,
} from './types.js';
import { evaluateDependencies } from './dependencies.js';

/** Filter choices for an option based on constraints and dependencies */
export function filterChoices(
  option: ProductOption,
  ctx: OptionResolutionContext,
): OptionChoice[] {
  // Get all choices for this option definition
  const allChoices = ctx.optionChoices.filter(
    c => c.optionDefinitionId === option.optionDefinitionId,
  );

  // Check if there are dependency-based filtered choices
  const depResult = evaluateDependencies(option, ctx);
  if (depResult.filteredChoices) {
    const filteredCodes = new Set(depResult.filteredChoices);
    return allChoices
      .filter(c => filteredCodes.has(c.code))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  return allChoices.sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Get the default choice for an option from available choices */
export function getDefaultChoice(
  option: ProductOption,
  availableChoices: OptionChoice[],
): SelectedOption | null {
  if (availableChoices.length === 0) return null;

  const defaultChoice = availableChoices.find(c => c.isDefault)
    ?? availableChoices[0];

  if (!defaultChoice) return null;

  return {
    optionKey: option.key,
    choiceCode: defaultChoice.code,
    choiceId: defaultChoice.id,
    refPaperId: defaultChoice.refPaperId ?? undefined,
  };
}

/** Get filtered choices based on dependency and parent selection */
export function getFilteredChoicesByDep(
  dep: OptionDependency,
  parentSelection: SelectedOption | undefined,
  ctx: OptionResolutionContext,
): string[] {
  if (!parentSelection) return [];

  const allChoices = ctx.optionChoices.filter(
    c => c.optionDefinitionId === dep.childOptionId,
  );

  if (dep.parentChoiceId != null) {
    return allChoices
      .filter(c => c.id !== dep.parentChoiceId)
      .map(c => c.code);
  }

  return allChoices.map(c => c.code);
}
