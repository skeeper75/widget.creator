# SPEC-DB-006 Implementation Plan

---
spec_id: SPEC-DB-006
version: 1.0.0
methodology: hybrid (TDD for new code, DDD for existing code modifications)
---

## 1. 구현 단계

### Phase 1: DB 마이그레이션 (Primary Goal)

4개 신규 가격 테이블 + 2개 기존 테이블 ALTER + 1개 할인 템플릿 테이블 생성

#### Step 1-1: 신규 가격 테이블 스키마 작성

- **파일**: `packages/db/src/schema/widget/04-binding-cost.ts`
- **파일**: `packages/db/src/schema/widget/04-imposition-rule.ts`
- **파일**: `packages/db/src/schema/widget/04-sticker-price.ts`
- **파일**: `packages/db/src/schema/widget/04-acrylic-price.ts`
- **참조 패턴**: 기존 `04-print-cost-base.ts` 스타일 준수
- **접근법**: Drizzle ORM pgTable 정의 + export 타입

#### Step 1-2: 기존 테이블 컬럼 추가

- **파일**: `packages/db/src/schema/widget/02-products.ts`
  - `product_class` varchar(20) DEFAULT 'manufactured' 추가
  - `fixed_price` decimal(12,2) nullable 추가
- **파일**: `packages/db/src/schema/widget/02-recipe-option-bindings.ts`
  - `selection_mode` varchar(10) DEFAULT 'single' 추가
  - `max_selections` integer nullable 추가

#### Step 1-3: 할인 템플릿 테이블

- **파일**: `packages/db/src/schema/widget/04-discount-templates.ts`
- **구조**: JSONB discount_rules 저장

#### Step 1-4: index.ts 업데이트 & Drizzle 마이그레이션

- **파일**: `packages/db/src/schema/widget/index.ts` -- 신규 테이블 export 추가
- **파일**: `packages/db/src/schema/index.ts` -- 필요시 업데이트
- **마이그레이션**: `drizzle/XXXX_add_price_data_tables.sql` 생성

### Phase 2: tRPC 라우터 (Secondary Goal)

각 신규 테이블에 대한 CRUD API 구현

#### Step 2-1: 가격 테이블 CRUD 라우터

- **파일**: `apps/web/app/api/trpc/routers/binding-cost.router.ts`
- **파일**: `apps/web/app/api/trpc/routers/imposition-rule.router.ts`
- **파일**: `apps/web/app/api/trpc/routers/sticker-price.router.ts`
- **파일**: `apps/web/app/api/trpc/routers/acrylic-price.router.ts`
- **참조 패턴**: 기존 `apps/web/app/api/trpc/utils/create-crud-router.ts` 활용
- **필수 기능**: 목록 조회(필터/페이지네이션), 단건 CRUD, 벌크 upsert

#### Step 2-2: 할인 템플릿 라우터

- **파일**: `apps/web/app/api/trpc/routers/discount-template.router.ts`
- **기능**: 템플릿 CRUD + 상품 적용 API
- **상품 적용 로직**: 템플릿 -> qty_discount 일괄 삽입 (트랜잭션)

#### Step 2-3: 수량구간 충돌 검증 유틸

- **파일**: `apps/web/app/api/trpc/utils/qty-range-validator.ts`
- **기능**: 동일 키 내 qty_min~qty_max 겹침 검증
- **적용 대상**: binding_cost, sticker_price, acrylic_price, qty_discount 등 모든 수량구간 테이블

#### Step 2-4: CSV 벌크 임포트 API

- **파일**: `apps/web/app/api/trpc/routers/price-import.router.ts`
- **기능**: CSV 파싱 -> 스키마 매핑 -> 미리보기 -> 트랜잭션 삽입
- **충돌 처리**: 덮어쓰기/건너뛰기/취소 모드

#### Step 2-5: 메인 라우터 통합

- **파일**: `apps/web/app/api/trpc/router.ts` -- 신규 라우터 등록

### Phase 3: Admin UI (Secondary Goal)

가격 데이터 관리 페이지

#### Step 3-1: 가격 관리 페이지 레이아웃

- **파일**: `apps/admin/src/app/(dashboard)/pricing/data/page.tsx`
- **구조**: 탭 기반 (제본비 | 판걸이수 | 스티커 | 아크릴 | 할인템플릿)
- **참조**: 기존 `apps/admin/src/app/(dashboard)/pricing/` 구조

#### Step 3-2: 인라인 편집 테이블 컴포넌트

- **파일**: `apps/admin/src/components/tables/editable-price-table.tsx`
- **기능**: 셀 클릭 -> 인라인 편집 -> 저장/취소
- **라이브러리**: TanStack Table (기존 프로젝트 사용 여부 확인 필요)

#### Step 3-3: CSV 임포트 모달

- **파일**: `apps/admin/src/components/modals/csv-import-modal.tsx`
- **기능**: 파일 드래그앤드롭 -> 파싱 -> 미리보기 -> 실행

#### Step 3-4: 할인 템플릿 관리 UI

- **파일**: `apps/admin/src/app/(dashboard)/pricing/templates/page.tsx`
- **기능**: 템플릿 CRUD + 상품 적용 위저드

#### Step 3-5: 가격 미리보기 패널

- **파일**: `apps/admin/src/components/pricing/price-preview-panel.tsx`
- **기능**: 옵션 선택 -> 실시간 가격 계산 결과 표시
- **연동**: SPEC-WB-004의 pricing/calculate API 호출

### Phase 4: 테스트 (Final Goal)

#### Step 4-1: 스키마 테스트

- **파일**: `packages/db/__tests__/schema/binding-cost.test.ts`
- **파일**: `packages/db/__tests__/schema/imposition-rule.test.ts`
- **파일**: `packages/db/__tests__/schema/sticker-price.test.ts`
- **파일**: `packages/db/__tests__/schema/acrylic-price.test.ts`
- **파일**: `packages/db/__tests__/schema/discount-templates.test.ts`

#### Step 4-2: API 테스트

- **파일**: `apps/web/__tests__/pricing/binding-cost.test.ts`
- **파일**: `apps/web/__tests__/pricing/price-import.test.ts`
- **파일**: `apps/web/__tests__/pricing/qty-range-validator.test.ts`

#### Step 4-3: 통합 테스트

- 가격 계산 엔진이 신규 테이블 데이터를 올바르게 조회하는지 검증
- 템플릿 적용 후 qty_discount 데이터 정합성 검증
- selection_mode 'multi' 옵션의 가격 합산 검증

---

## 2. 기술 스택

| 구분 | 기술 | 버전 |
|------|------|------|
| ORM | Drizzle ORM | 프로젝트 기존 버전 |
| API | tRPC | 프로젝트 기존 버전 |
| Validation | Zod | 프로젝트 기존 버전 |
| Admin UI | Next.js (App Router) | 프로젝트 기존 버전 |
| UI Components | 프로젝트 기존 컴포넌트 | - |
| CSV Parsing | papaparse 또는 csv-parse | 최신 안정 버전 (구현 시 확인) |
| Testing | Vitest | 프로젝트 기존 버전 |
| DB | PostgreSQL | 프로젝트 기존 버전 |

---

## 3. 리스크 분석

### R1: 템플릿 시스템 복잡도

- **리스크**: `apply_discount_template` 액션이 기존 ECA 8종 액션 체계에 영향
- **완화**: constraint_templates의 actions_pattern에 추가하는 형태로, 기존 런타임 평가 로직에 최소 변경
- **영향도**: 중간

### R2: 멀티셀렉트 하위 호환성

- **리스크**: selection_mode 추가 시 기존 위젯 런타임(SPEC-WB-006)에 영향
- **완화**: 기본값 'single' 유지, 런타임 코드에서 selection_mode 체크 추가 필요
- **영향도**: 중간

### R3: 수량구간 충돌 검증 성능

- **리스크**: 대량 데이터 벌크 임포트 시 O(n^2) 비교 가능성
- **완화**: DB 레벨 CHECK CONSTRAINT 또는 인덱스 기반 검증으로 최적화
- **영향도**: 낮음

### R4: product_class 마이그레이션

- **리스크**: 기존 모든 상품에 product_class='manufactured' 적용 시 대량 UPDATE
- **완화**: DEFAULT 값을 활용하여 ALTER TABLE만으로 처리 (UPDATE 불필요)
- **영향도**: 낮음

### R5: CSV 임포트 데이터 품질

- **리스크**: Excel에서 추출한 CSV의 데이터 형식 불일치 (빈 셀, 잘못된 타입 등)
- **완화**: Zod 스키마 기반 행 단위 검증 + 오류 행 개별 보고
- **영향도**: 중간

---

## 4. 참조 구현 패턴

### 4.1 Drizzle 스키마 패턴

기존 `packages/db/src/schema/widget/04-print-cost-base.ts`를 참조:
- pgTable 정의
- serial PK
- 외래키 참조 (필요시)
- decimal(12,2) 가격 필드
- is_active boolean
- created_at/updated_at timestamptz
- 복합 인덱스

### 4.2 tRPC CRUD 패턴

기존 `apps/web/app/api/trpc/utils/create-crud-router.ts`를 참조:
- Zod input 스키마
- publicProcedure / protectedProcedure
- 페이지네이션 (cursor 또는 offset)
- 트랜잭션 wrapping

### 4.3 Admin UI 패턴

기존 `apps/admin/src/app/(dashboard)/pricing/` 페이지를 참조:
- 탭 레이아웃
- tRPC hooks (useQuery, useMutation)
- 폼 컴포넌트 (Zod + react-hook-form)

---

## 5. 마일스톤 요약

| Priority | Phase | 범위 | 산출물 |
|----------|-------|------|--------|
| Primary Goal | Phase 1: DB 마이그레이션 | 5개 신규 + 2개 ALTER | Drizzle 스키마 + SQL 마이그레이션 |
| Secondary Goal | Phase 2: tRPC 라우터 | CRUD + 벌크 임포트 + 검증 | 6개 라우터 + 유틸 |
| Secondary Goal | Phase 3: Admin UI | 가격 관리 + 템플릿 + 미리보기 | 5개 페이지/컴포넌트 |
| Final Goal | Phase 4: 테스트 | 스키마 + API + 통합 | 85%+ 커버리지 |

---

## 6. Expert Consultation 권장

### Backend Expert (expert-backend)

권장 컨설팅 영역:
- 수량구간 충돌 검증 알고리즘 최적화
- CSV 벌크 임포트 트랜잭션 전략
- apply_discount_template 액션의 ECA 런타임 통합 설계
- 신규 가격 테이블과 기존 pricing engine 연동 인터페이스

### Frontend Expert (expert-frontend)

권장 컨설팅 영역:
- 인라인 편집 테이블 컴포넌트 설계 (TanStack Table 또는 대안)
- CSV 임포트 모달 UX 흐름
- 멀티셀렉트 옵션의 위젯 UI 표현

---

*SPEC-DB-006 Implementation Plan v1.0.0*
*Methodology: Hybrid (TDD for new + DDD for existing)*
