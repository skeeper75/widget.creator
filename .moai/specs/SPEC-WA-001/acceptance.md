# SPEC-WA-001: Acceptance Criteria

**SPEC:** SPEC-WA-001 Widget Admin Console -- 6-Step Admin UI
**Version:** 1.0.0
**Date:** 2026-02-26

---

## Step 1 -- 상품 마스터 대시보드

### AC-01: 통계 카드 표시 (FR-WA001-01)

```gherkin
Feature: 대시보드 통계 카드

  Scenario: 통계 카드 4종 표시
    Given 관리자가 위젯 관리 대시보드에 접속했을 때
    When 페이지가 로드 완료되면
    Then 전체 상품 수 카드가 표시된다
    And 활성 판매 수 카드가 표시된다
    And 임시저장 수 카드가 표시된다
    And 미완성 수 카드가 표시된다
    And 각 카드의 숫자는 실제 DB 데이터와 일치한다

  Scenario: 통계 카드 로딩 상태
    Given 관리자가 대시보드에 접속했을 때
    When tRPC 쿼리가 진행 중이면
    Then 통계 카드 영역에 Skeleton 로딩 UI가 표시된다
```

### AC-02: 카테고리 필터 (FR-WA001-02)

```gherkin
Feature: 카테고리 필터

  Scenario: 카테고리 선택 시 상품 필터링
    Given 상품 목록에 "명함", "전단지", "스티커" 카테고리 상품이 있을 때
    When 관리자가 카테고리 필터에서 "명함"을 선택하면
    Then 테이블에 "명함" 카테고리 상품만 표시된다
    And 다른 카테고리 상품은 표시되지 않는다

  Scenario: 카테고리 필터 초기화
    Given 카테고리 필터에 "명함"이 선택되어 있을 때
    When 관리자가 "전체" 옵션을 선택하면
    Then 모든 카테고리의 상품이 표시된다
```

### AC-03: 상태 필터 (FR-WA001-03)

```gherkin
Feature: 상태 필터

  Scenario: 상태별 필터링
    Given 상품 목록에 활성/임시저장/미완성 상태의 상품이 있을 때
    When 관리자가 상태 필터에서 "활성"을 선택하면
    Then 활성 상태의 상품만 표시된다

  Scenario: 카테고리 + 상태 복합 필터
    Given 카테고리 "명함"이 선택되어 있을 때
    When 관리자가 상태 필터에서 "미완성"을 선택하면
    Then "명함" 카테고리 AND "미완성" 상태 상품만 표시된다
```

### AC-04: 빠른 진입 버튼 (FR-WA001-04)

```gherkin
Feature: 빠른 진입 버튼

  Scenario: Step별 빠른 진입
    Given 상품 목록에 상품이 표시되어 있을 때
    When 관리자가 상품 행의 "옵션" 버튼을 클릭하면
    Then `/widget-admin/{productId}/options` 페이지로 이동한다

  Scenario: 모든 Step 진입 버튼 존재
    Given 상품 행이 표시될 때
    Then 옵션, 가격, 제약, 시뮬레이션, 발행 5개 진입 버튼이 모두 표시된다
```

---

## Step 2 -- 주문옵션 설정

### AC-05: 옵션 목록 표시 (FR-WA001-05)

```gherkin
Feature: 옵션 목록 표시

  Scenario: 상품 옵션 목록 로드
    Given 상품에 "사이즈", "인쇄", "용지", "코팅", "수량" 옵션이 등록되어 있을 때
    When 관리자가 `/widget-admin/{productId}/options` 페이지에 진입하면
    Then 5개 옵션이 displayOrder 순서로 표시된다
    And 각 옵션에 이름이 표시된다
    And 각 옵션에 필수/선택 Badge가 표시된다
    And 각 옵션에 옵션값 개수가 표시된다
    And 각 옵션에 연결된 제약조건 개수 Badge가 표시된다

  Scenario: 옵션이 없는 상품
    Given 상품에 등록된 옵션이 없을 때
    When 옵션 설정 페이지에 진입하면
    Then "등록된 옵션이 없습니다. 옵션을 추가해주세요." 안내 메시지가 표시된다
    And "옵션 추가" 버튼이 강조 표시된다
```

### AC-06: 옵션 드래그 정렬 (FR-WA001-06)

```gherkin
Feature: 옵션 드래그 정렬

  Scenario: 드래그로 옵션 순서 변경
    Given 옵션 목록에 "사이즈"(순서1), "인쇄"(순서2), "용지"(순서3)가 있을 때
    When 관리자가 "용지"를 "사이즈" 위로 드래그하면
    Then 순서가 "용지"(1), "사이즈"(2), "인쇄"(3)로 변경된다
    And `productOptions.reorder` tRPC mutation이 호출된다
    And DB의 displayOrder가 업데이트된다

  Scenario: 드래그 시 시각적 피드백
    Given 옵션 행을 드래그 중일 때
    Then 드래그 중인 행에 --primary-50 배경색 하이라이트가 표시된다
    And 드롭 가능 위치에 인디케이터가 표시된다
```

### AC-07: 옵션 값 편집 (FR-WA001-07)

```gherkin
Feature: 옵션 값 편집

  Scenario: 인라인 편집 패널 열기
    Given 옵션 목록에 "용지" 옵션이 있을 때
    When 관리자가 "용지" 옵션의 편집 버튼을 클릭하면
    Then 옵션 하단에 인라인 편집 패널이 확장된다
    And 현재 등록된 옵션값(아트지300g, 스노우지300g 등)이 표시된다

  Scenario: 옵션 값 추가
    Given 옵션 값 편집 패널이 열려 있을 때
    When 관리자가 "크라프트250g"을 입력하고 추가 버튼을 클릭하면
    Then "크라프트250g" 값이 목록에 추가된다
    And `productOptions.updateValues` tRPC mutation이 호출된다

  Scenario: 옵션 값 삭제
    Given 옵션값 "아트지300g"이 표시되어 있을 때
    When 관리자가 삭제(x) 버튼을 클릭하면
    Then 삭제 확인 Dialog가 표시된다
    And 확인 시 해당 옵션값이 제거된다

  Scenario: 옵션 값 순서 변경
    Given 옵션 값 편집 패널에 여러 값이 있을 때
    When 관리자가 값의 순서를 드래그로 변경하면
    Then 변경된 순서가 저장된다
```

### AC-08: 옵션 추가 (FR-WA001-08)

```gherkin
Feature: 옵션 추가 Dialog

  Scenario: 글로벌 옵션 정의에서 추가
    Given "옵션 추가" 버튼이 클릭되었을 때
    When Dialog가 열리면
    Then 글로벌 옵션 정의(optionDefinitions) 목록이 표시된다
    And 이미 해당 상품에 추가된 옵션은 비활성(disabled) 표시된다

  Scenario: 옵션 선택 및 추가
    Given 옵션 추가 Dialog에서 "코팅"을 선택했을 때
    When "추가" 버튼을 클릭하면
    Then "코팅" 옵션이 상품 옵션 목록 맨 아래에 추가된다
    And `productOptions.addToProduct` tRPC mutation이 호출된다
    And Dialog가 닫힌다
```

### AC-09: 제약조건 연결 표시 (FR-WA001-09)

```gherkin
Feature: 제약조건 Side Sheet

  Scenario: 제약조건 Badge 클릭
    Given "용지" 옵션에 [제약4] Badge가 표시되어 있을 때
    When 관리자가 Badge를 클릭하면
    Then 우측에 Side Sheet가 열린다
    And "용지 옵션 제약조건 (4개)" 제목이 표시된다
    And 4개의 IF-THEN 규칙이 카드 형태로 표시된다

  Scenario: Sheet에서 규칙 추가 버튼
    Given 제약조건 Sheet가 열려 있을 때
    When "규칙 추가" 버튼을 클릭하면
    Then Step 4 (제약조건 빌더) 페이지로 이동하며 해당 옵션이 사전 선택된다
```

---

## Step 3 -- 가격룰 & 계산식

> **구현 완료** (2026-02-26): tRPC sub-routers (`priceConfig`, `printCostBase`, `postprocessCost`, `qtyDiscount`) + `pricingTest` procedure + 8개 컴포넌트 구현. 100개 단위 테스트 통과.
>
> **구현 파일:**
> - `apps/admin/src/app/(dashboard)/widget-admin/[productId]/pricing/page.tsx`
> - `apps/admin/src/components/widget-admin/price-mode-selector.tsx`
> - `apps/admin/src/components/widget-admin/lookup-price-editor.tsx`
> - `apps/admin/src/components/widget-admin/area-price-editor.tsx`
> - `apps/admin/src/components/widget-admin/page-price-editor.tsx`
> - `apps/admin/src/components/widget-admin/composite-price-editor.tsx`
> - `apps/admin/src/components/widget-admin/postprocess-cost-editor.tsx`
> - `apps/admin/src/components/widget-admin/qty-discount-editor.tsx`
> - `apps/admin/src/components/widget-admin/price-test-panel.tsx`
> - `apps/admin/__tests__/widget-admin/pricing-procedures.test.ts` (100 tests)

### AC-10: 가격 계산 방식 선택 (FR-WA001-10)

```gherkin
Feature: 가격 계산 방식 선택

  Scenario: 현재 가격 방식 표시
    Given 상품의 가격 방식이 "LOOKUP"으로 설정되어 있을 때
    When 관리자가 가격 설정 페이지에 진입하면
    Then RadioGroup에서 "단가표형(LOOKUP)"이 선택된 상태로 표시된다

  Scenario: 가격 방식 변경
    Given 현재 "LOOKUP" 방식이 선택되어 있을 때
    When 관리자가 "면적형(AREA)"을 선택하면
    Then 경고 Dialog가 표시된다 ("가격 방식 변경 시 기존 단가 데이터가 영향받을 수 있습니다")
    And 확인 시 AREA 방식의 파라미터 편집 폼이 표시된다
    And `priceConfig.update` tRPC mutation이 호출된다
```

### AC-11: LOOKUP 단가표 편집 (FR-WA001-11)

```gherkin
Feature: LOOKUP 단가표 편집

  Scenario: 단가표 로드
    Given 가격 방식이 LOOKUP으로 설정되어 있을 때
    When 페이지 로드 시
    Then print_cost_base 테이블의 데이터가 편집 가능한 테이블로 표시된다
    And 판형, 인쇄방식, 수량구간, 단가 컬럼이 표시된다

  Scenario: 단가 수정
    Given 단가표에 "90x50 / 단면칼라 / 1~99 / 8,500원" 행이 있을 때
    When 관리자가 단가를 "9,000"으로 수정하고 저장하면
    Then `printCostBase.upsert` tRPC mutation이 호출된다
    And 수정된 단가가 반영된다

  Scenario: 단가 행 추가
    Given 단가표가 표시되어 있을 때
    When 관리자가 "행 추가" 버튼을 클릭하면
    Then 빈 행이 추가되어 판형, 인쇄방식, 수량구간, 단가를 입력할 수 있다
```

### AC-12: 면적형/페이지형/복합형 파라미터 편집 (FR-WA001-12)

```gherkin
Feature: 비-LOOKUP 가격 파라미터 편집

  Scenario: AREA 방식 파라미터 편집
    Given 가격 방식이 AREA으로 설정되어 있을 때
    When 파라미터 편집 폼이 표시되면
    Then 단가/sqm 입력 필드가 표시된다
    And 기본 비용 입력 필드가 표시된다
    And 저장 시 `priceConfig.update` tRPC mutation이 호출된다

  Scenario: PAGE 방식 파라미터 편집
    Given 가격 방식이 PAGE으로 설정되어 있을 때
    When 파라미터 편집 폼이 표시되면
    Then 판걸이수, 페이지당 단가 입력 필드가 표시된다

  Scenario: COMPOSITE 방식 파라미터 편집
    Given 가격 방식이 COMPOSITE으로 설정되어 있을 때
    When 파라미터 편집 폼이 표시되면
    Then 기본비용, 항목별 가산 단가 등 복합 파라미터 폼이 표시된다
```

### AC-13: 후가공비 테이블 관리 (FR-WA001-13)

```gherkin
Feature: 후가공비 관리

  Scenario: 후가공비 목록 표시
    Given 후가공비 테이블에 데이터가 있을 때
    When 페이지 로드 시
    Then 후가공 항목 코드, 이름, 단가가 테이블로 표시된다

  Scenario: 후가공비 수정 및 저장
    Given 후가공비 "무광PP" 항목의 단가가 1,700원일 때
    When 관리자가 단가를 2,000원으로 수정하고 저장하면
    Then `postprocessCost.upsert` tRPC mutation이 호출된다
    And 변경된 단가가 반영된다
```

### AC-14: 수량할인 구간 관리 (FR-WA001-14)

```gherkin
Feature: 수량할인 구간

  Scenario: 할인 구간 목록 표시
    Given 수량할인 구간이 설정되어 있을 때
    When 페이지 로드 시
    Then 수량 범위와 할인율이 테이블로 표시된다

  Scenario: 할인 구간 추가
    Given 수량할인 테이블이 표시되어 있을 때
    When 관리자가 "구간 추가" 버튼을 클릭하면
    Then 새 행이 추가되어 수량 범위와 할인율을 입력할 수 있다
    And 저장 시 `qtyDiscount.upsert` tRPC mutation이 호출된다

  Scenario: 할인 구간 삭제
    Given 할인 구간 행이 있을 때
    When 관리자가 삭제 버튼을 클릭하면
    Then 해당 구간이 제거된다
```

### AC-15: 실시간 견적 테스트 (FR-WA001-15)

```gherkin
Feature: 실시간 견적 테스트

  Scenario: 옵션 조합 선택 후 견적 테스트
    Given 가격 설정이 완료된 상태에서
    When 관리자가 사이즈 "100x148mm", 인쇄 "단면칼라", 수량 "100매", 코팅 "무광PP"를 선택하고 테스트를 실행하면
    Then `pricingTest` tRPC query가 호출된다
    And 기본 출력비가 표시된다
    And 후가공비가 표시된다
    And 수량할인 금액이 표시된다
    And 최종 견적가가 표시된다
    And 매당 단가가 표시된다

  Scenario: 옵션 변경 시 자동 재계산
    Given 견적 테스트 결과가 표시된 상태에서
    When 관리자가 수량을 "100매"에서 "300매"로 변경하면
    Then 자동으로 재계산되어 새로운 견적가가 표시된다

  Scenario: 필수 옵션 미선택 시
    Given 필수 옵션(사이즈, 인쇄)이 미선택 상태일 때
    Then 테스트 실행 버튼이 비활성화된다
    And "필수 옵션을 선택해주세요" 안내가 표시된다
```

---

## Step 4 -- 인쇄 제약조건 빌더

### AC-16: 제약조건 목록 표시 (FR-WA001-16)

```gherkin
Feature: 제약조건 목록

  Scenario: 제약조건 카드 목록 표시
    Given 상품에 4개의 제약조건이 등록되어 있을 때
    When 관리자가 제약조건 빌더 페이지에 진입하면
    Then 4개의 IF-THEN 카드가 표시된다
    And 각 카드에 규칙 이름, IF 조건, THEN 액션이 표시된다
    And 각 카드에 활성/비활성 Switch가 표시된다

  Scenario: 제약조건 활성/비활성 토글
    Given 제약조건 "투명PVC->코팅제외"가 활성(ON) 상태일 때
    When 관리자가 Switch를 OFF로 토글하면
    Then `constraints.toggle` tRPC mutation이 호출된다
    And 해당 규칙이 비활성 상태로 전환되며 시각적으로 흐려진다
```

### AC-17: 비주얼 Rule Builder (FR-WA001-17)

```gherkin
Feature: Rule Builder

  Scenario: 새 규칙 추가
    Given "규칙 추가" 버튼이 클릭되었을 때
    When Rule Builder UI가 표시되면
    Then 규칙 이름 입력 필드가 표시된다
    And WHEN 섹션에 [옵션 Select] [연산자 Select] [값 MultiSelect]가 표시된다
    And THEN 섹션에 [액션타입 Select] [대상옵션 Select] [파라미터 입력]이 표시된다

  Scenario: 트리거 조건 설정
    Given Rule Builder에서 WHEN 섹션이 표시되어 있을 때
    When 관리자가 옵션 "용지", 연산자 "in", 값 "투명PVC, OPP"를 선택하면
    Then 트리거 조건이 "IF 용지 in {투명PVC, OPP}"로 미리보기 된다

  Scenario: 액션 설정
    Given 트리거 조건이 설정된 상태에서
    When 관리자가 액션타입 "exclude_options", 대상 "코팅", 값 "무광PP"를 선택하면
    Then 액션이 "THEN exclude 코팅 {무광PP}"로 미리보기 된다

  Scenario: 규칙 저장
    Given 트리거와 액션이 모두 설정된 상태에서
    When 관리자가 "저장" 버튼을 클릭하면
    Then `constraints.create` tRPC mutation이 호출된다
    And 새 규칙이 목록에 추가된다
    And Rule Builder가 닫힌다

  Scenario: 기존 규칙 편집
    Given 기존 규칙 카드의 "편집" 버튼이 클릭되었을 때
    When Rule Builder가 열리면
    Then 기존 규칙의 트리거와 액션이 미리 채워져 있다
    And 수정 후 저장 시 `constraints.update` tRPC mutation이 호출된다
```

### AC-18: 8종 액션 타입 지원 (FR-WA001-18)

```gherkin
Feature: 8종 액션 타입

  Scenario: 모든 액션 타입 선택 가능
    Given Rule Builder의 액션타입 Select가 표시될 때
    Then 다음 8종 옵션이 모두 선택 가능하다:
      | 액션 타입 | 설명 |
      | show_addon_list | 추가상품 목록 표시 |
      | filter_options | 옵션 필터링 |
      | exclude_options | 옵션 제외 |
      | auto_add | 자동 추가 |
      | require_option | 필수 옵션 설정 |
      | show_message | 메시지 표시 |
      | change_price_mode | 가격 방식 변경 |
      | set_default | 기본값 설정 |

  Scenario: 액션 타입별 파라미터 UI
    Given 액션 타입 "show_message"가 선택되었을 때
    Then 메시지 내용 Textarea와 알림 유형(INFO/WARN/ERROR) Select가 표시된다
```

### AC-19: 복합 조건 지원 (FR-WA001-19)

```gherkin
Feature: 복합 조건

  Scenario: AND 조건 추가
    Given 단일 트리거 조건이 설정된 상태에서
    When 관리자가 "+ AND 조건" 버튼을 클릭하면
    Then 두 번째 조건 행이 추가된다
    And 두 조건 사이에 "AND" 라벨이 표시된다

  Scenario: OR 조건 추가
    Given 단일 트리거 조건이 설정된 상태에서
    When 관리자가 "+ OR 조건" 버튼을 클릭하면
    Then OR 그룹이 추가된다
    And 조건 그룹 사이에 "OR" 라벨이 표시된다

  Scenario: 복합 조건 삭제
    Given AND 조건 2개가 설정된 상태에서
    When 관리자가 두 번째 조건의 삭제(x) 버튼을 클릭하면
    Then 두 번째 조건이 제거되고 단일 조건으로 복귀한다
```

### AC-20: AI 자연어 변환 (FR-WA001-20)

```gherkin
Feature: AI 자연어 변환

  Scenario: 자연어 입력 및 변환
    Given AI 변환 패널이 표시되어 있을 때
    When 관리자가 "투명PVC 선택하면 PP코팅 못 쓰게 해줘"를 입력하고 "AI 변환" 버튼을 클릭하면
    Then 로딩 스피너가 표시된다
    And `constraints.aiConvert` tRPC mutation이 호출된다
    And 변환 결과 미리보기가 카드로 표시된다:
      | IF 용지 in {투명PVC} |
      | THEN exclude 코팅 {무광PP, 유광PP} |

  Scenario: 변환 결과 확인 및 추가
    Given AI 변환 결과 미리보기가 표시되어 있을 때
    When 관리자가 "규칙 추가" 버튼을 클릭하면
    Then 변환된 규칙이 제약조건 목록에 추가된다
    And `constraints.create` tRPC mutation이 호출된다

  Scenario: 변환 결과 수정
    Given AI 변환 결과 미리보기가 표시되어 있을 때
    When 관리자가 "수정" 버튼을 클릭하면
    Then Rule Builder가 열리며 변환된 규칙이 미리 채워져 있다
    And 관리자가 수정 후 저장할 수 있다

  Scenario: 변환 실패 처리
    Given AI 변환이 실패했을 때
    Then "규칙 변환에 실패했습니다. 더 구체적으로 입력해주세요." 에러 메시지가 표시된다
    And 입력 필드가 유지되어 재시도할 수 있다
```

### AC-21: 규칙 전체 테스트 (FR-WA001-21)

```gherkin
Feature: 규칙 전체 테스트

  Scenario: 전체 테스트 실행
    Given 제약조건 빌더 페이지에 4개 규칙이 있을 때
    When 관리자가 "전체 테스트" 버튼을 클릭하면
    Then `constraints.testAll` tRPC query가 호출된다
    And 테스트 결과가 표시된다

  Scenario: 규칙 충돌 발견
    Given 전체 테스트 실행 결과 충돌이 발견되었을 때
    Then 충돌하는 규칙 쌍이 Alert 컴포넌트로 표시된다
    And 충돌 내용 설명이 포함된다 (예: "규칙 A와 규칙 B가 동일 옵션에 대해 상충하는 액션을 수행합니다")

  Scenario: 충돌 없음
    Given 전체 테스트 실행 결과 충돌이 없을 때
    Then "모든 규칙이 정상입니다. 충돌이 발견되지 않았습니다." 성공 메시지가 표시된다
```

---

## Step 5 -- 자동견적 시뮬레이션 (기존 보강)

### AC-22: 통계 카드 보강 (FR-WA001-22)

```gherkin
Feature: 시뮬레이션 통계 카드

  Scenario: 시뮬레이션 완료 후 통계 카드 표시
    Given 시뮬레이션이 완료되어 100개 케이스가 실행되었을 때
    When 결과 화면이 표시되면
    Then 전체 케이스 수(100) 카드가 표시된다
    And 통과 수(92) 카드가 --success 색상으로 표시된다
    And 경고 수(5) 카드가 --warning 색상으로 표시된다
    And 오류 수(3) 카드가 --error 색상으로 표시된다
    And 통과율 Progress Bar(92%)가 표시된다
```

---

## Step 6 -- 발행 & 완료 (기존 유지)

### AC-23: 기존 구현 유지 (FR-WA001-23)

```gherkin
Feature: 발행 기능 유지

  Scenario: 완성도 체크리스트 표시
    Given 상품의 발행 페이지에 진입했을 때
    Then 4항목 완성도 체크리스트가 표시된다
    And 옵션 설정, 가격 설정, 제약조건, 시뮬레이션 항목이 포함된다

  Scenario: 발행 가능 상태
    Given 4항목 모두 완료(체크) 상태일 때
    Then "상품 발행" 버튼이 활성화된다
    And 클릭 시 PublishDialog가 표시되며 최종 확인을 요청한다

  Scenario: 발행 불가 상태
    Given 4항목 중 미완성 항목이 있을 때
    Then "상품 발행" 버튼이 비활성화된다
    And 미완성 항목에 --error 색상 Badge가 표시된다
```

---

## Cross-Cutting Acceptance Criteria

### CC-01: 디자인 시스템 일관성

```gherkin
Feature: 디자인 시스템 일관성

  Scenario: Violet 테마 적용 확인
    Given 모든 Admin 페이지에서
    Then Primary 색상은 #5538B6 (violet)이다
    And 다크 앰버 테마 색상은 사용되지 않는다
    And border-radius는 5px가 기본 적용된다
    And letter-spacing은 -0.05em이 적용된다

  Scenario: 가격 표시 폰트
    Given 가격/금액이 표시되는 모든 영역에서
    Then font-mono 클래스가 적용되어 고정폭 숫자 표시가 된다
```

### CC-02: 로딩 및 에러 상태

```gherkin
Feature: 로딩 및 에러 처리

  Scenario: tRPC 쿼리 로딩 중
    Given tRPC 데이터 로딩 중일 때
    Then 해당 영역에 Skeleton 컴포넌트가 표시된다

  Scenario: tRPC mutation 진행 중
    Given tRPC mutation 실행 중일 때
    Then 저장/실행 버튼에 로딩 스피너가 표시된다
    And 버튼이 비활성화되어 중복 요청을 방지한다

  Scenario: API 에러 발생
    Given tRPC 호출에서 에러가 발생했을 때
    Then sonner toast로 에러 메시지가 표시된다
    And 사용자 데이터 입력은 유지된다
```

### CC-03: 반응형 및 접근성

```gherkin
Feature: 접근성

  Scenario: 키보드 네비게이션
    Given 모든 인터랙티브 요소에서
    Then Tab 키로 포커스 이동이 가능하다
    And Enter/Space 키로 활성화가 가능하다
    And 포커스 링이 --primary 색상으로 표시된다

  Scenario: ARIA 레이블
    Given 모든 폼 요소에서
    Then 적절한 aria-label 또는 연결된 label이 존재한다
    And 스크린 리더가 요소의 용도를 읽을 수 있다
```

---

## Quality Gates

### Definition of Done

- [ ] 모든 23개 FR 요구사항에 대한 acceptance criteria 통과
- [ ] tRPC 프로시저 통합 테스트 작성 및 통과
- [ ] 컴포넌트 단위 테스트 85%+ 커버리지
- [ ] Violet 테마 디자인 토큰 일관성 검증
- [ ] TypeScript strict 모드 에러 0건
- [ ] ESLint 에러 0건
- [ ] Zod 스키마 기반 입력 검증 적용
- [ ] sonner toast 기반 피드백 메시지 적용
- [ ] Skeleton 기반 로딩 UI 적용
- [ ] ARIA 접근성 기본 요건 충족

---

*SPEC-WA-001 Acceptance Criteria v1.0.0 -- 2026-02-26*
