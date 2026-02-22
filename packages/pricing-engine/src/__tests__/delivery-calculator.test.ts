/**
 * Specification tests for DeliveryCalculator.
 *
 * Tests the delivery cost calculation engine that determines
 * shipping costs based on method, region surcharge, and
 * free shipping eligibility by member grade.
 */
import { describe, it, expect } from "vitest";
import { DeliveryCalculator } from "../delivery-calculator.js";
import type { DeliveryData } from "../delivery-calculator.js";

// ============================================================
// Test fixtures
// ============================================================

function createDeliveryData(): DeliveryData {
  return {
    freeShipping: [
      { grade: 3, minAmount: 30000 }, // Gold: free at 30000+
      { grade: 4, minAmount: 20000 }, // Platinum: free at 20000+
      { grade: 5, minAmount: 0 }, // VIP: always free
    ],
    methods: [
      { code: 4, name: "선불택배", baseCost: 2700 },
      { code: 5, name: "착불택배", baseCost: 0 },
      { code: 6, name: "퀵서비스", baseCost: 5000 },
    ],
    regions: [
      { code: 1, name: "제주특별자치도", surcharge: 3000 },
      { code: 2, name: "울릉도", surcharge: 5000 },
    ],
  };
}

// ============================================================
// Scenario 25: Delivery cost calculation
// ============================================================

describe("DeliveryCalculator", () => {
  describe("Scenario 25: Delivery cost calculation", () => {
    it("should calculate base delivery cost for prepaid courier", () => {
      const calculator = new DeliveryCalculator(createDeliveryData());

      const result = calculator.calculate({
        productId: "prod-001",
        deliveryMethodCode: 4, // 선불택배
        regionCode: null,
        orderTotal: 10000,
        memberGrade: 1, // Regular member
      });

      expect(result.baseCost).toBe(2700);
      expect(result.regionSurcharge).toBe(0);
      expect(result.isFreeShipping).toBe(false);
      expect(result.totalCost).toBe(2700);
    });

    it("should add region surcharge for Jeju (제주도)", () => {
      const calculator = new DeliveryCalculator(createDeliveryData());

      const result = calculator.calculate({
        productId: "prod-001",
        deliveryMethodCode: 4, // 선불택배
        regionCode: 1, // 제주특별자치도
        orderTotal: 10000,
        memberGrade: 1, // Regular member
      });

      expect(result.baseCost).toBe(2700);
      expect(result.regionSurcharge).toBe(3000);
      expect(result.isFreeShipping).toBe(false);
      expect(result.totalCost).toBe(5700); // 2700 + 3000
    });

    it("should apply free shipping for Gold member at 30000+ order total", () => {
      const calculator = new DeliveryCalculator(createDeliveryData());

      const result = calculator.calculate({
        productId: "prod-001",
        deliveryMethodCode: 4,
        regionCode: null,
        orderTotal: 30000,
        memberGrade: 3, // Gold
      });

      expect(result.isFreeShipping).toBe(true);
      expect(result.freeShippingReason).toContain("free");
      expect(result.totalCost).toBe(0);
    });

    it("should NOT apply free shipping for Gold member below threshold", () => {
      const calculator = new DeliveryCalculator(createDeliveryData());

      const result = calculator.calculate({
        productId: "prod-001",
        deliveryMethodCode: 4,
        regionCode: null,
        orderTotal: 29999,
        memberGrade: 3, // Gold
      });

      expect(result.isFreeShipping).toBe(false);
      expect(result.totalCost).toBe(2700);
    });

    it("should apply free shipping for Jeju when Gold member meets threshold", () => {
      const calculator = new DeliveryCalculator(createDeliveryData());

      const result = calculator.calculate({
        productId: "prod-001",
        deliveryMethodCode: 4,
        regionCode: 1, // 제주특별자치도
        orderTotal: 30000,
        memberGrade: 3, // Gold
      });

      // Free shipping applies to everything including surcharge
      expect(result.isFreeShipping).toBe(true);
      expect(result.totalCost).toBe(0);
    });

    it("should add Ulleungdo surcharge", () => {
      const calculator = new DeliveryCalculator(createDeliveryData());

      const result = calculator.calculate({
        productId: "prod-001",
        deliveryMethodCode: 4,
        regionCode: 2, // 울릉도
        orderTotal: 10000,
        memberGrade: 1,
      });

      expect(result.baseCost).toBe(2700);
      expect(result.regionSurcharge).toBe(5000);
      expect(result.totalCost).toBe(7700); // 2700 + 5000
    });
  });

  // ============================================================
  // Free shipping variations
  // ============================================================

  describe("Free shipping rules", () => {
    it("should give free shipping for VIP (grade 5) at any order total", () => {
      const calculator = new DeliveryCalculator(createDeliveryData());

      const result = calculator.calculate({
        productId: "prod-001",
        deliveryMethodCode: 4,
        regionCode: null,
        orderTotal: 1, // Even minimal order
        memberGrade: 5, // VIP
      });

      expect(result.isFreeShipping).toBe(true);
      expect(result.totalCost).toBe(0);
    });

    it("should give free shipping for Platinum (grade 4) at 20000+", () => {
      const calculator = new DeliveryCalculator(createDeliveryData());

      const result = calculator.calculate({
        productId: "prod-001",
        deliveryMethodCode: 4,
        regionCode: null,
        orderTotal: 20000,
        memberGrade: 4, // Platinum
      });

      expect(result.isFreeShipping).toBe(true);
      expect(result.totalCost).toBe(0);
    });

    it("should NOT give free shipping for regular member (no rule)", () => {
      const calculator = new DeliveryCalculator(createDeliveryData());

      const result = calculator.calculate({
        productId: "prod-001",
        deliveryMethodCode: 4,
        regionCode: null,
        orderTotal: 100000,
        memberGrade: 1, // Regular
      });

      expect(result.isFreeShipping).toBe(false);
      expect(result.totalCost).toBe(2700);
    });
  });

  // ============================================================
  // Delivery method variations
  // ============================================================

  describe("Delivery method variations", () => {
    it("should return 0 base cost for cash-on-delivery (착불택배)", () => {
      const calculator = new DeliveryCalculator(createDeliveryData());

      const result = calculator.calculate({
        productId: "prod-001",
        deliveryMethodCode: 5, // 착불택배
        regionCode: null,
        orderTotal: 10000,
        memberGrade: 1,
      });

      expect(result.baseCost).toBe(0);
      expect(result.totalCost).toBe(0);
    });

    it("should calculate express delivery (퀵서비스) cost", () => {
      const calculator = new DeliveryCalculator(createDeliveryData());

      const result = calculator.calculate({
        productId: "prod-001",
        deliveryMethodCode: 6, // 퀵서비스
        regionCode: null,
        orderTotal: 10000,
        memberGrade: 1,
      });

      expect(result.baseCost).toBe(5000);
      expect(result.totalCost).toBe(5000);
    });

    it("should return error result for unknown delivery method", () => {
      const calculator = new DeliveryCalculator(createDeliveryData());

      const result = calculator.calculate({
        productId: "prod-001",
        deliveryMethodCode: 999, // Unknown
        regionCode: null,
        orderTotal: 10000,
        memberGrade: 1,
      });

      // Unknown method defaults to 0 cost with no free shipping
      expect(result.baseCost).toBe(0);
      expect(result.totalCost).toBe(0);
      expect(result.isFreeShipping).toBe(false);
    });
  });

  // ============================================================
  // Edge cases
  // ============================================================

  describe("Edge cases", () => {
    it("should handle no region code (null)", () => {
      const calculator = new DeliveryCalculator(createDeliveryData());

      const result = calculator.calculate({
        productId: "prod-001",
        deliveryMethodCode: 4,
        regionCode: null,
        orderTotal: 10000,
        memberGrade: 1,
      });

      expect(result.regionSurcharge).toBe(0);
    });

    it("should handle unknown region code", () => {
      const calculator = new DeliveryCalculator(createDeliveryData());

      const result = calculator.calculate({
        productId: "prod-001",
        deliveryMethodCode: 4,
        regionCode: 999, // Unknown region
        orderTotal: 10000,
        memberGrade: 1,
      });

      expect(result.regionSurcharge).toBe(0);
      expect(result.totalCost).toBe(2700);
    });

    it("should handle empty delivery data", () => {
      const calculator = new DeliveryCalculator({
        freeShipping: [],
        methods: [],
        regions: [],
      });

      const result = calculator.calculate({
        productId: "prod-001",
        deliveryMethodCode: 4,
        regionCode: null,
        orderTotal: 10000,
        memberGrade: 1,
      });

      expect(result.baseCost).toBe(0);
      expect(result.regionSurcharge).toBe(0);
      expect(result.isFreeShipping).toBe(false);
      expect(result.totalCost).toBe(0);
    });

    it("should handle zero order total", () => {
      const calculator = new DeliveryCalculator(createDeliveryData());

      const result = calculator.calculate({
        productId: "prod-001",
        deliveryMethodCode: 4,
        regionCode: null,
        orderTotal: 0,
        memberGrade: 3, // Gold, but 0 total doesn't meet 30000 threshold
      });

      expect(result.isFreeShipping).toBe(false);
      expect(result.totalCost).toBe(2700);
    });

    it("should provide breakdown of delivery cost components", () => {
      const calculator = new DeliveryCalculator(createDeliveryData());

      const result = calculator.calculate({
        productId: "prod-001",
        deliveryMethodCode: 4,
        regionCode: 1, // 제주
        orderTotal: 10000,
        memberGrade: 1,
      });

      expect(result.baseCost).toBe(2700);
      expect(result.regionSurcharge).toBe(3000);
      expect(result.totalCost).toBe(result.baseCost + result.regionSurcharge);
    });
  });
});
