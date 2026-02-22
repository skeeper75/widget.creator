# SPEC-SHOPBY-002: Shopby 상품 등록 및 옵션 연동

---

## 메타데이터

| 항목 | 값 |
|------|------|
| SPEC ID | SPEC-SHOPBY-002 |
| 제목 | Shopby 상품 등록 및 옵션 연동 |
| 생성일 | 2026-02-22 |
| 상태 | Planned |
| 우선순위 | Critical |
| 담당 | expert-backend |
| 관련 SPEC | SPEC-DATA-001 (인쇄 지식 DB), SPEC-SHOPBY-001 (API 매핑) |
| 단계 | Phase 1 - 분석 및 설계 |

---

## 1. 환경 (Environment)

### 1.1 프로젝트 컨텍스트

SPEC-DATA-001에서 구축한 인쇄 지식 데이터베이스(323개 상품, 옵션 엔진, 가격 엔진)의 데이터를 Shopby mallProduct 형태로 변환하여 등록하는 자동화 시스템을 구축한다. 인쇄 상품 특유의 복잡한 옵션 체계(규격x용지x도수x수량x후가공)를 Shopby의 옵션 시스템(COMBINATION/REQUIRED/STANDARD)으로 매핑한다.

### 1.2 Shopby 상품 구조

- **mallProduct**: 상품 기본 정보 (상품명, 설명, 이미지, 가격)
- **options**: 3가지 유형
  - COMBINATION: 조합형 옵션 (규격x용지 등 조합별 재고/가격)
  - REQUIRED: 필수 선택 옵션 (양면/단면 등)
  - STANDARD: 일반 옵션
- **optionInputs**: 구매자작성형 입력 (텍스트, 파일 URL 등)
- **extraJson**: 임의 JSON 저장 (위젯 설정 데이터용)
- **addPrice**: 옵션별 추가 금액 (정적)

### 1.3 기술 환경

- **Shopby Admin API**: POST /products (상품 등록), PUT /products/{productNo} (상품 수정)
- **Widget Creator DB**: PostgreSQL 16.x + Prisma 6.x (SPEC-DATA-001 스키마)
- **배치 처리**: Node.js Worker Threads 또는 Bull Queue
- **검증**: Zod 3.x (Shopby 요청 페이로드 검증)

---

## 2. 가정 (Assumptions)

### 2.1 기술적 가정

- A1: Shopby Admin API를 통해 상품을 프로그래밍 방식으로 등록할 수 있다
- A2: COMBINATION 옵션은 최대 3단계 (옵션1 x 옵션2 x 옵션3) 조합을 지원한다
- A3: 옵션 조합 수에 상한이 존재할 수 있다 (확인 필요, SPEC-SHOPBY-001에서 조사)
- A4: extraJson 필드에 저장 가능한 데이터 크기 제한이 있을 수 있다

### 2.2 비즈니스 가정

- A5: 초기 MVP에서는 명함, 스티커, 전단, 책자 4개 카테고리를 우선 등록한다
- A6: 인쇄 상품의 가격은 옵션 조합별 고정가(addPrice)로 등록하되, 위젯에서는 동적 가격을 별도 표시한다
- A7: 하나의 Shopby 상품이 하나의 Widget Creator PrintProduct에 대응한다

### 2.3 데이터 가정

- A8: SPEC-DATA-001의 323개 파싱된 상품 중 MVP 대상은 약 20-50개이다
- A9: 각 상품의 옵션 조합 수는 수십에서 수만 건까지 다양하다

---

## 3. 요구사항 (Requirements)

### 3.1 상품 등록 자동화

**R-PRD-001** [이벤트]: **WHEN** 관리자가 Widget Creator에서 인쇄 상품의 Shopby 등록을 요청하면, **THEN** 시스템은 PrintProduct 데이터를 Shopby mallProduct 형식으로 변환하고 Admin API를 통해 자동 등록한다.

변환 대상:
- 상품명, 설명, 카테고리
- 판매가 (기본가 = 최소 옵션 조합 가격)
- 상품 이미지 (대표 이미지, 상세 이미지)
- 상품 상세 HTML (위젯 임베딩 코드 포함)
- 배송 설정 (delivery template 연결)

### 3.2 옵션 매핑

**R-PRD-002** [유비쿼터스]: 시스템은 **항상** Widget Creator의 인쇄 옵션 체인(규격x수량x용지)을 Shopby COMBINATION 옵션으로 정확히 매핑해야 한다.

매핑 전략:
- 옵션1 (COMBINATION): 규격 (예: 90x50mm, A4, A5)
- 옵션2 (COMBINATION): 용지 (예: 스노우화이트 250g, 아르떼 300g)
- 옵션3 (COMBINATION): 수량 (예: 100매, 200매, 500매)
- 각 조합에 addPrice 설정 (= Widget Creator 가격 엔진 계산 결과)

인쇄방식, 도수, 후가공 등 추가 옵션:
- REQUIRED 옵션: 양면/단면, 도수 선택
- STANDARD 옵션: 후가공 (코팅, 오시, 미싱 등)
- 위젯에서 상세 옵션 선택 후 optionInputs로 전달

### 3.3 위젯 설정 데이터 저장

**R-PRD-003** [유비쿼터스]: 시스템은 **항상** Shopby 상품의 extraJson 필드에 Widget Creator 위젯 연동에 필요한 설정 데이터를 저장해야 한다.

extraJson 스키마:
```json
{
  "widgetCreator": {
    "version": "1.0.0",
    "productId": "wc-product-uuid",
    "widgetId": "widget-uuid",
    "optionEngineConfig": {
      "priorityChain": ["jobpresetno", "sizeno", "paperno", "optno", "colorno"],
      "pjoin": 0,
      "coverCodes": [0]
    },
    "priceSource": "widget",
    "features": ["fileUpload", "dynamicPricing", "previewImage"]
  }
}
```

### 3.4 구매자작성형 입력 옵션

**R-PRD-004** [유비쿼터스]: 시스템은 **항상** Shopby 상품에 구매자작성형 입력 옵션(optionInputs)을 설정하여, 고객이 파일 업로드 URL과 특수 인쇄 요청사항을 입력할 수 있도록 해야 한다.

입력 항목:
- 디자인 파일 URL (필수): 위젯에서 업로드한 파일의 접근 URL
- 인쇄 사양 JSON (필수): 위젯에서 선택한 전체 옵션 사양 (JSON 문자열)
- 특수 요청사항 (선택): 고객 자유 입력 텍스트
- 시안 확인 여부 (선택): 시안 확인 후 제작 진행 여부

### 3.5 상품 카테고리 체계

**R-PRD-005** [유비쿼터스]: 시스템은 **항상** 인쇄 상품 유형에 맞는 Shopby 카테고리 체계를 구성하고 유지해야 한다.

카테고리 체계:
- 1depth: 인쇄물
  - 2depth: 명함, 스티커/라벨, 전단/리플렛, 책자/카탈로그, 봉투/서류, 포스터/배너
  - 3depth (예시): 명함 > 일반명함, 고급명함, 수입지명함

### 3.6 가격 전략

**R-PRD-006** [이벤트]: **WHEN** 상품을 Shopby에 등록할 때, **THEN** 시스템은 옵션 조합별 고정가(addPrice)와 위젯 동적 가격을 병행하는 이중 가격 전략을 적용해야 한다.

이중 가격 전략:
- Shopby 측: 옵션 조합별 addPrice = Widget Creator 가격 엔진의 기본 계산 결과 (부가세 포함)
- 위젯 측: 실시간 동적 가격 = 옵션 엔진 + 가격 엔진 + 후가공 + 배송비
- 주문 시: 위젯 계산 가격이 최종 가격으로 사용 (optionInputs에 가격 정보 포함)
- 검증: 위젯 가격과 Shopby 옵션 가격의 차이가 허용 범위(10%) 내인지 검증

---

## 4. 사양 (Specifications)

### 4.1 상품 등록 자동화 도구 인터페이스

```
// 상품 등록 요청
interface ShopbyProductRegistration {
  wcProductId: string;         // Widget Creator 상품 ID
  shopbyProductData: {
    productName: string;
    salePrice: number;         // 기본 판매가 (최저 옵션 조합 가격)
    categoryNo: number;        // Shopby 카테고리 번호
    content: string;           // 상품 상세 HTML (위젯 임베드 코드 포함)
    options: ShopbyCombinationOption[];
    optionInputs: ShopbyOptionInput[];
    extraJson: WidgetCreatorExtraJson;
    deliveryTemplateNo: number;
  };
}

// COMBINATION 옵션
interface ShopbyCombinationOption {
  optionName1: string;  // 규격
  optionValue1: string; // 90x50mm
  optionName2?: string; // 용지
  optionValue2?: string; // 스노우화이트 250g
  optionName3?: string; // 수량
  optionValue3?: string; // 100매
  addPrice: number;     // 추가 금액
  stockCnt: number;     // 재고 (인쇄물은 주문생산이므로 99999)
}

// 구매자작성형 입력
interface ShopbyOptionInput {
  inputLabel: string;
  inputType: 'TEXT' | 'TEXTAREA';
  required: boolean;
}
```

### 4.2 가격 매핑 알고리즘

```
1. Widget Creator 가격 엔진에서 옵션 조합별 가격 조회
2. 기본 판매가(salePrice) = 최소 조합 가격
3. 각 조합의 addPrice = 해당 조합 가격 - 기본 판매가
4. 조합 수가 Shopby 한도를 초과하는 경우:
   a. 대표 조합만 등록 (인기 규격 x 인기 용지 x 주요 수량)
   b. 나머지 조합은 위젯에서만 선택 가능
   c. 주문 시 optionInputs로 정확한 사양/가격 전달
5. 위젯 동적 가격이 Shopby 옵션 가격과 10% 이상 차이나면 경고
```

### 4.3 배치 등록 프로세스

```
1. 등록 대상 상품 목록 선택 (카테고리별 필터링)
2. 각 상품에 대해:
   a. PrintProduct → mallProduct 변환
   b. 옵션 체인 → COMBINATION/REQUIRED/STANDARD 옵션 변환
   c. 가격 엔진 결과 → addPrice 매핑
   d. 위젯 설정 → extraJson 생성
   e. 구매자작성형 → optionInputs 생성
3. Shopby Admin API 호출 (Rate Limit 고려한 간격 설정)
4. 등록 결과 저장 (Shopby productNo ↔ WC productId 매핑)
5. 실패 건 재시도 (최대 3회)
6. 등록 결과 리포트 생성
```

### 4.4 위험 분석

| 위험 | 영향도 | 발생 확률 | 대응 전략 |
|---|---|---|---|
| 옵션 조합 수 초과 (Shopby 한도) | High | High | 대표 조합만 등록, 나머지는 위젯 전용 |
| addPrice 계산 불일치 | Medium | Medium | 가격 검증 로직 + 정기 동기화 |
| extraJson 크기 제한 | Medium | Low | 핵심 설정만 저장, 상세는 WC API 조회 |
| 상품 이미지 업로드 실패 | Low | Medium | 재시도 + 기본 이미지 대체 |
| 카테고리 번호 변경 | Low | Low | 카테고리 매핑 테이블 관리 |

---

## 5. 추적성 태그 (Traceability)

| TAG | 관련 요구사항 | 구현 위치 (예상) |
|---|---|---|
| TAG-PRD-REG | R-PRD-001 | apps/api/src/services/shopby-product.service.ts |
| TAG-PRD-OPT | R-PRD-002 | apps/api/src/mappers/option-mapper.ts |
| TAG-PRD-EXTRA | R-PRD-003 | apps/api/src/mappers/extra-json-mapper.ts |
| TAG-PRD-INPUT | R-PRD-004 | apps/api/src/mappers/option-input-mapper.ts |
| TAG-PRD-CAT | R-PRD-005 | apps/api/src/services/shopby-category.service.ts |
| TAG-PRD-PRICE | R-PRD-006 | apps/api/src/services/shopby-price-mapper.service.ts |

---

문서 버전: 1.0.0
