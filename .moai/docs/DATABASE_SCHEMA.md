# 데이터베이스 스키마 문서

**최종 수정**: 2026-02-27
**버전**: 1.0.0

---

## 1. 개요

### 프로젝트 데이터베이스 목적

HuniWidget 프로젝트의 데이터베이스는 인쇄 주문 관리 및 위젯 빌더 시스템을 위한 포괄적인 데이터 저장소입니다. 주요 목적은:

- **상품 카탈로그 관리**: 인쇄 상품의 마스터 데이터 및 사양 저장
- **주문 처리**: 고객 주문 생성, 추적, 상태 관리
- **옵션 및 제약 조건**: 상품별 커스터마이징 옵션 및 비즈니스 규칙 관리
- **가격 책정**: 동적 가격 계산을 위한 가격표 및 비용 데이터
- **외부 시스템 통합**: MES, Edicus, Shopby 등의 외부 시스템 연동 데이터
- **위젯 빌더 설정**: 고객 주문 위젯 설정 및 제약 조건 관리

### 주요 도메인

| 도메인 | 설명 | 핵심 테이블 |
|--------|------|-----------|
| **카탈로그** | 상품 및 카테고리 관리 | products, product_sizes, categories |
| **옵션** | 상품 옵션 정의 및 선택지 | option_definitions, option_choices, product_options |
| **재료** | 종이, 재료 및 인쇄 방식 | papers, materials, print_modes |
| **가격** | 가격표 및 비용 계산 | price_tables, price_tiers, fixed_prices |
| **주문** | 고객 주문 및 상태 관리 | orders, order_status_history, order_design_files |
| **통합** | 외부 시스템 연동 | product_mes_mapping, product_editor_mapping, option_choice_mes_mapping |
| **위젯빌더** | 위젯 제약 조건 및 설정 | recipe_constraints, constraint_templates, addon_groups |

---

## 2. 테이블 목록 및 요약

### 카탈로그 도메인 (6개 테이블)

| 테이블명 | 설명 | 레코드 수 | 용도 |
|---------|------|---------|------|
| **categories** | 상품 카테고리 | ~50 | 상품 분류 및 계층 구조 |
| **products** | 상품 마스터 | ~200 | 인쇄 상품의 기본 정보 |
| **product_sizes** | 상품 사이즈 | ~500 | 각 상품별 사용 가능한 크기 |
| **product_categories** | 위젯빌더 상품 카테고리 | ~30 | 위젯 표시용 상품 분류 |
| **wb_products** | 위젯빌더 상품 | ~150 | 위젯에서 주문 가능한 상품 |
| **product_recipes** | 상품 레시피 | ~200 | 상품별 인쇄 설정 조합 |

### 옵션 도메인 (4개 테이블)

| 테이블명 | 설명 | 레코드 수 | 용도 |
|---------|------|---------|------|
| **option_definitions** | 옵션 타입 정의 | ~20 | 색상, 크기, 재료 등 옵션 종류 |
| **option_choices** | 옵션 선택지 | ~300 | 각 옵션의 구체적인 선택지 |
| **product_options** | 상품별 옵션 | ~400 | 어떤 옵션이 각 상품에 적용되는지 |
| **option_constraints** | 옵션 제약 조건 | ~200 | 옵션 간의 종속성 및 규칙 |

### 재료 및 공정 도메인 (5개 테이블)

| 테이블명 | 설명 | 레코드 수 | 용도 |
|---------|------|---------|------|
| **papers** | 종이 규격 | ~50 | 지종 및 무게 정보 |
| **materials** | 비종이 재료 | ~30 | PVC, 아크릴 등 기타 재료 |
| **print_modes** | 인쇄 방식 | ~10 | 오프셋, 디지털, 수성 등 |
| **post_processes** | 후가공 처리 | ~15 | 코팅, 라미네이션, 박 등 |
| **bindings** | 제본 방식 | ~8 | 무선 제본, 스프링 제본 등 |

### 가격 도메인 (4개 테이블)

| 테이블명 | 설명 | 레코드 수 | 용도 |
|---------|------|---------|------|
| **price_tables** | 가격표 헤더 | ~30 | 가격표 메타정보 |
| **price_tiers** | 수량별 가격 | ~500 | 수량 범위별 단가 |
| **fixed_prices** | 고정 가격 | ~300 | 특정 상품/사이즈 조합의 가격 |
| **product_price_configs** | 가격 설정 | ~100 | 상품별 가격 정책 |

### 주문 도메인 (3개 테이블)

| 테이블명 | 설명 | 레코드 수 | 용도 |
|---------|------|---------|------|
| **orders** | 주문 마스터 | ~10,000 | 고객 주문의 기본 정보 |
| **order_status_history** | 주문 상태 이력 | ~30,000 | 주문 상태 변경 추적 |
| **order_design_files** | 주문 디자인 파일 | ~15,000 | 주문에 첨부된 디자인 파일 |

### 통합 도메인 (7개 테이블)

| 테이블명 | 설명 | 레코드 수 | 용도 |
|---------|------|---------|------|
| **mes_items** | MES 품목 마스터 | ~500 | MES 시스템의 상품 코드 |
| **mes_item_options** | MES 옵션값 | ~1,000 | MES 상품의 옵션 정보 |
| **product_mes_mapping** | 상품-MES 매핑 | ~300 | 우리 상품↔MES 품목 연결 |
| **option_choice_mes_mapping** | 옵션선택-MES 매핑 | ~500 | 옵션↔MES 품목 옵션 연결 |
| **product_editor_mapping** | 상품-Edicus 매핑 | ~100 | 상품↔Edicus 에디터 연결 |
| **shopby_items** | Shopby 상품 | ~150 | Shopby 쇼핑몰 상품 정보 |
| **integration_dead_letters** | 통합 실패 큐 | ~100 | 실패한 통합 이벤트 저장 |

### 위젯빌더 도메인 (6개 테이블)

| 테이블명 | 설명 | 레코드 수 | 용도 |
|---------|------|---------|------|
| **element_types** | 위젯 요소 타입 | ~20 | 텍스트, 이미지 등 요소 정의 |
| **element_choices** | 요소 선택지 | ~100 | 각 요소의 구체적 선택지 |
| **recipe_option_bindings** | 레시피 옵션 연결 | ~300 | 레시피의 옵션 구성 |
| **recipe_choice_restrictions** | 선택지 제약 | ~200 | 상호 배제적 선택지 정의 |
| **recipe_constraints** | 레시피 제약 조건 | ~150 | 레시피 단위 제약 규칙 |
| **constraint_templates** | 제약 템플릿 | ~30 | 재사용 가능한 제약 규칙 |

---

## 3. 상세 테이블 설명

### 3.1 카탈로그 도메인

#### categories (상품 카테고리)

**목적**: 상품의 계층적 분류 체계 관리

| 칼럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | SERIAL | NO | 자동 증가 기본 키 |
| code | VARCHAR(50) | NO | 카테고리 코드 (고유) - 예: STATIONERY, CARD |
| name | VARCHAR(100) | NO | 카테고리 이름 - 예: "문구용품", "명함" |
| parentId | INTEGER | YES | 부모 카테고리 ID (자기참조, NULL=최상위) |
| depth | SMALLINT | NO | 계층 깊이 (0=최상위) |
| displayOrder | SMALLINT | NO | 표시 순서 |
| sheetName | VARCHAR(50) | YES | Google Sheets 시트 이름 (데이터 동기화용) |
| iconUrl | VARCHAR(500) | YES | 카테고리 아이콘 URL |
| isActive | BOOLEAN | NO | 활성화 여부 |
| createdAt | TIMESTAMP | NO | 생성 일시 |
| updatedAt | TIMESTAMP | NO | 수정 일시 |

**인덱스**: parentId, sheetName

**외래키 관계**:
- parentId → categories.id (자기참조, 삭제 시 SET NULL)

#### products (상품 마스터)

**목적**: 인쇄 상품의 핵심 정보 저장. HuniWidget의 중앙 엔티티.

| 칼럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | SERIAL | NO | 자동 증가 기본 키 |
| categoryId | INTEGER | NO | 상품 카테고리 ID |
| huniCode | VARCHAR(10) | NO | 내부 상품 코드 (고유) |
| edicusCode | VARCHAR(15) | YES | Edicus 에디터 통합 코드 (고유) |
| shopbyId | INTEGER | YES | Shopby 쇼핑몰 상품 ID (고유) |
| name | VARCHAR(200) | NO | 상품명 - 예: "컬러 비즈니스카드" |
| slug | VARCHAR(200) | NO | URL 슬러그 (고유) |
| productType | VARCHAR(30) | NO | 상품 타입 - offset, digital, wide |
| pricingModel | VARCHAR(30) | NO | 가격 책정 모델 - fixed, tiered, custom |
| sheetStandard | VARCHAR(5) | YES | 용지 규격 - A4, B5 등 |
| figmaSection | VARCHAR(50) | YES | Figma 디자인 섹션 (디자인 참고용) |
| orderMethod | VARCHAR(20) | NO | 주문 방식 - upload, editor, both (기본값: upload) |
| editorEnabled | BOOLEAN | NO | Edicus 에디터 활성화 여부 |
| description | TEXT | YES | 상품 설명 |
| isActive | BOOLEAN | NO | 활성화 여부 |
| mesRegistered | BOOLEAN | NO | MES 등록 완료 여부 (기본값: true) |
| createdAt | TIMESTAMP | NO | 생성 일시 |
| updatedAt | TIMESTAMP | NO | 수정 일시 |

**인덱스**: categoryId, productType, pricingModel

**외래키 관계**:
- categoryId → categories.id (삭제 시 RESTRICT)

**주요 필드 설명**:
- **huniCode**: 내부용 고유 코드. 절대 외부 시스템에 노출하지 않음
- **edicusCode**: Edicus에서 상품을 식별하는 고유 코드. 변경 불가 (기존 에디터 링크가 끊어짐)
- **shopbyId**: Shopby 쇼핑몰 시스템의 상품 ID
- **orderMethod**: 고객이 주문 방식 선택 (파일 업로드 vs Edicus 에디터 vs 둘 다)

#### product_sizes (상품 사이즈)

**목적**: 각 상품에서 선택 가능한 인쇄 사이즈 정의

| 칼럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | SERIAL | NO | 자동 증가 기본 키 |
| productId | INTEGER | NO | 상품 ID |
| code | VARCHAR(50) | NO | 사이즈 코드 - 예: SIZE_85x55 |
| displayName | VARCHAR(100) | NO | 사이즈 표시명 - 예: "85x55mm" |
| cutWidth | NUMERIC(8,2) | YES | 최종 인쇄 폭 (mm) |
| cutHeight | NUMERIC(8,2) | YES | 최종 인쇄 높이 (mm) |
| workWidth | NUMERIC(8,2) | YES | 작업 영역 폭 (mm) - 블리드 포함 |
| workHeight | NUMERIC(8,2) | YES | 작업 영역 높이 (mm) - 블리드 포함 |
| bleed | NUMERIC(5,2) | NO | 블리드 여백 (mm, 기본값: 3.0) |
| impositionCount | SMALLINT | YES | 판 당 수량 (인쇄 단계 최적화) |
| sheetStandard | VARCHAR(5) | YES | 용지 규격 |
| displayOrder | SMALLINT | NO | 표시 순서 |
| isCustom | BOOLEAN | NO | 커스텀 사이즈 여부 |
| customMinW | NUMERIC(8,2) | YES | 커스텀 최소 폭 |
| customMinH | NUMERIC(8,2) | YES | 커스텀 최소 높이 |
| customMaxW | NUMERIC(8,2) | YES | 커스텀 최대 폭 |
| customMaxH | NUMERIC(8,2) | YES | 커스텀 최대 높이 |
| isActive | BOOLEAN | NO | 활성화 여부 |
| createdAt | TIMESTAMP | NO | 생성 일시 |
| updatedAt | TIMESTAMP | NO | 수정 일시 |

**인덱스**: productId

**외래키 관계**:
- productId → products.id (삭제 시 CASCADE)

---

### 3.2 옵션 도메인

#### option_definitions (옵션 정의)

**목적**: 색상, 재료, 마감 등 선택 가능한 옵션의 종류 정의. 모든 상품이 공유 가능.

| 칼럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | SERIAL | NO | 자동 증가 기본 키 |
| key | VARCHAR(50) | NO | 옵션 키 (고유) - 예: FINISH_TYPE, COLOR |
| name | VARCHAR(100) | NO | 옵션 이름 - 예: "마감 종류", "색상" |
| optionClass | VARCHAR(20) | NO | 옵션 분류 - FINISH, COLOR, MATERIAL 등 |
| optionType | VARCHAR(30) | NO | 옵션 데이터 타입 - single_select, multi_select, text_input |
| uiComponent | VARCHAR(30) | NO | UI 컴포넌트 타입 - radio, checkbox, dropdown, color_picker |
| description | VARCHAR(500) | YES | 옵션 설명 |
| displayOrder | SMALLINT | NO | 전체 옵션 중 표시 순서 |
| isActive | BOOLEAN | NO | 활성화 여부 |
| createdAt | TIMESTAMP | NO | 생성 일시 |
| updatedAt | TIMESTAMP | NO | 수정 일시 |

**인덱스**: optionClass

**예시 데이터**:
- key="FINISH_TYPE", name="마감 종류", optionClass="FINISH", optionType="single_select"
- key="COLOR", name="색상", optionClass="COLOR", optionType="single_select"

#### option_choices (옵션 선택지)

**목적**: 각 옵션에서 고객이 선택할 수 있는 구체적 값 (마무리, 색상, 재료 등)

| 칼럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | SERIAL | NO | 자동 증가 기본 키 |
| optionDefinitionId | INTEGER | NO | 옵션 정의 ID |
| code | VARCHAR(50) | NO | 선택지 코드 - 예: MAT_SILK |
| name | VARCHAR(100) | NO | 선택지 이름 - 예: "무광", "유광" |
| priceKey | VARCHAR(50) | YES | 가격표 검색 키 (가격 계산용) |
| refPaperId | INTEGER | YES | 참조 종이 ID (선택지가 종이 선택인 경우) |
| refMaterialId | INTEGER | YES | 참조 재료 ID (선택지가 재료 선택인 경우) |
| refPrintModeId | INTEGER | YES | 참조 인쇄 방식 ID |
| refPostProcessId | INTEGER | YES | 참조 후가공 ID |
| refBindingId | INTEGER | YES | 참조 제본 방식 ID |
| displayOrder | SMALLINT | NO | 선택지 표시 순서 |
| isActive | BOOLEAN | NO | 활성화 여부 |
| createdAt | TIMESTAMP | NO | 생성 일시 |
| updatedAt | TIMESTAMP | NO | 수정 일시 |

**인덱스**: optionDefinitionId, priceKey, refPaperId, refPrintModeId

**외래키 관계**:
- optionDefinitionId → option_definitions.id (DELETE CASCADE)
- refPaperId → papers.id (DELETE SET NULL)
- refMaterialId → materials.id (DELETE SET NULL)
- refPrintModeId → print_modes.id (DELETE SET NULL)
- refPostProcessId → post_processes.id (DELETE SET NULL)
- refBindingId → bindings.id (DELETE SET NULL)

#### product_options (상품 옵션)

**목적**: 각 상품에 어떤 옵션들을 적용할지, 어떤 순서로 표시할지 정의

| 칼럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | SERIAL | NO | 자동 증가 기본 키 |
| productId | INTEGER | NO | 상품 ID |
| optionDefinitionId | INTEGER | NO | 옵션 정의 ID |
| displayOrder | SMALLINT | NO | 상품 내 옵션 표시 순서 |
| isRequired | BOOLEAN | NO | 필수 선택 여부 |
| isVisible | BOOLEAN | NO | UI에 표시 여부 |
| isInternal | BOOLEAN | NO | 내부용 옵션 여부 (고객에게 미노출) |
| uiComponentOverride | VARCHAR(30) | YES | 상품별 UI 컴포넌트 오버라이드 |
| defaultChoiceId | INTEGER | YES | 기본 선택값 ID |
| isActive | BOOLEAN | NO | 활성화 여부 |
| createdAt | TIMESTAMP | NO | 생성 일시 |
| updatedAt | TIMESTAMP | NO | 수정 일시 |

**인덱스**: productId, (productId, isVisible, displayOrder)

**외래키 관계**:
- productId → products.id (DELETE CASCADE)
- optionDefinitionId → option_definitions.id (DELETE CASCADE)
- defaultChoiceId → option_choices.id (DELETE SET NULL)

**고유 제약**: (productId, optionDefinitionId) - 각 상품은 같은 옵션을 중복 포함 불가

---

### 3.3 재료 및 공정 도메인

#### papers (종이)

**목적**: 종이 규격 및 가격 정보

| 칼럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | SERIAL | NO | 자동 증가 기본 키 |
| code | VARCHAR(50) | NO | 종이 코드 (고유) - 예: COATED_135 |
| name | VARCHAR(100) | NO | 종이명 - 예: "코팅 미색 135g" |
| abbreviation | VARCHAR(20) | YES | 약자 - 예: "코미 135" |
| weight | SMALLINT | YES | 무게 (g/m²) |
| sheetSize | VARCHAR(50) | YES | 종이 규격 - B1, B2, A4 등 |
| costPerReam | NUMERIC(12,2) | YES | 원가 (리즘 단위) |
| sellingPerReam | NUMERIC(12,2) | YES | 판매가 (리즘 단위) |
| costPer4Cut | NUMERIC(10,2) | YES | 원가 (4절 단위) |
| sellingPer4Cut | NUMERIC(10,2) | YES | 판매가 (4절 단위) |
| displayOrder | SMALLINT | NO | 표시 순서 |
| isActive | BOOLEAN | NO | 활성화 여부 |
| createdAt | TIMESTAMP | NO | 생성 일시 |
| updatedAt | TIMESTAMP | NO | 수정 일시 |

**인덱스**: weight

#### materials (재료)

**목적**: 종이 외 비즈니스 카드, 명찰, 스티커 등의 기타 재료

| 칼럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | SERIAL | NO | 자동 증가 기본 키 |
| code | VARCHAR(50) | NO | 재료 코드 (고유) |
| name | VARCHAR(100) | NO | 재료명 - 예: "PVC", "우드" |
| materialType | VARCHAR(30) | NO | 재료 종류 - PVC, WOOD, PLASTIC 등 |
| thickness | VARCHAR(20) | YES | 두께 정보 - 예: "0.5mm", "2mm" |
| description | TEXT | YES | 상세 설명 |
| isActive | BOOLEAN | NO | 활성화 여부 |
| createdAt | TIMESTAMP | NO | 생성 일시 |
| updatedAt | TIMESTAMP | NO | 수정 일시 |

**인덱스**: materialType

#### print_modes (인쇄 방식)

**목적**: 오프셋, 디지털, UV 등 인쇄 방식 정의

| 칼럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | SERIAL | NO | 자동 증가 기본 키 |
| code | VARCHAR(50) | NO | 인쇄 방식 코드 (고유) |
| name | VARCHAR(100) | NO | 인쇄 방식명 - 예: "오프셋 인쇄" |
| ... | ... | ... | (기타 필드는 프로젝트 요구사항에 따라) |

#### post_processes (후가공)

**목적**: 코팅, 라미네이션, 박 등 후가공 처리 정의

| 칼럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | SERIAL | NO | 자동 증가 기본 키 |
| code | VARCHAR(50) | NO | 후가공 코드 (고유) |
| name | VARCHAR(100) | NO | 후가공명 - 예: "광택 코팅", "무광 라미" |
| ... | ... | ... | (기타 필드는 프로젝트 요구사항에 따라) |

#### bindings (제본)

**목적**: 무선 제본, 스프링 제본 등 바인딩 방식

| 칼럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | SERIAL | NO | 자동 증가 기본 키 |
| code | VARCHAR(50) | NO | 제본 코드 (고유) |
| name | VARCHAR(100) | NO | 제본명 - 예: "무선 제본", "스프링 제본" |
| ... | ... | ... | (기타 필드는 프로젝트 요구사항에 따라) |

---

### 3.4 가격 도메인

#### price_tables (가격표)

**목적**: 가격표의 메타정보 (헤더). 수량별 가격 정보는 price_tiers에 저장.

| 칼럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | SERIAL | NO | 자동 증가 기본 키 |
| code | VARCHAR(50) | NO | 가격표 코드 (고유) |
| name | VARCHAR(100) | NO | 가격표 이름 |
| priceType | VARCHAR(10) | NO | 가격 타입 - BASE, OPTION, ADDON |
| quantityBasis | VARCHAR(20) | NO | 수량 기준 - PER_PIECE, PER_SET, PER_BOX |
| sheetStandard | VARCHAR(5) | YES | 적용 용지 규격 |
| description | TEXT | YES | 가격표 설명 |
| isActive | BOOLEAN | NO | 활성화 여부 |
| createdAt | TIMESTAMP | NO | 생성 일시 |
| updatedAt | TIMESTAMP | NO | 수정 일시 |

**인덱스**: priceType, sheetStandard

#### price_tiers (가격 계층)

**목적**: 수량 범위별 단가 정의. 예: 100개 1,000원, 500개 800원, 1000개 700원

| 칼럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | SERIAL | NO | 자동 증가 기본 키 |
| priceTableId | INTEGER | NO | 가격표 ID |
| optionCode | VARCHAR(50) | NO | 옵션 선택지 코드 (가격 키로 사용) |
| minQty | INTEGER | NO | 최소 수량 |
| maxQty | INTEGER | NO | 최대 수량 (기본값: 999999) |
| unitPrice | NUMERIC(12,2) | NO | 단가 (KRW) |
| isActive | BOOLEAN | NO | 활성화 여부 |
| createdAt | TIMESTAMP | NO | 생성 일시 |
| updatedAt | TIMESTAMP | NO | 수정 일시 |

**인덱스**: priceTableId, optionCode, (priceTableId, optionCode, minQty)

**외래키 관계**:
- priceTableId → price_tables.id (DELETE CASCADE)

**가격 조회 예시**:
- 무광 명함 500개 주문 → optionCode='MAT_MATTE', minQty=100, maxQty=999 범위의 unitPrice 조회

#### fixed_prices (고정 가격)

**목적**: 특정 상품/사이즈/종이 조합의 고정 가격. 수량 계층이 불필요한 경우 사용.

| 칼럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | SERIAL | NO | 자동 증가 기본 키 |
| productId | INTEGER | NO | 상품 ID |
| sizeId | INTEGER | YES | 사이즈 ID (NULL=모든 사이즈) |
| paperId | INTEGER | YES | 종이 ID (NULL=모든 종이) |
| materialId | INTEGER | YES | 재료 ID |
| printModeId | INTEGER | YES | 인쇄 방식 ID |
| optionLabel | VARCHAR(100) | YES | 옵션 라벨 (설명용) |
| minQty | INTEGER | NO | 최소 수량 |
| unitPrice | NUMERIC(12,2) | NO | 단가 |
| ... | ... | ... | (기타 필드) |

**외래키 관계**:
- productId → products.id (DELETE RESTRICT)
- sizeId → product_sizes.id (DELETE SET NULL)
- paperId → papers.id (DELETE SET NULL)
- materialId → materials.id (DELETE SET NULL)
- printModeId → print_modes.id (DELETE SET NULL)

---

### 3.5 주문 도메인

#### orders (주문)

**목적**: 고객 주문의 핵심 정보. 주문의 중앙 엔티티.

| 칼럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | SERIAL | NO | 자동 증가 기본 키 |
| orderId | VARCHAR(50) | NO | 비즈니스 주문 ID (고유) |
| orderNumber | VARCHAR(30) | NO | 주문 번호 (고유, 고객 표시용) |
| status | VARCHAR(30) | NO | 주문 상태 - unpaid, paid, processing, shipped, delivered |
| totalPrice | NUMERIC(12,2) | NO | 총 주문 금액 (KRW) |
| currency | VARCHAR(5) | NO | 통화 (기본값: KRW) |
| quoteData | JSONB | NO | 견적 정보 JSON (제품 옵션, 수량, 가격 등) |
| customerName | VARCHAR(100) | NO | 고객명 |
| customerEmail | VARCHAR(255) | NO | 고객 이메일 |
| customerPhone | VARCHAR(20) | NO | 고객 전화 |
| customerCompany | VARCHAR(200) | YES | 고객 회사명 |
| shippingMethod | VARCHAR(20) | NO | 배송 방법 - courier, air_cargo 등 |
| shippingAddress | TEXT | YES | 배송 주소 |
| shippingPostalCode | VARCHAR(10) | YES | 배송 우편번호 |
| shippingMemo | TEXT | YES | 배송 메모 |
| shippingTrackingNumber | VARCHAR(100) | YES | 배송 추적 번호 |
| shippingEstimatedDate | VARCHAR(30) | YES | 예상 배송일 |
| widgetId | VARCHAR(50) | YES | 위젯 ID (어느 위젯에서 주문했는지) |
| productId | INTEGER | YES | 상품 ID (참고용) |
| isActive | BOOLEAN | NO | 활성화 여부 (논리적 삭제) |
| createdAt | TIMESTAMP | NO | 주문 생성 일시 |
| updatedAt | TIMESTAMP | NO | 주문 수정 일시 |

**인덱스**: status, customerEmail, widgetId, createdAt

**외래키 관계**:
- productId → products.id (DELETE SET NULL)

**quoteData 스키마**:
```json
{
  "productId": 1,
  "sizeId": 5,
  "quantity": 500,
  "options": {
    "color": "RED",
    "finish": "GLOSSY"
  },
  "itemizedPrice": {
    "basePrice": 400000,
    "optionPrice": 50000,
    "discountAmount": 0
  },
  "totalPrice": 450000
}
```

#### order_status_history (주문 상태 이력)

**목적**: 주문 상태 변경을 시간 순으로 기록. 감시 추적 및 분석용.

| 칼럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | SERIAL | NO | 자동 증가 기본 키 |
| orderId | INTEGER | NO | 주문 ID |
| status | VARCHAR(30) | NO | 변경된 상태 |
| memo | TEXT | YES | 상태 변경 메모 |
| changedAt | TIMESTAMP | NO | 상태 변경 일시 |

**인덱스**: orderId

**외래키 관계**:
- orderId → orders.id (DELETE CASCADE)

**예시 데이터**:
- 14:00: status='unpaid' - 주문 생성
- 14:30: status='paid' - 결제 완료
- 15:00: status='processing' - MES로 전송
- 다음날 10:00: status='shipped' - 배송됨

#### order_design_files (주문 디자인 파일)

**목적**: 주문에 첨부된 디자인 파일 정보 (파일 업로드 기능용)

| 칼럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | SERIAL | NO | 자동 증가 기본 키 |
| orderId | INTEGER | NO | 주문 ID |
| fileId | VARCHAR(50) | NO | 파일 고유 ID (고유) |
| originalName | VARCHAR(500) | NO | 원본 파일명 - 예: "card_design.pdf" |
| fileNumber | VARCHAR(500) | YES | 파일 번호 (변환 후 파일 번호) |
| fileSize | INTEGER | NO | 파일 크기 (바이트) |
| mimeType | VARCHAR(100) | NO | MIME 타입 - application/pdf, image/jpeg 등 |
| storageUrl | TEXT | YES | 파일 저장소 URL (S3, GCS 등) |
| status | VARCHAR(20) | NO | 파일 상태 - pending, validating, valid, rejected |
| uploadedAt | TIMESTAMP | NO | 업로드 일시 |

**인덱스**: orderId

**외래키 관계**:
- orderId → orders.id (DELETE CASCADE)

---

### 3.6 통합 도메인

#### mes_items (MES 품목)

**목적**: MES (제조 실행 시스템) 시스템의 품목 마스터 데이터

| 칼럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | SERIAL | NO | 자동 증가 기본 키 |
| itemCode | VARCHAR(20) | NO | MES 품목 코드 (고유) - 예: "40006" |
| groupCode | VARCHAR(20) | YES | MES 품목군 코드 |
| name | VARCHAR(200) | NO | MES 품목명 |
| abbreviation | VARCHAR(50) | YES | 약자 |
| itemType | VARCHAR(20) | NO | 품목 타입 - MATERIAL, PRODUCT 등 |
| unit | VARCHAR(10) | NO | 단위 (기본값: EA) - 개, 개, 세트 등 |
| isActive | BOOLEAN | NO | 활성화 여부 |
| createdAt | TIMESTAMP | NO | 생성 일시 |
| updatedAt | TIMESTAMP | NO | 수정 일시 |

**인덱스**: groupCode, itemType

#### product_mes_mapping (상품-MES 매핑)

**목적**: HuniWidget 상품과 MES 품목의 1:1 대응 관계 저장

| 칼럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | SERIAL | NO | 자동 증가 기본 키 |
| productId | INTEGER | NO | 상품 ID |
| mesItemId | INTEGER | NO | MES 품목 ID |
| coverType | VARCHAR(10) | YES | 커버 타입 (COVER, SPINE 등, 선택사항) |
| isActive | BOOLEAN | NO | 활성화 여부 |
| createdAt | TIMESTAMP | NO | 생성 일시 |
| updatedAt | TIMESTAMP | NO | 수정 일시 |

**인덱스**: productId, mesItemId

**외래키 관계**:
- productId → products.id (DELETE RESTRICT)
- mesItemId → mes_items.id (DELETE RESTRICT)

**고유 제약**: (productId, mesItemId, coverType)

#### option_choice_mes_mapping (옵션선택-MES 매핑)

**목적**: 옵션 선택지와 MES 품목/옵션의 대응 관계

| 칼럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | SERIAL | NO | 자동 증가 기본 키 |
| optionChoiceId | INTEGER | NO | 옵션 선택지 ID |
| mesItemId | INTEGER | YES | MES 품목 ID (대응되지 않았으면 NULL) |
| mesCode | VARCHAR(50) | YES | MES 코드 (직접 매핑 코드) |
| mappingType | VARCHAR(20) | NO | 매핑 타입 - ITEM, ITEM_OPTION 등 |
| mappingStatus | VARCHAR(20) | NO | 매핑 상태 - pending, mapped, validated |
| mappedBy | VARCHAR(100) | YES | 매핑 담당자 |
| mappedAt | TIMESTAMP | YES | 매핑 일시 |
| notes | TEXT | YES | 매핑 메모 |
| isActive | BOOLEAN | NO | 활성화 여부 |
| createdAt | TIMESTAMP | NO | 생성 일시 |
| updatedAt | TIMESTAMP | NO | 수정 일시 |

**인덱스**: optionChoiceId, mesItemId, mappingStatus

**외래키 관계**:
- optionChoiceId → option_choices.id (DELETE RESTRICT)
- mesItemId → mes_items.id (DELETE SET NULL)

**고유 제약**: (optionChoiceId, mappingType)

#### product_editor_mapping (상품-Edicus 매핑)

**목적**: HuniWidget 상품과 Edicus 에디터의 1:1 대응 관계 및 설정

| 칼럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | SERIAL | NO | 자동 증가 기본 키 |
| productId | INTEGER | NO | 상품 ID (고유) |
| editorType | VARCHAR(30) | NO | 에디터 타입 (기본값: edicus) |
| templateId | VARCHAR(100) | YES | Edicus 템플릿 ID |
| templateConfig | JSONB | YES | 템플릿 설정 JSON (컬러 팔레트, 폰트 등) |
| isActive | BOOLEAN | NO | 활성화 여부 |
| createdAt | TIMESTAMP | NO | 생성 일시 |
| updatedAt | TIMESTAMP | NO | 수정 일시 |

**인덱스**: editorType

**외래키 관계**:
- productId → products.id (DELETE RESTRICT, 1:1)

#### integration_dead_letters (통합 실패 큐)

**목적**: MES, Edicus, Shopby 등과의 통합 중 실패한 이벤트를 저장. 재시도 및 문제 분석용.

| 칼럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | SERIAL | NO | 자동 증가 기본 키 |
| integrationSystem | VARCHAR(30) | NO | 통합 시스템 - MES, EDICUS, SHOPBY |
| eventType | VARCHAR(50) | NO | 이벤트 종류 - PRODUCT_SYNC, ORDER_SUBMIT 등 |
| sourceId | VARCHAR(100) | NO | 원본 ID (상품ID, 주문ID 등) |
| payload | JSONB | NO | 실패한 요청 페이로드 |
| errorMessage | TEXT | YES | 오류 메시지 |
| retryCount | INTEGER | NO | 재시도 횟수 |
| lastRetryAt | TIMESTAMP | YES | 마지막 재시도 일시 |
| status | VARCHAR(20) | NO | 상태 - pending, retrying, failed, resolved |
| createdAt | TIMESTAMP | NO | 생성 일시 |
| updatedAt | TIMESTAMP | NO | 수정 일시 |

---

### 3.7 위젯빌더 도메인

#### product_recipes (상품 레시피)

**목적**: 상품의 인쇄 옵션 조합 (사이즈, 종이, 인쇄방식 등)의 공식 조합

| 칼럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | SERIAL | NO | 자동 증가 기본 키 |
| productId | INTEGER | NO | 상품 ID |
| code | VARCHAR(50) | NO | 레시피 코드 (고유) |
| name | VARCHAR(200) | YES | 레시피 이름 - 예: "표준 흰색 무광" |
| ... | ... | ... | (기타 필드) |

#### recipe_option_bindings (레시피 옵션 연결)

**목적**: 각 레시피가 어떤 옵션들을 포함하는지 정의

| 칼럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | SERIAL | NO | 자동 증가 기본 키 |
| recipeId | INTEGER | NO | 레시피 ID |
| optionDefinitionId | INTEGER | NO | 옵션 정의 ID |
| optionChoiceId | INTEGER | NO | 고정된 옵션 선택지 ID (이 값으로 고정) |
| ... | ... | ... | (기타 필드) |

#### recipe_constraints (레시피 제약)

**목적**: 특정 레시피 내에서 적용되는 옵션 간 제약 규칙

| 칼럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | SERIAL | NO | 자동 증가 기본 키 |
| recipeId | INTEGER | NO | 레시피 ID |
| sourceOptionId | INTEGER | NO | 원인 옵션 ID |
| sourceValue | VARCHAR(100) | NO | 원인 옵션 값 |
| targetOptionId | INTEGER | NO | 대상 옵션 ID |
| targetAction | VARCHAR(20) | NO | 동작 - HIDE, DISABLE, SHOW 등 |
| ... | ... | ... | (기타 필드) |

#### constraint_templates (제약 템플릿)

**목적**: 재사용 가능한 제약 규칙 템플릿

| 칼럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | SERIAL | NO | 자동 증가 기본 키 |
| name | VARCHAR(100) | NO | 템플릿명 - 예: "금박 불가능 (흰색)" |
| description | TEXT | YES | 템플릿 설명 |
| constraintRule | JSONB | NO | 제약 규칙 (구조화된 조건) |
| applicableProducts | VARCHAR | YES | 적용 가능 상품 리스트 (쉼표 분리) |
| ... | ... | ... | (기타 필드) |

#### addon_groups (애드온 그룹)

**목적**: 추가 비용이 발생하는 옵션 그룹 (금박, 엠보싱 등)

| 칼럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | SERIAL | NO | 자동 증가 기본 키 |
| code | VARCHAR(50) | NO | 그룹 코드 (고유) |
| name | VARCHAR(100) | NO | 그룹명 - 예: "특수 가공" |
| displayOrder | SMALLINT | NO | 표시 순서 |
| ... | ... | ... | (기타 필드) |

#### addon_group_items (애드온 항목)

**목적**: 각 애드온 그룹 내의 구체적인 추가 옵션

| 칼럼명 | 타입 | NULL | 설명 |
|--------|------|------|------|
| id | SERIAL | NO | 자동 증가 기본 키 |
| addonGroupId | INTEGER | NO | 애드온 그룹 ID |
| code | VARCHAR(50) | NO | 항목 코드 |
| name | VARCHAR(100) | NO | 항목명 - 예: "금박", "은박" |
| additionalCost | NUMERIC(12,2) | YES | 추가 비용 |
| ... | ... | ... | (기타 필드) |

---

## 4. 외부 시스템 통합 매핑

### 4.1 MES (제조 실행 시스템) 통합

**목적**: HuniWidget의 주문을 MES 시스템으로 전달하여 생산 관리

**핵심 테이블**:
- `product_mes_mapping`: 상품 ↔ MES 품목
- `mes_items`: MES 품목 마스터
- `option_choice_mes_mapping`: 옵션 ↔ MES 옵션

**데이터 흐름**:
1. 위젯에서 상품 선택 → HuniWidget의 productId
2. product_mes_mapping 조회 → MES itemCode 획득
3. 옵션 선택지 → option_choice_mes_mapping 조회
4. MES API로 주문 전송 (품목코드 + 옵션값)
5. 통합 실패 시 integration_dead_letters에 저장

**MES 필드 대응**:
- products.huniCode → mes_items.itemCode (1:1 매핑)
- option_choices.code → mes_item_options.optionValue

### 4.2 Edicus (에디터) 통합

**목적**: 고객이 웹 기반 디자인 에디터에서 상품 디자인 편집

**핵심 테이블**:
- `products.edicusCode`: Edicus 식별 코드 (IMMUTABLE)
- `product_editor_mapping`: 상품 ↔ Edicus 템플릿
- `products.editorEnabled`: 에디터 활성화 여부

**데이터 흐름**:
1. 상품에 editorEnabled=true, edicusCode=설정
2. 위젯에서 에디터 선택 → edicusCode로 Edicus 호출
3. Edicus에서 디자인 완료 후 위젯으로 콜백
4. 디자인 파일 저장 → order_design_files

**주의사항**:
- edicusCode는 한번 설정되면 변경 불가 (기존 프로젝트 링크 끊김)
- 변경이 필요하면 새 상품 생성 필수

### 4.3 Shopby (쇼핑몰) 통합

**목적**: Shopby 쇼핑몰과 주문 데이터 동기화

**핵심 필드**:
- `products.shopbyId`: Shopby 상품 ID
- `orders.widgetId`: 어느 위젯에서 주문했는지 (Shopby 위젯 ID)

**데이터 흐름**:
1. Shopby에서 위젯 설정 시 widgetId 발급
2. 고객이 Shopby → 위젯으로 이동 (widgetId 전달)
3. 주문 생성 시 widgetId 저장
4. 주문 완료 → Shopby로 콜백 (주문 상태 동기화)

---

## 5. 데이터 흐름도 (텍스트 기반)

### 주문 생성 흐름

```
고객 접근
    ↓
위젯 초기화 (widgetId로 상품 필터링)
    ↓
상품 선택 (productId) → products 테이블 조회
    ↓
옵션 선택 (optionChoiceId)
    → product_options → option_choices 조회
    → 가격 계산 (price_tables, price_tiers 조회)
    ↓
주문 생성 (orders 테이블 INSERT)
    → quoteData에 선택 정보 저장
    ↓
MES 전송 (통합 활성화된 경우)
    → product_mes_mapping 조회 (mesItemCode)
    → option_choice_mes_mapping 조회 (mesCode)
    → MES API 호출
    ↓
주문 완료 (status='paid')
    → order_status_history 기록
    ↓
배송 추적
    → order_status_history 업데이트 (shipped, delivered)
```

### 상품 설정 흐름

```
상품 생성 (products 테이블)
    ↓
사이즈 정의 (product_sizes)
    ↓
옵션 적용 (product_options)
    → option_definitions 선택
    → optionChoices 선택
    ↓
가격 설정 (price_tables, price_tiers)
    ↓
MES 매핑 (product_mes_mapping)
    → mes_items와 매칭
    ↓
Edicus 설정 (product_editor_mapping, 선택사항)
    → edicusCode 설정 (IMMUTABLE)
    ↓
Shopby 등록 (shopbyId 설정)
    ↓
활성화 (isActive=true)
```

---

## 6. 주요 쿼리 예제

### 6.1 상품 조회

#### 특정 상품의 모든 정보 조회

```sql
SELECT
  p.*,
  c.name AS category_name,
  COUNT(DISTINCT ps.id) AS size_count,
  COUNT(DISTINCT po.id) AS option_count
FROM products p
LEFT JOIN categories c ON p.categoryId = c.id
LEFT JOIN product_sizes ps ON p.id = ps.productId
LEFT JOIN product_options po ON p.id = po.productId
WHERE p.id = 1 AND p.isActive = true
GROUP BY p.id, c.id;
```

#### 카테고리별 활성화된 상품 목록

```sql
SELECT
  p.*,
  c.name AS category_name
FROM products p
JOIN categories c ON p.categoryId = c.id
WHERE c.id = 5 AND p.isActive = true
ORDER BY p.displayOrder;
```

#### 에디터 지원 상품 조회

```sql
SELECT
  p.id,
  p.name,
  p.edicusCode,
  pm.templateId,
  pm.templateConfig
FROM products p
LEFT JOIN product_editor_mapping pm ON p.id = pm.productId
WHERE p.editorEnabled = true AND p.isActive = true;
```

### 6.2 주문 조회

#### 특정 고객의 모든 주문

```sql
SELECT
  o.*,
  p.name AS product_name,
  COUNT(odf.id) AS file_count
FROM orders o
LEFT JOIN products p ON o.productId = p.id
LEFT JOIN order_design_files odf ON o.id = odf.orderId
WHERE o.customerEmail = 'customer@example.com' AND o.isActive = true
GROUP BY o.id
ORDER BY o.createdAt DESC;
```

#### 특정 기간의 주문 상태별 통계

```sql
SELECT
  o.status,
  COUNT(*) AS order_count,
  SUM(o.totalPrice) AS total_sales
FROM orders o
WHERE o.createdAt >= '2024-01-01' AND o.createdAt < '2024-02-01'
GROUP BY o.status;
```

#### 주문의 상태 이력 조회

```sql
SELECT
  osh.*,
  o.orderNumber
FROM order_status_history osh
JOIN orders o ON osh.orderId = o.id
WHERE o.id = 123
ORDER BY osh.changedAt ASC;
```

### 6.3 옵션 및 제약 조건

#### 특정 상품의 모든 옵션 조회

```sql
SELECT
  po.*,
  od.name AS option_name,
  od.optionClass
FROM product_options po
JOIN option_definitions od ON po.optionDefinitionId = od.id
WHERE po.productId = 1 AND po.isActive = true
ORDER BY po.displayOrder;
```

#### 옵션별 선택지 조회 (특정 상품)

```sql
SELECT
  od.name AS option_name,
  oc.code,
  oc.name AS choice_name,
  oc.priceKey
FROM product_options po
JOIN option_definitions od ON po.optionDefinitionId = od.id
JOIN option_choices oc ON od.id = oc.optionDefinitionId
WHERE po.productId = 1 AND po.isActive = true AND oc.isActive = true
ORDER BY po.displayOrder, oc.displayOrder;
```

#### 옵션 제약 조건 조회

```sql
SELECT
  oc.*,
  sod.name AS source_option_name,
  tod.name AS target_option_name
FROM option_constraints oc
LEFT JOIN option_definitions sod ON oc.sourceOptionId = sod.id
LEFT JOIN option_definitions tod ON oc.targetOptionId = tod.id
WHERE oc.productId = 1 AND oc.isActive = true
ORDER BY oc.priority;
```

### 6.4 가격 계산

#### 특정 옵션의 가격대 조회

```sql
SELECT
  pt.name,
  pt.priceType,
  ptier.minQty,
  ptier.maxQty,
  ptier.unitPrice
FROM price_tables pt
JOIN price_tiers ptier ON pt.id = ptier.priceTableId
WHERE ptier.optionCode = 'FINISH_GLOSSY' AND ptier.isActive = true
ORDER BY ptier.minQty;
```

#### 주문 수량에 따른 단가 조회

```sql
SELECT
  unitPrice
FROM price_tiers
WHERE optionCode = 'FINISH_GLOSSY'
  AND minQty <= 500
  AND maxQty >= 500
  AND isActive = true
LIMIT 1;
```

#### 고정 가격 조회 (상품 + 사이즈 + 종이)

```sql
SELECT
  fp.*,
  p.name AS product_name,
  ps.displayName AS size_name,
  pa.name AS paper_name
FROM fixed_prices fp
JOIN products p ON fp.productId = p.id
LEFT JOIN product_sizes ps ON fp.sizeId = ps.id
LEFT JOIN papers pa ON fp.paperId = pa.id
WHERE fp.productId = 1 AND fp.sizeId = 5 AND fp.paperId = 10;
```

### 6.5 통합 매핑

#### 상품의 MES 매핑 확인

```sql
SELECT
  p.huniCode,
  p.name,
  mi.itemCode,
  mi.name AS mes_item_name,
  pmm.coverType
FROM products p
JOIN product_mes_mapping pmm ON p.id = pmm.productId
JOIN mes_items mi ON pmm.mesItemId = mi.id
WHERE p.id = 1;
```

#### 옵션의 MES 매핑 상태

```sql
SELECT
  oc.code,
  oc.name,
  ocmm.mesCode,
  ocmm.mappingType,
  ocmm.mappingStatus,
  ocmm.mappedAt
FROM option_choices oc
LEFT JOIN option_choice_mes_mapping ocmm ON oc.id = ocmm.optionChoiceId
WHERE oc.optionDefinitionId = 5
ORDER BY ocmm.mappingStatus;
```

#### 통합 실패 큐 조회

```sql
SELECT
  idl.*
FROM integration_dead_letters idl
WHERE idl.integrationSystem = 'MES'
  AND idl.status = 'failed'
  AND idl.createdAt >= NOW() - INTERVAL '7 days'
ORDER BY idl.createdAt DESC;
```

---

## 7. 도메인별 상세 설명

### 7.1 제품 도메인 (Products)

**핵심 개념**:
- **상품 (Product)**: 인쇄 가능한 최소 단위. 예: "비즈니스카드", "전단지"
- **사이즈 (Size)**: 각 상품의 인쇄 크기. 예: 비즈니스카드는 85x55mm만 가능
- **카테고리 (Category)**: 상품의 분류 체계. 계층적 구조 지원

**주요 특징**:
- 각 상품은 여러 외부 시스템과 연동 (MES, Edicus, Shopby)
- 상품의 활성화 여부로 고객에게 표시 여부 제어
- 상품별 인쇄 방식, 가격 책정 모델 등이 미리 정의됨

**불변 필드**:
- `huniCode`: 내부 식별자 (변경 불가)
- `edicusCode`: Edicus 식별자 (변경 시 기존 프로젝트 링크 끊김)

### 7.2 주문 도메인 (Orders)

**핵심 개념**:
- **주문 (Order)**: 고객이 특정 상품을 특정 옵션으로 구매한 기록
- **주문 상태 (Status)**: unpaid → paid → processing → shipped → delivered
- **주문 이력 (StatusHistory)**: 상태 변경을 시간순으로 기록

**주요 특징**:
- 주문 생성 시 모든 선택 정보를 quoteData JSON에 저장
- 주문 상태 변경은 독립적 테이블에 기록 (감시 추적, 분석용)
- 주문의 설계 파일은 별도 테이블에 저장

**비즈니스 규칙**:
- 주문은 한번 생성되면 상품ID 변경 불가
- 주문 취소는 논리적 삭제 (isActive=false)로 처리
- 배송 추적은 주문 상태 이력으로 관리

### 7.3 옵션 도메인 (Options)

**핵심 개념**:
- **옵션 정의 (OptionDefinition)**: 색상, 종이, 마감 등 선택 항목의 종류
- **옵션 선택지 (OptionChoice)**: 각 옵션에서 고객이 선택할 수 있는 값 (빨강, 파랑, 무광, 광택 등)
- **상품 옵션 (ProductOption)**: 특정 상품에 어떤 옵션들을 제공할지 결정

**주요 특징**:
- 옵션은 모든 상품이 공유 가능 (예: 색상은 모든 상품에 적용)
- 상품별로 옵션의 표시 순서, 필수 여부, UI 컴포넌트 등을 커스터마이징 가능
- 옵션 선택지는 종이, 재료, 인쇄 방식 등 마스터 데이터와 연결 가능

**옵션 제약 조건**:
- 조건부 옵션 표시 (예: 오프셋 인쇄 선택 시 레이저 커팅 불가)
- 상호 배제적 옵션 (예: 무광과 광택 동시 선택 불가)

### 7.4 가격 도메인 (Pricing)

**핵심 개념**:
- **가격표 (PriceTable)**: 특정 옵션 조합의 가격 기준
- **가격 계층 (PriceTier)**: 수량 범위별 단가 정의
- **고정 가격 (FixedPrice)**: 특정 상품/사이즈/종이 조합의 고정 가격

**가격 계산 방식**:
1. 기본 가격: price_tables + price_tiers로 수량별 단가 조회
2. 옵션별 추가 가격: 각 선택 옵션의 추가 가격
3. 최종 가격 = 기본 가격 × 수량 + 옵션별 추가 가격

**주요 특징**:
- 수량 할인 자동 적용 (가격표로 관리)
- 특수한 조합은 고정 가격으로 예외 처리
- 가격은 KRW 기준, NUMERIC(12,2) 정밀도로 관리

### 7.5 재료 도메인 (Materials)

**종이 (Papers)**:
- 종이 규격, 무게, 비용, 판매가 등 정보 저장
- 리즘 단위, 4절 단위 등 다양한 가격 기준 지원

**재료 (Materials)**:
- 종이 외 PVC, 우드 등 기타 재료
- 재료별 두께 정보 저장

**인쇄 방식 (PrintModes)**:
- 오프셋, 디지털, UV, 수성 등 인쇄 방식

**후가공 (PostProcesses)**:
- 코팅, 라미네이션, 박, 엠보싱 등

**제본 (Bindings)**:
- 무선 제본, 스프링 제본, 중철 제본 등

### 7.6 통합 도메인 (Integrations)

**MES 통합**:
- HuniWidget의 상품/옵션을 MES 시스템의 품목/옵션으로 매핑
- 주문 생성 시 자동으로 MES로 전송
- 실패 시 integration_dead_letters에 저장하여 재시도

**Edicus 통합**:
- 상품별로 Edicus 에디터 템플릿 지정
- edicusCode는 불변 (변경 시 기존 에디터 링크 끊김)

**Shopby 통합**:
- 위젯을 Shopby 쇼핑몰에 임베드
- widgetId로 Shopby 위젯 구분
- 주문 상태를 Shopby로 콜백

---

## 8. 데이터 보호 및 보안

### 8.1 중요한 불변 필드

| 필드 | 테이블 | 이유 | 변경 시 영향 |
|------|--------|------|-----------|
| products.huniCode | products | 내부 식별자 | 모든 외래키 깨짐 |
| products.edicusCode | products | Edicus 식별자 | 기존 모든 Edicus 프로젝트 링크 끊김 |
| orders.orderId | orders | 비즈니스 주문 ID | 주문 추적 불가능 |

**보호 방법**:
- 애플리케이션 로직에서 변경 금지
- 데이터베이스 트리거로 이중 검증 (아직 구현되지 않음)

### 8.2 개인정보 보호

**수집되는 개인정보**:
- 고객명, 이메일, 전화, 회사명
- 배송 주소

**보호 조치**:
- 주문 기반 조회로 특정 고객 정보 보호
- 배송 추적은 주문번호 기반

### 8.3 삭제 정책

**논리적 삭제 (Soft Delete)**:
- orders.isActive = false (실제 삭제 하지 않음)
- 데이터 감시 추적 및 분석 가능

**물리적 삭제 (Hard Delete)**:
- 불필요한 설정 데이터 (옵션, 가격표 등)만 삭제
- 외래키 RESTRICT로 활성 주문이 있으면 삭제 불가

---

## 9. 성능 최적화 가이드

### 9.1 인덱스 전략

**자주 조회되는 필드**:
- orders.status: 주문 상태 필터링
- orders.customerEmail: 고객별 조회
- products.productType: 상품 타입 필터링
- option_choices.priceKey: 가격 계산

**복합 인덱스**:
- (productId, isVisible, displayOrder): 위젯에서 옵션 목록 조회
- (priceTableId, optionCode, minQty): 가격 계산

### 9.2 쿼리 최적화 팁

1. **주문 조회**: 필요한 칼럼만 SELECT (JOIN 시 모든 칼럼 조회 피하기)
2. **옵션 조회**: WHERE isActive = true 항상 적용
3. **가격 계산**: price_tiers의 복합 인덱스 활용

### 9.3 데이터 볼륨

예상 데이터 볼륨 (1년 기준):
- orders: ~50,000 건
- order_status_history: ~200,000 건 (1 주문당 평균 4 상태 변경)
- option_choices: ~1,000 건 (상수)
- price_tiers: ~2,000 건 (상수)

---

## 10. 마이그레이션 및 스키마 진화

### 10.1 새로운 외부 시스템 추가

새로운 통합 시스템을 추가할 때:
1. 해당 시스템의 마스터 데이터 테이블 생성 (예: newSystem_items)
2. 매핑 테이블 생성 (예: product_newSystem_mapping)
3. integration_dead_letters 활용하여 실패 처리

### 10.2 옵션 구조 변경

옵션 또는 제약 조건을 변경할 때:
1. 활성 주문에 영향이 없는지 확인
2. 새 옵션 정의를 추가하고 점진적으로 이전
3. 기존 옵션은 isActive=false로 비활성화 (삭제하지 않음)

---

## 11. 문제 해결 가이드

### 자주 발생하는 문제

**Q: MES로 주문 전송이 실패합니다**
A: integration_dead_letters 테이블 확인. 매핑되지 않은 옵션이 있는지 option_choice_mes_mapping 확인.

**Q: 특정 옵션이 위젯에 표시되지 않습니다**
A: 다음 확인:
1. product_options.isVisible = true?
2. product_options.isActive = true?
3. 해당 옵션이 상품에 연결되어 있는가?

**Q: 가격 계산이 잘못됩니다**
A: 다음 확인:
1. price_tiers의 minQty, maxQty 범위 중복 없는가?
2. optionCode가 올바르게 매핑되었는가?
3. fixed_prices에 우선도가 더 높은 가격이 있는가?

---

## 부록: 관련 문서

- 주문 처리 API 문서: /docs/api/orders
- 위젯 설정 가이드: /docs/widget-configuration
- MES 통합 상세 가이드: /docs/integration/mes
- Edicus 통합 매뉴얼: /docs/integration/edicus

---

**문서 버전 이력**:
- v1.0.0 (2026-02-27): 초판 작성
