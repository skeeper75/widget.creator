# SPEC-WIDGET-INTG-001: Implementation Plan

---
id: SPEC-WIDGET-INTG-001
version: 1.0.0
status: Draft
created: 2026-02-22
updated: 2026-02-22
author: MoAI
priority: P1
---

## 1. Overview

External System Integration Layer의 구현 계획이다. Widget Creator 모노레포에 이벤트 기반 통합 아키텍처를 구축하여 Shopby, MES, Edicus 3개 외부 시스템과의 연동 기반을 마련한다.

### 1.1 Implementation Scope

- Domain Event Bus (in-process, typed EventEmitter 패턴)
- IntegrationAdapter 인터페이스 및 AdapterRegistry
- Circuit Breaker 및 Retry with Exponential Backoff 유틸리티
- Dead Letter Queue (DB-backed)
- Shopby / MES / Edicus 3개 어댑터 구현
- 16개 Integration API 엔드포인트
- 양방향 Data Mapper 3종 (ShopbyMapper, MesMapper, EdicusMapper)

### 1.2 Out of Scope

- Redis Pub/Sub 또는 BullMQ 기반 분산 이벤트 버스 (추후 확장)
- Shopby 실제 API 연동 (SPEC-SHOPBY-001~006에서 구현 예정)
- MES REST API 연동 (현재 EXCEL 기반, REST 전환 시점 미확정)
- 프론트엔드 UI 구현

---

## 2. Architecture Decisions

### 2.1 Event Bus: In-Process EventEmitter

- **결정**: Node.js EventEmitter 기반 typed in-process event bus
- **근거**: MVP 단계에서 외부 인프라 의존성 최소화. 단일 프로세스 내에서 충분한 성능 제공
- **확장 경로**: `EventBus` 인터페이스 추상화를 통해 추후 Redis Pub/Sub 또는 BullMQ로 교체 가능
- **제약**: 프로세스 재시작 시 미처리 이벤트 유실 가능 (Dead Letter Queue로 보완)

### 2.2 Adapter Pattern: Strategy + Observer

- **결정**: IntegrationAdapter 인터페이스 + AdapterRegistry + EventBus subscription
- **근거**: 새로운 외부 시스템 추가 시 핵심 코드 수정 없이 어댑터만 추가하면 됨
- **이점**: SPEC-SHOPBY-001~006의 점진적 구현 지원

### 2.3 Error Resilience: Circuit Breaker + Retry + DLQ

- **결정**: 3단계 방어 전략 (Retry -> Circuit Breaker -> Dead Letter Queue)
- **근거**: 외부 시스템 장애로부터 핵심 비즈니스 로직을 완전히 격리
- **Circuit Breaker**: opossum 라이브러리 또는 자체 구현 (경량)
- **DLQ**: PostgreSQL 테이블 기반 (MVP), 추후 Redis Stream 확장 가능

### 2.4 Data Mapping: Pure Function Mappers

- **결정**: 각 어댑터별 독립 Mapper 모듈 (순수 함수 기반)
- **근거**: 테스트 용이성, 단일 책임 원칙, 어댑터 간 의존성 제거
- **검증**: Zod 스키마로 입출력 타입 검증

---

## 3. Dependency Graph

```
Phase 1: Foundation (Event Bus + Core Infra)
  |
  +-- events/types.ts (DomainEvent type union)
  +-- events/bus.ts (EventBus implementation)
  +-- integration/types.ts (IntegrationAdapter, AdapterRegistry interfaces)
  +-- integration/retry.ts (exponential backoff utility)
  +-- integration/circuit-breaker.ts (CircuitBreaker)
  +-- events/dead-letter.ts (DLQ DB table + repository)
  +-- integration/adapter-registry.ts (registry implementation)
  |
  v
Phase 2: Adapters (parallel, independent of each other)
  |
  +-- integration/mes/ (MES adapter, mapper, types)     --+
  +-- integration/edicus/ (Edicus adapter, mapper, types) -+-- parallel
  +-- integration/shopby/ (Shopby adapter, mapper, types) -+
  |
  v
Phase 3: API Routes (depends on adapters)
  |
  +-- apps/api/src/routes/integration/mes.ts
  +-- apps/api/src/routes/integration/edicus.ts
  +-- apps/api/src/routes/integration/shopby.ts
  |
  v
Phase 4: Integration Testing
  |
  +-- End-to-end event flow tests
  +-- Adapter isolation tests
  +-- Circuit breaker behavior tests
```

---

## 4. Phase Decomposition

### Phase 1: Event Bus & Core Infrastructure

**Priority**: Primary Goal (must complete first)
**Complexity**: High

모든 어댑터의 기반이 되는 이벤트 시스템과 공통 인프라를 구현한다.

#### Task Breakdown

| # | Task | File(s) | Complexity | Dependencies |
|---|------|---------|-----------|--------------|
| 1.1 | DomainEvent type union 및 EventMetadata 정의 | `packages/shared/src/events/types.ts` | Low | None |
| 1.2 | EventBus 인터페이스 및 in-process 구현 | `packages/shared/src/events/bus.ts` | Medium | 1.1 |
| 1.3 | IntegrationAdapter 인터페이스 정의 | `packages/shared/src/integration/types.ts` | Low | 1.1 |
| 1.4 | Retry with exponential backoff 유틸리티 | `packages/shared/src/integration/retry.ts` | Medium | None |
| 1.5 | CircuitBreaker 구현 | `packages/shared/src/integration/circuit-breaker.ts` | High | None |
| 1.6 | Dead Letter Queue 스키마 및 리포지토리 | `packages/shared/src/events/dead-letter.ts` + DB migration | Medium | 1.1 |
| 1.7 | AdapterRegistry 구현 | `packages/shared/src/integration/adapter-registry.ts` | Medium | 1.2, 1.3 |
| 1.8 | Events/Integration 모듈 public exports | `packages/shared/src/events/index.ts`, `packages/shared/src/integration/index.ts` | Low | 1.1~1.7 |
| 1.9 | 단위 테스트 (EventBus, CircuitBreaker, Retry, DLQ) | `__tests__/` files | High | 1.1~1.7 |

### Phase 2: Adapter Implementations (Parallel)

**Priority**: Primary Goal (after Phase 1)
**Complexity**: Medium per adapter

3개 어댑터는 서로 독립적이므로 병렬 구현 가능하다. MES 어댑터가 기존 데이터(260개 MES items, mapping tables)와 가장 밀접하므로 첫 번째 구현 대상이다.

#### 2A: MES Adapter

| # | Task | File(s) | Complexity | Dependencies |
|---|------|---------|-----------|--------------|
| 2A.1 | MES API 타입 정의 | `packages/shared/src/integration/mes/types.ts` | Low | Phase 1 |
| 2A.2 | MesMapper 구현 (option choice -> MES code 변환) | `packages/shared/src/integration/mes/mapper.ts` | High | 2A.1 |
| 2A.3 | MesAdapter 구현 (IntegrationAdapter) | `packages/shared/src/integration/mes/adapter.ts` | High | 2A.1, 2A.2, Phase 1 |
| 2A.4 | MES mapping status state machine (pending->mapped->verified) | Within adapter/mapper | Medium | 2A.2 |
| 2A.5 | MES adapter 단위 테스트 | `__tests__/` files | Medium | 2A.1~2A.4 |

#### 2B: Edicus Adapter

| # | Task | File(s) | Complexity | Dependencies |
|---|------|---------|-----------|--------------|
| 2B.1 | Edicus API 타입 정의 | `packages/shared/src/integration/edicus/types.ts` | Low | Phase 1 |
| 2B.2 | EdicusMapper 구현 (product -> editor config) | `packages/shared/src/integration/edicus/mapper.ts` | Medium | 2B.1 |
| 2B.3 | EdicusAdapter 구현 (IntegrationAdapter) | `packages/shared/src/integration/edicus/adapter.ts` | Medium | 2B.1, 2B.2, Phase 1 |
| 2B.4 | Edicus adapter 단위 테스트 | `__tests__/` files | Medium | 2B.1~2B.3 |

#### 2C: Shopby Adapter

| # | Task | File(s) | Complexity | Dependencies |
|---|------|---------|-----------|--------------|
| 2C.1 | Shopby API 타입 정의 | `packages/shared/src/integration/shopby/types.ts` | Low | Phase 1 |
| 2C.2 | ShopbyMapper 구현 (product/order 양방향 변환) | `packages/shared/src/integration/shopby/mapper.ts` | High | 2C.1 |
| 2C.3 | ShopbyAdapter 구현 (IntegrationAdapter) | `packages/shared/src/integration/shopby/adapter.ts` | Medium | 2C.1, 2C.2, Phase 1 |
| 2C.4 | Shopby adapter 단위 테스트 | `__tests__/` files | Medium | 2C.1~2C.3 |

### Phase 3: API Routes

**Priority**: Secondary Goal
**Complexity**: Medium

#### Task Breakdown

| # | Task | File(s) | Complexity | Dependencies |
|---|------|---------|-----------|--------------|
| 3.1 | MES integration endpoints (5 routes) | `apps/api/src/routes/integration/mes.ts` | Medium | Phase 2A |
| 3.2 | Edicus integration endpoints (6 routes) | `apps/api/src/routes/integration/edicus.ts` | Medium | Phase 2B |
| 3.3 | Shopby integration endpoints (5 routes) | `apps/api/src/routes/integration/shopby.ts` | Medium | Phase 2C |
| 3.4 | Zod request/response 스키마 검증 | Within route files | Low | 3.1~3.3 |
| 3.5 | API route 단위 테스트 | `__tests__/` files | Medium | 3.1~3.4 |

### Phase 4: Integration Testing & Documentation

**Priority**: Final Goal
**Complexity**: High

| # | Task | File(s) | Complexity | Dependencies |
|---|------|---------|-----------|--------------|
| 4.1 | Event flow E2E 테스트 (product -> Shopby sync) | Integration test files | High | Phase 1~3 |
| 4.2 | Order -> MES dispatch E2E 테스트 | Integration test files | High | Phase 1~3 |
| 4.3 | Circuit breaker 동작 검증 테스트 | Integration test files | Medium | Phase 1~3 |
| 4.4 | Dead letter queue replay 테스트 | Integration test files | Medium | Phase 1~3 |
| 4.5 | Adapter health check endpoint 테스트 | Integration test files | Low | Phase 1~3 |

---

## 5. File Creation List

### 5.1 New Files (packages/shared/src/)

**Events Module** (`events/`):
- `events/types.ts` - DomainEvent type union, EventMetadata, event factory functions
- `events/bus.ts` - EventBus interface and InProcessEventBus implementation
- `events/dead-letter.ts` - Dead letter queue schema (Drizzle) and repository
- `events/index.ts` - Public exports

**Integration Core** (`integration/`):
- `integration/types.ts` - IntegrationAdapter, AdapterStatus, AdapterRegistry interfaces
- `integration/circuit-breaker.ts` - CircuitBreaker class implementation
- `integration/retry.ts` - retryWithBackoff utility function
- `integration/adapter-registry.ts` - InMemoryAdapterRegistry implementation
- `integration/index.ts` - Public exports

**Shopby Adapter** (`integration/shopby/`):
- `integration/shopby/types.ts` - ShopbyProduct, ShopbyOrder, ShopbyApiConfig types
- `integration/shopby/mapper.ts` - ShopbyMapper (toShopbyProduct, fromShopbyOrder)
- `integration/shopby/adapter.ts` - ShopbyAdapter class

**MES Adapter** (`integration/mes/`):
- `integration/mes/types.ts` - MesDispatchRequest, MesStatusCallback, MesApiConfig types
- `integration/mes/mapper.ts` - MesMapper (toMesDispatch, mapMesStatus)
- `integration/mes/adapter.ts` - MesAdapter class

**Edicus Adapter** (`integration/edicus/`):
- `integration/edicus/types.ts` - EdicusConfig, EdicusDesign, EdicusRenderJob types
- `integration/edicus/mapper.ts` - EdicusMapper (toEditorConfig, toRenderRequest)
- `integration/edicus/adapter.ts` - EdicusAdapter class

### 5.2 New Files (apps/api/src/)

**Integration Routes** (`routes/integration/`):
- `routes/integration/shopby.ts` - 5 Shopby endpoints
- `routes/integration/mes.ts` - 5 MES endpoints
- `routes/integration/edicus.ts` - 6 Edicus endpoints

### 5.3 Database Migration

- Dead letter queue 테이블 (`integration_dead_letters`) Drizzle migration 추가

### 5.4 Test Files

- `packages/shared/src/events/__tests__/bus.test.ts`
- `packages/shared/src/events/__tests__/dead-letter.test.ts`
- `packages/shared/src/integration/__tests__/circuit-breaker.test.ts`
- `packages/shared/src/integration/__tests__/retry.test.ts`
- `packages/shared/src/integration/__tests__/adapter-registry.test.ts`
- `packages/shared/src/integration/shopby/__tests__/mapper.test.ts`
- `packages/shared/src/integration/shopby/__tests__/adapter.test.ts`
- `packages/shared/src/integration/mes/__tests__/mapper.test.ts`
- `packages/shared/src/integration/mes/__tests__/adapter.test.ts`
- `packages/shared/src/integration/edicus/__tests__/mapper.test.ts`
- `packages/shared/src/integration/edicus/__tests__/adapter.test.ts`

---

## 6. Technology Decisions

| Component | Technology | Version | Rationale |
|-----------|-----------|---------|-----------|
| Event Bus | Node.js EventEmitter (typed) | Built-in | Zero dependency, MVP 충분, 인터페이스 추상화로 확장 가능 |
| Circuit Breaker | Custom implementation | - | 경량, 프로젝트 요구사항에 최적화, opossum 대비 번들 크기 절감 |
| Retry | Custom utility | - | exponential backoff + jitter, 외부 라이브러리 불필요 |
| DLQ Storage | PostgreSQL (Drizzle ORM) | 16.x | 기존 인프라 활용, 트랜잭션 보장 |
| API Validation | Zod | 3.x | 기존 프로젝트 표준, 런타임 타입 검증 |
| HTTP Client | fetch (Node.js built-in) | - | Node.js 22 native fetch, 외부 의존성 제거 |
| Testing | Vitest | 3.x | 기존 프로젝트 표준, TypeScript 네이티브 지원 |

### 6.1 Upgrade Path

| Current (MVP) | Future | Trigger |
|--------------|--------|---------|
| In-process EventEmitter | Redis Pub/Sub | 멀티 인스턴스 배포 필요 시 |
| DB-backed DLQ | Redis Stream + BullMQ | 이벤트 처리량 50 req/s 초과 시 |
| Native fetch | Dedicated HTTP client | 복잡한 인증/리트라이 패턴 필요 시 |
| Custom Circuit Breaker | opossum | 고급 기능(fallback, metrics) 필요 시 |

---

## 7. Risk Analysis

### 7.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| 외부 API 가용성 불안정 | High | High | Circuit breaker + DLQ로 장애 격리. Health check 모니터링 |
| Webhook 수신 신뢰성 | Medium | High | HMAC 서명 검증, 멱등성 키(idempotency key) 적용, DLQ 재시도 |
| MES REST API 전환 지연 | High | Medium | Adapter 인터페이스로 추상화. Mock adapter로 개발 진행, 실제 API 전환 시 구현체만 교체 |
| Shopby API 인증 방식 미확정 | Medium | Low | API Key 기반으로 구현 후, OAuth 등 필요 시 어댑터 내부만 수정 |
| Retry/Circuit Breaker 튜닝 | Medium | Medium | 설정값 외부화(환경변수), 운영 중 조정 가능하도록 설계 |
| In-process 이벤트 유실 (프로세스 크래시) | Low | Medium | DLQ로 실패 이벤트 보존. 중요 이벤트는 DB 트랜잭션 내에서 발행 |
| Edicus render API 응답 시간 초과 | Medium | Low | Polling + timeout 패턴. Render는 비동기 처리이므로 핵심 기능에 영향 없음 |

### 7.2 Dependency Risks

| Dependency | Risk | Mitigation |
|-----------|------|------------|
| SPEC-DATA-002 (schema) | 스키마 변경 시 mapper 수정 필요 | Mapper 단위 테스트로 스키마 변경 감지 |
| SPEC-INFRA-001 (Drizzle) | Drizzle ORM 패턴 일관성 | 기존 schema 패턴 준수, migration 검증 |
| SPEC-SHOPBY-001~006 (future) | 이 SPEC의 아키텍처가 기반이 됨 | 확장 가능한 인터페이스 설계, 하위 호환성 보장 |

---

## 8. Milestones

### Milestone 1: EventBus MVP

**Priority**: Primary Goal - Must Complete First

- EventBus 인터페이스 및 in-process 구현
- 12개 DomainEvent 타입 정의
- IntegrationAdapter 인터페이스
- Retry, CircuitBreaker 유틸리티
- Dead Letter Queue
- AdapterRegistry
- 단위 테스트 85%+ 커버리지

**완료 기준**: EventBus에서 이벤트 발행 -> 핸들러 수신 -> 실패 시 DLQ 저장 흐름이 테스트로 검증됨

### Milestone 2: MES Adapter

**Priority**: Primary Goal - Existing Data Integration

- MesMapper (option_choice_mes_mapping 기반 코드 변환)
- MesAdapter (order.created -> dispatch, status callback)
- MES mapping status state machine (pending -> mapped -> verified)
- 5개 MES API endpoints
- 260개 기존 MES items 데이터와 연동 검증

**완료 기준**: 주문 생성 이벤트 -> MES 매핑 검증 -> 발주 데이터 생성 흐름이 테스트로 검증됨

### Milestone 3: Edicus Adapter

**Priority**: Secondary Goal - 111 Products

- EdicusMapper (product -> editor config, edicus_code 파생)
- EdicusAdapter (config delivery, design save, render trigger)
- 6개 Edicus API endpoints
- 111개 product_editor_mapping 데이터와 연동 검증

**완료 기준**: 상품 ID -> 에디터 설정 조회 -> 디자인 저장 -> 렌더 트리거 흐름이 테스트로 검증됨

### Milestone 4: Shopby Adapter

**Priority**: Secondary Goal - Future-Ready

- ShopbyMapper (product/order 양방향 변환)
- ShopbyAdapter (product sync, order webhook, status callback)
- 5개 Shopby API endpoints
- Mock API 기반 통합 테스트 (실제 API는 SPEC-SHOPBY-001~006)

**완료 기준**: 상품 이벤트 -> Shopby 형식 변환 -> Mock API 호출 흐름이 테스트로 검증됨

### Milestone 5: Integration Testing & Hardening

**Priority**: Final Goal

- E2E 이벤트 흐름 테스트 (product -> Shopby, order -> MES)
- Circuit breaker 상태 전환 통합 테스트
- Dead letter queue replay 기능 테스트
- Adapter health check 및 모니터링 검증
- 전체 커버리지 85%+ 달성

**완료 기준**: 모든 통합 테스트 통과, 외부 시스템 장애 시 핵심 기능 격리 검증

---

## 9. SPEC-SHOPBY-001~006 Extensibility Preparation

이 SPEC의 아키텍처는 향후 6개 Shopby SPEC의 기반이 된다.

| Future SPEC | Prepared Foundation |
|-------------|-------------------|
| SPEC-SHOPBY-001 (Product Sync) | ShopbyMapper.toShopbyProduct(), product.* event subscription |
| SPEC-SHOPBY-002 (Category Mapping) | `/api/v1/integration/shopby/categories` endpoint 골격 |
| SPEC-SHOPBY-003 (Order Integration) | ShopbyMapper.fromShopbyOrder(), order webhook endpoint |
| SPEC-SHOPBY-004 (Price Sync) | price.changed event type, EventBus subscription 패턴 |
| SPEC-SHOPBY-005 (Stock Sync) | IntegrationAdapter 인터페이스, 새 어댑터 등록 패턴 |
| SPEC-SHOPBY-006 (Delivery Tracking) | order.status.changed event, webhook callback 패턴 |

### Extensibility Design Principles

- **Open-Closed**: 새 어댑터 추가 시 기존 코드 수정 불필요 (AdapterRegistry.register)
- **API Versioning**: `/api/v1/` 하위에 격리, 향후 `/api/v2/` 추가 가능
- **Event-Driven**: 새 이벤트 타입 추가 시 type union에 추가만 필요
- **Adapter Isolation**: 어댑터 간 의존성 없음, 독립적 확장 가능

---

## 10. Technical Approach

### 10.1 Event Bus Implementation Strategy

```
EventBus (interface)
  |
  +-- InProcessEventBus (MVP: EventEmitter-based)
  |     - Typed event emission
  |     - Async handler execution
  |     - Handler error isolation
  |     - correlationId propagation
  |
  +-- [Future] RedisEventBus (extends same interface)
```

- EventBus는 인터페이스로 추상화하여 구현체 교체가 용이하도록 설계
- 모든 이벤트는 `EventMetadata` (id, timestamp, correlationId, source)를 포함
- 핸들러 실패 시 에러를 로깅하고 DLQ에 저장하되, 다른 핸들러 실행에 영향 없음

### 10.2 Circuit Breaker Strategy

- 어댑터별 독립 CircuitBreaker 인스턴스
- 상태 전환: CLOSED -> OPEN (5회 연속 실패) -> HALF_OPEN (60초 후) -> CLOSED/OPEN
- Edicus는 낮은 임계값 적용 (3회 실패, 30초 cooldown) - render API 특성 반영
- CircuitBreaker 상태는 메모리에 유지 (프로세스 재시작 시 CLOSED로 초기화)

### 10.3 Testing Strategy

- **Unit Tests**: 각 모듈별 독립 테스트 (EventBus, CircuitBreaker, Retry, Mapper, Adapter)
- **Integration Tests**: 이벤트 발행 -> 어댑터 처리 -> 외부 API 호출 흐름 (Mock API 사용)
- **Behavior Tests**: Circuit breaker 상태 전환, DLQ 저장/재시도, 멱등성 검증
- **Coverage Target**: 85%+ (TRUST 5 기준)

---

## 11. Traceability

| Requirement | Phase | Task(s) | Priority |
|-------------|-------|---------|----------|
| REQ-EVT-001 | Phase 1 | 1.1, 1.2 | Primary |
| REQ-EVT-002 | Phase 1 | 1.1 | Primary |
| REQ-EVT-003 | Phase 1 | 1.3, 1.7 | Primary |
| REQ-ADP-001 | Phase 1 | 1.7 | Primary |
| REQ-ADP-002 | Phase 1 | 1.5, 1.7 | Primary |
| REQ-SHOPBY-001 | Phase 2C | 2C.1~2C.3 | Secondary |
| REQ-SHOPBY-002 | Phase 2C, 3 | 2C.3, 3.3 | Secondary |
| REQ-SHOPBY-003 | Phase 3 | 3.3 | Secondary |
| REQ-MES-001 | Phase 2A | 2A.1~2A.3 | Primary |
| REQ-MES-002 | Phase 2A, 3 | 2A.3, 3.1 | Primary |
| REQ-MES-003 | Phase 2A | 2A.4 | Primary |
| REQ-MES-004 | Phase 3 | 3.1 | Secondary |
| REQ-EDICUS-001 | Phase 2B | 2B.1~2B.3 | Secondary |
| REQ-EDICUS-002 | Phase 2B, 3 | 2B.3, 3.2 | Secondary |
| REQ-EDICUS-003 | Phase 3 | 3.2 | Secondary |
| REQ-ERR-001 | Phase 1 | 1.4 | Primary |
| REQ-ERR-002 | Phase 1 | 1.5 | Primary |
| REQ-ERR-003 | Phase 1 | 1.6 | Primary |
| REQ-ERR-004 | Phase 1 | 1.5, 1.7 | Primary |
| REQ-MAP-001 | Phase 2C | 2C.2 | Secondary |
| REQ-MAP-002 | Phase 2A | 2A.2 | Primary |
| REQ-MAP-003 | Phase 2B | 2B.2 | Secondary |
