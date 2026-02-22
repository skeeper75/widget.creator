/**
 * Tests for the cover handler.
 *
 * Validates cover type management for pjoin=0 (unified)
 * and pjoin=1 (separated) products.
 */
import { describe, it, expect } from "vitest";
import { CoverHandler, type CoverType, type CoverOptions } from "../cover-handler.js";
import { createSimpleProduct, createComplexProduct } from "./fixtures.js";

describe("CoverHandler", () => {
  describe("getCoverTypes - unified product (pjoin=0)", () => {
    it("should return a single cover type with coverCd=0", () => {
      const data = createSimpleProduct();
      const handler = new CoverHandler(data);

      const coverTypes = handler.getCoverTypes();

      expect(coverTypes).toHaveLength(1);
      expect(coverTypes[0].coverCd).toBe(0);
    });

    it("should label unified cover as 'Unified'", () => {
      const data = createSimpleProduct();
      const handler = new CoverHandler(data);

      const coverTypes = handler.getCoverTypes();

      expect(coverTypes[0].name).toBe("Unified");
    });
  });

  describe("getCoverTypes - separated product (pjoin=1)", () => {
    it("should return cover types based on product coverInfo", () => {
      const data = createComplexProduct();
      const handler = new CoverHandler(data);

      const coverTypes = handler.getCoverTypes();

      expect(coverTypes.length).toBeGreaterThanOrEqual(2);
    });

    it("should include Cover (coverCd=1) and Inner Pages (coverCd=2)", () => {
      const data = createComplexProduct();
      const handler = new CoverHandler(data);

      const coverTypes = handler.getCoverTypes();
      const coverCds = coverTypes.map((ct) => ct.coverCd);

      expect(coverCds).toContain(1);
      expect(coverCds).toContain(2);
    });
  });

  describe("getOptionsForCover - unified product", () => {
    it("should return all papers for coverCd=0", () => {
      const data = createSimpleProduct();
      const handler = new CoverHandler(data);

      const options = handler.getOptionsForCover(0);

      expect(options.papers).toHaveLength(2);
    });

    it("should return all colors for coverCd=0", () => {
      const data = createSimpleProduct();
      const handler = new CoverHandler(data);

      const options = handler.getOptionsForCover(0);

      expect(options.colors).toHaveLength(2);
    });

    it("should return all sizes (sizes are global)", () => {
      const data = createSimpleProduct();
      const handler = new CoverHandler(data);

      const options = handler.getOptionsForCover(0);

      expect(options.sizes).toHaveLength(2);
    });
  });

  describe("getOptionsForCover - separated product", () => {
    it("should return only cover papers for coverCd=1", () => {
      const data = createComplexProduct();
      const handler = new CoverHandler(data);

      const options = handler.getOptionsForCover(1);

      // Complex product has 2 cover papers (coverCd=1)
      expect(options.papers).toHaveLength(2);
      expect(options.papers.every((p) => p.coverCd === 1)).toBe(true);
    });

    it("should return only inner page papers for coverCd=2", () => {
      const data = createComplexProduct();
      const handler = new CoverHandler(data);

      const options = handler.getOptionsForCover(2);

      // Complex product has 2 inner page papers (coverCd=2)
      expect(options.papers).toHaveLength(2);
      expect(options.papers.every((p) => p.coverCd === 2)).toBe(true);
    });

    it("should return only cover colors for coverCd=1", () => {
      const data = createComplexProduct();
      const handler = new CoverHandler(data);

      const options = handler.getOptionsForCover(1);

      expect(options.colors).toHaveLength(2);
      expect(options.colors.every((c) => c.coverCd === 1)).toBe(true);
    });

    it("should return only inner page colors for coverCd=2", () => {
      const data = createComplexProduct();
      const handler = new CoverHandler(data);

      const options = handler.getOptionsForCover(2);

      expect(options.colors).toHaveLength(2);
      expect(options.colors.every((c) => c.coverCd === 2)).toBe(true);
    });

    it("should return ALL sizes regardless of cover type (sizes are shared)", () => {
      const data = createComplexProduct();
      const handler = new CoverHandler(data);

      const coverOptions = handler.getOptionsForCover(1);
      const innerOptions = handler.getOptionsForCover(2);

      // Sizes are shared across all covers
      expect(coverOptions.sizes).toHaveLength(2);
      expect(innerOptions.sizes).toHaveLength(2);
      expect(coverOptions.sizes).toEqual(innerOptions.sizes);
    });

    it("should return cover-specific post-processes", () => {
      const data = createComplexProduct();
      const handler = new CoverHandler(data);

      const coverOptions = handler.getOptionsForCover(1);

      // Complex product has post-processes only for coverCd=1
      expect(coverOptions.postProcesses.length).toBeGreaterThan(0);
    });

    it("should return empty post-processes for cover without them", () => {
      const data = createComplexProduct();
      const handler = new CoverHandler(data);

      const innerOptions = handler.getOptionsForCover(2);

      // No post-processes defined for inner pages
      expect(innerOptions.postProcesses).toHaveLength(0);
    });
  });

  describe("isSizeShared", () => {
    it("should always return true", () => {
      const simpleHandler = new CoverHandler(createSimpleProduct());
      const complexHandler = new CoverHandler(createComplexProduct());

      expect(simpleHandler.isSizeShared()).toBe(true);
      expect(complexHandler.isSizeShared()).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should return empty options for non-existent coverCd", () => {
      const data = createSimpleProduct();
      const handler = new CoverHandler(data);

      const options = handler.getOptionsForCover(99);

      expect(options.papers).toHaveLength(0);
      expect(options.colors).toHaveLength(0);
      expect(options.postProcesses).toHaveLength(0);
      // Sizes are still global
      expect(options.sizes).toHaveLength(2);
    });
  });
});
