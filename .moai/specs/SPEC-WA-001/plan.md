# SPEC-WA-001: Implementation Plan

**SPEC:** SPEC-WA-001 Widget Admin Console -- 6-Step Admin UI
**Version:** 1.0.0
**Date:** 2026-02-26

---

## Implementation Strategy

### Approach

순수 프론트엔드 UI 구현 SPEC. DB 스키마는 기존 SPEC(WB-001~006)에서 완료되었으므로, tRPC 라우터 + React 컴포넌트 구현에 집중한다.

### Development Methodology

- **Mode:** Hybrid (quality.yaml 설정)
- **New Features (Step 2, 3, 4):** TDD -- RED-GREEN-REFACTOR
- **Existing Enhancement (Step 1, 5):** DDD -- ANALYZE-PRESERVE-IMPROVE
- **Step 6:** 변경 없음 -- 스킵

### Architecture Pattern

```
apps/admin/src/
  app/(dashboard)/widget-admin/
    page.tsx                          -- Step 1 (기존 수정)
    [productId]/
      options/page.tsx                -- Step 2 (신규)
      pricing/page.tsx                -- Step 3 (신규)
      constraints/page.tsx            -- Step 4 (신규)
      simulate/page.tsx               -- Step 5 (기존 수정)
      publish/page.tsx                -- Step 6 (변경 없음)
  components/widget-admin/
    stat-card.tsx                     -- 공통 통계 카드
    option-list.tsx                   -- Step 2
    option-row.tsx                    -- Step 2
    option-value-editor.tsx           -- Step 2
    option-add-dialog.tsx             -- Step 2
    constraint-sheet.tsx              -- Step 2
    price-mode-selector.tsx           -- Step 3
    lookup-price-editor.tsx           -- Step 3
    area-price-editor.tsx             -- Step 3
    page-price-editor.tsx             -- Step 3
    composite-price-editor.tsx        -- Step 3
    postprocess-cost-editor.tsx       -- Step 3
    qty-discount-editor.tsx           -- Step 3
    price-test-panel.tsx              -- Step 3
    constraint-list.tsx               -- Step 4
    constraint-card.tsx               -- Step 4
    rule-builder.tsx                  -- Step 4
    trigger-editor.tsx                -- Step 4
    action-editor.tsx                 -- Step 4
    ai-rule-converter.tsx             -- Step 4
    rule-preview.tsx                  -- Step 4
  lib/trpc/routers/
    widget-admin.ts                   -- 기존 라우터 확장
```

---

## Milestones

### Primary Goal: Infrastructure + Step 2 (주문옵션 설정)

**Priority:** HIGH

**Scope:**
1. shadcn 컴포넌트 설치 (`sheet`, `alert`, `collapsible`)
2. 공통 컴포넌트 생성 (`StatCard`)
3. `productOptions` tRPC 프로시저 6종 구현:
   - `productOptions.list`
   - `productOptions.reorder`
   - `productOptions.addToProduct`
   - `productOptions.remove`
   - `productOptions.updateValues`
   - `optionDefinitions.list`
4. Step 2 페이지 구현 (`/widget-admin/[productId]/options`)
5. DnD 정렬 구현 (`@dnd-kit/sortable`)
6. 옵션 값 편집 인라인 패널
7. 옵션 추가 Dialog
8. 제약조건 Side Sheet

**Deliverables:**
- `options/page.tsx` + 5개 컴포넌트
- tRPC 프로시저 6종
- 컴포넌트 단위 테스트
- tRPC 통합 테스트

**Dependencies:**
- SPEC-WB-001 (옵션 스키마) -- 완료됨
- SPEC-WB-002 (레시피 스키마) -- 완료됨

### Secondary Goal: Step 3 (가격룰 & 계산식)

**Priority:** HIGH

**Scope:**
1. 가격 관련 tRPC 프로시저 9종 구현:
   - `priceConfig.get`, `priceConfig.update`
   - `printCostBase.list`, `printCostBase.upsert`
   - `postprocessCost.list`, `postprocessCost.upsert`
   - `qtyDiscount.list`, `qtyDiscount.upsert`
   - `pricingTest`
2. Step 3 페이지 구현 (`/widget-admin/[productId]/pricing`)
3. 가격 방식 선택 RadioGroup
4. 모드별 에디터 4종 (LOOKUP, AREA, PAGE, COMPOSITE)
5. 후가공비/수량할인 테이블 에디터
6. 실시간 견적 테스트 패널

**Deliverables:**
- `pricing/page.tsx` + 8개 컴포넌트
- tRPC 프로시저 9종
- 단위 테스트 + 통합 테스트

**Dependencies:**
- SPEC-WB-004 (가격 계산 엔진) -- 완료됨
- Primary Goal (공통 인프라) -- 선행 필요

### Third Goal: Step 4 (인쇄 제약조건 빌더)

**Priority:** MEDIUM

**Scope:**
1. 제약조건 tRPC 프로시저 7종 구현:
   - `constraints.list`, `constraints.create`
   - `constraints.update`, `constraints.delete`
   - `constraints.toggle`, `constraints.testAll`
   - `constraints.aiConvert`
2. Step 4 페이지 구현 (`/widget-admin/[productId]/constraints`)
3. IF-THEN 카드 목록
4. 비주얼 Rule Builder (트리거 + 액션 편집기)
5. 복합 조건 (AND/OR) 지원
6. AI 자연어 변환 패널

**Deliverables:**
- `constraints/page.tsx` + 7개 컴포넌트
- tRPC 프로시저 7종
- 단위 테스트 + 통합 테스트

**Dependencies:**
- SPEC-WB-003 (제약조건 엔진) -- 완료됨
- Primary Goal (공통 인프라, Sheet 컴포넌트) -- 선행 필요

### Final Goal: Step 1 보강 + Step 5 보강

**Priority:** LOW

**Scope:**
1. Step 1 대시보드 보강:
   - 통계 카드 4종 추가
   - 카테고리 필터 Select 추가
   - 상태 필터 Select 추가
2. Step 5 시뮬레이션 보강:
   - 통계 카드 4종 추가
   - 통과율 Progress Bar 추가

**Deliverables:**
- `page.tsx` (Step 1) 수정
- `simulate/page.tsx` (Step 5) 수정
- `StatCard` 공통 컴포넌트 활용

**Dependencies:**
- Primary Goal (StatCard 컴포넌트) -- 선행 필요

---

## Technical Approach

### tRPC Router Structure

기존 `widgetAdmin` 라우터를 네임스페이스별로 확장:

```
widgetAdmin
  ├── dashboard              (기존)
  ├── completeness           (기존)
  ├── startSimulation        (기존)
  ├── simulationStatus       (기존)
  ├── simulationCases        (기존)
  ├── publish                (기존)
  ├── unpublish              (기존)
  ├── productOptions         (신규 -- Step 2)
  │   ├── list
  │   ├── reorder
  │   ├── addToProduct
  │   ├── remove
  │   └── updateValues
  ├── optionDefinitions      (신규 -- Step 2)
  │   └── list
  ├── priceConfig            (신규 -- Step 3)
  │   ├── get
  │   └── update
  ├── printCostBase          (신규 -- Step 3)
  │   ├── list
  │   └── upsert
  ├── postprocessCost        (신규 -- Step 3)
  │   ├── list
  │   └── upsert
  ├── qtyDiscount            (신규 -- Step 3)
  │   ├── list
  │   └── upsert
  ├── pricingTest            (신규 -- Step 3)
  └── constraints            (신규 -- Step 4)
      ├── list
      ├── create
      ├── update
      ├── delete
      ├── toggle
      ├── testAll
      └── aiConvert
```

### Component Strategy

- **shadcn/ui 기반**: 모든 UI는 shadcn/ui primitives로 구성
- **인라인 편집**: Dialog보다 인라인 편집 패널 선호 (Step 2 옵션값)
- **Side Sheet**: 보조 정보는 Sheet로 (Step 2 제약조건 목록)
- **DnD**: `@dnd-kit/sortable` 활용 (Step 2 옵션 순서)
- **Zod Validation**: 모든 form 입력은 Zod 스키마로 검증
- **react-hook-form**: 복잡한 폼은 react-hook-form + @hookform/resolvers/zod

### State Management

- **Server State**: tRPC React Query (캐싱, 낙관적 업데이트)
- **Local State**: React useState/useReducer (Rule Builder 편집 상태)
- **DnD State**: @dnd-kit internal state

---

## Risk Assessment

### Risk 1: Rule Builder 복잡도

**설명:** 비주얼 Rule Builder의 복합 조건(AND/OR) + 8종 액션 타입 조합이 UI 복잡도를 높임
**대응:** 단일 조건 먼저 구현, 복합 조건은 점진적 추가. 각 액션 타입별 파라미터 UI를 독립 컴포넌트로 분리

### Risk 2: AI 자연어 변환 정확도

**설명:** LLM 기반 자연어 -> 규칙 변환의 정확도와 응답 시간 불확실
**대응:** tRPC mutation으로 서버사이드 호출. 반드시 미리보기 단계를 거쳐 사용자 확인 후 적용. 실패 시 수동 입력 폴백

### Risk 3: LOOKUP 단가표 대용량

**설명:** 판형 x 인쇄방식 x 수량구간 조합이 많을 경우 테이블 렌더링 성능 문제
**대응:** @tanstack/react-table 가상 스크롤링 활용. 페이지네이션 적용. 서버사이드 필터링

### Risk 4: DnD + React 19 호환성

**설명:** @dnd-kit과 React 19 Server Components 환경의 호환성
**대응:** options/page.tsx에 "use client" 지시어 적용. DnD 관련 컴포넌트는 모두 클라이언트 컴포넌트로 구현

---

## shadcn Installation

```bash
cd /home/innojini/dev/widget.creator/apps/admin
pnpm dlx shadcn@latest add sheet alert collapsible
```

---

## File Impact Summary

### New Files (예상 25+ 파일)

| Category | Count | Files |
|----------|-------|-------|
| Pages | 3 | options/page.tsx, pricing/page.tsx, constraints/page.tsx |
| Components | 20+ | widget-admin/ 디렉토리 하위 |
| tRPC Routers | 1 | widget-admin.ts 확장 (또는 별도 파일 분리) |
| Tests | 20+ | __tests__/widget-admin/ |

### Modified Files (예상 3 파일)

| File | Change |
|------|--------|
| widget-admin/page.tsx | StatCard, 필터 추가 |
| simulate/page.tsx | 통계 카드 추가 |
| trpc/routers/index.ts | 라우터 등록 |

---

*SPEC-WA-001 Implementation Plan v1.0.0 -- 2026-02-26*
