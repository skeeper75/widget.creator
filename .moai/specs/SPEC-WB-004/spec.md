# SPEC-WB-004: Pricing Rules & Calculation Engine

**Version:** 1.0.0
**Date:** 2026-02-25
**Status:** Completed
**Parent:** SPEC-WB-002 (Product Category & Recipe)
**Depends on:** SPEC-WB-001, SPEC-WB-002, SPEC-WB-003

---

## 1. Context

### 1.1 이 SPEC이 다루는 것

후니프린팅 위젯빌더의 **가격 계산 엔진** (Pricing Rules & Calculation Engine)

- 4가지 가격 계산 방식: 단가표형(LOOKUP), 면적형(AREA), 페이지형(PAGE), 복합가산형(COMPOSITE)
- 기본 출력비 단가표 (print_cost_base)
- 후가공비 테이블 (postprocess_cost)
- 수량할인 구간 (qty_discount)
- 계산식 수식 편집기 (관리자)
- 실시간 견적 계산 API

### 1.2 이 SPEC이 다루지 않는 것

- 옵션 타입/선택지 라이브러리 (SPEC-WB-001)
- 상품/레시피 관리 (SPEC-WB-002)
- 제약조건 시스템 (SPEC-WB-003) — 단, `change_price_mode` 액션 수신 처리는 이 SPEC에서 정의
- 관리자 UI 위저드 흐름 (SPEC-WB-005)
- 런타임 전체 파이프라인 (SPEC-WB-006)
- Shopby/MES 가격 동기화 (SPEC-WI-001, SPEC-WI-002)

### 1.3 핵심 설계 원칙

> **상품별 가격 계산 방식 선택**: 각 상품은 4가지 계산 방식 중 하나를 선택한다.
> 동일 상품에 여러 계산 방식이 적용되지 않는다 (단, `change_price_mode` 제약조건 액션으로 런타임 전환 가능).

> **가격 구조 공식**: `total = (print_cost + process_cost) × (1 - discount)`
> - print_cost: 기본 출력비 (계산 방식에 따라 산출)
> - process_cost: 후가공비 합산
> - discount: 수량할인율

> **최소면적 보정**: 면적형 계산 시 `MAX(W×H/1e6, 0.1)` 적용 (0.1㎡ 미만 보정)

---

## 2. Domain Model

### 2.1 Price Mode (가격 계산 방식)

| 모드 | mode_key | 적용 상품 | 계산 공식 |
|------|---------|---------|---------|
| 단가표형 | `LOOKUP` | 명함, 엽서, 스티커 | `LOOKUP(print_cost_base, plate_type, print_mode, qty_tier)` |
| 면적형 | `AREA` | 현수막, 배너, 포스터 | `MAX(W×H/1e6, 0.1) × unit_price_per_sqm` |
| 페이지형 | `PAGE` | 책자, 카탈로그 | `CEIL(inner_pages / imposition) × unit_price + cover_price` |
| 복합가산형 | `COMPOSITE` | 아크릴, 굿즈 | `base_cost + SUM(coating + foil + die_cut + plate_cost)` |

### 2.2 Print Cost Base (기본 단가표)

단가표형(LOOKUP) 계산의 핵심 데이터. 판형(plate_type) × 인쇄방식(print_mode) × 수량구간(qty_tier) 조합으로 단가를 검색한다.

### 2.3 Postprocess Cost (후가공비)

선택된 후가공 항목별 비용. 후가공 코드(process_code)로 식별되며, 수량/면적에 따른 단가가 다를 수 있다.

### 2.4 Quantity Discount (수량할인)

수량 구간별 할인율. 상품별로 다른 할인 구간을 설정할 수 있다.

예:
- 1~99매: 0% (기본가)
- 100~299매: 3% (소량할인)
- 300~499매: 7% (중량할인)
- 500~999매: 12% (대량할인)
- 1000매+: 18% (대량특가)

---

## 3. EARS Format Requirements

### FR-WB004-01: 가격 계산 방식 설정

**[WHEN]** 관리자가 상품의 가격 계산 방식을 설정할 때,
**[THE SYSTEM SHALL]** `price_mode` ('LOOKUP'|'AREA'|'PAGE'|'COMPOSITE')를 저장하고, 해당 방식에 필요한 파라미터 테이블을 연결한다.

**[IF]** 이미 설정된 price_mode를 변경하면,
**[THE SYSTEM SHALL]** 기존 단가 데이터는 보존하되, 새 방식으로 전환 시 필요한 추가 데이터 입력을 안내한다.

### FR-WB004-02: 단가표형 (LOOKUP) 계산

**[WHEN]** 단가표형 상품의 견적을 계산할 때,
**[THE SYSTEM SHALL]** `print_cost_base` 테이블에서 (plate_type, print_mode, qty_tier) 조합으로 기본 출력비를 검색한다.

**[IF]** 해당 조합의 단가가 없으면,
**[THE SYSTEM SHALL]** "단가 미설정" 경고를 반환하고 0원으로 처리한다.

### FR-WB004-03: 면적형 (AREA) 계산

**[WHEN]** 면적형 상품의 견적을 계산할 때,
**[THE SYSTEM SHALL]** `MAX(W × H / 1,000,000, 0.1) × unit_price_per_sqm`으로 기본 출력비를 산출한다.

**[WHERE]** 최소면적(0.1㎡)보다 작은 규격이면,
**[THE SYSTEM SHALL]** 0.1㎡로 보정하여 최소 단가를 보장한다.

### FR-WB004-04: 페이지형 (PAGE) 계산

**[WHEN]** 페이지형 상품의 견적을 계산할 때,
**[THE SYSTEM SHALL]** `CEIL(inner_pages / imposition) × unit_price + cover_price`로 산출한다.

**[WHERE]** 판걸이(imposition) 수는 제본 방식(중철/무선/PUR)에 따라 다르며,
**[THE SYSTEM SHALL]** 제본비를 별도 합산한다.

### FR-WB004-05: 복합가산형 (COMPOSITE) 계산

**[WHEN]** 복합가산형 상품의 견적을 계산할 때,
**[THE SYSTEM SHALL]** `base_cost + SUM(선택된 가공비)`로 산출한다.

**[IF]** 특정 가공 선택 시 조건부 동판비가 발생하면 (SPEC-WB-003 `auto_add` 액션),
**[THE SYSTEM SHALL]** 해당 비용을 자동 합산한다.

### FR-WB004-06: 후가공비 합산

**[WHEN]** 고객이 후가공 옵션을 선택할 때,
**[THE SYSTEM SHALL]** 선택된 후가공 항목들의 단가를 `postprocess_cost` 테이블에서 조회하여 합산한다.

**[IF]** 후가공 단가가 수량/면적에 따라 달라지면,
**[THE SYSTEM SHALL]** 해당 수량/면적 구간의 단가를 적용한다.

### FR-WB004-07: 수량할인 적용

**[WHEN]** 견적 최종가를 계산할 때,
**[THE SYSTEM SHALL]** `qty_discount` 테이블에서 해당 수량 구간의 할인율을 조회하고 적용한다.

**[THE SYSTEM SHALL]** 최종가 = `(print_cost + process_cost) × (1 - discount_rate)`

### FR-WB004-08: change_price_mode 액션 수신

**[WHEN]** SPEC-WB-003의 `change_price_mode` 제약조건 액션이 발동되면,
**[THE SYSTEM SHALL]** 지정된 가격 계산 모드와 테이블로 전환하여 즉시 재계산한다.

### FR-WB004-09: 실시간 견적 테스트

**[WHEN]** 관리자가 가격 설정 화면에서 옵션 조합을 선택하고 테스트를 실행할 때,
**[THE SYSTEM SHALL]** 기본 출력비, 후가공비, 수량할인을 각각 산출하고 내역과 최종가를 반환한다.

---

## 4. DB Schema

### 4.1 테이블: `product_price_configs`

위치: `packages/db/src/schema/widget/04-product-price-configs.ts`

```
product_price_configs
─────────────────────────────────────────────
id               serial PRIMARY KEY
product_id       integer NOT NULL REFERENCES products(id) ON DELETE CASCADE
price_mode       varchar(20) NOT NULL
                   CHECK IN ('LOOKUP', 'AREA', 'PAGE', 'COMPOSITE')
formula_text     text                       -- 관리자 작성 계산식 설명 (참고용)

-- AREA 모드 전용
unit_price_sqm   decimal(12,2)              -- ㎡당 단가
min_area_sqm     decimal(6,4) DEFAULT 0.1   -- 최소면적 (기본 0.1㎡)

-- PAGE 모드 전용
imposition       integer                    -- 판걸이 수
cover_price      decimal(12,2)              -- 표지 단가
binding_cost     decimal(12,2)              -- 제본비

-- COMPOSITE 모드 전용
base_cost        decimal(12,2)              -- 기본 비용

is_active        boolean NOT NULL DEFAULT true
created_at       timestamptz NOT NULL DEFAULT now()
updated_at       timestamptz NOT NULL DEFAULT now()

UNIQUE uq_ppc_product ON product_id
INDEX  idx_ppc_mode   ON price_mode
```

### 4.2 테이블: `print_cost_base`

위치: `packages/db/src/schema/widget/04-print-cost-base.ts`

```
print_cost_base
─────────────────────────────────────────────
id               serial PRIMARY KEY
product_id       integer NOT NULL REFERENCES products(id)
plate_type       varchar(50) NOT NULL       -- 판형 코드 (예: '90x50', '100x148')
print_mode       varchar(50) NOT NULL       -- 인쇄방식 (예: '단면칼라', '양면칼라')
qty_min          integer NOT NULL           -- 수량 구간 시작
qty_max          integer NOT NULL           -- 수량 구간 끝
unit_price       decimal(12,2) NOT NULL     -- 단가 (원)
is_active        boolean NOT NULL DEFAULT true
created_at       timestamptz NOT NULL DEFAULT now()
updated_at       timestamptz NOT NULL DEFAULT now()

INDEX idx_pcb_product ON product_id
INDEX idx_pcb_lookup  ON (product_id, plate_type, print_mode, qty_min)
```

### 4.3 테이블: `postprocess_cost`

위치: `packages/db/src/schema/widget/04-postprocess-cost.ts`

```
postprocess_cost
─────────────────────────────────────────────
id               serial PRIMARY KEY
product_id       integer REFERENCES products(id)    -- NULL이면 전역 적용
process_code     varchar(50) NOT NULL       -- 후가공 코드 (예: 'MATTE_PP', 'UV_COATING')
process_name_ko  varchar(100) NOT NULL
qty_min          integer DEFAULT 0          -- 수량 구간 (0이면 무관)
qty_max          integer DEFAULT 999999
unit_price       decimal(12,2) NOT NULL     -- 단가
price_type       varchar(20) NOT NULL DEFAULT 'fixed'
                   CHECK IN ('fixed', 'per_unit', 'per_sqm')
is_active        boolean NOT NULL DEFAULT true
created_at       timestamptz NOT NULL DEFAULT now()
updated_at       timestamptz NOT NULL DEFAULT now()

INDEX idx_ppc_product ON product_id
INDEX idx_ppc_code    ON process_code
```

### 4.4 테이블: `qty_discount`

위치: `packages/db/src/schema/widget/04-qty-discount.ts`

```
qty_discount
─────────────────────────────────────────────
id               serial PRIMARY KEY
product_id       integer REFERENCES products(id)    -- NULL이면 전역 적용
qty_min          integer NOT NULL
qty_max          integer NOT NULL
discount_rate    decimal(5,4) NOT NULL      -- 할인율 (예: 0.03 = 3%)
discount_label   varchar(50)                -- 표시명 (예: '소량할인')
display_order    integer NOT NULL DEFAULT 0
is_active        boolean NOT NULL DEFAULT true
created_at       timestamptz NOT NULL DEFAULT now()

UNIQUE uq_qd ON (product_id, qty_min, qty_max)
INDEX  idx_qd_product ON product_id
```

---

## 5. Pricing Engine

### 5.1 계산 파이프라인

```
입력: productId, selectedOptions {SIZE, PAPER, FINISHING[], QUANTITY, ...}
      ↓
1. product_price_configs 조회 → price_mode 결정
      ↓
2. 기본 출력비 계산 (price_mode별 분기)
   ├── LOOKUP → print_cost_base 테이블 검색
   ├── AREA   → W × H / 1e6 × unit_price_sqm
   ├── PAGE   → CEIL(pages / imposition) × unit_price + cover
   └── COMPOSITE → base_cost
      ↓
3. 후가공비 합산
   → SUM(postprocess_cost WHERE code IN selected_processes)
      ↓
4. 수량할인율 조회
   → qty_discount WHERE qty BETWEEN min AND max
      ↓
5. 최종가 산출
   → (print_cost + process_cost) × (1 - discount_rate)
      ↓
출력: { printCost, processCost, discountRate, discountAmount, totalPrice, pricePerUnit }
```

---

## 6. API Endpoints

### POST /api/widget/pricing/calculate
견적 계산 (고객 위젯용)

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
  "priceMode": "LOOKUP",
  "breakdown": {
    "printCost": 6500,
    "processCost": 1700,
    "subtotal": 8200,
    "discountRate": 0.03,
    "discountAmount": 246,
    "totalPrice": 7954,
    "pricePerUnit": 79.54
  },
  "appliedDiscount": {
    "tier": "100~299매",
    "rate": "3%",
    "label": "소량할인"
  }
}
```

### GET /api/admin/widget/products/:productId/price-config
상품 가격 설정 조회

### PUT /api/admin/widget/products/:productId/price-config
상품 가격 설정 저장/수정

### CRUD /api/admin/widget/products/:productId/print-cost-base
단가표 관리

### CRUD /api/admin/widget/products/:productId/postprocess-cost
후가공비 관리

### CRUD /api/admin/widget/products/:productId/qty-discount
수량할인 구간 관리

### POST /api/admin/widget/pricing/test
관리자 실시간 견적 테스트

---

## 7. Acceptance Criteria

### AC-WB004-01: 4가지 계산 방식
- [ ] LOOKUP 모드: plate_type × print_mode × qty_tier 조합으로 단가 검색 성공
- [ ] AREA 모드: 최소면적 보정(0.1㎡) 적용 확인
- [ ] PAGE 모드: 판걸이 나눗셈 + 올림(CEIL) + 표지단가 합산 확인
- [ ] COMPOSITE 모드: base_cost + 선택 가공비 합산 확인

### AC-WB004-02: 후가공비
- [ ] 선택된 후가공 항목별 단가 합산 정확
- [ ] 수량 구간별 후가공 단가 차등 적용
- [ ] 전역(product_id NULL) 후가공비와 상품별 후가공비 우선순위 처리

### AC-WB004-03: 수량할인
- [ ] 수량 구간 경계값 정확 (100매 → 3% 할인, 99매 → 0%)
- [ ] 할인 내역이 응답에 포함
- [ ] 전역 할인과 상품별 할인 우선순위 처리

### AC-WB004-04: 가격 계산 성능
- [ ] 단일 견적 계산 100ms 이내
- [ ] 동시 100건 계산 요청 시 평균 200ms 이내

### AC-WB004-05: change_price_mode 연동
- [ ] WB-003 `change_price_mode` 액션 수신 시 계산 모드 전환
- [ ] 전환 후 즉시 재계산 결과 반환

---

## 8. Open Questions

1. **Excel 단가 데이터 임포트**: 기존 Excel의 단가표를 print_cost_base에 일괄 임포트하는 방법은?
   → 관리자 화면에서 CSV 업로드 또는 초기 시드 스크립트로 처리

2. **가격 캐싱**: 동일 조합의 반복 계산 시 캐시를 적용할 것인가?
   → 옵션 변경 시마다 재계산 필요, 단기 캐시(5초) 검토

3. **통화**: 원화(KRW) 전용인가, 다국 통화 지원이 필요한가?
   → 초기: KRW 전용

---

## 9. 아키텍처 컨텍스트

```
[SPEC-WB-002] 레시피 → product_id 참조
      ↓
[SPEC-WB-003] 제약조건 → change_price_mode 액션
      ↓
[SPEC-WB-004] 가격 계산 (이 문서)
      → product_price_configs: 상품별 계산 방식
      → print_cost_base: LOOKUP 단가표
      → postprocess_cost: 후가공비
      → qty_discount: 수량할인
      ↓ 시뮬레이션에서 일괄 검증
[SPEC-WB-005] 관리자 콘솔 & 시뮬레이션
      ↓ 런타임 실시간 계산
[SPEC-WB-006] 런타임 자동견적 엔진
```

---

*SPEC-WB-004 v1.0.0 — 어노테이션 사이클 1*
*후니프린팅 위젯빌더: 가격 계산 엔진 (4가지 방식 + 후가공비 + 수량할인)*

---

## Implementation Notes (2026-02-25)

**Status**: Completed — All requirements implemented as specified.

### Actual Implementation Summary

- **Files Created**: 16 new files in packages/db/src/schema/widget/ and packages/widget-api/src/
- **Strategy Pattern**: 4 concrete strategies (LookupPricing, AreaPricing, PagePricing, CompositePricing) implementing IPricingStrategy interface
- **Database**: 4 new tables added to packages/db/src/schema/widget/ (04-*.ts files)
- **API Routes**: widget/pricingCalculate.ts + admin/priceConfig.ts + admin/pricingTest.ts
- **Tests**: 83 tests across 3 test files, all passing

### Divergence from Plan
- No significant divergences — implementation matches SPEC as designed
- change_price_mode ECA integration implemented as specified in §3 (SPEC-WB-003 dependency)

### Commit Reference
`a708ce0` feat(wb-004): implement SPEC-WB-004 Pricing Rules & Calculation Engine
