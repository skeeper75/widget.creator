# SPEC-WA-001: Widget Admin Console -- 인쇄 자동견적 6-Step 관리 UI

**Version:** 1.0.0
**Date:** 2026-02-26
**Status:** ACTIVE
**Dependencies:** SPEC-WB-001, SPEC-WB-002, SPEC-WB-003, SPEC-WB-005, SPEC-WB-006, SPEC-WB-DS

---

## 1. Context

### 1.1 이 SPEC이 다루는 것

후니프린팅 Admin Console의 **6-Step 상품 설정 UI 워크플로우** 전체 구현.

관리자가 인쇄 상품의 주문옵션, 가격룰, 제약조건을 설정하고, 자동견적 시뮬레이션으로 검증한 뒤, 고객 주문 화면에 발행하는 전체 파이프라인의 프론트엔드 UI.

**6-Step 워크플로우:**

| Step | 화면 | 핵심 기능 |
|------|------|----------|
| Step 1 | 상품 마스터 대시보드 | 전체 상품 목록, 완성도 현황, 빠른 진입 |
| Step 2 | 주문옵션 설정 | 옵션 타입/값 정의, 드래그 정렬, 제약조건 연결 |
| Step 3 | 가격룰 & 계산식 | 4가지 가격 방식 선택, 단가 편집, 실시간 테스트 |
| Step 4 | 인쇄 제약조건 빌더 | IF-THEN 규칙 시각화, AI 자연어 변환 |
| Step 5 | 자동견적 시뮬레이션 | 전체 옵션 조합 일괄 검증, 오류 식별 |
| Step 6 | 발행 & 완료 | 4항목 완성도 체크, 상품 활성화 |

### 1.2 이 SPEC이 다루지 않는 것

- 런타임 위젯 동작 (SPEC-WB-006에서 정의)
- DB 스키마 설계 (SPEC-WB-001~005에서 완료)
- 옵션 타입 라이브러리 내부 로직 (SPEC-WB-001)
- 가격 계산 엔진 비즈니스 로직 (SPEC-WB-004)
- 제약조건 엔진 로직 (SPEC-WB-003)
- Shopby/MES/Edicus 외부 시스템 연동 API 구현

### 1.3 갭 분석 -- 현재 구현 vs 설계 문서

**현재 구현된 페이지:**

| 라우트 | 설계 Step | 구현 상태 | 비고 |
|--------|----------|----------|------|
| `/widget-admin` (page.tsx) | Step 1 | 구현됨 | 통계 카드 4종, 카테고리 필터, 상태 필터, 빠른 진입 버튼 완료 (commit 2a7e589) |
| `/widget-admin/[id]/options` | Step 2 | 구현됨 | 옵션 CRUD, 드래그 정렬, 제약조건 연결 완료 (commit 29921c3) |
| `/widget-admin/[id]/pricing` | Step 3 | 구현됨 | 가격 방식 선택, 단가표 편집, 후가공비, 수량할인, 실시간 테스트 완료 |
| `/widget-admin/[id]/constraints` | Step 4 | 구현됨 | IF-THEN Rule Builder, 8종 액션, AI 자연어 변환 완료 (commit 29921c3) |
| `/widget-admin/[id]/simulate` | Step 5 | 구현됨 | 시뮬레이션 실행/결과 표시 완료 |
| `/widget-admin/[id]/publish` | Step 6 | 구현됨 | 완성도 체크 + 발행/취소 완료 |

**핵심 갭 (최초 분석 기준):**

- Step 2 (주문옵션 설정): ✅ 구현 완료 -- 옵션 CRUD, 드래그 정렬, 제약조건 연결 (commit 29921c3)
- Step 3 (가격룰): ✅ 구현 완료 -- priceConfig/printCostBase/postprocessCost/qtyDiscount/pricingTest tRPC + 8개 컴포넌트
- Step 4 (제약조건 빌더): ✅ 구현 완료 -- IF-THEN Rule Builder, 8종 액션, AI 자연어 변환 (commit 29921c3)
- Step 1 (대시보드): ✅ 구현 완료 -- 통계 카드 4종, 카테고리 필터, 상태 필터 (commit 2a7e589)

### 1.4 핵심 설계 원칙

> **Violet Theme**: 현재 구현된 라이트 바이올렛 테마(`#5538B6`)를 유지한다. 설계 문서의 다크 앰버 테마는 채택하지 않는다.

> **기존 컴포넌트 활용**: 이미 구현된 `DataTable`, `CompletenessBar`, `SimulationProgress`, `PublishDialog` 컴포넌트를 최대한 재사용한다.

> **SPEC 의존성**: 모든 API 호출은 이미 구현된 SPEC-WB-001~006의 tRPC 라우터를 활용한다. 새로운 API 엔드포인트가 필요한 경우 tRPC 패턴을 따른다.

> **점진적 구현**: Step 2 -> Step 3 -> Step 4 -> Step 1 보강 순서로 구현하며, Step 5/6은 이미 완료되었으므로 스킵한다.

---

## 2. Design System Alignment

### 2.1 현재 디자인 토큰 (globals.css)

```
Primary Scale:
  --primary-dark:    #351D87
  --primary:         #5538B6
  --primary-medium:  #7B68C8
  --primary-light:   #9580D9
  --primary-50:      #EEEBF9
  --primary-25:      #F4F0FF

Semantic:
  --warning:         #E6B93F
  --success:         #7AC8C4
  --error:           #C7000B
  --brand-accent:    #DF7939

Gray Scale:
  --gray-50:         #F6F6F6
  --gray-100:        #E9E9E9
  --gray-200:        #CACACA
  --gray-400:        #979797
  --gray-600:        #565656
  --gray-700:        #424242

Radius:
  --radius-md:       5px (기본 rounded)
  --radius-pill:     20px (Badge 등)

Typography:
  --font-sans:       'Noto Sans', sans-serif
  --letter-spacing:  -0.05em
```

### 2.2 Step별 디자인 토큰 매핑

| UI 요소 | 토큰 | 용도 |
|---------|------|------|
| 활성 옵션 카드 하이라이트 | `--primary-50` (#EEEBF9) | Step 2 선택된 옵션 행 배경 |
| 필수 옵션 Badge | `--primary` (#5538B6) | Step 2 필수 Badge |
| 선택 옵션 Badge | `--gray-200` (#CACACA) | Step 2 선택적 Badge |
| 제약조건 개수 Badge | `--warning` (#E6B93F) | Step 2/4 경고성 제약 |
| 가격 결과 텍스트 | `--primary-dark` (#351D87) | Step 3 견적가 표시 |
| IF/WHEN 라벨 | `--primary-medium` (#7B68C8) | Step 4 조건 라벨 |
| THEN 라벨 | `--brand-accent` (#DF7939) | Step 4 액션 라벨 |
| 시뮬레이션 통과 | `--success` (#7AC8C4) | Step 5 통과 상태 |
| 시뮬레이션 경고 | `--warning` (#E6B93F) | Step 5 경고 상태 |
| 시뮬레이션 오류 | `--error` (#C7000B) | Step 5 오류 상태 |
| 발행 가능 | `--success` (#7AC8C4) | Step 6 완료 배지 |
| 발행 불가 | `--error` (#C7000B) | Step 6 미완성 배지 |

### 2.3 참고: 설계 문서와의 차이점

설계 문서는 다크 앰버 테마(`#f59e0b`, `#0a0a0a` 배경)를 제안하나, 현재 구현은 라이트 바이올렛 테마를 사용한다.

**적용 원칙:**
- 설계 문서의 `amber-500` -> `primary` (#5538B6)로 대체
- 설계 문서의 `amber-500/5` 배경 -> `primary-50` (#EEEBF9)로 대체
- 설계 문서의 `purple-400` -> `primary-medium` (#7B68C8)로 대체
- 설계 문서의 `amber-400` 강조 -> `brand-accent` (#DF7939)로 대체
- `bg-muted` -> `--secondary` (#F6F6F6)

---

## 3. EARS Format Requirements

### 3.1 Step 1 -- 상품 마스터 대시보드

**FR-WA001-01: 통계 카드 표시**

**[THE SYSTEM SHALL]** 상품 대시보드 상단에 4개의 통계 카드(전체 상품 수, 활성 판매 수, 임시저장 수, 미완성 수)를 표시한다.

**FR-WA001-02: 카테고리 필터**

**[WHEN]** 관리자가 카테고리 필터 드롭다운에서 카테고리를 선택할 때,
**[THE SYSTEM SHALL]** 해당 카테고리에 속하는 상품만 테이블에 필터링하여 표시한다.

**FR-WA001-03: 상태 필터**

**[WHEN]** 관리자가 상태 필터(활성/임시저장/미완성)를 선택할 때,
**[THE SYSTEM SHALL]** 해당 상태의 상품만 테이블에 필터링하여 표시한다.

**FR-WA001-04: 빠른 진입 버튼**

**[WHEN]** 관리자가 테이블에서 상품 행을 선택할 때,
**[THE SYSTEM SHALL]** 해당 상품의 6-Step 각 단계로 이동할 수 있는 빠른 진입 버튼을 표시한다.

### 3.2 Step 2 -- 주문옵션 설정

**FR-WA001-05: 옵션 목록 표시**

**[WHEN]** 관리자가 상품의 주문옵션 설정 페이지에 진입할 때,
**[THE SYSTEM SHALL]** 해당 상품에 등록된 옵션 타입 목록을 표시 순서대로 보여주며, 각 옵션의 이름, 필수/선택 여부, 옵션값 개수, 제약조건 개수를 함께 표시한다.

**FR-WA001-06: 옵션 드래그 정렬**

**[WHEN]** 관리자가 옵션 행을 드래그하여 순서를 변경할 때,
**[THE SYSTEM SHALL]** `@dnd-kit/sortable`을 사용하여 순서를 변경하고, `displayOrder` 필드를 업데이트한다.

**FR-WA001-07: 옵션 값 편집**

**[WHEN]** 관리자가 옵션 행의 편집 버튼을 클릭할 때,
**[THE SYSTEM SHALL]** 해당 옵션의 값 목록을 편집할 수 있는 인라인 편집 패널을 표시하며, 값 추가/삭제/순서변경 기능을 제공한다.

**FR-WA001-08: 옵션 추가**

**[WHEN]** 관리자가 "옵션 추가" 버튼을 클릭할 때,
**[THE SYSTEM SHALL]** 글로벌 옵션 정의(optionDefinitions) 목록에서 선택하여 해당 상품에 옵션을 추가할 수 있는 Dialog를 표시한다.

**FR-WA001-09: 제약조건 연결 표시**

**[THE SYSTEM SHALL]** 각 옵션 행에 연결된 제약조건 개수를 Badge로 표시하며, 클릭 시 해당 옵션의 제약조건 목록을 Side Sheet로 보여준다.

### 3.3 Step 3 -- 가격룰 & 계산식

**FR-WA001-10: 가격 계산 방식 선택**

**[WHEN]** 관리자가 가격 설정 페이지에 진입할 때,
**[THE SYSTEM SHALL]** 4가지 가격 계산 방식(LOOKUP/AREA/PAGE/COMPOSITE) 중 현재 설정된 방식을 RadioGroup으로 표시하고, 변경을 허용한다.

**FR-WA001-11: LOOKUP 단가표 편집**

**[WHEN]** 가격 방식이 LOOKUP으로 설정되어 있을 때,
**[THE SYSTEM SHALL]** `print_cost_base` 테이블의 판형x인쇄방식x수량구간 조합을 편집할 수 있는 테이블 UI를 표시한다.

**FR-WA001-12: 면적형/페이지형/복합형 파라미터 편집**

**[WHEN]** 가격 방식이 AREA, PAGE, 또는 COMPOSITE으로 설정되어 있을 때,
**[THE SYSTEM SHALL]** 해당 방식에 필요한 파라미터(단가/sqm, 판걸이수, 기본비용 등)를 편집할 수 있는 폼을 표시한다.

**FR-WA001-13: 후가공비 테이블 관리**

**[THE SYSTEM SHALL]** `postprocess_cost` 테이블의 후가공 항목별 단가를 편집할 수 있는 테이블 UI를 제공한다.

**FR-WA001-14: 수량할인 구간 관리**

**[THE SYSTEM SHALL]** `qty_discount` 테이블의 수량 구간별 할인율을 편집할 수 있는 테이블 UI를 제공하며, 구간 추가/삭제/수정 기능을 포함한다.

**FR-WA001-15: 실시간 견적 테스트**

**[WHEN]** 관리자가 가격 설정 화면에서 옵션 조합을 선택하고 테스트를 실행할 때,
**[THE SYSTEM SHALL]** SPEC-WB-004의 가격 계산 API를 호출하여 기본 출력비, 후가공비, 수량할인, 최종가를 실시간으로 표시한다.

### 3.4 Step 4 -- 인쇄 제약조건 빌더

**FR-WA001-16: 제약조건 목록 표시**

**[WHEN]** 관리자가 제약조건 빌더 페이지에 진입할 때,
**[THE SYSTEM SHALL]** 해당 상품에 등록된 제약조건을 IF-THEN 카드 형태로 표시하며, 각 규칙의 활성/비활성 상태를 Switch로 토글할 수 있게 한다.

**FR-WA001-17: 비주얼 Rule Builder (react-querybuilder 기반)**

**[WHEN]** 관리자가 "규칙 추가" 또는 기존 규칙 편집 버튼을 클릭할 때,
**[THE SYSTEM SHALL]** `react-querybuilder` 라이브러리를 사용하여 트리거 조건(옵션, 연산자, 값)을 시각적으로 구성할 수 있는 QueryBuilder UI를 표시하고, 커스텀 ActionBuilder 컴포넌트로 8종 액션을 편집할 수 있게 한다.

**구현 세부사항:**
- `react-querybuilder` fields: 상품에 등록된 optionDefinition.name 목록으로 자동 구성
- operators: `=`, `in`, `not_in`, `contains`, `beginsWith`, `endsWith` 지원
- Query 결과를 `{triggerOptionType, triggerOperator, triggerValues[], extraConditions}` JSON으로 변환
- `recipe_constraints` 테이블의 JSONB 구조(`triggerValues`, `extraConditions`, `actions`)와 매핑
- 커스텀 ActionBuilder: 8종 액션 타입별 동적 파라미터 폼 (shadcn 기반)

**FR-WA001-18: 8종 액션 타입 지원**

**[THE SYSTEM SHALL]** 다음 8종 액션 타입을 Rule Builder에서 선택할 수 있게 한다:
`show_addon_list`, `filter_options`, `exclude_options`, `auto_add`, `require_option`, `show_message`, `change_price_mode`, `set_default`

**FR-WA001-19: 복합 조건 지원**

**[WHERE]** 단일 조건으로 표현할 수 없는 규칙의 경우,
**[THE SYSTEM SHALL]** AND/OR combinator를 사용하여 복합 조건을 구성할 수 있는 UI를 제공한다.

**FR-WA001-20: AI 자연어 변환**

**[WHEN]** 관리자가 자연어 텍스트를 입력하고 "AI 변환" 버튼을 클릭할 때,
**[THE SYSTEM SHALL]** 자연어를 IF-THEN 규칙으로 변환하여 미리보기를 표시하고, 확인 시 규칙 목록에 추가한다.

**FR-WA001-21: 규칙 전체 테스트**

**[WHEN]** 관리자가 "전체 테스트" 버튼을 클릭할 때,
**[THE SYSTEM SHALL]** 등록된 모든 제약조건을 대상으로 규칙 충돌 여부를 검사하고 결과를 표시한다.

### 3.5 Step 5 -- 자동견적 시뮬레이션 (기존 구현 보강)

**FR-WA001-22: 통계 카드 보강**

**[WHEN]** 시뮬레이션이 완료되었을 때,
**[THE SYSTEM SHALL]** 전체 케이스 수, 통과 수, 경고 수, 오류 수를 4개의 통계 카드로 표시하고, 통과율 Progress Bar를 표시한다.

**[IF]** 현재 구현에 통계 카드가 부재한 경우,
**[THE SYSTEM SHALL]** 기존 `SimulationProgress` 컴포넌트에 통계 카드를 추가한다.

### 3.6 Step 6 -- 발행 & 완료 (기존 구현 유지)

**FR-WA001-23: 기존 구현 유지**

**[THE SYSTEM SHALL]** 현재 구현된 완성도 체크리스트(4항목), 발행/취소 기능, 발행 이력을 유지한다.

---

## 4. UI Component Specification

### 4.1 Step 1 -- 상품 마스터 대시보드

**라우트:** `/widget-admin`
**파일:** `apps/admin/src/app/(dashboard)/widget-admin/page.tsx` (기존 수정)

**신규 컴포넌트:**
- `StatCard`: 통계 카드 컴포넌트 (전체/활성/임시/미완성)
- `CategoryFilter`: 카테고리 Select 필터
- `StatusFilter`: 상태 Select 필터

**사용 shadcn 컴포넌트:** Card, Badge, Button, Select, Progress, DataTable (기존)

**레이아웃:**
```
+------------------------------------------------------------------+
| 위젯빌더 상품 관리                              [발행가능: N개]   |
+------------------------------------------------------------------+
| [전체 251] [활성 189] [임시 44] [미완성 18]                       |
+------------------------------------------------------------------+
| [검색...]  [카테고리 v]  [상태 v]                                 |
+------------------------------------------------------------------+
| 코드 | 상품명 | 완성도 | 상태 | 관리                               |
| ...  | ...    | ███    | 활성 | [옵션][가격][제약][시뮬][발행]      |
+------------------------------------------------------------------+
```

### 4.2 Step 2 -- 주문옵션 설정

**라우트:** `/widget-admin/[productId]/options`
**파일:** `apps/admin/src/app/(dashboard)/widget-admin/[productId]/options/page.tsx` (신규)

**신규 컴포넌트:**
- `OptionList`: 드래그 가능한 옵션 목록 (`@dnd-kit/sortable`)
- `OptionRow`: 개별 옵션 행 (드래그 핸들, Badge, 값 미리보기, 제약 Badge)
- `OptionValueEditor`: 옵션 값 편집 패널
- `OptionAddDialog`: 글로벌 정의에서 옵션 추가 Dialog
- `ConstraintSheet`: 옵션별 제약조건 Side Sheet

**사용 shadcn 컴포넌트:** Card, Badge, Button, Switch, Sheet, Dialog, Separator

**외부 의존성:** `@dnd-kit/core`, `@dnd-kit/sortable` (이미 설치됨)

**레이아웃:**
```
+------------------------------------------------------------------+
| 주문옵션 설정 -- {상품명}                        [+ 옵션 추가]    |
+------------------------------------------------------------------+
| [=] 사이즈 [필수] [선택형] 5개값 73x98...  [제약2][DnD][편집]     |
| [=] 인쇄   [필수] [선택형] 3개값 단면칼라... [제약1][DnD][편집]   |
| [=] 용지   [필수] [선택형] 6개값 아트지...   [제약4][DnD][편집]   |
| [=] 코팅   [선택] [선택형] 4개값 없음...     [제약2][DnD][편집]   |
| [=] 수량   [필수] [구간형] 6구간 50~1000     [제약1][DnD][편집]   |
+------------------------------------------------------------------+
| 용지 옵션 값 편집                                                 |
| 타입: [용지] 표시: [드롭다운 v] 필수: [ON]                       |
| [아트지300g x] [스노우지300g x] [크라프트250g x] [+ 추가]         |
+------------------------------------------------------------------+
```

**Side Sheet (우측):**
```
+---------------------------+
| 용지 옵션 제약조건 (4개)  |
| [+ 규칙 추가]             |
|                           |
| [ON] 투명PVC->코팅제외    |
|   IF 용지 in {투명PVC}    |
|   THEN exclude 코팅       |
|                           |
| [ON] 투명PVC->안내        |
|   IF 용지 = 투명PVC       |
|   THEN show_message WARN  |
+---------------------------+
```

### 4.3 Step 3 -- 가격룰 & 계산식

**라우트:** `/widget-admin/[productId]/pricing`
**파일:** `apps/admin/src/app/(dashboard)/widget-admin/[productId]/pricing/page.tsx` (신규)

**신규 컴포넌트:**
- `PriceModeSelector`: RadioGroup 가격 방식 선택
- `LookupPriceEditor`: LOOKUP 단가표 편집 테이블
- `AreaPriceEditor`: 면적형 파라미터 폼
- `PagePriceEditor`: 페이지형 파라미터 폼
- `CompositePriceEditor`: 복합가산형 파라미터 폼
- `PostprocessCostEditor`: 후가공비 테이블 편집
- `QtyDiscountEditor`: 수량할인 구간 편집
- `PriceTestPanel`: 실시간 견적 테스트 패널

**사용 shadcn 컴포넌트:** RadioGroup, Table, Input, Button, Card, Select, Separator

**레이아웃:**
```
+------------------------------------------------------------------+
| 가격룰 & 계산식 -- {상품명}                                       |
+------------------------------------------------------------------+
| 가격 계산 방식                                                     |
| [x] 단가표형    [ ] 면적형    [ ] 페이지형    [ ] 복합가산형       |
+------------------------------------------------------------------+
| 단가표 편집 (LOOKUP)                                               |
| 판형     | 인쇄방식 | 수량구간  | 단가                              |
| 90x50    | 단면칼라 | 1~99    | 8,500                             |
| ...                                        [행 추가] [저장]       |
+------------------------------------------------------------------+
| 후가공비                  | 실시간 견적 테스트                      |
| 코드   | 이름  | 단가    | 사이즈: [100x148mm v]                  |
| MATTE  | 무광PP| 1,700   | 인쇄:   [단면칼라 v]                   |
| ...            [저장]    | 수량:   [100매 v]                      |
+----------------------------+ 코팅:   [무광PP v]                     |
| 수량할인 구간              |                                        |
| 1~99:    0% 기본가        | 기본출력비  6,500원                     |
| 100~299: 3% 소량할인      | 후가공비    1,700원                     |
| ...       [구간추가][저장] | 수량할인    -195원                      |
+----------------------------+ 최종견적가  8,005원 (80.05원/매)        |
                             | [가격 설정 저장]                        |
                             +----------------------------------------+
```

### 4.4 Step 4 -- 인쇄 제약조건 빌더

**라우트:** `/widget-admin/[productId]/constraints`
**파일:** `apps/admin/src/app/(dashboard)/widget-admin/[productId]/constraints/page.tsx` (신규)

**신규 컴포넌트:**
- `ConstraintList`: 제약조건 카드 목록
- `ConstraintCard`: IF-THEN 규칙 카드 (활성 토글, 편집, 삭제)
- `RuleBuilder`: 비주얼 규칙 편집기 (트리거 + 액션)
- `TriggerEditor`: 트리거 조건 편집 (옵션, 연산자, 값)
- `ActionEditor`: 액션 편집 (8종 타입 선택, 대상 옵션, 파라미터)
- `AiRuleConverter`: AI 자연어 -> 규칙 변환 패널
- `RulePreview`: 규칙 미리보기

**사용 shadcn 컴포넌트:** Card, Badge, Button, Switch, Select, Command, Separator, Dialog

**레이아웃:**
```
+------------------------------------------------------------------+
| 인쇄 제약조건 -- {상품명} -- 4개 규칙      [전체테스트] [+규칙]   |
+------------------------------------------------------------------+
| [ON] 투명PVC->PP코팅 제외                            [편집][삭제] |
|   IF 용지 in {투명PVC, OPP}  ->  THEN exclude 코팅 {무광PP}      |
+------------------------------------------------------------------+
| [ON] 박가공->동판비 자동추가                         [편집][삭제] |
|   IF 가공 in {금박, 은박}    ->  THEN auto_add 동판비             |
+------------------------------------------------------------------+
| 비주얼 Rule Builder (새 규칙 / 편집 시)                            |
| 규칙 이름: [                            ]                         |
| WHEN: [옵션 v] [연산자 v] [값1 x][값2 x][+ 추가]                 |
|       [+ AND 조건] [+ OR 조건]                                    |
| THEN: [액션타입 v] [대상옵션 v] [파라미터...]                     |
| [미리보기] [저장]                                                 |
+------------------------------------------------------------------+
| AI 자연어 변환                                                     |
| ["투명PVC 선택하면 PP코팅 못 쓰게 해줘"]          [AI 변환]       |
+------------------------------------------------------------------+
```

### 4.5 Step 5 -- 자동견적 시뮬레이션 (기존 보강)

**라우트:** `/widget-admin/[productId]/simulate` (기존)
**보강사항:** 통계 카드 4개 추가 (전체/통과/경고/오류), 통과율 Progress Bar

### 4.6 Step 6 -- 발행 & 완료 (기존 유지)

**라우트:** `/widget-admin/[productId]/publish` (기존)
**변경사항:** 없음

---

## 5. DB Schema Review

### 5.1 기존 스키마 현황

현재 `packages/db/src/schema/widget/` 디렉토리에 구현된 테이블:

**SPEC-WB-001 (옵션):**
- `01-element-types.ts`: 옵션 엘리먼트 타입
- `02-element-choices.ts`: 옵션 선택지
- `02-products.ts`: 상품
- `02-product-categories.ts`: 상품 카테고리
- `02-product-recipes.ts`: 상품 레시피
- `02-recipe-option-bindings.ts`: 레시피-옵션 바인딩
- `02-recipe-choice-restrictions.ts`: 레시피 선택지 제한

**SPEC-WB-003 (제약조건):**
- `03-constraint-templates.ts`: 제약조건 템플릿
- `03-recipe-constraints.ts`: 레시피 제약조건
- `03-addon-groups.ts`: 추가상품 그룹
- `03-addon-group-items.ts`: 추가상품 그룹 항목
- `03-constraint-nl-history.ts`: AI 자연어 변환 이력

**SPEC-WB-004 (가격):**
- `04-product-price-configs.ts`: 상품 가격 설정
- `04-print-cost-base.ts`: 기본 단가표
- `04-postprocess-cost.ts`: 후가공비
- `04-qty-discount.ts`: 수량할인

**SPEC-WB-005/006 (시뮬레이션, 발행):**
- `05-simulation-runs.ts`: 시뮬레이션 실행 기록
- `05-publish-history.ts`: 발행 이력
- `06-orders.ts`: 주문

**Shared 스키마 (`packages/shared/src/db/schema/`):**
- `huni-options.schema.ts`: optionDefinitions, productOptions, optionChoices, optionConstraints, optionDependencies
- `huni-pricing.schema.ts`: priceTables, priceTiers, fixedPrices, packagePrices, foilPrices, lossQuantityConfigs
- `huni-orders.schema.ts`: orders, orderStatusHistory, orderDesignFiles
- `huni-materials.schema.ts`: papers, materials
- `huni-integration.schema.ts`: MES/Shopby 연동

### 5.2 스키마 갭 분석

| 설계 문서 테이블 | 현재 스키마 | 갭 상태 | 비고 |
|-----------------|-----------|---------|------|
| `tb_product_master` | `products` (02-products.ts) | 커버됨 | widget/shared 양쪽에 존재 |
| `tb_product_option` | `productOptions` (huni-options.schema.ts) | 커버됨 | displayOrder, isRequired 포함 |
| `tb_option_constraint` | `optionConstraints` (huni-options.schema.ts) + `recipeConstraints` (03-recipe-constraints.ts) | 커버됨 | 두 스키마에 분산 |
| `tb_print_cost_base` | `printCostBase` (04-print-cost-base.ts) | 커버됨 | SPEC-WB-004에서 구현 |
| `tb_postprocess_cost` | `postprocessCost` (04-postprocess-cost.ts) | 커버됨 | SPEC-WB-004에서 구현 |
| `tb_qty_discount` | `qtyDiscount` (04-qty-discount.ts) | 커버됨 | SPEC-WB-004에서 구현 |
| `mes_code_mapping` | `huni-integration.schema.ts` | 커버됨 | Shopby/MES/Edicus 코드 매핑 |

**결론:** DB 스키마 마이그레이션 불필요. 모든 필요 테이블이 기존 SPEC에서 구현 완료됨. 이 SPEC은 순수 프론트엔드 UI 구현에 집중한다.

---

## 6. shadcn Component Inventory

### 6.1 현재 설치된 컴포넌트

```
accordion, alert-dialog, avatar, badge, button, callout, card,
checkbox, command, dialog, dropdown-menu, form, input, label,
pagination, popover, progress, radio-group, scroll-area, select,
separator, skeleton, slider, switch, table, tabs, textarea,
toggle, toggle-group, tooltip
```

### 6.2 누락된 필수 컴포넌트

| 컴포넌트 | 필요 Step | 용도 | 설치 필요 |
|---------|----------|------|----------|
| `sheet` | Step 2, 4 | 제약조건 Side Drawer | YES |
| `toast` | Step 6 | 발행 완료 알림 | NO -- `sonner` 이미 사용 중 |
| `command` | Step 4 | 옵션값 검색 | NO -- 이미 설치됨 |
| `alert` | Step 4, 5 | 검증 결과 안내 | YES |
| `collapsible` | Step 4 | 규칙 접기/펼치기 | YES |

### 6.3 설치 명령

```bash
cd /home/innojini/dev/widget.creator/apps/admin
pnpm dlx shadcn@latest add sheet alert collapsible
```

### 6.4 외부 패키지 의존성 확인

| 패키지 | 필요 여부 | 현재 상태 |
|--------|----------|----------|
| `@dnd-kit/core` | Step 2 | 설치됨 (^6.0.0) |
| `@dnd-kit/sortable` | Step 2 | 설치됨 (^8.0.0) |
| `@dnd-kit/utilities` | Step 2 | 설치됨 (^3.0.0) |
| `json-rules-engine` | Step 4 미리보기 | 미설치 -- 서버사이드에서만 사용, Admin에서는 tRPC로 호출 |
| `react-querybuilder` | Step 4 Rule Builder | **미설치 -- 설치 필요** (MIT 라이선스) |
| `sonner` | Step 6 | 설치됨 (^1.5.0) -- toast 대체 |
| `cmdk` | Step 4 Command | 설치됨 (^1.0.0) |

**결론:** shadcn 컴포넌트 (`sheet`, `alert`, `collapsible`) 및 `react-querybuilder` 패키지 설치 필요.

### 6.5 react-querybuilder 설치 및 설정

```bash
cd /home/innojini/dev/widget.creator/apps/admin
pnpm add react-querybuilder
```

**후니프린팅 Field 매핑:**
- `optionDefinitions` 목록에서 동적으로 field 생성
- `field.name` = optionDefinition.key (예: `size`, `print`, `paper`, `process`)
- `field.label` = optionDefinition.name (예: `사이즈`, `인쇄`, `종이`, `가공`)
- `field.values` = 해당 option의 optionChoices (예: `[{name: '73*98', label: '73×98mm'}]`)

**operator 매핑:**
| react-querybuilder operator | triggerOperator | 설명 |
|---|---|---|
| `=` | `equals` | 단일 값 일치 |
| `in` | `in` | 복수 값 중 하나 |
| `notIn` | `not_in` | 복수 값 중 없음 |
| `contains` | `contains` | 값 포함 (문자열) |

**데이터 흐름:**
```
react-querybuilder Query → formatQuery('json_without_ids') → Zod parse → recipe_constraints.triggerValues/extraConditions
```

---

## 7. Technology Stack Alignment

### 7.1 현재 기술 스택 (apps/admin/package.json)

- **Framework:** Next.js ^15.0.0 (App Router)
- **React:** ^19.0.0
- **UI:** shadcn/ui (Radix primitives) + Tailwind CSS v4
- **State:** React state + tRPC React Query
- **DnD:** @dnd-kit/core ^6.0.0, @dnd-kit/sortable ^8.0.0
- **Form:** react-hook-form ^7.0.0 + @hookform/resolvers ^3.0.0
- **Validation:** Zod ~3.24.0
- **ORM:** Drizzle ORM ^0.45.1 + drizzle-zod ^0.7.0
- **API:** tRPC ^11.0.0 (client + react-query)
- **Table:** @tanstack/react-table ^8.0.0
- **Toast:** sonner ^1.5.0
- **Icons:** lucide-react ^0.400.0
- **Testing:** vitest ~3.0.0
- **TypeScript:** ~5.7.0

### 7.2 추가 필요 사항

- shadcn 컴포넌트: `sheet`, `alert`, `collapsible`
- 외부 패키지: 추가 불필요

---

## 8. tRPC Router Requirements

### 8.1 기존 tRPC 라우터 활용

이 SPEC에서 사용하는 기존 tRPC 프로시저:

| Router | Procedure | Step | 용도 |
|--------|-----------|------|------|
| `widgetAdmin` | `dashboard` | 1 | 전체 상품 + 완성도 조회 |
| `widgetAdmin` | `completeness` | 6 | 상품별 완성도 조회 |
| `widgetAdmin` | `startSimulation` | 5 | 시뮬레이션 시작 |
| `widgetAdmin` | `simulationStatus` | 5 | 시뮬레이션 진행 상태 |
| `widgetAdmin` | `simulationCases` | 5 | 시뮬레이션 케이스 결과 |
| `widgetAdmin` | `publish` | 6 | 상품 발행 |
| `widgetAdmin` | `unpublish` | 6 | 발행 취소 |

### 8.2 신규 tRPC 프로시저 필요

| Router | Procedure | Step | 용도 | 입력 | 출력 |
|--------|-----------|------|------|------|------|
| `widgetAdmin` | `productOptions.list` | 2 | 상품 옵션 목록 조회 | `{ productId }` | `ProductOption[]` |
| `widgetAdmin` | `productOptions.reorder` | 2 | 옵션 순서 변경 | `{ productId, orderedIds }` | `void` |
| `widgetAdmin` | `productOptions.addToProduct` | 2 | 상품에 옵션 추가 | `{ productId, optionDefinitionId }` | `ProductOption` |
| `widgetAdmin` | `productOptions.remove` | 2 | 상품에서 옵션 제거 | `{ productId, productOptionId }` | `void` |
| `widgetAdmin` | `productOptions.updateValues` | 2 | 옵션 값 업데이트 | `{ productOptionId, values }` | `void` |
| `widgetAdmin` | `optionDefinitions.list` | 2 | 글로벌 옵션 정의 목록 | `{}` | `OptionDefinition[]` |
| `widgetAdmin` | `priceConfig.get` | 3 | 가격 설정 조회 | `{ productId }` | `ProductPriceConfig` |
| `widgetAdmin` | `priceConfig.update` | 3 | 가격 설정 저장 | `{ productId, config }` | `void` |
| `widgetAdmin` | `printCostBase.list` | 3 | 단가표 조회 | `{ productId }` | `PrintCostBase[]` |
| `widgetAdmin` | `printCostBase.upsert` | 3 | 단가표 저장 | `{ productId, rows }` | `void` |
| `widgetAdmin` | `postprocessCost.list` | 3 | 후가공비 조회 | `{ productId }` | `PostprocessCost[]` |
| `widgetAdmin` | `postprocessCost.upsert` | 3 | 후가공비 저장 | `{ productId, rows }` | `void` |
| `widgetAdmin` | `qtyDiscount.list` | 3 | 할인구간 조회 | `{ productId }` | `QtyDiscount[]` |
| `widgetAdmin` | `qtyDiscount.upsert` | 3 | 할인구간 저장 | `{ productId, rows }` | `void` |
| `widgetAdmin` | `pricingTest` | 3 | 실시간 견적 테스트 | `{ productId, selections }` | `PriceBreakdown` |
| `widgetAdmin` | `constraints.list` | 4 | 제약조건 목록 | `{ productId }` | `Constraint[]` |
| `widgetAdmin` | `constraints.create` | 4 | 제약조건 생성 | `{ productId, rule }` | `Constraint` |
| `widgetAdmin` | `constraints.update` | 4 | 제약조건 수정 | `{ constraintId, rule }` | `Constraint` |
| `widgetAdmin` | `constraints.delete` | 4 | 제약조건 삭제 | `{ constraintId }` | `void` |
| `widgetAdmin` | `constraints.toggle` | 4 | 제약조건 활성/비활성 | `{ constraintId, isActive }` | `void` |
| `widgetAdmin` | `constraints.testAll` | 4 | 전체 규칙 충돌 검사 | `{ productId }` | `TestResult` |
| `widgetAdmin` | `constraints.aiConvert` | 4 | AI 자연어 변환 | `{ productId, text }` | `ConvertedRule` |

---

## 9. Implementation Priority

### Phase 1: Infrastructure (Priority HIGH)

1. shadcn 컴포넌트 설치 (`sheet`, `alert`, `collapsible`)
2. 공통 레이아웃 컴포넌트 정의 (Step 사이드바 네비게이션)

### Phase 2: Step 2 -- 주문옵션 설정 (Priority HIGH)

1. `productOptions` tRPC 라우터 생성
2. `/widget-admin/[productId]/options/page.tsx` 구현
3. `OptionList` + `OptionRow` + DnD 정렬 구현
4. `OptionValueEditor` 구현
5. `OptionAddDialog` 구현
6. `ConstraintSheet` 구현

### Phase 3: Step 3 -- 가격룰 (Priority HIGH)

1. `priceConfig`, `printCostBase`, `postprocessCost`, `qtyDiscount` tRPC 라우터 생성
2. `/widget-admin/[productId]/pricing/page.tsx` 구현
3. `PriceModeSelector` + 모드별 에디터 4종 구현
4. `PostprocessCostEditor` + `QtyDiscountEditor` 구현
5. `PriceTestPanel` 실시간 테스트 구현

### Phase 4: Step 4 -- 제약조건 빌더 (Priority MEDIUM)

1. `constraints` tRPC 라우터 생성
2. `/widget-admin/[productId]/constraints/page.tsx` 구현
3. `ConstraintList` + `ConstraintCard` 구현
4. `RuleBuilder` + `TriggerEditor` + `ActionEditor` 구현
5. `AiRuleConverter` 구현

### Phase 5: Step 1 보강 (Priority LOW)

1. `StatCard` 통계 카드 추가
2. `CategoryFilter` + `StatusFilter` 필터 추가
3. 기존 Dashboard 페이지 보강

### Phase 6: Step 5 보강 (Priority LOW)

1. 통계 카드 4개 추가
2. 통과율 Progress Bar 추가

---

## 10. Pencil Visualization Strategy

### 10.1 디자인 검증 대상 화면

| Frame | 화면 | 검증 포인트 |
|-------|------|-----------|
| WA-001-F1 | Step 2 옵션 목록 | DnD 핸들, Badge 색상, 옵션 행 간격 |
| WA-001-F2 | Step 2 ConstraintSheet | Sheet 너비, 규칙 카드 간격 |
| WA-001-F3 | Step 3 가격 설정 | RadioGroup 스타일, 테이블 편집 UX |
| WA-001-F4 | Step 3 견적 테스트 | 가격 결과 카드, 숫자 폰트 |
| WA-001-F5 | Step 4 Rule Builder | IF-THEN 2컬럼 레이아웃, 조건 칩 |
| WA-001-F6 | Step 4 AI 변환 | 변환 결과 카드, 신뢰도 표시 |

### 10.2 디자인 토큰 검증 항목

- `--primary` (#5538B6) 대 설계 문서의 amber 사용처 대체 확인
- `--radius-md` (5px) 일관성 확인
- `--letter-spacing-tight` (-0.05em) 한글 타이포그래피 확인
- 숫자/가격 표시에 `font-mono` 적용 확인

---

## 11. Architecture Context

```
[SPEC-WB-001] 옵션 라이브러리
      |
[SPEC-WB-002] 상품 레시피
      |
[SPEC-WB-003] 제약조건 엔진
      |                    \
[SPEC-WB-004] 가격 계산      [SPEC-WB-DS] 디자인 토큰
      |                    /
[SPEC-WA-001] Admin Console UI  <--- 이 SPEC
      |
      +-- Step 1: Dashboard  (WB-001~006 데이터 조회)
      +-- Step 2: Options    (WB-001, WB-002 CRUD)
      +-- Step 3: Pricing    (WB-004 CRUD + 테스트)
      +-- Step 4: Constraints(WB-003 CRUD + AI 변환)
      +-- Step 5: Simulation (WB-005 실행/조회)
      +-- Step 6: Publish    (WB-005 발행 게이트)
      |
[SPEC-WB-006] 런타임 자동견적 엔진 (고객 위젯)
```

---

## 12. Open Questions

1. **AI 자연어 변환 구현**: LLM API 호출을 서버사이드에서 수행할 것인가? tRPC mutation으로 래핑하여 Admin에서는 단순 호출로 처리할 수 있다.
   -> 권장: tRPC `constraints.aiConvert` mutation으로 서버사이드 LLM 호출

2. **옵션 템플릿 복사**: 설계 문서에 "템플릿 복사" 기능이 있으나, 초기 구현 범위에 포함할 것인가?
   -> 권장: Phase 2 이후 별도 SPEC으로 분리

3. **Step 간 네비게이션**: 사이드바 기반 Step 네비게이션 vs 탭 기반?
   -> 권장: 기존 라우트 구조 유지 (`/widget-admin/[id]/options`, `/widget-admin/[id]/pricing` 등)

4. **Excel 단가 임포트**: Step 3에서 CSV/Excel 임포트 기능이 필요한가?
   -> 권장: 초기 버전에서는 수동 입력, 추후 별도 SPEC으로 CSV 임포트 추가

---

*SPEC-WA-001 v1.0.0 -- 2026-02-26*
*후니프린팅 Widget Admin Console: 인쇄 자동견적 6-Step 관리 UI*
