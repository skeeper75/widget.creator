# Widget Creator - 후니프린팅 위젯 빌더

![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript)
![pnpm](https://img.shields.io/badge/pnpm-9.x-F69220?logo=pnpm)
![Turborepo](https://img.shields.io/badge/Turborepo-2.x-EF4444?logo=turborepo)
![Vitest](https://img.shields.io/badge/Vitest-3.x-6E9F18?logo=vitest)
![Tests](https://img.shields.io/badge/Tests-341%20passing-brightgreen)
![Coverage](https://img.shields.io/badge/Coverage-93.97%25-brightgreen)

## 프로젝트 개요

**Widget Creator**는 이커머스 쇼핑몰 페이지에 삽입 가능한 인쇄 주문 견적 위젯을 생성하고 관리하는 플랫폼이다. 쇼핑몰 운영자가 스크립트 태그 하나로 자사 쇼핑몰에 인쇄 주문 위젯을 삽입하면, 방문 고객이 인쇄 옵션을 선택하고 실시간 자동 견적을 받을 수 있다.

해외에는 Shopify 인쇄 플러그인(Printful, Printify, Gelato 등)이 존재하지만, 국내 인쇄 시장에 특화된 동등한 솔루션이 없다. Widget Creator는 국내 인쇄 산업의 복잡한 옵션 체계(용지, 인쇄방식, 후가공 등)와 가격 구조를 반영한 최초의 국산 인쇄 위젯 솔루션을 목표로 한다. WowPress(와우프레스) Open API를 벤치마킹하여 326개 상품, 47개 카테고리의 인쇄 지식 데이터베이스를 구축하고, 그 위에서 동작하는 상품 옵션 엔진 및 가격 계산기를 구현하였다.

## 아키텍처

```
widget.creator/                  # 모노레포 루트
├── apps/
│   ├── web/                     # Next.js 15.x App Router (API 서버)
│   │   └── app/api/
│   │       ├── v1/
│   │       │   ├── catalog/     # 9개 엔드포인트 (Widget Token 인증)
│   │       │   ├── pricing/     # 4개 엔드포인트 (Widget Token 인증)
│   │       │   ├── orders/      # 3개 엔드포인트 (JWT/API Key 인증)
│   │       │   ├── admin/trpc/  # 16개 tRPC 라우터 (Admin JWT 인증)
│   │       │   └── integration/ # 12개 엔드포인트 (API Key 인증)
│   │       ├── widget/          # 2개 엔드포인트 (Public)
│   │       └── _lib/            # 미들웨어, 스키마, 유틸리티
│   └── admin/                   # Next.js 15.x Admin Dashboard (http://localhost:3001)
│       └── src/
│           ├── app/             # App Router (26개 CRUD 페이지)
│           ├── components/
│           │   ├── editors/     # 7개 특수 에디터 (TreeEditor, MatrixEditor 등)
│           │   ├── data-table/  # TanStack Table v8 래퍼 컴포넌트
│           │   └── common/      # 공통 UI 컴포넌트
│           └── lib/trpc/
│               └── routers/     # 27개 tRPC 도메인 라우터
├── packages/
│   ├── shared/                  # @widget-creator/shared
│   │   └── src/
│   │       ├── types/           # 44개 TypeScript 타입 정의
│   │       ├── schemas/         # Zod 검증 스키마 (WowPress JSON)
│   │       ├── parsers/         # WowPress 카탈로그 파서
│   │       └── db/schema/       # Drizzle ORM 스키마 (30개 테이블)
│   └── pricing-engine/          # @widget-creator/pricing-engine
│       └── src/
│           ├── option-engine.ts # 옵션 우선순위 체인 엔진
│           ├── calculator.ts    # 비선형 수량 가격 계산기
│           ├── delivery-calculator.ts
│           └── constraints/     # 제약 조건 평가기 (7종)
├── drizzle/                     # Drizzle ORM 마이그레이션
└── ref/wowpress/catalog/        # 원본 WowPress 카탈로그 JSON
```

패키지 의존 관계:

```
apps/web   -->  packages/shared  -->  (drizzle-orm, zod)
           -->  packages/pricing-engine

apps/admin -->  packages/shared
           -->  (tRPC, NextAuth.js v5, shadcn/ui, TanStack Table v8)

pricing-engine  -->  shared
```

### API 아키텍처 (하이브리드 REST + tRPC)

Widget Builder API Layer는 외부 소비자를 위한 REST API와 Admin 대시보드 전용 tRPC를 혼합한 하이브리드 아키텍처를 채택한다.

| API 범위 | 패턴 | 인증 | 목적 |
|---------|------|------|------|
| Catalog, Pricing | REST | Widget Token (JWT) | 위젯 SDK 및 외부 소비자 |
| Widget Quote & Orders | REST | Widget Token (JWT) | 위젯 런타임 견적 및 주문 |
| Orders | REST | JWT 또는 API Key | 주문 생성 및 조회 |
| Admin | tRPC 11.x | Admin JWT (NextAuth.js v5) | 관리자 대시보드 내부 API |
| Integration | REST | API Key | Shopby, MES, Edicus 연동 |
| Widget | REST | Public | 임베드 스크립트 및 위젯 설정 |

**미들웨어 파이프라인** (`withMiddleware` HOF 패턴):

```
요청 -> CORS -> Rate Limiting -> 인증 -> Zod 검증 -> 핸들러 -> RFC 7807 에러 변환 -> 응답
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

# Drizzle ORM 마이그레이션 실행
pnpm db:migrate

# 카탈로그 시드 데이터 투입 (326개 상품, 47개 카테고리)
pnpm db:seed

# MES JSON 데이터 임포트 파이프라인 (SPEC-DATA-003)
# option_definitions(30), option_choices, product_options(723), product_editor_mapping(111), option_dependencies(~300)
npx tsx scripts/import/index.ts

# 특정 도메인만 임포트
npx tsx scripts/import/index.ts --domain options

# 강제 재임포트 (버전 체크 건너뜀)
npx tsx scripts/import/index.ts --force

# 드라이런 (DB 쓰기 없이 파싱/검증만 실행)
npx tsx scripts/import/index.ts --dry-run
```

### 환경 변수

```bash
# 필수
DATABASE_URL="postgresql://user:password@localhost:5432/widget_creator"

# API 인증 (SPEC-WIDGET-API-001 추가)
WIDGET_TOKEN_SECRET="your-widget-token-secret-min-32-chars"
NEXTAUTH_SECRET="your-nextauth-secret-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"
```

### 개발 서버 실행

```bash
# apps/web API 서버 개발 모드 실행 (http://localhost:3000)
pnpm --filter @widget-creator/web dev

# apps/admin Admin Dashboard 개발 모드 실행 (http://localhost:3001)
pnpm --filter @widget-creator/admin dev

# 또는 Turborepo를 통해 전체 워크스페이스 실행
pnpm dev
```

### 테스트 실행

```bash
# 전체 테스트 실행 (341개, 93.97% statement coverage)
pnpm test

# 감시 모드
pnpm test:watch

# 커버리지 리포트
pnpm test:coverage
```

## 패키지 구성

| 패키지 | 이름 | 설명 |
|--------|------|------|
| `apps/web` | `@widget-creator/web` | Next.js 15.x API 서버 - REST + tRPC 하이브리드 API (45+ 엔드포인트) |
| `apps/admin` | `@widget-creator/admin` | Next.js 15.x Admin Dashboard - 26개 CRUD 테이블, 27개 tRPC 라우터, 7개 특수 에디터 |
| `packages/shared` | `@widget-creator/shared` | 공유 타입, Zod 스키마, 카탈로그 파서, Drizzle ORM 스키마 |
| `packages/pricing-engine` | `@widget-creator/pricing-engine` | 옵션 엔진, 가격 계산기, 제약 조건 평가기 |

## Admin Dashboard (SPEC-WIDGET-ADMIN-001)

후니프린팅 운영팀이 인쇄 상품, 소재, 공정, 가격, 옵션, MES 연동 데이터를 관리하는 풀스택 관리자 웹 애플리케이션.

**URL**: http://localhost:3001

### 주요 기능

- **26개 CRUD 테이블**: 카탈로그(3), 소재(3), 공정(4), 가격(6), 옵션(5), 연동(5)
- **27개 tRPC 도메인 라우터**: 모든 도메인에 대한 protectedProcedure 인증 적용
- **7개 특수 에디터 컴포넌트**:
  - `TreeEditor`: 카테고리 계층 구조 드래그 앤 드롭 편집
  - `MatrixEditor`: 용지-상품 매핑 55x45 그리드 토글
  - `SpreadsheetEditor`: 가격 단가 10,000행 가상화 스크롤 편집
  - `ConstraintBuilder`: 옵션 제약조건 IF-THEN 비주얼 빌더
  - `ProductConfigurator`: 상품별 옵션 구성 편집기
  - `KanbanBoard`: MES 옵션 매핑 상태 관리 (Pending / Mapped / Verified)
  - `VisualMapper`: 상품-MES 드래그 연결 시각화
- **NextAuth.js v5**: credentials 기반 관리자 인증
- **Huni 디자인 토큰**: Primary #5538B6, Noto Sans, 4px spacing grid
- **23개 shadcn/ui 컴포넌트**: Tailwind CSS v4 기반
- **727개 테스트**: 로직 커버리지 통과

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

## 위젯 런타임 API (SPEC-WB-006)

### Real-Time Auto-Quote Engine

위젯 클라이언트가 고객의 옵션 선택에 따라 실시간 견적을 얻기 위한 API 집합.

#### POST /api/widget/quote

통합 견적 API — 제약 조건 평가 + 가격 계산을 단일 호출로 처리.

**인증**: X-Widget-Token (Widget JWT)

**Request**:
```json
{
  "productId": 42,
  "selections": {
    "SIZE": "100x148mm",
    "PRINT_TYPE": "단면칼라",
    "PAPER": "아트지 250g",
    "FINISHING": ["무광PP"],
    "QUANTITY": 100
  }
}
```

**Response**:
```json
{
  "isValid": true,
  "uiActions": [
    {
      "type": "show_message",
      "level": "info",
      "message": "코팅 추천: 무광PP"
    }
  ],
  "pricing": {
    "printCost": 6500,
    "processCost": 1700,
    "subtotal": 8200,
    "discountRate": 0.03,
    "discountAmount": 246,
    "totalPrice": 7954,
    "pricePerUnit": 79.54
  },
  "violations": [],
  "addons": []
}
```

**성능**: <300ms 응답 시간 목표

#### GET /api/widget/products/:productKey/init

위젯 초기 데이터 로드 — 상품 정보, 레시피 구조, 제약 조건 규칙, 기본 견적.

**인증**: X-Widget-Token (Widget JWT)

**응답 필드**:
- `product`: 상품 정보
- `recipe`: 레시피 구조 (옵션 타입, 선택지, 순서)
- `constraintRules`: 클라이언트 평가용 json-rules-engine JSON
- `defaultQuote`: 기본 선택지 기준 견적가

#### POST /api/widget/orders

주문 생성 — 서버 재검증 + MES 생산지시 자동 전송.

**인증**: X-Widget-Token (Widget JWT)

**기능**:
- 선택 옵션 + 가격 스냅샷 저장 (JSONB)
- auto_add 상품 처리
- 가격 차이 감지 및 로깅
- MES 생산지시 fire-and-forget 전송 (있을 경우)
- 3회 재시도 지수 백오프

#### GET /api/widget/orders/:orderCode

주문 상태 조회 — MES 생산 진행 상황, 배송 정보 등.

**인증**: X-Widget-Token (Widget JWT)

**응답 필드**:
- `order`: 주문 상세
- `mesStatus`: MES 생산 상태 (pending, sent, confirmed, failed, not_linked)
- `statusHistory`: 주문 상태 변경 이력

## 기술 스택

| 분류 | 기술 | 버전 |
|------|------|------|
| 언어 | TypeScript (strict mode) | 5.7 |
| 패키지 매니저 | pnpm workspaces | 9.x |
| 모노레포 | Turborepo | 2.x |
| API 프레임워크 | Next.js App Router | 15.x |
| Type-Safe RPC | tRPC | 11.x |
| 인증 | NextAuth.js v5 | 5.x |
| ORM | Drizzle ORM | latest |
| 데이터베이스 | PostgreSQL (JSONB 활용) | 16.x |
| 검증 | Zod | 3.x |
| 테스트 | Vitest | 3.x |

## 개발 참고사항

- **TypeScript strict mode**: 전체 코드베이스에 걸쳐 TypeScript strict mode가 적용되어 있으며, 빌드 시 타입 에러 0건을 유지한다.
- **테스트 커버리지**: 341개 테스트 전체 통과, 93.97% statement coverage. 단위 테스트는 Vitest로 작성되었으며 packages/shared, packages/pricing-engine, apps/web에 분산되어 있다. tRPC 라우터 단위 테스트는 drizzle-zod의 실제 DB 의존성으로 인해 Phase 1로 이연되었다.
- **ESM**: 모든 패키지는 `"type": "module"`로 설정된 ES Module 형식이다.
- **Zod 스키마 passthrough**: WowPress 카탈로그 JSON의 실제 데이터 특성상 Zod 스키마는 `passthrough()`를 사용하여 알 수 없는 필드를 허용한다.
- **RFC 7807 에러 핸들링**: 모든 API 에러 응답은 Problem Details 표준을 따르며, `withMiddleware` HOF를 통해 일관되게 처리된다.
- **API Key DB 조회**: 현재 API Key 검증은 환경변수 기반으로 구현되어 있으며, DB 기반 조회는 Phase 1에서 구현 예정이다.

### DB 마이그레이션 주의사항

SPEC-WIDGET-API-001 구현 후 아래 4개 테이블이 추가되었다. 신규 환경에서는 마이그레이션이 필요하다:

- `orders`: 주문 정보
- `orderStatusHistory`: 주문 상태 이력
- `orderDesignFiles`: 주문 디자인 파일
- `widgets`: 위젯 설정

```bash
pnpm db:migrate
```

## 라이선스

Private - 후니프린팅 내부 프로젝트
