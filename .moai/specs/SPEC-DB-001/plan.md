---
id: SPEC-DB-001
phase: plan
version: 1.0.0
---

## 1. 구현 전략

### 1.1 Drizzle ORM 파일 명명 규칙

Widget DB 스키마는 번호 접두사를 사용한 파일 명명 규칙을 따른다.

| 접두사 | 도메인                | 파일 예시                    |
| ------ | --------------------- | ---------------------------- |
| 01-    | 기초 마스터 (옵션 유형) | 01-element-types.ts        |
| 02-    | 상품/레시피 도메인     | 02-products.ts, 02-element-choices.ts |
| 03-    | 제약조건/부가 도메인   | 03-recipe-constraints.ts   |
| 04-    | 가격 산정 도메인       | 04-product-price-configs.ts |
| 05-    | 시뮬레이션/퍼블리시   | 05-simulation-runs.ts      |
| 06-    | 주문 도메인            | 06-orders.ts               |

SPEC-DB-001 대상 파일:
- `packages/db/src/schema/widget/01-element-types.ts`
- `packages/db/src/schema/widget/02-element-choices.ts`
- `packages/db/src/schema/widget/02-product-categories.ts`
- `packages/db/src/schema/widget/02-products.ts`

### 1.2 스키마 내보내기

모든 테이블은 `packages/db/src/schema/widget/index.ts`에서 re-export되며, 관계 정의는 `packages/shared/src/db/schema/relations.ts`에서 관리된다.

---

## 2. 마이그레이션 전략

### 2.1 마이그레이션 워크플로우

1. `drizzle-kit generate` -- 스키마 변경에서 SQL 마이그레이션 생성
2. 생성된 SQL 리뷰 -- 특히 DROP/ALTER 구문 확인
3. `drizzle-kit push` -- 개발 DB에 적용
4. 프로덕션 배포 시 마이그레이션 파일 순서대로 적용

### 2.2 현재 상태

SPEC-DB-001 대상 4개 테이블은 이미 구현 완료 상태이다. 이 SPEC은 기존 스키마의 소급적(retroactive) 문서화이다.

---

## 3. 시드 데이터 계획

### 3.1 option_element_types 시드

표준 옵션 유형 시드 데이터:
- SIZE (사이즈) -- uiControl: toggle-group, category: spec
- PAPER (용지) -- uiControl: select, category: material
- FINISH_FRONT (앞면후가공) -- uiControl: toggle-group, category: process
- FINISH_BACK (뒷면후가공) -- uiControl: toggle-group, category: process
- QUANTITY (수량) -- uiControl: slider, category: quantity
- 기타 상품별 옵션 유형

### 3.2 product_categories 시드

Figma 디자인에서 정의된 11개 표준 카테고리를 시드 데이터로 관리한다. catalog.json이 아닌 Figma 디자인 문서가 유일한 기준이다.

### 3.3 option_element_choices 시드

각 옵션 유형에 대한 표준 선택지 시드. SIZE 타입은 widthMm/heightMm 전용 컬럼 활용, PAPER 타입은 basisWeightGsm 전용 컬럼 활용.

---

## 4. CHECK 제약조건

Drizzle ORM은 스키마 레이어에서 CHECK 제약을 지원하지 않으므로, 마이그레이션 SQL로 별도 추가해야 한다.

### 4.1 필요한 CHECK 제약

```sql
-- option_element_types.uiControl CHECK
ALTER TABLE option_element_types
ADD CONSTRAINT chk_oet_ui_control
CHECK (ui_control IN (
  'toggle-group', 'toggle-multi', 'select', 'number-stepper',
  'slider', 'checkbox', 'collapsible', 'color-swatch',
  'image-toggle', 'text-input'
));

-- option_element_types.optionCategory CHECK
ALTER TABLE option_element_types
ADD CONSTRAINT chk_oet_option_category
CHECK (option_category IN ('material', 'process', 'spec', 'quantity', 'group'));
```

### 4.2 적용 우선순위

- Primary Goal: uiControl, optionCategory CHECK 제약 추가
- Secondary Goal: colorHex 포맷 검증 CHECK (`colorHex ~ '^#[0-9A-Fa-f]{6}$'`)

---

## 5. DB 트리거 필요 사항

### 5.1 edicusCode 불변성 트리거

`wb_products.edicusCode`는 한번 설정되면 변경할 수 없어야 한다. 현재 애플리케이션 레이어에서만 보호 중이며, DB 트리거가 필요하다.

```sql
CREATE OR REPLACE FUNCTION prevent_edicus_code_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.edicus_code IS NOT NULL AND NEW.edicus_code IS DISTINCT FROM OLD.edicus_code THEN
    RAISE EXCEPTION 'edicusCode is immutable once set. Current: %, Attempted: %',
      OLD.edicus_code, NEW.edicus_code;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_edicus_code_update
  BEFORE UPDATE ON wb_products
  FOR EACH ROW
  EXECUTE FUNCTION prevent_edicus_code_update();
```

**우선순위**: Primary Goal -- 데이터 무결성 보호 핵심 요소

---

## 6. 인덱스 최적화 계획

### 6.1 현재 인덱스 상태

모든 UNIQUE 인덱스와 Partial Index가 이미 Drizzle 스키마에 정의되어 있다.

### 6.2 추가 고려 사항

- `idx_oec_price_key`: priceKey 기반 가격 조회 빈도가 높아지면 추가 검토
- `idx_prod_type`: productType 필터링 빈도에 따라 추가 검토

---

## 7. 성능 고려사항

### 7.1 Sparse Column vs JSONB 트레이드오프

**선택된 접근**: Sparse Column Design (SIZE/PAPER/FINISHING 전용 컬럼 + metadata jsonb)

**장점**:
- 타입 안전성: 전용 컬럼은 PostgreSQL 네이티브 타입 검증
- 인덱싱: 전용 컬럼에 직접 인덱스 생성 가능
- 쿼리 성능: jsonb 추출 없이 직접 컬럼 접근

**단점**:
- NULL 컬럼 증가: SIZE가 아닌 레코드에서 widthMm/heightMm이 NULL
- 스키마 확장 시 ALTER TABLE 필요

### 7.2 option_element_choices 조회 최적화

위젯 렌더링 시 typeId 기반 벌크 조회가 빈번하므로, `idx_oec_type_id`와 `idx_oec_active` Partial Index 조합으로 최적화한다.

---

## 8. 위험 요소 및 완화 전략

### 8.1 edicusCode 불변성 미보호

- **위험**: DB 트리거 없이 애플리케이션 레이어에서만 보호 중
- **영향**: 직접 SQL 접근 또는 마이그레이션 스크립트에서 의도치 않은 변경 가능
- **완화**: DB 트리거 추가 (5.1절 참조)

### 8.2 CHECK 제약 미적용

- **위험**: uiControl, optionCategory에 잘못된 값 삽입 가능
- **영향**: 위젯 렌더링 오류, 예상치 못한 UI 동작
- **완화**: 마이그레이션 SQL로 CHECK 제약 추가 (4절 참조)

### 8.3 카테고리 확장 시 시드 데이터 관리

- **위험**: Figma 디자인 변경 시 시드 데이터와 불일치
- **영향**: 카테고리 누락 또는 중복
- **완화**: 시드 스크립트에 idempotent upsert 패턴 적용

### 8.4 외부 코드 nullable UNIQUE 충돌

- **위험**: PostgreSQL에서 nullable UNIQUE는 다수의 NULL을 허용하므로, 빈 문자열('')로 저장 시 UNIQUE 위반 발생 가능
- **영향**: 외부 코드 미연동 상품 등록 실패
- **완화**: 애플리케이션 레이어에서 빈 문자열을 NULL로 변환하는 정규화 로직 적용
