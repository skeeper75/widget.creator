// Publish service — business rules for product publish/unpublish
// SPEC-WB-005 FR-WB005-05, FR-WB005-06

import { checkCompleteness } from './completeness.js';
import type { CompletenessInput } from './completeness.js';
import type { CompletenessResult, PublishOptions } from './types.js';

export type { CompletenessInput, CompletenessResult, PublishOptions };

// ─── Errors ───────────────────────────────────────────────────────────────────

export class PublishError extends Error {
  constructor(
    public readonly missingItems: string[],
    public readonly completeness: CompletenessResult,
  ) {
    super(`Product is not publishable: missing ${missingItems.join(', ')}`);
    this.name = 'PublishError';
  }
}

// ─── validatePublishReadiness ─────────────────────────────────────────────────

// @MX:ANCHOR: [AUTO] validatePublishReadiness — publish gate; called by tRPC router and tests
// @MX:REASON: fan_in >= 3: tRPC publish mutation, publish.test.ts, future scheduled publish job
// @MX:SPEC: SPEC-WB-005 FR-WB005-05, FR-WB005-07
// @MX:NOTE: [AUTO] Pure function — all DB reads done by caller. Throws PublishError if not publishable.
export function validatePublishReadiness(input: CompletenessInput): CompletenessResult {
  const result = checkCompleteness(input);
  if (!result.publishable) {
    const missing = result.items
      .filter((i) => !i.completed)
      .map((i) => i.item);
    throw new PublishError(missing, result);
  }
  return result;
}

// ─── Service input types (for tRPC router use) ────────────────────────────────

export interface PublishServiceInput {
  productId: number;
  completenessInput: CompletenessInput;
  options: PublishOptions;
}

export interface UnpublishServiceInput {
  productId: number;
  options: PublishOptions;
}

export interface PublishResult {
  success: true;
  completeness: CompletenessResult;
}

export interface UnpublishResult {
  success: true;
}
