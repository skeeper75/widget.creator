# Widget Creator - 후니프린팅 위젯 빌더

![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)
![pnpm](https://img.shields.io/badge/pnpm-9.x-F69220?logo=pnpm)
![Turborepo](https://img.shields.io/badge/Turborepo-2.x-EF4444?logo=turborepo)
![Vitest](https://img.shields.io/badge/Vitest-3.x-6E9F18?logo=vitest)
![Tests](https://img.shields.io/badge/Tests-309%20passing-brightgreen)

## 프로젝트 개요

**Widget Creator**는 이커머스 쇼핑몰 페이지에 삽입 가능한 인쇄 주문 견적 위젯을 생성하고 관리하는 플랫폼이다. 쇼핑몰 운영자가 스크립트 태그 하나로 자사 쇼핑몰에 인쇄 주문 위젯을 삽입하면, 방문 고객이 인쇄 옵션을 선택하고 실시간 자동 견적을 받을 수 있다.

해외에는 Shopify 인쇄 플러그인(Printful, Printify, Gelato 등)이 존재하지만, 국내 인쇄 시장에 특화된 동등한 솔루션이 없다. Widget Creator는 국내 인쇄 산업의 복잡한 옵션 체계(용지, 인쇄방식, 후가공 등)와 가격 구조를 반영한 최초의 국산 인쇄 위젯 솔루션을 목표로 한다. WowPress(와우프레스) Open API를 벤치마킹하여 326개 상품, 47개 카테고리의 인쇄 지식 데이터베이스를 구축하고, 그 위에서 동작하는 상품 옵션 엔진 및 가격 계산기를 구현하였다.

## 아키텍처

```
widget.creator/                  # 모노레포 루트
├── packages/
│   ├── shared/                  # @widget-creator/shared
│   │   └── src/
│   │       ├── types/           # 44개 TypeScript 타입 정의
│   │       ├── schemas/         # Zod 검증 스키마 (WowPress JSON)
│   │       └── parsers/         # WowPress 카탈로그 파서
│   └── pricing-engine/          # @widget-creator/pricing-engine
│       └── src/
│           ├── option-engine.ts # 옵션 우선순위 체인 엔진
│           ├── calculator.ts    # 비선형 수량 가격 계산기
│           ├── delivery-calculator.ts
│           └── constraints/     # 제약 조건 평가기 (7종)
├── prisma/
│   ├── schema.prisma            # 10개 DB 모델
│   └── seed.ts                  # 카탈로그 시드 데이터
└── ref/wowpress/catalog/        # 원본 WowPress 카탈로그 JSON
```

패키지 의존 관계:

```
pricing-engine  -->  shared  -->  (zod)
                -->  (prisma client)
```

## 빠른 시작

### 사전 요구사항

- Node.js 22.x LTS 이상
- pnpm 9.x
- PostgreSQL 16.x

### 설치

```bash
# 저장소 클론 후 의존성 설치
pnpm install
```

### 데이터베이스 설정

```bash
# 환경 변수 설정 (.env 파일 생성)
DATABASE_URL="postgresql://user:password@localhost:5432/widget_creator"

# Prisma 마이그레이션 실행
pnpm prisma:migrate

# 카탈로그 시드 데이터 투입 (326개 상품, 47개 카테고리)
pnpm dlx prisma db seed
```

### 테스트 실행

```bash
# 전체 테스트 실행 (309개)
pnpm test

# 감시 모드
pnpm test:watch

# 커버리지 리포트
pnpm test:coverage
```

## 패키지 구성

| 패키지 | 이름 | 설명 |
|--------|------|------|
| `packages/shared` | `@widget-creator/shared` | 공유 타입, Zod 스키마, 카탈로그 파서 |
| `packages/pricing-engine` | `@widget-creator/pricing-engine` | 옵션 엔진, 가격 계산기, 제약 조건 평가기 |

## 주요 기능

### 옵션 우선순위 체인 엔진 (OptionEngine)

인쇄 상품의 옵션 선택은 우선순위 체인에 따라 상위 옵션이 변경되면 하위 옵션이 자동으로 초기화된다:

```
jobPresetNo -> sizeNo -> paperNo -> optNo -> colorNo -> colorNoAdd
```

상위 옵션 선택 시 하위 옵션에 대한 제약 조건(req_* / rst_*)을 평가하여 유효한 옵션만 제공한다.

### 가격 계산기 (PriceCalculator)

- 비선형 수량 구간별 가격 (예: 100장 이하, 100-500장, 500장 이상)
- 후가공 추가 비용 계산
- 급행 주문 할증 처리

### 배송 계산기 (DeliveryCalculator)

- 배송 방법별 기본 요금
- 지역 추가 요금 (도서산간 등)
- 회원 등급별 무료 배송 적용

### 제약 조건 평가 (Constraints)

`req_*` (7종) / `rst_*` (8종) 제약 조건을 파싱하고 평가하여 옵션 간 유효성을 검증한다.

### 표지 처리 (CoverHandler)

- `pjoin=0`: 통합 상품 (앞/뒤표지 + 내지 단일 제품)
- `pjoin=1`: 분리 상품 (표지와 내지를 각각 선택)

### 카탈로그 파서 (CatalogParser)

WowPress 카탈로그 JSON에서 326개 상품을 파싱하며, 오류 응답 3개(40078, 40089, 40297)는 제외된다.

## 기술 스택

| 분류 | 기술 | 버전 |
|------|------|------|
| 언어 | TypeScript (strict mode) | 5.7 |
| 패키지 매니저 | pnpm workspaces | 9.x |
| 모노레포 | Turborepo | 2.x |
| ORM | Prisma | 6.x |
| 데이터베이스 | PostgreSQL (JSONB 활용) | 16.x |
| 검증 | Zod | 3.x |
| 테스트 | Vitest | 3.x |

## 개발 참고사항

- **TypeScript strict mode**: 전체 코드베이스에 걸쳐 TypeScript strict mode가 적용되어 있으며, 빌드 시 타입 에러 0건을 유지한다.
- **테스트 커버리지**: 309개 테스트 전체 통과. 단위 테스트는 Vitest로 작성되었으며 packages/shared와 packages/pricing-engine에 분산되어 있다.
- **ESM**: 모든 패키지는 `"type": "module"`로 설정된 ES Module 형식이다.
- **Zod 스키마 passthrough**: WowPress 카탈로그 JSON의 실제 데이터 특성상 Zod 스키마는 `passthrough()`를 사용하여 알 수 없는 필드를 허용한다.

## 라이선스

Private - 후니프린팅 내부 프로젝트
