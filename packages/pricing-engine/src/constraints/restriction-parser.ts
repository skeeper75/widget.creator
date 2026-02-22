/**
 * Restriction constraint parser for rst_* structures.
 *
 * Parses raw WowPress restriction constraints and evaluates
 * them to filter available options.
 *
 * rst_* constraints DEACTIVATE options: they specify that
 * certain options are excluded/restricted when a particular
 * option is selected.
 */
import type { ConstraintEntityRef } from "@widget-creator/shared";

// ============================================================
// Types
// ============================================================

/** Parsed restriction constraint */
export interface ParsedRestriction {
  type: "restricted";
  constraintKey: string;
  source: ConstraintEntityRef;
  data: Record<string, unknown>;
}

// ============================================================
// Parser
// ============================================================

/**
 * Parse a raw restriction constraint value.
 *
 * @param key - The constraint key (e.g., "rst_paper", "rst_ordqty")
 * @param rawValue - The raw constraint value from product data
 * @param source - The entity that owns this constraint
 * @returns Parsed restriction or null if input is null/undefined/empty
 */
export function parseRestriction(
  key: string,
  rawValue: unknown,
  source: ConstraintEntityRef,
): ParsedRestriction | null {
  if (rawValue === null || rawValue === undefined) {
    return null;
  }

  switch (key) {
    case "rst_paper": {
      // Array of restricted paper refs
      const items = rawValue as Array<Record<string, unknown>>;
      if (!Array.isArray(items) || items.length === 0) return null;
      return {
        type: "restricted",
        constraintKey: key,
        source,
        data: {
          items: items.map((i) => i.paperno as number),
        },
      };
    }

    case "rst_awkjob": {
      // Array of restricted post-process refs
      const items = rawValue as Array<Record<string, unknown>>;
      if (!Array.isArray(items) || items.length === 0) return null;
      return {
        type: "restricted",
        constraintKey: key,
        source,
        data: {
          items: items.map((i) => i.jobno as number),
        },
      };
    }

    case "rst_prsjob": {
      // Array of restricted print job refs
      const items = rawValue as Array<Record<string, unknown>>;
      if (!Array.isArray(items) || items.length === 0) return null;
      return {
        type: "restricted",
        constraintKey: key,
        source,
        data: {
          items: items.map((i) => i.jobno as number),
        },
      };
    }

    case "rst_color": {
      // Array of restricted color refs
      const items = rawValue as Array<Record<string, unknown>>;
      if (!Array.isArray(items) || items.length === 0) return null;
      return {
        type: "restricted",
        constraintKey: key,
        source,
        data: {
          items: items.map((i) => i.colorno as number),
        },
      };
    }

    case "rst_size": {
      // Array of restricted size refs (can also be complex object; only handle array form)
      const items = rawValue as Array<Record<string, unknown>>;
      if (!Array.isArray(items) || items.length === 0) return null;
      return {
        type: "restricted",
        constraintKey: key,
        source,
        data: {
          items: items.map((i) => i.sizeno as number),
        },
      };
    }

    case "rst_ordqty": {
      // Order quantity range restriction (two formats)
      const obj = rawValue as Record<string, unknown>;
      if (typeof obj !== "object") return null;

      let min: number;
      let max: number;
      if ("ordqtymin" in obj) {
        min = obj.ordqtymin as number;
        max = obj.ordqtymax as number;
      } else {
        min = obj.min as number;
        max = obj.max as number;
      }

      return {
        type: "restricted",
        constraintKey: key,
        source,
        data: { min, max },
      };
    }

    case "rst_jobqty": {
      // Job quantity range restriction
      const obj = rawValue as Record<string, unknown>;
      if (typeof obj !== "object") return null;
      return {
        type: "restricted",
        constraintKey: key,
        source,
        data: {
          min: obj.min as number,
          max: obj.max as number,
        },
      };
    }

    case "rst_cutcnt": {
      // Cut count range restriction
      const obj = rawValue as Record<string, unknown>;
      if (typeof obj !== "object") return null;
      return {
        type: "restricted",
        constraintKey: key,
        source,
        data: {
          min: obj.min as number,
          max: obj.max as number,
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
 * Evaluate a restriction constraint to filter candidate values.
 *
 * For list-based restrictions (rst_paper, rst_awkjob, etc.):
 *   Returns candidates that are NOT in the restricted list.
 *
 * For range-based restrictions (rst_ordqty, rst_jobqty, rst_cutcnt):
 *   Returns candidates that ARE within the allowed range [min, max].
 *
 * @param rst - Parsed restriction constraint
 * @param candidates - List of candidate values (IDs or quantities)
 * @returns Filtered list of candidates
 */
export function evaluateRestriction(
  rst: ParsedRestriction,
  candidates: number[],
): number[] {
  switch (rst.constraintKey) {
    case "rst_paper":
    case "rst_awkjob":
    case "rst_prsjob":
    case "rst_color":
    case "rst_size": {
      // List-based: filter OUT restricted items
      const restricted = new Set(rst.data.items as number[]);
      return candidates.filter((c) => !restricted.has(c));
    }

    case "rst_ordqty":
    case "rst_jobqty":
    case "rst_cutcnt": {
      // Range-based: keep only items WITHIN the allowed range
      const min = rst.data.min as number;
      const max = rst.data.max as number;
      return candidates.filter((c) => c >= min && c <= max);
    }

    default:
      return candidates;
  }
}
