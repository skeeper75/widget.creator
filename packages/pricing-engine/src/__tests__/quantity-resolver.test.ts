/**
 * Tests for the quantity resolver.
 *
 * Validates quantity resolution for common-type (all nulls)
 * and combination-type (specific field matches) configurations.
 */
import { describe, it, expect } from "vitest";
import { QuantityResolver } from "../quantity-resolver.js";
import type { ProductOrderQty, OptionSelection } from "@widget-creator/shared";

// Helper: create common-type quantity config (all null fields)
function createCommonQty(overrides?: Partial<ProductOrderQty>): ProductOrderQty {
  return {
    id: "qty-001",
    productId: "prod-001",
    displayType: "list",
    jobPresetNo: null,
    sizeNo: null,
    paperNo: null,
    optNo: null,
    colorNo: null,
    colorNoAdd: null,
    minQty: 100,
    maxQty: 10000,
    interval: null,
    qtyList: [100, 200, 300, 500, 1000, 2000, 5000, 10000],
    ...overrides,
  };
}

// Helper: create a selection
function createSelection(overrides?: Partial<OptionSelection>): OptionSelection {
  return {
    productId: "prod-001",
    coverCd: 0,
    ...overrides,
  };
}

describe("QuantityResolver", () => {
  describe("getQuantityType", () => {
    it("should identify common-type when all config fields are null", () => {
      const resolver = new QuantityResolver([createCommonQty()]);
      expect(resolver.getQuantityType()).toBe("common");
    });

    it("should identify combination-type when any config field is set", () => {
      const resolver = new QuantityResolver([
        createCommonQty({ sizeNo: 5001 }),
        createCommonQty({ sizeNo: 5002 }),
      ]);
      expect(resolver.getQuantityType()).toBe("combination");
    });

    it("should identify common-type with empty array", () => {
      const resolver = new QuantityResolver([]);
      expect(resolver.getQuantityType()).toBe("common");
    });
  });

  describe("resolve - common type", () => {
    it("should return the common quantity config regardless of selection", () => {
      const resolver = new QuantityResolver([createCommonQty()]);
      const selection = createSelection({ sizeNo: 5001, paperNo: 2001 });

      const result = resolver.resolve(selection);

      expect(result.displayType).toBe("list");
      expect(result.minQty).toBe(100);
      expect(result.maxQty).toBe(10000);
      expect(result.qtyList).toEqual([100, 200, 300, 500, 1000, 2000, 5000, 10000]);
    });

    it("should return the common config even with no selection fields", () => {
      const resolver = new QuantityResolver([createCommonQty()]);
      const selection = createSelection();

      const result = resolver.resolve(selection);

      expect(result.minQty).toBe(100);
      expect(result.maxQty).toBe(10000);
    });
  });

  describe("resolve - combination type", () => {
    it("should match by sizeNo", () => {
      const resolver = new QuantityResolver([
        createCommonQty({
          id: "qty-a",
          sizeNo: 5010,
          minQty: 100,
          maxQty: 5000,
          qtyList: [100, 200, 500, 1000, 2000, 5000],
        }),
        createCommonQty({
          id: "qty-b",
          sizeNo: 5011,
          minQty: 500,
          maxQty: 50000,
          qtyList: [500, 1000, 2000, 5000, 10000, 50000],
        }),
      ]);

      const result = resolver.resolve(createSelection({ sizeNo: 5011 }));

      expect(result.minQty).toBe(500);
      expect(result.maxQty).toBe(50000);
    });

    it("should match by multiple fields (sizeNo + paperNo)", () => {
      const resolver = new QuantityResolver([
        createCommonQty({
          id: "qty-a",
          sizeNo: 5010,
          paperNo: 2001,
          minQty: 100,
          maxQty: 1000,
        }),
        createCommonQty({
          id: "qty-b",
          sizeNo: 5010,
          paperNo: 2002,
          minQty: 200,
          maxQty: 5000,
        }),
      ]);

      const result = resolver.resolve(createSelection({ sizeNo: 5010, paperNo: 2002 }));

      expect(result.minQty).toBe(200);
      expect(result.maxQty).toBe(5000);
    });

    it("should treat null config fields as wildcards", () => {
      const resolver = new QuantityResolver([
        createCommonQty({
          id: "qty-a",
          sizeNo: 5010,
          paperNo: null, // wildcard: matches any paper
          minQty: 100,
          maxQty: 5000,
        }),
      ]);

      const result = resolver.resolve(createSelection({ sizeNo: 5010, paperNo: 2999 }));

      expect(result.minQty).toBe(100);
      expect(result.maxQty).toBe(5000);
    });

    it("should return default quantity when no match found", () => {
      const resolver = new QuantityResolver([
        createCommonQty({
          id: "qty-a",
          sizeNo: 5010,
          minQty: 100,
          maxQty: 5000,
        }),
      ]);

      // No sizeNo selected, no match
      const result = resolver.resolve(createSelection());

      expect(result.minQty).toBe(0);
      expect(result.maxQty).toBe(0);
      expect(result.qtyList).toBeNull();
    });

    it("should handle input displayType with interval", () => {
      const resolver = new QuantityResolver([
        createCommonQty({
          id: "qty-a",
          sizeNo: 5493,
          displayType: "input",
          minQty: 100,
          maxQty: 10000,
          interval: 100,
          qtyList: null,
        }),
      ]);

      const result = resolver.resolve(createSelection({ sizeNo: 5493 }));

      expect(result.displayType).toBe("input");
      expect(result.interval).toBe(100);
      expect(result.qtyList).toBeNull();
    });

    it("should match with jobPresetNo", () => {
      const resolver = new QuantityResolver([
        createCommonQty({
          id: "qty-a",
          jobPresetNo: 3110,
          minQty: 100,
          maxQty: 5000,
        }),
        createCommonQty({
          id: "qty-b",
          jobPresetNo: 3200,
          minQty: 50,
          maxQty: 1000,
        }),
      ]);

      const result = resolver.resolve(createSelection({ jobPresetNo: 3200 }));

      expect(result.minQty).toBe(50);
      expect(result.maxQty).toBe(1000);
    });
  });

  describe("resolve - edge cases", () => {
    it("should return default for empty config list", () => {
      const resolver = new QuantityResolver([]);
      const result = resolver.resolve(createSelection());

      expect(result.minQty).toBe(0);
      expect(result.maxQty).toBe(0);
    });

    it("should prefer more specific match over wildcard", () => {
      const resolver = new QuantityResolver([
        createCommonQty({
          id: "qty-wildcard",
          sizeNo: 5010,
          paperNo: null,
          minQty: 100,
          maxQty: 5000,
        }),
        createCommonQty({
          id: "qty-specific",
          sizeNo: 5010,
          paperNo: 2001,
          minQty: 200,
          maxQty: 3000,
        }),
      ]);

      const result = resolver.resolve(createSelection({ sizeNo: 5010, paperNo: 2001 }));

      expect(result.minQty).toBe(200);
      expect(result.maxQty).toBe(3000);
    });
  });
});
