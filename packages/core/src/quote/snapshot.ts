// Snapshot hash for audit trail (REQ-QUOTE-002)

import { sha256 } from '../crypto.js';
import type { QuoteInput } from './types.js';

export async function computeSnapshotHash(input: QuoteInput): Promise<string> {
  const serialized = JSON.stringify({
    productId: input.productId,
    quantity: input.quantity,
    sizeSelection: input.sizeSelection,
    selectedOptions: input.selectedOptions.map(o => ({
      optionKey: o.optionKey,
      choiceCode: o.choiceCode,
    })),
    pricingResult: {
      totalPrice: input.pricingResult.totalPrice,
      model: input.pricingResult.model,
      breakdown: input.pricingResult.breakdown,
    },
  });

  return sha256(serialized);
}
