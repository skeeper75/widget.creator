/**
 * Tests for the color constraint evaluator.
 *
 * Validates filtering of colors based on selection state
 * and evaluation of color-specific constraints.
 */
import { describe, it, expect } from "vitest";
import {
  filterColorsBySelection,
  evaluateColorConstraints,
} from "../color-constraint.js";
import type { ProductColor, OptionSelection } from "@widget-creator/shared";

function createColor(overrides?: Partial<ProductColor>): ProductColor {
  return {
    id: "color-001",
    productId: "prod-001",
    externalColorNo: 301,
    coverCd: 0,
    pageCd: 0,
    colorName: "4/0 (Full Color Front)",
    pdfPage: 1,
    isAdditional: false,
    reqPrsjob: null,
    reqAwkjob: null,
    rstPrsjob: null,
    rstAwkjob: null,
    ...overrides,
  };
}

function createSelection(overrides?: Partial<OptionSelection>): OptionSelection {
  return {
    productId: "prod-001",
    coverCd: 0,
    ...overrides,
  };
}

describe("Color Constraint Evaluator", () => {
  describe("filterColorsBySelection", () => {
    it("should return all colors when no restrictions apply", () => {
      const colors = [
        createColor({ externalColorNo: 301 }),
        createColor({ externalColorNo: 302 }),
      ];

      const result = filterColorsBySelection(colors, createSelection(), []);

      expect(result).toHaveLength(2);
    });

    it("should filter out colors in the restricted list", () => {
      const colors = [
        createColor({ externalColorNo: 301 }),
        createColor({ externalColorNo: 302 }),
        createColor({ externalColorNo: 303 }),
      ];

      const result = filterColorsBySelection(
        colors,
        createSelection(),
        [302],
      );

      expect(result).toHaveLength(2);
      expect(result.map((c) => c.externalColorNo)).toEqual([301, 303]);
    });

    it("should filter colors by rstPrsjob when print method is selected", () => {
      const colors = [
        createColor({
          externalColorNo: 301,
          rstPrsjob: [{ jobno: 3200, jobname: "Digital Print" }],
        }),
        createColor({ externalColorNo: 302 }),
      ];

      const result = filterColorsBySelection(
        colors,
        createSelection({ jobPresetNo: 3200 }),
        [],
      );

      expect(result).toHaveLength(1);
      expect(result[0].externalColorNo).toBe(302);
    });

    it("should filter colors by rstAwkjob when post-process is selected", () => {
      const colors = [
        createColor({
          externalColorNo: 301,
          rstAwkjob: [{ jobno: 30010, jobname: "Lamination" }],
        }),
        createColor({ externalColorNo: 302 }),
      ];

      const result = filterColorsBySelection(
        colors,
        createSelection({
          awkjobSelections: [{ jobgroupno: 10000, jobno: 30010 }],
        }),
        [],
      );

      expect(result).toHaveLength(1);
      expect(result[0].externalColorNo).toBe(302);
    });

    it("should handle empty colors array", () => {
      const result = filterColorsBySelection([], createSelection(), []);
      expect(result).toHaveLength(0);
    });
  });

  describe("evaluateColorConstraints", () => {
    it("should return no violations for unconstrained color", () => {
      const color = createColor();
      const violations = evaluateColorConstraints(color, createSelection());
      expect(violations).toHaveLength(0);
    });

    it("should return violation when reqPrsjob print method not selected", () => {
      const color = createColor({
        reqPrsjob: [{ jobpresetno: 3110, jobno: 3110, jobname: "Offset Print" }],
      });

      const violations = evaluateColorConstraints(
        color,
        createSelection({ jobPresetNo: 3200 }),
      );

      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].type).toBe("required");
    });

    it("should return no violation when reqPrsjob print method is selected", () => {
      const color = createColor({
        reqPrsjob: [{ jobpresetno: 3110, jobno: 3110, jobname: "Offset Print" }],
      });

      const violations = evaluateColorConstraints(
        color,
        createSelection({ jobPresetNo: 3110 }),
      );

      expect(violations).toHaveLength(0);
    });

    it("should not evaluate reqPrsjob when no print method selected yet", () => {
      const color = createColor({
        reqPrsjob: [{ jobpresetno: 3110, jobno: 3110, jobname: "Offset Print" }],
      });

      const violations = evaluateColorConstraints(
        color,
        createSelection(),
      );

      // No violation because print method not selected yet
      expect(violations).toHaveLength(0);
    });

    it("should return violation when reqAwkjob is not satisfied", () => {
      const color = createColor({
        reqAwkjob: [{ jobno: 30010, jobname: "Lamination" }],
      });

      const violations = evaluateColorConstraints(
        color,
        createSelection({ awkjobSelections: [] }),
      );

      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].type).toBe("required");
    });
  });
});
