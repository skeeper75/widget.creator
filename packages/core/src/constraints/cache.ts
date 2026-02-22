// Constraint evaluation cache (REQ-CONST-006)

import type { ConstraintEvalInput, ConstraintEvalResult } from './types.js';
import { evaluateConstraints } from './evaluator.js';

const TIMEOUT_MS = 50;

/**
 * Evaluate constraints with timeout protection.
 * If evaluation exceeds 50ms, return cached result if available.
 */
export function evaluateWithTimeout(
  input: ConstraintEvalInput,
  cache: Map<string, ConstraintEvalResult>,
): ConstraintEvalResult {
  const cacheKey = buildCacheKey(input);

  const result = evaluateConstraints(input);

  if (result.evaluationTimeMs > TIMEOUT_MS) {
    console.warn(`Constraint evaluation exceeded ${TIMEOUT_MS}ms: ${result.evaluationTimeMs}ms`);
    const cached = cache.get(cacheKey);
    if (cached) return cached;
  }

  cache.set(cacheKey, result);
  return result;
}

/** Build a deterministic cache key from constraint evaluation input */
export function buildCacheKey(input: ConstraintEvalInput): string {
  const selectionEntries = [...input.currentSelections.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v.choiceCode}`)
    .join('&');

  return `${input.productId}:${selectionEntries}`;
}
