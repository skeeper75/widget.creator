# SPEC-DATA-001: 인쇄 지식 데이터베이스 및 상품 옵션 엔진

---

## 메타데이터

| 항목 | 값 |
|------|------|
| SPEC ID | SPEC-DATA-001 |
| 제목 | 인쇄 지식 데이터베이스 및 상품 옵션 엔진 |
| 생성일 | 2026-02-22 |
| 상태 | archived |
| 우선순위 | High |
| 담당 | expert-backend |
| 관련 문서 | `.moai/knowledge/wowpress-print-domain.md` |

---

## 1. 환경 (Environment)

### 1.1 프로젝트 컨텍스트

Widget Creator 프로젝트의 데이터 레이어를 구성하는 SPEC이다. WowPress(와우프레스) Open API를 벤치마킹하여, 후니프린팅 자체 인쇄 지식 데이터베이스를 구축하고 상품 옵션 엔진을 구현한다.

### 1.2 기술 환경

- **런타임**: Node.js 22.x LTS
- **언어**: TypeScript 5.7+ (strict mode)
- **ORM**: Prisma 6.x
- **DB**: PostgreSQL 16.x (JSONB 활용)
- **패키지 매니저**: pnpm 9.x
- **모노레포**: Turborepo
- **검증**: Zod 3.x
- **테스트**: Vitest 3.x

### 1.3 데이터 출처

- WowPress Open API v0.0.1 (api.wowpress.co.kr)
- 제품상세 SPEC v1.0 (products_spec_v1.0.pdf, 24페이지)
- 제품가격 & 주문 SPEC v1.01 (price_order_spec_v1.01.pdf, 25페이지)
- 카탈로그 데이터: 326개 상품, 47개 카테고리 (ref/wowpress/catalog/)

---

## 2. 가정 (Assumptions)

### 2.1 기술적 가정

- A1: WowPress API 구조는 국내 인쇄 산업의 표준적 옵션 체계를 반영한다고 가정한다
- A2: 후니프린팅의 상품 옵션 체계는 WowPress와 유사하되, 자체 확장이 필요하다고 가정한다
- A3: 제품 상세 JSON 구조(coverinfo, sizeinfo, paperinfo, colorinfo, optioninfo, prsjobinfo, awkjobinfo, deliverinfo)는 인쇄 산업 전반에 적용 가능한 범용 모델이다
- A4: 옵션 간 제약 조건(req_*/rst_*)은 DB 레벨에서 JSONB로 저장하고 애플리케이션 레벨에서 검증한다

### 2.2 비즈니스 가정

- A5: 초기 MVP에서는 WowPress 카탈로그의 주요 카테고리(명함, 스티커, 전단, 책자)를 우선 지원한다
- A6: 가격 정보는 후니프린팅 자체 가격표를 기반으로 하되, WowPress의 가격 조회 API 구조를 참고한다
- A7: 상품당 옵션 조합 수는 최대 수만 건에 달할 수 있으므로 효율적 데이터 구조가 필수이다

### 2.3 데이터 가정

- A8: 카탈로그 데이터(ref/wowpress/catalog/)는 실제 프로덕션 데이터의 구조를 정확히 반영한다
- A9: 기준정보 우선순위(jobpresetno -> sizeno -> paperno -> optno -> colorno -> colornoadd)는 모든 제품에 공통으로 적용된다

---

## 3. 요구사항 (Requirements)

### 3.1 인쇄 지식 데이터베이스 스키마

**R-DB-001** [유비쿼터스]: 시스템은 **항상** 인쇄 상품의 계층적 카테고리 구조를 저장하고 조회할 수 있어야 한다. 카테고리는 최대 3단계 깊이를 지원한다.

**R-DB-002** [유비쿼터스]: 시스템은 **항상** 상품별로 커버 구성정보(coverinfo), 수량정보(ordqty), 규격정보(sizeinfo), 지류정보(paperinfo), 도수정보(colorinfo), 옵션정보(optioninfo), 인쇄방식정보(prsjobinfo), 후가공정보(awkjobinfo), 배송정보(deliverinfo)를 JSONB 형태로 저장할 수 있어야 한다.

**R-DB-003** [유비쿼터스]: 시스템은 **항상** 기준정보 간의 요구사항(req_*)과 제약사항(rst_*) 관계를 데이터로 표현할 수 있어야 한다.

### 3.2 WowPress API 연동 레이어

**R-API-001** [이벤트]: **WHEN** 관리자가 WowPress 제품 데이터 동기화를 요청하면, **THEN** 시스템은 WowPress API로부터 제품 목록, 상세정보, 가격정보를 조회하여 로컬 데이터베이스에 저장한다.

**R-API-002** [이벤트]: **WHEN** 시스템이 WowPress 제품 상세 JSON을 수신하면, **THEN** 시스템은 JSON 구조를 파싱하여 정규화된 내부 데이터 모델로 변환한다.

**R-API-003** [상태]: **IF** WowPress API의 timestamp가 로컬 데이터보다 최신이면, **THEN** 시스템은 해당 제품의 로컬 데이터를 갱신한다.

**R-API-004** [비허용]: 시스템은 WowPress API 토큰을 코드에 하드코딩**하지 않아야 한다**. 환경변수 또는 시크릿 매니저를 통해서만 관리한다.

### 3.3 상품 옵션 엔진

**R-OPT-001** [유비쿼터스]: 시스템은 **항상** 기준정보 우선순위 체인(jobpresetno -> sizeno -> paperno -> optno -> colorno -> colornoadd)에 따라 선택 가능한 옵션 목록을 동적으로 계산할 수 있어야 한다.

**R-OPT-002** [이벤트]: **WHEN** 사용자가 상위 기준정보를 변경하면, **THEN** 시스템은 하위 기준정보의 선택 가능 옵션을 즉시 재계산하여 반환한다.

**R-OPT-003** [이벤트]: **WHEN** 사용자가 특정 기준정보를 선택하면, **THEN** 시스템은 해당 기준정보의 req_* 조건을 평가하여 필수 활성화 옵션을 반환하고, rst_* 조건을 평가하여 비활성화 옵션을 반환한다.

**R-OPT-004** [상태]: **IF** 커버구성이 표지/내지 분리(pjoin=1)인 상품이면, **THEN** 시스템은 covercd별로 독립된 옵션 선택 트리를 제공한다.

**R-OPT-005** [상태]: **IF** 규격이 비규격(non_standard=true)이면, **THEN** 시스템은 req_width/req_height에 정의된 범위 내에서 사용자 입력을 받아 규격을 결정한다.

**R-OPT-006** [이벤트]: **WHEN** 사용자가 수량을 선택/입력하면, **THEN** 시스템은 현재 기준정보 조합에 해당하는 주문가능수량(ordqty)을 검증한다. 기준정보 공통형이면 모든 조합에서 동일한 수량을, 조합형이면 해당 조합의 수량을 적용한다.

**R-OPT-007** [유비쿼터스]: 시스템은 **항상** 후가공 정보의 계층 구조(jobgrouplist -> awkjoblist)를 탐색하고, 각 후가공 항목의 4가지 요구사항(req_joboption, req_jobsize, req_jobqty, req_awkjob)과 6가지 제약사항(rst_jobqty, rst_cutcnt, rst_size, rst_paper, rst_color, rst_awkjob)을 정확히 평가할 수 있어야 한다.

**R-OPT-008** [비허용]: 시스템은 기준정보 우선순위를 무시한 역방향 옵션 선택을 **허용하지 않아야 한다**.

### 3.4 가격 계산 엔진

**R-PRC-001** [이벤트]: **WHEN** 사용자가 모든 필수 기준정보를 선택 완료하면, **THEN** 시스템은 해당 조합의 단가를 계산하여 반환한다.

**R-PRC-002** [유비쿼터스]: 시스템은 **항상** 수량별 비선형 가격 구조를 지원해야 한다. 수량이 증가할수록 단가가 감소하는 구간별 가격표를 관리한다.

**R-PRC-003** [이벤트]: **WHEN** 후가공 옵션이 추가/제거되면, **THEN** 시스템은 후가공 비용을 재계산하여 총 견적가에 반영한다.

**R-PRC-004** [이벤트]: **WHEN** 배송방법이 선택되면, **THEN** 시스템은 기본 배송비 + 지역 추가 배송비를 계산하고, 무료배송 조건(회원등급별 최소 구매액)을 평가하여 최종 배송비를 반환한다.

**R-PRC-005** [비허용]: 시스템은 가격 정보가 없는 기준정보 조합에 대해 0원 또는 임의 가격을 반환**하지 않아야 한다**. 가격 미등록 조합에 대해서는 명시적 오류를 반환한다.

### 3.5 위젯 설정 데이터 모델

**R-WDG-001** [유비쿼터스]: 시스템은 **항상** 위젯별로 활성화할 상품 카테고리, 노출할 옵션 항목, 커스텀 테마 설정을 JSONB로 저장할 수 있어야 한다.

**R-WDG-002** [이벤트]: **WHEN** 관리자가 위젯에 상품을 연결하면, **THEN** 시스템은 해당 상품의 전체 옵션 트리를 위젯 설정에 포함시킨다.

**R-WDG-003** [선택]: **가능하면** 위젯별로 가격 규칙의 마크업/마크다운을 설정할 수 있는 기능을 제공한다.

---

## 4. 사양 (Specifications)

### 4.1 데이터베이스 스키마 설계

#### 핵심 테이블

**ProductCategory**: 상품 카테고리 계층 구조
- `id` (String, PK)
- `slug` (String, UNIQUE)
- `displayName` (String)
- `parentId` (String, FK, nullable) - 상위 카테고리
- `level` (Int) - 깊이 (1~3)
- `productCount` (Int)
- `keywords` (String[])
- `sortOrder` (Int)

**PrintProduct**: 인쇄 상품 마스터
- `id` (String, PK)
- `externalId` (Int, UNIQUE) - WowPress prodno
- `name` (String)
- `categoryId` (String, FK)
- `selType` (String) - 제품타입
- `pjoin` (Int) - 표지/내지 구분자 (0: 통합, 1: 분리)
- `unit` (String) - 수량단위 (매/연/부/개/장)
- `fileTypes` (String[]) - 허용 파일형식
- `coverInfo` (JSONB) - 커버 구성정보
- `deliveryGroupNo` (Int, nullable) - 묶음배송 그룹
- `deliveryGroupName` (String, nullable)
- `deliveryPrepay` (Boolean) - 선불택배 가부
- `cutoffTime` (String, nullable) - 조판시작시간
- `syncedAt` (DateTime) - 마지막 동기화 시각
- `rawData` (JSONB) - WowPress 원본 JSON 전체

**ProductSize**: 규격 정보
- `id` (String, PK)
- `productId` (String, FK)
- `externalSizeNo` (Int) - WowPress sizeno
- `coverCd` (Int) - 통합/표지/내지
- `sizeName` (String) - 규격명 (예: "90x100")
- `width` (Int) - 가로 mm
- `height` (Int) - 세로 mm
- `cutSize` (Int) - 제단크기 mm
- `isNonStandard` (Boolean) - 비규격 여부
- `reqWidth` (JSONB, nullable) - 비규격 가로 입력범위
- `reqHeight` (JSONB, nullable) - 비규격 세로 입력범위
- `reqAwkjob` (JSONB, nullable) - 규격+후가공 요구사항
- `rstOrdqty` (JSONB, nullable) - 규격+수량 제약
- `rstAwkjob` (JSONB, nullable) - 규격+후가공 제약

**ProductPaper**: 지류 정보
- `id` (String, PK)
- `productId` (String, FK)
- `externalPaperNo` (Int) - WowPress paperno
- `coverCd` (Int)
- `paperName` (String) - 지류명
- `paperGroup` (String) - 지류 그룹명
- `pGram` (Int, nullable) - 평량
- `reqWidth` / `reqHeight` (JSONB, nullable)
- `reqAwkjob` (JSONB, nullable) - 지류+후가공 요구
- `rstOrdqty` (JSONB, nullable) - 지류+수량 제약
- `rstPrsjob` (JSONB, nullable) - 지류+인쇄방식 제약
- `rstAwkjob` (JSONB, nullable) - 지류+후가공 제약

**ProductColor**: 도수 정보
- `id` (String, PK)
- `productId` (String, FK)
- `externalColorNo` (Int) - WowPress colorno
- `coverCd` (Int)
- `pageCd` (Int)
- `colorName` (String) - 도수명
- `pdfPage` (Int) - 조판수량
- `isAdditional` (Boolean) - 추가도수 여부
- `reqPrsjob` (JSONB, nullable) - 도수+인쇄방식 요구
- `reqAwkjob` (JSONB, nullable) - 도수+후가공 요구
- `rstPrsjob` (JSONB, nullable)
- `rstAwkjob` (JSONB, nullable)

**ProductPrintMethod**: 인쇄방식 정보
- `id` (String, PK)
- `productId` (String, FK)
- `externalJobPresetNo` (Int) - WowPress jobpresetno
- `jobPreset` (String) - 프리셋명
- `prsjobList` (JSONB) - 인쇄 작업 리스트
- `reqColor` (JSONB, nullable)
- `rstPaper` (JSONB, nullable)
- `rstAwkjob` (JSONB, nullable)

**ProductPostProcess**: 후가공 정보
- `id` (String, PK)
- `productId` (String, FK)
- `coverCd` (Int)
- `inputType` (String) - checkbox/radio
- `jobGroupList` (JSONB) - 후가공 그룹 계층 전체 (깊은 중첩 구조)

**ProductOrderQty**: 주문수량 정보
- `id` (String, PK)
- `productId` (String, FK)
- `displayType` (String) - select/input
- `jobPresetNo` (Int, nullable) - 조합형 기준
- `sizeNo` (Int, nullable)
- `paperNo` (Int, nullable)
- `optNo` (Int, nullable)
- `colorNo` (Int, nullable)
- `colorNoAdd` (Int, nullable)
- `minQty` (Decimal)
- `maxQty` (Decimal)
- `interval` (Decimal, nullable)
- `qtyList` (Decimal[], nullable) - select형 수량 리스트

**PricingTable**: 가격표
- `id` (String, PK)
- `productId` (String, FK)
- `jobPresetNo` (Int, nullable)
- `sizeNo` (Int, nullable)
- `paperNo` (Int, nullable)
- `colorNo` (Int, nullable)
- `colorNoAdd` (Int, nullable)
- `optNo` (Int, nullable)
- `quantity` (Decimal)
- `unitPrice` (Decimal) - 단가
- `totalPrice` (Decimal) - 총가

**DeliveryInfo**: 배송 정보
- `id` (String, PK)
- `productId` (String, FK)
- `freeShipping` (JSONB) - 회원등급별 무료배송 조건
- `methods` (JSONB) - 배송방법 리스트 + 지역별 비용
- `regions` (JSONB) - 배송 가능 지역

### 4.2 옵션 엔진 인터페이스

```
// 옵션 선택 상태를 나타내는 타입
interface OptionSelection {
  productId: string;
  jobPresetNo?: number;
  sizeNo?: number;
  paperNo?: number;
  optNo?: number;
  colorNo?: number;
  colorNoAdd?: number;
  coverCd: number;
  quantity?: number;
  awkjobSelections?: AwkjobSelection[];
}

// 옵션 엔진 응답
interface AvailableOptions {
  sizes: SizeOption[];
  papers: PaperOption[];
  colors: ColorOption[];
  printMethods: PrintMethodOption[];
  options: ProductOption[];
  postProcesses: PostProcessGroup[];
  quantities: QuantityOption;
  constraints: ConstraintViolation[];
}

// 제약 조건 위반 정보
interface ConstraintViolation {
  type: 'required' | 'restricted';
  source: string;  // 제약 발생 원인 옵션
  target: string;  // 제약 대상 옵션
  message: string;
}
```

### 4.3 제약 조건 평가 알고리즘

```
1. 사용자가 기준정보를 선택한다
2. 선택된 기준정보의 req_* 조건을 수집한다
   -> 필수 활성화 대상 목록 생성
3. 선택된 기준정보의 rst_* 조건을 수집한다
   -> 비활성화 대상 목록 생성
4. 하위 우선순위 기준정보 목록을 필터링한다
   a. 전체 옵션에서 rst_* 대상을 제거
   b. req_* 대상이 있으면 해당 옵션만 포함
5. 필터링된 결과를 반환한다
6. 현재 선택이 제약 위반인지 검증한다
   -> ConstraintViolation[] 반환
```

### 4.4 추적성 태그

| TAG | 관련 요구사항 | 구현 위치 |
|-----|-----------|---------|
| TAG-DB-SCHEMA | R-DB-001~003 | prisma/schema.prisma |
| TAG-API-SYNC | R-API-001~004 | apps/api/src/services/wowpress-sync.service.ts |
| TAG-OPT-ENGINE | R-OPT-001~008 | packages/pricing-engine/src/constraints/ |
| TAG-PRC-CALC | R-PRC-001~005 | packages/pricing-engine/src/calculator.ts |
| TAG-WDG-CONFIG | R-WDG-001~003 | apps/api/src/services/widget.service.ts |

---

문서 버전: 1.0.0

---

## 구현 완료 (Implementation Notes)

### 구현 상태

완료 (2026-02-22)

### 구현된 파일 목록

#### 공유 패키지 (`packages/shared`)

| 파일 | 설명 |
|------|------|
| `src/types/print-product.ts` | DB 모델 타입 10종 |
| `src/types/option-types.ts` | 옵션 엔진 입출력 타입 |
| `src/types/pricing-types.ts` | 가격/배송 타입 |
| `src/types/constraint-types.ts` | req_* / rst_* 제약 조건 타입 15종 |
| `src/schemas/wowpress-raw.schema.ts` | WowPress JSON Zod 스키마 9종 |
| `src/parsers/catalog-parser.ts` | WowPress 카탈로그 파서 |

#### 가격 엔진 패키지 (`packages/pricing-engine`)

| 파일 | 설명 |
|------|------|
| `src/option-engine.ts` | 옵션 우선순위 체인 엔진 |
| `src/cover-handler.ts` | pjoin=0/1 표지 처리기 |
| `src/quantity-resolver.ts` | common/combination 수량 해석기 |
| `src/non-standard-handler.ts` | 비정형 규격 검증기 |
| `src/calculator.ts` | 비선형 가격 계산기 |
| `src/delivery-calculator.ts` | 배송비 계산기 |
| `src/constraints/requirement-parser.ts` | req_* 7종 파서 |
| `src/constraints/restriction-parser.ts` | rst_* 8종 파서 |
| `src/constraints/size-constraint.ts` | 규격 필터링 및 평가 |
| `src/constraints/paper-constraint.ts` | 용지 필터링 및 평가 |
| `src/constraints/color-constraint.ts` | 색상 필터링 및 평가 |
| `src/constraints/print-method-constraint.ts` | 인쇄방식 필터링 및 평가 |
| `src/constraints/post-process-constraint.ts` | 후가공 필터링/평가 + 상호 배제 |

#### 데이터베이스

| 파일 | 설명 |
|------|------|
| `prisma/schema.prisma` | PostgreSQL 스키마 (모델 10개) |
| `prisma/seed.ts` | 카탈로그 벌크 시드 |

### 테스트 결과

- 총 **309개** 테스트 통과
- TypeScript 컴파일 에러 **0건**
- 테스트 프레임워크: Vitest 3.x

### 주요 발산 사항 (SPEC 대비)

1. **PostProcessEvaluator 클래스 도입**: SPEC에 명시되지 않았으나, 후가공 제약 조건의 복잡도(4종 req + 6종 rst + 상호 배제 규칙)로 인해 `post-process-constraint.ts`에 별도 `PostProcessEvaluator` 클래스를 도입하였다.

2. **DeliveryCalculator 별도 파일 분리**: 배송비 계산 로직을 `calculator.ts`와 분리하여 `delivery-calculator.ts`로 독립 모듈화하였다. 독립적 테스트 가능성 및 유지보수성 향상이 목적이다.

3. **Zod 스키마 passthrough() 적용**: WowPress 카탈로그 JSON의 실제 데이터에 문서화되지 않은 필드가 다수 포함되어 있어, Zod 스키마에 `.passthrough()`를 적용하여 유연하게 처리하였다. 이로 인해 스키마 검증의 엄격성이 다소 완화되었다.

4. **파싱 제외 상품 3개**: 오류 응답(HTTP 에러 또는 비정상 JSON 구조)을 반환하는 상품 ID 40078, 40089, 40297은 카탈로그 파서에서 자동으로 제외된다. 전체 326개 상품 중 이 3개를 제외한 323개가 실제 파싱 대상이다.
작성일: 2026-02-22
