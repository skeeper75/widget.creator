// Model 2: Formula + Cutting pricing - sticker (REQ-PRICE-003)
// totalPrice = Formula base + cutting price

import { lookupCuttingPrice } from '../lookup.js';
import { assemblePricingResult } from '../utils.js';
import { calculateFormula } from './formula.js';
import type { PricingInput, PricingResult, FormulaCuttingInput } from '../types.js';

export function calculateFormulaCutting(input: PricingInput): PricingResult {
  const fci = input as FormulaCuttingInput;

  // Calculate base formula price (Model 1)
  const baseResult = calculateFormula(input);

  // Add cutting price
  const cuttingPrice = lookupCuttingPrice(
    fci.cuttingType,
    fci.sizeSelection,
    fci.quantity,
    fci.lookupData,
  );

  const totalPrice = baseResult.totalPrice + cuttingPrice;

  return assemblePricingResult(totalPrice, fci.quantity, 'formula_cutting', {
    ...baseResult.breakdown,
    cuttingCost: cuttingPrice,
  });
}
