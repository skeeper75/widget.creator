// Model 6: Fixed size pricing - posters / large format (REQ-PRICE-007)
// totalPrice = (sizePrice + optionPrice) * quantity

import { lookupFixedPrice, lookupOptionPrice } from '../lookup.js';
import { assemblePricingResult } from '../utils.js';
import type { PricingInput, PricingResult, FixedSizeInput } from '../types.js';

export function calculateFixedSize(input: PricingInput): PricingResult {
  const fsi = input as FixedSizeInput;

  const sizePrice = lookupFixedPrice(
    fsi.productId,
    fsi.sizeSelection.sizeId,
    null,
    null,
    fsi.lookupData.fixedPrices,
  ).sellingPrice;

  let optionPrice = 0;
  for (const opt of fsi.additionalOptions) {
    optionPrice += lookupOptionPrice(opt, fsi.lookupData);
  }

  const totalPrice = (sizePrice + optionPrice) * fsi.quantity;

  return assemblePricingResult(totalPrice, fsi.quantity, 'fixed_size', {
    printCost: sizePrice * fsi.quantity,
    postProcessCost: optionPrice * fsi.quantity,
  });
}
