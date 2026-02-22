/**
 * Tests for catalog data parser.
 *
 * Validates parsing of WowPress catalog JSON files
 * including index, categories, and product data.
 */
import { describe, it, expect } from "vitest";
import * as path from "node:path";
import {
  parseCatalogIndex,
  parseCategoryFile,
  parseProductFile,
  parseAllProducts,
} from "../catalog-parser.js";
import type {
  ParsedCatalogIndex,
  ParsedCategory,
  ParsedProduct,
} from "../catalog-parser.js";

// Vitest runs from the project root (widget.creator/)
const CATALOG_DIR = path.resolve(process.cwd(), "ref/wowpress/catalog");
const INDEX_PATH = path.join(CATALOG_DIR, "index.json");
const PRODUCT_40007_PATH = path.join(CATALOG_DIR, "products/40007.json");

describe("Catalog Parser", () => {
  // ==============================================================
  // parseCatalogIndex
  // ==============================================================
  describe("parseCatalogIndex", () => {
    it("should parse catalog index and return categories", async () => {
      const result = await parseCatalogIndex(INDEX_PATH);

      expect(result).toBeDefined();
      expect(result.generatedAt).toBeDefined();
      expect(result.productCount).toBe(326);
      expect(result.categoryCount).toBe(47);
      expect(result.categories).toBeInstanceOf(Array);
      expect(result.categories.length).toBe(47);
    });

    it("should extract category metadata from index", async () => {
      const result = await parseCatalogIndex(INDEX_PATH);
      const firstCat = result.categories[0];

      expect(firstCat.id).toBeDefined();
      expect(firstCat.slug).toBeDefined();
      expect(firstCat.path).toBeInstanceOf(Array);
      expect(firstCat.displayName).toBeDefined();
      expect(firstCat.productCount).toBeGreaterThanOrEqual(0);
      expect(firstCat.keywords).toBeInstanceOf(Array);
      expect(firstCat.file).toBeDefined();
    });

    it("should throw on non-existent file", async () => {
      await expect(
        parseCatalogIndex("/nonexistent/index.json"),
      ).rejects.toThrow();
    });
  });

  // ==============================================================
  // parseCategoryFile
  // ==============================================================
  describe("parseCategoryFile", () => {
    it("should parse a category file and return category info with products", async () => {
      // Get first category file path from index
      const index = await parseCatalogIndex(INDEX_PATH);
      const firstCatFile = path.join(CATALOG_DIR, index.categories[0].file);

      const result = await parseCategoryFile(firstCatFile);

      expect(result).toBeDefined();
      expect(result.category).toBeDefined();
      expect(result.category.id).toBeDefined();
      expect(result.category.displayName).toBeDefined();
      expect(result.products).toBeInstanceOf(Array);
      expect(result.products.length).toBeGreaterThan(0);
    });

    it("should extract product summaries from category", async () => {
      const index = await parseCatalogIndex(INDEX_PATH);
      const firstCatFile = path.join(CATALOG_DIR, index.categories[0].file);

      const result = await parseCategoryFile(firstCatFile);
      const firstProduct = result.products[0];

      expect(firstProduct.productId).toBeDefined();
      expect(typeof firstProduct.productId).toBe("number");
      expect(firstProduct.name).toBeDefined();
      expect(firstProduct.slug).toBeDefined();
    });

    it("should throw on non-existent file", async () => {
      await expect(
        parseCategoryFile("/nonexistent/category.json"),
      ).rejects.toThrow();
    });
  });

  // ==============================================================
  // parseProductFile
  // ==============================================================
  describe("parseProductFile", () => {
    it("should parse product 40007 and return structured data", async () => {
      const result = await parseProductFile(PRODUCT_40007_PATH);

      expect(result).toBeDefined();
      expect(result.externalId).toBe(40007);
      expect(result.name).toBe("가성비스티커(사각)");
      expect(result.selType).toBe("M");
      expect(result.pjoin).toBe(0);
      expect(result.unit).toBe("매");
    });

    it("should parse fileTypes from comma-separated string", async () => {
      const result = await parseProductFile(PRODUCT_40007_PATH);

      expect(result.fileTypes).toBeInstanceOf(Array);
      expect(result.fileTypes).toContain("AI");
      expect(result.fileTypes).toContain("PDF");
      expect(result.fileTypes.length).toBe(10);
    });

    it("should parse coverInfo from raw data", async () => {
      const result = await parseProductFile(PRODUCT_40007_PATH);

      expect(result.coverInfo).toBeDefined();
      expect(result.coverInfo).toBeInstanceOf(Array);
    });

    it("should parse delivery info", async () => {
      const result = await parseProductFile(PRODUCT_40007_PATH);

      expect(result.deliveryGroupNo).toBe(1);
      expect(result.deliveryGroupName).toBe("명함,스티커 묶음");
      expect(result.deliveryPrepay).toBe(true);
      expect(result.cutoffTime).toBeNull();
    });

    it("should parse sizes with constraints", async () => {
      const result = await parseProductFile(PRODUCT_40007_PATH);

      expect(result.sizes).toBeInstanceOf(Array);
      expect(result.sizes.length).toBeGreaterThan(0);

      const firstSize = result.sizes[0];
      expect(firstSize.externalSizeNo).toBeDefined();
      expect(firstSize.coverCd).toBeDefined();
      expect(firstSize.sizeName).toBeDefined();
      expect(firstSize.width).toBeDefined();
      expect(firstSize.height).toBeDefined();
      expect(firstSize.cutSize).toBeDefined();
      expect(typeof firstSize.isNonStandard).toBe("boolean");
    });

    it("should parse non-standard size with req_width and req_height", async () => {
      const result = await parseProductFile(PRODUCT_40007_PATH);

      // 40007 has a non-standard size entry
      const nonStdSize = result.sizes.find((s) => s.isNonStandard);
      expect(nonStdSize).toBeDefined();
      expect(nonStdSize!.reqWidth).toBeDefined();
      expect(nonStdSize!.reqWidth!.type).toBe("input");
      expect(nonStdSize!.reqWidth!.min).toBe(30);
      expect(nonStdSize!.reqWidth!.max).toBe(510);
      expect(nonStdSize!.reqHeight).toBeDefined();
      expect(nonStdSize!.reqHeight!.type).toBe("input");
      expect(nonStdSize!.reqHeight!.min).toBe(30);
      expect(nonStdSize!.reqHeight!.max).toBe(760);
    });

    it("should parse papers with constraints", async () => {
      const result = await parseProductFile(PRODUCT_40007_PATH);

      expect(result.papers).toBeInstanceOf(Array);
      expect(result.papers.length).toBeGreaterThan(0);

      const firstPaper = result.papers[0];
      expect(firstPaper.externalPaperNo).toBeDefined();
      expect(firstPaper.coverCd).toBeDefined();
      expect(firstPaper.paperName).toBeDefined();
      expect(firstPaper.paperGroup).toBeDefined();
    });

    it("should parse papers with rst_prsjob constraints", async () => {
      const result = await parseProductFile(PRODUCT_40007_PATH);

      // 40007 papers have rst_prsjob constraints
      const paperWithRst = result.papers.find(
        (p) => p.rstPrsjob !== null && p.rstPrsjob!.length > 0,
      );
      expect(paperWithRst).toBeDefined();
      expect(paperWithRst!.rstPrsjob![0].jobno).toBeDefined();
      expect(paperWithRst!.rstPrsjob![0].jobname).toBeDefined();
    });

    it("should parse colors with req_prsjob constraints", async () => {
      const result = await parseProductFile(PRODUCT_40007_PATH);

      expect(result.colors).toBeInstanceOf(Array);
      expect(result.colors.length).toBeGreaterThan(0);

      const firstColor = result.colors[0];
      expect(firstColor.externalColorNo).toBeDefined();
      expect(firstColor.coverCd).toBeDefined();
      expect(firstColor.pageCd).toBeDefined();
      expect(firstColor.colorName).toBeDefined();
      expect(firstColor.pdfPage).toBeDefined();

      // 40007 has colors with req_prsjob
      expect(firstColor.reqPrsjob).toBeDefined();
      expect(firstColor.reqPrsjob).toBeInstanceOf(Array);
    });

    it("should parse print methods", async () => {
      const result = await parseProductFile(PRODUCT_40007_PATH);

      expect(result.printMethods).toBeInstanceOf(Array);
      expect(result.printMethods.length).toBeGreaterThan(0);

      const firstMethod = result.printMethods[0];
      expect(firstMethod.externalJobPresetNo).toBeDefined();
      expect(firstMethod.jobPreset).toBeDefined();
      expect(firstMethod.prsjobList).toBeInstanceOf(Array);
    });

    it("should parse post-processes", async () => {
      const result = await parseProductFile(PRODUCT_40007_PATH);

      expect(result.postProcesses).toBeInstanceOf(Array);
      expect(result.postProcesses.length).toBeGreaterThan(0);

      const firstPP = result.postProcesses[0];
      expect(firstPP.coverCd).toBeDefined();
      expect(firstPP.inputType).toBeDefined();
      expect(firstPP.jobGroupList).toBeInstanceOf(Array);
    });

    it("should parse order quantities", async () => {
      const result = await parseProductFile(PRODUCT_40007_PATH);

      expect(result.orderQtys).toBeInstanceOf(Array);
      expect(result.orderQtys.length).toBeGreaterThan(0);

      const firstQty = result.orderQtys[0];
      expect(firstQty.displayType).toBeDefined();
      expect(firstQty.minQty).toBeDefined();
      expect(firstQty.maxQty).toBeDefined();
    });

    it("should parse delivery info structure", async () => {
      const result = await parseProductFile(PRODUCT_40007_PATH);

      expect(result.deliveryInfo).toBeDefined();
      expect(result.deliveryInfo!.freeShipping).toBeDefined();
      expect(result.deliveryInfo!.methods).toBeDefined();
    });

    it("should store the full raw data", async () => {
      const result = await parseProductFile(PRODUCT_40007_PATH);

      expect(result.rawData).toBeDefined();
      expect((result.rawData as Record<string, unknown>).prodno).toBe(40007);
    });

    it("should preserve categoryPath from product file", async () => {
      const result = await parseProductFile(PRODUCT_40007_PATH);

      expect(result.categoryPath).toEqual(["스티커", "사각스티커"]);
    });

    it("should throw on non-existent product file", async () => {
      await expect(
        parseProductFile("/nonexistent/product.json"),
      ).rejects.toThrow();
    });

    it("should throw on malformed JSON file", async () => {
      // This will be tested with a temp file in practice,
      // but the parser should handle malformed JSON gracefully
      await expect(
        parseProductFile("/dev/null"),
      ).rejects.toThrow();
    });
  });

  // ==============================================================
  // parseAllProducts
  // ==============================================================
  describe("parseAllProducts", () => {
    it("should parse all product files from catalog directory", async () => {
      const results = await parseAllProducts(CATALOG_DIR);

      expect(results).toBeInstanceOf(Array);
      // 326 total files, 3 have error responses (no prod_info data)
      expect(results.length).toBe(323);
    });

    it("should have valid externalId for each product", async () => {
      const results = await parseAllProducts(CATALOG_DIR);

      for (const product of results) {
        expect(product.externalId).toBeDefined();
        expect(typeof product.externalId).toBe("number");
      }
    });

    it("should include product 40007 in results", async () => {
      const results = await parseAllProducts(CATALOG_DIR);

      const p40007 = results.find((p) => p.externalId === 40007);
      expect(p40007).toBeDefined();
      expect(p40007!.name).toBe("가성비스티커(사각)");
    });
  });
});
