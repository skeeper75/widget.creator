/**
 * Tests for the size constraint evaluator.
 *
 * Validates filtering of sizes based on current selection
 * and evaluation of size-specific constraints.
 */
import { describe, it, expect } from "vitest";
import {
  filterSizesBySelection,
  evaluateSizeConstraints,
} from "../size-constraint.js";
import type { ProductSize, OptionSelection } from "@widget-creator/shared";

function createSize(overrides?: Partial<ProductSize>): ProductSize {
  return {
    id: "size-001",
    productId: "prod-001",
    externalSizeNo: 5001,
    coverCd: 0,
    sizeName: "A4",
    width: 210,
    height: 297,
    cutSize: 3,
    isNonStandard: false,
    reqWidth: null,
    reqHeight: null,
    reqAwkjob: null,
    rstOrdqty: null,
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

describe("Size Constraint Evaluator", () => {
  describe("filterSizesBySelection", () => {
    it("should return all sizes when no selection constrains them", () => {
      const sizes = [
        createSize({ externalSizeNo: 5001 }),
        createSize({ externalSizeNo: 5002 }),
      ];

      const result = filterSizesBySelection(sizes, createSelection());

      expect(result).toHaveLength(2);
    });

    it("should filter sizes by coverCd for the selection", () => {
      const sizes = [
        createSize({ externalSizeNo: 5001, coverCd: 0 }),
        createSize({ externalSizeNo: 5002, coverCd: 1 }),
      ];

      const result = filterSizesBySelection(
        sizes,
        createSelection({ coverCd: 0 }),
      );

      // coverCd=0 means unified, so both coverCd=0 sizes show
      expect(result).toHaveLength(1);
      expect(result[0].externalSizeNo).toBe(5001);
    });

    it("should include sizes with coverCd=0 for any coverCd selection (global sizes)", () => {
      const sizes = [
        createSize({ externalSizeNo: 5001, coverCd: 0 }),
        createSize({ externalSizeNo: 5002, coverCd: 1 }),
      ];

      // For coverCd=1 selection, include coverCd=0 (global) sizes too
      const result = filterSizesBySelection(
        sizes,
        createSelection({ coverCd: 1 }),
      );

      expect(result).toHaveLength(2);
    });

    it("should handle empty sizes array", () => {
      const result = filterSizesBySelection([], createSelection());
      expect(result).toHaveLength(0);
    });

    it("should filter out sizes restricted by rstAwkjob when awkjob is selected", () => {
      const sizes = [
        createSize({
          externalSizeNo: 5001,
          rstAwkjob: [{ jobno: 30010, jobname: "Lamination" }],
        }),
        createSize({ externalSizeNo: 5002 }),
      ];

      const result = filterSizesBySelection(
        sizes,
        createSelection({
          awkjobSelections: [{ jobgroupno: 10000, jobno: 30010 }],
        }),
      );

      expect(result).toHaveLength(1);
      expect(result[0].externalSizeNo).toBe(5002);
    });

    it("should not filter sizes when rstAwkjob awkjob not selected", () => {
      const sizes = [
        createSize({
          externalSizeNo: 5001,
          rstAwkjob: [{ jobno: 30010, jobname: "Lamination" }],
        }),
        createSize({ externalSizeNo: 5002 }),
      ];

      const result = filterSizesBySelection(
        sizes,
        createSelection({ awkjobSelections: [] }),
      );

      expect(result).toHaveLength(2);
    });
  });

  describe("evaluateSizeConstraints", () => {
    it("should return no violations for a simple size", () => {
      const size = createSize();
      const selection = createSelection({ sizeNo: 5001 });

      const violations = evaluateSizeConstraints(size, selection);

      expect(violations).toHaveLength(0);
    });

    it("should return violation for rstOrdqty when quantity is out of range", () => {
      const size = createSize({
        rstOrdqty: { ordqtymin: 500, ordqtymax: 50000 },
      });
      const selection = createSelection({ sizeNo: 5001, quantity: 100 });

      const violations = evaluateSizeConstraints(size, selection);

      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].type).toBe("restricted");
    });

    it("should return no violation for rstOrdqty when quantity is in range", () => {
      const size = createSize({
        rstOrdqty: { ordqtymin: 500, ordqtymax: 50000 },
      });
      const selection = createSelection({ sizeNo: 5001, quantity: 1000 });

      const violations = evaluateSizeConstraints(size, selection);

      expect(violations).toHaveLength(0);
    });

    it("should return no violation when no quantity is selected yet", () => {
      const size = createSize({
        rstOrdqty: { ordqtymin: 500, ordqtymax: 50000 },
      });
      const selection = createSelection({ sizeNo: 5001 });

      const violations = evaluateSizeConstraints(size, selection);

      expect(violations).toHaveLength(0);
    });

    it("should return violation when reqAwkjob is specified but not selected", () => {
      const size = createSize({
        reqAwkjob: [{ jobno: 30010, jobname: "Lamination" }],
      });
      const selection = createSelection({
        sizeNo: 5001,
        awkjobSelections: [],
      });

      const violations = evaluateSizeConstraints(size, selection);

      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].type).toBe("required");
    });

    it("should return no violation when reqAwkjob is satisfied", () => {
      const size = createSize({
        reqAwkjob: [{ jobno: 30010, jobname: "Lamination" }],
      });
      const selection = createSelection({
        sizeNo: 5001,
        awkjobSelections: [{ jobgroupno: 10000, jobno: 30010 }],
      });

      const violations = evaluateSizeConstraints(size, selection);

      expect(violations).toHaveLength(0);
    });
  });
});
