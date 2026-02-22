// Pricing engine dispatcher (REQ-PRICE-001)

import { PricingError } from '../errors.js';
import { validatePricingInput } from '../validation.js';
import { pricingRegistry } from './registry.js';
import type { PricingInput, PricingResult } from './types.js';

/**
 * Calculate price by dispatching to the appropriate pricing strategy
 * based on input.pricingModel.
 */
export function calculatePrice(input: PricingInput): PricingResult {
  validatePricingInput(input);

  const strategy = pricingRegistry[input.pricingModel];
  if (!strategy) {
    throw new PricingError('UNKNOWN_MODEL', { model: input.pricingModel });
  }

  return strategy(input);
}
