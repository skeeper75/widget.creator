/**
 * Paper constraint evaluator.
 *
 * Filters available papers based on the current selection state
 * and evaluates paper-specific requirement and restriction constraints.
 */
import type {
  ProductPaper,
  OptionSelection,
  ConstraintViolation,
} from "@widget-creator/shared";

/**
 * Filter papers by the current selection state.
 *
 * - Removes papers in the restricted list (from higher-priority option restrictions)
 * - Applies rstAwkjob filtering when post-processes are selected
 * - Applies rstPrsjob filtering when a print method is selected
 */
export function filterPapersBySelection(
  papers: ProductPaper[],
  selection: OptionSelection,
  restrictedPapers: number[],
): ProductPaper[] {
  let result = papers;

  // Filter out papers in the restricted list
  if (restrictedPapers.length > 0) {
    const restricted = new Set(restrictedPapers);
    result = result.filter((p) => !restricted.has(p.externalPaperNo));
  }

  // Apply rstAwkjob: exclude papers that restrict selected post-processes
  const selectedAwkjobs = selection.awkjobSelections ?? [];
  if (selectedAwkjobs.length > 0) {
    result = result.filter((p) => {
      if (!p.rstAwkjob || p.rstAwkjob.length === 0) return true;
      return !p.rstAwkjob.some((rst) =>
        selectedAwkjobs.some((sel) => sel.jobno === rst.jobno),
      );
    });
  }

  // Apply rstPrsjob: exclude papers restricted by the selected print method
  if (selection.jobPresetNo !== undefined) {
    result = result.filter((p) => {
      if (!p.rstPrsjob || p.rstPrsjob.length === 0) return true;
      // Paper is excluded if the selected print method's job is in rstPrsjob
      return !p.rstPrsjob.some(
        (rst) => rst.jobno === selection.jobPresetNo,
      );
    });
  }

  return result;
}

/**
 * Evaluate constraints for a specific paper against the current selection.
 *
 * Checks:
 * - rstOrdqty: Order quantity must be within allowed range
 * - reqAwkjob: Required post-processes must be selected
 */
export function evaluatePaperConstraints(
  paper: ProductPaper,
  selection: OptionSelection,
): ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];
  const paperRef = `paper:${paper.externalPaperNo}`;

  // Check rstOrdqty
  if (paper.rstOrdqty && selection.quantity !== undefined) {
    const { ordqtymin, ordqtymax } = paper.rstOrdqty;
    if (selection.quantity < ordqtymin || selection.quantity > ordqtymax) {
      violations.push({
        type: "restricted",
        source: paperRef,
        target: "quantity",
        message: `Quantity must be between ${ordqtymin} and ${ordqtymax} for paper ${paper.paperName}`,
      });
    }
  }

  // Check reqAwkjob
  if (paper.reqAwkjob && paper.reqAwkjob.length > 0) {
    const selectedAwkjobs = selection.awkjobSelections ?? [];
    const unsatisfied = paper.reqAwkjob.filter(
      (req) => !selectedAwkjobs.some((sel) => sel.jobno === req.jobno),
    );

    for (const req of unsatisfied) {
      violations.push({
        type: "required",
        source: paperRef,
        target: `awkjob:${req.jobno}`,
        message: `Post-process "${req.jobname}" is required for paper ${paper.paperName}`,
      });
    }
  }

  return violations;
}
