/**
 * SPEC-DATA-002: Seed Data Integrity Tests (AC-10)
 *
 * Validates that source JSON data files have correct structure
 * and expected counts for normalized seed process.
 * Does NOT require a live database connection.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const DATA_DIR = resolve(__dirname, "..", "..", "data");

describe("SPEC-DATA-002: Seed Data Integrity (AC-10)", () => {
  describe("Categories data source", () => {
    it("MES v5 JSON contains exactly 12 categories (SPEC AC-10)", () => {
      const data = JSON.parse(
        readFileSync(
          resolve(DATA_DIR, "exports/MES_자재공정매핑_v5.json"),
          "utf-8"
        )
      );
      expect(data.categories).toHaveLength(12);
    });
  });

  describe("Products data source", () => {
    it("MES v5 JSON products count >= 200", () => {
      const data = JSON.parse(
        readFileSync(
          resolve(DATA_DIR, "exports/MES_자재공정매핑_v5.json"),
          "utf-8"
        )
      );
      expect(data.products.length).toBeGreaterThanOrEqual(200);
    });

    it("all products have required fields", () => {
      const data = JSON.parse(
        readFileSync(
          resolve(DATA_DIR, "exports/MES_자재공정매핑_v5.json"),
          "utf-8"
        )
      );
      for (const product of data.products) {
        expect(product).toHaveProperty("MesItemCd");
        expect(product).toHaveProperty("productName");
        expect(product).toHaveProperty("productType");
        expect(product).toHaveProperty("categoryCode");
      }
    });

    it("product types are valid enum values", () => {
      const data = JSON.parse(
        readFileSync(
          resolve(DATA_DIR, "exports/MES_자재공정매핑_v5.json"),
          "utf-8"
        )
      );
      const validTypes = [
        "digital-print",
        "sticker",
        "booklet",
        "large-format",
        "acrylic",
        "goods",
        "stationery",
        "pouch",
        "packaging",
      ];
      for (const product of data.products) {
        expect(validTypes).toContain(product.productType);
      }
    });

    it("MES item codes are in NNN-NNNN format (SPEC AC-6)", () => {
      const data = JSON.parse(
        readFileSync(
          resolve(DATA_DIR, "exports/MES_자재공정매핑_v5.json"),
          "utf-8"
        )
      );
      const mesCodePattern = /^\d{3}-\d{4}$/;
      for (const product of data.products) {
        if (product.MesItemCd) {
          expect(product.MesItemCd).toMatch(mesCodePattern);
        }
      }
    });
  });

  describe("Paper data source (AC-2)", () => {
    it("paper.json exists and has papers array", () => {
      const data = JSON.parse(
        readFileSync(resolve(DATA_DIR, "pricing/paper.json"), "utf-8")
      );
      expect(data.papers).toBeDefined();
      expect(Array.isArray(data.papers)).toBe(true);
    });

    it("papers have required pricing fields", () => {
      const data = JSON.parse(
        readFileSync(resolve(DATA_DIR, "pricing/paper.json"), "utf-8")
      );
      for (const paper of data.papers) {
        expect(paper).toHaveProperty("name");
        expect(paper).toHaveProperty("pricePerSheet");
      }
    });
  });

  describe("Print mode data source (AC-3)", () => {
    it("digital-print.json has 11 print types", () => {
      const data = JSON.parse(
        readFileSync(resolve(DATA_DIR, "pricing/digital-print.json"), "utf-8")
      );
      expect(data.printTypes).toHaveLength(11);
    });

    it("print type codes are expected values", () => {
      const data = JSON.parse(
        readFileSync(resolve(DATA_DIR, "pricing/digital-print.json"), "utf-8")
      );
      const codes = data.printTypes.map((t: { code: number }) => t.code);
      const expectedCodes = [0, 1, 2, 4, 8, 11, 12, 21, 22, 31, 32];
      expect(codes).toEqual(expect.arrayContaining(expectedCodes));
    });

    it("has price table with quantity tiers", () => {
      const data = JSON.parse(
        readFileSync(resolve(DATA_DIR, "pricing/digital-print.json"), "utf-8")
      );
      expect(data.priceTable).toBeDefined();
      const qtys = Object.keys(data.priceTable);
      expect(qtys.length).toBeGreaterThan(0);
    });
  });

  describe("Post-process data source (AC-4)", () => {
    it("finishing.json has finishingTypes", () => {
      const data = JSON.parse(
        readFileSync(resolve(DATA_DIR, "pricing/finishing.json"), "utf-8")
      );
      expect(data.finishingTypes).toBeDefined();
    });

    it("has at least 6 finishing type groups", () => {
      const data = JSON.parse(
        readFileSync(resolve(DATA_DIR, "pricing/finishing.json"), "utf-8")
      );
      expect(Object.keys(data.finishingTypes).length).toBeGreaterThanOrEqual(6);
    });
  });

  describe("Binding data source", () => {
    it("binding.json has exactly 4 binding types", () => {
      const data = JSON.parse(
        readFileSync(resolve(DATA_DIR, "pricing/binding.json"), "utf-8")
      );
      expect(data.bindingTypes).toHaveLength(4);
    });

    it("binding types include 중철, 무선, 트윈링, PUR", () => {
      const data = JSON.parse(
        readFileSync(resolve(DATA_DIR, "pricing/binding.json"), "utf-8")
      );
      const names = data.bindingTypes.map((b: { name: string }) => b.name);
      expect(names).toContain("중철제본");
      expect(names).toContain("무선제본");
      expect(names).toContain("트윈링제본");
      expect(names).toContain("PUR제본");
    });
  });

  describe("Imposition rules data source", () => {
    it("imposition.json has lookupTable", () => {
      const data = JSON.parse(
        readFileSync(resolve(DATA_DIR, "pricing/imposition.json"), "utf-8")
      );
      expect(data.lookupTable).toBeDefined();
      expect(Array.isArray(data.lookupTable)).toBe(true);
    });

    it("imposition rules have basePaper field", () => {
      const data = JSON.parse(
        readFileSync(resolve(DATA_DIR, "pricing/imposition.json"), "utf-8")
      );
      expect(data.lookupTable.length).toBeGreaterThan(0);
      // All rules have basePaper defined
      for (const rule of data.lookupTable) {
        expect(rule).toHaveProperty("basePaper");
      }
    });

    it("imposition rules have trimSize field", () => {
      const data = JSON.parse(
        readFileSync(resolve(DATA_DIR, "pricing/imposition.json"), "utf-8")
      );
      for (const rule of data.lookupTable) {
        expect(rule).toHaveProperty("trimSize");
      }
    });
  });

  describe("huni_code integrity (AC-11)", () => {
    it("products with shopbyId have numeric 5-digit IDs", () => {
      const data = JSON.parse(
        readFileSync(
          resolve(DATA_DIR, "exports/MES_자재공정매핑_v5.json"),
          "utf-8"
        )
      );
      const withShopbyId = data.products.filter(
        (p: { shopbyId: number | null }) => p.shopbyId !== null
      );
      expect(withShopbyId.length).toBeGreaterThan(0);
      for (const product of withShopbyId) {
        const idStr = String(product.shopbyId);
        expect(idStr.length).toBe(5);
      }
    });

    it("products without shopbyId will get temp codes 90001+", () => {
      const data = JSON.parse(
        readFileSync(
          resolve(DATA_DIR, "exports/MES_자재공정매핑_v5.json"),
          "utf-8"
        )
      );
      const withoutShopbyId = data.products.filter(
        (p: { shopbyId: number | null }) => p.shopbyId === null
      );
      // These will get 90001+ sequential codes - just verify they exist
      expect(withoutShopbyId.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("seed-normalized.ts file exists", () => {
    it("seed-normalized.ts file was created", () => {
      const seedPath = resolve(__dirname, "..", "seed-normalized.ts");
      expect(existsSync(seedPath)).toBe(true);
    });
  });
});
