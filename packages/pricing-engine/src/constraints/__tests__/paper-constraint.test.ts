/**
 * Tests for the paper constraint evaluator.
 *
 * Validates filtering of papers based on selection state
 * and evaluation of paper-specific constraints.
 */
import { describe, it, expect } from "vitest";
import {
  filterPapersBySelection,
  evaluatePaperConstraints,
} from "../paper-constraint.js";
import type { ProductPaper, OptionSelection } from "@widget-creator/shared";

function createPaper(overrides?: Partial<ProductPaper>): ProductPaper {
  return {
    id: "paper-001",
    productId: "prod-001",
    externalPaperNo: 2001,
    coverCd: 0,
    paperName: "Art Paper 250g",
    paperGroup: "Art Paper",
    pGram: 250,
    reqWidth: null,
    reqHeight: null,
    reqAwkjob: null,
    rstOrdqty: null,
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

describe("Paper Constraint Evaluator", () => {
  describe("filterPapersBySelection", () => {
    it("should return all papers when no restrictions apply", () => {
      const papers = [
        createPaper({ externalPaperNo: 2001 }),
        createPaper({ externalPaperNo: 2002 }),
      ];

      const result = filterPapersBySelection(papers, createSelection(), []);

      expect(result).toHaveLength(2);
    });

    it("should filter out papers in the restricted list", () => {
      const papers = [
        createPaper({ externalPaperNo: 2001 }),
        createPaper({ externalPaperNo: 2002 }),
        createPaper({ externalPaperNo: 2003 }),
      ];

      const result = filterPapersBySelection(
        papers,
        createSelection(),
        [2002],
      );

      expect(result).toHaveLength(2);
      expect(result.map((p) => p.externalPaperNo)).toEqual([2001, 2003]);
    });

    it("should filter papers by rstAwkjob when awkjob is selected", () => {
      const papers = [
        createPaper({
          externalPaperNo: 2001,
          rstAwkjob: [{ jobno: 30020, jobname: "UV Spot Coating" }],
        }),
        createPaper({ externalPaperNo: 2002 }),
      ];

      const result = filterPapersBySelection(
        papers,
        createSelection({
          awkjobSelections: [{ jobgroupno: 10000, jobno: 30020 }],
        }),
        [],
      );

      expect(result).toHaveLength(1);
      expect(result[0].externalPaperNo).toBe(2002);
    });

    it("should filter papers by rstPrsjob when print method is selected", () => {
      const papers = [
        createPaper({
          externalPaperNo: 2011,
          rstPrsjob: [{ jobno: 3200, jobname: "Digital Print" }],
        }),
        createPaper({ externalPaperNo: 2012 }),
      ];

      const result = filterPapersBySelection(
        papers,
        createSelection({ jobPresetNo: 3200 }),
        [],
      );

      expect(result).toHaveLength(1);
      expect(result[0].externalPaperNo).toBe(2012);
    });

    it("should not filter by rstPrsjob when print method does not match", () => {
      const papers = [
        createPaper({
          externalPaperNo: 2011,
          rstPrsjob: [{ jobno: 3200, jobname: "Digital Print" }],
        }),
        createPaper({ externalPaperNo: 2012 }),
      ];

      const result = filterPapersBySelection(
        papers,
        createSelection({ jobPresetNo: 3110 }),
        [],
      );

      expect(result).toHaveLength(2);
    });

    it("should handle empty papers array", () => {
      const result = filterPapersBySelection([], createSelection(), []);
      expect(result).toHaveLength(0);
    });
  });

  describe("evaluatePaperConstraints", () => {
    it("should return no violations for unconstrained paper", () => {
      const paper = createPaper();
      const violations = evaluatePaperConstraints(paper, createSelection());
      expect(violations).toHaveLength(0);
    });

    it("should return violation for rstOrdqty when quantity out of range", () => {
      const paper = createPaper({
        rstOrdqty: { ordqtymin: 500, ordqtymax: 10000 },
      });

      const violations = evaluatePaperConstraints(
        paper,
        createSelection({ quantity: 100 }),
      );

      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].type).toBe("restricted");
    });

    it("should return no violation when quantity is within rstOrdqty range", () => {
      const paper = createPaper({
        rstOrdqty: { ordqtymin: 500, ordqtymax: 10000 },
      });

      const violations = evaluatePaperConstraints(
        paper,
        createSelection({ quantity: 1000 }),
      );

      expect(violations).toHaveLength(0);
    });

    it("should return violation when reqAwkjob is not satisfied", () => {
      const paper = createPaper({
        reqAwkjob: [{ jobno: 30010, jobname: "Lamination" }],
      });

      const violations = evaluatePaperConstraints(
        paper,
        createSelection({ awkjobSelections: [] }),
      );

      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].type).toBe("required");
    });

    it("should return no violation when reqAwkjob is satisfied", () => {
      const paper = createPaper({
        reqAwkjob: [{ jobno: 30010, jobname: "Lamination" }],
      });

      const violations = evaluatePaperConstraints(
        paper,
        createSelection({
          awkjobSelections: [{ jobgroupno: 10000, jobno: 30010 }],
        }),
      );

      expect(violations).toHaveLength(0);
    });
  });
});
