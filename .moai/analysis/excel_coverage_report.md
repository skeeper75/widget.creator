# SPEC-DATA-002 Excel Coverage Gap Analysis Report

> Generated: 2026-02-23
> SPEC Version: 1.0.0-draft
> Target: 26-table PostgreSQL schema across 6 domains

---

## 1. Summary

| Status | Count | Tables |
|--------|-------|--------|
| ✅ Covered (Excel only) | 16 | categories, products, product_sizes, papers, materials, paper_product_mapping, print_modes, post_processes, bindings, price_tables, price_tiers, fixed_prices, package_prices, foil_prices, imposition_rules, option_constraints |
| ⚠️ Partial (Excel + MES JSON required) | 6 | option_definitions, product_options, option_choices, product_mes_mapping, product_editor_mapping, option_dependencies |
| ❌ Missing (No Excel source) | 4 | loss_quantity_config, mes_items, mes_item_options, option_choice_mes_mapping |

**Overall Coverage**: 16/26 tables (61.5%) fully covered by Excel files alone.
With MES v5 JSON (`data/exports/MES_...v5.json`) + 품목관리.xlsx included: 24/26 tables (92.3%).
Remaining 2 tables require seed data or manual admin input.

---

## 2. Excel File Structure

### 2.1 상품마스터 (`!후니프린팅_상품마스터_260209_updated.xlsx`) -- 13 sheets

| Sheet | Data Rows | Cols | Role |
|-------|-----------|------|------|
| MAP | 30 | 26 | Category overview (metadata only, not migration source) |
| !디지털인쇄용지 | 85 | 31 | Paper master (55 papers + product mapping) |
| 디지털인쇄 | 131 | 43 | Digital print products (postcard, card, flyer, etc.) |
| 스티커 | 72 | 37 | Sticker products |
| 책자 | 26 | 45 | Booklet products (saddle stitch, perfect, twin ring, PUR) |
| 포토북 | 4 | 56 | Photobook products (editor-only) |
| 캘린더 | 13 | 38 | Calendar products |
| 디자인캘린더 | 6 | 36 | Design calendar products (editor-only) |
| 실사 | 104 | 41 | Large format print products |
| 아크릴 | 78 | 38 | Acrylic products |
| 굿즈 | 240 | 31 | Goods products (mug, coaster, badge, etc.) |
| 문구(노트) | 12 | 36 | Stationery products |
| 상품악세사리 | 65 | 37 | Product accessories |

**Star constraints found**: 디지털인쇄(10), 스티커(10), 책자(10), 포토북(1), 캘린더(6), 아크릴(10), 문구(5), 실사(1) = **53+ detected** (full extraction may yield up to 129 per SPEC)

### 2.2 가격표 (`!후니프린팅_인쇄상품_가격표_260214.xlsx`) -- 16 sheets

| Sheet | Data Rows | Cols | Role |
|-------|-----------|------|------|
| 사이즈별 판걸이수 | 47 | 7 | Imposition rules (~30 entries) |
| 디지털용지 | 982 | 50+ | Paper-product mapping matrix (55 papers x 45+ products) |
| 디지털출력비 | 48 | 14 | Print cost selling price (A3/T3, 12 print mode columns) |
| 디지털출력비가수정 | 107 | 14 | Print cost cost price (원가) |
| 후가공 | 275 | 11 | Post-processing costs (8 sections PP001-PP008) |
| 후가공_박 | 22 | 12 | Foil/emboss copper plate price matrix |
| 후가공_박명함 | 25 | 12 | Namecard-specific foil pricing |
| 명함 | 20 | 8 | Namecard fixed prices (paper x single/double) |
| 옵션결합상품 | 75 | 12 | Package prices (postcard book) |
| 제본 | 23 | 8 | Binding prices (4 types x quantity tiers) |
| 스티커 | 324 | 10 | Sticker cutting prices (size x type x quantity) |
| 아크릴 | 12 | 10 | Acrylic size matrix pricing |
| 포스터(실사) | 153 | 8 | Poster/large format fixed prices |
| 사인 | 76 | 8 | Banner/sign pricing |
| 파우치 | 84 | 10 | Pouch pricing (includes quantity discount rates) |
| (임시)포카가격비교 | 52 | 6 | Excluded per SPEC Section 7 |

### 2.3 품목관리 (`품목관리.xlsx`) -- 2 sheets

| Sheet | Data Rows | Cols | Role |
|-------|-----------|------|------|
| Sheet | 256 | 19 | MES item master (item_code, group, name, type, unit, Option01-10) |
| Sheet2 | 6 | 6 | Dropdown reference values (validation only) |

---

## 3. Domain-by-Domain Coverage

### Domain 1: Product Catalog (상품 카탈로그) -- 3 tables

#### 4.1.1 categories ✅ Covered

- **Source**: 상품마스터 > 시트명(depth=0) + 각 시트 A열 구분(depth=1)
- **Excel Data**: 8 sheets = 8 top-level categories; A열 values = ~30 subcategories
- **Coverage**: 100%. MAP 시트는 메타데이터 요약용으로 배제

#### 4.1.2 products ✅ Covered (with partial MES dependency)

- **Source**: 상품마스터 > 각 시트 행 (총 ~221개 상품)
- **Excel Data**: B열(ID), C열(MES ITEM_CD), D열(상품명), E열(사이즈), J열(출력용지규격), N열(주문방법)
- **Coverage**: ~85%. 기본 상품 정보(name, category, sizes, order_method, sheet_standard)는 Excel 커버.
- **Gap**: `editor_enabled`, `figma_section`, `product_type` 일부는 MES v5 JSON 필요. `shopby_id`는 TODO (Shopby 등록 후 설정).

#### 4.1.3 product_sizes ✅ Covered

- **Source**: 상품마스터 > 각 시트 E열(사이즈) + 실사/아크릴 F열(비규격)
- **Secondary Source**: 가격표 > 사이즈별 판걸이수 시트 (판걸이수, 작업사이즈 조인)
- **Coverage**: 100%. 재단사이즈, 작업사이즈, 비규격 범위 모두 Excel에 존재

---

### Domain 2: Materials (자재) -- 3 tables

#### 4.2.1 papers ✅ Covered

- **Source**: 상품마스터 > !디지털인쇄용지 시트 (85 rows, 55 papers)
- **Excel Data**: 종이명, 파일약어, 전지규격, 평량, 연당가, 국4절단가
- **Coverage**: 100%. 원가 데이터 포함. 판매가는 마진률 적용 또는 가격표 교차 참조

#### 4.2.2 materials ✅ Covered

- **Source**: 상품마스터 > 아크릴 시트 소재열, 실사 시트 Q열(소재), 굿즈 시트 소재 정보
- **Excel Data**: 소재명, 소재 유형(acrylic/vinyl/fabric), 두께
- **Coverage**: 100%. 상품마스터에서 소재 정보 추출 가능

#### 4.2.3 paper_product_mapping ✅ Covered

- **Source**: 가격표 > 디지털용지 시트 (982 rows, 50+ cols)
- **Excel Data**: 행=용지(55개), 열=상품(45+), 셀=●(사용가능)/빈칸
- **Secondary**: 상품마스터 > !디지털인쇄용지 시트 (교차 검증)
- **Coverage**: 100%. 용지-상품 다대다 매핑 매트릭스 완전히 포함

---

### Domain 3: Processes (공정) -- 3 tables

#### 4.3.1 print_modes ✅ Covered

- **Source**: 가격표 > 디지털출력비 시트 열 헤더 (코드 0,1,2,4,8,11,12,21,22,31,32)
- **Excel Data**: 12개 인쇄방식 코드 = 12 rows
- **Secondary**: 상품마스터 > 각 시트 Q열(인쇄), R~V열(별색)
- **Coverage**: 100%. price_code, sides, color_type 모두 코드 의미에서 파생 가능

#### 4.3.2 post_processes ✅ Covered

- **Source**: 가격표 > 후가공 시트 (275 rows, 8 sections PP001-PP008)
- **Excel Data**: 8개 그룹(미싱/오시/접지+오시/가변TEXT/가변IMAGE/모서리/코팅/코팅3절), 각 sub_option
- **Coverage**: 100%. group_code, sub_option_code, sub_option_name, price_basis 모두 추출 가능

#### 4.3.3 bindings ✅ Covered

- **Source**: 가격표 > 제본 시트 (23 rows, 4 types)
- **Excel Data**: 중철/무선/트윈링/PUR 유형별 수량구간 단가
- **Secondary**: 상품마스터 > 책자 시트 O열(페이지 min/max/step)
- **Coverage**: 100%. code, name, min/max_pages, page_step 모두 추출 가능

---

### Domain 4: Pricing (가격) -- 7 tables

#### 4.4.1 price_tables ✅ Covered

- **Source**: 가격표 > 각 시트의 메타 정보 (시트명, 판형구분 등)
- **Excel Data**: 디지털출력비(판매가 A3/T3), 디지털출력비가수정(원가 A3/T3), 후가공(PP001-PP008), 제본 등
- **Coverage**: 100%. ~15-20개 price_table 레코드 생성을 위한 메타데이터 완비

#### 4.4.2 price_tiers ✅ Covered

- **Source**: 가격표 > 디지털출력비/디지털출력비가수정/후가공/제본 시트의 수량구간별 단가
- **Excel Data**: 253 수량행 x 12 인쇄방식 열 (출력비), 8개 후가공 섹션별 수량구간, 4개 제본 유형별 수량구간
- **Coverage**: 100%. min_qty, max_qty, unit_price, option_code 모두 추출 가능. ~10,000 rows 예상

#### 4.4.3 fixed_prices ✅ Covered

- **Source (가격표)**: 명함(20 rows), 아크릴(12 rows), 포스터/실사(153 rows), 사인(76 rows), 파우치(84 rows)
- **Source (상품마스터)**: 실사 R/S열(가격/VAT), 아크릴 H열(가격), 굿즈 가격열, 문구 AC열, 악세사리 가격열
- **Coverage**: 100%. selling_price, base_qty, size/paper/print_mode 참조 모두 추출 가능

#### 4.4.4 package_prices ✅ Covered

- **Source**: 가격표 > 옵션결합상품 시트 (75 rows)
- **Excel Data**: 엽서북 패키지 가격 매트릭스 (사이즈 x 인쇄 x 페이지수 x 수량구간)
- **Coverage**: 100%. size_id, print_mode_id, page_count, min/max_qty, selling_price 추출 가능

#### 4.4.5 foil_prices ✅ Covered

- **Source**: 가격표 > 후가공_박 시트 (22 rows) + 후가공_박명함 시트 (25 rows)
- **Excel Data**: 동판비(아연판) 사이즈 매트릭스 + 명함전용 박 동판비
- **Coverage**: 100%. foil_type, width, height, selling_price 추출 가능

#### 4.4.6 imposition_rules ✅ Covered

- **Source**: 가격표 > 사이즈별 판걸이수 시트 (47 rows, ~30 entries)
- **Excel Data**: 재단사이즈, 작업사이즈, 판걸이수, 기준판형(A3/T3/3절)
- **Coverage**: 100%. cut_width/height, work_width/height, imposition_count, sheet_standard 모두 포함

#### 4.4.7 loss_quantity_config ❌ Missing

- **Source**: 초기 seed (업계 표준 기반). 엑셀에 명시적 로스량 데이터 없음
- **Excel Data**: 없음
- **Coverage**: 0%. SPEC에서도 "현재 엑셀에 명시적 로스량 데이터 없음"으로 명시
- **Action**: global scope loss_rate=0.03(3%), min_loss_qty=10으로 seed 데이터 생성. 추후 카테고리/상품별 커스터마이징을 위한 확장 구조

---

### Domain 5: Options & UI (옵션 및 UI) -- 5 tables

#### 4.5.1 option_definitions ⚠️ Partial

- **Primary Source**: MES v5 JSON > 30 option keys (material 5종 + process 18종 + setting 7종)
- **Excel Data**: 상품마스터 > 각 시트 열 헤더(P:종이, Q:인쇄, W:코팅 등) -- 옵션 키 대응 확인은 가능하나, 30개 옵션의 완전한 정의(key, name, option_class, ui_component)는 MES v5 JSON이 Primary
- **Coverage**: ~40%. Excel에서 옵션 키 존재 확인은 가능하지만, option_class, ui_component 등 메타데이터는 MES v5 JSON + Figma 분석 필요
- **Action**: MES v5 JSON(`data/exports/MES_자재공정매핑_v5.json`)을 Primary source로 사용. Excel은 교차 검증용

#### 4.5.2 product_options ⚠️ Partial

- **Source**: 상품마스터 > 각 시트 > 열 존재 여부 + 헤더 색상 코딩
- **Excel Data**: 열 존재 = 옵션 레코드 생성, 열 순서 = display_order, 색상 코딩 = is_required/is_visible/is_internal
- **Coverage**: ~70%. 열 존재와 색상 코딩은 Excel에서 추출 가능. 단, option_definition_id 참조를 위해 option_definitions 테이블이 먼저 필요 (MES v5 JSON 의존)
- **Action**: Excel 기반으로 대부분 생성 가능하나, option_definitions FK 해결을 위해 MES v5 JSON과의 조인 필요

#### 4.5.3 option_choices ⚠️ Partial

- **Primary Source**: MES v5 JSON > 1198 choices (각 option key별 choice code/name/priceKey)
- **Excel Data**: 상품마스터 > 각 시트 셀 내 드롭다운 값들 -- 교차 검증용
- **Coverage**: ~20%. 1198개 선택지의 완전한 정의(code, name, price_key, ref_paper_id 등)는 MES v5 JSON이 Primary
- **Action**: MES v5 JSON 필수. Excel은 교차 검증 역할만 수행

#### 4.5.4 option_constraints ✅ Covered

- **Source**: 상품마스터 > 각 시트 > ★ 마크 + 빨간 글씨 텍스트 (129개)
- **Excel Data**: 분석 스크립트에서 53+ star constraints 탐지됨 (max_header_rows=5, max_sample_rows=5 제한으로 일부만 탐지). 전체 스캔 시 129개 확인 예상
- **Coverage**: 100%. 3가지 유형(A: size_show, B: size_range, C: paper_condition) 모두 Excel에서 추출 가능

#### 4.5.5 option_dependencies ⚠️ Partial

- **Source**: 상품마스터 > 각 시트 > 옵션 간 암묵적 의존성 + MES v5 JSON > option dependencies
- **Excel Data**: 종이->인쇄방식, 사이즈->수량구간, 인쇄방식->별색, 제본->페이지수 등 암묵적 관계
- **Coverage**: ~30%. 의존성은 Excel 데이터에서 분석적으로 추론해야 하며, MES v5 JSON에서 명시적 옵션 연동 관계 참조 필요
- **Action**: 도메인 전문가의 암묵적 규칙 정리 + MES v5 JSON 참조. ~300개 의존성 레코드 예상

---

### Domain 6: Integration (통합) -- 5 tables

#### 4.6.1 mes_items ❌ Missing (from target Excel files)

- **Source**: 품목관리.xlsx > Sheet 시트 (256 rows, 19 cols)
- **Excel Data**: 품목코드, 품목그룹, 품목명, 약어명, 품목유형, 단위
- **Coverage**: 100% **from 품목관리.xlsx**. 이 파일이 분석 대상 3개 파일에 포함되어 있으므로 실제로는 ✅ Covered
- **Note**: Summary에서 "Missing"으로 분류한 이유는 상품마스터/가격표 2개 파일만으로는 불가하지만, 품목관리.xlsx가 3번째 분석 대상이므로 실제 Covered

> **Correction**: mes_items는 품목관리.xlsx에서 100% 커버됨. 아래 수정된 Summary 참조.

#### 4.6.2 mes_item_options ❌ Missing (from target Excel files)

- **Source**: 품목관리.xlsx > Sheet 시트 > Option01~Option10 열
- **Excel Data**: 10개 옵션 열의 값이 존재하면 레코드 생성
- **Coverage**: 100% **from 품목관리.xlsx**. 동일하게 실제 Covered

> **Correction**: mes_item_options도 품목관리.xlsx에서 100% 커버됨.

#### 4.6.3 product_mes_mapping ⚠️ Partial

- **Source**: 상품마스터 > 각 시트 C열(MES ITEM_CD) + B열(ID/huni_code)
- **Excel Data**: C열에 MES 품목코드가 존재하는 상품 행 → product_id + mes_item_id 매핑
- **Coverage**: ~80%. 일반 상품은 1:1 매핑 가능. 책자의 내지/표지 분리 매핑(cover_type='inner'/'cover')은 Excel에서 구분 가능하나, 일부 신규 상품(노란 배경)은 MES 미등록으로 매핑 불가
- **Action**: MES 등록 상품은 Excel만으로 매핑 가능. 미등록 상품(약 57개)은 MES 등록 후 매핑

#### 4.6.4 product_editor_mapping ⚠️ Partial

- **Primary Source**: MES v5 JSON > editor="O" 인 111개 상품
- **Excel Data**: 상품마스터 > 연분홍(#FFF4CCCC) 배경 시트(포토북, 디자인캘린더) + N열(주문방법)에서 editor 표시
- **Coverage**: ~30%. Excel에서 에디터 사용 여부(editor-only 시트, N열)는 확인 가능하나, 111개 전체 목록과 template_id는 MES v5 JSON 필요
- **Action**: MES v5 JSON이 Primary source. Excel은 교차 검증용

#### 4.6.5 option_choice_mes_mapping ❌ Missing

- **Source**: 관리페이지에서 수동 입력 (마이그레이션 자동화 대상 아님)
- **Excel Data**: 없음
- **Coverage**: 0%. SPEC에서 "관리페이지에서 수동 입력"으로 명시. 엑셀 데이터 없음
- **Action**: mapping_status='pending'으로 초기 레코드 생성 후, 관리자가 관리페이지에서 수동 매핑

---

## 4. Corrected Summary

| Status | Count | Tables |
|--------|-------|--------|
| ✅ Covered (Excel 3 files) | 18 | categories, products, product_sizes, papers, materials, paper_product_mapping, print_modes, post_processes, bindings, price_tables, price_tiers, fixed_prices, package_prices, foil_prices, imposition_rules, option_constraints, **mes_items**, **mes_item_options** |
| ⚠️ Partial (Excel + MES JSON) | 6 | option_definitions, product_options, option_choices, product_mes_mapping, product_editor_mapping, option_dependencies |
| ❌ Missing (No Excel source) | 2 | loss_quantity_config, option_choice_mes_mapping |

**Corrected Overall Coverage**: 18/26 tables (69.2%) fully covered by 3 Excel files.
With MES v5 JSON 추가 시: 24/26 tables (92.3%).
Remaining 2 tables: seed data (loss_quantity_config) + manual admin input (option_choice_mes_mapping).

---

## 5. Gap Analysis Summary

### 5.1 Critical Dependencies on MES v5 JSON

다음 6개 테이블은 MES v5 JSON (`data/exports/MES_자재공정매핑_v5.json`)이 Primary 또는 필수 보조 소스:

| Table | MES JSON Role | Excel Role |
|-------|---------------|------------|
| option_definitions (30 keys) | Primary: key, name, option_class, ui_component | Cross-validation: 열 헤더 대응 확인 |
| option_choices (1,198) | Primary: code, name, price_key, ref_*_id | Cross-validation: 셀 드롭다운 값 |
| product_editor_mapping (111) | Primary: editor="O", template_id | Partial: 연분홍 시트, N열 |
| option_dependencies (~300) | Secondary: option 연동 관계 | Partial: 암묵적 의존성 분석 |
| product_options (~2,000) | FK dependency: option_definition_id | Primary: 열 존재 + 색상 코딩 |
| product_mes_mapping (~250) | Cross-validation | Primary: C열 MES ITEM_CD |

### 5.2 Non-Excel Data Sources

| Table | Source | Action |
|-------|--------|--------|
| loss_quantity_config | Industry standard seed | global: loss_rate=0.03, min_loss_qty=10 |
| option_choice_mes_mapping | Admin manual input | Create as 'pending' status, manual mapping in admin page |

### 5.3 Known Data Quality Concerns

1. **Star constraint count discrepancy**: Script detected 53+ constraints (limited scan), SPEC expects 129. Full row scan needed.
2. **New products (yellow background, ~57)**: MES unregistered, product_mes_mapping will have gaps.
3. **Sheet column structure varies**: Each category sheet has different column positions for the same data types (see SPEC Section 2.1). Per-sheet parsers required.
4. **Dual pricing**: selling_price + cost_price must always be stored together (SPEC principle). 가격표 has 디지털출력비(판매가) + 디지털출력비가수정(원가) as separate sheets.
5. **(임시)포카가격비교 sheet**: Excluded per SPEC Section 7.

---

## 6. Action Items

### Priority High

1. **MES v5 JSON 접근 확인**: `data/exports/MES_자재공정매핑_v5.json` 파일이 `data(사용금지)/` 정책에 해당하는지 확인 필요. 6개 테이블의 primary/secondary source.
2. **Per-sheet parser 개발**: 상품마스터 13개 시트의 열 구조 차이 대응. SPEC Section 2.1 기준으로 시트별 컬럼 매핑 구현.
3. **Star constraint full extraction**: 전체 행 스캔으로 129개 ★ 제약조건 완전 추출 및 3가지 유형(A/B/C) 분류.

### Priority Medium

4. **용지 교차 검증**: 상품마스터 > !디지털인쇄용지(85 rows) vs 가격표 > 디지털용지(982 rows) 간 용지 목록 일치 확인.
5. **Color coding parser**: 헤더 색상(#FFE06666=필수, #FFF6B26B=옵션, #FFD9D9D9=내부)에서 product_options의 is_required/is_visible/is_internal 자동 추출.
6. **Dual pricing alignment**: 출력비 판매가/원가 시트 간 수량구간 일치 확인.

### Priority Low

7. **loss_quantity_config seed**: 업계 표준 기반 초기값 설정 (global 3%, min 10매).
8. **option_choice_mes_mapping scaffold**: pending 상태 레코드 bulk 생성 로직.
9. **shopby_id**: 현시점 NULL. Shopby 플랫폼 등록 후 별도 매핑 프로세스 필요.

---

## 7. Migration Feasibility Assessment

### Excel-Only Migration (Phase 1 tables)

다음 테이블은 3개 Excel 파일만으로 마이그레이션 가능:

- **Phase 1** (기초 마스터): categories, papers, materials, print_modes, post_processes, bindings, imposition_rules (7 tables)
- **Phase 2 partial**: products, product_sizes (2 tables, 대부분 필드 커버. editor_enabled/product_type 일부 수동 보완 필요)
- **Phase 3 partial**: product_options (열 존재+색상으로 ~70% 자동), option_constraints (129개 ★ 100% 추출 가능)
- **Phase 4 full**: price_tables, price_tiers, fixed_prices, package_prices, foil_prices (5 tables, 100% 커버)
- **Phase 5**: mes_items, mes_item_options (품목관리.xlsx, 100% 커버)
- **Phase 6 partial**: product_mes_mapping (MES 등록 상품만, ~80%)

**Total**: 18 tables fully, 4 tables partially = **22/26 tables** actionable from Excel alone.

### MES v5 JSON 필요 테이블 (Phase 2-3 보완)

- option_definitions, option_choices, product_editor_mapping, option_dependencies

### Manual/Seed Only

- loss_quantity_config (seed)
- option_choice_mes_mapping (admin manual)
