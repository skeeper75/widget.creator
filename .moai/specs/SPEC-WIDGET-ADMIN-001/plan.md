---
id: SPEC-WIDGET-ADMIN-001
title: Widget Builder Admin Dashboard - Implementation Plan
version: 1.0.0
status: Draft
created: 2026-02-22
updated: 2026-02-22
author: MoAI
priority: P0
spec_ref: SPEC-WIDGET-ADMIN-001/spec.md
---

# SPEC-WIDGET-ADMIN-001: Widget Builder Admin Dashboard - 구현 계획

## 1. 기술 스택

| 패키지 | 버전 | 용도 | 사용 위치 |
|--------|------|------|-----------|
| `next` | 16.x | App Router, Server Components, Server Actions | apps/admin |
| `react` / `react-dom` | 19.x | Client Components, Concurrent Features | apps/admin |
| `@tanstack/react-table` | v8 (latest) | Headless data grid (sort, filter, paginate) | apps/admin |
| `@tanstack/react-query` | v5 (latest) | Server state caching, mutation, optimistic updates | apps/admin |
| `@tanstack/react-virtual` | v3 (latest) | 가상 스크롤 (price_tiers 10,000행 대응) | apps/admin |
| `@trpc/server` / `@trpc/client` / `@trpc/react-query` | v11 | Type-safe API layer | apps/admin |
| `react-hook-form` | v7 (latest) | Form state management | apps/admin |
| `@hookform/resolvers` | latest | Zod resolver for React Hook Form | apps/admin |
| `drizzle-zod` | latest | Drizzle schema -> Zod schema 자동 생성 | packages/shared |
| `zod` | 3.23+ | Schema validation | apps/admin, packages/shared |
| `shadcn/ui` | latest | Radix UI primitives + Tailwind CSS v4 | apps/admin |
| `tailwindcss` | v4 | Utility-first CSS | apps/admin |
| `@dnd-kit/core` / `@dnd-kit/sortable` | latest | Drag and drop (TreeEditor, KanbanBoard, reorder) | apps/admin |
| `lucide-react` | latest | Icon library | apps/admin |
| `sonner` | latest | Toast notifications | apps/admin |
| `cmdk` | latest | Command palette (optional) | apps/admin |
| `drizzle-orm` | latest | Type-safe database access | packages/shared |
| `postgres` (postgres.js) | latest | PostgreSQL driver | packages/shared |

> **참고**: 정확한 버전은 `/moai run` 단계에서 최신 stable 버전을 확인하여 확정합니다.

---

## 2. 아키텍처 설계 방향

### 2.1 전체 아키텍처

```
Browser (Admin)
    |
    v
Next.js 16 App Router (Server Components + Client Components)
    |
    v
tRPC v11 (Type-safe API Layer)
    |
    v
Drizzle ORM (Query Builder)
    |
    v
PostgreSQL 16 (26 Tables, 6 Domains)
```

### 2.2 핵심 설계 원칙

1. **Server Components First**: 목록 페이지의 초기 데이터는 Server Components로 로딩하여 TTI 최소화
2. **Headless UI**: TanStack Table v8을 headless로 사용하고, shadcn/ui로 렌더링 레이어 구현
3. **Schema-Driven Validation**: drizzle-zod로 DB 스키마에서 Zod 스키마를 자동 생성하여 폼 검증에 활용
4. **Optimistic Updates**: TanStack Query의 mutation + optimistic update 패턴으로 즉각적인 UI 반응성 제공
5. **Component Composition**: 범용 DataTable 컴포넌트를 기반으로 도메인별 커스텀 컬럼/필터를 합성

### 2.3 tRPC 서버 구성

- tRPC 서버는 `apps/admin/src/lib/trpc/` 내부에 구현
- Next.js App Router의 catch-all API route (`/api/trpc/[trpc]/route.ts`)로 노출
- 각 도메인별 라우터 파일로 분리 (26개 라우터)
- `protectedProcedure` 미들웨어로 인증 강제 (REQ-N-005)

---

## 3. 구현 Phase

### Phase 1: 프로젝트 스캐폴딩 및 인프라 구축

**Priority: High (Primary Goal)**

**작업 목록**:

- [ ] `apps/admin/` Next.js 16 App Router 프로젝트 초기화
- [ ] Tailwind CSS v4 + 후니프린팅 디자인 토큰 설정 (REQ-U-004)
  - Primary: `#5538B6`, Font: Noto Sans, Spacing: 4px grid
  - `globals.css`에 CSS 변수로 디자인 토큰 정의
- [ ] shadcn/ui 설치 및 기본 컴포넌트 설정
  - Button, Input, Select, Card, Dialog, Table, Badge, Dropdown, Tabs, Toast, Sheet, Tooltip
- [ ] tRPC v11 서버/클라이언트 설정
  - `apps/admin/src/lib/trpc/client.ts` - React Query 통합 클라이언트
  - `apps/admin/src/lib/trpc/server.ts` - 서버 컨텍스트 (세션, DB)
  - `apps/admin/src/app/api/trpc/[trpc]/route.ts` - API route handler
- [ ] TanStack Query v5 Provider 설정
- [ ] NextAuth.js v5 인증 미들웨어 연동 (REQ-S-001)
- [ ] sonner 토스트 프로바이더 설정 (REQ-U-005)

**핵심 파일**:
```
apps/admin/
  src/
    app/
      layout.tsx                    # Root layout (providers)
      api/trpc/[trpc]/route.ts      # tRPC API handler
    lib/
      trpc/
        client.ts                   # tRPC React client
        server.ts                   # tRPC server context
        routers/
          index.ts                  # Root router merge
    styles/
      globals.css                   # Design tokens + Tailwind
```

**복잡도**: Medium
**의존성**: SPEC-INFRA-001 완료 (Drizzle 스키마 존재)

---

### Phase 2: 공유 컴포넌트 개발

**Priority: High (Primary Goal)**

**작업 목록**:

- [ ] **DataTable** 범용 컴포넌트 개발 (REQ-U-001)
  - `data-table.tsx` - TanStack Table v8 wrapper
  - `data-table-toolbar.tsx` - 필터/검색 툴바
  - `data-table-pagination.tsx` - 페이지네이션 컨트롤
  - `data-table-column-header.tsx` - 정렬 가능 컬럼 헤더
  - `data-table-faceted-filter.tsx` - Faceted 필터 (select)
  - `data-table-view-options.tsx` - 컬럼 가시성 토글
  - debounced 전역 검색 (300ms) 지원
  - 서버/클라이언트 사이드 페이지네이션 전환 지원 (REQ-S-002)
  - 빈 상태(empty state) 일러스트레이션

- [ ] **Layout** 컴포넌트 개발 (REQ-U-008)
  - `sidebar.tsx` - 6개 도메인 그룹 + 아이콘 사이드바
  - `topbar.tsx` - 상단 네비게이션 바
  - `breadcrumb.tsx` - 경로 표시

- [ ] **Common** 유틸리티 컴포넌트 개발
  - `confirm-dialog.tsx` - 삭제 확인 다이얼로그 (REQ-U-006)
  - `toast-provider.tsx` - 토스트 알림 래퍼 (REQ-U-005)
  - `loading-skeleton.tsx` - 스켈레톤 로더 (REQ-S-005)
  - `empty-state.tsx` - 빈 상태 UI
  - `active-toggle.tsx` - isActive 필터 토글 (REQ-U-007)

- [ ] **Hooks** 개발
  - `use-data-table.ts` - DataTable 상태 관리 hook
  - `use-unsaved-changes.ts` - 미저장 경고 hook (REQ-S-004)
  - `use-debounce.ts` - Debounced 검색 hook

- [ ] **Validation** 인프라
  - `schemas.ts` - drizzle-zod 기반 스키마 생성 (REQ-U-002)
  - `circular-check.ts` - 순환 의존성 검증 유틸 (REQ-N-004)

**핵심 파일**:
```
apps/admin/src/
  components/
    layout/sidebar.tsx, topbar.tsx, breadcrumb.tsx
    data-table/data-table.tsx, ...toolbar, ...pagination, ...column-header, ...faceted-filter, ...view-options
    common/confirm-dialog.tsx, toast-provider.tsx, loading-skeleton.tsx, empty-state.tsx, active-toggle.tsx
  hooks/use-data-table.ts, use-unsaved-changes.ts, use-debounce.ts
  lib/validations/schemas.ts, circular-check.ts
```

**복잡도**: High (DataTable은 전체 시스템의 기반)
**의존성**: Phase 1 완료

---

### Phase 3: Domain 1 - Product Catalog (상품 카탈로그)

**Priority: High (Primary Goal)**

**대상 테이블**: `categories`, `products`, `product_sizes` (3 tables)

**작업 목록**:

- [ ] tRPC 라우터 구현
  - `categories.ts` - list(tree), create, update, delete(child check), reorder
  - `products.ts` - list(paginated), getById(relations), create, update, delete(soft)
  - `product-sizes.ts` - listByProduct, create, update, delete, batchUpdate

- [ ] **TreeEditor** 특수 컴포넌트 구현 (REQ-E-101, REQ-E-102)
  - dnd-kit 기반 드래그 앤 드롭
  - depth 0-2 제한
  - parentId/depth/displayOrder 일괄 업데이트
  - 하위 카테고리 수/상품 수 배지
  - 하위 카테고리 존재 시 삭제 차단 (REQ-N-001)

- [ ] 상품 목록 페이지 (`/admin/products/list`) (REQ-E-103)
  - 11 컬럼 DataTable (ID, huniCode, name, category, productType, pricingModel, orderMethod, editorEnabled, mesRegistered, isActive, Actions)
  - 카테고리/productType/pricingModel 셀렉트 필터

- [ ] 상품 생성/수정 폼 (`/admin/products/[id]`) (REQ-E-104)
  - 카테고리 트리 셀렉터
  - slug auto-generation
  - drizzle-zod 기반 검증

- [ ] 상품 사이즈 관리 (`/admin/products/[id]/sizes`) (REQ-E-105)
  - 인라인 편집 가능 DataTable
  - isCustom=true 시 min/max 범위 필드 표시

- [ ] 페이지 파일 생성
  - `categories/page.tsx`
  - `list/page.tsx`
  - `[id]/page.tsx`
  - `[id]/sizes/page.tsx`

**복잡도**: High (TreeEditor 드래그 앤 드롭 + 재귀적 depth 갱신)
**의존성**: Phase 2 완료 (DataTable, Layout)

---

### Phase 4: Domain 2 - Materials (소재)

**Priority: High (Primary Goal)**

**대상 테이블**: `papers`, `materials`, `paper_product_mapping` (3 tables)

**작업 목록**:

- [ ] tRPC 라우터 구현
  - `papers.ts` - list, create, update, delete, batchUpdatePrices
  - `materials.ts` - list, create, update, delete
  - `paper-product-mappings.ts` - getMatrix, toggle, batchToggle

- [ ] 용지 목록 페이지 (`/admin/materials/papers`) (REQ-E-201)
  - 12 컬럼 DataTable (인라인 가격 편집, 드래그 순서 변경)
  - weight range 필터

- [ ] 소재 관리 페이지 (`/admin/materials/materials`) (REQ-E-202)
  - CRUD DataTable + materialType 셀렉트 필터

- [ ] **MatrixEditor** 특수 컴포넌트 구현 (REQ-E-203)
  - 55x45 매트릭스 그리드
  - 고정 행/열 헤더 (sticky)
  - 셀 클릭 토글 (filled/empty circle)
  - coverType(내지/표지) 전환 필터
  - 상품을 카테고리별 그룹핑
  - 가로/세로 스크롤

- [ ] 페이지 파일 생성
  - `papers/page.tsx`
  - `materials/page.tsx`
  - `mappings/page.tsx`

**복잡도**: High (MatrixEditor 55x45 그리드 + sticky headers)
**의존성**: Phase 2 완료

---

### Phase 5: Domain 3 - Processes (공정)

**Priority: Medium (Secondary Goal)**

**대상 테이블**: `print_modes`, `post_processes`, `bindings`, `imposition_rules` (4 tables)

**작업 목록**:

- [ ] tRPC 라우터 구현
  - `print-modes.ts` - list, create, update, delete
  - `post-processes.ts` - listGrouped, create, update, delete
  - `bindings.ts` - list, create, update, delete
  - `imposition-rules.ts` - list, create, update, delete

- [ ] 인쇄방식 페이지 (`/admin/processes/print-modes`) (REQ-E-301)
  - CRUD DataTable + sides/colorType 셀렉트 필터

- [ ] 후가공 페이지 (`/admin/processes/post-processes`) (REQ-E-302)
  - groupCode 기준 8개 그룹 아코디언/탭 UI

- [ ] 제본 페이지 (`/admin/processes/bindings`) (REQ-E-303)
  - CRUD DataTable + minPages/maxPages/pageStep 교차 검증

- [ ] 면부 규칙 페이지 (`/admin/processes/imposition`) (REQ-E-304)
  - DataTable + cutWidth x cutHeight 유일성 실시간 검증

- [ ] 페이지 파일 생성
  - `print-modes/page.tsx`
  - `post-processes/page.tsx`
  - `bindings/page.tsx`
  - `imposition/page.tsx`

**복잡도**: Medium (대부분 표준 CRUD DataTable)
**의존성**: Phase 2 완료

---

### Phase 6: Domain 4 - Pricing (가격)

**Priority: High (Primary Goal)**

**대상 테이블**: `price_tables`, `price_tiers`, `fixed_prices`, `package_prices`, `foil_prices`, `loss_quantity_config` (6 tables)

**작업 목록**:

- [ ] tRPC 라우터 구현
  - `price-tables.ts` - list, create, update, delete
  - `price-tiers.ts` - listByTable, batchUpsert, addRow, deleteRow, addColumn, deleteColumn
  - `fixed-prices.ts` - list, create, update, delete
  - `package-prices.ts` - list, create, update, delete
  - `foil-prices.ts` - list, create, update, delete
  - `loss-quantity-configs.ts` - list, update

- [ ] 가격표 메타 페이지 (`/admin/pricing/tables`) (REQ-E-401)
  - CRUD DataTable + priceType/sheetStandard 셀렉트 필터

- [ ] **SpreadsheetEditor** 특수 컴포넌트 구현 (REQ-E-402)
  - TanStack Virtual 기반 가상 스크롤 (~10,000행)
  - 셀 인라인 편집 (click -> input -> Enter/Tab)
  - 영역 선택 (Shift+Click, Ctrl+Click)
  - 일괄 값 적용 / 비율 조정 (+N%, -N%)
  - Undo/Redo (Ctrl+Z / Ctrl+Shift+Z)
  - 변경 셀 하이라이트
  - 행/열 추가 및 삭제
  - 변경분 추적 및 batch upsert
  - 음수 입력 차단 (REQ-N-003)
  - cost/selling 가격표 병행 표시 (REQ-C-002)

- [ ] 고정가격 페이지 (`/admin/pricing/fixed`) (REQ-E-403)
  - DataTable + 관계 테이블 name 표시 셀렉트 필터

- [ ] 패키지 가격 페이지 (`/admin/pricing/packages`) (REQ-E-404)
  - DataTable + 인라인 편집 + 관계 셀렉트 필터

- [ ] 박/형압 가격 페이지 (`/admin/pricing/foil`) (REQ-E-405)
  - DataTable + foilType/targetProductType 필터 + width x height 시각적 구분

- [ ] 손실수량 설정 페이지 (`/admin/pricing/loss`) (REQ-E-406)
  - 카드 레이아웃 (~5행) + scopeType별 인라인 편집

- [ ] 페이지 파일 생성
  - `tables/page.tsx`, `tiers/page.tsx`, `fixed/page.tsx`, `packages/page.tsx`, `foil/page.tsx`, `loss/page.tsx`

**복잡도**: Very High (SpreadsheetEditor는 가장 복잡한 컴포넌트)
**의존성**: Phase 2 완료

---

### Phase 7: Domain 5 - Options & UI (옵션)

**Priority: High (Primary Goal)**

**대상 테이블**: `option_definitions`, `product_options`, `option_choices`, `option_constraints`, `option_dependencies` (5 tables)

**작업 목록**:

- [ ] tRPC 라우터 구현
  - `option-definitions.ts` - list, create, update, delete, reorder
  - `option-choices.ts` - listByDefinition, create, update, delete
  - `option-constraints.ts` - listByProduct, create, update, delete, validateCircular
  - `option-dependencies.ts` - listByProduct, create, update, delete, getGraph

- [ ] 옵션 정의 페이지 (`/admin/options/definitions`) (REQ-E-501)
  - 9 컬럼 DataTable + optionClass/optionType 셀렉트 필터 + 드래그 순서 변경

- [ ] 옵션 선택지 페이지 (`/admin/options/choices`) (REQ-E-502)
  - optionDefinitionId 기준 그룹 필터/중첩 테이블
  - ref_*_id 필드 읽기 전용 링크
  - priceKey -> price_tiers.optionCode 시각적 연결

- [ ] **ConstraintBuilder** 특수 컴포넌트 구현 (REQ-E-503)
  - 좌측 패널: productId 셀렉터
  - IF-THEN 규칙 카드 UI
  - IF: sourceOption + operator(eq/neq/gt/lt/in/between) + value
  - THEN: targetOption + action(show/hide/set_value/filter_choices/require) + value
  - constraintType 탭 필터
  - priority 드래그 정렬
  - 순환 의존성 검증 (REQ-N-004)

- [ ] 옵션 의존성 페이지 (`/admin/options/dependencies`) (REQ-E-504)
  - productId 기준 필터
  - 부모-자식 의존성 그래프 / 테이블 뷰 전환
  - dependencyType 구분

- [ ] **ProductConfigurator** 특수 컴포넌트 구현 (REQ-C-001)
  - 전체 옵션에서 체크박스로 상품 옵션 선택
  - 선택된 옵션 드래그 재정렬
  - isRequired/isVisible/isInternal 토글
  - uiComponentOverride/defaultChoiceId 셀렉터
  - 미리보기 시뮬레이션
  - binding productType 시 전용 옵션 우선 표시

- [ ] 페이지 파일 생성
  - `definitions/page.tsx`, `choices/page.tsx`, `constraints/page.tsx`, `dependencies/page.tsx`
  - `products/[id]/options/page.tsx`

**복잡도**: Very High (ConstraintBuilder + ProductConfigurator 두 개의 복잡 컴포넌트)
**의존성**: Phase 3 완료 (상품 데이터 필요), Phase 2 완료

---

### Phase 8: Domain 6 - Integration (연동)

**Priority: Medium (Secondary Goal)**

**대상 테이블**: `mes_items`, `mes_item_options`, `product_mes_mapping`, `product_editor_mapping`, `option_choice_mes_mapping` (5 tables)

**작업 목록**:

- [ ] tRPC 라우터 구현
  - `mes-items.ts` - list(read-only), getWithOptions
  - `product-mes-mappings.ts` - getMapperData, create, delete
  - `product-editor-mappings.ts` - list, create, update, delete, listUnmapped
  - `option-choice-mes-mappings.ts` - listKanban, updateStatus, batchUpdateStatus

- [ ] MES 아이템 브라우저 (`/admin/integration/mes`) (REQ-E-601)
  - 읽기 전용 DataTable + 행 확장(expand row)
  - groupCode/itemType 필터
  - 동기화 버튼

- [ ] **VisualMapper** 특수 컴포넌트 구현 (REQ-E-602)
  - 좌측: products 목록 (카테고리별 그룹, 검색)
  - 우측: mes_items 목록 (groupCode별 그룹, 검색)
  - 중앙: 연결선 시각화
  - 드래그/셀렉터로 매핑 생성
  - 매핑되지 않은 상품 경고 아이콘

- [ ] 에디터 매핑 페이지 (`/admin/integration/editors`) (REQ-E-603)
  - DataTable + JSON 에디터 (templateConfig JSONB)
  - 미매핑 상품 필터

- [ ] **KanbanBoard** 특수 컴포넌트 구현 (REQ-E-604)
  - 3 컬럼: Pending / Mapped / Verified
  - dnd-kit 기반 드래그 상태 전환
  - Pending->Mapped: mesItemId/mesCode 입력 다이얼로그
  - Mapped->Verified: 유효성 검증 + 확인 (REQ-C-003)
  - mappedBy/mappedAt 자동 기록
  - mappingType 필터 탭

- [ ] 페이지 파일 생성
  - `mes/page.tsx`, `mes-mapping/page.tsx`, `editors/page.tsx`, `mes-options/page.tsx`

**복잡도**: High (KanbanBoard + VisualMapper)
**의존성**: Phase 3 완료 (상품 데이터), Phase 2 완료

---

### Phase 9: Widget & Dashboard 페이지

**Priority: Medium (Secondary Goal)**

**작업 목록**:

- [ ] tRPC 라우터 구현
  - `dashboard.ts` - stats.get, recentActivity.list
  - `widgets.ts` - list, create, update, delete, getById, generateEmbedCode
  - `settings.ts` - get, update

- [ ] 대시보드 페이지 (`/admin/dashboard`) (REQ-E-704)
  - 통계 카드 (상품 수, 위젯 수, MES 매핑 완료율, 옵션 제약조건 수)
  - 최근 변경 활동 로그 (최근 10건)

- [ ] 위젯 목록 페이지 (`/admin/widgets/list`) (REQ-E-701)
  - CRUD DataTable + 상태 배지, API 키 복사, 임베드 코드 생성

- [ ] 위젯 상세 설정 페이지 (`/admin/widgets/[id]`) (REQ-E-702)
  - 탭 기반 편집기 (기본 정보, 카테고리 선택, 가격 규칙 연결)

- [ ] 위젯 미리보기 페이지 (`/admin/widgets/preview`) (REQ-E-703)
  - iframe 실시간 위젯 렌더링

- [ ] 페이지 파일 생성
  - `dashboard/page.tsx`, `widgets/list/page.tsx`, `widgets/[id]/page.tsx`, `widgets/preview/page.tsx`, `settings/page.tsx`

**복잡도**: Medium
**의존성**: Phase 2 완료

---

### Phase 10: 횡단 관심사 및 품질 개선

**Priority: Low (Final Goal)**

**작업 목록**:

- [ ] 성능 최적화
  - 서버 사이드 페이지네이션 적용 (50건 초과 테이블) (REQ-S-002)
  - SpreadsheetEditor 가상 스크롤 성능 튜닝 (REQ-S-003)
  - MatrixEditor CSS Grid 렌더링 최적화

- [ ] UX 개선
  - 미저장 변경사항 경고 전역 적용 (REQ-S-004)
  - 스켈레톤 로더 전역 적용 (REQ-S-005)
  - KanbanBoard pending 카드 경고 표시 (REQ-S-006)

- [ ] 보안 검증
  - tRPC protectedProcedure 전체 적용 확인 (REQ-N-005)
  - 참조 무결성 삭제 제한 확인 (REQ-N-002)

- [ ] 선택 기능 구현
  - CSV/Excel 내보내기 (REQ-O-001)
  - CSV 가져오기 (REQ-O-002)
  - 의존성 그래프 시각화 (REQ-O-003)
  - 감사 로그 기록 (REQ-O-004)
  - 데이터 정합성 검사 패널 (REQ-O-005)

**복잡도**: Medium
**의존성**: Phase 3~9 완료

---

## 4. 파일 생성 목록 (전체)

### 4.1 페이지 파일 (30+)

| 경로 | Phase | REQ |
|------|-------|-----|
| `app/(dashboard)/layout.tsx` | 2 | REQ-U-008 |
| `app/(dashboard)/dashboard/page.tsx` | 9 | REQ-E-704 |
| `app/(dashboard)/products/categories/page.tsx` | 3 | REQ-E-101 |
| `app/(dashboard)/products/list/page.tsx` | 3 | REQ-E-103 |
| `app/(dashboard)/products/[id]/page.tsx` | 3 | REQ-E-104 |
| `app/(dashboard)/products/[id]/sizes/page.tsx` | 3 | REQ-E-105 |
| `app/(dashboard)/products/[id]/options/page.tsx` | 7 | REQ-C-001 |
| `app/(dashboard)/materials/papers/page.tsx` | 4 | REQ-E-201 |
| `app/(dashboard)/materials/materials/page.tsx` | 4 | REQ-E-202 |
| `app/(dashboard)/materials/mappings/page.tsx` | 4 | REQ-E-203 |
| `app/(dashboard)/processes/print-modes/page.tsx` | 5 | REQ-E-301 |
| `app/(dashboard)/processes/post-processes/page.tsx` | 5 | REQ-E-302 |
| `app/(dashboard)/processes/bindings/page.tsx` | 5 | REQ-E-303 |
| `app/(dashboard)/processes/imposition/page.tsx` | 5 | REQ-E-304 |
| `app/(dashboard)/pricing/tables/page.tsx` | 6 | REQ-E-401 |
| `app/(dashboard)/pricing/tiers/page.tsx` | 6 | REQ-E-402 |
| `app/(dashboard)/pricing/fixed/page.tsx` | 6 | REQ-E-403 |
| `app/(dashboard)/pricing/packages/page.tsx` | 6 | REQ-E-404 |
| `app/(dashboard)/pricing/foil/page.tsx` | 6 | REQ-E-405 |
| `app/(dashboard)/pricing/loss/page.tsx` | 6 | REQ-E-406 |
| `app/(dashboard)/options/definitions/page.tsx` | 7 | REQ-E-501 |
| `app/(dashboard)/options/choices/page.tsx` | 7 | REQ-E-502 |
| `app/(dashboard)/options/constraints/page.tsx` | 7 | REQ-E-503 |
| `app/(dashboard)/options/dependencies/page.tsx` | 7 | REQ-E-504 |
| `app/(dashboard)/integration/mes/page.tsx` | 8 | REQ-E-601 |
| `app/(dashboard)/integration/mes-mapping/page.tsx` | 8 | REQ-E-602 |
| `app/(dashboard)/integration/editors/page.tsx` | 8 | REQ-E-603 |
| `app/(dashboard)/integration/mes-options/page.tsx` | 8 | REQ-E-604 |
| `app/(dashboard)/widgets/list/page.tsx` | 9 | REQ-E-701 |
| `app/(dashboard)/widgets/[id]/page.tsx` | 9 | REQ-E-702 |
| `app/(dashboard)/widgets/preview/page.tsx` | 9 | REQ-E-703 |
| `app/(dashboard)/settings/page.tsx` | 9 | - |

### 4.2 컴포넌트 파일 (25+)

| 경로 | Phase | 유형 |
|------|-------|------|
| `components/layout/sidebar.tsx` | 2 | Layout |
| `components/layout/topbar.tsx` | 2 | Layout |
| `components/layout/breadcrumb.tsx` | 2 | Layout |
| `components/data-table/data-table.tsx` | 2 | Shared |
| `components/data-table/data-table-toolbar.tsx` | 2 | Shared |
| `components/data-table/data-table-pagination.tsx` | 2 | Shared |
| `components/data-table/data-table-column-header.tsx` | 2 | Shared |
| `components/data-table/data-table-faceted-filter.tsx` | 2 | Shared |
| `components/data-table/data-table-view-options.tsx` | 2 | Shared |
| `components/editors/tree-editor.tsx` | 3 | Special |
| `components/editors/matrix-editor.tsx` | 4 | Special |
| `components/editors/spreadsheet-editor.tsx` | 6 | Special |
| `components/editors/constraint-builder.tsx` | 7 | Special |
| `components/editors/kanban-board.tsx` | 8 | Special |
| `components/editors/product-configurator.tsx` | 7 | Special |
| `components/editors/visual-mapper.tsx` | 8 | Special |
| `components/editors/json-editor.tsx` | 8 | Special |
| `components/forms/product-form.tsx` | 3 | Form |
| `components/forms/category-form.tsx` | 3 | Form |
| `components/forms/paper-form.tsx` | 4 | Form |
| `components/common/confirm-dialog.tsx` | 2 | Common |
| `components/common/toast-provider.tsx` | 2 | Common |
| `components/common/loading-skeleton.tsx` | 2 | Common |
| `components/common/empty-state.tsx` | 2 | Common |
| `components/common/active-toggle.tsx` | 2 | Common |

### 4.3 tRPC 라우터 파일 (26)

| 경로 | Phase | Domain |
|------|-------|--------|
| `lib/trpc/routers/index.ts` | 1 | Root |
| `lib/trpc/routers/dashboard.ts` | 9 | Widget |
| `lib/trpc/routers/categories.ts` | 3 | Product Catalog |
| `lib/trpc/routers/products.ts` | 3 | Product Catalog |
| `lib/trpc/routers/product-sizes.ts` | 3 | Product Catalog |
| `lib/trpc/routers/papers.ts` | 4 | Materials |
| `lib/trpc/routers/materials.ts` | 4 | Materials |
| `lib/trpc/routers/paper-product-mappings.ts` | 4 | Materials |
| `lib/trpc/routers/print-modes.ts` | 5 | Processes |
| `lib/trpc/routers/post-processes.ts` | 5 | Processes |
| `lib/trpc/routers/bindings.ts` | 5 | Processes |
| `lib/trpc/routers/imposition-rules.ts` | 5 | Processes |
| `lib/trpc/routers/price-tables.ts` | 6 | Pricing |
| `lib/trpc/routers/price-tiers.ts` | 6 | Pricing |
| `lib/trpc/routers/fixed-prices.ts` | 6 | Pricing |
| `lib/trpc/routers/package-prices.ts` | 6 | Pricing |
| `lib/trpc/routers/foil-prices.ts` | 6 | Pricing |
| `lib/trpc/routers/loss-quantity-configs.ts` | 6 | Pricing |
| `lib/trpc/routers/option-definitions.ts` | 7 | Options |
| `lib/trpc/routers/option-choices.ts` | 7 | Options |
| `lib/trpc/routers/option-constraints.ts` | 7 | Options |
| `lib/trpc/routers/option-dependencies.ts` | 7 | Options |
| `lib/trpc/routers/mes-items.ts` | 8 | Integration |
| `lib/trpc/routers/product-mes-mappings.ts` | 8 | Integration |
| `lib/trpc/routers/product-editor-mappings.ts` | 8 | Integration |
| `lib/trpc/routers/option-choice-mes-mappings.ts` | 8 | Integration |
| `lib/trpc/routers/widgets.ts` | 9 | Widget |
| `lib/trpc/routers/settings.ts` | 9 | Settings |

---

## 5. 의존성 그래프

```
Phase 1 (스캐폴딩)
    |
    v
Phase 2 (공유 컴포넌트)
    |
    +---> Phase 3 (Product Catalog) --+
    |                                  |
    +---> Phase 4 (Materials)          |
    |                                  v
    +---> Phase 5 (Processes)    Phase 7 (Options) --> requires Product data
    |                                  |
    +---> Phase 6 (Pricing)            |
    |                                  v
    +---> Phase 9 (Widget/Dashboard)  Phase 8 (Integration) --> requires Product data
    |
    v
Phase 10 (횡단 관심사) --> requires All Phases
```

**병렬 실행 가능 그룹**:
- Phase 3, 4, 5, 6은 Phase 2 완료 후 병렬 진행 가능
- Phase 7, 8은 Phase 3 완료 후 병렬 진행 가능
- Phase 9는 Phase 2 완료 후 독립 진행 가능

---

## 6. 리스크 분석

### 6.1 기술 리스크

| 리스크 | 발생 가능성 | 영향도 | 대응 전략 |
|--------|------------|--------|-----------|
| SpreadsheetEditor 가상 스크롤 성능 이슈 (10,000행) | Medium | High | TanStack Virtual v3 선검증, 필요시 react-window 대안 검토 |
| MatrixEditor 55x45 그리드 렌더링 지연 | Low | Medium | CSS Grid 기반 구현, 불필요한 리렌더 방지 (React.memo) |
| dnd-kit 트리 에디터 재귀적 depth 갱신 복잡도 | Medium | Medium | 서버 사이드 batch update 구현, 클라이언트는 낙관적 업데이트 |
| tRPC v11 + Next.js 16 App Router 통합 이슈 | Low | High | 공식 문서 및 예제 기반 구현, Context7로 최신 패턴 확인 |
| drizzle-zod 스키마 자동 생성 커스텀 검증 충돌 | Low | Medium | createInsertSchema/createSelectSchema 후 .extend()로 커스텀 검증 추가 |
| 순환 의존성 검증 알고리즘 복잡도 | Medium | High | DFS 기반 사이클 탐지, 그래프 라이브러리 검토 |

### 6.2 프로젝트 리스크

| 리스크 | 발생 가능성 | 영향도 | 대응 전략 |
|--------|------------|--------|-----------|
| 26개 tRPC 라우터 일관성 유지 | Medium | Medium | 제네릭 CRUD 유틸리티 함수 추출, 코드 생성 패턴 적용 |
| 7개 특수 컴포넌트 개발 지연 | High | High | Phase 우선순위에 따라 핵심 컴포넌트(DataTable, SpreadsheetEditor) 선행 개발 |
| 디자인 시스템 미비로 UI 일관성 저하 | Medium | Medium | shadcn/ui 테마 커스터마이징으로 디자인 토큰 사전 적용 |

### 6.3 완화 전략

1. **제네릭 CRUD 패턴 추출**: 유사한 CRUD DataTable 페이지는 제네릭 패턴으로 추출하여 코드 중복 최소화
2. **점진적 기능 확대**: Phase 우선순위에 따라 핵심 기능 우선 구현, 선택 기능(REQ-O-*)은 Phase 10으로 후순위
3. **성능 벤치마크 선행**: SpreadsheetEditor 및 MatrixEditor는 개발 초기에 프로토타입으로 성능 검증
4. **tRPC 라우터 템플릿화**: 표준 CRUD 라우터 생성 유틸리티 함수로 보일러플레이트 최소화

---

## 7. Milestone 요약

| Milestone | Phase 범위 | 주요 산출물 | Priority |
|-----------|-----------|-------------|----------|
| M1: Foundation | Phase 1-2 | 스캐폴딩, DataTable, Layout, 공통 컴포넌트 | Primary Goal |
| M2: Core Domains | Phase 3-4 | Product Catalog + Materials (TreeEditor, MatrixEditor) | Primary Goal |
| M3: Business Logic | Phase 5-6 | Processes + Pricing (SpreadsheetEditor) | Primary Goal |
| M4: Advanced UI | Phase 7-8 | Options + Integration (ConstraintBuilder, KanbanBoard, ProductConfigurator) | Primary Goal |
| M5: Dashboard & Polish | Phase 9-10 | Dashboard, Widgets, 성능 최적화, 선택 기능 | Secondary Goal |

---

## 8. Expert Consultation 계획

### 8.1 expert-frontend 상담 (Priority: High)

- shadcn/ui 기반 DataTable 아키텍처 리뷰
- TanStack Table v8 서버 사이드 pagination/filter 최적 패턴
- TanStack Virtual v3 vs react-window 성능 비교
- dnd-kit 트리 에디터 + 칸반 보드 구현 패턴
- MatrixEditor CSS Grid sticky header 크로스 브라우저 호환성

### 8.2 expert-backend 상담 (Priority: High)

- tRPC v11 서버 아키텍처 및 미들웨어 설계
- Drizzle ORM 복합 조인 쿼리 최적화 (관계 데이터 로딩)
- price_tiers batch upsert 성능 최적화 (10,000행)
- DFS 기반 순환 의존성 검증 알고리즘 구현
- drizzle-zod 스키마 + 커스텀 검증 통합 패턴

---

## 9. Traceability

| 요구사항 | Phase | 구현 파일 (주요) |
|----------|-------|------------------|
| REQ-U-001 | Phase 2 | data-table/*.tsx |
| REQ-U-002 | Phase 2 | validations/schemas.ts |
| REQ-U-003 | Phase 1 | trpc/client.ts, trpc/server.ts |
| REQ-U-004 | Phase 1 | styles/globals.css |
| REQ-U-005 | Phase 1, 2 | common/toast-provider.tsx |
| REQ-U-006 | Phase 2 | common/confirm-dialog.tsx |
| REQ-U-007 | Phase 2 | common/active-toggle.tsx |
| REQ-U-008 | Phase 2 | layout/sidebar.tsx |
| REQ-E-101~105 | Phase 3 | products/*.tsx, tree-editor.tsx |
| REQ-E-201~203 | Phase 4 | materials/*.tsx, matrix-editor.tsx |
| REQ-E-301~304 | Phase 5 | processes/*.tsx |
| REQ-E-401~406 | Phase 6 | pricing/*.tsx, spreadsheet-editor.tsx |
| REQ-E-501~504 | Phase 7 | options/*.tsx, constraint-builder.tsx, product-configurator.tsx |
| REQ-E-601~604 | Phase 8 | integration/*.tsx, kanban-board.tsx, visual-mapper.tsx |
| REQ-E-701~704 | Phase 9 | widgets/*.tsx, dashboard/page.tsx |
| REQ-S-001~006 | Phase 1, 10 | middleware, hooks, components |
| REQ-N-001~005 | Phase 3, 6, 7, 10 | routers, validations |
| REQ-C-001~003 | Phase 6, 7, 8 | product-configurator.tsx, spreadsheet-editor.tsx, kanban-board.tsx |
| REQ-O-001~005 | Phase 10 | 선택 기능 파일 |
