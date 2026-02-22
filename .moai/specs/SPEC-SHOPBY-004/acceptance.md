# SPEC-SHOPBY-004 수용 기준: 주문 생성 및 결제 연동

---

## 메타데이터

| 항목 | 값 |
|------|------|
| SPEC ID | SPEC-SHOPBY-004 |
| 검증 방법 | 단위 테스트, 통합 테스트, Sandbox PG 결제 테스트 |
| 품질 기준 | 테스트 커버리지 85% 이상, E2E 주문 플로우 검증 |

---

## 수용 시나리오

### AC-001: 주문서 생성 (R-ORD-001)

```gherkin
Feature: 위젯에서 Shopby 주문서 생성

  Scenario: 즉시구매 주문서 생성
    Given 위젯에서 명함 옵션 (규격: 90x50, 용지: 스노우화이트, 수량: 200매)을 선택했을 때
    When "바로 구매" 버튼을 클릭하면
    Then POST /order-sheets API가 즉시구매 모드로 호출된다
    And 응답에서 orderSheetNo가 반환된다
    And 주문서 페이지로 이동한다

  Scenario: 장바구니 기반 주문서 생성
    Given 장바구니에 인쇄 상품 2건이 담겨있을 때
    When "주문하기" 버튼을 클릭하면
    Then 선택된 장바구니 아이템 기반으로 주문서가 생성된다
    And 각 아이템의 optionInputs가 보존된다
```

### AC-002: 인쇄 사양 데이터 첨부 (R-ORD-002)

```gherkin
Feature: optionInputs를 통한 인쇄 사양 데이터 첨부

  Scenario: 인쇄 사양 데이터 완전성
    Given 위젯에서 옵션 선택이 완료되고 파일이 업로드되었을 때
    When 주문서를 생성하면
    Then optionInputs에 다음 데이터가 포함된다:
      | 필드 | 값 |
      | designFileUrl | 유효한 파일 URL |
      | printSpec | 전체 인쇄 사양 JSON |
      | widgetPrice | 가격 내역 (기본가, 옵션가, 후가공가, 배송비, 합계) |
    And printSpec에 productId, size, paper, color, quantity, postProcess가 포함된다

  Scenario: 특수 요청사항 첨부
    Given 고객이 "로고 색상 PANTONE 485C로 맞춰주세요" 특수 요청을 입력했을 때
    When 주문서를 생성하면
    Then optionInputs.specialRequest에 해당 텍스트가 포함된다

  Scenario: 시안 확인 요청
    Given 고객이 "시안 확인 후 제작" 옵션을 선택했을 때
    When 주문서를 생성하면
    Then optionInputs.proofRequired가 true이다
```

### AC-003: 주문 금액 계산 및 검증 (R-ORD-003)

```gherkin
Feature: 주문 금액 계산 및 위젯 가격 검증

  Scenario: 금액 정상 일치
    Given 위젯 계산 가격이 20,000원이고 Shopby 계산 가격이 20,000원일 때
    When 가격 검증을 실행하면
    Then validation.isValid가 true이다
    And validation.action이 "PROCEED"이다

  Scenario: 반올림 차이 (100원 이내)
    Given 위젯 계산 가격이 20,050원이고 Shopby 계산 가격이 20,000원일 때
    When 가격 검증을 실행하면
    Then validation.isValid가 true이다
    And validation.action이 "PROCEED"이다

  Scenario: 경고 범위 (100~1,000원)
    Given 위젯 계산 가격이 20,500원이고 Shopby 계산 가격이 20,000원일 때
    When 가격 검증을 실행하면
    Then validation.action이 "WARN"이다
    And 관리자에게 가격 불일치 알림이 발송된다

  Scenario: 차단 범위 (1,000원 초과)
    Given 위젯 계산 가격이 22,000원이고 Shopby 계산 가격이 20,000원일 때
    When 가격 검증을 실행하면
    Then validation.action이 "BLOCK"이다
    And 주문이 진행되지 않는다
    And 고객에게 "가격 확인이 필요합니다" 메시지가 표시된다
```

### AC-004: 결제 예약 및 PG 연동 (R-ORD-004)

```gherkin
Feature: PG 결제 연동

  Scenario: 신용카드 결제
    Given 주문 금액 계산이 완료되었을 때
    When 신용카드 결제를 선택하고 결제를 진행하면
    Then POST /payments/reserve가 호출된다
    And PG 결제 SDK가 초기화된다
    And 결제 완료 후 POST /payments/confirm이 호출된다
    And 주문 상태가 "결제완료"로 변경된다

  Scenario: 간편결제 (카카오페이)
    Given 주문 금액 계산이 완료되었을 때
    When 카카오페이 결제를 선택하면
    Then 카카오페이 결제 페이지로 이동된다
    And 결제 승인 후 Shopby로 리다이렉트된다

  Scenario: 결제 실패
    Given PG 결제 과정에서 카드 잔액 부족으로 실패했을 때
    When 결제 결과가 반환되면
    Then "결제에 실패했습니다" 에러 메시지가 표시된다
    And "다른 결제 수단을 선택하세요" 안내가 제공된다
    And 주문서가 유지되어 재결제가 가능하다
```

### AC-005: 즉시구매 플로우 (R-ORD-005)

```gherkin
Feature: 장바구니 우회 즉시구매

  Scenario: 위젯에서 직접 결제 진행
    Given 위젯에서 옵션 선택과 파일 업로드가 완료되었을 때
    When "바로 구매"를 클릭하면
    Then 장바구니를 거치지 않고 주문서가 직접 생성된다
    And 배송지 입력 → 결제 → 완료 순서로 진행된다
    And 전체 프로세스가 5단계 이내에서 완료된다
```

### AC-006: 회원/비회원 주문 (R-ORD-006)

```gherkin
Feature: 회원 및 비회원 주문 지원

  Scenario: 회원 주문
    Given 골드 등급 회원이 로그인한 상태일 때
    When 주문서를 작성하면
    Then 기존 배송지 목록이 자동 로드된다
    And 회원 등급 할인이 적용된다
    And 적립금 사용이 가능하다

  Scenario: 비회원 주문
    Given 비로그인 상태의 고객이 주문을 진행할 때
    When 주문서 페이지에 도달하면
    Then 이름, 이메일, 전화번호 입력 폼이 표시된다
    And 모든 필수 정보 입력 후 결제 진행이 가능하다
    And 주문 완료 후 주문번호와 비회원 조회 안내가 제공된다
```

### AC-007: 가격 일치 검증 (R-ORD-007)

```gherkin
Feature: 주문 시 가격 일치 필수 검증

  Scenario: 가격 차이 1,000원 초과 시 주문 차단
    Given 위젯 가격이 25,000원이고 Shopby 가격이 20,000원일 때
    When 결제를 시도하면
    Then 결제가 차단된다
    And "가격 정보가 변경되었습니다. 옵션을 다시 확인해주세요" 메시지가 표시된다
    And 관리자에게 즉시 알림이 발송된다
```

---

## 완료 정의 (Definition of Done)

- [ ] 위젯에서 선택한 옵션으로 Shopby 주문서가 정상 생성됨
- [ ] optionInputs에 인쇄 사양, 파일 URL, 가격 정보가 정확히 포함됨
- [ ] 주문 금액 계산 후 위젯 가격과의 3단계 검증 동작 확인
- [ ] PG 결제 (신용카드, 간편결제) Sandbox 환경에서 정상 완료
- [ ] 즉시구매 플로우 (장바구니 우회) 정상 동작
- [ ] 회원/비회원 양쪽 주문 플로우 검증 완료
- [ ] 결제 실패 시 에러 처리 및 재결제 플로우 동작
- [ ] 테스트 커버리지 85% 이상

---

문서 버전: 1.0.0
