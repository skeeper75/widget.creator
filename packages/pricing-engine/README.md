# @widget-creator/pricing-engine

Widget Creator 모노레포의 가격 엔진 패키지. WowPress 인쇄 지식 데이터베이스 위에서 동작하는 옵션 우선순위 체인 엔진, 제약 조건 평가기, 가격 계산기, 배송비 계산기를 제공한다.

## 설치

이 패키지는 pnpm workspace 내부 전용이다.

```bash
"@widget-creator/pricing-engine": "workspace:*"
```

## 디렉터리 구조

```
src/
├── option-engine.ts          # 옵션 우선순위 체인 엔진 (핵심)
├── cover-handler.ts          # pjoin 표지 분리 처리
├── quantity-resolver.ts      # 수량 해석 (common/combination)
├── non-standard-handler.ts   # 비정형 규격 검증
├── calculator.ts             # 비선형 가격 계산
├── delivery-calculator.ts    # 배송비 계산
├── types.ts                  # 패키지 내부 타입
└── constraints/
    ├── requirement-parser.ts    # req_* 7종 파서
    ├── restriction-parser.ts    # rst_* 8종 파서
    ├── size-constraint.ts       # 규격 필터/평가
    ├── paper-constraint.ts      # 용지 필터/평가
    ├── color-constraint.ts      # 색상 필터/평가
    ├── print-method-constraint.ts  # 인쇄방식 필터/평가
    └── post-process-constraint.ts  # 후가공 필터/평가 + 상호 배제
```

## 핵심 개념: 옵션 우선순위 체인

인쇄 상품의 옵션 선택은 다음 우선순위 체인에 따라 동작한다.

```
jobPresetNo  →  sizeNo  →  paperNo  →  optNo  →  colorNo  →  colorNoAdd
  (기준정보)     (규격)      (용지)    (옵션)     (색상)     (추가색상)
```

**핵심 규칙**: 상위 옵션이 변경되면 그 하위의 모든 선택이 자동으로 초기화된다(cascading reset). 각 레벨에서 상위 옵션의 제약 조건을 평가하여 유효한 하위 옵션 목록만 반환한다.

## 주요 모듈

### OptionEngine

```typescript
import { OptionEngine } from "@widget-creator/pricing-engine";
import type { ProductData, OptionSelection } from "@widget-creator/pricing-engine";

// 상품 데이터로 엔진 초기화
const engine = new OptionEngine(productData);

// 현재 선택 상태 정의
const selection: OptionSelection = {
  coverCd: "cover",
  jobPresetNo: 1,
  sizeNo: null,
  paperNo: null,
  optNo: null,
  colorNo: null,
  colorNoAdd: null,
};

// 선택 가능한 옵션 목록 조회
const available = engine.getAvailableOptions(selection);
// available.sizes   - 현재 선택 기준 유효한 규격 목록
// available.papers  - 유효한 용지 목록
// available.colors  - 유효한 색상 목록
// available.constraints - 위반된 제약 조건 목록

// 옵션 선택 (상위 변경 시 하위 자동 초기화)
const newSelection = engine.selectOption(selection, "size", 3);

// 전체 선택 상태 유효성 검사
const violations = engine.validateSelection(selection);
```

### 제약 조건 평가 동작 방식

1. 사용자가 기준정보(상위 옵션)를 선택한다.
2. 선택된 기준정보의 `req_*` 조건을 수집한다 → 필수 활성화 대상 목록 생성.
3. 선택된 기준정보의 `rst_*` 조건을 수집한다 → 비활성화 대상 목록 생성.
4. 하위 우선순위 옵션 목록을 필터링한다:
   - 전체 옵션에서 `rst_*` 대상을 제거한다.
   - `req_*` 대상이 있으면 해당 옵션만 포함한다.
5. 필터링된 결과를 반환한다.
6. 현재 선택이 제약 위반인지 검증한다 → `ConstraintViolation[]` 반환.

#### req_* 필수 조건 종류 (7종)

| 조건 | 설명 |
|------|------|
| `req_paper` | 특정 용지 필수 선택 |
| `req_color` | 특정 색상 필수 선택 |
| `req_prsjob` | 특정 인쇄방식 필수 선택 |
| `req_awkjob` | 특정 후가공 필수 선택 |
| `req_ordqty` | 최소 주문 수량 제한 |
| `req_width` | 비정형 규격 가로 범위 |
| `req_height` | 비정형 규격 세로 범위 |

#### rst_* 제한 조건 종류 (8종)

| 조건 | 설명 |
|------|------|
| `rst_paper` | 특정 용지 선택 불가 |
| `rst_color` | 특정 색상 선택 불가 |
| `rst_prsjob` | 특정 인쇄방식 선택 불가 |
| `rst_awkjob` | 특정 후가공 선택 불가 |
| `rst_ordqty` | 주문 수량 상한 제한 |
| `rst_size` | 특정 규격 선택 불가 |
| `rst_opt` | 특정 옵션 선택 불가 |
| `rst_coloradd` | 추가 색상 선택 불가 |

### CoverHandler

`pjoin` 값에 따라 표지 분리 처리 방식이 달라진다.

- `pjoin=0`: **통합 상품** - 앞/뒤표지와 내지가 단일 제품으로 구성된다.
- `pjoin=1`: **분리 상품** - 표지 커버(`coverCd="cover"`)와 내지(`coverCd="inner"`)를 별도로 선택한다.

### PriceCalculator

비선형 수량 구간별 가격을 계산한다. 동일 수량이라도 선택된 옵션 조합에 따라 가격이 달라진다.

```typescript
import { PriceCalculator } from "@widget-creator/pricing-engine";

const calculator = new PriceCalculator(pricingTable);
const price = calculator.calculate({
  quantity: 500,
  selection,
  isRush: false,
});
// price.basePrice     - 기본 인쇄 단가 * 수량
// price.postProcess   - 후가공 추가 비용
// price.total         - 합계
```

### DeliveryCalculator

```typescript
import { DeliveryCalculator } from "@widget-creator/pricing-engine";

const deliveryCalc = new DeliveryCalculator(deliveryInfo);
const fee = deliveryCalc.calculate({
  method: "parcel",
  region: "jeju",
  memberGrade: "vip",
  orderTotal: 50000,
});
```

## 테스트

```bash
# 가격 엔진 전체 테스트
pnpm test

# 제약 조건 관련 테스트만
pnpm test constraints
```

테스트는 `src/__tests__/` 하위에 위치하며 309개 전체 테스트가 모두 통과한다.

### 테스트 커버리지 범위

- `OptionEngine`: 옵션 선택, cascading reset, 제약 조건 평가
- `CoverHandler`: pjoin=0/1 분기 처리
- `QuantityResolver`: common-type, combination-type 수량 해석
- `PriceCalculator`: 구간 가격 계산, 후가공 비용, 급행 할증
- `DeliveryCalculator`: 기본 요금, 지역 추가 요금, 회원 무료 배송
- `constraints/*`: req_* / rst_* 각 7종/8종 개별 테스트

## 아키텍처 결정 사항

### PostProcessEvaluator 클래스 도입

SPEC에 명시되지 않았으나, 후가공 제약 조건의 복잡도(4종 req + 6종 rst + 상호 배제 규칙)로 인해 별도 `PostProcessEvaluator` 클래스를 도입하였다.

### DeliveryCalculator 분리

배송비 계산 로직이 가격 계산 로직과 독립적으로 테스트 가능하도록 `delivery-calculator.ts`를 별도 파일로 분리하였다.
