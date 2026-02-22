# SPEC-SHOPBY-004: 주문 생성 및 결제 연동

---

## 메타데이터

| 항목 | 값 |
|------|------|
| SPEC ID | SPEC-SHOPBY-004 |
| 제목 | 주문 생성 및 결제 연동 |
| 생성일 | 2026-02-22 |
| 상태 | Planned |
| 우선순위 | Critical |
| 담당 | expert-backend |
| 관련 SPEC | SPEC-DATA-001 (가격 엔진), SPEC-SHOPBY-002 (상품 등록), SPEC-SHOPBY-003 (위젯 SDK) |
| 단계 | Phase 2 - 핵심 연동 개발 |

---

## 1. 환경 (Environment)

### 1.1 프로젝트 컨텍스트

Widget Creator 위젯에서 선택된 인쇄 옵션/가격을 기반으로 Shopby 주문을 생성하고, PG(Payment Gateway)를 통한 결제를 완료하는 플로우를 구현한다. Shopby의 주문 프로세스(주문서 생성 -> 금액 계산 -> 결제 예약 -> PG 결제)에 인쇄 사양 데이터를 정확히 통합한다.

### 1.2 Shopby 주문 프로세스

1. **주문서 생성**: POST /order-sheets (장바구니 기반 또는 즉시구매)
2. **금액 계산**: POST /order-sheets/{id}/calculate (쿠폰, 할인 적용)
3. **결제 예약**: POST /payments/reserve (PG 연동 준비)
4. **PG 결제**: 외부 PG 결제 페이지/SDK 호출
5. **결제 확인**: POST /payments/confirm (결제 완료 처리)
6. **주문 완료**: 주문 상태 "결제완료"로 변경

### 1.3 지원 PG사

- KCP (NHN KCP)
- INICIS (이니시스)
- SMARTRO (스마트로)
- NAVERPAY (네이버페이)
- KAKAOPAY (카카오페이)
- TOSSPAY (토스페이)

---

## 2. 가정 (Assumptions)

### 2.1 기술적 가정

- A1: Shopby 주문서 생성 API(POST /order-sheets)는 즉시구매(장바구니 우회)를 지원한다
- A2: optionInputs 데이터는 주문서 생성 시 포함되어 이후 주문 조회 시에도 접근 가능하다
- A3: 주문서 금액 계산 API는 Shopby 옵션 가격 기준으로 계산한다 (위젯 가격이 아님)
- A4: PG 결제는 Shopby가 제공하는 결제 연동 SDK를 통해 처리된다

### 2.2 비즈니스 가정

- A5: 인쇄 상품의 최종 주문 가격은 위젯 계산 가격을 기준으로 한다
- A6: Shopby 옵션 가격과 위젯 가격의 차이는 주문 시 서버 측에서 검증한다
- A7: 비회원 주문도 지원하되, 결제 후 주문 조회를 위해 이메일/전화번호를 수집한다
- A8: 인쇄 상품은 교환 불가, 조건부 환불(제작 전 한정) 정책이 적용된다

### 2.3 결제 가정

- A9: PG 결제 금액과 Shopby 주문 금액은 반드시 일치해야 한다
- A10: 결제 실패 시 주문서는 자동 취소되며, 재결제가 가능해야 한다

---

## 3. 요구사항 (Requirements)

### 3.1 주문서 생성

**R-ORD-001** [이벤트]: **WHEN** 고객이 위젯에서 "바로 구매" 또는 장바구니에서 "주문하기"를 클릭하면, **THEN** 시스템은 Shopby POST /order-sheets API를 호출하여 주문서를 생성해야 한다.

주문서 생성 플로우:
- 즉시구매: 위젯에서 직접 POST /order-sheets 호출 (장바구니 우회)
- 장바구니 주문: 장바구니 페이지에서 선택 상품 기반 주문서 생성
- 주문서에는 선택된 옵션, 수량, 배송지 정보가 포함됨

### 3.2 인쇄 사양 데이터 첨부

**R-ORD-002** [유비쿼터스]: 시스템은 **항상** 주문서 생성 시 optionInputs를 통해 인쇄 사양 데이터를 주문에 첨부해야 한다.

optionInputs 데이터 구조:
```json
{
  "designFileUrl": "https://storage.example.com/files/design-001.pdf",
  "printSpec": {
    "productId": "wc-prod-uuid",
    "size": {"name": "90x50mm", "width": 90, "height": 50},
    "paper": {"name": "스노우화이트 250g", "paperNo": 101},
    "color": {"name": "양면컬러", "colorNo": 201},
    "quantity": 200,
    "postProcess": [{"name": "양면코팅", "jobNo": 301}],
    "printMethod": {"name": "옵셋인쇄", "jobPresetNo": 401}
  },
  "specialRequest": "로고 색상 PANTONE 485C로 맞춰주세요",
  "proofRequired": false,
  "widgetPrice": {
    "basePrice": 12000,
    "optionPrice": 3000,
    "postProcessPrice": 2000,
    "deliveryPrice": 3000,
    "totalPrice": 20000
  }
}
```

### 3.3 주문 금액 계산 및 검증

**R-ORD-003** [이벤트]: **WHEN** 주문서가 생성되면, **THEN** 시스템은 POST /order-sheets/{id}/calculate API를 호출하여 최종 주문 금액을 계산하고, 위젯 계산 가격과의 일치 여부를 검증해야 한다.

검증 로직:
- Shopby 계산 금액과 위젯 계산 금액 비교
- 허용 오차 범위: 100원 이내 (반올림 차이 허용)
- 불일치 시: 관리자 알림 + 주문 진행 여부 판단 로직

### 3.4 결제 예약 및 PG 연동

**R-ORD-004** [이벤트]: **WHEN** 주문 금액 계산이 완료되면, **THEN** 시스템은 POST /payments/reserve API를 호출하여 PG 결제를 예약하고, 결제 수단에 따른 PG 결제 페이지를 호출해야 한다.

PG 연동 흐름:
1. 결제 예약: POST /payments/reserve (결제 수단, 금액, 주문번호)
2. PG SDK 초기화: Shopby 제공 결제 SDK 사용
3. PG 결제 페이지 호출: 신용카드, 실시간계좌이체, 간편결제 등
4. 결제 결과 수신: PG → Shopby → 프론트엔드 콜백
5. 결제 확인: POST /payments/confirm

### 3.5 즉시구매 플로우

**R-ORD-005** [이벤트]: **WHEN** 고객이 위젯에서 "바로 구매"를 클릭하면, **THEN** 시스템은 장바구니를 거치지 않고 직접 주문서를 생성하여 결제 페이지로 이동해야 한다.

즉시구매 플로우:
1. 위젯에서 옵션 선택 완료
2. POST /order-sheets (productNo, optionNo, orderCnt, optionInputs)
3. 주문서 페이지 이동 (배송지 입력, 쿠폰 적용)
4. POST /order-sheets/{id}/calculate (최종 금액 계산)
5. POST /payments/reserve (결제 예약)
6. PG 결제
7. 결제 완료 페이지

### 3.6 회원/비회원 주문 지원

**R-ORD-006** [상태]: **IF** 고객이 로그인 상태이면, **THEN** 시스템은 회원 정보(배송지, 연락처, 등급)를 자동으로 주문서에 반영하고, **IF** 비로그인 상태이면, **THEN** 비회원 주문 정보(이름, 이메일, 전화번호)를 수집하여 주문을 처리해야 한다.

### 3.7 가격 일치 검증

**R-ORD-007** [비허용]: 시스템은 위젯 계산 가격과 Shopby 주문서 계산 가격이 허용 오차(100원)를 **초과하여 불일치하는 주문을 결제 진행하지 않아야 한다**.

불일치 대응:
- 100원 이내: 정상 처리 (반올림 차이)
- 100원~1,000원: 경고 후 관리자 확인 요청
- 1,000원 초과: 주문 차단 + 관리자 알림 + 고객 안내

---

## 4. 사양 (Specifications)

### 4.1 주문 플로우 시퀀스

```
[고객/위젯] → [Aurora Skin] → [Shopby Shop API] → [PG사]

1. 고객: 옵션 선택 + 파일 업로드
2. 위젯 → Shopby: POST /order-sheets
   - productNo, optionNo, orderCnt
   - optionInputs (인쇄 사양, 파일 URL, 가격)
3. Shopby: 주문서 생성 → orderSheetNo 반환
4. 고객: 배송지 입력, 쿠폰/적립금 적용
5. Aurora Skin → Shopby: POST /order-sheets/{id}/calculate
   - 최종 금액 계산 (쿠폰/할인 반영)
6. [서버 측 검증]: 위젯 가격 vs Shopby 계산 가격 비교
7. Aurora Skin → Shopby: POST /payments/reserve
   - payType, orderSheetNo, payAmt
8. PG SDK 호출 → PG 결제 페이지 → 결제 처리
9. PG → Shopby: 결제 결과 콜백
10. Aurora Skin → Shopby: POST /payments/confirm
11. 주문 상태: "결제완료"
```

### 4.2 가격 검증 모듈 인터페이스

```
interface PriceValidation {
  widgetPrice: {
    basePrice: number;
    optionPrice: number;
    postProcessPrice: number;
    deliveryPrice: number;
    totalPrice: number;
  };
  shopbyPrice: {
    productAmt: number;
    deliveryAmt: number;
    discountAmt: number;
    totalAmt: number;
  };
  validation: {
    isValid: boolean;
    difference: number;
    differencePercent: number;
    action: 'PROCEED' | 'WARN' | 'BLOCK';
    message: string;
  };
}
```

### 4.3 에러 핸들링 매트릭스

| 에러 상황 | HTTP 코드 | 대응 |
|---|---|---|
| 주문서 생성 실패 | 400/500 | 재시도 안내, 상세 에러 메시지 |
| 재고 부족 (옵션 소진) | 409 | 대안 옵션 안내 |
| 결제 금액 불일치 | 422 | 금액 재계산 + 재시도 |
| PG 결제 실패 | PG 에러 | 다른 결제 수단 안내 |
| PG 결제 타임아웃 | - | 결제 상태 확인 + 재결제 안내 |
| 결제 확인 실패 | 500 | 관리자 수동 확인 요청 |
| 비회원 정보 유효성 | 400 | 입력값 재확인 안내 |

### 4.4 위험 분석

| 위험 | 영향도 | 발생 확률 | 대응 전략 |
|---|---|---|---|
| 위젯 가격 vs Shopby 가격 불일치 | Critical | High | 서버 측 검증 + 가격 보정 로직 |
| PG 결제 실패율 높음 | High | Low | 다중 PG 지원 + 폴백 |
| 주문서 만료 (세션 타임아웃) | Medium | Medium | 주문서 유효시간 안내 + 재생성 |
| 동시 주문으로 재고 충돌 | Low | Low | 인쇄물은 주문생산이므로 재고 무관 |
| optionInputs 데이터 유실 | Critical | Low | 주문 생성 전후 데이터 검증 |

---

## 5. 추적성 태그 (Traceability)

| TAG | 관련 요구사항 | 구현 위치 (예상) |
|---|---|---|
| TAG-ORD-SHEET | R-ORD-001 | packages/widget-sdk/src/bridge/order-bridge.ts |
| TAG-ORD-INPUT | R-ORD-002 | packages/widget-sdk/src/bridge/option-input-builder.ts |
| TAG-ORD-CALC | R-ORD-003 | apps/api/src/services/order-price-validator.service.ts |
| TAG-ORD-PAY | R-ORD-004 | packages/widget-sdk/src/bridge/payment-bridge.ts |
| TAG-ORD-DIRECT | R-ORD-005 | packages/widget-sdk/src/bridge/direct-order.ts |
| TAG-ORD-MEMBER | R-ORD-006 | packages/widget-sdk/src/bridge/member-resolver.ts |
| TAG-ORD-VERIFY | R-ORD-007 | apps/api/src/services/price-verification.service.ts |

---

문서 버전: 1.0.0
