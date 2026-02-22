/**
 * Core product types for the print knowledge database.
 *
 * Maps to the Prisma schema models and the WowPress data model.
 * Uses JSON-compatible types for JSONB fields.
 */
import type {
  ReqWidth,
  ReqHeight,
  ReqAwkjob,
  ReqPrsjob,
  RstOrdqty,
  RstPrsjob,
  RstAwkjob,
} from "./constraint-types.js";

/** Hierarchical product category (max 3 levels deep) */
export interface ProductCategory {
  id: string;
  slug: string;
  displayName: string;
  parentId: string | null;
  level: number;
  productCount: number;
  keywords: string[];
  sortOrder: number;
}

/** Print product master record */
export interface PrintProduct {
  id: string;
  externalId: number;
  name: string;
  categoryId: string;
  selType: string;
  pjoin: number;
  unit: string;
  fileTypes: string[];
  coverInfo: unknown;
  deliveryGroupNo: number | null;
  deliveryGroupName: string | null;
  deliveryPrepay: boolean;
  cutoffTime: string | null;
  syncedAt: Date;
  rawData: unknown;
}

/** Product size specification */
export interface ProductSize {
  id: string;
  productId: string;
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

/** Product paper specification */
export interface ProductPaper {
  id: string;
  productId: string;
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

/** Product color specification */
export interface ProductColor {
  id: string;
  productId: string;
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

/** Print job list item within a print method */
export interface PrsjobListItem {
  covercd: number;
  jobno: number;
  jobname: string;
  unit: string;
  reqColor: { colorno: number; colorname: string }[] | null;
  rstPaper: { paperno: number; papername: string }[] | null;
  rstAwkjob: { jobno: number; jobname: string }[] | null;
}

/** Product print method (jobpreset) specification */
export interface ProductPrintMethod {
  id: string;
  productId: string;
  externalJobPresetNo: number;
  jobPreset: string;
  prsjobList: PrsjobListItem[];
  reqColor: { colorno: number; colorname: string }[] | null;
  rstPaper: { paperno: number; papername: string }[] | null;
  rstAwkjob: { jobno: number; jobname: string }[] | null;
}

/** Job group list item for post-processing */
export interface JobGroupListItem {
  jobgroupno: number;
  jobgroup: string;
  type: string;
  displayloc: string;
  awkjoblist: unknown[];
}

/** Product post-process specification */
export interface ProductPostProcess {
  id: string;
  productId: string;
  coverCd: number;
  inputType: string;
  jobGroupList: JobGroupListItem[];
}

/** Product order quantity specification */
export interface ProductOrderQty {
  id: string;
  productId: string;
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

/** Pricing table entry */
export interface PricingTable {
  id: string;
  productId: string;
  jobPresetNo: number | null;
  sizeNo: number | null;
  paperNo: number | null;
  colorNo: number | null;
  colorNoAdd: number | null;
  optNo: number | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

/** Delivery info for a product */
export interface DeliveryInfo {
  id: string;
  productId: string;
  freeShipping: unknown;
  methods: unknown;
  regions: unknown;
}
