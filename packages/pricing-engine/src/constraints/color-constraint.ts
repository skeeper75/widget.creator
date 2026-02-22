/**
 * Color constraint evaluator.
 *
 * Filters available colors based on the current selection state
 * and evaluates color-specific requirement and restriction constraints.
 */
import type {
  ProductColor,
  OptionSelection,
  ConstraintViolation,
} from "@widget-creator/shared";

/**
 * Filter colors by the current selection state.
 *
 * - Removes colors in the restricted list (from higher-priority option restrictions)
 * - Applies rstPrsjob filtering when a print method is selected
 * - Applies rstAwkjob filtering when post-processes are selected
 */
export function filterColorsBySelection(
  colors: ProductColor[],
  selection: OptionSelection,
  restrictedColors: number[],
): ProductColor[] {
  let result = colors;

  // Filter out colors in the restricted list
  if (restrictedColors.length > 0) {
    const restricted = new Set(restrictedColors);
    result = result.filter((c) => !restricted.has(c.externalColorNo));
  }

  // Apply rstPrsjob: exclude colors restricted by the selected print method
  if (selection.jobPresetNo !== undefined) {
    result = result.filter((c) => {
      if (!c.rstPrsjob || c.rstPrsjob.length === 0) return true;
      return !c.rstPrsjob.some(
        (rst) => rst.jobno === selection.jobPresetNo,
      );
    });
  }

  // Apply rstAwkjob: exclude colors that restrict selected post-processes
  const selectedAwkjobs = selection.awkjobSelections ?? [];
  if (selectedAwkjobs.length > 0) {
    result = result.filter((c) => {
      if (!c.rstAwkjob || c.rstAwkjob.length === 0) return true;
      return !c.rstAwkjob.some((rst) =>
        selectedAwkjobs.some((sel) => sel.jobno === rst.jobno),
      );
    });
  }

  return result;
}

/**
 * Evaluate constraints for a specific color against the current selection.
 *
 * Checks:
 * - reqPrsjob: Required print method must be selected
 * - reqAwkjob: Required post-processes must be selected
 */
export function evaluateColorConstraints(
  color: ProductColor,
  selection: OptionSelection,
): ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];
  const colorRef = `color:${color.externalColorNo}`;

  // Check reqPrsjob (only when a print method is selected)
  if (
    color.reqPrsjob &&
    color.reqPrsjob.length > 0 &&
    selection.jobPresetNo !== undefined
  ) {
    const match = color.reqPrsjob.some(
      (req) => req.jobpresetno === selection.jobPresetNo,
    );
    if (!match) {
      violations.push({
        type: "required",
        source: colorRef,
        target: `printMethod:${selection.jobPresetNo}`,
        message: `Color "${color.colorName}" requires a specific print method`,
      });
    }
  }

  // Check reqAwkjob
  if (color.reqAwkjob && color.reqAwkjob.length > 0) {
    const selectedAwkjobs = selection.awkjobSelections ?? [];
    const unsatisfied = color.reqAwkjob.filter(
      (req) => !selectedAwkjobs.some((sel) => sel.jobno === req.jobno),
    );

    for (const req of unsatisfied) {
      violations.push({
        type: "required",
        source: colorRef,
        target: `awkjob:${req.jobno}`,
        message: `Post-process "${req.jobname}" is required for color ${color.colorName}`,
      });
    }
  }

  return violations;
}
