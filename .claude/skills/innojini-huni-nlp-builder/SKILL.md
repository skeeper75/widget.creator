---
name: innojini-huni-nlp-builder
description: >
  HuniPrinting GLM-powered Natural Language Rule Builder skill.
  Provides GLM prompt templates, printing domain knowledge, and extensive few-shot
  examples for converting Korean natural language into structured ECA constraints,
  quantity discount tiers, price mode recommendations, WowPress req_*/rst_* style
  option dependency rules, and multi-domain composite rules.
  Covers: single-domain rules, multi-domain composite rules, chain rules (A→B→C),
  option dependency chains (WowPress pattern), price+constraint combinations,
  and TypeScript/Drizzle script generation output.
  Use when building or testing the NL rule builder feature (SPEC-WB-007).
license: Apache-2.0
compatibility: Designed for Claude Code
allowed-tools: Read Grep Glob Bash
user-invocable: false
metadata:
  version: "2.0.0"
  category: "domain"
  status: "active"
  updated: "2026-02-27"
  modularized: "false"
  tags: "printing, glm, nlp, eca, price-rules, huni, wowpress, req-rst, composite-rules"
  related-skills: "innojini-printing-foundation,innojini-huni-printing-estimator,innojini-huni-db-schema,innojini-wowpress"
  context7-libraries: "openai,drizzle-orm,trpc,zod"

# MoAI Extension: Progressive Disclosure
progressive_disclosure:
  enabled: true
  level1_tokens: 130
  level2_tokens: 12000

# MoAI Extension: Triggers
triggers:
  keywords: ["glm", "z.ai", "자연어", "nlp", "nl-rule", "convertConstraint", "convertPriceRule", "price_nl_history", "nlp-builder", "constraint-transformer", "req_", "rst_", "복합규칙", "연쇄규칙", "wowpress"]
  agents: ["expert-backend", "expert-frontend", "manager-tdd", "manager-ddd"]
  phases: ["run"]
---

# innojini-huni-nlp-builder v2.0

후니프린팅 GLM 자연어 규칙 빌더 — 도메인 지식, 프롬프트 템플릿, 복합 규칙 변환 가이드.

---

## 1. 시스템 개요

### 1.1 핵심 설계 원칙

> **인쇄는 주문제조 — 요리와 같다:**
> 상품은 사이즈·용지·인쇄·후가공 등 재료를 조합해 만든다.
> GLM은 관리자의 자연어 의도를 구조화된 규칙(ECA 제약, 수량할인)으로 변환하는 번역기다.

> **WowPress req_*/rst_* 패턴 원리:**
> - `req_*` = "A를 선택하면 B도 반드시 선택해야 한다" (필수 연계)
> - `rst_*` = "A를 선택하면 B는 선택 불가" (불가 제약)
> WowPress의 이 두 패턴이 후니프린팅 ECA 시스템의 `require_option` / `exclude_options`에 대응됩니다.

> **자연어 변환의 3가지 출력 레벨:**
> 1. **프리뷰 JSON** — GLM이 반환하는 구조화 데이터 (확인용)
> 2. **확인 후 DB 저장** — `recipe_constraints` + `constraint_nl_history`에 트랜잭션 저장
> 3. **Drizzle 스크립트** — 복잡한 복합 규칙의 경우 TypeScript 마이그레이션 스크립트 생성

### 1.2 GLM API 설정

```typescript
// z.ai API — OpenAI 호환 인터페이스
// GLM_API_KEY — z.ai API 키 (필수, 서버 전용)
// GLM_MODEL   — glm-5.0 (기본) | glm-4.7 | glm-4.6
// GLM_BASE_URL — https://open.bigmodel.cn/api/paas/v4

const response = await client.chat.completions.create({
  model: process.env.GLM_MODEL ?? 'glm-5.0',
  messages: [
    { role: 'system', content: DOMAIN_SYSTEM_PROMPT },
    { role: 'user', content: nlText },
  ],
  response_format: { type: 'json_object' },
  temperature: 0.1,  // 일관성 우선
  max_tokens: 2000,  // 복합 규칙은 출력이 길어짐
});
```

---

## 2. 인쇄 도메인 용어 사전

### 2.1 옵션 타입 매핑 (WowPress ↔ 후니프린팅)

| 후니 타입 코드 | WowPress 대응 | 한국어 | 허용값 예시 |
|--------------|--------------|--------|------------|
| PAPER | paperinfo | 용지/지질 | 아트지, 스노우지, 크라프트지, 투명PVC, OPP, 은PET, 금PET |
| PRINT | colorinfo | 인쇄/도수 | 단면칼라, 양면칼라, 단면흑백, 화이트잉크 |
| COATING | awkjobinfo (코팅) | 코팅 | 없음, 무광PP, 유광PP, UV코팅, 에폭시 |
| SIZE | sizeinfo | 사이즈/규격 | 90×50, A4, A5, free(자유형) |
| PROCESS | awkjobinfo | 후가공 | 박가공, 도무송, 오시, 미싱, 모서리, 접지 |
| BINDING | awkjobinfo (제본) | 제본 | 중철, 무선, PUR, 트윈링 |
| PAGES | coverinfo pagecnt | 페이지수 | 4의 배수 |
| QTY | ordqty | 수량 | 숫자 |
| PRINT_METHOD | prsjobinfo | 인쇄방식 | 오프셋, 디지털, 합판, 독판 |

### 2.2 WowPress 제약 패턴 → ECA 액션 매핑

| WowPress 패턴 | 의미 | ECA 액션 |
|--------------|------|---------|
| `req_awkjob` | 해당 지질 선택 시 후가공 필수 | `require_option` |
| `req_color` | 해당 지질은 특정 도수만 가능 | `filter_options` |
| `req_width/height` | 비규격 시 치수 입력 필수 | `require_option` |
| `rst_prsjob` | 해당 지질은 특정 인쇄기 불가 | `exclude_options` |
| `rst_awkjob` | 후가공 상호 배제 | `exclude_options` |
| `rst_color` | 해당 지질은 특정 도수 불가 | `exclude_options` |
| `addtype: select/checkbox` | 추가 도수 선택 방식 | `show_addon_list` |

### 2.3 인쇄 용어 해설

| 용어 | 설명 |
|------|------|
| 도무송 | 칼금형으로 원하는 모양 재단 |
| 박가공 | 금박·은박 열전사 인쇄 (동판비 필수) |
| 오시 | 접지용 눌림선 (책자 표지 필수) |
| 미싱 | 뜯기 쉽도록 점선 구멍 |
| 동판비 | 박가공용 금형 제작비 (별도 상품) |
| 칼선 | 재단 경계선 (도무송/자유형 필수) |
| 합판 | 여러 작업을 한 판에 배치 (비용 절감) |
| 독판 | 단일 작업만 인쇄 (품질 우선) |
| 크립 | 중철 책자 내지 재단 보정값 |
| 책등 | 무선책자 등 두께 |

---

## 3. 8종 ECA 액션 타입 정의

```typescript
type ConstraintAction =
  | { type: "exclude_options"; targetOption: string; excludeValues: string[] }
  // WowPress rst_* 패턴: A 선택 시 B 선택 불가
  // 예: 투명PVC → 무광PP, 유광PP 제거

  | { type: "filter_options"; targetOption: string; allowedValues: string[] }
  // WowPress req_color 패턴: A 선택 시 B는 이 값들만 허용
  // 예: 중철제본 → 페이지수 4의 배수만

  | { type: "show_addon_list"; addonGroupId: number }
  // WowPress addtype 패턴: 추가상품 그룹 UI 표시
  // 예: 현수막 → 설치부속품 목록

  | { type: "auto_add"; productId: number; qty: number }
  // WowPress 동반 필수 상품: 박가공 → 동판비 자동 추가
  // 예: 박가공 선택 → 동판비(id:244) 1개

  | { type: "require_option"; targetOption: string }
  // WowPress req_awkjob 패턴: A 선택 시 B 필수
  // 예: 도무송 → 칼선파일 업로드 필수

  | { type: "show_message"; level: "info" | "warn" | "error"; message: string }
  // 안내/경고/오류 메시지 표시
  // 예: 투명지 → 화이트잉크 안내

  | { type: "change_price_mode"; newMode: "LOOKUP" | "AREA" | "PAGE" | "COMPOSITE" }
  // 가격 계산 방식 전환
  // 예: 자유형 사이즈 → AREA 모드

  | { type: "set_default"; targetOption: string; defaultValue: string };
  // 기본값 변경
  // 예: 크라프트지 → 코팅 기본값을 "없음"으로
```

---

## 4. GLM 출력 형식 (4가지)

### 4.1 단일 ECA 규칙

```typescript
interface SingleConstraintOutput {
  outputType: "single_constraint";
  constraintName: string;
  triggerOptionType: string;
  triggerOperator: "in" | "equals" | "gte" | "lte" | "not_in";
  triggerValues: string[];
  extraConditions?: object;           // AND/OR 복합 조건
  actions: ConstraintAction[];
  confidence: number;
  explanationKo: string;
  alternativeInterpretations?: SingleConstraintOutput[];
}
```

### 4.2 복합 ECA 규칙 묶음 (한 자연어 입력 → 여러 규칙)

```typescript
interface CompositeConstraintOutput {
  outputType: "composite_constraints";
  totalRules: number;
  rules: SingleConstraintOutput[];    // 여러 독립 규칙
  executionOrder: number[];           // 규칙 적용 순서 (인덱스)
  sharedTrigger?: string;             // 공통 트리거가 있을 경우
  confidence: number;
  explanationKo: string;
}
```

### 4.3 수량할인 가격룰

```typescript
interface QtyDiscountOutput {
  outputType: "qty_discount";
  qtyDiscountTiers: {
    qtyMin: number;
    qtyMax: number | null;
    discountRate: number;
    discountLabel: string;
  }[];
  confidence: number;
  explanationKo: string;
}
```

### 4.4 복합 가격+제약 규칙 (한 자연어 → 가격룰 + ECA 동시)

```typescript
interface MixedRuleOutput {
  outputType: "mixed_rules";
  constraints: SingleConstraintOutput[];
  priceRules: QtyDiscountOutput | PriceModeOutput | null;
  totalActions: number;
  confidence: number;
  explanationKo: string;
  implementationScript?: string;  // TypeScript 스크립트 (복잡도 높을 때)
}
```

---

## 5. GLM 프롬프트 템플릿

### 5.1 마스터 시스템 프롬프트 (모든 변환 공통)

```
당신은 한국 인쇄업 ECA 규칙 설계 전문가입니다.
관리자의 자연어 설명을 구조화된 인쇄 규칙(ECA 제약조건 + 가격룰)으로 변환합니다.
반드시 JSON 형식으로만 응답하세요.

=== 핵심 원칙 ===
1. 한 문장에 여러 규칙이 있으면 outputType을 "composite_constraints" 또는 "mixed_rules"로 사용하세요
2. 가격 변경 + 제약조건이 동시에 나오면 "mixed_rules"로 처리하세요
3. A→B→C 연쇄 규칙은 executionOrder로 순서를 명시하세요
4. 확신도(confidence)가 낮을 때는 alternativeInterpretations를 1~2개 제공하세요

=== 옵션 타입 코드 ===
PAPER(용지), PRINT(인쇄/도수), COATING(코팅), SIZE(사이즈), PROCESS(후가공),
BINDING(제본), PAGES(페이지수), QTY(수량), PRINT_METHOD(인쇄방식)

=== WowPress req_*/rst_* 패턴 → ECA 변환 규칙 ===
req_awkjob → require_option (후가공 필수 연계)
req_color  → filter_options (도수 범위 제한)
rst_prsjob → exclude_options (인쇄방식 불가)
rst_awkjob → exclude_options (후가공 상호 배제)
```

### 5.2 ECA 변환 프롬프트 (단일/복합 자동 판단)

```
=== 8종 액션 타입 ===
exclude_options, filter_options, show_addon_list, auto_add,
require_option, show_message, change_price_mode, set_default

=== 출력 Schema 선택 기준 ===
- 단순 1개 규칙 → outputType: "single_constraint"
- 여러 독립 규칙 → outputType: "composite_constraints"
- 가격+제약 동시 → outputType: "mixed_rules"
- 수량할인만 → outputType: "qty_discount"
```

### 5.3 수량할인 변환 프롬프트

```
=== 출력 Schema ===
{
  "outputType": "qty_discount",
  "qtyDiscountTiers": [
    {"qtyMin": number, "qtyMax": number|null, "discountRate": number, "discountLabel": "string"}
  ],
  "confidence": 0.0~1.0,
  "explanationKo": "string"
}

주의: qtyMax가 null이면 "이상(상한 없음)"을 의미합니다.
discountRate는 0.0~1.0 범위입니다. (0.05 = 5%)
```

---

## 6. Few-shot 예제 — 단일 규칙 (8가지 기본 패턴)

### 6.1 exclude_options (WowPress rst_awkjob 패턴)

```json
// 입력: "투명PVC 선택하면 PP코팅 못 쓰게 해줘"
{
  "outputType": "single_constraint",
  "constraintName": "투명PVC→PP코팅 제외",
  "triggerOptionType": "PAPER",
  "triggerOperator": "in",
  "triggerValues": ["투명PVC", "OPP"],
  "actions": [{"type": "exclude_options", "targetOption": "COATING", "excludeValues": ["무광PP", "유광PP"]}],
  "confidence": 0.98,
  "explanationKo": "투명 소재는 PP코팅이 불가합니다 (접착력 부족)"
}
```

### 6.2 auto_add (WowPress 동반 필수 상품 패턴)

```json
// 입력: "박가공 선택하면 동판비 자동으로 장바구니에 추가"
{
  "outputType": "single_constraint",
  "constraintName": "박가공→동판비 자동추가",
  "triggerOptionType": "PROCESS",
  "triggerOperator": "in",
  "triggerValues": ["금박", "은박", "홀로그램"],
  "actions": [{"type": "auto_add", "productId": 244, "qty": 1}],
  "confidence": 0.95,
  "explanationKo": "박가공(금박/은박/홀로그램) 선택 시 동판비 상품을 자동으로 추가합니다"
}
```

### 6.3 show_addon_list (WowPress addtype 패턴)

```json
// 입력: "현수막이나 배너 선택하면 설치부속품 추가상품 목록 보여줘"
{
  "outputType": "single_constraint",
  "constraintName": "현수막→설치부속품 표시",
  "triggerOptionType": "PAPER",
  "triggerOperator": "in",
  "triggerValues": ["현수막천", "메쉬", "터폴린"],
  "actions": [{"type": "show_addon_list", "addonGroupId": 12}],
  "confidence": 0.92,
  "explanationKo": "현수막 소재 선택 시 설치부속품(그로밋, 고리, 봉 등) 목록을 표시합니다"
}
```

### 6.4 filter_options (WowPress req_color 패턴)

```json
// 입력: "중철제본은 페이지수를 4의 배수만 허용"
{
  "outputType": "single_constraint",
  "constraintName": "중철→페이지수 4배수 제한",
  "triggerOptionType": "BINDING",
  "triggerOperator": "equals",
  "triggerValues": ["중철"],
  "actions": [{"type": "filter_options", "targetOption": "PAGES", "allowedValues": ["4","8","12","16","20","24","28","32","36","40","44","48"]}],
  "confidence": 0.99,
  "explanationKo": "중철제본은 페이지수가 반드시 4의 배수여야 합니다"
}
```

### 6.5 require_option (WowPress req_awkjob 패턴)

```json
// 입력: "도무송이나 자유형 컷 선택하면 칼선파일 업로드 필수로"
{
  "outputType": "single_constraint",
  "constraintName": "도무송→칼선파일 필수",
  "triggerOptionType": "PROCESS",
  "triggerOperator": "in",
  "triggerValues": ["도무송", "자유형컷"],
  "actions": [{"type": "require_option", "targetOption": "CUT_LINE_FILE"}],
  "confidence": 0.97,
  "explanationKo": "도무송/자유형 컷 선택 시 칼선 파일 업로드가 필수입니다"
}
```

### 6.6 show_message (안내/경고)

```json
// 입력: "투명지나 OPP 선택하면 화이트잉크 필요하다고 경고"
{
  "outputType": "single_constraint",
  "constraintName": "투명지→화이트잉크 경고",
  "triggerOptionType": "PAPER",
  "triggerOperator": "in",
  "triggerValues": ["투명PVC", "OPP", "투명PET"],
  "actions": [{"type": "show_message", "level": "warn", "message": "투명 소재는 화이트잉크 인쇄를 권장합니다. 흰색 영역이 있는 경우 반드시 화이트잉크를 선택하세요."}],
  "confidence": 0.96,
  "explanationKo": "투명 소재 선택 시 화이트잉크 사용 안내 경고를 표시합니다"
}
```

### 6.7 change_price_mode (가격 모드 전환)

```json
// 입력: "자유형이나 비규격 사이즈면 면적으로 가격 계산해줘"
{
  "outputType": "single_constraint",
  "constraintName": "자유형→면적형 가격계산",
  "triggerOptionType": "SIZE",
  "triggerOperator": "equals",
  "triggerValues": ["free", "자유형"],
  "actions": [{"type": "change_price_mode", "newMode": "AREA"}],
  "confidence": 0.94,
  "explanationKo": "자유형(비규격) 사이즈 선택 시 가격 계산을 면적형(㎡당 단가)으로 전환합니다"
}
```

### 6.8 set_default (기본값 변경)

```json
// 입력: "크라프트지 선택하면 코팅을 기본적으로 없음으로 해줘"
{
  "outputType": "single_constraint",
  "constraintName": "크라프트지→코팅 기본값 없음",
  "triggerOptionType": "PAPER",
  "triggerOperator": "equals",
  "triggerValues": ["크라프트지"],
  "actions": [{"type": "set_default", "targetOption": "COATING", "defaultValue": "없음"}],
  "confidence": 0.91,
  "explanationKo": "크라프트지 특유의 질감 유지를 위해 코팅 기본값을 '없음'으로 설정합니다"
}
```

---

## 7. Few-shot 예제 — 복합 규칙 (composite_constraints)

### 7.1 박가공 → 동판비 + 코팅 제한 + 안내 (3가지 동시)

```json
// 입력: "박가공 선택하면 동판비 자동추가하고, UV코팅만 허용하고, 에폭시 코팅은 못 쓰게 해줘. 그리고 박가공 주의사항도 안내해줘"
{
  "outputType": "composite_constraints",
  "totalRules": 3,
  "sharedTrigger": "PROCESS in [금박, 은박, 홀로그램]",
  "rules": [
    {
      "constraintName": "박가공→동판비 자동추가",
      "triggerOptionType": "PROCESS",
      "triggerOperator": "in",
      "triggerValues": ["금박", "은박", "홀로그램"],
      "actions": [{"type": "auto_add", "productId": 244, "qty": 1}],
      "confidence": 0.97
    },
    {
      "constraintName": "박가공→에폭시 코팅 제외",
      "triggerOptionType": "PROCESS",
      "triggerOperator": "in",
      "triggerValues": ["금박", "은박", "홀로그램"],
      "actions": [{"type": "exclude_options", "targetOption": "COATING", "excludeValues": ["에폭시"]}],
      "confidence": 0.93
    },
    {
      "constraintName": "박가공→주의사항 안내",
      "triggerOptionType": "PROCESS",
      "triggerOperator": "in",
      "triggerValues": ["금박", "은박", "홀로그램"],
      "actions": [{"type": "show_message", "level": "info", "message": "박가공은 별도 동판(금형) 제작이 필요합니다. 초도 주문 시 동판비가 자동으로 추가됩니다."}],
      "confidence": 0.98
    }
  ],
  "executionOrder": [2, 1, 0],
  "confidence": 0.94,
  "explanationKo": "박가공 선택 시 3가지 규칙이 동시에 적용됩니다: 동판비 자동추가, 에폭시 코팅 제외, 주의사항 안내"
}
```

### 7.2 무선책자 옵션 의존성 체인 (WowPress 선택 순서 패턴)

```json
// 입력: "무선책자는 표지에 UV코팅만 허용하고, 내지는 코팅 안 되게 하고, 100페이지 이상이면 PUR제본 권장 안내해줘"
{
  "outputType": "composite_constraints",
  "totalRules": 3,
  "rules": [
    {
      "constraintName": "무선책자→표지 UV코팅만",
      "triggerOptionType": "BINDING",
      "triggerOperator": "equals",
      "triggerValues": ["무선"],
      "extraConditions": {"coverType": "COVER"},
      "actions": [{"type": "filter_options", "targetOption": "COATING", "allowedValues": ["없음", "UV코팅", "무광PP", "유광PP"]}],
      "confidence": 0.85
    },
    {
      "constraintName": "무선책자→내지 코팅 제외",
      "triggerOptionType": "BINDING",
      "triggerOperator": "equals",
      "triggerValues": ["무선"],
      "extraConditions": {"coverType": "INNER"},
      "actions": [{"type": "exclude_options", "targetOption": "COATING", "excludeValues": ["무광PP", "유광PP", "UV코팅", "에폭시"]}],
      "confidence": 0.92
    },
    {
      "constraintName": "무선책자→100P+ PUR 권장",
      "triggerOptionType": "PAGES",
      "triggerOperator": "gte",
      "triggerValues": ["100"],
      "extraConditions": {"binding": "무선"},
      "actions": [{"type": "show_message", "level": "info", "message": "100페이지 이상 무선책자는 PUR제본을 권장합니다. PUR제본은 내구성이 더 강합니다."}],
      "confidence": 0.88
    }
  ],
  "executionOrder": [0, 1, 2],
  "confidence": 0.88,
  "explanationKo": "무선책자 관련 3가지 규칙: 표지 코팅 제한, 내지 코팅 금지, 100P 이상 PUR 권장"
}
```

### 7.3 WowPress rst_* 다중 배제 패턴 (용지 + 인쇄기 + 후가공 동시 제약)

```json
// 입력: "은PET 용지는 UV코팅만 가능하고, 오프셋 인쇄기 못 쓰고, 수성코팅도 안 되고, 투명PET랑 같이 합판 못 해"
{
  "outputType": "composite_constraints",
  "totalRules": 4,
  "sharedTrigger": "PAPER in [은PET, 금PET]",
  "rules": [
    {
      "constraintName": "은/금PET→UV코팅만 허용",
      "triggerOptionType": "PAPER",
      "triggerOperator": "in",
      "triggerValues": ["은PET", "금PET"],
      "actions": [{"type": "filter_options", "targetOption": "COATING", "allowedValues": ["없음", "UV코팅"]}],
      "confidence": 0.93
    },
    {
      "constraintName": "은/금PET→오프셋 불가",
      "triggerOptionType": "PAPER",
      "triggerOperator": "in",
      "triggerValues": ["은PET", "금PET"],
      "actions": [{"type": "exclude_options", "targetOption": "PRINT_METHOD", "excludeValues": ["오프셋", "오프셋합판"]}],
      "confidence": 0.96
    },
    {
      "constraintName": "은/금PET→수성코팅 불가",
      "triggerOptionType": "PAPER",
      "triggerOperator": "in",
      "triggerValues": ["은PET", "금PET"],
      "actions": [{"type": "exclude_options", "targetOption": "COATING", "excludeValues": ["수성코팅"]}],
      "confidence": 0.94
    },
    {
      "constraintName": "은/금PET→특수소재 안내",
      "triggerOptionType": "PAPER",
      "triggerOperator": "in",
      "triggerValues": ["은PET", "금PET"],
      "actions": [{"type": "show_message", "level": "info", "message": "메탈릭 소재는 독판(단독) 인쇄로만 처리됩니다. 합판 진행이 불가합니다."}],
      "confidence": 0.90
    }
  ],
  "executionOrder": [0, 1, 2, 3],
  "confidence": 0.93,
  "explanationKo": "은/금PET 메탈릭 소재의 4가지 제약: UV코팅만 허용, 오프셋 불가, 수성코팅 불가, 독판 안내"
}
```

---

## 8. Few-shot 예제 — 복합 가격+제약 혼합 (mixed_rules)

### 8.1 스티커 자유형 사이즈 → 면적가격 + 칼선 필수 + 할증 안내

```json
// 입력: "스티커에서 자유형 모양 선택하면, 면적으로 가격 계산하고, 칼선파일 필수로 하고, 비규격이라 20% 할증된다고 안내해줘"
{
  "outputType": "mixed_rules",
  "constraints": [
    {
      "constraintName": "자유형→면적형 가격계산",
      "triggerOptionType": "SIZE",
      "triggerOperator": "equals",
      "triggerValues": ["free", "자유형"],
      "actions": [{"type": "change_price_mode", "newMode": "AREA"}],
      "confidence": 0.95
    },
    {
      "constraintName": "자유형→칼선파일 필수",
      "triggerOptionType": "SIZE",
      "triggerOperator": "equals",
      "triggerValues": ["free", "자유형"],
      "actions": [{"type": "require_option", "targetOption": "CUT_LINE_FILE"}],
      "confidence": 0.97
    },
    {
      "constraintName": "자유형→비규격 할증 안내",
      "triggerOptionType": "SIZE",
      "triggerOperator": "equals",
      "triggerValues": ["free", "자유형"],
      "actions": [{"type": "show_message", "level": "warn", "message": "비규격(자유형) 스티커는 면적 단가에 20% 비규격 할증이 적용됩니다."}],
      "confidence": 0.89
    }
  ],
  "priceRules": null,
  "totalActions": 3,
  "confidence": 0.93,
  "explanationKo": "자유형 스티커: 면적형 가격 전환 + 칼선 파일 필수 + 할증 안내 (3가지 동시)"
}
```

### 8.2 수량할인 + 오프셋 인쇄 시 할인 추가 (가격+제약 혼합)

```json
// 입력: "명함 100장 이상 5%, 500장 이상 10% 할인. 오프셋 합판 선택하면 추가로 5% 더 할인된다고 안내해줘"
{
  "outputType": "mixed_rules",
  "constraints": [
    {
      "constraintName": "합판인쇄→추가할인 안내",
      "triggerOptionType": "PRINT_METHOD",
      "triggerOperator": "in",
      "triggerValues": ["오프셋합판", "디지털합판"],
      "actions": [{"type": "show_message", "level": "info", "message": "합판 인쇄 선택 시 수량할인에 추가 5% 할인이 적용됩니다."}],
      "confidence": 0.87
    }
  ],
  "priceRules": {
    "outputType": "qty_discount",
    "qtyDiscountTiers": [
      {"qtyMin": 1,    "qtyMax": 99,   "discountRate": 0,    "discountLabel": "기본가"},
      {"qtyMin": 100,  "qtyMax": 499,  "discountRate": 0.05, "discountLabel": "소량할인"},
      {"qtyMin": 500,  "qtyMax": null, "discountRate": 0.10, "discountLabel": "중량할인"}
    ],
    "confidence": 0.97,
    "explanationKo": "100~499장 5%, 500장 이상 10% 수량할인"
  },
  "totalActions": 4,
  "confidence": 0.91,
  "explanationKo": "수량할인 2구간 + 합판 선택 시 추가 할인 안내 혼합 규칙"
}
```

### 8.3 책자 페이지형 가격 + 표지 옵션 + 오시 필수 (3도메인 혼합)

```json
// 입력: "책자는 페이지수로 가격 계산하고, 표지는 200g 이상 용지만 쓰고, 표지에 오시 자동으로 넣어줘. 그리고 200페이지 넘으면 PUR제본 권장"
{
  "outputType": "mixed_rules",
  "constraints": [
    {
      "constraintName": "책자→200g이상 표지만",
      "triggerOptionType": "BINDING",
      "triggerOperator": "in",
      "triggerValues": ["무선", "PUR", "중철"],
      "extraConditions": {"coverType": "COVER"},
      "actions": [{"type": "filter_options", "targetOption": "PAPER", "allowedValues": ["아트지200g", "스노우지200g", "랑데뷰200g", "크라운지250g"]}],
      "confidence": 0.86
    },
    {
      "constraintName": "책자표지→오시 자동설정",
      "triggerOptionType": "BINDING",
      "triggerOperator": "in",
      "triggerValues": ["무선", "PUR"],
      "actions": [{"type": "set_default", "targetOption": "PROCESS", "defaultValue": "오시"}],
      "confidence": 0.91
    },
    {
      "constraintName": "200P이상→PUR 권장",
      "triggerOptionType": "PAGES",
      "triggerOperator": "gte",
      "triggerValues": ["200"],
      "actions": [{"type": "show_message", "level": "warn", "message": "200페이지 이상 책자는 내구성을 위해 PUR제본을 강력 권장합니다. 무선제본 시 벌어짐 위험이 있습니다."}],
      "confidence": 0.93
    }
  ],
  "priceRules": {
    "outputType": "price_mode_suggestion",
    "priceModeRecommendation": {
      "mode": "PAGE",
      "reasoning": "책자는 페이지수와 인쇄방식(표지/내지 구분)으로 원가가 결정됩니다. PAGE 모드가 가장 적합합니다."
    },
    "confidence": 0.96,
    "explanationKo": "책자 → PAGE 모드(페이지형) 가격 계산 권장"
  },
  "totalActions": 4,
  "confidence": 0.90,
  "explanationKo": "책자 4가지 복합 규칙: 페이지형 가격모드 + 표지 용지 제한 + 오시 기본값 + 200P PUR 권장"
}
```

---

## 9. Few-shot 예제 — 연쇄 규칙 (A→B→C 체인)

### 9.1 비규격 → 면적가격 → 최소면적 경고 체인

```json
// 입력: "자유형 사이즈 선택하면 면적 계산으로 바꾸고, 면적이 0.05㎡ 미만이면 최소 주문 면적 경고를 띄워줘"
{
  "outputType": "composite_constraints",
  "totalRules": 2,
  "rules": [
    {
      "constraintName": "자유형→면적가격 전환",
      "triggerOptionType": "SIZE",
      "triggerOperator": "equals",
      "triggerValues": ["free"],
      "actions": [{"type": "change_price_mode", "newMode": "AREA"}],
      "confidence": 0.95,
      "ruleOrder": 1
    },
    {
      "constraintName": "소면적→최소주문 경고",
      "triggerOptionType": "SIZE",
      "triggerOperator": "lte",
      "triggerValues": ["0.05"],
      "extraConditions": {"unit": "sqm", "priceMode": "AREA"},
      "actions": [{"type": "show_message", "level": "error", "message": "최소 주문 면적은 0.05㎡(500㎠)입니다. 사이즈를 다시 확인해주세요."}],
      "confidence": 0.88,
      "ruleOrder": 2,
      "dependsOn": "자유형→면적가격 전환"
    }
  ],
  "executionOrder": [0, 1],
  "confidence": 0.91,
  "explanationKo": "자유형 선택 → 면적 가격 모드 전환 → 최소 면적 미만이면 오류 안내 (2단계 체인)"
}
```

### 9.2 중철제본 → 페이지수 4배수 → 짝수 확인 체인

```json
// 입력: "중철제본이면 페이지수 4배수만 되고, 만약 4배수인데 크립 보정이 필요한 40장 이상이면 안내해줘"
{
  "outputType": "composite_constraints",
  "totalRules": 2,
  "rules": [
    {
      "constraintName": "중철→4배수 페이지만",
      "triggerOptionType": "BINDING",
      "triggerOperator": "equals",
      "triggerValues": ["중철"],
      "actions": [{"type": "filter_options", "targetOption": "PAGES", "allowedValues": ["4","8","12","16","20","24","28","32","36","40","44","48","52","56","60","64"]}],
      "confidence": 0.99,
      "ruleOrder": 1
    },
    {
      "constraintName": "중철40P이상→크립보정 안내",
      "triggerOptionType": "PAGES",
      "triggerOperator": "gte",
      "triggerValues": ["40"],
      "extraConditions": {"binding": "중철"},
      "actions": [{"type": "show_message", "level": "info", "message": "중철제본 40페이지 이상은 크립(creep) 보정이 필요합니다. 내지 바깥쪽 내용이 잘리지 않도록 여백을 여유있게 잡아주세요."}],
      "confidence": 0.92,
      "ruleOrder": 2
    }
  ],
  "executionOrder": [0, 1],
  "confidence": 0.95,
  "explanationKo": "중철 → 4배수 페이지 제한 → 40P 이상이면 크립 보정 안내"
}
```

---

## 10. Few-shot 예제 — TypeScript 스크립트 생성 (복잡 규칙)

복잡도가 높은 복합 규칙의 경우 GLM이 직접 실행 가능한 TypeScript 코드를 생성합니다.

### 10.1 NL → Drizzle 삽입 스크립트

```json
// 입력: "도무송 스티커 상품에 다음 규칙들 한꺼번에 넣어줘:
//   1. 자유형 선택하면 칼선파일 필수
//   2. 투명PVC 선택하면 PP코팅 제외
//   3. 박가공 선택하면 동판비(id:244) 자동추가
//   4. 100장부터 5%, 500장부터 10% 할인"
{
  "outputType": "mixed_rules",
  "constraints": [
    {
      "constraintName": "자유형→칼선파일 필수",
      "triggerOptionType": "SIZE",
      "triggerOperator": "equals",
      "triggerValues": ["free"],
      "actions": [{"type": "require_option", "targetOption": "CUT_LINE_FILE"}],
      "confidence": 0.97
    },
    {
      "constraintName": "투명PVC→PP코팅 제외",
      "triggerOptionType": "PAPER",
      "triggerOperator": "in",
      "triggerValues": ["투명PVC", "OPP"],
      "actions": [{"type": "exclude_options", "targetOption": "COATING", "excludeValues": ["무광PP", "유광PP"]}],
      "confidence": 0.98
    },
    {
      "constraintName": "박가공→동판비 자동추가",
      "triggerOptionType": "PROCESS",
      "triggerOperator": "in",
      "triggerValues": ["금박", "은박", "홀로그램"],
      "actions": [{"type": "auto_add", "productId": 244, "qty": 1}],
      "confidence": 0.95
    }
  ],
  "priceRules": {
    "outputType": "qty_discount",
    "qtyDiscountTiers": [
      {"qtyMin": 1,   "qtyMax": 99,   "discountRate": 0,    "discountLabel": "기본가"},
      {"qtyMin": 100, "qtyMax": 499,  "discountRate": 0.05, "discountLabel": "소량할인"},
      {"qtyMin": 500, "qtyMax": null, "discountRate": 0.10, "discountLabel": "대량할인"}
    ],
    "confidence": 0.97,
    "explanationKo": "100~499장 5%, 500장 이상 10% 수량할인"
  },
  "totalActions": 4,
  "confidence": 0.96,
  "explanationKo": "도무송 스티커 4가지 복합 규칙",
  "implementationScript": "// Auto-generated by GLM NL Builder\n// 실행 전 recipeId와 productId를 실제 값으로 교체하세요\n\nimport { db } from '@/packages/db';\nimport { recipeConstraints, qtyDiscount } from '@/packages/db/schema';\n\nasync function applyRules(recipeId: number, productId: number) {\n  await db.transaction(async (tx) => {\n    // Rule 1: 자유형→칼선파일 필수\n    await tx.insert(recipeConstraints).values({\n      recipeId,\n      inputMode: 'nl',\n      constraintName: '자유형→칼선파일 필수',\n      triggerOptionType: 'SIZE',\n      triggerOperator: 'equals',\n      triggerValues: JSON.stringify(['free']),\n      actions: JSON.stringify([{type: 'require_option', targetOption: 'CUT_LINE_FILE'}]),\n      isActive: true,\n    });\n\n    // Rule 2: 투명PVC→PP코팅 제외\n    await tx.insert(recipeConstraints).values({\n      recipeId,\n      inputMode: 'nl',\n      constraintName: '투명PVC→PP코팅 제외',\n      triggerOptionType: 'PAPER',\n      triggerOperator: 'in',\n      triggerValues: JSON.stringify(['투명PVC', 'OPP']),\n      actions: JSON.stringify([{type: 'exclude_options', targetOption: 'COATING', excludeValues: ['무광PP', '유광PP']}]),\n      isActive: true,\n    });\n\n    // Rule 3: 박가공→동판비 자동추가\n    await tx.insert(recipeConstraints).values({\n      recipeId,\n      inputMode: 'nl',\n      constraintName: '박가공→동판비 자동추가',\n      triggerOptionType: 'PROCESS',\n      triggerOperator: 'in',\n      triggerValues: JSON.stringify(['금박', '은박', '홀로그램']),\n      actions: JSON.stringify([{type: 'auto_add', productId: 244, qty: 1}]),\n      isActive: true,\n    });\n\n    // Rule 4: 수량할인 구간\n    await tx.insert(qtyDiscount).values([\n      { productId, qtyMin: 1,   qtyMax: 99,   discountRate: '0.00', label: '기본가' },\n      { productId, qtyMin: 100, qtyMax: 499,  discountRate: '0.05', label: '소량할인' },\n      { productId, qtyMin: 500, qtyMax: null, discountRate: '0.10', label: '대량할인' },\n    ]);\n  });\n}"
}
```

### 10.2 스크립트 추출 및 실행 패턴

```typescript
// GLM 응답에서 implementationScript 추출 후 파일로 저장
async function handleMixedRuleWithScript(
  output: MixedRuleOutput,
  recipeId: number,
  productId: number
): Promise<void> {
  if (output.implementationScript) {
    // 스크립트를 임시 파일로 저장
    const scriptPath = `scripts/generated/rule-${Date.now()}.ts`;
    await fs.writeFile(scriptPath, output.implementationScript);

    // 관리자 UI에서 "스크립트 다운로드" 버튼 제공
    // 또는 서버에서 eval() 없이 안전하게 실행 (보안 중요!)
    console.log(`Generated script saved to: ${scriptPath}`);
  }

  // 직접 DB 저장 경로 (스크립트 대신)
  await confirmRules(output.constraints, output.priceRules, recipeId, productId);
}
```

---

## 11. Few-shot 예제 — 수량할인 (다양한 패턴)

### 11.1 기본 3구간 할인

```json
// 입력: "100장 이상 5%, 500장부터 10%, 1000장 이상 15%"
{
  "outputType": "qty_discount",
  "qtyDiscountTiers": [
    {"qtyMin": 1,    "qtyMax": 99,   "discountRate": 0,    "discountLabel": "기본가"},
    {"qtyMin": 100,  "qtyMax": 499,  "discountRate": 0.05, "discountLabel": "소량할인"},
    {"qtyMin": 500,  "qtyMax": 999,  "discountRate": 0.10, "discountLabel": "중량할인"},
    {"qtyMin": 1000, "qtyMax": null, "discountRate": 0.15, "discountLabel": "대량특가"}
  ],
  "confidence": 0.97,
  "explanationKo": "4구간 수량할인: 기본/소량/중량/대량"
}
```

### 11.2 단순 2구간

```json
// 입력: "50장까지 정가, 51장부터 3% 할인"
{
  "outputType": "qty_discount",
  "qtyDiscountTiers": [
    {"qtyMin": 1,  "qtyMax": 50,   "discountRate": 0,    "discountLabel": "기본가"},
    {"qtyMin": 51, "qtyMax": null, "discountRate": 0.03, "discountLabel": "수량할인"}
  ],
  "confidence": 0.98,
  "explanationKo": "50장 이하 정가, 51장 이상 3% 할인"
}
```

### 11.3 후가공 조건부 할인 (복합)

```json
// 입력: "500장 이상이면 10% 할인. 단, 박가공 포함하면 할인 없어 (박가공은 수량할인 적용 안 됨)"
{
  "outputType": "mixed_rules",
  "constraints": [
    {
      "constraintName": "박가공→수량할인 제외 안내",
      "triggerOptionType": "PROCESS",
      "triggerOperator": "in",
      "triggerValues": ["금박", "은박", "홀로그램"],
      "actions": [{"type": "show_message", "level": "warn", "message": "박가공 포함 주문은 수량할인이 적용되지 않습니다."}],
      "confidence": 0.89
    }
  ],
  "priceRules": {
    "outputType": "qty_discount",
    "qtyDiscountTiers": [
      {"qtyMin": 1,   "qtyMax": 499,  "discountRate": 0,    "discountLabel": "기본가"},
      {"qtyMin": 500, "qtyMax": null, "discountRate": 0.10, "discountLabel": "대량할인"}
    ],
    "confidence": 0.92,
    "explanationKo": "500장 이상 10% 할인 (박가공 제외)"
  },
  "totalActions": 2,
  "confidence": 0.90,
  "explanationKo": "수량할인 + 박가공 예외 안내 혼합 규칙"
}
```

---

## 12. 가격 모드 제안 (price_mode_suggestion)

### 12.1 4가지 모드 선택 기준

```
LOOKUP (단가표형) — 적합:
  - 규격이 정해진 상품 (명함 90×50, 전단지 A4 등)
  - 수량별 단가표가 있는 상품
  - 예: 수량 100장 → 단가 150원 → 총 15,000원

AREA (면적형) — 적합:
  - 비규격, 자유형 사이즈 상품
  - 현수막, 배너, 대형 스티커, 롤업
  - 예: 90cm × 180cm → 1.62㎡ × 45,000원/㎡

PAGE (페이지형) — 적합:
  - 책자, 브로셔, 카탈로그
  - 표지/내지 구분, 페이지수, 제본 방식이 원가 결정
  - 예: 32페이지 무선 → 내지 출력비 + 표지 + 제본비

COMPOSITE (복합가산형) — 적합:
  - 기본비 + 후가공 옵션별 추가비 합산 상품
  - 박가공+도무송+코팅 등 복합 후가공 상품
  - 예: 기본 10,000원 + 박가공 5,000원 + 도무송 3,000원
```

### 12.2 가격 모드 제안 예제

```json
// 입력: "배너나 현수막처럼 크기가 다양한 상품은 어떤 가격 계산이 좋아?"
{
  "outputType": "mixed_rules",
  "constraints": [],
  "priceRules": {
    "outputType": "price_mode_suggestion",
    "priceModeRecommendation": {
      "mode": "AREA",
      "reasoning": "배너/현수막은 고객이 직접 가로×세로를 입력하는 비규격 상품입니다. 면적(㎡)당 단가로 계산하는 AREA 모드가 가장 적합합니다. 최소 주문 면적(min_area_sqm)을 설정하여 소량 주문도 관리하세요."
    },
    "confidence": 0.97,
    "explanationKo": "배너/현수막 → AREA 모드 권장"
  },
  "totalActions": 1,
  "confidence": 0.97,
  "explanationKo": "비규격 사이즈 상품에 AREA(면적형) 가격 모드를 권장합니다"
}
```

---

## 13. DB 스키마 참조

### 13.1 price_nl_history (신규 — SPEC-WB-007)

```typescript
// packages/db/src/schema/widget/04-price-nl-history.ts
export const priceNlHistory = pgTable('price_nl_history', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').notNull()
    .references(() => wbProducts.id, { onDelete: 'cascade' }),
  priceConfigId: integer('price_config_id')
    .references(() => productPriceConfigs.id, { onDelete: 'set null' }),
  ruleType: varchar('rule_type', { length: 30 }).notNull(),
  // 'qty_discount' | 'price_mode' | 'postprocess' | 'formula_hint' | 'mixed'
  nlInputText: text('nl_input_text').notNull(),
  nlInterpretation: jsonb('nl_interpretation'),  // GLM 전체 응답 (composite/mixed 포함)
  aiModelVersion: varchar('ai_model_version', { length: 50 }),
  interpretationScore: decimal('interpretation_score', { precision: 3, scale: 2 }),
  totalRulesGenerated: integer('total_rules_generated').default(1),  // composite/mixed 규칙 수
  isApproved: boolean('is_approved').notNull().default(false),
  approvedBy: varchar('approved_by', { length: 100 }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  appliedTiers: jsonb('applied_tiers'),     // 승인 후 저장된 qty_discount 배열
  appliedConstraintIds: jsonb('applied_constraint_ids'),  // 승인 후 생성된 constraint id 배열
  generatedScript: text('generated_script'), // TypeScript 스크립트 (복잡 규칙)
  deviationNote: text('deviation_note'),
  createdBy: varchar('created_by', { length: 100 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_pnh_product').on(t.productId),
  index('idx_pnh_rule_type').on(t.ruleType),
  index('idx_pnh_approved').on(t.isApproved, t.productId),
]);
```

### 13.2 기존 연계 테이블

```
recipe_constraints (03-recipe-constraints.ts)
  - inputMode: 'manual' | 'template' | 'nl'  ← NL 변환 결과 저장
  - triggerOptionType, triggerOperator, triggerValues (JSONB)
  - actions (JSONB) — 8종 액션 배열

constraint_nl_history (03-constraint-nl-history.ts)
  - ECA 제약 NL 히스토리 감사 로그 (기존, SPEC-WB-003)

product_price_configs (04-product-price-configs.ts)
  - priceMode: 'LOOKUP' | 'AREA' | 'PAGE' | 'COMPOSITE'
  - formulaText — 관리자 메모용 공식 텍스트

recipe_choice_restrictions
  - WowPress rst_* 패턴의 영구 제약 (Allow/Exclude)
```

---

## 14. tRPC 엔드포인트 인터페이스

```typescript
// apps/web/app/api/trpc/routers/glm.router.ts

// 모든 타입 변환 (outputType 자동 판단)
const convertRule = protectedProcedure
  .input(z.object({
    recipeId: z.number().optional(),
    productId: z.number().optional(),
    nlText: z.string().min(5).max(1000),        // 복합 규칙은 길어질 수 있음
    ruleHint: z.enum(['constraint', 'price', 'composite', 'auto']).default('auto'),
    availableOptions: z.array(z.string()).optional(),
    availableValues: z.record(z.array(z.string())).optional(),
  }))
  .mutation(async ({ input }) => {
    // outputType에 따라 single/composite/mixed/qty_discount 반환
    // implementationScript 포함 가능
  });

// 일괄 승인 (composite/mixed 여러 규칙 동시)
const confirmRules = protectedProcedure
  .input(z.object({
    recipeId: z.number(),
    productId: z.number(),
    nlText: z.string(),
    conversion: z.union([
      SingleConstraintOutputSchema,
      CompositeConstraintOutputSchema,
      QtyDiscountOutputSchema,
      MixedRuleOutputSchema,
    ]),
    approvedBy: z.string(),
  }))
  .mutation(async ({ input, ctx }) => {
    // outputType에 따라 분기 처리
    // composite → 여러 recipe_constraints 트랜잭션 삽입
    // mixed → constraints + qty_discount 동시 삽입
    // price_mode → product_price_configs 업데이트
    // 모든 경우 price_nl_history 또는 constraint_nl_history 기록
  });
```

---

## 15. 구현 주의사항

### 15.1 복합 규칙 트랜잭션 보장

```typescript
// composite/mixed 규칙은 반드시 트랜잭션으로 묶어야 함
// 일부만 저장되면 데이터 불일치 발생
await db.transaction(async (tx) => {
  for (const constraint of constraints) {
    await tx.insert(recipeConstraints).values({...});
  }
  if (priceRules?.outputType === 'qty_discount') {
    await tx.insert(qtyDiscount).values(priceRules.qtyDiscountTiers.map(...));
  }
  await tx.insert(priceNlHistory).values({
    totalRulesGenerated: constraints.length + (priceRules ? 1 : 0),
    ...
  });
});
```

### 15.2 outputType 자동 판단 로직

```typescript
function detectOutputType(nlText: string): 'constraint' | 'price' | 'auto' {
  const priceKeywords = ['할인', '% 할인', '수량', '구간', '가격 계산', '면적', '페이지형'];
  const constraintKeywords = ['못 쓰게', '제외', '필수', '안 되', '자동 추가', '안내'];

  const hasPrice = priceKeywords.some(kw => nlText.includes(kw));
  const hasConstraint = constraintKeywords.some(kw => nlText.includes(kw));

  if (hasPrice && hasConstraint) return 'auto';  // GLM이 mixed_rules로 판단
  if (hasPrice) return 'price';
  if (hasConstraint) return 'constraint';
  return 'auto';
}
```

### 15.3 GLM_API_KEY 보안

```typescript
// 서버 전용 — 절대 클라이언트 노출 금지
if (typeof window !== 'undefined') {
  throw new Error('GLM service: server-only module');
}
```

---

## 16. 관련 파일 위치

```
SPEC:                .moai/specs/SPEC-WB-007/spec.md
Plan:                .moai/specs/SPEC-WB-007/plan.md

WowPress 도메인:     .claude/skills/innojini-wowpress/SKILL.md
인쇄 기초:           .claude/skills/innojini-printing-foundation/SKILL.md
DB 스키마 참조:      .claude/skills/innojini-huni-db-schema/SKILL.md

DB Schema:           packages/db/src/schema/widget/04-price-nl-history.ts (신규)
                     packages/db/src/schema/widget/03-constraint-nl-history.ts (기존 참조)
                     packages/db/src/schema/widget/03-recipe-constraints.ts (기존 참조)

Backend:             apps/web/app/api/_lib/services/glm.service.ts (신규)
                     apps/web/app/api/trpc/routers/glm.router.ts (신규)
                     apps/web/app/api/trpc/utils/constraint-transformer.ts (신규)
                     apps/web/app/api/trpc/utils/price-rule-transformer.ts (신규)
                     apps/web/app/api/trpc/router.ts (수정)

Admin UI:            apps/admin/src/components/glm/nl-rule-panel.tsx (신규)
                     apps/admin/src/components/glm/conversion-preview.tsx (신규)
                     apps/admin/src/hooks/use-glm-convert.ts (신규)

Tests:               apps/web/__tests__/services/glm.test.ts
                     apps/web/__tests__/utils/constraint-transformer.test.ts
                     apps/web/__tests__/utils/price-rule-transformer.test.ts
                     apps/web/__tests__/pricing/glm-router.test.ts
                     packages/db/__tests__/schema/price-nl-history.test.ts
```

---

Version: 2.0.0
SPEC: SPEC-WB-007
Updated: 2026-02-27
Changes from 1.0.0:
- Added WowPress req_*/rst_* pattern mapping
- Added composite_constraints outputType (multi-rule)
- Added mixed_rules outputType (price + constraint)
- Added chain rules with executionOrder (A→B→C)
- Added TypeScript/Drizzle script generation
- Added 15+ new few-shot examples (expanded from 8)
- Added automatic outputType detection logic
- Added transaction guarantee for composite rules
