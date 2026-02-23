# SPEC-WIDGET-INTG-001: Acceptance Criteria

---
id: SPEC-WIDGET-INTG-001
version: 1.0.0
status: Draft
created: 2026-02-22
updated: 2026-02-22
author: MoAI
priority: P1
---

## 1. Domain Event System

### AC-EVT-001: Event Bus Publish-Subscribe

**Given** EventBus가 초기화되어 있고
**And** ShopbyAdapter가 `product.created` 이벤트를 구독한 상태에서
**When** `product.created` 이벤트가 발행되면
**Then** ShopbyAdapter의 handleEvent가 호출되어야 한다
**And** 이벤트에는 `type`, `payload`, `metadata`(id, timestamp, correlationId, source)가 포함되어야 한다

### AC-EVT-002: 12 Event Types Support

**Given** DomainEvent type union이 정의되어 있을 때
**When** 다음 12개 이벤트 타입이 발행되면:
  - `product.created`
  - `product.updated`
  - `product.deactivated`
  - `price.changed`
  - `quote.calculated`
  - `quote.snapshot.created`
  - `order.created`
  - `order.status.changed`
  - `order.dispatched.mes`
  - `widget.config.updated`
  - `sync.shopby.completed`
  - `mapping.mes.verified`
**Then** 각 이벤트는 TypeScript 타입 체크를 통과해야 한다
**And** 각 이벤트의 payload가 정의된 스키마와 일치해야 한다

### AC-EVT-003: Handler Error Isolation

**Given** EventBus에 2개의 핸들러가 `product.created`를 구독한 상태에서
**And** 첫 번째 핸들러가 에러를 throw하도록 설정되었을 때
**When** `product.created` 이벤트가 발행되면
**Then** 두 번째 핸들러는 정상적으로 실행되어야 한다
**And** 이벤트 발행자(emit 호출측)는 에러의 영향을 받지 않아야 한다
**And** 첫 번째 핸들러의 에러가 로그에 기록되어야 한다

### AC-EVT-004: Fire-and-Forget Pattern

**Given** EventBus에 비동기 핸들러가 등록되어 있을 때
**When** 이벤트가 발행되면
**Then** emit() 호출은 핸들러 완료를 기다리지 않고 즉시 반환되어야 한다
**And** 핸들러는 백그라운드에서 비동기 실행되어야 한다

---

## 2. Event Bus Subscription and Delivery

### AC-SUB-001: Multiple Handler Subscription

**Given** EventBus가 초기화된 상태에서
**When** 3개의 어댑터(Shopby, MES, Edicus)가 각각 다른 이벤트를 구독하면
**Then** 각 어댑터는 자신이 구독한 이벤트만 수신해야 한다
**And** 구독하지 않은 이벤트는 전달되지 않아야 한다

### AC-SUB-002: Unsubscribe

**Given** ShopbyAdapter가 `product.created`를 구독한 상태에서
**When** 구독이 해제(unsubscribe)되면
**Then** 이후 발행되는 `product.created` 이벤트가 해당 어댑터에 전달되지 않아야 한다

### AC-SUB-003: CorrelationId Propagation

**Given** correlationId가 `"trace-123"`인 `order.created` 이벤트가 발행되었을 때
**When** MesAdapter가 이 이벤트를 처리하고 `order.dispatched.mes` 이벤트를 발행하면
**Then** 후속 이벤트의 correlationId도 `"trace-123"`이어야 한다

---

## 3. Adapter Registration and Health Check

### AC-REG-001: Adapter Registration

**Given** AdapterRegistry가 초기화된 상태에서
**When** ShopbyAdapter, MesAdapter, EdicusAdapter가 등록되면
**Then** `getAllAdapters()`가 3개의 어댑터를 반환해야 한다
**And** `getAdapter("shopby")`가 ShopbyAdapter를 반환해야 한다

### AC-REG-002: Adapter Deregistration

**Given** 3개의 어댑터가 등록된 상태에서
**When** `unregister("shopby")`가 호출되면
**Then** `getAllAdapters()`가 2개의 어댑터만 반환해야 한다
**And** `getAdapter("shopby")`가 `undefined`를 반환해야 한다

### AC-REG-003: Health Check Status

**Given** 3개의 어댑터가 등록된 상태에서
**And** MES 어댑터의 healthCheck가 false를 반환하도록 설정되었을 때
**When** `getHealthStatus()`가 호출되면
**Then** 결과에 3개 어댑터의 상태가 포함되어야 한다
**And** MES 어댑터의 `healthy`가 `false`이어야 한다
**And** Shopby, Edicus 어댑터의 `healthy`가 `true`이어야 한다

### AC-REG-004: Adapter Failure Isolation

**Given** ShopbyAdapter에서 에러가 발생한 상태에서
**When** MesAdapter와 EdicusAdapter가 이벤트를 처리하면
**Then** MesAdapter와 EdicusAdapter는 정상 동작해야 한다
**And** ShopbyAdapter의 에러가 다른 어댑터에 전파되지 않아야 한다

---

## 4. Shopby Adapter

### AC-SHOPBY-001: Product Sync to Shopby

**Given** Widget Builder에 productId=1, huniCode="12345"인 상품이 존재할 때
**When** `product.created` 이벤트가 발행되면
**Then** ShopbyAdapter가 이벤트를 수신해야 한다
**And** ShopbyMapper가 상품 데이터를 Shopby API 형식으로 변환해야 한다
**And** Shopby API에 POST 요청이 전송되어야 한다
**And** 반환된 shopbyId가 `products.shopby_id` 컬럼에 저장되어야 한다
**And** `sync.shopby.completed` 이벤트가 발행되어야 한다

### AC-SHOPBY-002: Product Update Sync

**Given** shopby_id가 이미 설정된 상품이 존재할 때
**When** `product.updated` 이벤트가 발행되면
**Then** ShopbyAdapter가 Shopby API에 PUT 요청을 전송해야 한다
**And** 변경된 필드만 Shopby 형식으로 변환되어야 한다

### AC-SHOPBY-003: Order Webhook Reception

**Given** `/api/v1/integration/shopby/orders` 엔드포인트가 활성화된 상태에서
**When** Shopby에서 주문 webhook이 수신되면
**Then** 시스템은 `source='shopby'`인 주문 레코드를 생성해야 한다
**And** `order.created` 이벤트가 발행되어야 한다
**And** 해당 상품의 모든 MES 매핑이 `verified` 상태이면 MES 발주가 트리거되어야 한다

### AC-SHOPBY-004: Order Status Callback

**Given** Shopby에서 생성된 주문이 존재할 때
**When** PUT `/api/v1/integration/shopby/orders/:id/status` 요청이 수신되면
**Then** 주문 상태가 업데이트되어야 한다
**And** Shopby에 상태 변경이 콜백되어야 한다

### AC-SHOPBY-005: Product Data Mapping (Widget Builder -> Shopby)

**Given** 상품 데이터가 Widget Builder 형식으로 존재할 때
**When** ShopbyMapper.toShopbyProduct()가 호출되면
**Then** `products.huni_code`가 `productNo` (reference)로 매핑되어야 한다
**And** `products.name`이 `productName`으로 매핑되어야 한다
**And** `categories.name`이 카테고리 매핑 테이블을 통해 `categoryNo`로 변환되어야 한다
**And** `fixed_prices.selling_price`가 `salePrice`로 집계되어야 한다

### AC-SHOPBY-006: Order Data Mapping (Shopby -> Widget Builder)

**Given** Shopby 주문 데이터가 존재할 때
**When** ShopbyMapper.fromShopbyOrder()가 호출되면
**Then** `orderNo`가 `orders.external_order_id`로 매핑되어야 한다
**And** `productNo`가 `products.shopby_id` 조회를 통해 `orders.product_id`로 변환되어야 한다
**And** `optionValues`가 옵션 코드 번역을 통해 `orders.selected_options`으로 변환되어야 한다
**And** `orderAmount`가 `orders.total_price`로 매핑되어야 한다

---

## 5. MES Adapter

### AC-MES-001: Production Dispatch

**Given** orderId="ORD-001"인 주문이 존재하고
**And** 해당 주문의 모든 옵션 선택지가 `mapping_status='verified'`인 MES 매핑을 보유할 때
**When** `order.created` 이벤트가 발행되면
**Then** MesAdapter가 이벤트를 수신해야 한다
**And** `product_mes_mapping`을 통해 MES item_code가 조회되어야 한다
**And** `option_choice_mes_mapping`을 통해 각 옵션의 MES material/process 코드가 변환되어야 한다
**And** MES API에 생산 발주 요청이 전송되어야 한다
**And** 반환된 mesJobId로 `order.dispatched.mes` 이벤트가 발행되어야 한다
**And** 주문 상태가 `PRODUCTION_WAITING`으로 업데이트되어야 한다

### AC-MES-002: Dispatch Blocked by Unverified Mapping

**Given** 주문의 일부 옵션 선택지가 `mapping_status='pending'` 또는 `'mapped'`인 상태에서
**When** `order.created` 이벤트가 발행되면
**Then** MES 발주가 수행되지 않아야 한다
**And** 경고 로그가 기록되어야 한다
**And** 관리자에게 알림이 전송되어야 한다

### AC-MES-003: MES Status Tracking

**Given** MES에 발주된 주문이 존재할 때
**When** PUT `/api/v1/integration/mes/orders/:id/status` 요청이 수신되면:

| MES Status | Expected OrderStatus |
|-----------|---------------------|
| 제작대기 | `PRODUCTION_WAITING` |
| 제작중 | `PRODUCING` |
| 제작완료 | `PRODUCTION_DONE` |
| 출고완료 | `SHIPPED` |

**Then** 주문 상태가 해당 OrderStatus로 업데이트되어야 한다
**And** `order.status.changed` 이벤트가 이전 상태와 새 상태 정보와 함께 발행되어야 한다

### AC-MES-004: MES Status Callback to Shopby

**Given** `source='shopby'`인 주문의 MES 상태가 변경되었을 때
**When** `order.status.changed` 이벤트가 발행되면
**Then** ShopbyAdapter가 해당 이벤트를 수신해야 한다
**And** Shopby에 주문 상태 변경을 콜백해야 한다

### AC-MES-005: Mapping Workflow (pending -> mapped -> verified)

**Given** 옵션 선택지가 생성되었을 때
**When** `option_choice_mes_mapping` 레코드가 자동 생성되면
**Then** 초기 `mapping_status`는 `'pending'`이어야 한다

**Given** `mapping_status='pending'`인 매핑이 존재할 때
**When** 관리자가 MES 코드를 매핑하면
**Then** `mapping_status`가 `'mapped'`로 변경되어야 한다
**And** `mappedBy`와 `mappedAt`이 기록되어야 한다

**Given** `mapping_status='mapped'`인 매핑이 존재할 때
**When** 관리자가 검증을 완료하면
**Then** `mapping_status`가 `'verified'`로 변경되어야 한다
**And** `mapping.mes.verified` 이벤트가 발행되어야 한다

**Given** `mapping_status='verified'`인 매핑이 존재할 때
**When** 재매핑이 필요하여 관리자가 수정하면
**Then** `mapping_status`가 `'mapped'`로 되돌아가야 한다

### AC-MES-006: Mapping Type Auto-Detection

**Given** 옵션 선택지가 생성되었을 때
**When** `option_definitions.option_class`가 `'material'`이면
**Then** `mapping_type`이 `'material'`로 설정되어야 한다

**Given** 옵션 선택지가 생성되었을 때
**When** `option_definitions.option_class`가 `'process'`이면
**Then** `mapping_type`이 `'process'`로 설정되어야 한다

**Given** 옵션 선택지가 생성되었을 때
**When** `option_definitions.option_class`가 `'setting'`이면
**Then** MES 매핑 레코드가 생성되지 않아야 한다

---

## 6. Edicus Adapter

### AC-EDICUS-001: Editor Configuration Delivery

**Given** productId=1인 상품이 `product_editor_mapping`에 등록되어 있고
**And** 해당 상품의 huni_code가 "12345"일 때
**When** GET `/api/v1/integration/edicus/products/1/config` 요청이 수신되면
**Then** 응답에 `edicus_code: "HU_12345"`가 포함되어야 한다
**And** `template_id`가 `product_editor_mapping.template_id`와 일치해야 한다
**And** `template_config`가 `product_editor_mapping.template_config`와 일치해야 한다
**And** 해당 상품의 size constraints가 포함되어야 한다

### AC-EDICUS-002: Editor-Enabled Products List

**Given** 111개의 상품이 `product_editor_mapping`에 등록되어 있을 때
**When** GET `/api/v1/integration/edicus/products` 요청이 수신되면
**Then** 에디터 사용 가능한 상품 목록이 반환되어야 한다
**And** 각 상품에 `edicus_code`, `template_id`, `is_active` 정보가 포함되어야 한다

### AC-EDICUS-003: Design Save

**Given** 고객이 Edicus 에디터에서 디자인 편집을 완료했을 때
**When** POST `/api/v1/integration/edicus/designs` 요청이 수신되면:
  - Body: `{ productId, designData, editorSessionId }`
**Then** 디자인 레코드가 저장되어야 한다
**And** 저장된 디자인의 ID가 응답에 포함되어야 한다

### AC-EDICUS-004: Design Retrieval

**Given** designId="DES-001"인 디자인이 저장되어 있을 때
**When** GET `/api/v1/integration/edicus/designs/DES-001` 요청이 수신되면
**Then** 저장된 디자인 데이터가 반환되어야 한다
**And** productId, designData, editorSessionId가 포함되어야 한다

### AC-EDICUS-005: Render Trigger

**Given** 저장된 디자인이 존재할 때
**When** POST `/api/v1/integration/edicus/render` 요청이 수신되면:
  - Body: `{ designId, outputFormat: "pdf", quality: "print" }`
**Then** Edicus Render API에 비동기 렌더 작업이 요청되어야 한다
**And** 렌더 작업 ID가 응답에 포함되어야 한다

### AC-EDICUS-006: Render Status Polling

**Given** renderJobId="RND-001"인 렌더 작업이 진행 중일 때
**When** GET `/api/v1/integration/edicus/render/RND-001/status` 요청이 수신되면
**Then** 렌더 작업의 현재 상태가 반환되어야 한다

**Given** 렌더 작업이 완료되었을 때
**When** 상태 조회 시
**Then** `status: "completed"`와 `renderedFileUrl`이 포함되어야 한다

### AC-EDICUS-007: Edicus Code Derivation

**Given** huni_code가 "12345"인 상품이 존재할 때
**When** EdicusMapper가 에디터 설정을 생성하면
**Then** `edicus_code`는 `"HU_12345"`로 자동 파생되어야 한다
**And** 이 코드는 `'HU_' + huni_code` 규칙을 따라야 한다

---

## 7. Error Handling

### AC-ERR-001: Exponential Backoff Retry

**Given** Shopby API 호출이 일시적으로 실패한 상태에서
**When** 재시도가 실행되면
**Then** 1차 재시도는 약 1초 후에 실행되어야 한다
**And** 2차 재시도는 약 2초 후에 실행되어야 한다
**And** 3차 재시도는 약 4초 후에 실행되어야 한다
**And** 각 재시도 간격에 +/- 20% 지터(jitter)가 적용되어야 한다

### AC-ERR-002: Retry Max Attempts

**Given** 외부 API 호출이 계속 실패하는 상태에서
**When** 3회 재시도가 모두 실패하면
**Then** 작업이 실패로 표시되어야 한다
**And** 에러 로그가 기록되어야 한다
**And** 해당 이벤트가 Dead Letter Queue에 저장되어야 한다

### AC-ERR-003: Circuit Breaker Activation

**Given** Shopby 어댑터가 정상 동작 중(CLOSED)인 상태에서
**When** Shopby API 호출이 연속 5회 실패하면
**Then** Circuit Breaker 상태가 `OPEN`으로 전환되어야 한다
**And** 이후 Shopby API 호출 요청은 즉시 거부(fast-fail)되어야 한다
**And** "Circuit breaker OPEN" 로그가 기록되어야 한다

### AC-ERR-004: Circuit Breaker Recovery

**Given** Circuit Breaker가 OPEN 상태인 어댑터에서
**When** 60초가 경과하면
**Then** Circuit Breaker 상태가 `HALF_OPEN`으로 전환되어야 한다
**And** 단일 테스트 요청이 허용되어야 한다

**Given** HALF_OPEN 상태에서
**When** 테스트 요청(health check)이 성공하면
**Then** Circuit Breaker 상태가 `CLOSED`로 전환되어야 한다
**And** 이후 요청이 정상 처리되어야 한다

**Given** HALF_OPEN 상태에서
**When** 테스트 요청이 실패하면
**Then** Circuit Breaker 상태가 다시 `OPEN`으로 전환되어야 한다

### AC-ERR-005: Edicus Circuit Breaker (Lower Threshold)

**Given** Edicus 어댑터가 정상 동작 중인 상태에서
**When** Edicus API 호출이 연속 3회 실패하면
**Then** Circuit Breaker가 활성화되어야 한다
**And** 30초 후 HALF_OPEN으로 전환되어야 한다

---

## 8. Dead Letter Queue

### AC-DLQ-001: Failed Event Persistence

**Given** `product.created` 이벤트 핸들러가 최대 재시도 횟수를 초과하여 실패했을 때
**When** Dead Letter Queue에 저장되면
**Then** 다음 필드가 기록되어야 한다:
  - `event_type`: "product.created"
  - `event_payload`: 원본 이벤트 payload (JSONB)
  - `adapter_name`: 실패한 어댑터 이름
  - `error_message`: 에러 상세 정보
  - `retry_count`: 시도된 재시도 횟수
  - `status`: "pending"
  - `created_at`: 실패 시점 타임스탬프

### AC-DLQ-002: Manual Replay

**Given** Dead Letter Queue에 `status='pending'`인 이벤트가 존재할 때
**When** 관리자가 수동 재시도를 요청하면
**Then** 해당 이벤트가 원본 payload와 함께 다시 처리되어야 한다
**And** 성공 시 `status`가 `'replayed'`로 업데이트되어야 한다
**And** `replayed_at` 타임스탬프가 기록되어야 한다

### AC-DLQ-003: DLQ Event Discard

**Given** Dead Letter Queue에 수동 검토가 완료된 이벤트가 존재할 때
**When** 관리자가 해당 이벤트를 폐기(discard)하면
**Then** `status`가 `'discarded'`로 업데이트되어야 한다

---

## 9. External System Fault Isolation

### AC-ISOL-001: Widget Rendering Unaffected

**Given** Shopby API가 완전히 중단된 상태에서
**When** 사용자가 위젯을 렌더링하면
**Then** 위젯 렌더링이 정상 동작해야 한다
**And** 위젯 응답 시간에 영향이 없어야 한다

### AC-ISOL-002: Quote Calculation Unaffected

**Given** MES API가 완전히 중단된 상태에서
**When** 견적 계산 요청이 수신되면
**Then** 견적 계산이 정상 수행되어야 한다
**And** 견적 결과에 MES 연동 상태가 포함되지 않아야 한다

### AC-ISOL-003: Admin Dashboard Unaffected

**Given** Edicus Render API가 응답하지 않는 상태에서
**When** 관리자가 대시보드에 접근하면
**Then** 대시보드가 정상 로딩되어야 한다
**And** 연동 상태 표시 영역에만 장애 정보가 표시되어야 한다

### AC-ISOL-004: Cross-Adapter Isolation

**Given** ShopbyAdapter에서 치명적 에러가 발생한 상태에서
**When** MesAdapter가 `order.created` 이벤트를 처리하면
**Then** MesAdapter는 정상적으로 MES 발주를 수행해야 한다
**And** ShopbyAdapter의 에러가 MesAdapter에 전파되지 않아야 한다

---

## 10. Integration API Endpoints

### AC-API-001: Shopby Endpoints (5 endpoints)

**Given** `/api/v1/integration/shopby/` 경로가 활성화된 상태에서:

| Method | Path | Expected Status | Response |
|--------|------|----------------|----------|
| GET | `/api/v1/integration/shopby/products` | 200 | Shopby 동기화 가능 상품 목록 |
| POST | `/api/v1/integration/shopby/products/:id/sync` | 202 | 동기화 작업 시작 확인 |
| POST | `/api/v1/integration/shopby/orders` | 201 | 주문 레코드 생성 확인 |
| PUT | `/api/v1/integration/shopby/orders/:id/status` | 200 | 상태 업데이트 확인 |
| GET | `/api/v1/integration/shopby/categories` | 200 | 카테고리 매핑 목록 |

**Then** 각 엔드포인트는 명시된 HTTP 상태 코드를 반환해야 한다
**And** 모든 요청/응답은 Zod 스키마로 검증되어야 한다

### AC-API-002: MES Endpoints (5 endpoints)

**Given** `/api/v1/integration/mes/` 경로가 활성화된 상태에서:

| Method | Path | Expected Status | Response |
|--------|------|----------------|----------|
| GET | `/api/v1/integration/mes/items` | 200 | MES 품목 목록 |
| GET | `/api/v1/integration/mes/mappings` | 200 | 상품-MES 매핑 목록 |
| POST | `/api/v1/integration/mes/orders/:id/dispatch` | 202 | 발주 작업 시작 확인 |
| PUT | `/api/v1/integration/mes/orders/:id/status` | 200 | MES 상태 콜백 처리 |
| GET | `/api/v1/integration/mes/items/:id/options` | 200 | MES 품목 옵션 목록 |

**Then** 각 엔드포인트는 명시된 HTTP 상태 코드를 반환해야 한다
**And** 모든 요청/응답은 Zod 스키마로 검증되어야 한다

### AC-API-003: Edicus Endpoints (6 endpoints)

**Given** `/api/v1/integration/edicus/` 경로가 활성화된 상태에서:

| Method | Path | Expected Status | Response |
|--------|------|----------------|----------|
| GET | `/api/v1/integration/edicus/products` | 200 | 에디터 사용 가능 상품 목록 (111개) |
| GET | `/api/v1/integration/edicus/products/:id/config` | 200 | 에디터 설정 (template, constraints) |
| POST | `/api/v1/integration/edicus/designs` | 201 | 디자인 저장 확인 |
| GET | `/api/v1/integration/edicus/designs/:id` | 200 | 저장된 디자인 데이터 |
| POST | `/api/v1/integration/edicus/render` | 202 | 렌더 작업 시작 확인 |
| GET | `/api/v1/integration/edicus/render/:id/status` | 200 | 렌더 작업 상태 |

**Then** 각 엔드포인트는 명시된 HTTP 상태 코드를 반환해야 한다
**And** 모든 요청/응답은 Zod 스키마로 검증되어야 한다

### AC-API-004: Invalid Request Handling

**Given** 통합 API 엔드포인트에 잘못된 요청이 전송될 때
**When** 필수 필드가 누락된 POST 요청이 수신되면
**Then** 400 Bad Request 응답이 반환되어야 한다
**And** Zod 유효성 검증 오류 메시지가 응답 body에 포함되어야 한다

### AC-API-005: API Response Time

**Given** 통합 API가 정상 동작 중일 때
**When** API 요청이 수신되면
**Then** P95 응답 시간이 200ms 이내여야 한다 (webhook 비동기 처리 제외)

---

## 11. Non-Functional Requirements

### AC-NFR-001: Webhook Authentication

**Given** 외부 시스템에서 webhook이 수신될 때
**When** HMAC 서명이 유효하면
**Then** 요청이 정상 처리되어야 한다

**Given** 외부 시스템에서 webhook이 수신될 때
**When** HMAC 서명이 유효하지 않으면
**Then** 401 Unauthorized 응답이 반환되어야 한다
**And** 해당 요청이 보안 로그에 기록되어야 한다

### AC-NFR-002: Structured Logging

**Given** 통합 이벤트가 처리될 때
**When** 로그가 기록되면
**Then** 구조화된 JSON 형식이어야 한다
**And** `correlationId`가 포함되어야 한다
**And** `adapterName`, `eventType`, `timestamp`가 포함되어야 한다

### AC-NFR-003: Health Check Frequency

**Given** 어댑터가 등록된 상태에서
**When** 시스템이 실행 중이면
**Then** 각 어댑터의 health check가 60초마다 실행되어야 한다

### AC-NFR-004: Concurrent Webhook Processing

**Given** 동시에 다수의 webhook 요청이 수신될 때
**When** 50개의 동시 요청이 처리되면
**Then** 모든 요청이 정상 처리되어야 한다
**And** 요청 간 간섭이 발생하지 않아야 한다

---

## 12. Quality Gate Criteria

### Definition of Done

- [ ] 모든 12개 DomainEvent 타입이 정의되고 타입 체크를 통과한다
- [ ] EventBus publish-subscribe가 정상 동작한다
- [ ] 3개 어댑터(Shopby, MES, Edicus)가 IntegrationAdapter 인터페이스를 구현한다
- [ ] AdapterRegistry에서 어댑터 등록/해제/검색이 동작한다
- [ ] 16개 Integration API 엔드포인트가 올바른 상태 코드를 반환한다
- [ ] Circuit Breaker가 상태 전환(CLOSED->OPEN->HALF_OPEN->CLOSED)을 올바르게 수행한다
- [ ] Retry with exponential backoff가 설정된 간격으로 재시도한다
- [ ] Dead Letter Queue에 실패 이벤트가 저장되고 수동 replay가 가능하다
- [ ] 외부 시스템 장애 시 핵심 기능(견적, 위젯)이 영향받지 않는다
- [ ] MES mapping status state machine이 올바르게 동작한다 (pending->mapped->verified)
- [ ] 모든 요청/응답이 Zod 스키마로 검증된다
- [ ] 구조화된 JSON 로깅이 correlationId와 함께 동작한다
- [ ] 단위 테스트 커버리지 85% 이상 달성
- [ ] TypeScript strict mode에서 컴파일 에러 없음
- [ ] ESLint/Prettier 규칙 위반 없음

---

## 13. Traceability

| Acceptance Criteria | Requirement | Priority |
|-------------------|-------------|----------|
| AC-EVT-001~004 | REQ-EVT-001 | Primary |
| AC-EVT-002 | REQ-EVT-002 | Primary |
| AC-SUB-001~003 | REQ-EVT-003 | Primary |
| AC-REG-001~004 | REQ-ADP-001, REQ-ADP-002 | Primary |
| AC-SHOPBY-001~006 | REQ-SHOPBY-001~003, REQ-MAP-001 | Secondary |
| AC-MES-001~006 | REQ-MES-001~004, REQ-MAP-002 | Primary |
| AC-EDICUS-001~007 | REQ-EDICUS-001~003, REQ-MAP-003 | Secondary |
| AC-ERR-001~005 | REQ-ERR-001, REQ-ERR-002 | Primary |
| AC-DLQ-001~003 | REQ-ERR-003 | Primary |
| AC-ISOL-001~004 | REQ-ERR-004 | Primary |
| AC-API-001~005 | REQ-SHOPBY-003, REQ-MES-004, REQ-EDICUS-003 | Secondary |
| AC-NFR-001~004 | Non-Functional Requirements (Section 4.7) | Secondary |
