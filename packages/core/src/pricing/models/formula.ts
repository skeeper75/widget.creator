// Model 1: Formula pricing - digital print general (REQ-PRICE-002)
// totalPrice = printCost + specialColorCost + paperCost + coatingCost + postProcessCost

import { lookupTier, lookupImposition } from '../lookup.js';
import { resolveLossConfig } from '../loss.js';
import { assemblePricingResult } from '../utils.js';
import type { PricingInput, PricingResult, FormulaInput } from '../types.js';

export function calculateFormula(input: PricingInput): PricingResult {
  const fi = input as FormulaInput;
  const { quantity, sizeSelection, paper, printMode, specialColors, coating, postProcesses, sheetStandard, lookupData } = fi;

  // Step 1: Determine imposition count
  const impositionCount = sizeSelection.impositionCount
    ?? lookupImposition(sizeSelection.cutWidth, sizeSelection.cutHeight, sheetStandard, lookupData.impositionRules);

  // Step 2: Required sheets
  const requiredSheets = Math.ceil(quantity / impositionCount);

  // Step 3: Loss quantity
  const lossConfig = resolveLossConfig(input.productId, input.categoryId, lookupData.lossConfigs);
  const lossQty = Math.max(
    Math.ceil(quantity * lossConfig.lossRate),
    lossConfig.minLossQty,
  );

  // Step 4: Print cost = lookupTier(printCode, requiredSheets) * requiredSheets
  const printUnitPrice = lookupTier(
    lookupData.priceTiers,
    printMode.priceCode,
    requiredSheets,
    sheetStandard,
  );
  const printCost = printUnitPrice * requiredSheets;

  // Step 5: Special color cost
  let specialColorCost = 0;
  for (const sc of specialColors) {
    const scUnitPrice = lookupTier(
      lookupData.priceTiers,
      sc.priceCode,
      requiredSheets,
      sheetStandard,
    );
    specialColorCost += scUnitPrice * requiredSheets;
  }

  // Step 6: Paper cost (jidae) = ceil((sellingPer4Cut / impositionCount) * (quantity + lossQty))
  const paperCostPer4Cut = paper.sellingPer4Cut;
  const paperCost = Math.ceil(
    (paperCostPer4Cut / impositionCount) * (quantity + lossQty),
  );

  // Step 7: Coating cost (per sheet basis)
  let coatingCost = 0;
  if (coating) {
    const coatingUnitPrice = lookupTier(
      lookupData.priceTiers,
      coating.priceCode,
      requiredSheets,
      sheetStandard,
    );
    coatingCost = coatingUnitPrice * requiredSheets;
  }

  // Step 8: Post-process cost (per_sheet or per_unit basis)
  let postProcessCost = 0;
  for (const pp of postProcesses) {
    if (pp.priceBasis === 'per_sheet') {
      const ppUnitPrice = lookupTier(
        lookupData.priceTiers, pp.priceCode, requiredSheets, sheetStandard,
      );
      postProcessCost += ppUnitPrice * requiredSheets;
    } else {
      const ppUnitPrice = lookupTier(
        lookupData.priceTiers, pp.priceCode, quantity, sheetStandard,
      );
      postProcessCost += ppUnitPrice * quantity;
    }
  }

  const totalPrice = printCost + specialColorCost + paperCost + coatingCost + postProcessCost;

  return assemblePricingResult(totalPrice, quantity, 'formula', {
    printCost,
    specialColorCost,
    paperCost,
    coatingCost,
    postProcessCost,
  });
}
