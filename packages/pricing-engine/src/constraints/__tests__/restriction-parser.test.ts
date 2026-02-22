/**
 * Tests for restriction constraint parser.
 *
 * Validates parsing and evaluation of rst_* constraints
 * from WowPress product data.
 */
import { describe, it, expect } from "vitest";
import {
  parseRestriction,
  evaluateRestriction,
} from "../restriction-parser.js";

describe("Restriction Parser", () => {
  describe("parseRestriction", () => {
    it("should parse rst_paper restriction (list of restricted paper numbers)", () => {
      const raw = [
        { paperno: 20001, papername: "Paper A" },
        { paperno: 20002, papername: "Paper B" },
      ];

      const result = parseRestriction("rst_paper", raw, {
        entity: "prsjob",
        id: 3110,
      });

      expect(result).not.toBeNull();
      expect(result!.type).toBe("restricted");
      expect(result!.constraintKey).toBe("rst_paper");
      expect((result!.data as { items: unknown[] }).items).toHaveLength(2);
      expect(((result!.data as { items: unknown[] }).items[0])).toBe(20001);
      expect(((result!.data as { items: unknown[] }).items[1])).toBe(20002);
    });

    it("should parse rst_awkjob restriction", () => {
      const raw = [
        { jobno: 30001, jobname: "Post A" },
        { jobno: 30002, jobname: "Post B" },
      ];

      const result = parseRestriction("rst_awkjob", raw, {
        entity: "paper",
        id: 22927,
      });

      expect(result).not.toBeNull();
      expect(result!.constraintKey).toBe("rst_awkjob");
      expect(result!.data.items).toEqual([30001, 30002]);
    });

    it("should parse rst_prsjob restriction", () => {
      const raw = [
        { jobno: 3230, jobname: "UV Print" },
      ];

      const result = parseRestriction("rst_prsjob", raw, {
        entity: "paper",
        id: 22927,
      });

      expect(result).not.toBeNull();
      expect(result!.constraintKey).toBe("rst_prsjob");
      expect(result!.data.items).toEqual([3230]);
    });

    it("should parse rst_color restriction", () => {
      const raw = [
        { colorno: 301, colorname: "B&W" },
        { colorno: 302, colorname: "Color" },
      ];

      const result = parseRestriction("rst_color", raw, {
        entity: "awkjob",
        id: 36510,
      });

      expect(result).not.toBeNull();
      expect(result!.constraintKey).toBe("rst_color");
      expect(result!.data.items).toEqual([301, 302]);
    });

    it("should parse rst_size restriction", () => {
      const raw = [
        { sizeno: 5498, sizename: "90x100" },
      ];

      const result = parseRestriction("rst_size", raw, {
        entity: "awkjob",
        id: 36510,
      });

      expect(result).not.toBeNull();
      expect(result!.constraintKey).toBe("rst_size");
      expect(result!.data.items).toEqual([5498]);
    });

    it("should parse rst_ordqty restriction", () => {
      const raw = { ordqtymin: 100, ordqtymax: 5000 };

      const result = parseRestriction("rst_ordqty", raw, {
        entity: "size",
        id: 5498,
      });

      expect(result).not.toBeNull();
      expect(result!.constraintKey).toBe("rst_ordqty");
      expect(result!.data.min).toBe(100);
      expect(result!.data.max).toBe(5000);
    });

    it("should parse rst_ordqty with alternate format", () => {
      const raw = { unit: "ea", min: 0.1, max: 100 };

      const result = parseRestriction("rst_ordqty", raw, {
        entity: "size",
        id: 5498,
      });

      expect(result).not.toBeNull();
      expect(result!.data.min).toBe(0.1);
      expect(result!.data.max).toBe(100);
    });

    it("should parse rst_jobqty restriction", () => {
      const raw = { unit: "ea", min: 100, max: 8000 };

      const result = parseRestriction("rst_jobqty", raw, {
        entity: "awkjob",
        id: 36510,
      });

      expect(result).not.toBeNull();
      expect(result!.constraintKey).toBe("rst_jobqty");
      expect(result!.data.min).toBe(100);
      expect(result!.data.max).toBe(8000);
    });

    it("should parse rst_cutcnt restriction", () => {
      const raw = { min: 1, max: 10 };

      const result = parseRestriction("rst_cutcnt", raw, {
        entity: "awkjob",
        id: 36510,
      });

      expect(result).not.toBeNull();
      expect(result!.constraintKey).toBe("rst_cutcnt");
      expect(result!.data.min).toBe(1);
      expect(result!.data.max).toBe(10);
    });

    it("should return null for null input", () => {
      const result = parseRestriction("rst_paper", null, {
        entity: "prsjob",
        id: 3110,
      });
      expect(result).toBeNull();
    });

    it("should return null for undefined input", () => {
      const result = parseRestriction("rst_paper", undefined, {
        entity: "prsjob",
        id: 3110,
      });
      expect(result).toBeNull();
    });

    it("should return null for empty array", () => {
      const result = parseRestriction("rst_paper", [], {
        entity: "prsjob",
        id: 3110,
      });
      expect(result).toBeNull();
    });
  });

  describe("evaluateRestriction", () => {
    it("should filter out restricted items from candidates", () => {
      const rst = parseRestriction("rst_paper", [
        { paperno: 20001, papername: "Paper A" },
        { paperno: 20005, papername: "Paper E" },
      ], { entity: "prsjob", id: 3110 });

      const candidates = [20001, 20002, 20003, 20005, 20010];
      const filtered = evaluateRestriction(rst!, candidates);

      expect(filtered).toEqual([20002, 20003, 20010]);
    });

    it("should return all candidates when no matches found", () => {
      const rst = parseRestriction("rst_paper", [
        { paperno: 99999, papername: "Non-existent" },
      ], { entity: "prsjob", id: 3110 });

      const candidates = [20001, 20002];
      const filtered = evaluateRestriction(rst!, candidates);

      expect(filtered).toEqual([20001, 20002]);
    });

    it("should return empty when all candidates restricted", () => {
      const rst = parseRestriction("rst_paper", [
        { paperno: 20001, papername: "Paper A" },
        { paperno: 20002, papername: "Paper B" },
      ], { entity: "prsjob", id: 3110 });

      const candidates = [20001, 20002];
      const filtered = evaluateRestriction(rst!, candidates);

      expect(filtered).toEqual([]);
    });

    it("should evaluate rst_ordqty as range restriction", () => {
      const rst = parseRestriction("rst_ordqty", {
        ordqtymin: 100,
        ordqtymax: 5000,
      }, { entity: "size", id: 5498 });

      // For range restrictions, candidates are quantity values
      const candidates = [50, 100, 500, 1000, 5000, 10000];
      const filtered = evaluateRestriction(rst!, candidates);

      // Only values within [100, 5000] should pass
      expect(filtered).toEqual([100, 500, 1000, 5000]);
    });
  });
});
