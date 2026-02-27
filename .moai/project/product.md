# Widget Creator - 후니프린팅 위젯 빌더

## 프로젝트 개요

**프로젝트명**: Widget Creator (후니프린팅 위젯 빌더)
**유형**: 웹 애플리케이션 (SaaS)
**버전**: 0.6.0
**최종 업데이트**: 2026-02-26

### 프로젝트 설명

후니프린팅 위젯 빌더는 이커머스 쇼핑몰 페이지에 삽입 가능한 인쇄 주문 견적 위젯을 생성하고 관리하는 플랫폼이다. 쇼핑몰 운영자가 스크립트 태그 하나로 자사 쇼핑몰에 인쇄 주문 위젯을 삽입하면, 방문 고객이 인쇄 옵션을 선택하고 실시간 자동 견적을 받을 수 있다. 견적 완료 후 PDF 디자인 파일을 업로드하거나 후니프린팅 에디터를 통해 디자인을 편집하여 인쇄 주문을 진행한다.

해외에는 Shopify 인쇄 플러그인(Printful, Printify, Gelato 등)이 존재하지만, 국내 인쇄 시장에 특화된 동등한 솔루션이 없다. 후니프린팅 위젯 빌더는 국내 인쇄 산업의 복잡한 옵션 체계(용지, 인쇄방식, 후가공 등)와 가격 구조를 반영한 최초의 국산 인쇄 위젯 솔루션을 목표로 한다.

---

## 비전과 미션

### 비전

국내 이커머스 생태계에서 인쇄 주문의 표준 인터페이스가 되는 것.

### 미션

- 쇼핑몰 운영자가 코딩 없이 인쇄 주문 위젯을 자사 페이지에 삽입할 수 있도록 한다
- 복잡한 인쇄 옵션과 가격 체계를 직관적인 UI로 추상화한다
- 실시간 자동 견적으로 주문 전환율을 높인다
- 후니프린팅의 기존 MES(제조실행시스템) 및 백오피스와 연동하여 주문부터 출고까지 자동화한다

---

## 대상 사용자

### 관리자 (후니프린팅 운영팀)

후니프린팅 내부 직원으로, 위젯 설정과 주문을 관리하는 역할을 수행한다.

**주요 업무**:
- 위젯 생성 및 설정 (테마, 옵션, 가격 규칙)
- 상품 옵션 관리 (용지, 인쇄방식, 후가공 등)
- 가격표 및 가격 규칙 관리
- 주문 확인 및 상태 관리
- 고객 문의 대응

**조직 구조** (주문프로세스 문서 기반):
- 마스터관리: 상품등록/관리, 통계
- 상품/마케팅: 상품정, 댓글관리, 프로모션관리
- 발주: 주문확인/등록, 파일확인, 조판, 외주발주
- 생산: 자재 입/출고
- 출고: 1차포장, 박스포장, 재고상품관리, 송장출력
- 외주관리: 외주제작 입/출고, 외주공정 제작물 입/출고
- 회계 경리: 환불, 무통장 입금관리, 청구서관리

### 최종 사용자 (쇼핑몰 방문 고객)

이커머스 쇼핑몰을 방문하여 인쇄 상품을 주문하려는 일반 고객이다.

**주요 행동**:
- 위젯을 통해 인쇄 옵션 선택 (상품, 사이즈, 용지, 수량 등)
- 실시간 견적 확인
- 디자인 파일 업로드 (PDF, AI, JPG 등)
- 후니프린팅 에디터를 통한 디자인 편집 (선택사항)
- 결제 및 주문 완료
- 주문 상태 추적

---

## 핵심 기능 및 우선순위

### P0 - 핵심 (MVP 필수)

#### 1. 위젯 CRUD 및 옵션 관리

관리자가 위젯을 생성하고 인쇄 옵션을 구성하는 기능이다.

- 위젯 생성/수정/삭제/목록 조회
- 위젯별 쇼핑몰 URL 및 API 키 관리
- 위젯 테마 설정 (후니프린팅 디자인 시스템 기반 - Primary: #5538b6)
- 위젯 활성/비활성 상태 관리

**옵션 관리 체계** (상품마스터 기반):
- 레이어 기반 옵션 구조: 기본(사이즈), 내지(종이/인쇄/페이지수), 표지(종이/인쇄/코팅), 제본(제본방식), 후가공(박/형압/포장)
- 옵션 간 의존성 관리 (예: 박가공 선택 시 박칼라 필수)
- 범위형 옵션 지원 (예: 페이지수 24~300P, 2P 단위)
- 조건부 옵션 표시/숨김

**지원 상품 카테고리**:
- 무선책자, 중철책자, 스프링책자
- 스티커 (반칼자유형, 원칼자유형, 반칼규격, 상칼자유형)
- 명함, 전단지, 포스터
- 캘린더 (탁상형, 미니탁상형, 벽걸이)
- 실사출력 (포보드, 현수막, PVC, PET 등)
- 배너/현수막
- 패브릭인쇄
- 시트커팅, 레이저커팅
- 아크릴상품

#### 2. 가격 엔진 (Pricing Engine)

인쇄 상품의 복잡한 가격 체계를 자동 계산하는 엔진이다.

**가격 규칙 유형**:
- `perSheet`: 용지 가격 x (페이지수 / 2) - 내지 비용 계산
- `fixed`: 고정 단가 - 코팅(500원/건), 인쇄(단면 150원, 양면 280원)
- `tiered`: 수량별 단계 가격 - 제본(1부:3000원 ~ 1000부:500원)
- `sizeDependent`: 크기 x 수량별 가격표 - 박가공, 형압
- `multiplier`: 배수 연산 - 내지 용지가 x (P/2)
- `perUnit`: 단위당 가격 - 포장(300원/부)

**가격 계산 흐름**:
1. 기본가 산출 (상품 카테고리 + 사이즈)
2. 레이어별 옵션가 합산 (내지 + 표지 + 제본 + 후가공)
3. 수량 할인 적용 (수량 구간별 단가 차등)
4. 최종 견적가 산출

#### 3. 임베더블 위젯 (Embeddable Widget)

쇼핑몰 페이지에 삽입되는 경량 위젯 스크립트이다.

**기술 요구사항**:
- 번들 사이즈: 50KB 미만 (gzipped)
- Shadow DOM 또는 iframe 격리 (호스트 페이지 CSS 충돌 방지)
- 스크립트 태그 삽입만으로 작동
- 반응형 디자인 (모바일 최적화)

**위젯 기능**:
- 상품 카테고리 선택
- 옵션 단계별 선택 (레이어 기반 진행)
- 실시간 가격 표시
- 디자인 파일 업로드
- 장바구니 담기 / 바로 주문

### P1 - 중요 (MVP 이후 우선)

#### 4. 주문 관리

견적에서 주문으로 전환된 건을 관리하는 기능이다.

**주문 상태 흐름** (주문프로세스 문서 기반):
미입금 -> 결제완료 -> 제작대기 -> 제작중 -> 제작완료 -> 출고완료 -> 주문취소

**상태별 처리**:
- 미입금: 카드결제, 포인트결제, 에스크로, 가상계좌, 이니시스승인
- 결제완료 -> 제작대기: 자동 전환 (온라인 결제) / MES 연동 (신용결제)
- 제작대기 -> 제작중: 완료예정일 계산, 의뢰서 출력, 문서09 발주업무프로세스 진행
- 제작중: 제작번호/벨바코드 입력, 포장완료 상태변경
- 제작완료 -> 출고완료: 택배출고(송장출력), 퀵배송(납품명세서), 직접방문(출고명세서)

**자동 알림** (11개 알림 포인트):
- 자동메일 + 자동알림톡: 결제완료(002), 제작중 변경(005), 출고완료(008), 주문취소(010)
- 조건부 자동알림톡 + 문자: 가상계좌 주문완료(001), 파일업로드 요청(003), 편집상품 수정요청(004), 직접방문 제작완료(006), 택배 제작완료(007), 택배 출고완료(009), 가상계좌 미입금 자동취소(011)

#### 5. 디자인 파일 업로드

고객이 인쇄용 디자인 파일을 업로드하는 기능이다.

**파일 유형별 처리** (인쇄타입 기반):
- 디지털인쇄: PDF
- 실사출력: JPG
- 시트커팅: PDF
- 레이저커팅: AI
- 화이트인쇄: PDF
- 패브릭출력: JPG
- UV평판출력: PDF
- 전사인쇄: JPG
- 도장: AI
- 박(외주): AI

**파일번호 체계**:
- 고유한 생성번호 기반
- case1 배송상품: 상품준비중 -> 포장완료
- case2 파일업로드상품: 확인전 -> 파일확인 -> 주문파일 업로드 -> 다운로드완료 -> 포장완료
- case3 편집기상품: 렌더링전 -> 렌더링완료 -> 다운로드완료 -> 포장완료

**파일명 규칙**:
- 패턴: `품목_출력사이즈_양단면_소재명_거래처명_고객명_파일고유번호_수량`
- 예시: `1002_집지카드_92x57_D_탑240_BIZ_박현정_30146712_00100ea.pdf`

### P2 - 추가 (향후 확장)

#### 6. 디자인 에디터 연동

후니프린팅 자체 에디터 또는 외부 에디터(Edicus Prepress 등)와 연동한다.

- 에디터에서 직접 디자인 편집
- 편집 완료 시 렌더링 -> 인쇄 파일 자동 생성
- 수정요청/수정완료 워크플로우

#### 7. 결제 연동

이니시스 등 PG사 결제 연동이다.

- 카드결제, 포인트결제, 에스크로
- 가상계좌 (미입금 7일 경과 시 자동취소)
- 신용결제 (MES 생성 주문, 제작대기에서 시작)

#### 8. MES 시스템 연동

후니프린팅 기존 MES(TS.BackOffice.Huni)와의 데이터 연동이다.

- 거래처별 주문 EXCEL 다운로드
- 출력파일 업로드 / 작업의뢰서 출력
- 파일 다운로드
- 포장완료 처리 / 송장출력
- 외주공정 주문리스트
- 거래처별 청구서

#### 9. 클레임 처리

주문 관련 클레임을 처리하는 기능이다.

- 재제작 + 재배송 (일부/전체)
- 주문취소/환불 (부분환불 / 전체환불)
- 반송 처리 (Nfocus 반송요청)
- 재출고 (신규송장부여, 상품누락 추가발송, 교환 재발송)

---

## 사용자 흐름 (Use Cases)

### UC-1: 쇼핑몰 방문 고객의 인쇄 주문

1. 고객이 쇼핑몰 페이지를 방문한다
2. 페이지에 삽입된 위젯이 로드된다
3. 고객이 상품 카테고리를 선택한다 (예: 무선책자)
4. 레이어별 옵션을 순차적으로 선택한다
   - 기본: 사이즈 (148x210mm)
   - 내지: 종이(백색모조지100g), 인쇄(양면), 페이지수(100P)
   - 표지: 종이(아트지250g), 인쇄(양면), 코팅(무광코팅)
   - 제본: 무선제본
   - 후가공: 박가공(박있음 -> 금유광), 포장(개별포장없음)
5. 수량을 입력한다 (예: 100부)
6. 실시간 견적가가 표시된다
7. "주문하기" 버튼을 클릭한다
8. 디자인 파일을 업로드한다 (PDF)
9. 결제를 진행한다 (카드/가상계좌)
10. 주문이 완료되고 확인 메일/알림톡이 발송된다

### UC-2: 관리자의 위젯 설정

1. 관리자가 Admin Dashboard에 로그인한다
2. "위젯 관리" 메뉴에서 "새 위젯 만들기"를 클릭한다
3. 위젯 기본 정보를 입력한다 (이름, 대상 쇼핑몰 URL)
4. 위젯에 포함할 상품 카테고리를 선택한다
5. 카테고리별 옵션을 설정한다 (기본 옵션 템플릿 활용)
6. 가격 규칙을 설정한다 (가격표 업로드 또는 수동 입력)
7. 테마를 커스터마이징한다 (색상, 폰트, 레이아웃)
8. 미리보기로 위젯을 확인한다
9. "배포" 버튼으로 임베드 코드를 생성한다
10. 생성된 스크립트 태그를 쇼핑몰 운영자에게 전달한다

### UC-3: 관리자의 주문 처리

1. 관리자가 "주문 관리" 메뉴에서 신규 주문을 확인한다
2. 결제완료 상태의 주문을 선택한다
3. 파일을 확인한다 (디자인파일 여부 Y/N 확인)
4. 파일명 체크, 출고예정일 등록, 생산메모를 기입한다
5. "접수완료" 처리한다
6. 의뢰서 출력 후 제작팀에 전달한다
7. 제작 완료 시 바코드를 입력한다
8. 포장 완료 후 송장을 발급한다
9. 출고 완료 처리한다

---

## 경쟁 분석

### 해외 경쟁사 (Shopify 인쇄 플러그인)

| 서비스 | 특징 | 한계 |
|--------|------|------|
| **Printful** | POD(주문형 인쇄) 글로벌 1위, 350+ 상품, Shopify/WooCommerce 연동 | 한국 로컬 인쇄 옵션 미지원, 국내 배송 비용 높음 |
| **Printify** | 글로벌 인쇄 네트워크, 가격 경쟁력 | 한국어 미지원, 국내 인쇄 품질 관리 불가 |
| **Gelato** | 30개국 로컬 인쇄, 빠른 배송 | 한국 파트너 제한적, 전문 인쇄 옵션 부족 |
| **CustomCat** | 대량 주문 특화 | B2B 전문, 한국 시장 미진출 |

### 국내 시장 현황

- 국내에 이커머스 임베드형 인쇄 견적 위젯 솔루션이 **존재하지 않음**
- 기존 국내 인쇄 주문 방식: 인쇄소 웹사이트 직접 방문 -> 옵션 선택 -> 견적 요청 -> 수동 응답
- 네이버 스마트스토어, 카페24, 쿠팡 등 국내 주요 이커머스 플랫폼에 인쇄 플러그인 부재

### Widget Creator의 차별점

1. **국내 인쇄 시장 특화**: 한국 인쇄 산업의 복잡한 옵션 체계(용지 종류, 후가공, 제본 등)를 완벽히 반영
2. **레이어 기반 옵션 구조**: 내지/표지/제본/후가공으로 구분된 직관적 옵션 선택 경험
3. **실시간 자동 견적**: 수량별 단가, 옵션별 가격 조합을 즉시 계산
4. **경량 임베드**: 50KB 미만의 위젯 스크립트로 어떤 쇼핑몰에도 삽입 가능
5. **MES 연동**: 후니프린팅 백오피스 시스템과 직접 연동하여 주문-생산-출고 자동화
6. **파일 처리 자동화**: 인쇄타입별 접수파일 분류, 파일명 자동 생성, 조판 파일 연동

---

## 프로젝트 범위

### 구현 완료 기능 (Delivered)

- **Widget Builder Admin Dashboard** (v0.5.0, SPEC-WIDGET-ADMIN-001): Next.js 15.x Admin Dashboard. 26개 CRUD 테이블, 27개 tRPC 라우터, 7개 특수 에디터(TreeEditor/MatrixEditor/SpreadsheetEditor/ConstraintBuilder/ProductConfigurator/KanbanBoard/VisualMapper), NextAuth.js v5, 727개 테스트
- **Widget Builder API Layer** (v0.4.0, SPEC-WIDGET-API-001): 45+ REST 엔드포인트 + 16개 Admin tRPC 라우터. RFC 7807 에러 핸들링, Widget Token/JWT/API Key 3종 인증, Sliding Window Rate Limiting, 93.97% 테스트 커버리지
- **Drizzle ORM 마이그레이션** (v0.2.0, SPEC-INFRA-001): 26개 Huni 도메인 테이블, Drizzle ORM 기반 타입 안전 DB 접근
- **가격 엔진 및 공유 패키지** (v0.1.0): 옵션 우선순위 체인 엔진, 비선형 수량 가격 계산기, 제약 조건 평가기, Zod 스키마
- **Embeddable Widget SDK** (v1.0.0-core, SPEC-WIDGET-SDK-001, 2026-02-23): Preact 10.x + Shadow DOM 기반 임베더블 위젯. `<script>` 태그 삽입으로 작동. 7개 Primitive + 10개 Domain 컴포넌트 완전 구현. 번들 사이즈 15.47 KB gzipped (한도 50 KB 대비 69% 여유). 468 테스트 (~97-98% 커버리지). 3개 Screen 구현 (PrintOption, StickerOption, AccessoryOption), 8개 Screen 다음 이터레이션 예정.
- **External System Integration Layer** (SPEC-WIDGET-INTG-001, 2026-02-23): 3개 외부 시스템(Shopby, MES, Edicus) 연동 레이어. 도메인 이벤트 버스, 어댑터 패턴, 서킷 브레이커, 지수 백오프 재시도, Dead Letter Queue. 16개 Integration API 엔드포인트, 184 테스트. Shopby 통합: OAuth 2.0 토큰 라이프사이클, 상품 등록(500-조합 Cartesian 행렬), 카테고리 계층 구조, 이중 가격 전략, 서킷 브레이커 + Rate Limiting. 9개 테스트 파일
- **Comprehensive DB Seeding Pipeline** (SPEC-SEED-002, 2026-02-24): seed.ts 검증 레이어 강화. `scripts/lib/schemas.ts` Zod 스키마 (6종 JSON 타입), `loadAndValidate<T>()` 헬퍼, `seedGoodsFixedPrices()` 트랜잭션 래핑 + price=0 스킵 로직, Drizzle 마이그레이션 동기화. 57개 신규 테스트 (seed-goods-prices, seed-transactions, seed-schemas)
- **Product Category & Recipe System** (SPEC-WB-002, 2026-02-25): 11개 상품 카테고리 정의, Recipe 편집기 구현
- **Constraint System - ECA Pattern** (SPEC-WB-003, 2026-02-25): ECA 패턴 기반 제약조건 평가, json-rules-engine 적용, 8개 Action 타입, react-querybuilder UI
- **Pricing Rules & Calculation Engine** (SPEC-WB-004, 2026-02-26): 4가지 가격 계산 모드 (LOOKUP/AREA/PAGE/COMPOSITE). 기본가(상품+사이즈) → 레이어별 옵션가 → 수량할인 → 최종가 계산 흐름. 5개 스키마 테이블(product_price_configs, print_cost_base, postprocess_cost, qty_discount, final_price_rules) + Drizzle ORM 타입 안전성. @MX:ANCHOR 태그로 fan_in>=3 제약조건 시그널링. 48개 테스트 완료
- **Admin Console 6-Step Wizard** (SPEC-WB-005, 2026-02-25): 위젯 발행 워크플로우, 시뮬레이션 엔진
- **Runtime Auto-Quote Engine** (SPEC-WB-006, 2026-02-26): 300ms SLA 목표 달성, Redis 캐싱, 제약조건+가격 통합 평가. 472개 테스트, MES 자동 발주, 견적 만료 관리
- **File Upload System** (SPEC-WB-006, 2026-02-26): 6개 파일 형식(PDF, JPEG, PNG, TIFF, AI, PSD), Magic Bytes 검증, 300 DPI 확인. S3(500MB) + Shopby Storage(12MB) 타겟, 업로드 진행률 추적
- **NextAuth v5 Configuration** (apps/web/auth.ts): 초기 설정 완료, Provider 통합 대기

### 포함 범위 (In Scope)

- 관리자용 위젯 빌더 대시보드
- 경량 임베더블 위젯 SDK
- 가격 엔진 (실시간 자동 견적)
- REST API 서버
- 데이터베이스 스키마 및 마이그레이션
- 파일 업로드 및 스토리지
- 기본 인증/인가 (관리자)

### 제외 범위 (Out of Scope) - 추후 확장

- 결제 PG 연동 (P2)
- MES 시스템 완전 연동 (P2) - 연동 어댑터 기반 구축 완료 (SPEC-WIDGET-INTG-001), 실제 MES API 연동은 차기 이터레이션
- 디자인 에디터 통합 (P2) - Edicus 어댑터 기반 구축 완료 (SPEC-WIDGET-INTG-001), 실제 에디터 UI 연동은 차기 이터레이션
- 모바일 네이티브 앱
- 클레임 처리 자동화 (P2)
- 세금계산서 발행 자동화 (P2)
- SPEC-WB-001: Option Element Type Library (현재 Draft 상태)

---

# Widget Creator - Project Overview (English)

## Project Description

Widget Creator is a production-grade printing widget system that enables printing businesses to offer embeddable product configuration and ordering widgets on e-commerce partner websites. Customers configure printing products (size, paper type, finishing options, quantity), receive instant automated quotes, and place orders directly through the widget embedded on partner e-commerce sites.

**Project Type**: TypeScript Monorepo (pnpm workspaces)
**Current Status**: MVP Phase (v0.6.0)
**Target Market**: Domestic printing industry (Korea)
**Last Updated**: February 27, 2026

## Core Business Purpose

Widget Creator solves the lack of specialized printing widget solutions in the Korean domestic market. Unlike international solutions (Printful, Printify, Gelato) that lack Korean printing industry expertise, Widget Creator integrates the complex Korean printing option system (paper types, print methods, finishing options) with intelligent automated pricing and order management.

### Key Differentiators

1. **Domestic Printing Specialization**: Reflects the complexity of Korean printing industry options (paper grades, finishing processes, binding methods)
2. **Layer-Based Option Architecture**: Intuitive user experience with organized option selection (base → interior → cover → binding → finishing)
3. **Real-Time Auto-Quoting**: Instant price calculation based on quantity breaks and option combinations
4. **Lightweight Embeddable Widget**: 15.47 KB gzipped (50 KB target), works on any e-commerce platform
5. **Backend System Integration**: Direct MES (Manufacturing Execution System) integration for automated order-to-production workflow
6. **Intelligent File Processing**: Automatic file classification, naming, and integration with production prepress

## Target Users

### Printing Business Operators (Internal Administrators)
- Configure printing products and options
- Manage pricing rules and discount structures
- Monitor orders and production status
- Generate reports and business analytics

### End Customers (Printing Buyers)
- Browse printing options through embedded widget
- Receive real-time price quotes
- Upload design files (PDF, AI, image formats)
- Place orders with payment

### Integration Partners (Developers)
- Integrate widget via single script tag
- Manage widget lifecycle and configuration
- Handle orders through webhook callbacks
- Connect MES and production systems

## Core Features

### 1. Embeddable Printing Widget (SPEC-WIDGET-SDK-001)
- Lightweight Preact 10.x + Shadow DOM implementation
- Bundle size: 15.47 KB gzipped (69% under 50 KB limit)
- 7 Primitive Components (button, input, select, slider, toggle, radio, collapsible)
- 10 Domain Components (size selector, paper selector, color chips, quantity slider, price summary, upload actions)
- 3 Screen configurations (PrintOption, StickerOption, AccessoryOption)
- 468 unit tests (~97-98% coverage)
- Real-time constraint evaluation and price calculation

### 2. Admin Management Console (SPEC-WIDGET-ADMIN-001)
- Next.js 15 App Router based dashboard
- 26 CRUD data tables with specialized editors
- Product and option management
- Pricing rule configuration and templates
- Constraint rule builder (ECA pattern with json-rules-engine)
- Multi-case simulation engine for order validation
- Widget publish workflow with preview and deployment
- 727 unit tests

### 3. Pricing Engine (SPEC-WB-004, 2026-02-26)
- Four calculation modes: LOOKUP (table lookup), AREA (size-based), PAGE (page count), COMPOSITE (multi-factor)
- Base price calculation (product + size)
- Layer-wise option pricing (interior, cover, binding, finishing)
- Quantity discount application
- Final price calculation with all modifiers
- 4 database tables: product_price_configs, print_cost_base, postprocess_cost, qty_discount
- 48 tests, fully type-safe with Drizzle ORM

### 4. Constraint System (SPEC-WB-003)
- Event-Condition-Action (ECA) pattern implementation
- json-rules-engine for rule evaluation
- 8 action types (show, hide, require, enable, disable, validate, calculate, notify)
- Dependency resolution between options
- React QueryBuilder UI for constraint authoring
- Real-time constraint validation on client and server

### 5. Natural Language Rule Builder (SPEC-WB-007, 2026-02-27)
- OpenAI integration for constraint rule generation
- Natural language rule history tracking
- Two-step conversion: NL input → constraint rule → widget configuration
- Admin UI with nl-rule-panel and conversion-preview components
- Database tables for NL rule history and evaluation logs

### 6. External System Integrations (SPEC-WIDGET-INTG-001)
- **Shopby**: E-commerce platform integration with OAuth 2.0, product registration (500-combination Cartesian matrix), category hierarchy, dual pricing strategy
- **MES**: Manufacturing Execution System adapter for order dispatch and status tracking
- **Edicus**: Design rendering service integration for editor connectivity
- Features: Domain event bus, circuit breaker, exponential backoff retry, dead letter queue
- 16 integration API endpoints, 184 tests

### 7. File Upload System (SPEC-WB-006)
- 6 supported formats: PDF, JPEG, PNG, TIFF, AI, PSD
- Magic Bytes validation (file signature verification)
- 300 DPI quality verification
- Presigned URL flow for direct S3 uploads
- File metadata tracking and production integration
- S3 storage (500 MB) and Shopby Storage (12 MB) targets

## Architecture Overview

### Monorepo Structure
- **apps/admin**: Next.js 15 admin dashboard (port 3001)
- **apps/web**: Next.js 15 API server + user widget (port 3000)
- **packages/core**: Pure TypeScript business logic (pricing, constraints, options)
- **packages/db**: Drizzle ORM schemas for standard option element types
- **packages/shared**: Database layer, integration adapters, domain event bus
- **packages/widget**: Embeddable Preact SDK (15.47 KB gzipped)
- **packages/pricing-engine**: Standalone quote-specific pricing library

### Database Schema (26 Huni Domain Tables)
- **Catalog**: products, product_categories, recipes, product_recipes
- **Materials**: paper_types, paper_sizes, material_properties
- **Options**: option_element_types, option_element_choices (standard library)
- **Constraints**: recipe_constraints, constraint_templates, constraint_nl_history
- **Pricing**: product_price_configs, print_cost_base, postprocess_cost, qty_discount
- **Orders**: orders, order_items, order_files, order_status_history
- **Integration**: shopby_products, shopby_mappings, mes_orders, edicus_designs

### API Surface
- **Widget API**: 6 endpoints (config, products, quote, orders, files, embed.js)
- **REST v1**: 5 pricing/catalog endpoints
- **tRPC**: 32 admin routers, 20 web routers
- **Integration**: 16 endpoints (Shopby, MES, Edicus)
- **Rate Limiting**: Token Bucket (60 requests/minute default)
- **Authentication**: API Key, JWT, NextAuth.js session

## Implementation Status

### Completed Features (v0.6.0)
- Widget Builder Admin Dashboard with 26 CRUD tables and 7 specialized editors
- Embeddable Widget SDK with Preact + Shadow DOM (15.47 KB gzipped)
- Pricing Engine with 4 calculation modes and 4 database tables
- Constraint System with ECA pattern and json-rules-engine
- Natural Language Rule Builder with OpenAI integration
- External System Integration Layer (Shopby, MES, Edicus)
- File Upload System with 6 format support and S3 integration
- NextAuth.js v5 authentication configuration
- Comprehensive test coverage (468 tests in widget, 727 in admin)

### In Development
- Payment Gateway Integration (P1)
- MES production workflow completion (P1)
- Design Editor UI connectivity (P1)
- Real-time order status WebSocket (P2)
- Email and SMS notification system (P1)
- Analytics and usage tracking (P2)

## Technology Stack Summary

| Layer | Technology |
|-------|-----------|
| **Frontend Admin** | React 19, Next.js 15, Tailwind CSS v4, shadcn/ui |
| **Frontend Widget** | Preact 10, @preact/signals, Shadow DOM |
| **Backend** | Next.js 15, Node.js 22, tRPC 11 |
| **Database** | PostgreSQL 16, Drizzle ORM 0.45 |
| **AI/ML** | OpenAI API (Natural Language Rules) |
| **Storage** | S3 compatible, Presigned URLs |
| **Caching** | Redis (300ms SLA for quotes) |
| **Testing** | Vitest, Testing Library, Playwright |
| **Build** | Turbo, Vite, esbuild |
| **Validation** | Zod 3.24 |

## Success Metrics

- **Widget Bundle**: 15.47 KB gzipped (69% under 50 KB limit) ✓
- **Test Coverage**: Widget 97-98%, Admin 86%+ ✓
- **API Response**: <200ms P95 (Quote API <100ms with Redis)
- **Page Load**: Admin <2s with Server Components
- **Quote Generation**: 300ms SLA with Redis caching
- **Constraint Evaluation**: Real-time client + server validation
- **Integration Stability**: Circuit breaker + exponential backoff

## Recent Achievements (2026-02-23 to 2026-02-27)

- **SPEC-WB-006**: Runtime Auto-Quote Engine with Redis caching and file upload system
- **SPEC-WB-007**: GLM Natural Language Rule Builder with OpenAI integration
- **SPEC-WA-001**: Widget Admin Features (dashboard stats, options editor, constraints builder, pricing rules)
- **packages/db**: Option Element Type Library with 79 tests and 86% coverage
- **Shopby Integration**: OAuth 2.0 token lifecycle, 500-combination product matrix, circuit breaker

---

Document Version: 1.3.0
Created: 2026-02-22
Last Updated: 2026-02-27
Based on: SPEC-WB-001 through SPEC-WB-007, architecture analysis, and implementation status
