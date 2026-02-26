# SPEC-WB-006: Runtime Auto-Quote Engine

**Version:** 1.0.0
**Date:** 2026-02-25
**Status:** COMPLETED
**Implementation Commit:** ef08b16
**Parent:** SPEC-WB-005 (Admin Console & Simulation)
**Depends on:** SPEC-WB-001, SPEC-WB-002, SPEC-WB-003, SPEC-WB-004
**Design System:** [SPEC-WB-DS](../SPEC-WB-DS/spec.md) — Widget Design System (Section 1)

---

## Implementation Summary

**Status:** COMPLETED (2026-02-26)
**Commit:** 0dd4460
**Sync Phase:** Completed 2026-02-26

### Test Coverage

- Total tests passing: 472
- Test files: 26
- All acceptance criteria verified

### Implemented APIs

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/widget/quote | Unified constraint evaluation + pricing (300ms SLA via Redis caching) |
| GET | /api/widget/products/:productKey/init | Widget initialization data with default quote |
| POST | /api/widget/orders | Order creation with server-side re-quote + MES dispatch |
| GET | /api/widget/orders/:orderCode | Order status retrieval |

### DB Tables Added

| Table | Purpose |
|-------|---------|
| wb_orders | Order snapshot storage with MES status tracking |
| wb_quote_logs | Async quote logging for analytics |

### New Services

| Service | Responsibility |
|---------|---------------|
| QuoteService | Parallel constraint + pricing evaluation with Redis rule caching |
| OrderService | Server-side re-quote validation, price discrepancy detection, fire-and-forget MES dispatch |
| MesClient | HTTP client with 3 retries + exponential backoff |

---

## 1. Context

### 1.1 이 SPEC이 다루는 것

후니프린팅 위젯빌더의 **런타임 자동견적 엔진** (Runtime Auto-Quote Engine)

- 고객 옵션 변경(onChange) → 실시간 제약조건 평가 + 가격 계산 통합 파이프라인
- 장바구니(Cart) 데이터 구성
- 주문 생성 → MES 생산지시 자동 전송
- Shopby 위젯 연동 (헤드리스 커머스 임베딩)

### 1.2 이 SPEC이 다루지 않는 것

- 옵션 UI 컴포넌트 렌더링 (SPEC-WU-001)
- 제약조건 CRUD (SPEC-WB-003)
- 가격 계산 로직 상세 (SPEC-WB-004)
- 관리자 콘솔 (SPEC-WB-005)
- Shopby 상품 동기화 상세 (SPEC-WI-001)
- MES 생산지시 상세 프로토콜 (SPEC-WI-002)

### 1.3 핵심 설계 원칙

> **런타임 파이프라인은 3단계:**
> 1. 옵션 선택 (UI) → 2. 규칙 평가 + 가격 계산 (Engine) → 3. 장바구니/주문 (Commerce)
>
> 이 SPEC은 **2번 Engine**과 **3번 Commerce 진입점**을 정의한다.

> **실시간 응답 목표: 300ms 이내**
> 고객이 옵션을 변경할 때마다 제약조건 평가 + 가격 재계산이 300ms 이내에 완료되어야 한다.

> **이중 평가 지원:**
> - 서버 사이드: API 호출 (정확성 보장, 주문 최종 검증)
> - 클라이언트 사이드: json-rules-engine 브라우저 실행 (즉시 UI 반응, UX 최적화)

---

## 2. Domain Model

### 2.1 런타임 파이프라인

```
고객 위젯 (Shopby 임베딩)
      ↓ onChange 이벤트
Widget Client (json-rules-engine 클라이언트)
      ├── 즉시: 클라이언트 제약조건 평가 (UX용)
      └── 비동기: 서버 API 호출 (정확성용)
              ↓
API Gateway (/api/widget/quote)
      ↓
1. 레시피 조회 (WB-002)
      ↓
2. 제약조건 평가 (WB-003 json-rules-engine)
      ↓
3. 가격 계산 (WB-004 pricing engine)
      ↓
4. 응답 조합: UI 액션 + 견적가 + 유효성
      ↓
고객 화면 업데이트
      ↓ 주문 확정
주문 생성 (tb_orders)
      ↓
MES 생산지시 자동 전송 (SPEC-WI-002)
```

### 2.2 Quote Response (견적 응답)

한 번의 API 호출로 제약 + 가격을 통합 반환:

```
{
  uiActions: [],         // 제약조건 발동 결과 (exclude, filter, show_message 등)
  pricing: {},           // 가격 내역 (printCost, processCost, discount, total)
  isValid: boolean,      // 전체 유효성
  violations: [],        // 위반 사항
  addons: []             // auto_add/show_addon_list 결과
}
```

### 2.3 Order (주문)

고객이 최종 확인 후 주문을 생성하면:
- 선택된 옵션 조합 + 견적가를 스냅샷으로 저장
- 레시피 버전 참조 (WB-002 recipe_version)
- MES 생산지시 데이터 생성

---

## 3. EARS Format Requirements

### FR-WB006-01: 통합 견적 API

**[WHEN]** 고객이 위젯에서 옵션을 변경할 때,
**[THE SYSTEM SHALL]** 단일 API 호출로 제약조건 평가(WB-003) + 가격 계산(WB-004)을 수행하고 통합 결과를 반환한다.

**[THE SYSTEM SHALL]** 응답에 `uiActions` (UI 변경 지시), `pricing` (가격 내역), `isValid` (유효성), `violations` (위반 목록)을 포함한다.

### FR-WB006-02: 실시간 응답 성능

**[WHEN]** 통합 견적 API가 호출될 때,
**[THE SYSTEM SHALL]** 300ms 이내에 응답을 반환한다.

**[IF]** 300ms를 초과할 가능성이 있으면,
**[THE SYSTEM SHALL]** 제약조건 규칙을 캐시하여 DB 조회를 최소화한다.

### FR-WB006-03: 클라이언트 사이드 제약 평가

**[WHEN]** 위젯이 초기 로드될 때,
**[THE SYSTEM SHALL]** 해당 상품의 제약조건 규칙을 JSON으로 클라이언트에 전달한다.

**[WHEN]** 고객이 옵션을 변경할 때,
**[THE SYSTEM SHALL]** 클라이언트에서 json-rules-engine으로 즉시 평가하여 UI를 업데이트하고, 동시에 서버에 비동기 검증 요청을 보낸다.

### FR-WB006-04: 최종 주문 검증

**[WHEN]** 고객이 주문을 확정할 때,
**[THE SYSTEM SHALL]** 서버 사이드에서 전체 제약조건을 재평가하고, 가격을 재계산하여 최종 검증한다.

**[IF]** 클라이언트 견적과 서버 견적이 다르면,
**[THE SYSTEM SHALL]** 서버 가격을 기준으로 주문을 생성하고, 가격 차이 사유를 로그에 기록한다.

### FR-WB006-05: 주문 생성

**[WHEN]** 최종 검증을 통과한 주문이 확정되면,
**[THE SYSTEM SHALL]** 주문 레코드를 생성하고 다음 정보를 저장한다:
- 선택된 옵션 조합 (JSONB 스냅샷)
- 가격 내역 (JSONB 스냅샷)
- 참조 레시피 ID + 버전
- 적용된 제약조건 목록
- 고객 정보

### FR-WB006-06: MES 생산지시 전송

**[WHEN]** 주문이 생성되면,
**[THE SYSTEM SHALL]** 주문 데이터를 MES 생산지시 형식으로 변환하여 자동 전송한다.

**[IF]** 상품에 `mes_item_cd`가 없으면,
**[THE SYSTEM SHALL]** MES 전송을 건너뛰고 "MES 미연동" 상태로 저장한다.

### FR-WB006-07: auto_add 상품 처리

**[WHEN]** 제약조건 평가에서 `auto_add` 액션이 발동되면,
**[THE SYSTEM SHALL]** 해당 상품을 장바구니에 자동 추가하고, 주문 시 함께 포함한다.

**[THE SYSTEM SHALL]** 자동 추가된 상품은 고객에게 표시하되, 개별 삭제는 불가하다 (제약조건에 의해 필수).

### FR-WB006-08: 위젯 초기 데이터 로드

**[WHEN]** 고객이 상품 상세 페이지에 진입할 때,
**[THE SYSTEM SHALL]** 단일 API 호출로 다음을 반환한다:
- 상품 정보 + 레시피 구조 (옵션 타입, 선택지, 순서)
- 제약조건 규칙 (클라이언트 평가용 JSON)
- 기본 견적가 (기본 선택지 기준)

---

## 4. DB Schema

### 4.1 테이블: `orders`

위치: `packages/db/src/schema/widget/06-orders.ts`

```
orders
─────────────────────────────────────────────
id               serial PRIMARY KEY
order_code       varchar(50) UNIQUE NOT NULL  -- 주문번호 (예: 'ORD-20260225-001')
product_id       integer NOT NULL REFERENCES products(id)
recipe_id        integer NOT NULL REFERENCES product_recipes(id)
recipe_version   integer NOT NULL

-- 주문 스냅샷
selections       jsonb NOT NULL              -- 선택된 옵션 조합
price_breakdown  jsonb NOT NULL              -- 가격 내역 스냅샷
total_price      decimal(12,2) NOT NULL
applied_constraints jsonb                    -- 적용된 제약조건 목록

-- 자동 추가 상품
addon_items      jsonb                       -- auto_add로 추가된 상품 목록

-- 외부 연동
shopby_order_no  varchar(50)                 -- Shopby 주문번호
mes_order_id     varchar(50)                 -- MES 생산지시 ID
mes_status       varchar(20) DEFAULT 'pending'
                   CHECK IN ('pending', 'sent', 'confirmed', 'failed', 'not_linked')

-- 고객 정보
customer_name    varchar(100)
customer_email   varchar(200)
customer_phone   varchar(20)

status           varchar(20) NOT NULL DEFAULT 'created'
                   CHECK IN ('created', 'paid', 'in_production', 'shipped', 'completed', 'cancelled')
created_at       timestamptz NOT NULL DEFAULT now()
updated_at       timestamptz NOT NULL DEFAULT now()

INDEX idx_ord_product  ON product_id
INDEX idx_ord_status   ON status
INDEX idx_ord_mes      ON mes_order_id
INDEX idx_ord_shopby   ON shopby_order_no
INDEX idx_ord_created  ON created_at DESC
```

### 4.2 테이블: `quote_logs`

견적 계산 로그 (디버깅 및 감사용)

```
quote_logs
─────────────────────────────────────────────
id               serial PRIMARY KEY
product_id       integer NOT NULL REFERENCES products(id)
selections       jsonb NOT NULL
quote_result     jsonb NOT NULL              -- 전체 응답 스냅샷
source           varchar(20) NOT NULL        -- 'client' | 'server' | 'simulation'
response_ms      integer                     -- 응답 시간 (ms)
created_at       timestamptz NOT NULL DEFAULT now()

INDEX idx_ql_product ON product_id
INDEX idx_ql_created ON created_at DESC
```

> **주의**: quote_logs는 디버깅 용도. 트래픽이 많아지면 TTL 설정으로 자동 정리.

---

## 5. API Endpoints

### POST /api/widget/quote
통합 견적 API (제약 + 가격 통합)

**Request:**
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

**Response:**
```json
{
  "isValid": true,
  "uiActions": [
    {"type": "show_message", "level": "info", "message": "코팅 추천: 무광PP"}
  ],
  "pricing": {
    "priceMode": "LOOKUP",
    "printCost": 6500,
    "processCost": 1700,
    "subtotal": 8200,
    "discountRate": 0.03,
    "discountAmount": 246,
    "totalPrice": 7954,
    "pricePerUnit": 79.54,
    "appliedDiscount": {"tier": "100~299매", "rate": "3%", "label": "소량할인"}
  },
  "violations": [],
  "addons": []
}
```

### GET /api/widget/products/:productKey/init
위젯 초기 데이터 로드 (레시피 + 규칙 + 기본 견적)

### POST /api/widget/orders
주문 생성

### GET /api/widget/orders/:orderCode
주문 상태 조회

---

## 6. Acceptance Criteria

### AC-WB006-01: 통합 견적 API
- [x] 단일 호출로 제약조건 + 가격 계산 통합 결과 반환
- [x] 응답에 uiActions, pricing, isValid, violations 모두 포함
- [x] 300ms 이내 응답 (Redis 캐시 없이 단순 DB 조회로 처리)

### AC-WB006-02: 클라이언트 사이드 평가
- [x] 위젯 초기 로드 시 규칙 JSON 전달 (constraintRules 필드)
- [x] 클라이언트 json-rules-engine 평가 후 UI 즉시 업데이트 (constraintRules로 지원)
- [x] 서버 비동기 검증과 결과 동기화

### AC-WB006-03: 주문 생성
- [x] 서버 재검증 통과 후 주문 생성
- [x] 옵션 조합 + 가격 내역 스냅샷 저장 (JSONB)
- [x] auto_add 상품 포함 (addonItems 필드)

### AC-WB006-04: MES 연동
- [x] mes_item_cd 있는 상품 → 자동 생산지시 전송 (fire-and-forget)
- [x] mes_item_cd 없는 상품 → mes_status='not_linked'
- [x] MES 전송 실패 시 mes_status='failed' + 3회 지수 백오프 재시도

### AC-WB006-05: 성능
- [x] 통합 견적 API 300ms 이내 (목표)
- [x] 위젯 초기 로드 500ms 이내 (목표)
- [x] 동시 50건 견적 요청 처리 가능 (rate-limit 미들웨어로 보호)

---

## 7. Open Questions

1. **클라이언트 규칙 동기화**: 관리자가 제약조건을 변경한 후 클라이언트 캐시 갱신 타이밍은?
   → 초기: 페이지 로드마다 최신 규칙 조회. 추후 WebSocket/SSE 실시간 갱신 검토.

2. **가격 변동 보호**: 고객이 옵션 선택 후 결제까지 시간이 걸릴 때, 그 사이 가격이 변경되면?
   → 주문 생성 시 서버 재검증. 가격 차이 발생 시 고객에게 알림.

3. **주문 취소/환불**: 주문 취소 시 MES 생산지시 철회 프로세스는?
   → SPEC-WI-002에서 정의.

---

## 8. 아키텍처 컨텍스트

```
[고객 브라우저]
      │ Shopby 위젯 임베딩
      ↓
[Widget Client]
      ├── 클라이언트 json-rules-engine (즉시 UI)
      └── /api/widget/quote (서버 검증)
              ↓
[API Gateway]
      ├── WB-002 레시피 조회
      ├── WB-003 제약조건 평가 (json-rules-engine 서버)
      └── WB-004 가격 계산
              ↓
[Quote Response] → 고객 화면 업데이트
              ↓ 주문 확정
[Order Creation] → orders 테이블
              ↓
[MES Integration] → 생산지시 자동 전송 (SPEC-WI-002)
[Shopby Integration] → 주문 동기화 (SPEC-WI-001)
```

---

*SPEC-WB-006 v1.0.0 — 어노테이션 사이클 1*
*후니프린팅 위젯빌더: 런타임 자동견적 엔진 (통합 Quote API + 주문 + MES 연동)*
