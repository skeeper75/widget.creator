# SPEC-WIDGET-ADMIN-001 기술 아키텍처

**버전**: 1.0.0
**작성일**: 2026-02-28
**브랜치**: feature/SPEC-WIDGET-ADMIN-001

---

## 1. tRPC 라우터 설계

### 1.1 현재 라우터 구조

현재 `widgetAdminRouter` (`apps/admin/src/lib/trpc/routers/widget-admin.ts`)는 기존 6-Step 마법사 전용으로 구현되어 있으며, 아래 프로시저를 포함한다:

- `products.list` / `products.get` — 상품 목록/상세 조회
- `recipes.*` — 레시피 CRUD (archive 패턴 포함)
- `constraints.*` — ECA 제약 관리
- `simulation.*` — 시뮬레이션 실행
- `publish.*` — 발행 관리
- `pricing.*` — 가격 테이블 조회/저장
- `completeness` / `dashboard` — 완성도 체크 및 대시보드

### 1.2 신규 라우터 설계 (7개 페이지)

기존 `widgetAdminRouter`를 확장하지 않고, 페이지별 독립 라우터를 생성하여 관심사를 분리한다.

**접근 방식 비교:**

| 접근 방식 | 장점 | 단점 |
|-----------|------|------|
| A: 기존 widgetAdmin 확장 | 단일 네임스페이스 | 파일 비대화 (이미 1000+ LOC), 관심사 혼재 |
| **B: 페이지별 독립 라우터 (권장)** | 관심사 분리, 파일 크기 관리, 병렬 개발 가능 | 라우터 등록 증가 |

**권장 접근 방식: B (페이지별 독립 라우터)**

```
apps/admin/src/lib/trpc/routers/
  index.ts                        # appRouter (기존 + 신규 라우터 등록)
  widget-admin.ts                 # 기존 6-Step 마법사 라우터 (변경 없음)
  widget-builder/                 # 신규 디렉토리
    element-types.ts              # FR-WBADMIN-001
    element-choices.ts            # FR-WBADMIN-002
    recipes.ts                    # FR-WBADMIN-003
    constraint-templates.ts       # FR-WBADMIN-004
    addon-groups.ts               # FR-WBADMIN-005
    pricing.ts                    # FR-WBADMIN-006
    orders.ts                     # FR-WBADMIN-007
    index.ts                      # 서브라우터 병합
```

### 1.3 라우터별 프로시저 상세

#### `elementTypes` 라우터

| 프로시저 | 타입 | 입력 | 출력 | 비고 |
|----------|------|------|------|------|
| `list` | query | `{ page, pageSize, search?, category?, isActive? }` | `{ data: OptionElementType[], total: number }` | 페이지네이션 + 필터 |
| `getById` | query | `{ id: number }` | `OptionElementType` | 단건 조회 |
| `create` | mutation | `{ typeKey, typeNameKo, typeNameEn, uiControl, optionCategory, displayOrder }` | `OptionElementType` | unique(typeKey) 검증 |
| `update` | mutation | `{ id, typeNameKo?, typeNameEn?, uiControl?, optionCategory?, displayOrder?, isActive? }` | `OptionElementType` | 부분 업데이트 |
| `deactivate` | mutation | `{ id: number }` | `{ success: boolean }` | element_choices 참조 시 차단 |

#### `elementChoices` 라우터

| 프로시저 | 타입 | 입력 | 출력 | 비고 |
|----------|------|------|------|------|
| `list` | query | `{ page, pageSize, typeId?, search?, isActive? }` | `{ data: OptionElementChoice[], total: number }` | typeId 필터 필수화 권장 |
| `getById` | query | `{ id: number }` | `OptionElementChoice` | JOIN elementTypes |
| `create` | mutation | `{ typeId, choiceKey, displayName, mesCode?, ... }` | `OptionElementChoice` | unique(typeId, choiceKey) 검증 |
| `update` | mutation | `{ id, displayName?, mesCode?, displayOrder?, ... }` | `OptionElementChoice` | 타입별 동적 필드 검증 |
| `deactivate` | mutation | `{ id: number }` | `{ success: boolean, affectedBindings: number }` | 참조 바인딩 경고 반환 |

#### `recipes` 라우터 (Widget Builder 독립 CRUD)

| 프로시저 | 타입 | 입력 | 출력 | 비고 |
|----------|------|------|------|------|
| `list` | query | `{ productId?, page, pageSize, includeArchived? }` | `{ data: RecipeWithBindings[], total }` | JOIN bindings |
| `getById` | query | `{ id: number }` | `RecipeWithBindings` | bindings + restrictions 포함 |
| `create` | mutation | `{ productId, recipeName, bindings[] }` | `ProductRecipe` | version 자동 할당 |
| `update` | mutation | `{ id, recipeName?, bindings[]? }` | `ProductRecipe` | **archive 후 신규 생성** (NFR-WBADMIN-002) |
| `archive` | mutation | `{ id: number }` | `{ success: boolean }` | is_archived=true 설정 |
| `setDefault` | mutation | `{ id: number }` | `{ success: boolean }` | 제품 내 다른 default 해제 |
| `updateBindingOrder` | mutation | `{ recipeId, orderedBindingIds[] }` | `{ success: boolean }` | 드래그앤드롭 정렬 반영 |
| `updateRestrictions` | mutation | `{ bindingId, restrictions[] }` | `{ success: boolean }` | 선택지 제한 벌크 업데이트 |

#### `constraintTemplates` 라우터

| 프로시저 | 타입 | 입력 | 출력 | 비고 |
|----------|------|------|------|------|
| `list` | query | `{ page, pageSize, category?, search? }` | `{ data: ConstraintTemplate[], total }` | usage count 서브쿼리 포함 |
| `getById` | query | `{ id: number }` | `ConstraintTemplate` | ECA 패턴 상세 |
| `create` | mutation | `{ templateKey, templateNameKo, ... actionsPattern }` | `ConstraintTemplate` | is_system=false 강제 |
| `update` | mutation | `{ id, ... }` | `ConstraintTemplate` | **is_system=true 시 FORBIDDEN** |
| `delete` | mutation | `{ id: number }` | `{ success: boolean }` | **is_system=true 시 FORBIDDEN**, 참조 제약 검증 |

#### `addonGroups` 라우터

| 프로시저 | 타입 | 입력 | 출력 | 비고 |
|----------|------|------|------|------|
| `list` | query | `{ page?, pageSize? }` | `{ data: AddonGroupWithItems[], total }` | items count 포함 |
| `getById` | query | `{ id: number }` | `AddonGroupWithItems` | items 배열 포함 |
| `create` | mutation | `{ groupName, displayMode, items[]? }` | `AddonGroup` | 그룹 + 아이템 일괄 생성 |
| `update` | mutation | `{ id, groupName?, displayMode?, displayOrder? }` | `AddonGroup` | 그룹 메타 수정 |
| `delete` | mutation | `{ id: number }` | `{ success: boolean }` | CASCADE 삭제 (items 포함) |
| `addItem` | mutation | `{ groupId, productId, labelOverride?, priceOverride? }` | `AddonGroupItem` | unique(groupId, productId) |
| `removeItem` | mutation | `{ itemId: number }` | `{ success: boolean }` | 아이템 단건 삭제 |
| `updateItemOrder` | mutation | `{ groupId, orderedItemIds[] }` | `{ success: boolean }` | 정렬 순서 업데이트 |

#### `wbPricing` 라우터

| 프로시저 | 타입 | 입력 | 출력 | 비고 |
|----------|------|------|------|------|
| `getPrintCosts` | query | `{ productId }` | `PrintCostBase[]` | 기본 인쇄단가 매트릭스 |
| `upsertPrintCosts` | mutation | `{ productId, rows[] }` | `{ upserted: number }` | 배치 upsert |
| `getPostprocessCosts` | query | `{ productId? }` | `PostprocessCost[]` | NULL=전역 표시 |
| `upsertPostprocessCosts` | mutation | `{ rows[] }` | `{ upserted: number }` | 배치 upsert |
| `getQtyDiscounts` | query | `{ productId? }` | `QtyDiscount[]` | NULL=전역 표시 |
| `upsertQtyDiscounts` | mutation | `{ rows[] }` | `{ upserted: number }` | 배치 upsert |
| `getPriceConfig` | query | `{ productId }` | `ProductPriceConfig` | 가격 모드 설정 |
| `updatePriceConfig` | mutation | `{ productId, priceMode, ... }` | `ProductPriceConfig` | 모드 변경 |

#### `wbOrders` 라우터

| 프로시저 | 타입 | 입력 | 출력 | 비고 |
|----------|------|------|------|------|
| `list` | query | `{ page, pageSize, status?, mesStatus?, productId?, search?, dateRange? }` | `{ data: WbOrder[], total }` | 다중 필터 |
| `getById` | query | `{ id: number }` | `WbOrderDetail` | selections, priceBreakdown JSON 펼침 |
| `updateStatus` | mutation | `{ id, status }` | `WbOrder` | 수동 상태 변경 |
| `resendToMes` | mutation | `{ id: number }` | `{ success: boolean, mesOrderId? }` | idempotency key 사용 |
| `exportCsv` | query | `{ status?, mesStatus?, dateRange? }` | `{ csvUrl: string }` | CSV 다운로드 URL |

### 1.4 appRouter 등록

```typescript
// apps/admin/src/lib/trpc/routers/index.ts 수정
import { widgetBuilderRouter } from './widget-builder';

export const appRouter = router({
  // ... 기존 라우터들 ...

  // Widget Builder 독립 관리 페이지 (SPEC-WIDGET-ADMIN-001)
  wb: widgetBuilderRouter,
});
```

```typescript
// apps/admin/src/lib/trpc/routers/widget-builder/index.ts
import { router } from '../../server';
import { elementTypesRouter } from './element-types';
import { elementChoicesRouter } from './element-choices';
import { recipesRouter } from './recipes';
import { constraintTemplatesRouter } from './constraint-templates';
import { addonGroupsRouter } from './addon-groups';
import { pricingRouter } from './pricing';
import { ordersRouter } from './orders';

export const widgetBuilderRouter = router({
  elementTypes: elementTypesRouter,
  elementChoices: elementChoicesRouter,
  recipes: recipesRouter,
  constraintTemplates: constraintTemplatesRouter,
  addonGroups: addonGroupsRouter,
  pricing: pricingRouter,
  orders: ordersRouter,
});
```

---

## 2. DB 스키마 관계

### 2.1 페이지별 관리 테이블 매핑

| 페이지 | 주 테이블 | 연관 테이블 | 관계 유형 |
|--------|----------|------------|----------|
| Element Types | `option_element_types` | `option_element_choices` (1:N) | 독립 마스터 |
| Element Choices | `option_element_choices` | `option_element_types` (N:1) | FK 참조 |
| Recipe Builder | `product_recipes` | `recipe_option_bindings` (1:N), `recipe_choice_restrictions` (1:N) | 복합 엔티티 |
| Constraint Templates | `constraint_templates` | `recipe_constraints` (1:N 참조) | 독립 마스터 |
| Addon Groups | `addon_groups` | `addon_group_items` (1:N), `wb_products` (N:M) | 복합 엔티티 |
| Price Config | `product_price_configs`, `print_cost_base`, `postprocess_cost`, `qty_discount` | `wb_products` (N:1) | 다중 테이블 |
| Orders | `orders` | `wb_products` (N:1), `product_recipes` (N:1) | 읽기 위주 |

### 2.2 엔티티 관계도 (ER Diagram - 텍스트)

```
option_element_types (1) ──── (N) option_element_choices
                                       │
                                       │ (N:1)
                                       ▼
product_recipes (1) ─── (N) recipe_option_bindings
       │                         │
       │                         │ (1:N)
       │                         ▼
       │                 recipe_choice_restrictions
       │
       │ (N:1)
       ▼
wb_products ──── (1:1) product_price_configs
    │
    │ (1:N)
    ├──── print_cost_base
    ├──── postprocess_cost (nullable FK = 전역)
    ├──── qty_discount (nullable FK = 전역)
    │
    │ (N:M via addon_group_items)
    ├──── addon_groups
    │
    │ (1:N)
    └──── orders

constraint_templates ──── (참조) recipe_constraints
```

### 2.3 핵심 불변 규칙

| 규칙 | 테이블 | 적용 방법 |
|------|--------|----------|
| edicus_code 불변성 | `wb_products` | tRPC mutation에서 update 시 edicusCode 필드 제외 + 변경 시도 시 400 반환 |
| Recipe 물리삭제 금지 | `product_recipes` | DELETE 프로시저 미제공, archive mutation만 제공 |
| System 템플릿 보호 | `constraint_templates` | update/delete 시 is_system 검증 후 FORBIDDEN |
| postprocess_cost/qty_discount 전역 | `postprocess_cost`, `qty_discount` | productId=NULL이면 "전역" 뱃지 UI 표시 |

---

## 3. 구현 순서 (의존성 기반)

### Phase 1: 기반 엔티티 (Element Types + Choices)

**근거**: 다른 모든 페이지가 element_types/choices를 참조한다. Recipe Builder의 바인딩 UI, Constraint Templates의 트리거 옵션, Price Config의 사이즈/인쇄 코드 모두 이 데이터에 의존.

**순서**:
1. `elementTypes` tRPC 라우터 구현
2. Element Types 페이지 (DataTable + EditModal)
3. `elementChoices` tRPC 라우터 구현
4. Element Choices 페이지 (DataTable + typeId 필터 + EditModal)

**산출물**:
- `apps/admin/src/lib/trpc/routers/widget-builder/element-types.ts`
- `apps/admin/src/lib/trpc/routers/widget-builder/element-choices.ts`
- `apps/admin/src/app/(dashboard)/widget-builder/elements/page.tsx`
- `apps/admin/src/app/(dashboard)/widget-builder/choices/page.tsx`

### Phase 2: Recipe Builder

**근거**: Recipe는 element_types/choices를 바인딩하며, constraint 및 pricing이 recipe에 의존한다. Phase 1 완료 후 가장 먼저 필요.

**순서**:
1. `recipes` tRPC 라우터 구현 (archive 패턴 포함)
2. RecipeBuilder 컴포넌트 (핵심 복합 UI)
3. ElementBindingTable 컴포넌트 (dnd-kit 정렬)
4. ChoiceRestrictionMatrix 컴포넌트 (체크박스 매트릭스)
5. Recipe Builder 페이지 조합

**산출물**:
- `apps/admin/src/lib/trpc/routers/widget-builder/recipes.ts`
- `apps/admin/src/app/(dashboard)/widget-builder/recipes/page.tsx`
- `apps/admin/src/components/widget-builder/recipe-builder.tsx`
- `apps/admin/src/components/widget-builder/element-binding-table.tsx`
- `apps/admin/src/components/widget-builder/choice-restriction-matrix.tsx`

### Phase 3: Constraint Templates + Addon Groups (병렬 가능)

**근거**: 두 영역은 서로 독립적이며, 모두 Phase 1의 element_types만 의존. 병렬 구현 가능.

**순서** (병렬):
- 3A: `constraintTemplates` 라우터 + 페이지 + TemplateDetailPanel
- 3B: `addonGroups` 라우터 + 페이지 + AddonGroupEditor

**산출물**:
- `apps/admin/src/lib/trpc/routers/widget-builder/constraint-templates.ts`
- `apps/admin/src/lib/trpc/routers/widget-builder/addon-groups.ts`
- `apps/admin/src/app/(dashboard)/widget-builder/constraint-templates/page.tsx`
- `apps/admin/src/app/(dashboard)/widget-builder/addons/page.tsx`
- `apps/admin/src/components/widget-builder/template-detail-panel.tsx`
- `apps/admin/src/components/widget-builder/addon-group-editor.tsx`

### Phase 4: Price Configuration

**근거**: 가격 테이블은 wb_products에 의존하며, 기존 SpreadsheetEditor를 재사용한다. Phase 2에서 recipe-product 관계가 확립된 후 구현.

**순서**:
1. `wbPricing` tRPC 라우터 (4개 테이블 배치 upsert)
2. PriceConfigTabs 컴포넌트 (탭 전환 UI)
3. Price Config 페이지 (SpreadsheetEditor 재사용)

**산출물**:
- `apps/admin/src/lib/trpc/routers/widget-builder/pricing.ts`
- `apps/admin/src/app/(dashboard)/widget-builder/pricing/page.tsx`
- `apps/admin/src/components/widget-builder/price-config-tabs.tsx`
- `apps/admin/src/components/widget-builder/price-breakdown.tsx`

### Phase 5: Orders

**근거**: 주문은 읽기 위주 페이지이며, 다른 페이지에 의존하지 않으나 wb_products와 product_recipes를 참조.

**순서**:
1. `wbOrders` tRPC 라우터 (목록 + 상세 + MES 재전송)
2. OrderDetailPanel 컴포넌트
3. MesStatusBadge 컴포넌트
4. Orders 페이지

**산출물**:
- `apps/admin/src/lib/trpc/routers/widget-builder/orders.ts`
- `apps/admin/src/app/(dashboard)/widget-builder/orders/page.tsx`
- `apps/admin/src/components/widget-builder/order-detail-panel.tsx`
- `apps/admin/src/components/widget-builder/mes-status-badge.tsx`

### Phase 6: 통합 및 네비게이션

**근거**: 모든 페이지 완료 후 사이드바 통합 및 대시보드 업데이트.

**순서**:
1. sidebar.tsx에 Widget Builder 네비게이션 그룹 추가
2. widget-builder/layout.tsx 생성 (공통 레이아웃)
3. dashboard 페이지에 Widget Builder 통계 카드 추가

**산출물**:
- `apps/admin/src/components/layout/sidebar.tsx` (수정)
- `apps/admin/src/app/(dashboard)/widget-builder/layout.tsx` (신규)
- `apps/admin/src/app/(dashboard)/dashboard/page.tsx` (수정)

---

## 4. 파일 구조

### 4.1 신규 파일 목록

```
apps/admin/src/
├── lib/trpc/routers/widget-builder/
│   ├── index.ts                       # 서브라우터 병합
│   ├── element-types.ts               # Element Types CRUD
│   ├── element-choices.ts             # Element Choices CRUD
│   ├── recipes.ts                     # Recipe + Bindings + Restrictions
│   ├── constraint-templates.ts        # Constraint Templates CRUD
│   ├── addon-groups.ts                # Addon Groups + Items CRUD
│   ├── pricing.ts                     # 4개 가격 테이블 배치 upsert
│   └── orders.ts                      # Orders 조회 + MES 재전송
│
├── app/(dashboard)/widget-builder/
│   ├── layout.tsx                     # 공통 레이아웃
│   ├── elements/page.tsx              # Element Types 페이지
│   ├── choices/page.tsx               # Element Choices 페이지
│   ├── recipes/page.tsx               # Recipe Builder 페이지
│   ├── constraint-templates/page.tsx  # Constraint Templates 페이지
│   ├── addons/page.tsx                # Addon Groups 페이지
│   ├── pricing/page.tsx               # Price Config 페이지
│   └── orders/page.tsx                # Orders 페이지
│
├── components/widget-builder/
│   ├── recipe-builder.tsx             # Recipe 복합 편집기
│   ├── element-binding-table.tsx      # 바인딩 테이블 (dnd-kit)
│   ├── choice-restriction-matrix.tsx  # 선택지 제한 체크박스 매트릭스
│   ├── template-detail-panel.tsx      # 제약 템플릿 ECA 상세 패널
│   ├── addon-group-editor.tsx         # 애드온 그룹 인라인 편집기
│   ├── price-config-tabs.tsx          # 가격 설정 탭 전환
│   ├── price-breakdown.tsx            # 가격 상세 표시
│   ├── order-detail-panel.tsx         # 주문 상세 패널
│   └── mes-status-badge.tsx           # MES 상태 뱃지
│
└── lib/validations/widget-builder/
    ├── element-type.schema.ts         # Zod 검증 스키마
    ├── element-choice.schema.ts
    ├── recipe.schema.ts
    ├── constraint-template.schema.ts
    ├── addon-group.schema.ts
    ├── pricing.schema.ts
    └── order.schema.ts
```

### 4.2 수정 파일 목록

| 파일 | 수정 내용 |
|------|----------|
| `apps/admin/src/lib/trpc/routers/index.ts` | `wb: widgetBuilderRouter` 등록 |
| `apps/admin/src/components/layout/sidebar.tsx` | Widget Builder 네비게이션 그룹 추가 |
| `apps/admin/src/app/(dashboard)/dashboard/page.tsx` | Widget Builder 통계 카드 추가 |

### 4.3 총 파일 수

- **신규**: 약 32개 (7 라우터 + 1 인덱스 + 8 페이지 + 1 레이아웃 + 9 컴포넌트 + 7 검증 스키마 - 1 공유)
- **수정**: 3개

---

## 5. API 설계 패턴

### 5.1 공통 패턴 (기존 코드베이스 준수)

모든 라우터는 기존 `productsRouter` 패턴을 따른다:

```typescript
// 패턴 1: 목록 조회 (페이지네이션 + 필터)
list: protectedProcedure
  .input(z.object({
    page: z.number().min(1).default(1),
    pageSize: z.number().min(1).max(100).default(20),
    search: z.string().optional(),
    // ... 엔티티별 필터
  }).default({}))
  .query(async ({ ctx, input }) => {
    const conditions: SQL[] = [];
    // ... 동적 조건 구성
    const [data, countResult] = await Promise.all([
      ctx.db.select().from(table).where(where).limit().offset(),
      ctx.db.select({ count: sql<number>`count(*)` }).from(table).where(where),
    ]);
    return { data, total: Number(countResult[0]?.count ?? 0) };
  })

// 패턴 2: 생성 (Zod 검증)
create: protectedProcedure
  .input(CreateSchema)
  .mutation(async ({ ctx, input }) => {
    const [result] = await ctx.db.insert(table).values(input).returning();
    return result;
  })

// 패턴 3: 수정 (부분 업데이트)
update: protectedProcedure
  .input(UpdateSchema)
  .mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    const [result] = await ctx.db.update(table).set(data).where(eq(table.id, id)).returning();
    return result;
  })
```

### 5.2 특수 패턴

**Recipe Archive 패턴** (NFR-WBADMIN-002):
```
update recipe:
  1. 기존 레시피 is_archived=true 설정
  2. 신규 레시피 생성 (version = max(version) + 1)
  3. 기존 bindings/restrictions를 신규 레시피로 복제
  4. 트랜잭션으로 원자성 보장
```

**System Template 보호 패턴** (FR-WBADMIN-004):
```
update/delete constraint_template:
  1. id로 조회
  2. is_system === true이면 TRPCError({ code: 'FORBIDDEN' }) 반환
  3. false이면 정상 처리
```

**배치 Upsert 패턴** (FR-WBADMIN-006):
```
upsert pricing rows:
  1. 입력 배열을 Zod로 전체 검증
  2. ctx.db.transaction 내에서:
     a. 기존 행 삭제 (productId 기준)
     b. 새 행 일괄 삽입
  3. upserted 카운트 반환
```

---

## 6. 테스트 전략

### 6.1 방법론 적용 (Hybrid Mode)

| 대상 | 방법론 | 근거 |
|------|--------|------|
| 신규 라우터 (7개) | TDD (RED-GREEN-REFACTOR) | 신규 코드 |
| 신규 컴포넌트 (9개) | TDD (RED-GREEN-REFACTOR) | 신규 코드 |
| sidebar.tsx 수정 | DDD (ANALYZE-PRESERVE-IMPROVE) | 기존 코드 수정 |
| dashboard page 수정 | DDD (ANALYZE-PRESERVE-IMPROVE) | 기존 코드 수정 |

### 6.2 단위 테스트 구조

```
apps/admin/__tests__/
├── trpc/widget-builder/
│   ├── element-types.test.ts
│   ├── element-choices.test.ts
│   ├── recipes.test.ts
│   ├── constraint-templates.test.ts
│   ├── addon-groups.test.ts
│   ├── pricing.test.ts
│   └── orders.test.ts
│
└── components/widget-builder/
    ├── recipe-builder.test.tsx
    ├── element-binding-table.test.tsx
    ├── choice-restriction-matrix.test.tsx
    ├── template-detail-panel.test.tsx
    ├── addon-group-editor.test.tsx
    ├── price-config-tabs.test.tsx
    ├── order-detail-panel.test.tsx
    └── mes-status-badge.test.tsx
```

---

## 7. 위험 요소 및 완화 방안

| 위험 | 영향도 | 완화 방안 |
|------|--------|----------|
| widgetAdmin 라우터와 wb 라우터 네임스페이스 충돌 | 중 | `wb` 프리픽스로 완전 분리, 기존 widgetAdmin은 변경하지 않음 |
| Recipe archive 시 bindings 복제 실패 | 고 | 트랜잭션 + 에러 시 롤백 |
| SpreadsheetEditor 대량 데이터 렌더링 성능 | 중 | tanstack-virtual 가상화 (기존 컴포넌트가 이미 지원) |
| 가격 배치 upsert 시 데이터 무결성 | 고 | 트랜잭션 + delete-then-insert 패턴 |
| Element Type 삭제 시 연쇄 참조 | 고 | deactivate만 제공 (soft delete), CASCADE 없음 |
| dnd-kit 번들 사이즈 | 저 | @dnd-kit/sortable만 설치 (최소 의존성) |

---

## 8. 재사용 컴포넌트 매핑

| 기존 컴포넌트 | 사용 페이지 | 사용 방법 |
|--------------|------------|----------|
| `DataTable` | 전체 7개 페이지 | 목록 표시 공통 |
| `DataTableFacetedFilter` | Elements, Choices, Orders | 필터 UI |
| `DataTablePagination` | 전체 7개 페이지 | 페이지네이션 |
| `ConfirmDialog` | Recipes (archive), Templates (delete), Orders (MES resend) | 확인 다이얼로그 |
| `SpreadsheetEditor` | Price Config | 가격 매트릭스 그리드 |
| `ConstraintBuilder` | Constraint Templates | ECA 패턴 편집 |
| `EmptyState` | 전체 7개 페이지 | 빈 데이터 상태 |
| `LoadingSkeleton` | 전체 7개 페이지 | 로딩 스켈레톤 |
| `ActiveToggle` | Elements, Choices | 활성/비활성 토글 |

---

**참고 문서:**
- SPEC: `.moai/specs/SPEC-WIDGET-ADMIN-001/spec.md`
- DB 분석: `.moai/specs/SPEC-WIDGET-ADMIN-001/db-analysis.md`
- 리서치: `.moai/specs/SPEC-WIDGET-ADMIN-001/research.md`
