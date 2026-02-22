/**
 * Tests for the print method constraint evaluator.
 *
 * Validates filtering of print methods based on selection state
 * and evaluation of print method-specific constraints.
 */
import { describe, it, expect } from "vitest";
import {
  filterPrintMethodsBySelection,
  evaluatePrintMethodConstraints,
} from "../print-method-constraint.js";
import type { ProductPrintMethod, OptionSelection } from "@widget-creator/shared";

function createPrintMethod(
  overrides?: Partial<ProductPrintMethod>,
): ProductPrintMethod {
  return {
    id: "pm-001",
    productId: "prod-001",
    externalJobPresetNo: 3110,
    jobPreset: "Offset Print",
    prsjobList: [
      {
        covercd: 0,
        jobno: 3110,
        jobname: "Offset Print",
        unit: "ea",
        reqColor: null,
        rstPaper: null,
        rstAwkjob: null,
      },
    ],
    reqColor: null,
    rstPaper: null,
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

describe("Print Method Constraint Evaluator", () => {
  describe("filterPrintMethodsBySelection", () => {
    it("should return all print methods when no restrictions apply", () => {
      const methods = [
        createPrintMethod({ externalJobPresetNo: 3110 }),
        createPrintMethod({ externalJobPresetNo: 3200, jobPreset: "Digital Print" }),
      ];

      const result = filterPrintMethodsBySelection(methods, createSelection());

      expect(result).toHaveLength(2);
    });

    it("should filter print methods by rstPaper when paper is selected", () => {
      const methods = [
        createPrintMethod({
          externalJobPresetNo: 3200,
          jobPreset: "Digital Print",
          rstPaper: [{ paperno: 2011, papername: "Snow White" }],
        }),
        createPrintMethod({ externalJobPresetNo: 3110 }),
      ];

      const result = filterPrintMethodsBySelection(
        methods,
        createSelection({ paperNo: 2011 }),
      );

      expect(result).toHaveLength(1);
      expect(result[0].externalJobPresetNo).toBe(3110);
    });

    it("should not filter when selected paper is not in rstPaper", () => {
      const methods = [
        createPrintMethod({
          externalJobPresetNo: 3200,
          rstPaper: [{ paperno: 2011, papername: "Snow White" }],
        }),
        createPrintMethod({ externalJobPresetNo: 3110 }),
      ];

      const result = filterPrintMethodsBySelection(
        methods,
        createSelection({ paperNo: 2099 }),
      );

      expect(result).toHaveLength(2);
    });

    it("should filter by rstAwkjob when post-process is selected", () => {
      const methods = [
        createPrintMethod({
          externalJobPresetNo: 3110,
          rstAwkjob: [{ jobno: 30020, jobname: "UV Spot Coating" }],
        }),
        createPrintMethod({ externalJobPresetNo: 3200 }),
      ];

      const result = filterPrintMethodsBySelection(
        methods,
        createSelection({
          awkjobSelections: [{ jobgroupno: 10000, jobno: 30020 }],
        }),
      );

      expect(result).toHaveLength(1);
      expect(result[0].externalJobPresetNo).toBe(3200);
    });

    it("should handle empty methods array", () => {
      const result = filterPrintMethodsBySelection([], createSelection());
      expect(result).toHaveLength(0);
    });
  });

  describe("evaluatePrintMethodConstraints", () => {
    it("should return no violations for unconstrained method", () => {
      const method = createPrintMethod();
      const violations = evaluatePrintMethodConstraints(
        method,
        createSelection(),
      );
      expect(violations).toHaveLength(0);
    });

    it("should return violation when reqColor is not satisfied", () => {
      const method = createPrintMethod({
        reqColor: [{ colorno: 302, colorname: "4/4" }],
      });

      const violations = evaluatePrintMethodConstraints(
        method,
        createSelection({ colorNo: 301 }),
      );

      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].type).toBe("required");
    });

    it("should return no violation when reqColor is satisfied", () => {
      const method = createPrintMethod({
        reqColor: [{ colorno: 302, colorname: "4/4" }],
      });

      const violations = evaluatePrintMethodConstraints(
        method,
        createSelection({ colorNo: 302 }),
      );

      expect(violations).toHaveLength(0);
    });

    it("should not evaluate reqColor when no color is selected yet", () => {
      const method = createPrintMethod({
        reqColor: [{ colorno: 302, colorname: "4/4" }],
      });

      const violations = evaluatePrintMethodConstraints(
        method,
        createSelection(),
      );

      expect(violations).toHaveLength(0);
    });
  });
});
