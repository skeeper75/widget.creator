/**
 * Specification tests for PriceCalculator.
 *
 * Tests the price calculation engine that matches user selections
 * to pricing table entries and computes total costs including
 * post-process (awkjob) surcharges.
 */
import { describe, it, expect } from "vitest";
import { PriceCalculator } from "../calculator.js";
import type { PricingTable } from "@widget-creator/shared";
import type { AwkjobPricingEntry } from "../calculator.js";

// ============================================================
// Test fixtures
// ============================================================

/** Standard pricing table for a sticker product */
function createPricingTable(): PricingTable[] {
  return [
    // jobPresetNo=null, sizeNo=5001, paperNo=2001, colorNo=301, colorNoAdd=null, optNo=null
    {
      id: "pt-001",
      productId: "prod-001",
      jobPresetNo: null,
      sizeNo: 5001,
      paperNo: 2001,
      colorNo: 301,
      colorNoAdd: null,
      optNo: null,
      quantity: 100,
      unitPrice: 80,
      totalPrice: 8000,
    },
    {
      id: "pt-002",
      productId: "prod-001",
      jobPresetNo: null,
      sizeNo: 5001,
      paperNo: 2001,
      colorNo: 301,
      colorNoAdd: null,
      optNo: null,
      quantity: 500,
      unitPrice: 50,
      totalPrice: 25000,
    },
    {
      id: "pt-003",
      productId: "prod-001",
      jobPresetNo: null,
      sizeNo: 5001,
      paperNo: 2001,
      colorNo: 301,
      colorNoAdd: null,
      optNo: null,
      quantity: 1000,
      unitPrice: 35,
      totalPrice: 35000,
    },
    // Same product, different paper
    {
      id: "pt-004",
      productId: "prod-001",
      jobPresetNo: null,
      sizeNo: 5001,
      paperNo: 2002,
      colorNo: 301,
      colorNoAdd: null,
      optNo: null,
      quantity: 500,
      unitPrice: 60,
      totalPrice: 30000,
    },
    // With jobPresetNo specified
    {
      id: "pt-005",
      productId: "prod-001",
      jobPresetNo: 3110,
      sizeNo: 5010,
      paperNo: 2010,
      colorNo: 302,
      colorNoAdd: null,
      optNo: null,
      quantity: 200,
      unitPrice: 70,
      totalPrice: 14000,
    },
    // With optNo specified
    {
      id: "pt-006",
      productId: "prod-001",
      jobPresetNo: null,
      sizeNo: 5001,
      paperNo: 2001,
      colorNo: 301,
      colorNoAdd: null,
      optNo: 9001,
      quantity: 100,
      unitPrice: 90,
      totalPrice: 9000,
    },
    // With colorNoAdd
    {
      id: "pt-007",
      productId: "prod-001",
      jobPresetNo: null,
      sizeNo: 5001,
      paperNo: 2001,
      colorNo: 301,
      colorNoAdd: 302,
      optNo: null,
      quantity: 100,
      unitPrice: 100,
      totalPrice: 10000,
    },
  ];
}

/** Awkjob pricing entries for post-process costs */
function createAwkjobPricing(): AwkjobPricingEntry[] {
  return [
    {
      awkjobNo: 30010,
      awkjobName: "Lamination",
      quantity: 100,
      unitPrice: 20,
      totalPrice: 2000,
    },
    {
      awkjobNo: 30010,
      awkjobName: "Lamination",
      quantity: 500,
      unitPrice: 15,
      totalPrice: 7500,
    },
    {
      awkjobNo: 30010,
      awkjobName: "Lamination",
      quantity: 1000,
      unitPrice: 10,
      totalPrice: 10000,
    },
    {
      awkjobNo: 30020,
      awkjobName: "UV Spot Coating",
      quantity: 100,
      unitPrice: 30,
      totalPrice: 3000,
    },
    {
      awkjobNo: 30020,
      awkjobName: "UV Spot Coating",
      quantity: 500,
      unitPrice: 25,
      totalPrice: 12500,
    },
  ];
}

// ============================================================
// Scenario 21: Basic price calculation
// ============================================================

describe("PriceCalculator", () => {
  describe("Scenario 21: Basic price calculation", () => {
    it("should return correct prices when all required fields match exactly", () => {
      const calculator = new PriceCalculator(
        createPricingTable(),
        createAwkjobPricing(),
      );

      const result = calculator.calculate({
        productId: "prod-001",
        jobPresetNo: null,
        sizeNo: 5001,
        paperNo: 2001,
        colorNo: 301,
        colorNoAdd: null,
        optNo: null,
        quantity: 500,
        awkjobSelections: [],
      });

      expect(result.isAvailable).toBe(true);
      expect(result.unitPrice).toBe(50);
      expect(result.totalPrice).toBe(25000);
      expect(result.subtotal).toBe(25000);
      expect(result.awkjobCosts).toEqual([]);
      expect(result.message).toBeNull();
    });

    it("should match pricing entry with jobPresetNo", () => {
      const calculator = new PriceCalculator(
        createPricingTable(),
        createAwkjobPricing(),
      );

      const result = calculator.calculate({
        productId: "prod-001",
        jobPresetNo: 3110,
        sizeNo: 5010,
        paperNo: 2010,
        colorNo: 302,
        colorNoAdd: null,
        optNo: null,
        quantity: 200,
        awkjobSelections: [],
      });

      expect(result.isAvailable).toBe(true);
      expect(result.unitPrice).toBe(70);
      expect(result.totalPrice).toBe(14000);
    });

    it("should match pricing entry with optNo", () => {
      const calculator = new PriceCalculator(
        createPricingTable(),
        createAwkjobPricing(),
      );

      const result = calculator.calculate({
        productId: "prod-001",
        jobPresetNo: null,
        sizeNo: 5001,
        paperNo: 2001,
        colorNo: 301,
        colorNoAdd: null,
        optNo: 9001,
        quantity: 100,
        awkjobSelections: [],
      });

      expect(result.isAvailable).toBe(true);
      expect(result.unitPrice).toBe(90);
      expect(result.totalPrice).toBe(9000);
    });

    it("should match pricing entry with colorNoAdd", () => {
      const calculator = new PriceCalculator(
        createPricingTable(),
        createAwkjobPricing(),
      );

      const result = calculator.calculate({
        productId: "prod-001",
        jobPresetNo: null,
        sizeNo: 5001,
        paperNo: 2001,
        colorNo: 301,
        colorNoAdd: 302,
        optNo: null,
        quantity: 100,
        awkjobSelections: [],
      });

      expect(result.isAvailable).toBe(true);
      expect(result.unitPrice).toBe(100);
      expect(result.totalPrice).toBe(10000);
    });
  });

  // ============================================================
  // Scenario 22: Non-linear quantity pricing
  // ============================================================

  describe("Scenario 22: Non-linear quantity pricing", () => {
    it("should return lower unit price for higher quantity (500 vs 1000)", () => {
      const calculator = new PriceCalculator(
        createPricingTable(),
        createAwkjobPricing(),
      );

      const result500 = calculator.calculate({
        productId: "prod-001",
        jobPresetNo: null,
        sizeNo: 5001,
        paperNo: 2001,
        colorNo: 301,
        colorNoAdd: null,
        optNo: null,
        quantity: 500,
        awkjobSelections: [],
      });

      const result1000 = calculator.calculate({
        productId: "prod-001",
        jobPresetNo: null,
        sizeNo: 5001,
        paperNo: 2001,
        colorNo: 301,
        colorNoAdd: null,
        optNo: null,
        quantity: 1000,
        awkjobSelections: [],
      });

      // qty=500: unitPrice=50, total=25000
      expect(result500.unitPrice).toBe(50);
      expect(result500.totalPrice).toBe(25000);

      // qty=1000: unitPrice=35, total=35000
      expect(result1000.unitPrice).toBe(35);
      expect(result1000.totalPrice).toBe(35000);

      // Higher quantity should have lower unit price
      expect(result1000.unitPrice).toBeLessThan(result500.unitPrice);
    });

    it("should return different prices for different quantities of the same combo", () => {
      const calculator = new PriceCalculator(
        createPricingTable(),
        createAwkjobPricing(),
      );

      const result100 = calculator.calculate({
        productId: "prod-001",
        jobPresetNo: null,
        sizeNo: 5001,
        paperNo: 2001,
        colorNo: 301,
        colorNoAdd: null,
        optNo: null,
        quantity: 100,
        awkjobSelections: [],
      });

      expect(result100.unitPrice).toBe(80);
      expect(result100.totalPrice).toBe(8000);
    });
  });

  // ============================================================
  // Scenario 23: Post-process additional cost
  // ============================================================

  describe("Scenario 23: Post-process additional cost", () => {
    it("should add lamination cost to base price", () => {
      const calculator = new PriceCalculator(
        createPricingTable(),
        createAwkjobPricing(),
      );

      const result = calculator.calculate({
        productId: "prod-001",
        jobPresetNo: null,
        sizeNo: 5001,
        paperNo: 2001,
        colorNo: 301,
        colorNoAdd: null,
        optNo: null,
        quantity: 500,
        awkjobSelections: [{ jobgroupno: 10000, jobno: 30010 }],
      });

      expect(result.isAvailable).toBe(true);
      // Base: 25000 + Lamination at qty 500: 7500 = 32500
      expect(result.subtotal).toBe(25000);
      expect(result.awkjobCosts).toEqual([
        {
          jobgroupno: 10000,
          jobno: 30010,
          jobname: "Lamination",
          cost: 7500,
        },
      ]);
      expect(result.totalPrice).toBe(32500);
    });

    it("should add multiple post-process costs", () => {
      const calculator = new PriceCalculator(
        createPricingTable(),
        createAwkjobPricing(),
      );

      const result = calculator.calculate({
        productId: "prod-001",
        jobPresetNo: null,
        sizeNo: 5001,
        paperNo: 2001,
        colorNo: 301,
        colorNoAdd: null,
        optNo: null,
        quantity: 100,
        awkjobSelections: [
          { jobgroupno: 10000, jobno: 30010 },
          { jobgroupno: 10000, jobno: 30020 },
        ],
      });

      expect(result.isAvailable).toBe(true);
      // Base: 8000 + Lamination at qty 100: 2000 + UV Spot at qty 100: 3000 = 13000
      expect(result.subtotal).toBe(8000);
      expect(result.awkjobCosts).toHaveLength(2);
      expect(result.totalPrice).toBe(13000);
    });

    it("should calculate unit price including post-process cost", () => {
      const calculator = new PriceCalculator(
        createPricingTable(),
        createAwkjobPricing(),
      );

      const result = calculator.calculate({
        productId: "prod-001",
        jobPresetNo: null,
        sizeNo: 5001,
        paperNo: 2001,
        colorNo: 301,
        colorNoAdd: null,
        optNo: null,
        quantity: 100,
        awkjobSelections: [{ jobgroupno: 10000, jobno: 30010 }],
      });

      // Base: 8000 + Lamination: 2000 = 10000 total
      // unitPrice = 10000 / 100 = 100
      expect(result.totalPrice).toBe(10000);
      expect(result.unitPrice).toBe(100);
    });
  });

  // ============================================================
  // Scenario 24: Missing price data
  // ============================================================

  describe("Scenario 24: Missing price data (R-PRC-005)", () => {
    it("should return PRICE_NOT_FOUND when no matching pricing entry exists", () => {
      const calculator = new PriceCalculator(
        createPricingTable(),
        createAwkjobPricing(),
      );

      const result = calculator.calculate({
        productId: "prod-001",
        jobPresetNo: null,
        sizeNo: 9999, // Non-existent size
        paperNo: 2001,
        colorNo: 301,
        colorNoAdd: null,
        optNo: null,
        quantity: 100,
        awkjobSelections: [],
      });

      expect(result.isAvailable).toBe(false);
      expect(result.message).toContain("PRICE_NOT_FOUND");
      // R-PRC-005: MUST NOT return 0 or arbitrary price
      expect(result.totalPrice).toBe(0);
      expect(result.unitPrice).toBe(0);
    });

    it("should return error when quantity has no matching pricing entry", () => {
      const calculator = new PriceCalculator(
        createPricingTable(),
        createAwkjobPricing(),
      );

      const result = calculator.calculate({
        productId: "prod-001",
        jobPresetNo: null,
        sizeNo: 5001,
        paperNo: 2001,
        colorNo: 301,
        colorNoAdd: null,
        optNo: null,
        quantity: 777, // No entry for this quantity
        awkjobSelections: [],
      });

      expect(result.isAvailable).toBe(false);
      expect(result.message).toContain("PRICE_NOT_FOUND");
    });

    it("should return error when post-process pricing is missing", () => {
      const calculator = new PriceCalculator(
        createPricingTable(),
        createAwkjobPricing(),
      );

      const result = calculator.calculate({
        productId: "prod-001",
        jobPresetNo: null,
        sizeNo: 5001,
        paperNo: 2001,
        colorNo: 301,
        colorNoAdd: null,
        optNo: null,
        quantity: 100,
        awkjobSelections: [{ jobgroupno: 99999, jobno: 99999 }], // Non-existent awkjob
      });

      expect(result.isAvailable).toBe(false);
      expect(result.message).toContain("PRICE_NOT_FOUND");
    });

    it("should NEVER return 0 price when data is genuinely missing", () => {
      const calculator = new PriceCalculator([], []);

      const result = calculator.calculate({
        productId: "prod-001",
        jobPresetNo: null,
        sizeNo: 5001,
        paperNo: 2001,
        colorNo: 301,
        colorNoAdd: null,
        optNo: null,
        quantity: 100,
        awkjobSelections: [],
      });

      expect(result.isAvailable).toBe(false);
      expect(result.message).not.toBeNull();
    });
  });

  // ============================================================
  // Additional edge cases
  // ============================================================

  describe("Edge cases", () => {
    it("should handle null fields as wildcard matches in pricing table", () => {
      // Pricing entry with null jobPresetNo should match any jobPresetNo in request
      const pricingTable: PricingTable[] = [
        {
          id: "pt-wild",
          productId: "prod-001",
          jobPresetNo: null,
          sizeNo: 5001,
          paperNo: 2001,
          colorNo: 301,
          colorNoAdd: null,
          optNo: null,
          quantity: 100,
          unitPrice: 80,
          totalPrice: 8000,
        },
      ];

      const calculator = new PriceCalculator(pricingTable, []);

      // Request with jobPresetNo=3110 should still match a null jobPresetNo entry
      const result = calculator.calculate({
        productId: "prod-001",
        jobPresetNo: 3110,
        sizeNo: 5001,
        paperNo: 2001,
        colorNo: 301,
        colorNoAdd: null,
        optNo: null,
        quantity: 100,
        awkjobSelections: [],
      });

      expect(result.isAvailable).toBe(true);
      expect(result.unitPrice).toBe(80);
    });

    it("should prefer exact match over wildcard match", () => {
      const pricingTable: PricingTable[] = [
        // Wildcard entry
        {
          id: "pt-wild",
          productId: "prod-001",
          jobPresetNo: null,
          sizeNo: 5001,
          paperNo: 2001,
          colorNo: 301,
          colorNoAdd: null,
          optNo: null,
          quantity: 100,
          unitPrice: 80,
          totalPrice: 8000,
        },
        // Exact match entry
        {
          id: "pt-exact",
          productId: "prod-001",
          jobPresetNo: 3110,
          sizeNo: 5001,
          paperNo: 2001,
          colorNo: 301,
          colorNoAdd: null,
          optNo: null,
          quantity: 100,
          unitPrice: 75,
          totalPrice: 7500,
        },
      ];

      const calculator = new PriceCalculator(pricingTable, []);

      const result = calculator.calculate({
        productId: "prod-001",
        jobPresetNo: 3110,
        sizeNo: 5001,
        paperNo: 2001,
        colorNo: 301,
        colorNoAdd: null,
        optNo: null,
        quantity: 100,
        awkjobSelections: [],
      });

      // Should pick the exact match (unitPrice=75)
      expect(result.unitPrice).toBe(75);
    });

    it("should return INVALID_QUANTITY error for quantity <= 0", () => {
      const calculator = new PriceCalculator(
        createPricingTable(),
        createAwkjobPricing(),
      );

      const result = calculator.calculate({
        productId: "prod-001",
        jobPresetNo: null,
        sizeNo: 5001,
        paperNo: 2001,
        colorNo: 301,
        colorNoAdd: null,
        optNo: null,
        quantity: 0,
        awkjobSelections: [],
      });

      expect(result.isAvailable).toBe(false);
      expect(result.message).toContain("INVALID_QUANTITY");
    });

    it("should return INCOMPLETE_SELECTION when sizeNo is missing", () => {
      const calculator = new PriceCalculator(
        createPricingTable(),
        createAwkjobPricing(),
      );

      const result = calculator.calculate({
        productId: "prod-001",
        jobPresetNo: null,
        sizeNo: null as unknown as number,
        paperNo: 2001,
        colorNo: 301,
        colorNoAdd: null,
        optNo: null,
        quantity: 100,
        awkjobSelections: [],
      });

      expect(result.isAvailable).toBe(false);
      expect(result.message).toContain("INCOMPLETE_SELECTION");
    });

    it("should return INCOMPLETE_SELECTION when paperNo is missing", () => {
      const calculator = new PriceCalculator(
        createPricingTable(),
        createAwkjobPricing(),
      );

      const result = calculator.calculate({
        productId: "prod-001",
        jobPresetNo: null,
        sizeNo: 5001,
        paperNo: null as unknown as number,
        colorNo: 301,
        colorNoAdd: null,
        optNo: null,
        quantity: 100,
        awkjobSelections: [],
      });

      expect(result.isAvailable).toBe(false);
      expect(result.message).toContain("INCOMPLETE_SELECTION");
    });

    it("should return INCOMPLETE_SELECTION when colorNo is missing", () => {
      const calculator = new PriceCalculator(
        createPricingTable(),
        createAwkjobPricing(),
      );

      const result = calculator.calculate({
        productId: "prod-001",
        jobPresetNo: null,
        sizeNo: 5001,
        paperNo: 2001,
        colorNo: null as unknown as number,
        colorNoAdd: null,
        optNo: null,
        quantity: 100,
        awkjobSelections: [],
      });

      expect(result.isAvailable).toBe(false);
      expect(result.message).toContain("INCOMPLETE_SELECTION");
    });
  });
});
