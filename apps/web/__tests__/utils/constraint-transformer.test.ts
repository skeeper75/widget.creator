/**
 * Tests for constraint-transformer.ts
 * SPEC-WB-007 FR-WB007-02
 *
 * Covers: transformConstraintToInsert
 * - single_constraint → 1 DB insert
 * - composite_constraints → N DB inserts
 * - mixed_rules → extracts constraints array
 * - All 8 action types
 * - Edge cases: empty composite, mixed_rules without constraints
 */
import { describe, it, expect } from 'vitest';
import {
  transformConstraintToInsert,
  type ConstraintInsertData,
} from '../../app/api/trpc/utils/constraint-transformer';
import type { GlmConstraintOutput } from '../../app/api/_lib/services/glm.service';

describe('constraintTransformer', () => {
  describe('transformConstraintToInsert - single_constraint', () => {
    it('transforms single_constraint to one DB insert', () => {
      const glmOutput: GlmConstraintOutput = {
        outputType: 'single_constraint',
        constraintName: '투명PVC→PP코팅 제외',
        triggerOptionType: 'PAPER',
        triggerOperator: 'in',
        triggerValues: ['투명PVC', 'OPP'],
        actions: [{ type: 'exclude_options', targetOption: 'COATING', excludeValues: ['무광PP', '유광PP'] }],
        confidence: 0.98,
        explanationKo: '투명PVC 선택 시 PP코팅 제외',
      };

      const result = transformConstraintToInsert(glmOutput, 1, 'admin');

      expect(result).toHaveLength(1);
      const insert = result[0];
      expect(insert.recipeId).toBe(1);
      expect(insert.constraintName).toBe('투명PVC→PP코팅 제외');
      expect(insert.triggerOptionType).toBe('PAPER');
      expect(insert.triggerOperator).toBe('in');
      expect(insert.triggerValues).toEqual(['투명PVC', 'OPP']);
      expect(insert.isActive).toBe(true);
      expect(insert.inputMode).toBe('nl');
      expect(insert.createdBy).toBe('admin');
    });

    it('sets extraConditions to null when not provided', () => {
      const glmOutput: GlmConstraintOutput = {
        outputType: 'single_constraint',
        constraintName: '테스트',
        triggerOptionType: 'PAPER',
        triggerOperator: 'equals',
        triggerValues: ['아트지'],
        actions: [{ type: 'require_option', targetOption: 'SIZE' }],
        confidence: 0.90,
        explanationKo: '설명',
      };

      const result = transformConstraintToInsert(glmOutput, 5, 'manager');

      expect(result[0].extraConditions).toBeNull();
    });

    it('sets extraConditions from glmOutput when provided', () => {
      const extraConditions = { coverType: 'FRONT', additionalFilter: true };
      const glmOutput: GlmConstraintOutput = {
        outputType: 'single_constraint',
        constraintName: '테스트',
        triggerOptionType: 'PAPER',
        triggerOperator: 'in',
        triggerValues: ['아트지'],
        extraConditions,
        actions: [{ type: 'require_option', targetOption: 'SIZE' }],
        confidence: 0.90,
        explanationKo: '설명',
      };

      const result = transformConstraintToInsert(glmOutput, 1, 'admin');

      expect(result[0].extraConditions).toEqual(extraConditions);
    });

    it('preserves actions array in the insert', () => {
      const actions = [
        { type: 'exclude_options' as const, targetOption: 'COATING', excludeValues: ['무광PP'] },
        { type: 'show_message' as const, level: 'warn' as const, message: '주의하세요' },
      ];
      const glmOutput: GlmConstraintOutput = {
        outputType: 'single_constraint',
        constraintName: '테스트',
        triggerOptionType: 'PAPER',
        triggerOperator: 'in',
        triggerValues: ['아트지'],
        actions,
        confidence: 0.90,
        explanationKo: '설명',
      };

      const result = transformConstraintToInsert(glmOutput, 1, 'admin');

      expect(result[0].actions).toEqual(actions);
    });
  });

  describe('transformConstraintToInsert - composite_constraints', () => {
    it('transforms composite_constraints to multiple DB inserts', () => {
      const glmOutput: GlmConstraintOutput = {
        outputType: 'composite_constraints',
        totalRules: 2,
        rules: [
          {
            constraintName: '규칙1 - 투명PVC 코팅 제한',
            triggerOptionType: 'PAPER',
            triggerOperator: 'in',
            triggerValues: ['투명PVC'],
            actions: [{ type: 'exclude_options', targetOption: 'COATING', excludeValues: ['무광PP'] }],
            confidence: 0.95,
            explanationKo: '설명1',
          },
          {
            constraintName: '규칙2 - 박가공 추가',
            triggerOptionType: 'PROCESS',
            triggerOperator: 'in',
            triggerValues: ['박가공'],
            actions: [{ type: 'auto_add', productId: 244, qty: 1 }],
            confidence: 0.92,
            explanationKo: '설명2',
          },
        ],
        executionOrder: [0, 1],
        confidence: 0.93,
        explanationKo: '복합 규칙',
      };

      const result = transformConstraintToInsert(glmOutput, 10, 'admin');

      expect(result).toHaveLength(2);
      expect(result[0].constraintName).toBe('규칙1 - 투명PVC 코팅 제한');
      expect(result[0].recipeId).toBe(10);
      expect(result[0].triggerOptionType).toBe('PAPER');
      expect(result[0].inputMode).toBe('nl');
      expect(result[1].constraintName).toBe('규칙2 - 박가공 추가');
      expect(result[1].triggerOptionType).toBe('PROCESS');
    });

    it('returns empty array for composite_constraints with no rules', () => {
      const glmOutput: GlmConstraintOutput = {
        outputType: 'composite_constraints',
        totalRules: 0,
        rules: [],
        executionOrder: [],
        confidence: 0.50,
        explanationKo: '규칙 없음',
      };

      const result = transformConstraintToInsert(glmOutput, 1, 'admin');

      expect(result).toHaveLength(0);
    });

    it('each composite rule sets isActive true and inputMode nl', () => {
      const glmOutput: GlmConstraintOutput = {
        outputType: 'composite_constraints',
        totalRules: 3,
        rules: [
          {
            constraintName: '규칙A',
            triggerOptionType: 'PAPER',
            triggerOperator: 'in',
            triggerValues: ['아트지'],
            actions: [{ type: 'require_option', targetOption: 'COATING' }],
            confidence: 0.90,
            explanationKo: '설명A',
          },
          {
            constraintName: '규칙B',
            triggerOptionType: 'COATING',
            triggerOperator: 'equals',
            triggerValues: ['무광PP'],
            actions: [{ type: 'filter_options', targetOption: 'SIZE', allowedValues: ['90×50mm'] }],
            confidence: 0.85,
            explanationKo: '설명B',
          },
          {
            constraintName: '규칙C',
            triggerOptionType: 'PRINT',
            triggerOperator: 'in',
            triggerValues: ['단면칼라'],
            actions: [{ type: 'set_default', targetOption: 'COATING', defaultValue: '없음' }],
            confidence: 0.88,
            explanationKo: '설명C',
          },
        ],
        executionOrder: [0, 1, 2],
        confidence: 0.88,
        explanationKo: '세 가지 규칙',
      };

      const result = transformConstraintToInsert(glmOutput, 3, 'manager');

      expect(result).toHaveLength(3);
      for (const insert of result) {
        expect(insert.isActive).toBe(true);
        expect(insert.inputMode).toBe('nl');
        expect(insert.createdBy).toBe('manager');
        expect(insert.recipeId).toBe(3);
      }
    });
  });

  describe('transformConstraintToInsert - mixed_rules', () => {
    it('transforms mixed_rules by extracting constraints array', () => {
      const glmOutput: GlmConstraintOutput = {
        outputType: 'mixed_rules',
        constraints: [
          {
            constraintName: '혼합 규칙1',
            triggerOptionType: 'PAPER',
            triggerOperator: 'in',
            triggerValues: ['투명PVC'],
            actions: [{ type: 'exclude_options', targetOption: 'COATING', excludeValues: ['무광PP'] }],
            confidence: 0.90,
            explanationKo: '설명',
          },
        ],
        priceRules: null,
        totalActions: 1,
        confidence: 0.85,
        explanationKo: '혼합 규칙',
      };

      const result = transformConstraintToInsert(glmOutput, 2, 'admin');

      expect(result).toHaveLength(1);
      expect(result[0].constraintName).toBe('혼합 규칙1');
      expect(result[0].recipeId).toBe(2);
      expect(result[0].inputMode).toBe('nl');
    });

    it('returns empty array for mixed_rules with empty constraints', () => {
      const glmOutput: GlmConstraintOutput = {
        outputType: 'mixed_rules',
        constraints: [],
        priceRules: null,
        totalActions: 0,
        confidence: 0.70,
        explanationKo: '빈 혼합 규칙',
      };

      const result = transformConstraintToInsert(glmOutput, 1, 'admin');

      expect(result).toHaveLength(0);
    });

    it('uses fallback constraintName when field is missing in mixed_rules', () => {
      const glmOutput: GlmConstraintOutput = {
        outputType: 'mixed_rules',
        constraints: [
          {
            // No constraintName field
            triggerOptionType: 'PAPER',
            triggerOperator: 'in',
            triggerValues: ['아트지'],
            actions: [],
          },
        ],
        priceRules: null,
        totalActions: 0,
        confidence: 0.70,
        explanationKo: '이름 없는 규칙',
      };

      const result = transformConstraintToInsert(glmOutput, 1, 'admin');

      expect(result[0].constraintName).toBe('AI 생성 규칙');
    });
  });

  describe('transformConstraintToInsert - all 8 action types', () => {
    const actionTests = [
      {
        name: 'exclude_options',
        action: { type: 'exclude_options' as const, targetOption: 'COATING', excludeValues: ['무광PP'] },
      },
      {
        name: 'filter_options',
        action: { type: 'filter_options' as const, targetOption: 'COATING', allowedValues: ['UV코팅'] },
      },
      {
        name: 'show_addon_list',
        action: { type: 'show_addon_list' as const, addonGroupId: 1 },
      },
      {
        name: 'auto_add',
        action: { type: 'auto_add' as const, productId: 244, qty: 1 },
      },
      {
        name: 'require_option',
        action: { type: 'require_option' as const, targetOption: 'SIZE' },
      },
      {
        name: 'show_message info',
        action: { type: 'show_message' as const, level: 'info' as const, message: '안내 메시지' },
      },
      {
        name: 'show_message warn',
        action: { type: 'show_message' as const, level: 'warn' as const, message: '경고 메시지' },
      },
      {
        name: 'show_message error',
        action: { type: 'show_message' as const, level: 'error' as const, message: '오류 메시지' },
      },
      {
        name: 'change_price_mode AREA',
        action: { type: 'change_price_mode' as const, newMode: 'AREA' as const },
      },
      {
        name: 'change_price_mode LOOKUP',
        action: { type: 'change_price_mode' as const, newMode: 'LOOKUP' as const },
      },
      {
        name: 'set_default',
        action: { type: 'set_default' as const, targetOption: 'COATING', defaultValue: '없음' },
      },
    ];

    for (const { name, action } of actionTests) {
      it(`handles ${name} action type without throwing`, () => {
        const glmOutput: GlmConstraintOutput = {
          outputType: 'single_constraint',
          constraintName: `${name} 테스트`,
          triggerOptionType: 'PAPER',
          triggerOperator: 'in',
          triggerValues: ['아트지'],
          actions: [action],
          confidence: 0.90,
          explanationKo: '테스트 설명',
        };

        expect(() => transformConstraintToInsert(glmOutput, 1, 'admin')).not.toThrow();
        const result = transformConstraintToInsert(glmOutput, 1, 'admin');
        expect(result).toHaveLength(1);
        expect((result[0].actions as typeof action[])[0].type).toBe(action.type);
      });
    }
  });

  describe('transformConstraintToInsert - createdBy field', () => {
    it('propagates createdBy to all inserts', () => {
      const glmOutput: GlmConstraintOutput = {
        outputType: 'composite_constraints',
        totalRules: 2,
        rules: [
          {
            constraintName: '규칙1',
            triggerOptionType: 'PAPER',
            triggerOperator: 'in',
            triggerValues: ['아트지'],
            actions: [{ type: 'require_option', targetOption: 'SIZE' }],
            confidence: 0.90,
            explanationKo: '설명1',
          },
          {
            constraintName: '규칙2',
            triggerOptionType: 'COATING',
            triggerOperator: 'in',
            triggerValues: ['무광PP'],
            actions: [{ type: 'show_addon_list', addonGroupId: 2 }],
            confidence: 0.88,
            explanationKo: '설명2',
          },
        ],
        executionOrder: [0, 1],
        confidence: 0.89,
        explanationKo: '두 규칙',
      };

      const result = transformConstraintToInsert(glmOutput, 7, 'superadmin');

      for (const insert of result) {
        expect(insert.createdBy).toBe('superadmin');
      }
    });
  });

  describe('ConstraintInsertData interface compliance', () => {
    it('returned data matches ConstraintInsertData interface shape', () => {
      const glmOutput: GlmConstraintOutput = {
        outputType: 'single_constraint',
        constraintName: '인터페이스 테스트',
        triggerOptionType: 'PAPER',
        triggerOperator: 'not_in',
        triggerValues: ['아트지'],
        actions: [{ type: 'change_price_mode', newMode: 'PAGE' }],
        confidence: 0.85,
        explanationKo: '설명',
      };

      const result: ConstraintInsertData[] = transformConstraintToInsert(glmOutput, 1, 'admin');

      expect(result[0]).toHaveProperty('recipeId');
      expect(result[0]).toHaveProperty('constraintName');
      expect(result[0]).toHaveProperty('triggerOptionType');
      expect(result[0]).toHaveProperty('triggerOperator');
      expect(result[0]).toHaveProperty('triggerValues');
      expect(result[0]).toHaveProperty('extraConditions');
      expect(result[0]).toHaveProperty('actions');
      expect(result[0]).toHaveProperty('isActive');
      expect(result[0]).toHaveProperty('inputMode');
      expect(result[0]).toHaveProperty('createdBy');
    });
  });
});
