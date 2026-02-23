---
id: SPEC-WIDGET-CORE-001
version: 1.0.0
status: draft
created: 2026-02-22
updated: 2026-02-22
author: MoAI
priority: P0
---

# SPEC-WIDGET-CORE-001: 인수 조건 (Acceptance Criteria)

## AC-1: Pricing Engine -- Strategy Dispatch

```gherkin
Given calculatePrice() 함수에 유효한 PricingInput이 주어졌을 때
When pricingModel 값이 7가지 모델 중 하나이면
Then 해당 모델의 Strategy가 선택되어 정확한 PricingResult를 반환해야 한다
And PricingResult에는 totalPrice, totalPriceWithVat, unitPrice, breakdown, model, calculatedAt이 포함되어야 한다
```

**세부 검증 항목:**

- `pricingRegistry`에 7개 모델(formula, formula_cutting, fixed_unit, package, component, fixed_size, fixed_per_unit)이 등록된다
- 알 수 없는 pricingModel 입력 시 `PricingError('UNKNOWN_MODEL')`이 throw된다
- 각 Strategy 함수의 반환 타입이 PricingResult 인터페이스를 충족한다
- totalPriceWithVat === Math.floor(totalPrice * 1.1) 등식이 성립한다

---

## AC-2: Model 1 -- Formula (디지털인쇄 일반)

```gherkin
Given 디지털인쇄 엽서 100x150mm, 아트지 250g(sellingPer4Cut=240), 양면칼라(priceCode=8) 상품이 있을 때
When 수량 100부로 견적을 계산하면
Then 출력비 + 별색비(0) + 지대(3,300) + 코팅비(0) + 가공비(0) + 후가공비(0)로 총가가 산출되어야 한다
And 필요판수 = ceil(100/8) = 13이어야 한다
And 로스량 = max(ceil(100*0.03), 10) = 10이어야 한다
And 지대 = ceil((240/8) * (100+10)) = 3,300이어야 한다
```

**세부 검증 항목:**

- 필요판수 계산: `Math.ceil(quantity / impositionCount)` 정확
- 로스량 계산: `Math.max(Math.ceil(quantity * lossRate), minLossQty)` 정확
- 출력비 계산: `lookupTier(priceTiers, priceCode, requiredSheets, sheetStandard) * requiredSheets` 정확
- 지대 계산: `Math.ceil((sellingPer4Cut / impositionCount) * (quantity + lossQty))` 정확
- 별색비: 별색 유형별 tier lookup 후 requiredSheets 곱셈
- 코팅비: per_sheet 기준 tier lookup
- 후가공비: priceBasis에 따라 per_sheet 또는 per_unit 기준 분기 정확
- 모든 중간 계산이 정수 연산으로 수행된다

---

## AC-3: Model 2 -- Formula + Cutting (스티커)

```gherkin
Given 반칼 스티커 50x50mm 상품이 있을 때
When 수량 200부로 견적을 계산하면
Then Model 1(formula) 기본 계산 결과에 커팅가공비가 추가되어야 한다
And 커팅가공비 = lookupCuttingPrice(cuttingType, size, quantity)이어야 한다
```

**세부 검증 항목:**

- Model 1 기본 계산이 정확히 수행된 후 커팅비가 별도 합산된다
- cuttingType이 'half_cut', 'full_cut', 'kiss_cut' 3종을 지원한다
- 사이즈와 수량에 따른 커팅가격 조회가 정확하다

---

## AC-4: Model 3 -- Fixed Unit (명함/포토카드)

```gherkin
Given 프리미엄명함 92x57mm, 아트지250g 양면칼라 상품이 있을 때
  And fixedPrice.sellingPrice = 15,000 (100부 기준), fixedPrice.baseQty = 100
When 수량 200부로 견적을 계산하면
Then totalPrice = ceil(15,000 * (200 / 100)) = 30,000이어야 한다
```

**세부 검증 항목:**

- fixedPrices에서 productId + sizeId + paperId + printModeId 조합으로 조회한다
- baseQty 기반 비례 계산이 정확하다: `sellingPrice * (quantity / baseQty)`
- 조회 실패 시 `PricingError('FIXED_PRICE_NOT_FOUND')`가 throw된다

---

## AC-5: Model 4 -- Package (엽서북)

```gherkin
Given 엽서북 100x150mm, 양면칼라, 24P 상품이 있을 때
When 수량 50부로 견적을 계산하면
Then packagePrices 테이블에서 (productId, sizeId, printModeId, pageCount=24, quantity=50) 조합의 가격이 반환되어야 한다
And 해당 수량이 속한 tier의 가격이 적용되어야 한다
```

**세부 검증 항목:**

- 사이즈 x 인쇄방식 x 페이지수 x 수량 4차원 lookup이 정확하다
- 수량 tier 경계값에서 올바른 가격이 선택된다
- 조회 실패 시 `PricingError('PACKAGE_PRICE_NOT_FOUND')`가 throw된다

---

## AC-6: Model 5 -- Component (책자)

```gherkin
Given 무선책자 A5, 100P 상품이 있을 때
When 수량 50부, 내지 미색모조지80g 양면칼라, 표지 아트지250g 양면칼라 + 무광코팅으로 견적을 계산하면
Then 내지가격(용지+출력) + 표지가격(용지+출력+코팅) + 제본비 + 박/형압비(선택) + 포장비(선택) 합산이 totalPrice이어야 한다
And breakdown에 각 구성품 비용이 항목별로 표시되어야 한다
```

**세부 검증 항목:**

- 내지 용지비: `sellingPer4Cut / impositionCount * (qty + loss) * (pageCount / 2)` 정확
- 내지 출력비: `lookupTier(printCode, innerSheets) * innerSheets` 정확
- 표지 용지비: `sellingPer4Cut / impositionCount * (qty + loss)` 정확
- 표지 출력비: `lookupTier(coverPrintCode, coverSheets) * coverSheets` 정확
- 표지 코팅비: `lookupTier(coatingCode, coverSheets) * coverSheets` 정확
- 제본비: `lookupTier(bindingCode, qty) * qty` 정확
- 박/형압비: optional, foilPrices 테이블에서 조회
- 포장비: optional, `unitPrice * quantity`
- PriceBreakdown에 8개 항목이 모두 개별 표기된다

---

## AC-7: Model 6 -- Fixed Size (실사/포스터)

```gherkin
Given 아트프린트포스터 A3 상품이 있을 때
  And sizePrice = 5,000 (A3 기준)
When 수량 10부, 추가옵션 없이 견적을 계산하면
Then totalPrice = (5,000 + 0) * 10 = 50,000이어야 한다
```

**세부 검증 항목:**

- 사이즈별 고정가 + 코팅옵션가 + 가공옵션가 합산 구조
- 추가 옵션이 없으면 사이즈별 고정가만 적용된다
- 수량 곱셈이 합산 후 적용된다: `(sizePrice + optionPrice) * quantity`

---

## AC-8: Model 7 -- Fixed Per Unit (아크릴/굿즈)

```gherkin
Given 아크릴키링 50x50mm 상품이 있을 때
  And sizePrice = 3,260, UV printing = 500, 30~99 tier 할인율 = 0.90
When 수량 30개로 견적을 계산하면
Then totalPrice = ceil((3,260 + 500 + 0) * 30 * 0.90) = 101,520이어야 한다
```

**세부 검증 항목:**

- `baseUnitPrice = sizePrice + processingPrice + additionalProductPrice` 합산 정확
- 수량할인율 lookup: quantity가 속한 tier의 discountRate 적용
- 최종 가격: `Math.ceil(baseUnitPrice * quantity * discountRate)` 정확
- 수량 구간 경계값(29->30, 99->100)에서 할인율 전환이 정확하다

---

## AC-9: Tier Lookup 정확성

```gherkin
Given price_tiers에 수량구간별 단가가 등록되어 있을 때
When lookupTier(tiers, optionCode, quantity, sheetStandard)를 호출하면
Then minQty <= quantity <= maxQty 범위에 매칭되는 첫 번째 tier의 unitPrice를 반환해야 한다
And 매칭 tier가 없으면 PricingError('TIER_NOT_FOUND')를 throw해야 한다
```

**세부 검증 항목:**

- optionCode + sheetStandard 필터링이 정확하다
- sheetStandard가 null이면 sheetStandard 필터를 무시한다
- 수량 경계값(minQty, maxQty)에서 올바른 tier가 선택된다
- 수량 1, 최대수량, 구간 전환점에서의 동작이 정확하다

---

## AC-10: Option Engine -- Priority Chain Resolution

```gherkin
Given 상품에 jobPreset, size, paper, option, color, additionalColor 옵션이 구성되어 있을 때
When resolveOptions(ctx)를 호출하면
Then 우선순위 체인 순서대로 옵션이 평가되어야 한다
And 각 옵션의 availableChoices가 dependency + constraint 기준으로 필터링되어야 한다
And 필수 옵션(isRequired=true)이 미선택 시 validationErrors에 포함되어야 한다
```

**세부 검증 항목:**

- 6-phase 우선순위 체인 순서: jobPreset -> size -> paper -> option -> color -> additionalColor
- 각 phase의 옵션이 해당 phase에서만 평가된다
- dependency에 의해 visible=false인 옵션은 disabledOptions에 포함된다
- constraint에 의해 필터링된 choices만 availableOptions에 포함된다
- 현재 selection이 있으면 유지, 없으면 defaultChoice 적용

---

## AC-11: Option Engine -- Dependency Evaluation

```gherkin
Given 부모-자식 의존성이 정의되어 있을 때
When 부모 옵션이 선택되면
Then 자식 옵션의 visibility가 재평가되어야 한다
And dependencyType에 따라 visibility/choices/value 3종 동작이 정확해야 한다
```

**세부 검증 항목:**

- **visibility**: 부모 미선택 시 자식 hidden, 부모 선택 시 자식 visible
- **choices**: 부모 선택에 따라 자식의 available choices가 필터링된다
- **value**: 부모 값이 자식 범위에 연동된다 (size -> quantity range)
- parentChoiceId가 지정된 경우, 해당 choice가 선택되었을 때만 자식 visible

---

## AC-12: Option Engine -- State Machine

```gherkin
Given Option Engine이 특정 상태에 있을 때
When 유효한 transition이 발생하면
Then 상태가 올바르게 전환되어야 한다
And 무효한 transition이 시도되면 OptionError('INVALID_TRANSITION')가 throw되어야 한다
```

**세부 검증 항목:**

- 8개 상태: idle, loading, ready, selecting, validating, constrained, error, complete
- 유효 transition 검증:
  - idle -> loading (LOAD_PRODUCT)
  - loading -> ready (PRODUCT_LOADED) / error (ERROR)
  - ready -> selecting (SELECT_OPTION)
  - selecting -> validating (VALIDATE) / selecting (SELECT_OPTION) / error (ERROR)
  - validating -> constrained / complete / selecting / error
  - constrained -> selecting / error
  - error -> idle (RESET) / loading / ready
  - complete -> selecting (SELECT_OPTION) / idle (RESET)
- 무효 transition (예: idle -> validating)은 즉시 에러

---

## AC-13: Option Engine -- Cascade Reset

```gherkin
Given 사용자가 사이즈(size)를 선택한 후 용지(paper), 옵션(option)을 선택한 상태에서
When 사이즈를 변경하면
Then 용지, 옵션, 색상, 추가색상 선택이 모두 초기화되어야 한다
And 초기화된 옵션들의 availableChoices가 새 사이즈 기준으로 재계산되어야 한다
```

**세부 검증 항목:**

- priority chain 상위 옵션 변경 시, 해당 옵션 이후 모든 하위 옵션이 deselect된다
- 하위 옵션의 choices가 새로운 상위 선택 기준으로 재필터링된다
- 초기화 후 defaultChoice가 있으면 자동 적용된다
- cascade가 chain의 깊이(최대 6)를 올바르게 처리한다

---

## AC-14: Constraint Evaluator -- LCE Algorithm

```gherkin
Given 상품에 329개 제약조건(129 star + ~200 implicit)이 적용되어 있을 때
When evaluateConstraints(input)를 호출하면
Then 4-Phase LCE 알고리즘으로 모든 제약조건이 평가되어야 한다
And 결과에 availableOptions, disabledOptions, violations가 정확히 포함되어야 한다
And 평가 시간이 50ms 이내이어야 한다
```

**세부 검증 항목:**

- Phase 1: 해당 상품의 활성(isActive=true) 제약조건만 필터링된다
- Phase 2: priority 오름차순으로 정렬 후, 각 제약조건을 순차 평가한다
- Phase 3: size/paper/quantity/cutting 특수 제약 후처리가 정확하다
- Phase 4: 최종 결과에 모든 평가 정보가 통합된다
- evaluationTimeMs에 실제 소요 시간이 기록된다

---

## AC-15: Constraint Type A -- Size Show

```gherkin
Given constraint_type='size_show' 제약이 "엽서봉투 사이즈 100x150 시 봉투옵션 표시"로 정의되어 있을 때
When 사용자가 사이즈 100x150을 선택하면
Then 봉투 옵션이 표시(show)되어야 한다
And 다른 사이즈 선택 시 봉투 옵션이 숨겨져야 한다
```

**세부 검증 항목:**

- source_field='size', operator='eq', value='100x150', target_action='show' 동작 정확
- 사이즈 미선택 시 target 옵션은 기본 hidden
- eq/neq 연산자 모두 지원한다

---

## AC-16: Constraint Type B -- Size Range

```gherkin
Given constraint_type='size_range' 제약이 "박 사이즈 최소 30x30 / 최대 125x125"로 정의되어 있을 때
When 사용자가 박/형압 사이즈를 입력하면
Then 30x30 ~ 125x125 범위 내의 값만 허용되어야 한다
And 범위 밖 값은 limit_range 액션으로 제한되어야 한다
```

**세부 검증 항목:**

- operator='between', valueMin='30x30', valueMax='125x125' 파싱 정확
- parseSize() 함수가 "WxH" 형식을 [width, height]로 정확히 변환한다
- 범위 경계값(30x30, 125x125)이 포함 범위인지 확인

---

## AC-17: Constraint Type C -- Paper Condition

```gherkin
Given constraint_type='paper_condition' 제약이 "180g 이상 용지 선택 시 코팅 가능"으로 정의되어 있을 때
When 사용자가 250g 아트지를 선택하면
Then 코팅 옵션이 활성화(enable)되어야 한다
And 120g 미색모조지 선택 시 코팅 옵션이 비활성화(disable)되어야 한다
```

**세부 검증 항목:**

- source_field='paper_weight', operator='gte', value='180', target_action='enable' 동작 정확
- gte/lte/eq 3종 연산자 모두 지원한다
- 용지 미선택 시 target 옵션은 기본 disable
- refPaperId를 통해 paper 테이블에서 weight를 정확히 조회한다

---

## AC-18: Constraint -- Dual-Layer Merge

```gherkin
Given 129개 star constraints와 ~200개 implicit constraints가 있을 때
When mergeConstraintLayers()를 호출하면
Then star constraints가 implicit constraints를 override해야 한다
And 동일 key의 제약이 충돌하면 star가 우선한다
```

**세부 검증 항목:**

- implicit constraints가 먼저 적용된 후 star constraints가 override한다
- key 생성: `${sourceField}:${targetField}:${productId}` 형식
- merge 후 총 제약 수가 중복 제거된 합집합이다
- star source와 implicit source가 결과에 정확히 표기된다

---

## AC-19: Constraint -- Performance Gate

```gherkin
Given 329개 제약조건이 있을 때
When evaluateConstraints() 실행 시간이 50ms를 초과하면
Then 캐싱된 이전 결과가 반환되어야 한다
And evaluationTimeMs에 실제 소요 시간이 경고와 함께 기록되어야 한다
```

**세부 검증 항목:**

- 50ms 이내 완료 시: 새 결과 반환 + 캐시 업데이트
- 50ms 초과 시: 캐시에 이전 결과가 있으면 캐시 반환
- 캐시 키는 productId + currentSelections 기반으로 생성된다
- 첫 호출 시(캐시 없을 때) 50ms 초과해도 새 결과 반환

---

## AC-20: Quote Calculator -- Assembly

```gherkin
Given PricingResult와 선택된 옵션 정보가 있을 때
When assembleQuote(input)를 호출하면
Then QuoteResult에 quoteId, lineItems, subtotal, vatAmount, totalPrice, unitPrice가 정확히 포함되어야 한다
And vatAmount = Math.floor(subtotal * 0.1)이어야 한다
And unitPrice = Math.floor(subtotal / quantity)이어야 한다
```

**세부 검증 항목:**

- quoteId: UUID v4 형식 (8-4-4-4-12)
- lineItems: PriceBreakdown의 각 항목이 QuoteLineItem으로 변환된다
- subtotal: PricingResult.totalPrice와 동일
- vatAmount: 10% VAT, Math.floor 적용
- totalPrice: subtotal + vatAmount
- sizeDisplay: "100 x 150 mm" 형식
- optionSummary: 선택 옵션을 콤마로 연결한 문자열
- expiresAt: createdAt + 30분 (1,800,000ms)

---

## AC-21: Quote -- Snapshot Hash

```gherkin
Given 동일한 QuoteInput이 두 번 주어졌을 때
When computeSnapshotHash()를 각각 호출하면
Then 동일한 SHA-256 해시값이 반환되어야 한다
And 입력이 1비트라도 다르면 다른 해시값이 반환되어야 한다
```

**세부 검증 항목:**

- SHA-256 출력: 64자 hex 문자열
- 결정적(deterministic): 동일 입력 -> 동일 해시 (시간 관계없이)
- 직렬화 순서: productId, quantity, sizeSelection, selectedOptions, pricingResult 고정 순서
- Browser(SubtleCrypto)와 Node.js(node:crypto) 동일 결과

---

## AC-22: Quote -- Expiry

```gherkin
Given 견적이 생성된 후
When 30분이 경과하지 않았으면
Then isQuoteValid() = true이어야 한다
And 30분이 경과하면 isQuoteValid() = false이어야 한다
```

**세부 검증 항목:**

- `Date.now() < quote.expiresAt` 판단이 정확하다
- 경계값: 정확히 30분(1,800,000ms)에서의 동작 확인
- expiresAt === createdAt + 30 * 60 * 1000 등식 성립

---

## AC-23: Cross-Cutting -- Error Handling

```gherkin
Given core engine의 어떤 함수에서든 도메인 에러가 발생했을 때
When 에러가 throw되면
Then CoreError를 상속한 domain-specific 에러(PricingError, ConstraintError, OptionError)이어야 한다
And 에러에 code, context, message가 포함되어야 한다
```

**세부 검증 항목:**

- PricingError: 7종 에러 코드 (UNKNOWN_MODEL, TIER_NOT_FOUND, IMPOSITION_NOT_FOUND, FIXED_PRICE_NOT_FOUND, PACKAGE_PRICE_NOT_FOUND, INVALID_QUANTITY, INVALID_SIZE)
- ConstraintError: 3종 에러 코드 (INVALID_OPERATOR, CIRCULAR_DEPENDENCY, EVALUATION_TIMEOUT)
- OptionError: 4종 에러 코드 (INVALID_TRANSITION, OPTION_NOT_FOUND, CHOICE_NOT_AVAILABLE, REQUIRED_OPTION_MISSING)
- 모든 에러가 `instanceof CoreError`로 catch 가능하다
- context에 디버깅에 필요한 상세 정보가 포함된다

---

## AC-24: Cross-Cutting -- Input Validation

```gherkin
Given 무효한 입력이 public API 함수에 전달되었을 때
When validatePricingInput()이 실행되면
Then 수량 범위(1~999,999), pricingModel 유효성 등이 검증되어야 한다
And 무효한 입력에 대해 명확한 에러 코드와 컨텍스트가 포함된 에러가 throw되어야 한다
```

**세부 검증 항목:**

- quantity < 1 또는 > 999,999: `PricingError('INVALID_QUANTITY')`
- 알 수 없는 pricingModel: `PricingError('UNKNOWN_MODEL')`
- 필수 필드 누락 시 명확한 에러 메시지
- 경계값: quantity=0, quantity=1, quantity=999999, quantity=1000000

---

## AC-25: Cross-Cutting -- Immutability & Zero Side Effects

```gherkin
Given core engine의 어떤 함수든 호출될 때
When 함수가 실행 완료된 후
Then 입력 객체가 변경되지 않아야 한다 (immutable)
And DOM, localStorage, network, console 등 외부 상태에 접근하지 않아야 한다
```

**세부 검증 항목:**

- 모든 public 함수의 입력을 deep freeze 후 호출해도 에러가 발생하지 않는다
- 반환 값은 새로운 객체이다 (input !== output 참조 비교)
- `sideEffects: false` package.json 설정
- ESLint/TypeScript로 global 접근 제한 검증
- 유일한 예외: SHA-256 해시를 위한 crypto API (isomorphic 래퍼)

---

## AC-26: Cross-Cutting -- Circular Dependency Detection

```gherkin
Given 옵션 의존성 그래프가 주어졌을 때
When detectCycles()를 호출하면
Then 순환 참조가 있으면 순환에 참여하는 노드 ID 배열을 반환해야 한다
And 순환 참조가 없으면 null을 반환해야 한다
```

**세부 검증 항목:**

- Kahn's Algorithm 기반 위상 정렬로 순환 감지
- 순환이 없는 DAG: null 반환
- 직접 순환 (A->B->A): 순환 노드 반환
- 간접 순환 (A->B->C->A): 순환 노드 반환
- 자기 순환 (A->A): 순환 노드 반환
- 복수 순환 그룹 감지

---

## AC-27: Bundle Size & Performance

```gherkin
Given packages/core/ 전체를 빌드했을 때
When tsup으로 ESM 번들을 생성하면
Then gzipped 사이즈가 15KB 미만이어야 한다
And tree-shaking으로 미사용 모듈이 제거되어야 한다
```

```gherkin
Given 329개 제약조건과 10,000건 price_tiers가 로드된 상태에서
When 전체 파이프라인(옵션해석 -> 제약평가 -> 가격계산 -> 견적생성)을 실행하면
Then 제약 평가 < 50ms이어야 한다
And 가격 계산 < 100ms이어야 한다
And 옵션 해석 < 30ms이어야 한다
And 견적 생성 < 10ms이어야 한다
```

**세부 검증 항목:**

- `tsup` 빌드 후 gzip 사이즈 측정 스크립트로 검증
- 사용하지 않는 model import 시 해당 코드가 번들에서 제외됨 (tree-shaking)
- Vitest benchmark로 각 함수의 실행 시간 측정
- warm cache 상태에서 메모리 footprint < 2MB

---

## 품질 게이트 (Quality Gates)

### Definition of Done

- [x] 30개 요구사항(REQ-PRICE-001~012, REQ-OPT-001~004, REQ-CONST-001~006, REQ-QUOTE-001~003, REQ-CROSS-001~005) 모두 구현 완료
- [x] 7개 가격 모델 golden test 모두 통과 (오차 +-1원 이내)
- [x] 329개 제약조건 평가 50ms 이내
- [x] 옵션 엔진 8-state 상태 머신 모든 transition 테스트 통과
- [x] Priority chain cascade reset 정상 동작
- [x] Circular dependency detection 정상 동작
- [x] Quote snapshot hash 결정적(deterministic) 검증
- [x] Bundle size < 15KB gzipped
- [x] 테스트 커버리지 95%+ (line, branch, function)
- [x] TypeScript strict mode 컴파일 에러 0
- [x] ESLint/Prettier 에러 0
- [x] Browser + Node.js isomorphic 동작 확인
- [x] Zero runtime dependencies (package.json dependencies 비어있음)
- [x] sideEffects: false 검증 (tree-shaking 정상)

### 검증 도구

| 도구 | 용도 |
|------|------|
| Vitest | 단위 테스트, golden test, integration test |
| @vitest/coverage-v8 | 코드 커버리지 95%+ 검증 |
| tsup | ESM 빌드, bundle size 측정 |
| tsc --noEmit | TypeScript strict mode 타입 검증 |
| gzip-size-cli | gzipped bundle size 측정 |
| Vitest bench | Performance benchmark (50ms/100ms 임계값) |

---

Version: 1.0.0
Last Updated: 2026-02-22
Acceptance Criteria Count: 27 (AC-1 ~ AC-27)
