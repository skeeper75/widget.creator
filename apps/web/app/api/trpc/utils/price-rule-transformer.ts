// @MX:NOTE: [AUTO] Transforms GLM qty_discount JSON into DB insert format for price_nl_history
// @MX:SPEC: SPEC-WB-007 FR-WB007-03, FR-WB007-04
import { z } from 'zod';
import type { GlmPriceRuleOutput } from '../../_lib/services/glm.service.js';

export const QtyDiscountTierSchema = z.object({
  qtyMin: z.number().int().nonnegative(),
  qtyMax: z.number().int().positive().nullable(),
  discountRate: z.number().min(0).max(1),
  discountLabel: z.string(),
});

export type QtyDiscountTier = z.infer<typeof QtyDiscountTierSchema>;

export interface PriceNlHistoryInsertData {
  productId: number;
  priceConfigId: number | null;
  ruleType: string;
  nlInputText: string;
  nlInterpretation: unknown;
  aiModelVersion: string;
  interpretationScore: string;
  isApproved: boolean;
  createdBy: string;
}

export function transformPriceRuleToHistory(
  glmOutput: GlmPriceRuleOutput,
  productId: number,
  nlInputText: string,
  aiModelVersion: string,
  createdBy: string,
): PriceNlHistoryInsertData {
  return {
    productId,
    priceConfigId: null,
    ruleType: glmOutput.outputType === 'qty_discount' ? 'qty_discount' : 'formula_hint',
    nlInputText,
    nlInterpretation: glmOutput,
    aiModelVersion,
    interpretationScore: String(glmOutput.confidence),
    isApproved: false,
    createdBy,
  };
}

export function extractQtyDiscountTiers(glmOutput: GlmPriceRuleOutput): QtyDiscountTier[] {
  if (glmOutput.outputType === 'qty_discount') {
    return glmOutput.qtyDiscountTiers.map((tier: unknown) => QtyDiscountTierSchema.parse(tier));
  }
  return [];
}
