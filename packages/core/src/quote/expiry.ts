// Quote expiry validation (REQ-QUOTE-003)

import type { QuoteResult } from './types.js';

export function isQuoteValid(quote: QuoteResult): boolean {
  return Date.now() < quote.expiresAt;
}
