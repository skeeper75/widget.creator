// Pricing utility functions

import { PricingError } from '../errors.js';
import type { PricingModel, PricingResult, PriceBreakdown, SizeSelection } from './types.js';

const VAT_RATE = 0.1;

/**
 * Assemble a standardized PricingResult from total price and model.
 * Applies Math.floor to totalPrice, VAT, and unitPrice per [A-01].
 */
export function assemblePricingResult(
  totalPrice: number,
  quantity: number,
  model: PricingModel,
  breakdown?: Partial<PriceBreakdown>,
): PricingResult {
  const floored = Math.floor(totalPrice);
  return {
    totalPrice: floored,
    totalPriceWithVat: Math.floor(floored * (1 + VAT_RATE)),
    unitPrice: Math.floor(floored / quantity),
    breakdown: {
      printCost: 0,
      paperCost: 0,
      specialColorCost: 0,
      coatingCost: 0,
      postProcessCost: 0,
      bindingCost: 0,
      foilCost: 0,
      packagingCost: 0,
      cuttingCost: 0,
      discountAmount: 0,
      ...breakdown,
    },
    model,
    calculatedAt: Date.now(),
  };
}

/**
 * Parse "100x150" format to [width, height].
 */
export function parseSize(sizeStr: string): [number, number] {
  const parts = sizeStr.toLowerCase().split('x').map(Number);
  if (parts.length !== 2 || parts.some(isNaN)) {
    throw new PricingError('INVALID_SIZE', { size: sizeStr });
  }
  return [parts[0]!, parts[1]!];
}

/**
 * Format size for display: "100 x 150 mm".
 */
export function formatSize(size: SizeSelection): string {
  if (size.isCustom && size.customWidth !== undefined && size.customHeight !== undefined) {
    return `${size.customWidth} x ${size.customHeight} mm`;
  }
  return `${size.cutWidth} x ${size.cutHeight} mm`;
}
