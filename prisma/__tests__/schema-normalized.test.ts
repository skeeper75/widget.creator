/**
 * SPEC-DATA-002: Normalized Schema Validation Tests
 *
 * Validates that schema.prisma contains all 26 new Huni* models
 * with correct table mappings and critical fields.
 * Does NOT require a live database connection.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

const SCHEMA_PATH = resolve(__dirname, "..", "schema.prisma");
const schema = existsSync(SCHEMA_PATH) ? readFileSync(SCHEMA_PATH, "utf-8") : "";

describe("SPEC-DATA-002: Normalized Schema", () => {
  describe("Schema file exists and is valid", () => {
    it("schema.prisma exists", () => {
      expect(existsSync(SCHEMA_PATH)).toBe(true);
    });

    it("contains 26 new Huni models", () => {
      const huniModels = schema.match(/^model Huni\w+/gm) ?? [];
      expect(huniModels).toHaveLength(26);
    });
  });

  describe("Domain 1: Product Catalog models", () => {
    it("contains HuniCategory model", () => {
      expect(schema).toContain("model HuniCategory {");
    });

    it("contains HuniProduct model", () => {
      expect(schema).toContain("model HuniProduct {");
    });

    it("contains HuniProductSize model", () => {
      expect(schema).toContain("model HuniProductSize {");
    });

    it("HuniCategory has self-reference for hierarchy", () => {
      // Parent relation referencing itself
      expect(schema).toContain("HuniCategoryHierarchy");
    });

    it("HuniProduct has huniCode unique field", () => {
      expect(schema).toContain("huniCode");
      // Verify unique constraint on huniCode
      expect(schema).toMatch(/huniCode\s+String\s+@unique/);
    });

    it("HuniProductSize maps to product_sizes table", () => {
      expect(schema).toContain('@@map("product_sizes")');
    });
  });

  describe("Domain 2: Materials models", () => {
    it("contains HuniPaper model", () => {
      expect(schema).toContain("model HuniPaper {");
    });

    it("contains HuniMaterial model", () => {
      expect(schema).toContain("model HuniMaterial {");
    });

    it("contains HuniPaperProductMapping model", () => {
      expect(schema).toContain("model HuniPaperProductMapping {");
    });
  });

  describe("Domain 3: Processes models", () => {
    it("contains HuniPrintMode model", () => {
      expect(schema).toContain("model HuniPrintMode {");
    });

    it("contains HuniPostProcess model", () => {
      expect(schema).toContain("model HuniPostProcess {");
    });

    it("contains HuniBinding model", () => {
      expect(schema).toContain("model HuniBinding {");
    });
  });

  describe("Domain 4: Pricing models (7 tables)", () => {
    it("contains HuniPriceTable model", () => {
      expect(schema).toContain("model HuniPriceTable {");
    });

    it("contains HuniPriceTier model", () => {
      expect(schema).toContain("model HuniPriceTier {");
    });

    it("contains HuniFixedPrice model", () => {
      expect(schema).toContain("model HuniFixedPrice {");
    });

    it("contains HuniPackagePrice model", () => {
      expect(schema).toContain("model HuniPackagePrice {");
    });

    it("contains HuniFoilPrice model", () => {
      expect(schema).toContain("model HuniFoilPrice {");
    });

    it("contains HuniImpositionRule model", () => {
      expect(schema).toContain("model HuniImpositionRule {");
    });

    it("contains HuniLossQuantityConfig model", () => {
      expect(schema).toContain("model HuniLossQuantityConfig {");
    });
  });

  describe("Domain 5: Options & UI models (5 tables)", () => {
    it("contains HuniOptionDefinition model", () => {
      expect(schema).toContain("model HuniOptionDefinition {");
    });

    it("contains HuniProductOption model", () => {
      expect(schema).toContain("model HuniProductOption {");
    });

    it("contains HuniOptionChoice model", () => {
      expect(schema).toContain("model HuniOptionChoice {");
    });

    it("contains HuniOptionConstraint model", () => {
      expect(schema).toContain("model HuniOptionConstraint {");
    });

    it("contains HuniOptionDependency model", () => {
      expect(schema).toContain("model HuniOptionDependency {");
    });
  });

  describe("Domain 6: Integration models (5 tables)", () => {
    it("contains HuniMesItem model", () => {
      expect(schema).toContain("model HuniMesItem {");
    });

    it("contains HuniMesItemOption model", () => {
      expect(schema).toContain("model HuniMesItemOption {");
    });

    it("contains HuniProductMesMapping model", () => {
      expect(schema).toContain("model HuniProductMesMapping {");
    });

    it("contains HuniProductEditorMapping model", () => {
      expect(schema).toContain("model HuniProductEditorMapping {");
    });

    it("contains HuniOptionChoiceMesMapping model", () => {
      expect(schema).toContain("model HuniOptionChoiceMesMapping {");
    });
  });

  describe("SQL table mappings", () => {
    it('HuniProductSize maps to product_sizes', () => {
      expect(schema).toContain('@@map("product_sizes")');
    });

    it('HuniCategory maps to categories', () => {
      expect(schema).toContain('@@map("categories")');
    });

    it('HuniProduct maps to products', () => {
      expect(schema).toContain('@@map("products")');
    });

    it('HuniPaper maps to papers', () => {
      expect(schema).toContain('@@map("papers")');
    });

    it('HuniMaterial maps to materials', () => {
      expect(schema).toContain('@@map("materials")');
    });

    it('HuniPaperProductMapping maps to paper_product_mapping', () => {
      expect(schema).toContain('@@map("paper_product_mapping")');
    });

    it('HuniPrintMode maps to print_modes', () => {
      expect(schema).toContain('@@map("print_modes")');
    });

    it('HuniPostProcess maps to post_processes', () => {
      expect(schema).toContain('@@map("post_processes")');
    });

    it('HuniBinding maps to bindings', () => {
      expect(schema).toContain('@@map("bindings")');
    });

    it('HuniPriceTable maps to price_tables', () => {
      expect(schema).toContain('@@map("price_tables")');
    });

    it('HuniMesItem maps to mes_items', () => {
      expect(schema).toContain('@@map("mes_items")');
    });

    it('HuniOptionChoiceMesMapping maps to option_choice_mes_mapping', () => {
      expect(schema).toContain('@@map("option_choice_mes_mapping")');
    });
  });

  describe("Critical fields for SPEC compliance", () => {
    it("HuniProduct has huni_code field (SPEC AC-11)", () => {
      // huniCode is the Prisma field name (maps to huni_code in DB)
      expect(schema).toContain("huniCode");
    });

    it("HuniProduct has edicus_code field (SPEC AC-11)", () => {
      // edicusCode is the Prisma field name (maps to edicus_code in DB)
      expect(schema).toContain("edicusCode");
    });

    it("HuniMesItem has item_code field (SPEC AC-6)", () => {
      // itemCode is the Prisma field name (maps to item_code in DB)
      expect(schema).toContain("itemCode");
    });

    it("HuniOptionConstraint has constraint_type field (SPEC AC-5)", () => {
      // constraintType is the Prisma field name (maps to constraint_type in DB)
      expect(schema).toContain("constraintType");
    });

    it("HuniOptionChoiceMesMapping has mapping_status field (SPEC AC-12)", () => {
      // mappingStatus is the Prisma field name (maps to mapping_status in DB)
      expect(schema).toContain("mappingStatus");
    });
  });
});
