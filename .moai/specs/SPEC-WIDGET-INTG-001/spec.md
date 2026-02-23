# SPEC-WIDGET-INTG-001: External System Integration Layer

---
id: SPEC-WIDGET-INTG-001
title: External System Integration Layer
version: 1.0.0
status: completed
created: 2026-02-22
updated: 2026-02-22
author: MoAI
priority: P1
tags: integration, shopby, mes, edicus, events, adapters, webhooks
related_specs: [SPEC-INFRA-001, SPEC-DATA-002, SPEC-SHOPBY-001, SPEC-SHOPBY-002, SPEC-SHOPBY-003, SPEC-SHOPBY-004, SPEC-SHOPBY-005, SPEC-SHOPBY-006]
---

## 1. Environment

### 1.1 System Context

Widget Creator(widget.creator)는 Turborepo 기반 모노레포로, 3개 외부 시스템과 연동하는 "사령탑(Command Center)" 역할을 수행한다.

| External System | Role | Integration Direction |
|----------------|------|----------------------|
| **Shopby** | E-commerce platform (shopping mall) | Bidirectional: product sync out, order/webhook in |
| **MES** | Manufacturing Execution System (TS.BackOffice.Huni) | Bidirectional: production dispatch out, status callback in |
| **Edicus** | Design editor (prepress) | Bidirectional: config out, design/render in |

### 1.2 Technology Stack

- **Runtime**: Node.js 22.x LTS
- **Framework**: Next.js 16 (API Routes) or Hono
- **Language**: TypeScript 5.7+ (strict mode)
- **ORM**: Drizzle ORM (postgres.js driver)
- **Database**: PostgreSQL 16.x
- **Validation**: Zod 3.x
- **Testing**: Vitest 3.x
- **Package**: `packages/shared/src/` (shared module within monorepo)

### 1.3 4-Code System (SPEC-DATA-002 Reference)

Widget Builder는 4종의 외부 식별자를 관리하며, huni_code가 모든 매핑의 중추적 식별자이다.

| Code | Owner | Format | Purpose |
|------|-------|--------|---------|
| `huni_code` | Widget Builder | VARCHAR(10), 5-digit | Central product identifier |
| `edicus_code` | Edicus | VARCHAR(15), `HU_` + huni_code | Auto-derived design code |
| `shopby_id` | Shopby | INTEGER | Platform product ID (future) |
| MES `ITEM_CD` | MES | VARCHAR(20), `NNN-NNNN` | Manufacturing item code |

### 1.4 Existing Database Schema

SPEC-DATA-002에서 정의된 26개 Huni 도메인 테이블이 `packages/shared/src/db/schema/`에 존재하며, 통합 관련 테이블은 `huni-integration.schema.ts`에 정의되어 있다.

- `mes_items`: MES 품목 마스터 (260개)
- `mes_item_options`: MES 품목당 최대 10개 옵션
- `product_mes_mapping`: 상품-MES 품목 양방향 매핑
- `product_editor_mapping`: 상품-Edicus 에디터 1:1 매핑 (111개)
- `option_choice_mes_mapping`: 옵션 선택지-MES 자재/공정 매핑

### 1.5 Related SPECs

- **SPEC-INFRA-001**: Drizzle ORM migration (completed)
- **SPEC-DATA-002**: Data normalization schema and seeder (completed)
- **SPEC-SHOPBY-001~006**: 6개 Shopby integration SPECs (planned, future)

---

## 2. Assumptions

### 2.1 Validated Assumptions

- A1: 외부 시스템(Shopby, MES, Edicus) API는 RESTful HTTP 기반이다
- A2: 외부 시스템 연동은 비동기로 처리하며, 실패 시 재시도가 가능하다
- A3: `products.shopby_id` 컬럼은 nullable로 이미 존재하며, Shopby 등록 시점에 설정된다
- A4: MES 매핑은 `option_choice_mes_mapping`의 `mapping_status='verified'` 상태인 것만 생산 발주에 사용한다
- A5: Edicus의 `edicus_code`는 `'HU_' + huni_code`로 자동 파생된다
- A6: Domain event system은 MVP 단계에서 in-process EventEmitter 패턴으로 구현하며, 추후 Redis Pub/Sub 또는 BullMQ로 확장 가능하다
- A7: 모든 integration API는 `/api/v1/integration/` 경로 하위에 격리된다

### 2.2 Unvalidated Assumptions

- A8: Shopby API 인증 방식은 API Key 기반으로 추정 (Shopby API 문서 확인 필요)
- A9: MES API는 현재 EXCEL import/export 기반이며, REST API 전환 시점 미확정
- A10: Edicus render API의 응답 시간은 10초 이내로 추정

### 2.3 Constraints

- C1: Widget Builder는 모든 외부 시스템 연동의 단일 진입점(single point of integration)이다
- C2: 외부 시스템 장애가 Widget Builder 핵심 기능(견적, 위젯)에 영향을 주어서는 안 된다
- C3: Integration API 응답 시간은 P95 기준 200ms 이내 (webhook callback 제외)
- C4: API versioning(`/api/v1/`)을 통해 하위 호환성을 보장한다

---

## 3. Requirements

### 3.1 Domain Event System

#### REQ-EVT-001: Event Bus Infrastructure (Ubiquitous)

시스템은 **항상** 도메인 이벤트를 발행하고 구독할 수 있는 in-process event bus를 제공해야 한다.

**EARS**: The event bus **shall** provide publish-subscribe capability for all domain events defined in the DomainEvent type union.

- Event bus는 typed event를 지원하며, 각 이벤트는 `type`, `payload`, `timestamp`, `correlationId`를 포함한다
- 이벤트 핸들러는 비동기(async)로 실행되며, 핸들러 실패가 이벤트 발행자에 영향을 주지 않는다
- 이벤트 발행은 fire-and-forget 패턴을 따른다

#### REQ-EVT-002: Event Type Definitions (Ubiquitous)

시스템은 **항상** 다음 도메인 이벤트 타입을 지원해야 한다.

**EARS**: The system **shall** support the following domain event categories: product lifecycle, pricing, quote, order, widget, and integration events.

**Product Lifecycle Events**:

| Event Type | Payload | Trigger |
|-----------|---------|---------|
| `product.created` | `{ productId: number; huniCode: string }` | Product created in Widget Builder |
| `product.updated` | `{ productId: number; changes: Partial<Product> }` | Product fields modified |
| `product.deactivated` | `{ productId: number }` | Product soft-deleted |

**Pricing Events**:

| Event Type | Payload | Trigger |
|-----------|---------|---------|
| `price.changed` | `{ productId: number; priceTableId: number }` | Price table or tier modified |

**Quote Events**:

| Event Type | Payload | Trigger |
|-----------|---------|---------|
| `quote.calculated` | `QuoteResult` | Quote calculation completed |
| `quote.snapshot.created` | `{ quoteId: string; snapshot: QuoteSnapshot }` | Quote snapshot saved |

**Order Events**:

| Event Type | Payload | Trigger |
|-----------|---------|---------|
| `order.created` | `{ orderId: string; source: 'widget' \| 'shopby' \| 'admin' }` | New order created |
| `order.status.changed` | `{ orderId: string; from: OrderStatus; to: OrderStatus }` | Order status transition |
| `order.dispatched.mes` | `{ orderId: string; mesJobId: string }` | Order dispatched to MES |

**Widget Events**:

| Event Type | Payload | Trigger |
|-----------|---------|---------|
| `widget.config.updated` | `{ widgetId: string }` | Widget configuration changed |

**Integration Events**:

| Event Type | Payload | Trigger |
|-----------|---------|---------|
| `sync.shopby.completed` | `{ productId: number; shopbyId: number }` | Product synced to Shopby |
| `mapping.mes.verified` | `{ choiceId: number; mesItemId: number }` | MES mapping verified |

#### REQ-EVT-003: Event Handler Registration (Ubiquitous)

시스템은 **항상** IntegrationAdapter 인터페이스를 통해 외부 시스템 어댑터의 이벤트 구독을 관리해야 한다.

**EARS**: The system **shall** manage adapter event subscriptions through the IntegrationAdapter interface, supporting subscribe, unsubscribe, and health check operations.

```
IntegrationAdapter {
  name: string
  subscribedEvents: string[]
  handleEvent(event: DomainEvent): Promise<void>
  healthCheck(): Promise<boolean>
}
```

---

### 3.2 Integration Adapter Pattern

#### REQ-ADP-001: Adapter Registration (Ubiquitous)

시스템은 **항상** 어댑터 등록/해제 메커니즘을 제공해야 한다.

**EARS**: The system **shall** provide an adapter registry that supports registration, deregistration, and discovery of IntegrationAdapter implementations.

- 어댑터는 application startup 시 자동 등록된다
- 각 어댑터는 health check endpoint를 노출한다
- 어댑터 실패 시 다른 어댑터에 영향을 주지 않는다

#### REQ-ADP-002: Adapter Isolation (Unwanted)

시스템은 어댑터 실패가 핵심 비즈니스 로직에 전파되**지 않아야 한다**.

**EARS**: The system **shall not** propagate adapter failures to core business logic. Each adapter **shall** handle its own errors independently, logging failures and triggering retry mechanisms without affecting the event bus or other adapters.

---

### 3.3 Shopby Integration Adapter

#### REQ-SHOPBY-001: Product Sync to Shopby (Event-Driven)

**WHEN** `product.created` 또는 `product.updated` 이벤트가 발생하면 **THEN** Shopby 어댑터는 해당 상품 정보를 Shopby API 형식으로 변환하여 동기화해야 한다.

**EARS**: **When** a `product.created` or `product.updated` event is emitted, the Shopby adapter **shall** translate the product data to Shopby API format and synchronize it to the Shopby platform.

**Sync Flow**:
1. Event received by ShopbyAdapter
2. Product data fetched from Widget Builder DB
3. Data transformed via ShopbyMapper (huni_code -> Shopby product format)
4. POST/PUT to Shopby Product API
5. Shopby returns `shopby_id`
6. Widget Builder stores `shopby_id` in `products.shopby_id` column
7. `sync.shopby.completed` event emitted

#### REQ-SHOPBY-002: Order Reception from Shopby (Event-Driven)

**WHEN** Shopby에서 주문 webhook이 수신되면 **THEN** 시스템은 주문 레코드를 생성하고 MES 발주를 트리거해야 한다.

**EARS**: **When** an order webhook is received from Shopby, the system **shall** create an order record with `source='shopby'`, emit an `order.created` event, and trigger MES production dispatch if all MES mappings are verified.

#### REQ-SHOPBY-003: Shopby API Endpoints (Ubiquitous)

시스템은 **항상** Shopby 연동을 위한 다음 API 엔드포인트를 제공해야 한다.

**EARS**: The system **shall** expose the following Shopby integration API endpoints under `/api/v1/integration/shopby/`.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/integration/shopby/products` | List products ready for Shopby sync |
| POST | `/api/v1/integration/shopby/products/:id/sync` | Trigger manual sync to Shopby |
| POST | `/api/v1/integration/shopby/orders` | Receive order from Shopby webhook |
| PUT | `/api/v1/integration/shopby/orders/:id/status` | Order status callback to Shopby |
| GET | `/api/v1/integration/shopby/categories` | Category mapping between systems |

---

### 3.4 MES Integration Adapter

#### REQ-MES-001: Production Dispatch (Event-Driven)

**WHEN** `order.created` 이벤트가 발생하고 **IF** 해당 주문의 모든 옵션 선택지가 `mapping_status='verified'`인 MES 매핑을 보유하면 **THEN** 시스템은 MES에 생산 발주를 전송해야 한다.

**EARS**: **While** all option choice MES mappings for the order have `mapping_status='verified'`, **when** an `order.created` event is emitted, the system **shall** translate the order options to MES material/process codes via `option_choice_mes_mapping` and dispatch a production job to the MES API.

**Dispatch Flow**:
1. Order created event received
2. Verify all option choices have verified MES mappings
3. Translate order options to MES material/process codes using mapping tables:
   - `product_mes_mapping`: product -> MES item
   - `option_choice_mes_mapping`: option choice -> MES material/process code
4. POST dispatch to MES API with translated codes
5. MES returns `mesJobId`
6. `order.dispatched.mes` event emitted
7. Order status updated to '제작대기'

#### REQ-MES-002: MES Status Tracking (Event-Driven)

**WHEN** MES에서 상태 변경 콜백이 수신되면 **THEN** 시스템은 주문 상태를 업데이트하고 `order.status.changed` 이벤트를 발행해야 한다.

**EARS**: **When** a status callback is received from MES, the system **shall** update the order status and emit an `order.status.changed` event.

**MES Status Flow**:

| MES Status | Widget Builder OrderStatus | Transition |
|-----------|---------------------------|------------|
| 제작대기 | `PRODUCTION_WAITING` | Order dispatched |
| 제작중 | `PRODUCING` | Production started |
| 제작완료 | `PRODUCTION_DONE` | Production finished |
| 출고완료 | `SHIPPED` | Shipment completed |

#### REQ-MES-003: MES Mapping Workflow (State-Driven)

**IF** 옵션 선택지가 생성되면 **THEN** 시스템은 자동으로 `option_choice_mes_mapping` 레코드를 `pending` 상태로 생성해야 한다.

**EARS**: **When** an option choice is created, the system **shall** auto-create an `option_choice_mes_mapping` record with `mapping_status='pending'`.

**Mapping Status State Machine**:
```
pending -> mapped (admin manually maps MES code)
mapped -> verified (admin verification step)
verified -> mapped (re-mapping needed)
```

- `mapping_type`은 `option_definitions.option_class` 기반 자동 판별:
  - `material` class -> `mapping_type='material'`
  - `process` class -> `mapping_type='process'`
  - `setting` class -> mapping 제외

#### REQ-MES-004: MES API Endpoints (Ubiquitous)

시스템은 **항상** MES 연동을 위한 다음 API 엔드포인트를 제공해야 한다.

**EARS**: The system **shall** expose the following MES integration API endpoints under `/api/v1/integration/mes/`.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/integration/mes/items` | Browse MES items |
| GET | `/api/v1/integration/mes/mappings` | List product-MES mappings |
| POST | `/api/v1/integration/mes/orders/:id/dispatch` | Dispatch order to MES |
| PUT | `/api/v1/integration/mes/orders/:id/status` | MES status callback |
| GET | `/api/v1/integration/mes/items/:id/options` | MES item options |

---

### 3.5 Edicus Integration Adapter

#### REQ-EDICUS-001: Editor Configuration (Event-Driven)

**WHEN** 고객이 위젯에서 "테마로 디자인하기" 버튼을 클릭하면 **THEN** 시스템은 `product_editor_mapping` 기반으로 Edicus 에디터 설정을 제공해야 한다.

**EARS**: **When** a customer requests the design editor, the system **shall** provide editor configuration based on `product_editor_mapping`, including template ID, constraints, and product-specific settings derived from `edicus_code`.

**Editor Launch Flow**:
1. Customer clicks "테마로 디자인하기" in widget
2. Widget SDK requests editor config from API
3. API fetches `product_editor_mapping` by product ID
4. Config includes: `edicus_code`, `template_id`, `template_config`, size constraints
5. Widget SDK opens Edicus editor with the config
6. Edicus loads template based on `edicus_code` (`'HU_' + huni_code`)

#### REQ-EDICUS-002: Design Save and Render (Event-Driven)

**WHEN** 고객이 Edicus에서 디자인 편집을 완료하면 **THEN** 시스템은 디자인을 저장하고 인쇄용 렌더링을 트리거해야 한다.

**EARS**: **When** a customer completes design editing in Edicus, the system **shall** save the design data, trigger print-ready rendering, and store the rendered file URL for order processing.

**Render Flow**:
1. Customer completes design in Edicus
2. Edicus sends design data to Widget Builder API
3. Widget Builder saves design record
4. Widget Builder triggers render via Edicus Render API
5. Edicus renders print-ready file (async)
6. Render status polling or callback
7. Rendered file uploaded to S3-compatible storage
8. Design record updated with rendered file URL
9. Order continues with rendered file

#### REQ-EDICUS-003: Edicus API Endpoints (Ubiquitous)

시스템은 **항상** Edicus 연동을 위한 다음 API 엔드포인트를 제공해야 한다.

**EARS**: The system **shall** expose the following Edicus integration API endpoints under `/api/v1/integration/edicus/`.

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/integration/edicus/products` | List editor-enabled products (111 products) |
| GET | `/api/v1/integration/edicus/products/:id/config` | Editor config (template, constraints) |
| POST | `/api/v1/integration/edicus/designs` | Save design from editor |
| GET | `/api/v1/integration/edicus/designs/:id` | Retrieve saved design |
| POST | `/api/v1/integration/edicus/render` | Trigger print-ready render |
| GET | `/api/v1/integration/edicus/render/:id/status` | Render job status |

---

### 3.6 Error Handling and Resilience

#### REQ-ERR-001: Retry with Exponential Backoff (Event-Driven)

**WHEN** 외부 시스템 API 호출이 실패하면 **THEN** 시스템은 exponential backoff 전략으로 재시도해야 한다.

**EARS**: **When** an external system API call fails, the system **shall** retry with exponential backoff (base: 1s, max: 30s, max retries: 3) before marking the operation as failed.

- 1차 재시도: 1초 후
- 2차 재시도: 2초 후
- 3차 재시도: 4초 후
- 3회 실패 시: 오류 로그 기록, 관리자 알림, 수동 재시도 대기

#### REQ-ERR-002: Circuit Breaker (State-Driven)

**IF** 특정 외부 시스템이 연속 5회 이상 실패하면 **THEN** 시스템은 해당 어댑터에 대해 circuit breaker를 활성화해야 한다.

**EARS**: **While** an external system has failed 5 or more consecutive times, the system **shall** activate the circuit breaker for that adapter, rejecting new requests immediately and attempting a health check probe every 60 seconds. **When** the health check succeeds, the circuit breaker **shall** transition to half-open state, allowing a single test request before fully reopening.

**Circuit Breaker States**:
```
CLOSED (normal) -> OPEN (after 5 consecutive failures)
OPEN -> HALF_OPEN (after 60s cooldown)
HALF_OPEN -> CLOSED (if health check succeeds)
HALF_OPEN -> OPEN (if health check fails)
```

#### REQ-ERR-003: Dead Letter Queue (Event-Driven)

**WHEN** 이벤트 핸들러가 최대 재시도 횟수를 초과하여 실패하면 **THEN** 시스템은 해당 이벤트를 dead letter queue에 저장해야 한다.

**EARS**: **When** an event handler exceeds the maximum retry count, the system **shall** store the failed event in a dead letter queue (database-backed for MVP) with the original event payload, error details, and failure timestamp for manual inspection and replay.

#### REQ-ERR-004: External System Fault Isolation (Unwanted)

시스템은 외부 시스템 장애가 견적 계산 또는 위젯 렌더링 기능에 영향을 주**지 않아야 한다**.

**EARS**: The system **shall not** allow external system failures to affect quote calculation, widget rendering, or admin dashboard functionality. Integration operations **shall** be isolated from core business operations.

---

### 3.7 Data Mapping

#### REQ-MAP-001: Shopby Data Mapper (Ubiquitous)

시스템은 **항상** Widget Builder 상품 데이터를 Shopby API 형식으로, Shopby 주문 데이터를 Widget Builder 형식으로 양방향 변환할 수 있어야 한다.

**EARS**: The system **shall** provide bidirectional data mapping between Widget Builder product/order formats and Shopby API formats through the ShopbyMapper module.

**Product Mapping (Widget Builder -> Shopby)**:

| Widget Builder Field | Shopby Field | Transform |
|---------------------|-------------|-----------|
| `products.huni_code` | `productNo` (reference) | Direct mapping |
| `products.name` | `productName` | Direct mapping |
| `categories.name` | `categoryNo` | Category mapping table lookup |
| `products.shopby_id` | `productNo` | Stored after first sync |
| `fixed_prices.selling_price` | `salePrice` | Price aggregation |

**Order Mapping (Shopby -> Widget Builder)**:

| Shopby Field | Widget Builder Field | Transform |
|-------------|---------------------|-----------|
| `orderNo` | `orders.external_order_id` | Direct mapping |
| `productNo` | `orders.product_id` | Lookup via `products.shopby_id` |
| `optionValues` | `orders.selected_options` | Option code translation |
| `orderAmount` | `orders.total_price` | Direct mapping |

#### REQ-MAP-002: MES Data Mapper (Ubiquitous)

시스템은 **항상** 주문 옵션 선택지를 MES 자재/공정 코드로 변환할 수 있어야 한다.

**EARS**: The system **shall** translate order option choices to MES material and process codes through the MesMapper module using `option_choice_mes_mapping` and `product_mes_mapping` tables.

**MES Code Translation**:

| Source | Lookup Table | Target |
|--------|-------------|--------|
| `order.product_id` | `product_mes_mapping` | MES `item_code` |
| `order.selected_options[].choice_id` | `option_choice_mes_mapping` | MES `mes_code` (material/process) |
| `order.quantity` | Direct | MES production quantity |

- Only `mapping_status='verified'` mappings are used for production dispatch
- Unmapped options (`mapping_status='pending'` or `'mapped'`) block production dispatch

#### REQ-MAP-003: Edicus Data Mapper (Ubiquitous)

시스템은 **항상** 상품 정보를 Edicus 에디터 설정으로 변환할 수 있어야 한다.

**EARS**: The system **shall** translate product data to Edicus editor configuration through the EdicusMapper module using `product_editor_mapping` and derived `edicus_code`.

**Edicus Config Mapping**:

| Source | Transform | Target |
|--------|-----------|--------|
| `products.huni_code` | `'HU_' + huni_code` | `edicus_code` |
| `product_editor_mapping.template_id` | Direct | Editor template ID |
| `product_editor_mapping.template_config` | Direct | Editor constraints |
| `product_sizes` (by product) | Size constraints | Editor canvas size |

---

## 4. Specifications

### 4.1 File Structure

```
packages/shared/src/
  events/
    types.ts              # DomainEvent type union, EventMetadata
    bus.ts                # EventBus implementation (in-process)
    dead-letter.ts        # Dead letter queue (DB-backed)
    index.ts              # Public exports
  integration/
    types.ts              # IntegrationAdapter interface, AdapterRegistry
    circuit-breaker.ts    # CircuitBreaker implementation
    retry.ts              # Retry with exponential backoff utility
    adapter-registry.ts   # Adapter registration and lifecycle
    shopby/
      adapter.ts          # ShopbyAdapter (implements IntegrationAdapter)
      types.ts            # Shopby-specific API types
      mapper.ts           # ShopbyMapper (product/order bidirectional)
    mes/
      adapter.ts          # MesAdapter (implements IntegrationAdapter)
      types.ts            # MES-specific API types
      mapper.ts           # MesMapper (option choice -> MES code)
    edicus/
      adapter.ts          # EdicusAdapter (implements IntegrationAdapter)
      types.ts            # Edicus-specific API types
      mapper.ts           # EdicusMapper (product -> editor config)
    index.ts              # Public exports

apps/api/src/routes/
  integration/
    shopby.ts             # Shopby integration endpoints
    mes.ts                # MES integration endpoints
    edicus.ts             # Edicus integration endpoints
```

### 4.2 Event Bus Architecture

```
                    +-------------------+
                    |    EventBus        |
                    |  (in-process)      |
                    +--------+----------+
                             |
              emit()         | subscribe()
                             |
         +-------------------+-------------------+
         |                   |                   |
  +------v------+    +------v------+    +-------v-----+
  | ShopbyAdapter|    | MesAdapter  |    |EdicusAdapter|
  |              |    |             |    |             |
  | subscribed:  |    | subscribed: |    | subscribed: |
  | product.*    |    | order.*     |    | (on-demand) |
  | order.*      |    | mapping.*   |    |             |
  +--------------+    +-------------+    +-------------+
         |                   |                   |
    [CircuitBreaker]    [CircuitBreaker]    [CircuitBreaker]
         |                   |                   |
    [Retry w/ Backoff]  [Retry w/ Backoff]  [Retry w/ Backoff]
         |                   |                   |
  +------v------+    +------v------+    +-------v-----+
  | Shopby API   |    | MES API     |    | Edicus API  |
  +--------------+    +-------------+    +-------------+
```

### 4.3 Integration Data Flow Diagrams

#### 4.3.1 Shopby Product Sync Flow

```
Admin creates/updates product
         |
         v
  [Widget Builder Core]
         |
    emit('product.updated')
         |
         v
  [EventBus] --subscribe--> [ShopbyAdapter]
                                   |
                            [ShopbyMapper.toShopbyProduct()]
                                   |
                            [CircuitBreaker check]
                                   |
                     +------- CLOSED --------+
                     |                       |
              POST /shopby/api          (OPEN: queue for retry)
                     |
              shopby_id returned
                     |
              UPDATE products SET shopby_id = ?
                     |
              emit('sync.shopby.completed')
```

#### 4.3.2 Order-to-MES Dispatch Flow

```
Order confirmed (payment complete)
         |
    emit('order.created', { source: 'widget' | 'shopby' })
         |
         v
  [MesAdapter]
         |
    1. Verify all option_choice_mes_mapping.mapping_status = 'verified'
         |
    +--- All verified? ---+
    |                     |
   YES                   NO
    |                     |
    v                     v
  [MesMapper]         Log warning,
    |                 skip dispatch,
    |                 notify admin
    v
  Translate options:
    - product_mes_mapping -> MES item_code
    - option_choice_mes_mapping -> MES material/process codes
         |
         v
  POST /mes/api/dispatch
         |
    mesJobId returned
         |
    emit('order.dispatched.mes')
    UPDATE orders SET status = 'PRODUCTION_WAITING'
```

#### 4.3.3 MES Status Callback Flow

```
MES production status changes
         |
    PUT /api/v1/integration/mes/orders/:id/status
    Body: { mesJobId, status: '제작중' | '제작완료' | '출고완료' }
         |
         v
  [MES Route Handler]
         |
    Map MES status -> OrderStatus enum
         |
    UPDATE orders SET status = ?
         |
    emit('order.status.changed', { from, to })
         |
    [ShopbyAdapter] subscribes -> notify Shopby if order.source = 'shopby'
```

#### 4.3.4 Edicus Design Flow

```
Customer clicks "테마로 디자인하기"
         |
    GET /api/v1/integration/edicus/products/:id/config
         |
         v
  [Edicus Route Handler]
         |
    product_editor_mapping lookup
    edicus_code = 'HU_' + product.huni_code
    size constraints from product_sizes
         |
    Return config to Widget SDK
         |
         v
  [Widget SDK opens Edicus Editor]
         |
    Customer edits design
         |
    POST /api/v1/integration/edicus/designs
    Body: { productId, designData, editorSessionId }
         |
    Design saved
         |
    POST /api/v1/integration/edicus/render
    Body: { designId, outputFormat: 'pdf', quality: 'print' }
         |
    Render job created (async)
         |
    GET /api/v1/integration/edicus/render/:id/status (polling)
         |
    When status = 'completed':
      renderedFileUrl stored
      Order proceeds with file
```

### 4.4 Error Handling Specifications

#### Circuit Breaker Configuration

| Adapter | Failure Threshold | Cooldown Period | Health Check Interval |
|---------|-------------------|-----------------|----------------------|
| Shopby | 5 consecutive failures | 60 seconds | 60 seconds |
| MES | 5 consecutive failures | 60 seconds | 60 seconds |
| Edicus | 3 consecutive failures | 30 seconds | 30 seconds |

#### Retry Configuration

| Operation | Max Retries | Base Delay | Max Delay | Jitter |
|-----------|-------------|------------|-----------|--------|
| Product sync | 3 | 1s | 30s | +/- 20% |
| Order dispatch | 3 | 1s | 30s | +/- 20% |
| Design render | 5 | 2s | 60s | +/- 20% |
| Status callback | 2 | 500ms | 5s | +/- 10% |

#### Dead Letter Queue Schema

| Field | Type | Description |
|-------|------|-------------|
| `id` | SERIAL | Primary key |
| `event_type` | VARCHAR(100) | Original event type |
| `event_payload` | JSONB | Original event payload |
| `adapter_name` | VARCHAR(50) | Adapter that failed |
| `error_message` | TEXT | Error details |
| `retry_count` | INTEGER | Number of retries attempted |
| `status` | VARCHAR(20) | `pending` / `replayed` / `discarded` |
| `created_at` | TIMESTAMPTZ | Failure timestamp |
| `replayed_at` | TIMESTAMPTZ | Replay timestamp (nullable) |

### 4.5 Extensibility for SPEC-SHOPBY-001~006

이 SPEC의 아키텍처는 향후 6개 Shopby integration SPEC의 기반이 된다.

- **이벤트 기반 아키텍처**: 새로운 어댑터를 핵심 코드 수정 없이 추가 가능
- **API versioning** (`/api/v1/`): 향후 breaking changes 시 `/api/v2/` 추가 가능
- **`products.shopby_id`**: nullable 컬럼이 이미 존재하여 Shopby 등록 준비 완료
- **Integration API 격리**: `/api/v1/integration/` 하위에 모든 연동 API를 집중
- **Webhook 지원**: 양방향 통신을 위한 webhook endpoint 패턴 확립

### 4.6 TypeScript Type Definitions

#### Event Types (packages/shared/src/events/types.ts)

```typescript
interface EventMetadata {
  id: string;              // UUID v4
  timestamp: Date;
  correlationId: string;   // Trace across systems
  source: string;          // Originating module
}

type DomainEvent =
  | { type: 'product.created'; payload: { productId: number; huniCode: string }; metadata: EventMetadata }
  | { type: 'product.updated'; payload: { productId: number; changes: Record<string, unknown> }; metadata: EventMetadata }
  | { type: 'product.deactivated'; payload: { productId: number }; metadata: EventMetadata }
  | { type: 'price.changed'; payload: { productId: number; priceTableId: number }; metadata: EventMetadata }
  | { type: 'quote.calculated'; payload: QuoteResult; metadata: EventMetadata }
  | { type: 'quote.snapshot.created'; payload: { quoteId: string; snapshot: QuoteSnapshot }; metadata: EventMetadata }
  | { type: 'order.created'; payload: { orderId: string; source: 'widget' | 'shopby' | 'admin' }; metadata: EventMetadata }
  | { type: 'order.status.changed'; payload: { orderId: string; from: string; to: string }; metadata: EventMetadata }
  | { type: 'order.dispatched.mes'; payload: { orderId: string; mesJobId: string }; metadata: EventMetadata }
  | { type: 'widget.config.updated'; payload: { widgetId: string }; metadata: EventMetadata }
  | { type: 'sync.shopby.completed'; payload: { productId: number; shopbyId: number }; metadata: EventMetadata }
  | { type: 'mapping.mes.verified'; payload: { choiceId: number; mesItemId: number }; metadata: EventMetadata };
```

#### Integration Types (packages/shared/src/integration/types.ts)

```typescript
interface IntegrationAdapter {
  readonly name: string;
  readonly subscribedEvents: ReadonlyArray<DomainEvent['type']>;
  handleEvent(event: DomainEvent): Promise<void>;
  healthCheck(): Promise<boolean>;
  getStatus(): AdapterStatus;
}

interface AdapterStatus {
  name: string;
  healthy: boolean;
  circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  lastSuccessAt: Date | null;
  lastFailureAt: Date | null;
  consecutiveFailures: number;
}

interface AdapterRegistry {
  register(adapter: IntegrationAdapter): void;
  unregister(name: string): void;
  getAdapter(name: string): IntegrationAdapter | undefined;
  getAllAdapters(): ReadonlyArray<IntegrationAdapter>;
  getHealthStatus(): Promise<Record<string, AdapterStatus>>;
}
```

### 4.7 Non-Functional Requirements

| Category | Requirement | Target |
|----------|------------|--------|
| **Performance** | Integration API response time (P95) | < 200ms (excluding webhook async) |
| **Availability** | Core functions unaffected by integration failure | 99.9% |
| **Throughput** | Concurrent webhook processing | 50 req/s per adapter |
| **Data Consistency** | Event delivery guarantee (in-process) | At-least-once |
| **Monitoring** | Adapter health check frequency | Every 60 seconds |
| **Logging** | All integration events logged with correlationId | Structured JSON |
| **Security** | Webhook authentication | HMAC signature verification |
| **API Version** | Backward compatibility | /api/v1/ maintained |

---

## 5. Traceability

| Requirement | Event Type | Adapter | Endpoint | Schema Table |
|-------------|-----------|---------|----------|-------------|
| REQ-EVT-001 | All | All | - | - |
| REQ-EVT-002 | All 12 types | All | - | - |
| REQ-SHOPBY-001 | product.* | ShopbyAdapter | POST /shopby/products/:id/sync | products.shopby_id |
| REQ-SHOPBY-002 | order.created | ShopbyAdapter | POST /shopby/orders | orders |
| REQ-MES-001 | order.created | MesAdapter | POST /mes/orders/:id/dispatch | product_mes_mapping, option_choice_mes_mapping |
| REQ-MES-002 | order.status.changed | MesAdapter | PUT /mes/orders/:id/status | orders.status |
| REQ-MES-003 | - | MesAdapter | - | option_choice_mes_mapping.mapping_status |
| REQ-EDICUS-001 | - | EdicusAdapter | GET /edicus/products/:id/config | product_editor_mapping |
| REQ-EDICUS-002 | - | EdicusAdapter | POST /edicus/designs, POST /edicus/render | - |
| REQ-ERR-001 | (on failure) | All | - | - |
| REQ-ERR-002 | (on failure) | All | - | - |
| REQ-ERR-003 | (on failure) | All | - | integration_dead_letters |
| REQ-ERR-004 | - | All | - | - |
| REQ-MAP-001 | - | ShopbyAdapter | - | products, categories |
| REQ-MAP-002 | - | MesAdapter | - | product_mes_mapping, option_choice_mes_mapping |
| REQ-MAP-003 | - | EdicusAdapter | - | product_editor_mapping |

---

## 6. Expert Consultation Recommendations

| Domain | Agent | Consultation Scope |
|--------|-------|-------------------|
| Backend Architecture | expert-backend | Adapter pattern, event bus implementation, circuit breaker, retry strategies, API design |
| Security | expert-security | Webhook HMAC verification, API key management, external system credential storage |
| DevOps | expert-devops | Health monitoring, dead letter queue alerting, circuit breaker dashboarding |

---

## 7. Glossary

| Term | Definition |
|------|-----------|
| **Adapter** | Integration module that translates between Widget Builder and an external system |
| **Circuit Breaker** | Pattern that prevents cascading failures by stopping calls to a failing external system |
| **Dead Letter Queue** | Storage for failed events that exhausted retry attempts, awaiting manual inspection |
| **Domain Event** | Typed message representing a significant occurrence in the business domain |
| **Event Bus** | In-process pub/sub system for decoupled communication between modules |
| **huni_code** | Central product identifier in Widget Builder (5-digit numeric string) |
| **edicus_code** | Edicus design code, derived as `'HU_' + huni_code` |
| **MES** | Manufacturing Execution System (TS.BackOffice.Huni) |
| **Shopby** | E-commerce shopping mall platform |
| **Edicus** | Prepress design editor for template-based design editing |

---

## 8. Implementation Notes

### Status: Completed
- **Implementation Date**: 2026-02-23
- **Commit**: 4a47322

### Structural Divergence
- SPEC Section 4.1 specified `apps/api/src/routes/integration/` for API route files
- Actual implementation uses Next.js App Router pattern: `apps/web/app/api/v1/integration/`
- This aligns with the existing project structure where all API routes are in `apps/web/`

### Test Coverage
- 11 test files, 184 tests (all passing)
- Events: bus.test.ts (15 tests), dead-letter.test.ts (19 tests)
- Core: adapter-registry.test.ts, circuit-breaker.test.ts, retry.test.ts
- Adapters: shopby (adapter + mapper), mes (adapter + mapper), edicus (adapter + mapper)

### Implementation Scope
All SPEC requirements fully implemented:
- REQ-EVT-001~003: Domain Event Bus with typed events, handler isolation, fire-and-forget
- REQ-ADP-001~002: Adapter registry with health check, fault isolation
- REQ-SHOPBY-001~003: Product sync, order reception, 5 API endpoints
- REQ-MES-001~004: Production dispatch, status tracking, mapping workflow, 5 API endpoints
- REQ-EDICUS-001~003: Editor config, design save/render, 6 API endpoints
- REQ-ERR-001~004: Retry with exponential backoff, circuit breaker, dead letter queue, fault isolation
- REQ-MAP-001~003: Bidirectional data mappers for all three external systems
