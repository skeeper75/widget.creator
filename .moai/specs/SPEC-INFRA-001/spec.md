---
id: SPEC-INFRA-001
title: Drizzle ORM Migration
version: 1.3.0
status: draft
created: 2026-02-22
updated: 2026-02-22
author: MoAI
priority: P0
tags: infrastructure, database, orm, drizzle, prisma, migration
related_specs: []
---

# SPEC-INFRA-001: Drizzle ORM 마이그레이션

## HISTORY

| 버전 | 날짜 | 작성자 | 변경 내용 |
|------|------|--------|-----------|
| 1.0.0 | 2026-02-22 | MoAI | 초기 SPEC 작성 |
| 1.1.0 | 2026-02-22 | MoAI | expert-backend 리뷰 반영: @@map 매핑, 타입 보완, 리스크 추가, 인수 시나리오 보강 |
| 1.2.0 | 2026-02-22 | MoAI | WowPress 도메인 제거, 마이그레이션 범위 Huni 26개 모델로 축소 |
| 1.3.0 | 2026-02-22 | MoAI | ref/wowpress/ 삭제 금지로 정정 (REQ-W05 변경) |

---

## 1. Environment (환경)

### 1.1 현재 시스템 상태

- **프로젝트**: Widget Creator - 후니프린팅 위젯 빌더 (인쇄 주문 위젯 SaaS 플랫폼)
- **아키텍처**: Turborepo monorepo
- **현재 ORM**: Prisma 6.x (@prisma/client ~6.0.0, prisma ~6.0.0)
- **데이터베이스**: PostgreSQL 16 (DATABASE_URL: postgresql://...localhost:5432/huni_builder)
- **배포 환경**: Vercel (serverless)
- **기술 스택**: Next.js 16, React 19, TypeScript 5.7+, Tailwind CSS v4

### 1.2 Prisma 현황 분석

- **Schema**: `prisma/schema.prisma` (909 lines)
- **모델 수**: 26개 모델 (Huni 도메인만 마이그레이션 대상)
- **Prisma 사용 범위**: seed 스크립트에서만 사용 (`prisma/seed.ts`, `prisma/seed-normalized.ts`)
- **앱 코드 사용**: 없음 (routes, services, middleware에서 Prisma 직접 사용하지 않음)
- **마이그레이션 이력**: 없음 (schema-only, `prisma/migrations/` 디렉토리 미존재)
- **WowPress 도메인**: 10개 모델은 마이그레이션 대상에서 제외, DROP 처리 예정

### 1.3 도메인 구성

**Drizzle 마이그레이션 대상: Huni Print Auto-Quote System (26 models)**:
HuniCategory, HuniProduct, HuniProductSize, HuniPaper, HuniMaterial, HuniPaperProductMapping, HuniPrintMode, HuniPostProcess, HuniBinding, HuniImpositionRule, HuniPriceTable, HuniPriceTier, HuniFixedPrice, HuniPackagePrice, HuniFoilPrice, HuniLossQuantityConfig, HuniOptionDefinition, HuniProductOption, HuniOptionChoice, HuniOptionConstraint, HuniOptionDependency, HuniMesItem, HuniMesItemOption, HuniProductMesMapping, HuniProductEditorMapping, HuniOptionChoiceMesMapping

**WowPress Print Product Catalog (10 models) - DROP 대상 (마이그레이션 제외)**:
ProductCategory, PrintProduct, ProductSize, ProductPaper, ProductColor, ProductPrintMethod, ProductPostProcess, ProductOrderQty, PricingTable, DeliveryInfo
> WowPress 도메인은 더 이상 사용하지 않으므로 데이터베이스에서 DROP 처리한다.

### 1.4 스키마 특성

| 특성 | 상세 |
|------|------|
| JSON/JSONB 필드 | Huni 도메인 다수 JSON 필드 (coverInfo, rawData 등) |
| 관계 (Relations) | 30+ (Huni 도메인, cascade delete 포함) |
| 인덱스 | 40+ (Huni 도메인, 복합 인덱스 포함) |
| Decimal 타입 | 30+ Huni Decimal 필드 (`@db.Decimal(p, s)`) |
| 자기참조 관계 | HuniCategory (parentId) |
| Enum 정의 | Prisma enum 미사용, 문자열 기반 |

### 1.5 @@map 테이블 이름 매핑

Huni 도메인 26개 모델 중 25개가 `@@map()`을 사용하여 커스텀 SQL 테이블 이름을 지정한다. Drizzle 변환 시 Prisma 모델 이름이 아닌 **실제 SQL 테이블 이름**을 `pgTable()` 첫 번째 인자로 사용해야 한다.

> **주의**: Drizzle 문법은 `pgTable('actual_sql_table_name', {...})` 형태이며, Prisma 모델 이름은 SQL 테이블 이름이 아니다.

**Huni 모델 @@map 매핑 테이블** (25/26 모델):

| Prisma Model | SQL Table Name (@@map) |
|-------------|----------------------|
| HuniCategory | categories |
| HuniProduct | products |
| HuniProductSize | product_sizes |
| HuniPaper | papers |
| HuniMaterial | materials |
| HuniPaperProductMapping | paper_product_mappings |
| HuniPrintMode | print_modes |
| HuniPostProcess | post_processes |
| HuniBinding | bindings |
| HuniImpositionRule | imposition_rules |
| HuniPriceTable | price_tables |
| HuniPriceTier | price_tiers |
| HuniFixedPrice | fixed_prices |
| HuniPackagePrice | package_prices |
| HuniFoilPrice | foil_prices |
| HuniLossQuantityConfig | loss_quantity_configs |
| HuniOptionDefinition | option_definitions |
| HuniProductOption | product_options |
| HuniOptionChoice | option_choices |
| HuniOptionConstraint | option_constraints |
| HuniOptionDependency | option_dependencies |
| HuniMesItem | mes_items |
| HuniMesItemOption | mes_item_options |
| HuniProductMesMapping | product_mes_mappings |
| HuniProductEditorMapping | product_editor_mappings |
| HuniOptionChoiceMesMapping | option_choice_mes_mappings |

> **참고**: WowPress 모델은 마이그레이션 대상에서 제외되어 @@map 관련 처리가 불필요하다.

---

## 2. Assumptions (전제조건)

### 2.1 기술적 전제

- A1: PostgreSQL 16 데이터베이스 스키마는 Drizzle ORM으로 동등하게 표현 가능하다
- A2: `postgres.js` 드라이버는 Vercel serverless 환경에서 안정적으로 동작한다
- A3: Drizzle Kit은 기존 PostgreSQL 스키마에 대한 마이그레이션을 정확하게 생성할 수 있다
- A4: Prisma의 모든 JSON/JSONB 필드는 Drizzle의 `jsonb()` 타입으로 완전히 대체 가능하다
- A5: 기존 seed 데이터는 Drizzle API를 통해 동일하게 삽입 가능하다

### 2.2 비즈니스 전제

- A6: 마이그레이션 기간 동안 데이터 손실이 발생하지 않아야 한다
- A7: 마이그레이션은 Big-Bang 전략으로 진행한다 (Prisma가 seed script에서만 사용되므로 점진적 전환 불필요)
- A8: 기존 데이터베이스 스키마 구조는 변경하지 않으며, ORM 레이어만 교체한다

### 2.3 인프라 전제

- A9: `packages/shared/` 패키지에서 DB 스키마와 타입을 공유한다
- A10: monorepo 구조 내에서 Drizzle 설정은 루트 레벨 `drizzle.config.ts`에서 관리한다

---

## 3. Requirements (요구사항)

### 3.1 Ubiquitous Requirements (항상 적용)

- **REQ-U01**: 시스템은 **항상** Huni 도메인 26개 모델을 Drizzle 스키마로 정확하게 정의해야 한다
- **REQ-U02**: 시스템은 **항상** Huni 도메인의 모든 관계(30+)와 cascade delete 설정을 보존해야 한다
- **REQ-U03**: 시스템은 **항상** Huni 도메인의 모든 인덱스(40+, 복합 인덱스 포함)를 동일하게 재현해야 한다
- **REQ-U04**: 시스템은 **항상** TypeScript 타입 안전성을 Drizzle inferred types를 통해 제공해야 한다
- **REQ-U05**: 시스템은 **항상** 기존 데이터베이스의 모든 데이터를 보존해야 한다 (zero data loss)

### 3.2 Event-Driven Requirements (이벤트 기반)

- **REQ-E01**: **WHEN** `drizzle-kit generate` 명령이 실행될 **THEN** 현재 Drizzle 스키마와 데이터베이스 간의 차이를 정확하게 반영하는 SQL 마이그레이션 파일이 생성되어야 한다
- **REQ-E02**: **WHEN** seed 스크립트가 실행될 **THEN** Drizzle API를 통해 모든 시드 데이터가 정확하게 삽입되어야 한다
- **REQ-E03**: **WHEN** `drizzle-kit push` 명령이 실행될 **THEN** 데이터베이스 스키마가 Drizzle 정의와 동기화되어야 한다
- **REQ-E04**: **WHEN** Turborepo 빌드가 실행될 **THEN** `prisma generate` 없이 정상적으로 빌드가 완료되어야 한다

### 3.3 State-Driven Requirements (상태 기반)

- **REQ-S01**: **IF** JSON/JSONB 필드에 데이터가 존재하면 **THEN** Drizzle의 `jsonb()` 타입으로 올바르게 읽기/쓰기가 가능해야 한다
- **REQ-S02**: **IF** Decimal 타입 필드(Huni 도메인 30+ 필드)에 값이 존재하면 **THEN** Drizzle의 `numeric()` 타입으로 정밀도 손실 없이 처리되어야 한다
- **REQ-S03**: **IF** 자기참조 관계(HuniCategory.parentId)가 존재하면 **THEN** Drizzle relations에서 정확하게 표현되어야 한다
- **REQ-S04**: **IF** 복합 인덱스가 정의되어 있으면 **THEN** Drizzle 인덱스 정의에서 동일한 컬럼 순서와 구성으로 재현되어야 한다

### 3.4 Optional Requirements (선택적)

- **REQ-O01**: **가능하면** `drizzle-zod`를 통한 API 검증 스키마를 Drizzle 스키마로부터 자동 생성해야 한다
- **REQ-O02**: **가능하면** JSON 필드에 대한 TypeScript 타입 정의를 제공하여 런타임 타입 안전성을 강화해야 한다
- **REQ-O03**: **가능하면** 데이터베이스 연결 풀링 설정을 Vercel serverless 환경에 최적화해야 한다

### 3.5 Unwanted Behavior Requirements (금지 사항)

- **REQ-N01**: 시스템은 마이그레이션 후 `@prisma/client` 또는 `prisma` 의존성을 **포함하지 않아야 한다**
- **REQ-N02**: 시스템은 데이터베이스 스키마 구조(테이블, 컬럼, 제약조건)를 **변경하지 않아야 한다** (ORM 레이어만 교체)
- **REQ-N03**: 시스템은 기존 데이터를 **손실하지 않아야 한다**
- **REQ-N04**: 시스템은 마이그레이션 과정에서 데이터베이스 다운타임을 **발생시키지 않아야 한다**

### 3.6 WowPress 도메인 정리 Requirements

- **REQ-W01**: **WHEN** Drizzle 마이그레이션이 완료된다 **THEN** WowPress 10개 테이블(ProductCategory, PrintProduct, ProductSize, ProductPaper, ProductColor, ProductPrintMethod, ProductPostProcess, ProductOrderQty, PricingTable, DeliveryInfo)이 DROP되어야 한다
- **REQ-W02**: **WHEN** WowPress 정리가 완료된다 **THEN** `prisma/seed.ts` 파일이 삭제되어야 한다 (WowPress seeder)
- **REQ-W03**: **WHEN** WowPress 정리가 완료된다 **THEN** `prisma/__tests__/schema.test.ts` 파일이 삭제되어야 한다 (WowPress 테스트)
- **REQ-W04**: **WHEN** WowPress 정리가 완료된다 **THEN** SPEC-DATA-001의 status가 "archived"로 변경되어야 한다
- **REQ-W05**: ~~`ref/wowpress/` 디렉토리 삭제~~ - **제외**: `ref/wowpress/`는 참조 데이터로 유지한다 (삭제 금지)
- **REQ-W06**: 시스템은 WowPress DROP 이후 어떤 **런타임 코드**도 WowPress 모델을 **참조하지 않아야 한다** (`ref/` 디렉토리 제외)

### 3.7 Complex Requirements (복합 요구사항)

- **REQ-C01**: **IF** monorepo 내 여러 앱에서 DB 접근이 필요하고 **AND WHEN** 새로운 앱이 추가될 **THEN** `packages/shared/src/db/`에서 export된 Drizzle 스키마와 타입을 import하여 즉시 사용할 수 있어야 한다
- **REQ-C02**: **IF** CI/CD 파이프라인에서 빌드가 실행되고 **AND WHEN** `prisma generate` 단계가 제거된 상태일 **THEN** Drizzle 기반 빌드가 추가 설정 없이 정상적으로 완료되어야 한다

---

## 4. Specifications (기술 명세)

### 4.1 대상 기술 스택

| 구분 | 패키지 | 용도 |
|------|--------|------|
| ORM | `drizzle-orm` | 쿼리 빌더 및 ORM |
| 마이그레이션 | `drizzle-kit` | 스키마 마이그레이션 도구 |
| 드라이버 | `postgres` (postgres.js) | PostgreSQL 연결 (pure JS, serverless 최적) |
| 검증 | `drizzle-zod` | Zod 스키마 자동 생성 |

### 4.2 스키마 파일 구조

```
packages/shared/src/db/
  index.ts                    # DB 연결 및 export
  schema/
    index.ts                  # 모든 스키마 re-export
    huni-catalog.schema.ts    # HuniCategory, HuniProduct, HuniProductSize (3 models)
    huni-materials.schema.ts  # HuniPaper, HuniMaterial, HuniPaperProductMapping (3 models)
    huni-processes.schema.ts  # HuniPrintMode, HuniPostProcess, HuniBinding, HuniImpositionRule (4 models)
    huni-pricing.schema.ts    # HuniPriceTable, HuniPriceTier, HuniFixedPrice, HuniPackagePrice, HuniFoilPrice, HuniLossQuantityConfig (6 models)
    huni-options.schema.ts    # HuniOptionDefinition, HuniProductOption, HuniOptionChoice, HuniOptionConstraint, HuniOptionDependency (5 models)
    huni-integration.schema.ts # HuniMesItem, HuniMesItemOption, HuniProductMesMapping, HuniProductEditorMapping, HuniOptionChoiceMesMapping (5 models)
```

### 4.3 설정 파일

- `drizzle.config.ts`: 루트 레벨 Drizzle Kit 설정
- `drizzle/`: 마이그레이션 파일 디렉토리

### 4.4 마이그레이션 전략

**Big-Bang 전환** (권장):
- Prisma가 seed 스크립트에서만 사용되므로 점진적 전환 불필요
- 전체 교체가 단순하고 리스크가 낮음
- 데이터베이스 스키마 자체는 변경하지 않음 (DDL 변경 없음)

### 4.5 타입 Export 전략

- Drizzle `$inferSelect` 및 `$inferInsert` 타입을 `packages/shared`에서 export
- `drizzle-zod`를 통한 Zod 스키마 자동 생성 및 export (Optional)

### 4.6 Prisma에서 Drizzle 타입 매핑

| Prisma Type | Drizzle Type | 비고 |
|-------------|-------------|------|
| `String` | `text()` / `varchar()` | 용도에 따라 선택 |
| `Int` | `integer()` | - |
| `BigInt` | `bigint()` | - |
| `Float` | `doublePrecision()` | - |
| `Decimal` | `numeric()` | 정밀도 보존 |
| `Boolean` | `boolean()` | - |
| `DateTime` | `timestamp()` | `{ withTimezone: true }` |
| `Json` | `jsonb()` | TypeScript 타입 지정 가능 |
| `@relation(onDelete: Cascade)` | `references(() => table.id, { onDelete: 'cascade' })` | - |
| `@@index([a, b])` | `index().on(table.a, table.b)` | 복합 인덱스 |
| `@@unique([a, b])` | `unique().on(table.a, table.b)` | 복합 유니크 |
| `Int @id @default(autoincrement())` | `serial('id').primaryKey()` | 모든 26개 Huni 모델 |
| `@db.VarChar(N)` | `varchar('col', { length: N })` | 100+ Huni 필드 |
| `@db.SmallInt` | `smallint('col')` | 20+ Huni 필드 |
| `@db.Timestamptz()` | `timestamp('col', { withTimezone: true })` | 모든 Huni createdAt/updatedAt |
| `@db.Decimal(p, s)` | `numeric('col', { precision: p, scale: s })` | 30+ Huni Decimal 필드 |

**ID 전략 (Huni 도메인)**:

| 도메인 | Prisma 패턴 | Drizzle 매핑 |
|--------|------------|-------------|
| Huni (26 models) | `Int @id @default(autoincrement())` | `serial('id').primaryKey()` |

---

## 5. Risk Identification (리스크 식별)

| ID | 리스크 | 심각도 | 설명 |
|----|--------|--------|------|
| Risk 1 | 26-모델 스키마 복잡도 | MEDIUM | Huni 도메인 26개 모델을 6개 Drizzle 파일로 변환하는 과정에서 누락/오류 발생 가능 (WowPress 제외로 복잡도 감소) |
| Risk 2 | JSON 필드 타입 안전성 | MEDIUM | 15+ JSON/JSONB 필드의 타입 정보 손실 가능 |
| Risk 3 | 복합 인덱스 정확도 | MEDIUM | Huni 도메인 복합 인덱스 정확한 재현 필요 (PricingTable은 WowPress DROP 대상) |
| Risk 4 | Seed 트랜잭션 패턴 | LOW | Prisma $transaction -> Drizzle db.transaction 변환 시 동작 차이 |
| Risk 5 | Decimal 타입 매핑 | LOW | precision/scale 설정 미스 가능 |
| Risk 6 | Prisma nested create 변환 복잡도 | LOW | WowPress seed.ts 제거로 nested create 변환 불필요. Huni seed-normalized.ts는 단순 구조 |
| Risk 7 | @@map 테이블 이름 매핑 정확도 | HIGH | 25개 Huni 모델의 @@map 테이블 이름이 pgTable에 정확히 반영되지 않으면 기존 데이터 접근 불가 |
| Risk 8 | Decimal 타입 매핑 범위 | MEDIUM | Huni 도메인 30+ Decimal 필드의 Drizzle numeric() 매핑 시 precision/scale 정확도 주의 필요 |
| Risk 9 | Nullable unique 제약조건 동작 | MEDIUM | onConflictDoUpdate 사용 시 nullable unique 컬럼의 동작이 Prisma upsert과 다를 수 있음 |
| Risk 10 | Prisma 테스트 파일 정리 | LOW | prisma/__tests__/schema.test.ts, schema-normalized.test.ts 파일 잔존 가능 |
> **주의**: `ref/wowpress/` 디렉토리는 삭제하지 않는다. 참조 데이터로 유지한다.
| Risk 11 | pnpm.onlyBuiltDependencies 정리 | LOW | root package.json의 pnpm.onlyBuiltDependencies에 @prisma/client, @prisma/engines, prisma 항목 잔존 가능 |

---

## 6. Traceability (추적성)

| 요구사항 ID | 구현 대상 | 검증 방법 |
|------------|-----------|-----------|
| REQ-U01 | 6개 스키마 파일 (26 models) | 모델 수 카운트 비교 |
| REQ-U02 | relations 정의 | 관계 매핑 비교 검증 |
| REQ-U03 | index 정의 | 인덱스 목록 비교 검증 |
| REQ-U04 | $inferSelect, $inferInsert | TypeScript 컴파일 검증 |
| REQ-U05 | 마이그레이션 전후 데이터 | 데이터 카운트 및 샘플 비교 |
| REQ-E01 | drizzle-kit generate | 마이그레이션 파일 생성 확인 |
| REQ-E02 | seed 스크립트 | seed 실행 후 데이터 확인 |
| REQ-E03 | drizzle-kit push | DB 스키마 동기화 확인 |
| REQ-E04 | Turborepo 빌드 | CI 빌드 성공 확인 |
| REQ-S01 | jsonb() 필드 | JSON 읽기/쓰기 테스트 |
| REQ-S02 | numeric() 필드 | Decimal 정밀도 테스트 |
| REQ-S03 | self-referential relations | 자기참조 쿼리 테스트 |
| REQ-S04 | composite indexes | EXPLAIN ANALYZE 검증 |
| REQ-N01 | package.json | Prisma 의존성 제거 확인 |
| REQ-N02 | DB 스키마 비교 | pg_dump diff 비교 |
| REQ-N03 | 데이터 무결성 | 전후 데이터 비교 |
| REQ-N04 | 무중단 전환 | 다운타임 모니터링 |
| REQ-W01 | WowPress 10개 테이블 DROP | pg_tables 쿼리로 테이블 부재 확인 |
| REQ-W02 | prisma/seed.ts 삭제 | 파일 존재 여부 확인 |
| REQ-W03 | prisma/__tests__/schema.test.ts 삭제 | 파일 존재 여부 확인 |
| REQ-W04 | SPEC-DATA-001 archived | spec.md status 필드 확인 |
| REQ-W05 | ref/wowpress/ 유지 (삭제 금지) | 디렉토리 존재 여부 확인 (존재해야 함) |
| REQ-W06 | WowPress 런타임 참조 코드 부재 | 코드 검색으로 WowPress 모델 참조 검출 (ref/ 제외) |
