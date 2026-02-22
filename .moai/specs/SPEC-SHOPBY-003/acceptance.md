# SPEC-SHOPBY-003 수용 기준: 위젯 SDK 및 프론트엔드 임베딩

---

## 메타데이터

| 항목 | 값 |
|------|------|
| SPEC ID | SPEC-SHOPBY-003 |
| 검증 방법 | 단위 테스트, 통합 테스트, 브라우저 테스트, 성능 벤치마크 |
| 품질 기준 | 번들 50KB 미만, FMP 2초 미만, 3개 브라우저 호환 |

---

## 수용 시나리오

### AC-001: Aurora Skin 위젯 임베딩 (R-WDG-001)

```gherkin
Feature: Aurora Skin 상품 상세 페이지 위젯 임베딩

  Scenario: 위젯 자동 로드
    Given Shopby Aurora Skin의 인쇄 상품 상세 페이지를 방문했을 때
    And 해당 상품에 extraJson.widgetCreator 설정이 존재할 때
    When 페이지가 완전히 로드되면
    Then 위젯 컨테이너가 상품 상세 영역에 표시된다
    And 위젯에 옵션 선택 폼이 렌더링된다
    And 가격 표시 패널이 초기 가격과 함께 표시된다

  Scenario: 위젯 수동 초기화
    Given Aurora Skin에 위젯 스크립트가 로드되었을 때
    When window.WidgetCreator.init()을 호출하면
    Then 지정된 컨테이너에 위젯이 마운트된다
    And Shadow DOM으로 스타일이 격리된다

  Scenario: 비인쇄 상품 페이지
    Given Shopby의 일반 상품(extraJson.widgetCreator 미설정) 상세 페이지를 방문했을 때
    When 페이지가 로드되면
    Then 위젯이 렌더링되지 않는다
    And 기존 Shopby 상품 상세 UI가 정상 표시된다

  Scenario: 위젯 로드 실패 시 폴백
    Given Widget Creator API 서버가 응답하지 않을 때
    When 위젯 초기화를 시도하면
    Then 에러 메시지가 위젯 영역에 표시된다
    And Shopby 기본 옵션 선택 UI가 폴백으로 사용 가능하다
```

### AC-002: 장바구니/주문서 연동 (R-WDG-002)

```gherkin
Feature: 위젯에서 Shopby 장바구니/주문서 연동

  Scenario: 장바구니 담기
    Given 위젯에서 명함 옵션을 선택했을 때 (규격: 90x50, 용지: 스노우화이트, 수량: 200매)
    When "장바구니 담기" 버튼을 클릭하면
    Then Shopby POST /cart API가 호출된다
    And 요청에 productNo, optionNo, orderCnt가 포함된다
    And optionInputs에 인쇄 사양 JSON이 포함된다
    And 장바구니 담기 성공 토스트 메시지가 표시된다

  Scenario: 즉시구매 (장바구니 우회)
    Given 위젯에서 옵션 선택이 완료되었을 때
    When "바로 구매" 버튼을 클릭하면
    Then Shopby POST /order-sheets API가 직접 호출된다
    And 주문서 생성 후 결제 페이지로 이동한다

  Scenario: 비로그인 상태에서 장바구니 담기
    Given 고객이 Shopby에 로그인하지 않은 상태일 때
    When "장바구니 담기" 버튼을 클릭하면
    Then 로그인 필요 안내 메시지가 표시된다
    And 로그인 페이지로 이동하는 링크가 제공된다
```

### AC-003: Shopby 세션/인증 연동 (R-WDG-003)

```gherkin
Feature: Shopby 인증과 위젯 사용자 연동

  Scenario: 회원 가격 반영
    Given 골드 등급 회원이 로그인한 상태일 때
    When 위젯이 초기화되면
    Then 회원 등급별 할인 가격이 위젯에 반영된다
    And 무료배송 조건이 회원 등급에 맞게 표시된다

  Scenario: 토큰 만료 시 갱신
    Given 위젯 사용 중 Shopby Access Token이 만료되었을 때
    When 옵션 선택 또는 장바구니 API 호출 시
    Then 토큰 갱신이 자동으로 시도된다
    And 갱신 성공 시 원래 요청이 재시도된다
    And 갱신 실패 시 재로그인 안내가 표시된다
```

### AC-004: 가격 동기화 (R-WDG-004)

```gherkin
Feature: 위젯 가격과 Shopby 옵션 가격 동기화

  Scenario: 실시간 가격 계산
    Given 위젯에서 규격을 "A4"로 변경했을 때
    When 가격 패널을 확인하면
    Then 기본가, 옵션가, 후가공가, 배송비가 실시간으로 업데이트된다
    And 합계 가격이 모든 항목의 합산과 일치한다

  Scenario: 수량 변경 시 단가 변화
    Given 위젯에서 수량을 100매에서 500매로 변경했을 때
    When 가격 패널을 확인하면
    Then 단가가 감소하여 수량별 비선형 가격이 반영된다
    And "수량이 많을수록 단가가 저렴합니다" 안내가 표시된다

  Scenario: 가격 불일치 감지
    Given 위젯 가격과 Shopby 옵션 가격의 차이가 12%일 때
    When 가격 검증이 실행되면
    Then 사용자에게 "가격 확인 중" 안내가 표시된다
    And 관리자에게 가격 불일치 알림이 전송된다
```

### AC-005: 반응형 디자인 (R-WDG-005)

```gherkin
Feature: 반응형 위젯 레이아웃

  Scenario: 모바일 뷰 (375px 너비)
    Given 뷰포트 너비가 375px인 모바일 환경일 때
    When 위젯을 렌더링하면
    Then 세로 스크롤 기반의 단일 컬럼 레이아웃이 표시된다
    And 옵션 선택이 드롭다운 또는 바텀시트로 제공된다
    And 가격 요약이 하단 고정 영역에 표시된다

  Scenario: 태블릿 뷰 (768px 너비)
    Given 뷰포트 너비가 768px인 태블릿 환경일 때
    When 위젯을 렌더링하면
    Then 2컬럼 레이아웃 (옵션 선택 + 가격 요약)이 표시된다

  Scenario: 데스크톱 뷰 (1280px 너비)
    Given 뷰포트 너비가 1280px인 데스크톱 환경일 때
    When 위젯을 렌더링하면
    Then 3컬럼 레이아웃 (옵션 | 미리보기 | 가격 요약)이 표시된다
```

### AC-006: 번들 크기 제한 (R-WDG-006)

```gherkin
Feature: 위젯 번들 크기 제한

  Scenario: gzip 번들 크기 검증
    Given 위젯 프로덕션 빌드가 완료되었을 때
    When gzip 압축된 번들 크기를 측정하면
    Then 크기가 50KB 미만이다

  Scenario: 번들 분석
    Given 위젯 빌드가 완료되었을 때
    When 번들 분석기(rollup-plugin-visualizer)를 실행하면
    Then 각 모듈별 크기가 표시된다
    And 50KB 이상의 단일 모듈이 존재하지 않는다

  Scenario: 초기 로딩 시간
    Given 3G 네트워크 시뮬레이션 환경에서
    When 위젯이 포함된 상품 페이지를 로드하면
    Then 위젯의 첫 의미 있는 페인트(FMP)가 2초 이내이다
```

---

## 완료 정의 (Definition of Done)

- [ ] Aurora Skin 상품 상세 페이지에서 위젯이 정상 렌더링됨
- [ ] Shadow DOM으로 스타일이 격리되어 호스트 페이지와 충돌 없음
- [ ] 옵션 선택 시 하위 옵션이 동적으로 업데이트됨
- [ ] 가격이 실시간으로 재계산되어 표시됨
- [ ] 장바구니 담기 / 즉시구매가 Shopby API를 통해 정상 동작
- [ ] optionInputs에 인쇄 사양 데이터가 정확히 포함됨
- [ ] 모바일/태블릿/데스크톱 3가지 반응형 레이아웃 정상 동작
- [ ] gzip 번들 크기 50KB 미만
- [ ] FMP 2초 미만
- [ ] Chrome, Safari, Samsung Internet 3개 브라우저 정상 동작
- [ ] 테스트 커버리지 85% 이상

---

문서 버전: 1.0.0
