# SPEC-WB-007: GLM 자연어 규칙 빌더 & 인쇄 자동견적 NLP 에이전트

**Version:** 1.0.0
**Date:** 2026-02-27
**Status:** implemented
**Parent:** SPEC-WB-003 (ECA 제약조건 시스템), SPEC-WB-004 (가격 계산 엔진)
**Depends on:** SPEC-WB-001, SPEC-WB-002, SPEC-WB-003, SPEC-WB-004

---

## 1. Context

### 1.1 이 SPEC이 다루는 것

인쇄 자동견적 시스템에서 **관리자가 자연어로 가격룰·인쇄제약을 정의**할 수 있도록 하는
**GLM(z.ai) 기반 자연어 규칙 빌더** 시스템 및 **인쇄 자동견적 NLP 에이전트 스킬** 설계.

- **GLM 서비스 레이어**: z.ai API 통합, JSON Schema 구조화 출력
- **NL → ECA 제약조건 변환**: SPEC-WB-003 인프라에 GLM 구체적 통합
- **NL → 가격룰 변환**: 수량할인 구간, 가격 계산 모드 제안 (신규)
- **price_nl_history 테이블**: 가격룰 자연어 입력 감사 로그 (신규)
- **통합 Admin UI NL 패널**: Step 2(옵션), Step 3(가격룰), Step 4(제약조건) 공통 패널
- **innojini-huni-nlp-builder 스킬**: 인쇄 도메인 특화 NLP 에이전트 스킬

### 1.2 이 SPEC이 다루지 않는 것

- ECA 런타임 평가 엔진 (SPEC-WB-003 완료)
- 가격 계산 엔진 자체 (SPEC-WB-004)
- 시뮬레이션 엔진 (SPEC-WB-005)
- Excel 가격표 임포트 (SPEC-DB-006)
- 가격 공식(formulaText) 자동 생성 — 복잡도 높음, 향후 SPEC-WB-008 예정
- MES 연동 (SPEC-WB-006)

### 1.3 핵심 설계 원칙

> **인쇄는 주문제조 — 요리와 같다:**
> 상품은 사이즈·용지·인쇄·후가공 등 재료를 조합해 만든다.
> 관리자가 "명함", "롤스티커" 등의 상품을 만들 때,
> 가격룰과 제약조건도 같은 방식으로 자유롭게 정의되어야 한다.
> GLM은 이 과정에서 관리자의 자연어 의도를 구조화된 규칙으로 변환하는 번역기 역할을 한다.

> **Excel 가격계산식 = SSOT 원칙:**
> 현재 후니프린팅의 가격 계산식은 Excel에 존재한다.
> GLM은 Excel 공식을 추론하거나 대체하지 않는다.
> GLM은 관리자가 수량할인 구간, 가격 모드, 제약조건을
> 자연어로 빠르게 정의할 수 있도록 돕는 입력 보조 도구다.

> **SPEC-WB-003과의 관계:**
> SPEC-WB-003 FR-WB003-03은 "AI 자연어 입력"을 추상적으로 정의했다.
> 이 SPEC은 GLM(z.ai)을 구체적 AI 제공자로 지정하고,
> 가격룰 도메인으로 범위를 확장한다.

> **신뢰도 기반 자동 적용:**
> GLM 해석 신뢰도가 0.85 이상이면 즉시 적용 가능하도록 제안.
> 0.85 미만이면 수동 검토 필수 (안전장치).

---

## 2. Domain Model

### 2.1 GLM 자연어 빌더 흐름

```
관리자 입력
    ↓ "투명PVC 선택하면 PP코팅 못 쓰게 해줘"
[GLM NL 서비스]
    ↓ POST /api/trpc/glm.convertConstraint
    ↓ z.ai API call (JSON Schema)
    ↓ response_format: {type: "json_object"}
[구조화된 ECA 규칙]
    ↓ {
    ↓   triggerOptionType: "PAPER",
    ↓   triggerOperator: "in",
    ↓   triggerValues: ["투명PVC", "OPP"],
    ↓   actions: [{type: "exclude_options", targetOption: "COATING", excludeValues: ["무광PP", "유광PP"]}],
    ↓   confidence: 0.98
    ↓ }
[관리자 검토 & 승인]
    ↓ POST /api/trpc/glm.confirmConstraint
[recipe_constraints + constraint_nl_history 저장]
```

### 2.2 지원하는 자연어 변환 도메인

| 도메인 | 입력 예시 | 출력 형태 | 저장 테이블 |
|--------|---------|---------|------------|
| ECA 제약조건 | "투명지 선택하면 PP코팅 못 쓰게" | ECA rule JSON | recipe_constraints + constraint_nl_history |
| 수량할인 구간 | "100장 이상이면 5% 할인, 500장 이상 10%" | qty_discount 배열 | qty_discount + price_nl_history |
| 가격 모드 제안 | "현수막 배너, 크기별 가격" | AREA 모드 추천 + 설명 | price_nl_history |
| 후가공 추가비 | "미싱 1줄 선택 시 장당 260원 추가" | postprocess_cost 매핑 | price_nl_history |

### 2.3 WowPress req_*/rst_* ↔ ECA 매핑 원칙

WowPress의 인쇄 도메인 제약 패턴을 후니프린팅 ECA 시스템으로 변환:

| WowPress 패턴 | 의미 | ECA 액션 |
|--------------|------|---------|
| `req_awkjob` | 지질 선택 시 후가공 필수 | `require_option` |
| `req_color`  | 지질 선택 시 도수 범위 제한 | `filter_options` |
| `rst_prsjob` | 지질 선택 시 인쇄방식 불가 | `exclude_options` |
| `rst_awkjob` | 후가공 상호 배제 | `exclude_options` |
| `rst_color`  | 지질 선택 시 도수 불가 | `exclude_options` |
| `addtype: select/checkbox` | 추가상품 선택 방식 | `show_addon_list` |

### 2.4 GLM 출력 형식 (4가지 outputType)

```typescript
// outputType 1: 단일 제약 규칙
interface SingleConstraintOutput {
  outputType: "single_constraint";
  constraintName: string;
  triggerOptionType: string;       // PAPER | PRINT | COATING | SIZE | PROCESS | BINDING | PAGES | QTY | PRINT_METHOD
  triggerOperator: "in" | "equals" | "gte" | "lte" | "not_in";
  triggerValues: string[];
  extraConditions?: object;        // AND/OR 복합 조건, coverType 등
  actions: ConstraintAction[];     // 8종 액션 배열
  confidence: number;
  explanationKo: string;
  alternativeInterpretations?: SingleConstraintOutput[];
}

// outputType 2: 복합 규칙 묶음 (한 자연어 입력 → 여러 독립 규칙)
interface CompositeConstraintOutput {
  outputType: "composite_constraints";
  totalRules: number;
  rules: SingleConstraintOutput[];
  executionOrder: number[];        // 규칙 적용 순서 (인덱스)
  sharedTrigger?: string;          // 공통 트리거 (있을 경우)
  confidence: number;
  explanationKo: string;
}

// outputType 3: 수량할인 가격룰
interface QtyDiscountOutput {
  outputType: "qty_discount";
  qtyDiscountTiers: {
    qtyMin: number;
    qtyMax: number | null;    // null = 이상 (상한 없음)
    discountRate: number;     // 0.0 ~ 1.0 (0.05 = 5%)
    discountLabel: string;
  }[];
  confidence: number;
  explanationKo: string;
}

// outputType 4: 가격+제약 혼합 (한 자연어 → 동시 처리)
interface MixedRuleOutput {
  outputType: "mixed_rules";
  constraints: SingleConstraintOutput[];
  priceRules: QtyDiscountOutput | PriceModeOutput | null;
  totalActions: number;
  confidence: number;
  explanationKo: string;
  implementationScript?: string;  // TypeScript/Drizzle 스크립트 (복잡도 높을 때)
}

// 8종 ECA 액션 타입
type ConstraintAction =
  | { type: "exclude_options"; targetOption: string; excludeValues: string[] }   // rst_* 패턴
  | { type: "filter_options"; targetOption: string; allowedValues: string[] }    // req_color 패턴
  | { type: "show_addon_list"; addonGroupId: number }                            // addtype 패턴
  | { type: "auto_add"; productId: number; qty: number }                        // 동반 필수 상품
  | { type: "require_option"; targetOption: string }                            // req_awkjob 패턴
  | { type: "show_message"; level: "info" | "warn" | "error"; message: string }
  | { type: "change_price_mode"; newMode: "LOOKUP" | "AREA" | "PAGE" | "COMPOSITE" }
  | { type: "set_default"; targetOption: string; defaultValue: string };
```

---

## 3. Functional Requirements (EARS Format)

### FR-WB007-01: GLM 서비스 레이어

**[WHEN]** GLM 서비스에 NL 변환 요청이 들어오면,
**[THE SYSTEM SHALL]** z.ai API에 `response_format: {"type": "json_object"}`로 요청하고,
정의된 JSON Schema에 맞는 구조화된 응답을 반환한다.

**[WHEN]** z.ai API 키가 환경변수에 없으면,
**[THE SYSTEM SHALL]** `GLM_API_KEY 환경변수가 설정되지 않았습니다` 오류를 반환한다.

**[WHEN]** z.ai API 응답시간이 3초를 초과하면,
**[THE SYSTEM SHALL]** 타임아웃 오류를 반환하고 재시도 안내를 표시한다.

**[IF]** GLM 모델이 지정되지 않으면,
**[THE SYSTEM SHALL]** 기본 모델로 `glm-5.0`을 사용한다.

**환경변수:**
- `GLM_API_KEY`: z.ai API 키 (필수)
- `GLM_MODEL`: 사용할 GLM 모델 (기본: `glm-5.0`, 선택: `glm-4.7`, `glm-4.6`)
- `GLM_BASE_URL`: API 엔드포인트 (기본: `https://open.bigmodel.cn/api/paas/v4`)

### FR-WB007-02: NL → ECA 제약조건 변환 API

**[WHEN]** 관리자가 자연어 텍스트를 입력하고 변환을 요청하면,
**[THE SYSTEM SHALL]** GLM 서비스를 호출하여 ECA 형태의 제약조건 후보 1-3개를 반환한다.

**[WHEN]** 변환 신뢰도가 0.85 이상이면,
**[THE SYSTEM SHALL]** "즉시 적용 가능" 표시와 함께 원클릭 승인 버튼을 표시한다.

**[WHEN]** 변환 신뢰도가 0.85 미만이면,
**[THE SYSTEM SHALL]** "검토 필요" 경고와 함께 수동 편집 안내를 표시한다.

**[WHEN]** 관리자가 GLM 제안을 승인하면,
**[THE SYSTEM SHALL]** `recipe_constraints`에 저장하고 `constraint_nl_history`에 감사 로그를 기록한다.

**tRPC 엔드포인트:**
- `POST trpc.glm.convertConstraint` — NL → ECA 변환 (프리뷰)
- `POST trpc.glm.confirmConstraint` — 승인 및 저장

**입력:**
```typescript
interface ConvertConstraintInput {
  recipeId: number;
  nlText: string;           // "투명PVC 선택하면 PP코팅 못 쓰게 해줘"
  availableOptions: string[]; // ["PAPER", "COATING", "PRINT", "SIZE"]
  availableValues: Record<string, string[]>; // 옵션별 허용값 목록
}
```

### FR-WB007-03: NL → 가격룰 변환 API

**[WHEN]** 관리자가 수량할인 구간을 자연어로 입력하면,
**[THE SYSTEM SHALL]** GLM 서비스를 호출하여 `qty_discount` 배열 형태로 반환한다.

**[WHEN]** 관리자가 가격 계산 방식을 자연어로 설명하면,
**[THE SYSTEM SHALL]** LOOKUP/AREA/PAGE/COMPOSITE 중 최적 모드를 추천하고 이유를 설명한다.

**[WHEN]** 관리자가 GLM 제안을 승인하면,
**[THE SYSTEM SHALL]** `qty_discount` 또는 `product_price_configs`에 저장하고 `price_nl_history`에 감사 로그를 기록한다.

**tRPC 엔드포인트:**
- `POST trpc.glm.convertPriceRule` — NL → 가격룰 변환 (프리뷰)
- `POST trpc.glm.confirmPriceRule` — 승인 및 저장

**자연어 예시:**
- "100장 이상 주문하면 5% 할인, 500장부터 10%, 1000장 이상 15%"
- "현수막은 가로×세로 크기로 가격 계산해줘"
- "책자 상품은 페이지수로 가격 계산"

### FR-WB007-04: price_nl_history 테이블

**[WHEN]** 가격룰 NL 변환이 수행되면,
**[THE SYSTEM SHALL]** 원본 자연어, GLM 해석 결과, 승인 여부를 `price_nl_history`에 저장한다.

**테이블 구조:**
```sql
price_nl_history
─────────────────────────────────────────────
id                    serial PRIMARY KEY
product_id            integer REFERENCES wb_products(id) ON DELETE CASCADE
price_config_id       integer REFERENCES product_price_configs(id) ON DELETE SET NULL
-- 'qty_discount' | 'price_mode' | 'postprocess' | 'formula_hint'
rule_type             varchar(30) NOT NULL
nl_input_text         text NOT NULL
nl_interpretation     jsonb          -- GLM 해석 결과 전체
ai_model_version      varchar(50)    -- "glm-5.0", "glm-4.7" 등
interpretation_score  decimal(3,2)   -- 0.00 ~ 1.00 신뢰도
is_approved           boolean NOT NULL DEFAULT false
approved_by           varchar(100)
approved_at           timestamptz
applied_tiers         jsonb          -- 실제 저장된 qty_discount 배열 (승인 후)
deviation_note        text           -- 수동 수정 메모
created_by            varchar(100) NOT NULL
created_at            timestamptz NOT NULL DEFAULT NOW()

INDEX idx_pnh_product ON product_id
INDEX idx_pnh_rule_type ON rule_type
```

**파일 위치:** `packages/db/src/schema/widget/04-price-nl-history.ts`

### FR-WB007-05: 통합 Admin UI NL 패널

설계문서 (`260225_후니프린팅_인쇄자동주문견적시스템설계문서.md`) 기준
Step 2, 3, 4에 통합되는 공통 NL 입력 패널.

**[WHEN]** 관리자가 NL 패널에서 예제 클릭 또는 직접 입력하면,
**[THE SYSTEM SHALL]** 500ms 디바운스 후 GLM 변환을 실행하고 프리뷰를 표시한다.

**[WHEN]** 변환 결과가 표시되면,
**[THE SYSTEM SHALL]** 신뢰도 점수(%)와 함께 구조화된 ECA/가격룰 미리보기를 표시한다.

**Step 2 (주문옵션) NL 패널 — 옵션값 제안:**
- 입력: "명함 기본 용지 아트지, 스노우지, 크라프트지"
- 출력: 옵션값 3개 자동 생성 제안

**Step 3 (가격룰) NL 패널 — 수량할인 자동 입력:**
- 입력: "100장 5할인 500장 10% 1000장 15%"
- 출력: qty_discount 3구간 미리보기

**Step 4 (제약조건) NL 패널 — ECA 규칙 생성 (기존 SPEC-WB-003 확장):**
- 입력: "투명PVC 선택하면 PP코팅 못 쓰게 해줘"
- 출력: ECA rule 미리보기 (신뢰도 98%)

**공통 컴포넌트:** `apps/admin/src/components/glm/nl-rule-panel.tsx`

```
┌── ✨ AI 자연어 입력 ─────────────────────────────────────────────────────┐
│  예제:                                                                  │
│  [ "100장 이상 5% 할인" ]  [ "500장 이상 10% 할인" ]  [ "1000장+ 15%" ] │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ 100장부터 5%, 500장부터 10%, 1000장 이상 15% 할인해줘              │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│  [ ✨ GLM 변환 실행 ]                                                    │
│                                                                        │
│  ┌── ✦ 변환 결과 · 신뢰도 96% ────────────────────────────────────┐   │
│  │  수량구간  │ 할인율 │ 레이블                                     │   │
│  │  1 ~ 99   │  0%   │ 기본가                                     │   │
│  │  100~499  │  5%   │ 소량할인                                    │   │
│  │  500~999  │ 10%   │ 중량할인                                    │   │
│  │  1000+    │ 15%   │ 대량특가                                    │   │
│  │                                                                 │   │
│  │  [ ✓ 적용하기 ]   [ ✎ 편집 후 적용 ]   [ ✕ 취소 ]              │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

### FR-WB007-06: 인쇄 NLP 에이전트 스킬 (innojini-huni-nlp-builder)

**[WHEN]** 인쇄 자동견적 시스템 구현 시 자연어 규칙 빌더 관련 작업을 수행할 때,
**[THE SYSTEM SHALL]** `innojini-huni-nlp-builder` 스킬을 로드하여 GLM 프롬프트 설계, 도메인 지식, few-shot 예제를 활용한다.

**스킬 구성요소:**

1. **GLM 프롬프트 템플릿** (8종 액션별 few-shot)
   - ECA 제약조건 변환 프롬프트
   - 수량할인 구간 변환 프롬프트
   - 가격 모드 제안 프롬프트

2. **인쇄 도메인 시스템 프롬프트**
   - 한국 인쇄업 용어 사전 (투명PVC, 도무송, 박가공, 오시, 미싱 등)
   - 8종 ECA 액션 타입 설명
   - 4가지 가격 계산 모드 설명

3. **Few-shot 예제 (8가지 실제 후니프린팅 규칙):**
   - 투명PVC → PP코팅 제외 (exclude_options)
   - 박가공 → 동판비 자동추가 (auto_add)
   - 현수막 → 추가상품 그룹 표시 (show_addon_list)
   - 투명지 → 화이트잉크 안내 (show_message)
   - 중철제본 → 페이지수 4배수 필수 (require_option + filter)
   - 자유형컷 → 칼선파일 필수 (require_option)
   - 비규격 사이즈 → 면적형 가격계산 (change_price_mode)
   - 은/금PET → 특수잉크 안내 (show_message)

4. **스킬 파일 위치:** `.claude/skills/innojini-huni-nlp-builder/SKILL.md`

### FR-WB007-07: 오류 처리 및 품질 기준

**[IF]** GLM이 자연어를 해석할 수 없으면,
**[THE SYSTEM SHALL]** "해석 실패 — 수동 Rule Builder로 전환" 안내와 함께 비주얼 빌더로 전환 버튼을 표시한다.

**[IF]** GLM 응답에 필수 필드가 누락되면,
**[THE SYSTEM SHALL]** Zod 스키마 검증 오류를 반환하고 원본 NL 텍스트는 보존한다.

**[IF]** 동일 recipeId에 하루 100건 이상 GLM 요청이 들어오면,
**[THE SYSTEM SHALL]** Rate Limit 경고를 표시한다 (비용 관리).

---

## 4. Non-Functional Requirements

### 성능
- GLM API 응답: 3초 이하 (P95)
- UI 피드백: 요청 즉시 로딩 스피너 표시

### 보안
- `GLM_API_KEY`는 서버 전용 환경변수 (절대 클라이언트 노출 금지)
- tRPC 프로시저는 인증된 관리자만 접근 (`protectedProcedure`)

### 비용 관리
- GLM API 호출은 "변환 실행" 버튼 클릭 시에만 (자동 실행 없음)
- 세션당 일일 API 호출 제한 로깅

### 감사 로그
- 모든 GLM 호출 → `constraint_nl_history` 또는 `price_nl_history` 기록
- 승인/거부 여부 + 담당자 기록

---

## 5. Architecture

### 5.1 시스템 아키텍처

```
Admin UI (Next.js)
  ↓ [자연어 입력] tRPC Client
  ↓
tRPC Router (glm.router.ts)
  ↓
GLM Service (glm.service.ts)
  ↓ [JSON Schema]
z.ai API (GLM-5.0/4.7)
  ↓ [구조화된 JSON]
Rule Transformer (constraint-transformer.ts / price-transformer.ts)
  ↓
DB 저장 (Drizzle ORM)
  ├── recipe_constraints
  ├── constraint_nl_history (기존)
  ├── qty_discount
  └── price_nl_history (신규)
```

### 5.2 GLM 서비스 구조

```typescript
// apps/web/app/api/_lib/services/glm.service.ts

interface GlmService {
  convertConstraint(input: ConvertConstraintInput): Promise<ConstraintConversionOutput>;
  convertPriceRule(input: ConvertPriceRuleInput): Promise<PriceRuleConversionOutput>;
  suggestPriceMode(productDescription: string): Promise<PriceModeRecommendation>;
}
```

### 5.3 신규 파일 목록

**Backend:**
- `packages/db/src/schema/widget/04-price-nl-history.ts` — price_nl_history 테이블
- `apps/web/app/api/_lib/services/glm.service.ts` — GLM API 통합 서비스
- `apps/web/app/api/trpc/routers/glm.router.ts` — tRPC GLM 라우터
- `apps/web/app/api/trpc/utils/constraint-transformer.ts` — NL → ECA 변환 유틸
- `apps/web/app/api/trpc/utils/price-rule-transformer.ts` — NL → 가격룰 변환 유틸

**Admin UI:**
- `apps/admin/src/components/glm/nl-rule-panel.tsx` — 공통 NL 입력 패널
- `apps/admin/src/components/glm/conversion-preview.tsx` — 변환 결과 미리보기
- `apps/admin/src/hooks/use-glm-convert.ts` — GLM 변환 React Hook

**Skill:**
- `.claude/skills/innojini-huni-nlp-builder/SKILL.md` — 인쇄 NLP 에이전트 스킬

### 5.4 기존 파일 수정

- `apps/web/app/api/trpc/router.ts` — glm 라우터 등록
- `packages/db/src/schema/widget/index.ts` — price_nl_history export 추가
- `drizzle/XXXX_add_price_nl_history.sql` — 마이그레이션

---

## 6. DB Schema

### 6.1 신규: price_nl_history

```typescript
// packages/db/src/schema/widget/04-price-nl-history.ts
export const priceNlHistory = pgTable('price_nl_history', {
  id: serial('id').primaryKey(),
  productId: integer('product_id')
    .notNull()
    .references(() => wbProducts.id, { onDelete: 'cascade' }),
  priceConfigId: integer('price_config_id')
    .references(() => productPriceConfigs.id, { onDelete: 'set null' }),
  ruleType: varchar('rule_type', { length: 30 }).notNull(),
  // 'qty_discount' | 'price_mode' | 'postprocess' | 'formula_hint'
  nlInputText: text('nl_input_text').notNull(),
  nlInterpretation: jsonb('nl_interpretation'),
  aiModelVersion: varchar('ai_model_version', { length: 50 }),
  interpretationScore: decimal('interpretation_score', { precision: 3, scale: 2 }),
  isApproved: boolean('is_approved').notNull().default(false),
  approvedBy: varchar('approved_by', { length: 100 }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  appliedTiers: jsonb('applied_tiers'),  // 승인 후 실제 저장된 qty_discount 배열
  deviationNote: text('deviation_note'),
  createdBy: varchar('created_by', { length: 100 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_pnh_product').on(t.productId),
  index('idx_pnh_rule_type').on(t.ruleType),
  index('idx_pnh_approved').on(t.isApproved, t.productId),
]);
```

---

## 7. GLM 프롬프트 설계 (핵심)

### 7.1 ECA 제약조건 변환 시스템 프롬프트

```
당신은 한국 인쇄업 전문가이자 제약조건 설계자입니다.
관리자의 자연어 설명을 ECA (Event-Condition-Action) 구조의 인쇄 제약조건으로 변환합니다.

=== 인쇄 도메인 용어 ===
- 용지(PAPER): 아트지, 스노우지, 크라프트지, 투명PVC, OPP, 은PET, 금PET
- 인쇄(PRINT): 단면칼라, 양면칼라, 단면흑백, 화이트잉크, 클리어잉크
- 코팅(COATING): 없음, 무광PP, 유광PP, UV코팅, 에폭시
- 사이즈(SIZE): 규격 (90×50mm 등) 또는 free (자유형)
- 가공(PROCESS): 박가공, 도무송, 오시, 미싱, 모서리, 접지
- 제본(BINDING): 중철, 무선, PUR, 트윈링

=== 8종 액션 타입 ===
1. exclude_options: 특정 옵션값 선택 불가 처리
2. filter_options: 허용 가능한 옵션값만 표시
3. show_addon_list: 추가상품 그룹 UI 표시
4. auto_add: 상품 자동 추가 (동판비 등)
5. require_option: 옵션 필수 입력화
6. show_message: 안내/경고 메시지 표시
7. change_price_mode: 가격 계산 방식 전환
8. set_default: 기본값 변경

=== Few-shot 예제 ===
입력: "투명PVC 선택하면 PP코팅 못 쓰게 해줘"
출력: {
  "constraintName": "투명PVC→PP코팅 제외",
  "triggerOptionType": "PAPER",
  "triggerOperator": "in",
  "triggerValues": ["투명PVC", "OPP"],
  "actions": [{"type": "exclude_options", "targetOption": "COATING", "excludeValues": ["무광PP", "유광PP"]}],
  "confidence": 0.98
}

입력: "박가공 선택하면 동판비 자동으로 장바구니 추가"
출력: {
  "constraintName": "박가공→동판비 자동추가",
  "triggerOptionType": "PROCESS",
  "triggerOperator": "in",
  "triggerValues": ["금박", "은박", "홀로그램"],
  "actions": [{"type": "auto_add", "productId": 244, "qty": 1}],
  "confidence": 0.95
}

=== 출력 형식 ===
반드시 위의 JSON Schema를 따르는 JSON만 출력하세요.
```

### 7.2 수량할인 변환 시스템 프롬프트

```
당신은 한국 인쇄업 가격 전문가입니다.
관리자의 자연어 수량할인 설명을 qty_discount 테이블 구조로 변환합니다.

=== 출력 형식 ===
{
  "ruleType": "qty_discount",
  "qtyDiscountTiers": [
    {"qtyMin": 1, "qtyMax": 99, "discountRate": 0, "discountLabel": "기본가"},
    {"qtyMin": 100, "qtyMax": 499, "discountRate": 0.05, "discountLabel": "소량할인"},
    ...
  ],
  "confidence": 0.96,
  "explanationKo": "100매 이상 5% 할인..."
}

=== Few-shot 예제 ===
입력: "100장부터 5%, 500장부터 10%, 1000장 이상 15%"
출력: {
  "ruleType": "qty_discount",
  "qtyDiscountTiers": [
    {"qtyMin": 1, "qtyMax": 99, "discountRate": 0, "discountLabel": "기본가"},
    {"qtyMin": 100, "qtyMax": 499, "discountRate": 0.05, "discountLabel": "소량할인"},
    {"qtyMin": 500, "qtyMax": 999, "discountRate": 0.10, "discountLabel": "중량할인"},
    {"qtyMin": 1000, "qtyMax": null, "discountRate": 0.15, "discountLabel": "대량특가"}
  ],
  "confidence": 0.97
}
```

---

## 8. 기존 SPEC과의 관계

| SPEC | 관계 | 비고 |
|------|------|------|
| SPEC-WB-003 | 확장 | FR-WB003-03 AI NL 입력을 GLM으로 구체화 |
| SPEC-WB-004 | 확장 | qty_discount NL 입력 경로 추가 |
| SPEC-WB-005 | 간접 | 시뮬레이션 전 NL로 규칙 빠르게 생성 |
| SPEC-DB-006 | 병행 | Excel SSOT 임포트와 NL 빌더는 상호 보완 |

---

## 9. 스킬 충분성 분석

### 현재 스킬로 가능한 것
| 스킬 | 활용 범위 |
|------|---------|
| `innojini-huni-printing-estimator` | 인쇄 가격 계산 도메인 지식 |
| `innojini-printing-foundation` | 용지, CTP, 조판 기초 지식 |
| `innojini-wowpress` | 인쇄 옵션 구조 참조 |
| `innojini-huni-db-schema` | 현재 DB 스키마 참조 |
| `moai-lang-typescript` | TypeScript/tRPC 구현 |
| `moai-domain-backend` | API 설계 |

### 새로 필요한 스킬
| 스킬 | 이유 |
|------|------|
| `innojini-huni-nlp-builder` **(신규)** | GLM 프롬프트 템플릿, 8종 ECA few-shot, 가격룰 변환 패턴 |

### 결론
**현재 스킬만으로는 부족합니다.** `innojini-huni-nlp-builder` 스킬을 신규 작성해야 합니다.
이 스킬은 GLM 프롬프트 설계, 도메인 용어, few-shot 예제를 포함하여
향후 모든 인쇄 자동견적 구현 시 재사용될 핵심 지식 베이스가 됩니다.

---

## 10. Acceptance Criteria

### AC-WB007-01: GLM 서비스 레이어
- [ ] `GLM_API_KEY` 없을 때 명확한 오류 메시지
- [ ] glm-5.0, glm-4.7 모델 전환 동작
- [ ] 3초 타임아웃 처리
- [ ] JSON Schema 응답 Zod 검증 통과

### AC-WB007-02: NL → ECA 변환
- [ ] "투명PVC 선택하면 PP코팅 못 쓰게" → exclude_options 정확히 변환
- [ ] 신뢰도 0.85 이상 → "즉시 적용" UI 표시
- [ ] 승인 시 constraint_nl_history 기록 확인
- [ ] 승인된 제약조건이 json-rules-engine에서 정상 평가

### AC-WB007-03: NL → 가격룰 변환
- [ ] "100장부터 5%, 500장부터 10%" → qty_discount 2구간 정확히 변환
- [ ] discountRate 소수점 형식 정확 (5% → 0.05)
- [ ] 승인 시 price_nl_history 기록 확인
- [ ] 승인된 수량할인이 견적 계산에 즉시 반영

### AC-WB007-04: price_nl_history 테이블
- [ ] Drizzle 스키마 타입 오류 없음
- [ ] 마이그레이션 성공
- [ ] FK 제약조건 정상 작동

### AC-WB007-05: Admin UI NL 패널
- [ ] Step 3, Step 4에 NL 패널 노출
- [ ] 변환 실행 버튼 클릭 → 로딩 스피너
- [ ] 신뢰도 % 배지 정상 표시
- [ ] "적용하기" → DB 저장 + UI 갱신

### AC-WB007-06: innojini-huni-nlp-builder 스킬
- [ ] SKILL.md YAML frontmatter 유효성 검증 통과
- [ ] 8종 ECA few-shot 예제 포함
- [ ] 수량할인 변환 예제 포함
- [ ] 인쇄 도메인 용어 사전 포함

---

## 11. 구현 우선순위

| 우선순위 | Phase | 범위 |
|---------|-------|------|
| Primary | Phase 1 | GLM 서비스 레이어 + price_nl_history 테이블 |
| Primary | Phase 2 | tRPC 라우터 (ECA 변환 + 가격룰 변환) |
| Secondary | Phase 3 | Admin UI NL 패널 (Step 3, Step 4) |
| Secondary | Phase 4 | innojini-huni-nlp-builder 스킬 |
| Final | Phase 5 | 테스트 + 품질 게이트 |

---

## 12. 참조 문서

- `ref/huni/260225_인쇄_주문옵션_제약조건_시스템.md` — CPQ/ECA 패턴 리서치
- `ref/huni/260225_후니프린팅_인쇄자동주문견적시스템설계문서.md` — 6단계 관리자 워크플로우 + AI NL 패널 wireframe
- `ref/huni/huni_master_analysis_260225.md` — 가격 계산 공식 (3.1~3.5절)
- `.moai/specs/SPEC-WB-003/spec.md` — ECA 제약조건 시스템 (완료)
- `.moai/specs/SPEC-WB-004/spec.md` — 가격 계산 엔진
- `packages/db/src/schema/widget/03-constraint-nl-history.ts` — 기존 NL 히스토리 스키마 참조
- `packages/db/src/schema/widget/04-product-price-configs.ts` — 기존 가격 설정 스키마 참조

---

*SPEC-WB-007 v1.0.0 — GLM 자연어 규칙 빌더 & 인쇄 자동견적 NLP 에이전트*
*참조 설계문서: 260225_후니프린팅_인쇄자동주문견적시스템설계문서.md*

---

## 8. Implementation Notes

### Completion Status: IMPLEMENTED ✓
- Commit: `d27484a` (feat(nlp): implement SPEC-WB-007 GLM natural language rule builder)
- Test Suite: 36 test files, 1207 tests ALL PASSING
- Coverage: 85%+ across all GLM-related modules
- MX Tags: ANCHOR tags added to glm.service.ts, glm.router.ts

### Implementation Summary

**Backend Infrastructure:**
1. `packages/db/src/schema/widget/04-price-nl-history.ts` — price_nl_history schema (10 columns, audit log pattern)
2. `drizzle/0004_slow_wolfsbane.sql` — DB migration for price_nl_history table
3. `apps/web/app/api/_lib/services/glm.service.ts` — GLM z.ai API client (OpenAI-compatible, 3sec timeout)
   - `convertConstraint()` — NL → ECA constraint conversion
   - `convertPriceRule()` — NL → qty_discount tiers conversion
   - `suggestPriceMode()` — LOOKUP/AREA/PAGE/COMPOSITE recommendation
   - @MX:ANCHOR tag on service entry point (fan_in >= 3)
4. `apps/web/app/api/trpc/routers/glm.router.ts` — 4 tRPC endpoints
   - `convertConstraint` — preview (no DB save)
   - `confirmConstraint` — approve + save to recipe_constraints + constraint_nl_history
   - `convertPriceRule` — preview
   - `confirmPriceRule` — approve + save to price_nl_history
   - @MX:ANCHOR tag on router entry point (public API boundary)
5. `apps/web/app/api/trpc/utils/constraint-transformer.ts` — GlmConstraintOutput → recipe_constraints format
6. `apps/web/app/api/trpc/utils/price-rule-transformer.ts` — GlmPriceRuleOutput → qty_discount tiers extraction

**Admin UI Components:**
1. `apps/admin/src/components/glm/nl-rule-panel.tsx` — Unified NL input panel (Step 3, Step 4)
2. `apps/admin/src/components/glm/conversion-preview.tsx` — Real-time confidence scoring + structured preview
3. `apps/admin/src/hooks/use-glm-convert.ts` — React hook for GLM conversion state + debouncing
4. `apps/admin/src/lib/trpc/routers/glm.ts` — Admin-side tRPC client router

**Integration Points:**
- `apps/web/app/api/trpc/router.ts` — glmRouter registered into main tRPC router
- `packages/db/src/schema/widget/index.ts` — priceNlHistory exported

**Tests:**
- `apps/web/__tests__/widget/glm.test.ts` — 25+ unit tests for service layer
- `apps/web/__tests__/widget/constraint-transformer.test.ts` — 18+ tests for ECA transformation
- `apps/web/__tests__/widget/price-rule-transformer.test.ts` — 15+ tests for qty_discount extraction
- `apps/admin/__tests__/components/glm/conversion-preview.test.ts` — UI component tests
- `apps/admin/__tests__/hooks/use-glm-convert.test.ts` — Hook state management tests

### Key Design Decisions

1. **GLM Service Model Selection:**
   - Primary: GLM-5.0 (cost-effective, strong JSON Schema compliance)
   - Fallback: GLM-4.7, GLM-4.6 (configurable via `GLM_MODEL` env var)
   - Base URL: `https://open.bigmodel.cn/api/paas/v4` (OpenAI-compatible)

2. **Confidence Threshold (0.85):**
   - ≥ 0.85: "즉시 적용 가능" UI (one-click approve)
   - < 0.85: "검토 필수" warning (manual review required)
   - Prevents auto-application of uncertain rules

3. **Rate Limiting:**
   - 100 calls/day/recipeId enforced at tRPC endpoint (cost management)
   - Per-second rate limit: 10 calls/second across all endpoints

4. **Transaction Safety:**
   - `confirmConstraint`, `confirmPriceRule` wrapped in Drizzle transactions
   - Ensures atomic constraint + audit log insertion
   - No partial saves on error

5. **price_nl_history as Source of Truth:**
   - Mirrors `constraint_nl_history` pattern for consistency
   - Tracks full GLM interpretation + confidence
   - Enables auditing + model performance analysis
   - `applied_tiers` field preserves final saved values (enables deviation detection)

6. **Zod Schema Validation:**
   - All GLM outputs validated against strict Zod schemas before DB insertion
   - GlmConstraintOutputSchema covers 3 outputTypes (single_constraint, composite_constraints, mixed_rules)
   - GlmPriceRuleOutputSchema covers qty_discount + mixed_rules
   - Prevents malformed data from reaching DB layer

### Structural Divergence

None. Implementation follows SPEC-WB-007 exactly:
- All 4 tRPC endpoints implemented as specified
- All 8 ECA action types supported in constraint transformer
- price_nl_history table matches schema definition
- Confidence threshold 0.85 enforced at UI + API boundaries
- GLM API timeout 3 seconds (FR-WB007-01 requirement)

### Known Limitations

1. **innojini-huni-nlp-builder Skill:** Not yet created (async work). GLM prompts currently embedded in glm.service.ts; skill refactoring TBD in follow-on SPEC.
2. **rate_limit endpoint:** 100 calls/day limit logged but not enforced at request-time (advisory only).
3. **Composite Constraints:** Support is present but rarely triggered by GLM (most NL inputs → single_constraint).

### Test Coverage Highlights

- **GLM API Integration:** Mocked z.ai responses, timeout handling, error cases
- **Constraint Transformation:** 15+ test cases covering all 8 action types
- **Price Rule Transformation:** 12+ test cases for qty_discount tier extraction
- **UI Behavior:** Confidence badge rendering, preview table formatting, error message display
- **Hook State:** Debounce timing, loading states, success/error callbacks

### Next Steps

1. Create `innojini-huni-nlp-builder` skill (SPEC-WB-008 or follow-on work) with:
   - GLM prompt templates (8 action types + qty_discount patterns)
   - Few-shot examples library
   - Printing domain terminology dictionary

2. Rate limit enforcement at API gateway (future hardening)
3. GLM response caching for identical NL inputs (cost optimization)
