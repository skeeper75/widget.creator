/**
 * Size constraint evaluator.
 *
 * Filters available sizes based on the current selection state
 * and evaluates size-specific requirement and restriction constraints.
 */
import type {
  ProductSize,
  OptionSelection,
  ConstraintViolation,
} from "@widget-creator/shared";

/**
 * Filter sizes by the current selection state.
 *
 * - Filters by coverCd (coverCd=0 is global, included for all selections)
 * - Applies rstAwkjob filtering when post-processes are selected
 */
export function filterSizesBySelection(
  sizes: ProductSize[],
  selection: OptionSelection,
): ProductSize[] {
  let result = sizes;

  // Filter by coverCd: include sizes whose coverCd matches selection
  // or coverCd=0 (global sizes always available for non-zero cover selections)
  result = result.filter(
    (s) => s.coverCd === selection.coverCd || s.coverCd === 0,
  );

  // Apply rstAwkjob: exclude sizes that restrict selected post-processes
  const selectedAwkjobs = selection.awkjobSelections ?? [];
  if (selectedAwkjobs.length > 0) {
    result = result.filter((s) => {
      if (!s.rstAwkjob || s.rstAwkjob.length === 0) return true;
      // Size is excluded if any of its restricted awkjobs is selected
      return !s.rstAwkjob.some((rst) =>
        selectedAwkjobs.some((sel) => sel.jobno === rst.jobno),
      );
    });
  }

  return result;
}

/**
 * Evaluate constraints for a specific size against the current selection.
 *
 * Checks:
 * - rstOrdqty: Order quantity must be within allowed range
 * - reqAwkjob: Required post-processes must be selected
 */
export function evaluateSizeConstraints(
  size: ProductSize,
  selection: OptionSelection,
): ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];
  const sizeRef = `size:${size.externalSizeNo}`;

  // Check rstOrdqty
  if (size.rstOrdqty && selection.quantity !== undefined) {
    const { ordqtymin, ordqtymax } = size.rstOrdqty;
    if (selection.quantity < ordqtymin || selection.quantity > ordqtymax) {
      violations.push({
        type: "restricted",
        source: sizeRef,
        target: "quantity",
        message: `Quantity must be between ${ordqtymin} and ${ordqtymax} for size ${size.sizeName}`,
      });
    }
  }

  // Check reqAwkjob
  if (size.reqAwkjob && size.reqAwkjob.length > 0) {
    const selectedAwkjobs = selection.awkjobSelections ?? [];
    const unsatisfied = size.reqAwkjob.filter(
      (req) => !selectedAwkjobs.some((sel) => sel.jobno === req.jobno),
    );

    for (const req of unsatisfied) {
      violations.push({
        type: "required",
        source: sizeRef,
        target: `awkjob:${req.jobno}`,
        message: `Post-process "${req.jobname}" is required for size ${size.sizeName}`,
      });
    }
  }

  return violations;
}
