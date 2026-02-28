// @MX:ANCHOR: [AUTO] Shared code generators -- must be consistent across all import scripts
// @MX:REASON: fan_in >= 3 -- referenced by import-papers, import-fixed-prices, import-paper-mappings, import-products, import-package-prices
// @MX:SPEC: SPEC-IM-004 M4-B-002, M4-C-002

/**
 * Generate a paper code from name and weight.
 * Format: {normalized-name}-{weight}g (or just {normalized-name} if no weight)
 *
 * MUST match the logic in import-papers.ts generateCode() exactly.
 * Divergence causes paper_product_mapping and fixed_prices lookups to fail.
 */
// @MX:ANCHOR: [AUTO] Paper code generator -- FK foundation for paper_product_mapping and fixed_prices lookups
// @MX:REASON: Called by import-paper-mappings.ts, import-fixed-prices.ts, import-papers.ts -- divergence causes 0 records inserted
export function generatePaperCode(name: string, weight: string | number | null): string {
  const numericWeight = weight !== null && weight !== undefined
    ? (typeof weight === "number" ? weight : parseFloat(String(weight)))
    : null;

  const namePart = name
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase()
    .replace(/[^\w\-가-힣]/g, "")
    .slice(0, 40);

  if (numericWeight !== null && !isNaN(numericWeight)) {
    return `${namePart}-${numericWeight}g`.slice(0, 50);
  }
  return namePart.slice(0, 50);
}

/**
 * Generate a size code from cut width and height dimensions.
 * Format: {roundedWidth}x{roundedHeight}
 *
 * MUST match the logic in import-products.ts size code generation exactly.
 * Divergence causes package_prices lookups to find 0 matching product_sizes.
 */
// @MX:ANCHOR: [AUTO] Size code generator -- must match between import-products and import-package-prices
// @MX:REASON: Called by import-products.ts and import-package-prices.ts -- divergence causes 0 records in package_prices
export function generateSizeCode(width: number | string | null, height: number | string | null): string {
  const w = width !== null && width !== undefined
    ? Math.round(typeof width === "number" ? width : parseFloat(String(width)))
    : 0;
  const h = height !== null && height !== undefined
    ? Math.round(typeof height === "number" ? height : parseFloat(String(height)))
    : 0;
  return `${w}x${h}`;
}
