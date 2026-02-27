---
id: SPEC-DB-002
phase: plan
version: 1.0.0
---

## 1. 구현 전략

### 1.1 파일 구조

SPEC-DB-002 대상 파일은 02-/03- 접두사 그룹에 속한다.

| 파일명                             | 테이블                     | 접두사 |
| ---------------------------------- | -------------------------- | ------ |
| 02-product-recipes.ts              | product_recipes            | 02-    |
| 02-recipe-option-bindings.ts       | recipe_option_bindings     | 02-    |
| 02-recipe-choice-restrictions.ts   | recipe_choice_restrictions | 02-    |
| 03-constraint-templates.ts         | constraint_templates       | 03-    |
| 03-addon-groups.ts                 | addon_groups               | 03-    |
| 03-recipe-constraints.ts          | recipe_constraints         | 03-    |
| 03-addon-group-items.ts            | addon_group_items          | 03-    |
| 03-constraint-nl-history.ts        | constraint_nl_history      | 03-    |

### 1.2 테이블 의존 순서

스키마 정의 순서 (FK 의존성 기준):
1. `product_recipes` (wb_products 참조)
2. `recipe_option_bindings` (product_recipes, option_element_types, option_element_choices 참조)
3. `recipe_choice_restrictions` (recipe_option_bindings, option_element_choices 참조)
4. `constraint_templates` (독립)
5. `addon_groups` (독립)
6. `recipe_constraints` (product_recipes, constraint_templates 참조)
7. `addon_group_items` (addon_groups, wb_products 참조)
8. `constraint_nl_history` (recipe_constraints, product_recipes 참조)

---

## 2. 마이그레이션 전략

### 2.1 현재 상태

8개 테이블 모두 이미 구현 완료 상태이다. 이 SPEC은 소급적 문서화이다.

### 2.2 미적용 마이그레이션 항목

- CHECK 제약 `restrictionMode IN ('allow_only', 'exclude')` -- 마이그레이션 SQL 필요
- CHECK 제약 `displayMode IN ('list', 'grid', 'carousel')` -- 마이그레이션 SQL 필요

---

## 3. 시드 데이터 계획

### 3.1 constraint_templates 시드

시스템 기본 ECA 템플릿 시드:

- **투명재질_후가공제한**: 투명 PVC/OPP 선택 시 특정 후가공 옵션 비활성화
- **프리미엄_가격추가**: 프리미엄 용지 선택 시 추가 비용
- **양면인쇄_뒷면옵션활성**: 양면 인쇄 선택 시 뒷면 후가공 옵션 활성화
- **대량주문_부가상품추천**: 대량 주문 시 부가 상품 그룹 표시
- **에디터_업로드전환**: 에디터 기능 없는 상품에서 파일 업로드 강제

### 3.2 addon_groups 시드

표준 부가 상품 그룹:
- 에폭시 부가상품 그룹
- 명함꽂이 부가상품 그룹
- 봉투 부가상품 그룹

---

## 4. CHECK 제약조건

### 4.1 필요한 CHECK 제약

```sql
-- recipe_choice_restrictions.restrictionMode
ALTER TABLE recipe_choice_restrictions
ADD CONSTRAINT chk_rcr_restriction_mode
CHECK (restriction_mode IN ('allow_only', 'exclude'));

-- addon_groups.displayMode
ALTER TABLE addon_groups
ADD CONSTRAINT chk_ag_display_mode
CHECK (display_mode IN ('list', 'grid', 'carousel'));

-- recipe_constraints.inputMode
ALTER TABLE recipe_constraints
ADD CONSTRAINT chk_rc_input_mode
CHECK (input_mode IN ('manual', 'template', 'nl'));
```

### 4.2 적용 우선순위

- Primary Goal: restrictionMode, displayMode CHECK 제약
- Secondary Goal: inputMode CHECK 제약
- Optional Goal: triggerOperator 값 검증 (허용 연산자 목록이 확정되면)

---

## 5. DB 트리거 필요 사항

### 5.1 레시피 버전 관리 트리거 (선택적)

현재 애플리케이션 레이어에서 레시피 버전 관리 패턴을 적용 중이다. DB 레벨 보호가 필요할 경우:

```sql
-- 아카이브되지 않은 레시피의 직접 UPDATE 방지 (선택적)
CREATE OR REPLACE FUNCTION prevent_recipe_direct_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_archived = false AND NEW.is_archived = false
     AND (OLD.recipe_name IS DISTINCT FROM NEW.recipe_name
          OR OLD.is_default IS DISTINCT FROM NEW.is_default) THEN
    RAISE EXCEPTION 'Direct recipe modification is not allowed. Archive existing and create new version.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**우선순위**: Optional Goal -- 애플리케이션 레이어 보호로 충분할 수 있음

---

## 6. 인덱스 최적화 계획

### 6.1 현재 인덱스 상태

모든 주요 인덱스가 Drizzle 스키마에 정의되어 있다.

### 6.2 제약조건 평가 성능 최적화

위젯 렌더링 시 제약조건 평가가 빈번하므로, 다음 쿼리 패턴에 최적화:

1. 레시피별 활성 제약조건 조회: `idx_rc_recipe` + `idx_rc_active`
2. 우선순위 기반 평가: `idx_rc_priority`로 높은 priority부터 평가
3. 특정 옵션 유형 트리거: `idx_rc_trigger`로 triggerOptionType 기반 필터링

### 6.3 추가 검토 인덱스

- `idx_cnlh_recipe`: constraint_nl_history.recipeId 인덱스 (NL 이력 조회 빈도에 따라)
- `idx_ct_category`: constraint_templates.category 인덱스 (템플릿 카테고리 필터링)

---

## 7. 성능 고려사항

### 7.1 ECA 제약조건 평가 성능

위젯에서 옵션 변경 시 실시간으로 제약조건을 평가해야 한다.

**최적화 전략**:
- priority 기반 정렬로 가장 중요한 규칙부터 평가
- triggerOptionType 기반 필터링으로 관련 규칙만 로드
- isActive=true Partial Index로 비활성 규칙 배제
- 클라이언트 캐싱: 레시피별 제약조건을 초기 로드 시 캐싱

### 7.2 CASCADE 삭제 성능

레시피 삭제 시 다단계 CASCADE가 발생하므로:
- recipe_option_bindings -> recipe_choice_restrictions 체인
- recipe_constraints -> constraint_nl_history (SET NULL)

**완화**: 대량 삭제 시 배치 처리 또는 트랜잭션 내 순차 삭제

### 7.3 JSONB 필드 조회 성능

recipe_constraints의 triggerValues, actions는 JSONB 타입이다.
- 현재 JSONB 내부 인덱스는 없음 (GIN 인덱스 미적용)
- triggerValues 내 값 검색이 빈번해지면 GIN 인덱스 추가 검토

---

## 8. 위험 요소 및 완화 전략

### 8.1 레시피 버전 무결성 위반

- **위험**: 아카이브 없이 기존 레시피를 직접 UPDATE
- **영향**: 기존 주문이 참조하는 레시피 데이터 변경
- **완화**: 애플리케이션 레이어 검증 + 선택적 DB 트리거 (5.1절)

### 8.2 CHECK 제약 미적용

- **위험**: restrictionMode, displayMode에 잘못된 값 삽입
- **영향**: 제약조건 평가 실패, UI 렌더링 오류
- **완화**: 마이그레이션 SQL로 CHECK 제약 추가 (4절)

### 8.3 ECA actions 스키마 진화

- **위험**: 새로운 액션 타입 추가 시 기존 데이터와의 호환성
- **영향**: 구버전 위젯에서 신규 액션 타입 처리 불가
- **완화**: 액션 타입에 version 필드 추가 검토, unknown 액션 타입 무시 정책

### 8.4 NL History 데이터 증가

- **위험**: AI 해석 이력이 무제한 누적
- **영향**: 스토리지 증가, 쿼리 성능 저하
- **완화**: 보존 기간 정책 수립 (예: 6개월 이후 아카이브), 파티셔닝 검토

### 8.5 CASCADE 삭제 체인 복잡도

- **위험**: 레시피 삭제 시 다단계 CASCADE로 대량 레코드 삭제
- **영향**: 트랜잭션 잠금 시간 증가, 성능 저하
- **완화**: 소프트 삭제(isArchived) 패턴 우선 적용, 물리 삭제는 배치 처리
