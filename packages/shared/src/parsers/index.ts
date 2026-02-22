/**
 * Barrel export for all parsers.
 */
export {
  parseCatalogIndex,
  parseCategoryFile,
  parseProductFile,
  parseAllProducts,
} from "./catalog-parser.js";

export type {
  ParsedCatalogIndex,
  IndexCategory,
  ParsedCategory,
  CategoryProductSummary,
  ParsedProduct,
  ParsedSize,
  ParsedPaper,
  ParsedColor,
  ParsedPrintMethod,
  ParsedPostProcess,
  ParsedOrderQty,
  ParsedDeliveryInfo,
} from "./catalog-parser.js";
