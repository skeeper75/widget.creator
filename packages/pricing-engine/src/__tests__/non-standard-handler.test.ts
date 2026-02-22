/**
 * Tests for the non-standard size handler.
 *
 * Validates width/height input against min/max ranges
 * and interval constraints for non-standard sizes.
 */
import { describe, it, expect } from "vitest";
import {
  validateNonStandardSize,
  type NonStandardSizeInput,
} from "../non-standard-handler.js";
import type { ProductSize } from "@widget-creator/shared";

// Helper to create a non-standard size fixture
function createNonStandardSize(overrides?: Partial<ProductSize>): ProductSize {
  return {
    id: "size-ns-001",
    productId: "prod-001",
    externalSizeNo: 5493,
    coverCd: 0,
    sizeName: "Non-standard",
    width: 0,
    height: 0,
    cutSize: 3,
    isNonStandard: true,
    reqWidth: { type: "input", unit: "mm", min: 50, max: 900, interval: 1 },
    reqHeight: { type: "input", unit: "mm", min: 50, max: 640, interval: 1 },
    reqAwkjob: null,
    rstOrdqty: null,
    rstAwkjob: null,
    ...overrides,
  };
}

describe("Non-Standard Size Handler", () => {
  describe("validateNonStandardSize", () => {
    it("should return valid for input within range", () => {
      const size = createNonStandardSize();
      const input: NonStandardSizeInput = { width: 100, height: 200 };

      const result = validateNonStandardSize(size, input);

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("should return valid for input at minimum boundary", () => {
      const size = createNonStandardSize();
      const input: NonStandardSizeInput = { width: 50, height: 50 };

      const result = validateNonStandardSize(size, input);

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("should return valid for input at maximum boundary", () => {
      const size = createNonStandardSize();
      const input: NonStandardSizeInput = { width: 900, height: 640 };

      const result = validateNonStandardSize(size, input);

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("should return violation when width is below minimum", () => {
      const size = createNonStandardSize();
      const input: NonStandardSizeInput = { width: 30, height: 200 };

      const result = validateNonStandardSize(size, input);

      expect(result.valid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations.some((v) => v.target === "width")).toBe(true);
    });

    it("should return violation when width is above maximum", () => {
      const size = createNonStandardSize();
      const input: NonStandardSizeInput = { width: 1000, height: 200 };

      const result = validateNonStandardSize(size, input);

      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.target === "width")).toBe(true);
    });

    it("should return violation when height is below minimum", () => {
      const size = createNonStandardSize();
      const input: NonStandardSizeInput = { width: 100, height: 10 };

      const result = validateNonStandardSize(size, input);

      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.target === "height")).toBe(true);
    });

    it("should return violation when height is above maximum", () => {
      const size = createNonStandardSize();
      const input: NonStandardSizeInput = { width: 100, height: 700 };

      const result = validateNonStandardSize(size, input);

      expect(result.valid).toBe(false);
      expect(result.violations.some((v) => v.target === "height")).toBe(true);
    });

    it("should return violations for both width and height when both out of range", () => {
      const size = createNonStandardSize();
      const input: NonStandardSizeInput = { width: 10, height: 700 };

      const result = validateNonStandardSize(size, input);

      expect(result.valid).toBe(false);
      expect(result.violations.length).toBe(2);
      expect(result.violations.some((v) => v.target === "width")).toBe(true);
      expect(result.violations.some((v) => v.target === "height")).toBe(true);
    });

    it("should return violation when size has no reqWidth defined", () => {
      const size = createNonStandardSize({ reqWidth: null });
      const input: NonStandardSizeInput = { width: 100, height: 200 };

      const result = validateNonStandardSize(size, input);

      expect(result.valid).toBe(false);
      expect(
        result.violations.some((v) => v.message.includes("width")),
      ).toBe(true);
    });

    it("should return violation when size has no reqHeight defined", () => {
      const size = createNonStandardSize({ reqHeight: null });
      const input: NonStandardSizeInput = { width: 100, height: 200 };

      const result = validateNonStandardSize(size, input);

      expect(result.valid).toBe(false);
      expect(
        result.violations.some((v) => v.message.includes("height")),
      ).toBe(true);
    });

    it("should handle custom interval ranges", () => {
      const size = createNonStandardSize({
        reqWidth: { type: "input", unit: "mm", min: 100, max: 500, interval: 10 },
        reqHeight: { type: "input", unit: "mm", min: 100, max: 300, interval: 5 },
      });
      const input: NonStandardSizeInput = { width: 150, height: 250 };

      const result = validateNonStandardSize(size, input);

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("should include constraint type in violation", () => {
      const size = createNonStandardSize();
      const input: NonStandardSizeInput = { width: 10, height: 200 };

      const result = validateNonStandardSize(size, input);

      expect(result.violations[0].type).toBe("required");
    });

    it("should include source in violation", () => {
      const size = createNonStandardSize();
      const input: NonStandardSizeInput = { width: 10, height: 200 };

      const result = validateNonStandardSize(size, input);

      expect(result.violations[0].source).toContain("size");
    });
  });
});
