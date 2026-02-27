# Edicus Link ↔ MES 연동 설계

## 개요

Edicus Link는 Edicus 플랫폼과 외부 시스템(MES, ERP 등)을 연결하는 중계 레이어입니다.
이 문서는 MES와의 양방향 연동 설계를 다룹니다.

## 연동 아키텍처

```
┌──────────────┐                    ┌──────────────────┐                    ┌──────────────┐
│   Edicus     │    주문정보 Push    │   Edicus Link    │   상태/배송 Push   │     MES      │
│   Editor     │ ─────────────────▶ │    (중계 서버)    │ ◀───────────────── │   (후니)     │
│              │ ◀───────────────── │                  │ ─────────────────▶ │              │
│              │    상태/배송 표시   │                  │    품목정보 동기화  │              │
└──────────────┘                    └──────────────────┘                    └──────────────┘
```

## 데이터 흐름

### Phase 1: 주문 접수
```
1. 고객이 Edicus Editor에서 편집 완료 후 주문
2. Edicus Link가 MES의 POST /api/v1/orders/edicus 호출
3. MES에서 mes_order_id 생성 후 Response 반환
4. MES가 Edicus Link의 상태 API 호출 (status: RECEIVED)
```

### Phase 2: 생산 진행
```
1. MES에서 렌더링 파일 다운로드 (render_files URL 사용)
2. 상태 변경 시마다 Edicus Link 상태 API 호출
   CONFIRMED → FILE_READY → PRODUCING → PRODUCED
```

### Phase 3: 출하 및 배송
```
1. MES에서 출하 처리 시 배송 API 호출 (운송장 정보 전송)
2. 상태 API 호출 (status: SHIPPED)
3. Edicus Link에서 고객에게 배송 알림 발송
```

---

## API 명세

### 1. 주문 수신 API (Edicus → MES)

**MES에서 제공해야 하는 API**

```
POST /api/v1/orders/edicus
```

**Headers**
```
Content-Type: application/json
X-Edicus-API-Key: {발급받은 키}
```

**Request Body**
```json
{
  "edicus_order_id": "100023",
  "edicus_project_id": "-LiBngTbCFYNjcOVcxcY",
  "order_date": "2025-11-29T10:30:00Z",
  "customer": {
    "name": "홍길동",
    "phone": "010-1234-5678",
    "email": "hong@example.com"
  },
  "shipping_address": {
    "recipient": "홍길동",
    "phone": "010-1234-5678",
    "zip_code": "06234",
    "address1": "서울시 강남구 테헤란로 123",
    "address2": "456호",
    "memo": "부재시 경비실"
  },
  "items": [
    {
      "edicus_product_code": "90x50@NC",
      "mes_product_code": "NC-9050-001",
      "product_name": "명함 90x50",
      "quantity": 100,
      "unit_price": 150,
      "total_price": 15000,
      "options": {
        "paper": "스노우지 250g",
        "coating": "양면무광",
        "color": "4도/4도"
      },
      "render_files": [
        "https://storage.edicus.io/render/xxx_front.pdf",
        "https://storage.edicus.io/render/xxx_back.pdf"
      ],
      "preview_urls": [
        "https://storage.edicus.io/preview/xxx_01.jpg"
      ]
    }
  ],
  "payment": {
    "total_amount": 18000,
    "shipping_fee": 3000,
    "discount": 0,
    "paid_amount": 18000,
    "payment_method": "카드",
    "paid_at": "2025-11-29T10:35:00Z"
  }
}
```

**Response (성공)**
```json
{
  "success": true,
  "mes_order_id": "M2511290001",
  "received_at": "2025-11-29T10:35:05Z",
  "message": "주문 접수 완료"
}
```

**Response (에러)**
```json
{
  "success": false,
  "error_code": "DUPLICATE_ORDER",
  "message": "이미 등록된 주문입니다",
  "edicus_order_id": "100023"
}
```

### 2. 상태 업데이트 API (MES → Edicus)

**Edicus Link에서 제공해야 하는 API**

```
POST /api/v1/orders/{edicus_order_id}/status
```

**Headers**
```
Content-Type: application/json
X-MES-API-Key: {발급받은 키}
```

**Request Body**
```json
{
  "mes_order_id": "M2511290001",
  "status": "PRODUCING",
  "status_name": "생산중",
  "updated_at": "2025-11-29T14:00:00Z",
  "memo": "인쇄 진행중"
}
```

**상태 코드**
| status | status_name | 설명 |
|--------|-------------|------|
| RECEIVED | 주문접수 | MES에 주문 등록 완료 |
| CONFIRMED | 주문확정 | 결제 확인, 생산 대기 |
| FILE_READY | 파일준비완료 | 인쇄 파일 다운로드 완료 |
| PRODUCING | 생산중 | 인쇄/후가공 진행 중 |
| PRODUCED | 생산완료 | 제품 완성 |
| PACKING | 포장중 | 출하 준비 |
| SHIPPED | 발송완료 | 택배 발송됨 |
| DELIVERED | 배송완료 | 고객 수령 완료 |
| CANCELED | 취소 | 주문 취소 |
| HOLD | 보류 | 파일 오류/재작업 등 |

### 3. 배송정보 API (MES → Edicus)

**Edicus Link에서 제공해야 하는 API**

```
POST /api/v1/orders/{edicus_order_id}/shipping
```

**Request Body**
```json
{
  "mes_order_id": "M2511290001",
  "shipping_info": {
    "carrier": "CJ대한통운",
    "carrier_code": "CJ",
    "tracking_number": "123456789012",
    "tracking_url": "https://www.cjlogistics.com/...",
    "shipped_at": "2025-11-30T09:00:00Z",
    "estimated_delivery": "2025-12-02"
  },
  "packages": [
    {
      "box_no": 1,
      "tracking_number": "123456789012",
      "items": ["NC-9050-001"]
    }
  ]
}
```

**택배사 코드**
| carrier_code | carrier |
|--------------|---------|
| CJ | CJ대한통운 |
| HANJIN | 한진택배 |
| LOTTE | 롯데택배 |
| LOGEN | 로젠택배 |
| POST | 우체국택배 |

### 4. 품목 목록 API (MES 제공)

```
GET /api/v1/products?category={카테고리}&page={페이지}&limit={건수}
```

**Response**
```json
{
  "success": true,
  "data": {
    "total": 156,
    "page": 1,
    "limit": 50,
    "products": [
      {
        "mes_product_code": "NC-9050-001",
        "name": "명함 90x50 스노우지",
        "category": "명함",
        "sub_category": "일반명함",
        "size": "90x50mm",
        "options": {
          "papers": ["스노우지 250g", "아트지 300g"],
          "coatings": ["무광", "유광"],
          "colors": ["4도/4도", "4도/0도"]
        },
        "base_price": 150,
        "unit": "매",
        "min_qty": 100,
        "active": true
      }
    ]
  }
}
```

### 5. 품목 매핑 API

**등록/수정**
```
POST /api/v1/product-mappings
```

**Request Body**
```json
{
  "mappings": [
    {
      "edicus_product_code": "90x50@NC",
      "edicus_product_name": "명함 90x50",
      "mes_product_code": "NC-9050-001",
      "mes_product_name": "명함 90x50 스노우지",
      "option_mappings": {
        "paper": {
          "스노우지 250g": "SNOW250",
          "아트지 300g": "ART300"
        }
      }
    }
  ]
}
```

**조회**
```
GET /api/v1/product-mappings?edicus_code={코드}
```

---

## 품목 코드 매핑

### CustomField 요청사항

Edicus Link 품목 정보에 다음 CustomField 추가 필요:

| 필드명 | 타입 | 용도 |
|--------|------|------|
| mes_product_code | String(50) | MES 품목코드 |
| mes_product_name | String(100) | MES 품목명 (선택) |
| option_mapping | JSON | 옵션 매핑 정보 (선택) |

### 주문 API 응답 시 포함

주문 정보 API에서 Edicus 품목코드와 MES 품목코드 함께 반환:

```json
{
  "items": [
    {
      "edicus_product_code": "90x50@NC",
      "mes_product_code": "NC-9050-001",
      ...
    }
  ]
}
```

---

## 기존 Edicus API 활용

### partner_order_id 활용

MES 주문번호를 Edicus에 저장하여 양방향 조회 가능:

```javascript
// Tentative Order 시 MES 주문번호 저장
POST /api/projects/:prjid/order/tentative
{
  "partner_order_id": "M2511290001",
  ...
}

// MES 주문번호로 조회
POST /api/order/query
{
  "by_partner_order_id": {
    "partner_order_id": "M2511290001"
  }
}
```

### 렌더링 파일 획득

주문 완료 후 Query API로 렌더링 상태 확인 → 파일 다운로드

---

## 에러 코드

| HTTP | error_code | 설명 |
|------|------------|------|
| 400 | BAD_REQUEST | 필수 파라미터 누락/형식 오류 |
| 401 | UNAUTHORIZED | API Key 누락/무효 |
| 404 | NOT_FOUND | 리소스 없음 |
| 409 | DUPLICATE_ORDER | 중복 주문 |
| 422 | INVALID_STATUS | 허용되지 않는 상태 전이 |
| 500 | INTERNAL_ERROR | 서버 내부 오류 |

---

## DB 스키마 (MES 측)

### edicus_orders
```sql
CREATE TABLE edicus_orders (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    mes_order_id VARCHAR(20) NOT NULL,
    edicus_order_id VARCHAR(20) NOT NULL UNIQUE,
    edicus_project_id VARCHAR(50),
    status VARCHAR(20) DEFAULT 'RECEIVED',
    status_synced_at DATETIME,
    shipping_synced_at DATETIME,
    raw_data JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_mes_order (mes_order_id),
    INDEX idx_edicus_order (edicus_order_id)
);
```

### edicus_product_mappings
```sql
CREATE TABLE edicus_product_mappings (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    edicus_product_code VARCHAR(50) NOT NULL,
    edicus_product_name VARCHAR(100),
    mes_product_code VARCHAR(50) NOT NULL,
    mes_product_name VARCHAR(100),
    option_mappings JSON,
    active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE INDEX idx_edicus_code (edicus_product_code)
);
```

---

## 협의 필요 사항

### 모션원 확인 필요
1. Edicus Link API 스펙 (상태/배송 업데이트 endpoint)
2. CustomField 지원 여부
3. Webhook vs Polling 방식
4. API 인증 방식 (API Key 발급 절차)
5. 테스트 환경 (샌드박스) 제공 여부
6. 렌더링 파일 URL 인증/유효기간
7. 에러 처리 및 재시도 정책

### MES 측 제공 예정
1. 주문 수신 API
2. 품목 목록 API
3. 품목 매핑 관리 API
4. 상태 변경 시 Edicus Link API 호출 로직
5. 배송 정보 전송 로직
