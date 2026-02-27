// @MX:NOTE: [AUTO] Transforms GLM JSON output into recipe_constraints DB insert format
// @MX:SPEC: SPEC-WB-007 FR-WB007-02
import type { GlmConstraintOutput } from '../../_lib/services/glm.service.js';

export interface ConstraintInsertData {
  recipeId: number;
  constraintName: string;
  triggerOptionType: string;
  triggerOperator: string;
  triggerValues: unknown;
  extraConditions: unknown | null;
  actions: unknown;
  isActive: boolean;
  inputMode: string;
  createdBy: string;
}

export function transformConstraintToInsert(
  glmOutput: GlmConstraintOutput,
  recipeId: number,
  createdBy: string,
): ConstraintInsertData[] {
  if (glmOutput.outputType === 'single_constraint') {
    return [
      {
        recipeId,
        constraintName: glmOutput.constraintName,
        triggerOptionType: glmOutput.triggerOptionType,
        triggerOperator: glmOutput.triggerOperator,
        triggerValues: glmOutput.triggerValues,
        extraConditions: glmOutput.extraConditions ?? null,
        actions: glmOutput.actions,
        isActive: true,
        inputMode: 'nl',
        createdBy,
      },
    ];
  }

  if (glmOutput.outputType === 'composite_constraints') {
    return glmOutput.rules.map((rule: {
      constraintName: string;
      triggerOptionType: string;
      triggerOperator: string;
      triggerValues: string[];
      extraConditions?: Record<string, unknown>;
      actions: unknown[];
    }) => ({
      recipeId,
      constraintName: rule.constraintName,
      triggerOptionType: rule.triggerOptionType,
      triggerOperator: rule.triggerOperator,
      triggerValues: rule.triggerValues,
      extraConditions: rule.extraConditions ?? null,
      actions: rule.actions,
      isActive: true,
      inputMode: 'nl',
      createdBy,
    }));
  }

  if (glmOutput.outputType === 'mixed_rules') {
    return (glmOutput.constraints as Record<string, unknown>[]).map((constraint) => ({
      recipeId,
      constraintName: String(constraint.constraintName ?? 'AI 생성 규칙'),
      triggerOptionType: String(constraint.triggerOptionType ?? ''),
      triggerOperator: String(constraint.triggerOperator ?? 'in'),
      triggerValues: constraint.triggerValues,
      extraConditions: null,
      actions: constraint.actions,
      isActive: true,
      inputMode: 'nl',
      createdBy,
    }));
  }

  return [];
}
