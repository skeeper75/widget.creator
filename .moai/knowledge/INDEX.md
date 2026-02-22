# 지식 데이터베이스 인덱스 (Knowledge Base Index)

> 작성일: 2026-02-22
> 프로젝트: Widget Creator (후니프린팅 인쇄 자동견적 위젯 빌더)

---

## 핵심 문서

| 파일 | 설명 | 버전 | 비고 |
|------|------|------|------|
| `wowpress-print-domain.md` | **인쇄 자동견적 지식 데이터베이스 (최종 통합본)** | v3.0.0 | 이 파일만 읽으면 전체 도메인 이해 가능 |

이 문서는 다음 내용을 포함한다:
- 상품 구조 (JSON 구조, coverinfo, pjoin)
- 기준정보 우선순위 체인 (6단계)
- 특수지명함(40070) 실제 데이터 완전 분석 (17종 지류, 112개 후가공, 모든 제약 조건)
- 제약 조건 시스템 (req_*/rst_* 전체 매트릭스)
- 가격 계산 모델 (8가지 결정 요소, 비선형 구조)
- 주문 플로우 (API 프로세스 8단계)
- API 엔드포인트 요약 (인증, 기준정보, 주문/가격)
- 위젯 빌더 시사점 (데이터 모델, MVP 전략, 간소화 포인트)
- 상품 분류 체계 (47개 카테고리, 326 상품)
- UI 패턴 벤치마킹
- 용어 사전 (한국어-영어 매핑)

---

## 보조 문서

### 공개 사이트 UI 분석

| 파일 | 설명 |
|------|------|
| `wowpress-public-site/wowpress-ui-analysis/structure.md` | WowPress 공개 사이트 아키텍처 분석 (URL 구조, 네비게이션, 주문 페이지 레이아웃, 옵션 선택 UI 패턴, 가격 업데이트 메커니즘, 파일 업로드 인터페이스, JS 함수 참조) |
| `wowpress-public-site/wowpress-ui-analysis/product-pages.md` | 5개 상품별 상세 UI 분석 (일반명함, 사각스티커, 합판전단, 무선책자, 현수막). SELECT 수, hidden 필드 수, 옵션별 값, 가격 정보, AJAX 호출 패턴 |

### 공개 사이트 원본 데이터

| 디렉터리/파일 | 설명 |
|-------------|------|
| `wowpress-public-site/wowpress-ui-analysis/screenshots/` | 공개 사이트 스크린샷 (메인, 상품 페이지, 카테고리 등) |
| `wowpress-public-site/wowpress-ui-analysis/prod-*-detail.json` | 상품별 폼 필드 추출 데이터 |
| `wowpress-public-site/wowpress-ui-analysis/prod-*.html` | 상품 페이지 전체 HTML |
| `wowpress-public-site/wowpress-ui-analysis/all-product-xhr.json` | 전체 XHR(AJAX) 호출 로그 |
| `wowpress-public-site/wowpress-ui-analysis/landing-products.json` | 랜딩 페이지 상품 카탈로그 (17개 카테고리, 110+ 상품) |
| `wowpress-public-site/wowpress-ui-analysis/mega-menu.json` | 메가 메뉴 네비게이션 데이터 |
| `wowpress-public-site/wowpress-ui-analysis/product-grid.json` | 상품 그리드 onclick 핸들러 (654개 항목) |

### DevShop 관리자 사이트 분석

| 디렉터리/파일 | 설명 |
|-------------|------|
| `wowpress-devshop-analysis/screenshots/` | 관리자 사이트 스크린샷 |
| `wowpress-devshop-analysis/product-*-full.html` | 관리자용 상품 페이지 HTML (40073, 40008, 40026, 40054, 40196, 40023, 40468) |
| `wowpress-devshop-analysis/maint-main-body.html` | 관리자 메인 페이지 HTML |
| `wowpress-devshop-analysis/network-logs/` | 네트워크 요청 로그 |
| `wowpress-devshop-analysis/session-state.json` | 세션 상태 데이터 |

---

## 원본 데이터 (ref/wowpress/)

이 데이터는 `.moai/knowledge/` 외부의 `ref/wowpress/` 디렉터리에 위치한다.

| 경로 | 설명 |
|------|------|
| `ref/wowpress/api-docs/` | WowPress Open API 문서 |
| `ref/wowpress/api-docs/products_spec_v1.0.pdf` | 제품상세 SPEC (24페이지) |
| `ref/wowpress/api-docs/price_order_spec_v1.01.pdf` | 가격/주문 SPEC (25페이지) |
| `ref/wowpress/catalog/index.json` | 전체 카탈로그 인덱스 (326상품, 47카테고리) |
| `ref/wowpress/catalog/products/*.json` | 개별 상품 상세 JSON (prod_info 원본 포함) |
| `ref/wowpress/catalog/products/40070.json` | **대표 상품: 특수지명함** (381KB, 완전 분석됨) |

---

## 관련 SPEC 문서

| 파일 | 설명 |
|------|------|
| `.moai/specs/SPEC-DATA-001/spec.md` | 인쇄 지식 데이터베이스 및 상품 옵션 엔진 SPEC |

---

## 문서 사용 가이드

**새로 합류한 개발자**: `wowpress-print-domain.md` 한 파일만 읽으면 전체 도메인을 이해할 수 있다.

**옵션 엔진 구현 시**: `wowpress-print-domain.md`의 섹션 4(옵션 상세 분석)와 섹션 5(제약 조건 시스템)를 참조한다.

**UI 구현 시**: `wowpress-print-domain.md`의 섹션 11(UI 패턴 벤치마킹)과 `structure.md`, `product-pages.md`를 참조한다.

**API 연동 시**: `wowpress-print-domain.md`의 섹션 7(주문 플로우)과 섹션 8(API 엔드포인트)을 참조한다.

**원본 데이터 확인 시**: `ref/wowpress/catalog/products/40070.json`에서 실제 JSON 구조를 직접 확인한다.
