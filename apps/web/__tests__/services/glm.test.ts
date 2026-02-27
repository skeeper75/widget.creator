/**
 * Tests for GLM Service (glm.service.ts)
 * SPEC-WB-007 FR-WB007-01, FR-WB007-02, FR-WB007-03
 *
 * Covers: convertConstraint, convertPriceRule, suggestPriceMode
 * - Success paths with valid GLM JSON responses
 * - Error paths: missing API key, empty response, invalid JSON
 * - outputType defaulting when GLM omits it
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock openai module before importing the service
vi.mock('openai', () => {
  const mockCreate = vi.fn();
  const mockInstance = {
    chat: {
      completions: {
        create: mockCreate,
      },
    },
  };
  const MockOpenAI = vi.fn().mockImplementation(() => mockInstance);
  // Expose mockCreate on the constructor for access in tests
  (MockOpenAI as unknown as Record<string, unknown>).__mockCreate = mockCreate;
  return { default: MockOpenAI };
});

// Set env vars before service import
vi.stubEnv('GLM_API_KEY', 'test-api-key-12345');
vi.stubEnv('GLM_MODEL', 'glm-5.0');
vi.stubEnv('GLM_BASE_URL', 'https://open.bigmodel.cn/api/paas/v4');

import OpenAI from 'openai';
import {
  convertConstraint,
  convertPriceRule,
  suggestPriceMode,
  GlmConstraintOutputSchema,
  GlmPriceRuleOutputSchema,
} from '../../app/api/_lib/services/glm.service';

function getMockCreate(): ReturnType<typeof vi.fn> {
  return (OpenAI as unknown as Record<string, unknown>).__mockCreate as ReturnType<typeof vi.fn>;
}

describe('GLM Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('GLM_API_KEY', 'test-api-key-12345');
  });

  describe('GlmConstraintOutputSchema', () => {
    it('validates single_constraint output', () => {
      const valid = {
        outputType: 'single_constraint',
        constraintName: '투명PVC→PP코팅 제외',
        triggerOptionType: 'PAPER',
        triggerOperator: 'in',
        triggerValues: ['투명PVC', 'OPP'],
        actions: [{ type: 'exclude_options', targetOption: 'COATING', excludeValues: ['무광PP'] }],
        confidence: 0.98,
        explanationKo: '테스트 설명',
      };
      expect(() => GlmConstraintOutputSchema.parse(valid)).not.toThrow();
    });

    it('validates composite_constraints output', () => {
      const valid = {
        outputType: 'composite_constraints',
        totalRules: 2,
        rules: [
          {
            constraintName: '규칙1',
            triggerOptionType: 'PAPER',
            triggerOperator: 'in',
            triggerValues: ['투명PVC'],
            actions: [{ type: 'exclude_options', targetOption: 'COATING', excludeValues: ['무광PP'] }],
            confidence: 0.95,
            explanationKo: '설명1',
          },
        ],
        executionOrder: [0],
        confidence: 0.95,
        explanationKo: '복합 규칙',
      };
      expect(() => GlmConstraintOutputSchema.parse(valid)).not.toThrow();
    });

    it('validates mixed_rules output', () => {
      const valid = {
        outputType: 'mixed_rules',
        constraints: [],
        priceRules: null,
        totalActions: 0,
        confidence: 0.80,
        explanationKo: '혼합 규칙',
      };
      expect(() => GlmConstraintOutputSchema.parse(valid)).not.toThrow();
    });

    it('rejects invalid outputType', () => {
      const invalid = {
        outputType: 'unknown_type',
        constraintName: '테스트',
        confidence: 0.90,
        explanationKo: '설명',
      };
      expect(() => GlmConstraintOutputSchema.parse(invalid)).toThrow();
    });
  });

  describe('GlmPriceRuleOutputSchema', () => {
    it('validates qty_discount output', () => {
      const valid = {
        outputType: 'qty_discount',
        qtyDiscountTiers: [
          { qtyMin: 1, qtyMax: 99, discountRate: 0, discountLabel: '기본가' },
          { qtyMin: 100, qtyMax: null, discountRate: 0.05, discountLabel: '소량할인' },
        ],
        confidence: 0.97,
        explanationKo: '수량할인 설명',
      };
      expect(() => GlmPriceRuleOutputSchema.parse(valid)).not.toThrow();
    });

    it('rejects discountRate > 1', () => {
      const invalid = {
        outputType: 'qty_discount',
        qtyDiscountTiers: [
          { qtyMin: 1, qtyMax: 99, discountRate: 1.5, discountLabel: '잘못된 할인' },
        ],
        confidence: 0.97,
        explanationKo: '설명',
      };
      expect(() => GlmPriceRuleOutputSchema.parse(invalid)).toThrow();
    });
  });

  describe('convertConstraint', () => {
    it('successfully converts a single_constraint NL input', async () => {
      const mockCreate = getMockCreate();
      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              outputType: 'single_constraint',
              constraintName: '투명PVC→PP코팅 제외',
              triggerOptionType: 'PAPER',
              triggerOperator: 'in',
              triggerValues: ['투명PVC', 'OPP'],
              actions: [{
                type: 'exclude_options',
                targetOption: 'COATING',
                excludeValues: ['무광PP', '유광PP'],
              }],
              confidence: 0.98,
              explanationKo: '투명PVC 또는 OPP 선택 시 PP코팅 계열 모두 제외됩니다.',
            }),
          },
        }],
      });

      const result = await convertConstraint({
        recipeId: 1,
        nlText: '투명PVC 선택하면 PP코팅 못 쓰게 해줘',
      });

      expect(result.outputType).toBe('single_constraint');
      expect(result.confidence).toBe(0.98);
      if (result.outputType === 'single_constraint') {
        expect(result.constraintName).toBe('투명PVC→PP코팅 제외');
        expect(result.triggerOptionType).toBe('PAPER');
        expect(result.triggerOperator).toBe('in');
        expect(result.triggerValues).toEqual(['투명PVC', 'OPP']);
        expect(result.actions).toHaveLength(1);
        expect(result.actions[0].type).toBe('exclude_options');
      }
    });

    it('successfully converts a composite_constraints NL input', async () => {
      const mockCreate = getMockCreate();
      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              outputType: 'composite_constraints',
              totalRules: 2,
              rules: [
                {
                  constraintName: '투명PVC→PP코팅 제외',
                  triggerOptionType: 'PAPER',
                  triggerOperator: 'in',
                  triggerValues: ['투명PVC'],
                  actions: [{ type: 'exclude_options', targetOption: 'COATING', excludeValues: ['무광PP'] }],
                  confidence: 0.95,
                  explanationKo: '설명1',
                },
                {
                  constraintName: '박가공→자동추가',
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
              explanationKo: '복합 규칙입니다.',
            }),
          },
        }],
      });

      const result = await convertConstraint({
        recipeId: 1,
        nlText: '투명PVC면 PP코팅 제외하고 박가공 선택 시 제품 자동 추가',
      });

      expect(result.outputType).toBe('composite_constraints');
      if (result.outputType === 'composite_constraints') {
        expect(result.totalRules).toBe(2);
        expect(result.rules).toHaveLength(2);
        expect(result.executionOrder).toEqual([0, 1]);
      }
    });

    it('appends available options context to user message when provided', async () => {
      const mockCreate = getMockCreate();
      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              outputType: 'single_constraint',
              constraintName: '테스트',
              triggerOptionType: 'PAPER',
              triggerOperator: 'in',
              triggerValues: ['아트지'],
              actions: [{ type: 'exclude_options', targetOption: 'COATING', excludeValues: ['무광PP'] }],
              confidence: 0.90,
              explanationKo: '설명',
            }),
          },
        }],
      });

      await convertConstraint({
        recipeId: 1,
        nlText: '아트지 선택 시 무광PP 제외',
        availableOptions: ['PAPER', 'COATING', 'SIZE'],
      });

      const callArgs = mockCreate.mock.calls[0][0];
      const userMessage = callArgs.messages.find((m: { role: string }) => m.role === 'user');
      expect(userMessage.content).toContain('PAPER, COATING, SIZE');
    });

    it('defaults outputType to single_constraint when GLM omits it', async () => {
      const mockCreate = getMockCreate();
      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              // No outputType field
              constraintName: '테스트 규칙',
              triggerOptionType: 'PAPER',
              triggerOperator: 'in',
              triggerValues: ['아트지'],
              actions: [{ type: 'exclude_options', targetOption: 'COATING', excludeValues: ['무광PP'] }],
              confidence: 0.90,
              explanationKo: '테스트 설명',
            }),
          },
        }],
      });

      const result = await convertConstraint({ recipeId: 1, nlText: '테스트' });
      expect(result.outputType).toBe('single_constraint');
    });

    it('throws when GLM_API_KEY is missing', async () => {
      vi.stubEnv('GLM_API_KEY', '');

      await expect(convertConstraint({
        recipeId: 1,
        nlText: '테스트',
      })).rejects.toThrow('GLM_API_KEY 환경변수가 설정되지 않았습니다');

      vi.stubEnv('GLM_API_KEY', 'test-api-key-12345');
    });

    it('throws when GLM returns null content', async () => {
      const mockCreate = getMockCreate();
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: null } }],
      });

      await expect(convertConstraint({
        recipeId: 1,
        nlText: '테스트',
      })).rejects.toThrow('GLM 응답이 비어있습니다');
    });

    it('throws when GLM returns empty choices array', async () => {
      const mockCreate = getMockCreate();
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: undefined } }],
      });

      await expect(convertConstraint({
        recipeId: 1,
        nlText: '테스트',
      })).rejects.toThrow('GLM 응답이 비어있습니다');
    });

    it('throws when GLM returns invalid JSON schema', async () => {
      const mockCreate = getMockCreate();
      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              outputType: 'single_constraint',
              // Missing required fields like constraintName, actions, etc.
              confidence: 0.90,
            }),
          },
        }],
      });

      await expect(convertConstraint({
        recipeId: 1,
        nlText: '테스트',
      })).rejects.toThrow();
    });

    it('uses json_object response_format in GLM API call', async () => {
      const mockCreate = getMockCreate();
      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              outputType: 'single_constraint',
              constraintName: '테스트',
              triggerOptionType: 'PAPER',
              triggerOperator: 'in',
              triggerValues: ['아트지'],
              actions: [{ type: 'require_option', targetOption: 'SIZE' }],
              confidence: 0.90,
              explanationKo: '설명',
            }),
          },
        }],
      });

      await convertConstraint({ recipeId: 1, nlText: '테스트' });

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.response_format).toEqual({ type: 'json_object' });
      expect(callArgs.temperature).toBe(0.1);
    });

    it('handles all 8 action types in GLM output', async () => {
      const actionTypes = [
        { type: 'exclude_options', targetOption: 'COATING', excludeValues: ['무광PP'] },
        { type: 'filter_options', targetOption: 'COATING', allowedValues: ['UV코팅'] },
        { type: 'show_addon_list', addonGroupId: 1 },
        { type: 'auto_add', productId: 244, qty: 1 },
        { type: 'require_option', targetOption: 'SIZE' },
        { type: 'show_message', level: 'info', message: '안내 메시지' },
        { type: 'change_price_mode', newMode: 'AREA' },
        { type: 'set_default', targetOption: 'COATING', defaultValue: '없음' },
      ];

      for (const action of actionTypes) {
        const mockCreate = getMockCreate();
        mockCreate.mockResolvedValueOnce({
          choices: [{
            message: {
              content: JSON.stringify({
                outputType: 'single_constraint',
                constraintName: `${action.type} 테스트`,
                triggerOptionType: 'PAPER',
                triggerOperator: 'in',
                triggerValues: ['아트지'],
                actions: [action],
                confidence: 0.90,
                explanationKo: '테스트 설명',
              }),
            },
          }],
        });

        const result = await convertConstraint({ recipeId: 1, nlText: '테스트' });
        expect(result.outputType).toBe('single_constraint');
        if (result.outputType === 'single_constraint') {
          expect(result.actions[0].type).toBe(action.type);
        }
      }
    });
  });

  describe('convertPriceRule', () => {
    it('successfully converts qty_discount NL input', async () => {
      const mockCreate = getMockCreate();
      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              outputType: 'qty_discount',
              qtyDiscountTiers: [
                { qtyMin: 1, qtyMax: 99, discountRate: 0, discountLabel: '기본가' },
                { qtyMin: 100, qtyMax: 499, discountRate: 0.05, discountLabel: '소량할인' },
                { qtyMin: 500, qtyMax: null, discountRate: 0.10, discountLabel: '중량할인' },
              ],
              confidence: 0.97,
              explanationKo: '100장 5%, 500장 이상 10% 할인 구간을 생성했습니다.',
            }),
          },
        }],
      });

      const result = await convertPriceRule({
        productId: 1,
        nlText: '100장부터 5%, 500장 이상 10%',
        ruleType: 'qty_discount',
      });

      expect(result.outputType).toBe('qty_discount');
      expect(result.confidence).toBe(0.97);
      if (result.outputType === 'qty_discount') {
        expect(result.qtyDiscountTiers).toHaveLength(3);
        expect(result.qtyDiscountTiers[0]).toEqual({ qtyMin: 1, qtyMax: 99, discountRate: 0, discountLabel: '기본가' });
        expect(result.qtyDiscountTiers[1].discountRate).toBe(0.05);
        expect(result.qtyDiscountTiers[2].qtyMax).toBeNull();
      }
    });

    it('defaults outputType to qty_discount when GLM omits it', async () => {
      const mockCreate = getMockCreate();
      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              // No outputType field
              qtyDiscountTiers: [
                { qtyMin: 1, qtyMax: null, discountRate: 0, discountLabel: '기본가' },
              ],
              confidence: 0.90,
              explanationKo: '설명',
            }),
          },
        }],
      });

      const result = await convertPriceRule({
        productId: 1,
        nlText: '할인 없음',
        ruleType: 'qty_discount',
      });
      expect(result.outputType).toBe('qty_discount');
    });

    it('throws when GLM_API_KEY is missing for price rule', async () => {
      vi.stubEnv('GLM_API_KEY', '');

      await expect(convertPriceRule({
        productId: 1,
        nlText: '100장 5% 할인',
        ruleType: 'qty_discount',
      })).rejects.toThrow('GLM_API_KEY 환경변수가 설정되지 않았습니다');

      vi.stubEnv('GLM_API_KEY', 'test-api-key-12345');
    });

    it('throws when GLM returns empty response for price rule', async () => {
      const mockCreate = getMockCreate();
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: null } }],
      });

      await expect(convertPriceRule({
        productId: 1,
        nlText: '100장 5% 할인',
        ruleType: 'qty_discount',
      })).rejects.toThrow('GLM 응답이 비어있습니다');
    });
  });

  describe('suggestPriceMode', () => {
    it('returns mode, reason, and confidence for a product description', async () => {
      const mockCreate = getMockCreate();
      mockCreate.mockResolvedValueOnce({
        choices: [{
          message: {
            content: JSON.stringify({
              mode: 'AREA',
              reason: '현수막은 가로×세로 크기로 가격이 결정됩니다.',
              confidence: 0.90,
            }),
          },
        }],
      });

      const result = await suggestPriceMode('현수막 배너, 크기별 가격');

      expect(result.mode).toBe('AREA');
      expect(result.reason).toContain('가격');
      expect(result.confidence).toBe(0.90);
    });

    it('throws when GLM returns empty response for mode suggestion', async () => {
      const mockCreate = getMockCreate();
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: null } }],
      });

      await expect(suggestPriceMode('현수막')).rejects.toThrow('GLM 응답이 비어있습니다');
    });
  });
});
