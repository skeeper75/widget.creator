// @MX:ANCHOR: [AUTO] GLM 서비스 — NL 규칙 변환을 위한 중앙 AI 통합 포인트
// @MX:REASON: [AUTO] 4개 tRPC 엔드포인트 + 2개 변환 유틸리티가 이 서비스에 의존
// @MX:SPEC: SPEC-WB-007 FR-WB007-01, FR-WB007-02, FR-WB007-03

import OpenAI from 'openai';
import { z } from 'zod';

// Server-only guard
if (typeof window !== 'undefined') {
  throw new Error('glm.service.ts must only be used server-side');
}

const GLM_BASE_URL = process.env.GLM_BASE_URL ?? 'https://open.bigmodel.cn/api/paas/v4';
const GLM_MODEL = process.env.GLM_MODEL ?? 'glm-5.0';
const GLM_TIMEOUT_MS = 3000;

function getGlmClient(): OpenAI {
  const apiKey = process.env.GLM_API_KEY;
  if (!apiKey) {
    throw new Error('GLM_API_KEY 환경변수가 설정되지 않았습니다');
  }
  return new OpenAI({
    apiKey,
    baseURL: GLM_BASE_URL,
    timeout: GLM_TIMEOUT_MS,
  });
}

// Zod schemas for GLM output validation
const ConstraintActionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('exclude_options'), targetOption: z.string(), excludeValues: z.array(z.string()) }),
  z.object({ type: z.literal('filter_options'), targetOption: z.string(), allowedValues: z.array(z.string()) }),
  z.object({ type: z.literal('show_addon_list'), addonGroupId: z.number() }),
  z.object({ type: z.literal('auto_add'), productId: z.number(), qty: z.number() }),
  z.object({ type: z.literal('require_option'), targetOption: z.string() }),
  z.object({ type: z.literal('show_message'), level: z.enum(['info', 'warn', 'error']), message: z.string() }),
  z.object({ type: z.literal('change_price_mode'), newMode: z.enum(['LOOKUP', 'AREA', 'PAGE', 'COMPOSITE']) }),
  z.object({ type: z.literal('set_default'), targetOption: z.string(), defaultValue: z.string() }),
]);

const SingleConstraintSchema = z.object({
  outputType: z.literal('single_constraint'),
  constraintName: z.string(),
  triggerOptionType: z.string(),
  triggerOperator: z.enum(['in', 'equals', 'gte', 'lte', 'not_in']),
  triggerValues: z.array(z.string()),
  extraConditions: z.record(z.unknown()).optional(),
  actions: z.array(ConstraintActionSchema),
  confidence: z.number().min(0).max(1),
  explanationKo: z.string(),
  alternativeInterpretations: z.array(z.unknown()).optional(),
});

const CompositeConstraintSchema = z.object({
  outputType: z.literal('composite_constraints'),
  totalRules: z.number(),
  rules: z.array(
    SingleConstraintSchema.omit({ outputType: true }).extend({ outputType: z.literal('single_constraint').optional() }),
  ),
  executionOrder: z.array(z.number()),
  sharedTrigger: z.string().optional(),
  confidence: z.number().min(0).max(1),
  explanationKo: z.string(),
});

const QtyDiscountTierSchema = z.object({
  qtyMin: z.number().int().nonnegative(),
  qtyMax: z.number().int().positive().nullable(),
  discountRate: z.number().min(0).max(1),
  discountLabel: z.string(),
});

const QtyDiscountSchema = z.object({
  outputType: z.literal('qty_discount'),
  qtyDiscountTiers: z.array(QtyDiscountTierSchema),
  confidence: z.number().min(0).max(1),
  explanationKo: z.string(),
});

const MixedRuleSchema = z.object({
  outputType: z.literal('mixed_rules'),
  constraints: z.array(z.unknown()),
  priceRules: z.unknown().nullable(),
  totalActions: z.number(),
  confidence: z.number().min(0).max(1),
  explanationKo: z.string(),
});

export const GlmConstraintOutputSchema = z.union([
  SingleConstraintSchema,
  CompositeConstraintSchema,
  MixedRuleSchema,
]);

export const GlmPriceRuleOutputSchema = z.union([
  QtyDiscountSchema,
  MixedRuleSchema,
]);

export type GlmConstraintOutput = z.infer<typeof GlmConstraintOutputSchema>;
export type GlmPriceRuleOutput = z.infer<typeof GlmPriceRuleOutputSchema>;

// ECA Constraint conversion system prompt
const ECA_SYSTEM_PROMPT = `당신은 한국 인쇄업 전문가이자 제약조건 설계자입니다.
관리자의 자연어 설명을 ECA (Event-Condition-Action) 구조의 인쇄 제약조건으로 변환합니다.

=== 인쇄 도메인 용어 ===
- 용지(PAPER): 아트지, 스노우지, 크라프트지, 투명PVC, OPP, 은PET, 금PET
- 인쇄(PRINT): 단면칼라, 양면칼라, 단면흑백, 화이트잉크, 클리어잉크
- 코팅(COATING): 없음, 무광PP, 유광PP, UV코팅, 에폭시
- 사이즈(SIZE): 규격 (90×50mm 등) 또는 free (자유형)
- 가공(PROCESS): 박가공, 도무송, 오시, 미싱, 모서리, 접지
- 제본(BINDING): 중철, 무선, PUR, 트윈링

=== 8종 액션 타입 ===
1. exclude_options: 특정 옵션값 선택 불가
2. filter_options: 허용 가능한 옵션값만 표시
3. show_addon_list: 추가상품 그룹 UI 표시
4. auto_add: 상품 자동 추가
5. require_option: 옵션 필수 입력화
6. show_message: 안내/경고 메시지
7. change_price_mode: 가격 계산 방식 전환
8. set_default: 기본값 변경

=== outputType 선택 규칙 ===
- 단일 규칙 → "single_constraint"
- 여러 독립 규칙 → "composite_constraints"
- 가격+제약 혼합 → "mixed_rules"

=== Few-shot 예제 ===
입력: "투명PVC 선택하면 PP코팅 못 쓰게 해줘"
출력: {"outputType":"single_constraint","constraintName":"투명PVC→PP코팅 제외","triggerOptionType":"PAPER","triggerOperator":"in","triggerValues":["투명PVC","OPP"],"actions":[{"type":"exclude_options","targetOption":"COATING","excludeValues":["무광PP","유광PP"]}],"confidence":0.98,"explanationKo":"투명PVC 또는 OPP 선택 시 PP코팅 계열 모두 제외됩니다."}

반드시 유효한 JSON만 출력하세요. outputType 필드가 반드시 포함되어야 합니다.`;

const QTY_DISCOUNT_SYSTEM_PROMPT = `당신은 한국 인쇄업 가격 전문가입니다.
관리자의 자연어 수량할인 설명을 qty_discount 테이블 구조로 변환합니다.

=== 규칙 ===
- discountRate는 소수 형식 (5% → 0.05)
- qtyMax: null은 상한 없음(이상)을 의미
- 첫 구간은 항상 qtyMin: 1로 시작
- 구간 사이 공백 없이 연속으로 작성

=== Few-shot 예제 ===
입력: "100장부터 5%, 500장부터 10%, 1000장 이상 15%"
출력: {"outputType":"qty_discount","qtyDiscountTiers":[{"qtyMin":1,"qtyMax":99,"discountRate":0,"discountLabel":"기본가"},{"qtyMin":100,"qtyMax":499,"discountRate":0.05,"discountLabel":"소량할인"},{"qtyMin":500,"qtyMax":999,"discountRate":0.10,"discountLabel":"중량할인"},{"qtyMin":1000,"qtyMax":null,"discountRate":0.15,"discountLabel":"대량특가"}],"confidence":0.97,"explanationKo":"100장 5%, 500장 10%, 1000장 이상 15% 수량할인 구간을 생성했습니다."}

반드시 유효한 JSON만 출력하세요. outputType: "qty_discount"가 반드시 포함되어야 합니다.`;

export interface ConvertConstraintInput {
  recipeId: number;
  nlText: string;
  availableOptions?: string[];
  availableValues?: Record<string, string[]>;
}

export interface ConvertPriceRuleInput {
  productId: number;
  nlText: string;
  ruleType: 'qty_discount' | 'price_mode' | 'postprocess' | 'formula_hint';
}

export async function convertConstraint(input: ConvertConstraintInput): Promise<GlmConstraintOutput> {
  const client = getGlmClient();

  let userMessage = input.nlText;
  if (input.availableOptions?.length) {
    userMessage += `\n\n사용 가능한 옵션: ${input.availableOptions.join(', ')}`;
  }

  const response = await client.chat.completions.create({
    model: GLM_MODEL,
    messages: [
      { role: 'system', content: ECA_SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('GLM 응답이 비어있습니다');

  const parsed = JSON.parse(content) as Record<string, unknown>;
  // Add outputType if missing (GLM sometimes omits it)
  if (!parsed.outputType) {
    parsed.outputType = 'single_constraint';
  }

  return GlmConstraintOutputSchema.parse(parsed);
}

export async function convertPriceRule(input: ConvertPriceRuleInput): Promise<GlmPriceRuleOutput> {
  const client = getGlmClient();

  const response = await client.chat.completions.create({
    model: GLM_MODEL,
    messages: [
      { role: 'system', content: QTY_DISCOUNT_SYSTEM_PROMPT },
      { role: 'user', content: input.nlText },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('GLM 응답이 비어있습니다');

  const parsed = JSON.parse(content) as Record<string, unknown>;
  if (!parsed.outputType) {
    parsed.outputType = 'qty_discount';
  }

  return GlmPriceRuleOutputSchema.parse(parsed);
}

export async function suggestPriceMode(
  productDescription: string,
): Promise<{ mode: string; reason: string; confidence: number }> {
  const client = getGlmClient();

  const response = await client.chat.completions.create({
    model: GLM_MODEL,
    messages: [
      {
        role: 'system',
        content:
          '당신은 인쇄 가격 전문가입니다. 상품 설명을 보고 최적의 가격 계산 모드를 추천하세요. LOOKUP(표 조회), AREA(면적 기반), PAGE(페이지수 기반), COMPOSITE(복합) 중 선택. JSON 형식: {"mode": "AREA", "reason": "현수막은 가로×세로 크기로 가격이 결정됩니다.", "confidence": 0.90}',
      },
      { role: 'user', content: productDescription },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('GLM 응답이 비어있습니다');

  return JSON.parse(content) as { mode: string; reason: string; confidence: number };
}
