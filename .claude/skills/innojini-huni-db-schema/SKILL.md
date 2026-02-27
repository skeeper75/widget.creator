---
name: innojini-huni-db-schema
description: >
  HuniPrinting Widget Builder DB 스키마 참조 스킬. 20개 테이블 구조, 핵심 설계 원칙
  (huni_code, ECA 제약, MES 매핑 조건), SPEC 대 테이블 매핑을 포함.
  DB 설계 검증, 스키마 구현, 마이그레이션 작성 시 사용.
  Use when designing or validating HuniPrinting DB schema, writing Drizzle migrations,
  or referencing existing table structures.
license: Apache-2.0
compatibility: Designed for Claude Code - widget.creator project
user-invocable: false
metadata:
  version: "1.0.0"
  category: "domain"
  status: "active"
  updated: "2026-02-27"
  tags: "huni, db, schema, drizzle, postgresql, ECA, recipe, constraint, widget-builder"
  related-skills: "innojini-wowpress, innojini-printing-foundation, innojini-huni-printing-estimator"

# MoAI Extension: Progressive Disclosure
progressive_disclosure:
  enabled: true
  level1_tokens: 130
  level2_tokens: 3500

# MoAI Extension: Triggers
triggers:
  keywords: ["DB 스키마", "스키마 설계", "recipe_constraints", "element_types",
             "huni_code", "ECA", "제약조건 설계", "DB 검증", "테이블 구조",
             "schema", "drizzle", "pgTable", "migration", "wb_products",
             "recipe", "option binding", "MES 매핑", "wbProducts", "recipeConstraints"]
  agents: ["expert-backend", "manager-spec", "team-backend-dev", "team-architect"]
  phases: ["plan", "run"]
---

# HuniPrinting Widget Builder DB 스키마

패키지 위치: `packages/db/src/schema/widget/`

---

## 테이블 레이어 구조

```
Layer 1: 기본 옵션 정의
  01-element-types.ts      → wb_option_element_types   (옵션 타입 정의)
  02-element-choices.ts    → wb_option_element_choices  (옵션 선택지)
  02-product-categories.ts → wb_product_categories     (상품 카테고리)
  02-products.ts           → wb_products               (상품 마스터)

Layer 2: 레시피 (상품+옵션 조합)
  02-product-recipes.ts         → wb_product_recipes          (레시피)
  02-recipe-option-bindings.ts  → wb_recipe_option_bindings   (레시피-옵션 연결)
  02-recipe-choice-restrictions.ts → wb_recipe_choice_restrictions (선택 제한)

Layer 3: 제약 조건 + 부자재
  03-recipe-constraints.ts    → wb_recipe_constraints       (ECA 제약 규칙)
  03-constraint-nl-history.ts → wb_constraint_nl_history    (NL 입력 이력)
  03-constraint-templates.ts  → wb_constraint_templates     (제약 템플릿)
  03-addon-groups.ts          → wb_addon_groups             (부자재 그룹)
  03-addon-group-items.ts     → wb_addon_group_items        (부자재 항목)

Layer 4: 가격
  04-print-cost-base.ts      → wb_print_cost_base         (기본 인쇄비)
  04-postprocess-cost.ts     → wb_postprocess_cost        (후가공 비용)
  04-product-price-configs.ts → wb_product_price_configs  (상품 가격 설정)
  04-qty-discount.ts         → wb_qty_discount            (수량 할인)

Layer 5: 발행/시뮬레이션
  05-publish-history.ts   → wb_publish_history     (배포 이력)
  05-simulation-runs.ts   → wb_simulation_runs     (시뮬레이션 실행)

Layer 6: 주문
  06-orders.ts            → wb_orders              (주문)
```

---

## 핵심 테이블 상세

### wb_products (상품 마스터)

```typescript
{
  id: serial PK,
  mesItemCd: varchar(20) UNIQUE,        // MES 품목 코드 (외부 참조, nullable)
  edicusCode: varchar(20) UNIQUE,       // Edicus 에디터 코드 (IMMUTABLE, nullable)
  edicusPsCode: varchar(50),            // Edicus PS 코드
  shopbyProductNo: varchar(50) UNIQUE,  // Shopby 상품 번호 (nullable)
  productKey: varchar(100) UNIQUE NOT NULL, // 내부 비즈니스 키
  productNameKo: varchar(200) NOT NULL,
  productNameEn: varchar(200),
  categoryId: FK → wb_product_categories,
  productType: varchar(50),
  isPremium, hasEditor, hasUpload: boolean,
  fileSpec: jsonb,                      // 파일 규격 (CMYK, 해상도 등)
}
```

> ⚠️ `edicusCode` = IMMUTABLE (Drizzle 트리거 별도 구현 필요)
> ⚠️ WowPress `prodno` 매핑 필드 = 현재 미구현 (갭)

### wb_recipe_constraints (ECA 제약 시스템)

```typescript
{
  id: serial PK,
  recipeId: FK → wb_product_recipes,
  constraintName: varchar(100),
  triggerOptionType: varchar(50),  // 트리거 옵션 타입 (예: "paper", "size")
  triggerOperator: varchar(20),    // "equals" | "in" | "not_in" | "gte" | "lte"
  triggerValues: jsonb,            // 트리거 값 배열 ["투명PVC", "OPP"]
  extraConditions: jsonb,          // 복합 조건 (optional)
  actions: jsonb NOT NULL,         // 액션 배열 (최소 1개)
  priority: integer DEFAULT 0,
  inputMode: varchar(20) DEFAULT 'manual', // 'manual' | 'template' | 'nl'
  templateId: FK → wb_constraint_templates (nullable),
}
```

**actions JSONB 예시**:
```json
[
  { "type": "require", "target": "coating", "values": ["유광코팅"] },
  { "type": "exclude", "target": "paper", "values": ["모조80g"] },
  { "type": "show", "target": "quantity_input" },
  { "type": "price_modifier", "multiplier": 1.5 }
]
```

### wb_recipe_choice_restrictions (단순 Allow/Exclude)

```typescript
{
  recipeBindingId: FK → wb_recipe_option_bindings,
  choiceId: FK → wb_option_element_choices,
  restrictionMode: 'allow_only' | 'exclude'  // 허용 목록 또는 제외 목록
}
```

---

## 핵심 설계 원칙

### 1. huni_code 불변성

- `productKey` = 내부 비즈니스 식별자 (변경 가능)
- `edicusCode` = Edicus 연동 코드 (IMMUTABLE — 변경 시 기존 에디터 프로젝트 파괴)
- `mesItemCd` = MES 품목 코드 (외부 연동 키)
- **주의**: DB `id` (auto-increment)를 외부 노출 금지

### 2. ECA (Event-Condition-Action) 제약 패턴

```
Event:   trigger_option_type + trigger_operator + trigger_values
         예) paper 타입이 "투명PVC" 또는 "OPP"인 경우

Condition: extra_conditions (optional)
           예) AND size >= 100

Action:  actions 배열
         예) [{ type: "require", target: "laminate" }]
```

ECA vs 단순 제약 선택 기준:
- 복잡한 조건부 로직 → `wb_recipe_constraints` (ECA)
- 단순 선택지 필터링 → `wb_recipe_choice_restrictions` (Allow/Exclude)

### 3. MES 매핑 완료 조건

주문 가능 상태 = 다음 3개 매핑 완료:
1. `wb_products.mesItemCd` — 상품 수준 MES 매핑
2. `wb_option_element_choices`의 option_class별 MES 코드 매핑:
   - `material` (자재): MES 자재 코드
   - `process` (공정): MES 공정 코드
   - `post_process` (후가공): MES 후가공 코드

### 4. 레시피 개념

레시피 = "특정 상품에 사용 가능한 옵션 조합 프리셋"

```
wb_products (1) → (N) wb_product_recipes
wb_product_recipes (1) → (N) wb_recipe_option_bindings
wb_recipe_option_bindings (1) → (N) wb_recipe_choice_restrictions
wb_product_recipes (1) → (N) wb_recipe_constraints
```

---

## SPEC 대 테이블 매핑

| SPEC | 주요 테이블 | 설명 |
|------|------------|------|
| SPEC-WB-001 | wb_option_element_types, wb_option_element_choices | 옵션 타입/선택지 관리 |
| SPEC-WB-002 | wb_products, wb_product_recipes, wb_recipe_option_bindings | 상품 및 레시피 관리 |
| SPEC-WB-003 | wb_recipe_constraints, wb_constraint_templates | ECA 제약 조건 |
| SPEC-WA-001 | wb_products + Admin UI | 관리자 상품 마스터 UI |
| SPEC-IM-001 | wb_products (mesItemCd 컬럼) | MES 연동 관리 |

---

## WowPress 대비 갭 (미구현)

| WowPress 필드 | HuniPrinting 상태 | 우선순위 |
|-------------|-----------------|---------|
| `prodno` | 미구현 (wowpressId 컬럼 없음) | 중 |
| `prsjobinfo` (인쇄기) | 부분 구현 (별도 처리) | 낮음 |
| `ordqty.rst_ordqty` | ECA로 표현 가능 | 완료 |
| `sizeinfo.req_width/height` | element_choices 데이터에 포함 | 완료 |
| 묶음배송 `dlvygrpno` | 미구현 | 중 |

> WowPress 도메인 지식 참조: `ref/wowpress/knowledge/db-mapping-guide.md` (실제 인쇄 업계 패턴 참조 가이드)

---

## 에이전트 활용 가이드

### DB 스키마 검증 시

```
1. 이 스킬로 현재 테이블 구조 파악 (DB 파일 직접 읽기 불필요)
2. innojini-wowpress 스킬 로드 → WowPress 제약과 비교
3. 갭 발견 시 SPEC 또는 마이그레이션 파일로 해결
```

### 새 테이블/컬럼 추가 시

```bash
# 마이그레이션 생성
cd /home/innojini/dev/widget.creator
pnpm --filter @widget/db db:generate  # Drizzle kit generate
pnpm --filter @widget/db db:migrate   # 마이그레이션 적용
```

### 테스트 DB 스키마 확인

```bash
# 현재 DB 스키마 목록
pnpm --filter @widget/db db:studio  # Drizzle Studio
```

---

## 참조 파일

- DB 패키지: `packages/db/src/schema/widget/`
- 공유 스키마: `packages/shared/src/db/schema/`
- 마이그레이션: `drizzle/` 폴더
- 상세 매핑 가이드: `ref/wowpress/knowledge/db-mapping-guide.md`
