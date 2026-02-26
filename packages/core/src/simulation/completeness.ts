// Completeness checker for product publish readiness
// SPEC-WB-005 FR-WB005-01, FR-WB005-02

import type { CompletenessItem, CompletenessResult } from './types.js';

export type { CompletenessResult };

export interface CompletenessCheckInput {
  hasDefaultRecipe?: boolean;
  optionTypes: unknown[];
  optionChoices?: unknown[];
  hasRequiredOption: boolean;
  priceConfig: { id: number; isActive: boolean } | null;
  constraintCount: number;
  edicusCode: string | null;
  mesItemCd: string | null;
  // Flat fields for checkCompleteness compatibility
  productId?: number;
  optionTypeCount?: number;
  minChoiceCount?: number;
  hasPricingConfig?: boolean;
  isPricingActive?: boolean;
}

// CompletenessInput is the flat/normalized form used directly by checkCompleteness
export interface CompletenessInput {
  hasDefaultRecipe: boolean;
  optionTypeCount: number;
  minChoiceCount: number;
  hasRequiredOption: boolean;
  hasPricingConfig: boolean;
  isPricingActive: boolean;
  constraintCount: number;
  edicusCode: string | null;
  mesItemCd: string | null;
}

// @MX:ANCHOR: [AUTO] checkCompleteness — pure completeness evaluator; called by tRPC router and dashboard
// @MX:REASON: fan_in >= 3: completeness query, publish gate, admin dashboard; deterministic based on input snapshot
// @MX:SPEC: SPEC-WB-005 FR-WB005-01, FR-WB005-02
export function checkCompleteness(input: CompletenessInput): CompletenessResult {
  const items: CompletenessItem[] = [];

  // 1. Options check
  const optionsCompleted =
    input.hasDefaultRecipe &&
    input.optionTypeCount >= 1 &&
    input.minChoiceCount >= 2 &&
    input.hasRequiredOption;

  let optionsMessage: string;
  if (!input.hasDefaultRecipe) {
    optionsMessage = 'No default recipe configured';
  } else if (input.optionTypeCount < 1) {
    optionsMessage = 'Recipe must have at least 1 option type';
  } else if (input.minChoiceCount < 2) {
    optionsMessage = 'Option types must have at least 2 choices';
  } else if (!input.hasRequiredOption) {
    optionsMessage = 'At least 1 option must be marked as required';
  } else {
    optionsMessage = `${input.optionTypeCount} option type(s) configured`;
  }

  items.push({ item: 'options', completed: optionsCompleted, message: optionsMessage });

  // 2. Pricing check
  const pricingCompleted = input.hasPricingConfig && input.isPricingActive;
  const pricingMessage = pricingCompleted
    ? 'Price configuration active'
    : !input.hasPricingConfig
      ? 'No price configuration found'
      : 'Price configuration is inactive';

  items.push({ item: 'pricing', completed: pricingCompleted, message: pricingMessage });

  // 3. Constraints check: 0 constraints = completed with review recommendation
  const constraintsMessage =
    input.constraintCount === 0
      ? 'No constraints defined (review recommended)'
      : `${input.constraintCount} constraint(s) defined`;

  items.push({ item: 'constraints', completed: true, message: constraintsMessage });

  // 4. MES mapping check
  const mesMappingCompleted = input.edicusCode !== null || input.mesItemCd !== null;
  const mesMappingMessage = mesMappingCompleted
    ? 'Integration code configured'
    : 'Edicus code or MES item code required';

  items.push({ item: 'mesMapping', completed: mesMappingCompleted, message: mesMappingMessage });

  const completedCount = items.filter((i) => i.completed).length;
  const totalCount = items.length;
  const publishable = items.every((i) => i.completed);

  return { items, publishable, completedCount, totalCount };
}

// @MX:NOTE: [AUTO] checkProductCompleteness wraps checkCompleteness — converts CompletenessCheckInput (richer) to CompletenessInput (flat)
// @MX:SPEC: SPEC-WB-005 FR-WB005-01
export function checkProductCompleteness(input: CompletenessCheckInput): CompletenessResult {
  const optionTypeCount = input.optionTypeCount ?? input.optionTypes.length;
  // minChoiceCount: if using flat input, or assume at least 2 if priceConfig provided
  const minChoiceCount = input.minChoiceCount ?? (input.optionTypes.length > 0 ? 2 : 0);
  const hasPricingConfig = input.hasPricingConfig ?? input.priceConfig !== null;
  const isPricingActive = input.isPricingActive ?? (input.priceConfig?.isActive ?? false);
  const hasDefaultRecipe = input.hasDefaultRecipe ?? (input.optionTypes.length > 0);

  return checkCompleteness({
    hasDefaultRecipe,
    optionTypeCount,
    minChoiceCount,
    hasRequiredOption: input.hasRequiredOption,
    hasPricingConfig,
    isPricingActive,
    constraintCount: input.constraintCount,
    edicusCode: input.edicusCode,
    mesItemCd: input.mesItemCd,
  });
}
