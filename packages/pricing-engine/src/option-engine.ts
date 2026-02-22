/**
 * Option priority chain engine.
 *
 * Manages the cascading option selection flow:
 * jobPresetNo -> sizeNo -> paperNo -> optNo -> colorNo -> colorNoAdd
 *
 * When a higher-priority option changes, all lower-priority
 * selections are reset. Constraints are evaluated at each level.
 */
import type {
  OptionSelection,
  AvailableOptions,
  ConstraintViolation,
  SizeOption,
  PaperOption,
  ColorOption,
  PrintMethodOption,
  PostProcessGroup,
  QuantityOption,
  ProductSize,
  ProductPaper,
  ProductColor,
} from "@widget-creator/shared";

import type { ProductData, OptionLevel, OptionSelectionResult } from "./types.js";
import { CoverHandler } from "./cover-handler.js";
import { QuantityResolver } from "./quantity-resolver.js";
import { filterSizesBySelection, evaluateSizeConstraints } from "./constraints/size-constraint.js";
import { filterPapersBySelection, evaluatePaperConstraints } from "./constraints/paper-constraint.js";
import { filterColorsBySelection, evaluateColorConstraints } from "./constraints/color-constraint.js";
import { filterPrintMethodsBySelection, evaluatePrintMethodConstraints } from "./constraints/print-method-constraint.js";
import { PostProcessEvaluator } from "./constraints/post-process-constraint.js";

// ============================================================
// Priority chain definition
// ============================================================

/** Priority order: higher index = lower priority */
const PRIORITY_ORDER: OptionLevel[] = [
  "jobPreset",
  "size",
  "paper",
  "option",
  "color",
  "colorAdd",
];

/** Map from OptionLevel to the selection field name */
const LEVEL_FIELD_MAP: Record<OptionLevel, keyof OptionSelection> = {
  jobPreset: "jobPresetNo",
  size: "sizeNo",
  paper: "paperNo",
  option: "optNo",
  color: "colorNo",
  colorAdd: "colorNoAdd",
};

// ============================================================
// Engine
// ============================================================

/**
 * Core option engine that manages the selection priority chain.
 * Computes available options, handles selection changes with
 * cascading resets, and validates entire selection states.
 */
export class OptionEngine {
  private readonly data: ProductData;
  private readonly coverHandler: CoverHandler;
  private readonly quantityResolver: QuantityResolver;
  private readonly postProcessEvaluator: PostProcessEvaluator;

  constructor(productData: ProductData) {
    this.data = productData;
    this.coverHandler = new CoverHandler(productData);
    this.quantityResolver = new QuantityResolver(productData.orderQuantities);
    this.postProcessEvaluator = new PostProcessEvaluator(
      productData.postProcesses,
    );
  }

  /**
   * Get available options given the current selection state.
   *
   * Algorithm:
   * 1. Start with full option lists for each level
   * 2. Filter by coverCd
   * 3. Apply cascading constraints from higher to lower priority
   * 4. Collect constraint violations
   * 5. Resolve quantities
   */
  getAvailableOptions(selection: OptionSelection): AvailableOptions {
    const constraints: ConstraintViolation[] = [];

    // Get cover-filtered base options
    const coverOptions = this.coverHandler.getOptionsForCover(selection.coverCd);

    // Collect restriction lists from higher-priority selections
    const restrictedPapers = this.collectRestrictedPapers(selection);
    const restrictedColors = this.collectRestrictedColors(selection);

    // Filter sizes
    const filteredSizes = filterSizesBySelection(
      coverOptions.sizes,
      selection,
    );

    // Filter papers with restrictions from print methods
    const filteredPapers = filterPapersBySelection(
      coverOptions.papers,
      selection,
      restrictedPapers,
    );

    // Filter colors with restrictions
    const filteredColors = filterColorsBySelection(
      coverOptions.colors,
      selection,
      restrictedColors,
    );

    // Filter print methods
    const filteredPrintMethods = filterPrintMethodsBySelection(
      this.data.printMethods,
      selection,
    );

    // Get available post-processes
    const postProcesses = this.postProcessEvaluator.getAvailablePostProcesses(
      selection,
    );

    // Resolve quantities
    const quantities = this.quantityResolver.resolve(selection);

    // Evaluate constraints for selected options
    this.evaluateSelectedConstraints(selection, constraints);

    // Convert to display types
    return {
      sizes: filteredSizes.map((s) => this.toSizeOption(s)),
      papers: filteredPapers.map((p) => this.toPaperOption(p)),
      colors: filteredColors.map((c) => this.toColorOption(c)),
      printMethods: filteredPrintMethods.map((m) => ({
        jobPresetNo: m.externalJobPresetNo,
        jobPreset: m.jobPreset,
        isAvailable: true,
      })),
      options: [], // Options are product-specific, not implemented in base engine
      postProcesses,
      quantities,
      constraints,
    };
  }

  /**
   * Select an option at a given level.
   * Returns the updated selection (with lower levels reset)
   * and the new available options.
   */
  selectOption(
    selection: OptionSelection,
    level: OptionLevel,
    value: number,
  ): OptionSelectionResult {
    const newSelection = { ...selection };
    const resetLevels: OptionLevel[] = [];

    // Set the value at the specified level
    const field = LEVEL_FIELD_MAP[level];
    (newSelection as Record<string, unknown>)[field as string] = value;

    // Reset all levels below the selected one
    const selectedIndex = PRIORITY_ORDER.indexOf(level);
    for (let i = selectedIndex + 1; i < PRIORITY_ORDER.length; i++) {
      const resetLevel = PRIORITY_ORDER[i];
      const resetField = LEVEL_FIELD_MAP[resetLevel];
      if ((newSelection as Record<string, unknown>)[resetField as string] !== undefined) {
        (newSelection as Record<string, unknown>)[resetField as string] = undefined;
        resetLevels.push(resetLevel);
      }
    }

    return {
      selection: newSelection,
      availableOptions: this.getAvailableOptions(newSelection),
      resetLevels,
    };
  }

  /**
   * Validate the entire selection state.
   * Returns all constraint violations for the current selection.
   */
  validateSelection(selection: OptionSelection): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    this.evaluateSelectedConstraints(selection, violations);

    // Check mutual post-process constraints
    if (selection.awkjobSelections && selection.awkjobSelections.length > 0) {
      const mutualViolations = this.postProcessEvaluator.checkMutualConstraints(
        selection.awkjobSelections,
        selection,
      );
      violations.push(...mutualViolations);
    }

    return violations;
  }

  // ============================================================
  // Private helpers
  // ============================================================

  /**
   * Evaluate constraints for all currently selected options.
   * Adds violations to the provided array.
   */
  private evaluateSelectedConstraints(
    selection: OptionSelection,
    violations: ConstraintViolation[],
  ): void {
    // Evaluate size constraints
    if (selection.sizeNo !== undefined) {
      const size = this.data.sizes.find(
        (s) => s.externalSizeNo === selection.sizeNo,
      );
      if (size) {
        violations.push(...evaluateSizeConstraints(size, selection));
      }
    }

    // Evaluate paper constraints
    if (selection.paperNo !== undefined) {
      const paper = this.data.papers.find(
        (p) => p.externalPaperNo === selection.paperNo,
      );
      if (paper) {
        violations.push(...evaluatePaperConstraints(paper, selection));
      }
    }

    // Evaluate color constraints
    if (selection.colorNo !== undefined) {
      const color = this.data.colors.find(
        (c) => c.externalColorNo === selection.colorNo,
      );
      if (color) {
        violations.push(...evaluateColorConstraints(color, selection));
      }
    }

    // Evaluate print method constraints
    if (selection.jobPresetNo !== undefined) {
      const method = this.data.printMethods.find(
        (m) => m.externalJobPresetNo === selection.jobPresetNo,
      );
      if (method) {
        violations.push(
          ...evaluatePrintMethodConstraints(method, selection),
        );
      }
    }
  }

  /**
   * Collect paper IDs restricted by higher-priority selections
   * (e.g., print method rstPaper).
   */
  private collectRestrictedPapers(selection: OptionSelection): number[] {
    const restricted: number[] = [];

    // Print method may restrict papers
    if (selection.jobPresetNo !== undefined) {
      const method = this.data.printMethods.find(
        (m) => m.externalJobPresetNo === selection.jobPresetNo,
      );
      if (method?.rstPaper) {
        restricted.push(...method.rstPaper.map((r) => r.paperno));
      }
    }

    return restricted;
  }

  /**
   * Collect color IDs restricted by higher-priority selections.
   * Currently color restrictions come from rstColor on individual
   * colors (handled by filterColorsBySelection), not from
   * higher-priority entities. Placeholder for future expansion.
   */
  private collectRestrictedColors(_selection: OptionSelection): number[] {
    return [];
  }

  /** Convert ProductSize to display SizeOption */
  private toSizeOption(size: ProductSize): SizeOption {
    return {
      sizeNo: size.externalSizeNo,
      sizeName: size.sizeName,
      width: size.width,
      height: size.height,
      cutSize: size.cutSize,
      isNonStandard: size.isNonStandard,
      isAvailable: true,
      reqWidth: size.reqWidth,
      reqHeight: size.reqHeight,
    };
  }

  /** Convert ProductPaper to display PaperOption */
  private toPaperOption(paper: ProductPaper): PaperOption {
    return {
      paperNo: paper.externalPaperNo,
      paperName: paper.paperName,
      paperGroup: paper.paperGroup,
      pGram: paper.pGram,
      isAvailable: true,
    };
  }

  /** Convert ProductColor to display ColorOption */
  private toColorOption(color: ProductColor): ColorOption {
    return {
      colorNo: color.externalColorNo,
      colorName: color.colorName,
      pdfPage: color.pdfPage,
      isAdditional: color.isAdditional,
      isAvailable: true,
    };
  }
}
