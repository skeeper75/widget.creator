# Wowpress API 구조 상세 문서

## 개요

Wowpress API는 한국 인쇄 서비스 제공자인 Wowpress(https://devshop.wowpress.co.kr)의 상품 카탈로그를 제공합니다.

- **기본 URL**: https://devshop.wowpress.co.kr
- **상품 수**: 326개
- **카테고리 수**: 47개
- **가격 유형**: templated(6개), quoted(0개)

## 카탈로그 인덱스 (index.json)

### 구조

```json
{
  "generatedAt": "2025-10-14T22:24:39.966Z",
  "source": "https://devshop.wowpress.co.kr",
  "productCount": 326,
  "categoryCount": 47,
  "pricingStats": {
    "templatedProducts": 6,
    "quotedProducts": 0
  },
  "categories": [...]
}
```

### 카테고리 객체

```json
{
  "id": "cat-916c01a6",
  "slug": "스티커-사각스티커-01a6",
  "path": ["스티커", "사각스티커"],
  "displayName": "스티커 > 사각스티커",
  "productCount": 12,
  "keywords": [
    "스티커",
    "사각스티커",
    "가성비스티커",
    "사각",
    "ai",
    "소량스티커",
    "탈부착스티커",
    "강접스티커",
    "방수스티커",
    "종이스티커",
    "소량스파클스티커",
    "소량레인보우스티커",
    "투명엠보싱스티커",
    "엠보싱금박스티커",
    "엠보싱은박스티커",
    "엠보싱홀로그램박스티커"
  ],
  "summary": "스티커 > 사각스티커 · 12개 상품",
  "file": "categories/cat-916c01a6.json",
  "sampleProducts": [
    {
      "productId": 40007,
      "name": "가성비스티커(사각)",
      "slug": "가성비스티커-사각-40007"
    }
  ],
  "pricing": {
    "templated": 0,
    "quoted": 0
  }
}
```

## 카테고리 파일 (categories/*.json)

카테고리 파일은 해당 카테고리에 속한 모든 상품의 요약 정보를 포함합니다.

### 구조

```json
{
  "category": {
    "id": "cat-916c01a6",
    "slug": "스티커-사각스티커-01a6",
    "path": ["스티커", "사각스티커"],
    "displayName": "스티커 > 사각스티커",
    "productCount": 12,
    "keywords": [...],
    "summary": "스티커 > 사각스티커 · 12개 상품",
    "pricing": {
      "templated": 0,
      "quoted": 0
    }
  },
  "products": [
    {
      "productId": 40007,
      "name": "가성비스티커(사각)",
      "slug": "가성비스티커-사각-40007",
      "categories": ["스티커", "사각스티커"],
      "keywords": [...],
      "useCases": ["sticker", "label"],
      "url": "https://devshop.wowpress.co.kr/prodt/40007",
      "fileTypes": ["AI", "EPS", "JPG", "PNG", "CDR", "PSD", "SIT", "ZIP", "ALZ", "PDF"],
      "delivery": {...},
      "orderQuantities": [...],
      "coverTypes": [...],
      "detailFile": "../products/40007.json",
      "pricing": {
        "hasTemplate": false,
        "status": "requires-configuration",
        "sampleQuote": null,
        "error": null
      }
    }
  ]
}
```

## 상품 파일 (products/*.json)

상품 파일은 개별 상품의 모든 옵션과 상세 정보를 포함합니다.

### 메타 정보

```json
{
  "productId": 40007,
  "fetchedAt": "2025-10-14T22:24:39.966Z",
  "categoryPath": ["스티커", "사각스티커"],
  "meta": {
    "name": "가성비스티커(사각)",
    "slug": "가성비스티커-사각-40007",
    "url": "https://devshop.wowpress.co.kr/prodt/40007",
    "keywords": [
      "스티커",
      "사각스티커",
      "가성비스티커",
      "사각",
      "ai",
      "eps",
      "jpg",
      "png",
      "cdr",
      "psd",
      "sit",
      "zip",
      "alz",
      "pdf"
    ],
    "useCases": ["sticker", "label"],
    "fileTypes": ["AI", "EPS", "JPG", "PNG", "CDR", "PSD", "SIT", "ZIP", "ALZ", "PDF"],
    "selType": "M",
    "unit": "매"
  }
}
```

### 배송 정보

```json
{
  "delivery": {
    "cutoffTime": null,
    "prepayRequired": true,
    "group": {
      "id": 1,
      "name": "명함,스티커 묶음"
    },
    "regions": []
  }
}
```

### 옵션 구조

```json
{
  "options": {
    "orderQuantities": [...],
    "coverTypes": [...],
    "materialPapers": [...],
    "printOptions": [...],
    "jobOptions": [...],
    "sizes": [...],
    "outputFiles": [...]
  }
}
```

## 옵션 타입 상세

### orderQuantities (주문 수량)

```json
{
  "type": "select",
  "values": [
    500, 1000, 2000, 3000, 4000, 5000, 6000, 8000, 10000,
    12000, 14000, 15000, 16000, 18000, 20000, 30000,
    40000, 50000, 60000, 70000, 80000, 90000, 100000
  ],
  "minimum": 500,
  "maximum": 100000,
  "interval": null,
  "materialPaperNo": null,
  "jobPresetNo": null,
  "sizeNo": null,
  "optionNo": null,
  "colorNo": null,
  "colorExtra": null
}
```

### coverTypes (표지 유형)

```json
{
  "code": 0,
  "name": "통합",
  "pages": [
    {
      "code": 0,
      "name": "양면"
    }
  ],
  "pageConstraints": {
    "min": null,
    "max": null,
    "interval": null
  }
}
```

## 가격 유형

| 유형 | 설명 | 상품 수 |
|------|------|--------|
| templated | 사전 정의된 가격표 제공 | 6개 (책자) |
| quoted | 실시간 견적 필요 | 0개 |

templated 가격을 가진 상품:
- 무선책자 (40196)
- 중철책자 (40198)
- 특가책자(무선) (40200)
- 윤전책자 (40201)
- 특가책자(스프링) (40433)
- PVC커버노트 (40615)

---

Version: 1.0.0
Last Updated: 2026-01-19
