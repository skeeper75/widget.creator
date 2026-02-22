# SPEC-SHOPBY-001: Shopby 플랫폼 분석 및 API 매핑

---

## 메타데이터

| 항목 | 값 |
|------|------|
| SPEC ID | SPEC-SHOPBY-001 |
| 제목 | Shopby 플랫폼 분석 및 API 매핑 |
| 생성일 | 2026-02-22 |
| 상태 | Planned |
| 우선순위 | Critical |
| 담당 | expert-backend |
| 관련 SPEC | SPEC-DATA-001 (인쇄 지식 데이터베이스 및 상품 옵션 엔진) |
| 단계 | Phase 1 - 분석 및 설계 |

---

## 1. 환경 (Environment)

### 1.1 프로젝트 컨텍스트

Widget Creator 프로젝트의 Shopby (NHN Commerce) 플랫폼 통합을 위한 기반 분석 SPEC이다. Shopby API 생태계를 체계적으로 분석하고, Widget Creator의 기존 데이터 모델(SPEC-DATA-001)과의 매핑을 수립한다. 이 SPEC의 산출물은 후속 5개 SPEC(SPEC-SHOPBY-002~006)의 기초 자료로 활용된다.

### 1.2 Shopby API 생태계

- **Shop API**: 12개 도메인 - 고객 대면 쇼핑몰 API (상품 조회, 장바구니, 주문, 회원)
- **Admin API**: 25개 도메인 - 관리자 백오피스 API (상품 관리, 주문 처리, 배송 설정)
- **Internal API**: 31개 도메인 - 내부 시스템 연동 API
- **Server API**: 12개 도메인 - 서버 간 통신 API
- **기본 인증**: OAuth 2.0 (Access Token 30분, Refresh Token 1일/90일)
- **파일 업로드**: POST /storage/temporary-images (최대 12MB/이미지)

### 1.3 기술 환경 (Widget Creator)

- **런타임**: Node.js 22.x LTS
- **언어**: TypeScript 5.7+ (strict mode)
- **ORM**: Prisma 6.x
- **DB**: PostgreSQL 16.x (JSONB 활용)
- **모노레포**: Turborepo + pnpm 9.x
- **검증**: Zod 3.x
- **기존 구현**: SPEC-DATA-001 완료 (옵션 엔진, 가격 엔진, 제약 평가기, 309개 테스트 통과)

---

## 2. 가정 (Assumptions)

### 2.1 기술적 가정

- A1: Shopby Shop API는 RESTful 구조이며, JSON 응답 형식을 사용한다
- A2: Shopby API Rate Limit은 초당 10-50 요청 수준이며, 공식 문서에 명시될 것이다
- A3: extraJson 필드(mallProduct)에 임의의 JSON 데이터를 저장할 수 있다
- A4: Aurora Skin(React 기반)은 외부 JavaScript 스크립트 주입을 지원한다
- A5: Shopby의 COMBINATION 옵션은 최대 3단계까지 조합을 지원한다

### 2.2 비즈니스 가정

- A6: Shopby는 NHN Commerce의 현행 서비스이며, API 안정성이 보장된다
- A7: 인쇄 상품의 동적 가격 계산은 Shopby 네이티브 기능으로 지원되지 않으므로, 위젯 수준에서 처리해야 한다
- A8: Shopby 옵션 가격(addPrice)은 정적이므로, 복잡한 인쇄 옵션 가격은 Widget Creator 가격 엔진이 담당한다

### 2.3 통합 가정

- A9: SPEC-DATA-001에서 정의한 데이터 모델은 Shopby 데이터 모델과 매핑 가능하다
- A10: Shopby의 optionInputs(구매자작성형)를 통해 인쇄 사양 데이터를 주문에 첨부할 수 있다

---

## 3. 요구사항 (Requirements)

### 3.1 API 엔드포인트 매핑

**R-MAP-001** [유비쿼터스]: 시스템은 **항상** Shopby API (Shop/Admin/Server)의 전체 엔드포인트를 기능별로 분류하고, Widget Creator 기능과의 매핑 관계를 문서화해야 한다.

매핑 대상 도메인:
- Shop API: 상품(products), 카테고리(product-sections), 장바구니(cart), 주문(order-sheets, orders), 회원(profile), 인증(auth), 파일(storage)
- Admin API: 상품 관리(products), 주문 관리(orders), 배송(delivery-templates), 회원 관리(members)
- Server API: 서버 간 인증, 주문 상태 동기화

### 3.2 데이터 모델 매핑

**R-MAP-002** [유비쿼터스]: 시스템은 **항상** Shopby mallProduct 데이터 모델을 Widget Creator의 PrintProduct 모델과 양방향 변환할 수 있는 매핑 테이블을 유지해야 한다.

핵심 매핑 항목:
- Shopby mallProduct ↔ Widget Creator PrintProduct
- Shopby options (COMBINATION/REQUIRED/STANDARD) ↔ Widget Creator OptionSelection
- Shopby optionInputs (구매자작성형) ↔ Widget Creator 인쇄 사양 데이터
- Shopby extraJson ↔ Widget Creator 위젯 설정
- Shopby order-sheets ↔ Widget Creator 주문 데이터

### 3.3 인증 흐름 분석

**R-MAP-003** [이벤트]: **WHEN** API 매핑 문서를 작성할 때, **THEN** 시스템은 Shop API(고객용 OAuth)와 Admin API(관리자용 인증)의 인증 흐름을 분리하여 구현 가이드를 제공해야 한다.

인증 흐름:
- Shop API: OAuth 2.0 (소셜 로그인 포함 - Naver, Kakao, Google, Apple)
- Admin API: 관리자 토큰 기반 인증
- Access Token 갱신 전략: 만료 5분 전 자동 갱신
- keepLogin 옵션에 따른 Refresh Token 수명 관리 (1일/90일)

### 3.4 API 제한사항 문서화

**R-MAP-004** [유비쿼터스]: 시스템은 **항상** Shopby API의 제한사항을 문서화하고 대응 전략을 수립해야 한다.

문서화 대상:
- Rate Limit: API별 요청 제한 (TPS/분/시간)
- Payload Size: 요청/응답 최대 크기
- 파일 업로드: 이미지 12MB 제한, PDF 미지원
- 옵션 가격: 정적(addPrice)만 지원, 동적 가격 불가
- 장바구니: 카탈로그 가격만 사용, 커스텀 가격 오버라이드 불가
- Webhook: 주문 이벤트 알림 시스템 미제공

### 3.5 커스터마이제이션 포인트 식별

**R-MAP-005** [이벤트]: **WHEN** API 분석이 완료되면, **THEN** 시스템은 인쇄 도메인 요구사항 충족을 위해 Shopby를 확장/커스터마이징할 수 있는 포인트를 식별하고 문서화해야 한다.

커스터마이제이션 후보:
- Aurora Skin 커스터마이징 (React 기반 프론트엔드)
- 외부 스크립트 주입 (위젯 임베딩용)
- extraJson 필드 활용 (상품별 위젯 설정 저장)
- 구매자작성형 입력 옵션 (파일 URL, 인쇄 사양 데이터)
- 쿠폰/할인 시스템 활용 (동적 가격 차이 보정)
- Admin API를 통한 주문 상태 커스텀 관리

---

## 4. 사양 (Specifications)

### 4.1 API 매핑 테이블 (핵심 요약)

| Widget Creator 기능 | Shopby API | 엔드포인트 | 비고 |
|---|---|---|---|
| 상품 조회 | Shop API | GET /products/{productNo} | mallProduct 구조 |
| 상품 목록 | Shop API | GET /products | 페이징, 필터링 지원 |
| 카테고리 조회 | Shop API | GET /product-sections | 전시 카테고리 |
| 옵션 조회 | Shop API | GET /products/{productNo}/options | COMBINATION/REQUIRED/STANDARD |
| 장바구니 추가 | Shop API | POST /cart | optionInputs 포함 가능 |
| 주문서 생성 | Shop API | POST /order-sheets | 즉시구매/장바구니 주문 |
| 주문 금액 계산 | Shop API | POST /order-sheets/{id}/calculate | 쿠폰/할인 적용 |
| 결제 예약 | Shop API | POST /payments/reserve | PG 연동 |
| 파일 업로드 | Shop API | POST /storage/temporary-images | 12MB 제한 |
| 상품 등록 | Admin API | POST /products | mallProduct 생성 |
| 주문 상태 변경 | Admin API | PUT /orders/{orderNo}/status | 배송 상태 관리 |
| 배송 템플릿 | Admin API | GET /delivery-templates | 배송 정책 조회 |
| 회원 인증 | Shop API | POST /auth/token | OAuth 2.0 |
| 소셜 로그인 | Shop API | GET /auth/social/{provider} | Naver, Kakao 등 |

### 4.2 데이터 모델 변환 매핑

| Widget Creator (SPEC-DATA-001) | Shopby | 변환 방향 | 비고 |
|---|---|---|---|
| PrintProduct | mallProduct | WC -> Shopby | 상품 등록 시 |
| ProductCategory | product-sections | WC -> Shopby | 카테고리 매핑 |
| ProductSize + ProductPaper + ProductColor | options (COMBINATION) | WC -> Shopby | 옵션 조합 생성 |
| OptionSelection (전체) | optionInputs | WC -> Shopby | 주문 시 인쇄 사양 |
| PricingTable 결과 | addPrice (옵션별 고정가) | WC -> Shopby | 가격 전략 필요 |
| 위젯 설정 JSON | extraJson | WC <-> Shopby | 양방향 |
| 주문 데이터 | order-sheets | WC -> Shopby | 주문 생성 |

### 4.3 통합 아키텍처 다이어그램 (텍스트)

```
[고객 브라우저]
    |
    v
[Aurora Skin (React)] <----> [Widget Creator SDK (임베디드)]
    |                              |
    v                              v
[Shopby Shop API]         [Widget Creator API]
    |                              |
    v                              v
[Shopby 주문/결제 시스템]   [옵션 엔진 + 가격 엔진]
    |                              |  (SPEC-DATA-001)
    v                              |
[PG 사 (KCP/INICIS 등)]          |
    |                              v
    v                     [PostgreSQL DB]
[Shopby Admin API] <---------> [MES 브리지]
    |
    v
[Shopby 주문 관리 백오피스]
```

### 4.4 위험 분석

| 위험 | 영향도 | 발생 확률 | 대응 전략 |
|---|---|---|---|
| Shopby API 문서 불완전/부정확 | High | Medium | Sandbox 환경에서 실제 API 호출로 검증 |
| 동적 가격 미지원으로 가격 불일치 | High | High | 옵션 조합별 고정가 + 쿠폰 보정 전략 |
| extraJson 필드 크기 제한 존재 | Medium | Low | 핵심 설정만 저장, 상세 설정은 별도 API |
| Rate Limit으로 대량 상품 등록 지연 | Medium | Medium | 배치 처리 + 큐 기반 등록 시스템 |
| Aurora Skin 커스터마이징 제약 | Medium | Medium | 외부 스크립트 주입 방식으로 우회 |

---

## 5. 추적성 태그 (Traceability)

| TAG | 관련 요구사항 | 산출물 |
|---|---|---|
| TAG-MAP-API | R-MAP-001 | API 매핑 테이블 문서 |
| TAG-MAP-DATA | R-MAP-002 | 데이터 모델 변환 매핑 |
| TAG-MAP-AUTH | R-MAP-003 | 인증 흐름 구현 가이드 |
| TAG-MAP-LIMIT | R-MAP-004 | API 제한사항 및 대응 전략 문서 |
| TAG-MAP-CUSTOM | R-MAP-005 | 커스터마이제이션 포인트 목록 |

---

문서 버전: 1.0.0
