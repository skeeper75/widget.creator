# Widget Creator - 시스템 아키텍처

## 시스템 개요

Widget Creator는 이커머스 쇼핑몰에 삽입 가능한 인쇄 주문 견적 위젯 플랫폼이다. 현재 구현된 SPEC-DATA-001은 위젯의 핵심 데이터 레이어인 **인쇄 지식 데이터베이스**와 **상품 옵션 엔진**을 제공한다.

## 패키지 의존 관계

```
apps/
  api/                     # (예정) REST API 서버
  widget/                  # (예정) 위젯 프론트엔드

packages/
  pricing-engine/          # @widget-creator/pricing-engine
      |
      v
  shared/                  # @widget-creator/shared
      |
      v
  zod, @prisma/client      # 외부 의존성

prisma/
  schema.prisma            # PostgreSQL 16 스키마
  seed.ts                  # WowPress 카탈로그 시드
```

## 옵션 엔진 알고리즘

### 우선순위 체인 (Priority Chain)

인쇄 상품의 옵션은 다음 우선순위 체인으로 연결된다. 상위 옵션 변경 시 하위 옵션이 모두 초기화된다.

```
Level 1: jobPresetNo  (기준정보/작업 프리셋)
    |
    v
Level 2: sizeNo       (규격)
    |
    v
Level 3: paperNo      (용지)
    |
    v
Level 4: optNo        (추가 옵션)
    |
    v
Level 5: colorNo      (색상)
    |
    v
Level 6: colorNoAdd   (추가 색상)
```

### getAvailableOptions 처리 흐름

```
입력: OptionSelection (현재 선택 상태)
  |
  v
[CoverHandler] coverCd에 따라 기본 옵션 세트 결정
  |  (pjoin=0: 통합 / pjoin=1: 분리)
  v
[제약 조건 수집]
  - 선택된 규격의 rst_paper  -> restrictedPapers 목록
  - 선택된 인쇄방식의 rst_color -> restrictedColors 목록
  |
  v
[각 레벨별 필터링 병렬 실행]
  filterSizesBySelection()      -> filteredSizes
  filterPapersBySelection()     -> filteredPapers  (restrictedPapers 적용)
  filterColorsBySelection()     -> filteredColors  (restrictedColors 적용)
  filterPrintMethodsBySelection()-> filteredPrintMethods
  PostProcessEvaluator.getAvailablePostProcesses() -> postProcesses
  |
  v
[QuantityResolver] 선택 상태에 따른 주문 수량 해석
  |
  v
[제약 위반 검증] 현재 선택이 필터링된 목록에 없으면 ConstraintViolation 생성
  |
  v
출력: AvailableOptions
  - sizes, papers, colors, printMethods, postProcesses, quantities, constraints
```

### 표지 분리 처리 (CoverHandler)

```
pjoin 값 확인
  |
  +-- 0: 통합 상품
  |     coverCd="cover"만 존재
  |     단일 옵션 세트로 처리
  |
  +-- 1: 분리 상품
        coverCd="cover": 표지 규격/용지/색상 세트
        coverCd="inner": 내지 규격/용지/색상 세트
        각각 독립적인 OptionSelection 관리
```

## 데이터베이스 스키마 개요

PostgreSQL 16 + Prisma 6 기반. JSONB 컬럼에 제약 조건(req_*/rst_*) 데이터를 저장한다.

### 모델 관계도

```
ProductCategory (47개)
    |
    | 1:N
    v
PrintProduct (326개)
    |
    +--1:N--> ProductSize        (규격별 req_width/req_height 포함)
    +--1:N--> ProductPaper       (용지별 rst_* 조건 포함)
    +--1:N--> ProductColor       (색상)
    +--1:N--> ProductPrintMethod (인쇄방식별 rst_paper 등 포함)
    +--1:N--> ProductPostProcess (후가공별 상호 배제 규칙 포함)
    +--1:N--> ProductOrderQty    (수량 구간 정의)
    +--1:N--> PricingTable       (수량x옵션 조합별 가격)
    +--1:1--> DeliveryInfo       (배송 방법 및 요금)
```

### 핵심 JSONB 필드

| 모델 | JSONB 필드 | 내용 |
|------|-----------|------|
| `ProductSize` | `constraints` | `req_width`, `req_height` (비정형 규격 범위) |
| `ProductPaper` | `constraints` | `rst_color`, `rst_prsjob` 등 |
| `ProductPrintMethod` | `constraints` | `rst_paper`, `req_awkjob` 등 |
| `ProductPostProcess` | `constraints` | `rst_awkjob`, 상호 배제 목록 |

## 데이터 흐름

### 시드 데이터 투입 흐름

```
ref/wowpress/catalog/
  *.json (원본 WowPress API 응답)
    |
    v
CatalogParser (packages/shared/src/parsers/catalog-parser.ts)
  - WowpressRawSchema로 파싱 (passthrough 허용)
  - 오류 응답 3개 제외 (40078, 40089, 40297)
  - 카테고리 계층 빌드
    |
    v
prisma/seed.ts
  - bulk upsert 방식으로 DB 투입
  - ProductCategory (47개)
  - PrintProduct + 하위 옵션 (323개)
    |
    v
PostgreSQL 16 (widget_creator DB)
```

### 런타임 옵션 조회 흐름

```
사용자 옵션 선택 이벤트 (UI)
    |
    v
API 서버 (apps/api, 예정)
  - DB에서 ProductData 조회 (캐시)
    |
    v
OptionEngine (packages/pricing-engine)
  - getAvailableOptions(selection)
    |
    v
응답: AvailableOptions
  - 유효한 옵션 목록
  - 제약 위반 정보
```

## 제약 조건 시스템

### req_* (필수 조건) - 7종

특정 옵션 선택 시 하위 옵션을 특정 값으로 강제한다.

| 조건명 | 동작 |
|--------|------|
| `req_paper` | 특정 용지만 선택 가능하도록 필터링 |
| `req_color` | 특정 색상만 선택 가능하도록 필터링 |
| `req_prsjob` | 특정 인쇄방식만 선택 가능하도록 필터링 |
| `req_awkjob` | 특정 후가공만 선택 가능하도록 필터링 |
| `req_ordqty` | 최소 주문 수량 하한 설정 |
| `req_width` | 비정형 규격 가로 최소/최대 범위 설정 |
| `req_height` | 비정형 규격 세로 최소/최대 범위 설정 |

### rst_* (제한 조건) - 8종

특정 옵션 선택 시 하위 옵션에서 특정 값을 제외한다.

| 조건명 | 동작 |
|--------|------|
| `rst_paper` | 해당 용지를 선택 불가 처리 |
| `rst_color` | 해당 색상을 선택 불가 처리 |
| `rst_prsjob` | 해당 인쇄방식을 선택 불가 처리 |
| `rst_awkjob` | 해당 후가공을 선택 불가 처리 |
| `rst_ordqty` | 주문 수량 상한 설정 |
| `rst_size` | 해당 규격을 선택 불가 처리 |
| `rst_opt` | 해당 옵션을 선택 불가 처리 |
| `rst_coloradd` | 추가 색상 선택 불가 처리 |

## 관련 문서

- [README.md](../README.md) - 프로젝트 개요 및 빠른 시작
- [packages/shared/README.md](../packages/shared/README.md) - 공유 패키지 상세
- [packages/pricing-engine/README.md](../packages/pricing-engine/README.md) - 가격 엔진 상세
- [.moai/specs/SPEC-DATA-001/spec.md](../.moai/specs/SPEC-DATA-001/spec.md) - SPEC 원문
