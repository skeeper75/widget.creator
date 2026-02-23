---
id: SPEC-WIDGET-API-001
title: Widget Builder API Layer
version: 1.0.0
status: completed
created: 2026-02-22
updated: 2026-02-23
author: MoAI
priority: P0
tags: api, rest, trpc, authentication, integration, openapi
related_specs: [SPEC-INFRA-001, SPEC-DATA-002]
---

# SPEC-WIDGET-API-001: Widget Builder API Layer

## 1. Environment

### 1.1 System Context

Widget Builder API Layer는 Widget Creator 플랫폼의 서버 사이드 인터페이스 계층이다. 5개의 소비자 범위(Catalog, Pricing, Orders, Admin, Integration)와 1개의 위젯 전용 범위(Widget)를 통해 45+ 엔드포인트를 제공한다. Next.js 16 App Router API Routes를 기반으로 REST 엔드포인트를 구현하고, Admin 대시보드용으로 tRPC를 통합하여 하이브리드 API 아키텍처를 구성한다.

### 1.2 Technology Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| Runtime | Next.js 16 App Router | 16.x | API Routes (REST endpoints) |
| Type-Safe RPC | tRPC | 11.x | Admin dashboard internal API |
| Validation | Zod | 3.23+ | Request/response schema validation |
| ORM | Drizzle ORM | latest | Database access via postgres.js |
| Database | PostgreSQL | 16.x | Primary data store (26 Huni tables) |
| Auth | NextAuth.js v5 | 5.x | Admin JWT auth |
| Cache | In-memory / Redis (P1) | - | Rate limiting, response cache |

### 1.3 Architecture Decision: Hybrid API Pattern

- **REST (Next.js API Routes)**: 외부 소비자(Widget SDK, Shopby, MES, Edicus)를 위한 표준 HTTP API
- **tRPC**: Admin 대시보드 전용 type-safe internal API. 프론트엔드-백엔드 간 스키마 자동 공유
- **근거**: REST는 외부 시스템 호환성을 보장하고, tRPC는 Admin 개발 생산성을 극대화한다

### 1.4 Database Schema Reference

26개 Huni 도메인 테이블이 `packages/shared/src/db/schema/`에 Drizzle ORM으로 정의되어 있다 (SPEC-INFRA-001).

| Schema File | Tables |
|-------------|--------|
| huni-catalog.schema.ts | categories, products, productSizes |
| huni-materials.schema.ts | papers, materials, paperProductMappings |
| huni-processes.schema.ts | printModes, postProcesses, bindings, impositionRules |
| huni-pricing.schema.ts | priceTables, priceTiers, fixedPrices, packagePrices, foilPrices, lossQuantityConfigs |
| huni-options.schema.ts | optionDefinitions, productOptions, optionChoices, optionConstraints, optionDependencies |
| huni-integration.schema.ts | mesItems, mesItemOptions, productMesMappings, productEditorMappings, optionChoiceMesMappings |

---

## 2. Assumptions

### 2.1 Technical Assumptions

- [A-01] Next.js 16 App Router의 `app/api/` 디렉토리 기반 라우팅이 모든 REST 엔드포인트를 처리한다
- [A-02] tRPC 11.x가 Next.js 16 App Router와 호환되며, `app/api/trpc/[...trpc]/route.ts` 경로를 통해 통합된다
- [A-03] PostgreSQL 16.x + Drizzle ORM이 모든 데이터 액세스를 처리하며, 26개 Huni 테이블 스키마가 SPEC-INFRA-001에 의해 마이그레이션 완료 상태이다
- [A-04] Vercel Serverless Functions 환경에서 postgres.js 드라이버로 연결 풀링이 적절히 동작한다
- [A-05] drizzle-zod를 활용하여 Drizzle 스키마로부터 Zod validation 스키마를 자동 생성할 수 있다

### 2.2 Business Assumptions

- [A-06] Widget Token 기반 공개 API(Catalog, Pricing)는 인증 없이 접근 가능하되, rate limiting으로 보호한다
- [A-07] 주문 API는 최소 JWT 또는 API Key 인증이 필요하다
- [A-08] Admin API는 내부 관리자만 접근 가능하며, JWT 기반 세션 인증을 사용한다
- [A-09] Integration API는 사전 등록된 API Key로만 접근 가능하다
- [A-10] 모든 가격은 KRW(원) 단위이며, VAT 별도 계산이 기본이다

### 2.3 Confidence Assessment

| Assumption | Confidence | Risk if Wrong |
|------------|-----------|---------------|
| A-01 | High | Low - Next.js App Router API Routes는 검증된 패턴 |
| A-02 | High | Medium - tRPC 11 + Next.js 16 통합은 공식 지원됨 |
| A-03 | High | Low - SPEC-INFRA-001에서 이미 구현 완료 |
| A-04 | Medium | High - 서버리스 콜드 스타트 시 연결 지연 가능성 |
| A-05 | High | Low - drizzle-zod는 공식 지원 패키지 |
| A-06 | High | Low - 공개 카탈로그는 업계 표준 패턴 |

---

## 3. Requirements

### 3.1 API Scope Architecture

#### REQ-001: Hybrid API Pattern (Ubiquitous)

시스템은 **항상** 외부 소비자를 위한 REST API와 Admin 대시보드를 위한 tRPC API를 동시에 제공해야 한다.

- REST endpoints: `/api/v1/catalog/`, `/api/v1/pricing/`, `/api/v1/orders/`, `/api/v1/integration/`, `/api/widget/`
- tRPC endpoint: `/api/v1/admin/trpc/[...trpc]`

---

### 3.2 Catalog API (`/api/v1/catalog/`)

**Auth**: Widget Token (Public)
**Purpose**: 상품 카탈로그 정보를 위젯 SDK 및 외부 소비자에게 제공

#### REQ-010: Category Tree Endpoint (Event-Driven)

**WHEN** 클라이언트가 `GET /api/v1/catalog/categories` 요청을 보내면,
**THEN** 시스템은 활성화된 카테고리를 계층 트리 구조로 반환한다.

**Request**:
```
GET /api/v1/catalog/categories
Headers:
  X-Widget-Token: <jwt>
Query Parameters:
  depth?: number        # Max tree depth (default: unlimited)
  include_inactive?: boolean  # Admin only (default: false)
```

**Response** `200 OK`:
```json
{
  "data": [
    {
      "id": 1,
      "code": "booklet",
      "name": "책자",
      "depth": 0,
      "display_order": 1,
      "icon_url": "/icons/booklet.svg",
      "is_active": true,
      "children": [
        {
          "id": 2,
          "code": "booklet-wireless",
          "name": "무선책자",
          "depth": 1,
          "display_order": 1,
          "icon_url": null,
          "is_active": true,
          "children": []
        }
      ]
    }
  ],
  "meta": {
    "total": 15
  }
}
```

**Zod Schema**:
```typescript
const CategoryTreeResponseSchema = z.object({
  data: z.array(z.lazy(() => CategoryNodeSchema)),
  meta: z.object({ total: z.number() }),
});

const CategoryNodeSchema = z.object({
  id: z.number(),
  code: z.string(),
  name: z.string(),
  depth: z.number(),
  display_order: z.number(),
  icon_url: z.string().nullable(),
  is_active: z.boolean(),
  children: z.array(z.lazy(() => CategoryNodeSchema)),
});
```

**Error Cases**:
- `401 Unauthorized`: Widget Token 누락 또는 만료
- `403 Forbidden`: Origin이 허용 도메인에 포함되지 않음

#### REQ-011: Category Detail Endpoint (Event-Driven)

**WHEN** 클라이언트가 `GET /api/v1/catalog/categories/:id` 요청을 보내면,
**THEN** 시스템은 해당 카테고리 상세 정보와 소속 상품 수를 반환한다.

**Response** `200 OK`:
```json
{
  "data": {
    "id": 1,
    "code": "booklet",
    "name": "책자",
    "depth": 0,
    "display_order": 1,
    "icon_url": "/icons/booklet.svg",
    "is_active": true,
    "parent_id": null,
    "product_count": 3,
    "children_count": 2,
    "created_at": "2026-01-15T09:00:00Z",
    "updated_at": "2026-02-20T14:30:00Z"
  }
}
```

**Error Cases**:
- `404 Not Found`: RFC 7807 형식 - `type: "https://widget.huni.co.kr/errors/not-found"`

#### REQ-012: Product List Endpoint (Event-Driven)

**WHEN** 클라이언트가 `GET /api/v1/catalog/products` 요청을 보내면,
**THEN** 시스템은 필터링, 정렬, 페이지네이션이 적용된 상품 목록을 반환한다.

**Request**:
```
GET /api/v1/catalog/products
Query Parameters:
  category_id?: number       # Filter by category
  product_type?: string      # Filter by product_type (booklet, sticker, card, etc.)
  pricing_model?: string     # Filter by pricing_model (formula, fixed, package, etc.)
  is_active?: boolean        # Filter by active status (default: true)
  search?: string            # Full-text search on name, slug
  sort?: string              # Sort field (name, created_at, display_order)
  order?: 'asc' | 'desc'    # Sort direction (default: asc)
  page?: number              # Page number (default: 1)
  limit?: number             # Items per page (default: 20, max: 100)
```

**Response** `200 OK`:
```json
{
  "data": [
    {
      "id": 42,
      "category_id": 2,
      "huni_code": "1001",
      "name": "무선책자",
      "slug": "wireless-booklet",
      "product_type": "booklet",
      "pricing_model": "package",
      "order_method": "upload",
      "editor_enabled": true,
      "description": "무선제본 책자 인쇄",
      "is_active": true,
      "category": {
        "id": 2,
        "code": "booklet-wireless",
        "name": "무선책자"
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 48,
    "total_pages": 3
  },
  "links": {
    "self": "/api/v1/catalog/products?page=1&limit=20",
    "next": "/api/v1/catalog/products?page=2&limit=20",
    "prev": null,
    "first": "/api/v1/catalog/products?page=1&limit=20",
    "last": "/api/v1/catalog/products?page=3&limit=20"
  }
}
```

**Zod Schema**:
```typescript
const ProductListQuerySchema = z.object({
  category_id: z.coerce.number().optional(),
  product_type: z.string().optional(),
  pricing_model: z.string().optional(),
  is_active: z.coerce.boolean().default(true),
  search: z.string().max(200).optional(),
  sort: z.enum(['name', 'created_at', 'display_order']).default('display_order'),
  order: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
```

#### REQ-013: Product Detail Endpoint (Event-Driven)

**WHEN** 클라이언트가 `GET /api/v1/catalog/products/:id` 요청을 보내면,
**THEN** 시스템은 상품 상세 정보와 함께 사이즈, 옵션, 카테고리 정보를 반환한다.

**Response** `200 OK`:
```json
{
  "data": {
    "id": 42,
    "category_id": 2,
    "huni_code": "1001",
    "edicus_code": "ED-BOOK-001",
    "shopby_id": 12345,
    "name": "무선책자",
    "slug": "wireless-booklet",
    "product_type": "booklet",
    "pricing_model": "package",
    "sheet_standard": "4x6",
    "order_method": "upload",
    "editor_enabled": true,
    "description": "무선제본 책자 인쇄",
    "is_active": true,
    "mes_registered": true,
    "category": {
      "id": 2,
      "code": "booklet-wireless",
      "name": "무선책자"
    },
    "sizes_count": 5,
    "options_count": 8,
    "created_at": "2026-01-10T09:00:00Z",
    "updated_at": "2026-02-20T14:30:00Z"
  }
}
```

#### REQ-014: Product Sizes Endpoint (Event-Driven)

**WHEN** 클라이언트가 `GET /api/v1/catalog/products/:id/sizes` 요청을 보내면,
**THEN** 시스템은 해당 상품에 사용 가능한 사이즈 목록을 반환한다.

**Response** `200 OK`:
```json
{
  "data": [
    {
      "id": 15,
      "code": "A5",
      "display_name": "A5 (148x210mm)",
      "cut_width": 148.00,
      "cut_height": 210.00,
      "work_width": 154.00,
      "work_height": 216.00,
      "bleed": 3.0,
      "imposition_count": 4,
      "is_custom": false,
      "display_order": 1
    },
    {
      "id": 16,
      "code": "CUSTOM",
      "display_name": "맞춤 사이즈",
      "cut_width": null,
      "cut_height": null,
      "work_width": null,
      "work_height": null,
      "bleed": 3.0,
      "imposition_count": null,
      "is_custom": true,
      "custom_min_w": 50.00,
      "custom_min_h": 50.00,
      "custom_max_w": 500.00,
      "custom_max_h": 700.00,
      "display_order": 99
    }
  ]
}
```

#### REQ-015: Product Papers Endpoint (Event-Driven)

**WHEN** 클라이언트가 `GET /api/v1/catalog/products/:id/papers` 요청을 보내면,
**THEN** 시스템은 `paper_product_mapping` 테이블을 기반으로 해당 상품에 사용 가능한 용지 목록을 반환한다.

**Request**:
```
GET /api/v1/catalog/products/:id/papers
Query Parameters:
  cover_type?: string   # Filter by cover_type (inner, cover, null for general)
```

**Response** `200 OK`:
```json
{
  "data": [
    {
      "id": 8,
      "code": "ART250",
      "name": "아트지 250g",
      "abbreviation": "아트250",
      "weight": 250,
      "cover_type": "cover",
      "is_default": true,
      "display_order": 1
    }
  ]
}
```

#### REQ-016: Product Options Endpoint (Event-Driven)

**WHEN** 클라이언트가 `GET /api/v1/catalog/products/:id/options` 요청을 보내면,
**THEN** 시스템은 해당 상품의 옵션 정의 목록과 각 옵션의 선택지를 반환한다.

**Response** `200 OK`:
```json
{
  "data": [
    {
      "id": 101,
      "option_definition": {
        "id": 5,
        "key": "inner_paper",
        "name": "내지 용지",
        "option_class": "material",
        "option_type": "select",
        "ui_component": "dropdown"
      },
      "display_order": 1,
      "is_required": true,
      "is_visible": true,
      "default_choice_id": 201,
      "choices": [
        {
          "id": 201,
          "code": "MOJ100",
          "name": "백색모조지 100g",
          "price_key": "MOJ100",
          "ref_paper_id": 8,
          "display_order": 1
        }
      ]
    }
  ]
}
```

#### REQ-017: Product Constraints Endpoint (Event-Driven)

**WHEN** 클라이언트가 `GET /api/v1/catalog/products/:id/constraints` 요청을 보내면,
**THEN** 시스템은 해당 상품의 활성 옵션 제약 조건 목록을 반환한다.

**Response** `200 OK`:
```json
{
  "data": [
    {
      "id": 301,
      "constraint_type": "visibility",
      "source_option_id": 5,
      "source_field": "value",
      "operator": "eq",
      "value": "foil_yes",
      "target_option_id": 6,
      "target_field": "visibility",
      "target_action": "show",
      "description": "박가공 선택 시 박칼라 옵션 표시",
      "priority": 10
    }
  ]
}
```

#### REQ-018: Product Dependencies Endpoint (Event-Driven)

**WHEN** 클라이언트가 `GET /api/v1/catalog/products/:id/dependencies` 요청을 보내면,
**THEN** 시스템은 해당 상품의 옵션 간 의존성 규칙을 반환한다.

**Response** `200 OK`:
```json
{
  "data": [
    {
      "id": 401,
      "parent_option_id": 5,
      "parent_choice_id": 201,
      "child_option_id": 6,
      "dependency_type": "visibility"
    }
  ]
}
```

---

### 3.3 Pricing API (`/api/v1/pricing/`)

**Auth**: Widget Token (Public)
**Purpose**: 실시간 견적 계산 및 가격 정보 조회

#### REQ-020: Full Quote Calculation (Event-Driven)

**WHEN** 클라이언트가 `POST /api/v1/pricing/quote` 요청을 보내면,
**THEN** 시스템은 선택된 옵션 조합과 수량에 기반하여 완전한 견적 내역을 계산하여 반환한다.

**Request**:
```
POST /api/v1/pricing/quote
Content-Type: application/json
Headers:
  X-Widget-Token: <jwt>
```

**Request Body**:
```json
{
  "product_id": 42,
  "size_id": 15,
  "paper_id": 8,
  "print_mode_id": 4,
  "quantity": 500,
  "page_count": 100,
  "binding_id": 3,
  "post_processes": [
    {
      "id": 12,
      "sub_option": "1line"
    }
  ],
  "accessories": [
    {
      "product_id": 100,
      "quantity": 1
    }
  ]
}
```

**Zod Schema**:
```typescript
const QuoteRequestSchema = z.object({
  product_id: z.number().int().positive(),
  size_id: z.number().int().positive(),
  paper_id: z.number().int().positive().optional(),
  print_mode_id: z.number().int().positive().optional(),
  quantity: z.number().int().min(1).max(100000),
  page_count: z.number().int().min(1).optional(),
  binding_id: z.number().int().positive().optional(),
  post_processes: z.array(z.object({
    id: z.number().int().positive(),
    sub_option: z.string().optional(),
  })).default([]),
  accessories: z.array(z.object({
    product_id: z.number().int().positive(),
    quantity: z.number().int().min(1),
  })).default([]),
});
```

**Response** `200 OK`:
```json
{
  "data": {
    "product_id": 42,
    "product_name": "무선책자",
    "pricing_model": "package",
    "quantity": 500,
    "breakdown": {
      "base_cost": 0,
      "print_cost": 15000,
      "paper_cost": 8500,
      "coating_cost": 3000,
      "binding_cost": 5000,
      "postprocess_cost": 2000,
      "accessory_cost": 1100,
      "subtotal": 34600,
      "vat": 3460,
      "total": 38060
    },
    "unit_price": 76.12,
    "currency": "KRW",
    "selected_options": {
      "size": "A5 (148x210mm)",
      "paper": "아트지 250g",
      "print_mode": "양면 4도",
      "page_count": 100,
      "binding": "무선제본",
      "post_processes": ["박가공 (1line)"],
      "accessories": ["OPP포장"]
    },
    "valid_until": "2026-02-22T23:59:59Z"
  }
}
```

**Error Cases**:
- `400 Bad Request`: 유효하지 않은 옵션 조합
  ```json
  {
    "type": "https://widget.huni.co.kr/errors/validation",
    "title": "Validation Error",
    "status": 400,
    "detail": "Paper ID 55 is not compatible with product ID 42",
    "instance": "/api/v1/pricing/quote",
    "errors": [
      {
        "field": "paper_id",
        "message": "Paper 55 is not mapped to product 42 via paper_product_mapping"
      }
    ]
  }
  ```
- `422 Unprocessable Entity`: 제약 조건 위반 (예: 페이지수가 제본 방식의 범위 밖)

#### REQ-021: Quick Price Preview (Event-Driven)

**WHEN** 클라이언트가 `POST /api/v1/pricing/quote/preview` 요청을 보내면,
**THEN** 시스템은 부분적인 옵션 선택만으로 예상 가격 범위를 빠르게 반환한다.

**Request Body** (partial - only product_id and quantity required):
```json
{
  "product_id": 42,
  "quantity": 500,
  "size_id": 15
}
```

**Response** `200 OK`:
```json
{
  "data": {
    "product_id": 42,
    "quantity": 500,
    "price_range": {
      "min": 25000,
      "max": 85000,
      "currency": "KRW"
    },
    "is_estimate": true,
    "missing_options": ["paper_id", "print_mode_id", "page_count", "binding_id"]
  }
}
```

#### REQ-022: Product Price Tiers (Event-Driven)

**WHEN** 클라이언트가 `GET /api/v1/pricing/products/:id/price-tiers` 요청을 보내면,
**THEN** 시스템은 해당 상품의 수량 구간별 가격 테이블을 반환한다.

**Request**:
```
GET /api/v1/pricing/products/:id/price-tiers
Query Parameters:
  option_code?: string   # Filter by specific option code
  price_table_id?: number  # Filter by specific price table
```

**Response** `200 OK`:
```json
{
  "data": [
    {
      "price_table": {
        "id": 1,
        "code": "BOOKLET-BASE",
        "name": "책자 기본 가격표",
        "price_type": "unit",
        "quantity_basis": "per_set"
      },
      "tiers": [
        {
          "id": 501,
          "option_code": "A5-MOJ100-DOUBLE4",
          "min_qty": 1,
          "max_qty": 99,
          "unit_price": 3000.00
        },
        {
          "id": 502,
          "option_code": "A5-MOJ100-DOUBLE4",
          "min_qty": 100,
          "max_qty": 499,
          "unit_price": 2500.00
        },
        {
          "id": 503,
          "option_code": "A5-MOJ100-DOUBLE4",
          "min_qty": 500,
          "max_qty": 999999,
          "unit_price": 2000.00
        }
      ]
    }
  ]
}
```

#### REQ-023: Product Fixed Prices (Event-Driven)

**WHEN** 클라이언트가 `GET /api/v1/pricing/products/:id/fixed-prices` 요청을 보내면,
**THEN** 시스템은 해당 상품의 고정 가격 목록(pricing_model: fixed/package/foil)을 반환한다.

**Request**:
```
GET /api/v1/pricing/products/:id/fixed-prices
Query Parameters:
  size_id?: number
  paper_id?: number
  print_mode_id?: number
```

**Response** `200 OK`:
```json
{
  "data": [
    {
      "id": 601,
      "size_id": 15,
      "paper_id": 8,
      "print_mode_id": 4,
      "option_label": "A5 / 아트250 / 양면4도",
      "base_qty": 100,
      "selling_price": 45000.00,
      "vat_included": false
    }
  ]
}
```

---

### 3.4 Orders API (`/api/v1/orders/`)

**Auth**: JWT (Admin) / API Key (Integration)
**Purpose**: 주문 생성, 조회, 상태 관리

#### REQ-030: Create Order (Event-Driven)

**WHEN** 인증된 클라이언트가 `POST /api/v1/orders` 요청을 보내면,
**THEN** 시스템은 견적 기반으로 새 주문을 생성하고, 초기 상태를 `unpaid`로 설정한다.

**Request Body**:
```json
{
  "quote_data": {
    "product_id": 42,
    "size_id": 15,
    "paper_id": 8,
    "print_mode_id": 4,
    "quantity": 500,
    "page_count": 100,
    "binding_id": 3,
    "post_processes": [{"id": 12, "sub_option": "1line"}],
    "calculated_price": 38060,
    "breakdown": { "...": "..." }
  },
  "customer": {
    "name": "홍길동",
    "email": "hong@example.com",
    "phone": "010-1234-5678",
    "company": "테스트 회사"
  },
  "shipping": {
    "method": "delivery",
    "address": "서울시 강남구 테헤란로 123",
    "postal_code": "06142",
    "memo": "부재시 경비실에 맡겨주세요"
  },
  "widget_id": "wgt_xxxxx"
}
```

**Zod Schema**:
```typescript
const CreateOrderSchema = z.object({
  quote_data: z.object({
    product_id: z.number().int().positive(),
    size_id: z.number().int().positive(),
    paper_id: z.number().int().positive().optional(),
    print_mode_id: z.number().int().positive().optional(),
    quantity: z.number().int().min(1),
    page_count: z.number().int().min(1).optional(),
    binding_id: z.number().int().positive().optional(),
    post_processes: z.array(z.object({
      id: z.number().int().positive(),
      sub_option: z.string().optional(),
    })).default([]),
    calculated_price: z.number().positive(),
    breakdown: z.record(z.unknown()),
  }),
  customer: z.object({
    name: z.string().min(1).max(100),
    email: z.string().email(),
    phone: z.string().regex(/^01[0-9]-?\d{3,4}-?\d{4}$/),
    company: z.string().max(200).optional(),
  }),
  shipping: z.object({
    method: z.enum(['delivery', 'quick', 'pickup']),
    address: z.string().min(1).max(500).optional(),
    postal_code: z.string().regex(/^\d{5}$/).optional(),
    memo: z.string().max(500).optional(),
  }),
  widget_id: z.string().optional(),
});
```

**Response** `201 Created`:
```json
{
  "data": {
    "id": "ord_abc123",
    "order_number": "HN-20260222-0001",
    "status": "unpaid",
    "total_price": 38060,
    "customer": { "name": "홍길동", "email": "hong@example.com" },
    "created_at": "2026-02-22T10:30:00Z"
  }
}
```

**Error Cases**:
- `400 Bad Request`: 서버 사이드 가격 검증 실패 (클라이언트 calculated_price와 서버 계산 불일치)
- `401 Unauthorized`: 인증 토큰 없음
- `409 Conflict`: 동일 세션에서 중복 주문 시도

#### REQ-031: List Orders (Event-Driven)

**WHEN** 인증된 클라이언트가 `GET /api/v1/orders` 요청을 보내면,
**THEN** 시스템은 필터링 및 페이지네이션이 적용된 주문 목록을 반환한다.

**Request**:
```
GET /api/v1/orders
Query Parameters:
  status?: string             # Filter by order status
  customer_email?: string     # Filter by customer email
  widget_id?: string          # Filter by widget
  date_from?: string          # ISO date - created after
  date_to?: string            # ISO date - created before
  sort?: string               # Sort field (created_at, total_price, order_number)
  order?: 'asc' | 'desc'     # Sort direction
  page?: number               # Page number (default: 1)
  limit?: number              # Items per page (default: 20, max: 100)
```

**Response** `200 OK`:
```json
{
  "data": [
    {
      "id": "ord_abc123",
      "order_number": "HN-20260222-0001",
      "status": "paid",
      "total_price": 38060,
      "customer": {
        "name": "홍길동",
        "email": "hong@example.com",
        "phone": "010-****-5678"
      },
      "product_summary": "무선책자 A5 500부",
      "has_design_file": true,
      "created_at": "2026-02-22T10:30:00Z",
      "updated_at": "2026-02-22T11:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "total_pages": 8
  },
  "links": {
    "self": "/api/v1/orders?page=1",
    "next": "/api/v1/orders?page=2"
  }
}
```

#### REQ-032: Order Detail (Event-Driven)

**WHEN** 인증된 클라이언트가 `GET /api/v1/orders/:id` 요청을 보내면,
**THEN** 시스템은 주문의 전체 상세 정보(고객, 상품, 가격 내역, 파일, 배송, 상태 이력)를 반환한다.

**Response** `200 OK`:
```json
{
  "data": {
    "id": "ord_abc123",
    "order_number": "HN-20260222-0001",
    "status": "producing",
    "total_price": 38060,
    "currency": "KRW",
    "customer": {
      "name": "홍길동",
      "email": "hong@example.com",
      "phone": "010-1234-5678",
      "company": "테스트 회사"
    },
    "product": {
      "id": 42,
      "name": "무선책자",
      "selected_options": {
        "size": "A5 (148x210mm)",
        "paper": "아트지 250g",
        "print_mode": "양면 4도",
        "quantity": 500,
        "page_count": 100
      },
      "breakdown": {
        "print_cost": 15000,
        "paper_cost": 8500,
        "subtotal": 34600,
        "vat": 3460,
        "total": 38060
      }
    },
    "design_files": [
      {
        "id": "file_xyz",
        "original_name": "design_final.pdf",
        "file_number": "1001_무선책자_148x210_D_아트250_테스트회사_홍길동_30146712_00500ea.pdf",
        "file_size": 15728640,
        "mime_type": "application/pdf",
        "status": "confirmed",
        "uploaded_at": "2026-02-22T11:00:00Z"
      }
    ],
    "shipping": {
      "method": "delivery",
      "address": "서울시 강남구 테헤란로 123",
      "postal_code": "06142",
      "tracking_number": null,
      "estimated_date": "2026-02-27T18:00:00Z"
    },
    "status_history": [
      {"status": "unpaid", "changed_at": "2026-02-22T10:30:00Z"},
      {"status": "paid", "changed_at": "2026-02-22T11:05:00Z"},
      {"status": "production_waiting", "changed_at": "2026-02-22T11:10:00Z"},
      {"status": "producing", "changed_at": "2026-02-23T09:00:00Z"}
    ],
    "created_at": "2026-02-22T10:30:00Z",
    "updated_at": "2026-02-23T09:00:00Z"
  }
}
```

#### REQ-033: Update Order Status (Event-Driven)

**WHEN** 관리자가 `PATCH /api/v1/orders/:id` 요청을 보내면,
**THEN** 시스템은 주문 상태를 업데이트하고, 상태 전환 규칙을 검증한다.

**Request Body**:
```json
{
  "status": "producing",
  "memo": "제작 시작",
  "estimated_date": "2026-02-27T18:00:00Z",
  "tracking_number": null
}
```

**State Transition Rules** (Unwanted):
시스템은 다음 유효하지 않은 상태 전환을 **허용하지 않아야 한다**:
- `shipped` -> `unpaid`
- `cancelled` -> 어떤 상태로든
- `unpaid` -> `producing` (결제 완료 단계를 건너뛸 수 없음)

**Valid State Transitions**:
```
unpaid -> paid | cancelled
paid -> production_waiting | cancelled
production_waiting -> producing | cancelled
producing -> production_done
production_done -> shipped
shipped -> (terminal)
cancelled -> (terminal)
```

**Error Cases**:
- `409 Conflict`: 유효하지 않은 상태 전환
  ```json
  {
    "type": "https://widget.huni.co.kr/errors/invalid-state-transition",
    "title": "Invalid State Transition",
    "status": 409,
    "detail": "Cannot transition from 'cancelled' to 'producing'",
    "instance": "/api/v1/orders/ord_abc123"
  }
  ```

#### REQ-034: Upload Design File (Event-Driven)

**WHEN** 클라이언트가 `POST /api/v1/orders/:id/files` 요청을 보내면,
**THEN** 시스템은 Presigned URL을 생성하거나 파일을 직접 수신하여 S3 호환 스토리지에 저장한다.

**Request** (Presigned URL mode):
```json
{
  "filename": "design_final.pdf",
  "content_type": "application/pdf",
  "file_size": 15728640
}
```

**Response** `200 OK`:
```json
{
  "data": {
    "upload_url": "https://s3.example.com/uploads/ord_abc123/...",
    "file_id": "file_xyz",
    "file_number": "1001_무선책자_148x210_D_아트250_테스트회사_홍길동_30146712_00500ea.pdf",
    "expires_at": "2026-02-22T12:00:00Z",
    "max_size": 524288000
  }
}
```

**Constraints** (Unwanted):
시스템은 다음 파일을 **수락하지 않아야 한다**:
- 500MB를 초과하는 파일
- 허용되지 않은 MIME 타입 (허용: `application/pdf`, `application/postscript`, `image/jpeg`, `image/png`, `image/tiff`)
- 인쇄타입과 불일치하는 파일 형식 (예: 디지털인쇄에 AI 파일)

---

### 3.5 Admin API (`/api/v1/admin/trpc/`)

**Auth**: JWT (Admin Only)
**Pattern**: tRPC 11.x
**Purpose**: Admin 대시보드의 CRUD 및 관리 기능을 위한 type-safe RPC

#### REQ-040: tRPC Router Structure (Ubiquitous)

시스템은 **항상** 다음 도메인 라우터 구조를 통해 Admin API를 제공해야 한다.

**tRPC Router Architecture**:
```typescript
// apps/web/app/api/trpc/router.ts
const appRouter = createRouter({
  category: categoryRouter,     // categories CRUD
  product: productRouter,       // products CRUD + clone
  size: sizeRouter,            // product_sizes CRUD
  paper: paperRouter,          // papers CRUD
  material: materialRouter,    // materials CRUD
  printMode: printModeRouter,  // print_modes CRUD
  postProcess: postProcessRouter, // post_processes CRUD
  binding: bindingRouter,      // bindings CRUD
  priceTable: priceTableRouter, // price_tables CRUD
  priceTier: priceTierRouter,  // price_tiers CRUD + import/export
  fixedPrice: fixedPriceRouter, // fixed_prices CRUD
  option: optionRouter,        // option_definitions + choices CRUD
  constraint: constraintRouter, // option_constraints CRUD
  dependency: dependencyRouter, // option_dependencies CRUD
  order: orderRouter,          // orders CRUD + status management
  dashboard: dashboardRouter,  // stats + activity feed
});
```

#### REQ-041: Standard CRUD Procedures (Ubiquitous)

각 도메인 라우터는 **항상** 다음 표준 프로시저를 제공해야 한다:

```typescript
// Standard procedures per router
{
  list: publicProcedure
    .input(ListQuerySchema)      // pagination, filtering, sorting
    .query(/* ... */),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(/* ... */),

  create: protectedProcedure
    .input(CreateSchema)          // drizzle-zod generated
    .mutation(/* ... */),

  update: protectedProcedure
    .input(UpdateSchema)          // partial fields
    .mutation(/* ... */),

  softDelete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(/* set is_active = false */),

  bulkUpdate: protectedProcedure
    .input(BulkUpdateSchema)      // array of { id, fields }
    .mutation(/* ... */),
}
```

#### REQ-042: Special Admin Procedures (Event-Driven)

**WHEN** 관리자가 상품 복제 요청을 보내면,
**THEN** 시스템은 해당 상품과 연관된 사이즈, 옵션, 가격 규칙을 포함하여 전체 구성을 딥 복사한다.

**Product Clone**:
```typescript
product.clone: protectedProcedure
  .input(z.object({
    id: z.number(),
    new_name: z.string(),
    new_huni_code: z.string(),
  }))
  .mutation(/* deep copy product + sizes + options + prices */)
```

**Price Tier Import/Export**:
```typescript
priceTier.import: protectedProcedure
  .input(z.object({
    price_table_id: z.number(),
    data: z.array(PriceTierRowSchema),
    mode: z.enum(['replace', 'merge']),
  }))
  .mutation(/* bulk upsert price tiers */)

priceTier.export: protectedProcedure
  .input(z.object({
    price_table_id: z.number(),
    format: z.enum(['json', 'csv']),
  }))
  .query(/* export price tiers */)
```

**Dashboard Stats**:
```typescript
dashboard.stats: protectedProcedure
  .query(/* returns: {
    total_orders: number,
    orders_today: number,
    revenue_today: number,
    revenue_month: number,
    pending_orders: number,
    active_widgets: number,
    active_products: number,
  } */)

dashboard.activityFeed: protectedProcedure
  .input(z.object({ limit: z.number().default(20) }))
  .query(/* returns recent activity entries */)
```

#### REQ-043: tRPC Context and Auth Middleware (Ubiquitous)

시스템은 **항상** tRPC 컨텍스트에서 세션 인증을 수행하고, protectedProcedure에 대해 유효한 관리자 세션을 요구해야 한다.

```typescript
// apps/web/app/api/trpc/context.ts
export const createContext = async (opts: FetchCreateContextFnOptions) => {
  const session = await getServerSession(authOptions);
  return {
    session,
    db,         // Drizzle instance
    user: session?.user,
  };
};

// Middleware
const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { ...ctx, user: ctx.session.user } });
});

export const protectedProcedure = t.procedure.use(isAuthed);
```

---

### 3.6 Integration API (`/api/v1/integration/`)

**Auth**: API Key (`X-API-Key` header)
**Purpose**: 외부 시스템(Shopby, MES, Edicus)과의 데이터 동기화

#### REQ-050: Shopby Integration Endpoints (Event-Driven)

**WHEN** Shopby 시스템이 상품 동기화 요청을 보내면,
**THEN** 시스템은 Shopby 상품 데이터를 Widget Creator 형식으로 매핑하여 반환하거나 동기화한다.

**Endpoints**:

`GET /api/v1/integration/shopby/products`:
```json
{
  "data": [
    {
      "product_id": 42,
      "shopby_id": 12345,
      "name": "무선책자",
      "sync_status": "synced",
      "last_synced_at": "2026-02-22T10:00:00Z"
    }
  ]
}
```

`POST /api/v1/integration/shopby/products/:id/sync`:
- Shopby 상품 데이터를 Widget Creator 상품과 동기화
- Response `200 OK`: `{ "data": { "sync_status": "synced", "changes": [...] } }`

`POST /api/v1/integration/shopby/orders`:
- Widget Creator 주문을 Shopby 주문으로 생성
- Response `201 Created`: `{ "data": { "shopby_order_id": "SB-12345" } }`

`PUT /api/v1/integration/shopby/orders/:id/status`:
- Shopby 주문 상태 업데이트
- Request: `{ "status": "shipped", "tracking_number": "1234567890" }`

#### REQ-051: MES Integration Endpoints (Event-Driven)

**WHEN** MES 시스템이 아이템 또는 주문 데이터를 조회하면,
**THEN** 시스템은 MES 코드 매핑을 기반으로 데이터를 MES 형식으로 반환한다.

**Endpoints**:

`GET /api/v1/integration/mes/items`:
```json
{
  "data": [
    {
      "id": 1,
      "item_code": "MES-001",
      "group_code": "BOOK",
      "name": "무선책자 내지",
      "item_type": "product",
      "options": [
        {"option_number": 1, "option_value": "A5"},
        {"option_number": 2, "option_value": "모조지100g"}
      ]
    }
  ]
}
```

`GET /api/v1/integration/mes/mappings`:
- 상품-MES 아이템 매핑 목록 조회
- Response: product_mes_mapping + option_choice_mes_mapping 데이터

`POST /api/v1/integration/mes/orders/:id/dispatch`:
- 주문을 MES 시스템으로 발주 전송
- Request: `{ "production_memo": "긴급 제작 요청" }`
- Response: `{ "data": { "mes_order_id": "MES-ORD-20260222-001", "dispatched_at": "..." } }`

`PUT /api/v1/integration/mes/orders/:id/status`:
- MES에서 주문 상태 업데이트 수신 (콜백)
- Request: `{ "mes_status": "completed", "barcode": "BC123456" }`

#### REQ-052: Edicus Integration Endpoints (Event-Driven)

**WHEN** Edicus 에디터 시스템이 상품 설정 또는 디자인 데이터를 요청하면,
**THEN** 시스템은 product_editor_mapping을 기반으로 에디터 호환 데이터를 반환한다.

**Endpoints**:

`GET /api/v1/integration/edicus/products`:
```json
{
  "data": [
    {
      "product_id": 42,
      "edicus_code": "ED-BOOK-001",
      "editor_type": "edicus",
      "template_id": "TPL-001",
      "editor_enabled": true
    }
  ]
}
```

`GET /api/v1/integration/edicus/products/:id/config`:
- 에디터용 상품 구성 (사이즈, 옵션, 템플릿 설정) 반환
- Response: product detail + editor mapping + template config

`POST /api/v1/integration/edicus/designs`:
- 에디터에서 완성된 디자인을 등록
- Request: `{ "order_id": "...", "template_id": "...", "render_data": {...}, "output_url": "..." }`
- Response: `{ "data": { "design_id": "des_xyz", "status": "rendering" } }`

`GET /api/v1/integration/edicus/designs/:id`:
- 디자인 렌더링 상태 및 결과 조회
- Response: `{ "data": { "id": "des_xyz", "status": "completed", "output_url": "...", "preview_url": "..." } }`

---

### 3.7 Widget API (`/api/widget/`)

**Auth**: Public (Widget ID based)
**Purpose**: 위젯 임베딩을 위한 설정 및 스크립트 제공

#### REQ-060: Widget Configuration (Event-Driven)

**WHEN** 위젯 스크립트가 `GET /api/widget/config/:widgetId` 요청을 보내면,
**THEN** 시스템은 해당 위젯의 설정(테마, 활성 상품, API URL)을 반환한다.

**Response** `200 OK`:
```json
{
  "data": {
    "widget_id": "wgt_xxxxx",
    "name": "후니프린팅 주문 위젯",
    "status": "active",
    "theme": {
      "primary_color": "#5538b6",
      "secondary_color": "#eeebf9",
      "font_family": "Pretendard, sans-serif",
      "border_radius": "8px"
    },
    "api_base_url": "https://api.hooniprinting.com/api/v1",
    "allowed_origins": ["https://shop.example.com"],
    "features": {
      "file_upload": true,
      "editor_integration": true,
      "price_preview": true
    }
  }
}
```

**Cache**: `Cache-Control: public, max-age=300` (5분)

**Error Cases**:
- `404 Not Found`: 존재하지 않는 widget ID
- `403 Forbidden`: 위젯이 비활성 상태

#### REQ-061: Widget Embed Script (Event-Driven)

**WHEN** 브라우저가 `GET /api/widget/embed.js` 요청을 보내면,
**THEN** 시스템은 CDN 캐싱이 적용된 위젯 부트스트랩 스크립트를 반환한다.

**Response Headers**:
```
Content-Type: application/javascript
Cache-Control: public, max-age=86400, s-maxage=604800
ETag: "v1.0.0-abc123"
```

**Response Body**: Minified JavaScript bootstrap loader (< 5KB)

---

### 3.8 Authentication & Authorization

#### REQ-070: Widget Token Authentication (Ubiquitous)

시스템은 **항상** Catalog API와 Pricing API 요청에 대해 Widget Token을 검증해야 한다.

**Widget Token Structure** (JWT):
```json
{
  "sub": "wgt_xxxxx",
  "iss": "widget.huni.co.kr",
  "allowed_origins": ["https://shop.example.com"],
  "exp": 1740000000,
  "iat": 1739913600
}
```

**Verification Process**:
1. `X-Widget-Token` 헤더에서 JWT 추출
2. JWT 서명 검증 (HS256 또는 RS256)
3. `exp` 만료 시간 검증
4. `Origin` 헤더와 `allowed_origins` 클레임 비교
5. 위젯 `is_active` 상태 확인

**Error Response** (Widget Token 실패):
```json
{
  "type": "https://widget.huni.co.kr/errors/unauthorized",
  "title": "Widget Authentication Failed",
  "status": 401,
  "detail": "Widget token is expired or invalid",
  "instance": "/api/v1/catalog/products"
}
```

#### REQ-071: Admin JWT Authentication (Ubiquitous)

시스템은 **항상** Admin API와 Orders API (관리자)에 대해 JWT 세션 인증을 수행해야 한다.

**Token Lifecycle**:
- Access Token: 15분 유효기간, httpOnly 쿠키
- Refresh Token: 7일 유효기간, httpOnly + Secure 쿠키
- 자동 갱신: Access Token 만료 시 Refresh Token으로 자동 갱신

**Session Validation**:
1. NextAuth.js v5 `getServerSession()` 호출
2. 세션 유효성 및 사용자 역할(ADMIN, MANAGER, VIEWER) 확인
3. 역할 기반 접근 제어:
   - `ADMIN`: 모든 CRUD 및 삭제 가능
   - `MANAGER`: 조회 + 생성 + 수정 가능 (삭제 불가)
   - `VIEWER`: 조회만 가능

#### REQ-072: API Key Authentication (Ubiquitous)

시스템은 **항상** Integration API 요청에 대해 `X-API-Key` 헤더로 API Key를 검증해야 한다.

**API Key Properties**:
- UUID v4 기반 생성
- 클라이언트별 1개 키 발급
- 해시 저장 (bcrypt 또는 SHA-256)
- 만료 날짜 설정 가능
- 관리자에 의한 즉시 폐기 가능

**Validation Process**:
1. `X-API-Key` 헤더 추출
2. 해시 매칭으로 키 검증
3. 키 활성 상태 및 만료 날짜 확인
4. 클라이언트별 rate limit 적용

---

### 3.9 Middleware Stack

#### REQ-080: Request Processing Pipeline (Ubiquitous)

시스템은 **항상** 다음 순서의 미들웨어 체인을 통해 모든 API 요청을 처리해야 한다.

```
Request
  -> CORS Middleware
  -> Rate Limiting
  -> Authentication (scope-specific)
  -> Request Validation (Zod)
  -> Route Handler
  -> Response Transformation
  -> Error Transform (RFC 7807)
  -> Response
```

#### REQ-081: CORS Configuration (Ubiquitous)

시스템은 **항상** API 범위에 따라 적절한 CORS 정책을 적용해야 한다.

| API Scope | CORS Policy |
|-----------|-------------|
| Catalog, Pricing | Widget Token의 `allowed_origins` |
| Orders | Widget origins + Admin origin |
| Admin (tRPC) | Admin dashboard origin only |
| Integration | Server-to-server (no CORS needed) |
| Widget | `*` (public embed script) |

#### REQ-082: Rate Limiting (Ubiquitous)

시스템은 **항상** 인증 방식별로 다음 rate limit를 적용해야 한다.

| Auth Type | Rate Limit | Window | Key |
|-----------|-----------|--------|-----|
| API Key | 1000 req/min | Sliding window | API Key |
| Widget Token | 100 req/min | Sliding window | Widget ID + Client IP |
| Admin JWT | 5000 req/min | Sliding window | User ID |
| Unauthenticated | 30 req/min | Fixed window | Client IP |

**Rate Limit Response Headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1740000060
```

**429 Too Many Requests**:
```json
{
  "type": "https://widget.huni.co.kr/errors/rate-limit",
  "title": "Rate Limit Exceeded",
  "status": 429,
  "detail": "Widget token rate limit of 100 req/min exceeded",
  "instance": "/api/v1/catalog/products",
  "retry_after": 42
}
```

#### REQ-083: Input Validation (Ubiquitous)

시스템은 **항상** 모든 API 입력을 Zod 스키마로 검증하고, 검증 실패 시 RFC 7807 형식의 상세 오류를 반환해야 한다.

**Validation Error Response** `422 Unprocessable Entity`:
```json
{
  "type": "https://widget.huni.co.kr/errors/validation",
  "title": "Validation Error",
  "status": 422,
  "detail": "Request body validation failed: 2 errors",
  "instance": "/api/v1/pricing/quote",
  "errors": [
    {
      "field": "quantity",
      "code": "too_small",
      "message": "Quantity must be at least 1",
      "received": -5
    },
    {
      "field": "product_id",
      "code": "invalid_type",
      "message": "Expected number, received string",
      "received": "abc"
    }
  ]
}
```

---

### 3.10 Error Handling

#### REQ-090: RFC 7807 Error Response Format (Ubiquitous)

시스템은 **항상** 모든 API 오류 응답을 RFC 7807 Problem Details 형식으로 반환해야 한다.

**Base Error Schema**:
```typescript
const ProblemDetailSchema = z.object({
  type: z.string().url(),
  title: z.string(),
  status: z.number().int().min(400).max(599),
  detail: z.string(),
  instance: z.string(),
  errors: z.array(z.object({
    field: z.string().optional(),
    code: z.string(),
    message: z.string(),
    received: z.unknown().optional(),
  })).optional(),
  trace_id: z.string().uuid().optional(),
});
```

**Error Type Registry**:

| Type | Status | When |
|------|--------|------|
| `https://widget.huni.co.kr/errors/validation` | 400/422 | Input validation failure |
| `https://widget.huni.co.kr/errors/unauthorized` | 401 | Missing or invalid auth |
| `https://widget.huni.co.kr/errors/forbidden` | 403 | Insufficient permissions |
| `https://widget.huni.co.kr/errors/not-found` | 404 | Resource not found |
| `https://widget.huni.co.kr/errors/conflict` | 409 | State conflict (duplicate, invalid transition) |
| `https://widget.huni.co.kr/errors/rate-limit` | 429 | Rate limit exceeded |
| `https://widget.huni.co.kr/errors/internal` | 500 | Unexpected server error |
| `https://widget.huni.co.kr/errors/invalid-state-transition` | 409 | Invalid order state change |
| `https://widget.huni.co.kr/errors/option-constraint` | 400 | Option constraint violation |
| `https://widget.huni.co.kr/errors/price-calculation` | 500 | Pricing engine failure |

#### REQ-091: Error Logging and Tracing (Ubiquitous)

시스템은 **항상** 모든 4xx/5xx 오류에 대해 trace_id를 생성하고 서버 로그에 기록해야 한다.

- 5xx 오류: `console.error` + 향후 Sentry 연동 대비 구조화된 로깅
- 4xx 오류: `console.warn` + 비정상 패턴 감지 (rate limit 초과 빈도 등)

---

### 3.11 Response Format

#### REQ-100: Standard Response Envelope (Ubiquitous)

시스템은 **항상** 다음 표준 응답 형식을 사용해야 한다.

**Single Resource**:
```json
{
  "data": { /* resource object */ }
}
```

**Collection Resource**:
```json
{
  "data": [ /* resource array */ ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "total_pages": 5
  },
  "links": {
    "self": "/api/v1/...",
    "next": "/api/v1/...?page=2",
    "prev": null,
    "first": "/api/v1/...?page=1",
    "last": "/api/v1/...?page=5"
  }
}
```

**Empty Collection**:
```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "total_pages": 0
  },
  "links": {
    "self": "/api/v1/...",
    "next": null,
    "prev": null,
    "first": "/api/v1/...",
    "last": "/api/v1/..."
  }
}
```

#### REQ-101: Naming Convention (Ubiquitous)

시스템은 **항상** API 응답 필드명에 `snake_case`를 사용해야 한다.

- Database column: `created_at` -> API response: `created_at`
- TypeScript property: `createdAt` -> API response: `created_at` (변환 필요)

---

## 4. Specifications

### 4.1 File Structure

```
apps/web/app/api/
+-- v1/
|   +-- catalog/
|   |   +-- categories/
|   |   |   +-- route.ts                    # GET /categories
|   |   |   +-- [id]/
|   |   |       +-- route.ts                # GET /categories/:id
|   |   +-- products/
|   |       +-- route.ts                    # GET /products
|   |       +-- [id]/
|   |           +-- route.ts                # GET /products/:id
|   |           +-- sizes/route.ts          # GET /products/:id/sizes
|   |           +-- papers/route.ts         # GET /products/:id/papers
|   |           +-- options/route.ts        # GET /products/:id/options
|   |           +-- constraints/route.ts    # GET /products/:id/constraints
|   |           +-- dependencies/route.ts   # GET /products/:id/dependencies
|   +-- pricing/
|   |   +-- quote/
|   |   |   +-- route.ts                    # POST /quote
|   |   |   +-- preview/route.ts            # POST /quote/preview
|   |   +-- products/
|   |       +-- [id]/
|   |           +-- price-tiers/route.ts    # GET /products/:id/price-tiers
|   |           +-- fixed-prices/route.ts   # GET /products/:id/fixed-prices
|   +-- orders/
|   |   +-- route.ts                        # GET, POST /orders
|   |   +-- [id]/
|   |       +-- route.ts                    # GET, PATCH /orders/:id
|   |       +-- files/route.ts              # POST /orders/:id/files
|   +-- admin/
|   |   +-- trpc/
|   |       +-- [...trpc]/route.ts          # tRPC catch-all handler
|   +-- integration/
|       +-- shopby/
|       |   +-- products/route.ts           # GET /shopby/products
|       |   +-- products/[id]/sync/route.ts # POST /shopby/products/:id/sync
|       |   +-- orders/route.ts             # POST /shopby/orders
|       |   +-- orders/[id]/status/route.ts # PUT /shopby/orders/:id/status
|       +-- mes/
|       |   +-- items/route.ts              # GET /mes/items
|       |   +-- mappings/route.ts           # GET /mes/mappings
|       |   +-- orders/[id]/dispatch/route.ts # POST /mes/orders/:id/dispatch
|       |   +-- orders/[id]/status/route.ts   # PUT /mes/orders/:id/status
|       +-- edicus/
|           +-- products/route.ts           # GET /edicus/products
|           +-- products/[id]/config/route.ts # GET /edicus/products/:id/config
|           +-- designs/route.ts            # POST /edicus/designs
|           +-- designs/[id]/route.ts       # GET /edicus/designs/:id
+-- widget/
|   +-- config/[widgetId]/route.ts          # GET /widget/config/:widgetId
|   +-- embed.js/route.ts                   # GET /widget/embed.js
+-- trpc/
    +-- router.ts                           # Root tRPC router
    +-- context.ts                          # tRPC context factory
    +-- trpc.ts                             # tRPC init + middleware
    +-- routers/
        +-- category.router.ts
        +-- product.router.ts
        +-- size.router.ts
        +-- paper.router.ts
        +-- material.router.ts
        +-- print-mode.router.ts
        +-- post-process.router.ts
        +-- binding.router.ts
        +-- price-table.router.ts
        +-- price-tier.router.ts
        +-- fixed-price.router.ts
        +-- option.router.ts
        +-- constraint.router.ts
        +-- dependency.router.ts
        +-- order.router.ts
        +-- dashboard.router.ts
```

### 4.2 Shared Infrastructure

**Middleware Layer** (`apps/web/app/api/_lib/`):
```
_lib/
+-- middleware/
|   +-- auth.ts                  # Widget Token, JWT, API Key verification
|   +-- cors.ts                  # Scope-specific CORS configuration
|   +-- rate-limit.ts            # Token bucket / sliding window rate limiter
|   +-- validation.ts            # Zod validation wrapper
|   +-- error-handler.ts         # RFC 7807 error transformer
+-- schemas/
|   +-- common.ts                # Pagination, sorting, filtering schemas
|   +-- catalog.ts               # Catalog API request/response schemas
|   +-- pricing.ts               # Pricing API request/response schemas
|   +-- orders.ts                # Orders API request/response schemas
|   +-- integration.ts           # Integration API schemas
+-- utils/
    +-- pagination.ts            # Pagination helper (offset, limit, links)
    +-- response.ts              # Standard response envelope builder
    +-- transform.ts             # camelCase <-> snake_case transformer
```

### 4.3 OpenAPI 3.1 Specification (Key Endpoints)

```yaml
openapi: 3.1.0
info:
  title: Widget Builder API
  version: 1.0.0
  description: |
    후니프린팅 위젯 빌더 API. 5개 소비자 범위와 45+ 엔드포인트를 제공한다.
  contact:
    name: Huni Printing Dev Team
    url: https://widget.huni.co.kr
servers:
  - url: https://api.hooniprinting.com/api/v1
    description: Production
  - url: http://localhost:3000/api/v1
    description: Development

components:
  securitySchemes:
    WidgetToken:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: Widget JWT token via X-Widget-Token header
    AdminJWT:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: Admin session JWT via httpOnly cookie
    ApiKey:
      type: apiKey
      in: header
      name: X-API-Key
      description: Integration API key

  schemas:
    ProblemDetail:
      type: object
      required: [type, title, status, detail, instance]
      properties:
        type:
          type: string
          format: uri
          example: "https://widget.huni.co.kr/errors/validation"
        title:
          type: string
          example: "Validation Error"
        status:
          type: integer
          minimum: 400
          maximum: 599
        detail:
          type: string
        instance:
          type: string
        errors:
          type: array
          items:
            type: object
            properties:
              field: { type: string }
              code: { type: string }
              message: { type: string }
        trace_id:
          type: string
          format: uuid

    PaginationMeta:
      type: object
      properties:
        page: { type: integer, minimum: 1 }
        limit: { type: integer, minimum: 1, maximum: 100 }
        total: { type: integer, minimum: 0 }
        total_pages: { type: integer, minimum: 0 }

    PaginationLinks:
      type: object
      properties:
        self: { type: string }
        next: { type: string, nullable: true }
        prev: { type: string, nullable: true }
        first: { type: string }
        last: { type: string }

paths:
  /catalog/products:
    get:
      summary: List products
      tags: [Catalog]
      security:
        - WidgetToken: []
      parameters:
        - name: category_id
          in: query
          schema: { type: integer }
        - name: product_type
          in: query
          schema: { type: string }
        - name: page
          in: query
          schema: { type: integer, default: 1 }
        - name: limit
          in: query
          schema: { type: integer, default: 20, maximum: 100 }
      responses:
        '200':
          description: Product list
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/ProductSummary'
                  meta:
                    $ref: '#/components/schemas/PaginationMeta'
                  links:
                    $ref: '#/components/schemas/PaginationLinks'
        '401':
          description: Unauthorized
          content:
            application/problem+json:
              schema:
                $ref: '#/components/schemas/ProblemDetail'

  /pricing/quote:
    post:
      summary: Calculate full quote
      tags: [Pricing]
      security:
        - WidgetToken: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/QuoteRequest'
      responses:
        '200':
          description: Quote calculated successfully
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    $ref: '#/components/schemas/QuoteResponse'
        '400':
          description: Invalid option combination
          content:
            application/problem+json:
              schema:
                $ref: '#/components/schemas/ProblemDetail'
        '422':
          description: Constraint violation
          content:
            application/problem+json:
              schema:
                $ref: '#/components/schemas/ProblemDetail'
```

### 4.4 Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Catalog API latency (P95) | < 100ms | GET endpoints with DB query |
| Pricing quote latency (P95) | < 200ms | POST /quote with full calculation |
| Price preview latency (P95) | < 50ms | POST /quote/preview partial |
| Orders API latency (P95) | < 200ms | CRUD operations |
| Admin tRPC latency (P95) | < 300ms | Complex queries with joins |
| Rate limit check latency | < 5ms | In-memory lookup |
| Widget config latency (P95) | < 50ms | Cached response |
| Concurrent connections | 1000+ | Vercel Serverless scaling |

### 4.5 Security Requirements

#### OWASP Compliance

- **Input Validation**: Zod 스키마로 모든 입력 검증. unknown fields 거부 (`z.object().strict()`)
- **SQL Injection**: Drizzle ORM 파라미터화 쿼리로 차단
- **XSS**: JSON 응답만 제공, HTML 렌더링 없음
- **CSRF**: SameSite=Strict 쿠키 + CSRF 토큰 (Admin)
- **Mass Assignment**: Zod 스키마로 허용 필드 명시적 선언
- **Sensitive Data Exposure**: 응답에서 비밀번호 해시, 내부 코스트 가격 제외

#### Data Privacy

- 주문 목록 API에서 고객 전화번호 부분 마스킹 (`010-****-5678`)
- API Key는 해시만 저장, 원본 반환하지 않음
- 관리자 세션 로그에 민감 데이터 제외

---

## 5. Traceability

| Requirement | Product Feature | DB Schema | API Endpoint |
|-------------|----------------|-----------|-------------|
| REQ-010~018 | P0.1 위젯 옵션 관리 | categories, products, productSizes, papers, optionDefinitions, optionChoices, optionConstraints, optionDependencies | GET /catalog/* |
| REQ-020~023 | P0.2 가격 엔진 | priceTables, priceTiers, fixedPrices, packagePrices, foilPrices | POST /pricing/quote, GET /pricing/* |
| REQ-030~034 | P1.4 주문 관리 | orders (future table) | POST/GET/PATCH /orders/* |
| REQ-040~043 | P0.1 관리자 CRUD | All 26 Huni tables | tRPC /admin/trpc/* |
| REQ-050~052 | P2.8 MES/Shopby/Edicus 연동 | mesItems, productMesMappings, productEditorMappings | /integration/* |
| REQ-060~061 | P0.3 임베더블 위젯 | widgets (future table) | GET /widget/* |
| REQ-070~072 | 인증/보안 | users (future table) | Middleware layer |
| REQ-080~083 | 인프라 | - | Middleware pipeline |
| REQ-090~091 | 에러 처리 | - | Error handler |
| REQ-100~101 | 응답 표준 | - | Response transformer |

---

## 6. Non-Functional Requirements

### 6.1 Availability

- 99.9% uptime target (Vercel SLA)
- Graceful degradation: 가격 엔진 오류 시 카탈로그 API는 계속 동작

### 6.2 Scalability

- Vercel Serverless Functions의 자동 스케일링에 의존
- Stateless API 설계로 수평 확장 보장
- 데이터베이스 연결 풀링: postgres.js pool (max 10 connections per function instance)

### 6.3 Observability

- 구조화된 JSON 로깅 (timestamp, trace_id, method, path, status, latency)
- 향후 Sentry 연동을 위한 에러 분류 체계 사전 설계
- Rate limit 위반 빈도 모니터링

### 6.4 Versioning Strategy

- URL 기반 버저닝: `/api/v1/`
- Breaking change 시 `/api/v2/` 신규 버전 추가
- 이전 버전은 최소 6개월 유지 후 deprecation

---

## 7. Dependencies and Risks

### 7.1 Dependencies

| Dependency | Type | Impact |
|-----------|------|--------|
| SPEC-INFRA-001 | Completed | Drizzle ORM 마이그레이션 완료, DB 스키마 사용 가능 |
| SPEC-DATA-002 | Completed | 인쇄 자동견적 데이터 정규화, 시더 데이터 사용 가능 |
| NextAuth.js v5 | External | Admin JWT 인증 구현에 필수 |
| tRPC 11.x | External | Admin 대시보드 type-safe RPC |
| Vercel | Infrastructure | Serverless Functions 호스팅 |

### 7.2 Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Serverless cold start로 가격 계산 지연 | Medium | Medium | pricing-engine을 경량 유지, 캐싱 적용 |
| tRPC + Next.js 16 통합 이슈 | Low | High | 공식 @trpc/next 어댑터 사용, 폴백으로 REST 준비 |
| Rate limiting 정확도 (서버리스 환경) | Medium | Low | 초기 in-memory, P1에서 Redis 전환 |
| Widget Token 유출 시 악용 | Low | Medium | Origin 검증 + 짧은 만료 시간 + 즉시 폐기 기능 |
| 26개 테이블 CRUD의 보일러플레이트 | High | Low | tRPC 라우터 제네릭 패턴으로 자동 생성 |

---

## 8. Expert Consultation Recommendations

이 SPEC은 다음 도메인에 대한 전문가 자문을 권장한다:

- **expert-backend**: API 라우팅 아키텍처, tRPC 통합, 미들웨어 체인 설계, 에러 핸들링 패턴
- **expert-security**: Widget Token 보안, CORS 정책, Rate Limiting 전략, API Key 관리
- **expert-frontend**: tRPC 클라이언트 통합 (Admin 대시보드), Widget SDK API 클라이언트 설계

---

## 9. Implementation Notes (Post-Run Phase)

**구현 완료일**: 2026-02-23
**커밋**: ae8b69b (190 files, +33561 additions)
**브랜치**: feature/SPEC-WIDGET-API-001

### 9.1 구현 완료 항목

| 항목 | SPEC 요구사항 | 구현 결과 |
|------|-------------|---------|
| REST 엔드포인트 수 | 45+ | 30개 REST + tRPC 별도 |
| Catalog API | REQ-010~018 (9개) | 완료 |
| Pricing API | REQ-020~023 (4개) | 완료 |
| Orders API | REQ-030~032 (3개, REQ-033~034 미포함) | 3개 완료 |
| Widget API | REQ-060~061 (2개) | 완료 |
| Integration API | REQ-050~052 (12개) | 완료 |
| Admin tRPC 라우터 | REQ-040~043 (16개 도메인) | 완료 |
| `createCrudRouter` 팩토리 | REQ-041 표준 CRUD | 완료 |
| RFC 7807 에러 핸들링 | REQ-090~091 | 완료 |
| Widget Token 인증 | REQ-070 | 완료 |
| Admin JWT (NextAuth.js v5) | REQ-071 | 완료 |
| API Key 인증 | REQ-072 | 환경변수 기반 완료 (DB 조회 Phase 1 이연) |
| CORS (범위별) | REQ-081 | 완료 |
| Rate Limiting (Sliding Window) | REQ-082 | In-memory 완료 |
| Zod 입력 검증 | REQ-083 | 완료 |
| 표준 응답 Envelope | REQ-100~101 | 완료 |
| Drizzle 스키마 추가 | orders, widgets 테이블 | 완료 |
| 단위 테스트 | 85%+ coverage | 341개 테스트, 93.97% coverage |

### 9.2 기술적 결정사항 (SPEC 대비 변경)

- **Next.js 버전**: SPEC은 16.x를 명시했으나, 실제 구현은 Next.js 15.x로 진행됨 (최신 안정 버전 기준)
- **WIDGET_TOKEN_SECRET**: 초기 구현에서 fallback 값이 포함되었으나, TRUST 5 보안 검증 후 제거됨. 환경변수 미설정 시 서버 시작 거부
- `withMiddleware` HOF: SPEC의 미들웨어 체인을 함수형 컴포지션 패턴으로 구현

### 9.3 알려진 제한사항 및 Phase 1 이연 항목

1. **tRPC 단위 테스트**: drizzle-zod가 실제 DB 연결을 요구하여 단위 테스트 작성 불가. Phase 1에서 통합 테스트로 커버 예정
2. **API Key DB 조회**: 현재 환경변수 기반 검증으로 구현됨. Phase 1에서 DB 기반 API Key 관리 및 즉시 폐기 기능 구현 예정
3. **Rate Limiting**: In-memory Sliding Window 구현. Vercel Serverless 환경에서는 인스턴스별 독립 메모리로 정확도 제한. Phase 1에서 Redis 전환 예정
4. **REQ-033~034 (주문 상태 업데이트, 파일 업로드)**: 해당 엔드포인트는 구현되었으나 S3 스토리지 연동이 미완성 상태
5. **DB 마이그레이션**: orders, orderStatusHistory, orderDesignFiles, widgets 4개 테이블 추가. 기존 환경에서 마이그레이션 필요

### 9.4 품질 게이트 결과

| 게이트 | 목표 | 결과 |
|--------|------|------|
| Statement Coverage | 85%+ | 93.97% |
| 단위 테스트 수 | - | 341개 전체 통과 |
| TypeScript 에러 | 0 | 0 |
| WIDGET_TOKEN_SECRET fallback | 없어야 함 | 제거 완료 |
| RFC 7807 에러 형식 | 전 엔드포인트 | 완료 |
