# @widget-creator/shared

Widget Creator 모노레포의 공유 패키지. 인쇄 지식 데이터베이스의 TypeScript 타입, Zod 검증 스키마, WowPress 카탈로그 파서를 제공한다.

## 설치

이 패키지는 pnpm workspace 내부 전용이다.

```bash
# workspace 패키지에서 참조
"@widget-creator/shared": "workspace:*"
```

## 디렉터리 구조

```
src/
├── types/                    # TypeScript 타입 정의 (44개)
│   ├── print-product.ts      # DB 모델 타입 (10종)
│   ├── option-types.ts       # 옵션 엔진 타입
│   ├── pricing-types.ts      # 가격/배송 타입
│   └── constraint-types.ts   # req_* / rst_* 제약 조건 타입
├── schemas/                  # Zod 검증 스키마
│   └── wowpress-raw.schema.ts  # WowPress JSON 스키마 9종
└── parsers/                  # 데이터 파서
    └── catalog-parser.ts     # WowPress 카탈로그 파서
```

## 주요 모듈

### 타입 정의 (`src/types/`)

#### `print-product.ts` - DB 모델 타입

Prisma 스키마의 10개 모델에 대응하는 TypeScript 인터페이스.

| 타입 | 설명 |
|------|------|
| `ProductCategory` | 상품 카테고리 (최대 3단계 계층) |
| `PrintProduct` | 인쇄 상품 마스터 레코드 |
| `ProductSize` | 상품 규격 정보 (표준/비정형) |
| `ProductPaper` | 상품 용지 정보 |
| `ProductColor` | 상품 색상 정보 |
| `ProductPrintMethod` | 인쇄방식 정보 |
| `ProductPostProcess` | 후가공 정보 |
| `ProductOrderQty` | 주문 수량 정보 |
| `PricingTable` | 가격표 |
| `DeliveryInfo` | 배송 정보 |

#### `option-types.ts` - 옵션 엔진 타입

`@widget-creator/pricing-engine`의 `OptionEngine`이 사용하는 입출력 타입.

```typescript
import type { OptionSelection, AvailableOptions } from "@widget-creator/shared";

// 현재 선택 상태
const selection: OptionSelection = {
  coverCd: "cover",
  jobPresetNo: 1,
  sizeNo: 2,
  paperNo: null,
  optNo: null,
  colorNo: null,
  colorNoAdd: null,
};
```

#### `constraint-types.ts` - 제약 조건 타입

`req_*` 필수 조건 7종, `rst_*` 제한 조건 8종의 TypeScript 유니온 타입.

### Zod 스키마 (`src/schemas/`)

WowPress API 응답 JSON 파싱을 위한 Zod 스키마 9종.

```typescript
import { ProductDetailResponseSchema } from "@widget-creator/shared";

const result = ProductDetailResponseSchema.safeParse(rawJson);
if (result.success) {
  const detail = result.data;
}
```

> **참고**: WowPress 카탈로그 JSON의 실제 데이터 특성상, 알 수 없는 필드를 허용하기 위해 `.passthrough()`를 사용한다.

### 카탈로그 파서 (`src/parsers/`)

`ref/wowpress/catalog/` 디렉터리의 JSON 파일들을 파싱하여 정형화된 데이터를 반환한다.

```typescript
import { parseCatalog } from "@widget-creator/shared";

const catalog = await parseCatalog("./ref/wowpress/catalog");
console.log(`총 ${catalog.products.length}개 상품 파싱`); // 326개
console.log(`총 ${catalog.categories.length}개 카테고리`); // 47개
```

**파싱 제외 상품**: 오류 응답으로 파싱 불가한 3개 상품(ID: 40078, 40089, 40297)은 자동으로 제외된다.

## 테스트

```bash
pnpm test
```

테스트 파일은 `src/__tests__/` 하위에 위치하며, 타입 검증, 스키마 파싱, 카탈로그 파서 동작을 검증한다.
