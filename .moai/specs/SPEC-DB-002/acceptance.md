---
id: SPEC-DB-002
phase: acceptance
version: 1.0.0
---

## Acceptance Criteria -- SPEC-DB-002: Widget DB 레시피 & 제약조건 스키마

---

### AC-001: 레시피 버전 관리 패턴 (HARD RULE)

```gherkin
Scenario: 레시피 버전 생성
  Given wb_products에 id=1인 상품이 존재하고
  And product_recipes에 (productId=1, recipeVersion=1, isArchived=false)인 레시피가 존재할 때
  When 레시피를 수정하려면
  Then 기존 레시피의 isArchived를 true로 UPDATE하고
  And (productId=1, recipeVersion=2, isArchived=false)인 새 레시피를 INSERT해야 한다
  And 기존 레시피(version=1)의 데이터는 변경되지 않아야 한다

Scenario: 상품당 레시피 버전 UNIQUE
  Given product_recipes에 (productId=1, recipeVersion=1)이 존재할 때
  When (productId=1, recipeVersion=1)인 새 레시피를 INSERT 시도하면
  Then UNIQUE 제약 위반 에러가 발생해야 한다

Scenario: 다른 상품은 동일 버전 허용
  Given product_recipes에 (productId=1, recipeVersion=1)이 존재할 때
  When (productId=2, recipeVersion=1)인 새 레시피를 INSERT하면
  Then INSERT가 성공해야 한다
```

---

### AC-002: recipe_option_bindings CASCADE 삭제

```gherkin
Scenario: 레시피 삭제 시 바인딩 CASCADE
  Given product_recipes에 id=1인 레시피가 존재하고
  And recipe_option_bindings에 recipeId=1인 바인딩 3개가 존재하고
  And recipe_choice_restrictions에 해당 바인딩에 대한 제한 5개가 존재할 때
  When product_recipes에서 id=1을 DELETE하면
  Then recipe_option_bindings에서 recipeId=1인 모든 바인딩이 삭제되어야 한다
  And recipe_choice_restrictions에서 해당 바인딩의 모든 제한이 삭제되어야 한다
```

---

### AC-003: displayOrder vs processingOrder 독립성 (HARD RULE)

```gherkin
Scenario: 표시 순서와 처리 순서 독립 설정
  Given product_recipes에 id=1인 레시피가 존재할 때
  When recipe_option_bindings에 다음을 INSERT하면:
    | recipeId | typeId | displayOrder | processingOrder |
    | 1        | 1      | 1            | 3               |
    | 1        | 2      | 2            | 1               |
    | 1        | 3      | 3            | 2               |
  Then INSERT가 성공해야 한다
  And displayOrder 기준 조회 시 typeId 순서가 1,2,3이어야 한다
  And processingOrder 기준 조회 시 typeId 순서가 2,3,1이어야 한다
```

---

### AC-004: recipe_choice_restrictions 제한 모드

```gherkin
Scenario: allow_only 모드 -- 허용 목록
  Given recipe_option_bindings에 id=1인 바인딩이 존재하고
  And option_element_choices에 choiceId 1,2,3,4,5가 존재할 때
  When recipe_choice_restrictions에 (recipeBindingId=1, choiceId=1, restrictionMode='allow_only')와
    (recipeBindingId=1, choiceId=2, restrictionMode='allow_only')를 INSERT하면
  Then 위젯에서 해당 바인딩의 선택지는 1,2만 표시되어야 한다

Scenario: exclude 모드 -- 차단 목록
  Given recipe_option_bindings에 id=1인 바인딩이 존재할 때
  When recipe_choice_restrictions에 (recipeBindingId=1, choiceId=3, restrictionMode='exclude')를 INSERT하면
  Then 위젯에서 해당 바인딩의 선택지에서 choiceId=3이 제외되어야 한다

Scenario: restrictionMode CHECK 제약 (마이그레이션 적용 후)
  Given recipe_choice_restrictions 테이블에 CHECK 제약이 적용되어 있을 때
  When restrictionMode='invalid_mode'로 INSERT 시도하면
  Then CHECK 제약 위반 에러가 발생해야 한다
```

---

### AC-005: ECA 제약조건 평가

```gherkin
Scenario: 트리거 매칭 기반 제약조건 활성화
  Given recipe_constraints에 다음 규칙이 존재할 때:
    | recipeId | triggerOptionType | triggerOperator | triggerValues          | actions                                       |
    | 1        | PAPER             | in              | ["투명PVC", "OPP"]     | [{"type":"disable_option","targetOptionType":"FINISH_FRONT"}] |
  When 위젯에서 PAPER='투명PVC'를 선택하면
  Then FINISH_FRONT 옵션이 비활성화되어야 한다

Scenario: priority 기반 평가 순서
  Given recipe_constraints에 다음 규칙이 존재할 때:
    | priority | constraintName      | triggerOptionType |
    | 10       | 높은우선순위규칙      | PAPER             |
    | 1        | 낮은우선순위규칙      | PAPER             |
  When PAPER 옵션 변경 시 제약조건을 평가하면
  Then priority=10인 규칙이 먼저 평가되어야 한다
```

---

### AC-006: ECA actions JSONB 스키마 검증

```gherkin
Scenario: 유효한 ECA 액션 저장
  Given recipe_constraints 테이블이 존재할 때
  When actions='[{"type":"filter_choices","targetOptionType":"SIZE","allowedChoices":["90x50mm","100x148mm"]}]'로 INSERT하면
  Then INSERT가 성공해야 한다
  And actions가 유효한 JSONB로 저장되어야 한다

Scenario: 빈 actions 배열 거부 (API 레벨)
  Given recipe_constraints API 엔드포인트가 존재할 때
  When actions='[]' (빈 배열)로 생성 요청하면
  Then API 레벨에서 유효성 검증 에러가 반환되어야 한다
  And "최소 1개의 액션이 필요합니다" 메시지가 포함되어야 한다

Scenario: 다중 액션 저장
  Given recipe_constraints 테이블이 존재할 때
  When actions에 disable_option, show_message, add_cost 3개 액션을 포함한 JSONB로 INSERT하면
  Then INSERT가 성공해야 한다
  And 3개 액션이 모두 정확하게 저장되어야 한다
```

---

### AC-007: constraint_nl_history ON DELETE SET NULL

```gherkin
Scenario: 제약조건 삭제 시 NL 이력 보존
  Given recipe_constraints에 id=1인 제약조건이 존재하고
  And constraint_nl_history에 constraintId=1인 이력 3개가 존재할 때
  When recipe_constraints에서 id=1을 DELETE하면
  Then constraint_nl_history의 constraintId가 NULL로 설정되어야 한다
  And NL 이력 레코드 3개는 삭제되지 않아야 한다
  And nlInputText, recipeId 등 다른 필드는 유지되어야 한다

Scenario: NL 이력 createdBy 필수
  Given constraint_nl_history 테이블이 존재할 때
  When createdBy=NULL로 INSERT 시도하면
  Then NOT NULL 제약 위반 에러가 발생해야 한다
```

---

### AC-008: addon_group_items 복합 UNIQUE

```gherkin
Scenario: 그룹당 상품 유일성
  Given addon_groups에 id=1인 그룹이 존재하고
  And addon_group_items에 (groupId=1, productId=10)이 존재할 때
  When (groupId=1, productId=10)인 새 항목을 INSERT 시도하면
  Then UNIQUE 제약 위반 에러가 발생해야 한다

Scenario: 다른 그룹에서는 동일 상품 허용
  Given addon_group_items에 (groupId=1, productId=10)이 존재할 때
  When (groupId=2, productId=10)인 새 항목을 INSERT하면
  Then INSERT가 성공해야 한다
```

---

### AC-009: recipe_option_bindings UNIQUE 및 defaultChoiceId nullable FK

```gherkin
Scenario: 레시피당 옵션 유형 바인딩 유일성
  Given recipe_option_bindings에 (recipeId=1, typeId=1)이 존재할 때
  When (recipeId=1, typeId=1)인 새 바인딩을 INSERT 시도하면
  Then UNIQUE 제약 위반 에러가 발생해야 한다

Scenario: defaultChoiceId NULL 허용
  Given recipe_option_bindings 테이블이 존재할 때
  When defaultChoiceId=NULL인 바인딩을 INSERT하면
  Then INSERT가 성공해야 한다

Scenario: defaultChoiceId 유효한 FK 참조
  Given option_element_choices에 id=5인 선택지가 존재할 때
  When defaultChoiceId=5인 바인딩을 INSERT하면
  Then INSERT가 성공해야 한다
```

---

### AC-010: 다단계 CASCADE 삭제 체인

```gherkin
Scenario: 전체 CASCADE 삭제 체인 검증
  Given product_recipes에 id=1인 레시피가 존재하고
  And recipe_option_bindings에 recipeId=1인 바인딩 2개가 존재하고
  And recipe_choice_restrictions에 해당 바인딩의 제한 4개가 존재하고
  And recipe_constraints에 recipeId=1인 제약조건 3개가 존재하고
  And constraint_nl_history에 해당 제약조건의 이력 2개가 존재할 때
  When product_recipes에서 id=1을 DELETE하면
  Then recipe_option_bindings 2개가 CASCADE 삭제되어야 한다
  And recipe_choice_restrictions 4개가 CASCADE 삭제되어야 한다
  And recipe_constraints 3개가 CASCADE 삭제되어야 한다
  And constraint_nl_history 2개의 constraintId가 NULL로 SET되어야 한다
  And constraint_nl_history 2개 레코드 자체는 보존되어야 한다
```

---

## Quality Gate Criteria

- [ ] 8개 테이블 모두 스키마에 정의되어 있는가
- [ ] 레시피 버전 관리 패턴이 애플리케이션 레이어에서 적용되는가
- [ ] CASCADE 삭제 체인이 올바르게 설정되어 있는가
- [ ] constraint_nl_history ON DELETE SET NULL이 적용되어 있는가
- [ ] UNIQUE 복합 제약이 모든 대상 테이블에 적용되어 있는가
- [ ] ECA actions JSONB 스키마가 TypeScript 인터페이스로 문서화되어 있는가

## Definition of Done

1. 모든 Acceptance Criteria 시나리오가 검증 가능한 상태
2. HARD RULE이 적절한 레벨(DB 또는 애플리케이션)에서 보호됨
3. CASCADE 삭제 체인이 예상대로 동작함
4. ECA 액션 스키마가 모든 액션 타입을 포함하여 문서화됨
5. NL 이력 보존 정책이 명확히 정의됨
