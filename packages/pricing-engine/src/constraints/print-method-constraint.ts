/**
 * Print method constraint evaluator.
 *
 * Filters available print methods based on the current selection state
 * and evaluates print method-specific requirement and restriction constraints.
 */
import type {
  ProductPrintMethod,
  OptionSelection,
  ConstraintViolation,
} from "@widget-creator/shared";

/**
 * Filter print methods by the current selection state.
 *
 * - Applies rstPaper filtering when a paper is selected
 * - Applies rstAwkjob filtering when post-processes are selected
 */
export function filterPrintMethodsBySelection(
  methods: ProductPrintMethod[],
  selection: OptionSelection,
): ProductPrintMethod[] {
  let result = methods;

  // Apply rstPaper: exclude methods restricted by the selected paper
  if (selection.paperNo !== undefined) {
    result = result.filter((m) => {
      if (!m.rstPaper || m.rstPaper.length === 0) return true;
      return !m.rstPaper.some(
        (rst) => rst.paperno === selection.paperNo,
      );
    });
  }

  // Apply rstAwkjob: exclude methods restricted by selected post-processes
  const selectedAwkjobs = selection.awkjobSelections ?? [];
  if (selectedAwkjobs.length > 0) {
    result = result.filter((m) => {
      if (!m.rstAwkjob || m.rstAwkjob.length === 0) return true;
      return !m.rstAwkjob.some((rst) =>
        selectedAwkjobs.some((sel) => sel.jobno === rst.jobno),
      );
    });
  }

  return result;
}

/**
 * Evaluate constraints for a specific print method against the current selection.
 *
 * Checks:
 * - reqColor: Required color must be selected
 */
export function evaluatePrintMethodConstraints(
  method: ProductPrintMethod,
  selection: OptionSelection,
): ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];
  const methodRef = `printMethod:${method.externalJobPresetNo}`;

  // Check reqColor (only when a color is selected)
  if (
    method.reqColor &&
    method.reqColor.length > 0 &&
    selection.colorNo !== undefined
  ) {
    const match = method.reqColor.some(
      (req) => req.colorno === selection.colorNo,
    );
    if (!match) {
      violations.push({
        type: "required",
        source: methodRef,
        target: `color:${selection.colorNo}`,
        message: `Print method "${method.jobPreset}" requires a specific color`,
      });
    }
  }

  return violations;
}
