# SPEC-DATA-002 DB 재설계 분석 보고서

> 작성일: 2026-02-24
> 대상: widget.creator 인쇄 자동견적 PostgreSQL 스키마 (Drizzle ORM)
> 현재 상태: 26개 테이블, 9개 스키마 파일, 6개 도메인

---

## 1. 인쇄 견적 도메인 분석

### 1.1 인쇄 견적에 필요한 최소 데이터 집합

인쇄 견적의 핵심은 **"상품 + 옵션 조합 -> 가격"** 이라는 단일 경로이다.
이 경로를 계산하기 위해 필요한 최소 데이터 집합은 다음과 같다:

| 데이터 범주 | 필수 엔티티 | 근거 |
|------------|-----------|------|
| **상품 정의** | 상품(product), 사이즈(size) | 견적 대상 식별 |
| **자재** | 용지(paper), 소재(material) | 자재비 계산 |
| **공정** | 인쇄방식(print_mode), 후가공(post_process), 제본(binding) | 가공비 계산 |
| **가격 데이터** | 단가 조회 테이블(price_lookup) | 수량 구간별 단가 |
| **계산 규칙** | 판걸이(imposition), 로스량(loss) | 판수/용지비 계산 |

**현재 불필요하게 분리된 것들**:
- `option_definitions`, `product_options`, `option_choices` 는 **UI 렌더링 관심사**이지 가격 계산 관심사가 아님
- `option_constraints`, `option_dependencies` 는 **UI 행동 규칙**이지 견적 로직이 아님
- MES 통합 테이블 5개는 **외부 시스템 연동 관심사**

### 1.2 7개 가격 모델의 공통 계산 패턴 추출

모든 가격 모델을 분석하면 **3가지 원자적 가격 조회 패턴**으로 분해된다:

```
Pattern A: 수량 구간 단가 조회 (Tier Lookup)
  입력: (가격키, 수량) -> 단가
  사용: Model 1(출력비/코팅비/가공비), Model 2(+커팅비), Model 5(제본비)

Pattern B: 고정 단가 조회 (Fixed Lookup)
  입력: (상품, 사이즈, [용지], [인쇄방식]) -> 단가
  사용: Model 3(명함), Model 6(실사), Model 7(아크릴)

Pattern C: 매트릭스 단가 조회 (Matrix Lookup)
  입력: (상품, 사이즈, 인쇄, 페이지수, 수량) -> 패키지가
  사용: Model 4(엽서북), Model 5(부분적 - 박/형압)
```

**7개 모델별 패턴 조합**:

| 모델 | 대상 | 패턴 조합 | 현재 DB 대응 |
|------|------|----------|-------------|
| Model 1 | 디지털인쇄 일반 | A(출력비) + A(별색비) + 용지비계산 + A(코팅비) + A(가공비) | price_tiers + papers |
| Model 2 | 스티커 | Model 1 + A(커팅비) | price_tiers |
| Model 3 | 명함 | B(용지x인쇄방식 고정가) | fixed_prices |
| Model 4 | 엽서북 | C(사이즈x인쇄x페이지x수량) | package_prices |
| Model 5 | 책자 | A(내지출력비) + A(표지출력비) + A(제본비) + 용지비 | price_tiers 복합 |
| Model 6 | 실사/포스터 | B(사이즈별 고정가) + B(옵션가) | fixed_prices |
| Model 7 | 아크릴/굿즈 | B(사이즈별 고정가) x 수량 x 할인율 | fixed_prices (할인율 테이블 부재) |

**핵심 발견**: 용지비 계산은 별도 공식이 필요하다:
```
용지비 = (paper.selling_per_4cut / imposition_count) x (quantity + loss_quantity)
```
이 공식은 `papers` 테이블의 `selling_per_4cut`과 `imposition_rules`의 `imposition_count`에 의존한다.

### 1.3 도메인 엔티티와 값 객체(Value Object) 구분

| 구분 | 항목 | 근거 |
|------|------|------|
| **엔티티 (고유 식별, 생명주기)** | Product, Paper, PrintMode, PostProcess, Binding, MesItem | 독립 관리 대상, CRUD 필요 |
| **값 객체 (속성으로 식별)** | Size(상품 종속), PriceTier(가격테이블 종속), ImpositionRule(계산 규칙) | 소유 엔티티 없이 의미 없음 |
| **연관 테이블 (관계 표현)** | PaperProductMapping, ProductMesMapping | 다대다 관계 |
| **정책 객체** | LossQuantityConfig | 비즈니스 규칙 설정 |
| **UI 메타데이터 (별도 관심사)** | OptionDefinition, ProductOption, OptionChoice, Constraint, Dependency | 프레젠테이션 계층 |
| **외부 통합 (별도 관심사)** | MesItem, MesItemOption, OptionChoiceMesMapping, ProductEditorMapping | 외부 시스템 경계 |

---

## 2. DB 설계 원칙 적용

### 2.1 3NF 정규화 관점 현재 스키마 문제점

#### 문제 1: `price_tiers.option_code` - 문자열 기반 느슨한 참조 (1NF 위반에 가까움)

```sql
-- 현재 구조
price_tiers.option_code VARCHAR(50)  -- "1줄", "2줄" 같은 한국어 문자열 또는 print_mode.code

-- 문제점:
-- 1. FK 제약 없음 -> 존재하지 않는 option_code 삽입 가능
-- 2. option_code의 의미가 price_table_id에 따라 달라짐 (출력비면 인쇄코드, 후가공이면 후가공코드)
-- 3. 조인 시 어떤 테이블과 조인해야 하는지 price_table을 먼저 확인해야 함
```

**영향**: 데이터 무결성 보장 불가, 쿼리 최적화 어려움, 애플리케이션 레벨에서 유효성 검증 필요.

#### 문제 2: `option_choices`의 5개 nullable FK (Polymorphic Association Anti-pattern)

```typescript
// 현재 huni-options.schema.ts 구조
optionChoices = {
  refPaperId:       FK(papers.id) | NULL,       // paperType일 때만
  refMaterialId:    FK(materials.id) | NULL,     // material일 때만
  refPrintModeId:   FK(print_modes.id) | NULL,   // printType일 때만
  refPostProcessId: FK(post_processes.id) | NULL, // postprocess일 때만
  refBindingId:     FK(bindings.id) | NULL,       // binding일 때만
}
```

**문제점**:
1. 하나의 행에서 최대 1개 FK만 사용되고 나머지 4개는 항상 NULL
2. `CHECK` 제약으로 "정확히 1개만 NOT NULL" 보장이 어려움
3. 새 참조 유형 추가 시 컬럼 추가 필요 (스키마 변경)
4. NULL 컬럼 5개가 모든 행에 존재하므로 저장 공간 낭비

#### 문제 3: `print_modes.price_code`와 `price_tiers.option_code` 불일치

```
print_modes.price_code = SMALLINT (0, 1, 2, 4, 8, 11, 12, 21, 22, 31, 32)
price_tiers.option_code = VARCHAR(50)  -- 이것이 "PRINT_SINGLE_COLOR" 같은 코드인지, "4" 같은 숫자 문자열인지 불명확
```

**영향**: 출력비 조회 시 `print_modes.price_code`를 `price_tiers.option_code`와 어떻게 매칭하는지 애플리케이션 코드에 의존.

#### 문제 4: `loss_quantity_config.scope_id` - Polymorphic FK

```typescript
// huni-pricing.schema.ts 에 MX 태그까지 달려있는 알려진 문제
// @MX:WARN: [AUTO] Polymorphic FK - scopeId target determined by scopeType discriminator
scopeType: VARCHAR(20),  // 'global', 'category', 'product'
scopeId: INTEGER | NULL,  // scope_type에 따라 category_id 또는 product_id
```

**문제점**: DB 레벨에서 참조 무결성 보장 불가.

#### 문제 5: `fixed_prices`의 4개 nullable FK (또 다른 Polymorphic 패턴)

```typescript
fixedPrices = {
  productId:   FK(products.id),     // NOT NULL
  sizeId:      FK(product_sizes.id) | NULL,
  paperId:     FK(papers.id) | NULL,
  materialId:  FK(materials.id) | NULL,
  printModeId: FK(print_modes.id) | NULL,
}
```

동일한 polymorphic FK 문제. 어떤 조합의 FK가 NOT NULL이어야 하는지 DB 레벨에서 강제 불가.

### 2.2 명칭 정규화 규칙 제안

**현재 문제**: 엑셀 표시명이 DB 식별자로 혼용되고 있음.

| 문제 사례 | 현재 | 원인 |
|----------|------|------|
| price_tiers.option_code | "1줄", "2줄", "무광코팅(단면)" | 엑셀 하위옵션명 직접 사용 |
| post_processes.group_code | "PP001"~"PP008" | 엑셀 섹션명 직접 사용 |
| categories.sheet_name | "디지털인쇄", "스티커" | 엑셀 시트명 직접 사용 |

**제안: 3단계 명칭 체계**

```
Level 1: system_code (영문 snake_case, DB 식별자)
  -> 규칙: {DOMAIN}_{TYPE}_{VARIANT}
  -> 예시: PRINT_SINGLE_COLOR, PP_PERFORATION_1LINE, CAT_DIGITAL_PRINT

Level 2: display_name (한국어, UI 표시용)
  -> 규칙: 비즈니스 도메인 표준 용어
  -> 예시: "단면칼라", "미싱 1줄", "디지털인쇄"

Level 3: legacy_code (원본 코드 보존, 마이그레이션/추적용)
  -> 규칙: 원본 시스템 코드 그대로
  -> 예시: price_code=4, group_code="PP001", sheet_name="디지털인쇄"
```

**영문 시스템 코드 네이밍 컨벤션**:

```
카테고리:    CAT_{CATEGORY}              -> CAT_DIGITAL_PRINT, CAT_STICKER
용지:        PAPER_{NAME}_{WEIGHT}        -> PAPER_ART_250, PAPER_SNOW_300
소재:        MAT_{TYPE}_{SPEC}            -> MAT_CLEAR_ACRYLIC_3MM
인쇄방식:    PRINT_{SIDES}_{COLOR}         -> PRINT_SINGLE_COLOR, PRINT_DOUBLE_MONO
후가공:      PP_{TYPE}_{VARIANT}           -> PP_PERFORATION_1LINE, PP_COATING_MATTE_SINGLE
제본:        BIND_{TYPE}                  -> BIND_SADDLE_STITCH, BIND_PERFECT
사이즈:      SIZE_{WxH}                   -> SIZE_90X50, SIZE_A4
가격테이블:  PT_{DOMAIN}_{TYPE}_{SHEET}    -> PT_OUTPUT_SELL_A3, PT_PP001_SELL
```

### 2.3 FK 무결성 개선 방안

#### 개선 1: `price_tiers.option_code` -> 정규화된 FK 참조

**현재**: 문자열 기반 느슨한 참조
**개선**: discriminated union 패턴으로 명시적 FK 분리

```sql
-- 방안 A: price_tiers를 도메인별로 분리 (추천)
CREATE TABLE print_price_tiers (
  id SERIAL PRIMARY KEY,
  price_table_id INTEGER NOT NULL REFERENCES price_tables(id),
  print_mode_id INTEGER NOT NULL REFERENCES print_modes(id),  -- 명시적 FK
  min_qty INTEGER NOT NULL,
  max_qty INTEGER NOT NULL DEFAULT 999999,
  unit_price NUMERIC(12,2) NOT NULL
);

CREATE TABLE postprocess_price_tiers (
  id SERIAL PRIMARY KEY,
  price_table_id INTEGER NOT NULL REFERENCES price_tables(id),
  post_process_id INTEGER NOT NULL REFERENCES post_processes(id),  -- 명시적 FK
  min_qty INTEGER NOT NULL,
  max_qty INTEGER NOT NULL DEFAULT 999999,
  unit_price NUMERIC(12,2) NOT NULL
);

CREATE TABLE binding_price_tiers (
  id SERIAL PRIMARY KEY,
  price_table_id INTEGER NOT NULL REFERENCES price_tables(id),
  binding_id INTEGER NOT NULL REFERENCES bindings(id),  -- 명시적 FK
  min_qty INTEGER NOT NULL,
  max_qty INTEGER NOT NULL DEFAULT 999999,
  unit_price NUMERIC(12,2) NOT NULL
);
```

**방안 B (타협안)**: option_code를 유지하되 CHECK 제약 + 별도 매핑 테이블

```sql
-- price_tiers.option_code 값을 검증하는 뷰 또는 트리거
-- 이 방안은 현재 구조를 최소 변경하면서 무결성을 보강
ALTER TABLE price_tiers ADD CONSTRAINT chk_option_code_format
  CHECK (option_code ~ '^[A-Z][A-Z0-9_]+$');  -- 영문 시스템 코드 강제
```

#### 개선 2: `option_choices` Polymorphic FK 제거

**추천 방안**: `ref_entity_type` + `ref_entity_id` 단일 Polymorphic을 유지하되 CHECK 제약 강화

```sql
-- 5개 nullable FK 대신 2개 컬럼으로 통합
ALTER TABLE option_choices
  ADD COLUMN ref_entity_type VARCHAR(20),  -- 'paper', 'material', 'print_mode', 'post_process', 'binding'
  ADD COLUMN ref_entity_id INTEGER;

-- CHECK: ref_entity_type이 있으면 ref_entity_id도 있어야 함
ALTER TABLE option_choices ADD CONSTRAINT chk_ref_consistency
  CHECK (
    (ref_entity_type IS NULL AND ref_entity_id IS NULL)
    OR
    (ref_entity_type IS NOT NULL AND ref_entity_id IS NOT NULL)
  );
```

또는 **가장 깨끗한 방안**: `option_choices`에서 FK 참조를 제거하고, `code` 기반 조인으로 전환. `option_choices.code`가 이미 `papers.code`, `print_modes.code` 등과 대응 관계를 가지므로, 애플리케이션 레벨 조인이면 충분.

#### 개선 3: `loss_quantity_config` Polymorphic FK 해소

```sql
-- scope_type별 전용 nullable FK 사용 (행 수가 5개 미만이므로 타협 가능)
ALTER TABLE loss_quantity_config
  ADD COLUMN category_id INTEGER REFERENCES categories(id),
  ADD COLUMN product_id INTEGER REFERENCES products(id);

-- CHECK: scope_type에 따라 적절한 FK만 NOT NULL
ALTER TABLE loss_quantity_config ADD CONSTRAINT chk_scope_fk
  CHECK (
    (scope_type = 'global' AND category_id IS NULL AND product_id IS NULL)
    OR (scope_type = 'category' AND category_id IS NOT NULL AND product_id IS NULL)
    OR (scope_type = 'product' AND product_id IS NOT NULL)
  );
```

---

## 3. 이상적인 스키마 설계 제안

### 3.1 핵심 원칙: 관심사 분리

현재 26개 테이블이 하나의 스키마에 혼재되어 있다. 이를 **4개 독립 관심사**로 분리:

```
Schema 1: pricing (견적 핵심)        -> 10~12개 테이블
Schema 2: ui_options (UI 메타데이터) -> 5개 테이블 (변경 없음)
Schema 3: integration (외부 연동)    -> 5~6개 테이블 (변경 없음)
Schema 4: operations (주문/운영)     -> 4~5개 테이블 (별도 확장)
```

### 3.2 이상적 견적 핵심 스키마 (Schema 1: pricing) - 12개 테이블

```sql
-- ============================================================
-- T1: categories (상품 카테고리) - 변경 없음
-- ============================================================
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,       -- CAT_DIGITAL_PRINT
  name VARCHAR(100) NOT NULL,             -- 디지털인쇄
  parent_id INTEGER REFERENCES categories(id),
  depth SMALLINT NOT NULL DEFAULT 0,
  display_order SMALLINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- sheet_name 제거: legacy_code로 별도 관리하거나 code에서 파생


-- ============================================================
-- T2: products (상품) - 간소화
-- ============================================================
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  huni_code VARCHAR(10) UNIQUE NOT NULL,    -- 중추적 식별자
  edicus_code VARCHAR(15) UNIQUE,           -- HU_ + huni_code (파생)
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) UNIQUE NOT NULL,
  pricing_model VARCHAR(30) NOT NULL,       -- formula, fixed_unit, package, component, fixed_size, fixed_per_unit
  sheet_standard VARCHAR(5),                -- A3, T3 (formula 계산용)
  order_method VARCHAR(20) NOT NULL DEFAULT 'upload',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- 제거 대상: product_type (pricing_model과 중복), figma_section (UI 관심사),
--           editor_enabled (integration 관심사), mes_registered (integration 관심사)
-- shopby_id -> integration 스키마로 이동


-- ============================================================
-- T3: product_sizes (상품별 사이즈) - 변경 없음
-- ============================================================
CREATE TABLE product_sizes (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,                -- SIZE_90X50
  display_name VARCHAR(100) NOT NULL,
  cut_width NUMERIC(8,2),
  cut_height NUMERIC(8,2),
  imposition_count SMALLINT,
  sheet_standard VARCHAR(5),
  display_order SMALLINT NOT NULL DEFAULT 0,
  is_custom BOOLEAN NOT NULL DEFAULT false,
  custom_min_w NUMERIC(8,2),
  custom_min_h NUMERIC(8,2),
  custom_max_w NUMERIC(8,2),
  custom_max_h NUMERIC(8,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, code)
);
-- work_width, work_height, bleed 제거: imposition_rules에서 조회


-- ============================================================
-- T4: papers (용지) - 변경 없음
-- ============================================================
CREATE TABLE papers (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,         -- PAPER_ART_250
  name VARCHAR(100) NOT NULL,
  weight SMALLINT,
  cost_per_4cut NUMERIC(10,2),              -- 원가
  selling_per_4cut NUMERIC(10,2),           -- 판매가 (견적에 직접 사용)
  display_order SMALLINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- abbreviation, sheet_size, per_ream 제거: 견적 계산에 불필요 (관리 UI에서만 필요하면 별도)


-- ============================================================
-- T5: materials (비인쇄 소재) - 변경 없음
-- ============================================================
CREATE TABLE materials (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  material_type VARCHAR(30) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- thickness, description 제거: 견적에 불필요


-- ============================================================
-- T6: print_modes (인쇄방식) - 변경 없음
-- ============================================================
CREATE TABLE print_modes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,         -- PRINT_SINGLE_COLOR
  name VARCHAR(100) NOT NULL,
  sides VARCHAR(10) NOT NULL,               -- single, double
  color_type VARCHAR(20) NOT NULL,          -- color, mono, white...
  price_code SMALLINT NOT NULL,             -- 원본 엑셀 코드 보존
  display_order SMALLINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- T7: post_processes (후가공) - 변경 없음
-- ============================================================
CREATE TABLE post_processes (
  id SERIAL PRIMARY KEY,
  group_code VARCHAR(20) NOT NULL,          -- PP001~PP008
  code VARCHAR(50) UNIQUE NOT NULL,         -- PP_PERFORATION_1LINE
  name VARCHAR(100) NOT NULL,
  process_type VARCHAR(30) NOT NULL,
  price_basis VARCHAR(15) NOT NULL DEFAULT 'per_unit',
  sheet_standard VARCHAR(5),
  display_order SMALLINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- sub_option_code, sub_option_name 제거: code와 name으로 충분


-- ============================================================
-- T8: bindings (제본) - 변경 없음
-- ============================================================
CREATE TABLE bindings (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(50) NOT NULL,
  min_pages SMALLINT,
  max_pages SMALLINT,
  page_step SMALLINT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- T9: price_tiers (수량 구간 단가) - 핵심 개선
-- ============================================================
-- 방안 A 채택: option_code를 유지하되 영문 코드 강제 + CHECK 제약
CREATE TABLE price_tiers (
  id SERIAL PRIMARY KEY,
  price_table_id INTEGER NOT NULL REFERENCES price_tables(id) ON DELETE CASCADE,
  option_code VARCHAR(50) NOT NULL,         -- 반드시 영문 시스템 코드 (PRINT_SINGLE_COLOR 등)
  min_qty INTEGER NOT NULL,
  max_qty INTEGER NOT NULL DEFAULT 999999,
  unit_price NUMERIC(12,2) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 영문 시스템 코드 강제
  CONSTRAINT chk_option_code_format CHECK (option_code ~ '^[A-Z][A-Z0-9_]+$')
);
CREATE INDEX idx_price_tiers_lookup ON price_tiers(price_table_id, option_code, min_qty);

-- price_tables는 메타데이터로 유지 (T9a)
CREATE TABLE price_tables (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  price_type VARCHAR(10) NOT NULL,          -- selling, cost
  quantity_basis VARCHAR(20) NOT NULL,       -- sheet_count, production_qty
  sheet_standard VARCHAR(5),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ============================================================
-- T10: fixed_prices (고정 단가) - Polymorphic FK 정리
-- ============================================================
CREATE TABLE fixed_prices (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  size_id INTEGER REFERENCES product_sizes(id),
  -- 조건 키를 문자열로 통합 (paper_code, print_mode_code 등)
  condition_key VARCHAR(100),               -- "PAPER_ART_250:PRINT_SINGLE_COLOR" 형식
  base_qty INTEGER NOT NULL DEFAULT 1,
  selling_price NUMERIC(12,2) NOT NULL,
  cost_price NUMERIC(12,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- paper_id, material_id, print_mode_id, option_label 제거
-- 대신 condition_key로 조건 조합을 코드 기반으로 식별
-- 애플리케이션에서 condition_key 생성 규칙 적용
CREATE INDEX idx_fixed_prices_lookup ON fixed_prices(product_id, size_id, condition_key);


-- ============================================================
-- T11: imposition_rules (판걸이 규칙) - 변경 없음
-- ============================================================
CREATE TABLE imposition_rules (
  id SERIAL PRIMARY KEY,
  cut_width NUMERIC(8,2) NOT NULL,
  cut_height NUMERIC(8,2) NOT NULL,
  work_width NUMERIC(8,2) NOT NULL,
  work_height NUMERIC(8,2) NOT NULL,
  imposition_count SMALLINT NOT NULL,
  sheet_standard VARCHAR(5) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(cut_width, cut_height, sheet_standard)
);


-- ============================================================
-- T12: paper_product_mapping (용지-상품 매핑) - 변경 없음
-- ============================================================
CREATE TABLE paper_product_mapping (
  id SERIAL PRIMARY KEY,
  paper_id INTEGER NOT NULL REFERENCES papers(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  cover_type VARCHAR(10),                   -- inner, cover, NULL
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(paper_id, product_id, cover_type)
);
```

### 3.3 추가 테이블 (현재 부재이나 필요한 것들)

```sql
-- ============================================================
-- T12+: quantity_discount_rules (수량 할인 규칙) - 신규 필요
-- Model 7 (아크릴/굿즈)의 수량 할인율 + QuantitySlider UI 데이터 소스
-- ============================================================
CREATE TABLE quantity_discount_rules (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  min_qty INTEGER NOT NULL,
  max_qty INTEGER NOT NULL DEFAULT 999999,
  discount_rate NUMERIC(5,4) NOT NULL,      -- 0.0000 ~ 1.0000
  display_price NUMERIC(12,2),              -- QuantitySlider에 표시할 단가
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_qty_discount_lookup ON quantity_discount_rules(product_id, min_qty);
```

### 3.4 제거/이동 대상 정리

| 현재 테이블/컬럼 | 조치 | 이유 |
|-----------------|------|------|
| `package_prices` | 유지 (현재 비어있지만 Model 4에 필요) | 엽서북 가격 |
| `foil_prices` | 유지 (현재 비어있지만 박/형압에 필요) | 박가공 가격 |
| `loss_quantity_config` | 유지 (Polymorphic FK 해소 적용) | 로스량 계산 |
| `products.product_type` | 제거 | `pricing_model`과 기능 중복 |
| `products.figma_section` | UI 스키마로 이동 | UI 관심사 |
| `products.editor_enabled` | Integration 스키마로 이동 | 외부 시스템 관심사 |
| `products.mes_registered` | Integration 스키마로 이동 | 외부 시스템 관심사 |
| `products.shopby_id` | Integration 스키마로 이동 | 외부 시스템 ID |
| `product_sizes.work_width/height` | 제거 (imposition_rules에서 조회) | 데이터 중복 |
| `product_sizes.bleed` | 제거 (상수 3.0mm, 코드에서 관리) | 변경 가능성 매우 낮음 |
| `papers.abbreviation` | 제거 | 견적 계산 불필요 |
| `papers.sheet_size` | 제거 | 견적 계산 불필요 |
| `papers.cost_per_ream/selling_per_ream` | 제거 | 견적은 4절 단가만 사용 |
| `post_processes.sub_option_code/name` | 제거 | code/name으로 충분 |
| `materials.thickness/description` | 제거 | 견적 계산 불필요 |
| `categories.sheet_name` | 제거 | 레거시 참조용, code로 충분 |
| `categories.icon_url` | UI 스키마로 이동 | UI 관심사 |

### 3.5 7개 가격 모델 통합 조회 구조

견적 엔진이 **단일 인터페이스**로 모든 모델을 처리하는 구조:

```typescript
// 가격 조회 통합 인터페이스
interface PriceLookupRequest {
  productId: number;
  pricingModel: string;       // formula, fixed_unit, package, component, fixed_size, fixed_per_unit
  sizeId: number;
  quantity: number;
  options: Map<string, string>; // optionKey -> choiceCode
}

// 모델별 계산 경로:
// formula/formula_cutting -> price_tiers (출력비) + papers (용지비) + price_tiers (후가공)
// fixed_unit              -> fixed_prices (상품x사이즈x조건키)
// package                 -> package_prices (상품x사이즈x인쇄x페이지x수량)
// component               -> price_tiers (내지) + price_tiers (표지) + price_tiers (제본)
// fixed_size              -> fixed_prices (상품x사이즈)
// fixed_per_unit           -> fixed_prices (상품x사이즈) x quantity x quantity_discount_rules
```

---

## 4. 현재 스키마 -> 이상적 스키마 갭 분석

### 4.1 제거해야 할 테이블/컬럼

| 대상 | 유형 | 조치 | 우선순위 |
|------|------|------|---------|
| `products.product_type` | 컬럼 | 삭제 (pricing_model로 대체) | P2 |
| `products.figma_section` | 컬럼 | UI 메타데이터 테이블로 이동 | P3 |
| `products.editor_enabled` | 컬럼 | product_editor_mapping 존재 여부로 파생 | P2 |
| `products.mes_registered` | 컬럼 | product_mes_mapping 존재 여부로 파생 | P2 |
| `papers.abbreviation` | 컬럼 | 삭제 | P3 |
| `papers.sheet_size` | 컬럼 | 삭제 | P3 |
| `papers.cost_per_ream` | 컬럼 | 삭제 | P3 |
| `papers.selling_per_ream` | 컬럼 | 삭제 | P3 |
| `product_sizes.work_width` | 컬럼 | 삭제 (imposition_rules에서 조회) | P3 |
| `product_sizes.work_height` | 컬럼 | 삭제 | P3 |
| `product_sizes.bleed` | 컬럼 | 삭제 (상수) | P3 |
| `post_processes.sub_option_code` | 컬럼 | 삭제 | P3 |
| `post_processes.sub_option_name` | 컬럼 | 삭제 | P3 |
| `materials.thickness` | 컬럼 | 삭제 | P3 |
| `materials.description` | 컬럼 | 삭제 | P3 |
| `categories.sheet_name` | 컬럼 | 삭제 | P3 |
| `categories.icon_url` | 컬럼 | UI 메타데이터로 이동 | P3 |
| `integration_dead_letters` | 테이블 | Integration 스키마로 이동 (논리적 분리) | P3 |

### 4.2 추가해야 할 테이블/컬럼

| 대상 | 유형 | 용도 | 우선순위 |
|------|------|------|---------|
| `quantity_discount_rules` | 테이블 (신규) | Model 7 수량 할인 + QuantitySlider 데이터 | P1 |
| `price_tiers` CHECK 제약 | 제약조건 | option_code 영문 시스템 코드 강제 | P1 |
| `loss_quantity_config.category_id` | 컬럼 | Polymorphic FK 해소 | P2 |
| `loss_quantity_config.product_id` | 컬럼 | Polymorphic FK 해소 | P2 |

### 4.3 데이터 마이그레이션 전략

#### 단계 1: 코드 정규화 마이그레이션 (비파괴적)

```sql
-- Step 1a: price_tiers.option_code 한국어 -> 영문 코드 변환
-- 현재 "1줄" -> "PP_PERFORATION_1LINE"
-- 현재 "무광코팅(단면)" -> "PP_COATING_MATTE_SINGLE"

-- 매핑 테이블 임시 생성
CREATE TEMP TABLE option_code_migration (
  old_code VARCHAR(50),
  new_code VARCHAR(50)
);

INSERT INTO option_code_migration VALUES
  ('1줄', 'PP_PERFORATION_1LINE'),
  ('2줄', 'PP_PERFORATION_2LINE'),
  ('3줄', 'PP_PERFORATION_3LINE'),
  ('5줄', 'PP_PERFORATION_5LINE'),
  -- ... 모든 한국어 코드 매핑
;

-- Step 1b: 일괄 업데이트
UPDATE price_tiers pt
SET option_code = m.new_code
FROM option_code_migration m
WHERE pt.option_code = m.old_code;

-- Step 1c: CHECK 제약 추가
ALTER TABLE price_tiers
ADD CONSTRAINT chk_option_code_format
CHECK (option_code ~ '^[A-Z][A-Z0-9_]+$');
```

#### 단계 2: 신규 테이블 생성 + 데이터 이관

```sql
-- quantity_discount_rules 생성 + 엑셀 데이터에서 시드
-- (현재 DB에 해당 데이터 없음, 엑셀 추가 분석 후 시드 필요)
```

#### 단계 3: 불필요 컬럼 소프트 삭제

```sql
-- 즉시 삭제하지 않고 deprecation 기간 운영
-- Step 3a: 새 코드에서 해당 컬럼 사용 중단
-- Step 3b: 마이그레이션으로 컬럼 삭제 (2주 후)
```

---

## 5. 실행 계획

### P1: 즉시 수정 (데이터 무결성 복구) -- 1~2일

| # | 작업 | 영향 범위 | 위험도 |
|---|------|----------|--------|
| 1-1 | `price_tiers.option_code` 한국어 값을 영문 시스템 코드로 마이그레이션 | price_tiers 데이터, 견적 엔진 코드 | **중** (코드 변경 병행 필요) |
| 1-2 | `price_tiers`에 CHECK 제약 추가 (`^[A-Z][A-Z0-9_]+$`) | DDL 변경 | **낮** |
| 1-3 | `quantity_discount_rules` 테이블 생성 | DDL 추가 | **낮** |
| 1-4 | `papers.selling_per_4cut` 데이터 시드 검증 (현재 비어있을 수 있음) | 데이터 검증 | **높** (용지비 계산 핵심) |

**P1 완료 기준**: 7개 가격 모델 중 Model 1~3 계산이 DB 데이터만으로 정확하게 동작.

### P2: 단기 개선 (핵심 계산 경로 복구) -- 3~5일

| # | 작업 | 영향 범위 | 위험도 |
|---|------|----------|--------|
| 2-1 | `package_prices` 데이터 시드 (Model 4 엽서북) | 데이터 추가 | **낮** |
| 2-2 | `foil_prices` 데이터 시드 (박/형압) | 데이터 추가 | **낮** |
| 2-3 | `quantity_discount_rules` 데이터 시드 (Model 7 아크릴/굿즈 할인) | 데이터 추가 + 엑셀 분석 | **중** |
| 2-4 | `products` 테이블에서 `product_type` 사용처 제거 (코드 레벨) | 애플리케이션 코드 | **중** |
| 2-5 | `products.editor_enabled`, `products.mes_registered` 파생 로직 구현 | 코드 변경 | **낮** |
| 2-6 | `loss_quantity_config` Polymorphic FK 해소 | DDL + 데이터 마이그레이션 | **낮** (행 5개 미만) |
| 2-7 | PriceEngine 클래스 리팩토링 (7개 모델 분기 지원) | `/packages/widget/src/engine/price-engine.ts` | **높** (견적 핵심) |

**P2 완료 기준**: 7개 가격 모델 모두 DB 데이터 기반 자동 계산 가능, 5종 샘플 상품 검증 통과.

### P3: 장기 재설계 (관심사 분리) -- 1~2주

| # | 작업 | 영향 범위 | 위험도 |
|---|------|----------|--------|
| 3-1 | 스키마 파일 분리: `huni-pricing-core.schema.ts` (견적 전용) 도출 | 파일 구조 | **낮** |
| 3-2 | `option_choices` Polymorphic FK 정리 (5개 nullable FK -> 2개 컬럼 또는 코드 기반 조인) | DDL + 데이터 마이그레이션 + 애플리케이션 | **높** |
| 3-3 | `products` 테이블에서 UI/Integration 컬럼 분리 | DDL + 코드 | **중** |
| 3-4 | 불필요 컬럼 삭제 (papers.abbreviation, sheet_size 등) | DDL 마이그레이션 | **낮** |
| 3-5 | Integration 테이블 논리적 분리 (별도 스키마 파일 이미 존재하므로 코드 레벨 분리만) | 코드 구조 | **낮** |
| 3-6 | UI 메타데이터 테이블 분리 (figma_section, icon_url 등 이동) | DDL + 코드 | **낮** |
| 3-7 | 견적 엔진 통합 테스트 스위트 구축 (7개 모델 x 5개 샘플 = 35 케이스) | 테스트 코드 | **높** (품질 보장) |

**P3 완료 기준**:
- 견적 핵심 테이블 12개 이내로 정리
- UI/Integration 관심사 물리적 분리 완료
- 견적 통합 테스트 35개 케이스 전체 통과
- `option_choices`의 Polymorphic FK 완전 제거

---

## 부록 A: 현재 vs 이상적 테이블 대응표

| 현재 (26+4=30개) | 이상적 견적 핵심 (12개) | 변경 사항 |
|-----------------|---------------------|----------|
| categories | categories | sheet_name, icon_url 제거 |
| products | products | product_type, figma_section, editor_enabled, mes_registered, shopby_id 제거 |
| product_sizes | product_sizes | work_width/height, bleed 제거 |
| papers | papers | abbreviation, sheet_size, per_ream 컬럼 제거 |
| materials | materials | thickness, description 제거 |
| print_modes | print_modes | 변경 없음 |
| post_processes | post_processes | sub_option_code/name 제거 |
| bindings | bindings | 변경 없음 |
| price_tables | price_tables | 변경 없음 |
| price_tiers | price_tiers | option_code 영문 강제 + CHECK |
| fixed_prices | fixed_prices | 4개 nullable FK -> condition_key 통합 |
| package_prices | (유지) | 데이터 시드 필요 |
| foil_prices | (유지) | 데이터 시드 필요 |
| imposition_rules | imposition_rules | cut_size_code 제거 |
| loss_quantity_config | loss_quantity_config | Polymorphic FK -> 명시적 FK |
| paper_product_mapping | paper_product_mapping | 변경 없음 |
| (신규) | **quantity_discount_rules** | Model 7 + QuantitySlider |
| option_definitions | (UI 스키마 유지) | 관심사 분리만 |
| product_options | (UI 스키마 유지) | 관심사 분리만 |
| option_choices | (UI 스키마 유지) | Polymorphic FK 정리 |
| option_constraints | (UI 스키마 유지) | 관심사 분리만 |
| option_dependencies | (UI 스키마 유지) | 관심사 분리만 |
| mes_items | (Integration 유지) | 변경 없음 |
| mes_item_options | (Integration 유지) | 변경 없음 |
| product_mes_mapping | (Integration 유지) | 변경 없음 |
| product_editor_mapping | (Integration 유지) | 변경 없음 |
| option_choice_mes_mapping | (Integration 유지) | 변경 없음 |
| integration_dead_letters | (Integration 유지) | 변경 없음 |
| orders | (Operations 유지) | 변경 없음 |
| order_status_history | (Operations 유지) | 변경 없음 |
| order_design_files | (Operations 유지) | 변경 없음 |
| widgets | (Operations 유지) | 변경 없음 |
| data_import_log | (Operations 유지) | 변경 없음 |

## 부록 B: 위험 요소 및 완화 전략

| 위험 | 영향 | 확률 | 완화 |
|------|------|------|------|
| option_code 마이그레이션 시 매핑 누락 | 견적 오류 | 중 | 마이그레이션 전 전수 검증 스크립트 작성 |
| PriceEngine 리팩토링 시 기존 계산 결과 변경 | 가격 불일치 | 높 | 현재 상태의 snapshot 테스트 먼저 작성 |
| papers.selling_per_4cut 데이터 부재 | 용지비 계산 불가 | 높 | P1에서 즉시 확인 및 시드 |
| quantity_discount_rules 엑셀 데이터 미확보 | Model 7 계산 불가 | 중 | 엑셀 추가 분석 별도 진행 |
| option_choices Polymorphic FK 변경 시 기존 쿼리 파손 | 옵션 조회 오류 | 중 | P3로 후순위, 충분한 테스트 후 실행 |

---

## 부록 C: 현재 PriceEngine 분석

현재 `/packages/widget/src/engine/price-engine.ts`는 **간소화된 클라이언트 사이드 계산기**로, 7개 가격 모델 중 일부만 지원:

```typescript
// 현재 지원하는 것:
// - 사이즈 기반 수량 구간 단가 조회 (Pattern A 일부)
// - 고정 가격 옵션 조회 (Pattern B 일부)

// 현재 미지원:
// - 용지비 계산 (paper.selling_per_4cut / imposition_count * (qty + loss))
// - 별색비 계산 (별도 price_tier 조회)
// - 코팅비/가공비/후가공비 (각각 별도 price_tier 조회)
// - 패키지 가격 (package_prices)
// - 구성품 합산 (내지 + 표지 + 제본)
// - 수량 할인 (quantity_discount_rules)
// - 박/형압 가격 (foil_prices)
```

**PriceEngine 재설계 방향**: Strategy 패턴으로 pricing_model별 계산기 분리

```
PriceEngine
  ├── FormulaCalculator        (Model 1, 2)
  ├── FixedUnitCalculator      (Model 3)
  ├── PackageCalculator        (Model 4)
  ├── ComponentCalculator      (Model 5)
  ├── FixedSizeCalculator      (Model 6)
  └── FixedPerUnitCalculator   (Model 7)
```

---

> 이 보고서는 현재 코드베이스(Drizzle ORM 스키마 9파일, SPEC-DATA-002 spec.md)와
> PriceEngine 구현체를 직접 분석하여 작성되었으며,
> 모든 SQL 예시는 현재 Drizzle ORM 구조에서 변환 가능한 형태로 제공됩니다.
