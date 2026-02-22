# Widget Creator - 기술 스택

## 기술 스택 전체 개요

```mermaid
graph TB
    subgraph "프론트엔드"
        NEXTJS["Next.js 16<br/>(App Router)"]
        REACT["React 19"]
        TAILWIND["Tailwind CSS v4"]
        SHADCN["shadcn/ui"]
        PREACT["Preact / Vanilla TS<br/>(위젯 전용)"]
    end

    subgraph "백엔드"
        API_ROUTES["Next.js API Routes<br/>또는 Hono"]
        PRISMA["Prisma ORM"]
        POSTGRES["PostgreSQL"]
        S3_STORAGE["S3 호환 스토리지"]
    end

    subgraph "인증"
        NEXTAUTH["NextAuth.js v5<br/>또는 Clerk"]
    end

    subgraph "빌드 / 배포"
        TURBOREPO["Turborepo"]
        VITE["Vite<br/>(위젯 빌드)"]
        VERCEL["Vercel<br/>(Admin + API)"]
        CDN["CDN<br/>(위젯 스크립트)"]
    end

    subgraph "개발 도구"
        TS["TypeScript 5.7+"]
        ESLINT["ESLint v9 (Flat Config)"]
        PRETTIER["Prettier"]
        VITEST["Vitest"]
        PLAYWRIGHT["Playwright (E2E)"]
    end

    NEXTJS --> REACT
    NEXTJS --> TAILWIND
    NEXTJS --> SHADCN
    NEXTJS --> API_ROUTES
    API_ROUTES --> PRISMA
    PRISMA --> POSTGRES
    API_ROUTES --> S3_STORAGE
    API_ROUTES --> NEXTAUTH
    TURBOREPO --> NEXTJS
    TURBOREPO --> VITE
    VITE --> PREACT
```

---

## 프레임워크 선정 및 근거

### Next.js 16 (App Router) - 관리자 대시보드 및 API

**선정 근거**:
- App Router의 Server Components로 초기 로딩 성능 최적화
- API Routes로 별도 백엔드 서버 없이 풀스택 구현 가능
- React 19 Server Actions를 활용한 폼 처리 간소화
- Vercel 배포 시 자동 최적화 (엣지 펑션, ISR, 이미지 최적화)
- 관리자 대시보드 특성상 SEO가 중요하지 않아 CSR/SSR 하이브리드 적합

**버전**: Next.js 16.x (2026년 안정 버전)
**라우팅**: App Router (`app/` 디렉토리)
**렌더링**: 대시보드 페이지는 클라이언트 컴포넌트 위주, 목록/통계는 Server Components 활용

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

### Preact 또는 Vanilla TypeScript - 임베더블 위젯

**선정 근거**:
- 번들 사이즈 50KB 미만 제약 충족 (React는 약 40KB gzipped로 위젯 코드 용량 부족)
- Preact: React 호환 API로 3KB gzipped, 개발 편의성과 경량성 양립
- Vanilla TS 대안: 프레임워크 의존성 완전 제거, 최소 번들 사이즈
- Shadow DOM 격리로 호스트 페이지 CSS 충돌 방지

**결정 기준**: 위젯 복잡도에 따라 선택
- 옵션 UI가 단순한 경우: Vanilla TypeScript
- 상태 관리가 복잡한 경우: Preact

### Prisma ORM - 데이터베이스 접근

**선정 근거**:
- TypeScript 네이티브 타입 안전성 (스키마에서 자동 타입 생성)
- 선언적 스키마 정의로 DB 마이그레이션 자동화
- PostgreSQL 최적화 (JSON 필드, 배열, 전문 검색)
- Prisma Studio로 개발 중 데이터 시각적 확인 가능

**버전**: Prisma 6.x
**데이터베이스**: PostgreSQL 16

### PostgreSQL - 데이터베이스

**선정 근거**:
- JSON/JSONB 네이티브 지원 (위젯 설정, 옵션 값, 가격 규칙 저장)
- 복합 쿼리 성능 (주문 목록 필터링, 통계 집계)
- 트랜잭션 안정성 (주문/결제 처리)
- Vercel Postgres, Supabase, Neon 등 관리형 서비스 다수 존재

**버전**: PostgreSQL 16.x

---

## 인증 및 보안

### NextAuth.js v5 (Auth.js) 또는 Clerk

**NextAuth.js v5 선정 시 근거**:
- Next.js 생태계 최적 통합
- 자체 호스팅으로 데이터 주권 보장
- Credentials Provider로 이메일/비밀번호 인증
- JWT + 세션 하이브리드 지원
- 무료

**Clerk 선정 시 근거**:
- 구현 시간 대폭 단축 (임베디드 UI 컴포넌트)
- 2FA, SSO, 조직 관리 기본 제공
- 위젯 API 키 기반 인증에 Clerk Backend API 활용 가능
- 유료 (프리 티어 제한)

**결정 기준**: MVP 단계에서는 NextAuth.js v5로 시작, 필요 시 Clerk으로 마이그레이션

### API 키 인증 (위젯 -> API)

위젯은 관리자가 생성한 API 키로 API 서버에 인증한다.

- 위젯별 고유 API 키 발급 (UUID v4 기반)
- API 키에 허용 도메인(shopUrl) 바인딩으로 도메인 검증
- Rate Limiting 적용 (분당 60회 기본)
- API 키는 서버 사이드에서만 검증 (클라이언트 노출 시 도메인 제한으로 보호)

---

## 파일 스토리지

### S3 호환 스토리지

**선정 근거**:
- 인쇄용 디자인 파일은 대용량 (PDF, AI 파일 수십MB~수백MB)
- Presigned URL로 클라이언트 직접 업로드 (서버 부하 제거)
- 버킷 정책으로 접근 제어
- AWS S3, Cloudflare R2, MinIO 등 호환 서비스 다수

**업로드 흐름**:
1. 클라이언트가 API에 업로드 URL 요청
2. API가 Presigned URL 생성 후 반환
3. 클라이언트가 S3에 직접 업로드
4. 업로드 완료 콜백으로 API에 파일 메타데이터 등록

**파일 형식별 처리** (주문프로세스 문서 기반):
- PDF: 디지털인쇄, 시트커팅, 화이트인쇄, UV평판출력, 책자, 합판, 고주파
- AI: 레이저커팅, 도장, 박(외주), 커팅(반칼/완칼)
- JPG: 실사출력, 패브릭출력, 전사인쇄, 현수막(외주)

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

### Vite - 위젯 빌드

**선정 근거**:
- 라이브러리 모드로 단일 JS 번들 생성
- Tree-shaking 및 코드 분할 최적화
- 빠른 HMR로 위젯 개발 생산성 향상
- ES 모듈 네이티브 지원

**빌드 설정**:
- 출력 형식: IIFE (전역 스코프에 즉시 등록)
- 타겟: ES2020 (모던 브라우저)
- 인라인 CSS (외부 파일 없이 단일 JS로 배포)
- 압축: Terser로 최소화

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
pnpm prisma migrate dev
pnpm prisma generate
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
- 패스 매핑으로 깔끔한 import (`@shared/`, `@pricing/`, `@ui/`)

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

### Vitest - 유닛/통합 테스트

**선정 근거**:
- Vite 기반으로 빠른 실행
- Jest 호환 API (마이그레이션 용이)
- TypeScript 네이티브 지원 (별도 변환 불필요)
- 코드 커버리지 내장 (v8 provider)

**테스트 전략**:
- `packages/pricing-engine/`: 가격 계산 로직 100% 커버리지 목표
- `packages/shared/`: 유틸리티 함수 테스트
- `apps/api/`: API 라우트 통합 테스트
- `apps/widget/`: 위젯 컴포넌트 단위 테스트

**커버리지 목표**: 85% 이상 (MoAI TRUST 5 기준)

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
| **Prisma Studio** | 데이터베이스 시각적 관리 도구 |
| **Storybook** | UI 컴포넌트 독립 개발/문서화 (선택) |

---

## 핵심 의존성 목록

### 런타임 의존성

| 패키지 | 버전 | 용도 | 사용 위치 |
|--------|------|------|-----------|
| next | 16.x | 풀스택 프레임워크 | admin, api |
| react / react-dom | 19.x | UI 라이브러리 | admin |
| preact | 10.x | 경량 UI (위젯 전용) | widget |
| prisma / @prisma/client | 6.x | ORM 및 DB 클라이언트 | api |
| tailwindcss | 4.x | 유틸리티 CSS | admin, ui |
| @radix-ui/* | latest | 접근성 UI 프리미티브 (shadcn 기반) | admin, ui |
| next-auth | 5.x | 인증 | admin, api |
| zod | 3.x | 스키마 검증 (API 입력, 폼 데이터) | shared, api |
| @tanstack/react-query | 5.x | 서버 상태 관리 (캐싱, 리패칭) | admin |
| zustand | 5.x | 클라이언트 상태 관리 | admin, widget |
| @aws-sdk/client-s3 | 3.x | S3 호환 파일 업로드 | api |
| lucide-react | latest | 아이콘 라이브러리 | admin, ui |

### 개발 의존성

| 패키지 | 버전 | 용도 |
|--------|------|------|
| typescript | 5.7+ | TypeScript 컴파일러 |
| turbo | latest | 모노레포 빌드 시스템 |
| vite | 6.x | 위젯 빌드 도구 |
| eslint | 9.x | 코드 린팅 |
| prettier | 3.x | 코드 포맷팅 |
| vitest | 3.x | 테스트 프레임워크 |
| @playwright/test | latest | E2E 테스트 |
| husky | 9.x | Git 훅 |
| lint-staged | 15.x | 스테이징 파일 린트 |
| @commitlint/cli | 19.x | 커밋 메시지 검증 |

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
- **SQL Injection**: Prisma ORM 파라미터 바인딩으로 차단
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
| Redis | API 캐싱, 세션 스토어, Rate Limiting | P1 |
| Bull/BullMQ | 주문 처리 큐, 알림 발송 큐 | P1 |
| Resend / Nodemailer | 이메일 발송 (주문 확인, 상태 알림) | P1 |
| Aligo API | 알림톡/문자 발송 (11개 알림 포인트) | P1 |
| Toss Payments / 이니시스 | 결제 PG 연동 | P2 |
| WebSocket (Socket.io) | 실시간 주문 상태 업데이트 | P2 |
| Sentry | 에러 모니터링 | P1 |
| PostHog / Mixpanel | 위젯 사용 분석 | P2 |

---

문서 버전: 1.0.0
작성일: 2026-02-22
