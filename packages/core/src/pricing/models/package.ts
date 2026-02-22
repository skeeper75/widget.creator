// Model 4: Package pricing - postcard books (REQ-PRICE-005)
// totalPrice = lookupPackagePrice(productId, sizeId, printModeId, pageCount, qty)

import { lookupPackagePrice } from '../lookup.js';
import { assemblePricingResult } from '../utils.js';
import type { PricingInput, PricingResult, PackageInput } from '../types.js';

export function calculatePackage(input: PricingInput): PricingResult {
  const pi = input as PackageInput;

  const packagePrice = lookupPackagePrice(
    pi.productId,
    pi.sizeSelection.sizeId,
    pi.printMode.printModeId,
    pi.pageCount,
    pi.quantity,
    pi.lookupData.packagePrices,
  );

  return assemblePricingResult(packagePrice, pi.quantity, 'package', {
    printCost: packagePrice,
  });
}
