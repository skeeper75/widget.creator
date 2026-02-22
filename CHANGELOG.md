# CHANGELOG

이 프로젝트의 모든 주요 변경사항은 이 파일에 기록된다.

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.0.0/)를 따르며,
이 프로젝트는 [Semantic Versioning](https://semver.org/lang/ko/)을 준수한다.

## [Unreleased]

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

[Unreleased]: https://github.com/skeeper75/widget.creator/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/skeeper75/widget.creator/releases/tag/v0.1.0
