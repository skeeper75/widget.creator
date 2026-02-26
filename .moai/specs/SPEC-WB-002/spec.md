# SPEC-WB-002: Product Category & Recipe System

**Version:** 1.6.0
**Date:** 2026-02-25
**Status:** Completed — Implementation v1.6.0
**Parent:** SPEC-WB-001 (Option Element Type Library)
**Depends on:** SPEC-WB-001

---

## 1. Context

### 1.1 이 SPEC이 다루는 것

후니프린팅 위젯빌더의 **상품 카테고리 계층 + 레시피 시스템** (Product Category & Recipe)

```
카테고리 (Category, 11개)
  └── 하위카테고리 (Sub-Category, 문자열)
        └── 상품 (Product, MES 코드 연결)
              └── 레시피 (Recipe)
                    ├── 옵션 바인딩 (display_order + processing_order)
                    └── 레시피 선택지 제한 (가능한 선택지 subset)
```

**위젯빌더 = 레시피 편집기**: 요리 결과물을 만들기 위한 레시피를 구성하는 도구.
- 옵션 어휘 라이브러리(SPEC-WB-001) = 재료 라이브러리
- 레시피(이 SPEC) = 특정 상품의 요리 카드 (어떤 재료를, 어떤 순서로, 어떤 제한 하에)

### 1.2 이 SPEC이 다루지 않는 것

- 옵션 타입/선택지 라이브러리 정의 (SPEC-WB-001)
- 제약조건 시스템 (SPEC-WB-003) — 레시피와 제약조건은 참조 관계
- UI 컴포넌트 레이아웃 속성 (SPEC-WU-001)
- 가격 계산 (SPEC-WP-001)
- **장비 관리** → MES 시스템의 영역. 위젯빌더에서 장비 테이블 및 장비 참조 코드 불필요.

### 1.3 핵심 설계 원칙

> **[HARD] Excel Map 시트(맵시트)는 사용 금지 — 구버전 구조**
> `data/catalog.json` 및 Excel Map 시트 기반 12개 카테고리 구조는 구버전이다.
> **실제 후니프린팅 카테고리는 Figma 디자인 기준 11개**이며, 이 SPEC이 이를 정의한다.
> 구버전과 신버전 카테고리가 다르므로 혼용하면 혼란 발생 — 반드시 이 SPEC 기준 사용.

> **장비 관리는 MES의 영역이다.** 위젯빌더는 장비를 직접 관리하지 않으며,
> 카테고리에도 `mes_equipment_group_code` 같은 장비 참조 필드를 두지 않는다.
> 위젯빌더는 상품 → 레시피 → 옵션 구성 역할에 집중한다.

> **display_order ≠ processing_order**
> 고객 화면 순서(보기 편한 순서)와 내부 처리 순서(가격계산/MES 처리 순서)는 다를 수 있다.

> **[HARD] Edicus 코드 불변성 원칙** (Annotation Cycle 6 추가):
> `edicus_code` (HU_XXXXX 형식)는 **한 번 설정하면 절대 변경 금지 (IMMUTABLE)**.
> - Edicus 편집기 및 Excel 상품 마스터가 이 코드를 기준으로 상품을 식별한다.
> - 이미 운영 중인 시스템이 이 코드에 의존하므로 변경 시 전체 의존성 검토 필요.
> - 코드가 한 번 입력되면 DB 트리거 또는 애플리케이션 레이어에서 변경을 차단한다.
> - 기존 Excel 상품 등록 시 `edicus_code` 그대로 사용.
> - 신규 상품 등록 시 Edicus에서 발급받은 HU_XXXXX 코드를 입력한다.

> **[HARD] huni_code 격리 원칙** (Annotation Cycle 7 추가):
> `huni_code` (정수형 내부 일련번호)는 **위젯빌더 내부 전용 식별자다. 외부 시스템에 절대 노출 금지.**
> - `huni_code`를 Edicus, Shopby, MES 등 외부 시스템의 상품 식별자로 사용하면 안 된다.
> - 기존에 작업 편의상 `huni_code` 정수값을 Edicus에 사용한 경우, 반드시 실제 `edicus_code`로 마이그레이션해야 한다.
> - 외부 연동은 반드시 전용 컬럼(`edicus_code`, `shopby_product_no`, `mes_item_cd`)을 사용한다.

> **[CLEAR] prod_code vs ps_code 구분** (Annotation Cycle 7 추가):
> `edicus_code` (HU_XXXXX) = 위젯빌더(후니)가 Edicus에 상품을 등록할 때 파트너가 부여하는 **상품 식별 코드 (prod_code)**.
> `edicus_ps_code` (예: '90x50@NC') = Edicus 플랫폼 내부의 **인쇄 규격 코드 (ps_code)**. 크기와 후가공을 정의.
> 두 코드는 완전히 다른 개념이다. `create_project` 호출 시 `ps_code`로 전달되는 것은 `edicus_ps_code`다.

> **ID/Key 설계 원칙** (SPEC-WB-001 1.4절과 동일):
> - `category_key`는 위젯빌더 내부 slug다. MES 카테고리 코드('01', '03')가 아님.
> - `mes_item_cd`는 MES 연동에 필요한 **외부 참조 코드**다. 위젯 빌더 내부 PK가 아님.
> - 위젯 빌더 내부 상품 식별은 내부 auto-increment `id` 또는 `product_key` (slug) 사용.
> - MES에 없는 상품도 위젯 빌더에서 등록/관리 가능해야 한다 (mes_item_cd nullable).

---

## 2. Domain Model

### 2.1 Product Category (상품 카테고리)

후니프린팅의 **실제 상품 분류 체계**. **Figma 디자인 기준 11개 카테고리**.

> ⚠️ **구버전 데이터 사용 금지**: `data/catalog.json`의 12개 카테고리(엽서/스티커/인쇄홍보물...포장)는
> Excel Map 시트 기반 구버전 구조다. 이 SPEC의 11개 카테고리를 사용할 것.

**실제 후니프린팅 11개 카테고리 (Figma 기준):**

| # | category_key | 카테고리명 (KO) | 대표 상품 예시 |
|---|-------------|----------------|---------------|
| 01 | digital-print | 디지털인쇄 | 명함/봉투/전단지/엽서/포스터 |
| 02 | sticker | 스티커 | 자유형/규격/특수스티커/스티커팩 |
| 03 | book | 책자 | 중철/무선/PUR/하드커버 |
| 04 | photobook | 포토북 | 포토북/포토카드/접지카드 |
| 05 | calendar | 캘린더 | 탁상형/벽걸이 캘린더 |
| 06 | design-calendar | 디자인캘린더 | 커스텀 디자인 캘린더 |
| 07 | sign-poster | 사인/포스터 | 배너/POP/현수막/시트커팅 |
| 08 | acrylic | 아크릴 | 단품형/조합형/말랑PVC |
| 09 | goods | 굿즈 | 머그/폰케이스/패션소품/에코백 |
| 10 | stationery | 스테이셔너리 | 플래너/노트/데스크소품/문구 |
| 11 | accessories | 상품악세사리 | 포장재/라벨/상품액세서리 |

> **Figma 파일명 참고**: `ref/figma/01~11 PRODUCT_*_OPTION.png` 각 11개 파일이 카테고리별 옵션 레이아웃을 정의함.
> (파일명의 오타 "ARRYLIC", "STAITIONERY"는 실제 카테고리명 아크릴/스테이셔너리로 사용할 것)

**계층 구조**: 카테고리(11) → 서브카테고리(문자열) → 상품
- 실제 깊이: **2단계** (카테고리 → 서브, 상품은 category_id + subcategory 문자열로 식별)
- 카테고리 best practice: PostgreSQL adjacency list

**성질:**
- 카테고리는 위젯빌더의 독립적인 분류 체계다 (MES 카테고리 코드와 직접 연결하지 않음)
- **장비 정보 없음**: 카테고리에 장비 관련 필드 없음 — MES가 장비 관리

### 2.2 Product (상품)

후니프린팅의 **판매 단위** 상품. MES mesItemCd와 선택적 매핑.

예 (디지털인쇄 카테고리):
- 프리미엄명함 (003-0001), 코팅명함 (003-0002), 스탠다드명함 (003-0003)

**성질:**
- 상품은 카테고리 + 서브카테고리에 속함
- `mes_item_cd`: MES 품목 코드 (예: '003-0001') — MES 연동 외부 참조 키 (nullable)
- `edicus_code`: Edicus 파트너 **상품 식별 코드** (예: 'HU_00001') — **[IMMUTABLE]** 한 번 설정 후 변경 불가
  - Layer 3 외부 참조 코드. 위젯 빌더 내부 PK 아님.
  - 위젯빌더(후니)가 Edicus에 상품 등록 시 부여하는 prod_code. HU_XXXXX 형식.
  - `huni_code`(내부 정수)와 완전히 별개. 혼용 금지.
  - Edicus 연동 전 상품도 등록 가능 (nullable)
- `edicus_ps_code`: Edicus **인쇄 규격 코드** (예: '90x50@NC') — Edicus create_project 시 ps_code 파라미터로 전달
  - 크기(mm)와 후가공을 정의하는 Edicus 플랫폼 내부 코드.
  - `edicus_code`(상품 식별)와 다른 별개의 코드. 변경 가능.
  - Edicus 연동 상품에만 필요 (nullable)
- `shopby_product_no`: Shopby 플랫폼 상품번호 — 위젯-Shopby 연동 시 사용 (nullable)
  - 초기 등록 시 NULL. Shopby 연동 설정(SPEC-WI-001) 완료 후 채움.
  - Shopby가 상품 등록 시 발급하는 고유 번호.
- `product_type`: 제작 유형 ('digital-print'|'booklet'|'calendar'|'goods' 등)
- `has_editor`: 편집기 주문 가능 여부 (orderMethod.editor)
  - true → `edicus_code` 필수, `edicus_ps_code` 필수
- `file_spec`: 파일 폴더/약칭/포맷 정보 (jsonb, 예: {"folder":"디지털인쇄","abbreviation":"명함"})
- 상품은 하나 이상의 레시피를 가짐 (기본 레시피 1개)

### 2.4 Recipe (레시피)

특정 상품에서 **고객이 선택 가능한 옵션 구성** 정의.

> "이 명함 상품에서 고객은 어떤 옵션을 어떤 순서로, 어떤 선택지 중에서 선택할 수 있는가?"

**성질:**
- 레시피는 옵션 타입 바인딩(어떤 타입을 포함) + 선택지 제한(어떤 값이 허용) + 순서를 정의
- `display_order`: 고객 위젯 화면에서의 옵션 표시 순서
- `processing_order`: 가격계산/MES 처리 순서 (내부 로직 순서)
- 두 순서는 다를 수 있음 (예: 고객에는 수량이 마지막, 내부는 재질→규격→수량 순)
- 레시피는 버전 관리됨 (v1, v2... 이전 버전 주문 참조용)

### 2.5 Recipe Option Binding (레시피 옵션 바인딩)

레시피에 포함될 **옵션 타입**과 그 순서를 정의.

**성질:**
- 어떤 타입(SIZE, PAPER, etc.)을 이 레시피에 포함할지
- display_order: 고객에게 보이는 순서
- processing_order: 가격계산/MES에서 처리하는 순서
- is_required: 필수 선택인지 선택 사항인지
- default_choice_id: 기본 선택지 ID (옵션)

### 2.6 Recipe Choice Restriction (레시피 선택지 제한)

레시피에서 특정 옵션 타입에 **허용할 선택지를 제한**하는 규칙.

예:
- '무광명함' 레시피의 PAPER 타입: ['스노우지 250g', '매트지 250g', '스노우지 300g']만 허용
- '무광명함' 레시피의 SIZE 타입: ['90×50mm', '86×54mm']만 허용

**성질:**
- 제한이 없으면 해당 타입의 active 선택지 전체가 허용됨 (allow_all = true)
- 특정 선택지만 허용 또는 특정 선택지만 제외하는 두 모드 지원

---

## 3. EARS Format Requirements

### FR-WB002-01: 카테고리 계층 관리

**[WHEN]** 관리자가 새 카테고리를 등록할 때,
**[THE SYSTEM SHALL]** `category_key`, `category_name_ko`, `parent_id` (nullable = root), `level`을 저장하고, depth 최대 4단계를 초과하면 에러를 반환한다.

**[IF]** 카테고리에 하위 카테고리가 있을 때,
**[THE SYSTEM SHALL]** 해당 카테고리는 상품과 직접 연결될 수 없다 (leaf 카테고리만 상품 연결 가능).

**[WHEN]** 관리자가 카테고리를 비활성화할 때,
**[THE SYSTEM SHALL]** 해당 카테고리와 모든 하위 카테고리, 연결된 상품의 visible 상태를 일괄 false로 처리한다.

### FR-WB002-02: 상품 등록

**[WHEN]** 관리자가 상품을 등록할 때,
**[THE SYSTEM SHALL]** `product_key`, `product_name_ko`, `category_id` (leaf만 허용), `mes_item_cd` (nullable), `edicus_code` (nullable)를 저장한다.

**[IF]** `category_id`가 leaf 카테고리가 아니면,
**[THE SYSTEM SHALL]** 400 Bad Request를 반환한다.

### FR-WB002-03: 레시피 생성

**[WHEN]** 관리자가 상품에 레시피를 생성할 때,
**[THE SYSTEM SHALL]** `product_id`, `recipe_name`, `recipe_version` (1부터 시작)을 저장하고 기본 레시피(is_default=true)를 설정한다.

**[IF]** 동일 상품에 이미 기본 레시피가 있고 새 레시피를 기본으로 설정하면,
**[THE SYSTEM SHALL]** 기존 기본 레시피를 is_default=false로 변경한다.

### FR-WB002-04: 레시피 옵션 바인딩

**[WHEN]** 관리자가 레시피에 옵션 타입을 추가할 때,
**[THE SYSTEM SHALL]** `recipe_id`, `type_id`, `display_order`, `processing_order`, `is_required`, `default_choice_id`를 저장한다.

**[WHERE]** 동일 레시피에서 `display_order`가 중복되면,
**[THE SYSTEM SHALL]** `type_id` 오름차순을 보조 정렬 기준으로 사용한다.

**[WHERE]** 동일 레시피에서 `processing_order`가 중복되면,
**[THE SYSTEM SHALL]** `type_id` 오름차순을 보조 정렬 기준으로 사용한다.

### FR-WB002-05: 레시피 선택지 제한

**[WHEN]** 관리자가 특정 레시피의 옵션 타입에 선택지를 제한할 때,
**[THE SYSTEM SHALL]** `recipe_binding_id`, `choice_id`, `restriction_mode` ('allow_only'|'exclude')를 저장한다.

**[IF]** 해당 레시피-타입에 allow_only 제한이 없으면,
**[THE SYSTEM SHALL]** 해당 타입의 모든 active 선택지를 허용한다.

### FR-WB002-06: 레시피 버전 관리

**[WHEN]** 기존 레시피를 수정할 때,
**[THE SYSTEM SHALL]** 기존 레시피를 archived 상태로 변경하고, 새 버전(version+1) 레시피를 생성한다.

**[WHERE]** 기존 주문이 이전 버전 레시피를 참조하고 있으면,
**[THE SYSTEM SHALL]** 해당 주문의 레시피 참조는 그대로 유지한다 (버전별 보존).

### FR-WB002-07: Edicus 코드 불변성 보장

**[WHEN]** `edicus_code`가 이미 설정된 상품에 대해 `edicus_code` 변경 요청이 오면,
**[THE SYSTEM SHALL]** 409 Conflict를 반환하고 변경을 거부한다.

**[IF]** `edicus_code`가 null인 상태에서 값을 설정하는 것은,
**[THE SYSTEM SHALL]** 허용한다 (최초 설정은 가능, 이후 변경 불가).

**[WHERE]** `edicus_code` 형식은 'HU_' 접두사 + 숫자 5자리 이상이며,
**[THE SYSTEM SHALL]** 다른 형식의 값은 422 Unprocessable Entity로 거부한다.

### FR-WB002-08: huni_code 격리 검증

**[WHEN]** 관리자가 `edicus_code` 또는 `shopby_product_no`에 순수 정수 문자열(예: "1", "123")을 입력할 때,
**[THE SYSTEM SHALL]** 경고 메시지를 표시하고 확인을 요구한다. (huni_code 오용 방지)

**[WHEN]** 시스템이 Edicus `create_project`를 호출할 때,
**[THE SYSTEM SHALL]** `edicus_code`를 prod_code로, `edicus_ps_code`를 ps_code로 각각 별도 파라미터로 전달한다.

**[WHERE]** `has_editor = true`인 상품에 `edicus_code` 또는 `edicus_ps_code`가 null이면,
**[THE SYSTEM SHALL]** 편집기 주문 기능을 비활성화하고 관리자에게 경고한다.

### FR-WB002-09: Shopby 상품번호 관리

**[WHEN]** Shopby 연동(SPEC-WI-001) 설정 후 상품에 Shopby 상품번호가 발급될 때,
**[THE SYSTEM SHALL]** `shopby_product_no` 컬럼을 업데이트한다.

**[IF]** `shopby_product_no`가 null인 상품에 Shopby 주문 경로로 접근하면,
**[THE SYSTEM SHALL]** "Shopby 연동이 설정되지 않은 상품"으로 처리하고 에러를 반환한다.

> **삭제된 요구사항**: FR-WB002-02 (장비 등록 및 카테고리 매핑)는 Annotation Cycle 5에서 삭제됨.
> 장비 관리는 MES 시스템의 영역이며, 위젯빌더에서 장비 정보를 저장하거나 참조하지 않는다.

---

## 4. DB Schema

### 4.1 테이블: `product_categories`

위치: `packages/db/src/schema/widget/02-product-categories.ts`

```
product_categories
─────────────────────────────────────────────
id               serial PRIMARY KEY
category_key     varchar(50) UNIQUE NOT NULL  -- 위젯빌더 내부 slug (예: 'digital-print', 'sticker')
                                              -- MES 카테고리 코드('01','03')가 아님 — 내부 설계 키
category_name_ko varchar(100) NOT NULL        -- 예: '디지털인쇄', '스티커'
category_name_en varchar(100)                 -- 예: 'Digital Print', 'Sticker'
display_order    integer NOT NULL DEFAULT 0
is_active        boolean NOT NULL DEFAULT true
description      text
created_at       timestamptz NOT NULL DEFAULT now()
updated_at       timestamptz NOT NULL DEFAULT now()

-- 표준 시드 데이터 (Figma 기준, 11개 카테고리)
-- digital-print:디지털인쇄, sticker:스티커, book:책자, photobook:포토북
-- calendar:캘린더, design-calendar:디자인캘린더, sign-poster:사인/포스터
-- acrylic:아크릴, goods:굿즈, stationery:스테이셔너리, accessories:상품악세사리

INDEX idx_pc_active ON is_active WHERE is_active = true
```

> **[HARD] 구버전 사용 금지**: `data/catalog.json`의 01~12 카테고리(엽서/스티커/인쇄홍보물...포장)는
> Excel Map 시트 기반 구버전. 시드 데이터 작성 시 반드시 위 11개 카테고리 사용.
>
> **장비 필드 없음**: `mes_equipment_group_code` 등 장비 관련 컬럼은 없다.
> 장비 관리는 MES 시스템이 담당. 위젯빌더는 카테고리 수준에서 MES를 참조하지 않는다.

### 4.2 테이블: `products`

위치: `packages/db/src/schema/widget/02-products.ts`

```
products
─────────────────────────────────────────────
id               serial PRIMARY KEY

-- Layer 3: 외부 참조 코드 (nullable — 연동 전에도 등록 가능)
mes_item_cd       varchar(20) UNIQUE            -- MES 품목코드 (예: '003-0001') — 내부 PK 아님
edicus_code       varchar(20) UNIQUE            -- [IMMUTABLE] 파트너 상품 식별 코드 (예: 'HU_00001')
                                               -- 위젯빌더(후니)가 Edicus에 부여하는 prod_code.
                                               -- huni_code(정수)와 다른 별개 개념. 혼용 금지.
                                               -- 한 번 설정 후 변경 금지. DB 레벨 + 앱 레벨 이중 보호.
                                               -- 형식: 'HU_' + 숫자 5자리 이상
edicus_ps_code    varchar(50)                  -- Edicus 인쇄 규격 코드 (예: '90x50@NC')
                                               -- create_project 시 ps_code 파라미터로 전달되는 값.
                                               -- edicus_code(상품 식별)와 별개. 변경 가능.
shopby_product_no varchar(50) UNIQUE           -- Shopby 플랫폼 상품번호 (초기 NULL)
                                               -- Shopby 연동(SPEC-WI-001) 완료 시 채움.

-- Layer 2: 위젯빌더 내부 비즈니스 식별자
product_key      varchar(100) UNIQUE NOT NULL  -- URL slug (예: 'premiumpostcard')

product_name_ko  varchar(200) NOT NULL
product_name_en  varchar(200)
category_id      integer NOT NULL REFERENCES product_categories(id)
subcategory      varchar(100)                  -- 서브카테고리 (예: '명함', '자유형 스티커')
product_type     varchar(50)                   -- 제작유형: 'digital-print'|'booklet'|'calendar'|'goods'
is_premium       boolean NOT NULL DEFAULT false
has_editor       boolean NOT NULL DEFAULT false  -- 편집기 주문 가능
has_upload       boolean NOT NULL DEFAULT true   -- 파일 업로드 주문 가능
file_spec        jsonb                           -- 파일 규격 {"folder":"디지털인쇄","abbreviation":"명함","format":"PDF"}
thumbnail_url    varchar(500)
display_order    integer NOT NULL DEFAULT 0
is_active        boolean NOT NULL DEFAULT true
is_visible       boolean NOT NULL DEFAULT true
created_at       timestamptz NOT NULL DEFAULT now()
updated_at       timestamptz NOT NULL DEFAULT now()

INDEX idx_prod_category    ON category_id
INDEX idx_prod_mes_item    ON mes_item_cd
INDEX idx_prod_edicus      ON edicus_code
INDEX idx_prod_edicus_ps   ON edicus_ps_code
INDEX idx_prod_shopby      ON shopby_product_no
INDEX idx_prod_subcategory ON (category_id, subcategory)
INDEX idx_prod_active      ON is_active WHERE is_active = true

-- IMMUTABILITY RULE: edicus_code 변경 차단 트리거 (구현 시 필수)
-- TRIGGER trg_products_edicus_immutable: BEFORE UPDATE ON products
--   FOR EACH ROW WHEN (OLD.edicus_code IS NOT NULL AND NEW.edicus_code IS DISTINCT FROM OLD.edicus_code)
--   RAISE EXCEPTION 'edicus_code is immutable once set'
```

### 4.3 테이블: `product_recipes`

위치: `packages/db/src/schema/widget/02-product-recipes.ts`

```
product_recipes
─────────────────────────────────────────────
id               serial PRIMARY KEY
product_id       integer NOT NULL REFERENCES products(id)
recipe_name      varchar(100) NOT NULL          -- 예: '기본', '프리미엄', '샘플'
recipe_version   integer NOT NULL DEFAULT 1
is_default       boolean NOT NULL DEFAULT false
is_archived      boolean NOT NULL DEFAULT false
description      text
created_at       timestamptz NOT NULL DEFAULT now()
updated_at       timestamptz NOT NULL DEFAULT now()

UNIQUE uq_pr_version ON (product_id, recipe_version)
INDEX  idx_pr_product ON product_id
INDEX  idx_pr_default ON (product_id, is_default) WHERE is_default = true
```

### 4.4 테이블: `recipe_option_bindings`

위치: `packages/db/src/schema/widget/02-recipe-option-bindings.ts`

```
recipe_option_bindings
─────────────────────────────────────────────
id                serial PRIMARY KEY
recipe_id         integer NOT NULL REFERENCES product_recipes(id) ON DELETE CASCADE
type_id           integer NOT NULL REFERENCES option_element_types(id)
display_order     integer NOT NULL DEFAULT 0    -- 고객 화면 표시 순서
processing_order  integer NOT NULL DEFAULT 0    -- 가격계산/MES 처리 순서
is_required       boolean NOT NULL DEFAULT true
default_choice_id integer REFERENCES option_element_choices(id)
is_active         boolean NOT NULL DEFAULT true

UNIQUE uq_rob_recipe_type ON (recipe_id, type_id)
INDEX  idx_rob_recipe      ON recipe_id
INDEX  idx_rob_display     ON (recipe_id, display_order)
INDEX  idx_rob_processing  ON (recipe_id, processing_order)
```

### 4.5 테이블: `recipe_choice_restrictions`

```
recipe_choice_restrictions
─────────────────────────────────────────────
id                serial PRIMARY KEY
recipe_binding_id integer NOT NULL REFERENCES recipe_option_bindings(id) ON DELETE CASCADE
choice_id         integer NOT NULL REFERENCES option_element_choices(id)
restriction_mode  varchar(20) NOT NULL   -- 'allow_only' | 'exclude'

UNIQUE uq_rcr ON (recipe_binding_id, choice_id)
INDEX  idx_rcr_binding ON recipe_binding_id
```

---

## 5. API Endpoints

### GET /api/widget/categories
카테고리 트리 조회 (계층 구조)

### GET /api/widget/products?categoryId=:id
카테고리별 상품 목록 조회

### GET /api/widget/products/:productKey/recipe
상품의 기본 레시피 조회 (옵션 바인딩 + 허용 선택지 포함)

**Response 구조:**
```json
{
  "product": {
    "productKey": "MATTE_BUSINESS_CARD",
    "productNameKo": "무광명함",
    "categoryPath": ["인쇄물", "명함/봉투류", "명함"]
  },
  "recipe": {
    "recipeId": 1,
    "recipeVersion": 1,
    "options": [
      {
        "typeKey": "SIZE",
        "displayOrder": 1,
        "processingOrder": 2,
        "isRequired": true,
        "allowedChoices": [
          { "choiceKey": "90x50mm", "displayName": "90×50mm 명함" }
        ]
      },
      {
        "typeKey": "PAPER",
        "displayOrder": 2,
        "processingOrder": 1,
        "isRequired": true,
        "allowedChoices": [...]
      }
    ]
  }
}
```

### POST /api/admin/widget/products
새 상품 생성 (관리자)

### POST /api/admin/widget/products/:productKey/recipes
레시피 생성 (관리자)

### PUT /api/admin/widget/recipes/:recipeId/bindings
레시피 옵션 바인딩 일괄 업데이트 (순서 변경 포함)

---

## 6. Acceptance Criteria

### AC-WB002-01: 카테고리 계층
- [ ] 4단계 초과 카테고리 생성 시 400 에러 반환
- [ ] non-leaf 카테고리에 상품 연결 시 400 에러 반환
- [ ] 카테고리 비활성화 시 하위 전체 cascade 처리
- [ ] 11개 표준 카테고리(Figma 기준) 시드 데이터 정상 로드
- [ ] category_key가 'digital-print' 형식의 slug임을 확인 (MES 코드 '01' 형식 사용 불가)

### AC-WB002-02: 레시피 순서
- [ ] display_order와 processing_order가 독립적으로 설정/변경 가능
- [ ] display_order 변경이 고객 위젯 응답에 즉시 반영
- [ ] processing_order 변경이 가격계산 파이프라인에 반영

### AC-WB002-03: 레시피 버전
- [ ] 레시피 수정 시 기존 버전 archived, 새 버전 생성
- [ ] 기존 주문 참조 무결성 유지

### AC-WB002-04: 선택지 제한
- [ ] allow_only 제한 있을 때 다른 선택지 제안 시 에러
- [ ] 제한 없으면 해당 타입의 active 선택지 전체 반환

### AC-WB002-05: Edicus 코드 불변성
- [ ] edicus_code 최초 설정(null → 값) 성공
- [ ] edicus_code 설정 후 다른 값으로 변경 시 409 Conflict 반환
- [ ] edicus_code 형식 위반 ('HU_' 접두사 없음, 숫자 5자리 미만) 시 422 반환
- [ ] 동일 edicus_code 중복 등록 시 409 반환 (UNIQUE 제약)
- [ ] edicus_code null → null 업데이트는 허용 (no-op)

---

## 7. Open Questions

1. **비표준 규격 처리**: `allows_custom = true` SIZE 타입에서 고객이 직접 입력한 규격을
   임시 choice로 생성할 것인가, 주문 레코드에 직접 저장할 것인가?
   → SPEC-WB-003 (제약조건) 결정 후 재검토

2. **레시피 복사**: 기존 레시피를 다른 상품에 복사하는 기능이 필요한가?

3. **디지털인쇄 카테고리 범위**: Figma에서 '디지털인쇄'는 명함/봉투/전단지/엽서/포스터 등을 포함하는
   광범위 카테고리다. 추후 서브카테고리 세분화가 필요한 시점에 SPEC 개정이 필요할 수 있다.

---

## 8. 아키텍처 컨텍스트

```
[SPEC-WB-001] 옵션 어휘 → option_element_types, option_element_choices
      ↓ recipe가 type을 참조
[SPEC-WB-002] 레시피 (이 문서)
      → product_categories (11개, Figma 기준)
      → products (mes_item_cd nullable 외부 참조)
      → product_recipes, recipe_option_bindings, recipe_choice_restrictions
      ↓ recipe_option_binding에 제약조건 부착
[SPEC-WB-003] 제약조건
[SPEC-WU-001] UI 컴포넌트
[SPEC-WP-001] 가격 계산
[SPEC-WI-001] Shopby 연동 (mes_item_cd ↔ shopby_product_id 매핑)
[SPEC-WI-002] MES 연동 (mes_item_cd 기반 생산 데이터 전달)
```

> **장비 없음**: `print_equipments` 테이블은 이 SPEC에 없다. 장비는 MES가 관리한다.

---

*SPEC-WB-002 v1.5.0 — 어노테이션 사이클 6*
*후니프린팅 위젯빌더: 카테고리 계층 (Figma 기준 11개) + 레시피 시스템 (display/processing 이중 순서)*
*변경이력: v1.5.0 — edicus_code (HU_XXXXX) IMMUTABLE 컬럼 추가 (Section 1.3, 2.2, 3, 4.2, 6)*
*변경이력: v1.4.0 — 카테고리 Figma 기준 11개로 교체, Map시트 사용 금지, 장비 관련 삭제*

---

## Implementation Notes

**Implementation Date:** 2026-02-25
**Implementation Version:** v1.6.0
**GREEN Phase Status:** Complete (363/363 tests passing)

### Files Created

- `packages/db/src/schema/widget/02-product-categories.ts` — `product_categories` table
- `packages/db/src/schema/widget/02-products.ts` — `wb_products` table (edicus_code IMMUTABLE, huni_code isolated)
- `packages/db/src/schema/widget/02-product-recipes.ts` — `product_recipes` table (with versioning)
- `packages/db/src/schema/widget/02-recipe-option-bindings.ts` — `recipe_option_bindings` table (dual display_order + processing_order)
- `packages/db/src/schema/widget/02-recipe-choice-restrictions.ts` — `recipe_choice_restrictions` table
- `packages/db/src/schema/widget/index.ts` — barrel export for widget schema directory
- `packages/db/src/seed/seed-product-categories.ts` — 11 Figma-based category seed data

### Files Modified

- `packages/db/src/schema/product-recipe.ts` — renamed `recipeOptionBindings` to `layerOptionBindings` (table: `widget_layer_option_bindings`), `recipeChoiceBindings` to `layerChoiceBindings` (table: `widget_layer_choice_bindings`)
- `packages/db/src/schema/index.ts` — added widget schema exports
- `packages/db/src/schema/relations.ts` — updated imports for widget schema
- `packages/db/src/schema/ui-layout.ts` — updated imports
- `packages/db/src/schema/product-constraints.ts` — updated imports

### Test Coverage

- Total tests: 363/363 passing
- SPEC-WB-002 specific tests: 31/31 passing
- Test files cover: product_categories schema, wb_products schema, product_recipes versioning, recipe_option_bindings dual-order, recipe_choice_restrictions

### MX Tags Added

- `@MX:ANCHOR` x2 — `productCategories` (fan_in >= 3), `wbProducts` (fan_in >= 3)
- `@MX:NOTE` x4 — edicus_code immutability rule, huni_code isolation rule, dual-order design intent, category seed data origin (Figma 11 categories)
