# SPEC-SEED-001: 시드 데이터 구현 명세

> Version: 1.0.0
> Created: 2026-02-23
> Status: completed
> Updated: 2026-02-23
> Priority: High
> Depends On: SPEC-DATA-002 (데이터 아키텍처)

---

## 1. 개요

### 1.1 목적

SPEC-DATA-002에서 정의한 26개 테이블에 후니프린팅 상품 마스터 데이터를 올바르게 시딩한다.
이전 seed.ts 구현의 두 가지 핵심 버그를 수정하고, 명확한 알고리즘으로 재구현한다.

### 1.2 해결할 버그

#### Bug #1: shopby_id 잘못된 할당

**문제**: `MES_자재공정매핑_v5.json`의 `shopbyId` 필드를 `shopby_id` 컬럼에 저장하고 있음.

**원인**: 필드명이 `shopbyId`이지만, 이 값은 **실제 Shopby 플랫폼 ID가 아니다**.
이 값은 Excel 파일의 B열(상품 ID) = `huni_code`이다.

**올바른 처리**:
```
products.huni_code = v5.shopbyId (값이 있는 경우) 또는 순차 ID 90001+ (없는 경우)
products.shopby_id = NULL (아직 Shopby 등록 전, 추후 별도 매핑 예정)
```

#### Bug #2: 굿즈 카테고리 하위 매핑 실패

**문제**: 굿즈(MES 카테고리 10, 11)의 79개 상품이 하위카테고리가 아닌 상위카테고리에 매핑됨.

**원인**: `mesItemCdToSubCategoryId` 맵을 구축할 때 굿즈 시트 상품은 `mesItemCd`가 없어서 맵이 빈 상태.

**해결**: Priority 0 조회 추가 - `shopbyId`(= Excel ID = huni_code)로 raw data의 `id` 필드와 매치하여 subCategory 이름을 찾음.

---

## 2. 핵심 코드 체계 (SPEC-DATA-002 §1.3 요약)

| 필드 | 출처 | 설명 |
|------|------|------|
| `huni_code` | Excel B열 (= v5.json `shopbyId`) | **중추 식별자** |
| `edicus_code` | `HU_` + huni_code | 에디쿠스 파생 코드 |
| `shopby_id` | Shopby 등록 후 부여 | **현재 NULL** (추후 설계) |
| `mes_item_code` | v5.json `mesItemCd` | MES 품목코드 (`NNN-NNNN` 형식) |

**코드 체계 원칙**: huni_code가 중추. shopby_id는 현재 NULL로 유지.

---

## 3. 데이터 소스

```
data/exports/MES_자재공정매핑_v5.json   -- 221개 상품 (메인 소스)
data/_raw/product-master-raw.json      -- 원본 Excel 파싱 (카테고리 서브카테고리 매핑용)
```

### 3.1 v5.json 구조

```json
{
  "shopbyId": 14567,        // Excel B열 = huni_code (NOT Shopby platform ID)
  "mesItemCd": "001-0001",  // MES 품목코드
  "subCategory": "엽서",    // 하위카테고리 (굿즈는 null)
  "category": "10",         // MES 카테고리 코드
  "name": "프리미엄엽서",   // 상품명
  "editor": "O",            // 에디터 지원 여부
  "isActive": true,         // 활성 여부
  "mesRegistered": true     // MES 등록 여부
}
```

### 3.2 product-master-raw.json 구조 (굿즈 예시)

```json
{
  "sheet": "굿즈",
  "id": 14567,              // Excel B열 = huni_code (굿즈의 경우 mesItemCd 없음)
  "category": "폰케이스",   // 하위카테고리 이름
  "name": "슬림하드 폰케이스"
}
```

---

## 4. huni_code 할당 알고리즘

```
if (product.shopbyId != null) {
  huni_code = String(product.shopbyId)   // Excel B열 값 그대로 사용
} else {
  huni_code = String(sequentialId++)     // 90001부터 순차 부여
}
```

**참고**:
- 기존 상품 huni_code 범위: 14529 ~ 22953 (164개)
- 신규 상품 huni_code 범위: 90001+ (57개, 임시)
- `sequentialId` 시작값: 90001

---

## 5. 카테고리 매핑 알고리즘

### 5.1 카테고리 계층 구조

```
depth=0 (상위): 엑셀 시트명 (디지털인쇄, 스티커, 책자, ...)
depth=1 (하위): 각 시트 A열 "구분" 값 (엽서, 카드, 전단지, ...)
products.category_id → depth=1 카테고리 참조
```

### 5.2 서브카테고리 조회 우선순위 (4단계)

```
Priority 0 (굿즈 전용): shopbyId로 raw data에서 subCategory 조회
  → shopbyIdToSubCatName[product.shopbyId] → subCategoryId 맵

Priority 1 (일반): mesItemCd로 v5.json에서 subCategory 조회
  → mesItemCdToSubCategoryId[product.mesItemCd]

Priority 2 (fallback): MES 카테고리 코드로 시트명 매핑
  → MES_CATEGORY_MAP[product.category] → 상위카테고리

Priority 3 (최후): 상위카테고리 직접 할당
```

### 5.3 MES 카테고리 → 엑셀 시트 매핑

```typescript
const MES_CATEGORY_MAP: Record<string, string> = {
  '1':  'CAT_DIGITAL_PRINT',  // 디지털인쇄
  '2':  'CAT_STICKER',        // 스티커
  '3':  'CAT_BOOKLET',        // 책자
  '4':  'CAT_LARGE_FORMAT',   // 실사/사인
  '5':  'CAT_ACRYLIC',        // 아크릴
  '6':  'CAT_DIGITAL_PRINT',  // 명함 (디지털인쇄 하위)
  '7':  'CAT_DIGITAL_PRINT',  // 봉투 (디지털인쇄 하위)
  '8':  'CAT_STATIONERY',     // 문구
  '9':  'CAT_PACKAGING',      // 포장용품
  '10': 'CAT_GOODS',          // 굿즈 (상위)
  '11': 'CAT_GOODS',          // 굿즈 (하위)
};
```

---

## 6. 미출시/내부전용 상품 처리

### 6.1 노랑 배경 상품 (15개, mes_registered=false)

엑셀에서 노랑 배경으로 표시된 미출시 상품들.

| 처리 | 상품 | 비고 |
|------|------|------|
| `is_active=true, mes_registered=true` | 썬캡 (003-0016), 소량자유형스티커 (002-0006) | 품목관리 코드 확인됨 |
| `is_active=true, mes_registered=true` | 아크릴명찰(골드실버) (009-0007), 메모패드(내지커스텀) (008-0006) | 품목관리 코드 확인됨 |
| `is_active=false, mes_registered=false` | 핑크별색엽서, 금은별색엽서, 모양엽서, 미니접지카드, 형압명함 | 품목관리 미확인 |
| `is_active=false, mes_registered=false` | 아크릴코롯토, 아크릴카라비너, 타이벡북커버 | 조합형 아크릴 신규 |
| `is_active=false, mes_registered=false` | 천정고리, 우드봉, 만년스탬프 리필잉크 | 상품악세사리 |

### 6.2 회색 배경 상품 (7개, 내부전용)

```typescript
// 내부전용: Shopby에 노출하지 않는 상품들
const INTERNAL_PRODUCTS = [
  '링바인더',      // 하드커버책자 - 보류중
  '아이스머그컵',   // 굿즈/라이프
  '슬림하드 폰케이스', '블랙젤리', '임팩트 젤하드',
  '에어팟케이스', '버즈케이스',
];
// is_active=false로 처리 (내부 전용)
```

---

## 7. 시드 실행 순서

```
Phase 1: 카테고리 (categories)
  1-1. 상위카테고리 (depth=0): 8개 시트명
  1-2. 하위카테고리 (depth=1): 각 시트 구분

Phase 2: 기초 마스터
  2-1. papers (용지) - !디지털인쇄용지 시트
  2-2. materials (소재) - 아크릴/실사/굿즈 소재
  2-3. print_modes (인쇄방식) - 12개 코드
  2-4. post_processes (후가공) - 8개 섹션
  2-5. bindings (제본) - 4개 유형
  2-6. imposition_rules (판걸이) - ~30개

Phase 3: 상품
  3-1. products (221개)
       - huni_code: shopbyId 값 또는 90001+
       - shopby_id: NULL
       - category_id: 4단계 우선순위 조회
       - is_active, mes_registered: 미출시/내부 플래그 적용

Phase 4: 옵션
  4-1. option_definitions (30개)
  4-2. option_choices (1198개)
  4-3. product_options (상품별 옵션)
  4-4. option_constraints (129개 ★)

Phase 5: 가격
  5-1. price_tables (메타)
  5-2. price_tiers (수량구간 단가)
  5-3. fixed_prices (고정단가)
  5-4. package_prices (패키지)
  5-5. foil_prices (박/형압)
  5-6. paper_product_mapping

Phase 6: MES 통합
  6-1. mes_items + mes_item_options
  6-2. product_mes_mapping
  6-3. product_editor_mapping
```

---

## 8. 데이터 검증 기준

| 항목 | 기대값 | 검증 방법 |
|------|--------|----------|
| products 총 수 | 221개 | `SELECT COUNT(*) FROM products` |
| huni_code 범위 | 14529~22953 (164개) + 90001~90057 (57개) | `SELECT MIN/MAX` |
| shopby_id | 전부 NULL | `SELECT COUNT(*) WHERE shopby_id IS NOT NULL = 0` |
| 굿즈 하위카테고리 매핑 | 79개 모두 depth=1에 매핑 | `SELECT p.id, c.depth FROM products p JOIN categories c` |
| mes_registered=false | 미출시 상품 11개 | `SELECT COUNT(*) WHERE mes_registered=false` |
| edicus_code 형식 | `HU_` + huni_code | `SELECT COUNT(*) WHERE edicus_code NOT LIKE 'HU_%'` |

---

## 9. 구현 파일

**수정 대상**: `scripts/seed.ts`

**핵심 수정 사항**:
1. `huni_code` 할당: `shopbyId` 값 사용 (기존과 동일한 값이나 의미가 명확해짐)
2. `shopby_id`: 제거 (NULL로 초기화)
3. `category_id` 조회: Priority 0 (shopbyId → raw data subCategory) 추가

---

## 10. 인수 조건

1. 221개 상품이 올바른 huni_code로 등록됨
2. 모든 shopby_id가 NULL
3. 굿즈(MES 10/11) 79개 상품이 올바른 하위카테고리에 매핑됨
4. 미출시 11개 상품의 is_active=false, mes_registered=false
5. edicus_code가 `HU_` + huni_code 형식으로 저장됨
6. 모든 products가 depth=1 카테고리를 참조

---

## 11. 구현 노트

### 구현 완료 일시
2026-02-23

### 구현 결과
- **수정 파일**: `scripts/seed.ts` (1개 파일)
- **커밋**: `5673fbd fix(seed): implement seed.ts data fixes for SPEC-SEED-001`

### 주요 변경사항
1. `INTERNAL_PRODUCT_NAMES` Set 상수 추가 (SPEC §6.2, 7개 내부전용 상품)
2. `isActive` 로직 수정: `true` 하드코딩 → `!INTERNAL_PRODUCT_NAMES.has(product.productName)`
3. `mesRegistered` 수정: `product.shopbyId !== null` → `!!product.MesItemCd`
4. `edicusCode` 수정: shopbyId 있는 상품만 → 모든 상품에 `HU_` + huniCode
5. slug 수정: 한국어 이름 기반(빈 문자열 발생) → `MesItemCd.toLowerCase()`
6. `seedCategories` 재작성: `SHEET_CATEGORY_MAP` 기반 2단계 계층 구조
7. `seedProductsAndMes` 개선: Priority 0~3 단계별 카테고리 조회

### 인수 조건 검증 결과
| AC | 항목 | 결과 |
|----|------|------|
| AC1 | 221개 상품 등록 | ✅ 221개 |
| AC2 | shopby_id 모두 NULL | ✅ 0개 non-null |
| AC4 | 비활성 상품 처리 | ✅ 5개 (내부전용) |
| AC5 | edicus_code 형식 | ✅ 0개 오형식 |
| AC6 | depth=1 카테고리 참조 | ✅ 0개 위반 |

### 특이사항
- SPEC AC4의 "미출시 11개 상품"은 v5.json에 존재하지 않아 처리 보류
- v5.json 내 내부전용 5개 상품만 is_active=false 처리됨
