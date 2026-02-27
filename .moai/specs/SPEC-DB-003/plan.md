---
id: SPEC-DB-003
phase: plan
version: 1.0.0
---

## 1. 구현 전략

### 1.1 파일 구조

SPEC-DB-003 대상 파일은 04- 접두사 그룹에 속한다.

| 파일명                      | 테이블                | 접두사 |
| --------------------------- | --------------------- | ------ |
| 04-product-price-configs.ts | product_price_configs | 04-    |
| 04-print-cost-base.ts       | print_cost_base       | 04-    |
| 04-postprocess-cost.ts      | postprocess_cost      | 04-    |
| 04-qty-discount.ts          | qty_discount          | 04-    |

### 1.2 가격 엔진 연동

가격 산정 스키마는 가격 엔진(`packages/core/src/pricing/engine.ts`)과 견적 계산기(`packages/core/src/quote/calculator.ts`)에서 직접 조회된다. 스키마 변경 시 가격 엔진 호환성을 반드시 확인해야 한다.

---

## 2. 마이그레이션 전략

### 2.1 현재 상태

4개 테이블 모두 이미 구현 완료 상태이다. 이 SPEC은 소급적 문서화이다.

### 2.2 미적용 마이그레이션 항목

- CHECK 제약 `priceMode IN ('LOOKUP', 'AREA', 'PAGE', 'COMPOSITE')` -- 마이그레이션 SQL 필요
- CHECK 제약 `priceType IN ('fixed', 'per_unit', 'per_sqm')` -- 마이그레이션 SQL 필요
- CHECK 제약 `qtyMin <= qtyMax` (print_cost_base, qty_discount) -- 선택적

---

## 3. 시드 데이터 계획

### 3.1 print_cost_base 시드

MES 데이터에서 추출한 인쇄 기본비 테이블. 상품/판형/인쇄방식/수량 범위별 단가를 시드한다.

시드 데이터 소스: MES 가격표 JSON (데이터팀 제공)

시드 규모 예시:
- 명함: 약 20행 (2 판형 x 2 인쇄방식 x 5 수량 구간)
- 전단: 약 40행 (4 판형 x 2 인쇄방식 x 5 수량 구간)

### 3.2 postprocess_cost 시드

표준 후가공 비용 시드:
- MATTE_PP (무광PP) -- priceType: per_unit
- GLOSSY_PP (유광PP) -- priceType: per_unit
- UV_COATING (UV코팅) -- priceType: per_sqm
- GOLD_FOIL (금박) -- priceType: per_unit
- EMBOSSING (형압) -- priceType: fixed
- ROUND_CORNER (모서리둥글림) -- priceType: fixed

전역(productId=NULL) 규칙으로 초기 시드하고, 상품별 예외는 Admin Console에서 설정.

### 3.3 qty_discount 시드

표준 수량 할인 시드:
- 100~499: 3% 할인 (소량할인)
- 500~999: 5% 할인 (중량할인)
- 1000~4999: 8% 할인 (대량할인)
- 5000+: 10% 할인 (특대량할인)

전역(productId=NULL) 규칙으로 초기 시드.

---

## 4. CHECK 제약조건

### 4.1 필요한 CHECK 제약

```sql
-- product_price_configs.priceMode
ALTER TABLE product_price_configs
ADD CONSTRAINT chk_ppc_price_mode
CHECK (price_mode IN ('LOOKUP', 'AREA', 'PAGE', 'COMPOSITE'));

-- postprocess_cost.priceType
ALTER TABLE postprocess_cost
ADD CONSTRAINT chk_pc_price_type
CHECK (price_type IN ('fixed', 'per_unit', 'per_sqm'));

-- print_cost_base 수량 범위 유효성
ALTER TABLE print_cost_base
ADD CONSTRAINT chk_pcb_qty_range
CHECK (qty_min <= qty_max);

-- qty_discount 수량 범위 유효성
ALTER TABLE qty_discount
ADD CONSTRAINT chk_qd_qty_range
CHECK (qty_min <= qty_max);

-- qty_discount 할인율 범위
ALTER TABLE qty_discount
ADD CONSTRAINT chk_qd_discount_range
CHECK (discount_rate >= 0 AND discount_rate <= 1);
```

### 4.2 적용 우선순위

- Primary Goal: priceMode, priceType CHECK 제약
- Secondary Goal: qtyMin <= qtyMax CHECK 제약
- Optional Goal: discountRate 범위 CHECK 제약

---

## 5. DB 트리거 필요 사항

이 SPEC에서는 DB 트리거가 필요하지 않다. 모든 비즈니스 규칙은 CHECK 제약 또는 애플리케이션 레벨에서 처리된다.

---

## 6. 인덱스 최적화 계획

### 6.1 현재 인덱스 상태

모든 주요 인덱스가 Drizzle 스키마에 정의되어 있다.

### 6.2 LOOKUP 성능 최적화

LOOKUP 모드의 핵심 쿼리는 4-컬럼 복합 인덱스 `idx_pcb_lookup`으로 최적화되어 있다. 수량 범위 검색 (`qtyMin <= ? AND ? <= qtyMax`)은 인덱스 스캔 후 필터링된다.

### 6.3 인덱스명 충돌 확인

`postprocess_cost`의 `idx_ppc_product`와 `product_price_configs`의 인덱스명이 잠재적으로 충돌할 수 있다. 마이그레이션 생성 시 실제 인덱스명을 확인하고, 필요 시 `idx_postproc_product` 등으로 변경을 검토한다.

---

## 7. 성능 고려사항

### 7.1 LOOKUP 가격 조회 성능

LOOKUP 모드는 위젯에서 실시간 견적 계산 시 호출되므로 응답 시간이 중요하다.

**최적화 전략**:
- 4-컬럼 복합 인덱스로 인덱스 스캔 최적화
- 결과 캐싱: 동일 상품/판형/인쇄방식 조합의 가격 테이블을 세션 캐싱
- 벌크 로드: 상품별 전체 가격 테이블을 한번에 로드하여 클라이언트 캐싱

### 7.2 전역 vs 상품별 규칙 오버라이드

후가공 비용과 수량 할인에서 전역/상품별 규칙 오버라이드 로직:
```sql
-- 상품별 규칙 우선, 없으면 전역 규칙
SELECT * FROM postprocess_cost
WHERE (product_id = $1 OR product_id IS NULL)
  AND process_code = $2
  AND is_active = true
ORDER BY product_id NULLS LAST
LIMIT 1;
```

`ORDER BY product_id NULLS LAST`로 상품별 규칙이 전역보다 먼저 반환되어 오버라이드 효과를 달성한다.

### 7.3 print_cost_base 데이터 볼륨

상품 수 x 판형 수 x 인쇄방식 수 x 수량 구간 수로 행 수가 증가한다.
- 상품 50개 x 평균 4 판형 x 2 인쇄방식 x 5 수량 구간 = 약 2,000행
- 인덱스 효율이 높으므로 이 규모에서는 성능 문제 없음

---

## 8. 위험 요소 및 완화 전략

### 8.1 수량 범위 겹침

- **위험**: print_cost_base 또는 qty_discount에서 수량 범위가 겹치는 레코드 존재
- **영향**: 잘못된 가격 산출, 할인 이중 적용
- **완화**: 애플리케이션 레벨에서 범위 겹침 검증 로직 구현. 저장 전 (productId, plateType, printMode) 그룹 내 기존 범위와 겹침 확인.

### 8.2 가격 모드 필드 불일치

- **위험**: priceMode='LOOKUP'인데 unitPriceSqm에 값이 설정되어 있는 경우
- **영향**: 혼란, 잘못된 가격 참조
- **완화**: 애플리케이션 레벨에서 priceMode에 따른 필드 정합성 검증. 불필요한 필드는 NULL로 강제.

### 8.3 전역 규칙과 상품별 규칙의 불일치

- **위험**: 전역 할인율이 상품별 할인율보다 높은 경우 혼란
- **영향**: 예상보다 낮은 할인 적용
- **완화**: Admin Console에서 전역/상품별 규칙 비교 UI 제공. 상품별 규칙 설정 시 전역 규칙 참고 정보 표시.

### 8.4 인덱스명 충돌

- **위험**: postprocess_cost와 product_price_configs에서 idx_ppc_ 접두사 공유
- **영향**: 마이그레이션 오류, 인덱스 생성 실패
- **완화**: Drizzle 생성 마이그레이션에서 실제 인덱스명 확인. 필요 시 명시적 인덱스명 지정.
