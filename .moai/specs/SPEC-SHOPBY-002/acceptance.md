# SPEC-SHOPBY-002 수용 기준: Shopby 상품 등록 및 옵션 연동

---

## 메타데이터

| 항목 | 값 |
|------|------|
| SPEC ID | SPEC-SHOPBY-002 |
| 검증 방법 | 단위 테스트, 통합 테스트, Sandbox 검증 |
| 품질 기준 | 테스트 커버리지 85% 이상, 5개 상품 정상 등록 |

---

## 수용 시나리오

### AC-001: 인쇄 상품 자동 등록 (R-PRD-001)

```gherkin
Feature: Widget Creator 인쇄 상품의 Shopby 자동 등록

  Scenario: 명함 상품 등록
    Given Widget Creator에 명함 상품 (PrintProduct)이 존재할 때
    And 해당 상품에 규격 3종, 용지 5종, 수량 4종의 옵션이 설정되어 있을 때
    When 관리자가 Shopby 상품 등록을 요청하면
    Then Shopby Admin API를 통해 mallProduct가 생성된다
    And 상품명, 판매가, 카테고리, 상세 HTML이 정확히 변환된다
    And Shopby productNo가 WC productId와 매핑되어 DB에 저장된다

  Scenario: 스티커 상품 등록
    Given Widget Creator에 스티커 상품이 존재할 때
    When Shopby 상품 등록을 요청하면
    Then mallProduct가 정상 생성되고 스티커 카테고리에 배정된다

  Scenario: 전단 상품 등록
    Given Widget Creator에 전단 상품이 존재할 때
    When Shopby 상품 등록을 요청하면
    Then mallProduct가 정상 생성되고 전단/리플렛 카테고리에 배정된다

  Scenario: 책자 상품 등록
    Given Widget Creator에 책자 상품 (pjoin=1, 표지/내지 분리)이 존재할 때
    When Shopby 상품 등록을 요청하면
    Then mallProduct가 정상 생성된다
    And 표지/내지 분리 정보가 extraJson에 포함된다

  Scenario: 등록 실패 시 재시도
    Given Shopby Admin API가 일시적으로 500 에러를 반환할 때
    When 상품 등록을 시도하면
    Then 최대 3회까지 재시도한다
    And 재시도 간격은 지수 백오프를 적용한다
    And 3회 실패 시 에러 리포트에 기록된다
```

### AC-002: COMBINATION 옵션 매핑 (R-PRD-002)

```gherkin
Feature: 인쇄 옵션 체인 → Shopby COMBINATION 옵션 변환

  Scenario: 소규모 조합 상품의 전체 옵션 등록
    Given 옵션 조합 수가 60개 (규격 3 x 용지 4 x 수량 5)인 상품이 있을 때
    When COMBINATION 옵션으로 변환하면
    Then 60개 조합 모두 Shopby 옵션으로 등록된다
    And 각 조합에 올바른 addPrice가 설정된다

  Scenario: 대규모 조합 상품의 대표 옵션 등록
    Given 옵션 조합 수가 Shopby 한도를 초과하는 상품이 있을 때
    When COMBINATION 옵션으로 변환하면
    Then 인기 조합 상위 N개만 COMBINATION으로 등록된다
    And 나머지 조합은 위젯 전용으로 분류된다
    And 위젯 전용 조합 정보가 extraJson에 포함된다

  Scenario: 후가공/도수 옵션의 REQUIRED/STANDARD 매핑
    Given 양면인쇄, 도수, 후가공 옵션이 존재하는 상품일 때
    When 옵션을 변환하면
    Then 양면/단면은 REQUIRED 옵션으로 등록된다
    And 후가공(코팅, 오시 등)은 STANDARD 옵션으로 등록된다
```

### AC-003: extraJson 위젯 설정 (R-PRD-003)

```gherkin
Feature: Shopby extraJson을 통한 위젯 설정 저장

  Scenario: extraJson 스키마 정합성
    Given 위젯 설정 데이터가 생성되었을 때
    When extraJson에 저장하면
    Then widgetCreator.version 필드가 "1.0.0"이다
    And widgetCreator.productId가 유효한 UUID이다
    And widgetCreator.optionEngineConfig.priorityChain이 올바른 순서를 포함한다
    And widgetCreator.priceSource가 "widget"이다

  Scenario: extraJson 크기 검증
    Given extraJson 데이터가 생성되었을 때
    When JSON 직렬화된 크기를 확인하면
    Then 크기가 Shopby 허용 한도 이내이다
```

### AC-004: 구매자작성형 입력 옵션 (R-PRD-004)

```gherkin
Feature: 구매자작성형 입력 옵션 설정

  Scenario: 필수 입력 항목 설정
    Given 인쇄 상품을 Shopby에 등록할 때
    When optionInputs를 확인하면
    Then "디자인 파일 URL" 항목이 필수(required=true)로 설정되어 있다
    And "인쇄 사양 JSON" 항목이 필수로 설정되어 있다

  Scenario: 선택 입력 항목 설정
    Given 인쇄 상품을 Shopby에 등록할 때
    When optionInputs를 확인하면
    Then "특수 요청사항" 항목이 선택(required=false)으로 설정되어 있다
    And "시안 확인 여부" 항목이 선택으로 설정되어 있다
```

### AC-005: 카테고리 체계 (R-PRD-005)

```gherkin
Feature: 인쇄 상품 카테고리 체계

  Scenario: 카테고리 체계 구성
    Given Shopby에 인쇄물 카테고리를 설정할 때
    When 카테고리 체계를 확인하면
    Then 1depth에 "인쇄물" 카테고리가 존재한다
    And 2depth에 "명함", "스티커/라벨", "전단/리플렛", "책자/카탈로그" 카테고리가 존재한다

  Scenario: 상품-카테고리 매핑
    Given 명함 상품을 등록할 때
    When 카테고리를 자동 매핑하면
    Then "인쇄물 > 명함" 카테고리에 배정된다
```

### AC-006: 이중 가격 전략 (R-PRD-006)

```gherkin
Feature: 옵션 조합별 고정가 및 위젯 동적 가격 전략

  Scenario: addPrice 정확성
    Given 규격 "90x50mm", 용지 "스노우화이트 250g", 수량 "100매" 조합이 있을 때
    And Widget Creator 가격 엔진이 해당 조합에 대해 15,000원을 반환할 때
    And 기본 판매가(salePrice)가 10,000원일 때
    When addPrice를 계산하면
    Then addPrice는 5,000원이다

  Scenario: 가격 불일치 경고
    Given 위젯에서 계산한 동적 가격이 Shopby 옵션 가격과 15% 차이가 날 때
    When 가격 검증을 실행하면
    Then 10% 초과 차이 경고가 발생한다
    And 가격 동기화 권고 메시지가 포함된다
```

---

## 완료 정의 (Definition of Done)

- [ ] 최소 5개 인쇄 상품(명함, 스티커, 전단, 책자, 봉투)이 Shopby에 정상 등록됨
- [ ] COMBINATION 옵션이 규격 x 용지 x 수량으로 정확히 매핑됨
- [ ] 각 조합의 addPrice가 가격 엔진 결과와 정합됨
- [ ] extraJson에 위젯 설정이 정상 저장됨
- [ ] optionInputs에 4개 입력 항목(파일 URL, 사양 JSON, 특수 요청, 시안 확인)이 설정됨
- [ ] 카테고리 체계(2depth 이상)가 구성됨
- [ ] Shopby productNo ↔ WC productId 매핑 테이블 동작 확인
- [ ] 단위 테스트 커버리지 85% 이상
- [ ] 등록 실패 재시도 및 에러 리포트 동작 확인

---

문서 버전: 1.0.0
