---
id: SPEC-DB-001
phase: acceptance
version: 1.0.0
---

## Acceptance Criteria -- SPEC-DB-001: Widget DB 상품 도메인 핵심 스키마

---

### AC-001: option_element_types UNIQUE 제약

```gherkin
Scenario: typeKey 유일성 보장
  Given option_element_types 테이블에 typeKey='SIZE'인 레코드가 존재할 때
  When typeKey='SIZE'인 새 레코드를 INSERT 시도하면
  Then UNIQUE 제약 위반 에러가 발생해야 한다
  And 기존 레코드는 영향을 받지 않아야 한다
```

---

### AC-002: option_element_choices FK CASCADE 삭제

```gherkin
Scenario: 옵션 유형 삭제 시 선택지 CASCADE 삭제
  Given option_element_types에 id=1 (typeKey='SIZE') 레코드가 존재하고
  And option_element_choices에 typeId=1인 선택지 5개가 존재할 때
  When option_element_types에서 id=1 레코드를 DELETE하면
  Then option_element_choices에서 typeId=1인 모든 레코드가 함께 삭제되어야 한다
  And 다른 typeId의 선택지는 영향을 받지 않아야 한다
```

---

### AC-003: option_element_choices 복합 UNIQUE 제약

```gherkin
Scenario: 동일 유형 내 choiceKey 유일성 보장
  Given option_element_choices에 (typeId=1, choiceKey='90x50mm') 레코드가 존재할 때
  When (typeId=1, choiceKey='90x50mm')인 새 레코드를 INSERT 시도하면
  Then UNIQUE 제약 위반 에러가 발생해야 한다

Scenario: 다른 유형에서는 동일 choiceKey 허용
  Given option_element_choices에 (typeId=1, choiceKey='standard') 레코드가 존재할 때
  When (typeId=2, choiceKey='standard')인 새 레코드를 INSERT 시도하면
  Then INSERT가 성공해야 한다
```

---

### AC-004: wb_products edicusCode 불변성 (HARD RULE)

```gherkin
Scenario: edicusCode 최초 설정 허용
  Given wb_products에 edicusCode=NULL인 상품이 존재할 때
  When edicusCode='EC001'로 UPDATE하면
  Then UPDATE가 성공해야 한다
  And edicusCode='EC001'로 저장되어야 한다

Scenario: edicusCode 변경 차단 (트리거 적용 후)
  Given wb_products에 edicusCode='EC001'인 상품이 존재할 때
  When edicusCode='EC002'로 UPDATE 시도하면
  Then DB 트리거에 의해 에러가 발생해야 한다
  And edicusCode는 'EC001'로 유지되어야 한다

Scenario: edicusCode NULL 유지 허용
  Given wb_products에 edicusCode=NULL인 상품이 존재할 때
  When 다른 필드만 UPDATE하면
  Then UPDATE가 성공해야 한다
  And edicusCode는 NULL로 유지되어야 한다
```

---

### AC-005: product_categories 11개 표준 카테고리 (HARD RULE)

```gherkin
Scenario: 시드 데이터 후 정확히 11개 카테고리 존재
  Given product_categories 테이블이 비어있을 때
  When 시드 스크립트를 실행하면
  Then 정확히 11개의 활성 카테고리가 존재해야 한다
  And 모든 카테고리의 categoryKey가 UNIQUE해야 한다
  And 모든 카테고리의 categoryNameKo가 NOT NULL이어야 한다
```

---

### AC-006: wb_products 외부 코드 nullable UNIQUE

```gherkin
Scenario: 외부 코드 없이 상품 등록 가능
  Given wb_products 테이블이 존재할 때
  When mesItemCd=NULL, edicusCode=NULL, shopbyProductNo=NULL인 상품을 INSERT하면
  Then INSERT가 성공해야 한다

Scenario: 다수의 NULL 외부 코드 허용
  Given wb_products에 mesItemCd=NULL인 상품이 2개 존재할 때
  When mesItemCd=NULL인 새 상품을 INSERT하면
  Then INSERT가 성공해야 한다 (PostgreSQL nullable UNIQUE는 다수 NULL 허용)

Scenario: 동일한 외부 코드 중복 차단
  Given wb_products에 mesItemCd='MES001'인 상품이 존재할 때
  When mesItemCd='MES001'인 새 상품을 INSERT 시도하면
  Then UNIQUE 제약 위반 에러가 발생해야 한다
```

---

### AC-007: wb_products isVisible vs isActive 구분 (HARD RULE)

```gherkin
Scenario: isActive=false는 내부 비활성화
  Given wb_products에 isActive=false, isVisible=true인 상품이 존재할 때
  When 활성 상품 목록을 조회하면 (WHERE isActive=true)
  Then 해당 상품은 결과에 포함되지 않아야 한다

Scenario: isVisible=false는 고객 비노출
  Given wb_products에 isActive=true, isVisible=false인 상품이 존재할 때
  When 고객용 상품 목록을 조회하면 (WHERE isVisible=true AND isActive=true)
  Then 해당 상품은 결과에 포함되지 않아야 한다
  And 어드민 상품 목록에서는 조회 가능해야 한다
```

---

### AC-008: Sparse Column Design 검증

```gherkin
Scenario: SIZE 타입 선택지의 전용 컬럼 사용
  Given option_element_types에 typeKey='SIZE' (id=1)가 존재할 때
  When typeId=1로 widthMm=90.00, heightMm=50.00, bleedMm=2.00인 선택지를 INSERT하면
  Then INSERT가 성공해야 한다
  And widthMm, heightMm, bleedMm이 정확한 decimal 값으로 저장되어야 한다

Scenario: 비 SIZE 타입의 metadata jsonb 사용
  Given option_element_types에 typeKey='CUSTOM_OPT' (id=10)가 존재할 때
  When typeId=10로 metadata='{"custom_field": "value"}'인 선택지를 INSERT하면
  Then INSERT가 성공해야 한다
  And widthMm, heightMm, bleedMm은 NULL이어야 한다
  And metadata가 유효한 JSONB로 저장되어야 한다
```

---

### AC-009: Partial Index 성능 검증

```gherkin
Scenario: 활성 레코드 조회 시 Partial Index 사용
  Given option_element_types에 활성 5개, 비활성 3개 레코드가 존재할 때
  When EXPLAIN ANALYZE로 'SELECT * FROM option_element_types WHERE is_active = true' 실행하면
  Then idx_oet_active Partial Index를 사용해야 한다

Scenario: MES 코드 검색 시 Partial Index 사용
  Given option_element_choices에 mesCode가 있는 레코드 10개, NULL인 레코드 50개가 존재할 때
  When mesCode='MES-001'로 검색하면
  Then idx_oec_mes_code Partial Index를 사용해야 한다
```

---

### AC-010: productKey 내부 전용 규칙 (HARD RULE)

```gherkin
Scenario: productKey 필수 입력
  Given wb_products 테이블이 존재할 때
  When productKey=NULL인 상품을 INSERT 시도하면
  Then NOT NULL 제약 위반 에러가 발생해야 한다

Scenario: productKey UNIQUE 보장
  Given wb_products에 productKey='BCARD-001'인 상품이 존재할 때
  When productKey='BCARD-001'인 새 상품을 INSERT 시도하면
  Then UNIQUE 제약 위반 에러가 발생해야 한다
```

---

## Quality Gate Criteria

- [ ] 모든 테이블 4개가 스키마에 정의되어 있는가
- [ ] UNIQUE 제약이 모든 비즈니스 키에 적용되어 있는가
- [ ] FK CASCADE가 option_element_choices.typeId에 설정되어 있는가
- [ ] Partial Index가 isActive 컬럼에 적용되어 있는가
- [ ] nullable UNIQUE가 외부 코드 컬럼에 올바르게 적용되어 있는가
- [ ] Sparse Column Design이 문서와 일치하는가

## Definition of Done

1. 모든 Acceptance Criteria 시나리오가 검증 가능한 상태
2. HARD RULE이 DB 레벨 또는 애플리케이션 레벨에서 보호됨
3. 인덱스 전략이 실제 쿼리 패턴과 일치함
4. JSONB 스키마가 TypeScript 인터페이스로 문서화됨
