// Input validation utilities (REQ-CROSS-002)

import { PricingError } from './errors.js';
import type { PricingInput } from './pricing/types.js';

export function validatePricingInput(input: PricingInput): void {
  if (input.quantity < 1 || input.quantity > 999_999) {
    throw new PricingError('INVALID_QUANTITY', { quantity: input.quantity });
  }
}

export function validateQuantity(quantity: number): void {
  if (quantity < 1 || quantity > 999_999) {
    throw new PricingError('INVALID_QUANTITY', { quantity });
  }
}

export function validatePageCount(pageCount: number): void {
  if (pageCount < 4 || pageCount > 1_000) {
    throw new PricingError('INVALID_QUANTITY', {
      pageCount,
      message: 'Page count must be between 4 and 1000',
    });
  }
}
