/**
 * Shopby Option Generator
 *
 * Generates COMBINATION, REQUIRED, and STANDARD options for Shopby product registration.
 * Handles option combination limits by selecting representative subsets when
 * the total count exceeds the Shopby maximum.
 *
 * Reference: SPEC-SHOPBY-002, R-PRD-002
 *
 * @MX:ANCHOR: Option matrix generation for Shopby product registration
 * @MX:REASON: Transforms Widget Creator option chains into Shopby option structures
 */

import type {
  ShopbyCombinationOption,
  ShopbyRequiredOption,
  ShopbyStandardOption,
  OptionCombinationEntry,
  OptionMatrix,
} from './types.js';
import type {
  SizeOptionData,
  PaperOptionData,
  QuantityTierData,
  PrintModeOptionData,
  PostProcessOptionData,
} from './mapper.js';
import {
  buildCombinationOptions,
  buildRequiredPrintModeOption,
  buildStandardPostProcessOption,
  calculateAddPrice,
  findMinSellingPrice,
} from './mapper.js';

// =============================================================================
// SECTION 1: Constants
// =============================================================================

/** Default maximum COMBINATION entries before subset selection */
export const DEFAULT_MAX_COMBINATIONS = 500;

// =============================================================================
// SECTION 2: Price Lookup
// =============================================================================

/**
 * Price lookup function type
 * Given size code, paper code, and quantity, returns the selling price
 */
export type PriceLookupFn = (
  sizeCode: string,
  paperCode: string,
  quantity: number
) => number | undefined;

/**
 * Create a price lookup function from a flat price array
 *
 * @param prices - Array of price entries with sizeCode, paperCode, quantity, sellingPrice
 * @returns Lookup function
 */
export function createPriceLookup(
  prices: Array<{
    sizeCode: string;
    paperCode: string;
    quantity: number;
    sellingPrice: number;
  }>
): PriceLookupFn {
  const map = new Map<string, number>();
  for (const p of prices) {
    const key = `${p.sizeCode}|${p.paperCode}|${p.quantity}`;
    map.set(key, p.sellingPrice);
  }
  return (sizeCode, paperCode, quantity) =>
    map.get(`${sizeCode}|${paperCode}|${quantity}`);
}

// =============================================================================
// SECTION 3: Combination Generation
// =============================================================================

/**
 * Generate all option combination entries with calculated addPrice
 *
 * Creates the full cartesian product of sizes x papers x quantities
 * and calculates addPrice for each combination.
 *
 * addPrice = combinationPrice - basePrice (where basePrice = minimum price)
 *
 * @param sizes - Available size options
 * @param papers - Available paper options
 * @param quantities - Available quantity tiers
 * @param priceLookup - Function to look up selling price for a combination
 * @returns Combination entries and base price
 */
export function generateCombinations(
  sizes: SizeOptionData[],
  papers: PaperOptionData[],
  quantities: QuantityTierData[],
  priceLookup: PriceLookupFn
): { entries: OptionCombinationEntry[]; basePrice: number } {
  // Collect all prices to determine the base price
  const allPrices: number[] = [];
  const combinationPrices = new Map<string, number>();

  for (const size of sizes) {
    for (const paper of papers) {
      for (const qty of quantities) {
        const price = priceLookup(size.code, paper.code, qty.quantity);
        if (price !== undefined) {
          const key = `${size.code}|${paper.code}|${qty.quantity}`;
          combinationPrices.set(key, price);
          allPrices.push(price);
        }
      }
    }
  }

  const basePrice = findMinSellingPrice(allPrices);

  // Build combination entries with calculated addPrice
  const entries: OptionCombinationEntry[] = [];

  for (const size of sizes) {
    for (const paper of papers) {
      for (const qty of quantities) {
        const key = `${size.code}|${paper.code}|${qty.quantity}`;
        const price = combinationPrices.get(key);
        if (price !== undefined) {
          const paperLabel = paper.weight
            ? `${paper.name} ${paper.weight}g`
            : paper.name;

          entries.push({
            values: [size.displayName, paperLabel, qty.label],
            codes: [size.code, paper.code, `QTY_${qty.quantity}`],
            addPrice: calculateAddPrice(basePrice, price),
          });
        }
      }
    }
  }

  return { entries, basePrice };
}

// =============================================================================
// SECTION 4: Representative Selection
// =============================================================================

// @MX:NOTE: [AUTO] Three-pass greedy selection: size coverage → paper coverage → cheapest fill. papersSeen set is never populated in pass-2 causing all papers to be treated as unseen — verify if intentional.
// @MX:SPEC: SPEC-WB-005
/**
 * Select representative combinations when total exceeds the limit
 *
 * Selection strategy:
 * 1. Sort by addPrice ascending (cheaper combinations are more popular)
 * 2. Ensure coverage: at least one entry per unique size
 * 3. Ensure coverage: at least one entry per unique paper
 * 4. Fill remaining slots with cheapest combinations
 *
 * @param entries - All combination entries
 * @param maxCount - Maximum number of combinations to select (default: 500)
 * @returns Selected representative combinations
 */
export function selectRepresentativeCombos(
  entries: OptionCombinationEntry[],
  maxCount: number = DEFAULT_MAX_COMBINATIONS
): OptionCombinationEntry[] {
  if (entries.length <= maxCount) {
    return entries;
  }

  const selectedKeys = new Set<string>();
  const selected: OptionCombinationEntry[] = [];
  const sizesSeen = new Set<string>();
  const papersSeen = new Set<string>();

  // Sort by addPrice ascending for priority selection
  const sorted = [...entries].sort((a, b) => a.addPrice - b.addPrice);

  // First pass: ensure at least one entry per size
  for (const entry of sorted) {
    if (selected.length >= maxCount) break;
    const sizeCode = entry.codes[0];
    if (!sizesSeen.has(sizeCode)) {
      sizesSeen.add(sizeCode);
      const key = entry.codes.join('|');
      if (!selectedKeys.has(key)) {
        selectedKeys.add(key);
        selected.push(entry);
      }
    }
  }

  // Second pass: ensure at least one entry per paper
  for (const entry of sorted) {
    if (selected.length >= maxCount) break;
    const paperCode = entry.codes[1];
    if (!papersSeen.has(paperCode)) {
      papersSeen.add(paperCode);
      const key = entry.codes.join('|');
      if (!selectedKeys.has(key)) {
        selectedKeys.add(key);
        selected.push(entry);
      }
    }
  }

  // Third pass: fill remaining slots with cheapest unselected combinations
  for (const entry of sorted) {
    if (selected.length >= maxCount) break;
    const key = entry.codes.join('|');
    if (!selectedKeys.has(key)) {
      selectedKeys.add(key);
      selected.push(entry);
    }
  }

  return selected;
}

// =============================================================================
// SECTION 5: Option Matrix Builder
// =============================================================================

/**
 * Build complete option matrix for product registration
 *
 * Creates the full set of COMBINATION, REQUIRED, and STANDARD options.
 * Automatically selects representative combinations if total exceeds limit.
 *
 * @param params - Option matrix parameters
 * @returns Complete option matrix with all option types
 */
export function buildOptionMatrix(params: {
  sizes: SizeOptionData[];
  papers: PaperOptionData[];
  quantities: QuantityTierData[];
  priceLookup: PriceLookupFn;
  printModes?: PrintModeOptionData[];
  postProcesses?: PostProcessOptionData[];
  maxCombinations?: number;
}): OptionMatrix {
  const {
    sizes,
    papers,
    quantities,
    priceLookup,
    printModes,
    postProcesses,
    maxCombinations = DEFAULT_MAX_COMBINATIONS,
  } = params;

  // Generate all combinations with addPrice
  const { entries, basePrice } = generateCombinations(
    sizes, papers, quantities, priceLookup
  );

  // Select representative subset if needed
  const isRepresentativeSubset = entries.length > maxCombinations;
  const selectedEntries = selectRepresentativeCombos(entries, maxCombinations);

  // Extract unique values per dimension from selected entries
  // to build axis definitions
  const sizeMap = new Map<string, SizeOptionData>();
  const paperMap = new Map<string, PaperOptionData>();
  const qtyMap = new Map<string, QuantityTierData>();

  for (const entry of selectedEntries) {
    const [sizeCode, paperCode, qtyCode] = entry.codes;

    if (!sizeMap.has(sizeCode)) {
      sizeMap.set(sizeCode, {
        code: sizeCode,
        displayName: entry.values[0],
      });
    }

    if (!paperMap.has(paperCode)) {
      paperMap.set(paperCode, {
        code: paperCode,
        name: entry.values[1],
      });
    }

    if (!qtyMap.has(qtyCode)) {
      const qtyNum = parseInt(qtyCode.replace('QTY_', ''), 10);
      qtyMap.set(qtyCode, {
        quantity: qtyNum,
        label: entry.values[2],
        addPrice: 0,
      });
    }
  }

  // Build COMBINATION axis definitions using mapper functions
  const combinations = buildCombinationOptions(
    [...sizeMap.values()],
    [...paperMap.values()],
    [...qtyMap.values()]
  );

  // Build REQUIRED options (e.g., print mode, binding)
  const required: ShopbyRequiredOption[] = [];
  if (printModes && printModes.length > 0) {
    required.push(buildRequiredPrintModeOption(printModes));
  }

  // Build STANDARD options (e.g., post-processing)
  const standard: ShopbyStandardOption[] = [];
  if (postProcesses && postProcesses.length > 0) {
    standard.push(buildStandardPostProcessOption(postProcesses));
  }

  return {
    combinations,
    combinationEntries: selectedEntries,
    required,
    standard,
    basePrice,
    totalCombinationCount: entries.length,
    registeredCombinationCount: selectedEntries.length,
    isRepresentativeSubset,
  };
}
