# SPEC-DATA-002: 인쇄 자동견적 데이터 정규화

> Version: 1.0.0-draft
> Created: 2026-02-22
> Status: Draft (사용자 검토 대기)
> Priority: High

---

## 1. 개요

### 1.1 목적

후니프린팅의 3개 엑셀 파일(상품마스터, 인쇄상품 가격표, 품목관리)에 담긴 비정형 데이터를
관계형 데이터베이스로 정규화하여 다음 목적을 달성한다:

1. **자동견적 엔진**: 7가지 가격 산정 모델에 따른 실시간 가격 계산
2. **자재/공정/가격 관리**: CRUD 기반 독립 관리 (추가/수정/삭제 가능)
3. **MES 매핑**: 품목관리 시스템과의 양방향 매핑
4. **UI 옵션 관리**: 주문 화면의 옵션 배치순서, 의존성, 제약조건 관리
5. **확장성**: PDF 파일주문, 에디터 모드 등 주문방식 확장 지원

### 1.2 데이터 출처

| 파일 | 시트 수 | 역할 |
|------|---------|------|
| 상품마스터 (260209) | 13 | 상품 정의, 옵션, 제약조건 |
| 인쇄상품 가격표 (260214) | 16 | 가격 테이블, 판걸이, 후가공 단가 |
| 품목관리 | 2 | MES 품목코드, 그룹, 옵션 |

### 1.3 코드 체계 원칙

- **보존**: ID(웹사이트 상품코드, 예: 14529), MES ITEM_CD(품목코드, 예: 001-0001)
- **신규 생성**: 나머지 모든 코드는 DB 관리에 적합한 직관적 네이밍으로 새로 설계
- 예: `PRINT_MODE_SINGLE_COLOR` (단면칼라), `PAPER_ART_250` (아트지 250g)

---

## 2. 발견된 데이터 구조

### 2.1 상품마스터 시트별 컬럼 구조 차이

각 카테고리 시트마다 컬럼 헤더 구조가 다름 (동일 위치에 다른 의미):

| 영역 | 디지털인쇄 | 스티커 | 책자 | 실사 | 아크릴 |
|------|----------|--------|------|------|--------|
| 기본정보 | A~D (구분/ID/MES/상품명) | 동일 | 동일 | 동일 | 동일 |
| 사이즈 | E (사이즈) | E (사이즈) | E (사이즈) | E+F (사이즈+비규격) | E+F (사이즈+비규격) |
| 파일사양 | G~M (회색/내부) | G~M (회색) | F~L 내지 + R~W 표지 | H~N (회색) | I~O (회색) |
| 용지 | P (종이) | P (종이) | M 내지 + X 표지 | Q (소재) | R (소재) |
| 인쇄 | Q (인쇄) | Q (인쇄) | N 내지 + Y 표지 | - | S (인쇄사양) |
| 별색 | R~V (화이트/클리어/핑크/금/은) | R~V | - | T (화이트) | - |
| 후가공 | AD~AH | AC~AD | Z 코팅 + AB 박 | U 코팅 + W 가공 | U 가공 |
| 수량 | Z~AC | Z~AB | AJ~AL | AA~AC | Y~AA |
| 가격 | - | - | - | R~S (고정가) | H (고정가) |

### 2.2 컬럼 색상 코딩 (작성자 범례, 행 259)

| 헤더 색상 | 의미 | 정규화 대상 |
|----------|------|------------|
| #FFE06666 (빨강) | 필수 항목 | required=true |
| #FFF6B26B (주황) | 옵션 항목 | required=false |
| #FFD9D9D9 (회색) | 내부 전용 (고객 비노출) | internal=true |
| #FFC4BD97 (베이지) | 기본 식별 정보 | 상품 기본 필드 |

| 데이터 색상 | 의미 | 처리 |
|------------|------|------|
| 빨간 글씨 + ★ | 제약조건 | constraints 테이블로 분리 |
| 회색 글씨 | 내부 전용 텍스트 | internal 플래그 |
| 오렌지 글씨 | 작성자 메모 | 무시 (마이그레이션 제외) |
| 노랑 배경 | 신규상품 (MES 미등록) | mes_registered=false |

### 2.3 ★ 제약조건 유형 (3가지)

| 유형 | 패턴 | 예시 | 정규화 방식 |
|------|------|------|-----------|
| A: 부속품 조건 | ★사이즈선택 : {size} | 엽서봉투 ★사이즈선택 : 100x150 | if(size==100x150) show(봉투옵션) |
| B: 가공 크기 제한 | ★최소 {min} / 최대 {max} | ★최소 30x30 / 최대 125x125 | constraint(min_w=30, min_h=30, max_w=125, max_h=125) |
| C: 용지 조건 | ★{조건} : {값} | ★종이두께선택시 : 180g이상 코팅가능 | if(paper.weight>=180) enable(coating) |

---

## 3. 7가지 가격 산정 모델

### Model 1: 공식 기반 (디지털인쇄 일반)

**대상 상품**: 엽서, 카드, 전단지, 리플렛, 상품권, 배경지, 헤더택

**공식** (행 256에서 발견):
```
총가 = 출력비 + 별색비 + 지대(용지비) + 코팅비 + 가공비 + 후가공비
```

**세부 계산**:
- 필요판수 = ceil(주문수량 / 판걸이수)
- 출력비 = lookup(디지털출력비[인쇄방식], 필요판수) × 필요판수
- 별색비 = lookup(디지털출력비[별색유형], 필요판수) × 필요판수
- 지대 = (용지단가_국4절 / 판걸이수 × (주문수량 + 로스량))
- 코팅비 = lookup(후가공.코팅[코팅방식], 필요판수) × 필요판수
- 가공비 = lookup(후가공[가공유형], 주문수량) × 주문수량
- 후가공비 = SUM(각 후가공 lookup × 주문수량)

**기준판형**: A3(316×467) 또는 T3(330×660) - 상품마스터 J열(출력용지규격)로 결정

### Model 2: 공식 + 커팅가공비 (스티커)

**대상**: 반칼/규격/자유형 스티커

**공식**: Model 1 공식 + 커팅가공비(사이즈×커팅방식별 수량구간 단가)

### Model 3: 고정 단가 (명함/포토카드)

**대상**: 명함류, 포토카드, 투명포토카드

**공식**: 상품단가(용지, 단면/양면) × (주문수량 / 100)

### Model 4: 패키지 가격 (옵션결합상품)

**대상**: 엽서북

**공식**: lookup(사이즈 × 인쇄 × 페이지수, 주문수량)

### Model 5: 구성품 합산 (책자)

**대상**: 중철/무선/PUR/트윈링/하드커버 책자

**공식**: 내지가격 + 표지가격 + 제본비 + 표지코팅비 + 박/형압비 + 개별포장비
- 내지: 용지비 × 페이지수 + 출력비 × 페이지판수
- 표지: 용지비 + 출력비 + 코팅비

### Model 6: 사이즈별 고정가 (실사/포스터)

**대상**: 아트프린트포스터, 방수포스터, 현수막, 패브릭

**공식**: 사이즈별단가 + 코팅옵션가 + 가공옵션가

### Model 7: 개당 고정가 + 수량할인 (아크릴/굿즈)

**대상**: 아크릴키링, 뱃지, 머그컵, 코스터 등

**공식**: (사이즈별단가 + 가공옵션가 + 추가상품가) × 수량 × 수량할인율

---

## 4. 정규화 엔티티 설계 (안)

### 4.1 핵심 엔티티 (Core)

#### categories (상품 카테고리)
```
- id (PK, auto)
- code (UK, 예: CAT_DIGITAL_PRINT, CAT_STICKER, CAT_BOOKLET)
- name (예: "디지털인쇄", "스티커", "책자")
- parent_id (FK, self-ref, 상위카테고리)
- display_order (MAP 시트 순서)
- is_active (boolean)
```

#### products (상품)
```
- id (PK, auto)
- wowpress_id (UK, 웹사이트 상품코드: 14529 등) ← 보존
- category_id (FK → categories)
- name (예: "프리미엄엽서")
- pricing_model (ENUM: formula, formula_cutting, fixed_unit, package, component, fixed_size, fixed_per_unit)
- sheet_standard (ENUM: a3, t3, null)
- order_methods (JSONB: {upload: true, editor: false}) ← 추후 확장
- is_star (boolean, ★ 조건부 상품 여부)
- is_active (boolean)
- mes_registered (boolean, MES 등록 여부)
```

#### product_sizes (상품별 사이즈)
```
- id (PK, auto)
- product_id (FK → products)
- code (예: SIZE_73X98, SIZE_A5)
- display_name (예: "73 x 98 mm", "A5 (148 x 210 mm)")
- cut_width, cut_height (재단사이즈 mm)
- work_width, work_height (작업사이즈 mm)
- bleed (블리드 mm)
- imposition_count (판걸이수)
- sheet_standard (기준판형)
- display_order (UI 배치 순서)
- is_custom (boolean, 사용자입력 사이즈)
- custom_min_w, custom_min_h, custom_max_w, custom_max_h (비규격 범위)
```

### 4.2 자재 엔티티 (Materials)

#### papers (용지)
```
- id (PK, auto)
- code (예: PAPER_ART_250, PAPER_SNOW_300)
- name (예: "아트지 250g")
- abbreviation (파일명약어: "아트")
- weight (평량 g)
- sheet_size (전지규격: "국전(939*636)")
- cost_per_ream (연당 원가)
- cost_per_4cut (국4절 단가)
- cost_per_a4 (A4 단가)
- is_active (boolean)
```

#### paper_product_mapping (용지-상품 매핑)
```
- id (PK, auto)
- paper_id (FK → papers)
- product_id (FK → products)
- is_default (boolean, ● 표시된 기본 매핑)
```

#### materials (소재 - 비인쇄 상품용)
```
- id (PK, auto)
- code (예: MAT_CLEAR_ACRYLIC_3MM)
- name (예: "투명아크릴 3mm")
- type (ENUM: acrylic, fabric, film, etc.)
- is_active (boolean)
```

### 4.3 인쇄/공정 엔티티 (Processes)

#### print_modes (인쇄방식)
```
- id (PK, auto)
- code (예: PRINT_SINGLE_COLOR, PRINT_DOUBLE_COLOR, PRINT_SINGLE_WHITE)
- name (예: "단면칼라", "양면칼라", "단면 화이트(1도)")
- sides (ENUM: single, double)
- color_type (ENUM: mono, color, white, clear, pink, gold, silver)
- price_table_code (디지털출력비 테이블의 컬럼코드: 4, 8, 11 등)
```

#### post_processes (후가공 유형)
```
- id (PK, auto)
- code (예: PP_PERFORATION, PP_CREASING, PP_COATING_MATTE_SINGLE)
- name (예: "미싱", "오시", "무광코팅(단면)")
- type (ENUM: perforation, creasing, folding, vdp_text, vdp_image, corner, coating, cutting)
- price_basis (ENUM: per_sheet, per_unit) ← 코팅=판당, 나머지=매당
- sheet_standard (ENUM: a3, t3, null)
```

#### bindings (제본 유형 - 책자용)
```
- id (PK, auto)
- code (예: BIND_SADDLE_STITCH, BIND_PERFECT, BIND_PUR, BIND_TWIN_RING)
- name (예: "중철제본", "무선제본", "PUR제본", "트윈링제본")
```

### 4.4 가격 엔티티 (Pricing)

#### price_tables (가격 테이블 정의)
```
- id (PK, auto)
- code (예: PT_DIGITAL_OUTPUT_A3, PT_DIGITAL_OUTPUT_T3, PT_COATING_A3)
- name (예: "디지털출력비 A3", "코팅비 A3")
- type (ENUM: selling, cost) ← 판매가/원가 구분
- quantity_basis (ENUM: sheet_count, production_qty) ← 판수/매수 기준
- sheet_standard (ENUM: a3, t3, null)
```

#### price_tiers (수량 구간별 단가)
```
- id (PK, auto)
- price_table_id (FK → price_tables)
- option_code (컬럼 코드: PRINT_SINGLE_COLOR, PP_PERFORATION_1LINE 등)
- min_qty (구간 시작 수량)
- max_qty (구간 종료 수량, 999999=무한)
- unit_price (원/판 또는 원/매)
```

#### fixed_prices (고정 단가 상품)
```
- id (PK, auto)
- product_id (FK → products)
- size_id (FK → product_sizes, nullable)
- paper_id (FK → papers, nullable)
- material_id (FK → materials, nullable)
- print_mode_id (FK → print_modes, nullable)
- base_qty (기준수량: 100매, 1개 등)
- unit_price (단가)
- vat_included (boolean)
```

#### package_prices (패키지 단가)
```
- id (PK, auto)
- product_id (FK → products)
- size_id (FK → product_sizes)
- print_mode_id (FK → print_modes)
- page_count (페이지수)
- min_qty, max_qty (수량 구간)
- unit_price (단가)
```

#### foil_prices (박/형압 가격)
```
- id (PK, auto)
- type (ENUM: copper_plate, basic_foil, premium_foil, emboss)
- foil_color (nullable, 박 색상)
- width, height (가공 크기 mm)
- price (가격)
```

### 4.5 제약조건 엔티티 (Constraints)

#### option_constraints (옵션 제약조건)
```
- id (PK, auto)
- product_id (FK → products)
- constraint_type (ENUM: size_show, size_range, paper_condition)
- source_field (조건 필드: size, paper_weight 등)
- operator (ENUM: eq, gte, lte, between, in)
- value (조건 값: "100x150", "180" 등)
- target_field (대상 필드: accessory, coating, foil_size 등)
- target_action (ENUM: show, hide, enable, disable, limit_range)
- target_value (대상 값/범위)
```

### 4.6 UI 관리 엔티티 (Display)

#### option_groups (옵션 그룹)
```
- id (PK, auto)
- code (예: OG_SIZE, OG_PAPER, OG_PRINT, OG_COATING, OG_POST_PROCESS)
- name (예: "사이즈", "종이", "인쇄", "코팅", "후가공")
- is_required (boolean, 필수/옵션 - 빨강/주황 헤더 매핑)
```

#### product_option_config (상품별 옵션 구성)
```
- id (PK, auto)
- product_id (FK → products)
- option_group_id (FK → option_groups)
- display_order (UI 배치 순서)
- is_visible (boolean, 고객 노출 여부 - 회색 헤더 매핑)
- is_required (boolean)
- depends_on_option_id (FK, self-ref, 의존성 - ★ 조건 매핑)
```

### 4.7 MES 매핑 엔티티

#### mes_items (MES 품목)
```
- id (PK, auto)
- item_code (UK, MES 품목코드: "001-0001") ← 보존
- group_code (품목그룹: "0010010000")
- name (품목명)
- abbreviation (약어명)
- item_type (ENUM: finished, semi_finished, service, standard)
- unit (ENUM: ea, sheet, ream, set, pack, bundle)
- is_active (boolean)
```

#### mes_item_options (MES 품목 옵션)
```
- id (PK, auto)
- mes_item_id (FK → mes_items)
- option_number (1~10)
- option_value (예: "스티커 옵션없음")
```

#### product_mes_mapping (상품 ↔ MES 매핑)
```
- id (PK, auto)
- product_id (FK → products)
- mes_item_id (FK → mes_items)
- cover_type (ENUM: unified, cover, inner, null) ← 책자용 표지/내지 구분
```

---

## 5. 마이그레이션 계획

### Phase 1: 기초 데이터 (카테고리, 용지, 공정)
1. MAP 시트 → categories (12 대분류 + 하위분류)
2. !디지털인쇄용지 시트 → papers (용지 마스터)
3. 가격표.후가공 시트 → post_processes (8개 후가공 유형)
4. 가격표.제본 시트 → bindings (4개 제본 유형)
5. print_modes 정의 (12개 인쇄방식)

### Phase 2: 상품 데이터
1. 상품마스터 각 시트 → products + product_sizes
2. 시트별 컬럼 매핑 (시트마다 구조 다름, 개별 파서 필요)
3. ★ 제약조건 파싱 → option_constraints
4. 색상 코딩 해석 → is_required, is_visible 플래그

### Phase 3: 가격 데이터
1. 디지털출력비(판매가) → price_tables + price_tiers (type=selling)
2. 디지털출력비가수정(원가) → price_tables + price_tiers (type=cost)
3. 후가공 각 섹션 → price_tiers
4. 명함/포토카드 → fixed_prices
5. 옵션결합상품 → package_prices
6. 실사/아크릴 고정가 → fixed_prices
7. 후가공_박 → foil_prices

### Phase 4: MES 매핑
1. 품목관리 시트 → mes_items + mes_item_options
2. 상품마스터 C열(MES ITEM_CD) → product_mes_mapping
3. Hidden Sheet2 → 참조값 테이블

### Phase 5: UI 옵션 구성
1. 헤더 색상 분석 → option_groups + product_option_config
2. 옵션 의존성 설정 (★ 조건 기반)
3. 배치순서 설정 (엑셀 컬럼 순서 기반)

---

## 6. 리서치 필요 항목

| 항목 | 필요 이유 | 상태 |
|------|----------|------|
| 판걸이/임포지션 표준 | 추후 자동 계산 시 네스팅/조판 알고리즘 | 리서치 필요 |
| 기본로스량 | 용지비 계산에 필요한 로스 비율 | 확장형 설계 (추후 설정) |
| 건수 vs 수량 | 디지털인쇄 주문 단위 정의 | 리서치 필요 |
| 책자 견적 표준 | 내지/표지 분리 계산 구조 | 리서치 필요 |
| 수량할인율 | 아크릴/굿즈 수량 할인 구조 | 엑셀 추가 분석 필요 |

---

## 7. 제외 사항

- AN열 (작성자 메모, 무시 지시)
- 오렌지 글씨 텍스트 (작성자 개인 코멘트)
- (임시)포카가격비교 시트 (미확정 임시 데이터)
- Figma 디자인 참조 (별도 UI 설계 단계에서 처리)

---

## 8. 인수 조건

1. 모든 상품마스터 데이터가 정규화된 테이블로 변환됨
2. 모든 가격표 데이터가 price_tiers/fixed_prices/package_prices로 변환됨
3. 7가지 가격 산정 모델이 동일한 엔티티 구조로 표현 가능함
4. ★ 제약조건이 option_constraints 테이블로 완전 분리됨
5. MES 품목코드 매핑이 양방향으로 조회 가능함
6. UI 옵션 배치순서와 의존성이 DB에서 관리 가능함
7. 용지/공정/가격에 대한 CRUD 작업이 독립적으로 가능함

---

Sources:
- [인쇄물 기준 요금 2025 - 한국교육과정평가원](https://www.g2b.go.kr)
- [Prepress: Imposition and Nesting - Caldera](https://www.caldera.com/all-you-need-to-know-about-imposition-and-nesting/)
- [Sheet Offset Print Calculation - Dataline](https://dataline.eu/en/multipress/calculation/production-technology-calculation/sheet-offset-print-calculation)
- [북토리 무선제본 계산기](https://booktory.com/make-guide/pg1-10t1.asp)
- [제본공장 무선제본](https://jebonfactory.com/page/?pid=binding2_new)
