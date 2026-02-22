/**
 * Prisma schema validation test.
 *
 * Verifies that the Prisma schema loads and validates correctly.
 */
import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { resolve } from "path";

const PRISMA_SCHEMA_PATH = resolve(__dirname, "..", "schema.prisma");

describe("Prisma Schema", () => {
  it("should have a schema.prisma file", () => {
    expect(existsSync(PRISMA_SCHEMA_PATH)).toBe(true);
  });

  it("should validate without errors", () => {
    const result = execSync(
      `npx prisma validate --schema="${PRISMA_SCHEMA_PATH}" 2>&1`,
      { encoding: "utf-8", cwd: resolve(__dirname, "..", "..") }
    );
    // Prisma validate exits with 0 on success
    expect(result).toContain("The schema at");
  });

  it("should contain all required models", () => {
    const schema = require("fs").readFileSync(PRISMA_SCHEMA_PATH, "utf-8");
    const requiredModels = [
      "ProductCategory",
      "PrintProduct",
      "ProductSize",
      "ProductPaper",
      "ProductColor",
      "ProductPrintMethod",
      "ProductPostProcess",
      "ProductOrderQty",
      "PricingTable",
      "DeliveryInfo",
    ];
    for (const model of requiredModels) {
      expect(schema).toContain(`model ${model}`);
    }
  });

  it("should use PostgreSQL as datasource", () => {
    const schema = require("fs").readFileSync(PRISMA_SCHEMA_PATH, "utf-8");
    expect(schema).toContain('provider = "postgresql"');
  });

  it("should reference DATABASE_URL from environment", () => {
    const schema = require("fs").readFileSync(PRISMA_SCHEMA_PATH, "utf-8");
    expect(schema).toContain('env("DATABASE_URL")');
  });

  it("should have cascade delete on child relations", () => {
    const schema = require("fs").readFileSync(PRISMA_SCHEMA_PATH, "utf-8");
    // All child models should cascade delete when parent product is deleted
    const cascadeCount = (schema.match(/onDelete: Cascade/g) || []).length;
    // ProductSize, ProductPaper, ProductColor, ProductPrintMethod,
    // ProductPostProcess, ProductOrderQty, PricingTable, DeliveryInfo = 8
    expect(cascadeCount).toBeGreaterThanOrEqual(8);
  });

  it("should have composite indexes for query optimization", () => {
    const schema = require("fs").readFileSync(PRISMA_SCHEMA_PATH, "utf-8");
    // Key composite indexes for option engine queries
    expect(schema).toContain("@@index([productId, coverCd])");
    expect(schema).toContain("@@index([productId, coverCd, pageCd])");
    expect(schema).toContain(
      "@@index([productId, jobPresetNo, sizeNo, paperNo, colorNo, colorNoAdd, optNo, quantity])"
    );
  });
});
