---
name: innojini-wowpress
description: >
  WowPress API 기반 인쇄 도메인 지식 참조 스킬. 한국 인쇄 서비스 WowPress의 326개 상품/47개 카테고리
  데이터를 통해 인쇄 옵션 구조(규격/지질/도수/후가공), req_*/rst_* 제약 체계, 선택 순서 의존성 등
  인쇄 업계 실제 패턴을 이해하고 학습하는 데 활용. HuniPrinting DB 설계나 코드 구현 시
  실제 인쇄 도메인이 어떻게 동작하는지 파악하기 위한 참조 소스로 사용.
  Use when designing HuniPrinting DB, implementing printing options/constraints,
  understanding Korean printing industry domain knowledge, or building printing estimator logic.
license: Apache-2.0
compatibility: Designed for Claude Code - widget.creator project
user-invocable: false
metadata:
  version: "2.1.0"
  category: "domain"
  status: "active"
  updated: "2026-02-27"
  tags: "wowpress, printing, api, constraint, req, rst, 도메인 참조, 인쇄 지식, 견적"
  related-skills: "innojini-huni-db-schema, innojini-printing-foundation, innojini-huni-printing-estimator"

# MoAI Extension: Progressive Disclosure
progressive_disclosure:
  enabled: true
  level1_tokens: 130
  level2_tokens: 5000

# MoAI Extension: Triggers
triggers:
  keywords: ["wowpress", "WowPress", "req_", "rst_", "prodno", "prod_info",
             "인쇄 도메인", "도메인 참조", "옵션 제약", "constraint pattern",
             "326개 상품", "카탈로그", "카테고리 매칭", "견적", "인쇄 주문", "인쇄API",
             "awkjobinfo", "paperinfo", "sizeinfo", "colorinfo",
             "인쇄 옵션 구조", "후가공 제약", "지질 제약"]
  agents: ["expert-backend", "manager-spec", "team-backend-dev", "team-architect"]
  phases: ["plan", "run"]
---

# innojini-wowpress

Wowpress API(https://devshop.wowpress.co.kr)를 분석하여 자동화된 인쇄 주문 견적 시스템을 지원하는 스킬입니다.

## Quick Start

### 기본 사용법

사용자가 인쇄 상품에 대해 문의하면 이 스킬이 자동으로 활성화됩니다:

- "사각스티커 1000장 견적 알려줘"
- "명함 200개 가격이 얼마야?"
- "무선책자 100부 제본비가?"

### 카탈로그 구조

```
ref/wowpress/
├── catalog/
│   ├── index.json       # 메인 카탈로그 인덱스 (326개 상품, 47개 카테고리)
│   ├── categories/*.json (47개 카테고리 파일)
│   └── products/*.json  (326개 상품 파일)
```


### 주요 카테고리

| 카테고리 | 상품 수 | 설명 |
|---------|--------|------|
| 명함 > 후가공명함 | 13개 | 레이저마킹, 패턴, 엠보싱 등 후가공 명함 |
| 명함 > 디지털명함 | 2개 | 디지털 인디고/AP 명함 |
| 스티커 > 사각스티커 | 12개 | 가성비, 소량, 탈부착, 강접, 방수 스티커 |
| 스티커 > 도무송스티커 | 15개 | 도무송 형태 스티커 다양 |
| 책자 | 6개 | 무선, 중철, 윤전 책자 (templated pricing) |

---

## 상세 정보

### API 데이터 구조

#### 카테고리 구조

```json
{
  "id": "cat-916c01a6",
  "slug": "스티커-사각스티커-01a6",
  "path": ["스티커", "사각스티커"],
  "displayName": "스티커 > 사각스티커",
  "productCount": 12,
  "keywords": ["스티커", "사각스티커", "가성비스티커", "사각", ...],
  "summary": "스티커 > 사각스티커 · 12개 상품",
  "pricing": {
    "templated": 0,
    "quoted": 0
  }
}
```

#### 상품 구조

```json
{
  "productId": 40007,
  "meta": {
    "name": "가성비스티커(사각)",
    "slug": "가성비스티커-사각-40007",
    "keywords": ["스티커", "사각스티커", "가성비스티커", "사각", ...],
    "useCases": ["sticker", "label"],
    "fileTypes": ["AI", "EPS", "JPG", "PNG", "CDR", "PSD", "SIT", "ZIP", "ALZ", "PDF"],
    "unit": "매"
  },
  "delivery": {
    "cutoffTime": null,
    "prepayRequired": true,
    "group": {"id": 1, "name": "명함,스티커 묶음"}
  },
  "options": {
    "orderQuantities": [{...}],
    "coverTypes": [{...}],
    "materialPapers": [{...}],
    "printOptions": [{...}],
    "jobOptions": [{...}],
    "sizes": [{...}],
    "outputFiles": [{...}]
  }
}
```

### 카테고리 매칭 예시

```python
# 사용자 쿼리: "사각스티커 1000장 인쇄"
query = "사각스티커 1000장 인쇄"
keywords = extract_keywords(query)  # ["사각스티커", "1000"]

# 카테고리 검색
matched_category = search_by_keywords(["스티커", "사각"])
# 결과: cat-916c01a6 (스티커 > 사각스티커)

# 상품 목록
products = [
  "가성비스티커(사각)",  # productId: 40007
  "소량스티커(사각)",     # productId: 40009
  "탈부착스티커(사각)",   # productId: 40011
  ...
]

# 수량 옵션 확인
orderQuantities = [500, 1000, 2000, ...]
# 1000은 유효한 수량
```

### 옵션 구조 이해

#### orderQuantities (주문 수량)

```python
# 일반 상품 (대량)
[500, 1000, 2000, 3000, 4000, 5000, 6000, 8000, 10000, ...]

# 소량 상품
[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 200, 300]
```

#### pricingType (가격 유형)

| 유형 | 설명 | 상품 수 |
|------|------|--------|
| templated | 사전 정의된 가격표 제공 | 6개 (책자) |
| quoted | 실시간 견적 필요 | 0개 |

---

## Wowpress API 엔드포인트 및 구조

### API Endpoints

| 엔드포인트 | 설명 | 메서드 |
|-----------|------|--------|
| `/api/v1/std/prod_info/{prodno}` | 제품 상세정보 조회 | GET |
| `/api/v1/ord/cjson_jobcost` | 단가 조회 | POST |

### Wowpress 주문 API 데이터 구조

#### 제품 상세 JSON 구조

```json
{
  "prodno": 40007,
  "prodname": "가성비스티커(사각)",
  "unit": "매",
  "ctptime": null,
  "dlvyprepay": false,

  // 1. 커버 구성정보 (표지/내지/간지)
  "coverinfo": [
    {
      "covercd": 0,  // 0:통합, 1:표지, 2:내지, 3:간지
      "covername": "통합",
      "pagelist": [
        {
          "pagecd": 0,  // 0:양면, 1:전면, 2:후면
          "pagename": "양면",
          "pagecnt": {"min": null, "max": null, "interval": null}
        }
      ]
    }
  ],

  // 2. 수량정보 (주문 가능 수량)
  "ordqty": [
    {
      "jobpresetno": 1,  // 인쇠 프리셋 번호 (우선순위 1)
      "sizeno": 101,       // 규격 번호 (우선순위 2)
      "paperno": 201,      // 지류 번호 (우선순위 3)
      "optno": 301,         // 옵션 번호 (우선순위 4)
      "colorno": 401,       // 도수 번호 (우선순위 5)
      "ordqtylist": [500, 1000, 2000, 3000, ...]  // 주문 가능 수량 리스트
    }
  ],

  // 3. 규격정보 (사이즈, 도련, 컷사이즈)
  "sizeinfo": [
    {
      "sizeno": 101,
      "sizename": "90 x 50 mm",
      "width": 90,
      "height": 50,
      "cutsize": 100,
      "non_standard": false,

      // 비규격 입력 요구사항
      "req_width": {"type": "input", "unit": "mm", "min": 10, "max": 300},
      "req_height": {"type": "input", "unit": "mm", "min": 10, "max": 300},

      // 후가공 요구사항
      "req_awkjob": [
        {"unit": "mm", "min_area": 1000, "min_sum_wh": 100}
      ]
    }
  ],

  // 4. 지류정보 (용지 선택)
  "paperinfo": [
    {
      "paperno": 201,
      "papername": "모조 80g",
      "paptergroup": "일반 인쇄",
      "gram": 80,

      // 지류+가로크기 요구사항
      "req_width": {"type": "select", "options": ["평방지", "국전", "특별"]},
      "req_height": {"type": "input", "unit": "mm"},

      // 후가공 요구사항
      "req_awkjob": [
        {"colorno": 401, "jobname": "코팅", "type": "checkbox"}
      ],

      // 제약사항
      "rst_prsjob": [
        {"jobpresetno": 1, "jobname": "오프셋 디지털"}
      ]
    }
  ],

  // 5. 도수정보 (인쇄도수, 추가도수)
  "colorinfo": [
    {
      "covercd": 0,  // 통합
      "pagelist": [
        {
          "pagecd": 0,  // 양면
          "colorlist": [
            {"colorno": 401, "colorname": "단면4도", "pdfpage": 1}
          ]
        }
      ],

      // 추가도수 (도면별 선택 가능)
      "addtype": "select",  // select, checkbox
      "coloraddlist": [
        {"colorno": 402, "colorname": "코팅", "pdfpage": 1}
      ]
    }
  ],

  // 6. 인쇄정보 (인쇄방식, 작업번호)
  "prsjobinfo": [
    {
      "jobpresetno": 1,  // 인쇠 프리셋 번호
      "jobpreset": "일반합판",
      "prsjoblist": [
        {
          "jobno": 101,
          "jobname": "오프셋 디지털",
          "unit": "면"
        }
      ]
    }
  ],

  // 7. 후가공정보 (재단, 접지, 제본, 박 등)
  "awkjobinfo": [
    {
      "covercd": 0,  // 통합
      "type": "checkbox",  // radio, select, checkbox

      "joblist": [
        {
          "jobno": 501,
          "jobname": "재단",
          "unit": "회",
          "req_jobsize": {
            "type": "input",
            "unit": "mm",
            "req": "1cut 2 또는 2cut 4"
          }
        }
      ]
    }
  ],

  // 8. 배송정보 (무료배송, 배송방법, 배송지역)
  "deliverinfo": {
    "dlvyfree": [
      {
        "usrkd": "VIP",
        "mincost": 50000  // 5만원 이상 무료배송
      }
    ],

    "dlvymcdlist": [
      {
        "dlvymcd": "배쑝와쑝",
        "costinit": 3000,
        "dlvyloc": [
          {
            "sd": "서울",
            "sgglist": ["강남", "강동", "강서울", "관악", "광진", "구로", "금천"],
            "costadd": 0
          }
        ]
      }
    ],

    "dlvyloc": [
      {
        "sd": "서울",
        "sgglist": ["강남", "강동", "강서울", "관악", "광진", "구로", "금천"]
      }
    ]
  }
}
```

### JSON Path 명칭 규칙

| Path | 설명 |
|------|------|
| `$.covercd` | 표지/내지 구분 코드 (0:통합, 1:표지, 2:내지, 3:간지) |
| `$.pagecd` | 전면/후면 구분 코드 (0:양면, 1:전면, 2:후면) |
| `$.req_*` | 요구사항 (기준정보 [+] 선택 시 생산 가능) |
| `$.rst_*` | 제약사항 (기준정보 [+] 선택 시 생산 불가) |

### 기준정보 설정 우선순위

```
1. jobpresetno (인쇠방식 프리셋)
2. sizeno (인쇄규격)
3. paperno (지류)
4. optno (옵션)
5. colorno (도수)
```

### PDF 파일 요구사항 (인쇄용 PDF)

#### 필수 조건
- **컬러 모드**: CMYK (RGB 파일 변환 오류 방지)
- **폰트**: 모든 폰트 임베드 (아웃라인, 트루타입 사용 금지)
- **트리밍**: 트리밍 여부 있어야 함
- **도련**: 도련 여부가 있어야 함 (100% black)
- **압축**: 압축 없어야 함 (비율롤 금지)
- **폰트 크기**: 7pt 이상 (본문 텍스트)

#### 권장 사항
- **버전**: PDF 1.4 이상
- **압축**: 비손실 압축
- **투명 배경**: 투명 배경 없음
- **레이어**: 레이어를 사용하지 않고 투명하게 저장
- **페이지 단일**: 단일 페이지 PDF (여러 페이지 시 병합 금지)

#### 파일 검증
```python
# PDF 검증 스크립 예시
def validate_printing_pdf(pdf_path):
    """인쇄용 PDF 표준 준수 확인"""
    import fitz

    doc = fitz.open(pdf_path)

    # 1. 컬러 모드 확인
    for page in doc:
        if "/Color" not in page.get_content_stream():
            return False, "RGB 감지 - CMYK로 변환 필요"

    # 2. 폰트 임베드 확인
    for page in doc:
        for font in page.get_fonts():
            if "subset" in font or font["flags"] & 4:  # 4 = embedded subset
                return False, "폰트 서브셋 임베드 필요"

    # 3. 트리밍 확인
    for page in doc:
        if page.get_cropbox() != page.rect:
            return False, "트리밍 영역 존재"

    # 4. 도련 여부 확인
    for page in doc:
        for img in page.get_images():
            if img.colorspace.name != "DeviceGray":
                return False, "그레이스케일이 아님 CMYK 필요"

    return True, "PDF 표준 준수"
```

---

## 인쇄 용어 사전 (한국어)

| 용어 | 영어 | 설명 |
|------|------|------|
| 판수 (pansu) | Sheets per layout | 조판 계산 |
| 블리드 (bleed) | Bleed margin | 재단 여유분 |
| 작업사이즈 | Work size | 제작 사이즈 |
| 재단사이즈 | Trim size | 완성 사이즈 |
| 합판 (gabpan) | Gang run | 여러 작업을 한 판에 배치 |
| 독판 (dokpan) | Solo run | 한 판에 단일 작업 |
| 후가공 | Post-processing | 재단, 접지, 제본 등 |

---

## 사용 워크플로우

### 워크플로우 1: 카탈로그 분석

```bash
# 모든 카테고리와 상품 파싱
python scripts/parse_catalog.py ref/wowpress/catalog/

# 출력: category_summary.json, product_summary.json
```

### 워크플로우 2: 상품 매칭

```python
# 사용자 쿼리: "사각스티커 1000장"

# Step 1: 키워드 추출
keywords = extract_korean_keywords("사각스티커 1000장")
# ["사각스티커", "1000"]

# Step 2: 카테고리 검색
category = match_category(keywords)
# cat-916c01a6

# Step 3: 상품 목록
products = get_products(category)
# [40007, 40009, 40011, ...]

# Step 4: 수량 검증
is_valid_quantity(1000, products[40007].orderQuantities)
# True
```

### 워크플로우 3: 견적 생성

```python
# 필수 옵션 추출
quote = {
  "productId": 40007,
  "productName": "가성비스티커(사각)",
  "quantity": 1000,
  "size": "90 x 50 mm",
  "material": "모조 80g",
  "print": "단면 4도",
  "finishing": ["재단"]
}
```

---

---

## HuniPrinting 설계 시 WowPress 도메인 지식 활용

> WowPress는 한국 인쇄 업계 실제 상품 구성 패턴의 종합 참조 소스입니다.
> HuniPrinting DB를 설계하거나 인쇄 옵션 로직을 구현할 때, WowPress를 통해
> "실제 인쇄 업계에서는 어떤 옵션 조합이 가능한가", "어떤 제약이 존재하는가"를 파악하세요.
> 상세 도메인 지식 가이드: `ref/wowpress/knowledge/db-mapping-guide.md`

### WowPress로 이해하는 인쇄 도메인 핵심 패턴

#### 1. 옵션 선택 순서 의존성 (Selection Order Dependency)

WowPress는 옵션 선택에 명확한 우선순위가 있습니다:
```
1. jobpresetno (인쇄방식 프리셋) → 가장 먼저 결정
2. sizeno (규격)
3. paperno (지질)
4. optno (옵션)
5. colorno (도수)
```
→ **설계 시사점**: HuniPrinting DB의 `wb_recipe_option_bindings.sort_order`가 이 순서를 반영해야 합니다.

#### 2. req_* 패턴 (필수 연계 제약)

`req_*`는 "A를 선택하면 B도 반드시 선택해야 한다"는 패턴입니다:
- `sizeinfo[].req_width/height` → 비규격 사이즈 선택 시 가로/세로 치수 입력 필수
- `paperinfo[].req_awkjob` → 특정 지질 선택 시 후가공 필수
- `paperinfo[].req_color` → 특정 지질은 특정 도수만 가능
- `colorinfo[].req_paper` → 특정 도수 선택 시 지질 범위 제한

→ **설계 시사점**: HuniPrinting의 `wb_recipe_constraints` (ECA 패턴)로 이 관계를 표현합니다.

#### 3. rst_* 패턴 (불가 제약)

`rst_*`는 "A를 선택하면 B는 선택 불가"라는 패턴입니다:
- `paperinfo[].rst_prsjob` → 특정 지질은 특정 인쇄기 사용 불가
- `paperinfo[].rst_awkjob` → 특정 지질은 특정 후가공 불가
- `awkjobinfo[].rst_awkjob` → 후가공 상호 배제 (유광코팅 ↔ 무광코팅)
- `colorinfo[].rst_prsjob` → 특정 도수는 특정 인쇄기 불가

→ **설계 시사점**: HuniPrinting의 `wb_recipe_choice_restrictions` (Allow/Exclude)로 표현합니다.

---

## 연관 스킬

- **innojini-huni-db-schema**: HuniPrinting DB 테이블 구조 + 설계 원칙
- **innojini-printing-foundation**: 인쇄 산업 공통 기술 지식 (조판 계산, CTP 판수, 접지 배열)
- **innojini-mycom-printing-estimator**: 옵셋 인쇄 조판/견적 통합 시스템

---

## 참조 문서

자세한 내용은 references/ 디렉토리를 확인하세요:

- **api-structure.md**: 완전한 API 문서
- **category-mapping.md**: 카테고리 계층 구조와 키워드 매핑
- **quotation-workflow.md**: 종단 간 견적 프로세스
- **integration-guide.md**: huni-estimator 시스템 통합 가이드

---

Version: 1.0.0
Last Updated: 2026-01-19
