---
id: SPEC-DB-003
title: Widget DB Pricing Schema
version: 1.0.0
status: ACTIVE
created: 2026-02-26
updated: 2026-02-26
author: MoAI
priority: HIGH
related_specs:
  - SPEC-DB-001
  - SPEC-WA-001
  - SPEC-WB-004
  - SPEC-WB-005
---

## HISTORY

| Version | Date       | Author | Description                                  |
| ------- | ---------- | ------ | -------------------------------------------- |
| 1.0.0   | 2026-02-26 | MoAI   | 초기 작성 -- 가격 산정 스키마 문서화          |

---

## 1. Context (범위)

### 1.1 목적

Widget Builder/Admin 시스템의 가격 산정 데이터베이스 스키마를 문서화한다. 4가지 가격 모드(LOOKUP, AREA, PAGE, COMPOSITE)를 지원하는 가격 설정 마스터, 기본 인쇄비 조회 테이블, 후가공 비용, 수량 할인 4개 테이블의 구조와 비즈니스 규칙을 포괄적으로 기술한다.

### 1.2 범위

- **포함**: `product_price_configs`, `print_cost_base`, `postprocess_cost`, `qty_discount`
- **제외**: 상품 도메인 핵심 (SPEC-DB-001), 레시피/제약조건 (SPEC-DB-002), 운영/주문 (SPEC-DB-004)

### 1.3 SPEC-WA-001 연결

SPEC-WA-001 (Widget Admin Console) Step 3 (가격 설정) 화면이 이 스키마에 직접 의존한다. Admin Console에서 상품별 가격 모드 설정, 인쇄비 테이블 관리, 후가공 비용 설정, 수량 할인 규칙 관리가 이 4개 테이블을 통해 수행된다.

### 1.4 의존성

- **상위 의존**: SPEC-DB-001 (`wb_products`)
- **하위 의존**: SPEC-DB-004 (orders.priceBreakdown에서 이 테이블들의 산출 결과 참조)
- **연관**: SPEC-WB-005 (Widget Auto-Quote Engine이 이 테이블을 직접 조회)

### 1.5 소스 파일 참조

| 테이블                | Drizzle ORM 파일                                                 |
| --------------------- | ---------------------------------------------------------------- |
| product_price_configs | `packages/db/src/schema/widget/04-product-price-configs.ts`      |
| print_cost_base       | `packages/db/src/schema/widget/04-print-cost-base.ts`            |
| postprocess_cost      | `packages/db/src/schema/widget/04-postprocess-cost.ts`           |
| qty_discount          | `packages/db/src/schema/widget/04-qty-discount.ts`               |

### 1.6 SPEC-WB 구현 기원 (Origin Mapping)

> **주의**: 이 SPEC은 이미 구현된 DB 스키마의 소급적(retroactive) 문서화이다. 아래 모든 테이블은 SPEC-WB-004 구현 과정에서 이미 생성/적용 완료되었다. 신규 구현이 아니라 기존 스키마의 정식 문서화이다.

| 테이블                | 원본 SPEC   | 요구사항 참조                                                | 구현 완료 |
| --------------------- | ----------- | ------------------------------------------------------------ | --------- |
| product_price_configs | SPEC-WB-004 | FR-WB004-01 (가격 모드 설정: LOOKUP/AREA/PAGE/COMPOSITE), FR-WB004-02 (상품별 1:1 매핑) | ✅ 완료 |
| print_cost_base       | SPEC-WB-004 | FR-WB004-03 (LOOKUP 인쇄비 테이블, plateType × printMode × qtyRange) | ✅ 완료 |
| postprocess_cost      | SPEC-WB-004 | FR-WB004-05 (후가공 비용, productId NULL = 글로벌 규칙)     | ✅ 완료 |
| qty_discount          | SPEC-WB-004 | FR-WB004-06 (수량 할인, productId NULL = 글로벌 규칙)       | ✅ 완료 |

**SPEC-WB 완료 현황 (이 SPEC 관련):**

| SPEC-WB ID  | 완료 상태 | 이 SPEC-DB-003에 기여한 테이블 |
| ----------- | --------- | ------------------------------ |
| SPEC-WB-004 | ✅ 완료   | product_price_configs, print_cost_base, postprocess_cost, qty_discount |
| SPEC-WB-005 | ✅ 완료   | (이 테이블들의 소비자 — Auto-Quote Engine이 조회) |

---

## 2. ERD (Entity Relationship Diagram)

```mermaid
erDiagram
  wb_products ||--o| product_price_configs : "configures (1:1 UNIQUE)"
  wb_products ||--o{ print_cost_base : "LOOKUP price table"
  wb_products }o--o{ postprocess_cost : "post-process (NULL=global)"
  wb_products }o--o{ qty_discount : "qty discount (NULL=global)"

  product_price_configs {
    serial id PK
    integer productId FK_UK "NOT NULL UNIQUE"
    varchar(20) priceMode "NOT NULL"
    text formulaText "nullable"
    decimal(12_2) unitPriceSqm "nullable AREA"
    decimal(6_4) minAreaSqm "DEFAULT 0.1 AREA"
    integer imposition "nullable PAGE"
    decimal(12_2) coverPrice "nullable PAGE"
    decimal(12_2) bindingCost "nullable PAGE"
    decimal(12_2) baseCost "nullable COMPOSITE"
    boolean isActive "DEFAULT true"
  }

  print_cost_base {
    serial id PK
    integer productId FK "NOT NULL"
    varchar(50) plateType "NOT NULL"
    varchar(50) printMode "NOT NULL"
    integer qtyMin "NOT NULL"
    integer qtyMax "NOT NULL"
    decimal(12_2) unitPrice "NOT NULL"
    boolean isActive "DEFAULT true"
  }

  postprocess_cost {
    serial id PK
    integer productId FK "nullable NULL=global"
    varchar(50) processCode "NOT NULL"
    varchar(100) processNameKo "NOT NULL"
    integer qtyMin "DEFAULT 0"
    integer qtyMax "DEFAULT 999999"
    decimal(12_2) unitPrice "NOT NULL"
    varchar(20) priceType "NOT NULL DEFAULT fixed"
    boolean isActive "DEFAULT true"
  }

  qty_discount {
    serial id PK
    integer productId FK "nullable NULL=global"
    integer qtyMin "NOT NULL"
    integer qtyMax "NOT NULL"
    decimal(5_4) discountRate "NOT NULL"
    varchar(50) discountLabel "nullable"
    integer displayOrder "DEFAULT 0"
    boolean isActive "DEFAULT true"
  }
```

---

## 3. 테이블 상세 스펙

### 3.1 product_price_configs (가격 설정 마스터)

**목적**: 상품별 가격 산정 모드와 모드별 파라미터를 설정하는 마스터 테이블. 상품당 정확히 1개의 가격 설정이 존재한다.

| 필드명        | 타입          | 제약조건                          | 설명                                  |
| ------------- | ------------- | --------------------------------- | ------------------------------------- |
| id            | serial        | PK                                | 자동 증가 기본키                      |
| productId     | integer       | NOT NULL FK -> wb_products.id ON DELETE CASCADE, UNIQUE | 소속 상품 (1:1)  |
| priceMode     | varchar(20)   | NOT NULL                          | 가격 모드 (LOOKUP/AREA/PAGE/COMPOSITE)|
| formulaText   | text          | nullable                          | 관리자용 수식 메모                    |
| unitPriceSqm  | decimal(12,2) | nullable                          | AREA 모드: 제곱미터당 단가            |
| minAreaSqm    | decimal(6,4)  | DEFAULT 0.1                       | AREA 모드: 최소 면적 (m2)             |
| imposition    | integer       | nullable                          | PAGE 모드: 부수 (한 판에 인쇄 매수)  |
| coverPrice    | decimal(12,2) | nullable                          | PAGE 모드: 표지 가격                  |
| bindingCost   | decimal(12,2) | nullable                          | PAGE 모드: 제본 비용                  |
| baseCost      | decimal(12,2) | nullable                          | COMPOSITE 모드: 기본 비용             |
| isActive      | boolean       | DEFAULT true                      | 활성 상태                             |

**UNIQUE 제약**: `productId` -- 상품당 정확히 1개의 가격 설정 (1:1 관계)

**인덱스**:

| 인덱스명           | 컬럼             | 유형   |
| ------------------- | ---------------- | ------ |
| idx_ppc_price_mode  | priceMode        | B-tree |

**@MX 주석**: `@MX:ANCHOR` -- fan_in >= 3 (LOOKUP engine, AREA engine, PAGE engine, COMPOSITE engine)

---

### 3.2 print_cost_base (LOOKUP 모드 가격 테이블)

**목적**: LOOKUP 모드에서 사용되는 인쇄 기본비 조회 테이블. 상품/판형/인쇄방식/수량 범위별 단가를 저장한다.

| 필드명      | 타입          | 제약조건                        | 설명                                  |
| ----------- | ------------- | ------------------------------- | ------------------------------------- |
| id          | serial        | PK                              | 자동 증가 기본키                      |
| productId   | integer       | NOT NULL FK -> wb_products.id   | 소속 상품                             |
| plateType   | varchar(50)   | NOT NULL                        | 판형 코드 (예: '90x50', '100x148')   |
| printMode   | varchar(50)   | NOT NULL                        | 인쇄 방식 (예: '단면칼라', '양면칼라')|
| qtyMin      | integer       | NOT NULL                        | 수량 범위 시작 (포함)                 |
| qtyMax      | integer       | NOT NULL                        | 수량 범위 끝 (포함)                   |
| unitPrice   | decimal(12,2) | NOT NULL                        | 단가 (KRW)                            |
| isActive    | boolean       | DEFAULT true                    | 활성 상태                             |

**인덱스**:

| 인덱스명         | 컬럼/조건                                        | 유형      |
| ----------------- | ------------------------------------------------ | --------- |
| idx_pcb_product   | productId                                        | B-tree    |
| idx_pcb_lookup    | (productId, plateType, printMode, qtyMin)        | Composite |

**@MX 주석**: `@MX:ANCHOR` -- fan_in >= 3 (LOOKUP engine reads this, seed script populates, admin UI manages)

---

### 3.3 postprocess_cost (후가공 비용)

**목적**: 후가공 공정별 비용을 정의. productId가 NULL이면 전역(global) 규칙으로 모든 상품에 적용되고, 특정 상품에 동일 processCode 규칙이 있으면 상품별 규칙이 우선한다.

| 필드명        | 타입          | 제약조건                        | 설명                                    |
| ------------- | ------------- | ------------------------------- | --------------------------------------- |
| id            | serial        | PK                              | 자동 증가 기본키                        |
| productId     | integer       | FK -> wb_products.id (nullable) | 대상 상품 (NULL=전역)                   |
| processCode   | varchar(50)   | NOT NULL                        | 후가공 코드 (예: 'MATTE_PP', 'UV_COATING') |
| processNameKo | varchar(100)  | NOT NULL                        | 한국어 공정명                           |
| qtyMin        | integer       | DEFAULT 0                       | 수량 범위 시작                          |
| qtyMax        | integer       | DEFAULT 999999                  | 수량 범위 끝                            |
| unitPrice     | decimal(12,2) | NOT NULL                        | 단가                                    |
| priceType     | varchar(20)   | NOT NULL DEFAULT 'fixed'        | 가격 유형 (fixed/per_unit/per_sqm)      |
| isActive      | boolean       | DEFAULT true                    | 활성 상태                               |

**인덱스**:

| 인덱스명       | 컬럼        | 유형   |
| --------------- | ----------- | ------ |
| idx_ppc_product | productId   | B-tree |
| idx_ppc_code    | processCode | B-tree |

**@MX 주석**: `@MX:ANCHOR` -- fan_in >= 3 (pricing engine, seed data, admin interface)

**주의**: idx_ppc_product 인덱스명이 product_price_configs의 인덱스와 충돌 가능성이 있다. 마이그레이션 검토 시 확인 필요.

---

### 3.4 qty_discount (수량 할인)

**목적**: 수량 구간별 할인율을 정의. productId가 NULL이면 전역 할인 규칙이며, 상품별 규칙이 전역 규칙을 오버라이드한다.

| 필드명        | 타입          | 제약조건                        | 설명                                    |
| ------------- | ------------- | ------------------------------- | --------------------------------------- |
| id            | serial        | PK                              | 자동 증가 기본키                        |
| productId     | integer       | FK -> wb_products.id (nullable) | 대상 상품 (NULL=전역)                   |
| qtyMin        | integer       | NOT NULL                        | 수량 범위 시작 (포함)                   |
| qtyMax        | integer       | NOT NULL                        | 수량 범위 끝 (포함)                     |
| discountRate  | decimal(5,4)  | NOT NULL                        | 할인율 (예: 0.0300 = 3%)               |
| discountLabel | varchar(50)   | nullable                        | 할인 라벨 (예: '소량할인')              |
| displayOrder  | integer       | DEFAULT 0                       | 표시 순서                               |
| isActive      | boolean       | DEFAULT true                    | 활성 상태                               |

**복합 UNIQUE 제약**: `(productId, qtyMin, qtyMax)` -- 상품(또는 전역)별 수량 범위 유일

**인덱스**:

| 인덱스명       | 컬럼      | 유형   |
| --------------- | --------- | ------ |
| idx_qd_product  | productId | B-tree |

**@MX 주석**: `@MX:ANCHOR` -- fan_in >= 3 (pricing engine, seed data, admin interface)

---

## 4. 관계 정의

| 관계                                       | 타입   | FK 컬럼                          | 참조 대상         | ON DELETE   |
| ------------------------------------------ | ------ | -------------------------------- | ----------------- | ----------- |
| wb_products -> product_price_configs       | 1:1    | product_price_configs.productId  | wb_products.id    | CASCADE     |
| wb_products -> print_cost_base             | 1:N    | print_cost_base.productId        | wb_products.id    | (미지정)    |
| wb_products -> postprocess_cost            | 1:N    | postprocess_cost.productId       | wb_products.id    | (nullable)  |
| wb_products -> qty_discount                | 1:N    | qty_discount.productId           | wb_products.id    | (nullable)  |

**카디널리티 설명**:
- product_price_configs는 상품당 정확히 1개 (UNIQUE 제약)
- print_cost_base는 상품당 여러 행 (판형/인쇄방식/수량 범위 조합)
- postprocess_cost, qty_discount는 productId=NULL 허용 (전역 규칙)

---

## 5. HARD RULES (불변 비즈니스 규칙)

1. **가격 모드 상호 배타성**: product_price_configs.priceMode 값에 따라 해당 모드의 필드만 사용된다.
   - `LOOKUP`: print_cost_base 테이블에서 조회
   - `AREA`: unitPriceSqm, minAreaSqm 필드 사용
   - `PAGE`: imposition, coverPrice, bindingCost 필드 사용
   - `COMPOSITE`: baseCost + postprocess_cost 합산

2. **전역 vs 상품별 우선순위**:
   - `postprocess_cost`: productId=NULL은 전역 규칙, 상품별 규칙이 존재하면 전역 규칙을 오버라이드
   - `qty_discount`: productId=NULL은 전역 할인, 상품별 할인이 존재하면 전역 할인을 오버라이드

3. **상품당 1개 가격 설정**: product_price_configs의 productId는 UNIQUE이다. 하나의 상품에 2개 이상의 가격 설정을 가질 수 없다.

4. **수량 범위 포함적(inclusive)**: qtyMin과 qtyMax는 모두 포함적이다. 즉, 수량 N일 때 `qtyMin <= N <= qtyMax` 조건으로 매칭한다.

---

## 6. 인덱스 전략

### 6.1 LOOKUP 가격 조회 최적화

LOOKUP 엔진의 핵심 쿼리:
```sql
SELECT unit_price FROM print_cost_base
WHERE product_id = ? AND plate_type = ? AND print_mode = ?
  AND qty_min <= ? AND qty_max >= ?
  AND is_active = true
ORDER BY qty_min
LIMIT 1;
```

`idx_pcb_lookup (productId, plateType, printMode, qtyMin)` 복합 인덱스로 최적화.

### 6.2 후가공 비용 조회

전역 + 상품별 후가공 비용을 통합 조회:
```sql
SELECT * FROM postprocess_cost
WHERE (product_id = ? OR product_id IS NULL)
  AND process_code = ?
  AND is_active = true
ORDER BY product_id NULLS LAST;
```

`idx_ppc_product`와 `idx_ppc_code` 인덱스 조합 사용.

### 6.3 쿼리 패턴별 인덱스 매핑

| 쿼리 패턴                        | 사용 인덱스              |
| --------------------------------- | ------------------------ |
| 상품 가격 모드 조회               | product_price_configs.productId (UNIQUE) |
| LOOKUP 가격 조회                  | idx_pcb_lookup           |
| 상품별 후가공 비용 조회           | idx_ppc_product + idx_ppc_code |
| 전역 후가공 비용 조회             | idx_ppc_product (IS NULL) |
| 상품별 수량 할인 조회             | idx_qd_product           |

---

## 7. JSONB 필드 스키마 정의

이 SPEC의 테이블에는 JSONB 필드가 없다. 가격 산정 결과의 JSONB 스키마는 SPEC-DB-004의 orders.priceBreakdown에서 정의된다.

**Price Mode별 산출 로직 참조**:

### 7.1 LOOKUP 모드

```typescript
// LOOKUP: print_cost_base에서 조회
interface LookupResult {
  plateType: string;       // e.g. '90x50'
  printMode: string;       // e.g. '단면칼라'
  quantity: number;
  unitPrice: number;       // 조회된 단가 (KRW)
  basePrice: number;       // unitPrice * quantity
}
```

### 7.2 AREA 모드

```typescript
// AREA: widthM * heightM * unitPriceSqm
interface AreaResult {
  widthMm: number;
  heightMm: number;
  areaSqm: number;         // widthM * heightM
  effectiveArea: number;   // max(areaSqm, minAreaSqm)
  unitPriceSqm: number;
  basePrice: number;       // effectiveArea * unitPriceSqm * quantity
}
```

### 7.3 PAGE 모드

```typescript
// PAGE: (pages / imposition) * basePrintCost + coverPrice + bindingCost
interface PageResult {
  pages: number;
  imposition: number;
  sheets: number;          // Math.ceil(pages / imposition)
  coverPrice: number;
  bindingCost: number;
  basePrice: number;
}
```

### 7.4 COMPOSITE 모드

```typescript
// COMPOSITE: baseCost + sum(postprocess_cost)
interface CompositeResult {
  baseCost: number;
  postprocessItems: Array<{
    processCode: string;
    processNameKo: string;
    amount: number;
  }>;
  basePrice: number;       // baseCost + sum(postprocessItems.amount)
}
```

---

## 8. 데이터 무결성 규칙

### 8.1 참조 무결성

- `product_price_configs.productId` -> `wb_products.id`: ON DELETE CASCADE, UNIQUE
  - 상품 삭제 시 가격 설정도 함께 삭제
  - 상품당 정확히 1개 설정
- `print_cost_base.productId` -> `wb_products.id`: FK (ON DELETE 미지정)
- `postprocess_cost.productId` -> `wb_products.id`: nullable FK (NULL=전역)
- `qty_discount.productId` -> `wb_products.id`: nullable FK (NULL=전역)

### 8.2 CHECK 제약 (미구현, 마이그레이션 SQL로 추가 필요)

```sql
-- product_price_configs.priceMode
ALTER TABLE product_price_configs
ADD CONSTRAINT chk_ppc_price_mode
CHECK (price_mode IN ('LOOKUP', 'AREA', 'PAGE', 'COMPOSITE'));

-- postprocess_cost.priceType
ALTER TABLE postprocess_cost
ADD CONSTRAINT chk_pc_price_type
CHECK (price_type IN ('fixed', 'per_unit', 'per_sqm'));
```

### 8.3 수량 범위 무결성

- qtyMin <= qtyMax 보장 필요 (CHECK 제약 또는 애플리케이션 레벨)
- 수량 범위 겹침(overlap) 방지는 애플리케이션 레벨에서 처리
  - print_cost_base: (productId, plateType, printMode) 그룹 내 범위 겹침 방지
  - qty_discount: (productId) 그룹 내 범위 겹침 방지

### 8.4 NULL productId 의미

- `postprocess_cost.productId = NULL`: 모든 상품에 적용되는 전역 후가공 비용
- `qty_discount.productId = NULL`: 모든 상품에 적용되는 전역 수량 할인
- 상품별 규칙이 전역 규칙보다 우선한다 (애플리케이션 레벨 처리)
