/**
 * Shared test fixtures for the pricing engine tests.
 *
 * Three product profiles representing increasing complexity:
 * - Simple: sticker product (pjoin=0, no constraints)
 * - Medium: flyer product (pjoin=0, combination qty)
 * - Complex: book product (pjoin=1, post-processes with constraints)
 */
import type {
  ProductSize,
  ProductPaper,
  ProductColor,
  ProductPrintMethod,
  ProductPostProcess,
  ProductOrderQty,
  PrintProduct,
  JobGroupListItem,
} from "@widget-creator/shared";
import type { ProductData } from "../types.js";

// Re-export ProductData from the canonical location
export type { ProductData };

// ============================================================
// Simple product fixture: Sticker (40007-like, pjoin=0)
// ============================================================

export function createSimpleProduct(): ProductData {
  const product: PrintProduct = {
    id: "prod-simple-001",
    externalId: 40007,
    name: "Sticker",
    categoryId: "cat-sticker",
    selType: "option",
    pjoin: 0,
    unit: "ea",
    fileTypes: ["pdf", "ai"],
    coverInfo: null,
    deliveryGroupNo: 1,
    deliveryGroupName: "Standard",
    deliveryPrepay: false,
    cutoffTime: "14:00",
    syncedAt: new Date("2025-01-01"),
    rawData: null,
  };

  const sizes: ProductSize[] = [
    {
      id: "size-001",
      productId: "prod-simple-001",
      externalSizeNo: 5001,
      coverCd: 0,
      sizeName: "90x50mm",
      width: 90,
      height: 50,
      cutSize: 2,
      isNonStandard: false,
      reqWidth: null,
      reqHeight: null,
      reqAwkjob: null,
      rstOrdqty: null,
      rstAwkjob: null,
    },
    {
      id: "size-002",
      productId: "prod-simple-001",
      externalSizeNo: 5002,
      coverCd: 0,
      sizeName: "100x100mm",
      width: 100,
      height: 100,
      cutSize: 2,
      isNonStandard: false,
      reqWidth: null,
      reqHeight: null,
      reqAwkjob: null,
      rstOrdqty: null,
      rstAwkjob: null,
    },
  ];

  const papers: ProductPaper[] = [
    {
      id: "paper-001",
      productId: "prod-simple-001",
      externalPaperNo: 2001,
      coverCd: 0,
      paperName: "Art Paper 250g",
      paperGroup: "Art Paper",
      pGram: 250,
      reqWidth: null,
      reqHeight: null,
      reqAwkjob: null,
      rstOrdqty: null,
      rstPrsjob: null,
      rstAwkjob: null,
    },
    {
      id: "paper-002",
      productId: "prod-simple-001",
      externalPaperNo: 2002,
      coverCd: 0,
      paperName: "Matte Paper 300g",
      paperGroup: "Matte Paper",
      pGram: 300,
      reqWidth: null,
      reqHeight: null,
      reqAwkjob: null,
      rstOrdqty: null,
      rstPrsjob: null,
      rstAwkjob: null,
    },
  ];

  const colors: ProductColor[] = [
    {
      id: "color-001",
      productId: "prod-simple-001",
      externalColorNo: 301,
      coverCd: 0,
      pageCd: 0,
      colorName: "4/0 (Full Color Front)",
      pdfPage: 1,
      isAdditional: false,
      reqPrsjob: null,
      reqAwkjob: null,
      rstPrsjob: null,
      rstAwkjob: null,
    },
    {
      id: "color-002",
      productId: "prod-simple-001",
      externalColorNo: 302,
      coverCd: 0,
      pageCd: 0,
      colorName: "4/4 (Full Color Both)",
      pdfPage: 2,
      isAdditional: false,
      reqPrsjob: null,
      reqAwkjob: null,
      rstPrsjob: null,
      rstAwkjob: null,
    },
  ];

  const printMethods: ProductPrintMethod[] = [];

  const postProcesses: ProductPostProcess[] = [];

  const orderQuantities: ProductOrderQty[] = [
    {
      id: "qty-001",
      productId: "prod-simple-001",
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
      qtyList: [100, 200, 300, 500, 1000, 2000, 3000, 5000, 10000],
    },
  ];

  return {
    product,
    sizes,
    papers,
    colors,
    printMethods,
    postProcesses,
    orderQuantities,
  };
}

// ============================================================
// Medium product fixture: Flyer (40026-like, pjoin=0, constraints, combination qty)
// ============================================================

export function createMediumProduct(): ProductData {
  const product: PrintProduct = {
    id: "prod-medium-001",
    externalId: 40026,
    name: "Flyer",
    categoryId: "cat-flyer",
    selType: "option",
    pjoin: 0,
    unit: "ea",
    fileTypes: ["pdf", "ai"],
    coverInfo: null,
    deliveryGroupNo: 1,
    deliveryGroupName: "Standard",
    deliveryPrepay: false,
    cutoffTime: "14:00",
    syncedAt: new Date("2025-01-01"),
    rawData: null,
  };

  const sizes: ProductSize[] = [
    {
      id: "size-m-001",
      productId: "prod-medium-001",
      externalSizeNo: 5010,
      coverCd: 0,
      sizeName: "A4",
      width: 210,
      height: 297,
      cutSize: 3,
      isNonStandard: false,
      reqWidth: null,
      reqHeight: null,
      reqAwkjob: null,
      rstOrdqty: null,
      rstAwkjob: null,
    },
    {
      id: "size-m-002",
      productId: "prod-medium-001",
      externalSizeNo: 5011,
      coverCd: 0,
      sizeName: "A3",
      width: 297,
      height: 420,
      cutSize: 3,
      isNonStandard: false,
      reqWidth: null,
      reqHeight: null,
      reqAwkjob: null,
      rstOrdqty: { ordqtymin: 500, ordqtymax: 50000 },
      rstAwkjob: null,
    },
    {
      id: "size-m-003",
      productId: "prod-medium-001",
      externalSizeNo: 5493,
      coverCd: 0,
      sizeName: "Non-standard",
      width: 0,
      height: 0,
      cutSize: 3,
      isNonStandard: true,
      reqWidth: { type: "input", unit: "mm", min: 50, max: 900, interval: 1 },
      reqHeight: { type: "input", unit: "mm", min: 50, max: 640, interval: 1 },
      reqAwkjob: null,
      rstOrdqty: null,
      rstAwkjob: null,
    },
  ];

  const papers: ProductPaper[] = [
    {
      id: "paper-m-001",
      productId: "prod-medium-001",
      externalPaperNo: 2010,
      coverCd: 0,
      paperName: "Art Paper 150g",
      paperGroup: "Art Paper",
      pGram: 150,
      reqWidth: null,
      reqHeight: null,
      reqAwkjob: null,
      rstOrdqty: null,
      rstPrsjob: null,
      rstAwkjob: null,
    },
    {
      id: "paper-m-002",
      productId: "prod-medium-001",
      externalPaperNo: 2011,
      coverCd: 0,
      paperName: "Snow White 200g",
      paperGroup: "Snow White",
      pGram: 200,
      reqWidth: null,
      reqHeight: null,
      reqAwkjob: null,
      rstOrdqty: null,
      rstPrsjob: [{ jobno: 3200, jobname: "Digital Print" }],
      rstAwkjob: null,
    },
    {
      id: "paper-m-003",
      productId: "prod-medium-001",
      externalPaperNo: 2012,
      coverCd: 0,
      paperName: "Kraft Paper 120g",
      paperGroup: "Kraft",
      pGram: 120,
      reqWidth: null,
      reqHeight: null,
      reqAwkjob: [{ jobno: 30010, jobname: "Lamination" }],
      rstOrdqty: null,
      rstPrsjob: null,
      rstAwkjob: [{ jobno: 30020, jobname: "UV Spot Coating" }],
    },
  ];

  const colors: ProductColor[] = [
    {
      id: "color-m-001",
      productId: "prod-medium-001",
      externalColorNo: 301,
      coverCd: 0,
      pageCd: 0,
      colorName: "4/0 (Full Color Front)",
      pdfPage: 1,
      isAdditional: false,
      reqPrsjob: null,
      reqAwkjob: null,
      rstPrsjob: null,
      rstAwkjob: null,
    },
    {
      id: "color-m-002",
      productId: "prod-medium-001",
      externalColorNo: 302,
      coverCd: 0,
      pageCd: 0,
      colorName: "4/4 (Full Color Both)",
      pdfPage: 2,
      isAdditional: false,
      reqPrsjob: [{ jobpresetno: 3110, jobno: 3110, jobname: "Offset Print" }],
      reqAwkjob: null,
      rstPrsjob: null,
      rstAwkjob: null,
    },
    {
      id: "color-m-003",
      productId: "prod-medium-001",
      externalColorNo: 303,
      coverCd: 0,
      pageCd: 0,
      colorName: "1/0 (Mono Front)",
      pdfPage: 1,
      isAdditional: false,
      reqPrsjob: null,
      reqAwkjob: null,
      rstPrsjob: null,
      rstAwkjob: null,
    },
  ];

  const printMethods: ProductPrintMethod[] = [
    {
      id: "pm-m-001",
      productId: "prod-medium-001",
      externalJobPresetNo: 3110,
      jobPreset: "Offset Print",
      prsjobList: [
        {
          covercd: 0,
          jobno: 3110,
          jobname: "Offset Print",
          unit: "ea",
          reqColor: [{ colorno: 302, colorname: "4/4" }],
          rstPaper: null,
          rstAwkjob: null,
        },
      ],
      reqColor: [{ colorno: 302, colorname: "4/4" }],
      rstPaper: null,
      rstAwkjob: null,
    },
    {
      id: "pm-m-002",
      productId: "prod-medium-001",
      externalJobPresetNo: 3200,
      jobPreset: "Digital Print",
      prsjobList: [
        {
          covercd: 0,
          jobno: 3200,
          jobname: "Digital Print",
          unit: "ea",
          reqColor: null,
          rstPaper: [{ paperno: 2011, papername: "Snow White 200g" }],
          rstAwkjob: null,
        },
      ],
      reqColor: null,
      rstPaper: [{ paperno: 2011, papername: "Snow White 200g" }],
      rstAwkjob: null,
    },
  ];

  const postProcesses: ProductPostProcess[] = [
    {
      id: "pp-m-001",
      productId: "prod-medium-001",
      coverCd: 0,
      inputType: "checkbox",
      jobGroupList: [
        {
          jobgroupno: 10000,
          jobgroup: "Coating",
          type: "checkbox",
          displayloc: "bottom",
          awkjoblist: [
            {
              awkjobno: 30010,
              awkjobname: "Lamination",
              inputtype: "checkbox",
              req_joboption: null,
              req_jobsize: null,
              req_jobqty: null,
              req_awkjob: null,
              rst_jobqty: null,
              rst_cutcnt: null,
              rst_size: null,
              rst_paper: null,
              rst_color: null,
              rst_awkjob: [{ jobno: 30020, jobname: "UV Spot Coating" }],
            },
            {
              awkjobno: 30020,
              awkjobname: "UV Spot Coating",
              inputtype: "checkbox",
              req_joboption: null,
              req_jobsize: null,
              req_jobqty: null,
              req_awkjob: null,
              rst_jobqty: null,
              rst_cutcnt: null,
              rst_size: null,
              rst_paper: null,
              rst_color: null,
              rst_awkjob: [{ jobno: 30010, jobname: "Lamination" }],
            },
          ],
        },
      ],
    },
  ];

  // Combination type quantities: different qty configs per size
  const orderQuantities: ProductOrderQty[] = [
    {
      id: "qty-m-001",
      productId: "prod-medium-001",
      displayType: "list",
      jobPresetNo: null,
      sizeNo: 5010,
      paperNo: null,
      optNo: null,
      colorNo: null,
      colorNoAdd: null,
      minQty: 100,
      maxQty: 5000,
      interval: null,
      qtyList: [100, 200, 500, 1000, 2000, 5000],
    },
    {
      id: "qty-m-002",
      productId: "prod-medium-001",
      displayType: "list",
      jobPresetNo: null,
      sizeNo: 5011,
      paperNo: null,
      optNo: null,
      colorNo: null,
      colorNoAdd: null,
      minQty: 500,
      maxQty: 50000,
      interval: null,
      qtyList: [500, 1000, 2000, 5000, 10000, 50000],
    },
    {
      id: "qty-m-003",
      productId: "prod-medium-001",
      displayType: "input",
      jobPresetNo: null,
      sizeNo: 5493,
      paperNo: null,
      optNo: null,
      colorNo: null,
      colorNoAdd: null,
      minQty: 100,
      maxQty: 10000,
      interval: 100,
      qtyList: null,
    },
  ];

  return {
    product,
    sizes,
    papers,
    colors,
    printMethods,
    postProcesses,
    orderQuantities,
  };
}

// ============================================================
// Complex product fixture: Book (pjoin=1, cover separation, post-processes)
// ============================================================

export function createComplexProduct(): ProductData {
  const product: PrintProduct = {
    id: "prod-complex-001",
    externalId: 50001,
    name: "Perfect Bound Book",
    categoryId: "cat-book",
    selType: "option",
    pjoin: 1,
    unit: "ea",
    fileTypes: ["pdf"],
    coverInfo: {
      covers: [
        { covercd: 1, covername: "Cover" },
        { covercd: 2, covername: "Inner Pages" },
      ],
    },
    deliveryGroupNo: 2,
    deliveryGroupName: "Book Delivery",
    deliveryPrepay: false,
    cutoffTime: "12:00",
    syncedAt: new Date("2025-01-01"),
    rawData: null,
  };

  // Sizes are shared across cover types
  const sizes: ProductSize[] = [
    {
      id: "size-c-001",
      productId: "prod-complex-001",
      externalSizeNo: 5020,
      coverCd: 0,
      sizeName: "A5",
      width: 148,
      height: 210,
      cutSize: 3,
      isNonStandard: false,
      reqWidth: null,
      reqHeight: null,
      reqAwkjob: null,
      rstOrdqty: null,
      rstAwkjob: null,
    },
    {
      id: "size-c-002",
      productId: "prod-complex-001",
      externalSizeNo: 5021,
      coverCd: 0,
      sizeName: "B5",
      width: 176,
      height: 250,
      cutSize: 3,
      isNonStandard: false,
      reqWidth: null,
      reqHeight: null,
      reqAwkjob: null,
      rstOrdqty: null,
      rstAwkjob: [{ jobno: 40010, jobname: "Gold Foil Stamping" }],
    },
  ];

  // Papers are independent per cover type
  const papers: ProductPaper[] = [
    // Cover papers (coverCd=1)
    {
      id: "paper-c-001",
      productId: "prod-complex-001",
      externalPaperNo: 2020,
      coverCd: 1,
      paperName: "Art Paper 300g",
      paperGroup: "Art Paper",
      pGram: 300,
      reqWidth: null,
      reqHeight: null,
      reqAwkjob: null,
      rstOrdqty: null,
      rstPrsjob: null,
      rstAwkjob: null,
    },
    {
      id: "paper-c-002",
      productId: "prod-complex-001",
      externalPaperNo: 2021,
      coverCd: 1,
      paperName: "Leatherette",
      paperGroup: "Special",
      pGram: null,
      reqWidth: null,
      reqHeight: null,
      reqAwkjob: null,
      rstOrdqty: null,
      rstPrsjob: null,
      rstAwkjob: [{ jobno: 30010, jobname: "Lamination" }],
    },
    // Inner page papers (coverCd=2)
    {
      id: "paper-c-003",
      productId: "prod-complex-001",
      externalPaperNo: 2030,
      coverCd: 2,
      paperName: "Book Paper 80g",
      paperGroup: "Book Paper",
      pGram: 80,
      reqWidth: null,
      reqHeight: null,
      reqAwkjob: null,
      rstOrdqty: null,
      rstPrsjob: null,
      rstAwkjob: null,
    },
    {
      id: "paper-c-004",
      productId: "prod-complex-001",
      externalPaperNo: 2031,
      coverCd: 2,
      paperName: "Art Paper 100g",
      paperGroup: "Art Paper",
      pGram: 100,
      reqWidth: null,
      reqHeight: null,
      reqAwkjob: null,
      rstOrdqty: null,
      rstPrsjob: null,
      rstAwkjob: null,
    },
  ];

  // Colors are independent per cover type
  const colors: ProductColor[] = [
    // Cover colors (coverCd=1)
    {
      id: "color-c-001",
      productId: "prod-complex-001",
      externalColorNo: 310,
      coverCd: 1,
      pageCd: 0,
      colorName: "4/4 Cover",
      pdfPage: 2,
      isAdditional: false,
      reqPrsjob: null,
      reqAwkjob: null,
      rstPrsjob: null,
      rstAwkjob: null,
    },
    {
      id: "color-c-002",
      productId: "prod-complex-001",
      externalColorNo: 311,
      coverCd: 1,
      pageCd: 0,
      colorName: "4/0 Cover",
      pdfPage: 1,
      isAdditional: false,
      reqPrsjob: null,
      reqAwkjob: null,
      rstPrsjob: null,
      rstAwkjob: null,
    },
    // Inner page colors (coverCd=2)
    {
      id: "color-c-003",
      productId: "prod-complex-001",
      externalColorNo: 320,
      coverCd: 2,
      pageCd: 0,
      colorName: "4/4 Inner",
      pdfPage: 2,
      isAdditional: false,
      reqPrsjob: null,
      reqAwkjob: null,
      rstPrsjob: null,
      rstAwkjob: null,
    },
    {
      id: "color-c-004",
      productId: "prod-complex-001",
      externalColorNo: 321,
      coverCd: 2,
      pageCd: 0,
      colorName: "1/1 Inner",
      pdfPage: 2,
      isAdditional: false,
      reqPrsjob: null,
      reqAwkjob: null,
      rstPrsjob: null,
      rstAwkjob: null,
    },
  ];

  const printMethods: ProductPrintMethod[] = [
    {
      id: "pm-c-001",
      productId: "prod-complex-001",
      externalJobPresetNo: 3110,
      jobPreset: "Offset Print",
      prsjobList: [
        {
          covercd: 1,
          jobno: 3110,
          jobname: "Offset Print (Cover)",
          unit: "ea",
          reqColor: null,
          rstPaper: null,
          rstAwkjob: null,
        },
        {
          covercd: 2,
          jobno: 3111,
          jobname: "Offset Print (Inner)",
          unit: "ea",
          reqColor: null,
          rstPaper: null,
          rstAwkjob: null,
        },
      ],
      reqColor: null,
      rstPaper: null,
      rstAwkjob: null,
    },
  ];

  const postProcesses: ProductPostProcess[] = [
    // Cover post-processes (coverCd=1)
    {
      id: "pp-c-001",
      productId: "prod-complex-001",
      coverCd: 1,
      inputType: "checkbox",
      jobGroupList: [
        {
          jobgroupno: 10000,
          jobgroup: "Coating",
          type: "checkbox",
          displayloc: "bottom",
          awkjoblist: [
            {
              awkjobno: 30010,
              awkjobname: "Lamination",
              inputtype: "checkbox",
              req_joboption: null,
              req_jobsize: null,
              req_jobqty: null,
              req_awkjob: null,
              rst_jobqty: null,
              rst_cutcnt: null,
              rst_size: null,
              rst_paper: [{ paperno: 2021, papername: "Leatherette" }],
              rst_color: null,
              rst_awkjob: null,
            },
          ],
        },
        {
          jobgroupno: 20000,
          jobgroup: "Foil Stamping",
          type: "checkbox",
          displayloc: "bottom",
          awkjoblist: [
            {
              awkjobno: 40010,
              awkjobname: "Gold Foil Stamping",
              inputtype: "checkbox",
              req_joboption: null,
              req_jobsize: {
                type: "input",
                unit: "mm",
                min: 10,
                max: 200,
                interval: 1,
              },
              req_jobqty: null,
              req_awkjob: null,
              rst_jobqty: null,
              rst_cutcnt: null,
              rst_size: [{ sizeno: 5021, sizename: "B5" }],
              rst_paper: null,
              rst_color: null,
              rst_awkjob: null,
            },
          ],
        },
        // Bookbinding post-process (must be under coverCd=1 for API)
        {
          jobgroupno: 25000,
          jobgroup: "Bookbinding",
          type: "radio",
          displayloc: "top",
          awkjoblist: [
            {
              awkjobno: 50010,
              awkjobname: "Perfect Binding",
              inputtype: "radio",
              req_joboption: null,
              req_jobsize: null,
              req_jobqty: null,
              req_awkjob: null,
              rst_jobqty: null,
              rst_cutcnt: null,
              rst_size: null,
              rst_paper: null,
              rst_color: null,
              rst_awkjob: [{ jobno: 50020, jobname: "Saddle Stitch" }],
            },
            {
              awkjobno: 50020,
              awkjobname: "Saddle Stitch",
              inputtype: "radio",
              req_joboption: null,
              req_jobsize: null,
              req_jobqty: null,
              req_awkjob: null,
              rst_jobqty: null,
              rst_cutcnt: null,
              rst_size: null,
              rst_paper: null,
              rst_color: null,
              rst_awkjob: [{ jobno: 50010, jobname: "Perfect Binding" }],
            },
          ],
        },
      ],
    },
  ];

  const orderQuantities: ProductOrderQty[] = [
    {
      id: "qty-c-001",
      productId: "prod-complex-001",
      displayType: "list",
      jobPresetNo: null,
      sizeNo: null,
      paperNo: null,
      optNo: null,
      colorNo: null,
      colorNoAdd: null,
      minQty: 50,
      maxQty: 5000,
      interval: null,
      qtyList: [50, 100, 200, 300, 500, 1000, 2000, 5000],
    },
  ];

  return {
    product,
    sizes,
    papers,
    colors,
    printMethods,
    postProcesses,
    orderQuantities,
  };
}
