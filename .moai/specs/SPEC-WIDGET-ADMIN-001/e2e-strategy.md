# SPEC-WIDGET-ADMIN-001 E2E 테스트 전략

**버전**: 1.0.0
**작성일**: 2026-02-28
**테스트 프레임워크**: Playwright

---

## 1. 테스트 구성

### 1.1 파일 구조

```
apps/admin/__tests__/e2e/widget-builder/
├── element-types.spec.ts          # Element Types 페이지
├── element-choices.spec.ts        # Element Choices 페이지
├── recipe-builder.spec.ts         # Recipe Builder 페이지
├── constraint-templates.spec.ts   # Constraint Templates 페이지
├── addon-groups.spec.ts           # Addon Groups 페이지
├── price-config.spec.ts           # Price Config 페이지
├── orders.spec.ts                 # Orders 페이지
├── navigation.spec.ts             # 사이드바 네비게이션
└── fixtures/
    └── seed-widget-builder.ts     # 테스트 시드 데이터
```

### 1.2 describe 블록 구조

각 페이지 테스트 파일은 다음 구조를 따른다:

```typescript
describe('Widget Builder - [페이지명]', () => {
  describe('목록 표시', () => { ... });
  describe('필터 및 검색', () => { ... });
  describe('생성 (Create)', () => { ... });
  describe('수정 (Update)', () => { ... });
  describe('삭제/비활성화 (Delete/Deactivate)', () => { ... });
  describe('특수 비즈니스 규칙', () => { ... });
  describe('에러 처리', () => { ... });
});
```

---

## 2. 핵심 테스트 경로

### 2.1 Element Types 페이지

**Happy Path:**
- 페이지 접근 시 DataTable에 element types 목록 표시 확인
- "Add Element Type" 버튼 클릭 -> 모달 열림 -> 필수 필드 입력 -> 저장 -> 목록에 추가됨
- 카테고리 필터로 "material" 선택 시 해당 카테고리만 표시
- 기존 항목 편집 -> typeNameKo 변경 -> 저장 -> 업데이트 반영

**Error Path:**
- 중복 typeKey로 생성 시도 -> 오류 메시지 표시
- element_choices가 존재하는 타입 비활성화 시도 -> 차단 및 오류 메시지

**스크린샷:**
- `element-types-list.png` — 목록 전체 화면
- `element-types-create-modal.png` — 생성 모달
- `element-types-delete-blocked.png` — 삭제 차단 오류

### 2.2 Element Choices 페이지

**Happy Path:**
- 페이지 접근 시 선택지 목록 표시
- Element Type 드롭다운으로 "paper" 필터 적용 -> 용지 관련 선택지만 표시
- 신규 선택지 생성 (typeId 선택 -> choiceKey, displayName 입력)
- MES 코드 편집 -> 저장

**Error Path:**
- 이미 존재하는 (typeId, choiceKey) 조합으로 생성 시도 -> unique 위반 오류
- 비활성화 시 연관 바인딩 경고 표시 확인

**스크린샷:**
- `element-choices-filtered.png` — 타입별 필터 적용 상태
- `element-choices-create.png` — 생성 모달

### 2.3 Recipe Builder 페이지

**Happy Path:**
- 제품 선택 -> 해당 제품의 레시피 목록 표시
- "New Recipe" 버튼 -> 레시피명 입력 + 바인딩 요소 추가
- 바인딩 요소 드래그앤드롭으로 순서 변경 -> displayOrder 업데이트
- 선택지 제한 매트릭스에서 체크박스 토글 -> 제한 저장
- "Save Recipe" 버튼 -> 성공 토스트

**Error Path:**
- 기존 레시피 수정 시 "Archive 확인" 다이얼로그 표시 -> 확인 -> 새 버전 생성
- 바인딩 없이 저장 시도 -> 최소 1개 바인딩 필요 오류

**핵심 시나리오 (비즈니스 규칙):**
- 레시피 수정 -> 기존 버전 archived 확인 -> 새 버전 번호 확인
- Archived 레시피는 편집 버튼 비활성화 확인

**스크린샷:**
- `recipe-builder-full.png` — Recipe Builder 전체 UI
- `recipe-builder-bindings.png` — 바인딩 테이블 (드래그 핸들 포함)
- `recipe-builder-restrictions.png` — 선택지 제한 매트릭스
- `recipe-builder-archive-dialog.png` — Archive 확인 다이얼로그

### 2.4 Constraint Templates 페이지

**Happy Path:**
- 템플릿 목록 표시 (usage count 포함)
- 카테고리 필터 적용
- Custom 템플릿 생성 (ConstraintBuilder 재사용)
- 템플릿 상세 패널 확장 -> ECA 패턴 확인

**Error Path:**
- System 템플릿 편집 시도 -> 버튼 비활성화 확인
- System 템플릿 삭제 시도 -> 차단 확인
- 다른 제약에서 참조 중인 템플릿 삭제 시도 -> 오류

**스크린샷:**
- `constraint-templates-list.png` — 목록 (System/Custom 뱃지)
- `constraint-templates-detail.png` — ECA 상세 패널
- `constraint-templates-system-readonly.png` — System 읽기 전용 상태

### 2.5 Addon Groups 페이지

**Happy Path:**
- 그룹 목록 표시 (아이템 수 포함)
- 그룹 생성 (이름, 표시 모드 설정)
- 그룹 선택 -> 인라인 아이템 편집기에서 상품 추가
- 아이템 제거

**Error Path:**
- 동일 그룹에 같은 상품 중복 추가 시도 -> unique 위반 오류

**스크린샷:**
- `addon-groups-list.png` — 그룹 목록
- `addon-groups-items.png` — 인라인 아이템 편집기

### 2.6 Price Config 페이지

**Happy Path:**
- 제품 선택 -> 가격 모드 표시
- "기본 인쇄단가" 탭 -> SpreadsheetEditor에 매트릭스 표시
- 셀 값 수정 -> "Save" -> 배치 upsert 성공
- "후가공 단가" 탭 전환 -> 후가공 데이터 표시
- "수량 할인" 탭 -> 구간별 할인율 표시

**Error Path:**
- 유효하지 않은 가격 값 (음수, 문자열) 입력 -> 클라이언트 검증 오류
- productId=NULL 행은 "전역" 뱃지 표시

**스크린샷:**
- `price-config-print-cost.png` — 기본 인쇄단가 SpreadsheetEditor
- `price-config-postprocess.png` — 후가공 단가 탭
- `price-config-qty-discount.png` — 수량 할인 탭
- `price-config-global-badge.png` — 전역 가격 뱃지

### 2.7 Orders 페이지

**Happy Path:**
- 주문 목록 표시 (페이지네이션)
- 상태 필터 (paid, in_production 등) 적용
- MES 상태 필터 (failed) 적용 -> 실패 주문만 표시
- 주문 클릭 -> 상세 패널 (selections JSON, price_breakdown JSON)
- "Resend to MES" 클릭 -> 확인 다이얼로그 -> 재전송

**Error Path:**
- MES 재전송 실패 시 오류 메시지 표시
- 이미 confirmed 상태인 주문의 재전송 시도 -> 불필요 안내

**스크린샷:**
- `orders-list.png` — 주문 목록 (MES 상태 뱃지 포함)
- `orders-detail-panel.png` — 주문 상세 패널
- `orders-mes-resend.png` — MES 재전송 확인

### 2.8 네비게이션 테스트

**Happy Path:**
- 사이드바에 "Widget Builder" 그룹 표시 확인
- 각 7개 서브 메뉴 클릭 시 해당 페이지로 이동 확인
- 현재 활성 페이지의 메뉴 아이템 하이라이트 확인

**스크린샷:**
- `sidebar-widget-builder-group.png` — Widget Builder 네비게이션 그룹

---

## 3. 테스트 데이터 요구사항

### 3.1 시드 데이터

```typescript
// fixtures/seed-widget-builder.ts

export const seedData = {
  // Element Types (최소 5개)
  elementTypes: [
    { typeKey: 'paper', typeNameKo: '용지', uiControl: 'toggle-group', optionCategory: 'material' },
    { typeKey: 'size', typeNameKo: '사이즈', uiControl: 'select', optionCategory: 'spec' },
    { typeKey: 'quantity', typeNameKo: '수량', uiControl: 'number-stepper', optionCategory: 'quantity' },
    { typeKey: 'coating', typeNameKo: '코팅', uiControl: 'toggle-group', optionCategory: 'process' },
    { typeKey: 'printing', typeNameKo: '인쇄', uiControl: 'toggle-group', optionCategory: 'process' },
  ],

  // Element Choices (타입당 최소 3개)
  elementChoices: [
    { typeKey: 'paper', choiceKey: 'ART250', displayName: '아트250g', mesCode: 'MAT001' },
    { typeKey: 'paper', choiceKey: 'ART300', displayName: '아트300g', mesCode: 'MAT002' },
    { typeKey: 'paper', choiceKey: 'SNOW250', displayName: '스노우250g', mesCode: 'MAT003' },
    { typeKey: 'size', choiceKey: '90x50', displayName: '90x50mm' },
    { typeKey: 'size', choiceKey: '90x55', displayName: '90x55mm' },
    { typeKey: 'size', choiceKey: '100x148', displayName: '100x148mm' },
  ],

  // Products (최소 2개)
  products: [
    { productKey: 'namecard-basic', productNameKo: '일반명함', edicusCode: 'ED001' },
    { productKey: 'sticker-basic', productNameKo: '스티커', edicusCode: 'ED002' },
  ],

  // Recipes (제품당 최소 1개, 버전 테스트용 2개)
  recipes: [
    { productKey: 'namecard-basic', recipeName: '기본 레시피', version: 1, isDefault: true },
    { productKey: 'namecard-basic', recipeName: '기본 레시피', version: 2, isArchived: true },
  ],

  // Constraint Templates (System 2개 + Custom 1개)
  constraintTemplates: [
    { templateKey: 'paper-coating', templateNameKo: '용지→코팅 제한', isSystem: true },
    { templateKey: 'size-postprocess', templateNameKo: '사이즈→후가공 제한', isSystem: true },
    { templateKey: 'custom-test', templateNameKo: '테스트 커스텀 제약', isSystem: false },
  ],

  // Addon Groups (최소 1개 + items)
  addonGroups: [
    { groupName: '관련 상품', displayMode: 'list', items: ['sticker-basic'] },
  ],

  // Pricing data (최소 1 제품)
  printCosts: [
    { productKey: 'namecard-basic', plateType: '90x50', printMode: '단면칼라', qtyMin: 100, qtyMax: 200, unitPrice: 12000 },
    { productKey: 'namecard-basic', plateType: '90x50', printMode: '단면칼라', qtyMin: 201, qtyMax: 500, unitPrice: 15000 },
  ],

  // Orders (최소 3개, 상태 다양)
  orders: [
    { orderCode: 'TEST-001', productKey: 'namecard-basic', status: 'paid', mesStatus: 'sent' },
    { orderCode: 'TEST-002', productKey: 'sticker-basic', status: 'in_production', mesStatus: 'confirmed' },
    { orderCode: 'TEST-003', productKey: 'namecard-basic', status: 'created', mesStatus: 'failed' },
  ],
};
```

### 3.2 데이터 격리 전략

- 각 테스트 파일은 `beforeAll`에서 시드 데이터를 삽입하고, `afterAll`에서 정리
- 테스트 간 데이터 충돌 방지를 위해 unique key에 테스트 접두사 사용 (예: `test-paper-{random}`)
- 트랜잭션 롤백 또는 테스트 전용 스키마 사용 권장

---

## 4. 스크린샷 캡처 계획

### 4.1 캡처 위치

```
apps/admin/__tests__/e2e/screenshots/widget-builder/
├── element-types-list.png
├── element-types-create-modal.png
├── element-types-delete-blocked.png
├── element-choices-filtered.png
├── element-choices-create.png
├── recipe-builder-full.png
├── recipe-builder-bindings.png
├── recipe-builder-restrictions.png
├── recipe-builder-archive-dialog.png
├── constraint-templates-list.png
├── constraint-templates-detail.png
├── constraint-templates-system-readonly.png
├── addon-groups-list.png
├── addon-groups-items.png
├── price-config-print-cost.png
├── price-config-postprocess.png
├── price-config-qty-discount.png
├── price-config-global-badge.png
├── orders-list.png
├── orders-detail-panel.png
├── orders-mes-resend.png
└── sidebar-widget-builder-group.png
```

### 4.2 캡처 시점

각 스크린샷은 해당 테스트의 assertions 직후에 캡처한다:

```typescript
await expect(page.getByRole('table')).toBeVisible();
await page.screenshot({
  path: 'screenshots/widget-builder/element-types-list.png',
  fullPage: true,
});
```

### 4.3 총 스크린샷 수

- Element Types: 3장
- Element Choices: 2장
- Recipe Builder: 4장
- Constraint Templates: 3장
- Addon Groups: 2장
- Price Config: 4장
- Orders: 3장
- Navigation: 1장
- **합계: 22장**

---

## 5. 테스트 우선순위

| 우선순위 | 테스트 | 근거 |
|---------|--------|------|
| P0 (필수) | Recipe Builder 전체 플로우 | 가장 복잡한 비즈니스 로직 (archive, version, bindings) |
| P0 (필수) | Constraint Templates System 보호 | 데이터 무결성 핵심 규칙 |
| P0 (필수) | Orders MES 재전송 | 외부 시스템 연동 핵심 기능 |
| P1 (중요) | Element Types/Choices CRUD | 기반 데이터 관리 |
| P1 (중요) | Price Config 배치 저장 | 데이터 무결성 |
| P2 (보조) | Addon Groups 인라인 편집 | 상대적으로 단순한 CRUD |
| P2 (보조) | 네비게이션 테스트 | UI 통합 확인 |

---

**참고 문서:**
- 기술 아키텍처: `.moai/specs/SPEC-WIDGET-ADMIN-001/tech-architecture.md`
- SPEC: `.moai/specs/SPEC-WIDGET-ADMIN-001/spec.md`
- 기존 E2E 갭 분석: `.moai/specs/SPEC-WIDGET-ADMIN-001/e2e-gap-analysis.md`
