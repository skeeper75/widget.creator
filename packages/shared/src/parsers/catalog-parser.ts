/**
 * Catalog data parser for WowPress JSON files.
 *
 * Parses catalog index, category files, and product files
 * from the WowPress data directory, transforming raw JSON
 * into typed internal models.
 */
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { ProdInfoSchema } from "../schemas/wowpress-raw.schema.js";
import type {
  ReqWidth,
  ReqHeight,
  ReqAwkjob,
  ReqPrsjob,
  RstOrdqty,
  RstPrsjob,
  RstAwkjob,
  PrsjobListItem,
  JobGroupListItem,
} from "../types/index.js";

// ============================================================
// Helper functions for type coercion
// ============================================================

/**
 * Coerce nullable number values to valid numbers for input range requirements.
 * Converts null/undefined to 0 (default minimum).
 */
function coerceInputRange(
  input: { type: "input"; unit: string; min: number | null; max: number | null; interval?: number }
): ReqWidth | ReqHeight {
  return {
    type: "input",
    unit: input.unit,
    min: input.min ?? 0,
    max: input.max ?? 0,
    interval: input.interval ?? 1,
  };
}

/**
 * Normalize RstOrdqty from two possible raw formats to the unified RstOrdqty type.
 * Raw data may have either { ordqtymin, ordqtymax } or { min, max } format.
 */
function normalizeRstOrdqty(
  input: { ordqtymin: number; ordqtymax: number } | { min: number; max: number; unit?: string }
): RstOrdqty {
  if ("ordqtymin" in input) {
    return {
      ordqtymin: input.ordqtymin,
      ordqtymax: input.ordqtymax,
    };
  } else {
    // Convert min/max format to ordqtymin/ordqtymax format
    return {
      ordqtymin: input.min,
      ordqtymax: input.max,
    };
  }
}

// ============================================================
// Parsed output types
// ============================================================

/** Category entry from catalog index */
export interface IndexCategory {
  id: string;
  slug: string;
  path: string[];
  displayName: string;
  productCount: number;
  keywords: string[];
  summary: string;
  file: string;
  sampleProducts: Array<{
    productId: number;
    name: string;
    slug: string;
  }>;
}

/** Parsed catalog index */
export interface ParsedCatalogIndex {
  generatedAt: string;
  source: string;
  productCount: number;
  categoryCount: number;
  categories: IndexCategory[];
}

/** Product summary within a category file */
export interface CategoryProductSummary {
  productId: number;
  name: string;
  slug: string;
  categories: string[];
  keywords: string[];
}

/** Parsed category file */
export interface ParsedCategory {
  category: {
    id: string;
    slug: string;
    path: string[];
    displayName: string;
    productCount: number;
    keywords: string[];
  };
  products: CategoryProductSummary[];
}

/** Parsed size record */
export interface ParsedSize {
  externalSizeNo: number;
  coverCd: number;
  sizeName: string;
  width: number;
  height: number;
  cutSize: number;
  isNonStandard: boolean;
  reqWidth: ReqWidth | null;
  reqHeight: ReqHeight | null;
  reqAwkjob: ReqAwkjob[] | null;
  rstOrdqty: RstOrdqty | null;
  rstAwkjob: RstAwkjob[] | null;
}

/** Parsed paper record */
export interface ParsedPaper {
  externalPaperNo: number;
  coverCd: number;
  paperName: string;
  paperGroup: string;
  pGram: number | null;
  reqWidth: ReqWidth | null;
  reqHeight: ReqHeight | null;
  reqAwkjob: ReqAwkjob[] | null;
  rstOrdqty: RstOrdqty | null;
  rstPrsjob: RstPrsjob[] | null;
  rstAwkjob: RstAwkjob[] | null;
}

/** Parsed color record */
export interface ParsedColor {
  externalColorNo: number;
  coverCd: number;
  pageCd: number;
  colorName: string;
  pdfPage: number;
  isAdditional: boolean;
  reqPrsjob: ReqPrsjob[] | null;
  reqAwkjob: ReqAwkjob[] | null;
  rstPrsjob: RstPrsjob[] | null;
  rstAwkjob: RstAwkjob[] | null;
}

/** Parsed print method record */
export interface ParsedPrintMethod {
  externalJobPresetNo: number;
  jobPreset: string;
  prsjobList: PrsjobListItem[];
  reqColor: { colorno: number; colorname: string }[] | null;
  rstPaper: { paperno: number; papername: string }[] | null;
  rstAwkjob: { jobno: number; jobname: string }[] | null;
}

/** Parsed post-process record */
export interface ParsedPostProcess {
  coverCd: number;
  inputType: string;
  jobGroupList: JobGroupListItem[];
}

/** Parsed order quantity record */
export interface ParsedOrderQty {
  displayType: string;
  jobPresetNo: number | null;
  sizeNo: number | null;
  paperNo: number | null;
  optNo: number | null;
  colorNo: number | null;
  colorNoAdd: number | null;
  minQty: number;
  maxQty: number;
  interval: number | null;
  qtyList: number[] | null;
}

/** Parsed delivery info */
export interface ParsedDeliveryInfo {
  freeShipping: unknown;
  methods: unknown;
  regions: unknown;
}

/** Parsed product from a product JSON file */
export interface ParsedProduct {
  externalId: number;
  name: string;
  categoryPath: string[];
  selType: string;
  pjoin: number;
  unit: string;
  fileTypes: string[];
  coverInfo: unknown;
  deliveryGroupNo: number | null;
  deliveryGroupName: string | null;
  deliveryPrepay: boolean;
  cutoffTime: string | null;
  sizes: ParsedSize[];
  papers: ParsedPaper[];
  colors: ParsedColor[];
  printMethods: ParsedPrintMethod[];
  postProcesses: ParsedPostProcess[];
  orderQtys: ParsedOrderQty[];
  deliveryInfo: ParsedDeliveryInfo | null;
  rawData: unknown;
}

// ============================================================
// Parsing functions
// ============================================================

/**
 * Parse the catalog index file.
 *
 * @param indexPath - Absolute path to index.json
 * @returns Parsed catalog index with category metadata
 */
export async function parseCatalogIndex(
  indexPath: string,
): Promise<ParsedCatalogIndex> {
  const content = await fs.readFile(indexPath, "utf-8");
  const data = JSON.parse(content);

  return {
    generatedAt: data.generatedAt,
    source: data.source,
    productCount: data.productCount,
    categoryCount: data.categoryCount,
    categories: data.categories.map(
      (cat: Record<string, unknown>) => ({
        id: cat.id,
        slug: cat.slug,
        path: cat.path,
        displayName: cat.displayName,
        productCount: cat.productCount,
        keywords: cat.keywords,
        summary: cat.summary,
        file: cat.file,
        sampleProducts: cat.sampleProducts,
      }),
    ),
  };
}

/**
 * Parse a single category JSON file.
 *
 * @param filePath - Absolute path to a category JSON file
 * @returns Parsed category with product summaries
 */
export async function parseCategoryFile(
  filePath: string,
): Promise<ParsedCategory> {
  const content = await fs.readFile(filePath, "utf-8");
  const data = JSON.parse(content);

  return {
    category: {
      id: data.category.id,
      slug: data.category.slug,
      path: data.category.path,
      displayName: data.category.displayName,
      productCount: data.category.productCount,
      keywords: data.category.keywords,
    },
    products: data.products.map(
      (p: Record<string, unknown>) => ({
        productId: p.productId,
        name: p.name,
        slug: p.slug,
        categories: p.categories ?? [],
        keywords: p.keywords ?? [],
      }),
    ),
  };
}

/**
 * Parse a single product JSON file.
 *
 * Reads the raw WowPress product file, validates the prod_info
 * with Zod schemas, and transforms to internal types.
 *
 * @param filePath - Absolute path to a product JSON file
 * @returns Parsed product with all sub-records
 */
export async function parseProductFile(
  filePath: string,
): Promise<ParsedProduct> {
  const content = await fs.readFile(filePath, "utf-8");
  const fileData = JSON.parse(content);

  if (!fileData || !fileData.raw || !fileData.raw.prod_info) {
    throw new Error(`Invalid product file structure: ${filePath}`);
  }

  const prodInfo = ProdInfoSchema.parse(fileData.raw.prod_info);

  // Extract sizes
  const sizes: ParsedSize[] = [];
  for (const sizeGroup of prodInfo.sizeinfo ?? []) {
    for (const size of sizeGroup.sizelist) {
      // rst_awkjob on sizes can be either JobRef[] or complex objects - normalize
      let rstAwkjob: RstAwkjob[] | null = null;
      if (Array.isArray(size.rst_awkjob)) {
        const items = size.rst_awkjob as unknown[];
        // Only use JobRef-shaped items; skip complex restriction objects
        const jobRefs = items.filter(
          (item): item is RstAwkjob =>
            typeof item === "object" &&
            item !== null &&
            "jobno" in item &&
            "jobname" in item,
        );
        rstAwkjob = jobRefs.length > 0 ? jobRefs : null;
      }

      sizes.push({
        externalSizeNo: size.sizeno,
        coverCd: sizeGroup.covercd,
        sizeName: size.sizename,
        width: size.width ?? 0,
        height: size.height ?? 0,
        cutSize: size.cutsize ?? 0,
        isNonStandard: size.non_standard,
        reqWidth: size.req_width ? coerceInputRange(size.req_width) : null,
        reqHeight: size.req_height ? coerceInputRange(size.req_height) : null,
        reqAwkjob: Array.isArray(size.req_awkjob)
          ? (size.req_awkjob as ReqAwkjob[])
          : null,
        rstOrdqty: size.rst_ordqty ? normalizeRstOrdqty(size.rst_ordqty) : null,
        rstAwkjob,
      });
    }
  }

  // Extract papers
  const papers: ParsedPaper[] = [];
  for (const paperGroup of prodInfo.paperinfo ?? []) {
    for (const paper of paperGroup.paperlist) {
      papers.push({
        externalPaperNo: paper.paperno,
        coverCd: paperGroup.covercd,
        paperName: paper.papername,
        paperGroup: paper.papergroup,
        pGram: paper.pgram ?? null,
        reqWidth: paper.req_width ? coerceInputRange(paper.req_width) : null,
        reqHeight: paper.req_height ? coerceInputRange(paper.req_height) : null,
        reqAwkjob: paper.req_awkjob ?? null,
        rstOrdqty: paper.rst_ordqty ? normalizeRstOrdqty(paper.rst_ordqty) : null,
        rstPrsjob: paper.rst_prsjob ?? null,
        rstAwkjob: paper.rst_awkjob ?? null,
      });
    }
  }

  // Extract colors
  const colors: ParsedColor[] = [];
  for (const colorGroup of prodInfo.colorinfo ?? []) {
    for (const page of colorGroup.pagelist) {
      // Regular colors
      for (const color of page.colorlist) {
        colors.push({
          externalColorNo: color.colorno,
          coverCd: colorGroup.covercd,
          pageCd: page.pagecd,
          colorName: color.colorname,
          pdfPage: color.pdfpage,
          isAdditional: false,
          reqPrsjob: color.req_prsjob ?? null,
          reqAwkjob: color.req_awkjob ?? null,
          rstPrsjob: color.rst_prsjob ?? null,
          rstAwkjob: color.rst_awkjob ?? null,
        });
      }
      // Additional colors (use colornoadd instead of colorno)
      if (page.coloraddlist) {
        for (const addColor of page.coloraddlist) {
          colors.push({
            externalColorNo: addColor.colornoadd,
            coverCd: colorGroup.covercd,
            pageCd: page.pagecd,
            colorName: addColor.colorname,
            pdfPage: addColor.pdfpage,
            isAdditional: true,
            reqPrsjob: addColor.req_prsjob ?? null,
            reqAwkjob: addColor.req_awkjob ?? null,
            rstPrsjob: null,
            rstAwkjob: addColor.rst_awkjob ?? null,
          });
        }
      }
    }
  }

  // Extract print methods
  const printMethods: ParsedPrintMethod[] = (prodInfo.prsjobinfo ?? []).map((pj) => ({
    externalJobPresetNo: pj.jobpresetno,
    jobPreset: pj.jobpreset,
    prsjobList: pj.prsjoblist.map((item) => ({
      covercd: item.covercd,
      jobno: item.jobno,
      jobname: item.jobname,
      unit: item.unit,
      reqColor: item.req_color ?? null,
      rstPaper: item.rst_paper ?? null,
      rstAwkjob: item.rst_awkjob ?? null,
    })),
    reqColor: null,
    rstPaper: null,
    rstAwkjob: null,
  }));

  // Extract post-processes
  const postProcesses: ParsedPostProcess[] = (prodInfo.awkjobinfo ?? []).map((aj) => ({
    coverCd: aj.covercd,
    inputType: aj.type,
    jobGroupList: aj.jobgrouplist.map((jg) => ({
      jobgroupno: jg.jobgroupno,
      jobgroup: jg.jobgroup,
      type: jg.type,
      displayloc: jg.displayloc ?? "",
      awkjoblist: jg.awkjoblist,
    })),
  }));

  // Extract order quantities
  const orderQtys: ParsedOrderQty[] = prodInfo.ordqty.map((oq) => ({
    displayType: oq.type,
    jobPresetNo: oq.jobpresetno ?? null,
    sizeNo: oq.sizeno ?? null,
    paperNo: oq.paperno ?? null,
    optNo: oq.optno ?? null,
    colorNo: oq.colorno ?? null,
    colorNoAdd: oq.colornoadd ?? null,
    minQty: oq.ordqtymin,
    maxQty: oq.ordqtymax,
    interval: oq.ordqtyinterval ?? null,
    qtyList: oq.ordqtylist ?? null,
  }));

  // Extract delivery info
  let deliveryInfo: ParsedDeliveryInfo | null = null;
  if (prodInfo.deliverinfo) {
    deliveryInfo = {
      freeShipping: prodInfo.deliverinfo.dlvyfree,
      methods: prodInfo.deliverinfo.dlvymcdlist,
      regions: (prodInfo.deliverinfo as Record<string, unknown>).dlvyloc ?? null,
    };
  }

  return {
    externalId: prodInfo.prodno,
    name: prodInfo.prodname,
    categoryPath: fileData.categoryPath ?? [],
    selType: prodInfo.seltype,
    pjoin: prodInfo.pjoin,
    unit: prodInfo.unit,
    fileTypes: prodInfo.filetype
      ? prodInfo.filetype.split(",").map((s: string) => s.trim())
      : [],
    coverInfo: prodInfo.coverinfo,
    deliveryGroupNo: prodInfo.dlvygrpno ?? null,
    deliveryGroupName: prodInfo.dlvygrpname ?? null,
    deliveryPrepay: prodInfo.dlvyprepay,
    cutoffTime: prodInfo.ctptime === "null" || !prodInfo.ctptime ? null : prodInfo.ctptime,
    sizes,
    papers,
    colors,
    printMethods,
    postProcesses,
    orderQtys,
    deliveryInfo,
    rawData: prodInfo,
  };
}

/**
 * Parse all product files from the catalog directory.
 *
 * @param catalogDir - Absolute path to the catalog directory
 * @returns Array of parsed products
 */
export async function parseAllProducts(
  catalogDir: string,
): Promise<ParsedProduct[]> {
  const productsDir = path.join(catalogDir, "products");
  const files = await fs.readdir(productsDir);
  const jsonFiles = files.filter((f) => f.endsWith(".json"));

  const results: ParsedProduct[] = [];
  for (const file of jsonFiles) {
    const filePath = path.join(productsDir, file);
    try {
      const product = await parseProductFile(filePath);
      results.push(product);
    } catch (err) {
      // Log warning but continue with other products
      console.warn(`Warning: Failed to parse ${file}: ${(err as Error).message}`);
    }
  }

  return results;
}
