/**
 * Option engine types for the product option selection system.
 *
 * These types model the cascading option selection flow:
 * jobPresetNo -> sizeNo -> paperNo -> optNo -> colorNo -> colorNoAdd
 */
import type { ReqWidth, ReqHeight } from "./constraint-types.js";

/** Current option selection state */
export interface OptionSelection {
  productId: string;
  jobPresetNo?: number;
  sizeNo?: number;
  paperNo?: number;
  optNo?: number;
  colorNo?: number;
  colorNoAdd?: number;
  coverCd: number;
  quantity?: number;
  awkjobSelections?: AwkjobSelection[];
}

/** Post-process selection by the user */
export interface AwkjobSelection {
  jobgroupno: number;
  jobno: number;
}

/** Available options response from the option engine */
export interface AvailableOptions {
  sizes: SizeOption[];
  papers: PaperOption[];
  colors: ColorOption[];
  printMethods: PrintMethodOption[];
  options: ProductOptionItem[];
  postProcesses: PostProcessGroup[];
  quantities: QuantityOption;
  constraints: ConstraintViolation[];
}

/** Constraint violation information */
export interface ConstraintViolation {
  type: "required" | "restricted";
  source: string;
  target: string;
  message: string;
}

/** Size option for display */
export interface SizeOption {
  sizeNo: number;
  sizeName: string;
  width: number;
  height: number;
  cutSize: number;
  isNonStandard: boolean;
  isAvailable: boolean;
  reqWidth: ReqWidth | null;
  reqHeight: ReqHeight | null;
}

/** Paper option for display */
export interface PaperOption {
  paperNo: number;
  paperName: string;
  paperGroup: string;
  pGram: number | null;
  isAvailable: boolean;
}

/** Color option for display */
export interface ColorOption {
  colorNo: number;
  colorName: string;
  pdfPage: number;
  isAdditional: boolean;
  isAvailable: boolean;
}

/** Print method option for display */
export interface PrintMethodOption {
  jobPresetNo: number;
  jobPreset: string;
  isAvailable: boolean;
}

/** Product option item for display (generic) */
export interface ProductOptionItem {
  optNo: number;
  optName: string;
  isAvailable: boolean;
}

/** Post-process awkjob item for display */
export interface AwkjobItem {
  jobno: number;
  jobname: string;
  namestep1: string;
  namestep2: string;
  unit: string;
  isAvailable: boolean;
}

/** Post-process group for display */
export interface PostProcessGroup {
  jobgroupno: number;
  jobgroup: string;
  type: string;
  displayloc: string;
  awkjoblist: AwkjobItem[];
}

/** Quantity option configuration */
export interface QuantityOption {
  displayType: string;
  minQty: number;
  maxQty: number;
  interval: number | null;
  qtyList: number[] | null;
}
