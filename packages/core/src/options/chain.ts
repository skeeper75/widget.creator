// Priority chain resolution (REQ-OPT-001)

import type { ProductOption, AvailableOption } from './types.js';

export const PRIORITY_CHAIN = [
  'jobPreset',
  'size',
  'paper',
  'option',
  'color',
  'additionalColor',
] as const;

export type OptionPhase = (typeof PRIORITY_CHAIN)[number];

/** Get index of an option key in the priority chain. Returns -1 if not found. */
export function getChainIndex(optionKey: string): number {
  return PRIORITY_CHAIN.indexOf(optionKey as OptionPhase);
}

/** Get all product options that belong to a specific phase in the chain. */
export function getOptionsForPhase(
  phase: OptionPhase,
  productOptions: ProductOption[],
): ProductOption[] {
  return productOptions
    .filter(opt => opt.optionClass === phase)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Get all option keys that come after a given chain index. */
export function getOptionsAfterIndex(
  chainIndex: number,
  availableOptions: Map<string, AvailableOption>,
): string[] {
  if (chainIndex < 0) return [];

  const laterPhases = PRIORITY_CHAIN.slice(chainIndex + 1);
  const keys: string[] = [];

  for (const [key, opt] of availableOptions) {
    if (laterPhases.includes(opt.definition.optionClass as OptionPhase)) {
      keys.push(key);
    }
  }

  return keys;
}
