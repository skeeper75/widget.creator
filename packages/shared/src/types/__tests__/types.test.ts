/**
 * Type compilation tests for @widget-creator/shared types.
 *
 * These tests verify that type definitions compile correctly and
 * enforce structural contracts. They use type assertions to validate
 * that the type system accepts valid data and rejects invalid data.
 */
import { describe, it, expect } from "vitest";
import type {
  // Core product types
  ProductCategory,
  PrintProduct,
  ProductSize,
  ProductPaper,
  ProductColor,
  ProductPrintMethod,
  ProductPostProcess,
  ProductOrderQty,
  PricingTable,
  DeliveryInfo,
  // Option types
  OptionSelection,
  AvailableOptions,
  ConstraintViolation,
  SizeOption,
  PaperOption,
  ColorOption,
  PrintMethodOption,
  PostProcessGroup,
  AwkjobSelection,
  QuantityOption,
  ProductOptionItem,
  // Pricing types
  PriceCalculationRequest,
  PriceCalculationResult,
  DeliveryCostRequest,
  DeliveryCostResult,
  // Constraint types
  RequirementConstraint,
  RestrictionConstraint,
  ConstraintEvaluationResult,
  ReqWidth,
  ReqHeight,
  ReqAwkjob,
  ReqPrsjob,
  ReqJoboption,
  ReqJobsize,
  ReqJobqty,
  RstOrdqty,
  RstPaper,
  RstAwkjob,
  RstPrsjob,
  RstColor,
  RstSize,
  RstJobqty,
  RstCutcnt,
} from "../index.js";

// Helper to assert type compatibility at compile time
function assertType<T>(_value: T): void {
  // compile-time check only
}

describe("PrintProduct types", () => {
  describe("ProductCategory", () => {
    it("should accept valid category data", () => {
      const category: ProductCategory = {
        id: "cat-001",
        slug: "stickers",
        displayName: "Stickers",
        parentId: null,
        level: 1,
        productCount: 10,
        keywords: ["sticker", "label"],
        sortOrder: 1,
      };
      assertType<ProductCategory>(category);
      expect(category.slug).toBe("stickers");
    });

    it("should allow parentId as string for subcategories", () => {
      const subcategory: ProductCategory = {
        id: "cat-002",
        slug: "square-stickers",
        displayName: "Square Stickers",
        parentId: "cat-001",
        level: 2,
        productCount: 5,
        keywords: ["square", "sticker"],
        sortOrder: 1,
      };
      assertType<ProductCategory>(subcategory);
      expect(subcategory.parentId).toBe("cat-001");
    });
  });

  describe("PrintProduct", () => {
    it("should accept valid product data", () => {
      const product: PrintProduct = {
        id: "prod-001",
        externalId: 40007,
        name: "Budget Sticker (Square)",
        categoryId: "cat-002",
        selType: "M",
        pjoin: 0,
        unit: "sheets",
        fileTypes: ["AI", "EPS", "JPG", "PNG"],
        coverInfo: [{ covercd: 0, covername: "unified" }],
        deliveryGroupNo: 1,
        deliveryGroupName: "Business cards, stickers bundle",
        deliveryPrepay: true,
        cutoffTime: null,
        syncedAt: new Date(),
        rawData: {},
      };
      assertType<PrintProduct>(product);
      expect(product.externalId).toBe(40007);
    });

    it("should allow nullable delivery fields", () => {
      const product: PrintProduct = {
        id: "prod-002",
        externalId: 40008,
        name: "Test Product",
        categoryId: "cat-001",
        selType: "S",
        pjoin: 1,
        unit: "units",
        fileTypes: ["PDF"],
        coverInfo: [],
        deliveryGroupNo: null,
        deliveryGroupName: null,
        deliveryPrepay: false,
        cutoffTime: "13:00",
        syncedAt: new Date(),
        rawData: {},
      };
      assertType<PrintProduct>(product);
      expect(product.deliveryGroupNo).toBeNull();
    });
  });

  describe("ProductSize", () => {
    it("should accept valid size with nullable constraint fields", () => {
      const size: ProductSize = {
        id: "size-001",
        productId: "prod-001",
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
      };
      assertType<ProductSize>(size);
      expect(size.sizeName).toBe("90x100");
    });

    it("should accept non-standard size with req_width/req_height", () => {
      const size: ProductSize = {
        id: "size-002",
        productId: "prod-001",
        externalSizeNo: 5493,
        coverCd: 0,
        sizeName: "Non-standard",
        width: 90,
        height: 55,
        cutSize: 3,
        isNonStandard: true,
        reqWidth: { type: "input", unit: "width(mm)", min: 30, max: 510, interval: 1 },
        reqHeight: { type: "input", unit: "height(mm)", min: 30, max: 760, interval: 1 },
        reqAwkjob: null,
        rstOrdqty: null,
        rstAwkjob: null,
      };
      assertType<ProductSize>(size);
      expect(size.isNonStandard).toBe(true);
    });
  });

  describe("ProductPaper", () => {
    it("should accept valid paper data", () => {
      const paper: ProductPaper = {
        id: "paper-001",
        productId: "prod-001",
        externalPaperNo: 22927,
        coverCd: 0,
        paperName: "Art paper (uncoated) 80g",
        paperGroup: "Art paper (uncoated)",
        pGram: 80,
        reqWidth: null,
        reqHeight: null,
        reqAwkjob: null,
        rstOrdqty: null,
        rstPrsjob: null,
        rstAwkjob: null,
      };
      assertType<ProductPaper>(paper);
      expect(paper.paperName).toBe("Art paper (uncoated) 80g");
    });

    it("should accept paper with rst_prsjob constraint", () => {
      const paper: ProductPaper = {
        id: "paper-002",
        productId: "prod-001",
        externalPaperNo: 22930,
        coverCd: 0,
        paperName: "Art paper (matte) 80g",
        paperGroup: "Art paper (matte)",
        pGram: 80,
        reqWidth: null,
        reqHeight: null,
        reqAwkjob: null,
        rstOrdqty: null,
        rstPrsjob: [{ jobno: 3230, jobname: "UV Print" }],
        rstAwkjob: null,
      };
      assertType<ProductPaper>(paper);
      expect(paper.rstPrsjob).toHaveLength(1);
    });
  });

  describe("ProductColor", () => {
    it("should accept valid color data", () => {
      const color: ProductColor = {
        id: "color-001",
        productId: "prod-001",
        externalColorNo: 302,
        coverCd: 0,
        pageCd: 0,
        colorName: "Single-side Color",
        pdfPage: 1,
        isAdditional: false,
        reqPrsjob: [{ jobpresetno: 3110, jobno: 3110, jobname: "Offset Print" }],
        reqAwkjob: null,
        rstPrsjob: null,
        rstAwkjob: null,
      };
      assertType<ProductColor>(color);
      expect(color.colorName).toBe("Single-side Color");
    });
  });

  describe("ProductPrintMethod", () => {
    it("should accept valid print method data", () => {
      const method: ProductPrintMethod = {
        id: "pm-001",
        productId: "prod-001",
        externalJobPresetNo: 3110,
        jobPreset: "Offset Print",
        prsjobList: [
          {
            covercd: 0,
            jobno: 3110,
            jobname: "Offset Print Combined",
            unit: "sheets",
            reqColor: [{ colorno: 302, colorname: "Single-side Color" }],
            rstPaper: null,
            rstAwkjob: null,
          },
        ],
        reqColor: [{ colorno: 302, colorname: "Single-side Color" }],
        rstPaper: null,
        rstAwkjob: null,
      };
      assertType<ProductPrintMethod>(method);
      expect(method.jobPreset).toBe("Offset Print");
    });
  });

  describe("ProductPostProcess", () => {
    it("should accept valid post-process data", () => {
      const postProcess: ProductPostProcess = {
        id: "pp-001",
        productId: "prod-001",
        coverCd: 0,
        inputType: "checkbox",
        jobGroupList: [
          {
            jobgroupno: 36500,
            jobgroup: "Cut Direction",
            type: "select",
            displayloc: "awkjob",
            awkjoblist: [],
          },
        ],
      };
      assertType<ProductPostProcess>(postProcess);
      expect(postProcess.inputType).toBe("checkbox");
    });
  });

  describe("ProductOrderQty", () => {
    it("should accept select-type quantity", () => {
      const qty: ProductOrderQty = {
        id: "qty-001",
        productId: "prod-001",
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
        qtyList: [500, 1000, 2000, 3000, 5000],
      };
      assertType<ProductOrderQty>(qty);
      expect(qty.displayType).toBe("select");
    });

    it("should accept input-type quantity with interval", () => {
      const qty: ProductOrderQty = {
        id: "qty-002",
        productId: "prod-002",
        displayType: "input",
        jobPresetNo: 3110,
        sizeNo: 5498,
        paperNo: 22927,
        optNo: null,
        colorNo: 302,
        colorNoAdd: null,
        minQty: 100,
        maxQty: 50000,
        interval: 100,
        qtyList: null,
      };
      assertType<ProductOrderQty>(qty);
      expect(qty.interval).toBe(100);
    });
  });

  describe("PricingTable", () => {
    it("should accept valid pricing entry", () => {
      const pricing: PricingTable = {
        id: "price-001",
        productId: "prod-001",
        jobPresetNo: 3110,
        sizeNo: 5498,
        paperNo: 22927,
        colorNo: 302,
        colorNoAdd: null,
        optNo: null,
        quantity: 1000,
        unitPrice: 15.5,
        totalPrice: 15500,
      };
      assertType<PricingTable>(pricing);
      expect(pricing.unitPrice).toBe(15.5);
    });
  });

  describe("DeliveryInfo", () => {
    it("should accept valid delivery info", () => {
      const delivery: DeliveryInfo = {
        id: "dlv-001",
        productId: "prod-001",
        freeShipping: [{ usrkd: 31, usrkdname: "Family", mincost: 50000 }],
        methods: [],
        regions: [],
      };
      assertType<DeliveryInfo>(delivery);
      expect(delivery.freeShipping).toHaveLength(1);
    });
  });
});

describe("Option types", () => {
  describe("OptionSelection", () => {
    it("should accept minimal option selection", () => {
      const selection: OptionSelection = {
        productId: "prod-001",
        coverCd: 0,
      };
      assertType<OptionSelection>(selection);
      expect(selection.productId).toBe("prod-001");
    });

    it("should accept full option selection", () => {
      const selection: OptionSelection = {
        productId: "prod-001",
        jobPresetNo: 3110,
        sizeNo: 5498,
        paperNo: 22927,
        optNo: undefined,
        colorNo: 302,
        colorNoAdd: undefined,
        coverCd: 0,
        quantity: 1000,
        awkjobSelections: [{ jobgroupno: 36500, jobno: 36510 }],
      };
      assertType<OptionSelection>(selection);
      expect(selection.quantity).toBe(1000);
    });
  });

  describe("AvailableOptions", () => {
    it("should accept valid available options structure", () => {
      const options: AvailableOptions = {
        sizes: [],
        papers: [],
        colors: [],
        printMethods: [],
        options: [],
        postProcesses: [],
        quantities: {
          displayType: "select",
          minQty: 500,
          maxQty: 100000,
          interval: null,
          qtyList: [500, 1000, 2000],
        },
        constraints: [],
      };
      assertType<AvailableOptions>(options);
      expect(options.constraints).toHaveLength(0);
    });
  });

  describe("ConstraintViolation", () => {
    it("should accept required constraint violation", () => {
      const violation: ConstraintViolation = {
        type: "required",
        source: "color-302",
        target: "prsjob-3110",
        message: "Offset print is required for this color selection",
      };
      assertType<ConstraintViolation>(violation);
      expect(violation.type).toBe("required");
    });

    it("should accept restricted constraint violation", () => {
      const violation: ConstraintViolation = {
        type: "restricted",
        source: "paper-22927",
        target: "prsjob-3230",
        message: "UV print is restricted with this paper",
      };
      assertType<ConstraintViolation>(violation);
      expect(violation.type).toBe("restricted");
    });
  });

  describe("SizeOption", () => {
    it("should accept valid size option", () => {
      const option: SizeOption = {
        sizeNo: 5498,
        sizeName: "90x100",
        width: 90,
        height: 100,
        cutSize: 3,
        isNonStandard: false,
        isAvailable: true,
        reqWidth: null,
        reqHeight: null,
      };
      assertType<SizeOption>(option);
      expect(option.isAvailable).toBe(true);
    });
  });

  describe("PaperOption", () => {
    it("should accept valid paper option", () => {
      const option: PaperOption = {
        paperNo: 22927,
        paperName: "Art paper 80g",
        paperGroup: "Art paper",
        pGram: 80,
        isAvailable: true,
      };
      assertType<PaperOption>(option);
      expect(option.pGram).toBe(80);
    });
  });

  describe("ColorOption", () => {
    it("should accept valid color option", () => {
      const option: ColorOption = {
        colorNo: 302,
        colorName: "Single-side Color",
        pdfPage: 1,
        isAdditional: false,
        isAvailable: true,
      };
      assertType<ColorOption>(option);
      expect(option.isAdditional).toBe(false);
    });
  });

  describe("PrintMethodOption", () => {
    it("should accept valid print method option", () => {
      const option: PrintMethodOption = {
        jobPresetNo: 3110,
        jobPreset: "Offset Print",
        isAvailable: true,
      };
      assertType<PrintMethodOption>(option);
      expect(option.jobPresetNo).toBe(3110);
    });
  });

  describe("PostProcessGroup", () => {
    it("should accept valid post process group", () => {
      const group: PostProcessGroup = {
        jobgroupno: 36500,
        jobgroup: "Cut Direction",
        type: "select",
        displayloc: "awkjob",
        awkjoblist: [
          {
            jobno: 36510,
            jobname: "Horizontal Cut",
            namestep1: "Cut Direction",
            namestep2: "Horizontal",
            unit: "sheets",
            isAvailable: true,
          },
        ],
      };
      assertType<PostProcessGroup>(group);
      expect(group.awkjoblist).toHaveLength(1);
    });
  });

  describe("AwkjobSelection", () => {
    it("should accept valid awkjob selection", () => {
      const selection: AwkjobSelection = {
        jobgroupno: 36500,
        jobno: 36510,
      };
      assertType<AwkjobSelection>(selection);
      expect(selection.jobno).toBe(36510);
    });
  });
});

describe("Pricing types", () => {
  describe("PriceCalculationRequest", () => {
    it("should accept valid price calculation request", () => {
      const request: PriceCalculationRequest = {
        productId: "prod-001",
        jobPresetNo: 3110,
        sizeNo: 5498,
        paperNo: 22927,
        colorNo: 302,
        colorNoAdd: null,
        optNo: null,
        quantity: 1000,
        awkjobSelections: [],
      };
      assertType<PriceCalculationRequest>(request);
      expect(request.quantity).toBe(1000);
    });
  });

  describe("PriceCalculationResult", () => {
    it("should accept valid price calculation result", () => {
      const result: PriceCalculationResult = {
        unitPrice: 15.5,
        totalPrice: 15500,
        awkjobCosts: [],
        subtotal: 15500,
        isAvailable: true,
        message: null,
      };
      assertType<PriceCalculationResult>(result);
      expect(result.isAvailable).toBe(true);
    });
  });

  describe("DeliveryCostRequest", () => {
    it("should accept valid delivery cost request", () => {
      const request: DeliveryCostRequest = {
        productId: "prod-001",
        deliveryMethodCode: 0,
        regionCode: null,
        orderTotal: 50000,
        memberGrade: 31,
      };
      assertType<DeliveryCostRequest>(request);
      expect(request.orderTotal).toBe(50000);
    });
  });

  describe("DeliveryCostResult", () => {
    it("should accept valid delivery cost result", () => {
      const result: DeliveryCostResult = {
        baseCost: 3000,
        regionSurcharge: 0,
        isFreeShipping: true,
        freeShippingReason: "Order exceeds minimum for member grade",
        totalCost: 0,
      };
      assertType<DeliveryCostResult>(result);
      expect(result.isFreeShipping).toBe(true);
    });
  });
});

describe("Constraint types", () => {
  describe("ReqWidth / ReqHeight", () => {
    it("should accept valid width requirement", () => {
      const req: ReqWidth = {
        type: "input",
        unit: "width(mm)",
        min: 30,
        max: 510,
        interval: 1,
      };
      assertType<ReqWidth>(req);
      expect(req.min).toBe(30);
    });

    it("should accept valid height requirement", () => {
      const req: ReqHeight = {
        type: "input",
        unit: "height(mm)",
        min: 30,
        max: 760,
        interval: 1,
      };
      assertType<ReqHeight>(req);
      expect(req.max).toBe(760);
    });
  });

  describe("ReqAwkjob", () => {
    it("should accept valid awkjob requirement", () => {
      const req: ReqAwkjob = {
        jobno: 36510,
        jobname: "Horizontal Cut",
      };
      assertType<ReqAwkjob>(req);
      expect(req.jobno).toBe(36510);
    });
  });

  describe("ReqPrsjob", () => {
    it("should accept valid prsjob requirement", () => {
      const req: ReqPrsjob = {
        jobpresetno: 3110,
        jobno: 3110,
        jobname: "Offset Print",
      };
      assertType<ReqPrsjob>(req);
      expect(req.jobpresetno).toBe(3110);
    });
  });

  describe("ReqJoboption", () => {
    it("should accept valid job option requirement", () => {
      const req: ReqJoboption = {
        optno: 100,
        optname: "Rounded corners",
      };
      assertType<ReqJoboption>(req);
      expect(req.optno).toBe(100);
    });
  });

  describe("ReqJobsize", () => {
    it("should accept valid job size requirement", () => {
      const req: ReqJobsize = {
        type: "input",
        unit: "mm",
        min: 10,
        max: 500,
        interval: 1,
      };
      assertType<ReqJobsize>(req);
      expect(req.type).toBe("input");
    });
  });

  describe("ReqJobqty", () => {
    it("should accept valid job quantity requirement", () => {
      const req: ReqJobqty = {
        type: "input",
        unit: "ea",
        min: 1,
        max: 100,
        interval: 1,
      };
      assertType<ReqJobqty>(req);
      expect(req.min).toBe(1);
    });
  });

  describe("RstOrdqty", () => {
    it("should accept valid order quantity restriction", () => {
      const rst: RstOrdqty = {
        ordqtymin: 1000,
        ordqtymax: 50000,
      };
      assertType<RstOrdqty>(rst);
      expect(rst.ordqtymin).toBe(1000);
    });
  });

  describe("RstPaper", () => {
    it("should accept valid paper restriction", () => {
      const rst: RstPaper = {
        paperno: 22927,
        papername: "Art paper 80g",
      };
      assertType<RstPaper>(rst);
      expect(rst.paperno).toBe(22927);
    });
  });

  describe("RstAwkjob", () => {
    it("should accept valid awkjob restriction", () => {
      const rst: RstAwkjob = {
        jobno: 36510,
        jobname: "Horizontal Cut",
      };
      assertType<RstAwkjob>(rst);
      expect(rst.jobno).toBe(36510);
    });
  });

  describe("RstPrsjob", () => {
    it("should accept valid prsjob restriction", () => {
      const rst: RstPrsjob = {
        jobno: 3230,
        jobname: "UV Print",
      };
      assertType<RstPrsjob>(rst);
      expect(rst.jobno).toBe(3230);
    });
  });

  describe("RstColor", () => {
    it("should accept valid color restriction", () => {
      const rst: RstColor = {
        colorno: 302,
        colorname: "Single-side Color",
      };
      assertType<RstColor>(rst);
      expect(rst.colorno).toBe(302);
    });
  });

  describe("RstSize", () => {
    it("should accept valid size restriction", () => {
      const rst: RstSize = {
        sizeno: 5498,
        sizename: "90x100",
      };
      assertType<RstSize>(rst);
      expect(rst.sizeno).toBe(5498);
    });
  });

  describe("RstJobqty", () => {
    it("should accept valid job quantity restriction", () => {
      const rst: RstJobqty = {
        type: "input",
        min: 1,
        max: 100,
      };
      assertType<RstJobqty>(rst);
      expect(rst.max).toBe(100);
    });
  });

  describe("RstCutcnt", () => {
    it("should accept valid cut count restriction", () => {
      const rst: RstCutcnt = {
        min: 1,
        max: 10,
      };
      assertType<RstCutcnt>(rst);
      expect(rst.min).toBe(1);
    });
  });

  describe("RequirementConstraint", () => {
    it("should accept valid requirement constraint", () => {
      const constraint: RequirementConstraint = {
        type: "required",
        source: { entity: "color", id: 302 },
        target: { entity: "prsjob", id: 3110 },
        data: { jobpresetno: 3110, jobno: 3110, jobname: "Offset Print" },
      };
      assertType<RequirementConstraint>(constraint);
      expect(constraint.type).toBe("required");
    });
  });

  describe("RestrictionConstraint", () => {
    it("should accept valid restriction constraint", () => {
      const constraint: RestrictionConstraint = {
        type: "restricted",
        source: { entity: "paper", id: 22927 },
        target: { entity: "prsjob", id: 3230 },
        data: { jobno: 3230, jobname: "UV Print" },
      };
      assertType<RestrictionConstraint>(constraint);
      expect(constraint.type).toBe("restricted");
    });
  });

  describe("ConstraintEvaluationResult", () => {
    it("should accept valid constraint evaluation result", () => {
      const result: ConstraintEvaluationResult = {
        isValid: true,
        requiredActivations: [],
        restrictedDeactivations: [],
        violations: [],
      };
      assertType<ConstraintEvaluationResult>(result);
      expect(result.isValid).toBe(true);
    });
  });
});
