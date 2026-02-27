// Pricing engine dispatcher (REQ-PRICE-001)

import { PricingError } from '../errors.js';
import { validatePricingInput } from '../validation.js';
import { pricingRegistry } from './registry.js';
import type { PricingInput, PricingResult } from './types.js';

// @MX:ANCHOR: [AUTO] Central pricing dispatcher - entry point for all price calculation requests
// @MX:REASON: fan_in >= 3; called by quote/route.ts (API), price-sync.ts (widget shopby), and price.state.ts (widget state layer)
// @MX:SPEC: SPEC-WB-003
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
