// Model 5: Component pricing - booklets (REQ-PRICE-006)
// totalPrice = innerPaper + innerPrint + coverPaper + coverPrint + coverCoating + binding + foil + packaging

import { lookupTier, lookupImposition } from '../lookup.js';
import { resolveLossConfig } from '../loss.js';
import { assemblePricingResult } from '../utils.js';
import type { PricingInput, PricingResult, ComponentInput, Paper, PrintMode, PricingLookupData, FoilPriceRecord } from '../types.js';

function calculatePartPaper(
  paper: Paper,
  impositionCount: number | null,
  sheetStandard: string,
  quantity: number,
  lossQty: number,
  pageMultiplier: number,
  rules: PricingLookupData['impositionRules'],
  cutWidth: number,
  cutHeight: number,
): number {
  const impCount = impositionCount
    ?? lookupImposition(cutWidth, cutHeight, sheetStandard, rules);
  return Math.ceil(
    (paper.sellingPer4Cut / impCount) * (quantity + lossQty) * pageMultiplier,
  );
}

function calculatePartPrint(
  printMode: PrintMode,
  impositionCount: number | null,
  sheetStandard: string,
  quantity: number,
  pageMultiplier: number,
  priceTiers: PricingLookupData['priceTiers'],
  rules: PricingLookupData['impositionRules'],
  cutWidth: number,
  cutHeight: number,
): number {
  const impCount = impositionCount
    ?? lookupImposition(cutWidth, cutHeight, sheetStandard, rules);
  const sheets = Math.ceil((quantity * pageMultiplier) / impCount);
  const unitPrice = lookupTier(priceTiers, printMode.priceCode, sheets, sheetStandard);
  return unitPrice * sheets;
}

function lookupFoilPrice(
  foilType: string,
  width: number,
  height: number,
  foilPrices: FoilPriceRecord[],
): number {
  const matched = foilPrices.find(fp =>
    fp.foilType === foilType &&
    fp.width === width &&
    fp.height === height,
  );
  return matched?.sellingPrice ?? 0;
}

export function calculateComponent(input: PricingInput): PricingResult {
  const ci = input as ComponentInput;
  const { innerBody, cover, binding, coverCoating, foilEmboss, packaging, quantity, lookupData, sizeSelection } = ci;

  const lossConfig = resolveLossConfig(input.productId, input.categoryId, lookupData.lossConfigs);
  const lossQty = Math.max(
    Math.ceil(quantity * lossConfig.lossRate),
    lossConfig.minLossQty,
  );

  // Inner body: paper + print (pageCount / 2 sheets per unit for double-sided)
  const innerPageMultiplier = innerBody.pageCount / 2;
  const innerPaperCost = calculatePartPaper(
    innerBody.paper, innerBody.impositionCount, innerBody.sheetStandard,
    quantity, lossQty, innerPageMultiplier,
    lookupData.impositionRules, sizeSelection.cutWidth, sizeSelection.cutHeight,
  );
  const innerPrintCost = calculatePartPrint(
    innerBody.printMode, innerBody.impositionCount, innerBody.sheetStandard,
    quantity, innerPageMultiplier,
    lookupData.priceTiers, lookupData.impositionRules,
    sizeSelection.cutWidth, sizeSelection.cutHeight,
  );

  // Cover: paper + print + coating (1 sheet per unit)
  const coverPaperCost = calculatePartPaper(
    cover.paper, cover.impositionCount, cover.sheetStandard,
    quantity, lossQty, 1,
    lookupData.impositionRules, sizeSelection.cutWidth, sizeSelection.cutHeight,
  );
  const coverPrintCost = calculatePartPrint(
    cover.printMode, cover.impositionCount, cover.sheetStandard,
    quantity, 1,
    lookupData.priceTiers, lookupData.impositionRules,
    sizeSelection.cutWidth, sizeSelection.cutHeight,
  );

  // Cover coating
  let coverCoatingCost = 0;
  if (coverCoating) {
    const coverImpCount = cover.impositionCount
      ?? lookupImposition(sizeSelection.cutWidth, sizeSelection.cutHeight, cover.sheetStandard, lookupData.impositionRules);
    const coverSheets = Math.ceil(quantity / coverImpCount);
    const coatingUnitPrice = lookupTier(
      lookupData.priceTiers,
      coverCoating.priceCode,
      coverSheets,
      cover.sheetStandard,
    );
    coverCoatingCost = coatingUnitPrice * coverSheets;
  }

  // Binding cost
  const bindingUnitPrice = lookupTier(
    lookupData.priceTiers,
    binding.priceCode,
    quantity,
    null,
  );
  const bindingCost = bindingUnitPrice * quantity;

  // Foil/emboss cost (optional)
  let foilCost = 0;
  if (foilEmboss) {
    foilCost = lookupFoilPrice(
      foilEmboss.foilType,
      foilEmboss.width,
      foilEmboss.height,
      lookupData.foilPrices,
    );
  }

  // Packaging cost (optional)
  const packagingCost = packaging ? packaging.unitPrice * quantity : 0;

  const totalPrice = innerPaperCost + innerPrintCost
    + coverPaperCost + coverPrintCost + coverCoatingCost
    + bindingCost + foilCost + packagingCost;

  return assemblePricingResult(totalPrice, quantity, 'component', {
    paperCost: innerPaperCost + coverPaperCost,
    printCost: innerPrintCost + coverPrintCost,
    coatingCost: coverCoatingCost,
    bindingCost,
    foilCost,
    packagingCost,
  });
}
