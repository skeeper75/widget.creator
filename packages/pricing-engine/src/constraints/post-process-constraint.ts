/**
 * Post-process constraint evaluator.
 *
 * Handles the most complex constraint system in the option engine.
 *
 * Requirement types (req):
 * - req_joboption: Requires selection of work options (select/input)
 * - req_jobsize: Requires input of work size (width/height ranges)
 * - req_jobqty: Requires quantity input for the post-process
 * - req_awkjob: Requires another post-process to be selected
 *
 * Restriction types (rst):
 * - rst_jobqty: Restricts quantities for the post-process
 * - rst_cutcnt: Restricts cutting count
 * - rst_size: Restricts which sizes can use this post-process
 * - rst_paper: Restricts which papers can use this post-process
 * - rst_color: Restricts which colors can use this post-process
 * - rst_awkjob: Restricts other post-processes (mutual exclusion)
 */
import type {
  OptionSelection,
  AwkjobSelection,
  ConstraintViolation,
  PostProcessGroup,
  AwkjobItem,
  ProductPostProcess,
} from "@widget-creator/shared";

// ============================================================
// Types
// ============================================================

/** Raw awkjob data from the product post-process structure */
export interface AwkjobData {
  awkjobno: number;
  awkjobname: string;
  inputtype: string;
  req_joboption: Array<{ optno: number; optname: string }> | null;
  req_jobsize: {
    type: string;
    unit: string;
    min: number;
    max: number;
    interval: number;
  } | null;
  req_jobqty: {
    type: string;
    unit: string;
    min: number;
    max: number;
    interval: number;
  } | null;
  req_awkjob: Array<{ jobno: number; jobname: string }> | null;
  rst_jobqty: { type: string; min: number; max: number } | null;
  rst_cutcnt: { min: number; max: number } | null;
  rst_size: Array<{ sizeno: number; sizename: string }> | null;
  rst_paper: Array<{ paperno: number; papername: string }> | null;
  rst_color: Array<{ colorno: number; colorname: string }> | null;
  rst_awkjob: Array<{ jobno: number; jobname: string }> | null;
}

/** Required constraint information for a post-process */
export interface RequiredPostProcess {
  constraintType: string;
  awkjobno: number;
  data: Record<string, unknown>;
}

/** Restricted constraint information for a post-process */
export interface RestrictedPostProcess {
  constraintType: string;
  awkjobno: number;
  data: Record<string, unknown>;
}

/** Result of evaluating a post-process selection */
export interface PostProcessEvaluationResult {
  violations: ConstraintViolation[];
  required: RequiredPostProcess[];
  restricted: RestrictedPostProcess[];
}

// ============================================================
// Evaluator
// ============================================================

/**
 * Evaluates post-process constraints for the option engine.
 *
 * Processes the awkjobinfo structure:
 * awkjobinfo[coverCd].jobgrouplist[].awkjoblist[]
 */
export class PostProcessEvaluator {
  /** Flat index of all awkjob data by awkjobno */
  private readonly awkjobIndex: Map<number, AwkjobData>;
  private readonly postProcesses: ProductPostProcess[];

  constructor(postProcesses: ProductPostProcess[]) {
    this.postProcesses = postProcesses;
    this.awkjobIndex = new Map();
    this.buildIndex();
  }

  /** Build an index of all awkjobs across all post-process records */
  private buildIndex(): void {
    for (const pp of this.postProcesses) {
      for (const group of pp.jobGroupList) {
        for (const raw of group.awkjoblist) {
          const awkjob = raw as AwkjobData;
          this.awkjobIndex.set(awkjob.awkjobno, awkjob);
        }
      }
    }
  }

  /**
   * Get available post-processes given current selection.
   * Filters awkjobs by rst_size, rst_paper, rst_color restrictions.
   */
  getAvailablePostProcesses(
    selection: OptionSelection,
  ): PostProcessGroup[] {
    const groups: PostProcessGroup[] = [];

    for (const pp of this.postProcesses) {
      // Filter by coverCd: include post-processes for the selected cover
      if (pp.coverCd !== selection.coverCd && pp.coverCd !== 0) {
        continue;
      }

      for (const group of pp.jobGroupList) {
        const availableAwkjobs: AwkjobItem[] = [];

        for (const raw of group.awkjoblist) {
          const awkjob = raw as AwkjobData;

          if (this.isAwkjobAvailable(awkjob, selection)) {
            availableAwkjobs.push({
              jobno: awkjob.awkjobno,
              jobname: awkjob.awkjobname,
              namestep1: awkjob.awkjobname,
              namestep2: "",
              unit: "ea",
              isAvailable: true,
            });
          }
        }

        // Only include groups that have at least one available awkjob
        if (availableAwkjobs.length > 0) {
          groups.push({
            jobgroupno: group.jobgroupno,
            jobgroup: group.jobgroup,
            type: group.type,
            displayloc: group.displayloc,
            awkjoblist: availableAwkjobs,
          });
        }
      }
    }

    return groups;
  }

  /**
   * Evaluate constraints for a specific post-process selection.
   * Returns violations, required inputs, and restriction metadata.
   */
  evaluatePostProcess(
    awkjobSelection: AwkjobSelection,
    selection: OptionSelection,
  ): PostProcessEvaluationResult {
    const awkjob = this.awkjobIndex.get(awkjobSelection.jobno);
    if (!awkjob) {
      return { violations: [], required: [], restricted: [] };
    }

    const violations: ConstraintViolation[] = [];
    const required: RequiredPostProcess[] = [];
    const restricted: RestrictedPostProcess[] = [];
    const ref = `awkjob:${awkjob.awkjobno}`;

    // Process requirement constraints
    this.processRequirements(awkjob, selection, ref, violations, required);

    // Process restriction constraints
    this.processRestrictions(awkjob, ref, restricted);

    return { violations, required, restricted };
  }

  /**
   * Check mutual post-process constraints (rst_awkjob).
   * Detects conflicts between simultaneously selected post-processes.
   */
  checkMutualConstraints(
    selectedAwkjobs: AwkjobSelection[],
    _selection: OptionSelection,
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    const selectedNos = new Set(selectedAwkjobs.map((s) => s.jobno));

    for (const sel of selectedAwkjobs) {
      const awkjob = this.awkjobIndex.get(sel.jobno);
      if (!awkjob?.rst_awkjob) continue;

      for (const rst of awkjob.rst_awkjob) {
        if (selectedNos.has(rst.jobno)) {
          violations.push({
            type: "restricted",
            source: `awkjob:${awkjob.awkjobno}`,
            target: `awkjob:${rst.jobno}`,
            message: `"${awkjob.awkjobname}" and "${rst.jobname}" cannot be selected together`,
          });
        }
      }
    }

    return violations;
  }

  /** Check if an awkjob is available given the current selection state */
  private isAwkjobAvailable(
    awkjob: AwkjobData,
    selection: OptionSelection,
  ): boolean {
    // Check rst_size
    if (awkjob.rst_size && selection.sizeNo !== undefined) {
      if (awkjob.rst_size.some((rst) => rst.sizeno === selection.sizeNo)) {
        return false;
      }
    }

    // Check rst_paper
    if (awkjob.rst_paper && selection.paperNo !== undefined) {
      if (awkjob.rst_paper.some((rst) => rst.paperno === selection.paperNo)) {
        return false;
      }
    }

    // Check rst_color
    if (awkjob.rst_color && selection.colorNo !== undefined) {
      if (awkjob.rst_color.some((rst) => rst.colorno === selection.colorNo)) {
        return false;
      }
    }

    return true;
  }

  /** Process all requirement constraints for an awkjob */
  private processRequirements(
    awkjob: AwkjobData,
    selection: OptionSelection,
    ref: string,
    violations: ConstraintViolation[],
    required: RequiredPostProcess[],
  ): void {
    // req_joboption: user must select an option
    if (awkjob.req_joboption && awkjob.req_joboption.length > 0) {
      required.push({
        constraintType: "req_joboption",
        awkjobno: awkjob.awkjobno,
        data: { options: awkjob.req_joboption },
      });
    }

    // req_jobsize: user must input a size
    if (awkjob.req_jobsize) {
      violations.push({
        type: "required",
        source: ref,
        target: "jobsize",
        message: `Post-process "${awkjob.awkjobname}" requires size input (${awkjob.req_jobsize.min}-${awkjob.req_jobsize.max} ${awkjob.req_jobsize.unit})`,
      });
    }

    // req_jobqty: user must input a quantity
    if (awkjob.req_jobqty) {
      required.push({
        constraintType: "req_jobqty",
        awkjobno: awkjob.awkjobno,
        data: {
          min: awkjob.req_jobqty.min,
          max: awkjob.req_jobqty.max,
          interval: awkjob.req_jobqty.interval,
          unit: awkjob.req_jobqty.unit,
        },
      });
    }

    // req_awkjob: another post-process must be selected
    if (awkjob.req_awkjob && awkjob.req_awkjob.length > 0) {
      const selectedJobs = selection.awkjobSelections ?? [];
      const unsatisfied = awkjob.req_awkjob.filter(
        (req) => !selectedJobs.some((sel) => sel.jobno === req.jobno),
      );

      if (unsatisfied.length > 0) {
        required.push({
          constraintType: "req_awkjob",
          awkjobno: awkjob.awkjobno,
          data: { requiredJobs: unsatisfied },
        });
      }
    }
  }

  /** Process all restriction constraints for an awkjob */
  private processRestrictions(
    awkjob: AwkjobData,
    _ref: string,
    restricted: RestrictedPostProcess[],
  ): void {
    // rst_jobqty: job quantity range restriction
    if (awkjob.rst_jobqty) {
      restricted.push({
        constraintType: "rst_jobqty",
        awkjobno: awkjob.awkjobno,
        data: { min: awkjob.rst_jobqty.min, max: awkjob.rst_jobqty.max },
      });
    }

    // rst_cutcnt: cutting count range restriction
    if (awkjob.rst_cutcnt) {
      restricted.push({
        constraintType: "rst_cutcnt",
        awkjobno: awkjob.awkjobno,
        data: { min: awkjob.rst_cutcnt.min, max: awkjob.rst_cutcnt.max },
      });
    }
  }
}
