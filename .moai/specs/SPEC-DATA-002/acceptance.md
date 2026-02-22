---
id: SPEC-DATA-002
version: 1.1.0
status: Draft
created: 2026-02-22
updated: 2026-02-22
---

# SPEC-DATA-002: 인수 조건 (Acceptance Criteria)

## AC-1: 상품 카탈로그 CRUD

```gherkin
Given 관리자가 카테고리/상품 관리 화면에 접근했을 때
When 상품을 생성/조회/수정/삭제하면
Then 12개 카테고리, 221개 상품이 정확히 관리되어야 한다
And huni_code가 모든 외부 시스템 매핑의 중추 역할을 해야 한다
```

**세부 검증 항목:**

- categories 테이블에 12개 대분류 + 하위분류가 계층 구조(parent_id, depth)로 정확히 저장된다
- products 테이블에 221개 상품이 huni_code(UNIQUE, NOT NULL)와 함께 등록된다
- shopby_id를 통한 Shopby 쇼핑몰 역참조가 가능하다
- product_type 8가지, pricing_model 7가지가 모든 상품에 정확히 매핑된다
- 소프트 삭제(is_active=false)로 상품 비활성화 시 조회에서 제외된다
- product_sizes에 각 상품별 사이즈(규격/비규격)가 판걸이수와 함께 등록된다

---

## AC-2: 용지/자재 관리

```gherkin
Given 55개 용지와 비인쇄 소재가 등록되어 있을 때
When 용지를 추가/수정하면
Then 원가(cost)와 판매가(selling) 이중 가격이 모두 관리되어야 한다
And 용지-상품 교차매핑이 45+ 상품 컬럼과 일치해야 한다
```

**세부 검증 항목:**

- papers 테이블에 55개 용지가 cost_per_ream, selling_per_ream, cost_per_4cut, selling_per_4cut 이중 가격으로 저장된다
- materials 테이블에 아크릴/패브릭/필름 등 비인쇄 소재가 material_type별로 분류된다
- paper_product_mapping에 용지-상품 교차매핑이 정확히 반영된다 (가격표 디지털용지 시트 45+ 열 기준)
- 책자 상품의 경우 cover_type(inner/cover)으로 내지/표지 용지가 별도 매핑된다
- 상품마스터 디지털인쇄용지 시트와 가격표 디지털용지 시트의 매핑이 교차 검증을 통과한다

---

## AC-3: 7가지 견적 모델 정확성

```gherkin
Given 각 가격 모델(formula/fixed_unit/package/component/fixed_size/fixed_per_unit)에 해당하는 상품이 있을 때
When 옵션을 선택하고 견적을 계산하면
Then 엑셀 수동 계산 결과와 동일한 견적가가 산출되어야 한다
And 오차 범위 +-1원 이내
```

**세부 검증 항목:**

- **Model 1 (formula)**: 출력비 + 별색비 + 지대 + 코팅비 + 가공비 + 후가공비 = 엑셀 행 256 공식 결과와 일치
  - 필요판수 = ceil(주문수량 / 판걸이수) 정확
  - 출력비 = lookup(디지털출력비[인쇄방식], 필요판수) x 필요판수 정확
  - 지대 = 용지단가_국4절 / 판걸이수 x (주문수량 + 로스량) 정확
- **Model 2 (formula_cutting)**: Model 1 + 커팅가공비 정확
- **Model 3 (fixed_unit)**: 상품단가(용지, 단면/양면) x (주문수량/100) 정확
- **Model 4 (package)**: lookup(사이즈 x 인쇄 x 페이지수, 수량) 정확
- **Model 5 (component)**: 내지가격 + 표지가격 + 제본비 + 코팅비 + 박/형압비 + 포장비 합산 정확
- **Model 6 (fixed_size)**: 사이즈별단가 + 코팅옵션가 + 가공옵션가 정확
- **Model 7 (fixed_per_unit)**: (사이즈별단가 + 가공 + 추가상품) x 수량 x 할인율 정확
- 각 모델별 최소 1개 상품에 대한 golden test가 존재한다

---

## AC-4: 후가공 가격 계산

```gherkin
Given 8개 후가공 섹션(미싱/오시/접지/가변/모서리/코팅)이 등록되어 있을 때
When 수량과 후가공 옵션을 선택하면
Then 수량 구간별 정확한 단가가 적용되어야 한다
And 코팅은 per_sheet 기준, 나머지는 per_unit 기준이어야 한다
```

**세부 검증 항목:**

- post_processes 테이블에 PP001~PP008 그룹의 하위 옵션이 모두 등록된다
- price_tiers에 각 후가공 옵션별 수량 구간 단가가 정확히 저장된다
- PP007(코팅), PP008(코팅3절)의 price_basis='per_sheet'이며, 나머지 PP001~PP006의 price_basis='per_unit'이다
- PP008(코팅3절)의 sheet_standard='T3'이 정확히 구분된다
- 수량 구간 경계값(min_qty, max_qty)에서 올바른 단가가 조회된다
- 미싱(10/20/30/50), 접지(2단/3단/N접지/병풍/대문/오시접지/미싱접지) 등 sub_option_code가 원본과 일치한다

---

## AC-5: ★ 제약조건 동작

```gherkin
Given 129개 ★ 제약조건이 등록되어 있을 때
When 특정 사이즈/용지 옵션을 선택하면
Then Type A(부속품 표시), Type B(크기 제한), Type C(용지 조건) 제약이 올바르게 적용되어야 한다
```

**세부 검증 항목:**

- option_constraints 테이블에 129개 제약이 정확히 저장된다
- **Type A (size_show)**: 사이즈 선택 시 부속품 옵션이 표시된다
  - 예: 엽서봉투에서 100x150 선택 시 봉투 옵션 show
  - constraint_type='size_show', source_field='size', operator='eq', target_action='show'
- **Type B (size_range)**: 가공 크기 범위가 제한된다
  - 예: 박 사이즈 최소 30x30 / 최대 125x125 제한
  - constraint_type='size_range', operator='between', value_min/value_max 정확
- **Type C (paper_condition)**: 용지 조건에 따른 옵션 활성화/비활성화
  - 예: 180g 이상 용지 선택 시 코팅 가능
  - constraint_type='paper_condition', source_field='paper_weight', operator='gte', target_action='enable'
- 모든 제약의 description 필드에 원문 ★ 텍스트가 그대로 보존된다
- 제약 유형 분류 정확도: 129개 중 자동 분류 성공률 확인 (목표: 95% 이상)

---

## AC-6: MES 매핑

```gherkin
Given 260개 MES 품목이 등록되어 있을 때
When 상품에서 MES 매핑을 조회하면
Then 양방향 조회(상품->MES, MES->상품)가 가능해야 한다
And 책자의 경우 내지/표지 별도 매핑이 되어야 한다
```

**세부 검증 항목:**

- mes_items 테이블에 260개 MES 품목이 item_code 원본 보존(예: "001-0001")으로 저장된다
- mes_item_options에 Option01~Option10 중 비어있지 않은 값이 모두 저장된다
- product_mes_mapping을 통해 양방향 조회가 가능하다
  - 정방향: product_id -> mes_item_id (주문 시 MES 생산 지시)
  - 역방향: mes_item_id -> product_id (품목 역추적)
- 일반 상품: cover_type=NULL로 1:1 매핑
- 책자 상품: cover_type='inner'(내지) + cover_type='cover'(표지)로 1:N 매핑
- item_type이 finished/semi_finished/service/standard 4가지로 정확히 분류된다
- group_code를 통한 품목 그룹 조회가 가능하다

---

## AC-7: UI 컴포넌트 매핑

```gherkin
Given 7종 shadcn/ui 프리미티브와 10종 후니 도메인 컴포넌트, 11개 Figma 섹션이 정의되어 있을 때
When 상품별 옵션 구성을 조회하면
Then 각 옵션에 올바른 ui_component 타입이 매핑되어야 한다
And display_order에 따른 정렬이 Figma 디자인과 일치해야 한다
```

**세부 검증 항목:**

- option_definitions에 30개 옵션 키가 option_class(material/process/setting) 3가지로 분류된다
- ui_component가 shadcn/ui 7종 프리미티브 기반으로 정확히 매핑된다: `toggle-group`, `select`, `radio-group:color-chip`, `radio-group:image-chip`, `collapsible`, `input:number`, `input:dual`, `slider:tier-display`, `button` 등 (변형 접미어 포함)
- product_options에 각 상품별 옵션 구성이 등록된다
  - is_required: 빨강 헤더(#FFE06666) 옵션 -> true
  - is_visible=false: 회색 헤더(#FFD9D9D9) 옵션 -> 고객 비노출
  - is_internal=true: 내부 전용 옵션
- display_order가 엑셀 열 순서 및 Figma 디자인 섹션 배치와 일치한다
- products.figma_section이 10개 Figma 섹션 중 하나로 정확히 매핑된다
- ui_component_override를 통해 상품별 커스텀 UI 변경이 가능하다

---

## AC-8: 에디터 매핑

```gherkin
Given 111개 에디커스 에디터 지원 상품이 있을 때
When 상품의 주문방식을 조회하면
Then editor_enabled=true인 상품은 "테마로 디자인하기" 버튼이 표시되어야 한다
And upload/editor/both/cart-only 4가지 주문 UI 변형이 올바르게 적용되어야 한다
```

**세부 검증 항목:**

- product_editor_mapping에 111개 에디터 지원 상품이 정확히 매핑된다
- products.editor_enabled=true인 상품 수가 111개와 일치한다
- products.order_method가 4가지 값으로 정확히 분류된다
  - `upload`: PDF 파일 주문만 가능
  - `editor`: 에디커스 에디터만 사용 (포토북, 디자인캘린더)
  - `both`: 파일 주문 + 에디터 모두 가능
  - `cart-only`: 장바구니 직접 추가 (악세사리 등)
- editor_type='edicus'가 기본값으로 설정된다
- template_config(JSONB)에 에디터별 커스텀 설정 저장이 가능하다
- 상품마스터 연분홍 배경(#FFF4CCCC) 시트의 상품이 editor-only로 올바르게 식별된다

---

## AC-9: 수량별 구간할인 (quantity-range)

```gherkin
Given 아크릴/굿즈/문구 상품에 구간할인이 설정되어 있을 때
When 수량을 변경하면
Then quantity-range UI에 현재 적용 구간이 시각적으로 표시되어야 한다
And 할인율이 정확히 적용된 견적가가 산출되어야 한다
```

**세부 검증 항목:**

- Model 7(fixed_per_unit) 상품에 수량 구간별 할인율이 적용된다
- 수량 변경 시 해당 구간의 할인율이 정확히 조회된다
- 최종 견적가 = (사이즈별단가 + 가공옵션가 + 추가상품가) x 수량 x 수량할인율이 정확하다
- 구간 경계값에서 할인율 전환이 올바르게 동작한다 (예: 99개 -> 100개 전환 시점)
- UI에서 현재 수량이 속한 구간이 시각적으로 구분된다
- 할인 구간 데이터가 DB에서 동적으로 관리 가능하다

---

## AC-10: 데이터 정합성

```gherkin
Given 엑셀 원본 데이터가 26개 테이블로 마이그레이션되었을 때
When 전체 데이터를 교차 검증하면
Then 상품 수, 옵션 수, 선택지 수, 가격 건수가 원본과 일치해야 한다
And 누락/중복 데이터가 0건이어야 한다
```

**세부 검증 항목:**

- **건수 검증**:
  - products: 221개
  - option_choices: 1,198개
  - option_constraints: 129개
  - mes_items: 260개
  - editor 상품 (product_editor_mapping): 111개
  - papers: 55개
  - print_modes: 12개
  - post_processes: ~40개 (8섹션 합계)
  - bindings: 4개
  - option_choice_mes_mapping: ~2,000개 (pending 상태 초기 생성)
- **교차 검증**:
  - paper_product_mapping: 상품마스터 디지털인쇄용지 시트 vs 가격표 디지털용지 시트 매핑 일치
  - product_mes_mapping: 상품마스터 C열(MES ITEM_CD) vs 품목관리 품목코드 일치
  - option_choices: MES v5 JSON choices vs 상품마스터 셀 내 드롭다운 값 일치
- **무결성 검증**:
  - 모든 FK 참조가 유효하다 (고아 레코드 0건)
  - UNIQUE 제약조건 위반 0건
  - NOT NULL 제약조건 위반 0건
  - 중복 데이터 0건 (동일 조합의 레코드 없음)
- **가격 검증**:
  - 7가지 모델별 최소 1개 상품에 대한 견적 계산 golden test 통과
  - 엑셀 수동 계산 vs API 자동 계산 결과 오차 +-1원 이내

---

## AC-11: huni_code 4종 코드 체계

```gherkin
Given 221개 상품에 huni_code가 부여되어 있을 때
When 코드 체계를 검증하면
Then 기존 164개 상품은 기존 번호(14529~22953)를 huni_code로 사용해야 한다
And 신규 57개 상품은 90001부터 순차 부여된 임시 코드를 사용해야 한다
And edicus_code는 "HU_" + huni_code로 자동 파생되어야 한다
And shopby_id는 현시점 NULL이며 추후 Shopby 등록 시 설정한다
```

**세부 검증 항목:**

- huni_code: VARCHAR(10), UNIQUE, NOT NULL, 모든 상품에 부여
- edicus_code: "HU_" + huni_code 형식. 에디쿠스 미등록 상품은 NULL
- shopby_id: NULL 허용. 현시점 미설정
- huni_code 자릿수: 모두 5자리 (14529~22953 기존, 90001~ 신규)
- 코드 충돌: 기존 범위(14xxx~22xxx)와 신규 범위(9xxxx) 간 충돌 0건

---

## AC-12: MES 옵션-자재/공정 수동 매핑

```gherkin
Given 관리자가 관리페이지에 접근했을 때
When 옵션 선택지에 MES 자재/공정 코드를 수동 매핑하면
Then mapping_status가 pending -> mapped -> verified로 전환되어야 한다
And 매핑된 선택지는 MES 생산 지시서에 활용 가능해야 한다
```

**세부 검증 항목:**

- option_choice_mes_mapping에 모든 자재/공정 선택지가 pending 상태로 초기 생성
- mapping_type 자동 판별: option_class=material -> material, option_class=process -> process
- 관리자가 mes_item_id를 선택하면 mapping_status='mapped'로 전환
- 검증 후 mapping_status='verified'로 확정
- mapped_by, mapped_at에 작업자 정보와 매핑 일시가 기록

---

## 품질 게이트 (Quality Gates)

### Definition of Done

- [ ] 26개 테이블 DDL이 PostgreSQL 16에서 정상 생성된다
- [ ] Drizzle ORM 스키마가 TypeScript 컴파일을 통과한다
- [ ] 모든 엑셀 데이터가 중간 형식(JSON)을 거쳐 DB에 적재된다
- [ ] AC-1 ~ AC-12 모든 인수 조건이 통과한다
- [ ] AC-11, AC-12 인수 조건 통과
- [ ] huni_code 4종 코드 체계 무결성 검증 통과
- [ ] 교차 검증 스크립트가 자동으로 실행 가능하다
- [ ] 견적 계산 golden test가 7가지 모델 모두 통과한다
- [ ] 테스트 커버리지 85% 이상

### 검증 도구

| 도구 | 용도 |
|------|------|
| Vitest | 단위 테스트, 견적 계산 golden test |
| 교차검증 스크립트 | 엑셀 원본 vs DB 건수/내용 비교 |
| Drizzle Studio | DB 데이터 시각적 확인 |
| PostgreSQL EXPLAIN | 쿼리 성능 검증 |
