/**
 * Tests for the post-process constraint evaluator.
 *
 * This is the most complex constraint system, handling:
 * - 4 requirement types: req_joboption, req_jobsize, req_jobqty, req_awkjob
 * - 6 restriction types: rst_jobqty, rst_cutcnt, rst_size, rst_paper, rst_color, rst_awkjob
 */
import { describe, it, expect } from "vitest";
import {
  PostProcessEvaluator,
  type AwkjobData,
} from "../post-process-constraint.js";
import type {
  OptionSelection,
  AwkjobSelection,
  ProductPostProcess,
} from "@widget-creator/shared";

// Helper to create a basic awkjob data item
function createAwkjob(overrides?: Partial<AwkjobData>): AwkjobData {
  return {
    awkjobno: 30010,
    awkjobname: "Lamination",
    inputtype: "checkbox",
    req_joboption: null,
    req_jobsize: null,
    req_jobqty: null,
    req_awkjob: null,
    rst_jobqty: null,
    rst_cutcnt: null,
    rst_size: null,
    rst_paper: null,
    rst_color: null,
    rst_awkjob: null,
    ...overrides,
  };
}

// Helper to create post-process product data
function createPostProcessData(
  awkjoblist: AwkjobData[],
  overrides?: Partial<{
    jobgroupno: number;
    jobgroup: string;
    type: string;
    displayloc: string;
    coverCd: number;
  }>,
): ProductPostProcess[] {
  return [
    {
      id: "pp-001",
      productId: "prod-001",
      coverCd: overrides?.coverCd ?? 0,
      inputType: overrides?.type ?? "checkbox",
      jobGroupList: [
        {
          jobgroupno: overrides?.jobgroupno ?? 10000,
          jobgroup: overrides?.jobgroup ?? "Coating",
          type: overrides?.type ?? "checkbox",
          displayloc: overrides?.displayloc ?? "bottom",
          awkjoblist: awkjoblist as unknown[],
        },
      ],
    },
  ];
}

function createSelection(overrides?: Partial<OptionSelection>): OptionSelection {
  return {
    productId: "prod-001",
    coverCd: 0,
    ...overrides,
  };
}

describe("PostProcessEvaluator", () => {
  describe("getAvailablePostProcesses", () => {
    it("should return all post-process groups for a simple case", () => {
      const data = createPostProcessData([
        createAwkjob({ awkjobno: 30010, awkjobname: "Lamination" }),
        createAwkjob({ awkjobno: 30020, awkjobname: "UV Spot Coating" }),
      ]);
      const evaluator = new PostProcessEvaluator(data);

      const groups = evaluator.getAvailablePostProcesses(createSelection());

      expect(groups).toHaveLength(1);
      expect(groups[0].awkjoblist).toHaveLength(2);
    });

    it("should filter out awkjobs restricted by selected size (rst_size)", () => {
      const data = createPostProcessData([
        createAwkjob({
          awkjobno: 40010,
          awkjobname: "Gold Foil",
          rst_size: [{ sizeno: 5021, sizename: "B5" }],
        }),
        createAwkjob({ awkjobno: 30010, awkjobname: "Lamination" }),
      ]);
      const evaluator = new PostProcessEvaluator(data);

      const groups = evaluator.getAvailablePostProcesses(
        createSelection({ sizeNo: 5021 }),
      );

      expect(groups[0].awkjoblist).toHaveLength(1);
      expect(groups[0].awkjoblist[0].jobno).toBe(30010);
    });

    it("should filter out awkjobs restricted by selected paper (rst_paper)", () => {
      const data = createPostProcessData([
        createAwkjob({
          awkjobno: 30010,
          awkjobname: "Lamination",
          rst_paper: [{ paperno: 2021, papername: "Leatherette" }],
        }),
        createAwkjob({ awkjobno: 30020, awkjobname: "UV Spot Coating" }),
      ]);
      const evaluator = new PostProcessEvaluator(data);

      const groups = evaluator.getAvailablePostProcesses(
        createSelection({ paperNo: 2021 }),
      );

      expect(groups[0].awkjoblist).toHaveLength(1);
      expect(groups[0].awkjoblist[0].jobno).toBe(30020);
    });

    it("should filter out awkjobs restricted by selected color (rst_color)", () => {
      const data = createPostProcessData([
        createAwkjob({
          awkjobno: 30010,
          awkjobname: "Lamination",
          rst_color: [{ colorno: 303, colorname: "1/0 Mono" }],
        }),
        createAwkjob({ awkjobno: 30020, awkjobname: "UV" }),
      ]);
      const evaluator = new PostProcessEvaluator(data);

      const groups = evaluator.getAvailablePostProcesses(
        createSelection({ colorNo: 303 }),
      );

      expect(groups[0].awkjoblist).toHaveLength(1);
      expect(groups[0].awkjoblist[0].jobno).toBe(30020);
    });

    it("should not filter when selection does not match restriction", () => {
      const data = createPostProcessData([
        createAwkjob({
          awkjobno: 30010,
          awkjobname: "Lamination",
          rst_size: [{ sizeno: 5021, sizename: "B5" }],
        }),
        createAwkjob({ awkjobno: 30020, awkjobname: "UV" }),
      ]);
      const evaluator = new PostProcessEvaluator(data);

      const groups = evaluator.getAvailablePostProcesses(
        createSelection({ sizeNo: 5020 }),
      );

      expect(groups[0].awkjoblist).toHaveLength(2);
    });

    it("should handle empty post-process data", () => {
      const evaluator = new PostProcessEvaluator([]);
      const groups = evaluator.getAvailablePostProcesses(createSelection());
      expect(groups).toHaveLength(0);
    });

    it("should exclude empty groups after filtering", () => {
      const data = createPostProcessData([
        createAwkjob({
          awkjobno: 30010,
          rst_size: [{ sizeno: 5021, sizename: "B5" }],
        }),
      ]);
      const evaluator = new PostProcessEvaluator(data);

      const groups = evaluator.getAvailablePostProcesses(
        createSelection({ sizeNo: 5021 }),
      );

      // The only awkjob is filtered out, so group is empty
      expect(groups).toHaveLength(0);
    });
  });

  describe("evaluatePostProcess", () => {
    it("should return no violations for unconstrained post-process", () => {
      const data = createPostProcessData([
        createAwkjob({ awkjobno: 30010 }),
      ]);
      const evaluator = new PostProcessEvaluator(data);

      const result = evaluator.evaluatePostProcess(
        { jobgroupno: 10000, jobno: 30010 },
        createSelection(),
      );

      expect(result.violations).toHaveLength(0);
    });

    it("should return violation when req_jobsize is not provided", () => {
      const data = createPostProcessData([
        createAwkjob({
          awkjobno: 40010,
          awkjobname: "Gold Foil",
          req_jobsize: {
            type: "input",
            unit: "mm",
            min: 10,
            max: 200,
            interval: 1,
          },
        }),
      ]);
      const evaluator = new PostProcessEvaluator(data);

      const result = evaluator.evaluatePostProcess(
        { jobgroupno: 10000, jobno: 40010 },
        createSelection(),
      );

      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].type).toBe("required");
    });

    it("should return required info for req_joboption", () => {
      const data = createPostProcessData([
        createAwkjob({
          awkjobno: 30010,
          req_joboption: [
            { optno: 100, optname: "Matte Lamination" },
            { optno: 101, optname: "Glossy Lamination" },
          ],
        }),
      ]);
      const evaluator = new PostProcessEvaluator(data);

      const result = evaluator.evaluatePostProcess(
        { jobgroupno: 10000, jobno: 30010 },
        createSelection(),
      );

      expect(result.required.length).toBeGreaterThan(0);
      expect(result.required[0].constraintType).toBe("req_joboption");
    });

    it("should return required info for req_jobqty", () => {
      const data = createPostProcessData([
        createAwkjob({
          awkjobno: 30010,
          req_jobqty: {
            type: "input",
            unit: "ea",
            min: 1,
            max: 100,
            interval: 1,
          },
        }),
      ]);
      const evaluator = new PostProcessEvaluator(data);

      const result = evaluator.evaluatePostProcess(
        { jobgroupno: 10000, jobno: 30010 },
        createSelection(),
      );

      expect(result.required.length).toBeGreaterThan(0);
      expect(result.required[0].constraintType).toBe("req_jobqty");
    });

    it("should return required info for req_awkjob", () => {
      const data = createPostProcessData([
        createAwkjob({
          awkjobno: 30010,
          req_awkjob: [{ jobno: 30020, jobname: "UV Coating" }],
        }),
      ]);
      const evaluator = new PostProcessEvaluator(data);

      const result = evaluator.evaluatePostProcess(
        { jobgroupno: 10000, jobno: 30010 },
        createSelection({ awkjobSelections: [] }),
      );

      expect(result.required.length).toBeGreaterThan(0);
      expect(result.required[0].constraintType).toBe("req_awkjob");
    });

    it("should not report req_awkjob when the required awkjob is selected", () => {
      const data = createPostProcessData([
        createAwkjob({
          awkjobno: 30010,
          req_awkjob: [{ jobno: 30020, jobname: "UV Coating" }],
        }),
      ]);
      const evaluator = new PostProcessEvaluator(data);

      const result = evaluator.evaluatePostProcess(
        { jobgroupno: 10000, jobno: 30010 },
        createSelection({
          awkjobSelections: [{ jobgroupno: 10000, jobno: 30020 }],
        }),
      );

      expect(result.required).toHaveLength(0);
    });

    it("should return restricted info for rst_jobqty", () => {
      const data = createPostProcessData([
        createAwkjob({
          awkjobno: 30010,
          rst_jobqty: { type: "input", min: 1, max: 50 },
        }),
      ]);
      const evaluator = new PostProcessEvaluator(data);

      const result = evaluator.evaluatePostProcess(
        { jobgroupno: 10000, jobno: 30010 },
        createSelection(),
      );

      expect(result.restricted.length).toBeGreaterThan(0);
      expect(result.restricted[0].constraintType).toBe("rst_jobqty");
    });

    it("should return restricted info for rst_cutcnt", () => {
      const data = createPostProcessData([
        createAwkjob({
          awkjobno: 30010,
          rst_cutcnt: { min: 1, max: 10 },
        }),
      ]);
      const evaluator = new PostProcessEvaluator(data);

      const result = evaluator.evaluatePostProcess(
        { jobgroupno: 10000, jobno: 30010 },
        createSelection(),
      );

      expect(result.restricted.length).toBeGreaterThan(0);
      expect(result.restricted[0].constraintType).toBe("rst_cutcnt");
    });

    it("should handle non-existent awkjob gracefully", () => {
      const data = createPostProcessData([
        createAwkjob({ awkjobno: 30010 }),
      ]);
      const evaluator = new PostProcessEvaluator(data);

      const result = evaluator.evaluatePostProcess(
        { jobgroupno: 10000, jobno: 99999 },
        createSelection(),
      );

      expect(result.violations).toHaveLength(0);
      expect(result.required).toHaveLength(0);
      expect(result.restricted).toHaveLength(0);
    });
  });

  describe("checkMutualConstraints (rst_awkjob)", () => {
    it("should detect mutual exclusion between post-processes", () => {
      const data = createPostProcessData([
        createAwkjob({
          awkjobno: 30010,
          awkjobname: "Lamination",
          rst_awkjob: [{ jobno: 30020, jobname: "UV Spot Coating" }],
        }),
        createAwkjob({
          awkjobno: 30020,
          awkjobname: "UV Spot Coating",
          rst_awkjob: [{ jobno: 30010, jobname: "Lamination" }],
        }),
      ]);
      const evaluator = new PostProcessEvaluator(data);

      const violations = evaluator.checkMutualConstraints(
        [
          { jobgroupno: 10000, jobno: 30010 },
          { jobgroupno: 10000, jobno: 30020 },
        ],
        createSelection(),
      );

      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].type).toBe("restricted");
    });

    it("should return no violations when no mutual exclusions exist", () => {
      const data = createPostProcessData([
        createAwkjob({ awkjobno: 30010, awkjobname: "Lamination" }),
        createAwkjob({ awkjobno: 30030, awkjobname: "Embossing" }),
      ]);
      const evaluator = new PostProcessEvaluator(data);

      const violations = evaluator.checkMutualConstraints(
        [
          { jobgroupno: 10000, jobno: 30010 },
          { jobgroupno: 10000, jobno: 30030 },
        ],
        createSelection(),
      );

      expect(violations).toHaveLength(0);
    });

    it("should return no violations for single selection", () => {
      const data = createPostProcessData([
        createAwkjob({
          awkjobno: 30010,
          rst_awkjob: [{ jobno: 30020, jobname: "UV" }],
        }),
      ]);
      const evaluator = new PostProcessEvaluator(data);

      const violations = evaluator.checkMutualConstraints(
        [{ jobgroupno: 10000, jobno: 30010 }],
        createSelection(),
      );

      expect(violations).toHaveLength(0);
    });

    it("should return no violations for empty selection", () => {
      const data = createPostProcessData([
        createAwkjob({ awkjobno: 30010 }),
      ]);
      const evaluator = new PostProcessEvaluator(data);

      const violations = evaluator.checkMutualConstraints(
        [],
        createSelection(),
      );

      expect(violations).toHaveLength(0);
    });
  });

  describe("bookbinding special rule (jobgroupno=25000)", () => {
    it("should identify bookbinding groups correctly", () => {
      const data: ProductPostProcess[] = [
        {
          id: "pp-001",
          productId: "prod-001",
          coverCd: 1,
          inputType: "radio",
          jobGroupList: [
            {
              jobgroupno: 25000,
              jobgroup: "Bookbinding",
              type: "radio",
              displayloc: "top",
              awkjoblist: [
                createAwkjob({
                  awkjobno: 50010,
                  awkjobname: "Perfect Binding",
                  inputtype: "radio",
                }),
              ] as unknown[],
            },
          ],
        },
      ];
      const evaluator = new PostProcessEvaluator(data);

      const groups = evaluator.getAvailablePostProcesses(
        createSelection({ coverCd: 1 }),
      );

      expect(groups).toHaveLength(1);
      expect(groups[0].jobgroupno).toBe(25000);
    });
  });

  describe("multiple post-process groups", () => {
    it("should handle multiple job groups in a single post-process record", () => {
      const data: ProductPostProcess[] = [
        {
          id: "pp-001",
          productId: "prod-001",
          coverCd: 0,
          inputType: "checkbox",
          jobGroupList: [
            {
              jobgroupno: 10000,
              jobgroup: "Coating",
              type: "checkbox",
              displayloc: "bottom",
              awkjoblist: [
                createAwkjob({ awkjobno: 30010, awkjobname: "Lamination" }),
              ] as unknown[],
            },
            {
              jobgroupno: 20000,
              jobgroup: "Foil Stamping",
              type: "checkbox",
              displayloc: "bottom",
              awkjoblist: [
                createAwkjob({ awkjobno: 40010, awkjobname: "Gold Foil" }),
              ] as unknown[],
            },
          ],
        },
      ];
      const evaluator = new PostProcessEvaluator(data);

      const groups = evaluator.getAvailablePostProcesses(createSelection());

      expect(groups).toHaveLength(2);
      expect(groups[0].jobgroupno).toBe(10000);
      expect(groups[1].jobgroupno).toBe(20000);
    });
  });
});
