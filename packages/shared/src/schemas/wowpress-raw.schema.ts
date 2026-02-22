/**
 * Zod validation schemas for raw WowPress API JSON structures.
 *
 * These schemas validate the raw JSON format returned by WowPress
 * product detail API before transformation into internal models.
 *
 * Field names match WowPress API exactly (lowercase, no camelCase).
 */
import { z } from "zod";

// ============================================================
// Shared constraint schemas (req_* and rst_*)
// ============================================================

/** Input range requirement (used by req_width, req_height, req_jobsize, req_jobqty) */
export const InputRangeReqSchema = z.object({
  type: z.literal("input"),
  unit: z.string(),
  min: z.number().nullable(),
  max: z.number().nullable(),
  interval: z.number().optional(),
});

/** Job reference for req_awkjob, req_prsjob constraints */
export const JobRefSchema = z.object({
  jobno: z.number(),
  jobname: z.string(),
});

/** Print job reference with preset for req_prsjob on color */
export const PrsjobRefSchema = z.object({
  jobpresetno: z.number(),
  jobno: z.number(),
  jobname: z.string(),
});

/** Color reference for req_color */
export const ColorRefSchema = z.object({
  colorno: z.number(),
  colorname: z.string(),
});

/** Paper reference for rst_paper */
export const PaperRefSchema = z.object({
  paperno: z.number(),
  papername: z.string(),
});

/** Size reference for rst_size */
export const SizeRefSchema = z.object({
  sizeno: z.number(),
  sizename: z.string(),
});

/** Order quantity restriction (two variants in real data) */
export const OrdqtyRstSchema = z.union([
  z.object({
    ordqtymin: z.number(),
    ordqtymax: z.number(),
  }),
  z.object({
    unit: z.string().optional(),
    min: z.number(),
    max: z.number(),
  }),
]);

/** Job option reference for req_joboption */
export const JobOptionRefSchema = z.object({
  optno: z.number(),
  optname: z.string(),
});

/** Job quantity restriction for rst_jobqty */
export const JobqtyRstSchema = z.object({
  type: z.string().optional(),
  unit: z.string().optional(),
  min: z.number(),
  max: z.number(),
});

/** Cut count restriction for rst_cutcnt */
export const CutcntRstSchema = z.object({
  min: z.number(),
  max: z.number(),
});

// ============================================================
// Cover info
// ============================================================

/** Page within a cover type */
const PageSchema = z.object({
  pagecd: z.number(),
  pagename: z.string(),
});

/** Page count constraints */
const PageCntSchema = z.object({
  min: z.number().nullable(),
  max: z.number().nullable(),
  interval: z.number().nullable(),
});

/** Cover info entry */
export const CoverInfoSchema = z.object({
  covercd: z.number(),
  covername: z.string(),
  pagelist: z.array(PageSchema),
  pagecnt: PageCntSchema,
});

// ============================================================
// Size info
// ============================================================

/** Individual size item within a size list */
const SizeItemSchema = z.object({
  sizeno: z.number(),
  sizename: z.string(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  cutsize: z.number().nullable(),
  non_standard: z.boolean(),
  req_width: InputRangeReqSchema.nullable(),
  req_height: InputRangeReqSchema.nullable(),
  req_paper: z.unknown().nullable(),
  req_color: z.unknown().nullable(),
  req_awkjob: z.unknown().nullable(),
  rst_ordqty: OrdqtyRstSchema.nullable(),
  rst_awkjob: z.unknown().nullable(),
});

/** Size info entry grouped by covercd */
export const SizeInfoSchema = z.object({
  covercd: z.number(),
  sizelist: z.array(SizeItemSchema),
});

// ============================================================
// Paper info
// ============================================================

/** Individual paper item within a paper list */
const PaperItemSchema = z.object({
  paperno: z.number(),
  papername: z.string(),
  papergroup: z.string(),
  pgram: z.number().nullable(),
  req_width: InputRangeReqSchema.nullable(),
  req_height: InputRangeReqSchema.nullable(),
  req_awkjob: z.array(JobRefSchema).nullable(),
  rst_ordqty: OrdqtyRstSchema.nullable(),
  rst_prsjob: z.array(JobRefSchema).nullable(),
  rst_awkjob: z.array(JobRefSchema).nullable(),
});

/** Paper info entry grouped by covercd */
export const PaperInfoSchema = z.object({
  covercd: z.number(),
  paperlist: z.array(PaperItemSchema),
  ncr: z.unknown().nullable(),
});

// ============================================================
// Color info
// ============================================================

/** Individual color item */
const ColorItemSchema = z.object({
  colorno: z.number(),
  colorname: z.string(),
  pdfpage: z.number(),
  req_prsjob: z.array(PrsjobRefSchema).nullable(),
  req_awkjob: z.array(JobRefSchema).nullable(),
  rst_prsjob: z.array(JobRefSchema).nullable(),
  rst_awkjob: z.array(JobRefSchema).nullable(),
  rst_opt: z.unknown().nullable(),
});

/** Additional color item (uses colornoadd instead of colorno) */
const ColorAddItemSchema = z.object({
  colornoadd: z.number(),
  colorname: z.string(),
  pdfpage: z.number(),
  req_prsjob: z.array(PrsjobRefSchema).nullable(),
  req_awkjob: z.array(JobRefSchema).nullable(),
  rst_awkjob: z.array(JobRefSchema).nullable(),
}).passthrough();

/** Page with color list */
const ColorPageSchema = z.object({
  pagecd: z.number(),
  type: z.string(),
  colorlist: z.array(ColorItemSchema),
  addtype: z.string().nullable(),
  coloraddlist: z.array(ColorAddItemSchema).nullable(),
});

/** Color info entry grouped by covercd */
export const ColorInfoSchema = z.object({
  covercd: z.number(),
  pagelist: z.array(ColorPageSchema),
});

// ============================================================
// Order quantity
// ============================================================

/** Order quantity specification */
export const OrdQtySchema = z.object({
  type: z.string(),
  jobpresetno: z.number().nullable().optional(),
  sizeno: z.number().nullable().optional(),
  paperno: z.number().nullable().optional(),
  optno: z.number().nullable().optional(),
  colorno: z.number().nullable().optional(),
  colornoadd: z.number().nullable().optional(),
  ordqtymin: z.number(),
  ordqtymax: z.number(),
  ordqtyinterval: z.number().nullable().optional(),
  ordqtylist: z.array(z.number()).nullable().optional(),
});

// ============================================================
// Print job (prsjob) info
// ============================================================

/** Individual print job item within a preset */
const PrsjobItemSchema = z.object({
  covercd: z.number(),
  jobno: z.number(),
  jobname: z.string(),
  unit: z.string(),
  req_color: z.array(ColorRefSchema).nullable(),
  rst_paper: z.array(PaperRefSchema).nullable(),
  rst_awkjob: z.array(JobRefSchema).nullable(),
});

/** Print job info entry */
export const PrsjobInfoSchema = z.object({
  jobpresetno: z.number(),
  jobpreset: z.string(),
  prsjoblist: z.array(PrsjobItemSchema),
});

// ============================================================
// Awkjob (post-process) info
// ============================================================

/** Individual post-process job item.
 * Uses z.unknown() for constraint fields that have highly variable
 * structures across different product types in real catalog data. */
const AwkjobItemSchema = z.object({
  jobno: z.number(),
  jobname: z.string(),
  namestep1: z.string(),
  namestep2: z.string(),
  unit: z.string().nullable(),
  unitlist: z.unknown().nullable(),
  ck_page: z.unknown().nullable(),
  req_joboption: z.unknown().nullable(),
  req_jobsize: z.unknown().nullable(),
  req_jobqty: z.unknown().nullable(),
  req_awkjob: z.unknown().nullable(),
  rst_jobqty: z.unknown().nullable(),
  rst_cutcnt: z.unknown().nullable(),
  rst_size: z.unknown().nullable(),
  rst_paper: z.unknown().nullable(),
  rst_color: z.unknown().nullable(),
  rst_awkjob: z.unknown().nullable(),
});

/** Post-process job group */
const JobGroupSchema = z.object({
  jobgroupno: z.number(),
  jobgroup: z.string(),
  type: z.string(),
  displayloc: z.string().nullable(),
  awkjoblist: z.array(AwkjobItemSchema),
});

/** Post-process info entry grouped by covercd */
export const AwkjobInfoSchema = z.object({
  covercd: z.number(),
  type: z.string(),
  jobgrouplist: z.array(JobGroupSchema),
});

// ============================================================
// Delivery info
// ============================================================

/** Free shipping condition by member grade */
const DlvyFreeSchema = z.object({
  usrkd: z.number(),
  usrkdname: z.string().nullable(),
  mincost: z.number(),
});

/** Delivery method entry (passthrough for additional fields like dlvyloc, dlvytrans) */
const DlvyMethodSchema = z.object({
  dlvymcd: z.number(),
  dlvyname: z.string().optional(),
  dlvymcdname: z.string().optional(),
  costinit: z.number().optional(),
  dlvycost: z.number().optional(),
  dlvyloc: z.unknown().nullable().optional(),
  dlvytrans: z.array(z.string()).optional(),
}).passthrough();

/** Delivery info structure (passthrough for additional fields like dlvyloc) */
export const DeliverInfoSchema = z.object({
  dlvyfree: z.array(DlvyFreeSchema),
  dlvymcdlist: z.array(DlvyMethodSchema),
}).passthrough();

// ============================================================
// Complete product info (prod_info)
// ============================================================

/**
 * Full product info as returned by WowPress API.
 * Uses passthrough() to allow extra fields (prodaddinfo, ordmax, prodmsg, etc.)
 * that may be present in different product types.
 */
export const ProdInfoSchema = z.object({
  timestamp: z.string(),
  prodno: z.number(),
  prodname: z.string(),
  seltype: z.string(),
  pjoin: z.number(),
  unit: z.string(),
  ctptime: z.string().nullable().optional(),
  dlvyprepay: z.boolean().optional().default(false),
  dlvygrpno: z.number().nullable(),
  dlvygrpname: z.string().nullable(),
  filetype: z.string().nullable(),
  coverinfo: z.array(CoverInfoSchema),
  ordqty: z.array(OrdQtySchema),
  sizeinfo: z.array(SizeInfoSchema).nullable(),
  paperinfo: z.array(PaperInfoSchema).nullable(),
  colorinfo: z.array(ColorInfoSchema).nullable(),
  optioninfo: z.unknown().nullable(),
  prsjobinfo: z.array(PrsjobInfoSchema).nullable(),
  awkjobinfo: z.array(AwkjobInfoSchema).nullable(),
  deliverinfo: DeliverInfoSchema.nullable(),
}).passthrough();
