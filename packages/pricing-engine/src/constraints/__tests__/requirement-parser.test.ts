/**
 * Tests for requirement constraint parser.
 *
 * Validates parsing and evaluation of req_* constraints
 * from WowPress product data.
 */
import { describe, it, expect } from "vitest";
import {
  parseRequirement,
  evaluateRequirement,
} from "../requirement-parser.js";
import type { RequirementConstraint, OptionSelection } from "@widget-creator/shared";

describe("Requirement Parser", () => {
  describe("parseRequirement", () => {
    it("should parse req_width range constraint", () => {
      const raw = {
        type: "input",
        unit: "mm",
        min: 50,
        max: 900,
        interval: 1,
      };

      const result = parseRequirement("req_width", raw, {
        entity: "size",
        id: 5493,
      });

      expect(result).not.toBeNull();
      expect(result!.type).toBe("required");
      expect(result!.constraintKey).toBe("req_width");
      expect(result!.source).toEqual({ entity: "size", id: 5493 });
      expect(result!.data.type).toBe("input");
      expect(result!.data.min).toBe(50);
      expect(result!.data.max).toBe(900);
      expect(result!.data.interval).toBe(1);
    });

    it("should parse req_height range constraint", () => {
      const raw = {
        type: "input",
        unit: "mm",
        min: 50,
        max: 640,
        interval: 1,
      };

      const result = parseRequirement("req_height", raw, {
        entity: "size",
        id: 5493,
      });

      expect(result).not.toBeNull();
      expect(result!.constraintKey).toBe("req_height");
      expect(result!.data.min).toBe(50);
      expect(result!.data.max).toBe(640);
    });

    it("should parse req_awkjob constraint (array of job refs)", () => {
      const raw = [
        { jobno: 30001, jobname: "Lamination" },
        { jobno: 30002, jobname: "UV Coating" },
      ];

      const result = parseRequirement("req_awkjob", raw, {
        entity: "paper",
        id: 20001,
      });

      expect(result).not.toBeNull();
      expect(result!.constraintKey).toBe("req_awkjob");
      expect((result!.data as { jobs: unknown[] }).jobs).toHaveLength(2);
      expect(((result!.data as { jobs: unknown[] }).jobs[0] as { jobno: number }).jobno).toBe(30001);
    });

    it("should parse req_prsjob constraint (array of prsjob refs)", () => {
      const raw = [
        { jobpresetno: 3110, jobno: 3110, jobname: "Offset Print" },
      ];

      const result = parseRequirement("req_prsjob", raw, {
        entity: "color",
        id: 302,
      });

      expect(result).not.toBeNull();
      expect(result!.constraintKey).toBe("req_prsjob");
      expect((result!.data as { jobs: unknown[] }).jobs).toHaveLength(1);
      expect(((result!.data as { jobs: unknown[] }).jobs[0] as { jobpresetno: number }).jobpresetno).toBe(3110);
    });

    it("should return null for null input", () => {
      const result = parseRequirement("req_width", null, {
        entity: "size",
        id: 5498,
      });
      expect(result).toBeNull();
    });

    it("should return null for undefined input", () => {
      const result = parseRequirement("req_width", undefined, {
        entity: "size",
        id: 5498,
      });
      expect(result).toBeNull();
    });

    it("should parse req_joboption constraint", () => {
      const raw = [
        { optno: 100, optname: "Option A" },
      ];

      const result = parseRequirement("req_joboption", raw, {
        entity: "awkjob",
        id: 36510,
      });

      expect(result).not.toBeNull();
      expect(result!.constraintKey).toBe("req_joboption");
      expect((result!.data as { options: unknown[] }).options).toHaveLength(1);
      expect(((result!.data as { options: unknown[] }).options[0] as { optno: number }).optno).toBe(100);
    });

    it("should parse req_jobsize constraint", () => {
      const raw = {
        type: "input",
        unit: "mm",
        min: 10,
        max: 500,
        interval: 1,
      };

      const result = parseRequirement("req_jobsize", raw, {
        entity: "awkjob",
        id: 36510,
      });

      expect(result).not.toBeNull();
      expect(result!.constraintKey).toBe("req_jobsize");
      expect(result!.data.min).toBe(10);
      expect(result!.data.max).toBe(500);
    });

    it("should parse req_jobqty constraint", () => {
      const raw = {
        type: "input",
        unit: "ea",
        min: 1,
        max: 100,
        interval: 1,
      };

      const result = parseRequirement("req_jobqty", raw, {
        entity: "awkjob",
        id: 36510,
      });

      expect(result).not.toBeNull();
      expect(result!.constraintKey).toBe("req_jobqty");
      expect(result!.data.min).toBe(1);
      expect(result!.data.max).toBe(100);
    });
  });

  describe("evaluateRequirement", () => {
    it("should evaluate req_width as satisfied when within range", () => {
      const req = parseRequirement("req_width", {
        type: "input",
        unit: "mm",
        min: 50,
        max: 900,
        interval: 1,
      }, { entity: "size", id: 5493 });

      const selection: OptionSelection = {
        productId: "test",
        coverCd: 0,
        sizeNo: 5493,
      };

      const result = evaluateRequirement(req!, selection, { width: 100 });
      expect(result.satisfied).toBe(true);
    });

    it("should evaluate req_width as not satisfied when out of range", () => {
      const req = parseRequirement("req_width", {
        type: "input",
        unit: "mm",
        min: 50,
        max: 900,
        interval: 1,
      }, { entity: "size", id: 5493 });

      const selection: OptionSelection = {
        productId: "test",
        coverCd: 0,
        sizeNo: 5493,
      };

      const result = evaluateRequirement(req!, selection, { width: 10 });
      expect(result.satisfied).toBe(false);
      expect(result.message).toBeDefined();
    });

    it("should evaluate req_awkjob as requiring post-process selection", () => {
      const req = parseRequirement("req_awkjob", [
        { jobno: 30001, jobname: "Lamination" },
      ], { entity: "paper", id: 20001 });

      const selection: OptionSelection = {
        productId: "test",
        coverCd: 0,
        awkjobSelections: [{ jobgroupno: 100, jobno: 30001 }],
      };

      const result = evaluateRequirement(req!, selection);
      expect(result.satisfied).toBe(true);
    });

    it("should evaluate req_awkjob as not satisfied when post-process missing", () => {
      const req = parseRequirement("req_awkjob", [
        { jobno: 30001, jobname: "Lamination" },
      ], { entity: "paper", id: 20001 });

      const selection: OptionSelection = {
        productId: "test",
        coverCd: 0,
        awkjobSelections: [],
      };

      const result = evaluateRequirement(req!, selection);
      expect(result.satisfied).toBe(false);
    });
  });
});
