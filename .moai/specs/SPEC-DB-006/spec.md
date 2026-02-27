# SPEC-DB-006: 가격 데이터 테이블 & 상품 구조 확장

---
id: SPEC-DB-006
version: 1.0.0
status: planned
created: 2026-02-27
updated: 2026-02-27
author: manager-spec
priority: high
depends_on:
  - SPEC-WB-001
  - SPEC-WB-002
  - SPEC-WB-003
  - SPEC-WB-004
  - SPEC-WB-005
  - SPEC-DB-001
  - SPEC-DB-002
  - SPEC-DB-003
  - SPEC-DB-004
  - SPEC-DB-005
---

## HISTORY

| Version | Date       | Author       | Description                        |
|---------|------------|--------------|------------------------------------|
| 1.0.0   | 2026-02-27 | manager-spec | 초기 SPEC 작성                      |

---

## 1. Context

### 1.1 이 SPEC이 다루는 것

후니프린팅 위젯빌더의 **가격 데이터 확장 & 상품 구조 확장** 시스템

- 4개 누락 가격 테이블: 제본비(binding_cost), 판걸이수(imposition_rule), 스티커단가(sticker_price), 아크릴단가(acrylic_price)
- 가격 데이터 관리자 UI: CRUD + CSV 벌크 임포트 + 인라인 편집 + 수량구간 충돌 검증
- 할인+제약 템플릿 시스템: qty_discount와 ECA 제약조건을 템플릿화하여 상품에 일괄 적용
- 애드온(기성상품) 상품 구조: 인쇄상품 + 기성상품 조합 지원을 위한 상품 분류 확장
- 멀티셀렉트 옵션 지원: 옵션 바인딩별 단일선택/복수선택 설정
- 가격 수식 미리보기: 관리자가 옵션 조합을 선택하면 계산 결과를 즉시 확인

### 1.2 이 SPEC이 다루지 않는 것

- 기존 가격 테이블 스키마 변경 (print_cost_base, postprocess_cost, qty_discount, product_price_configs는 그대로 유지)
- ECA 제약조건 엔진 자체 (SPEC-WB-003 담당)
- 가격 계산 로직 자체 (SPEC-WB-004 담당 - 단, 새 테이블 데이터를 계산 엔진에 연결하는 인터페이스는 이 SPEC에서 정의)
- 런타임 자동견적 엔진 (SPEC-WB-006 담당)
- 컬렉션/번들 상품 (SPEC-DB-007로 분리 - 본 SPEC에서는 설계 방향만 기술)
- WowPress 데이터 마이그레이션 (벤치마킹 참고만)
- Shopby/MES 가격 동기화

### 1.3 핵심 설계 원칙

> **기존 테이블 무변경 원칙**: print_cost_base, postprocess_cost, qty_discount, product_price_configs의 스키마는 변경하지 않는다. 새 가격 데이터는 새 테이블로 추가한다.

> **Excel-First, Then Extend 원칙**: 현재 후니프린팅 엑셀 가격표 구조를 그대로 DB에 반영한 후, 확장 기능(템플릿, 멀티셀렉트 등)을 추가한다.

> **Excel 가격 계산식 = 단일 기준점 (SSOT) 원칙**: 후니프린팅 가격 계산식은 엑셀 가격표(`가격표_extracted.json`)에 정리된 것이 메인이다. DB 테이블과 계산 엔진은 이 Excel 공식을 정확하게 구현하기 위한 수단이다. WowPress나 인쇄산업 표준은 설계 **참조**로만 사용한다. 새로운 가격 룰을 만들 때도 이 Excel 공식 체계를 기반으로 파생시킨다.

> **Formula-Managed 가격 구조**: 가격은 고정 숫자가 아니라 **관리 가능한 공식**이다. 관리자가 공식을 확인·수정·검증할 수 있어야 하며, 상품마스터의 계산식이 DB 조회 결과와 일치하는지 확인하는 기능이 필수다.

> **템플릿 재사용 원칙**: 할인/제약 템플릿은 기존 SPEC-WB-003의 `constraint_templates` 인프라를 확장하여 사용하며, 병렬 시스템을 새로 만들지 않는다.

> **상품 분류 확장**: 기존 `wb_products` 테이블에 `product_class` 컬럼을 추가하여 manufactured(인쇄)/catalog(기성)/addon(추가상품)을 구분한다.

---

## 2. Domain Model

### 2.1 누락 가격 테이블 (Layer 4 확장)

현재 SPEC-WB-004에서 정의한 4개 테이블(print_cost_base, postprocess_cost, qty_discount, product_price_configs)로는 커버되지 않는 가격 데이터 영역:

| 테이블 | 데이터 소스 | 적용 상품 | SPEC-WB-004 연결점 |
|--------|-----------|---------|------------------|
| `wb_binding_cost` | 가격표.제본 시트 (26행) | 책자/카탈로그 | PAGE 모드의 binding_cost 상세화 |
| `wb_imposition_rule` | 가격표.사이즈별판걸이수 (50행) | 모든 인쇄 상품 | PAGE 모드의 imposition 자동 결정 |
| `wb_sticker_price` | 가격표.스티커 시트 (327행) | 스티커류 | LOOKUP 모드의 스티커 전용 단가표 |
| `wb_acrylic_price` | 가격표.아크릴 시트 (15행) | 아크릴류 | COMPOSITE 모드의 아크릴 전용 단가표 |

### 2.2 제본비 구조

제본 방식(중철/무선/트윈링/PUR) x 페이지수 구간으로 단가가 결정된다.

```
binding_type_code: 101(중철), 102(무선), 103(트윈링), 104(PUR)
page_count_min ~ page_count_max: 페이지 수 구간
unit_price: 단가 (원)
```

### 2.3 판걸이수 규칙

재단 사이즈 코드 -> 판걸이 수(imposition count) 매핑. PAGE 모드 계산 시 `CEIL(inner_pages / imposition)`에서 사용.

### 2.4 스티커 단가

스티커 타입(반칼/전각) x 수량구간 x 레이아웃(판형) 조합으로 단가 결정.

### 2.5 아크릴 단가

사이즈 코드 x 수량구간으로 단가 결정. 직접 입력형 가격.

### 2.6 할인+제약 템플릿

수량할인 구간과 인쇄 제약조건을 묶어 **프리셋(preset)**으로 관리:

- **할인 템플릿**: qty_discount 세트를 템플릿으로 저장 -> 상품에 일괄 적용
- **제약 템플릿 확장**: 기존 constraint_templates (SPEC-WB-003)에 할인 조건 연계 지원 추가
- 예: "굿즈상품 + 고주파 공정 선택 시 -> 수량구간 할인율 적용" = ECA 제약조건 + qty_discount 연계

### 2.7 상품 분류 (Product Class)

| product_class | 설명 | 예시 |
|--------------|------|------|
| `manufactured` | 인쇄 생산 상품 (기본값) | 명함, 엽서, 스티커 |
| `catalog` | 기성상품 (재고 판매) | 거치대, 홀더, 케이스 |
| `addon` | 추가상품 (주문 시 추가 선택) | 양면테이프, 아일릿, 봉투 |

### 2.8 멀티셀렉트 옵션

현재 `recipe_option_bindings`는 모든 옵션이 단일선택(single-select)이다. 일부 옵션(후가공, 코팅)은 복수선택이 필요하다.

---

## 3. EARS Format Requirements

### FR-DB006-01: 누락 가격 테이블 스키마 정의

**[WHEN]** 시스템이 가격 계산 시 제본비/판걸이수/스티커단가/아크릴단가 데이터가 필요할 때,
**[THE SYSTEM SHALL]** 4개 신규 테이블(`wb_binding_cost`, `wb_imposition_rule`, `wb_sticker_price`, `wb_acrylic_price`)에서 해당 데이터를 조회한다.

**[IF]** 해당 조합의 단가 데이터가 존재하지 않으면,
**[THE SYSTEM SHALL]** "단가 미설정" 경고를 반환하고, 기존 SPEC-WB-004의 fallback 로직(0원 처리)을 따른다.

#### FR-DB006-01a: wb_binding_cost 테이블

```
wb_binding_cost
---
id                 serial PRIMARY KEY
binding_type_code  varchar(20) NOT NULL       -- '101'(중철), '102'(무선), '103'(트윈링), '104'(PUR)
binding_type_name  varchar(50) NOT NULL       -- 제본 방식 한국어명
page_count_min     integer NOT NULL           -- 페이지 수 구간 시작
page_count_max     integer NOT NULL           -- 페이지 수 구간 끝
unit_price         decimal(12,2) NOT NULL     -- 단가 (원)
is_active          boolean NOT NULL DEFAULT true
created_at         timestamptz NOT NULL DEFAULT now()
updated_at         timestamptz NOT NULL DEFAULT now()

INDEX idx_bc_type ON binding_type_code
INDEX idx_bc_lookup ON (binding_type_code, page_count_min)
```

#### FR-DB006-01b: wb_imposition_rule 테이블

```
wb_imposition_rule
---
id                 serial PRIMARY KEY
cut_size_code      varchar(50) UNIQUE NOT NULL -- 재단 사이즈 코드 (예: 'A4', 'A3', '90x50')
cut_size_name      varchar(100) NOT NULL       -- 사이즈 한국어명
imposition_count   integer NOT NULL            -- 판걸이 수
description        text                        -- 참고 설명
is_active          boolean NOT NULL DEFAULT true
created_at         timestamptz NOT NULL DEFAULT now()
updated_at         timestamptz NOT NULL DEFAULT now()

INDEX idx_ir_size ON cut_size_code
```

#### FR-DB006-01c: wb_sticker_price 테이블

```
wb_sticker_price
---
id                 serial PRIMARY KEY
sticker_type       varchar(30) NOT NULL        -- '반칼'(HALF_CUT), '전각'(FULL_CUT)
layout_code        varchar(50) NOT NULL        -- 판형/레이아웃 코드
layout_name        varchar(100)                -- 판형 한국어명
qty_min            integer NOT NULL            -- 수량 구간 시작
qty_max            integer NOT NULL            -- 수량 구간 끝
unit_price         decimal(12,2) NOT NULL      -- 단가 (원)
is_active          boolean NOT NULL DEFAULT true
created_at         timestamptz NOT NULL DEFAULT now()
updated_at         timestamptz NOT NULL DEFAULT now()

INDEX idx_sp_type ON sticker_type
INDEX idx_sp_lookup ON (sticker_type, layout_code, qty_min)
```

#### FR-DB006-01d: wb_acrylic_price 테이블

```
wb_acrylic_price
---
id                 serial PRIMARY KEY
size_code          varchar(50) NOT NULL        -- 사이즈 코드 (예: '50x50', '100x100')
size_name          varchar(100)                -- 사이즈 한국어명
qty_min            integer NOT NULL DEFAULT 1  -- 수량 구간 시작
qty_max            integer NOT NULL DEFAULT 999999  -- 수량 구간 끝
unit_price         decimal(12,2) NOT NULL      -- 단가 (원)
is_active          boolean NOT NULL DEFAULT true
created_at         timestamptz NOT NULL DEFAULT now()
updated_at         timestamptz NOT NULL DEFAULT now()

INDEX idx_ap_size ON size_code
INDEX idx_ap_lookup ON (size_code, qty_min)
```

### FR-DB006-02: 가격 데이터 관리자 UI

**[WHEN]** 관리자가 가격 데이터 관리 페이지에 진입할 때,
**[THE SYSTEM SHALL]** 기존 4개 테이블(print_cost_base, postprocess_cost, qty_discount, product_price_configs)과 신규 4개 테이블(binding_cost, imposition_rule, sticker_price, acrylic_price) 데이터를 탭 기반 UI로 표시한다.

#### FR-DB006-02a: 인라인 편집

**[WHEN]** 관리자가 가격 테이블의 행을 클릭할 때,
**[THE SYSTEM SHALL]** 해당 행을 인라인 편집 가능한 스프레드시트 형태로 전환한다.

**[WHEN]** 관리자가 편집된 데이터를 저장할 때,
**[THE SYSTEM SHALL]** Zod 스키마로 유효성 검증 후 저장하고, 실패 시 오류 위치를 셀 단위로 표시한다.

#### FR-DB006-02b: CSV/TOON 벌크 임포트

**[WHEN]** 관리자가 CSV 파일을 업로드할 때,
**[THE SYSTEM SHALL]** 파일을 파싱하고, 대상 테이블 스키마에 맞게 매핑하여 미리보기를 표시한다.

**[WHEN]** 관리자가 미리보기 확인 후 임포트를 실행할 때,
**[THE SYSTEM SHALL]** 트랜잭션으로 일괄 삽입하고, 성공/실패 건수를 보고한다.

**[IF]** CSV의 수량구간이 기존 데이터와 중복되면,
**[THE SYSTEM SHALL]** 충돌 행을 하이라이트하고 덮어쓰기/건너뛰기/취소 옵션을 제공한다.

#### FR-DB006-02c: 수량구간 충돌 검증

**[WHEN]** 관리자가 수량구간 데이터를 저장할 때,
**[THE SYSTEM SHALL]** 동일 조건 키(product_id + 추가 식별 키) 내에서 qty_min~qty_max 범위가 겹치는지 검증한다.

**[IF]** 수량구간이 겹치면,
**[THE SYSTEM SHALL]** 겹치는 행을 시각적으로 표시하고 저장을 차단한다.

#### FR-DB006-02d: Active/Inactive 토글

**[WHEN]** 관리자가 가격 행의 활성/비활성 토글을 변경할 때,
**[THE SYSTEM SHALL]** is_active 상태를 즉시 업데이트하고, 비활성 행은 회색 음영으로 표시한다.

**시스템은 항상** 비활성 행을 가격 계산에서 제외한다.

### FR-DB006-03: 할인 + 제약 템플릿 시스템

**[WHEN]** 관리자가 새 할인 템플릿을 생성할 때,
**[THE SYSTEM SHALL]** qty_discount 세트(수량구간 + 할인율 목록)를 템플릿으로 저장한다.

#### FR-DB006-03a: wb_discount_templates 테이블

```
wb_discount_templates
---
id                 serial PRIMARY KEY
template_key       varchar(100) UNIQUE NOT NULL  -- 템플릿 식별 키
template_name_ko   varchar(200) NOT NULL         -- 한국어 이름
description        text                          -- 설명
discount_rules     jsonb NOT NULL                -- [{qty_min, qty_max, discount_rate, label}]
is_system          boolean NOT NULL DEFAULT false -- 시스템 기본 템플릿 여부
is_active          boolean NOT NULL DEFAULT true
created_at         timestamptz NOT NULL DEFAULT now()
updated_at         timestamptz NOT NULL DEFAULT now()
```

#### FR-DB006-03b: 템플릿 상품 적용

**[WHEN]** 관리자가 할인 템플릿을 상품에 적용할 때,
**[THE SYSTEM SHALL]** 템플릿의 discount_rules를 해당 상품의 qty_discount 테이블에 일괄 삽입한다.

**[WHERE]** 해당 상품에 이미 qty_discount 데이터가 존재하면,
**[THE SYSTEM SHALL]** 기존 데이터 보존/교체/병합 옵션을 관리자에게 제공한다.

#### FR-DB006-03c: 제약조건+할인 연계 템플릿

**[WHEN]** 관리자가 "조건부 할인" 템플릿을 생성할 때,
**[THE SYSTEM SHALL]** 기존 constraint_templates (SPEC-WB-003) 구조를 확장하여, actions에 `apply_discount_template` 액션 타입을 추가한다.

```json
{
  "type": "apply_discount_template",
  "discount_template_id": 5,
  "override_mode": "replace"
}
```

**[IF]** ECA 제약조건이 발동되어 `apply_discount_template` 액션이 실행되면,
**[THE SYSTEM SHALL]** 해당 할인 템플릿의 할인율을 런타임 견적 계산에 적용한다.

#### FR-DB006-03d: 템플릿 수정 후 적용

**[WHEN]** 관리자가 템플릿을 상품에 적용한 후 일부 행을 수정할 때,
**[THE SYSTEM SHALL]** 수정된 데이터는 해당 상품의 개별 데이터로 저장하고, 템플릿 원본은 변경하지 않는다.

### FR-DB006-04: 애드온 상품(기성상품 추가) 지원 구조

**[WHEN]** 시스템이 상품 목록을 표시할 때,
**[THE SYSTEM SHALL]** `product_class` 컬럼을 기준으로 manufactured(인쇄)/catalog(기성)/addon(추가상품)을 구분하여 표시한다.

#### FR-DB006-04a: wb_products 테이블 확장

**[THE SYSTEM SHALL]** `wb_products` 테이블에 다음 컬럼을 추가한다:

```
product_class    varchar(20) NOT NULL DEFAULT 'manufactured'
                   CHECK IN ('manufactured', 'catalog', 'addon')
```

- `manufactured`: 인쇄 생산 상품 (기존 모든 상품의 기본값)
- `catalog`: 기성상품 (재고 판매)
- `addon`: 추가상품 (주문 시 추가 선택 가능)

**[WHEN]** `product_class`가 `catalog` 또는 `addon`인 상품이 등록될 때,
**[THE SYSTEM SHALL]** 해당 상품에 고정가격(fixed_price) 필드를 사용하여 가격을 설정한다.

#### FR-DB006-04b: 고정가격 필드

**[THE SYSTEM SHALL]** `wb_products` 테이블에 다음 컬럼을 추가한다:

```
fixed_price      decimal(12,2)                -- catalog/addon 상품의 고정가격 (NULL이면 가격 없음)
```

#### FR-DB006-04c: 애드온 상품과 addon_groups 연계

**[WHEN]** 관리자가 addon_group에 기성상품을 추가할 때,
**[THE SYSTEM SHALL]** 기존 SPEC-WB-003의 `addon_group_items` 테이블을 통해 연결한다.

**시스템은 항상** addon_group_items의 product_id가 `product_class` = 'addon' 또는 'catalog'인 상품만 참조하도록 애플리케이션 레이어에서 검증한다.

#### FR-DB006-04d: 주문 시 인쇄상품 + 기성상품 조합

**[WHEN]** 고객이 위젯에서 인쇄상품을 주문할 때,
**[THE SYSTEM SHALL]** 해당 상품의 활성 ECA 제약조건 중 `show_addon_list` 액션이 발동되면 addon_group의 상품 목록을 표시한다.

**[WHEN]** 고객이 addon_group에서 상품을 선택할 때,
**[THE SYSTEM SHALL]** 선택된 기성상품의 가격을 메인 상품 견적에 합산한다.

### FR-DB006-05: 멀티셀렉트 옵션 지원

**[WHEN]** 관리자가 레시피의 옵션 바인딩을 설정할 때,
**[THE SYSTEM SHALL]** 각 옵션 바인딩별로 `selection_mode` ('single' | 'multi')를 설정할 수 있다.

#### FR-DB006-05a: recipe_option_bindings 확장

**[THE SYSTEM SHALL]** `recipe_option_bindings` 테이블에 다음 컬럼을 추가한다:

```
selection_mode   varchar(10) NOT NULL DEFAULT 'single'
                   CHECK IN ('single', 'multi')
max_selections   integer                       -- multi 모드일 때 최대 선택 수 (NULL이면 무제한)
```

**[WHEN]** `selection_mode`가 `multi`인 옵션에서 고객이 여러 선택지를 선택할 때,
**[THE SYSTEM SHALL]** 선택된 모든 항목의 가격을 합산한다 (예: 후가공 복수 선택).

**[IF]** `max_selections`가 설정되어 있고 선택 수가 초과하면,
**[THE SYSTEM SHALL]** 추가 선택을 차단하고 "최대 N개까지 선택 가능" 메시지를 표시한다.

#### FR-DB006-05b: 하위 호환성

**시스템은 항상** 기존 `selection_mode` 기본값 'single'을 유지하여, 기존 레시피에 영향을 주지 않는다.

### FR-DB006-06: 컬렉션/번들 상품 (설계 방향)

> **범위 결정**: 컬렉션/번들 상품은 복잡도가 높아 별도 SPEC-DB-007로 분리한다.
> 이 SPEC에서는 향후 확장을 위한 설계 방향만 기술한다.

**설계 방향:**

- `wb_product_bundles` 테이블: bundle_id(부모) -> product_id(자식) 매핑
- 번들 가격 전략: SUM(개별가) / 할인율 적용 / 고정 번들가
- 번들 내 옵션 독립성: 각 상품의 옵션은 독립적으로 선택

**[IF]** 향후 번들 기능이 필요하면,
**[THE SYSTEM SHALL]** `wb_products.product_class`에 'bundle' 값을 추가하고 `wb_product_bundles` 테이블을 생성한다.

### FR-DB006-07: 가격 수식 미리보기

**[WHEN]** 관리자가 가격 설정 화면에서 "미리보기" 버튼을 클릭하고 옵션 조합을 선택할 때,
**[THE SYSTEM SHALL]** 해당 조합에 대해 SPEC-WB-004의 가격 계산 엔진을 호출하고, 계산 내역을 단계별로 표시한다.

**[THE SYSTEM SHALL]** 미리보기 결과에 다음 항목을 포함한다:
- 기본 출력비 (print_cost): 어떤 테이블에서 조회했는지 표시
- 후가공비 (process_cost): 선택된 후가공 항목별 단가 내역
- 수량할인 (discount): 적용된 구간과 할인율
- 최종가 (total): `(print_cost + process_cost) x (1 - discount)`
- 단가 (price_per_unit): 총액 / 수량

**[IF]** 조회된 가격 데이터가 없는 항목이 있으면,
**[THE SYSTEM SHALL]** 해당 항목을 "미설정" 으로 표시하고 경고 아이콘을 표시한다.

---

## 4. WowPress 벤치마킹 참고

### 4.1 분석 요약

WowPress 데이터(ref/wowpress/catalog/ - 326개 상품, 47개 카테고리) 분석 결과:

- **상품 구조**: 모든 상품이 단일 selType('M')으로 통일. additionalOptions는 대부분 비어있음.
- **옵션 구조**: orderQuantities, coverTypes, additionalOptions 3개 키로 구성.
- **번들/애드온**: WowPress 데이터에서 명시적 addon/bundle 구조는 발견되지 않음.
- **멀티셀렉트**: WowPress는 옵션 조합 방식(coverType + quantity + additionalOption)으로 처리.

### 4.2 설계 시사점

WowPress는 인쇄업 특화 플랫폼이지만, 후니프린팅의 요구사항(기성상품 추가, 멀티셀렉트 후가공)과는 구조가 다르다. 후니프린팅 고유의 Excel 기반 상품 구조를 우선 반영하고, WowPress의 카테고리 체계는 참고 수준으로 활용한다.

---

## 5. 의존성 및 영향 분석

### 5.1 기존 SPEC 의존성

| SPEC | 관계 | 영향 |
|------|------|------|
| SPEC-WB-001 | option_element_types의 type_key 참조 | selection_mode 확장 |
| SPEC-WB-002 | products, recipe_option_bindings 참조 | product_class 추가, selection_mode 추가 |
| SPEC-WB-003 | constraint_templates, addon_groups 참조 | apply_discount_template 액션 추가 |
| SPEC-WB-004 | 가격 계산 엔진 | 신규 가격 테이블 연동 인터페이스 |
| SPEC-WB-005 | 관리자 UI | 가격 관리 페이지 추가 |
| SPEC-DB-001~005 | DB 스키마 기반 | 신규 마이그레이션 추가 |

### 5.2 기존 테이블 변경 사항 (ALTER TABLE)

| 테이블 | 변경 내용 | 호환성 |
|--------|---------|--------|
| `wb_products` | ADD `product_class` varchar(20) DEFAULT 'manufactured' | 하위 호환 (기본값) |
| `wb_products` | ADD `fixed_price` decimal(12,2) DEFAULT NULL | 하위 호환 (nullable) |
| `recipe_option_bindings` | ADD `selection_mode` varchar(10) DEFAULT 'single' | 하위 호환 (기본값) |
| `recipe_option_bindings` | ADD `max_selections` integer DEFAULT NULL | 하위 호환 (nullable) |

### 5.3 신규 테이블

| 테이블 | Layer | 행 수 예상 | 데이터 소스 |
|--------|-------|----------|-----------|
| `wb_binding_cost` | 4 | ~26행 | 가격표.제본 시트 |
| `wb_imposition_rule` | 4 | ~50행 | 가격표.사이즈별판걸이수 시트 |
| `wb_sticker_price` | 4 | ~327행 | 가격표.스티커 시트 |
| `wb_acrylic_price` | 4 | ~15행 | 가격표.아크릴 시트 |
| `wb_discount_templates` | 4 | ~10행 (초기) | 관리자 생성 |

---

## 6. Acceptance Criteria (요약)

상세 수락 기준은 `acceptance.md`에 정의.

- AC-DB006-01: 4개 신규 가격 테이블의 CRUD 동작
- AC-DB006-02: 관리자 UI 인라인 편집 & 벌크 임포트
- AC-DB006-03: 수량구간 충돌 검증
- AC-DB006-04: 할인 템플릿 생성/적용/수정
- AC-DB006-05: product_class 분류 및 고정가격
- AC-DB006-06: 멀티셀렉트 옵션 동작
- AC-DB006-07: 가격 미리보기 계산 정확도

---

## 7. Open Questions

1. **스티커 단가표의 layout_code 체계**: 가격표 스티커 시트의 판형 코드 매핑은 데이터 임포트 시 결정 (시드 스크립트에서 처리)

2. **제본비와 product_price_configs 관계**: 현재 product_price_configs의 binding_cost 필드는 단순 금액이다. wb_binding_cost 테이블은 페이지수별 세분화된 단가를 제공한다. PAGE 모드 계산 시 wb_binding_cost를 우선 조회하고, 없으면 product_price_configs.binding_cost를 fallback으로 사용할 것인지?

3. **apply_discount_template 액션의 ECA 등록**: SPEC-WB-003의 8종 액션에 9번째 액션을 추가하는 것이므로, SPEC-WB-003 v2.1.0 업데이트가 필요한지?

4. **컬렉션/번들 분리 시점**: SPEC-DB-007로 분리한 번들 상품 기능의 우선순위와 일정

---

## 8. 아키텍처 컨텍스트

```
[SPEC-WB-001] 옵션 어휘
      ↓ selection_mode 확장
[SPEC-WB-002] 카테고리 + 레시피 + 상품
      ↓ product_class 추가
[SPEC-WB-003] 제약조건 (ECA)
      ↓ apply_discount_template 액션 추가
[SPEC-WB-004] 가격 계산 엔진
      ↓ 신규 가격 테이블 연동
[SPEC-DB-006] 가격 데이터 & 상품 구조 확장 (이 문서)
      → wb_binding_cost, wb_imposition_rule, wb_sticker_price, wb_acrylic_price
      → wb_discount_templates
      → wb_products 확장 (product_class, fixed_price)
      → recipe_option_bindings 확장 (selection_mode, max_selections)
      → 가격 관리 Admin UI
      ↓
[SPEC-WB-005] 관리자 콘솔
      ↓
[SPEC-WB-006] 런타임 자동견적 엔진
```

---

*SPEC-DB-006 v1.0.0 -- Planned 2026-02-27*
*후니프린팅 위젯빌더: 가격 데이터 확장 + 상품 구조 확장 + 멀티셀렉트 + 템플릿 시스템*
