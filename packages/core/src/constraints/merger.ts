// Dual-layer constraint merge (REQ-CONST-005)

import type { OptionConstraint } from '../options/types.js';
import type { ImplicitConstraint, MergedConstraintSet, ResolvedConstraint } from './types.js';

/**
 * Merge WowPress implicit constraints with explicit star constraints.
 * Star constraints override implicit constraints when they share the same key.
 */
export function mergeConstraintLayers(
  starConstraints: OptionConstraint[],
  implicitConstraints: ImplicitConstraint[],
): MergedConstraintSet {
  const merged = new Map<string, ResolvedConstraint>();

  // Layer 1: Apply implicit constraints first
  for (const ic of implicitConstraints) {
    merged.set(ic.key, {
      source: 'implicit',
      key: ic.key,
      sourceField: ic.sourceField,
      targetField: ic.targetField,
      productId: ic.productId,
      operator: ic.operator,
      value: ic.value,
      priority: ic.priority,
      isActive: ic.isActive,
    });
  }

  // Layer 2: Star constraints override implicit
  for (const sc of starConstraints) {
    const key = `${sc.sourceField}:${sc.targetField}:${sc.productId}`;
    merged.set(key, {
      source: 'star',
      key,
      sourceField: sc.sourceField,
      targetField: sc.targetField,
      productId: sc.productId,
      operator: sc.operator,
      value: sc.value,
      priority: sc.priority,
      isActive: sc.isActive,
    });
  }

  return { constraints: Array.from(merged.values()) };
}
