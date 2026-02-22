/**
 * Quantity resolver for the option engine.
 *
 * Resolves available quantities based on the current selection state.
 * Supports two modes:
 * - Common type: All config fields are null; same quantities for all combinations
 * - Combination type: Specific field combinations produce different quantity configs
 */
import type {
  ProductOrderQty,
  OptionSelection,
  QuantityOption,
} from "@widget-creator/shared";

/** Default empty quantity when no match is found */
const DEFAULT_QUANTITY: QuantityOption = {
  displayType: "list",
  minQty: 0,
  maxQty: 0,
  interval: null,
  qtyList: null,
};

/** Fields used for combination matching */
const MATCH_FIELDS = [
  "jobPresetNo",
  "sizeNo",
  "paperNo",
  "optNo",
  "colorNo",
  "colorNoAdd",
] as const;

type MatchField = (typeof MATCH_FIELDS)[number];

/**
 * Resolves available quantities based on product configuration
 * and current selection state.
 */
export class QuantityResolver {
  private readonly configs: ProductOrderQty[];

  constructor(orderQuantities: ProductOrderQty[]) {
    this.configs = orderQuantities;
  }

  /**
   * Determine whether the quantity configuration is common-type
   * (same for all combinations) or combination-type (varies per selection).
   */
  getQuantityType(): "common" | "combination" {
    if (this.configs.length === 0) {
      return "common";
    }

    // If all configs have all match fields as null, it is common type
    const allNull = this.configs.every((cfg) =>
      MATCH_FIELDS.every((f) => cfg[f] === null),
    );

    return allNull ? "common" : "combination";
  }

  /**
   * Resolve the quantity option for the current selection.
   *
   * For common type: returns the single quantity config.
   * For combination type: matches the selection against config fields,
   * where null config fields act as wildcards.
   */
  resolve(selection: OptionSelection): QuantityOption {
    if (this.configs.length === 0) {
      return { ...DEFAULT_QUANTITY };
    }

    if (this.getQuantityType() === "common") {
      return this.toQuantityOption(this.configs[0]);
    }

    // Combination type: find the best matching config
    const match = this.findBestMatch(selection);
    if (match === null) {
      return { ...DEFAULT_QUANTITY };
    }

    return this.toQuantityOption(match);
  }

  /**
   * Find the best matching config for the given selection.
   * Prefers more specific matches (more non-null fields matched)
   * over wildcard matches.
   */
  private findBestMatch(selection: OptionSelection): ProductOrderQty | null {
    let bestMatch: ProductOrderQty | null = null;
    let bestScore = -1;

    for (const cfg of this.configs) {
      const score = this.matchScore(cfg, selection);
      if (score !== null && score > bestScore) {
        bestScore = score;
        bestMatch = cfg;
      }
    }

    return bestMatch;
  }

  /**
   * Compute a match score for a config against a selection.
   * Returns null if the config does not match the selection.
   * Higher scores indicate more specific matches.
   */
  private matchScore(cfg: ProductOrderQty, selection: OptionSelection): number | null {
    let score = 0;

    for (const field of MATCH_FIELDS) {
      const cfgValue = cfg[field];
      const selValue = selection[field as keyof OptionSelection] as
        | number
        | undefined;

      if (cfgValue === null) {
        // Wildcard: matches anything, no score increase
        continue;
      }

      if (selValue === undefined) {
        // Config requires a value but selection has none: no match
        return null;
      }

      if (cfgValue !== selValue) {
        // Config value does not match selection: no match
        return null;
      }

      // Exact match: increase score for specificity
      score += 1;
    }

    return score;
  }

  /** Convert a ProductOrderQty record to a QuantityOption */
  private toQuantityOption(cfg: ProductOrderQty): QuantityOption {
    return {
      displayType: cfg.displayType,
      minQty: cfg.minQty,
      maxQty: cfg.maxQty,
      interval: cfg.interval,
      qtyList: cfg.qtyList,
    };
  }
}
