# SPEC-DB-006 Acceptance Criteria

---
spec_id: SPEC-DB-006
version: 1.0.0
---

## AC-DB006-01: 신규 가격 테이블 CRUD

### Scenario 1: 제본비 테이블 데이터 조회

```gherkin
Given 제본비 테이블에 다음 데이터가 존재한다:
  | binding_type_code | binding_type_name | page_count_min | page_count_max | unit_price |
  | 101               | 중철제본          | 8              | 32             | 500        |
  | 101               | 중철제본          | 33             | 64             | 800        |
  | 102               | 무선제본          | 40             | 100            | 1200       |
When 시스템이 binding_type_code='101', page_count=24에 해당하는 제본비를 조회하면
Then unit_price 500원이 반환된다
```

### Scenario 2: 제본비 데이터가 없는 구간 조회

```gherkin
Given 제본비 테이블에 중철제본 8~64p 데이터만 존재한다
When 시스템이 binding_type_code='101', page_count=80에 해당하는 제본비를 조회하면
Then "단가 미설정" 경고가 반환되고 0원으로 처리된다
```

### Scenario 3: 판걸이수 조회

```gherkin
Given 판걸이수 테이블에 다음 데이터가 존재한다:
  | cut_size_code | imposition_count |
  | A4            | 2                |
  | A3            | 1                |
  | 90x50         | 16               |
When 시스템이 cut_size_code='A4'의 판걸이수를 조회하면
Then imposition_count 2가 반환된다
```

### Scenario 4: 스티커 단가 조회

```gherkin
Given 스티커 단가 테이블에 다음 데이터가 존재한다:
  | sticker_type | layout_code | qty_min | qty_max | unit_price |
  | HALF_CUT     | 4절         | 100     | 499     | 35         |
  | HALF_CUT     | 4절         | 500     | 999     | 28         |
When 시스템이 sticker_type='HALF_CUT', layout_code='4절', qty=300의 단가를 조회하면
Then unit_price 35원이 반환된다
```

### Scenario 5: 아크릴 단가 CRUD

```gherkin
Given 관리자가 아크릴 단가 데이터를 생성한다:
  | size_code | qty_min | qty_max | unit_price |
  | 50x50     | 1       | 99      | 3000       |
When 시스템이 데이터를 저장하면
Then wb_acrylic_price 테이블에 해당 행이 삽입된다
And is_active가 true로 설정된다
```

---

## AC-DB006-02: 관리자 UI 인라인 편집 & 벌크 임포트

### Scenario 1: 인라인 편집

```gherkin
Given 관리자가 제본비 관리 탭에서 데이터 목록을 보고 있다
When 관리자가 unit_price 셀을 클릭한다
Then 해당 셀이 편집 가능한 input으로 전환된다
When 관리자가 값을 500에서 600으로 변경하고 Enter를 누른다
Then 데이터베이스에 unit_price=600이 저장된다
And 셀이 다시 읽기 전용으로 전환된다
```

### Scenario 2: 인라인 편집 유효성 오류

```gherkin
Given 관리자가 unit_price 셀을 편집 중이다
When 관리자가 음수 값 (-100)을 입력하고 저장하면
Then 해당 셀에 빨간색 테두리와 오류 메시지가 표시된다
And 데이터베이스에 저장되지 않는다
```

### Scenario 3: CSV 벌크 임포트 성공

```gherkin
Given 관리자가 다음 내용의 CSV 파일을 준비한다:
  binding_type_code,binding_type_name,page_count_min,page_count_max,unit_price
  101,중철제본,8,32,500
  101,중철제본,33,64,800
When 관리자가 CSV 파일을 업로드한다
Then 시스템이 2행의 미리보기를 표시한다
When 관리자가 "임포트 실행"을 클릭한다
Then 2건 성공이 보고된다
And wb_binding_cost에 2행이 삽입된다
```

### Scenario 4: CSV 임포트 충돌 처리

```gherkin
Given wb_binding_cost에 (101, 8, 32, 500) 데이터가 이미 존재한다
When 관리자가 동일 키의 CSV를 업로드하면
Then 시스템이 충돌 행을 노란색으로 하이라이트한다
And "덮어쓰기", "건너뛰기", "취소" 3가지 옵션을 제공한다
When 관리자가 "덮어쓰기"를 선택한다
Then 기존 데이터가 새 값으로 업데이트된다
```

---

## AC-DB006-03: 수량구간 충돌 검증

### Scenario 1: 겹치는 수량구간 감지

```gherkin
Given wb_binding_cost에 (101, 8, 32, 500)이 존재한다
When 관리자가 (101, 20, 50, 700)을 추가하려 한다
Then 시스템이 "수량구간 겹침: 기존 8~32와 새로운 20~50이 겹칩니다" 경고를 표시한다
And 저장을 차단한다
```

### Scenario 2: 인접하지만 겹치지 않는 구간

```gherkin
Given wb_binding_cost에 (101, 8, 32, 500)이 존재한다
When 관리자가 (101, 33, 64, 800)을 추가하려 한다
Then 수량구간 충돌이 감지되지 않는다
And 정상 저장된다
```

### Scenario 3: 벌크 임포트 시 내부 충돌 검증

```gherkin
Given 관리자가 CSV에 다음 데이터를 포함한다:
  | binding_type_code | page_count_min | page_count_max | unit_price |
  | 101               | 8              | 40             | 500        |
  | 101               | 30             | 64             | 800        |
When CSV를 업로드하면
Then 시스템이 CSV 내부 행 간의 수량구간 겹침을 감지한다
And 2번째 행에 경고 표시를 한다
```

---

## AC-DB006-04: 할인 템플릿 생성/적용/수정

### Scenario 1: 할인 템플릿 생성

```gherkin
Given 관리자가 할인 템플릿 생성 화면에서 다음을 입력한다:
  | template_key | template_name_ko | discount_rules |
  | STANDARD_5TIER | 표준 5단계 할인 | [{qty_min:1,qty_max:99,discount_rate:0,label:"기본가"},{qty_min:100,qty_max:299,discount_rate:0.03,label:"소량할인"},{qty_min:300,qty_max:499,discount_rate:0.07,label:"중량할인"},{qty_min:500,qty_max:999,discount_rate:0.12,label:"대량할인"},{qty_min:1000,qty_max:999999,discount_rate:0.18,label:"대량특가"}] |
When 관리자가 저장을 클릭하면
Then wb_discount_templates에 해당 템플릿이 저장된다
```

### Scenario 2: 템플릿을 상품에 적용

```gherkin
Given "표준 5단계 할인" 템플릿이 존재하고, 상품 ID=42에 qty_discount가 없다
When 관리자가 상품 42에 해당 템플릿을 적용한다
Then qty_discount 테이블에 5개 행이 삽입된다 (product_id=42)
And 각 행의 discount_rate가 템플릿의 값과 일치한다
```

### Scenario 3: 기존 할인 데이터가 있는 상품에 적용

```gherkin
Given 상품 42에 qty_discount 3개 행이 이미 존재한다
When 관리자가 "표준 5단계 할인" 템플릿을 적용하면
Then "기존 데이터 보존/교체/병합" 옵션이 표시된다
When 관리자가 "교체"를 선택하면
Then 기존 3개 행이 삭제되고 템플릿의 5개 행이 삽입된다
```

### Scenario 4: 적용 후 개별 수정

```gherkin
Given 상품 42에 템플릿에서 적용된 qty_discount 5개 행이 존재한다
When 관리자가 "대량할인" 행의 discount_rate를 0.12에서 0.15로 수정한다
Then qty_discount 테이블의 해당 행만 업데이트된다
And 원본 템플릿(wb_discount_templates)은 변경되지 않는다
```

---

## AC-DB006-05: product_class 분류 및 고정가격

### Scenario 1: 기존 상품 product_class 기본값

```gherkin
Given wb_products에 기존 상품 100개가 존재한다
When product_class 컬럼이 추가되면
Then 모든 기존 상품의 product_class가 'manufactured'로 설정된다
```

### Scenario 2: 기성상품 등록

```gherkin
Given 관리자가 새 상품을 product_class='catalog'로 등록한다
When fixed_price=5000을 설정한다
Then 해당 상품은 가격 계산 엔진 없이 고정가 5000원으로 표시된다
```

### Scenario 3: addon 상품과 addon_group 연결

```gherkin
Given product_class='addon'인 상품 "양면테이프"가 존재한다
And addon_groups에 "현수막악세사리" 그룹이 존재한다
When 관리자가 "현수막악세사리" 그룹에 "양면테이프"를 추가한다
Then addon_group_items에 해당 연결이 생성된다
```

### Scenario 4: 주문 시 addon 합산

```gherkin
Given 인쇄상품 "현수막"의 ECA 제약조건에 show_addon_list 액션이 있다
And addon_group "현수막악세사리"에 "양면테이프"(2000원)가 포함되어 있다
When 고객이 위젯에서 현수막 옵션 선택 후 양면테이프를 추가 선택한다
Then 최종 견적에 양면테이프 2000원이 합산된다
```

---

## AC-DB006-06: 멀티셀렉트 옵션 동작

### Scenario 1: 단일선택 기본 동작 유지

```gherkin
Given 레시피의 "SIZE" 옵션 바인딩에 selection_mode='single'이 설정되어 있다
When 고객이 위젯에서 사이즈를 선택하면
Then 이전 선택이 해제되고 새 선택이 적용된다
```

### Scenario 2: 복수선택 후가공

```gherkin
Given 레시피의 "FINISHING" 옵션 바인딩에 selection_mode='multi'가 설정되어 있다
When 고객이 "무광PP"와 "에폭시"를 동시에 선택하면
Then 두 항목 모두 선택 상태로 유지된다
And 두 후가공의 단가가 합산된다
```

### Scenario 3: 최대 선택 수 제한

```gherkin
Given FINISHING 옵션에 selection_mode='multi', max_selections=3이 설정되어 있다
When 고객이 이미 3개 항목을 선택한 상태에서 4번째를 선택하려 한다
Then "최대 3개까지 선택 가능합니다" 메시지가 표시된다
And 4번째 항목은 선택되지 않는다
```

### Scenario 4: 하위 호환성 검증

```gherkin
Given 기존 레시피에 selection_mode 컬럼이 없었다
When 마이그레이션 후 기존 레시피를 조회하면
Then selection_mode가 'single'로 반환된다
And max_selections가 null로 반환된다
And 기존 위젯 동작에 변경이 없다
```

---

## AC-DB006-07: 가격 미리보기 계산 정확도

### Scenario 1: LOOKUP 모드 미리보기

```gherkin
Given 상품 42의 price_mode가 'LOOKUP'이다
And print_cost_base에 (plate_type='100x148', print_mode='단면칼라', qty_min=100, qty_max=299, unit_price=6500)이 존재한다
And postprocess_cost에 (process_code='MATTE_PP', qty_min=100, unit_price=1700)이 존재한다
And qty_discount에 (qty_min=100, qty_max=299, discount_rate=0.03)이 존재한다
When 관리자가 미리보기에서 SIZE=100x148, PRINT=단면칼라, FINISHING=무광PP, QTY=100을 선택한다
Then 다음 계산 내역이 표시된다:
  | 항목 | 금액 |
  | 기본 출력비 | 6,500원 (print_cost_base 참조) |
  | 후가공비 | 1,700원 (무광PP) |
  | 소계 | 8,200원 |
  | 수량할인 | -246원 (3%) |
  | 최종가 | 7,954원 |
  | 단가 | 79.54원 |
```

### Scenario 2: 미설정 데이터 경고

```gherkin
Given 상품 42의 price_mode가 'LOOKUP'이다
And print_cost_base에 해당 조합의 데이터가 없다
When 관리자가 미리보기를 실행한다
Then 기본 출력비 항목에 "미설정" 표시와 경고 아이콘이 표시된다
And 총액은 후가공비만 반영되어 표시된다
```

### Scenario 3: PAGE 모드 + 제본비 조회

```gherkin
Given 상품 50의 price_mode가 'PAGE'이다
And wb_imposition_rule에 (cut_size_code='A4', imposition_count=2)가 존재한다
And wb_binding_cost에 (binding_type_code='101', page_count_min=8, page_count_max=32, unit_price=500)이 존재한다
When 관리자가 미리보기에서 SIZE=A4, 제본=중철, 내지=24p, QTY=100을 선택한다
Then 기본 출력비 = CEIL(24 / 2) * unit_price + cover_price
And 제본비 = 500원 (wb_binding_cost 참조)
And 계산 내역에 "판걸이수: 2 (wb_imposition_rule)", "제본비: 500원 (wb_binding_cost)" 출처 표시
```

---

## Edge Cases

### E1: 빈 테이블에서 가격 조회

```gherkin
Given wb_sticker_price 테이블이 비어있다
When 스티커 상품의 가격을 조회하면
Then "단가 미설정" 경고가 반환된다
And 가격 계산 엔진이 0원으로 처리한다
```

### E2: product_class='manufactured' 상품에 fixed_price 설정

```gherkin
Given 상품의 product_class가 'manufactured'이다
When fixed_price를 설정하려 한다
Then 시스템이 "인쇄상품은 가격 계산 엔진을 사용합니다" 안내를 표시한다
And fixed_price 설정을 허용하되 무시한다 (가격 계산 엔진 우선)
```

### E3: 템플릿 삭제 시 적용된 상품 데이터

```gherkin
Given 할인 템플릿 "표준 5단계"가 3개 상품에 적용되었다
When 관리자가 해당 템플릿을 삭제한다
Then 템플릿만 삭제된다
And 이미 적용된 상품의 qty_discount 데이터는 유지된다 (독립적)
```

### E4: 멀티셀렉트 옵션의 가격 미리보기

```gherkin
Given FINISHING 옵션이 selection_mode='multi'이다
And "무광PP"(1700원)과 "UV코팅"(2000원)이 선택되었다
When 가격 미리보기를 실행하면
Then 후가공비가 3700원(1700+2000)으로 표시된다
And 각 항목별 단가가 개별 표시된다
```

---

## Performance Criteria

### P1: 가격 테이블 조회 성능

```gherkin
Given 각 가격 테이블에 1000행 이상의 데이터가 존재한다
When 단일 조건으로 가격을 조회하면
Then 응답 시간이 50ms 이내이다
```

### P2: CSV 벌크 임포트 성능

```gherkin
Given 500행의 CSV 파일을 임포트한다
When 트랜잭션으로 일괄 삽입하면
Then 전체 프로세스가 5초 이내에 완료된다
```

### P3: 수량구간 충돌 검증 성능

```gherkin
Given 동일 키에 100개의 수량구간이 존재한다
When 새로운 수량구간 1개의 충돌을 검증하면
Then 검증이 100ms 이내에 완료된다
```

---

## Definition of Done

- [ ] 5개 신규 Drizzle 스키마 파일 생성 및 마이그레이션 성공
- [ ] 2개 기존 테이블 ALTER 마이그레이션 성공
- [ ] 모든 신규 테이블의 CRUD tRPC 라우터 동작
- [ ] CSV 벌크 임포트 API 동작 (미리보기 + 실행)
- [ ] 수량구간 충돌 검증 로직 동작
- [ ] 할인 템플릿 CRUD + 상품 적용 동작
- [ ] Admin UI: 인라인 편집 + 탭 네비게이션
- [ ] Admin UI: CSV 임포트 모달
- [ ] Admin UI: 가격 미리보기 패널
- [ ] selection_mode/max_selections 컬럼 추가 및 런타임 반영
- [ ] product_class/fixed_price 컬럼 추가 및 분류 로직
- [ ] 스키마 테스트 + API 테스트 + 통합 테스트 85%+ 커버리지
- [ ] 기존 테스트 전체 통과 (회귀 없음)

---

*SPEC-DB-006 Acceptance Criteria v1.0.0*
