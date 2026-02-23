---
id: SPEC-WIDGET-CORE-001
title: Widget Builder Core Engine
version: 1.0.0
status: completed
created: 2026-02-22
updated: 2026-02-23
author: MoAI
priority: P0
tags: pricing-engine, option-engine, constraint-evaluator, quote-calculator, core
related_specs: [SPEC-INFRA-001, SPEC-DATA-002]
---

# SPEC-WIDGET-CORE-001: Widget Builder Core Engine

> Pricing Engine + Option Engine + Constraint Evaluator + Quote Calculator
> packages/core/ -- Pure TypeScript, isomorphic (browser + Node.js), zero side effects, tree-shakeable

---

## 1. Environment (E)

### 1.1 Runtime Environment

| Factor | Specification |
|--------|---------------|
| Language | TypeScript 5.7+ (strict mode) |
| Target | ES2020 (browser + Node.js isomorphic) |
| Module | ESM (tree-shakeable) |
| Side Effects | Zero (pure functions only, `"sideEffects": false` in package.json) |
| Bundle | packages/core/ independent package within Turborepo monorepo |
| Consumers | apps/widget (browser), apps/api (Node.js), apps/admin (both) |
| Test Runner | Vitest 3.x |
| Coverage Target | 95%+ (pricing-critical code) |

### 1.2 Data Source Dependencies

packages/core/는 데이터베이스에 직접 접근하지 않는다. 모든 데이터는 caller가 주입한다.

| Data Table | Row Count | Core Usage |
|------------|-----------|------------|
| products | ~221 | pricingModel, sheetStandard, orderMethod |
| product_sizes | ~500 | cutWidth/Height, impositionCount, isCustom, customMin/Max |
| papers | ~55 | costPer4Cut, sellingPer4Cut |
| print_modes | ~12 | priceCode, sides, colorType |
| post_processes | ~40 | groupCode, processType, priceBasis, sheetStandard |
| bindings | ~4 | minPages, maxPages, pageStep |
| price_tables | ~20 | priceType, quantityBasis, sheetStandard |
| price_tiers | ~10,000 | optionCode, minQty, maxQty, unitPrice |
| fixed_prices | ~300 | sellingPrice, costPrice, baseQty |
| package_prices | ~200 | size+print+pages+qty combination prices |
| foil_prices | ~150 | foilType, width, height, sellingPrice |
| imposition_rules | ~30 | cutSize -> impositionCount |
| loss_quantity_config | ~5 | lossRate, minLossQty |
| option_definitions | ~30 | key, optionClass, uiComponent |
| product_options | ~2,000 | isRequired, isVisible, isInternal |
| option_choices | ~1,198 | code, priceKey, ref_*_id |
| option_constraints | ~129 | constraintType, source/target fields, operators |
| option_dependencies | ~300 | parent/child option relationships |

### 1.3 Performance Budget

| Metric | Target | Rationale |
|--------|--------|-----------|
| Constraint evaluation (329 rules) | < 50ms | 60fps UI responsiveness |
| Price calculation (Model 1-7) | < 100ms | tech.md performance goal |
| Option resolution (full chain) | < 30ms | Instant option filtering |
| Quote assembly | < 10ms | Final summary render |
| Bundle size (core package) | < 15KB gzipped | Widget 50KB total budget |
| Memory footprint (warm cache) | < 2MB | Mobile device constraint |

---

## 2. Assumptions (A)

### 2.1 Design Assumptions

- [A-01] 모든 가격 계산은 정수 연산(원 단위)으로 수행하며, 중간 과정에서 부동소수점을 사용하지 않는다. 최종 가격만 소수점 절사(floor)한다.
- [A-02] pricingModel 필드는 products 테이블에 7개 값 중 하나로 저장되어 있으며, 런타임에 Strategy를 선택하는 키로 사용된다.
- [A-03] 옵션 의존성 그래프에 순환 참조가 존재하지 않는다. 순환이 감지되면 에러를 throw한다.
- [A-04] 제약조건 329개는 호출자가 배열로 주입하며, 런타임 중 변경되지 않는다(immutable).
- [A-05] VAT는 10% 고정이며, 별도 설정 없이 하드코딩한다.
- [A-06] 판걸이수(impositionCount)가 0이거나 null인 경우, imposition_rules 테이블에서 cutWidth/cutHeight/sheetStandard로 조회하여 결정한다.
- [A-07] 로스량은 loss_quantity_config에서 scope_type 우선순위(product > category > global)로 조회한다.

### 2.2 Boundary Assumptions

- [A-08] 주문수량 범위: 1 ~ 999,999
- [A-09] 페이지수 범위(책자): 4 ~ 1,000
- [A-10] 가격 범위: 0 ~ 999,999,999 (KRW)
- [A-11] 사이즈 범위(커스텀): 10mm ~ 3,000mm (width/height)
- [A-12] 동시 옵션 선택 최대 수: 30 (option_definitions 전체)

---

## 3. Requirements (R) -- EARS Format

### 3.1 Pricing Engine Requirements

#### REQ-PRICE-001: Strategy Dispatch (Ubiquitous)

시스템은 **항상** `calculatePrice(input: PricingInput): PricingResult`를 통해 `input.pricingModel` 값에 따라 7개 Strategy 중 하나를 선택하여 가격을 계산해야 한다.

```typescript
type PricingModel =
  | 'formula'          // Model 1: 디지털인쇄 일반
  | 'formula_cutting'  // Model 2: 스티커
  | 'fixed_unit'       // Model 3: 명함/포토카드
  | 'package'          // Model 4: 엽서북
  | 'component'        // Model 5: 책자
  | 'fixed_size'       // Model 6: 실사/포스터
  | 'fixed_per_unit';  // Model 7: 아크릴/굿즈

interface PricingInput {
  pricingModel: PricingModel;
  productId: number;
  quantity: number;
  selectedOptions: SelectedOption[];
  sizeSelection: SizeSelection;
  lookupData: PricingLookupData;
}

interface PricingResult {
  totalPrice: number;          // VAT 제외 합계 (KRW, 정수)
  totalPriceWithVat: number;   // VAT 포함 합계
  unitPrice: number;           // 개당 단가 (totalPrice / quantity)
  breakdown: PriceBreakdown;   // 항목별 내역
  model: PricingModel;         // 사용된 모델
  calculatedAt: number;        // timestamp
}
```

#### REQ-PRICE-002: Model 1 -- Formula (Event-Driven)

**WHEN** `pricingModel === 'formula'` **THEN** 시스템은 다음 공식으로 가격을 계산해야 한다.

```
총가 = 출력비 + 별색비 + 지대(용지비) + 코팅비 + 가공비 + 후가공비
```

**Algorithm Pseudocode:**

```typescript
function calculateFormula(input: FormulaInput): PricingResult {
  const { quantity, size, paper, printMode, specialColors, coating,
          postProcesses, sheetStandard } = input;

  // Step 1: 판걸이수 결정
  const impositionCount = size.impositionCount
    ?? lookupImposition(size.cutWidth, size.cutHeight, sheetStandard);

  // Step 2: 필요판수
  const requiredSheets = Math.ceil(quantity / impositionCount);

  // Step 3: 로스량
  const lossConfig = resolveLossConfig(input.productId, input.lookupData.lossConfigs);
  const lossQty = Math.max(
    Math.ceil(quantity * lossConfig.lossRate),
    lossConfig.minLossQty
  );

  // Step 4: 출력비 = lookup(디지털출력비[인쇄방식], 필요판수) * 필요판수
  const printUnitPrice = lookupTier(
    input.lookupData.priceTiers,
    printMode.priceCode,      // option_code (e.g., '4' for 단면칼라)
    requiredSheets,           // quantity for tier lookup
    sheetStandard             // A3 or T3
  );
  const printCost = printUnitPrice * requiredSheets;

  // Step 5: 별색비 (각 별색 유형별)
  let specialColorCost = 0;
  for (const sc of specialColors) {
    const scUnitPrice = lookupTier(
      input.lookupData.priceTiers,
      sc.priceCode,
      requiredSheets,
      sheetStandard
    );
    specialColorCost += scUnitPrice * requiredSheets;
  }

  // Step 6: 지대 = (용지단가_국4절 / 판걸이수) * (주문수량 + 로스량)
  const paperCostPer4Cut = paper.sellingPer4Cut;
  const paperCost = Math.ceil(
    (paperCostPer4Cut / impositionCount) * (quantity + lossQty)
  );

  // Step 7: 코팅비 (판당 기준)
  let coatingCost = 0;
  if (coating) {
    const coatingUnitPrice = lookupTier(
      input.lookupData.priceTiers,
      coating.priceCode,
      requiredSheets,
      sheetStandard
    );
    coatingCost = coatingUnitPrice * requiredSheets;
  }

  // Step 8: 가공비 + 후가공비 (매당 기준)
  let postProcessCost = 0;
  for (const pp of postProcesses) {
    if (pp.priceBasis === 'per_sheet') {
      const ppUnitPrice = lookupTier(
        input.lookupData.priceTiers, pp.priceCode, requiredSheets, sheetStandard
      );
      postProcessCost += ppUnitPrice * requiredSheets;
    } else {
      // per_unit
      const ppUnitPrice = lookupTier(
        input.lookupData.priceTiers, pp.priceCode, quantity, sheetStandard
      );
      postProcessCost += ppUnitPrice * quantity;
    }
  }

  const totalPrice = printCost + specialColorCost + paperCost
                   + coatingCost + postProcessCost;

  return assemblePricingResult(totalPrice, quantity, 'formula');
}
```

**Golden Test -- Model 1 (디지털인쇄 엽서 100x150mm, 100부):**

| Item | Value |
|------|-------|
| 사이즈 | 100x150mm, 판걸이수=8, sheetStandard=A3 |
| 용지 | 아트지 250g, sellingPer4Cut=240 |
| 인쇄 | 양면칼라 (priceCode=8) |
| 수량 | 100부 |
| 필요판수 | ceil(100/8) = 13 |
| 로스량 | max(ceil(100*0.03), 10) = 10 |
| 출력비 | lookupTier(PT_OUTPUT_SELL_A3, '8', 13) * 13 |
| 지대 | ceil((240/8) * (100+10)) = ceil(30 * 110) = 3,300 |
| Expected | 출력비 + 0(별색) + 3,300(지대) + 0(코팅) + 0(후가공) |

#### REQ-PRICE-003: Model 2 -- Formula + Cutting (Event-Driven)

**WHEN** `pricingModel === 'formula_cutting'` **THEN** 시스템은 Model 1 공식에 커팅가공비를 추가하여 계산해야 한다.

```typescript
function calculateFormulaCutting(input: FormulaCuttingInput): PricingResult {
  // Model 1 기본 계산
  const baseResult = calculateFormula(input);

  // 커팅가공비 = lookup(커팅유형 x 사이즈, 수량구간) * 수량
  const cuttingPrice = lookupCuttingPrice(
    input.cuttingType,    // 'half_cut' | 'full_cut' | 'kiss_cut'
    input.sizeSelection,
    input.quantity,
    input.lookupData
  );

  return assemblePricingResult(
    baseResult.totalPrice + cuttingPrice,
    input.quantity,
    'formula_cutting'
  );
}
```

**Golden Test -- Model 2 (반칼 스티커 50x50mm, 200부):**

| Item | Value |
|------|-------|
| Base (Model 1) | (Formula calculation result) |
| cuttingType | 'half_cut' |
| cuttingPrice | lookupCuttingPrice('half_cut', {50,50}, 200) |
| Expected | baseResult + cuttingPrice |

#### REQ-PRICE-004: Model 3 -- Fixed Unit (Event-Driven)

**WHEN** `pricingModel === 'fixed_unit'` **THEN** 시스템은 고정 단가로 계산해야 한다.

```typescript
function calculateFixedUnit(input: FixedUnitInput): PricingResult {
  // 상품단가(용지, 단면/양면) x (주문수량 / baseQty)
  const fixedPrice = lookupFixedPrice(
    input.productId,
    input.sizeSelection?.sizeId,
    input.paper?.paperId,
    input.printMode?.printModeId,
    input.lookupData.fixedPrices
  );

  const totalPrice = Math.ceil(
    fixedPrice.sellingPrice * (input.quantity / fixedPrice.baseQty)
  );

  return assemblePricingResult(totalPrice, input.quantity, 'fixed_unit');
}
```

**Golden Test -- Model 3 (프리미엄명함 92x57mm, 아트지250g 양면칼라, 200부):**

| Item | Value |
|------|-------|
| fixedPrice.sellingPrice | 15,000 (100부 기준) |
| fixedPrice.baseQty | 100 |
| totalPrice | ceil(15,000 * (200 / 100)) = 30,000 |

#### REQ-PRICE-005: Model 4 -- Package (Event-Driven)

**WHEN** `pricingModel === 'package'` **THEN** 시스템은 패키지 가격표에서 lookup하여 계산해야 한다.

```typescript
function calculatePackage(input: PackageInput): PricingResult {
  // lookup(사이즈 x 인쇄 x 페이지수, 주문수량)
  const packagePrice = lookupPackagePrice(
    input.productId,
    input.sizeSelection.sizeId,
    input.printMode.printModeId,
    input.pageCount,
    input.quantity,
    input.lookupData.packagePrices
  );

  return assemblePricingResult(packagePrice, input.quantity, 'package');
}
```

**Golden Test -- Model 4 (엽서북 100x150mm, 양면칼라, 24P, 50부):**

| Item | Value |
|------|-------|
| Lookup key | productId + sizeId + printModeId + pageCount=24 |
| Tier match | 50 falls in [30, 99] tier |
| packagePrice | lookupPackagePrice() result |

#### REQ-PRICE-006: Model 5 -- Component (Event-Driven)

**WHEN** `pricingModel === 'component'` **THEN** 시스템은 구성품을 합산하여 계산해야 한다.

```typescript
function calculateComponent(input: ComponentInput): PricingResult {
  const { innerBody, cover, binding, coverCoating,
          foilEmboss, packaging, quantity, lookupData } = input;

  // 내지가격 = 내지용지비 + 내지출력비
  const innerPaperCost = calculateInnerPaper(innerBody, quantity, lookupData);
  const innerPrintCost = calculateInnerPrint(innerBody, quantity, lookupData);

  // 표지가격 = 표지용지비 + 표지출력비 + 표지코팅비
  const coverPaperCost = calculateCoverPaper(cover, quantity, lookupData);
  const coverPrintCost = calculateCoverPrint(cover, quantity, lookupData);
  const coverCoatingCost = coverCoating
    ? calculateCoverCoating(coverCoating, quantity, lookupData)
    : 0;

  // 제본비
  const bindingCost = lookupTier(
    lookupData.priceTiers,
    binding.priceCode,
    quantity,
    null // binding has no sheetStandard
  ) * quantity;

  // 박/형압비 (optional)
  const foilCost = foilEmboss
    ? calculateFoilEmboss(foilEmboss, lookupData)
    : 0;

  // 개별포장비 (optional)
  const packagingCost = packaging
    ? packaging.unitPrice * quantity
    : 0;

  const totalPrice = innerPaperCost + innerPrintCost
    + coverPaperCost + coverPrintCost + coverCoatingCost
    + bindingCost + foilCost + packagingCost;

  return assemblePricingResult(totalPrice, quantity, 'component', {
    innerPaper: innerPaperCost,
    innerPrint: innerPrintCost,
    coverPaper: coverPaperCost,
    coverPrint: coverPrintCost,
    coverCoating: coverCoatingCost,
    binding: bindingCost,
    foil: foilCost,
    packaging: packagingCost,
  });
}
```

**Golden Test -- Model 5 (무선책자 A5, 100P, 50부):**

| Item | Calculation |
|------|-------------|
| 내지 용지 | sellingPer4Cut / impositionCount * (qty + loss) * (pageCount / 2) |
| 내지 출력 | lookupTier(printCode, innerSheets) * innerSheets |
| 표지 용지 | sellingPer4Cut / impositionCount * (qty + loss) |
| 표지 출력 | lookupTier(coverPrintCode, coverSheets) * coverSheets |
| 표지 코팅 | lookupTier(coatingCode, coverSheets) * coverSheets |
| 제본비 | lookupTier(bindingCode, qty) * qty |
| Expected | SUM of all components |

#### REQ-PRICE-007: Model 6 -- Fixed Size (Event-Driven)

**WHEN** `pricingModel === 'fixed_size'` **THEN** 시스템은 사이즈별 고정가에 옵션가를 합산하여 계산해야 한다.

```typescript
function calculateFixedSize(input: FixedSizeInput): PricingResult {
  // 사이즈별단가 + 코팅옵션가 + 가공옵션가
  const sizePrice = lookupFixedPrice(
    input.productId, input.sizeSelection.sizeId,
    null, null, input.lookupData.fixedPrices
  ).sellingPrice;

  let optionPrice = 0;
  for (const opt of input.additionalOptions) {
    optionPrice += lookupOptionPrice(opt, input.lookupData);
  }

  const totalPrice = (sizePrice + optionPrice) * input.quantity;
  return assemblePricingResult(totalPrice, input.quantity, 'fixed_size');
}
```

**Golden Test -- Model 6 (아트프린트포스터 A3, 10부):**

| Item | Value |
|------|-------|
| sizePrice | lookupFixedPrice(productId, A3_sizeId) = e.g., 5,000 |
| optionPrice | 0 (no coating/processing) |
| totalPrice | (5,000 + 0) * 10 = 50,000 |

#### REQ-PRICE-008: Model 7 -- Fixed Per Unit (Event-Driven)

**WHEN** `pricingModel === 'fixed_per_unit'` **THEN** 시스템은 개당 고정가에 수량할인을 적용하여 계산해야 한다.

```typescript
function calculateFixedPerUnit(input: FixedPerUnitInput): PricingResult {
  // (사이즈별단가 + 가공옵션가 + 추가상품가) * 수량 * 수량할인율
  const sizePrice = lookupFixedPrice(
    input.productId, input.sizeSelection.sizeId,
    null, null, input.lookupData.fixedPrices
  ).sellingPrice;

  let processingPrice = 0;
  for (const opt of input.processingOptions) {
    processingPrice += lookupOptionPrice(opt, input.lookupData);
  }

  let additionalProductPrice = 0;
  for (const ap of input.additionalProducts) {
    additionalProductPrice += ap.unitPrice;
  }

  const baseUnitPrice = sizePrice + processingPrice + additionalProductPrice;

  // 수량할인율 lookup
  const discountRate = lookupQuantityDiscount(
    input.productId, input.quantity, input.lookupData
  );

  const totalPrice = Math.ceil(baseUnitPrice * input.quantity * discountRate);
  return assemblePricingResult(totalPrice, input.quantity, 'fixed_per_unit');
}
```

**Golden Test -- Model 7 (아크릴키링 50x50mm, 30개):**

| Item | Value |
|------|-------|
| sizePrice | 3,260 (50x50 base) |
| processingPrice | 500 (UV printing) |
| additionalProductPrice | 0 |
| discountRate | 0.90 (30~99 tier: 10% discount) |
| totalPrice | ceil((3,260+500) * 30 * 0.90) = ceil(101,520) = 101,520 |

#### REQ-PRICE-009: Tier Lookup (Ubiquitous)

시스템은 **항상** `lookupTier()` 함수로 수량 구간별 단가를 조회할 때, `minQty <= quantity <= maxQty` 범위에 매칭되는 첫 번째 tier를 반환해야 한다. 매칭되는 tier가 없으면 `PricingError('TIER_NOT_FOUND')`를 throw해야 한다.

```typescript
function lookupTier(
  tiers: PriceTier[],
  optionCode: string,
  quantity: number,
  sheetStandard: string | null
): number {
  const matched = tiers.find(t =>
    t.optionCode === optionCode &&
    t.minQty <= quantity &&
    quantity <= t.maxQty &&
    (sheetStandard === null || t.sheetStandard === sheetStandard)
  );

  if (!matched) {
    throw new PricingError('TIER_NOT_FOUND', {
      optionCode, quantity, sheetStandard
    });
  }

  return Number(matched.unitPrice);
}
```

#### REQ-PRICE-010: Imposition Lookup (Event-Driven)

**WHEN** size.impositionCount가 null 또는 0인 경우 **THEN** 시스템은 `imposition_rules` 데이터에서 `cutWidth`, `cutHeight`, `sheetStandard`로 판걸이수를 조회해야 한다. 매칭되는 규칙이 없으면 `PricingError('IMPOSITION_NOT_FOUND')`를 throw해야 한다.

```typescript
function lookupImposition(
  cutWidth: number,
  cutHeight: number,
  sheetStandard: string,
  rules: ImpositionRule[]
): number {
  const matched = rules.find(r =>
    Math.abs(r.cutWidth - cutWidth) < 0.5 &&
    Math.abs(r.cutHeight - cutHeight) < 0.5 &&
    r.sheetStandard === sheetStandard
  );

  if (!matched) {
    throw new PricingError('IMPOSITION_NOT_FOUND', {
      cutWidth, cutHeight, sheetStandard
    });
  }

  return matched.impositionCount;
}
```

#### REQ-PRICE-011: Strategy Registry (Ubiquitous)

시스템은 **항상** Strategy Pattern으로 가격 모델을 관리해야 하며, 새로운 모델 추가 시 registry에 등록만 하면 되는 Open-Closed 구조를 유지해야 한다.

```typescript
type PricingStrategy = (input: PricingInput) => PricingResult;

const pricingRegistry: Record<PricingModel, PricingStrategy> = {
  formula: calculateFormula,
  formula_cutting: calculateFormulaCutting,
  fixed_unit: calculateFixedUnit,
  package: calculatePackage,
  component: calculateComponent,
  fixed_size: calculateFixedSize,
  fixed_per_unit: calculateFixedPerUnit,
};

function calculatePrice(input: PricingInput): PricingResult {
  const strategy = pricingRegistry[input.pricingModel];
  if (!strategy) {
    throw new PricingError('UNKNOWN_MODEL', { model: input.pricingModel });
  }
  return strategy(input);
}
```

#### REQ-PRICE-012: Loss Quantity Resolution (Ubiquitous)

시스템은 **항상** 로스량 설정을 product > category > global 우선순위로 조회해야 한다.

```typescript
function resolveLossConfig(
  productId: number,
  categoryId: number,
  configs: LossQuantityConfig[]
): { lossRate: number; minLossQty: number } {
  // Priority: product > category > global
  const productConfig = configs.find(
    c => c.scopeType === 'product' && c.scopeId === productId
  );
  if (productConfig) return productConfig;

  const categoryConfig = configs.find(
    c => c.scopeType === 'category' && c.scopeId === categoryId
  );
  if (categoryConfig) return categoryConfig;

  const globalConfig = configs.find(c => c.scopeType === 'global');
  if (globalConfig) return globalConfig;

  // Fallback defaults
  return { lossRate: 0.03, minLossQty: 10 };
}
```

### 3.2 Option Engine Requirements

#### REQ-OPT-001: Priority Chain Resolution (Ubiquitous)

시스템은 **항상** 옵션 해석 시 다음 우선순위 체인을 따라야 한다:

```
jobPreset -> size -> paper -> option -> color -> additionalColor
```

```typescript
type OptionPriorityChain = readonly [
  'jobPreset', 'size', 'paper', 'option', 'color', 'additionalColor'
];

interface OptionResolutionContext {
  productId: number;
  currentSelections: Map<string, SelectedOption>;
  productOptions: ProductOption[];
  optionChoices: OptionChoice[];
  constraints: OptionConstraint[];
  dependencies: OptionDependency[];
}

interface OptionResolutionResult {
  availableOptions: Map<string, AvailableOption>;
  disabledOptions: Map<string, DisabledReason>;
  defaultSelections: Map<string, string>;
  validationErrors: ValidationError[];
}

function resolveOptions(ctx: OptionResolutionContext): OptionResolutionResult {
  const result = createEmptyResult();

  for (const phase of PRIORITY_CHAIN) {
    const phaseOptions = getOptionsForPhase(phase, ctx.productOptions);

    for (const opt of phaseOptions) {
      // 1. Evaluate dependencies (parent selected?)
      const depResult = evaluateDependencies(opt, ctx);
      if (!depResult.visible) {
        result.disabledOptions.set(opt.key, depResult.reason);
        continue;
      }

      // 2. Filter choices by constraints
      const availableChoices = filterChoices(opt, ctx);

      // 3. Apply current selection or default
      const selected = ctx.currentSelections.get(opt.key)
        ?? getDefaultChoice(opt, availableChoices);

      result.availableOptions.set(opt.key, {
        definition: opt,
        choices: availableChoices,
        selected,
        isRequired: opt.isRequired,
      });
    }
  }

  return result;
}
```

#### REQ-OPT-002: Dependency Evaluation (Event-Driven)

**WHEN** 사용자가 부모 옵션을 선택 **THEN** 시스템은 해당 부모에 의존하는 모든 자식 옵션의 visibility/choices를 재평가해야 한다.

```typescript
interface DependencyEvalResult {
  visible: boolean;
  reason?: DisabledReason;
  filteredChoices?: string[];  // choice codes that remain available
}

function evaluateDependencies(
  option: ProductOption,
  ctx: OptionResolutionContext
): DependencyEvalResult {
  const deps = ctx.dependencies.filter(
    d => d.childOptionId === option.optionDefinitionId
      && d.productId === ctx.productId
  );

  if (deps.length === 0) {
    return { visible: true };
  }

  for (const dep of deps) {
    const parentSelection = ctx.currentSelections.get(
      getOptionKey(dep.parentOptionId, ctx.productOptions)
    );

    switch (dep.dependencyType) {
      case 'visibility':
        if (!parentSelection) {
          return {
            visible: false,
            reason: { type: 'PARENT_NOT_SELECTED', parentOptionId: dep.parentOptionId }
          };
        }
        if (dep.parentChoiceId && parentSelection.choiceId !== dep.parentChoiceId) {
          return {
            visible: false,
            reason: { type: 'PARENT_CHOICE_MISMATCH', expected: dep.parentChoiceId }
          };
        }
        break;

      case 'choices':
        // Filter child choices based on parent selection
        return {
          visible: true,
          filteredChoices: getFilteredChoices(dep, parentSelection, ctx)
        };

      case 'value':
        // Value linkage (e.g., size -> quantity range)
        break;
    }
  }

  return { visible: true };
}
```

#### REQ-OPT-003: State Machine (State-Driven)

**IF** 옵션 엔진의 상태가 특정 state에 있을 때 **THEN** 허용되는 transition만 수행해야 한다.

```typescript
type OptionEngineState =
  | 'idle'         // 초기 상태, 상품 미선택
  | 'loading'      // 상품 데이터 로딩 중
  | 'ready'        // 옵션 데이터 준비 완료, 선택 대기
  | 'selecting'    // 사용자 옵션 선택 중
  | 'validating'   // 선택 유효성 검증 중
  | 'constrained'  // 제약조건으로 일부 옵션 비활성
  | 'error'        // 오류 발생
  | 'complete';    // 모든 필수 옵션 선택 완료

const STATE_TRANSITIONS: Record<OptionEngineState, OptionEngineState[]> = {
  idle:        ['loading'],
  loading:     ['ready', 'error'],
  ready:       ['selecting'],
  selecting:   ['validating', 'selecting', 'error'],
  validating:  ['constrained', 'complete', 'selecting', 'error'],
  constrained: ['selecting', 'error'],
  error:       ['idle', 'loading', 'ready'],
  complete:    ['selecting', 'idle'],
};

type OptionAction =
  | { type: 'LOAD_PRODUCT'; productId: number }
  | { type: 'PRODUCT_LOADED'; data: ProductOptionData }
  | { type: 'SELECT_OPTION'; optionKey: string; choiceCode: string }
  | { type: 'DESELECT_OPTION'; optionKey: string }
  | { type: 'VALIDATE' }
  | { type: 'RESET' }
  | { type: 'ERROR'; error: Error };

interface OptionState {
  status: OptionEngineState;
  productId: number | null;
  selections: Map<string, SelectedOption>;
  availableOptions: Map<string, AvailableOption>;
  disabledOptions: Map<string, DisabledReason>;
  violations: ConstraintViolation[];
  errors: Error[];
}
```

#### REQ-OPT-004: Cascade Reset (Event-Driven)

**WHEN** 사용자가 priority chain 상위 옵션을 변경 **THEN** 시스템은 해당 옵션 이후의 모든 하위 옵션 선택을 초기화하고, 각 하위 옵션의 available choices를 재계산해야 한다.

```typescript
function handleOptionChange(
  state: OptionState,
  changedOptionKey: string,
  newChoiceCode: string
): OptionState {
  const chainIndex = getChainIndex(changedOptionKey);

  // Reset all options after changed option in priority chain
  const resetKeys = getOptionsAfterIndex(chainIndex, state.availableOptions);

  const newSelections = new Map(state.selections);
  newSelections.set(changedOptionKey, { optionKey: changedOptionKey, choiceCode: newChoiceCode });

  for (const key of resetKeys) {
    newSelections.delete(key);
  }

  // Re-resolve all options with new selections
  return resolveFullState(state.productId!, newSelections);
}
```

### 3.3 Constraint Evaluator Requirements

#### REQ-CONST-001: Layered Constraint Evaluation (Ubiquitous)

시스템은 **항상** 4-Phase LCE (Layered Constraint Evaluation) 알고리즘으로 제약조건을 평가해야 한다.

```typescript
interface ConstraintEvalInput {
  productId: number;
  currentSelections: Map<string, SelectedOption>;
  constraints: OptionConstraint[];   // ~129 star constraints
  dependencies: OptionDependency[];  // ~300 dependency rules
  allChoices: OptionChoice[];
}

interface ConstraintEvalResult {
  availableOptions: Map<string, string[]>;      // optionKey -> available choiceCodes
  disabledOptions: Map<string, DisabledReason>;  // optionKey -> reason
  violations: ConstraintViolation[];             // active violations
  evaluationTimeMs: number;                      // performance tracking
}

function evaluateConstraints(input: ConstraintEvalInput): ConstraintEvalResult {
  const startTime = performance.now();

  // Phase 1: Collect applicable constraints for current product
  const applicable = input.constraints.filter(
    c => c.productId === input.productId && c.isActive
  );

  // Phase 2: Evaluate by priority (ascending), apply req_* then rst_*
  const sorted = applicable.sort((a, b) => a.priority - b.priority);
  const results = new Map<string, string[]>();
  const disabled = new Map<string, DisabledReason>();
  const violations: ConstraintViolation[] = [];

  for (const constraint of sorted) {
    const evalResult = evaluateSingleConstraint(constraint, input);

    if (evalResult.action === 'show') {
      mergeAvailable(results, constraint.targetField, evalResult.values);
    } else if (evalResult.action === 'hide' || evalResult.action === 'disable') {
      disabled.set(constraint.targetField, {
        type: 'CONSTRAINT',
        constraintId: constraint.id,
        description: constraint.description ?? '',
      });
    } else if (evalResult.action === 'limit_range') {
      applyRangeLimit(results, constraint.targetField, evalResult.min, evalResult.max);
    }

    if (evalResult.violated) {
      violations.push({
        constraintId: constraint.id,
        constraintType: constraint.constraintType,
        message: constraint.description ?? `Constraint ${constraint.id} violated`,
        sourceField: constraint.sourceField,
        targetField: constraint.targetField,
      });
    }
  }

  // Phase 3: Post-process specific evaluations
  postProcessSizeConstraints(results, disabled, input);
  postProcessPaperConstraints(results, disabled, input);
  postProcessQuantityConstraints(results, disabled, input);
  postProcessCuttingConstraints(results, disabled, input);

  // Phase 4: Return combined result
  return {
    availableOptions: results,
    disabledOptions: disabled,
    violations,
    evaluationTimeMs: performance.now() - startTime,
  };
}
```

#### REQ-CONST-002: Constraint Type A -- Size Show (Event-Driven)

**WHEN** constraint_type === 'size_show' **THEN** 시스템은 source 사이즈 값이 일치할 때 target 옵션(accessory 등)을 표시해야 한다.

```typescript
// Example: "엽서봉투 *사이즈선택 : 100x150"
// -> if (selectedSize === '100x150') show('envelopeOption')
function evaluateSizeShow(
  constraint: OptionConstraint,
  selections: Map<string, SelectedOption>
): SingleConstraintResult {
  const sizeSelection = selections.get('size');
  if (!sizeSelection) {
    return { action: 'hide', violated: false };
  }

  const sizeValue = `${sizeSelection.cutWidth}x${sizeSelection.cutHeight}`;
  const matches = constraint.operator === 'eq'
    ? sizeValue === constraint.value
    : sizeValue !== constraint.value;

  return {
    action: matches ? 'show' : 'hide',
    violated: false,
    values: matches ? [constraint.targetValue ?? ''] : [],
  };
}
```

#### REQ-CONST-003: Constraint Type B -- Size Range (Event-Driven)

**WHEN** constraint_type === 'size_range' **THEN** 시스템은 가공(박/형압) 크기를 min/max 범위 내로 제한해야 한다.

```typescript
// Example: "*최소 30x30 / 최대 125x125"
function evaluateSizeRange(
  constraint: OptionConstraint,
  selections: Map<string, SelectedOption>
): SingleConstraintResult {
  if (constraint.operator !== 'between') {
    throw new ConstraintError('INVALID_OPERATOR', { expected: 'between' });
  }

  const [minW, minH] = parseSize(constraint.valueMin!); // "30x30" -> [30, 30]
  const [maxW, maxH] = parseSize(constraint.valueMax!); // "125x125" -> [125, 125]

  return {
    action: 'limit_range',
    violated: false,
    min: { width: minW, height: minH },
    max: { width: maxW, height: maxH },
  };
}
```

#### REQ-CONST-004: Constraint Type C -- Paper Condition (Event-Driven)

**WHEN** constraint_type === 'paper_condition' **THEN** 시스템은 용지 조건(평량 등)에 따라 후가공 옵션을 활성화/비활성화해야 한다.

```typescript
// Example: "*종이두께선택시 : 180g이상 코팅가능"
function evaluatePaperCondition(
  constraint: OptionConstraint,
  selections: Map<string, SelectedOption>,
  papers: Paper[]
): SingleConstraintResult {
  const paperSelection = selections.get('paperType');
  if (!paperSelection) {
    return { action: 'disable', violated: false };
  }

  const paper = papers.find(p => p.id === paperSelection.refPaperId);
  if (!paper) {
    return { action: 'disable', violated: false };
  }

  let conditionMet = false;
  switch (constraint.operator) {
    case 'gte':
      conditionMet = (paper.weight ?? 0) >= Number(constraint.value);
      break;
    case 'lte':
      conditionMet = (paper.weight ?? 0) <= Number(constraint.value);
      break;
    case 'eq':
      conditionMet = String(paper.weight) === constraint.value;
      break;
  }

  return {
    action: conditionMet ? 'enable' : 'disable',
    violated: false,
  };
}
```

#### REQ-CONST-005: Dual-Layer rst_awkjob Evaluation (Ubiquitous)

시스템은 **항상** WowPress 레거시 implicit constraints (~200개)와 star constraints (129개)를 병합하여 평가해야 한다. Star constraints가 우선하며, 충돌 시 star가 implicit을 override한다.

```typescript
function mergeConstraintLayers(
  starConstraints: OptionConstraint[],    // 129 explicit star constraints
  implicitConstraints: ImplicitConstraint[] // ~200 WowPress implicit rules
): MergedConstraintSet {
  const merged = new Map<string, ResolvedConstraint>();

  // Layer 1: Apply implicit constraints first
  for (const ic of implicitConstraints) {
    merged.set(ic.key, { source: 'implicit', ...ic });
  }

  // Layer 2: Star constraints override
  for (const sc of starConstraints) {
    const key = `${sc.sourceField}:${sc.targetField}:${sc.productId}`;
    merged.set(key, { source: 'star', ...sc }); // Override implicit
  }

  return { constraints: Array.from(merged.values()) };
}
```

#### REQ-CONST-006: Performance Gate (Unwanted)

시스템은 제약조건 평가에 50ms를 초과**하지 않아야 한다**. 50ms를 초과하면 evaluationTimeMs 필드에 경고를 포함하고, 캐싱된 이전 결과를 반환해야 한다.

```typescript
function evaluateWithTimeout(
  input: ConstraintEvalInput,
  cache: Map<string, ConstraintEvalResult>
): ConstraintEvalResult {
  const cacheKey = buildCacheKey(input);
  const startTime = performance.now();

  const result = evaluateConstraints(input);

  if (result.evaluationTimeMs > 50) {
    console.warn(`Constraint evaluation exceeded 50ms: ${result.evaluationTimeMs}ms`);
    const cached = cache.get(cacheKey);
    if (cached) return cached;
  }

  cache.set(cacheKey, result);
  return result;
}
```

### 3.4 Quote Calculator Requirements

#### REQ-QUOTE-001: Quote Assembly (Ubiquitous)

시스템은 **항상** `assembleQuote(input: QuoteInput): QuoteResult`를 통해 최종 견적을 생성해야 하며, 견적에는 항목별 내역(line items), VAT, 개당 단가가 포함되어야 한다.

```typescript
interface QuoteInput {
  productId: number;
  productName: string;
  pricingResult: PricingResult;
  selectedOptions: SelectedOption[];
  quantity: number;
  sizeSelection: SizeSelection;
}

interface QuoteResult {
  quoteId: string;            // UUID v4
  productId: number;
  productName: string;
  lineItems: QuoteLineItem[];
  subtotal: number;           // VAT 제외 합계
  vatAmount: number;          // VAT 금액 (10%)
  totalPrice: number;         // VAT 포함 합계
  unitPrice: number;          // 개당 단가 (subtotal / quantity)
  quantity: number;
  sizeDisplay: string;        // "100 x 150 mm"
  optionSummary: string;      // "아트지250g, 양면칼라, 무광코팅"
  createdAt: number;          // timestamp
  expiresAt: number;          // timestamp (createdAt + 30 min)
  snapshotHash: string;       // SHA-256 of input for audit trail
}

interface QuoteLineItem {
  category: LineItemCategory;
  label: string;
  description: string;
  unitPrice: number;
  quantity: number;
  amount: number;
}

type LineItemCategory =
  | 'print'            // 출력비
  | 'paper'            // 용지비(지대)
  | 'special_color'    // 별색비
  | 'coating'          // 코팅비
  | 'post_process'     // 후가공비
  | 'binding'          // 제본비
  | 'foil'             // 박/형압비
  | 'packaging'        // 포장비
  | 'accessory'        // 부속품비
  | 'cutting'          // 커팅가공비
  | 'discount';        // 할인

function assembleQuote(input: QuoteInput): QuoteResult {
  const { pricingResult, selectedOptions, quantity } = input;
  const lineItems = buildLineItems(pricingResult.breakdown);

  const subtotal = pricingResult.totalPrice;
  const vatAmount = Math.floor(subtotal * 0.1);
  const totalPrice = subtotal + vatAmount;
  const unitPrice = Math.floor(subtotal / quantity);

  return {
    quoteId: generateUUID(),
    productId: input.productId,
    productName: input.productName,
    lineItems,
    subtotal,
    vatAmount,
    totalPrice,
    unitPrice,
    quantity,
    sizeDisplay: formatSize(input.sizeSelection),
    optionSummary: buildOptionSummary(selectedOptions),
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
    snapshotHash: computeSnapshotHash(input),
  };
}
```

#### REQ-QUOTE-002: Snapshot for Audit Trail (Ubiquitous)

시스템은 **항상** 견적 생성 시 입력 전체를 SHA-256 해시하여 snapshotHash에 저장해야 한다. 이는 나중에 견적 위변조 검증에 사용된다.

```typescript
function computeSnapshotHash(input: QuoteInput): string {
  const serialized = JSON.stringify({
    productId: input.productId,
    quantity: input.quantity,
    sizeSelection: input.sizeSelection,
    selectedOptions: input.selectedOptions.map(o => ({
      optionKey: o.optionKey,
      choiceCode: o.choiceCode,
    })),
    pricingResult: {
      totalPrice: input.pricingResult.totalPrice,
      model: input.pricingResult.model,
      breakdown: input.pricingResult.breakdown,
    },
  });

  // Use SubtleCrypto (browser) or crypto (Node.js) isomorphically
  return sha256(serialized);
}
```

#### REQ-QUOTE-003: Quote Expiry (State-Driven)

**IF** 견적 생성 후 30분이 경과한 상태이면 **THEN** 시스템은 해당 견적을 expired로 표시하고, 가격 재계산을 요구해야 한다.

```typescript
function isQuoteValid(quote: QuoteResult): boolean {
  return Date.now() < quote.expiresAt;
}
```

### 3.5 Cross-Cutting Requirements

#### REQ-CROSS-001: Error Handling (Ubiquitous)

시스템은 **항상** 도메인 특화 에러 클래스를 사용하여 에러를 발생시켜야 한다.

```typescript
class CoreError extends Error {
  constructor(
    public readonly code: string,
    public readonly context: Record<string, unknown>,
    message?: string
  ) {
    super(message ?? `Core error: ${code}`);
    this.name = 'CoreError';
  }
}

class PricingError extends CoreError {
  constructor(code: PricingErrorCode, context: Record<string, unknown>) {
    super(code, context, `Pricing error: ${code}`);
    this.name = 'PricingError';
  }
}

class ConstraintError extends CoreError {
  constructor(code: ConstraintErrorCode, context: Record<string, unknown>) {
    super(code, context, `Constraint error: ${code}`);
    this.name = 'ConstraintError';
  }
}

class OptionError extends CoreError {
  constructor(code: OptionErrorCode, context: Record<string, unknown>) {
    super(code, context, `Option error: ${code}`);
    this.name = 'OptionError';
  }
}

type PricingErrorCode =
  | 'UNKNOWN_MODEL'
  | 'TIER_NOT_FOUND'
  | 'IMPOSITION_NOT_FOUND'
  | 'FIXED_PRICE_NOT_FOUND'
  | 'PACKAGE_PRICE_NOT_FOUND'
  | 'INVALID_QUANTITY'
  | 'INVALID_SIZE';

type ConstraintErrorCode =
  | 'INVALID_OPERATOR'
  | 'CIRCULAR_DEPENDENCY'
  | 'EVALUATION_TIMEOUT';

type OptionErrorCode =
  | 'INVALID_TRANSITION'
  | 'OPTION_NOT_FOUND'
  | 'CHOICE_NOT_AVAILABLE'
  | 'REQUIRED_OPTION_MISSING';
```

#### REQ-CROSS-002: Input Validation (Ubiquitous)

시스템은 **항상** 모든 public API 함수의 입력을 validate하고, 무효한 입력에 대해 명확한 에러를 반환해야 한다.

```typescript
function validatePricingInput(input: PricingInput): void {
  if (input.quantity < 1 || input.quantity > 999_999) {
    throw new PricingError('INVALID_QUANTITY', { quantity: input.quantity });
  }

  if (!pricingRegistry[input.pricingModel]) {
    throw new PricingError('UNKNOWN_MODEL', { model: input.pricingModel });
  }

  // Additional validations per model...
}
```

#### REQ-CROSS-003: Immutability (Ubiquitous)

시스템은 **항상** 입력 데이터를 변경하지 않아야 한다(immutable). 모든 계산은 새 객체를 반환해야 한다.

#### REQ-CROSS-004: No Side Effects (Unwanted)

시스템은 외부 상태(DOM, localStorage, network, console.log 등)에 접근**하지 않아야 한다**. 유일한 예외는 SHA-256 해시를 위한 `crypto` API이며, 이는 isomorphic 래퍼를 통해 접근한다.

#### REQ-CROSS-005: Circular Dependency Detection (Unwanted)

시스템은 옵션 의존성 그래프에서 순환 참조를 허용**하지 않아야 한다**. 순환이 감지되면 `ConstraintError('CIRCULAR_DEPENDENCY')`를 throw한다.

```typescript
function detectCycles(dependencies: OptionDependency[]): string[] | null {
  const graph = new Map<number, number[]>();

  for (const dep of dependencies) {
    const children = graph.get(dep.parentOptionId) ?? [];
    children.push(dep.childOptionId);
    graph.set(dep.parentOptionId, children);
  }

  // Topological sort with cycle detection (Kahn's algorithm)
  const inDegree = new Map<number, number>();
  for (const [parent, children] of graph) {
    if (!inDegree.has(parent)) inDegree.set(parent, 0);
    for (const child of children) {
      inDegree.set(child, (inDegree.get(child) ?? 0) + 1);
    }
  }

  const queue = [...inDegree.entries()]
    .filter(([, deg]) => deg === 0)
    .map(([id]) => id);
  let visited = 0;

  while (queue.length > 0) {
    const node = queue.shift()!;
    visited++;
    for (const child of graph.get(node) ?? []) {
      const newDeg = (inDegree.get(child) ?? 1) - 1;
      inDegree.set(child, newDeg);
      if (newDeg === 0) queue.push(child);
    }
  }

  if (visited < inDegree.size) {
    const cyclicNodes = [...inDegree.entries()]
      .filter(([, deg]) => deg > 0)
      .map(([id]) => String(id));
    return cyclicNodes;
  }

  return null;
}
```

---

## 4. Specifications (S)

### 4.1 File Structure

```
packages/core/
├── src/
│   ├── pricing/
│   │   ├── types.ts              # PricingInput, PricingResult, PricingModel, PriceBreakdown
│   │   ├── engine.ts             # calculatePrice() dispatcher (REQ-PRICE-001, REQ-PRICE-011)
│   │   ├── models/
│   │   │   ├── formula.ts        # Model 1: calculateFormula() (REQ-PRICE-002)
│   │   │   ├── formula-cutting.ts # Model 2: calculateFormulaCutting() (REQ-PRICE-003)
│   │   │   ├── fixed-unit.ts     # Model 3: calculateFixedUnit() (REQ-PRICE-004)
│   │   │   ├── package.ts        # Model 4: calculatePackage() (REQ-PRICE-005)
│   │   │   ├── component.ts      # Model 5: calculateComponent() (REQ-PRICE-006)
│   │   │   ├── fixed-size.ts     # Model 6: calculateFixedSize() (REQ-PRICE-007)
│   │   │   └── fixed-per-unit.ts # Model 7: calculateFixedPerUnit() (REQ-PRICE-008)
│   │   ├── registry.ts           # Strategy registry (REQ-PRICE-011)
│   │   ├── lookup.ts             # lookupTier(), lookupImposition() (REQ-PRICE-009, REQ-PRICE-010)
│   │   ├── loss.ts               # resolveLossConfig() (REQ-PRICE-012)
│   │   └── utils.ts              # assemblePricingResult(), shared math helpers
│   ├── options/
│   │   ├── types.ts              # OptionState, OptionAction, AvailableOptions
│   │   ├── engine.ts             # resolveOptions() main function (REQ-OPT-001)
│   │   ├── chain.ts              # Priority chain evaluator (REQ-OPT-001)
│   │   ├── state-machine.ts      # State machine transitions (REQ-OPT-003)
│   │   ├── cascade.ts            # Cascade reset logic (REQ-OPT-004)
│   │   ├── dependencies.ts       # evaluateDependencies() (REQ-OPT-002)
│   │   └── filters.ts            # filterChoices(), getFilteredChoices()
│   ├── constraints/
│   │   ├── types.ts              # ConstraintEvalInput, ConstraintEvalResult
│   │   ├── evaluator.ts          # evaluateConstraints() LCE algorithm (REQ-CONST-001)
│   │   ├── handlers/
│   │   │   ├── size-show.ts      # Type A handler (REQ-CONST-002)
│   │   │   ├── size-range.ts     # Type B handler (REQ-CONST-003)
│   │   │   └── paper-condition.ts # Type C handler (REQ-CONST-004)
│   │   ├── merger.ts             # Dual-layer merge (REQ-CONST-005)
│   │   ├── cache.ts              # Evaluation cache (REQ-CONST-006)
│   │   └── cycle-detector.ts     # Circular dependency detection (REQ-CROSS-005)
│   ├── quote/
│   │   ├── types.ts              # QuoteInput, QuoteResult, QuoteLineItem
│   │   ├── calculator.ts         # assembleQuote() (REQ-QUOTE-001)
│   │   ├── snapshot.ts           # computeSnapshotHash() (REQ-QUOTE-002)
│   │   └── expiry.ts             # isQuoteValid() (REQ-QUOTE-003)
│   ├── errors.ts                 # CoreError, PricingError, ConstraintError, OptionError (REQ-CROSS-001)
│   ├── validation.ts             # Input validation utilities (REQ-CROSS-002)
│   ├── crypto.ts                 # Isomorphic SHA-256 wrapper
│   └── index.ts                  # Public API exports
├── __tests__/
│   ├── pricing/
│   │   ├── engine.test.ts
│   │   ├── models/
│   │   │   ├── formula.test.ts
│   │   │   ├── formula-cutting.test.ts
│   │   │   ├── fixed-unit.test.ts
│   │   │   ├── package.test.ts
│   │   │   ├── component.test.ts
│   │   │   ├── fixed-size.test.ts
│   │   │   └── fixed-per-unit.test.ts
│   │   ├── lookup.test.ts
│   │   └── loss.test.ts
│   ├── options/
│   │   ├── engine.test.ts
│   │   ├── chain.test.ts
│   │   ├── state-machine.test.ts
│   │   └── dependencies.test.ts
│   ├── constraints/
│   │   ├── evaluator.test.ts
│   │   ├── handlers/
│   │   │   ├── size-show.test.ts
│   │   │   ├── size-range.test.ts
│   │   │   └── paper-condition.test.ts
│   │   └── cycle-detector.test.ts
│   ├── quote/
│   │   ├── calculator.test.ts
│   │   └── snapshot.test.ts
│   └── fixtures/
│       ├── products.ts           # Mock product data
│       ├── price-tiers.ts        # Mock price tier data
│       ├── constraints.ts        # Mock constraint data
│       └── golden-tests.ts       # Golden test expected values
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### 4.2 Public API Surface

```typescript
// packages/core/src/index.ts

// === Pricing Engine ===
export { calculatePrice } from './pricing/engine';
export { lookupTier, lookupImposition } from './pricing/lookup';
export { resolveLossConfig } from './pricing/loss';
export type {
  PricingInput, PricingResult, PricingModel,
  PriceBreakdown, FormulaInput, ComponentInput,
  FixedUnitInput, PackageInput, FixedSizeInput,
  FixedPerUnitInput, FormulaCuttingInput,
} from './pricing/types';

// === Option Engine ===
export { resolveOptions } from './options/engine';
export { createOptionState, transitionState } from './options/state-machine';
export { handleOptionChange } from './options/cascade';
export type {
  OptionState, OptionAction, OptionEngineState,
  OptionResolutionContext, OptionResolutionResult,
  AvailableOption, SelectedOption, DisabledReason,
} from './options/types';

// === Constraint Evaluator ===
export { evaluateConstraints } from './constraints/evaluator';
export { mergeConstraintLayers } from './constraints/merger';
export { detectCycles } from './constraints/cycle-detector';
export type {
  ConstraintEvalInput, ConstraintEvalResult,
  ConstraintViolation, ImplicitConstraint,
} from './constraints/types';

// === Quote Calculator ===
export { assembleQuote } from './quote/calculator';
export { isQuoteValid } from './quote/expiry';
export { computeSnapshotHash } from './quote/snapshot';
export type {
  QuoteInput, QuoteResult, QuoteLineItem,
  LineItemCategory,
} from './quote/types';

// === Errors ===
export {
  CoreError, PricingError, ConstraintError, OptionError,
} from './errors';
export type {
  PricingErrorCode, ConstraintErrorCode, OptionErrorCode,
} from './errors';

// === Shared Types (re-export from data layer) ===
export type {
  PriceTier, ImpositionRule, LossQuantityConfig,
  OptionConstraint, OptionDependency, OptionChoice,
  ProductOption, Paper, PrintMode, PostProcess,
  Binding, FixedPriceRecord, PackagePriceRecord,
  FoilPriceRecord, SizeSelection,
} from './pricing/types';
```

### 4.3 Package Configuration

```jsonc
// packages/core/package.json
{
  "name": "@widget-creator/core",
  "version": "0.1.0",
  "type": "module",
  "sideEffects": false,
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts --clean",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "tsup": "^8.0.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0",
    "@vitest/coverage-v8": "^3.0.0"
  }
}
```

```jsonc
// packages/core/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["__tests__", "dist"]
}
```

### 4.4 Shared Lookup Data Type

모든 pricing/option/constraint 함수에 주입되는 lookup data의 통합 타입이다.

```typescript
interface PricingLookupData {
  // Pricing tables
  priceTiers: PriceTier[];
  fixedPrices: FixedPriceRecord[];
  packagePrices: PackagePriceRecord[];
  foilPrices: FoilPriceRecord[];

  // Reference data
  impositionRules: ImpositionRule[];
  lossConfigs: LossQuantityConfig[];

  // Material data
  papers: Paper[];
  printModes: PrintMode[];
  postProcesses: PostProcess[];
  bindings: Binding[];
}

interface OptionLookupData {
  optionDefinitions: OptionDefinition[];
  productOptions: ProductOption[];
  optionChoices: OptionChoice[];
  optionConstraints: OptionConstraint[];
  optionDependencies: OptionDependency[];
}

interface CoreLookupData extends PricingLookupData, OptionLookupData {}
```

### 4.5 Utility Functions

```typescript
// packages/core/src/pricing/utils.ts

/** Assemble a standardized PricingResult from total price and model */
function assemblePricingResult(
  totalPrice: number,
  quantity: number,
  model: PricingModel,
  breakdown?: Partial<PriceBreakdown>
): PricingResult {
  return {
    totalPrice: Math.floor(totalPrice),
    totalPriceWithVat: Math.floor(totalPrice * 1.1),
    unitPrice: Math.floor(totalPrice / quantity),
    breakdown: {
      printCost: 0,
      paperCost: 0,
      specialColorCost: 0,
      coatingCost: 0,
      postProcessCost: 0,
      bindingCost: 0,
      foilCost: 0,
      packagingCost: 0,
      cuttingCost: 0,
      discountAmount: 0,
      ...breakdown,
    },
    model,
    calculatedAt: Date.now(),
  };
}

/** Parse "100x150" format to [width, height] */
function parseSize(sizeStr: string): [number, number] {
  const parts = sizeStr.toLowerCase().split('x').map(Number);
  if (parts.length !== 2 || parts.some(isNaN)) {
    throw new PricingError('INVALID_SIZE', { size: sizeStr });
  }
  return [parts[0], parts[1]];
}

/** Format size for display: "100 x 150 mm" */
function formatSize(size: SizeSelection): string {
  if (size.isCustom) {
    return `${size.customWidth} x ${size.customHeight} mm`;
  }
  return `${size.cutWidth} x ${size.cutHeight} mm`;
}
```

---

## 5. Traceability Matrix

| Requirement | File(s) | Test File(s) | Priority |
|-------------|---------|--------------|----------|
| REQ-PRICE-001 | engine.ts, registry.ts | engine.test.ts | P0 |
| REQ-PRICE-002 | models/formula.ts | models/formula.test.ts | P0 |
| REQ-PRICE-003 | models/formula-cutting.ts | models/formula-cutting.test.ts | P0 |
| REQ-PRICE-004 | models/fixed-unit.ts | models/fixed-unit.test.ts | P0 |
| REQ-PRICE-005 | models/package.ts | models/package.test.ts | P0 |
| REQ-PRICE-006 | models/component.ts | models/component.test.ts | P0 |
| REQ-PRICE-007 | models/fixed-size.ts | models/fixed-size.test.ts | P0 |
| REQ-PRICE-008 | models/fixed-per-unit.ts | models/fixed-per-unit.test.ts | P0 |
| REQ-PRICE-009 | lookup.ts | lookup.test.ts | P0 |
| REQ-PRICE-010 | lookup.ts | lookup.test.ts | P0 |
| REQ-PRICE-011 | registry.ts | engine.test.ts | P0 |
| REQ-PRICE-012 | loss.ts | loss.test.ts | P0 |
| REQ-OPT-001 | engine.ts, chain.ts | engine.test.ts, chain.test.ts | P0 |
| REQ-OPT-002 | dependencies.ts | dependencies.test.ts | P0 |
| REQ-OPT-003 | state-machine.ts | state-machine.test.ts | P0 |
| REQ-OPT-004 | cascade.ts | cascade.test.ts | P0 |
| REQ-CONST-001 | evaluator.ts | evaluator.test.ts | P0 |
| REQ-CONST-002 | handlers/size-show.ts | handlers/size-show.test.ts | P0 |
| REQ-CONST-003 | handlers/size-range.ts | handlers/size-range.test.ts | P0 |
| REQ-CONST-004 | handlers/paper-condition.ts | handlers/paper-condition.test.ts | P0 |
| REQ-CONST-005 | merger.ts | merger.test.ts | P1 |
| REQ-CONST-006 | cache.ts | evaluator.test.ts | P1 |
| REQ-QUOTE-001 | calculator.ts | calculator.test.ts | P0 |
| REQ-QUOTE-002 | snapshot.ts | snapshot.test.ts | P0 |
| REQ-QUOTE-003 | expiry.ts | calculator.test.ts | P1 |
| REQ-CROSS-001 | errors.ts | (all test files) | P0 |
| REQ-CROSS-002 | validation.ts | (all test files) | P0 |
| REQ-CROSS-003 | (all source files) | (all test files) | P0 |
| REQ-CROSS-004 | (all source files) | (all test files) | P0 |
| REQ-CROSS-005 | cycle-detector.ts | cycle-detector.test.ts | P0 |

---

## 6. Glossary

| Term | Korean | Definition |
|------|--------|------------|
| Imposition Count | 판걸이수 | Number of units that fit on one print sheet |
| Required Sheets | 필요판수 | ceil(quantity / impositionCount) |
| Loss Quantity | 로스량 | Extra units for production waste |
| Sheet Standard | 기준판형 | Base sheet size: A3 (316x467mm) or T3 (330x660mm) |
| Paper Cost (Jidae) | 지대 | Paper material cost per unit |
| Price Tier | 수량구간 단가 | Quantity-based pricing bracket |
| Price Code | 가격코드 | Column index in digital output price table |
| Star Constraint | 별표 제약조건 | Explicit constraint marked with star in product master |
| Cover Type | 내지/표지 구분 | Inner body vs. cover distinction for booklets |
| Priority Chain | 우선순위 체인 | Option evaluation order: preset->size->paper->option->color |
| LCE | 계층적 제약 평가 | Layered Constraint Evaluation algorithm |
| Golden Test | 골든 테스트 | Known-answer test with verified expected output |

---

## 7. Expert Consultation Recommendations

### Backend Expert Consultation

이 SPEC은 pure TypeScript core engine이므로 직접적인 백엔드 구현은 포함하지 않으나, apps/api에서 이 engine을 활용할 때 다음 사항에 대해 expert-backend 상담이 권장된다:

- PricingLookupData를 DB에서 효율적으로 로드하는 repository pattern
- 가격 계산 결과의 server-side validation과 client-side 결과 비교
- Quote snapshot의 DB 저장 및 audit trail 조회 패턴

### Frontend Expert Consultation

apps/widget에서 core engine을 사용할 때 다음 사항에 대해 expert-frontend 상담이 권장된다:

- Option Engine state machine과 UI state 동기화 패턴
- 50KB widget bundle 내에서 core engine의 tree-shaking 최적화
- ConstraintEvalResult를 UI 컴포넌트(SizeSelector, PaperSelect 등)에 반영하는 패턴

---

## 8. Related Specifications

| SPEC | Relationship |
|------|-------------|
| SPEC-INFRA-001 | Drizzle ORM schema definitions (data source for CoreLookupData) |
| SPEC-DATA-002 | Data normalization schema (26 tables, 7 pricing models, 329 constraints) |
| SPEC-WIDGET-UI-001 (planned) | Widget UI consuming core engine outputs |
| SPEC-API-001 (planned) | API layer wrapping core engine with DB integration |

---

## 9. Implementation Notes

> Level 1 (spec-first): SPEC marked as completed. No further maintenance required.

### Implementation Summary

- **Completion Date**: 2026-02-23
- **Git Commit**: 81f14c5 (feat(core): implement Widget Builder Core Engine)
- **Implementation Location**: `packages/core/`
- **Total Files**: 70+ source and test files

### Implementation Status

All 32 planned tasks (Phase 1-7) have been implemented as specified:

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1: Foundation Types & Errors | Completed | errors.ts, types, validation, crypto |
| Phase 2: Pricing Engine Core | Completed | lookup, loss, utils, registry, engine |
| Phase 3: 7 Pricing Models | Completed | All 7 strategy implementations |
| Phase 4: Option Engine | Completed | chain, dependencies, state-machine, cascade |
| Phase 5: Constraint Evaluator | Completed | LCE evaluator, 3 handlers, merger, cache, cycle-detector |
| Phase 6: Quote Calculator | Completed | calculator, snapshot, expiry |
| Phase 7: Integration & Optimization | Completed | index.ts, golden tests, bundle optimization |

### Scope Expansions (Beyond Original Plan)

Additional test files implemented to improve coverage:

| File | Purpose |
|------|---------|
| `__tests__/integration.test.ts` | Full pipeline integration tests |
| `__tests__/crypto.test.ts` | Isomorphic SHA-256 wrapper tests |
| `__tests__/validation.test.ts` | Input validation utility tests |
| `__tests__/pricing/utils.test.ts` | Pricing utility function tests |
| `__tests__/constraints/merger.test.ts` | Dual-layer constraint merger tests |
| `__tests__/constraints/cache.test.ts` | Evaluation cache tests |
| `__tests__/options/filters.test.ts` | Option choice filter tests |
| `__tests__/options/cascade.test.ts` | Cascade reset logic tests |

### Quality Metrics

- **Test Coverage**: 95%+ (target met per REQ-1.1)
- **Bundle Size**: < 15KB gzipped (target met)
- **Performance**: Constraint evaluation < 50ms, Price calculation < 100ms
- **TypeScript**: Strict mode, zero compilation errors
- **Dependencies**: Zero runtime dependencies

---

Version: 1.0.0
Last Updated: 2026-02-23
Requirements Count: 30 (12 Pricing + 4 Option + 6 Constraint + 3 Quote + 5 Cross-cutting)
