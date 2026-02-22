// Model 7: Fixed per-unit pricing - acrylic / goods (REQ-PRICE-008)
// totalPrice = ceil(baseUnitPrice * quantity * discountRate)

import { lookupFixedPrice, lookupOptionPrice, lookupQuantityDiscount } from '../lookup.js';
import { assemblePricingResult } from '../utils.js';
import type { PricingInput, PricingResult, FixedPerUnitInput } from '../types.js';

export function calculateFixedPerUnit(input: PricingInput): PricingResult {
  const fpui = input as FixedPerUnitInput;

  const sizePrice = lookupFixedPrice(
    fpui.productId,
    fpui.sizeSelection.sizeId,
    null,
    null,
    fpui.lookupData.fixedPrices,
  ).sellingPrice;

  let processingPrice = 0;
  for (const opt of fpui.processingOptions) {
    processingPrice += lookupOptionPrice(opt, fpui.lookupData);
  }

  let additionalProductPrice = 0;
  for (const ap of fpui.additionalProducts) {
    additionalProductPrice += ap.unitPrice;
  }

  const baseUnitPrice = sizePrice + processingPrice + additionalProductPrice;

  // Quantity discount rate lookup
  const discountRate = lookupQuantityDiscount(
    fpui.productId,
    fpui.quantity,
    fpui.lookupData,
  );

  const totalPrice = Math.ceil(baseUnitPrice * fpui.quantity * discountRate);

  return assemblePricingResult(totalPrice, fpui.quantity, 'fixed_per_unit', {
    printCost: sizePrice * fpui.quantity,
    postProcessCost: processingPrice * fpui.quantity,
    discountAmount: baseUnitPrice * fpui.quantity - totalPrice,
  });
}
