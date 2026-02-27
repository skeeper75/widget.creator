// @MX:NOTE: [AUTO] Admin-side GLM router — NL rule conversion for SPEC-WB-007 FR-WB007-02 and FR-WB007-03
// @MX:SPEC: SPEC-WB-007
// This router will call the GLM service once Phase 2 (backend) is complete.
// Currently provides the tRPC type shape for the admin UI components.

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../server';
import type { ConversionResult } from '@/components/glm/conversion-preview';

// GLM conversion result schemas shared with UI components
export const qtyDiscountTierSchema = z.object({
  qtyMin: z.number().int(),
  qtyMax: z.number().int().nullable(),
  discountRate: z.number(),
  discountLabel: z.string(),
});

export const constraintConversionSchema = z.object({
  outputType: z.enum(['single_constraint', 'composite_constraints', 'mixed_rules']),
  constraintName: z.string().optional(),
  triggerOptionType: z.string().optional(),
  triggerOperator: z.string().optional(),
  triggerValues: z.array(z.string()).optional(),
  actions: z.array(z.record(z.unknown())).optional(),
  rules: z.array(z.record(z.unknown())).optional(),
  confidence: z.number(),
  explanationKo: z.string(),
});

export const priceRuleConversionSchema = z.object({
  outputType: z.enum(['qty_discount', 'price_mode', 'postprocess', 'formula_hint', 'mixed_rules']),
  qtyDiscountTiers: z.array(qtyDiscountTierSchema).optional(),
  confidence: z.number(),
  explanationKo: z.string(),
});

export const glmRouter = router({
  // NL -> ECA constraint conversion (preview, no DB write)
  // @MX:ANCHOR: [AUTO] Fan-in target — called by use-glm-convert hook, constraints page
  // @MX:REASON: Public tRPC endpoint boundary; multiple UI consumers
  convertConstraint: protectedProcedure
    .input(
      z.object({
        productId: z.number().int(),
        nlText: z.string().min(1).max(500),
        availableOptions: z.array(z.string()).optional(),
      }),
    )
    .mutation(async (): Promise<{ success: boolean; data: ConversionResult }> => {
      // Phase 2 (backend-dev) will integrate the GLM service here.
      // This stub returns an error for UI development until Phase 2 is complete.
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'GLM 서비스 연동 준비 중입니다 (Phase 2 완료 후 활성화)',
      });
    }),

  // Confirm and persist approved constraint to recipe_constraints + constraint_nl_history
  confirmConstraint: protectedProcedure
    .input(
      z.object({
        productId: z.number().int(),
        nlText: z.string().min(1).max(500),
        glmOutput: z.unknown(),
      }),
    )
    .mutation(async (): Promise<{ success: boolean; constraintIds: number[] }> => {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'GLM 서비스 연동 준비 중입니다 (Phase 2 완료 후 활성화)',
      });
    }),

  // NL -> price rule conversion (preview, no DB write)
  // @MX:ANCHOR: [AUTO] Fan-in target — called by use-glm-convert hook, pricing page
  // @MX:REASON: Public tRPC endpoint boundary; multiple UI consumers
  convertPriceRule: protectedProcedure
    .input(
      z.object({
        productId: z.number().int(),
        nlText: z.string().min(1).max(500),
        ruleType: z.enum(['qty_discount', 'price_mode', 'postprocess', 'formula_hint']),
      }),
    )
    .mutation(async (): Promise<{ success: boolean; data: ConversionResult }> => {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'GLM 서비스 연동 준비 중입니다 (Phase 2 완료 후 활성화)',
      });
    }),

  // Confirm and persist approved price rule to qty_discount/product_price_configs + price_nl_history
  confirmPriceRule: protectedProcedure
    .input(
      z.object({
        productId: z.number().int(),
        priceConfigId: z.number().int().optional(),
        nlText: z.string().min(1).max(500),
        ruleType: z.enum(['qty_discount', 'price_mode', 'postprocess', 'formula_hint']),
        glmOutput: z.unknown(),
      }),
    )
    .mutation(async (): Promise<{ success: boolean; historyId?: number; tiersApplied: number }> => {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'GLM 서비스 연동 준비 중입니다 (Phase 2 완료 후 활성화)',
      });
    }),
});
