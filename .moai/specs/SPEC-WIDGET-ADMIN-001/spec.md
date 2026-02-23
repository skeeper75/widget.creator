---
id: SPEC-WIDGET-ADMIN-001
title: Widget Builder Admin Dashboard
version: 1.0.0
status: draft
created: 2026-02-22
updated: 2026-02-22
author: MoAI
priority: P0
tags: admin, dashboard, crud, shadcn-ui, tanstack-table, drizzle-zod, trpc
related_specs: [SPEC-INFRA-001, SPEC-DATA-002, SPEC-WIDGET-API-001]
---

# SPEC-WIDGET-ADMIN-001: Widget Builder Admin Dashboard

## 1. Environment

### 1.1 System Context

Widget Builder Admin Dashboard는 후니프린팅 운영팀이 인쇄 상품, 소재, 공정, 가격, 옵션, MES 연동 데이터를 관리하는 풀스택 관리자 웹 애플리케이션이다. `apps/admin/` 디렉토리에 Next.js 16 App Router 기반으로 구현하며, `packages/shared/src/db/schema/`에 정의된 26개 Drizzle ORM 테이블에 대한 완전한 CRUD 기능을 6개 도메인으로 조직화하여 제공한다.

### 1.2 Technology Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | Next.js | 16.x | App Router, Server Components, Server Actions |
| UI Library | React | 19.x | Client Components, Concurrent Features |
| Component System | shadcn/ui | latest | Radix UI primitives + Tailwind CSS v4 |
| Data Grid | TanStack Table | v8 | Headless data grid (sort, filter, paginate) |
| Form Validation | React Hook Form + drizzle-zod | latest | Schema-driven form validation |
| API Layer | tRPC | v11 | Type-safe admin API calls |
| State Management | TanStack Query | v5 | Server state caching, mutation |
| Styling | Tailwind CSS | v4 | Utility-first CSS |
| Icons | Lucide React | latest | Icon library |
| ORM | Drizzle ORM | latest | Type-safe database access |
| Database | PostgreSQL | 16.x | Primary data store |

### 1.3 Design Tokens (Figma Design System)

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#5538B6` | Main actions, active states, navigation highlights |
| Secondary | `#4B3F96` | Hover states, secondary actions |
| Accent | `#F0831E` | Warning indicators, attention callouts |
| Font Family | Noto Sans | All text |
| Base Font Size | 14px / 400 weight | Body text |
| Spacing Grid | 4px | All spacing multiples |
| Border Radius | 3px / 4px / 5px / 20px | Small / Default / Medium / Pill |

### 1.4 Database Schema (26 Tables by 6 Domains)

**Domain 1 - Product Catalog (3 tables):**
- `categories` (~30 rows): id, code, name, parentId, depth (0-2), displayOrder, iconUrl, isActive
- `products` (~221 rows): id, categoryId, huniCode, edicusCode, shopbyId, name, slug, productType, pricingModel, sheetStandard, figmaSection, orderMethod, editorEnabled, description, isActive, mesRegistered
- `product_sizes` (~500 rows): id, productId, code, displayName, cutWidth, cutHeight, workWidth, workHeight, bleed, impositionCount, sheetStandard, displayOrder, isCustom, customMinW/H, customMaxW/H, isActive

**Domain 2 - Materials (3 tables):**
- `papers` (~55 rows): id, code, name, abbreviation, weight, sheetSize, costPerRear, sellingPerRear, costPer4Cut, sellingPer4Cut, displayOrder, isActive
- `materials` (~30 rows): id, code, name, materialType, thickness, description, isActive
- `paper_product_mapping` (~1,500 rows): id, paperId, productId, coverType, isDefault, isActive

**Domain 3 - Processes (4 tables):**
- `print_modes` (~12 rows): id, code, name, sides, colorType, priceCode, displayOrder, isActive
- `post_processes` (~40 rows): id, groupCode, code, name, processType, subOptionCode, subOptionName, priceBasis, sheetStandard, displayOrder, isActive
- `bindings` (~4 rows): id, code, name, minPages, maxPages, pageStep, displayOrder, isActive
- `imposition_rules` (~30 rows): id, cutSizeCode, cutWidth, cutHeight, workWidth, workHeight, impositionCount, sheetStandard, description, isActive

**Domain 4 - Pricing (6 tables):**
- `price_tables` (~20 rows): id, code, name, priceType, quantityBasis, sheetStandard, description, isActive
- `price_tiers` (~10,000 rows): id, priceTableId, optionCode, minQty, maxQty, unitPrice, isActive
- `fixed_prices` (~300 rows): id, productId, sizeId, paperId, materialId, printModeId, optionLabel, baseQty, sellingPrice, costPrice, vatIncluded, isActive
- `package_prices` (~200 rows): id, productId, sizeId, printModeId, pageCount, minQty, maxQty, sellingPrice, costPrice, isActive
- `foil_prices` (~150 rows): id, foilType, foilColor, plateMaterial, targetProductType, width, height, sellingPrice, costPrice, displayOrder, isActive
- `loss_quantity_config` (~5 rows): id, scopeType, scopeId, lossRate, minLossQty, description, isActive

**Domain 5 - Options & UI (5 tables):**
- `option_definitions` (~30 rows): id, key, name, optionClass, optionType, uiComponent, description, displayOrder, isActive
- `product_options` (~2,000 rows): id, productId, optionDefinitionId, displayOrder, isRequired, isVisible, isInternal, uiComponentOverride, defaultChoiceId, isActive
- `option_choices` (~1,198 rows): id, optionDefinitionId, code, name, priceKey, refPaperId, refMaterialId, refPrintModeId, refPostProcessId, refBindingId, displayOrder, isActive
- `option_constraints` (~129 rows): id, productId, constraintType, sourceOptionId, sourceField, operator, value, valueMin, valueMax, targetOptionId, targetField, targetAction, targetValue, description, priority, isActive
- `option_dependencies` (~300 rows): id, productId, parentOptionId, parentChoiceId, childOptionId, dependencyType, isActive

**Domain 6 - Integration (5 tables):**
- `mes_items` (~260 rows): id, itemCode, groupCode, name, abbreviation, itemType, unit, isActive
- `mes_item_options` (~800 rows): id, mesItemId, optionNumber, optionValue, isActive
- `product_mes_mapping` (~250 rows): id, productId, mesItemId, coverType, isActive
- `product_editor_mapping` (~111 rows): id, productId, editorType, templateId, templateConfig (JSONB), isActive
- `option_choice_mes_mapping` (~1,198 rows): id, optionChoiceId, mesItemId, mesCode, mappingType, mappingStatus (pending/mapped/verified), mappedBy, mappedAt, notes, isActive

---

## 2. Assumptions

- A-01: 사용자(관리자)는 NextAuth.js v5 기반 세션 인증이 완료된 상태에서 Admin Dashboard에 접근한다.
- A-02: 모든 DB 테이블은 Drizzle ORM 스키마(`packages/shared/src/db/schema/`)에 정의되어 있으며, 마이그레이션이 완료된 상태이다 (SPEC-INFRA-001).
- A-03: tRPC 서버는 `apps/admin/` 내부 또는 `apps/api/`에 구현되며, Drizzle ORM을 통해 PostgreSQL에 직접 접근한다.
- A-04: shadcn/ui 컴포넌트는 `packages/ui/` 또는 `apps/admin/src/components/ui/`에 설치되어 있다.
- A-05: 동시 접속 관리자 수는 최대 10명 이내이므로, 낙관적 동시성 제어(optimistic locking)는 초기 구현 범위에서 제외한다.
- A-06: TanStack Table v8은 headless 모드로 사용하며, 렌더링은 shadcn/ui 컴포넌트로 구현한다.
- A-07: price_tiers 테이블(~10,000행)은 가상화 스크롤(virtualization)을 적용하여 성능을 보장한다.
- A-08: 모든 폼 검증은 drizzle-zod로 Drizzle 스키마에서 자동 생성된 Zod 스키마를 기반으로 한다.

---

## 3. Requirements

### 3.1 Ubiquitous Requirements (항상 활성)

- **REQ-U-001**: 시스템은 **항상** 모든 데이터 목록 페이지에서 TanStack Table v8 기반 DataTable 컴포넌트를 사용하여 정렬(sort), 필터(filter), 페이지네이션(pagination), 컬럼 가시성(column visibility) 기능을 제공해야 한다.

- **REQ-U-002**: 시스템은 **항상** 모든 CRUD 폼에서 drizzle-zod로 생성된 Zod 스키마를 React Hook Form의 resolver로 사용하여 클라이언트 사이드 검증을 수행해야 한다.

- **REQ-U-003**: 시스템은 **항상** tRPC를 통해 type-safe API 호출을 수행하며, TanStack Query의 mutation/query 패턴으로 서버 상태를 관리해야 한다.

- **REQ-U-004**: 시스템은 **항상** 후니프린팅 디자인 토큰(Primary: #5538B6, Font: Noto Sans, Spacing: 4px grid)을 shadcn/ui 테마 변수로 적용해야 한다.

- **REQ-U-005**: 시스템은 **항상** 데이터 변경 작업(생성/수정/삭제) 시 성공/실패 토스트 알림을 표시해야 한다.

- **REQ-U-006**: 시스템은 **항상** 삭제 작업 전 확인 다이얼로그를 표시해야 한다. 단, 소프트 삭제(isActive 토글)와 하드 삭제를 구분하여 위험도에 따라 UI를 차등 제공해야 한다.

- **REQ-U-007**: 시스템은 **항상** 모든 목록 페이지에서 isActive 필터 토글을 제공하여 활성/비활성/전체 데이터를 선택적으로 조회할 수 있도록 해야 한다.

- **REQ-U-008**: 시스템은 **항상** 반응형 사이드바 네비게이션을 제공하며, 6개 도메인을 아이콘과 함께 그룹화하여 표시해야 한다.

### 3.2 Event-Driven Requirements (이벤트 기반)

#### Domain 1: Product Catalog

- **REQ-E-101**: **WHEN** 관리자가 카테고리 목록 페이지(`/admin/products/categories`)에 접근 **THEN** 시스템은 TreeEditor 컴포넌트로 카테고리 계층 구조(depth 0-2)를 트리 형태로 표시하고, 드래그 앤 드롭으로 순서 변경 및 부모-자식 관계 재배치가 가능해야 한다.

- **REQ-E-102**: **WHEN** 관리자가 카테고리 트리에서 노드를 드래그하여 다른 위치에 드롭 **THEN** 시스템은 해당 카테고리의 parentId, depth, displayOrder를 일괄 업데이트하고, 영향받는 하위 카테고리의 depth도 재귀적으로 갱신해야 한다.

- **REQ-E-103**: **WHEN** 관리자가 상품 목록 페이지(`/admin/products/list`)에 접근 **THEN** 시스템은 다음 컬럼을 포함하는 DataTable을 표시해야 한다:

  | Column | Field | Type | Features |
  |--------|-------|------|----------|
  | ID | id | number | sortable |
  | Huni Code | huniCode | string | sortable, filterable |
  | Name | name | string | sortable, filterable, searchable |
  | Category | category.name | relation | filterable (select) |
  | Product Type | productType | enum | filterable (select) |
  | Pricing Model | pricingModel | enum | filterable (select) |
  | Order Method | orderMethod | enum | badge |
  | Editor | editorEnabled | boolean | toggle icon |
  | MES | mesRegistered | boolean | toggle icon |
  | Active | isActive | boolean | toggle |
  | Actions | - | - | Edit, View Sizes, View Options, Delete |

- **REQ-E-104**: **WHEN** 관리자가 상품 생성/수정 폼을 제출 **THEN** 시스템은 다음 필드를 포함하는 폼을 처리해야 한다:
  - categoryId: 카테고리 트리 셀렉터
  - huniCode: 텍스트 (unique, 최대 10자)
  - edicusCode: 텍스트 (optional, 최대 15자)
  - shopbyId: 숫자 (optional)
  - name: 텍스트 (필수, 최대 200자)
  - slug: 텍스트 (auto-generated from name, editable)
  - productType: 셀렉트 (digital_print, offset_print, large_format, cutting, binding, specialty)
  - pricingModel: 셀렉트 (tiered, fixed, package, size_dependent)
  - sheetStandard: 셀렉트 (A3, T3, A4, null)
  - figmaSection: 텍스트 (optional)
  - orderMethod: 셀렉트 (upload, editor, delivery)
  - editorEnabled: 체크박스
  - description: 텍스트에어리어
  - isActive: 토글 스위치

- **REQ-E-105**: **WHEN** 관리자가 상품 상세 페이지(`/admin/products/[id]`)에서 "사이즈 관리" 탭을 클릭 **THEN** 시스템은 해당 상품에 연결된 product_sizes 목록을 인라인 편집 가능한 DataTable로 표시해야 한다. 커스텀 사이즈(isCustom=true) 행은 최소/최대 너비/높이 범위 입력 필드를 추가로 표시해야 한다.

#### Domain 2: Materials

- **REQ-E-201**: **WHEN** 관리자가 용지 목록 페이지(`/admin/materials/papers`)에 접근 **THEN** 시스템은 다음 컬럼을 포함하는 DataTable을 표시해야 한다:

  | Column | Field | Type | Features |
  |--------|-------|------|----------|
  | ID | id | number | sortable |
  | Code | code | string | sortable, filterable |
  | Name | name | string | sortable, filterable |
  | Abbreviation | abbreviation | string | - |
  | Weight | weight | number | sortable, filterable (range) |
  | Sheet Size | sheetSize | string | filterable |
  | Cost/Rear | costPerRear | currency | sortable, editable inline |
  | Sell/Rear | sellingPerRear | currency | sortable, editable inline |
  | Cost/4Cut | costPer4Cut | currency | editable inline |
  | Sell/4Cut | sellingPer4Cut | currency | editable inline |
  | Order | displayOrder | number | drag-reorder |
  | Active | isActive | boolean | toggle |

- **REQ-E-202**: **WHEN** 관리자가 소재 관리 페이지(`/admin/materials/materials`)에 접근 **THEN** 시스템은 materials 테이블의 CRUD DataTable을 표시해야 한다. materialType 필드는 셀렉트 필터로 제공되어야 한다.

- **REQ-E-203**: **WHEN** 관리자가 용지-상품 매핑 페이지(`/admin/materials/mappings`)에 접근 **THEN** 시스템은 MatrixEditor 컴포넌트를 표시해야 한다:
  - 행(Y축): papers 목록 (~55행)
  - 열(X축): products 목록 (~45열, 상위 카테고리별 그룹)
  - 셀: paper_product_mapping 존재 여부를 토글 아이콘(filled/empty circle)으로 표시
  - 셀 클릭 시: 매핑 레코드 생성(INSERT) 또는 isActive 토글
  - 필터: coverType(내지/표지) 전환 필터
  - 스크롤: 고정 행/열 헤더 + 가로/세로 스크롤

#### Domain 3: Processes

- **REQ-E-301**: **WHEN** 관리자가 인쇄방식 목록 페이지(`/admin/processes/print-modes`)에 접근 **THEN** 시스템은 print_modes 테이블의 CRUD DataTable을 표시해야 한다. sides(단면/양면) 및 colorType(흑백/컬러/별색) 필드는 셀렉트 필터로 제공되어야 한다.

- **REQ-E-302**: **WHEN** 관리자가 후가공 관리 페이지(`/admin/processes/post-processes`)에 접근 **THEN** 시스템은 post_processes 테이블 데이터를 groupCode 기준으로 8개 그룹(박, 형압, 코팅, 접지, 타공, 오시, 미싱, 포장)을 아코디언 또는 탭 UI로 구분하여 표시해야 한다.

- **REQ-E-303**: **WHEN** 관리자가 제본 관리 페이지(`/admin/processes/bindings`)에 접근 **THEN** 시스템은 bindings 테이블의 CRUD DataTable을 표시하되, minPages/maxPages/pageStep 필드의 유효성 검증(minPages < maxPages, pageStep > 0)을 폼 수준에서 수행해야 한다.

- **REQ-E-304**: **WHEN** 관리자가 면부 규칙 페이지(`/admin/processes/imposition`)에 접근 **THEN** 시스템은 imposition_rules 테이블의 DataTable을 표시하되, cutWidth x cutHeight 조합이 sheetStandard 내에서 유일한지 실시간 검증해야 한다.

#### Domain 4: Pricing

- **REQ-E-401**: **WHEN** 관리자가 가격표 메타 관리 페이지(`/admin/pricing/tables`)에 접근 **THEN** 시스템은 price_tables 테이블의 CRUD DataTable을 표시해야 한다. priceType(selling/cost) 및 sheetStandard 필드는 셀렉트 필터로 제공되어야 한다.

- **REQ-E-402**: **WHEN** 관리자가 특정 price_table의 "단가 편집" 버튼을 클릭 **THEN** 시스템은 SpreadsheetEditor 컴포넌트로 해당 price_table에 속한 price_tiers 데이터를 표시해야 한다:
  - 행(Y축): optionCode별 그룹
  - 열(X축): 수량 구간(minQty-maxQty)
  - 셀: unitPrice (인라인 편집, 숫자 입력)
  - 기능: 행 추가/삭제, 열(수량 구간) 추가/삭제
  - 대량 편집: 선택 영역 일괄 값 적용, 비율 조정(+10%, -5%)
  - 가상화: ~10,000행 데이터를 가상 스크롤로 렌더링 (react-window 또는 TanStack Virtual)
  - 저장: 변경분만 일괄 업데이트(batch upsert)

- **REQ-E-403**: **WHEN** 관리자가 고정가격 관리 페이지(`/admin/pricing/fixed`)에 접근 **THEN** 시스템은 fixed_prices 테이블의 DataTable을 표시하되, productId/sizeId/paperId/printModeId 필드는 관계 테이블에서 name을 표시하는 셀렉트 필터로 제공되어야 한다.

- **REQ-E-404**: **WHEN** 관리자가 패키지 가격 관리 페이지(`/admin/pricing/packages`)에 접근 **THEN** 시스템은 package_prices 테이블의 DataTable을 표시하되, product/size/printMode 관계를 셀렉트 필터로 제공하고, pageCount 및 수량 구간 필드는 인라인 편집을 지원해야 한다.

- **REQ-E-405**: **WHEN** 관리자가 박/형압 가격 관리 페이지(`/admin/pricing/foil`)에 접근 **THEN** 시스템은 foil_prices 테이블의 DataTable을 표시하되, foilType 및 targetProductType 필드는 셀렉트 필터로 제공되어야 한다. width x height 조합을 시각적으로 구분하여 표시해야 한다.

- **REQ-E-406**: **WHEN** 관리자가 손실수량 설정 페이지(`/admin/pricing/loss`)에 접근 **THEN** 시스템은 loss_quantity_config 테이블(~5행)의 전체 레코드를 카드 형태로 표시하고, scopeType(global/category/product)별로 lossRate와 minLossQty를 인라인 편집할 수 있어야 한다.

#### Domain 5: Options & UI

- **REQ-E-501**: **WHEN** 관리자가 옵션 정의 목록 페이지(`/admin/options/definitions`)에 접근 **THEN** 시스템은 option_definitions 테이블의 CRUD DataTable을 표시해야 한다:

  | Column | Field | Type | Features |
  |--------|-------|------|----------|
  | ID | id | number | sortable |
  | Key | key | string | sortable, unique, filterable |
  | Name | name | string | sortable, filterable |
  | Class | optionClass | enum | filterable (select): basic, paper, print, binding, postprocess |
  | Type | optionType | enum | filterable (select): select, range, toggle, text |
  | UI Component | uiComponent | enum | badge: dropdown, radio, checkbox, slider, input |
  | Description | description | string | truncated, tooltip |
  | Order | displayOrder | number | drag-reorder |
  | Active | isActive | boolean | toggle |

- **REQ-E-502**: **WHEN** 관리자가 옵션 선택지 관리 페이지(`/admin/options/choices`)에 접근 **THEN** 시스템은 option_choices 테이블의 DataTable을 표시하되:
  - optionDefinitionId 기준 그룹 필터 또는 중첩 테이블로 구성
  - ref_*_id 필드(refPaperId, refMaterialId, refPrintModeId, refPostProcessId, refBindingId)는 참조 테이블의 name을 표시하는 read-only 링크로 제공
  - priceKey 필드는 price_tiers.optionCode와의 연결을 시각적으로 표시

- **REQ-E-503**: **WHEN** 관리자가 옵션 제약조건 관리 페이지(`/admin/options/constraints`)에 접근 **THEN** 시스템은 ConstraintBuilder(비주얼 제약조건 편집기) 컴포넌트를 표시해야 한다:
  - 좌측 패널: productId 셀렉터로 상품 선택
  - 메인 영역: 선택된 상품의 option_constraints를 조건-액션 플로우 카드로 표시
  - 조건 카드(IF): sourceOptionId/sourceField + operator + value/valueMin/valueMax
  - 액션 카드(THEN): targetOptionId/targetField + targetAction + targetValue
  - 신규 제약 추가: 드래그 또는 "+" 버튼으로 조건-액션 쌍 생성
  - constraintType 필터: visibility, value_restriction, choice_filter, auto_set
  - priority 기반 실행 순서 표시

- **REQ-E-504**: **WHEN** 관리자가 옵션 의존성 편집 페이지(`/admin/options/dependencies`)에 접근 **THEN** 시스템은 option_dependencies 테이블 데이터를 부모-자식 의존성 그래프 형태로 표시해야 한다:
  - productId 기준 필터
  - parentOptionId -> childOptionId 관계를 연결선으로 시각화
  - parentChoiceId가 지정된 경우 특정 선택지에서만 활성화됨을 표시
  - dependencyType(visibility, value_filter, auto_select) 구분
  - 테이블 뷰와 그래프 뷰 전환 가능

#### Domain 6: Integration

- **REQ-E-601**: **WHEN** 관리자가 MES 아이템 브라우저 페이지(`/admin/integration/mes`)에 접근 **THEN** 시스템은 mes_items 테이블의 DataTable을 표시하되:
  - groupCode 기준 그룹 필터
  - itemType 기준 필터
  - 행 확장(expand row) 시 해당 MES 아이템의 mes_item_options(최대 10개 옵션) 목록을 하위 테이블로 표시
  - MES 데이터는 읽기 전용(Read-Only)이며 편집은 불가. 동기화 버튼으로 외부 MES에서 데이터 재가져오기를 트리거할 수 있어야 한다.

- **REQ-E-602**: **WHEN** 관리자가 상품-MES 매핑 페이지(`/admin/integration/mes-mapping`)에 접근 **THEN** 시스템은 Visual Mapper 컴포넌트를 표시해야 한다:
  - 좌측: products 목록 (카테고리별 그룹, 검색 가능)
  - 우측: mes_items 목록 (groupCode별 그룹, 검색 가능)
  - 중앙: product_mes_mapping의 연결선 표시
  - 드래그 또는 셀렉터로 새 매핑 생성
  - coverType(내지/표지) 구분 표시
  - 매핑되지 않은 상품은 경고 아이콘으로 표시

- **REQ-E-603**: **WHEN** 관리자가 에디터 매핑 페이지(`/admin/integration/editors`)에 접근 **THEN** 시스템은 product_editor_mapping 테이블의 DataTable을 표시하되:
  - productId는 상품명으로 표시 (관계 조인)
  - editorType(edicus 등) 셀렉트 필터
  - templateConfig(JSONB)는 JSON 에디터 또는 구조화된 폼으로 편집
  - 매핑되지 않은 상품 목록을 "미매핑" 필터로 제공

- **REQ-E-604**: **WHEN** 관리자가 MES 옵션 매핑 페이지(`/admin/integration/mes-options`)에 접근 **THEN** 시스템은 KanbanBoard 컴포넌트를 표시해야 한다:
  - 3개 컬럼: Pending -> Mapped -> Verified
  - 카드: option_choice_mes_mapping 레코드 (optionChoice.name, mesCode 표시)
  - 드래그로 mappingStatus 변경
  - Mapped 상태 전환 시: mesItemId 및 mesCode 입력 다이얼로그
  - Verified 상태 전환 시: 확인 다이얼로그
  - 필터: mappingType 기준
  - 카드에 mappedBy, mappedAt 정보 표시

#### Widget & Settings

- **REQ-E-701**: **WHEN** 관리자가 위젯 관리 페이지(`/admin/widgets/list`)에 접근 **THEN** 시스템은 Widget 엔티티의 CRUD DataTable을 표시하고, 위젯별 상태(ACTIVE/INACTIVE/DRAFT) 배지, API 키 복사 버튼, 임베드 코드 생성 버튼을 제공해야 한다.

- **REQ-E-702**: **WHEN** 관리자가 위젯 상세 설정 페이지(`/admin/widgets/[id]`)에 접근 **THEN** 시스템은 위젯 기본 정보(이름, shopUrl, 테마 설정), 상품 카테고리 선택, 가격 규칙 연결을 탭 기반 편집기로 제공해야 한다.

- **REQ-E-703**: **WHEN** 관리자가 위젯 미리보기 페이지(`/admin/widgets/preview`)에 접근 **THEN** 시스템은 iframe 내에서 실제 위젯 렌더링을 표시하고, 설정 변경 시 실시간으로 미리보기를 업데이트해야 한다.

- **REQ-E-704**: **WHEN** 관리자가 대시보드 페이지(`/admin/dashboard`)에 접근 **THEN** 시스템은 다음 통계를 카드 형태로 표시해야 한다:
  - 총 상품 수 / 활성 상품 수
  - 총 위젯 수 / 활성 위젯 수
  - MES 매핑 완료율 (mapped+verified / total)
  - 옵션 제약조건 수
  - 최근 변경 활동 로그 (최근 10건)

### 3.3 State-Driven Requirements (상태 기반)

- **REQ-S-001**: **IF** 사용자가 인증되지 않은 상태 **THEN** 시스템은 모든 `/admin/*` 경로 접근을 `/auth/login`으로 리다이렉트해야 한다.

- **REQ-S-002**: **IF** DataTable의 데이터 건수가 50건을 초과하는 상태 **THEN** 시스템은 서버 사이드 페이지네이션을 적용하고, 페이지당 기본 20건, 선택 가능(10/20/50/100)으로 제공해야 한다.

- **REQ-S-003**: **IF** price_tiers 편집기에서 변경되지 않은 데이터가 1,000행 이상인 상태 **THEN** 시스템은 가상 스크롤(virtual scroll)을 적용하여 DOM 노드를 최소화해야 한다.

- **REQ-S-004**: **IF** 폼에 수정되지 않은 변경사항이 있는 상태에서 사용자가 페이지를 떠나려 **THEN** 시스템은 "저장되지 않은 변경사항이 있습니다" 경고 다이얼로그를 표시해야 한다.

- **REQ-S-005**: **IF** MatrixEditor에서 표시할 매핑 데이터가 로딩 중인 상태 **THEN** 시스템은 매트릭스 셀에 스켈레톤 UI를 표시해야 한다.

- **REQ-S-006**: **IF** option_choice_mes_mapping의 mappingStatus가 "pending"인 상태 **THEN** KanbanBoard의 해당 카드에 경고 아이콘과 "매핑 필요" 라벨을 표시해야 한다.

### 3.4 Unwanted Behavior Requirements (금지 행위)

- **REQ-N-001**: 시스템은 하위 카테고리가 존재하는 카테고리를 삭제**하지 않아야 한다**. 하위 카테고리가 있는 경우 "하위 카테고리를 먼저 이동하거나 삭제해 주세요" 메시지를 표시해야 한다.

- **REQ-N-002**: 시스템은 products 테이블에서 참조 중인 카테고리, 용지, 소재, 인쇄방식 등의 마스터 데이터를 하드 삭제**하지 않아야 한다**. 참조 무결성이 있는 레코드는 isActive=false 소프트 삭제만 허용해야 한다.

- **REQ-N-003**: 시스템은 price_tiers 스프레드시트 편집기에서 unitPrice에 음수 값을 입력 가능하게 **하지 않아야 한다**.

- **REQ-N-004**: 시스템은 option_constraints 편집기에서 순환 의존성(A -> B -> A)을 생성 가능하게 **하지 않아야 한다**. 제약조건 저장 시 순환 참조 검증을 수행해야 한다.

- **REQ-N-005**: 시스템은 인증되지 않은 사용자가 tRPC 라우터에 직접 접근하는 것을 허용**하지 않아야 한다**.

### 3.5 Optional Requirements (선택 기능)

- **REQ-O-001**: **가능하면** 상품 목록 페이지에서 CSV/Excel 내보내기(export) 기능을 제공한다.

- **REQ-O-002**: **가능하면** price_tiers 스프레드시트 편집기에서 CSV 파일 가져오기(import) 기능을 제공하여 대량 가격 데이터를 일괄 업로드할 수 있도록 한다.

- **REQ-O-003**: **가능하면** 옵션 의존성 페이지에서 의존성 관계를 시각적 그래프(노드-엣지 다이어그램)로 표시하여 복잡한 의존성 구조를 직관적으로 파악할 수 있도록 한다.

- **REQ-O-004**: **가능하면** 관리자의 데이터 변경 이력을 audit_log 테이블에 기록하여 "누가 언제 무엇을 변경했는지" 추적 가능하도록 한다.

- **REQ-O-005**: **가능하면** 대시보드 페이지에 데이터 정합성 검사 패널을 제공한다 (예: MES 미매핑 상품 수, 가격 미설정 옵션 수, 순환 의존성 존재 여부).

### 3.6 Complex Requirements (복합 조건)

- **REQ-C-001**: **IF** 상품의 productType이 "binding" (책자류) **AND WHEN** 관리자가 해당 상품의 옵션 설정 페이지(`/admin/products/[id]/options`)에 접근 **THEN** 시스템은 ProductConfigurator 컴포넌트로 제본, 페이지수, 내지/표지 용지 등 책자 전용 옵션을 우선 표시하고, bindings 테이블의 minPages/maxPages/pageStep 제약을 자동 반영한 옵션 선택지를 구성해야 한다.

- **REQ-C-002**: **IF** price_tables의 priceType이 "selling" **AND WHEN** 관리자가 해당 가격표의 price_tiers를 편집 **THEN** 시스템은 동일 optionCode의 "cost" 타입 가격표 데이터를 참고 컬럼으로 병행 표시하여, 원가 대비 판가 마진을 시각적으로 확인할 수 있도록 해야 한다.

- **REQ-C-003**: **IF** option_choice_mes_mapping의 mappingStatus가 "mapped" **AND WHEN** 관리자가 해당 카드를 "Verified" 컬럼으로 드래그 **THEN** 시스템은 mesItemId와 mesCode의 유효성(mes_items 테이블 존재 여부)을 검증한 후 상태를 변경하고, mappedBy에 현재 관리자 이름, mappedAt에 현재 시간을 기록해야 한다.

---

## 4. Specifications

### 4.1 Admin Routing Structure

```
/admin
  /dashboard                          # REQ-E-704: Overview stats
  /products
    /categories                       # REQ-E-101, 102: TreeEditor
    /list                             # REQ-E-103: Product DataTable
    /[id]                             # REQ-E-104: Product editor
      /options                        # REQ-C-001: ProductConfigurator
    /[id]/sizes                       # REQ-E-105: Size DataTable (inline)
  /materials
    /papers                           # REQ-E-201: Paper DataTable (inline edit)
    /materials                        # REQ-E-202: Material DataTable
    /mappings                         # REQ-E-203: MatrixEditor
  /processes
    /print-modes                      # REQ-E-301: PrintMode DataTable
    /post-processes                   # REQ-E-302: PostProcess grouped
    /bindings                         # REQ-E-303: Binding DataTable
    /imposition                       # REQ-E-304: ImpositionRule DataTable
  /pricing
    /tables                           # REQ-E-401: PriceTable DataTable
    /tiers                            # REQ-E-402: SpreadsheetEditor
    /fixed                            # REQ-E-403: FixedPrice DataTable
    /packages                         # REQ-E-404: PackagePrice DataTable
    /foil                             # REQ-E-405: FoilPrice DataTable
    /loss                             # REQ-E-406: LossConfig cards
  /options
    /definitions                      # REQ-E-501: OptionDef DataTable
    /choices                          # REQ-E-502: OptionChoice DataTable
    /constraints                      # REQ-E-503: ConstraintBuilder
    /dependencies                     # REQ-E-504: DependencyGraph
  /integration
    /mes                              # REQ-E-601: MES item browser
    /mes-mapping                      # REQ-E-602: Visual Mapper
    /editors                          # REQ-E-603: EditorMapping DataTable
    /mes-options                      # REQ-E-604: KanbanBoard
  /widgets
    /list                             # REQ-E-701: Widget DataTable
    /[id]                             # REQ-E-702: Widget config editor
    /preview                          # REQ-E-703: Live widget preview
  /settings                          # System settings
```

### 4.2 Special UI Component Specifications

#### 4.2.1 DataTable (Generic)

범용 TanStack Table v8 래퍼 컴포넌트. 모든 도메인 목록 페이지에서 사용한다.

**Props:**
- `columns: ColumnDef<T>[]` - TanStack Table 컬럼 정의
- `data: T[]` - 데이터 배열
- `filterableColumns?: FilterableColumn[]` - 필터 가능 컬럼 목록
- `searchableColumns?: string[]` - 전문 검색 대상 컬럼
- `pagination?: { pageSize: number; serverSide: boolean }` - 페이지네이션 설정
- `enableRowSelection?: boolean` - 행 선택 활성화
- `enableColumnVisibility?: boolean` - 컬럼 가시성 토글
- `enableSorting?: boolean` - 정렬 활성화
- `onRowAction?: (action: string, row: T) => void` - 행 액션 핸들러

**기능:**
- 컬럼 헤더 클릭 정렬 (asc/desc/none)
- 컬럼별 필터 (text, select, range, date)
- 전역 검색 (debounced 300ms)
- 페이지네이션 (클라이언트/서버)
- 컬럼 가시성 토글 드롭다운
- 행 선택 (체크박스, 전체 선택)
- 빈 상태(empty state) 일러스트레이션

#### 4.2.2 TreeEditor (Category)

카테고리 계층 구조를 관리하는 트리 컴포넌트.

**Props:**
- `data: TreeNode[]` - 트리 데이터 (depth 0-2)
- `onMove: (nodeId: number, newParentId: number | null, newOrder: number) => void` - 이동 콜백
- `onAdd: (parentId: number | null) => void` - 추가 콜백
- `onEdit: (node: TreeNode) => void` - 편집 콜백
- `onDelete: (nodeId: number) => void` - 삭제 콜백

**기능:**
- 트리 노드 확장/축소
- 드래그 앤 드롭 재정렬 (dnd-kit 사용)
- 노드 인라인 편집 (더블클릭)
- depth 제한 (최대 2)
- 활성/비활성 노드 시각 구분 (opacity)
- 각 노드에 하위 카테고리 수, 상품 수 배지 표시

#### 4.2.3 MatrixEditor (Paper-Product Mapping)

용지-상품 매핑을 매트릭스 토글 그리드로 관리하는 컴포넌트.

**Props:**
- `rows: Paper[]` - Y축 데이터 (용지 목록)
- `columns: Product[]` - X축 데이터 (상품 목록)
- `mappings: PaperProductMapping[]` - 매핑 데이터
- `coverType: 'body' | 'cover'` - 현재 coverType 필터
- `onToggle: (paperId: number, productId: number, active: boolean) => void` - 토글 콜백

**기능:**
- 고정 행 헤더 (용지명) + 고정 열 헤더 (상품명)
- 셀 클릭으로 매핑 토글 (filled circle / empty circle)
- 가로/세로 스크롤 (스티키 헤더)
- coverType(내지/표지) 전환 필터
- 상품을 상위 카테고리별로 그룹핑하여 열 헤더에 표시
- 행/열 검색 필터

#### 4.2.4 SpreadsheetEditor (Price Tiers)

대량 가격 데이터를 Excel 스타일로 편집하는 컴포넌트.

**Props:**
- `priceTableId: number` - 대상 가격표 ID
- `data: PriceTier[]` - 가격 단가 데이터
- `onSave: (changes: PriceTierChange[]) => void` - 변경분 저장 콜백

**기능:**
- 가상 스크롤 (~10,000행 대응, react-window or TanStack Virtual)
- 셀 인라인 편집 (클릭 -> 입력 -> Enter/Tab 이동)
- 영역 선택 (Shift+Click, Ctrl+Click)
- 일괄 값 적용 (선택 영역에 동일 값 채우기)
- 비율 조정 (선택 영역에 +N% / -N% 적용)
- Undo/Redo (Ctrl+Z / Ctrl+Shift+Z)
- 변경된 셀 하이라이트 (배경색 변경)
- 행/열 추가 및 삭제
- 변경분 추적 및 일괄 저장 (batch upsert)

#### 4.2.5 ConstraintBuilder (Option Constraints)

옵션 제약조건을 비주얼 규칙 빌더로 편집하는 컴포넌트.

**Props:**
- `productId: number` - 대상 상품 ID
- `constraints: OptionConstraint[]` - 제약조건 목록
- `optionDefinitions: OptionDefinition[]` - 옵션 정의 참조
- `onSave: (constraints: OptionConstraint[]) => void` - 저장 콜백

**기능:**
- IF-THEN 규칙 카드 UI
- IF 조건: sourceOption 셀렉터 + operator 셀렉터(eq, neq, gt, lt, in, between) + value 입력
- THEN 액션: targetOption 셀렉터 + action 셀렉터(show, hide, set_value, filter_choices, require) + value 입력
- constraintType 탭 필터 (visibility, value_restriction, choice_filter, auto_set)
- priority 기반 정렬 (drag-reorder)
- 규칙 추가/삭제/복제
- 순환 의존성 검증 (저장 시)

#### 4.2.6 KanbanBoard (MES Option Mapping)

MES 옵션 매핑 상태를 칸반 보드로 관리하는 컴포넌트.

**Props:**
- `items: OptionChoiceMesMapping[]` - 매핑 데이터
- `onStatusChange: (itemId: number, newStatus: MappingStatus, data?: MappingData) => void` - 상태 변경 콜백

**기능:**
- 3개 컬럼: Pending (경고색) / Mapped (일반) / Verified (성공색)
- 컬럼별 카드 수 카운트 배지
- 드래그 앤 드롭으로 상태 전환
- Pending -> Mapped: mesItemId, mesCode 입력 다이얼로그
- Mapped -> Verified: 유효성 검증 후 확인 다이얼로그
- Verified -> Mapped: 되돌리기 확인 다이얼로그
- 카드 정보: optionChoice.name, mesCode, mappedBy, mappedAt
- mappingType 기준 필터 탭

#### 4.2.7 ProductConfigurator (Product Options)

상품별 옵션 구성을 관리하는 컴포넌트.

**Props:**
- `productId: number` - 대상 상품 ID
- `productOptions: ProductOption[]` - 상품-옵션 연결 목록
- `optionDefinitions: OptionDefinition[]` - 전체 옵션 정의 목록
- `onSave: (options: ProductOptionUpdate[]) => void` - 저장 콜백

**기능:**
- 전체 옵션 정의 목록에서 체크박스로 상품에 연결할 옵션 선택
- 선택된 옵션의 displayOrder 드래그 재정렬
- 옵션별 설정: isRequired, isVisible, isInternal 토글
- uiComponentOverride 셀렉터 (기본 uiComponent 대비 오버라이드)
- defaultChoiceId 셀렉터 (해당 옵션의 선택지 중 기본값 지정)
- 미리보기: 설정에 따른 옵션 UI 렌더링 시뮬레이션

### 4.3 tRPC Router Structure

```
adminRouter
  /dashboard
    stats.get                         # Dashboard statistics
    recentActivity.list               # Recent change log
  /categories
    list                              # Get category tree
    create                            # Create category
    update                            # Update category
    delete                            # Delete category (with child check)
    reorder                           # Batch update order/parent
  /products
    list                              # Paginated product list
    getById                           # Single product with relations
    create                            # Create product
    update                            # Update product
    delete                            # Soft delete product
  /productSizes
    listByProduct                     # Sizes for a product
    create                            # Create size
    update                            # Update size
    delete                            # Delete size
    batchUpdate                       # Batch update sizes
  /papers
    list                              # Paper list
    create / update / delete          # CRUD
    batchUpdatePrices                 # Inline price updates
  /materials
    list / create / update / delete   # CRUD
  /paperProductMappings
    getMatrix                         # Get matrix data (papers x products)
    toggle                            # Toggle single mapping
    batchToggle                       # Batch toggle mappings
  /printModes
    list / create / update / delete   # CRUD
  /postProcesses
    listGrouped                       # Grouped by groupCode
    create / update / delete          # CRUD
  /bindings
    list / create / update / delete   # CRUD
  /impositionRules
    list / create / update / delete   # CRUD
  /priceTables
    list / create / update / delete   # CRUD
  /priceTiers
    listByTable                       # Tiers for a price table
    batchUpsert                       # Batch save changes
    addRow / deleteRow                # Row operations
    addColumn / deleteColumn          # Column (qty range) operations
  /fixedPrices
    list / create / update / delete   # CRUD
  /packagePrices
    list / create / update / delete   # CRUD
  /foilPrices
    list / create / update / delete   # CRUD
  /lossQuantityConfigs
    list / update                     # CRUD (limited)
  /optionDefinitions
    list / create / update / delete   # CRUD
    reorder                           # Update display order
  /optionChoices
    listByDefinition                  # Choices per definition
    create / update / delete          # CRUD
  /optionConstraints
    listByProduct                     # Constraints per product
    create / update / delete          # CRUD
    validateCircular                  # Circular dependency check
  /optionDependencies
    listByProduct                     # Dependencies per product
    create / update / delete          # CRUD
    getGraph                          # Dependency graph data
  /mesItems
    list                              # MES item list (read-only)
    getWithOptions                    # MES item with options
  /productMesMappings
    getMapperData                     # Visual mapper data
    create / delete                   # Mapping CRUD
  /productEditorMappings
    list / create / update / delete   # CRUD
    listUnmapped                      # Products without editor mapping
  /optionChoiceMesMappings
    listKanban                        # Kanban board data
    updateStatus                      # Status change with validation
    batchUpdateStatus                 # Batch status change
  /widgets
    list / create / update / delete   # Widget CRUD
    getById                           # Widget with full config
    generateEmbedCode                 # Generate embed script
  /settings
    get / update                      # System settings
```

### 4.4 File Structure

```
apps/admin/
  src/
    app/
      layout.tsx                      # Root layout with sidebar
      (auth)/
        login/page.tsx                # Login page
      (dashboard)/
        layout.tsx                    # Dashboard layout (sidebar + topbar)
        dashboard/page.tsx            # REQ-E-704
        products/
          categories/page.tsx         # REQ-E-101
          list/page.tsx               # REQ-E-103
          [id]/page.tsx               # REQ-E-104
          [id]/options/page.tsx       # REQ-C-001
          [id]/sizes/page.tsx         # REQ-E-105
        materials/
          papers/page.tsx             # REQ-E-201
          materials/page.tsx          # REQ-E-202
          mappings/page.tsx           # REQ-E-203
        processes/
          print-modes/page.tsx        # REQ-E-301
          post-processes/page.tsx     # REQ-E-302
          bindings/page.tsx           # REQ-E-303
          imposition/page.tsx         # REQ-E-304
        pricing/
          tables/page.tsx             # REQ-E-401
          tiers/page.tsx              # REQ-E-402
          fixed/page.tsx              # REQ-E-403
          packages/page.tsx           # REQ-E-404
          foil/page.tsx               # REQ-E-405
          loss/page.tsx               # REQ-E-406
        options/
          definitions/page.tsx        # REQ-E-501
          choices/page.tsx            # REQ-E-502
          constraints/page.tsx        # REQ-E-503
          dependencies/page.tsx       # REQ-E-504
        integration/
          mes/page.tsx                # REQ-E-601
          mes-mapping/page.tsx        # REQ-E-602
          editors/page.tsx            # REQ-E-603
          mes-options/page.tsx        # REQ-E-604
        widgets/
          list/page.tsx               # REQ-E-701
          [id]/page.tsx               # REQ-E-702
          preview/page.tsx            # REQ-E-703
        settings/page.tsx
    components/
      layout/
        sidebar.tsx                   # REQ-U-008: Domain-grouped sidebar
        topbar.tsx                    # Top navigation bar
        breadcrumb.tsx                # Breadcrumb navigation
      data-table/
        data-table.tsx                # Generic DataTable wrapper
        data-table-toolbar.tsx        # Filter/search toolbar
        data-table-pagination.tsx     # Pagination controls
        data-table-column-header.tsx  # Sortable column header
        data-table-faceted-filter.tsx # Faceted filter (select)
        data-table-view-options.tsx   # Column visibility
      editors/
        tree-editor.tsx               # Category TreeEditor
        matrix-editor.tsx             # Paper-Product MatrixEditor
        spreadsheet-editor.tsx        # Price SpreadsheetEditor
        constraint-builder.tsx        # Option ConstraintBuilder
        kanban-board.tsx              # MES Kanban Board
        product-configurator.tsx      # Product option configurator
        visual-mapper.tsx             # Product-MES Visual Mapper
        json-editor.tsx               # JSONB field editor
      forms/
        product-form.tsx              # Product create/edit form
        category-form.tsx             # Category create/edit form
        paper-form.tsx                # Paper create/edit form
        ... (per domain)
      common/
        confirm-dialog.tsx            # REQ-U-006: Confirmation dialog
        toast-provider.tsx            # REQ-U-005: Toast notifications
        loading-skeleton.tsx          # REQ-S-005: Skeleton loader
        empty-state.tsx               # Empty state illustration
        active-toggle.tsx             # REQ-U-007: isActive toggle
    hooks/
      use-data-table.ts               # DataTable hook
      use-unsaved-changes.ts          # REQ-S-004: Unsaved changes guard
      use-debounce.ts                 # Debounced search
    lib/
      trpc/
        client.ts                     # tRPC React client setup
        server.ts                     # tRPC server context
        routers/
          index.ts                    # Root router
          dashboard.ts
          categories.ts
          products.ts
          product-sizes.ts
          papers.ts
          materials.ts
          paper-product-mappings.ts
          print-modes.ts
          post-processes.ts
          bindings.ts
          imposition-rules.ts
          price-tables.ts
          price-tiers.ts
          fixed-prices.ts
          package-prices.ts
          foil-prices.ts
          loss-quantity-configs.ts
          option-definitions.ts
          option-choices.ts
          option-constraints.ts
          option-dependencies.ts
          mes-items.ts
          product-mes-mappings.ts
          product-editor-mappings.ts
          option-choice-mes-mappings.ts
          widgets.ts
          settings.ts
      validations/
        schemas.ts                    # drizzle-zod generated schemas
        circular-check.ts            # REQ-N-004: Circular dependency validator
    styles/
      globals.css                     # Tailwind CSS + design tokens
    types/
      admin.ts                        # Admin-specific types
```

### 4.5 Performance Requirements

| Metric | Target | Strategy |
|--------|--------|----------|
| Page Load (Dashboard) | < 2s | Server Components, edge caching |
| DataTable Render (< 100 rows) | < 500ms | Client-side pagination |
| DataTable Render (> 1,000 rows) | < 1s | Server-side pagination |
| SpreadsheetEditor (10,000 cells) | < 2s | Virtual scroll (react-window) |
| MatrixEditor (55 x 45 grid) | < 1s | CSS Grid + sticky headers |
| tRPC API Response (list) | < 200ms P95 | Drizzle query optimization |
| tRPC API Response (mutation) | < 300ms P95 | Optimistic updates |
| Form Validation | < 50ms | Client-side Zod validation |
| Sidebar Navigation | instant | Client-side routing |

### 4.6 Navigation Sidebar Domain Groups

| Group | Icon | Label | Pages |
|-------|------|-------|-------|
| Dashboard | LayoutDashboard | Dashboard | /dashboard |
| Product Catalog | Package | Product Management | /products/* |
| Materials | Layers | Material Management | /materials/* |
| Processes | Settings2 | Process Management | /processes/* |
| Pricing | DollarSign | Price Management | /pricing/* |
| Options | Sliders | Option Management | /options/* |
| Integration | Link | System Integration | /integration/* |
| Widgets | Code | Widget Management | /widgets/* |
| Settings | Cog | Settings | /settings |

---

## 5. Traceability

| Requirement | Route | Component | tRPC Router | DB Table |
|------------|-------|-----------|-------------|----------|
| REQ-E-101 | /products/categories | TreeEditor | categories.list, reorder | categories |
| REQ-E-103 | /products/list | DataTable | products.list | products |
| REQ-E-104 | /products/[id] | ProductForm | products.getById, update | products |
| REQ-E-105 | /products/[id]/sizes | DataTable (inline) | productSizes.listByProduct | product_sizes |
| REQ-E-201 | /materials/papers | DataTable (inline edit) | papers.list, batchUpdatePrices | papers |
| REQ-E-203 | /materials/mappings | MatrixEditor | paperProductMappings.getMatrix, toggle | paper_product_mapping |
| REQ-E-301 | /processes/print-modes | DataTable | printModes.list | print_modes |
| REQ-E-302 | /processes/post-processes | DataTable (grouped) | postProcesses.listGrouped | post_processes |
| REQ-E-303 | /processes/bindings | DataTable | bindings.list | bindings |
| REQ-E-304 | /processes/imposition | DataTable | impositionRules.list | imposition_rules |
| REQ-E-401 | /pricing/tables | DataTable | priceTables.list | price_tables |
| REQ-E-402 | /pricing/tiers | SpreadsheetEditor | priceTiers.listByTable, batchUpsert | price_tiers |
| REQ-E-403 | /pricing/fixed | DataTable | fixedPrices.list | fixed_prices |
| REQ-E-404 | /pricing/packages | DataTable | packagePrices.list | package_prices |
| REQ-E-405 | /pricing/foil | DataTable | foilPrices.list | foil_prices |
| REQ-E-406 | /pricing/loss | Card form | lossQuantityConfigs.list | loss_quantity_config |
| REQ-E-501 | /options/definitions | DataTable | optionDefinitions.list | option_definitions |
| REQ-E-502 | /options/choices | DataTable (grouped) | optionChoices.listByDefinition | option_choices |
| REQ-E-503 | /options/constraints | ConstraintBuilder | optionConstraints.listByProduct | option_constraints |
| REQ-E-504 | /options/dependencies | DependencyGraph | optionDependencies.listByProduct | option_dependencies |
| REQ-E-601 | /integration/mes | DataTable (expandable) | mesItems.list | mes_items, mes_item_options |
| REQ-E-602 | /integration/mes-mapping | VisualMapper | productMesMappings.getMapperData | product_mes_mapping |
| REQ-E-603 | /integration/editors | DataTable | productEditorMappings.list | product_editor_mapping |
| REQ-E-604 | /integration/mes-options | KanbanBoard | optionChoiceMesMappings.listKanban | option_choice_mes_mapping |
| REQ-E-701 | /widgets/list | DataTable | widgets.list | (widget table) |
| REQ-E-702 | /widgets/[id] | WidgetEditor | widgets.getById | (widget table) |
| REQ-E-703 | /widgets/preview | WidgetPreview | - | - |
| REQ-E-704 | /dashboard | StatsCards | dashboard.stats | (aggregation) |
| REQ-C-001 | /products/[id]/options | ProductConfigurator | productOptions.* | product_options |
| REQ-C-002 | /pricing/tiers | SpreadsheetEditor | priceTiers.listByTable | price_tiers, price_tables |
| REQ-C-003 | /integration/mes-options | KanbanBoard | optionChoiceMesMappings.updateStatus | option_choice_mes_mapping |

---

## 6. Expert Consultation Recommendations

### 6.1 expert-frontend Consultation (RECOMMENDED)

이 SPEC는 7개의 특수 UI 컴포넌트(DataTable, TreeEditor, MatrixEditor, SpreadsheetEditor, ConstraintBuilder, KanbanBoard, ProductConfigurator)를 포함하므로, expert-frontend 에이전트와의 상담을 권장한다.

상담 범위:
- shadcn/ui 기반 DataTable 컴포넌트 아키텍처
- TanStack Table v8 server-side pagination/filter 패턴
- 가상 스크롤 구현 (react-window vs TanStack Virtual)
- 드래그 앤 드롭 라이브러리 선택 (dnd-kit)
- MatrixEditor 성능 최적화 (55x45 그리드)
- SpreadsheetEditor 셀 편집 UX 패턴

### 6.2 expert-backend Consultation (RECOMMENDED)

tRPC 서버 구성 및 Drizzle ORM 쿼리 최적화를 위해 expert-backend 에이전트와의 상담을 권장한다.

상담 범위:
- tRPC v11 서버 설정 및 라우터 구조
- Drizzle ORM 복합 조인 쿼리 최적화
- price_tiers batch upsert 성능 (10,000행 대응)
- 순환 의존성 검증 알고리즘
- drizzle-zod 스키마 생성 및 커스텀 검증 통합
