---
id: SPEC-DB-004
phase: acceptance
version: 1.0.0
---

## Acceptance Criteria -- SPEC-DB-004: Widget DB 운영 & 주문 스키마

---

### AC-001: simulation_runs CASCADE 삭제

```gherkin
Scenario: 상품 삭제 시 시뮬레이션 CASCADE
  Given wb_products에 id=1인 상품이 존재하고
  And simulation_runs에 productId=1인 실행 2개가 존재하고
  And simulation_cases에 해당 실행들의 케이스 50개가 존재할 때
  When wb_products에서 id=1을 DELETE하면
  Then simulation_runs에서 productId=1인 모든 실행이 삭제되어야 한다
  And simulation_cases에서 해당 실행의 모든 케이스가 삭제되어야 한다
```

---

### AC-002: simulation_runs 상태 머신

```gherkin
Scenario: 시뮬레이션 완료 상태 전이
  Given simulation_runs에 status='running'인 실행이 존재할 때
  When 모든 케이스 처리가 완료되면
  Then status='completed'로 UPDATE되어야 한다
  And completedAt이 현재 시각으로 설정되어야 한다

Scenario: 시뮬레이션 실패 상태 전이
  Given simulation_runs에 status='running'인 실행이 존재할 때
  When 처리 중 오류가 발생하면
  Then status='failed'로 UPDATE되어야 한다

Scenario: 시뮬레이션 취소
  Given simulation_runs에 status='running'인 실행이 존재할 때
  When 사용자가 시뮬레이션을 취소하면
  Then status='cancelled'로 UPDATE되어야 한다

Scenario: 잘못된 상태 값 거부 (CHECK 적용 후)
  Given simulation_runs 테이블에 CHECK 제약이 적용되어 있을 때
  When status='invalid_status'로 UPDATE 시도하면
  Then CHECK 제약 위반 에러가 발생해야 한다
```

---

### AC-003: simulation_cases 결과 기록

```gherkin
Scenario: 통과 케이스 기록
  Given simulation_runs에 id=1인 실행이 존재할 때
  When selections='{"SIZE":"90x50mm","PAPER":"아트지200g"}', resultStatus='pass', totalPrice=35000.00으로 INSERT하면
  Then INSERT가 성공해야 한다
  And selections가 유효한 JSONB로 저장되어야 한다

Scenario: 에러 케이스 기록
  Given simulation_runs에 id=1인 실행이 존재할 때
  When resultStatus='error', constraintViolations 포함으로 INSERT하면
  Then INSERT가 성공해야 한다
  And constraintViolations에 위반 규칙 정보가 저장되어야 한다

Scenario: 잘못된 resultStatus 거부 (CHECK 적용 후)
  Given simulation_cases 테이블에 CHECK 제약이 적용되어 있을 때
  When resultStatus='unknown'으로 INSERT 시도하면
  Then CHECK 제약 위반 에러가 발생해야 한다
```

---

### AC-004: publish_history 불변 스냅샷 (HARD RULE)

```gherkin
Scenario: 퍼블리시 이력 생성
  Given wb_products에 id=1인 상품이 존재할 때
  When publish_history에 다음을 INSERT하면:
    | productId | action  | completeness                                                           |
    | 1         | publish | {"completedCount":4,"totalCount":4,"publishable":true,"items":[...]}   |
  Then INSERT가 성공해야 한다
  And completeness가 유효한 JSONB로 저장되어야 한다

Scenario: 기존 퍼블리시 이력 UPDATE 금지
  Given publish_history에 id=1인 이력이 존재할 때
  When completeness를 다른 값으로 UPDATE 시도하면
  Then 애플리케이션 레벨에서 거부되어야 한다
  And 기존 completeness 값은 변경되지 않아야 한다

Scenario: 시뮬레이션 없이 퍼블리시 가능
  Given publish_history 테이블이 존재할 때
  When simulationRunId=NULL로 INSERT하면
  Then INSERT가 성공해야 한다 (시뮬레이션 없는 퍼블리시 허용)
```

---

### AC-005: orders 주문 생명주기 상태 머신 (HARD RULE)

```gherkin
Scenario: 정상 주문 생명주기
  Given orders에 status='created'인 주문이 존재할 때
  When status를 순차적으로 전이하면:
    created -> paid -> in_production -> shipped -> completed
  Then 모든 전이가 성공해야 한다

Scenario: 주문 취소 (결제 전)
  Given orders에 status='created'인 주문이 존재할 때
  When status='cancelled'로 UPDATE하면
  Then UPDATE가 성공해야 한다

Scenario: 주문 취소 (결제 후)
  Given orders에 status='paid'인 주문이 존재할 때
  When status='cancelled'로 UPDATE하면
  Then UPDATE가 성공해야 한다

Scenario: 잘못된 상태 전이 거부
  Given orders에 status='completed'인 주문이 존재할 때
  When status='created'로 UPDATE 시도하면
  Then 애플리케이션 레벨에서 거부되어야 한다
  And status는 'completed'로 유지되어야 한다

Scenario: 잘못된 상태 값 거부 (CHECK 적용 후)
  Given orders 테이블에 CHECK 제약이 적용되어 있을 때
  When status='invalid'로 UPDATE 시도하면
  Then CHECK 제약 위반 에러가 발생해야 한다
```

---

### AC-006: orders MES 동기화 상태 머신 (HARD RULE)

```gherkin
Scenario: MES 연동 정상 흐름
  Given orders에 mesStatus='pending'인 주문이 존재하고
  And 해당 상품에 mesItemCd가 설정되어 있을 때
  When MES 디스패치를 수행하면
  Then mesStatus='sent'로 UPDATE되어야 한다
  And MES 확인 후 mesStatus='confirmed'로 UPDATE되어야 한다

Scenario: MES 연동 실패
  Given orders에 mesStatus='sent'인 주문이 존재할 때
  When MES에서 거부 응답을 받으면
  Then mesStatus='failed'로 UPDATE되어야 한다

Scenario: MES 미연동 상품 주문
  Given orders에 주문을 생성할 때
  And 해당 상품의 mesItemCd가 NULL일 때
  Then mesStatus='not_linked'로 설정되어야 한다

Scenario: 두 상태 머신 독립 동작
  Given orders에 status='paid', mesStatus='pending'인 주문이 존재할 때
  When mesStatus='sent'로 UPDATE하면
  Then mesStatus만 변경되어야 한다
  And status는 'paid'로 유지되어야 한다
```

---

### AC-007: orders 불변 스냅샷 (HARD RULE)

```gherkin
Scenario: selections 불변성
  Given orders에 selections='{"SIZE":"90x50mm","PAPER":"아트지200g"}'인 주문이 존재할 때
  When 해당 상품의 SIZE 옵션이 변경되어도
  Then 기존 주문의 selections는 원래 값을 유지해야 한다

Scenario: priceBreakdown 불변성
  Given orders에 priceBreakdown이 기록된 주문이 존재할 때
  When 해당 상품의 가격표가 변경되어도
  Then 기존 주문의 priceBreakdown은 원래 값을 유지해야 한다

Scenario: recipeVersion 스냅샷
  Given orders에 recipeVersion=1인 주문이 존재할 때
  When 해당 상품의 레시피가 version=2로 업데이트되어도
  Then 기존 주문의 recipeVersion은 1로 유지되어야 한다
```

---

### AC-008: orders.orderCode UNIQUE

```gherkin
Scenario: 주문 코드 유일성
  Given orders에 orderCode='ORD-2026-001'인 주문이 존재할 때
  When orderCode='ORD-2026-001'인 새 주문을 INSERT 시도하면
  Then UNIQUE 제약 위반 에러가 발생해야 한다

Scenario: 주문 코드 필수
  Given orders 테이블이 존재할 때
  When orderCode=NULL인 주문을 INSERT 시도하면
  Then NOT NULL 제약 위반 에러가 발생해야 한다
```

---

### AC-009: quote_logs 견적 로그

```gherkin
Scenario: 클라이언트 견적 로그 기록
  Given wb_products에 id=1인 상품이 존재할 때
  When quote_logs에 다음을 INSERT하면:
    | productId | selections                     | quoteResult                    | source | responseMs |
    | 1         | {"SIZE":"90x50mm"}             | {"success":true,"totalPrice":35000} | client | 45     |
  Then INSERT가 성공해야 한다
  And 모든 JSONB 필드가 유효하게 저장되어야 한다

Scenario: 견적 소스 검증 (CHECK 적용 후)
  Given quote_logs 테이블에 CHECK 제약이 적용되어 있을 때
  When source='invalid_source'로 INSERT 시도하면
  Then CHECK 제약 위반 에러가 발생해야 한다
```

---

### AC-010: completeness JSONB 스키마 검증

```gherkin
Scenario: 완전한 completeness 데이터
  Given publish_history에 completeness를 저장할 때
  When completeness에 다음 구조를 포함하면:
    {
      "completedCount": 4,
      "totalCount": 4,
      "publishable": true,
      "items": [
        {"item": "options", "completed": true, "message": "옵션 설정 완료"},
        {"item": "pricing", "completed": true, "message": "가격 설정 완료"},
        {"item": "constraints", "completed": true, "message": "제약조건 설정 완료"},
        {"item": "mesMapping", "completed": true, "message": "MES 매핑 완료"}
      ]
    }
  Then INSERT가 성공해야 한다
  And totalCount가 항상 4여야 한다

Scenario: 불완전한 completeness (퍼블리시 불가)
  Given publish_history에 completeness를 저장할 때
  When completeness.publishable=false이고 completedCount < totalCount이면
  Then INSERT는 성공해야 한다 (unpublish 기록 가능)
  And 위젯 Admin에서 퍼블리시 버튼이 비활성화되어야 한다
```

---

## Quality Gate Criteria

- [ ] 5개 테이블 모두 스키마에 정의되어 있는가
- [ ] 두 개의 독립 상태 머신(status, mesStatus)이 올바르게 구분되어 있는가
- [ ] CASCADE 삭제가 simulation_runs -> simulation_cases에 설정되어 있는가
- [ ] 주문의 불변 스냅샷 필드(selections, priceBreakdown)가 보호되는가
- [ ] JSONB 스키마가 TypeScript 인터페이스로 문서화되어 있는가
- [ ] completeness JSONB의 totalCount가 항상 4인 규칙이 문서화되어 있는가

## Definition of Done

1. 모든 Acceptance Criteria 시나리오가 검증 가능한 상태
2. HARD RULE (불변 스냅샷, 상태 머신 전이)이 보호됨
3. 두 개의 상태 머신이 독립적으로 동작함을 검증
4. JSONB 스키마가 모든 필드를 포함하여 문서화됨
5. 데이터 증가 관리 정책이 정의됨 (시뮬레이션, 견적 로그)
