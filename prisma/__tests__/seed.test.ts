/**
 * Tests for the database seed script.
 *
 * Validates that the seed script correctly constructs Prisma
 * operations for bulk inserting catalog data.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ParsedProduct, ParsedCatalogIndex } from "../../packages/shared/src/parsers/catalog-parser.js";

// Mock Prisma client
const mockPrismaClient = {
  $transaction: vi.fn(),
  productCategory: {
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
  printProduct: {
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
  productSize: { deleteMany: vi.fn() },
  productPaper: { deleteMany: vi.fn() },
  productColor: { deleteMany: vi.fn() },
  productPrintMethod: { deleteMany: vi.fn() },
  productPostProcess: { deleteMany: vi.fn() },
  productOrderQty: { deleteMany: vi.fn() },
  deliveryInfo: { deleteMany: vi.fn() },
  pricingTable: { deleteMany: vi.fn() },
};

// Mock the catalog parser
vi.mock("../../packages/shared/src/parsers/catalog-parser.js", () => ({
  parseCatalogIndex: vi.fn(),
  parseProductFile: vi.fn(),
  parseAllProducts: vi.fn(),
}));

// Import seed utilities after mocking
import {
  buildCategoryCreateData,
  buildProductCreateData,
  buildCategoryHierarchy,
} from "../seed.js";

describe("Seed Script", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("buildCategoryHierarchy", () => {
    it("should build parent-child category relationships", () => {
      const index: ParsedCatalogIndex = {
        generatedAt: "2025-10-14T22:24:39.966Z",
        source: "https://test.example.com",
        productCount: 10,
        categoryCount: 3,
        categories: [
          {
            id: "cat-001",
            slug: "sticker",
            path: ["sticker"],
            displayName: "Sticker",
            productCount: 5,
            keywords: ["sticker"],
            summary: "Sticker - 5 products",
            file: "categories/cat-001.json",
            sampleProducts: [],
          },
          {
            id: "cat-002",
            slug: "sticker-square",
            path: ["sticker", "square"],
            displayName: "Sticker > Square",
            productCount: 3,
            keywords: ["sticker", "square"],
            summary: "Sticker > Square - 3 products",
            file: "categories/cat-002.json",
            sampleProducts: [],
          },
          {
            id: "cat-003",
            slug: "card",
            path: ["card"],
            displayName: "Card",
            productCount: 2,
            keywords: ["card"],
            summary: "Card - 2 products",
            file: "categories/cat-003.json",
            sampleProducts: [],
          },
        ],
      };

      const hierarchy = buildCategoryHierarchy(index.categories);

      // "sticker" is a root category
      const sticker = hierarchy.find((c) => c.slug === "sticker");
      expect(sticker).toBeDefined();
      expect(sticker!.parentSlug).toBeNull();
      expect(sticker!.level).toBe(1);

      // "square" is a child of "sticker"
      const square = hierarchy.find((c) => c.slug === "sticker-square");
      expect(square).toBeDefined();
      expect(square!.parentSlug).toBe("sticker");
      expect(square!.level).toBe(2);

      // "card" is a root category
      const card = hierarchy.find((c) => c.slug === "card");
      expect(card).toBeDefined();
      expect(card!.parentSlug).toBeNull();
      expect(card!.level).toBe(1);
    });
  });

  describe("buildCategoryCreateData", () => {
    it("should build Prisma create data for a category", () => {
      const cat = {
        id: "cat-001",
        slug: "sticker",
        displayName: "Sticker",
        productCount: 5,
        keywords: ["sticker"],
        level: 1,
        parentSlug: null as string | null,
        sortOrder: 0,
      };

      const data = buildCategoryCreateData(cat, null);

      expect(data.slug).toBe("sticker");
      expect(data.displayName).toBe("Sticker");
      expect(data.productCount).toBe(5);
      expect(data.keywords).toEqual(["sticker"]);
      expect(data.level).toBe(1);
      expect(data.parentId).toBeNull();
    });

    it("should include parentId when parent exists", () => {
      const cat = {
        id: "cat-002",
        slug: "sticker-square",
        displayName: "Sticker > Square",
        productCount: 3,
        keywords: ["sticker", "square"],
        level: 2,
        parentSlug: "sticker",
        sortOrder: 1,
      };

      const data = buildCategoryCreateData(cat, "parent-cuid-123");

      expect(data.parentId).toBe("parent-cuid-123");
      expect(data.level).toBe(2);
    });
  });

  describe("buildProductCreateData", () => {
    it("should build Prisma create data for a product with sub-records", () => {
      const product: ParsedProduct = {
        externalId: 40007,
        name: "Test Sticker",
        categoryPath: ["sticker", "square"],
        selType: "M",
        pjoin: 0,
        unit: "sheets",
        fileTypes: ["AI", "PDF"],
        coverInfo: [{ covercd: 0, covername: "unified" }],
        deliveryGroupNo: 1,
        deliveryGroupName: "Group 1",
        deliveryPrepay: true,
        cutoffTime: null,
        sizes: [
          {
            externalSizeNo: 5498,
            coverCd: 0,
            sizeName: "90x100",
            width: 90,
            height: 100,
            cutSize: 3,
            isNonStandard: false,
            reqWidth: null,
            reqHeight: null,
            reqAwkjob: null,
            rstOrdqty: null,
            rstAwkjob: null,
          },
        ],
        papers: [
          {
            externalPaperNo: 22927,
            coverCd: 0,
            paperName: "Art Paper 80g",
            paperGroup: "Art Paper",
            pGram: 80,
            reqWidth: null,
            reqHeight: null,
            reqAwkjob: null,
            rstOrdqty: null,
            rstPrsjob: null,
            rstAwkjob: null,
          },
        ],
        colors: [
          {
            externalColorNo: 302,
            coverCd: 0,
            pageCd: 0,
            colorName: "Color",
            pdfPage: 1,
            isAdditional: false,
            reqPrsjob: null,
            reqAwkjob: null,
            rstPrsjob: null,
            rstAwkjob: null,
          },
        ],
        printMethods: [
          {
            externalJobPresetNo: 3110,
            jobPreset: "Offset",
            prsjobList: [],
            reqColor: null,
            rstPaper: null,
            rstAwkjob: null,
          },
        ],
        postProcesses: [
          {
            coverCd: 0,
            inputType: "checkbox",
            jobGroupList: [],
          },
        ],
        orderQtys: [
          {
            displayType: "select",
            jobPresetNo: null,
            sizeNo: null,
            paperNo: null,
            optNo: null,
            colorNo: null,
            colorNoAdd: null,
            minQty: 500,
            maxQty: 100000,
            interval: null,
            qtyList: [500, 1000],
          },
        ],
        deliveryInfo: {
          freeShipping: [],
          methods: [],
          regions: null,
        },
        rawData: { prodno: 40007 },
      };

      const data = buildProductCreateData(product, "cat-cuid-123");

      expect(data.externalId).toBe(40007);
      expect(data.name).toBe("Test Sticker");
      expect(data.categoryId).toBe("cat-cuid-123");
      expect(data.selType).toBe("M");
      expect(data.pjoin).toBe(0);
      expect(data.unit).toBe("sheets");
      expect(data.fileTypes).toEqual(["AI", "PDF"]);

      // Sub-records
      expect(data.sizes.create).toHaveLength(1);
      expect(data.sizes.create[0].externalSizeNo).toBe(5498);
      expect(data.papers.create).toHaveLength(1);
      expect(data.papers.create[0].externalPaperNo).toBe(22927);
      expect(data.colors.create).toHaveLength(1);
      expect(data.colors.create[0].externalColorNo).toBe(302);
      expect(data.printMethods.create).toHaveLength(1);
      expect(data.printMethods.create[0].externalJobPresetNo).toBe(3110);
      expect(data.postProcesses.create).toHaveLength(1);
      expect(data.orderQtys.create).toHaveLength(1);
      expect(data.orderQtys.create[0].minQty).toBe(500);
    });

    it("should handle product without delivery info", () => {
      const product: ParsedProduct = {
        externalId: 40001,
        name: "No Delivery",
        categoryPath: [],
        selType: "S",
        pjoin: 0,
        unit: "ea",
        fileTypes: [],
        coverInfo: [],
        deliveryGroupNo: null,
        deliveryGroupName: null,
        deliveryPrepay: false,
        cutoffTime: null,
        sizes: [],
        papers: [],
        colors: [],
        printMethods: [],
        postProcesses: [],
        orderQtys: [],
        deliveryInfo: null,
        rawData: {},
      };

      const data = buildProductCreateData(product, "cat-001");

      expect(data.deliveryInfo).toBeUndefined();
    });
  });
});
