// Model 3: Fixed unit pricing - business cards / photo cards (REQ-PRICE-004)
// totalPrice = fixedPrice.sellingPrice * (quantity / baseQty)

import { lookupFixedPrice } from '../lookup.js';
import { assemblePricingResult } from '../utils.js';
import type { PricingInput, PricingResult, FixedUnitInput } from '../types.js';

export function calculateFixedUnit(input: PricingInput): PricingResult {
  const fui = input as FixedUnitInput;

  const fixedPrice = lookupFixedPrice(
    fui.productId,
    fui.sizeSelection?.sizeId ?? null,
    fui.paper?.paperId ?? null,
    fui.printMode?.printModeId ?? null,
    fui.lookupData.fixedPrices,
  );

  const totalPrice = Math.ceil(
    fixedPrice.sellingPrice * (fui.quantity / fixedPrice.baseQty),
  );

  return assemblePricingResult(totalPrice, fui.quantity, 'fixed_unit', {
    printCost: totalPrice,
  });
}
