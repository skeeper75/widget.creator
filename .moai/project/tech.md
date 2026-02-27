# Widget Creator - 기술 스택

## 기술 스택 전체 개요

```mermaid
graph TB
    subgraph "프론트엔드"
        NEXTJS["Next.js 15<br/>(App Router)"]
        REACT["React 19"]
        TAILWIND["Tailwind CSS v4"]
        SHADCN["shadcn/ui"]
        PREACT["Preact 10.x<br/>(위젯 SDK)"]
        SIGNALS["Preact Signals<br/>(반응형 상태)"]
    end

    subgraph "백엔드 + 비즈니스 로직"
        API_ROUTES["Next.js API Routes<br/>(apps/web/app/api/)"]
        CORE["packages/core<br/>(순수 TS 로직)"]
        SHARED["packages/shared<br/>(DB + 통합)"]
        DRIZZLE["Drizzle ORM<br/>(postgres.js)"]
        POSTGRES["PostgreSQL 16"]
        S3_STORAGE["S3 호환 스토리지"]
        REDIS["Redis<br/>(300ms SLA 캐싱)"]
    end

    subgraph "외부 시스템"
        SHOPBY["Shopby<br/>(이커머스)"]
        MES["MES<br/>(생산 시스템)"]
        EDICUS["Edicus<br/>(에디터)"]
    end

    subgraph "인증"
        NEXTAUTH["NextAuth.js v5"]
    end

    subgraph "빌드 / 배포"
        TURBOREPO["Turborepo"]
        VITE["Vite 6.x<br/>(위젯 빌드)"]
        VERCEL["Vercel<br/>(Admin + API)"]
        CDN["CDN<br/>(위젯 배포)"]
    end

    subgraph "개발 도구"
        TS["TypeScript 5.7+"]
        VITEST["Vitest 3.x"]
        PLAYWRIGHT["Playwright"]
    end

    NEXTJS --> REACT
    NEXTJS --> TAILWIND
    NEXTJS --> SHADCN
    NEXTJS --> API_ROUTES
    API_ROUTES --> CORE
    API_ROUTES --> SHARED
    SHARED --> DRIZZLE
    DRIZZLE --> POSTGRES
    SHARED --> REDIS
    API_ROUTES --> S3_STORAGE
    API_ROUTES --> NEXTAUTH
    SHARED --> SHOPBY
    SHARED --> MES
    SHARED --> EDICUS
    PREACT --> SIGNALS
    TURBOREPO --> NEXTJS
    TURBOREPO --> VITE
    TURBOREPO --> CORE
    VITE --> PREACT
```

---

## 프레임워크 선정 및 근거

### Next.js 15 (App Router) - 관리자 대시보드 + 메인 앱

**선정 근거**:
- App Router의 Server Components로 초기 로딩 성능 최적화
- API Routes로 별도 백엔드 서버 없이 풀스택 구현 가능
- React 19 Server Actions를 활용한 폼 처리 간소화
- Vercel 배포 시 자동 최적화 (엣지 펑션, ISR, 이미지 최적화)

**버전**: Next.js 15.x (2026년 안정 버전)
**아키텍처**:
- apps/admin: 관리자 대시보드 (포트 3001)
- apps/web: 메인 앱 = API 서버 + 위젯 사용자 UI (포트 3000)

**라우팅**: App Router (`app/` 디렉토리)
**API Routes**: `apps/web/app/api/` 통합 API 서버

### React 19 - UI 라이브러리

**선정 근거**:
- Server Components 네이티브 지원
- useOptimistic, useFormStatus 등 폼 처리 개선 훅
- Concurrent Features로 복잡한 옵션 선택 UI의 반응성 보장
- 생태계 성숙도 (shadcn/ui, React Query, Zustand 등 호환)

### Tailwind CSS v4 + shadcn/ui - 스타일링

**선정 근거**:
- Tailwind CSS v4: 네이티브 CSS 레이어, 자동 콘텐츠 감지, 더 빠른 빌드
- shadcn/ui: 복사-붙여넣기 방식의 컴포넌트 라이브러리로 완전한 커스터마이징 가능
- 후니프린팅 디자인 시스템 컬러(Primary: #5538b6)를 CSS 변수로 쉽게 적용
- Radix UI 기반으로 접근성(a11y) 기본 보장

**후니프린팅 디자인 토큰** (hooni-unified-validator.jsx 기반):
- Primary: #5538b6 (Huni Purple)
- Secondary: #eeebf9
- Accent: #351d87
- Background: #ffffff
- Foreground: #424242
- Border: #e9e9e9
- Destructive: #e6b93f (Gold)

### Preact 10.x + Preact Signals - 임베더블 위젯 SDK (SPEC-WIDGET-SDK-001, 2026-02-23)

**선정 근거**:
- 번들 사이즈 50KB 미만 제약 충족 (React는 약 40KB gzipped로 불충분)
- Preact: React 호환 API로 ~3KB gzipped, 개발 편의성과 경량성 양립
- Preact Signals (~1KB gzipped): 세밀한 반응형 상태 관리, 불필요한 리렌더링 최소화
- Shadow DOM 격리로 호스트 페이지 CSS 충돌 방지
- 이중 평가 패턴: 클라이언트(빠른 UX) + 서버(권한 검증)

**구현 결과** (SPEC-WIDGET-SDK-001):
- 번들 사이즈: 15.47 KB gzipped (한도 50 KB 대비 69% 여유)
- 빌드 도구: Vite 6.x Library Mode (IIFE + terser minification)
- 상태 관리: Preact Signals - 5개 핵심 Signal
- 테스트: 468개 테스트 (~97-98% 커버리지)
- 스타일: 순수 CSS Shadow DOM 내 인라인
- 기능: 7개 Primitive + 10개 Domain 컴포넌트 + 3개 Screen

**기술 스택**:
- Runtime: Preact 10.x (~3KB gzipped)
- State: @preact/signals (~1KB gzipped)
- Isolation: Shadow DOM (mode: 'open')
- Build: Vite 6.x Library Mode (IIFE)
- Language: TypeScript 5.7+ strict mode

### Drizzle ORM + PostgreSQL - 데이터베이스 (SPEC-INFRA-001, 2026-02-22)

**선정 근거**:
- TypeScript 네이티브 타입 안전성 (`$inferSelect`, `$inferInsert` 자동 타입 추론)
- Vercel serverless 환경 최적화 (postgres.js pure JS 드라이버, 연결 풀링)
- 경량화된 번들 (Prisma 대비 현저히 작음)
- SQL-like 쿼리 빌더로 복잡 쿼리 직관적 표현
- `drizzle-zod`로 Zod 스키마 자동 생성 가능

**버전 및 구성**:
- **Drizzle ORM**: ^0.45.1
- **Database**: PostgreSQL 16
- **Driver**: postgres.js (Vercel serverless 최적화)
- **Migration Tool**: drizzle-kit
- **Schema Validation**: drizzle-zod (자동 생성)
- **Schema Coverage**: 26개 huni_ 테이블 (SPEC-INFRA-001)

> **이전 기술**: Prisma ORM (6.x)은 2026-02-22 Drizzle로 완전 교체.
> 기존 파일은 `ref/prisma/`에 아카이브 보관.

### PostgreSQL - 데이터베이스

**선정 근거**:
- JSON/JSONB 네이티브 지원 (위젯 설정, 옵션 값, 가격 규칙 저장)
- 복합 쿼리 성능 (주문 목록 필터링, 통계 집계)
- 트랜잭션 안정성 (주문/결제 처리)
- Vercel Postgres, Supabase, Neon 등 관리형 서비스 다수 존재

**버전**: PostgreSQL 16.x

---

## 캐싱 및 성능 최적화

### Redis - 견적 캐싱 (SPEC-WB-006, 2026-02-26)

**선정 근거**:
- 300ms SLA 목표 달성 (견적 계산 결과 캐싱)
- 이중 평가 캐시 (클라이언트 UX + 서버 권한 검증)
- 제약조건 + 가격 통합 평가 결과 저장
- 만료 TTL 관리 (견적 유효기간)

**구성**:
- 캐시 키: `quote:{widgetId}:{optionHash}:{quantity}`
- TTL: 견적 유효기간 (기본 24시간)
- 캐시 레이어: API 응답 직전

---

## 인증 및 보안

### NextAuth.js v5 - 관리자 인증

**선정 근거**:
- Next.js 생태계 최적 통합
- 자체 호스팅으로 데이터 주권 보장
- Credentials Provider로 이메일/비밀번호 인증
- JWT + 세션 하이브리드 지원
- 무료

**버전**: 5.0.0-beta.30
**설정**: apps/web/auth.ts
**상태**: 초기 설정 완료, Provider 통합 대기

### API 키 인증 (위젯 -> API)

위젯은 관리자가 생성한 API 키로 API 서버에 인증한다.

- 위젯별 고유 API 키 발급 (UUID v4 기반)
- API 키에 허용 도메인(shopUrl) 바인딩으로 도메인 검증
- Rate Limiting 적용 (분당 60회 기본)
- API 키는 서버 사이드에서만 검증 (클라이언트 노출 시 도메인 제한으로 보호)

---

## 파일 스토리지

### 파일 업로드 시스템 (SPEC-WB-006, 2026-02-26)

**지원 형식** (6가지):
- PDF: 디지털인쇄, 시트커팅, 화이트인쇄, UV평판출력, 책자
- JPEG: 실사출력, 패브릭출력, 전사인쇄
- PNG: 투명 배경 지원
- TIFF: 높은 색감 표현
- AI (PostScript): 레이저커팅, 도장, 박 가공
- PSD: Photoshop 레이어 지원

**검증**:
- Magic Bytes 검증 (파일 시그니처 확인)
- 300 DPI 확인 (인쇄 품질 보장)
- 파일 크기 제한

**스토리지 타겟**:
- S3 호환 (500MB 한도)
- Shopby Storage (12MB 한도)

**업로드 흐름**:
1. 클라이언트가 API에 업로드 URL 요청
2. API가 Presigned URL 생성 + 파일 검증 규칙 반환
3. 클라이언트가 S3에 직접 업로드 (진행률 추적)
4. 업로드 완료 콜백으로 API에 파일 메타데이터 등록

**Location**: packages/widget/src/upload/

---

## 빌드 및 배포

### Turborepo - 모노레포 빌드 시스템

**선정 근거**:
- 리모트 캐싱으로 CI/CD 빌드 시간 대폭 단축
- 태스크 파이프라인으로 패키지 간 빌드 순서 자동 관리
- Vercel 네이티브 통합
- 최소 설정으로 모노레포 관리

**빌드 파이프라인**:
```
packages/shared (빌드)
    -> packages/pricing-engine (빌드, shared 의존)
    -> packages/ui (빌드, shared 의존)
        -> apps/admin (빌드, shared + pricing-engine + ui 의존)
        -> apps/api (빌드, shared + pricing-engine 의존)
        -> apps/widget (빌드, shared + pricing-engine 의존)
```

### Vite 6.x - 위젯 빌드

**선정 근거**:
- 라이브러리 모드로 단일 JS 번들 생성
- Tree-shaking 및 코드 분할 최적화
- 빠른 HMR로 개발 생산성 향상
- Turbopack 호환성

**빌드 설정**:
- 출력 형식: IIFE (전역 스코프에 즉시 등록)
- 타겟: ES2020 (모던 브라우저)
- CSS: Shadow DOM 내 인라인 (외부 파일 없음)
- 압축: Terser로 최소화
- 최종 크기: 15.47 KB gzipped

### Vercel - 호스팅 및 배포

**선정 근거**:
- Next.js 제작사로 최적 통합
- 자동 프리뷰 배포 (PR별 미리보기 URL)
- Edge Functions으로 글로벌 저지연 API
- Analytics, Speed Insights 기본 제공

**배포 구성**:
- `apps/admin`: Vercel 메인 배포 (admin.hooniprinting.com)
- `apps/api`: Vercel Serverless Functions (api.hooniprinting.com)
- `apps/widget`: CDN 배포 (cdn.hooniprinting.com/widget/v1/widget.js)

### CDN - 위젯 스크립트 배포

**선정 근거**:
- 위젯 스크립트는 다수의 쇼핑몰에서 로드되므로 글로벌 CDN 필수
- 캐싱으로 반복 로딩 속도 최적화
- 버전 관리 (/v1/, /v2/) 및 안정적 롤백

**후보**:
- Vercel Edge Network (기본 제공)
- Cloudflare CDN
- AWS CloudFront

---

## 개발 환경 설정

### 필수 소프트웨어

| 도구 | 버전 | 용도 |
|------|------|------|
| Node.js | 22.x LTS | 런타임 |
| pnpm | 9.x | 패키지 매니저 (Turborepo 권장) |
| PostgreSQL | 16.x | 데이터베이스 (로컬 또는 Docker) |
| Docker | 27.x | 로컬 DB, S3 (MinIO) 실행 |
| Git | 2.45+ | 버전 관리 |

### 초기 설정 절차

1. 저장소 클론 및 의존성 설치

```bash
git clone <repository-url> widget.creator
cd widget.creator
pnpm install
```

2. 환경변수 설정

```bash
cp .env.example .env.local
```

주요 환경변수:

```
# 데이터베이스
DATABASE_URL="postgresql://user:password@localhost:5432/widget_creator"

# 인증
NEXTAUTH_SECRET="<random-secret>"
NEXTAUTH_URL="http://localhost:3000"

# S3 스토리지
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_BUCKET="widget-uploads"

# 위젯 API
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_WIDGET_CDN_URL="http://localhost:5173"
```

3. 로컬 인프라 실행 (Docker)

```bash
docker compose up -d  # PostgreSQL + MinIO (S3 호환)
```

4. 데이터베이스 마이그레이션

```bash
# Drizzle Kit으로 마이그레이션 적용
pnpm drizzle-kit push
# 또는 생성된 SQL 파일 직접 실행
psql $DATABASE_URL -f drizzle/0000_silky_sentry.sql
```

5. 개발 서버 실행

```bash
pnpm dev  # Turborepo가 모든 앱을 병렬 실행
```

- Admin 대시보드: http://localhost:3000
- API 서버: http://localhost:3001
- 위젯 개발 서버: http://localhost:5173

### Docker Compose 구성

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: widget_creator
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

volumes:
  postgres_data:
  minio_data:
```

---

## 개발 도구 및 코드 품질

### TypeScript 5.7+

**설정 방침**:
- `strict: true` (엄격 모드 필수)
- `noUncheckedIndexedAccess: true` (인덱스 접근 타입 안전)
- 패키지 간 프로젝트 레퍼런스 (composite + references)
- 패스 매핑으로 깔끔한 import (`@shared/`, `@core/`, `@widget/`)

### ESLint v9 (Flat Config)

**설정 방침**:
- `eslint.config.mjs` (Flat Config 형식)
- `@typescript-eslint/strict-type-checked` 프리셋
- `eslint-plugin-react-hooks` (훅 규칙)
- `eslint-plugin-import-x` (import 정렬)
- 각 앱/패키지별 설정 오버라이드

### Prettier

**설정 방침**:
- `printWidth: 100`
- `singleQuote: true`
- `trailingComma: 'all'`
- `semi: true`
- `tabWidth: 2`
- ESLint와 통합 (`eslint-config-prettier`)

### Vitest 3.x - 유닛/통합 테스트

**선정 근거**:
- Vite 기반으로 빠른 실행
- Jest 호환 API (마이그레이션 용이)
- TypeScript 네이티브 지원 (별도 변환 불필요)
- 코드 커버리지 내장 (v8 provider)

**테스트 전략**:
- `packages/core/`: 비즈니스 로직 100% 커버리지 목표
- `packages/shared/`: DB + 통합 테스트 (184개 테스트)
- `packages/widget/`: 위젯 컴포넌트 (468개 테스트, 97-98% 커버리지)
- `apps/admin/`: 대시보드 테스트 (727개 테스트)
- `apps/web/`: API 라우트 + 미들웨어 통합 테스트

**커버리지 목표**: 85% 이상 (MoAI TRUST 5 기준)
**현재 성과**: Widget 97-98%, Admin 고커버리지

### Playwright - E2E 테스트

**선정 근거**:
- 크로스 브라우저 테스트 (Chrome, Firefox, Safari)
- 위젯 임베드 시나리오 테스트 (iframe/Shadow DOM 내부 접근)
- 관리자 대시보드 주요 흐름 테스트
- Visual Regression 테스트 지원

### 추가 개발 도구

| 도구 | 용도 |
|------|------|
| **Husky** | Git 훅 관리 (pre-commit, pre-push) |
| **lint-staged** | 스테이징 파일만 린트/포맷 |
| **commitlint** | 커밋 메시지 규칙 강제 (Conventional Commits) |
| **drizzle-kit studio** | 데이터베이스 시각적 관리 도구 (Drizzle Studio) |
| **Storybook** | UI 컴포넌트 독립 개발/문서화 (선택) |

---

## Drizzle ORM 데이터베이스 스키마

### 가격 엔진 테이블 (SPEC-WB-004)

| 테이블 | 파일 | 설명 | 버전 |
|--------|------|------|------|
| **product_price_configs** | `04-product-price-configs.ts` | 상품별 기본가 + 가격 계산 규칙 설정. 4가지 calcMode(LOOKUP/AREA/PAGE/COMPOSITE), 가격 규칙 테이블 참조 | 2026-02-26 |
| **print_cost_base** | `04-print-cost-base.ts` | 인쇄 기본비용 (단면 150원, 양면 280원, 코팅 500원 등 고정가). 인쇄방식별 단가 저장 | 2026-02-26 |
| **postprocess_cost** | `04-postprocess-cost.ts` | 후가공(박/형압/코팅/포장) 비용. product_id nullable(NULL=전사품에 적용). @MX:ANCHOR fan_in>=3 | 2026-02-26 |
| **qty_discount** | `04-qty-discount.ts` | 수량대별 할인율. product_id nullable(NULL=전사품에 적용). @MX:ANCHOR fan_in>=3 | 2026-02-26 |
| **final_price_rules** | (구현 예정) | 최종가 계산 규칙 테이블 | 미구현 |

**가격 계산 흐름**: product_price_configs → [인쇄기본 + 옵션 레이어별] → qty_discount → 최종가

---

## 핵심 의존성 목록

### 런타임 의존성

| 패키지 | 버전 | 용도 | 사용 위치 |
|--------|------|------|-----------|
| next | 15.x | 풀스택 프레임워크 | admin, web |
| react / react-dom | 19.x | UI 라이브러리 | admin, web |
| preact | 10.x | 경량 UI (위젯 전용) | widget |
| @preact/signals | latest | 반응형 상태 관리 | widget |
| drizzle-orm | ^0.45.1 | ORM + 쿼리 빌더 | shared |
| postgres (postgres.js) | latest | PostgreSQL 드라이버 (serverless) | shared |
| drizzle-zod | latest | Zod 스키마 자동 생성 | shared |
| tailwindcss | 4.x | 유틸리티 CSS | admin, web |
| @radix-ui/* | latest | 접근성 UI 프리미티브 (shadcn) | admin, web |
| next-auth | 5.0.0-beta.30 | 인증 | web |
| zod | 3.x | 스키마 검증 | core, shared, web |
| @tanstack/react-query | 5.x | 서버 상태 관리 | admin, web |
| zustand | 5.x | 클라이언트 상태 관리 | admin, widget |
| @aws-sdk/client-s3 | 3.x | S3 호환 파일 업로드 | web |
| redis | latest | 캐싱 (300ms SLA) | web (app/api/v1/pricing/quote) |
| json-rules-engine | latest | 제약조건 평가 (ECA 패턴) | core, widget |
| lucide-react | latest | 아이콘 라이브러리 | admin, web |

### 개발 의존성

| 패키지 | 버전 | 용도 |
|--------|------|------|
| typescript | 5.7+ | TypeScript 컴파일러 |
| turbo | latest | 모노레포 빌드 시스템 |
| drizzle-kit | latest | Drizzle ORM 마이그레이션 CLI |
| tsx | latest | TypeScript 스크립트 실행 |
| vite | 6.x | 위젯 빌드 도구 (Turbopack 호환) |
| eslint | 9.x | 코드 린팅 |
| prettier | 3.x | 코드 포맷팅 |
| vitest | 3.x | 테스트 프레임워크 |
| @testing-library/preact | latest | Preact 컴포넌트 테스트 |
| @testing-library/react | latest | React 컴포넌트 테스트 |
| @playwright/test | latest | E2E 테스트 |
| husky | 9.x | Git 훅 |
| lint-staged | 15.x | 스테이징 파일 린트 |
| @commitlint/cli | 19.x | 커밋 메시지 검증 |
| pyright | latest | 타입 검사 |

---

## 성능 목표

| 지표 | 목표 | 비고 |
|------|------|------|
| 위젯 번들 사이즈 | < 50KB gzipped | IIFE 단일 파일 |
| 위젯 초기 로딩 | < 1초 | CDN + 캐싱 |
| 가격 계산 응답 | < 100ms | 클라이언트 사이드 계산 |
| Admin 페이지 로딩 | < 2초 | Server Components 활용 |
| API 응답 시간 | < 200ms (P95) | Edge Functions |
| Lighthouse 점수 (Admin) | > 85 | 성능/접근성/SEO |
| 파일 업로드 | < 30초 (100MB) | Presigned URL 직접 업로드 |

---

## 보안 고려사항

### OWASP 준수 항목

- **입력 검증**: Zod 스키마로 모든 API 입력 검증
- **인증/인가**: NextAuth.js 기반 세션 관리, API 키 기반 위젯 인증
- **CORS**: 위젯 API는 등록된 shopUrl 도메인만 허용
- **Rate Limiting**: API 엔드포인트별 요청 제한
- **SQL Injection**: Drizzle ORM 파라미터 바인딩으로 차단
- **XSS**: React의 기본 이스케이핑 + Shadow DOM 격리
- **CSRF**: SameSite 쿠키 + CSRF 토큰
- **파일 업로드**: 파일 타입/크기 검증, 악성 파일 스캐닝

### 환경 변수 관리

- `.env.local` (로컬 개발, Git 제외)
- `.env.production` (프로덕션, Vercel 환경변수로 관리)
- `.env.example` (템플릿, Git 포함)
- 민감 정보(DB 비밀번호, API 시크릿)는 절대 코드에 하드코딩 금지

---

## 확장 고려사항

### 향후 기술 확장 후보

| 기술 | 용도 | 시기 |
|------|------|------|
| Bull/BullMQ | 주문 처리 큐, 알림 발송 큐 | P1 |
| Resend / Nodemailer | 이메일 발송 (주문 확인, 상태 알림) | P1 |
| Aligo API | 알림톡/문자 발송 (11개 알림 포인트) | P1 |
| Toss Payments / 이니시스 | 결제 PG 연동 | P2 |
| WebSocket (Socket.io) | 실시간 주문 상태 업데이트 | P2 |
| Sentry | 에러 모니터링 | P1 |
| PostHog / Mixpanel | 위젯 사용 분석 | P2 |

**이미 도입된 기술**:
- Redis: 견적 캐싱 (300ms SLA) - SPEC-WB-006

---

# Widget Creator - Technology Stack (English)

## Technology Stack Summary

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend Admin** | React | 19.x | Admin dashboard UI framework |
| **Frontend Admin** | Next.js | 15.x | Admin app (App Router) |
| **Frontend Admin** | Tailwind CSS | 4.x | Utility-first CSS framework |
| **Frontend Admin** | shadcn/ui | latest | Accessible UI components |
| **Frontend Widget** | Preact | 10.x | Lightweight widget (15.47 KB gzipped) |
| **Frontend Widget** | @preact/signals | latest | Fine-grained reactivity |
| **Frontend Widget** | Shadow DOM | native | CSS isolation in widgets |
| **Backend** | Next.js | 15.x | API server + App Router |
| **Backend** | Node.js | 22.x | Runtime environment |
| **Backend** | tRPC | 11.x | TypeScript RPC framework |
| **Database** | PostgreSQL | 16.x | Relational database |
| **Database** | Drizzle ORM | 0.45.x | Type-safe query builder |
| **Database Driver** | postgres.js | latest | PostgreSQL JS driver (serverless) |
| **Caching** | Redis | latest | Quote caching (300ms SLA) |
| **File Storage** | S3 compatible | - | File uploads (500MB) |
| **AI/ML** | OpenAI API | latest | Natural language rule builder |
| **Validation** | Zod | 3.24.x | Runtime type validation |
| **Validation** | drizzle-zod | latest | Auto Zod schema generation |
| **State Management** | @tanstack/react-query | 5.x | Server state (admin) |
| **State Management** | Zustand | 5.x | Client state (admin, widget) |
| **State Management** | @preact/signals | latest | Reactive state (widget) |
| **Rules Engine** | json-rules-engine | latest | ECA pattern evaluation |
| **Icons** | lucide-react | latest | Icon library |
| **HTTP Client** | axios | latest | HTTP requests |
| **Auth** | NextAuth.js | 5.0-beta | Session management |
| **Auth** | JSON Web Tokens | native | JWT authentication |
| **Build** | Turborepo | latest | Monorepo orchestration |
| **Build** | Vite | 6.x | Widget build tool |
| **Build** | esbuild | latest | JavaScript bundler |
| **Build** | terser | latest | JavaScript minifier |
| **Testing** | Vitest | 3.x | Unit & integration tests |
| **Testing** | Testing Library | latest | Component testing utilities |
| **Testing** | Playwright | latest | End-to-end tests |
| **Code Quality** | TypeScript | 5.7+ | Type-safe language |
| **Code Quality** | ESLint | 9.x | Code linting |
| **Code Quality** | Prettier | 3.x | Code formatting |
| **Code Quality** | Pyright | latest | Type checking |
| **DevOps** | Vercel | latest | Hosting & deployment |
| **DevOps** | CDN | varies | Widget script delivery |
| **DevOps** | Docker | 27.x | Container runtime |
| **DevOps** | Git** | 2.45+ | Version control |

## Core Framework Decisions & Rationale

### Next.js 15 (App Router) - Admin Dashboard + API Server

**Why Next.js 15**:
- **Server Components**: Native rendering optimization reduces client JavaScript
- **API Routes**: Full-stack development without separate backend server
- **App Router**: File-system routing with streamlined organization
- **React 19 Integration**: Server Actions eliminate form boilerplate
- **Vercel Deployment**: Native optimization for serverless Edge Functions
- **Incremental Static Regeneration (ISR)**: Cache frequently accessed pages

**Architecture**:
- `apps/admin`: Admin dashboard (port 3001) with 26 CRUD routers
- `apps/web`: API server + user widget (port 3000) with 20 tRPC routers

### React 19 - Admin UI Framework

**Why React 19**:
- **Server Components**: Native support alongside Client Components
- **Concurrent Features**: Smooth UI for complex option selection flows
- **Improved Hooks**: useOptimistic, useFormStatus for better form handling
- **Ecosystem Maturity**: shadcn/ui, React Query, Zustand all fully compatible
- **Developer Experience**: Cleaner syntax with async components

### Preact 10.x + Preact Signals - Embeddable Widget (SPEC-WIDGET-SDK-001, 2026-02-23)

**Why Preact for Widgets**:
- **Bundle Size**: 3 KB gzipped vs React's 40+ KB
- **API Compatibility**: Handles 90%+ React patterns with minimal learning curve
- **Performance**: Faster Virtual DOM implementation
- **Shadow DOM**: Perfect for CSS isolation in embedded scenarios
- **Final Size**: 15.47 KB gzipped (69% under 50 KB target)

**State Management**:
- **@preact/signals**: Minimal overhead (~1 KB), fine-grained reactivity
- **5 Core Signals**: Widget state, selections, prices, status, options
- **No Re-renders**: Only affected components re-render on signal changes

**Build Configuration**:
- **Vite Library Mode**: IIFE output for script tag inclusion
- **Tree Shaking**: Remove unused code at build time
- **Terser Minification**: Maximum compression
- **Target**: ES2020 (modern browsers)

### Tailwind CSS v4 + shadcn/ui - Styling System

**Why Tailwind CSS v4**:
- **Utility-First**: Fast development with pre-built classes
- **Custom Properties**: CSS variables for theming (Huni Purple #5538b6)
- **Content Detection**: Auto-detection of used classes
- **Build Performance**: Native CSS layer improvements

**Design System Integration**:
- **shadcn/ui**: Copy-paste components built on Radix UI
- **Accessibility**: a11y features included by default
- **Customizable**: Full control over component styling
- **Huni Design Tokens**: Primary #5538b6, Secondary #eeebf9, Accent #351d87

### Drizzle ORM + PostgreSQL - Data Layer (SPEC-INFRA-001, 2026-02-22)

**Why Drizzle ORM**:
- **Type Safety**: $inferSelect, $inferInsert auto-generate types from schema
- **Lightweight**: 50% smaller than Prisma, perfect for serverless
- **SQL-Like**: Queries read like SQL but are type-safe
- **Vercel Serverless**: postgres.js driver optimized for edge
- **Migration Management**: drizzle-kit handles schema versions
- **Zod Integration**: drizzle-zod auto-generates validation schemas

**Database Design**:
- **PostgreSQL 16**: JSON/JSONB for flexible option storage
- **26 Huni Tables**: Catalog, materials, options, constraints, pricing, orders
- **6-Layer Architecture**: From element types → products → constraints → pricing
- **Relationships**: 30+ foreign key relationships with Drizzle relations

**Why PostgreSQL**:
- **JSON/JSONB Support**: Native storage for widget configs, option values
- **Complex Queries**: Powerful aggregation for analytics and reports
- **Transaction Safety**: ACID compliance for order/payment processing
- **Managed Services**: Vercel Postgres, Supabase, Neon all available

### Redis - Caching Layer (SPEC-WB-006, 2026-02-26)

**Quote API Performance**:
- **Target SLA**: 300ms for quote generation
- **Cache Key**: `quote:{widgetId}:{optionHash}:{quantity}`
- **Cache TTL**: 24 hours (configurable per widget)
- **Cache Strategy**: Write-through on quote update, read-through on query
- **Hit Rate**: ~80% expected for repeat products

### OpenAI API - Natural Language Rules (SPEC-WB-007, 2026-02-27)

**GLM Natural Language Rule Builder**:
- **Constraint Generation**: Convert natural language to constraint rules
- **Two-Step Conversion**: NL input → GPT-4 → constraint rule → widget config
- **History Tracking**: All conversions logged for audit and improvement
- **Cost Optimization**: Batch requests, cache results

### NextAuth.js v5 - Authentication

**Admin Authentication**:
- **Credentials Provider**: Email/password authentication
- **Session Management**: JWT + session hybrid mode
- **User Roles**: ADMIN, MANAGER, VIEWER (role-based access)
- **Data Ownership**: Serverless-friendly session storage

**Widget API Authentication**:
- **API Key Model**: UUID v4 keys issued per widget
- **Domain Binding**: API key restricted to registered shopUrl
- **Rate Limiting**: Token Bucket (60 requests/minute default)
- **Security**: Server-side validation only, no client exposure

## Constraint System - ECA Pattern

**Event-Condition-Action Architecture**:
- **Event**: User selects option (e.g., "Paper Type: Art Board")
- **Condition**: Evaluate business rule (e.g., "IF paper type is Art Board AND cost > 1000")
- **Action**: Execute consequence (e.g., "SHOW coating options", "SET price += 500")

**Implementation**:
- **json-rules-engine**: JavaScript rule evaluation engine
- **8 Action Types**: show, hide, require, enable, disable, validate, calculate, notify
- **Dependency Resolution**: Cascade constraint updates through option tree
- **Client + Server**: Client for UX responsiveness, server for authorization

## Development Environment

### Required Software

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 22.x LTS | JavaScript runtime |
| pnpm | 9.x | Package manager (Turborepo preferred) |
| PostgreSQL | 16.x | Database (local or Docker) |
| Docker | 27.x | Container runtime for local services |
| Git | 2.45+ | Version control |
| TypeScript | 5.7+ | Type checking |

### Initial Setup

```bash
# Clone and install
git clone <repo> widget.creator
cd widget.creator
pnpm install

# Setup environment
cp .env.example .env.local

# Start local services (PostgreSQL, MinIO/S3)
docker compose up -d

# Apply database migrations
pnpm drizzle-kit push

# Start development servers
pnpm dev
```

**Development Servers**:
- Admin Dashboard: http://localhost:3001
- API Server: http://localhost:3000
- Widget Dev: http://localhost:5173

### Environment Variables

```
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/widget_creator"

# Authentication
NEXTAUTH_SECRET="<random-secret>"
NEXTAUTH_URL="http://localhost:3000"

# S3 Storage
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_BUCKET="widget-uploads"

# Widget API
NEXT_PUBLIC_API_URL="http://localhost:3000"
NEXT_PUBLIC_WIDGET_CDN_URL="http://localhost:5173"

# OpenAI (for GLM rules)
OPENAI_API_KEY="<api-key>"

# Redis (for quote caching)
REDIS_URL="redis://localhost:6379"
```

## Build & Deployment Pipeline

### Turborepo Orchestration

**Build Dependency Graph**:
```
packages/core (build)
    ↓
packages/db (build, depends on core)
    ↓
packages/shared (build, depends on core)
    ↓
packages/widget (build, depends on core)
    ↓
apps/admin (build, depends on shared)
apps/web (build, depends on shared, core)
    ↓
packages/docs (build, depends on all)
```

**Remote Caching**: Turborepo cache stored in Vercel for CI/CD speedup

### Vite Library Mode - Widget Build

**Build Output**:
- **Format**: IIFE (Immediately Invoked Function Expression)
- **Size**: 15.47 KB gzipped (includes Preact, Signals, styles, and all components)
- **Target**: ES2020 (modern browsers, ~95% coverage)
- **Minification**: Terser with dead code elimination

**Build Command**: `pnpm build:widget`
**Output**: `packages/widget/dist/widget.js`

### Vercel Deployment

**Configuration**:
- `apps/admin`: Main deployment (admin.hooniprinting.com)
- `apps/web`: API functions (api.hooniprinting.com)
- Preview deployments for each PR
- Automatic rollback on build failure

**Edge Features**:
- Edge Functions for global API latency reduction
- Automatic image optimization
- Font loading optimization
- Security headers

### CDN Distribution

**Widget Script Deployment**:
- **Path**: `/widget/v1/widget.js` (versioned)
- **CDN**: Vercel Edge Network (default)
- **Caching**: Aggressive (immutable versioned URLs)
- **Fallback**: Cloudflare or AWS CloudFront

## Testing Strategy

### Unit Tests (Vitest)

| Package | Tests | Coverage | Focus |
|---------|-------|----------|-------|
| **packages/core** | 50+ | 100% | Pricing, constraints, quote logic |
| **packages/db** | 79 | 86% | Schema validation, seed data |
| **packages/shared** | 184 | 85%+ | Integration, adapters, events |
| **packages/widget** | 468 | 97-98% | Components, state, engines |
| **apps/admin** | 727 | 85%+ | CRUD operations, forms |
| **apps/web** | 100+ | 80%+ | API routes, middleware |

**Coverage Target**: 85% minimum (MoAI TRUST 5 framework)

### Integration Tests

- **Vitest**: Database queries, API client behavior
- **tRPC Integration**: Cross-service communication
- **Event Bus**: Domain event propagation

### End-to-End Tests (Playwright)

- **Widget Embedding**: Script injection, Shadow DOM access
- **Admin Workflows**: Create widget → configure options → publish
- **API Workflows**: Quote generation → order creation
- **Cross-Browser**: Chrome, Firefox, Safari

### Test Execution

```bash
# Unit tests
pnpm test

# Integration tests
pnpm test:integration

# E2E tests
pnpm test:e2e

# Coverage report
pnpm test:coverage
```

## Code Quality Tools

### TypeScript 5.7+

**Configuration**:
- `strict: true` (all strict rules enabled)
- `noUncheckedIndexedAccess: true` (safe index access)
- `composite: true` (project references for faster builds)
- Path aliases: `@core/`, `@shared/`, `@widget/`

### ESLint 9.x (Flat Config)

**Ruleset**:
- `@typescript-eslint/strict-type-checked` (strictest rules)
- `eslint-plugin-react-hooks` (hooks compliance)
- `eslint-plugin-import-x` (import organization)
- Custom rules per package (apps, packages)

### Prettier 3.x

**Formatting**:
- `printWidth: 100`
- `singleQuote: true`
- `trailingComma: 'all'`
- `tabWidth: 2`

### Commit Hooks (Husky + lint-staged)

- **pre-commit**: ESLint, Prettier, TypeScript check
- **commit-msg**: Conventional Commits validation
- **pre-push**: Full test suite (optional)

## Performance Targets

| Metric | Target | Current | Notes |
|--------|--------|---------|-------|
| Widget Bundle | < 50 KB | 15.47 KB | 69% under limit |
| Widget Load | < 1s | ~0.5s | CDN + cache |
| Quote API | < 100ms | <50ms (cached) | Redis caching |
| Admin Page | < 2s | ~1.5s | Server Components |
| API P95 | < 200ms | ~150ms | Edge Functions |
| File Upload | < 30s | <15s | 100MB Presigned URL |
| Lighthouse | > 85 | 88+ | Performance, Accessibility |

## Security Architecture

### OWASP Compliance

| Control | Implementation | Location |
|---------|----------------|----------|
| **Input Validation** | Zod schemas | Core, apps/web |
| **Authentication** | NextAuth.js + API Keys | apps/web/auth.ts |
| **Authorization** | Role-based access | Admin dashboard |
| **CORS** | shopUrl domain restriction | apps/web/api |
| **Rate Limiting** | Token Bucket | apps/web/api/_lib |
| **SQL Injection** | Drizzle parameterized queries | packages/shared |
| **XSS Protection** | React auto-escaping + Shadow DOM | packages/widget |
| **CSRF** | SameSite cookies + CSRF tokens | apps/web |
| **File Upload** | Type/size validation + scanning | packages/widget |
| **Secrets** | Environment variables only | .env.local (git-ignored) |

### Secret Management

- `.env.local`: Development (git-ignored)
- `.env.production`: Production secrets (Vercel env)
- `.env.example`: Template (git-included)
- CI/CD: Vercel environment variables

## Future Technology Expansion

| Technology | Use Case | Priority | Status |
|-----------|----------|----------|--------|
| **Bull/BullMQ** | Order processing queue | P1 | Planned |
| **Resend** | Email notifications | P1 | Planned |
| **Aligo API** | SMS/KakaoTalk (11 points) | P1 | Planned |
| **Toss Payments** | Payment gateway | P2 | Planned |
| **WebSocket** | Real-time order status | P2 | Planned |
| **Sentry** | Error monitoring | P1 | Planned |
| **PostHog** | Analytics & usage | P2 | Planned |

**Already Integrated**:
- Redis: Quote caching (300ms SLA) - SPEC-WB-006
- OpenAI: Natural language rules - SPEC-WB-007
- Shopby: E-commerce integration - SPEC-WIDGET-INTG-001

---

Document Version: 1.4.0
Created: 2026-02-22
Last Updated: 2026-02-27
Based on: Technology decisions, implementation artifacts, and performance metrics
