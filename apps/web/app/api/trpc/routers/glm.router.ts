// @MX:ANCHOR: [AUTO] GLM tRPC 라우터 — 모든 AI 기반 NL 변환 엔드포인트
// @MX:REASON: [AUTO] 공개 API 경계: Admin UI 클라이언트가 NL 규칙 변환을 위해 4개 엔드포인트 호출
// @MX:SPEC: SPEC-WB-007 FR-WB007-02, FR-WB007-03

import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.js';
import { convertConstraint, convertPriceRule, GlmConstraintOutputSchema, GlmPriceRuleOutputSchema } from '../../_lib/services/glm.service.js';
import { transformConstraintToInsert } from '../utils/constraint-transformer.js';
import { extractQtyDiscountTiers } from '../utils/price-rule-transformer.js';
import {
  recipeConstraints,
  constraintNlHistory,
  priceNlHistory,
} from '@widget-creator/db';

const GLM_MODEL = process.env.GLM_MODEL ?? 'glm-5.0';

export const glmRouter = router({
  // NL → ECA Constraint conversion (preview, no DB save)
  convertConstraint: protectedProcedure
    .input(
      z.object({
        recipeId: z.number().int().positive(),
        nlText: z.string().min(5).max(500),
        availableOptions: z.array(z.string()).optional(),
        availableValues: z.record(z.array(z.string())).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const result = await convertConstraint({
          recipeId: input.recipeId,
          nlText: input.nlText,
          availableOptions: input.availableOptions,
          availableValues: input.availableValues,
        });
        return { success: true, data: result };
      } catch (error) {
        if (error instanceof Error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        }
        throw error;
      }
    }),

  // Approve and save constraint
  confirmConstraint: protectedProcedure
    .input(
      z.object({
        recipeId: z.number().int().positive(),
        nlText: z.string().min(5).max(500),
        glmOutput: GlmConstraintOutputSchema,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id ?? 'unknown';
      const glmOutput = input.glmOutput;

      return await ctx.db.transaction(async (tx) => {
        // 1. Insert recipe_constraints
        const inserts = transformConstraintToInsert(glmOutput, input.recipeId, userId);
        const inserted = await tx
          .insert(recipeConstraints)
          .values(inserts)
          .returning({ id: recipeConstraints.id });

        // 2. Record audit log in constraint_nl_history (one entry per constraint inserted)
        const firstConstraintId = inserted[0]?.id ?? null;
        await tx.insert(constraintNlHistory).values({
          constraintId: firstConstraintId,
          recipeId: input.recipeId,
          nlInputText: input.nlText,
          nlInterpretation: { output: glmOutput, allConstraintIds: inserted.map((r) => r.id) },
          aiModelVersion: GLM_MODEL,
          interpretationScore: String(glmOutput.confidence ?? 0),
          isApproved: true,
          approvedBy: userId,
          approvedAt: new Date(),
          createdBy: userId,
        });

        return { success: true, constraintIds: inserted.map((r) => r.id) };
      });
    }),

  // NL → Price Rule conversion (preview, no DB save)
  convertPriceRule: protectedProcedure
    .input(
      z.object({
        productId: z.number().int().positive(),
        nlText: z.string().min(5).max(500),
        ruleType: z.enum(['qty_discount', 'price_mode', 'postprocess', 'formula_hint']),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const result = await convertPriceRule({
          productId: input.productId,
          nlText: input.nlText,
          ruleType: input.ruleType,
        });
        return { success: true, data: result };
      } catch (error) {
        if (error instanceof Error) {
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: error.message });
        }
        throw error;
      }
    }),

  // Approve and save price rule
  confirmPriceRule: protectedProcedure
    .input(
      z.object({
        productId: z.number().int().positive(),
        priceConfigId: z.number().int().positive().optional(),
        nlText: z.string().min(5).max(500),
        ruleType: z.enum(['qty_discount', 'price_mode', 'postprocess', 'formula_hint']),
        glmOutput: GlmPriceRuleOutputSchema,
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id ?? 'unknown';
      const glmOutput = input.glmOutput;
      const tiers = extractQtyDiscountTiers(glmOutput);
      const confidence = glmOutput.confidence ?? 0;

      return await ctx.db.transaction(async (tx) => {
        // 1. Record in price_nl_history
        const [historyRecord] = await tx
          .insert(priceNlHistory)
          .values({
            productId: input.productId,
            priceConfigId: input.priceConfigId ?? null,
            ruleType: input.ruleType,
            nlInputText: input.nlText,
            nlInterpretation: glmOutput,
            aiModelVersion: GLM_MODEL,
            interpretationScore: String(confidence),
            isApproved: true,
            approvedBy: userId,
            approvedAt: new Date(),
            appliedTiers: tiers.length > 0 ? tiers : null,
            createdBy: userId,
          })
          .returning({ id: priceNlHistory.id });

        return {
          success: true,
          historyId: historyRecord?.id,
          tiersApplied: tiers.length,
        };
      });
    }),
});

export type GlmRouter = typeof glmRouter;
