---
id: SPEC-DB-003
phase: acceptance
version: 1.0.0
---

## Acceptance Criteria -- SPEC-DB-003: Widget DB 가격 산정 스키마

---

### AC-001: product_price_configs 상품당 1:1 UNIQUE 제약

```gherkin
Scenario: 상품당 정확히 1개 가격 설정
  Given wb_products에 id=1인 상품이 존재하고
  And product_price_configs에 productId=1인 설정이 존재할 때
  When productId=1인 새 가격 설정을 INSERT 시도하면
  Then UNIQUE 제약 위반 에러가 발생해야 한다

Scenario: 상품 삭제 시 가격 설정 CASCADE 삭제
  Given product_price_configs에 productId=1인 설정이 존재할 때
  When wb_products에서 id=1을 DELETE하면
  Then product_price_configs에서 productId=1인 설정이 함께 삭제되어야 한다
```

---

### AC-002: LOOKUP 모드 가격 조회

```gherkin
Scenario: LOOKUP 가격 정확 조회
  Given product_price_configs에 (productId=1, priceMode='LOOKUP')이 존재하고
  And print_cost_base에 다음 레코드가 존재할 때:
    | productId | plateType | printMode | qtyMin | qtyMax | unitPrice |
    | 1         | 90x50     | 단면칼라   | 100    | 499    | 35.00     |
    | 1         | 90x50     | 단면칼라   | 500    | 999    | 28.00     |
    | 1         | 90x50     | 단면칼라   | 1000   | 4999   | 22.00     |
  When plateType='90x50', printMode='단면칼라', quantity=300으로 조회하면
  Then unitPrice=35.00이 반환되어야 한다 (100 <= 300 <= 499)

Scenario: LOOKUP 범위 외 수량
  Given 위와 같은 데이터가 존재할 때
  When plateType='90x50', printMode='단면칼라', quantity=50으로 조회하면
  Then 매칭 결과가 없어야 한다 (50 < qtyMin=100)
```

---

### AC-003: AREA 모드 가격 계산

```gherkin
Scenario: AREA 가격 정상 계산
  Given product_price_configs에 (productId=2, priceMode='AREA', unitPriceSqm=50000.00, minAreaSqm=0.1)이 존재할 때
  When width=500mm, height=700mm, quantity=100으로 계산하면
  Then areaSqm = 0.5 * 0.7 = 0.35
  And effectiveArea = max(0.35, 0.1) = 0.35
  And basePrice = 0.35 * 50000.00 * 100 = 1,750,000이어야 한다

Scenario: AREA 최소 면적 적용
  Given product_price_configs에 (productId=2, priceMode='AREA', unitPriceSqm=50000.00, minAreaSqm=0.1)이 존재할 때
  When width=50mm, height=50mm, quantity=100으로 계산하면
  Then areaSqm = 0.05 * 0.05 = 0.0025
  And effectiveArea = max(0.0025, 0.1) = 0.1 (최소 면적 적용)
  And basePrice = 0.1 * 50000.00 * 100 = 500,000이어야 한다
```

---

### AC-004: 전역 vs 상품별 후가공 비용 오버라이드 (HARD RULE)

```gherkin
Scenario: 상품별 규칙이 전역 규칙을 오버라이드
  Given postprocess_cost에 다음 레코드가 존재할 때:
    | productId | processCode | unitPrice | priceType |
    | NULL      | MATTE_PP    | 500.00    | per_unit  |
    | 1         | MATTE_PP    | 800.00    | per_unit  |
  When productId=1, processCode='MATTE_PP'로 조회하면
  Then unitPrice=800.00 (상품별 규칙)이 반환되어야 한다
  And 전역 규칙(500.00)은 무시되어야 한다

Scenario: 전역 규칙 적용 (상품별 규칙 없음)
  Given postprocess_cost에 다음 레코드가 존재할 때:
    | productId | processCode | unitPrice | priceType |
    | NULL      | MATTE_PP    | 500.00    | per_unit  |
  When productId=5, processCode='MATTE_PP'로 조회하면 (productId=5 규칙 없음)
  Then unitPrice=500.00 (전역 규칙)이 반환되어야 한다

Scenario: NULL productId 다수 허용 (전역 규칙 복수)
  Given postprocess_cost에 productId=NULL인 레코드가 5개 존재할 때
  When productId=NULL인 새 전역 규칙을 INSERT하면
  Then INSERT가 성공해야 한다 (nullable FK는 다수 NULL 허용)
```

---

### AC-005: 전역 vs 상품별 수량 할인 오버라이드 (HARD RULE)

```gherkin
Scenario: 상품별 할인이 전역 할인을 오버라이드
  Given qty_discount에 다음 레코드가 존재할 때:
    | productId | qtyMin | qtyMax | discountRate |
    | NULL      | 100    | 499    | 0.0300       |
    | 1         | 100    | 499    | 0.0500       |
  When productId=1, quantity=200으로 조회하면
  Then discountRate=0.0500 (상품별 할인 5%)이 반환되어야 한다

Scenario: qty_discount UNIQUE 제약
  Given qty_discount에 (productId=1, qtyMin=100, qtyMax=499)가 존재할 때
  When (productId=1, qtyMin=100, qtyMax=499)인 새 레코드를 INSERT 시도하면
  Then UNIQUE 제약 위반 에러가 발생해야 한다

Scenario: 다른 수량 범위는 동일 상품 허용
  Given qty_discount에 (productId=1, qtyMin=100, qtyMax=499)가 존재할 때
  When (productId=1, qtyMin=500, qtyMax=999)인 새 레코드를 INSERT하면
  Then INSERT가 성공해야 한다
```

---

### AC-006: priceMode CHECK 제약 (마이그레이션 적용 후)

```gherkin
Scenario: 유효한 priceMode 허용
  Given product_price_configs 테이블에 CHECK 제약이 적용되어 있을 때
  When priceMode='LOOKUP'으로 INSERT하면
  Then INSERT가 성공해야 한다

Scenario: 잘못된 priceMode 거부
  Given product_price_configs 테이블에 CHECK 제약이 적용되어 있을 때
  When priceMode='INVALID_MODE'로 INSERT 시도하면
  Then CHECK 제약 위반 에러가 발생해야 한다
```

---

### AC-007: priceType CHECK 제약 (마이그레이션 적용 후)

```gherkin
Scenario: 유효한 priceType 허용
  Given postprocess_cost 테이블에 CHECK 제약이 적용되어 있을 때
  When priceType='per_unit'으로 INSERT하면
  Then INSERT가 성공해야 한다

  When priceType='per_sqm'으로 INSERT하면
  Then INSERT가 성공해야 한다

  When priceType='fixed'로 INSERT하면
  Then INSERT가 성공해야 한다

Scenario: 잘못된 priceType 거부
  Given postprocess_cost 테이블에 CHECK 제약이 적용되어 있을 때
  When priceType='percentage'로 INSERT 시도하면
  Then CHECK 제약 위반 에러가 발생해야 한다
```

---

### AC-008: 수량 범위 유효성 (qtyMin <= qtyMax)

```gherkin
Scenario: 유효한 수량 범위
  Given print_cost_base 테이블이 존재할 때
  When qtyMin=100, qtyMax=499로 INSERT하면
  Then INSERT가 성공해야 한다

Scenario: 잘못된 수량 범위 거부 (CHECK 적용 후)
  Given print_cost_base 테이블에 qtyMin <= qtyMax CHECK 제약이 적용되어 있을 때
  When qtyMin=500, qtyMax=100으로 INSERT 시도하면
  Then CHECK 제약 위반 에러가 발생해야 한다

Scenario: 동일 수량 범위 허용 (단일 수량)
  Given print_cost_base 테이블이 존재할 때
  When qtyMin=100, qtyMax=100으로 INSERT하면
  Then INSERT가 성공해야 한다 (단일 수량 100매 전용 가격)
```

---

### AC-009: 가격 모드별 필드 사용 (HARD RULE)

```gherkin
Scenario: LOOKUP 모드에서 AREA 필드 미사용
  Given product_price_configs에 priceMode='LOOKUP'인 설정이 존재할 때
  Then unitPriceSqm은 NULL이어야 한다
  And minAreaSqm은 기본값(0.1)이어야 한다
  And 실제 가격 계산은 print_cost_base에서 수행되어야 한다

Scenario: AREA 모드에서 필수 필드 존재
  Given product_price_configs에 priceMode='AREA'인 설정을 생성할 때
  Then unitPriceSqm이 NOT NULL이어야 한다 (애플리케이션 레벨 검증)
  And minAreaSqm이 0보다 커야 한다
```

---

### AC-010: LOOKUP 복합 인덱스 성능

```gherkin
Scenario: LOOKUP 조회 시 복합 인덱스 사용
  Given print_cost_base에 2,000행이 존재할 때
  When EXPLAIN ANALYZE로 LOOKUP 쿼리를 실행하면
  Then idx_pcb_lookup 복합 인덱스를 사용해야 한다
  And 인덱스 스캔으로 결과를 반환해야 한다
```

---

## Quality Gate Criteria

- [ ] 4개 테이블 모두 스키마에 정의되어 있는가
- [ ] product_price_configs.productId UNIQUE가 적용되어 있는가
- [ ] LOOKUP 복합 인덱스가 올바르게 정의되어 있는가
- [ ] nullable FK (productId=NULL) 전역 규칙이 올바르게 동작하는가
- [ ] 가격 모드별 산출 로직이 TypeScript 인터페이스로 문서화되어 있는가

## Definition of Done

1. 모든 Acceptance Criteria 시나리오가 검증 가능한 상태
2. HARD RULE (전역 vs 상품별 오버라이드)이 가격 엔진에서 구현됨
3. 4가지 가격 모드의 산출 로직이 정확하게 문서화됨
4. CHECK 제약이 마이그레이션 SQL로 추가 가능한 상태
5. 인덱스 전략이 LOOKUP 쿼리 패턴에 최적화됨
