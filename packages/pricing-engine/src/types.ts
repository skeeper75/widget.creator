/**
 * Internal types for the pricing engine.
 *
 * ProductData represents the complete option data for a product,
 * assembled from the various product entity types.
 */
import type {
  PrintProduct,
  ProductSize,
  ProductPaper,
  ProductColor,
  ProductPrintMethod,
  ProductPostProcess,
  ProductOrderQty,
} from "@widget-creator/shared";

/** Complete product data used by the option engine */
export interface ProductData {
  product: PrintProduct;
  sizes: ProductSize[];
  papers: ProductPaper[];
  colors: ProductColor[];
  printMethods: ProductPrintMethod[];
  postProcesses: ProductPostProcess[];
  orderQuantities: ProductOrderQty[];
}

/** Priority levels for the option selection chain */
export type OptionLevel =
  | "jobPreset"
  | "size"
  | "paper"
  | "option"
  | "color"
  | "colorAdd";

/** Result of selecting an option at a given level */
export interface OptionSelectionResult {
  selection: import("@widget-creator/shared").OptionSelection;
  availableOptions: import("@widget-creator/shared").AvailableOptions;
  resetLevels: OptionLevel[];
}
