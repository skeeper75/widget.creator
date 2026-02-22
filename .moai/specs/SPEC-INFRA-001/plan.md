---
id: SPEC-INFRA-001
title: Drizzle ORM Migration - Implementation Plan
version: 1.2.0
status: draft
created: 2026-02-22
updated: 2026-02-22
spec_ref: SPEC-INFRA-001/spec.md
history: "v1.2.0 - WowPress 도메인 제거, 마이그레이션 범위 Huni 26개 모델로 축소, WowPress 정리 Phase 추가"
---

# SPEC-INFRA-001: Drizzle ORM 마이그레이션 - 구현 계획

## 1. 기술 스택

| 패키지 | 버전 | 용도 |
|--------|------|------|
| `drizzle-orm` | latest stable | ORM 및 쿼리 빌더 |
| `drizzle-kit` | latest stable | 마이그레이션 CLI 도구 |
| `postgres` (postgres.js) | latest stable | PostgreSQL 드라이버 (pure JS, serverless 최적) |
| `drizzle-zod` | latest stable | Zod 스키마 자동 생성 |

> **참고**: 정확한 버전은 `/moai run` 단계에서 최신 stable 버전을 확인하여 확정합니다.

### 드라이버 선택 근거: postgres.js

| 후보 | 장점 | 단점 | 결정 |
|------|------|------|------|
| `postgres` (postgres.js) | Pure JS, serverless 최적, Vercel Edge 호환, connection pooling 내장 | 비교적 새로운 드라이버 | **선택** |
| `pg` (node-postgres) | 오래된 생태계, 검증된 안정성 | Native binding 필요, serverless 미최적 | 제외 |
| `@neondatabase/serverless` | Neon 특화 최적화 | Neon 전용, 일반 PostgreSQL 미지원 | 제외 |

---

## 2. 구현 Phase

### Phase 1: Drizzle 인프라 구축

**Priority: High (Primary Goal)**

**작업 목록**:

- [ ] `drizzle-orm`, `drizzle-kit`, `postgres`, `drizzle-zod` 패키지 설치
- [ ] `packages/shared/src/db/index.ts` 생성 - DB 연결 설정
- [ ] `drizzle.config.ts` 생성 - Drizzle Kit 설정 (루트 레벨)
- [ ] `drizzle/` 디렉토리 생성 - 마이그레이션 파일 저장소
- [ ] DB 연결 테스트 스크립트 작성 및 실행

**핵심 파일**:

```
drizzle.config.ts                     # Drizzle Kit 설정
packages/shared/src/db/
  index.ts                            # DB 연결, drizzle 인스턴스 export
  schema/
    index.ts                          # 스키마 re-export hub
```

**DB 연결 설정 방향**:
- `postgres()` 함수로 connection 생성 (DATABASE_URL 환경 변수 사용)
- `drizzle()` 함수로 ORM 인스턴스 생성
- serverless 환경 고려하여 connection pooling 설정

---

### Phase 2: Prisma 스키마를 Drizzle 스키마로 변환

**Priority: High (Primary Goal)**

**작업 목록** (Huni 도메인 26개 모델, 6개 스키마 파일):

- [ ] `huni-catalog.schema.ts` 작성 (3 models)
  - HuniCategory (자기참조 관계 포함)
  - HuniProduct
  - HuniProductSize

- [ ] `huni-materials.schema.ts` 작성 (3 models)
  - HuniPaper
  - HuniMaterial
  - HuniPaperProductMapping

- [ ] `huni-processes.schema.ts` 작성 (4 models)
  - HuniPrintMode
  - HuniPostProcess
  - HuniBinding
  - HuniImpositionRule

- [ ] `huni-pricing.schema.ts` 작성 (6 models)
  - HuniPriceTable
  - HuniPriceTier
  - HuniFixedPrice
  - HuniPackagePrice
  - HuniFoilPrice
  - HuniLossQuantityConfig

- [ ] `huni-options.schema.ts` 작성 (5 models)
  - HuniOptionDefinition
  - HuniProductOption
  - HuniOptionChoice
  - HuniOptionConstraint
  - HuniOptionDependency

- [ ] `huni-integration.schema.ts` 작성 (5 models)
  - HuniMesItem
  - HuniMesItemOption
  - HuniProductMesMapping
  - HuniProductEditorMapping
  - HuniOptionChoiceMesMapping

- [ ] `schema/index.ts`에서 모든 스키마 re-export
- [ ] TypeScript 컴파일 검증 (`tsc --noEmit`)

**권장 시작점: `drizzle-kit pull` (introspect)**:

- `drizzle-kit pull` 명령으로 기존 데이터베이스에서 Drizzle 스키마를 자동 생성하는 것을 출발점으로 권장
- 자동 생성된 스키마에서 Huni 도메인만 추출하여 6개 도메인 파일로 수동 분리 및 검증
- 이를 통해 테이블 이름, 컬럼 타입, 인덱스 등의 초기 정확도를 확보

**@@map 테이블 이름 매핑 (필수)**:

- 25개 Huni 모델은 `@@map()`으로 커스텀 SQL 테이블 이름을 사용함
- `pgTable()` 첫 번째 인자에 Prisma 모델 이름이 아닌 **@@map에 지정된 실제 SQL 테이블 이름** 사용
- 예: `HuniCategory` -> `pgTable('categories', {...})` (NOT `pgTable('HuniCategory', {...})`)
- 전체 매핑 목록은 spec.md 섹션 1.5 참조
- **검증**: `SELECT tablename FROM pg_tables WHERE schemaname='public'` 로 실제 테이블 이름 확인 후 pgTable 이름과 대조

**Drizzle relations() 정의 (Phase 2 추가 작업)**:

- pgTable 스키마 정의 후 각 도메인 파일에 Drizzle `relations()` 정의 추가
- `relations()`은 외래키(references)와는 별도로, Drizzle relational query API를 위해 필요
- `db.query.users.findMany({ with: { posts: true } })` 형태의 관계형 쿼리 지원
- 각 도메인 파일에서 해당 도메인의 relations을 함께 export

**변환 주의사항**:

| Prisma 패턴 | Drizzle 변환 | 주의사항 |
|-------------|-------------|----------|
| `Json` | `jsonb()` | TypeScript 제네릭으로 타입 지정 가능 |
| `Decimal` | `numeric({ precision, scale })` | 정밀도 명시 필요 |
| `@@index([a, b, c])` | `index('idx_name').on(t.a, t.b, t.c)` | 인덱스 이름 명시 |
| `@relation(onDelete: Cascade)` | `references(() => t.id, { onDelete: 'cascade' })` | 관계별 cascade 확인 |
| Self-referential | `references(() => sameTable.id)` | 순환 참조 처리 |
| `@updatedAt` | `timestamp().$onUpdate(() => new Date())` | 자동 업데이트 |

---

### Phase 3: 초기 마이그레이션 생성

**Priority: High (Primary Goal)**

**작업 목록**:

- [ ] `drizzle-kit generate` 실행하여 초기 마이그레이션 SQL 생성
- [ ] 생성된 SQL 파일을 기존 DB 스키마와 비교 검증
- [ ] 불필요한 ALTER/DROP 문이 없는지 확인 (기존 스키마 보존)
- [ ] `drizzle-kit push` 또는 `drizzle-kit migrate` 로 스키마 동기화 검증

**검증 방법**:
- `pg_dump --schema-only` 로 마이그레이션 전후 스키마 비교
- 테이블, 컬럼, 인덱스, 제약조건 일치 여부 확인
- 데이터 손실 가능성이 있는 명령어(DROP, ALTER COLUMN TYPE) 부재 확인

---

### Phase 4: Seed 스크립트 마이그레이션

**Priority: Medium (Secondary Goal)**

> **참고**: WowPress 도메인 제거로 `prisma/seed.ts` (WowPress seeder, nested create 포함)는 삭제 대상이며, `prisma/seed-normalized.ts` (Huni 도메인)만 Drizzle로 변환한다. 이로 인해 복잡도가 대폭 감소하였다.

**작업 목록**:

- [ ] `prisma/seed-normalized.ts` 분석 - Huni 도메인 Prisma API 사용 패턴 파악
- [ ] Drizzle API 기반 새 Huni seed 스크립트 작성
  - `prisma.model.create()` -> `db.insert(table).values()`
  - `prisma.model.createMany()` -> `db.insert(table).values([...])`
  - `prisma.$transaction()` -> `db.transaction(async (tx) => { ... })`
  - `prisma.model.upsert()` -> `db.insert(table).values().onConflictDoUpdate()`
- [ ] 새 seed 스크립트 실행 및 Huni 데이터 삽입 검증
- [ ] 기존 Huni seed 데이터와 새 seed 데이터 비교 검증

**Prisma-to-Drizzle API 매핑**:

| Prisma API | Drizzle API |
|-----------|-------------|
| `prisma.user.create({ data })` | `db.insert(users).values(data).returning()` |
| `prisma.user.createMany({ data })` | `db.insert(users).values(dataArray)` |
| `prisma.user.findUnique({ where })` | `db.select().from(users).where(eq(users.id, id))` |
| `prisma.user.findMany()` | `db.select().from(users)` |
| `prisma.user.update({ where, data })` | `db.update(users).set(data).where(eq(users.id, id))` |
| `prisma.user.delete({ where })` | `db.delete(users).where(eq(users.id, id))` |
| `prisma.user.upsert()` | `db.insert(users).values().onConflictDoUpdate()` |
| `prisma.$transaction([...])` | `db.transaction(async (tx) => { ... })` |

---

### Phase 5: WowPress 도메인 정리

**Priority: Medium (Secondary Goal)**

**작업 목록**:

- [ ] WowPress 10개 테이블 DROP 마이그레이션 생성
  - DROP TABLE: ProductCategory, PrintProduct, ProductSize, ProductPaper, ProductColor, ProductPrintMethod, ProductPostProcess, ProductOrderQty, PricingTable, DeliveryInfo
  - `drizzle-kit generate` 또는 수동 SQL 마이그레이션으로 DROP 실행
- [ ] `prisma/seed.ts` 삭제 (WowPress seeder)
- [ ] `prisma/__tests__/schema.test.ts` 삭제 (WowPress 테스트)
- [ ] `prisma/__tests__/schema-normalized.test.ts` 삭제
- [ ] SPEC-DATA-001 status를 "archived"로 변경 (해당 spec.md 존재 시)
- [ ] ~~`ref/wowpress/` 디렉토리 삭제~~ → **유지** (참조 데이터, 삭제 금지)
- [ ] 코드베이스 전체에서 WowPress 모델 참조 검색 및 제거 (`ref/` 디렉토리 제외)
  - grep으로 ProductCategory, PrintProduct, PricingTable 등 참조 검출
  - 런타임 코드에서 WowPress 참조가 없는지 확인

**검증 방법**:
- `SELECT tablename FROM pg_tables WHERE schemaname='public'` 로 WowPress 테이블 부재 확인
- `grep -r "ProductCategory\|PrintProduct\|PricingTable" --include="*.ts" --include="*.tsx" --exclude-dir=ref` 로 잔존 참조 검출

---

### Phase 6: Prisma 의존성 제거 및 정리

**Priority: Medium (Secondary Goal)**

**작업 목록**:

- [ ] `package.json`에서 `@prisma/client`, `prisma` 제거
- [ ] `prisma/schema.prisma` 파일 보관 (참조용으로 별도 디렉토리 이동 또는 삭제)
- [ ] `prisma/seed-normalized.ts` 파일 제거 또는 보관
- [ ] `package.json`의 `prisma` 관련 scripts 제거/수정
  - `prisma generate` 제거
  - `prisma db seed` -> Drizzle seed 스크립트로 교체
  - `prisma studio` -> `drizzle-kit studio` 로 교체
- [ ] `.env` 파일의 DATABASE_URL 확인 (변경 불필요, 동일 형식 사용)
- [ ] `node_modules` 정리 및 재설치
- [ ] Turborepo 빌드 파이프라인에서 `prisma generate` 단계 제거
- [ ] `.gitignore` 업데이트 (Drizzle 관련 패턴 추가)
- [ ] root `package.json`의 `pnpm.onlyBuiltDependencies`에서 `@prisma/client`, `@prisma/engines`, `prisma` 항목 제거

---

### Phase 7: 검증 및 최종 확인

**Priority: High (Final Goal)**

**작업 목록**:

- [ ] 전체 Turborepo 빌드 성공 확인 (`turbo build`)
- [ ] TypeScript 컴파일 오류 제로 확인 (`tsc --noEmit`)
- [ ] Seed 스크립트 정상 실행 확인
- [ ] 데이터베이스 스키마 비교 검증 (pg_dump diff)
- [ ] 기존 데이터 무결성 확인 (테이블별 row count 비교)
- [ ] `drizzle-kit studio` 정상 동작 확인
- [ ] Vercel 배포 환경 테스트 (로컬 또는 preview)

---

## 3. 파일 구조 변경 계획

### 신규 생성 파일

```
drizzle.config.ts                              # Drizzle Kit 설정
drizzle/                                       # 마이그레이션 파일 디렉토리
  meta/                                        # 마이그레이션 메타데이터
packages/shared/src/db/
  index.ts                                     # DB 연결 및 drizzle 인스턴스
  schema/
    index.ts                                   # 스키마 re-export
    huni-catalog.schema.ts                     # Huni 카탈로그 (3 models)
    huni-materials.schema.ts                   # Huni 자재 (3 models)
    huni-processes.schema.ts                   # Huni 공정 (4 models)
    huni-pricing.schema.ts                     # Huni 가격 (6 models)
    huni-options.schema.ts                     # Huni 옵션 (5 models)
    huni-integration.schema.ts                 # Huni MES 연동 (5 models)
scripts/
  seed.ts                                      # Drizzle 기반 새 seed 스크립트
```

### 제거/보관 파일

```
prisma/schema.prisma                           # 보관 또는 제거
prisma/seed.ts                                 # 보관 또는 제거
prisma/seed-normalized.ts                      # 보관 또는 제거
```

### 수정 파일

```
package.json                                   # Prisma 제거, Drizzle 추가
packages/shared/package.json                   # Drizzle 의존성 추가
turbo.json                                     # 빌드 파이프라인 수정 (prisma generate 제거)
.gitignore                                     # Drizzle 관련 패턴 추가
tsconfig.json (해당 시)                         # paths 설정 확인
```

---

## 4. 리스크 분석 및 대응

### Risk 1: 26-모델 스키마 복잡도 (MEDIUM)

**설명**: Huni 도메인 26개 모델을 6개 Drizzle 파일로 변환하는 과정에서 누락 또는 오류 발생 가능. WowPress 10개 모델 제외로 복잡도가 감소함.

**대응 방안**:
- 모델별 체크리스트 작성 및 1:1 검증
- `pg_dump --schema-only` 전후 비교 자동화
- 도메인별 분할 변환으로 점진적 검증

### Risk 2: JSON 필드 타입 안전성 (MEDIUM)

**설명**: 15+ JSON/JSONB 필드의 Prisma `Json` -> Drizzle `jsonb()` 변환 시 타입 정보 손실 가능

**대응 방안**:
- 각 JSON 필드의 실제 데이터 구조 분석
- TypeScript 인터페이스 정의 후 `jsonb<T>()` 형태로 타입 지정
- 런타임 검증을 위한 Zod 스키마 작성 (Optional)

### Risk 3: 복합 인덱스 정확도 (MEDIUM)

**설명**: Huni 도메인의 복합 인덱스 등 복잡한 인덱스의 정확한 재현이 어려울 수 있음. (PricingTable 8-column 복합 인덱스는 WowPress DROP 대상이므로 해당 없음)

**대응 방안**:
- `\di+` (psql) 또는 `pg_indexes` 뷰로 Huni 도메인 기존 인덱스 정확히 파악
- Drizzle 인덱스 생성 후 DB 레벨에서 비교 검증
- `EXPLAIN ANALYZE` 로 쿼리 플랜 비교

### Risk 4: Seed 스크립트 트랜잭션 패턴 (LOW)

**설명**: Prisma `$transaction` -> Drizzle `db.transaction` 변환 시 트랜잭션 격리 레벨이나 동작 차이 발생 가능

**대응 방안**:
- 기존 seed 스크립트의 트랜잭션 패턴 분석
- Drizzle 트랜잭션 API 동작 확인
- 삽입 순서(외래키 의존성) 검증

### Risk 5: Decimal 타입 매핑 (LOW)

**설명**: Prisma `Decimal` -> Drizzle `numeric()` 변환 시 정밀도 설정 미스 가능

**대응 방안**:
- 기존 Decimal 컬럼의 precision/scale 확인
- `numeric({ precision, scale })` 명시적 설정
- 샘플 데이터로 정밀도 보존 검증

### Risk 6: Prisma nested create 변환 복잡도 (LOW - 해소됨)

**설명**: WowPress seed.ts (PrintProduct nested create 포함) 삭제로 이 리스크는 사실상 해소됨. Huni seed-normalized.ts는 단순한 insert 패턴을 사용.

**대응 방안**:
- WowPress seed.ts를 Phase 5에서 삭제
- Huni seed-normalized.ts만 Drizzle로 변환 (단순 구조)

### Risk 7: @@map 테이블 이름 매핑 정확도 (HIGH)

**설명**: 25개 Huni 모델이 `@@map()`으로 커스텀 SQL 테이블 이름을 사용. pgTable 정의 시 실제 SQL 테이블 이름을 사용하지 않으면 기존 데이터에 접근 불가.

**대응 방안**:
- `SELECT tablename FROM pg_tables WHERE schemaname='public'` 로 실제 테이블 이름 확인
- spec.md 섹션 1.5의 매핑 테이블을 참조하여 1:1 대조 검증
- `drizzle-kit pull` (introspect)로 자동 생성된 스키마와 비교

### Risk 8: Decimal 타입 매핑 범위 (MEDIUM)

**설명**: Huni 도메인 30+ Decimal 필드를 Drizzle `numeric()` 타입으로 매핑 시 precision/scale 정확도에 주의 필요. WowPress의 Decimal[] 배열 필드(ProductOrderQty.qtyList)는 DROP 대상이므로 해당 없음.

**대응 방안**:
- 각 Huni Decimal 필드의 precision/scale 확인
- `numeric({ precision, scale })` 명시적 설정
- 기존 데이터 샘플로 정밀도 보존 검증

### Risk 9: Nullable unique 제약조건 동작 (MEDIUM)

**설명**: `onConflictDoUpdate` 사용 시 nullable unique 컬럼의 동작이 Prisma `upsert`와 다를 수 있음. PostgreSQL에서 NULL은 unique 비교에서 항상 다른 값으로 취급됨.

**대응 방안**:
- nullable unique 컬럼이 포함된 upsert 패턴 사전 식별
- `COALESCE` 또는 partial index 활용 검토
- 기존 seed 스크립트의 upsert 사용 패턴 분석

### Risk 10: Prisma 테스트 파일 정리 (LOW)

**설명**: `prisma/__tests__/schema.test.ts`, `prisma/__tests__/schema-normalized.test.ts` 파일이 잔존할 수 있음.

**대응 방안**:
- Phase 5에서 명시적으로 제거 항목에 포함
- `prisma/` 디렉토리 전체 정리 시 함께 처리

### Risk 11: pnpm.onlyBuiltDependencies 정리 (LOW)

**설명**: root `package.json`의 `pnpm.onlyBuiltDependencies`에 `@prisma/client`, `@prisma/engines`, `prisma` 항목이 잔존할 수 있음.

**대응 방안**:
- Phase 6에서 `package.json` 정리 시 함께 제거
- `pnpm install` 후 warning 없는지 확인

---

## 5. 의존성 그래프

```
Phase 1 (인프라) ──> Phase 2 (스키마 변환) ──> Phase 3 (마이그레이션 생성)
                                                       │
                                                       v
                              Phase 4 (Seed 마이그레이션) ──> Phase 5 (WowPress 정리)
                                                                      │
                                                                      v
                                                Phase 6 (Prisma 제거) ──> Phase 7 (최종 검증)
```

Phase 1 -> Phase 2: 인프라 설정 후 스키마 작성 가능
Phase 2 -> Phase 3: 스키마 완성 후 마이그레이션 생성 가능
Phase 3 -> Phase 4: 마이그레이션 검증 후 seed 변환
Phase 4 -> Phase 5: seed 검증 후 WowPress 테이블 DROP 안전
Phase 5 -> Phase 6: WowPress 정리 후 Prisma 제거
Phase 6 -> Phase 7: 모든 제거 완료 후 최종 검증

---

## 6. Expert Consultation 권장

### Backend Expert (expert-backend)

**대상 영역**: Drizzle 스키마 설계, DB 연결 설정, WowPress DROP 전략
**이유**: 26개 Huni 모델의 정확한 변환, WowPress 10개 테이블 안전 DROP, serverless 환경 최적화를 위한 전문 검토 필요

### DevOps Expert (expert-devops)

**대상 영역**: Turborepo 빌드 파이프라인 수정, Vercel 배포 설정
**이유**: `prisma generate` 제거 후 빌드 파이프라인 정상 동작 확인 필요
