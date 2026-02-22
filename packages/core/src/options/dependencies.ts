// Dependency evaluation (REQ-OPT-002)

import type {
  ProductOption,
  OptionResolutionContext,
  DependencyEvalResult,
  SelectedOption,
  OptionDependency,
  OptionChoice,
} from './types.js';

/** Evaluate dependencies for an option, determining visibility and available choices */
export function evaluateDependencies(
  option: ProductOption,
  ctx: OptionResolutionContext,
): DependencyEvalResult {
  const deps = ctx.dependencies.filter(
    d => d.childOptionId === option.optionDefinitionId
      && d.productId === ctx.productId,
  );

  if (deps.length === 0) {
    return { visible: true };
  }

  for (const dep of deps) {
    const parentKey = getOptionKey(dep.parentOptionId, ctx.productOptions);
    const parentSelection = parentKey
      ? ctx.currentSelections.get(parentKey)
      : undefined;

    switch (dep.dependencyType) {
      case 'visibility':
        if (!parentSelection) {
          return {
            visible: false,
            reason: { type: 'PARENT_NOT_SELECTED', parentOptionId: dep.parentOptionId },
          };
        }
        if (dep.parentChoiceId != null && parentSelection.choiceId !== dep.parentChoiceId) {
          return {
            visible: false,
            reason: { type: 'PARENT_CHOICE_MISMATCH', expected: dep.parentChoiceId },
          };
        }
        break;

      case 'choices':
        return {
          visible: true,
          filteredChoices: getFilteredChoices(dep, parentSelection, ctx),
        };

      case 'value':
        // Value linkage (e.g., size -> quantity range) - no filtering needed
        break;
    }
  }

  return { visible: true };
}

/** Find the option key for an option definition id */
export function getOptionKey(
  optionDefinitionId: number,
  productOptions: ProductOption[],
): string | undefined {
  return productOptions.find(o => o.optionDefinitionId === optionDefinitionId)?.key;
}

/** Filter child choices based on parent selection */
export function getFilteredChoices(
  dep: OptionDependency,
  parentSelection: SelectedOption | undefined,
  ctx: OptionResolutionContext,
): string[] {
  if (!parentSelection) return [];

  // Get all choices for the child option
  const childOption = ctx.productOptions.find(
    o => o.optionDefinitionId === dep.childOptionId,
  );
  if (!childOption) return [];

  const allChoices = ctx.optionChoices.filter(
    c => c.optionDefinitionId === dep.childOptionId,
  );

  // Filter choices that are compatible with parent selection
  // If parentChoiceId is specified, only include choices matching that parent choice
  if (dep.parentChoiceId != null) {
    return allChoices
      .filter(c => isChoiceCompatible(c, dep, parentSelection))
      .map(c => c.code);
  }

  return allChoices.map(c => c.code);
}

function isChoiceCompatible(
  choice: OptionChoice,
  dep: OptionDependency,
  parentSelection: SelectedOption,
): boolean {
  // A choice is compatible if it matches the parent's selection context
  // This checks reference IDs for paper/print mode/size linkages
  if (parentSelection.refPaperId != null && choice.refPaperId != null) {
    return choice.refPaperId === parentSelection.refPaperId;
  }
  return true;
}
