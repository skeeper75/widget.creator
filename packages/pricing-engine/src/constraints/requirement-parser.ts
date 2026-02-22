/**
 * Requirement constraint parser for req_* structures.
 *
 * Parses raw WowPress requirement constraints and evaluates
 * them against the current option selection state.
 *
 * req_* constraints ACTIVATE options: they specify that
 * certain additional options are required when a particular
 * option is selected.
 */
import type {
  ConstraintEntityRef,
  OptionSelection,
} from "@widget-creator/shared";

// ============================================================
// Types
// ============================================================

/** Parsed requirement constraint */
export interface ParsedRequirement {
  type: "required";
  constraintKey: string;
  source: ConstraintEntityRef;
  data: Record<string, unknown>;
}

/** Result of evaluating a requirement */
export interface RequirementResult {
  satisfied: boolean;
  message?: string;
}

// ============================================================
// Parser
// ============================================================

/**
 * Parse a raw requirement constraint value.
 *
 * @param key - The constraint key (e.g., "req_width", "req_awkjob")
 * @param rawValue - The raw constraint value from product data
 * @param source - The entity that owns this constraint
 * @returns Parsed requirement or null if input is null/undefined
 */
export function parseRequirement(
  key: string,
  rawValue: unknown,
  source: ConstraintEntityRef,
): ParsedRequirement | null {
  if (rawValue === null || rawValue === undefined) {
    return null;
  }

  switch (key) {
    case "req_width":
    case "req_height":
    case "req_jobsize":
    case "req_jobqty": {
      // Range input requirement
      const obj = rawValue as Record<string, unknown>;
      return {
        type: "required",
        constraintKey: key,
        source,
        data: {
          type: obj.type ?? "input",
          unit: obj.unit ?? "",
          min: obj.min as number,
          max: obj.max as number,
          interval: obj.interval ?? 1,
        },
      };
    }

    case "req_awkjob": {
      // Array of job references requiring post-process selection
      const jobs = rawValue as Array<Record<string, unknown>>;
      if (!Array.isArray(jobs) || jobs.length === 0) return null;
      return {
        type: "required",
        constraintKey: key,
        source,
        data: {
          jobs: jobs.map((j) => ({
            jobno: j.jobno as number,
            jobname: j.jobname as string,
          })),
        },
      };
    }

    case "req_prsjob": {
      // Array of print job references requiring print method selection
      const jobs = rawValue as Array<Record<string, unknown>>;
      if (!Array.isArray(jobs) || jobs.length === 0) return null;
      return {
        type: "required",
        constraintKey: key,
        source,
        data: {
          jobs: jobs.map((j) => ({
            jobpresetno: j.jobpresetno as number,
            jobno: j.jobno as number,
            jobname: j.jobname as string,
          })),
        },
      };
    }

    case "req_joboption": {
      // Array of option references
      const options = rawValue as Array<Record<string, unknown>>;
      if (!Array.isArray(options) || options.length === 0) return null;
      return {
        type: "required",
        constraintKey: key,
        source,
        data: {
          options: options.map((o) => ({
            optno: o.optno as number,
            optname: o.optname as string,
          })),
        },
      };
    }

    default:
      return null;
  }
}

// ============================================================
// Evaluator
// ============================================================

/**
 * Evaluate a requirement constraint against the current selection.
 *
 * @param req - Parsed requirement constraint
 * @param selection - Current option selection state
 * @param inputValues - Optional input values for range constraints (e.g., { width: 100 })
 * @returns Evaluation result
 */
export function evaluateRequirement(
  req: ParsedRequirement,
  selection: OptionSelection,
  inputValues?: Record<string, number>,
): RequirementResult {
  switch (req.constraintKey) {
    case "req_width": {
      const width = inputValues?.width;
      if (width === undefined) {
        return { satisfied: false, message: "Width input required" };
      }
      const min = req.data.min as number;
      const max = req.data.max as number;
      if (width < min || width > max) {
        return {
          satisfied: false,
          message: `Width must be between ${min} and ${max}`,
        };
      }
      return { satisfied: true };
    }

    case "req_height": {
      const height = inputValues?.height;
      if (height === undefined) {
        return { satisfied: false, message: "Height input required" };
      }
      const min = req.data.min as number;
      const max = req.data.max as number;
      if (height < min || height > max) {
        return {
          satisfied: false,
          message: `Height must be between ${min} and ${max}`,
        };
      }
      return { satisfied: true };
    }

    case "req_awkjob": {
      const requiredJobs = req.data.jobs as Array<{ jobno: number }>;
      const selectedJobs = selection.awkjobSelections ?? [];
      const allSatisfied = requiredJobs.every((rj) =>
        selectedJobs.some((sj) => sj.jobno === rj.jobno),
      );
      if (!allSatisfied) {
        return {
          satisfied: false,
          message: "Required post-process not selected",
        };
      }
      return { satisfied: true };
    }

    case "req_prsjob": {
      const requiredJobs = req.data.jobs as Array<{ jobpresetno: number }>;
      const selectedPreset = selection.jobPresetNo;
      if (selectedPreset === undefined) {
        return { satisfied: false, message: "Print method selection required" };
      }
      const match = requiredJobs.some(
        (rj) => rj.jobpresetno === selectedPreset,
      );
      if (!match) {
        return {
          satisfied: false,
          message: "Required print method not selected",
        };
      }
      return { satisfied: true };
    }

    case "req_jobsize": {
      const width = inputValues?.width;
      const height = inputValues?.height;
      if (width === undefined || height === undefined) {
        return { satisfied: false, message: "Job size input required" };
      }
      const min = req.data.min as number;
      const max = req.data.max as number;
      if (width < min || width > max || height < min || height > max) {
        return {
          satisfied: false,
          message: `Job size must be between ${min} and ${max}`,
        };
      }
      return { satisfied: true };
    }

    case "req_jobqty": {
      const qty = inputValues?.quantity;
      if (qty === undefined) {
        return { satisfied: false, message: "Job quantity input required" };
      }
      const min = req.data.min as number;
      const max = req.data.max as number;
      if (qty < min || qty > max) {
        return {
          satisfied: false,
          message: `Job quantity must be between ${min} and ${max}`,
        };
      }
      return { satisfied: true };
    }

    case "req_joboption": {
      // Option selection is required but we just validate it exists
      return { satisfied: true };
    }

    default:
      return { satisfied: true };
  }
}
