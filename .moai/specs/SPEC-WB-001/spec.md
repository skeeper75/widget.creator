# SPEC-WB-001: Option Element Type Library

**Version:** 1.3.0
**Date:** 2026-02-25
**Status:** Completed
**Parent:** Widget Builder DB Architecture

---

## 1. Context

### 1.1 이 SPEC이 다루는 것

후니프린팅 위젯빌더의 **옵션 어휘 정의 시스템** (Option Vocabulary System)

인쇄 상품은 규격, 재질, 도수, 후가공, 제본 등의 옵션 조합으로 구성된다.
이 옵션들의 **타입 분류 체계**와 **선택지 라이브러리**를 정의한다.

### 1.2 이 SPEC이 다루지 않는 것

- WowPress 연동 (별도 SPEC-WB-INT-001)
- 상품에 옵션 배치하는 레시피 (SPEC-WB-002)
- 옵션 간 제약조건 (SPEC-WB-003)
- 가격 계산 (SPEC-WB-005)

### 1.3 핵심 원칙

> **외부 시스템(MES, Shopby 등)은 위젯 빌더의 도메인 모델에 영향을 주지 않는다.**
> 위젯 빌더는 연결자(Hub)의 역할만 수행한다.
> 장비 의존성은 MES가 관리하며, 위젯 빌더는 MES 코드를 참조만 한다.
> 외부 플랫폼 연동은 별도 SPEC-WI-* 시리즈에서 처리한다.

### 1.4 ID/Key 설계 원칙 [HARD]

**"타 플랫폼 매칭/연동에 필요한 경우를 제외하고 모든 키와 코드는 새롭게 설계된다."**

| 항목 | 설계 방식 | 예시 |
|------|---------|------|
| 내부 PK (`id`) | auto-increment serial 또는 UUID v4 | `1`, `2`, `3` |
| 비즈니스 키 (`type_key`, `choice_key`) | 위젯 빌더 도메인 기준으로 신규 설계 | `'SIZE'`, `'PRINT_TYPE'` |
| 외부 MES 참조 (`mes_code`) | MES와 매핑 시에만 사용, nullable | `'4'`, `'8'` |
| 외부 Shopby 참조 (`shopby_*`) | Shopby 연동 시에만 사용 (SPEC-WI-001) | 별도 관리 |

**금지 사항:**
- Excel 파일의 컬럼명, MES 내부 코드, Shopby 필드명을 그대로 내부 키로 사용하지 않는다
- `data/products/003-0001.json`과 같은 기존 JSON 파일의 구조를 그대로 DB 스키마에 투영하지 않는다
- 외부 시스템 코드가 없을 때 해당 기능이 동작 불가한 구조로 설계하지 않는다

---

## 2. Domain Model

### 2.1 Option Element Type (옵션 요소 타입)

인쇄 상품을 구성하는 옵션의 **종류(분류)**를 정의한다.

예: 규격(SIZE), 재질(PAPER), 도수(COLOR_MODE), 후가공(FINISHING), 제본(BINDING), 수량(QUANTITY), 페이지수(PAGE_COUNT)

**성질:**
- 타입은 `type_key`로 식별되는 고유한 개념이다 (예: 'SIZE')
- 타입은 어떤 UI 컨트롤로 표현되는지(select, multiselect, number_input, range_input, group)를 갖는다
- 타입은 사용자 정의 입력(비규격 크기 직접 입력 등)을 허용하는지 여부를 갖는다
- 타입은 `option_category`로 자재/공정/규격/수량으로 분류된다 (MES 처리 파이프라인 라우팅용)
- 타입은 후니프린팅의 비즈니스 개념이며 특정 외부 시스템에 종속되지 않는다

**option_category 분류:**
| option_category | 해당 타입 | MES 처리 |
|----------------|---------|---------|
| `material` (자재) | PAPER, COVER_PAPER, INNER_PAPER | 자재 소요량 계산 |
| `process` (공정) | PRINT_TYPE, FINISHING, BINDING, COATING | 공정 작업지시 생성 |
| `spec` (규격) | SIZE, PAGE_COUNT | 재단/규격 정의 |
| `quantity` (수량) | QUANTITY | 생산 수량 결정 |
| `group` (UI 그룹) | FOIL_STAMP 등 | 하위 옵션으로 분해 처리 |

### 2.2 Option Element Choice (옵션 요소 선택지)

각 옵션 타입에 속하는 **구체적인 선택지** 라이브러리다.

예:
- SIZE 타입의 선택지: '90×50mm 명함', 'A4(210×297mm)', 'B5(182×257mm)'
- PAPER 타입의 선택지: '아트지 100g', '모조지 80g', '코팅지 350g'
- COLOR_MODE 타입의 선택지: '단면 1도', '단면 4도', '양면 4도+4도'

**성질:**
- 선택지는 `choice_key`로 식별된다 (타입 내에서 고유)
- 선택지는 고객에게 보여지는 `display_name`을 갖는다
- 선택지는 내부 계산/처리에 사용되는 `value`를 갖는다
- SIZE 타입 선택지는 가로(mm), 세로(mm), 재단여분(mm)을 갖는다
- PAPER 타입 선택지는 평량(g/m²)을 갖는다
- 선택지는 후니프린팅의 내부 코드(MES 코드)와 연결될 수 있다
- 선택지는 가격 테이블 연결키(`price_key`)를 가질 수 있다 (SPEC-WB-005 가격 계산에서 사용)
- 선택지는 타입 내에서 표시 순서를 갖는다

---

## 3. EARS Format Requirements

### FR-WB001-01: 옵션 타입 생성

**[WHEN]** 시스템 관리자가 새로운 옵션 타입을 등록할 때,
**[THE SYSTEM SHALL]** `type_key` (영문 대문자+언더스코어, 최대 50자), `type_name_ko` (한국어), `type_name_en` (영어), `ui_control` (shadcn 기반 컨트롤명, Section 4.5 참조), `option_category` ('material'|'process'|'spec'|'quantity'|'group')를 필수 입력으로 받아 저장한다.

**[IF]** 동일한 `type_key`가 이미 존재하면,
**[THE SYSTEM SHALL]** 중복 오류를 반환하고 저장을 거부한다.

**[WHEN]** `allows_custom`이 true로 설정된 타입(예: SIZE)에서 고객이 직접 수치를 입력할 때,
**[THE SYSTEM SHALL]** 해당 입력을 표준 선택지와 동일하게 처리할 수 있는 구조로 저장한다.

### FR-WB001-02: 옵션 선택지 생성 및 관리

**[WHEN]** 관리자가 특정 옵션 타입에 새 선택지를 추가할 때,
**[THE SYSTEM SHALL]** `type_id`, `choice_key`, `display_name`을 필수 입력으로 받아 저장한다.

**[IF]** 동일 타입 내에서 `choice_key`가 중복되면,
**[THE SYSTEM SHALL]** 중복 오류를 반환한다.

**[WHEN]** SIZE 타입의 선택지가 저장될 때,
**[THE SYSTEM SHALL]** `width_mm`, `height_mm`, `bleed_mm` 필드를 추가 저장할 수 있어야 한다.

**[WHEN]** PAPER 타입의 선택지가 저장될 때,
**[THE SYSTEM SHALL]** `basis_weight_gsm` (평량, 정수) 필드를 추가 저장할 수 있어야 한다.

**[WHEN]** 관리자가 선택지를 비활성화할 때,
**[THE SYSTEM SHALL]** 해당 선택지를 삭제하지 않고 `is_active = false`로 처리하며, 기존 주문 기록의 무결성을 유지한다.

### FR-WB001-03: 선택지 표시 순서 관리

**[WHEN]** 관리자가 선택지 목록의 순서를 변경할 때,
**[THE SYSTEM SHALL]** `display_order` 값을 업데이트하고 즉시 고객 위젯 UI에 반영한다.

**[WHERE]** 동일한 `display_order`를 가진 선택지가 여러 개일 때,
**[THE SYSTEM SHALL]** `id` 오름차순을 보조 정렬 기준으로 사용한다.

### FR-WB001-04: 외부 코드 연결 (MES 참조)

**[WHEN]** 관리자가 선택지에 MES 코드를 연결할 때,
**[THE SYSTEM SHALL]** `mes_code` 필드에 저장하고, 동일 타입 내에서 `mes_code`는 고유해야 한다.

**[IF]** MES 코드가 없는 선택지는,
**[THE SYSTEM SHALL]** 견적/주문 기능은 그대로 동작하되, MES 시스템 연동 시 경고를 표시한다.

**외부 코드 설계 원칙:**
- `mes_code`는 MES 시스템 연동 시에만 필요한 **참조 코드**이며, 내부 도메인 로직에 사용하지 않는다
- MES 장비 의존성은 MES가 관리한다. 위젯 빌더는 `mes_code`로 MES에 작업을 전달하는 역할만 한다
- Excel의 MES 코드(품목코드 형식)는 연동 필요 시에만 `mes_code`에 매핑한다

### FR-WB001-06: 수량구간별할인 정책 연동

**[WHEN]** 특정 상품 옵션 타입(QUANTITY)에 수량구간별할인이 적용될 때,
**[THE SYSTEM SHALL]** 해당 정책을 가격 계산 레이어(SPEC-WP-001)에 위임하고, 위젯 빌더는 수량 값만 전달한다.

> **NOTE**: 수량구간별할인(volume discount)은 가격 정책이다.
> - DB 관리 위치: SPEC-WP-001 (Widget Pricing) — `pricing_tiers` 테이블
> - 이 SPEC(WB-001)의 QUANTITY 타입은 수량 "선택지" 정의만 담당한다
> - 할인율, 구간 경계 등의 비즈니스 룰은 SPEC-WP-001에서 정의한다
> - Excel '폴더(파일저장폴더)' 컬럼의 수량구간 데이터는 SPEC-WP-001 설계 시 참조

### FR-WB001-05: 표준 타입 초기 데이터

**[WHEN]** 시스템이 처음 설치될 때,
**[THE SYSTEM SHALL]** 다음 12개의 표준 인쇄 옵션 타입을 기본값으로 제공한다:

| type_key | type_name_ko | ui_control | option_category | allows_custom |
|----------|-------------|-----------|----------------|--------------|
| SIZE | 규격 | toggle-group | spec | true |
| PAPER | 재질 | select | material | false |
| PRINT_TYPE | 인쇄도수 | toggle-group | process | false |
| FINISHING | 후가공 | toggle-multi | process | false |
| COATING | 코팅 | toggle-group | process | false |
| BINDING | 제본 | toggle-group | process | false |
| QUANTITY | 수량 | number-stepper | quantity | true |
| PAGE_COUNT | 페이지수 | number-stepper | spec | false |
| ADD_ON | 부자재 | toggle-multi | material | false |
| COVER_PAPER | 표지재질 | select | material | false |
| INNER_PAPER | 내지재질 | select | material | false |
| FOIL_STAMP | 박/형압 | collapsible | group | false |

> **`ui_control` 값은 Figma 디자인 분석 기반 shadcn 컴포넌트명으로 표준화됨.**
> Section 4.5 참조: Figma 컴포넌트 → `ui_control` 매핑표
>
> **참고**: `PRINT_TYPE` = '단면'/'양면' 선택 (Figma: toggle-group 2개 버튼).
> MES 연동 시 mes_code로 매핑 (관리자가 수동 입력). 기본값 없음.
> `COATING`은 책자류에서 `FINISHING`과 별도 관리 (Figma: 각각 별도 toggle-group).

---

## 4. DB Schema

### 4.1 테이블: `option_element_types`

위치: `packages/db/src/schema/widget/01-element-types.ts`

```
option_element_types
─────────────────────────────────────────────
id               serial PRIMARY KEY
type_key         varchar(50) UNIQUE NOT NULL
type_name_ko     varchar(100) NOT NULL
type_name_en     varchar(100) NOT NULL
ui_control       varchar(30) NOT NULL
                   CHECK IN (
                     'toggle-group',    -- shadcn ToggleGroup (type="single") — 칩 버튼 단일 선택
                     'toggle-multi',    -- shadcn ToggleGroup (type="multiple") — 칩 버튼 다중 선택
                     'select',          -- shadcn Select — 드롭다운 단일 선택 (긴 목록)
                     'number-stepper',  -- custom NumberField — +/- 버튼 수량 입력
                     'slider',          -- shadcn Slider — 범위 슬라이더
                     'checkbox',        -- shadcn Checkbox — 체크박스
                     'collapsible',     -- shadcn Collapsible — 접힌/펼쳐진 그룹
                     'color-swatch',    -- custom — 색상 스와치 선택 (박/형압 색상 등)
                     'image-toggle',    -- ToggleGroup with thumbnails — 이미지 선택 (합지여 등)
                     'text-input'       -- shadcn Input — 직접 텍스트/치수 입력
                   )
option_category  varchar(20) NOT NULL DEFAULT 'spec'
                   CHECK IN ('material','process','spec','quantity','group')
                   -- material=자재, process=공정, spec=규격, quantity=수량, group=UI그룹핑
allows_custom    boolean NOT NULL DEFAULT false
display_order    integer NOT NULL DEFAULT 0
is_active        boolean NOT NULL DEFAULT true
description      text
created_at       timestamptz NOT NULL DEFAULT now()
updated_at       timestamptz NOT NULL DEFAULT now()

INDEX idx_oet_type_key      ON type_key
INDEX idx_oet_active        ON is_active WHERE is_active = true
INDEX idx_oet_category      ON option_category
```

### 4.2 테이블: `option_element_choices`

```
option_element_choices
─────────────────────────────────────────────
id               serial PRIMARY KEY
type_id          integer NOT NULL REFERENCES option_element_types(id) ON DELETE CASCADE
choice_key       varchar(100) NOT NULL
display_name     varchar(200) NOT NULL
value            varchar(100)           -- 내부 처리값 (계산, API 요청 시 사용)
mes_code         varchar(100)           -- MES 시스템 코드 (nullable)
display_order    integer NOT NULL DEFAULT 0
is_active        boolean NOT NULL DEFAULT true
is_default       boolean NOT NULL DEFAULT false

-- SIZE 타입 전용 필드
width_mm         decimal(8,2)           -- 가로 (mm)
height_mm        decimal(8,2)           -- 세로 (mm)
bleed_mm         decimal(4,2)           -- 재단 여분 (mm), 기본값 3

-- PAPER 타입 전용 필드
basis_weight_gsm integer                -- 평량 (g/m²)

-- FINISHING 타입 전용 필드
finish_category  varchar(50)            -- 표준값: '무광코팅'|'UV코팅'|'수성코팅'|'양면코팅'|
                                        --         '2단접지'|'3단접지'|'Z접지'|
                                        --         '반칼'|'완칼'|'시트커팅'|'레이저커팅'|
                                        --         '전사인쇄'|'UV평판'|'화이트인쇄'|
                                        --         '미싱'|'형압'|'에폭시'|'금박'|'은박'

-- 시각적 UI 메타데이터 (architect 리서치: 14개 UI 컴포넌트 타입 분석 결과)
thumbnail_url    varchar(500)           -- 재질 이미지, 색상 견본 등 미리보기 URL
color_hex        varchar(7)             -- COLOR_MODE 전용: 색상 코드 (예: '#FFCC00')
price_impact     varchar(50)            -- 가격 영향 힌트 (예: '+500원', '×1.3', '포함')

-- 가격 연결 (SPEC-WB-005)
price_key        varchar(200)           -- 가격 테이블 연결키 (예: '랑데뷰 울트라화이트 240g', '무광코팅')

metadata         jsonb                  -- 기타 타입별 확장 데이터
created_at       timestamptz NOT NULL DEFAULT now()
updated_at       timestamptz NOT NULL DEFAULT now()

UNIQUE uq_oec_type_choice ON (type_id, choice_key)
INDEX  idx_oec_type_id    ON type_id
INDEX  idx_oec_mes_code   ON mes_code WHERE mes_code IS NOT NULL
INDEX  idx_oec_active     ON (type_id, is_active) WHERE is_active = true
```

### 4.3 타입 전용 필드 제약

SIZE 타입: `width_mm`, `height_mm` NOT NULL (allows_custom이 false인 경우)
PAPER 타입: `basis_weight_gsm` 권장 (nullable)
기타 타입: 타입 전용 필드는 NULL 허용, metadata jsonb 활용

### 4.4 ui_control — Figma 컴포넌트 대응표

Figma 디자인(`ref/figma/01~11.png`) 분석 기반. shadcn/ui 컴포넌트명으로 표준화.

| ui_control | shadcn/ui 컴포넌트 | Figma 사용 예 | 비고 |
|------------|------------------|-------------|------|
| `toggle-group` | `ToggleGroup type="single"` | 사이즈, 인쇄도수, 코팅, 제본 | 가장 빈번 |
| `toggle-multi` | `ToggleGroup type="multiple"` | 후가공, 부자재 | 다중 선택 가능 |
| `select` | `Select` | 용지, 표지종이, 내지종이, 조건수 | 20개 이상 옵션 |
| `number-stepper` | custom + `Input` | 수량, 페이지수, 권수 | +/- 버튼 UI |
| `slider` | `Slider` | (현재 미사용) | 범위 선택 시 사용 |
| `checkbox` | `Checkbox` | (현재 미사용) | 단순 on/off |
| `collapsible` | `Collapsible` | 박/형압 그룹 | 접힘 가능 섹션 |
| `color-swatch` | custom | 박달만 색상, 특지빈 색상 | 원형 색상 선택 |
| `image-toggle` | `ToggleGroup` + thumbnail | 합지여(책자 제본 스타일) | 썸네일 이미지 |
| `text-input` | `Input` | 박달만 크기 직접입력 | "90x50mm" 형식 |

> **Figma 원본**: `ref/figma/01. PRODUCT_PRINT_OPTION.png` 외 10개 파일
> **주의**: `ui_control`은 기본 렌더링 힌트다. 레시피 레이어(SPEC-WB-002)에서 상품별로 override 가능.

### 4.5 display_order 설계 원칙

`option_element_choices.display_order` = **라이브러리 기본 표시 순서** (전역 기본값)

> **중요**: 고객 화면의 표시 순서(display_order)와 내부 가격계산 처리 순서(processing_order)는
> **다를 수 있다**. 이 두 순서의 분리는 레시피 바인딩 레이어(SPEC-WB-002)에서 관리한다.
>
> - `option_element_choices.display_order`: 라이브러리 기본값 (이 SPEC 담당)
> - `recipe_option_bindings.display_order`: 특정 상품 레시피에서의 표시 순서 (SPEC-WB-002)
> - `recipe_option_bindings.processing_order`: 가격계산/MES 처리 순서 (SPEC-WB-002)

---

## 5. API Endpoints

### GET /api/widget/option-types
옵션 타입 전체 목록 조회

**Response:**
```json
{
  "types": [
    {
      "id": 1,
      "typeKey": "SIZE",
      "typeNameKo": "규격",
      "typeNameEn": "Size",
      "uiControl": "select",
      "allowsCustom": true,
      "displayOrder": 0
    }
  ]
}
```

### GET /api/widget/option-types/:typeKey/choices
특정 타입의 선택지 목록 조회 (active만 반환)

### POST /api/admin/widget/option-types
새 옵션 타입 생성 (관리자 전용)

### POST /api/admin/widget/option-types/:typeKey/choices
새 선택지 추가 (관리자 전용)

### PATCH /api/admin/widget/option-types/:typeKey/choices/:choiceKey
선택지 수정 (display_order, is_active, display_name 등)

---

## 6. Acceptance Criteria

### AC-WB001-01: 타입 시스템 무결성
- [ ] 10개 표준 타입이 시스템 설치 시 자동 시드됨
- [ ] `type_key` 중복 시 409 Conflict 반환
- [ ] SIZE 타입 선택지 생성 시 `width_mm`, `height_mm` 없으면 400 Bad Request

### AC-WB001-02: 선택지 라이브러리
- [ ] 선택지 비활성화 후에도 기존 DB 레코드에서 참조 무결성 유지
- [ ] `display_order` 변경이 즉시 조회 응답에 반영됨
- [ ] MES 코드 없는 선택지도 정상 동작 (경고만 표시)

### AC-WB001-03: 확장성
- [ ] 새 옵션 타입 추가 시 기존 테이블/API 변경 없이 동작
- [ ] `metadata` jsonb를 통해 타입 전용 필드 없이도 추가 데이터 저장 가능

### AC-WB001-04: 성능
- [ ] 전체 타입 목록 조회 응답 50ms 이내
- [ ] 선택지 목록 조회 (최대 100개) 응답 100ms 이내

---

## 7. Migration Notes

### 기존 데이터와의 관계

이 SPEC은 기존 `option_templates`, `option_choices`, `product_options` 테이블과 **독립적**이다.
기존 테이블은 그대로 유지되며, 새 테이블과 병렬 운영된다.

기존 → 새 테이블 데이터 마이그레이션은 **SPEC-WB-MIG-001**에서 별도로 다룬다.

### 외부 시스템 연동 방침

이 SPEC의 DB 스키마에는 외부 시스템(Shopby, WowPress, MES) 전용 필드가 **없다**.

외부 코드 매핑은 별도 연동 SPEC에서 관리:
- Shopby 연동 → SPEC-WI-001 (shopby_product_mappings 테이블)
- MES 코드 → `option_element_choices.mes_code` (nullable 참조 필드, 위젯 빌더 자체 도메인과 분리)

데이터 초기 입력 방법:
- Excel 암묵지 → 관리자 화면에서 수동 입력 (Excel 직접 파싱 불가)
- 옵션 타입/선택지 라이브러리는 관리자 화면에서 구축

---

## 8. Open Questions

1. ~~`finish_category` 필드의 표준값 목록을 어떻게 정의할 것인가?~~
   **[해소 2026-02-25]** PDF 인쇄타입 분석으로 표준값 확정 → 4.1 스키마 주석 참조.
   (무광코팅/UV코팅/수성코팅/반칼/완칼/시트커팅/레이저커팅/전사인쇄/UV평판/미싱/형압/에폭시/금박/은박)

2. 타입별 전용 필드를 별도 테이블로 분리할 것인가, 아니면 sparse columns + metadata jsonb로 관리할 것인가?
   **[보류]** SIZE/PAPER/FINISHING은 전용 컬럼(3-4개 이하), 나머지는 metadata jsonb로 결정.
   타입이 많아질 경우 별도 테이블 분리 검토 (SPEC-WB-002 결정 후 재확인).

3. SIZE 타입의 `allows_custom = true`일 때 직접 입력된 비표준 규격은 어떻게 저장되는가?
   **[SPEC-WB-002에서 결정]** 레시피 바인딩 시 비표준 규격 처리 방식을 다룬다.
   옵션: (a) 임시 choice 생성 (is_active=false로 아카이브), (b) 주문 레코드에 직접 저장

4. `ui_control` 값은 옵션 타입 레벨에서 정의되나, 실제 상품마다 다르게 렌더링해야 할 경우(예: 어떤 상품은 SIZE를 toggle-group, 다른 상품은 select로 표시)가 있는가?
   **[미결]** SPEC-WB-002 recipe_option_bindings에 `ui_control_override` 필드 추가 여부 검토.

5. `color-swatch`, `image-toggle` 컴포넌트는 shadcn 기본 컴포넌트가 아닌 커스텀 구현이 필요하다.
   컴포넌트 스펙(props, 데이터 형식)은 SPEC-WU-001(UI Component Layout)에서 정의.
   **[SPEC-WU-001 의존]**

---

## 9. 아키텍처 컨텍스트

이 SPEC은 더 큰 도메인 체인의 첫 번째 레이어다:

```
[SPEC-WB-001] 옵션 어휘 (이 문서)
      ↓ 레시피가 선택지를 참조
[SPEC-WB-002] 카테고리 계층 + 레시피 + 장비 의존성
      ↓ 레시피 옵션에 제약조건 부착
[SPEC-WB-003] ECA 제약조건 시스템 (json-rules-engine + AI 자연어)
      ↓ 선택된 옵션 조합으로 가격 계산
[SPEC-WB-004] 가격룰 & 계산 엔진 (LOOKUP/AREA/PAGE/COMPOSITE)
      ↓ 관리자 콘솔에서 WB-001~004 오케스트레이션
[SPEC-WB-005] 관리자 콘솔 & 시뮬레이션 (6단계 위저드)
      ↓ 고객 런타임 자동견적
[SPEC-WB-006] 런타임 자동견적 엔진 (Quote API + 주문 + MES)
```

**핵심 설계 원칙**: 위젯빌더는 "요리 결과물을 만들기 위한 레시피"를 구성하는 도구다.
옵션 어휘(SPEC-WB-001) = 재료 라이브러리, 레시피(SPEC-WB-002) = 요리 카드.

---

---

## 10. Implementation Notes

**Implementation Date:** 2026-02-26
**Package Created:** @widget-creator/db (packages/db/)
**Commit:** b5a6dbd (feat(db): initialize @widget-creator/db package with option element schemas (SPEC-WB-001))

### Key Files

**Schema Files:**
- `packages/db/src/schema/widget/01-element-types.ts` — `option_element_types` table definition
- `packages/db/src/schema/widget/02-element-choices.ts` — `option_element_choices` table definition

**Seed Data:**
- `packages/db/src/seed/widget-types.ts` — 12 standard print option types (SIZE, PAPER, PRINT_TYPE, FINISHING, COATING, BINDING, QUANTITY, PAGE_COUNT, ADD_ON, COVER_PAPER, INNER_PAPER, FOIL_STAMP)

**Exports:**
- `packages/db/src/index.ts` — Main entry point (re-exports schemas and seed functions)
- `packages/db/src/schema/index.ts` — Schema barrel exports

### Test Coverage

- **Test Files:** 4 test suites in `packages/db/__tests__/`
  - `__tests__/schema/element-types.test.ts` — Type system validation
  - `__tests__/schema/element-choices.test.ts` — Choices library validation
  - `__tests__/seed/widget-types.test.ts` — Seed data validation
  - `__tests__/index.test.ts` — Export validation

- **Test Count:** 79 passing tests
- **Coverage:** 86% (target: 85%) ✅

### Quality Metrics

- **TypeScript:** Zero type errors
- **All Tests:** 79/79 passed
- **Coverage Target:** 85%+ achieved
- **MX Tags:** ANCHOR/NOTE/REASON annotations in key functions

### Architecture Decisions

1. **Sparse Columns Pattern:** SIZE, PAPER, FINISHING type-specific fields stored as nullable columns in single table (not separate table)
2. **Metadata JSONB:** Extensible `metadata` jsonb field for future type-specific data without schema changes
3. **Soft Deletes:** `is_active` boolean flag for non-destructive choice deactivation, preserving referential integrity
4. **MES Code Optional:** `mes_code` nullable reference field allows widget operation without MES mapping

### Design Patterns

- **Type-Safe Schema:** Full TypeScript type inference via Drizzle ORM
- **Relationship Definitions:** Full relational mapping with ON DELETE CASCADE from choices to types
- **Index Optimization:** Indexes on frequently-queried fields (type_key, choice type_id+is_active, mes_code)
- **Business Key Uniqueness:** UNIQUE constraints on (type_id, choice_key) and mes_code per type

---

*SPEC-WB-001 v1.1.0 — Implementation Complete*
*후니프린팅 위젯빌더의 독립적인 옵션 어휘 시스템. WowPress 등 외부 시스템 종속 없음.*
*업데이트: finish_category 표준값 확정, dual sort order 설계 원칙 추가, 아키텍처 컨텍스트 추가.*
*구현일: 2026-02-26, 패키지: @widget-creator/db, 커버리지: 86%*
