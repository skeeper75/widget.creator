# CHANGELOG

이 프로젝트의 모든 주요 변경사항은 이 파일에 기록된다.

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.0.0/)를 따르며,
이 프로젝트는 [Semantic Versioning](https://semver.org/lang/ko/)을 준수한다.

## [Unreleased]

### Fixed
- **SPEC-SEED-001**: Fix seed data correctness bugs in `scripts/seed.ts`
  - Fix `isActive`: internal-only products now correctly set to `is_active=false`
  - Fix `mesRegistered`: use `!!product.MesItemCd` instead of `product.shopbyId !== null`
  - Fix `edicusCode`: now applied to ALL products (not just those with shopbyId)
  - Fix slug: use `MesItemCd.toLowerCase()` for URL-safe unique slugs
  - Rewrite `seedCategories` with 2-level SHEET_CATEGORY_MAP hierarchy
  - Fix 4-priority category lookup in `seedProductsAndMes`
  - All 5 acceptance criteria verified: 221 products, shopby_id=NULL, 5 inactive, correct edicus_code format, depth=1 categories

### Added
- **SPEC-SEED-002**: Comprehensive DB Seeding Pipeline - Zod validation and transaction safety
  - New `scripts/lib/schemas.ts`: Zod schemas for all seed JSON inputs (PaperJsonSchema, GoodsJsonSchema, OptionConstraintsJsonSchema, DigitalPrintJsonSchema, BindingJsonSchema, FinishingJsonSchema) with generic `loadAndValidate<T>()` helper
  - `scripts/seed.ts` - `seedGoodsFixedPrices()`: Zod validation on goods.json load, price=0 skip logic with warning counter, transaction-wrapped DELETE+INSERT
  - Drizzle `__drizzle_migrations` tracking synced (migrations 0001-0003 registered); `drizzle-kit migrate` runs cleanly
  - 57 new unit tests across 3 files: `seed-goods-prices.test.ts` (21), `seed-transactions.test.ts` (11), `seed-schemas.test.ts` (25)
- **SPEC-DATA-003**: Integrated Data Pipeline and Version Management Strategy (`scripts/import/`)
  - MES v5 JSON import pipeline: option_definitions (30 records), option_choices (deduplicated), product_options (723 records), product_editor_mapping (111 records), option_dependencies (~300 records)
  - Version management: SHA-256 source file checksums, `data_import_log` table for import history tracking, idempotent re-run support
  - Base importer pattern with `INSERT ... ON CONFLICT ... DO UPDATE` for all tables
  - Cross-reference validator and count validator for data integrity verification
  - CLI interface: `--force`, `--dry-run`, `--table`, `--domain`, `--validate-only` flags
  - Drizzle schema: `packages/shared/src/db/schema/huni-import-log.schema.ts`
  - 61 unit tests, all passing
- **SPEC-WIDGET-INTG-001**: External System Integration Layer (`packages/shared/src/events/`, `packages/shared/src/integration/`)
  - Domain Event Bus: In-process pub/sub with 12 typed event categories, fire-and-forget, handler error isolation, dead letter queue
  - Integration Adapter Pattern: Pluggable adapter architecture with circuit breaker (CLOSED/OPEN/HALF_OPEN), exponential backoff retry, health checks
  - Shopby Adapter: Bidirectional product sync and order reception with data mapper
  - MES Adapter: Production dispatch with option-to-MES-code translation, status tracking (제작대기→제작중→제작완료→출고완료)
  - Edicus Adapter: Editor configuration, design save/render pipeline with edicus_code derivation
  - 16 Integration API endpoints: Shopby (5), MES (5), Edicus (6) under `/api/v1/integration/`
  - 184 unit tests across 11 test files

## [0.5.0] - 2026-02-23

### Added

- Widget Builder Admin Dashboard (SPEC-WIDGET-ADMIN-001)
- apps/admin: Next.js 15.x admin application with full CRUD for all 26 data tables
- 7 special editor components: TreeEditor, MatrixEditor, SpreadsheetEditor, ConstraintBuilder, ProductConfigurator, KanbanBoard, VisualMapper
- 27 tRPC domain routers with protectedProcedure authentication
- NextAuth.js v5 credentials-based admin authentication
- Huni design tokens (#5538B6 primary, Noto Sans, 4px spacing grid)
- 23 shadcn/ui components with Tailwind CSS v4
- TanStack Table v8 DataTable with sort/filter/pagination
- TanStack Virtual for SpreadsheetEditor (10,000 row virtualization)
- dnd-kit for TreeEditor, KanbanBoard, ProductConfigurator drag-and-drop
- 727 tests with comprehensive logic coverage

---

## [0.4.0] - 2026-02-23

### Added

#### Widget Builder API Layer (SPEC-WIDGET-API-001)

- `apps/web`: Next.js 15.x App Router 기반 새 패키지 (pnpm workspace 추가)
- **Catalog API** (`/api/v1/catalog/`) - 9개 엔드포인트: 카테고리 트리/상세, 상품 목록/상세/사이즈/용지/옵션/제약조건/의존성
- **Pricing API** (`/api/v1/pricing/`) - 4개 엔드포인트: 견적 계산, 빠른 가격 미리보기, 수량별 가격표, 고정 가격 조회
- **Orders API** (`/api/v1/orders/`) - 3개 엔드포인트: 주문 생성, 목록 조회, 상세 조회
- **Widget API** (`/api/widget/`) - 2개 엔드포인트: 위젯 설정, 임베드 스크립트
- **Integration API** (`/api/v1/integration/`) - 12개 엔드포인트: Shopby(4), MES(4), Edicus(4) 연동
- **Admin tRPC** (`/api/v1/admin/trpc/`) - 16개 도메인 라우터 (category, product, size, paper, material, printMode, postProcess, binding, priceTable, priceTier, fixedPrice, option, constraint, dependency, order, dashboard)
- `createCrudRouter` 제네릭 팩토리 - list, getById, create, update, softDelete, bulkUpdate 표준 CRUD 자동 생성
- RFC 7807 Problem Details 에러 핸들링 (`withMiddleware` HOF 컴포지션 패턴)
- Widget Token (JWT) / Admin JWT (NextAuth.js v5) / API Key 3종 인증 레이어
- 범위별 CORS 정책 (Widget Token allowed_origins, Admin only, Server-to-server)
- 인증 방식별 In-memory Sliding Window Rate Limiting (Widget Token 100 req/min, Admin JWT 5000 req/min, API Key 1000 req/min, 미인증 30 req/min)
- Drizzle ORM 스키마 추가: `huni-orders.schema.ts` (orders, orderStatusHistory, orderDesignFiles), `huni-widgets.schema.ts` (widgets)
- 341개 단위 테스트 (Vitest), 93.97% statement coverage (tRPC 제외)

---

## [0.2.0] - 2026-02-22

### Added

#### Drizzle ORM 스키마 (SPEC-INFRA-001)

- `packages/shared/src/db/index.ts`: postgres.js 기반 Drizzle 인스턴스 및 DB 연결
- `packages/shared/src/db/schema/huni-catalog.schema.ts`: Huni 카탈로그 도메인 스키마 (HuniCategory, HuniProduct, HuniProductSize - 3 models)
- `packages/shared/src/db/schema/huni-materials.schema.ts`: Huni 소재 도메인 스키마 (HuniPaper, HuniMaterial, HuniPaperProductMapping - 3 models)
- `packages/shared/src/db/schema/huni-processes.schema.ts`: Huni 공정 도메인 스키마 (HuniPrintMode, HuniPostProcess, HuniBinding, HuniImpositionRule - 4 models)
- `packages/shared/src/db/schema/huni-pricing.schema.ts`: Huni 가격 도메인 스키마 (HuniPriceTable, HuniPriceTier, HuniFixedPrice, HuniPackagePrice, HuniFoilPrice, HuniLossQuantityConfig - 6 models)
- `packages/shared/src/db/schema/huni-options.schema.ts`: Huni 옵션 도메인 스키마 (HuniOptionDefinition, HuniProductOption, HuniOptionChoice, HuniOptionConstraint, HuniOptionDependency - 5 models)
- `packages/shared/src/db/schema/huni-integration.schema.ts`: Huni MES/에디터 연동 도메인 스키마 (HuniMesItem, HuniMesItemOption, HuniProductMesMapping, HuniProductEditorMapping, HuniOptionChoiceMesMapping - 5 models)
- `packages/shared/src/db/schema/relations.ts`: 전체 도메인 30+ Drizzle 관계 정의 (cascade delete 포함)
- `packages/shared/src/db/schema/index.ts`: 모든 스키마 re-export
- `drizzle/0000_silky_sentry.sql`: Huni 도메인 26개 테이블 CREATE TABLE + 48개 인덱스 마이그레이션
- `drizzle/0001_drop_wowpress.sql`: WowPress 10개 테이블 DROP 수동 SQL
- `drizzle.config.ts`: Drizzle Kit 루트 설정
- `scripts/seed.ts`: Drizzle API 기반 시드 스크립트
- `ref/prisma/`: 기존 Prisma 스키마 및 시드 파일 아카이브

### Changed

- `packages/shared/package.json`: drizzle-orm, postgres, drizzle-zod 의존성 추가
- `packages/shared/src/index.ts`: db export 추가 (Drizzle 인스턴스 및 스키마)
- `package.json`: drizzle-kit, tsx 개발 의존성 추가

### Removed

- `@prisma/client` 런타임 의존성 제거 (Drizzle ORM으로 교체)
- `prisma` 개발 의존성 제거
- `prisma/seed.ts`: WowPress 시더 삭제 (REQ-W02)
- `prisma/__tests__/schema.test.ts`: WowPress 스키마 테스트 삭제 (REQ-W03)
- `prisma/__tests__/schema-normalized.test.ts`: WowPress 정규화 테스트 삭제
- `prisma/__tests__/seed.test.ts`: WowPress 시드 테스트 삭제

---

## [0.1.0] - 2026-02-22

### Added

#### 모노레포 기반 구조 (Monorepo Infrastructure)

- pnpm workspaces 기반 모노레포 구성
- Turborepo 빌드 파이프라인 설정 (`turbo.json`)
- 루트 공유 TypeScript 설정 (`tsconfig.base.json`)
- 루트 공유 Vitest 설정 (`vitest.config.ts`)

#### 공유 패키지 - 타입 정의 (`@widget-creator/shared`)

- `packages/shared/src/types/print-product.ts`: 인쇄 상품 DB 모델 10종 TypeScript 인터페이스
  - `ProductCategory`, `PrintProduct`, `ProductSize`, `ProductPaper`
  - `ProductColor`, `ProductPrintMethod`, `ProductPostProcess`
  - `ProductOrderQty`, `PricingTable`, `DeliveryInfo`
- `packages/shared/src/types/option-types.ts`: 옵션 엔진 타입
  - `OptionSelection`, `AvailableOptions`, `ConstraintViolation`
  - `SizeOption`, `PaperOption`, `ColorOption`, `PrintMethodOption`
  - `PostProcessGroup`, `QuantityOption`
- `packages/shared/src/types/pricing-types.ts`: 가격 및 배송 타입
- `packages/shared/src/types/constraint-types.ts`: `req_*` / `rst_*` 제약 조건 타입 (15종)

#### 공유 패키지 - Zod 스키마 (`@widget-creator/shared`)

- `packages/shared/src/schemas/wowpress-raw.schema.ts`: WowPress 카탈로그 JSON 검증 스키마 9종
  - `ProductListResponseSchema`, `ProductDetailResponseSchema`
  - `SizeinfoSchema`, `PaperinfoSchema`, `ColorinfoSchema`
  - `OptioninfoSchema`, `PrsjobinfoSchema`, `AwkjobinfoSchema`
  - `DeliverinfoSchema`

#### 공유 패키지 - 카탈로그 파서 (`@widget-creator/shared`)

- `packages/shared/src/parsers/catalog-parser.ts`: WowPress 카탈로그 JSON 파서
  - `ref/wowpress/catalog/` 디렉터리에서 326개 상품 파싱
  - 오류 응답 상품 3개(40078, 40089, 40297) 자동 제외
  - 카테고리 계층 구조 빌드

#### 가격 엔진 패키지 (`@widget-creator/pricing-engine`)

- `packages/pricing-engine/src/option-engine.ts`: 옵션 우선순위 체인 엔진
  - Priority chain: `jobPresetNo → sizeNo → paperNo → optNo → colorNo → colorNoAdd`
  - 상위 옵션 변경 시 하위 옵션 자동 초기화 (cascading reset)
  - `getAvailableOptions()`, `selectOption()`, `validateSelection()` API
- `packages/pricing-engine/src/cover-handler.ts`: 표지 처리기
  - `pjoin=0` (통합 상품) / `pjoin=1` (분리 상품) 구분 처리
- `packages/pricing-engine/src/quantity-resolver.ts`: 수량 해석기
  - common-type 및 combination-type 수량 해석
- `packages/pricing-engine/src/non-standard-handler.ts`: 비정형 규격 검증
  - `req_width` / `req_height` 기반 사용자 지정 규격 유효성 검사
- `packages/pricing-engine/src/calculator.ts`: 비선형 수량 가격 계산기
  - 구간별 단가 적용, 후가공 추가 비용, 급행 할증
- `packages/pricing-engine/src/delivery-calculator.ts`: 배송비 계산기
  - 배송 방법별 기본 요금, 지역 추가 요금, 회원 등급 무료 배송

#### 가격 엔진 - 제약 조건 평가기

- `packages/pricing-engine/src/constraints/requirement-parser.ts`: `req_*` 7종 파서
- `packages/pricing-engine/src/constraints/restriction-parser.ts`: `rst_*` 8종 파서
- `packages/pricing-engine/src/constraints/size-constraint.ts`: 규격 필터링 및 평가
- `packages/pricing-engine/src/constraints/paper-constraint.ts`: 용지 필터링 및 평가
- `packages/pricing-engine/src/constraints/color-constraint.ts`: 색상 필터링 및 평가
- `packages/pricing-engine/src/constraints/print-method-constraint.ts`: 인쇄방식 필터링 및 평가
- `packages/pricing-engine/src/constraints/post-process-constraint.ts`: 후가공 4종 req + 6종 rst, 상호 배제 처리

#### 데이터베이스 스키마 (Prisma)

- `prisma/schema.prisma`: PostgreSQL 16 + JSONB 활용 스키마 (모델 10개)
  - `ProductCategory`, `PrintProduct`, `ProductSize`, `ProductPaper`
  - `ProductColor`, `ProductPrintMethod`, `ProductPostProcess`
  - `ProductOrderQty`, `PricingTable`, `DeliveryInfo`
- `prisma/seed.ts`: `ref/wowpress/catalog/`에서 벌크 시드 (326개 상품, 47개 카테고리)

#### 테스트

- 총 309개 단위 테스트 (Vitest)
- `packages/shared/__tests__/`: 타입 정의, 스키마, 파서 테스트
- `packages/pricing-engine/__tests__/`: 옵션 엔진, 제약 조건, 계산기 테스트
- TypeScript 컴파일 에러 0건

[Unreleased]: https://github.com/skeeper75/widget.creator/compare/v0.5.0...HEAD
[0.5.0]: https://github.com/skeeper75/widget.creator/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/skeeper75/widget.creator/compare/v0.2.0...v0.4.0
[0.2.0]: https://github.com/skeeper75/widget.creator/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/skeeper75/widget.creator/releases/tag/v0.1.0
