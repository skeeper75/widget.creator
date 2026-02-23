---
id: SPEC-WIDGET-ADMIN-001
title: Widget Builder Admin Dashboard - Acceptance Criteria
version: 1.0.0
status: Draft
created: 2026-02-22
updated: 2026-02-22
author: MoAI
priority: P0
spec_ref: SPEC-WIDGET-ADMIN-001/spec.md
plan_ref: SPEC-WIDGET-ADMIN-001/plan.md
---

# SPEC-WIDGET-ADMIN-001: Widget Builder Admin Dashboard - 인수 기준

## 1. Ubiquitous Requirements (항상 활성) 인수 시나리오

### Scenario U-001: DataTable 범용 기능 검증

**목적**: 모든 목록 페이지에서 DataTable 컴포넌트의 정렬, 필터, 페이지네이션, 컬럼 가시성이 동작하는지 검증

```gherkin
Given 관리자가 데이터 목록 페이지에 접근한다
When DataTable 컴포넌트가 렌더링된다
Then TanStack Table v8 기반으로 정렬(asc/desc/none) 기능이 동작해야 한다
  And 컬럼별 필터(text, select, range) 기능이 동작해야 한다
  And 페이지네이션(클라이언트/서버 전환) 기능이 동작해야 한다
  And 컬럼 가시성 토글 드롭다운이 동작해야 한다
  And 전역 검색이 300ms debounce로 동작해야 한다
  And 데이터가 없을 때 빈 상태(empty state) UI가 표시되어야 한다
```

### Scenario U-002: drizzle-zod 폼 검증 검증

**목적**: 모든 CRUD 폼에서 drizzle-zod 스키마 기반 클라이언트 사이드 검증이 동작하는지 검증

```gherkin
Given 관리자가 CRUD 폼을 작성한다
When 필수 필드를 비워두고 제출을 시도한다
Then drizzle-zod 생성 스키마 기반 검증 에러가 표시되어야 한다
  And React Hook Form의 Zod resolver가 에러 메시지를 표시해야 한다
  And 유효한 데이터 입력 후 폼이 정상 제출되어야 한다
  And 서버 사이드에서도 동일 스키마로 검증이 수행되어야 한다
```

### Scenario U-003: tRPC type-safe API 검증

**목적**: tRPC를 통한 type-safe API 호출 및 TanStack Query 통합이 동작하는지 검증

```gherkin
Given tRPC 클라이언트가 설정되어 있다
When 관리자가 데이터 조회/생성/수정/삭제 작업을 수행한다
Then tRPC query/mutation을 통해 type-safe API 호출이 수행되어야 한다
  And TanStack Query의 캐시가 mutation 후 자동 무효화되어야 한다
  And 타입 불일치 시 TypeScript 컴파일 에러가 발생해야 한다
```

### Scenario U-004: 디자인 토큰 적용 검증

**목적**: 후니프린팅 디자인 토큰이 shadcn/ui 테마에 올바르게 적용되었는지 검증

```gherkin
Given shadcn/ui 컴포넌트가 렌더링된다
When 브라우저에서 CSS 변수를 검사한다
Then Primary 색상이 #5538B6으로 적용되어야 한다
  And Font Family가 Noto Sans로 적용되어야 한다
  And 기본 Font Size가 14px / 400 weight로 적용되어야 한다
  And Spacing이 4px 그리드 배수로 적용되어야 한다
  And Border Radius가 3px/4px/5px/20px 단계로 적용되어야 한다
```

### Scenario U-005: 토스트 알림 검증

**목적**: 데이터 변경 작업 시 성공/실패 토스트 알림이 표시되는지 검증

```gherkin
Given 관리자가 데이터 생성/수정/삭제 작업을 수행한다
When 작업이 성공한다
Then 성공 토스트 알림이 표시되어야 한다

When 작업이 실패한다
Then 실패 토스트 알림이 에러 메시지와 함께 표시되어야 한다
```

### Scenario U-006: 삭제 확인 다이얼로그 검증

**목적**: 삭제 작업 전 확인 다이얼로그가 올바르게 표시되는지 검증

```gherkin
Given 관리자가 레코드 삭제 버튼을 클릭한다
When 소프트 삭제(isActive 토글)인 경우
Then 일반 확인 다이얼로그가 표시되어야 한다

When 하드 삭제인 경우
Then 위험도 높은 확인 다이얼로그(destructive 스타일)가 표시되어야 한다
  And "확인" 버튼 클릭 시에만 삭제가 실행되어야 한다
  And "취소" 버튼 클릭 시 삭제가 취소되어야 한다
```

### Scenario U-007: isActive 필터 토글 검증

**목적**: 목록 페이지에서 활성/비활성/전체 데이터 필터가 동작하는지 검증

```gherkin
Given 관리자가 목록 페이지에 접근한다
When isActive 필터를 "활성"으로 설정한다
Then isActive=true인 데이터만 표시되어야 한다

When isActive 필터를 "비활성"으로 설정한다
Then isActive=false인 데이터만 표시되어야 한다

When isActive 필터를 "전체"로 설정한다
Then 모든 데이터가 표시되어야 한다
```

### Scenario U-008: 사이드바 네비게이션 검증

**목적**: 반응형 사이드바 네비게이션이 올바르게 동작하는지 검증

```gherkin
Given 관리자가 Admin Dashboard에 접근한다
When 사이드바가 렌더링된다
Then 6개 도메인이 아이콘과 함께 그룹화되어 표시되어야 한다
  And Dashboard, Product Catalog, Materials, Processes, Pricing, Options, Integration, Widgets, Settings 메뉴가 존재해야 한다
  And 현재 활성 메뉴가 하이라이트되어야 한다
  And 반응형으로 모바일에서 축소/확장이 가능해야 한다
```

---

## 2. Domain 1 - Product Catalog 인수 시나리오

### Scenario E-101: TreeEditor 카테고리 계층 구조 표시

```gherkin
Given categories 테이블에 depth 0-2 카테고리 데이터가 존재한다
When 관리자가 /admin/products/categories 페이지에 접근한다
Then TreeEditor 컴포넌트가 계층 트리 구조로 카테고리를 표시해야 한다
  And 각 노드에 하위 카테고리 수와 상품 수 배지가 표시되어야 한다
  And 비활성 노드는 opacity로 시각 구분되어야 한다
```

### Scenario E-102: TreeEditor 드래그 앤 드롭 재정렬

```gherkin
Given TreeEditor에 카테고리 트리가 표시되어 있다
When 관리자가 노드를 드래그하여 다른 위치에 드롭한다
Then 해당 카테고리의 parentId, depth, displayOrder가 일괄 업데이트되어야 한다
  And 영향받는 하위 카테고리의 depth가 재귀적으로 갱신되어야 한다
  And depth가 2를 초과하는 이동은 차단되어야 한다
```

### Scenario E-103: 상품 목록 DataTable

```gherkin
Given products 테이블에 221개 상품 데이터가 존재한다
When 관리자가 /admin/products/list 페이지에 접근한다
Then 11개 컬럼(ID, huniCode, name, category, productType, pricingModel, orderMethod, editorEnabled, mesRegistered, isActive, Actions)이 포함된 DataTable이 표시되어야 한다
  And huniCode, name 컬럼은 검색 가능해야 한다
  And category, productType, pricingModel 컬럼은 셀렉트 필터로 제공되어야 한다
  And Actions 컬럼에 Edit, View Sizes, View Options, Delete 버튼이 있어야 한다
  And 50건 초과 시 서버 사이드 페이지네이션이 적용되어야 한다
```

### Scenario E-104: 상품 생성/수정 폼

```gherkin
Given 관리자가 /admin/products/[id] 페이지에 접근한다
When 상품 폼을 작성하여 제출한다
Then 14개 필드(categoryId, huniCode, edicusCode, shopbyId, name, slug, productType, pricingModel, sheetStandard, figmaSection, orderMethod, editorEnabled, description, isActive)가 포함된 폼이 처리되어야 한다
  And huniCode는 unique 제약 + 최대 10자 검증이 수행되어야 한다
  And slug은 name에서 자동 생성되되 수동 편집이 가능해야 한다
  And categoryId는 카테고리 트리 셀렉터로 선택해야 한다
  And drizzle-zod 스키마 기반 검증이 수행되어야 한다
```

### Scenario E-105: 상품 사이즈 인라인 편집

```gherkin
Given 상품 상세 페이지에서 "사이즈 관리" 탭이 활성화되어 있다
When 관리자가 product_sizes 데이터를 조회한다
Then 인라인 편집 가능한 DataTable이 표시되어야 한다
  And isCustom=true인 행에는 customMinW/H, customMaxW/H 범위 필드가 추가 표시되어야 한다
  And batchUpdate로 변경분을 일괄 저장할 수 있어야 한다
```

---

## 3. Domain 2 - Materials 인수 시나리오

### Scenario E-201: 용지 목록 인라인 편집

```gherkin
Given papers 테이블에 55개 용지 데이터가 존재한다
When 관리자가 /admin/materials/papers 페이지에 접근한다
Then 12개 컬럼이 포함된 DataTable이 표시되어야 한다
  And costPerRear, sellingPerRear, costPer4Cut, sellingPer4Cut 컬럼은 인라인 편집이 가능해야 한다
  And weight 컬럼은 range 필터가 적용되어야 한다
  And displayOrder 컬럼은 드래그 재정렬이 가능해야 한다
  And 가격 변경 시 batchUpdatePrices로 일괄 저장되어야 한다
```

### Scenario E-202: 소재 관리 CRUD

```gherkin
Given materials 테이블에 30개 소재 데이터가 존재한다
When 관리자가 /admin/materials/materials 페이지에 접근한다
Then CRUD DataTable이 표시되어야 한다
  And materialType 필드가 셀렉트 필터로 제공되어야 한다
```

### Scenario E-203: MatrixEditor 용지-상품 매핑

```gherkin
Given papers(55행) x products(45열) 매핑 데이터가 존재한다
When 관리자가 /admin/materials/mappings 페이지에 접근한다
Then MatrixEditor 컴포넌트가 55x45 매트릭스 그리드로 표시되어야 한다
  And 행 헤더(용지명)와 열 헤더(상품명)가 고정(sticky)되어야 한다
  And 셀 클릭 시 매핑이 토글(filled/empty circle)되어야 한다
  And coverType(내지/표지) 전환 필터가 동작해야 한다
  And 상품이 상위 카테고리별로 그룹핑되어 열 헤더에 표시되어야 한다
  And 가로/세로 스크롤이 부드럽게 동작해야 한다
```

---

## 4. Domain 3 - Processes 인수 시나리오

### Scenario E-301: 인쇄방식 CRUD

```gherkin
Given print_modes 테이블에 12개 인쇄방식 데이터가 존재한다
When 관리자가 /admin/processes/print-modes 페이지에 접근한다
Then CRUD DataTable이 표시되어야 한다
  And sides(단면/양면) 셀렉트 필터가 동작해야 한다
  And colorType(흑백/컬러/별색) 셀렉트 필터가 동작해야 한다
```

### Scenario E-302: 후가공 그룹 관리

```gherkin
Given post_processes 테이블에 40개 후가공 데이터가 존재한다
When 관리자가 /admin/processes/post-processes 페이지에 접근한다
Then groupCode 기준 8개 그룹(박, 형압, 코팅, 접지, 타공, 오시, 미싱, 포장)이 아코디언 또는 탭으로 표시되어야 한다
  And 각 그룹 내에서 CRUD 작업이 가능해야 한다
```

### Scenario E-303: 제본 유효성 검증

```gherkin
Given 관리자가 /admin/processes/bindings 페이지에서 제본을 편집한다
When minPages >= maxPages 값을 입력한다
Then 폼 수준 유효성 검증 에러가 표시되어야 한다

When pageStep <= 0 값을 입력한다
Then 폼 수준 유효성 검증 에러가 표시되어야 한다

When minPages < maxPages 이고 pageStep > 0인 유효한 값을 입력한다
Then 정상적으로 저장되어야 한다
```

### Scenario E-304: 면부 규칙 유일성 검증

```gherkin
Given imposition_rules 테이블에 30개 면부 규칙이 존재한다
When 관리자가 동일 sheetStandard 내에서 중복 cutWidth x cutHeight 조합을 입력한다
Then 실시간으로 유일성 검증 에러가 표시되어야 한다

When 고유한 cutWidth x cutHeight 조합을 입력한다
Then 정상적으로 저장되어야 한다
```

---

## 5. Domain 4 - Pricing 인수 시나리오

### Scenario E-401: 가격표 메타 관리

```gherkin
Given price_tables 테이블에 20개 가격표 메타 데이터가 존재한다
When 관리자가 /admin/pricing/tables 페이지에 접근한다
Then CRUD DataTable이 표시되어야 한다
  And priceType(selling/cost) 셀렉트 필터가 동작해야 한다
  And sheetStandard 셀렉트 필터가 동작해야 한다
  And 각 행에 "단가 편집" 버튼이 있어야 한다
```

### Scenario E-402: SpreadsheetEditor 가격 단가 편집

```gherkin
Given price_tiers 테이블에 10,000행 가격 데이터가 존재한다
When 관리자가 특정 price_table의 "단가 편집"을 클릭한다
Then SpreadsheetEditor 컴포넌트가 optionCode(행) x 수량구간(열) 형태로 표시되어야 한다
  And 가상 스크롤로 10,000행이 2초 이내에 렌더링되어야 한다
  And 셀 클릭 시 인라인 편집(숫자 입력)이 가능해야 한다
  And Enter/Tab 키로 다음 셀 이동이 가능해야 한다
  And Shift+Click, Ctrl+Click으로 영역 선택이 가능해야 한다
```

### Scenario E-402-batch: SpreadsheetEditor 대량 편집 기능

```gherkin
Given SpreadsheetEditor에서 셀 영역이 선택되어 있다
When 관리자가 "일괄 값 적용"을 실행한다
Then 선택 영역의 모든 셀에 동일 값이 채워져야 한다

When 관리자가 "+10%" 비율 조정을 실행한다
Then 선택 영역의 모든 셀 값이 10% 증가해야 한다

When 관리자가 Ctrl+Z를 누른다
Then 최근 변경이 취소(Undo)되어야 한다

When 관리자가 Ctrl+Shift+Z를 누른다
Then 취소된 변경이 복원(Redo)되어야 한다

When 관리자가 "저장"을 클릭한다
Then 변경된 셀만 batch upsert로 서버에 전송되어야 한다
  And 변경된 셀은 배경색 하이라이트로 표시되어야 한다
```

### Scenario E-403: 고정가격 관계 필터

```gherkin
Given fixed_prices 테이블에 300개 고정가격 데이터가 존재한다
When 관리자가 /admin/pricing/fixed 페이지에 접근한다
Then productId/sizeId/paperId/printModeId 필드가 관계 테이블 name으로 표시되어야 한다
  And 각 관계 필드가 셀렉트 필터로 제공되어야 한다
```

### Scenario E-404: 패키지 가격 인라인 편집

```gherkin
Given package_prices 테이블에 200개 패키지 가격 데이터가 존재한다
When 관리자가 /admin/pricing/packages 페이지에 접근한다
Then product/size/printMode 관계 셀렉트 필터가 동작해야 한다
  And pageCount, minQty, maxQty 필드가 인라인 편집 가능해야 한다
```

### Scenario E-405: 박/형압 가격 관리

```gherkin
Given foil_prices 테이블에 150개 박/형압 가격 데이터가 존재한다
When 관리자가 /admin/pricing/foil 페이지에 접근한다
Then foilType, targetProductType 셀렉트 필터가 동작해야 한다
  And width x height 조합이 시각적으로 구분되어 표시되어야 한다
```

### Scenario E-406: 손실수량 설정

```gherkin
Given loss_quantity_config 테이블에 5개 설정 데이터가 존재한다
When 관리자가 /admin/pricing/loss 페이지에 접근한다
Then 전체 레코드가 카드 형태로 표시되어야 한다
  And scopeType(global/category/product)별로 그룹화되어야 한다
  And lossRate, minLossQty 필드가 인라인 편집 가능해야 한다
```

---

## 6. Domain 5 - Options & UI 인수 시나리오

### Scenario E-501: 옵션 정의 DataTable

```gherkin
Given option_definitions 테이블에 30개 옵션 정의가 존재한다
When 관리자가 /admin/options/definitions 페이지에 접근한다
Then 9개 컬럼(ID, key, name, optionClass, optionType, uiComponent, description, displayOrder, isActive)이 포함된 DataTable이 표시되어야 한다
  And key 컬럼은 unique 검증이 수행되어야 한다
  And optionClass, optionType 컬럼은 셀렉트 필터가 동작해야 한다
  And uiComponent 컬럼은 badge로 표시되어야 한다
  And description 컬럼은 truncated + tooltip으로 표시되어야 한다
  And displayOrder 컬럼은 드래그 재정렬이 가능해야 한다
```

### Scenario E-502: 옵션 선택지 그룹 관리

```gherkin
Given option_choices 테이블에 1,198개 선택지 데이터가 존재한다
When 관리자가 /admin/options/choices 페이지에 접근한다
Then optionDefinitionId 기준 그룹 필터 또는 중첩 테이블이 제공되어야 한다
  And ref_*_id 필드(refPaperId 등)는 참조 테이블 name이 read-only 링크로 표시되어야 한다
  And priceKey 필드는 price_tiers.optionCode와의 연결이 시각적으로 표시되어야 한다
```

### Scenario E-503: ConstraintBuilder 제약조건 편집

```gherkin
Given 특정 상품에 option_constraints 데이터가 존재한다
When 관리자가 /admin/options/constraints 페이지에서 상품을 선택한다
Then ConstraintBuilder 컴포넌트가 조건-액션 플로우 카드로 표시되어야 한다
  And IF 카드에 sourceOptionId + operator(eq/neq/gt/lt/in/between) + value 필드가 있어야 한다
  And THEN 카드에 targetOptionId + action(show/hide/set_value/filter_choices/require) + value 필드가 있어야 한다
  And constraintType 탭 필터(visibility, value_restriction, choice_filter, auto_set)가 동작해야 한다
  And priority 기반 드래그 정렬이 가능해야 한다
  And "+" 버튼으로 새 규칙을 추가할 수 있어야 한다
  And 규칙 복제 기능이 동작해야 한다
```

### Scenario E-504: 옵션 의존성 관리

```gherkin
Given 특정 상품에 option_dependencies 데이터가 존재한다
When 관리자가 /admin/options/dependencies 페이지에서 상품을 선택한다
Then parentOptionId -> childOptionId 의존성 관계가 표시되어야 한다
  And parentChoiceId가 지정된 경우 특정 선택지에서만 활성화됨이 표시되어야 한다
  And dependencyType(visibility, value_filter, auto_select) 구분이 되어야 한다
  And 테이블 뷰와 그래프 뷰 전환이 가능해야 한다
```

---

## 7. Domain 6 - Integration 인수 시나리오

### Scenario E-601: MES 아이템 읽기 전용 브라우저

```gherkin
Given mes_items 테이블에 260개 MES 아이템이 존재한다
When 관리자가 /admin/integration/mes 페이지에 접근한다
Then 읽기 전용 DataTable이 표시되어야 한다
  And groupCode, itemType 기준 필터가 동작해야 한다
  And 행 확장(expand row) 시 해당 아이템의 mes_item_options(최대 10개)가 하위 테이블로 표시되어야 한다
  And 편집 기능이 비활성화되어야 한다
  And "동기화" 버튼이 존재해야 한다
```

### Scenario E-602: VisualMapper 상품-MES 매핑

```gherkin
Given products와 mes_items 데이터가 존재한다
When 관리자가 /admin/integration/mes-mapping 페이지에 접근한다
Then 좌측에 products 목록(카테고리별 그룹, 검색 가능)이 표시되어야 한다
  And 우측에 mes_items 목록(groupCode별 그룹, 검색 가능)이 표시되어야 한다
  And 중앙에 product_mes_mapping의 연결선이 표시되어야 한다
  And 드래그 또는 셀렉터로 새 매핑을 생성할 수 있어야 한다
  And coverType(내지/표지) 구분이 표시되어야 한다
  And 매핑되지 않은 상품에 경고 아이콘이 표시되어야 한다
```

### Scenario E-603: 에디터 매핑 JSONB 편집

```gherkin
Given product_editor_mapping 테이블에 111개 매핑 데이터가 존재한다
When 관리자가 /admin/integration/editors 페이지에 접근한다
Then productId가 상품명으로 표시(관계 조인)되어야 한다
  And editorType 셀렉트 필터가 동작해야 한다
  And templateConfig(JSONB)가 JSON 에디터 또는 구조화된 폼으로 편집 가능해야 한다
  And "미매핑" 필터로 매핑되지 않은 상품을 조회할 수 있어야 한다
```

### Scenario E-604: KanbanBoard MES 옵션 매핑

```gherkin
Given option_choice_mes_mapping 테이블에 1,198개 매핑 데이터가 존재한다
When 관리자가 /admin/integration/mes-options 페이지에 접근한다
Then KanbanBoard 컴포넌트가 3개 컬럼(Pending/Mapped/Verified)으로 표시되어야 한다
  And 각 컬럼에 카드 수 카운트 배지가 표시되어야 한다
  And 카드에 optionChoice.name, mesCode, mappedBy, mappedAt 정보가 표시되어야 한다
  And mappingType 기준 필터 탭이 동작해야 한다
  And Pending 컬럼의 카드에 경고 아이콘과 "매핑 필요" 라벨이 표시되어야 한다
```

### Scenario E-604-drag: KanbanBoard 드래그 상태 전환

```gherkin
Given KanbanBoard에 Pending 상태의 카드가 존재한다
When 관리자가 카드를 Pending -> Mapped 컬럼으로 드래그한다
Then mesItemId, mesCode 입력 다이얼로그가 표시되어야 한다
  And 입력 완료 시 상태가 Mapped로 변경되어야 한다

When 관리자가 카드를 Mapped -> Verified 컬럼으로 드래그한다
Then mesItemId와 mesCode의 유효성(mes_items 테이블 존재 여부)이 검증되어야 한다
  And 확인 다이얼로그가 표시되어야 한다
  And mappedBy에 현재 관리자 이름, mappedAt에 현재 시간이 기록되어야 한다

When 관리자가 카드를 Verified -> Mapped 컬럼으로 드래그한다
Then 되돌리기 확인 다이얼로그가 표시되어야 한다
```

---

## 8. Widget & Dashboard 인수 시나리오

### Scenario E-701: 위젯 CRUD DataTable

```gherkin
Given Widget 엔티티에 위젯 데이터가 존재한다
When 관리자가 /admin/widgets/list 페이지에 접근한다
Then CRUD DataTable이 표시되어야 한다
  And 위젯별 상태(ACTIVE/INACTIVE/DRAFT) 배지가 표시되어야 한다
  And API 키 복사 버튼이 동작해야 한다
  And 임베드 코드 생성 버튼이 동작해야 한다
```

### Scenario E-702: 위젯 상세 설정

```gherkin
Given 특정 위젯의 상세 설정 페이지에 접근한다
When 관리자가 /admin/widgets/[id] 페이지를 열람한다
Then 탭 기반 편집기가 표시되어야 한다
  And 기본 정보 탭(이름, shopUrl, 테마 설정)이 동작해야 한다
  And 상품 카테고리 선택 탭이 동작해야 한다
  And 가격 규칙 연결 탭이 동작해야 한다
```

### Scenario E-703: 위젯 실시간 미리보기

```gherkin
Given 위젯 설정이 완료되어 있다
When 관리자가 /admin/widgets/preview 페이지에 접근한다
Then iframe 내에서 실제 위젯 렌더링이 표시되어야 한다
  And 설정 변경 시 실시간으로 미리보기가 업데이트되어야 한다
```

### Scenario E-704: 대시보드 통계

```gherkin
Given 시스템에 상품, 위젯, MES 매핑, 옵션 데이터가 존재한다
When 관리자가 /admin/dashboard 페이지에 접근한다
Then 총 상품 수 / 활성 상품 수 카드가 표시되어야 한다
  And 총 위젯 수 / 활성 위젯 수 카드가 표시되어야 한다
  And MES 매핑 완료율(mapped+verified / total) 카드가 표시되어야 한다
  And 옵션 제약조건 수 카드가 표시되어야 한다
  And 최근 변경 활동 로그(최근 10건)가 표시되어야 한다
```

---

## 9. State-Driven Requirements 인수 시나리오

### Scenario S-001: 미인증 사용자 리다이렉트

```gherkin
Given 사용자가 인증되지 않은 상태이다
When /admin/* 경로에 접근을 시도한다
Then /auth/login 페이지로 리다이렉트되어야 한다
  And tRPC 라우터 직접 접근도 차단되어야 한다
```

### Scenario S-002: 서버 사이드 페이지네이션

```gherkin
Given DataTable의 데이터 건수가 50건을 초과한다
When 서버 사이드 페이지네이션이 적용된다
Then 페이지당 기본 20건이 표시되어야 한다
  And 10/20/50/100건 페이지 크기 선택이 가능해야 한다
  And 페이지 전환 시 서버에서 새 데이터를 로딩해야 한다
```

### Scenario S-003: 가상 스크롤 성능

```gherkin
Given price_tiers 편집기에 1,000행 이상의 데이터가 존재한다
When SpreadsheetEditor가 렌더링된다
Then 가상 스크롤(virtual scroll)이 적용되어야 한다
  And DOM 노드 수가 화면에 보이는 행 수 + 오버스캔 행 수 이하여야 한다
  And 스크롤이 부드럽게(60fps 이상) 동작해야 한다
```

### Scenario S-004: 미저장 변경사항 경고

```gherkin
Given 폼에 수정된 변경사항이 있다
When 사용자가 페이지를 떠나려고 한다
Then "저장되지 않은 변경사항이 있습니다" 경고 다이얼로그가 표시되어야 한다
  And "머무르기"를 선택하면 페이지에 남아야 한다
  And "떠나기"를 선택하면 변경사항이 폐기되고 이동해야 한다
```

### Scenario S-005: MatrixEditor 스켈레톤 UI

```gherkin
Given MatrixEditor의 매핑 데이터가 로딩 중이다
When 데이터 로딩이 진행 중인 상태이다
Then 매트릭스 셀에 스켈레톤 UI가 표시되어야 한다
  And 로딩 완료 후 실제 데이터로 교체되어야 한다
```

### Scenario S-006: KanbanBoard Pending 경고

```gherkin
Given option_choice_mes_mapping의 mappingStatus가 "pending"이다
When KanbanBoard가 렌더링된다
Then 해당 카드에 경고 아이콘이 표시되어야 한다
  And "매핑 필요" 라벨이 표시되어야 한다
```

---

## 10. Unwanted Behavior 인수 시나리오

### Scenario N-001: 하위 카테고리 삭제 차단

```gherkin
Given 하위 카테고리가 존재하는 카테고리가 있다
When 관리자가 해당 카테고리를 삭제하려고 한다
Then 삭제가 차단되어야 한다
  And "하위 카테고리를 먼저 이동하거나 삭제해 주세요" 메시지가 표시되어야 한다
```

### Scenario N-002: 참조 무결성 하드 삭제 차단

```gherkin
Given products 테이블에서 참조 중인 마스터 데이터(카테고리, 용지, 소재, 인쇄방식)가 있다
When 관리자가 해당 마스터 데이터를 삭제하려고 한다
Then 하드 삭제가 차단되어야 한다
  And isActive=false 소프트 삭제만 허용되어야 한다
  And "참조 중인 데이터가 있어 비활성화만 가능합니다" 메시지가 표시되어야 한다
```

### Scenario N-003: 음수 가격 입력 차단

```gherkin
Given SpreadsheetEditor에서 price_tiers를 편집 중이다
When 관리자가 unitPrice에 음수 값(-100)을 입력한다
Then 입력이 차단되거나 검증 에러가 표시되어야 한다
  And 음수 값이 저장되지 않아야 한다
```

### Scenario N-004: 순환 의존성 차단

```gherkin
Given option_constraints 편집기에서 규칙을 작성 중이다
When 관리자가 순환 의존성(A -> B -> A)을 생성하려고 한다
Then 저장 시 순환 참조 검증이 수행되어야 한다
  And "순환 의존성이 감지되었습니다" 에러가 표시되어야 한다
  And 순환 의존성이 포함된 제약조건은 저장되지 않아야 한다
```

### Scenario N-005: 미인증 tRPC 접근 차단

```gherkin
Given 사용자가 인증되지 않은 상태이다
When tRPC 라우터에 직접 API 호출을 시도한다
Then UNAUTHORIZED 에러가 반환되어야 한다
  And 어떤 데이터도 반환되지 않아야 한다
```

---

## 11. Complex Requirements 인수 시나리오

### Scenario C-001: ProductConfigurator 책자류 전용 옵션

```gherkin
Given 상품의 productType이 "binding"(책자류)이다
When 관리자가 /admin/products/[id]/options 페이지에 접근한다
Then ProductConfigurator가 책자 전용 옵션(제본, 페이지수, 내지/표지 용지)을 우선 표시해야 한다
  And bindings 테이블의 minPages/maxPages/pageStep 제약이 자동 반영되어야 한다
  And 옵션 선택/해제, displayOrder 드래그 재정렬이 가능해야 한다
  And isRequired/isVisible/isInternal 토글이 동작해야 한다
  And uiComponentOverride, defaultChoiceId 셀렉터가 동작해야 한다
```

### Scenario C-002: 원가-판가 병행 표시

```gherkin
Given price_tables의 priceType이 "selling"인 가격표를 편집 중이다
When 관리자가 SpreadsheetEditor에서 price_tiers를 편집한다
Then 동일 optionCode의 "cost" 타입 가격표 데이터가 참고 컬럼으로 병행 표시되어야 한다
  And 원가 대비 판가 마진이 시각적으로 확인 가능해야 한다
  And cost 데이터 컬럼은 읽기 전용이어야 한다
```

### Scenario C-003: KanbanBoard Verified 전환 검증

```gherkin
Given option_choice_mes_mapping의 mappingStatus가 "mapped"이다
When 관리자가 해당 카드를 "Verified" 컬럼으로 드래그한다
Then mesItemId의 유효성(mes_items 테이블 존재 여부)이 검증되어야 한다
  And mesCode의 유효성이 검증되어야 한다
  And 검증 통과 후 확인 다이얼로그가 표시되어야 한다
  And mappedBy에 현재 관리자 이름이 기록되어야 한다
  And mappedAt에 현재 시간이 기록되어야 한다
  And 검증 실패 시 상태 변경이 차단되고 에러 메시지가 표시되어야 한다
```

---

## 12. 성능 인수 기준

### Scenario PERF-001: 페이지 로딩 성능

```gherkin
Given 관리자가 Dashboard 페이지에 접근한다
When 페이지가 완전히 로딩된다
Then 총 로딩 시간이 2초 미만이어야 한다
  And Server Components 렌더링이 적용되어야 한다
```

### Scenario PERF-002: DataTable 렌더링 성능

```gherkin
Given DataTable에 100행 미만의 데이터가 있다
When 클라이언트 사이드 렌더링이 수행된다
Then 렌더링 시간이 500ms 미만이어야 한다

Given DataTable에 1,000행 이상의 데이터가 있다
When 서버 사이드 페이지네이션이 적용된다
Then 페이지 전환 시 렌더링 시간이 1초 미만이어야 한다
```

### Scenario PERF-003: SpreadsheetEditor 가상 스크롤

```gherkin
Given SpreadsheetEditor에 10,000개 셀 데이터가 있다
When 컴포넌트가 초기 렌더링된다
Then 렌더링 시간이 2초 미만이어야 한다
  And 스크롤 시 프레임 드롭이 발생하지 않아야 한다
```

### Scenario PERF-004: MatrixEditor 렌더링

```gherkin
Given MatrixEditor에 55x45(2,475셀) 데이터가 있다
When 컴포넌트가 렌더링된다
Then 렌더링 시간이 1초 미만이어야 한다
  And sticky header 스크롤이 부드러워야 한다
```

### Scenario PERF-005: tRPC API 응답 시간

```gherkin
Given tRPC API 엔드포인트가 동작 중이다
When list query가 호출된다
Then P95 응답 시간이 200ms 미만이어야 한다

When mutation이 호출된다
Then P95 응답 시간이 300ms 미만이어야 한다
```

### Scenario PERF-006: 폼 검증 성능

```gherkin
Given CRUD 폼에 데이터가 입력되어 있다
When 폼 검증이 수행된다
Then Zod 검증 시간이 50ms 미만이어야 한다
```

### Scenario PERF-007: 전역 검색 Debounce

```gherkin
Given DataTable에 전역 검색 기능이 활성화되어 있다
When 관리자가 검색어를 빠르게 타이핑한다
Then 마지막 입력 후 300ms 대기 후 검색이 실행되어야 한다
  And 중간 입력에 대해서는 API 호출이 발생하지 않아야 한다
```

---

## 13. Edge Case 인수 시나리오

### Scenario EDGE-001: 참조가 있는 소프트 삭제

```gherkin
Given 카테고리 A가 상품 10개에서 참조되고 있다
When 관리자가 카테고리 A를 삭제하려 한다
Then 하드 삭제가 차단되어야 한다
  And "10개 상품이 이 카테고리를 참조하고 있습니다" 정보가 표시되어야 한다
  And isActive=false 소프트 삭제 옵션이 제공되어야 한다
  And 소프트 삭제 실행 시 해당 카테고리의 isActive가 false로 변경되어야 한다
```

### Scenario EDGE-002: 대량 데이터 일괄 작업

```gherkin
Given SpreadsheetEditor에서 500개 셀을 선택하여 일괄 값 변경을 실행한다
When "저장" 버튼을 클릭한다
Then 500개 변경분이 batch upsert로 서버에 전송되어야 한다
  And 전송 중 로딩 인디케이터가 표시되어야 한다
  And 부분 실패 시 실패한 행 정보가 에러로 표시되어야 한다
  And 성공 시 모든 변경 하이라이트가 제거되어야 한다
```

### Scenario EDGE-003: 빈 데이터 상태

```gherkin
Given 테이블에 데이터가 0건이다
When 관리자가 목록 페이지에 접근한다
Then 빈 상태(empty state) 일러스트레이션이 표시되어야 한다
  And "데이터 없음" 메시지와 함께 생성 버튼이 제공되어야 한다
```

### Scenario EDGE-004: 네트워크 오류 처리

```gherkin
Given 네트워크 연결이 불안정하다
When tRPC API 호출이 실패한다
Then 에러 토스트 알림이 표시되어야 한다
  And "재시도" 옵션이 제공되어야 한다
  And 이전 데이터(캐시)가 유지되어야 한다
```

### Scenario EDGE-005: 동시 편집 시나리오

```gherkin
Given 두 명의 관리자가 동일 레코드를 편집 중이다
When 첫 번째 관리자가 저장한 후 두 번째 관리자가 저장을 시도한다
Then 두 번째 관리자의 저장이 최신 데이터를 덮어쓰되 (last-write-wins)
  And 저장 성공 토스트가 표시되어야 한다
```

### Scenario EDGE-006: TreeEditor depth 제한

```gherkin
Given 카테고리 트리에서 depth=2 노드가 존재한다
When 관리자가 depth=2 노드 아래에 자식 노드를 추가하려 한다
Then depth 제한(최대 2)으로 인해 추가가 차단되어야 한다
  And "최대 깊이(2)에 도달했습니다" 메시지가 표시되어야 한다
```

---

## 14. Quality Gate (TRUST 5 준수)

### Scenario TRUST-Tested: 테스트 커버리지

```gherkin
Given SPEC-WIDGET-ADMIN-001 구현이 완료되었다
When 테스트 스위트가 실행된다
Then tRPC 라우터 통합 테스트 커버리지가 85% 이상이어야 한다
  And 특수 컴포넌트(7개) 단위 테스트가 존재해야 한다
  And 순환 의존성 검증 알고리즘 테스트가 존재해야 한다
  And DataTable 범용 컴포넌트 테스트가 존재해야 한다
```

### Scenario TRUST-Readable: 코드 가독성

```gherkin
Given 구현 코드가 작성되었다
When 코드 리뷰가 수행된다
Then ESLint v9 (Flat Config) 경고가 0건이어야 한다
  And Prettier 포맷팅이 적용되어야 한다
  And 컴포넌트/함수명이 명확한 영어로 작성되어야 한다
  And tRPC 라우터 명명이 일관된 패턴을 따라야 한다
```

### Scenario TRUST-Unified: 코드 일관성

```gherkin
Given 26개 tRPC 라우터가 구현되었다
When 라우터 코드 패턴을 검사한다
Then 모든 라우터가 일관된 CRUD 패턴을 따라야 한다
  And 모든 페이지가 일관된 레이아웃 패턴을 따라야 한다
  And shadcn/ui 컴포넌트 사용이 일관되어야 한다
  And 후니프린팅 디자인 토큰이 전체 페이지에 일관 적용되어야 한다
```

### Scenario TRUST-Secured: 보안

```gherkin
Given Admin Dashboard가 배포되었다
When 보안 검사가 수행된다
Then 모든 tRPC 라우터에 protectedProcedure가 적용되어야 한다
  And 미인증 접근 시 UNAUTHORIZED 에러가 반환되어야 한다
  And SQL Injection이 Drizzle ORM 파라미터 바인딩으로 차단되어야 한다
  And XSS가 React 기본 이스케이핑으로 방지되어야 한다
  And 모든 API 입력이 Zod 스키마로 검증되어야 한다
```

### Scenario TRUST-Trackable: 추적 가능성

```gherkin
Given 구현 커밋이 생성된다
When 커밋 히스토리를 검사한다
Then Conventional Commits 형식(feat/fix/refactor)을 따라야 한다
  And 커밋 메시지에 관련 REQ 번호가 참조되어야 한다
  And Phase별 구현이 논리적 커밋 단위로 분리되어야 한다
```

---

## 15. Optional Requirements 인수 시나리오

### Scenario O-001: CSV/Excel 내보내기 (선택)

```gherkin
Given 상품 목록 페이지에 데이터가 존재한다
When 관리자가 "내보내기" 버튼을 클릭한다
Then CSV 또는 Excel 형식으로 데이터가 다운로드되어야 한다
  And 현재 필터 조건이 반영된 데이터가 내보내져야 한다
```

### Scenario O-002: CSV 가격 데이터 가져오기 (선택)

```gherkin
Given SpreadsheetEditor에서 가격 데이터를 편집 중이다
When 관리자가 CSV 파일을 업로드한다
Then CSV 데이터가 파싱되어 price_tiers에 일괄 업로드되어야 한다
  And 데이터 형식 오류 시 에러 리포트가 표시되어야 한다
```

### Scenario O-003: 의존성 그래프 시각화 (선택)

```gherkin
Given 옵션 의존성 데이터가 존재한다
When 관리자가 그래프 뷰를 선택한다
Then 노드-엣지 다이어그램으로 의존성 관계가 시각화되어야 한다
  And 노드 클릭 시 상세 정보가 표시되어야 한다
```

### Scenario O-004: 감사 로그 (선택)

```gherkin
Given 관리자가 데이터를 변경한다
When 변경 작업이 완료된다
Then audit_log 테이블에 "누가, 언제, 무엇을" 변경했는지 기록되어야 한다
  And 변경 이력을 조회할 수 있어야 한다
```

### Scenario O-005: 데이터 정합성 검사 (선택)

```gherkin
Given 대시보드 페이지에 정합성 검사 패널이 활성화되어 있다
When 관리자가 정합성 검사를 실행한다
Then MES 미매핑 상품 수가 표시되어야 한다
  And 가격 미설정 옵션 수가 표시되어야 한다
  And 순환 의존성 존재 여부가 표시되어야 한다
  And 각 항목 클릭 시 해당 관리 페이지로 이동 가능해야 한다
```

---

## 16. Definition of Done

SPEC-WIDGET-ADMIN-001은 다음 조건이 모두 충족될 때 완료(Done)로 간주한다:

1. **기능 완성**: REQ-U-001~008, REQ-E-101~704, REQ-S-001~006, REQ-N-001~005, REQ-C-001~003의 모든 필수(HARD) 요구사항이 구현되었다
2. **페이지 완성**: 30+ 관리 페이지가 모두 접근 가능하고 CRUD 작업이 동작한다
3. **컴포넌트 완성**: 7개 특수 UI 컴포넌트(DataTable, TreeEditor, MatrixEditor, SpreadsheetEditor, ConstraintBuilder, KanbanBoard, ProductConfigurator)가 모두 구현되었다
4. **tRPC 라우터 완성**: 26개 도메인별 tRPC 라우터가 모두 구현되었다
5. **성능 기준 충족**: PERF-001~007의 모든 성능 기준이 충족되었다
6. **TRUST 5 준수**: 테스트 85%+, ESLint 0 warnings, Conventional Commits, 보안 검증 통과
7. **TypeScript 컴파일**: `tsc --noEmit` 오류 0건
8. **빌드 성공**: `pnpm build` (Turborepo) 정상 완료
