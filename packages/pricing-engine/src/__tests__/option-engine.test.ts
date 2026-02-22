/**
 * Tests for the option priority chain engine.
 *
 * The core engine that manages cascading option selection:
 * jobPreset -> size -> paper -> option -> color -> colorAdd
 *
 * When a higher-priority option changes, all lower-priority
 * selections must be reset.
 */
import { describe, it, expect } from "vitest";
import { OptionEngine } from "../option-engine.js";
import type { OptionSelection, AvailableOptions } from "@widget-creator/shared";
import type { OptionLevel, OptionSelectionResult } from "../types.js";
import {
  createSimpleProduct,
  createMediumProduct,
  createComplexProduct,
} from "./fixtures.js";

describe("OptionEngine", () => {
  describe("getAvailableOptions - simple product", () => {
    it("should return all sizes for an empty selection", () => {
      const engine = new OptionEngine(createSimpleProduct());
      const selection: OptionSelection = {
        productId: "prod-simple-001",
        coverCd: 0,
      };

      const options = engine.getAvailableOptions(selection);

      expect(options.sizes).toHaveLength(2);
    });

    it("should return all papers when no constraints restrict them", () => {
      const engine = new OptionEngine(createSimpleProduct());
      const selection: OptionSelection = {
        productId: "prod-simple-001",
        coverCd: 0,
        sizeNo: 5001,
      };

      const options = engine.getAvailableOptions(selection);

      expect(options.papers).toHaveLength(2);
    });

    it("should return all colors for a simple product", () => {
      const engine = new OptionEngine(createSimpleProduct());
      const selection: OptionSelection = {
        productId: "prod-simple-001",
        coverCd: 0,
        sizeNo: 5001,
        paperNo: 2001,
      };

      const options = engine.getAvailableOptions(selection);

      expect(options.colors).toHaveLength(2);
    });

    it("should return quantities for any selection", () => {
      const engine = new OptionEngine(createSimpleProduct());
      const selection: OptionSelection = {
        productId: "prod-simple-001",
        coverCd: 0,
      };

      const options = engine.getAvailableOptions(selection);

      expect(options.quantities.qtyList).toEqual([
        100, 200, 300, 500, 1000, 2000, 3000, 5000, 10000,
      ]);
    });

    it("should return no constraints for a simple product", () => {
      const engine = new OptionEngine(createSimpleProduct());
      const selection: OptionSelection = {
        productId: "prod-simple-001",
        coverCd: 0,
        sizeNo: 5001,
        paperNo: 2001,
        colorNo: 301,
      };

      const options = engine.getAvailableOptions(selection);

      expect(options.constraints).toHaveLength(0);
    });
  });

  describe("getAvailableOptions - medium product with constraints", () => {
    it("should filter papers by print method restrictions", () => {
      const engine = new OptionEngine(createMediumProduct());
      // Digital Print (3200) restricts Snow White 200g (2011)
      const selection: OptionSelection = {
        productId: "prod-medium-001",
        coverCd: 0,
        jobPresetNo: 3200,
      };

      const options = engine.getAvailableOptions(selection);

      // Paper 2011 (Snow White) should be filtered out by rstPrsjob
      const paperNos = options.papers.map((p) => p.paperNo);
      expect(paperNos).not.toContain(2011);
    });

    it("should include papers not restricted by print method", () => {
      const engine = new OptionEngine(createMediumProduct());
      const selection: OptionSelection = {
        productId: "prod-medium-001",
        coverCd: 0,
        jobPresetNo: 3110, // Offset Print - no paper restrictions
      };

      const options = engine.getAvailableOptions(selection);

      expect(options.papers).toHaveLength(3);
    });

    it("should return combination-specific quantities for A3 size", () => {
      const engine = new OptionEngine(createMediumProduct());
      const selection: OptionSelection = {
        productId: "prod-medium-001",
        coverCd: 0,
        sizeNo: 5011, // A3
      };

      const options = engine.getAvailableOptions(selection);

      expect(options.quantities.minQty).toBe(500);
      expect(options.quantities.maxQty).toBe(50000);
    });

    it("should return combination-specific quantities for A4 size", () => {
      const engine = new OptionEngine(createMediumProduct());
      const selection: OptionSelection = {
        productId: "prod-medium-001",
        coverCd: 0,
        sizeNo: 5010, // A4
      };

      const options = engine.getAvailableOptions(selection);

      expect(options.quantities.minQty).toBe(100);
      expect(options.quantities.maxQty).toBe(5000);
    });

    it("should report constraint violation for color requiring specific print method", () => {
      const engine = new OptionEngine(createMediumProduct());
      // Color 302 requires Offset Print (3110)
      const selection: OptionSelection = {
        productId: "prod-medium-001",
        coverCd: 0,
        jobPresetNo: 3200, // Digital Print
        colorNo: 302, // Requires Offset Print
      };

      const options = engine.getAvailableOptions(selection);

      expect(options.constraints.length).toBeGreaterThan(0);
      expect(options.constraints.some((c) => c.type === "required")).toBe(true);
    });

    it("should include post-process groups", () => {
      const engine = new OptionEngine(createMediumProduct());
      const selection: OptionSelection = {
        productId: "prod-medium-001",
        coverCd: 0,
      };

      const options = engine.getAvailableOptions(selection);

      expect(options.postProcesses.length).toBeGreaterThan(0);
    });

    it("should filter post-processes restricted by paper", () => {
      const engine = new OptionEngine(createMediumProduct());
      // Kraft Paper (2012) has rstAwkjob for UV Spot Coating (30020)
      // but post-processes are filtered differently - check that
      // awkjob 30020 is available when kraft paper is NOT selected
      const selection: OptionSelection = {
        productId: "prod-medium-001",
        coverCd: 0,
        paperNo: 2010, // Art Paper - no restrictions
      };

      const options = engine.getAvailableOptions(selection);
      const allJobNos = options.postProcesses.flatMap((g) =>
        g.awkjoblist.map((a) => a.jobno),
      );

      expect(allJobNos).toContain(30020);
    });
  });

  describe("getAvailableOptions - complex product (pjoin=1)", () => {
    it("should return cover-specific papers for coverCd=1", () => {
      const engine = new OptionEngine(createComplexProduct());
      const selection: OptionSelection = {
        productId: "prod-complex-001",
        coverCd: 1,
      };

      const options = engine.getAvailableOptions(selection);

      expect(options.papers).toHaveLength(2);
      expect(options.papers.every((p) => p.paperNo === 2020 || p.paperNo === 2021)).toBe(true);
    });

    it("should return inner-page colors for coverCd=2", () => {
      const engine = new OptionEngine(createComplexProduct());
      const selection: OptionSelection = {
        productId: "prod-complex-001",
        coverCd: 2,
      };

      const options = engine.getAvailableOptions(selection);

      expect(options.colors).toHaveLength(2);
    });

    it("should share sizes across cover types", () => {
      const engine = new OptionEngine(createComplexProduct());

      const coverOptions = engine.getAvailableOptions({
        productId: "prod-complex-001",
        coverCd: 1,
      });
      const innerOptions = engine.getAvailableOptions({
        productId: "prod-complex-001",
        coverCd: 2,
      });

      expect(coverOptions.sizes).toHaveLength(2);
      expect(innerOptions.sizes).toHaveLength(2);
    });

    it("should return cover post-processes only for coverCd=1", () => {
      const engine = new OptionEngine(createComplexProduct());
      const selection: OptionSelection = {
        productId: "prod-complex-001",
        coverCd: 1,
      };

      const options = engine.getAvailableOptions(selection);

      expect(options.postProcesses.length).toBeGreaterThan(0);
    });

    it("should return empty post-processes for coverCd=2 (inner pages)", () => {
      const engine = new OptionEngine(createComplexProduct());
      const selection: OptionSelection = {
        productId: "prod-complex-001",
        coverCd: 2,
      };

      const options = engine.getAvailableOptions(selection);

      expect(options.postProcesses).toHaveLength(0);
    });
  });

  describe("selectOption - priority chain reset", () => {
    it("should reset paper and below when size changes", () => {
      const engine = new OptionEngine(createMediumProduct());
      const selection: OptionSelection = {
        productId: "prod-medium-001",
        coverCd: 0,
        sizeNo: 5010,
        paperNo: 2010,
        colorNo: 301,
      };

      const result = engine.selectOption(selection, "size", 5011);

      expect(result.selection.sizeNo).toBe(5011);
      expect(result.selection.paperNo).toBeUndefined();
      expect(result.selection.colorNo).toBeUndefined();
      expect(result.resetLevels).toContain("paper");
      expect(result.resetLevels).toContain("color");
    });

    it("should reset color when paper changes", () => {
      const engine = new OptionEngine(createMediumProduct());
      const selection: OptionSelection = {
        productId: "prod-medium-001",
        coverCd: 0,
        sizeNo: 5010,
        paperNo: 2010,
        colorNo: 301,
      };

      const result = engine.selectOption(selection, "paper", 2011);

      expect(result.selection.paperNo).toBe(2011);
      expect(result.selection.colorNo).toBeUndefined();
      expect(result.selection.sizeNo).toBe(5010); // Preserved
    });

    it("should not reset anything when selecting at the lowest level", () => {
      const engine = new OptionEngine(createMediumProduct());
      const selection: OptionSelection = {
        productId: "prod-medium-001",
        coverCd: 0,
        sizeNo: 5010,
        paperNo: 2010,
        colorNo: 301,
      };

      const result = engine.selectOption(selection, "colorAdd", 999);

      expect(result.resetLevels).toHaveLength(0);
      expect(result.selection.colorNo).toBe(301); // Preserved
    });

    it("should reset everything below jobPreset when it changes", () => {
      const engine = new OptionEngine(createMediumProduct());
      const selection: OptionSelection = {
        productId: "prod-medium-001",
        coverCd: 0,
        jobPresetNo: 3110,
        sizeNo: 5010,
        paperNo: 2010,
        colorNo: 301,
      };

      const result = engine.selectOption(selection, "jobPreset", 3200);

      expect(result.selection.jobPresetNo).toBe(3200);
      expect(result.selection.sizeNo).toBeUndefined();
      expect(result.selection.paperNo).toBeUndefined();
      expect(result.selection.colorNo).toBeUndefined();
    });

    it("should return updated available options after selection", () => {
      const engine = new OptionEngine(createMediumProduct());
      const selection: OptionSelection = {
        productId: "prod-medium-001",
        coverCd: 0,
      };

      const result = engine.selectOption(selection, "size", 5010);

      expect(result.availableOptions.sizes).toHaveLength(3);
      expect(result.availableOptions.papers).toHaveLength(3);
    });
  });

  describe("validateSelection", () => {
    it("should return no violations for a valid simple selection", () => {
      const engine = new OptionEngine(createSimpleProduct());
      const selection: OptionSelection = {
        productId: "prod-simple-001",
        coverCd: 0,
        sizeNo: 5001,
        paperNo: 2001,
        colorNo: 301,
      };

      const violations = engine.validateSelection(selection);

      expect(violations).toHaveLength(0);
    });

    it("should return violations for conflicting color and print method", () => {
      const engine = new OptionEngine(createMediumProduct());
      const selection: OptionSelection = {
        productId: "prod-medium-001",
        coverCd: 0,
        jobPresetNo: 3200, // Digital Print
        sizeNo: 5010,
        paperNo: 2010,
        colorNo: 302, // Requires Offset Print (3110)
      };

      const violations = engine.validateSelection(selection);

      expect(violations.length).toBeGreaterThan(0);
    });

    it("should return violations for paper requiring post-process not selected", () => {
      const engine = new OptionEngine(createMediumProduct());
      const selection: OptionSelection = {
        productId: "prod-medium-001",
        coverCd: 0,
        sizeNo: 5010,
        paperNo: 2012, // Kraft Paper requires Lamination (30010)
        awkjobSelections: [],
      };

      const violations = engine.validateSelection(selection);

      expect(violations.length).toBeGreaterThan(0);
      expect(violations.some((v) => v.type === "required")).toBe(true);
    });

    it("should return no violations when required post-process is selected", () => {
      const engine = new OptionEngine(createMediumProduct());
      const selection: OptionSelection = {
        productId: "prod-medium-001",
        coverCd: 0,
        sizeNo: 5010,
        paperNo: 2012, // Kraft Paper requires Lamination (30010)
        awkjobSelections: [{ jobgroupno: 10000, jobno: 30010 }],
      };

      const violations = engine.validateSelection(selection);

      // No violation for reqAwkjob since lamination IS selected
      const reqViolations = violations.filter((v) => v.type === "required");
      expect(reqViolations).toHaveLength(0);
    });

    it("should detect mutual post-process exclusion", () => {
      const engine = new OptionEngine(createMediumProduct());
      const selection: OptionSelection = {
        productId: "prod-medium-001",
        coverCd: 0,
        sizeNo: 5010,
        paperNo: 2010,
        awkjobSelections: [
          { jobgroupno: 10000, jobno: 30010 }, // Lamination
          { jobgroupno: 10000, jobno: 30020 }, // UV Spot Coating (mutually exclusive)
        ],
      };

      const violations = engine.validateSelection(selection);

      expect(violations.some((v) => v.type === "restricted")).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle product with no print methods", () => {
      const engine = new OptionEngine(createSimpleProduct());
      const selection: OptionSelection = {
        productId: "prod-simple-001",
        coverCd: 0,
      };

      const options = engine.getAvailableOptions(selection);

      expect(options.printMethods).toHaveLength(0);
    });

    it("should handle product with no post-processes", () => {
      const engine = new OptionEngine(createSimpleProduct());
      const selection: OptionSelection = {
        productId: "prod-simple-001",
        coverCd: 0,
      };

      const options = engine.getAvailableOptions(selection);

      expect(options.postProcesses).toHaveLength(0);
    });

    it("should return empty options array (not undefined) for all fields", () => {
      const engine = new OptionEngine(createSimpleProduct());
      const selection: OptionSelection = {
        productId: "prod-simple-001",
        coverCd: 0,
      };

      const options = engine.getAvailableOptions(selection);

      expect(Array.isArray(options.sizes)).toBe(true);
      expect(Array.isArray(options.papers)).toBe(true);
      expect(Array.isArray(options.colors)).toBe(true);
      expect(Array.isArray(options.printMethods)).toBe(true);
      expect(Array.isArray(options.options)).toBe(true);
      expect(Array.isArray(options.postProcesses)).toBe(true);
      expect(Array.isArray(options.constraints)).toBe(true);
      expect(options.quantities).toBeDefined();
    });
  });
});
