# SPEC-SHOPBY-006: 주문 처리 및 백오피스 연동

---

## 메타데이터

| 항목 | 값 |
|------|------|
| SPEC ID | SPEC-SHOPBY-006 |
| 제목 | 주문 처리 및 백오피스 연동 |
| 생성일 | 2026-02-22 |
| 상태 | Planned |
| 우선순위 | High |
| 담당 | expert-backend |
| 관련 SPEC | SPEC-SHOPBY-004 (주문/결제), SPEC-SHOPBY-005 (파일 관리) |
| 단계 | Phase 2 - 핵심 연동 개발 |

---

## 1. 환경 (Environment)

### 1.1 프로젝트 컨텍스트

Shopby에서 생성된 인쇄 주문을 후니프린팅 제작 프로세스로 연결하는 백오피스 시스템을 구축한다. Shopby 주문 관리 Admin API를 활용하여 주문 상태를 인쇄 제작 워크플로우에 맞게 관리하고, MES(Manufacturing Execution System)에 제작 데이터를 전달한다.

### 1.2 인쇄 주문 상태 워크플로우

```
결제완료 → 주문확인 → 제작대기 → 제작중 → 검수완료 → 출고준비 → 출고완료 → 배송완료
                 |                              |
                 v                              v
            주문취소                      재제작(클레임)
```

### 1.3 Shopby Admin API 환경

- **주문 조회**: GET /orders/{orderNo}
- **주문 상태 변경**: PUT /orders/{orderNo}/status
- **주문 목록**: GET /orders (필터링, 페이징)
- **클레임 관리**: POST /claims (취소/교환/반품)
- **배송 관리**: PUT /orders/{orderNo}/delivery (운송장 등록)

### 1.4 기술 환경

- **MES 연동**: REST API 또는 메시지 큐 (RabbitMQ/Redis)
- **스케줄러**: Node-cron 또는 Bull Queue (주문 상태 폴링)
- **알림**: 알림톡(카카오), 이메일 (SendGrid/AWS SES)
- **대시보드**: Shopby Admin 백오피스 + 커스텀 대시보드

---

## 2. 가정 (Assumptions)

### 2.1 기술적 가정

- A1: Shopby Admin API를 통해 주문 상태를 인쇄 제작 단계에 맞게 커스터마이징할 수 있다
- A2: Shopby는 주문 이벤트 Webhook을 제공하지 않으므로, 폴링 방식으로 주문 변경을 감지해야 한다
- A3: optionInputs 데이터는 Admin API 주문 조회 시에도 접근 가능하다
- A4: 배송 관련 Admin API 문서가 불완전할 수 있으며, 실제 API 테스트가 필요하다

### 2.2 비즈니스 가정

- A5: 후니프린팅의 기존 MES 시스템이 REST API 또는 파일 기반 인터페이스를 제공한다
- A6: 인쇄 제작 기간은 상품 유형에 따라 1~5 영업일이다
- A7: 배송 기간은 제작 완료 후 1~3 영업일이다
- A8: 알림톡은 카카오 알림톡 API를 통해 발송하며, 발신 프로필이 등록되어 있다

### 2.3 운영 가정

- A9: 관리자는 Shopby Admin 백오피스와 후니프린팅 자체 시스템을 병행 사용한다
- A10: 클레임(취소/환불) 처리는 인쇄 제작 상태에 따라 정책이 달라진다

---

## 3. 요구사항 (Requirements)

### 3.1 주문 상태 워크플로우

**R-ADM-001** [유비쿼터스]: 시스템은 **항상** 인쇄 주문의 상태를 다음 워크플로우에 따라 관리해야 한다: 결제완료 -> 주문확인 -> 제작대기 -> 제작중 -> 검수완료 -> 출고준비 -> 출고완료 -> 배송완료.

상태 전이 규칙:
- 결제완료 → 주문확인: 주문 접수 확인 (자동/수동)
- 주문확인 → 제작대기: 인쇄 사양 확인 완료, 디자인 파일 검토 완료
- 제작대기 → 제작중: MES 전달 완료, 제작 시작
- 제작중 → 검수완료: 인쇄 완료, 품질 검수 통과
- 검수완료 → 출고준비: 포장 완료
- 출고준비 → 출고완료: 운송장 등록
- 출고완료 → 배송완료: 배송 완료 확인

### 3.2 인쇄 사양 조회

**R-ADM-002** [이벤트]: **WHEN** 관리자가 주문 상세를 조회하면, **THEN** 시스템은 Shopby 주문의 optionInputs에서 인쇄 사양 데이터(printSpec)를 추출하여 가독성 있는 형태로 표시해야 한다.

표시 항목:
- 상품명 및 카테고리
- 규격 (가로 x 세로 mm)
- 용지 (지류명 + 평량)
- 도수 (양면/단면 + 컬러/흑백)
- 수량
- 후가공 목록
- 인쇄방식
- 디자인 파일 다운로드 링크
- 특수 요청사항
- 시안 확인 여부

### 3.3 MES 시스템 연동

**R-ADM-003** [이벤트]: **WHEN** 주문 상태가 "제작대기"로 변경되면, **THEN** 시스템은 인쇄 사양 데이터를 MES 시스템에 전달하여 제작 작업을 등록해야 한다.

MES 전달 데이터:
```json
{
  "orderId": "shopby-order-12345",
  "orderItemId": "item-001",
  "product": {
    "name": "명함",
    "category": "명함/일반명함"
  },
  "printSpec": {
    "size": "90x50mm",
    "paper": "스노우화이트 250g",
    "color": "양면컬러 4/4",
    "quantity": 200,
    "printMethod": "옵셋인쇄",
    "postProcess": ["양면코팅"]
  },
  "designFile": {
    "url": "https://s3.../orders/2026/02/명함_90x50_양면_스노우화이트250g_직접주문_홍길동_001_200매.pdf",
    "format": "PDF",
    "pages": 2,
    "resolution": 300
  },
  "customer": {
    "name": "홍길동",
    "phone": "010-1234-5678",
    "specialRequest": "로고 색상 PANTONE 485C"
  },
  "deadline": "2026-02-25T18:00:00+09:00"
}
```

### 3.4 클레임 처리

**R-ADM-004** [상태]: **IF** 주문 상태가 "결제완료" 또는 "주문확인"이면, **THEN** 시스템은 전액 취소/환불을 허용하고, **IF** 주문 상태가 "제작대기" 이후이면, **THEN** 시스템은 제작 진행 상태에 따라 부분 환불 또는 재제작 처리를 해야 한다.

클레임 정책:
- 결제완료/주문확인: 전액 취소 (수수료 없음)
- 제작대기: 취소 가능 (10% 수수료)
- 제작중: 취소 불가, 불량 시 재제작
- 검수완료 이후: 배송 후 하자 발견 시 재제작/환불 심사

클레임 유형:
- 고객 단순 변심: 제작 전 전액 환불, 제작 후 불가
- 제작 불량: 재제작 또는 전액 환불
- 배송 파손: 재제작 + 재배송
- 디자인 파일 오류 (고객 책임): 환불 불가, 재주문 안내

### 3.5 배송 설정

**R-ADM-005** [유비쿼터스]: 시스템은 **항상** 인쇄물 특성을 반영한 배송 설정을 관리해야 한다. 배송 기간 = 제작 기간(상품별 1~5 영업일) + 택배 배송(1~3 영업일).

배송 설정:
- 상품별 제작 기간 설정 (명함: 1일, 책자: 3~5일 등)
- 배송 방법: 일반택배(기본), 퀵서비스(서울권), 직접수령
- 배송비: 기본 3,000원, 제주/도서산간 추가 3,000원
- 무료배송: 회원 등급별 최소 구매액 이상 시
- Shopby delivery-template과 연동

### 3.6 알림 시스템

**R-ADM-006** [이벤트]: **WHEN** 주문 상태가 변경되면, **THEN** 시스템은 고객에게 상태 변경 알림을 카카오 알림톡 또는 이메일로 발송해야 한다.

알림 시점:
- 주문 접수 확인: "주문이 접수되었습니다"
- 제작 시작: "제작이 시작되었습니다 (예상 완료: X월 X일)"
- 출고 완료: "상품이 발송되었습니다 (운송장: XXXXX)"
- 배송 완료: "배송이 완료되었습니다. 만족도를 평가해주세요"
- 클레임 처리 결과: "환불/재제작 처리가 완료되었습니다"

### 3.7 주문 현황 대시보드

**R-ADM-007** [선택]: **가능하면** 관리자가 일별/월별 주문 현황을 한눈에 파악할 수 있는 대시보드를 제공한다.

대시보드 항목:
- 일별 주문 건수 / 금액
- 상태별 주문 현황 (제작대기 N건, 제작중 N건 등)
- 상품별 주문 현황
- 클레임 현황 (취소/환불/재제작)
- 매출 추이 그래프 (월별)

---

## 4. 사양 (Specifications)

### 4.1 주문 상태 관리 인터페이스

```
// 주문 상태 열거형
type OrderStatus =
  | 'PAYMENT_DONE'      // 결제완료
  | 'ORDER_CONFIRMED'   // 주문확인
  | 'PRODUCTION_READY'  // 제작대기
  | 'IN_PRODUCTION'     // 제작중
  | 'QC_PASSED'         // 검수완료
  | 'SHIPPING_READY'    // 출고준비
  | 'SHIPPED'           // 출고완료
  | 'DELIVERED'         // 배송완료
  | 'CANCELLED'         // 취소
  | 'CLAIM_PROCESSING'; // 클레임처리중

// 상태 전이 규칙
interface StatusTransition {
  from: OrderStatus;
  to: OrderStatus;
  condition?: string;      // 전이 조건
  autoAction?: string;     // 자동 실행 액션 (MES 전달, 알림 발송 등)
  notification?: string;   // 알림 템플릿 ID
}

// Shopby 상태 ↔ 인쇄 상태 매핑
interface ShopbyStatusMapping {
  shopbyStatus: string;    // Shopby 원래 상태
  printStatus: OrderStatus; // 인쇄 커스텀 상태
  shopbyApiAction: string;  // Shopby API 호출 (PUT /orders/{id}/status)
}
```

### 4.2 주문 폴링 시스템

```
주문 상태 동기화 (Webhook 미지원 대응):

1. 스케줄러: 1분 간격으로 Shopby Admin API 주문 목록 폴링
   - GET /orders?orderStatusType=PAYMENT_DONE&orderBy=RECENT
2. 새 주문 감지 시:
   a. 내부 주문 레코드 생성
   b. optionInputs에서 인쇄 사양 추출
   c. 주문 확인 알림 발송
3. 상태 변경 감지 시:
   a. Shopby 상태와 내부 상태 비교
   b. 불일치 시 동기화 처리
   c. 필요 시 알림 발송
4. 에러 핸들링:
   a. API 호출 실패: 다음 주기에 재시도
   b. 연속 3회 실패: 관리자 알림
```

### 4.3 MES 브리지 인터페이스

```
// MES 작업 등록 요청
interface MesJobRequest {
  orderId: string;
  orderItemId: string;
  product: {
    name: string;
    category: string;
  };
  printSpec: PrintSpecification;
  designFile: {
    url: string;
    format: string;
    pages: number;
    resolution: number;
  };
  customer: {
    name: string;
    phone: string;
    specialRequest?: string;
  };
  deadline: string;   // ISO 8601
  priority: 'NORMAL' | 'URGENT';
}

// MES 작업 상태 콜백
interface MesJobCallback {
  orderId: string;
  mesJobId: string;
  status: 'STARTED' | 'COMPLETED' | 'QC_PASSED' | 'QC_FAILED' | 'CANCELLED';
  timestamp: string;
  details?: string;
}
```

### 4.4 알림 템플릿

| 알림 ID | 시점 | 채널 | 내용 요약 |
|---|---|---|---|
| NTF-001 | 주문 접수 | 알림톡+이메일 | 주문번호, 상품명, 예상 제작일 |
| NTF-002 | 제작 시작 | 알림톡 | 제작 시작 안내, 예상 완료일 |
| NTF-003 | 출고 완료 | 알림톡+이메일 | 운송장번호, 배송 조회 링크 |
| NTF-004 | 배송 완료 | 알림톡 | 배송 완료, 만족도 평가 링크 |
| NTF-005 | 클레임 결과 | 알림톡+이메일 | 처리 결과 (환불/재제작) |

### 4.5 위험 분석

| 위험 | 영향도 | 발생 확률 | 대응 전략 |
|---|---|---|---|
| Webhook 미지원으로 주문 감지 지연 | High | High | 1분 간격 폴링 + 긴급 주문 수동 확인 |
| MES 시스템 연동 인터페이스 불일치 | High | Medium | 어댑터 패턴으로 인터페이스 격리 |
| 알림톡 발송 실패 | Medium | Low | 이메일 폴백 + 재발송 큐 |
| 배송 Admin API 문서 불완전 | Medium | High | API 직접 테스트 + 점진적 구현 |
| 클레임 정책과 Shopby 환불 API 불일치 | Medium | Medium | 수동 환불 처리 폴백 |

---

## 5. 추적성 태그 (Traceability)

| TAG | 관련 요구사항 | 구현 위치 (예상) |
|---|---|---|
| TAG-ADM-STATUS | R-ADM-001 | apps/api/src/services/order-status.service.ts |
| TAG-ADM-SPEC | R-ADM-002 | apps/api/src/services/print-spec-viewer.service.ts |
| TAG-ADM-MES | R-ADM-003 | apps/api/src/services/mes-bridge.service.ts |
| TAG-ADM-CLAIM | R-ADM-004 | apps/api/src/services/claim-handler.service.ts |
| TAG-ADM-DELIV | R-ADM-005 | apps/api/src/services/delivery-config.service.ts |
| TAG-ADM-NOTIFY | R-ADM-006 | apps/api/src/services/notification.service.ts |
| TAG-ADM-DASH | R-ADM-007 | apps/admin/src/pages/dashboard/ |

---

문서 버전: 1.0.0
