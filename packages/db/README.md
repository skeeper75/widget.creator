# @widget-creator/db

후니프린팅 위젯빌더의 **옵션 어휘 정의 시스템** (Option Vocabulary System) 패키지입니다.

## 개요

`@widget-creator/db`는 Drizzle ORM 기반의 DB 스키마 정의 패키지로, Widget Builder의 옵션 타입 및 선택지 라이브러리를 관리합니다.

### 이 패키지가 하는 것

- **옵션 타입 정의:** SIZE, PAPER, PRINT_TYPE, FINISHING 등 12개 표준 인쇄 옵션 타입 정의
- **선택지 라이브러리:** 각 옵션 타입의 구체적인 선택지 (예: "A4 210×297mm", "아트지 100g")
- **확장성:** 새로운 옵션 타입을 DB 스키마 변경 없이 추가 가능하도록 설계
- **외부 시스템 연동:** MES, Shopby 등 외부 코드 참조 지원

### 이 패키지가 하지 않는 것

- 옵션 간 제약조건 (→ SPEC-WB-003)
- 옵션을 상품에 배치하는 레시피 (→ SPEC-WB-002)
- 가격 계산 (→ SPEC-WB-004)

## 관련 SPEC

- **SPEC-WB-001:** Option Element Type Library (이 패키지의 근거)
- **SPEC-INFRA-001:** DB Schema Architecture (Drizzle ORM 통합)

## 설치

```bash
npm install @widget-creator/db
```

## 사용

### 1. 스키마 임포트

```typescript
import {
  optionElementTypes,
  optionElementChoices,
} from '@widget-creator/db';
```

### 2. 시드 데이터 로드

표준 12개 옵션 타입을 데이터베이스에 초기화합니다:

```typescript
import { seedStandardOptionTypes } from '@widget-creator/db';

// 데이터베이스 연결 후
const db = /* your Drizzle instance */;
await seedStandardOptionTypes(db);
```

## 스키마

### option_element_types (옵션 타입)

인쇄 상품을 구성하는 옵션의 종류를 정의합니다.

```
id              serial PRIMARY KEY
type_key        varchar(50) UNIQUE — 영문 대문자 식별자 (예: 'SIZE')
type_name_ko    varchar(100) — 한국어 이름 (예: '규격')
type_name_en    varchar(100) — 영어 이름 (예: 'Size')
ui_control      varchar(30) — UI 컨트롤 타입 (toggle-group, select, etc.)
option_category varchar(20) — 분류 (material, process, spec, quantity, group)
allows_custom   boolean — 사용자 정의 입력 허용 여부
display_order   integer — 표시 순서
is_active       boolean — 활성 여부
description     text — 설명
created_at      timestamptz
updated_at      timestamptz
```

**표준 12개 타입:**

| type_key | type_name_ko | ui_control | option_category | allows_custom |
|----------|-------------|-----------|----------------|--------------|
| SIZE | 규격 | toggle-group | spec | true |
| PAPER | 재질 | select | material | false |
| PRINT_TYPE | 인쇄도수 | toggle-group | process | false |
| FINISHING | 후가공 | toggle-multi | process | false |
| COATING | 코팅 | toggle-group | process | false |
| BINDING | 제본 | toggle-group | process | false |
| QUANTITY | 수량 | number-stepper | quantity | true |
| PAGE_COUNT | 페이지수 | number-stepper | spec | false |
| ADD_ON | 부자재 | toggle-multi | material | false |
| COVER_PAPER | 표지재질 | select | material | false |
| INNER_PAPER | 내지재질 | select | material | false |
| FOIL_STAMP | 박/형압 | collapsible | group | false |

### option_element_choices (선택지)

각 옵션 타입에 속하는 구체적인 선택지를 정의합니다.

```
id              serial PRIMARY KEY
type_id         integer FK → option_element_types(id)
choice_key      varchar(100) — 선택지 식별자 (타입 내 고유)
display_name    varchar(200) — 고객에게 보이는 이름
value           varchar(100) — 내부 처리값
mes_code        varchar(100) NULLABLE — MES 시스템 코드
display_order   integer — 표시 순서
is_active       boolean — 활성 여부 (소프트 삭제)
is_default      boolean — 기본값 여부

[TYPE-SPECIFIC 필드]
width_mm        decimal(8,2) — SIZE 타입: 가로
height_mm       decimal(8,2) — SIZE 타입: 세로
bleed_mm        decimal(4,2) — SIZE 타입: 재단 여분

basis_weight_gsm integer — PAPER 타입: 평량 (g/m²)

finish_category varchar(50) — FINISHING 타입: 분류

[UI 메타데이터]
thumbnail_url   varchar(500) — 이미지 미리보기 URL
color_hex       varchar(7) — 색상 코드 (예: '#FFCC00')
price_impact    varchar(50) — 가격 영향 힌트

[가격 연동]
price_key       varchar(200) — 가격 테이블 연결키

metadata        jsonb — 타입별 확장 데이터

created_at      timestamptz
updated_at      timestamptz
```

## 주요 설계 원칙

### 1. 외부 시스템과의 독립성

> **위젯빌더는 도메인 모델로 정의되며, 외부 시스템(MES, Shopby)에 종속되지 않습니다.**

- `mes_code`는 선택적 참조 필드 (nullable)
- MES 코드 없어도 위젯 동작 가능
- 외부 시스템 연동은 별도 SPEC에서 처리

### 2. 확장성 (Extensibility)

**타입 전용 필드:** SIZE, PAPER, FINISHING 등 자주 사용되는 타입은 sparse column으로 처리

**메타데이터 JSONB:** 드물게 사용되는 필드나 미래의 확장은 `metadata` jsonb에 저장

→ 새로운 옵션 타입 추가 시 **DB 스키마 변경 불필요**

### 3. 소프트 삭제 (Soft Delete)

선택지를 삭제하지 않고 `is_active = false`로 처리:

- 기존 주문 기록의 무결성 유지
- 선택지 히스토리 보존
- 필요시 복구 가능

### 4. 타입 안전성 (Type Safety)

Drizzle ORM을 통한 완벽한 TypeScript 타입 추론:

```typescript
type OptionType = typeof optionElementTypes.$inferSelect;
type NewOptionType = typeof optionElementTypes.$inferInsert;
```

## 테스트

### 테스트 실행

```bash
npm test
```

### 테스트 구성

- `__tests__/schema/element-types.test.ts` — 타입 시스템 검증 (22 tests)
- `__tests__/schema/element-choices.test.ts` — 선택지 검증 (31 tests)
- `__tests__/seed/widget-types.test.ts` — 시드 데이터 검증 (12 tests)
- `__tests__/index.test.ts` — 익스포트 검증 (14 tests)

**총 79개 테스트 통과, 86% 커버리지**

### 테스트 커버리지

```bash
npm run test:coverage
```

## 파일 구조

```
packages/db/
├── src/
│   ├── index.ts                          # 메인 익스포트
│   ├── schema/
│   │   ├── index.ts                      # 스키마 배럴 익스포트
│   │   └── widget/
│   │       ├── 01-element-types.ts       # option_element_types 스키마
│   │       ├── 02-element-choices.ts     # option_element_choices 스키마
│   │       └── index.ts                  # 위젯 스키마 익스포트
│   └── seed/
│       ├── index.ts                      # 시드 메인 익스포트
│       └── widget-types.ts               # 12개 표준 타입 정의
├── __tests__/
│   ├── schema/
│   │   ├── element-types.test.ts
│   │   └── element-choices.test.ts
│   ├── seed/
│   │   └── widget-types.test.ts
│   ├── index.test.ts
│   └── setup.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

## 타입 참조

### optionElementTypes

타입 시스템의 근간. 모든 옵션의 "종류"를 정의합니다.

```typescript
const types = await db
  .select()
  .from(optionElementTypes)
  .where(eq(optionElementTypes.is_active, true));
```

### optionElementChoices

각 타입의 구체적인 선택지. 고객이 실제로 선택하는 항목입니다.

```typescript
const choices = await db
  .select()
  .from(optionElementChoices)
  .where(
    and(
      eq(optionElementChoices.type_id, sizeTypeId),
      eq(optionElementChoices.is_active, true),
    ),
  )
  .orderBy(optionElementChoices.display_order);
```

## 버전 관리

**Current Version:** 0.1.0

### 버전 정책

- **Major:** DB 스키마 변경 (새 테이블, 컬럼 삭제 등)
- **Minor:** 새로운 타입 추가, 기능 확장
- **Patch:** 버그 수정, 시드 데이터 업데이트

## 다음 단계

### SPEC-WB-002 (옵션 레시피 및 상품 바인딩)

이 패키지의 옵션 타입/선택지를 **상품별로 배치**하고 **제약조건**을 정의합니다.

### SPEC-WB-003 (제약조건 시스템)

옵션 간 의존성 및 선택 불가 조합을 정의합니다. (예: "양면 인쇄 + 박" 불가)

### SPEC-WB-004 (가격 계산)

선택된 옵션 조합으로 가격을 계산합니다.

## 도움말

### 자주 묻는 질문

**Q: 새로운 옵션 타입을 추가하려면?**

A: `seedStandardOptionTypes` 함수나 관리자 API를 통해 추가합니다. DB 스키마 변경 불필요.

**Q: MES 코드가 없으면 어떻게 되나?**

A: 위젯은 정상 동작합니다. MES 연동 단계에서 경고만 표시됩니다.

**Q: 이전 선택지를 다시 활성화할 수 있나?**

A: 네, `is_active = true`로 업데이트하면 됩니다.

## 라이선스

MIT (widget.creator 프로젝트 포함)

## 참조

- **SPEC-WB-001:** [Option Element Type Library](.moai/specs/SPEC-WB-001/spec.md)
- **SPEC-INFRA-001:** [DB Schema Architecture](.moai/specs/SPEC-INFRA-001/spec.md)
- **Drizzle ORM:** https://orm.drizzle.team

---

**Package:** @widget-creator/db v0.1.0
**Implementation Date:** 2026-02-26
**Status:** ✅ Production Ready
