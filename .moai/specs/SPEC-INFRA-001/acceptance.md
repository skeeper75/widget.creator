---
id: SPEC-INFRA-001
title: Drizzle ORM Migration - Acceptance Criteria
version: 1.2.0
status: draft
created: 2026-02-22
updated: 2026-02-22
spec_ref: SPEC-INFRA-001/spec.md
plan_ref: SPEC-INFRA-001/plan.md
history: "v1.2.0 - WowPress 도메인 제거, 마이그레이션 범위 Huni 26개 모델로 축소, WowPress 정리 시나리오 추가"
---

# SPEC-INFRA-001: Drizzle ORM 마이그레이션 - 인수 기준

## 1. 핵심 인수 시나리오

### Scenario 1: Drizzle 스키마 완전성 검증

**목적**: Huni 도메인 26개 모델이 Drizzle 스키마로 정확하게 변환되었는지 검증

```gherkin
Given Prisma schema에 Huni 도메인 26개 모델이 마이그레이션 대상이다
When Drizzle 스키마 파일 6개가 모두 작성된다
Then Huni 도메인 26개 모델이 Drizzle pgTable로 정의되어야 한다
  And 각 모델의 모든 컬럼이 올바른 Drizzle 타입으로 매핑되어야 한다
  And TypeScript 컴파일(`tsc --noEmit`)이 오류 없이 통과해야 한다
  And $inferSelect 및 $inferInsert 타입이 정상적으로 추론되어야 한다
```

### Scenario 2: 관계 및 Cascade Delete 보존 검증

**목적**: Huni 도메인 30+ 관계와 cascade delete 설정이 정확하게 보존되었는지 검증

```gherkin
Given Huni 도메인 Prisma schema에 30개 이상의 관계가 정의되어 있다
  And 다수의 관계에 onDelete: Cascade가 설정되어 있다
When Drizzle 스키마의 relations과 references가 정의된다
Then 모든 외래키 관계가 Drizzle references로 정의되어야 한다
  And cascade delete가 설정된 관계는 { onDelete: 'cascade' }를 포함해야 한다
  And 부모 레코드 삭제 시 자식 레코드가 함께 삭제되어야 한다
```

**검증 방법**: 테스트 데이터베이스에서 부모 레코드 삭제 후 자식 레코드 잔존 여부 확인

### Scenario 3: Seed 스크립트 정상 동작 검증

**목적**: Drizzle API 기반 seed 스크립트가 기존과 동일한 데이터를 삽입하는지 검증

```gherkin
Given Prisma 기반 seed 스크립트(prisma/seed.ts)가 존재한다
  And 해당 스크립트는 모든 테이블에 시드 데이터를 삽입한다
When Drizzle 기반 새 seed 스크립트가 실행된다
Then 모든 테이블에 시드 데이터가 정상적으로 삽입되어야 한다
  And 외래키 제약조건 위반 없이 삽입이 완료되어야 한다
  And Prisma seed와 동일한 수의 레코드가 각 테이블에 존재해야 한다
  And 트랜잭션 내에서 실행되어 부분 삽입이 발생하지 않아야 한다
```

### Scenario 4: Prisma 의존성 완전 제거 검증

**목적**: 프로젝트에서 Prisma 관련 모든 의존성이 제거되었는지 검증

```gherkin
Given 프로젝트에 @prisma/client와 prisma 패키지가 설치되어 있었다
  And package.json에 prisma 관련 scripts가 존재했다
When Prisma 의존성 제거가 완료된다
Then package.json에 @prisma/client가 포함되지 않아야 한다
  And package.json에 prisma가 포함되지 않아야 한다
  And node_modules에 @prisma/ 디렉토리가 존재하지 않아야 한다
  And 빌드 스크립트에 "prisma generate"가 포함되지 않아야 한다
  And 전체 코드베이스에서 "import.*@prisma/client" 패턴이 검출되지 않아야 한다
```

### Scenario 5: 빌드 파이프라인 정상 동작 검증

**목적**: Prisma 제거 후 Turborepo 빌드가 정상적으로 완료되는지 검증

```gherkin
Given Turborepo monorepo에서 prisma generate 단계가 제거되었다
  And Drizzle 스키마가 packages/shared/src/db/에 위치한다
When `turbo build` 명령이 실행된다
Then 모든 워크스페이스의 빌드가 오류 없이 완료되어야 한다
  And TypeScript 컴파일이 성공해야 한다
  And Drizzle 스키마에서 추론된 타입이 다른 패키지에서 정상적으로 import되어야 한다
```

---

## 2. 엣지 케이스 테스트 시나리오

### Scenario 6: JSON/JSONB 필드 읽기/쓰기 검증

**목적**: 15+ JSON 필드가 Drizzle jsonb()로 정확하게 동작하는지 검증

```gherkin
Given 데이터베이스에 JSON/JSONB 데이터가 존재한다
  And coverInfo, rawData, reqWidth, reqHeight, jobGroupList 등 15개 이상의 JSON 필드가 있다
When Drizzle ORM을 통해 JSON 필드를 읽는다
Then JSON 데이터가 JavaScript 객체로 정확하게 파싱되어야 한다
  And 중첩 객체 구조가 보존되어야 한다
  And 배열 타입 JSON 필드가 올바른 배열로 반환되어야 한다

When Drizzle ORM을 통해 JSON 필드에 데이터를 쓴다
Then 복잡한 중첩 객체가 정확하게 저장되어야 한다
  And null 값이 올바르게 처리되어야 한다
  And 빈 객체({})와 빈 배열([])이 구분되어 저장되어야 한다
```

### Scenario 7: 복합 인덱스 재현 검증

**목적**: Huni 도메인 40+ 인덱스가 정확하게 재현되었는지 검증

```gherkin
Given Huni 도메인 Prisma schema에 40개 이상의 인덱스가 정의되어 있다
  And Huni 도메인에 복합 인덱스가 포함되어 있다
When Drizzle 스키마에서 모든 인덱스가 정의된다
  And drizzle-kit generate로 마이그레이션이 생성된다
Then pg_indexes 뷰에서 조회한 인덱스 목록이 기존과 동일해야 한다
  And 복합 인덱스의 컬럼 순서가 정확하게 일치해야 한다
  And EXPLAIN ANALYZE로 확인한 쿼리 플랜이 해당 인덱스를 사용해야 한다
```

### Scenario 8: Cascade Delete 동작 검증

**목적**: Huni 도메인에서 cascade delete가 설정된 관계에서 부모 삭제 시 자식이 정상적으로 삭제되는지 검증

```gherkin
Given HuniProduct에 연결된 HuniProductSize, HuniProductOption, HuniProductMesMapping 레코드가 존재한다
  And 해당 관계에 onDelete: Cascade가 설정되어 있다
When HuniProduct 레코드를 삭제한다
Then 연결된 모든 HuniProductSize 레코드가 삭제되어야 한다
  And 연결된 모든 HuniProductOption 레코드가 삭제되어야 한다
  And 연결된 모든 HuniProductMesMapping 레코드가 삭제되어야 한다
  And 다른 HuniProduct에 속한 레코드는 영향받지 않아야 한다
```

### Scenario 9: Decimal 타입 정밀도 보존 검증

**목적**: Huni 도메인의 30+ Decimal 필드가 정밀도 손실 없이 동작하는지 검증

```gherkin
Given Huni 도메인 테이블에 30개 이상의 Decimal 타입 필드가 존재한다 (HuniPriceTable, HuniFoilPrice 등)
  And 기존 데이터에 소수점 이하 정밀도가 필요한 값이 저장되어 있다
When Drizzle ORM의 numeric() 타입을 통해 데이터를 읽는다
Then 소수점 이하 자릿수가 손실 없이 반환되어야 한다
  And JavaScript 부동소수점 오류가 발생하지 않아야 한다

When Drizzle ORM을 통해 Decimal 값을 쓴다
Then 지정된 precision/scale 범위 내에서 정확하게 저장되어야 한다
  And 반올림이나 절삭 없이 원본 값이 보존되어야 한다
```

### Scenario 10: 자기참조 관계 검증

**목적**: HuniCategory의 자기참조 관계가 정확하게 동작하는지 검증

```gherkin
Given HuniCategory 테이블에 parentId를 통한 자기참조 관계가 존재한다
  And 최상위 카테고리(parentId = null)와 하위 카테고리가 존재한다
When Drizzle 스키마에서 자기참조 관계가 정의된다
Then 최상위 카테고리 조회 시 parentId가 null인 레코드만 반환되어야 한다
  And 특정 카테고리의 하위 카테고리를 조회할 수 있어야 한다
  And 부모 카테고리 삭제 시 cascade 설정에 따라 하위 카테고리가 처리되어야 한다
  And 순환 참조가 발생하지 않아야 한다
```

### Scenario 11: 데이터베이스 스키마 무변경 검증

**목적**: ORM 교체 후 데이터베이스 스키마 자체가 변경되지 않았음을 검증

```gherkin
Given 마이그레이션 전 pg_dump --schema-only 결과가 저장되어 있다
When Drizzle ORM 마이그레이션이 완료된다
  And drizzle-kit push가 실행된다
Then pg_dump --schema-only 결과가 마이그레이션 전과 동일해야 한다
  And 테이블 정의(CREATE TABLE)가 일치해야 한다
  And 인덱스 정의(CREATE INDEX)가 일치해야 한다
  And 제약조건(CONSTRAINT)이 일치해야 한다
  And 시퀀스(SEQUENCE)가 일치해야 한다
```

### Scenario 12: Huni 도메인 필드 타입 정확성 검증

**목적**: Huni 도메인의 varchar, smallint, timestamptz 등 타입 매핑이 정확한지 검증

```gherkin
Given Huni 도메인에 100+ varchar 필드, 20+ smallint 필드, timestamptz 필드가 존재한다
When Drizzle ORM을 통해 해당 필드를 읽고 쓴다
Then varchar 필드의 length 제약이 정확하게 보존되어야 한다
  And smallint 필드가 올바른 범위 내에서 동작해야 한다
  And timestamptz 필드의 타임존 정보가 보존되어야 한다
```

### Scenario 13: @@map 테이블 이름 검증

**목적**: 25개 Huni 모델의 @@map 커스텀 테이블 이름이 Drizzle 스키마에 정확하게 반영되었는지 검증

```gherkin
Given 25개 Huni 모델이 @@map()으로 커스텀 테이블 이름을 사용한다
When Drizzle 스키마에서 해당 테이블을 정의한다
Then pgTable 이름이 @@map에 지정된 실제 SQL 테이블 이름과 일치해야 한다
  And 기존 데이터에 대한 SELECT 쿼리가 정상 동작해야 한다
```

**검증 방법**: `SELECT tablename FROM pg_tables WHERE schemaname='public'` 결과와 pgTable 이름 1:1 대조

### Scenario 14: Autoincrement ID 검증

**목적**: Huni 26개 모델의 autoincrement ID가 Drizzle에서 정확하게 동작하는지 검증

```gherkin
Given 26개 Huni 모델이 Int autoincrement ID(serial)를 사용한다
When Drizzle 스키마에서 serial('id').primaryKey()로 정의된다
Then 기존 시퀀스(SEQUENCE)가 보존되어야 한다
  And 새 레코드 삽입 시 ID가 올바르게 자동 증가되어야 한다
  And 기존 데이터의 ID 값이 변경되지 않아야 한다
```

**검증 방법**:
- `INSERT` 후 반환된 ID가 기존 시퀀스의 다음 값인지 확인
- `SELECT last_value FROM {sequence_name}` 으로 시퀀스 현재 값 검증

### Scenario 15: WowPress 테이블 정리 검증

**목적**: WowPress 도메인 10개 테이블이 정상적으로 DROP되고 관련 파일이 정리되었는지 검증

```gherkin
Given WowPress 도메인의 10개 테이블이 데이터베이스에 존재한다
  And prisma/seed.ts 파일이 존재한다
  And prisma/__tests__/schema.test.ts 파일이 존재한다
When Drizzle 마이그레이션 및 WowPress 정리가 완료된다
Then WowPress 10개 테이블(ProductCategory, PrintProduct, ProductSize, ProductPaper, ProductColor, ProductPrintMethod, ProductPostProcess, ProductOrderQty, PricingTable, DeliveryInfo)이 DROP되어야 한다
  And prisma/seed.ts 파일이 삭제되어야 한다
  And prisma/__tests__/schema.test.ts 파일이 삭제되어야 한다
  And SPEC-DATA-001의 status가 "archived"로 변경되어야 한다
  And 어떤 런타임 코드도 WowPress 모델을 참조하지 않아야 한다 (ref/ 디렉토리 제외)
  And ref/wowpress/ 디렉토리는 **유지**되어야 한다 (참조 데이터, 삭제 금지)
```

**검증 방법**:
- `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename IN ('ProductCategory', 'PrintProduct', 'ProductSize', 'ProductPaper', 'ProductColor', 'ProductPrintMethod', 'ProductPostProcess', 'ProductOrderQty', 'PricingTable', 'DeliveryInfo')` 결과가 0건
- `grep -r "ProductCategory\|PrintProduct\|PricingTable\|ProductSize\|ProductPaper\|ProductColor\|ProductPrintMethod\|ProductPostProcess\|ProductOrderQty\|DeliveryInfo" --include="*.ts" --include="*.tsx" --exclude-dir=ref src/ packages/` 결과가 0건
- `ref/wowpress/` 디렉토리가 여전히 존재하는지 확인 (유지 여부 검증)

---

## 3. 성능 기준

| 항목 | 기준 | 측정 방법 |
|------|------|-----------|
| Seed 스크립트 실행 시간 | 기존 Prisma seed 대비 동등 또는 개선 | `time` 명령 비교 |
| 빌드 시간 | `prisma generate` 제거로 빌드 시간 단축 | `turbo build` 소요 시간 비교 |
| TypeScript 컴파일 | 오류 0건, 경고 최소화 | `tsc --noEmit` |
| DB 연결 | serverless cold start 3초 이내 | Vercel function 로그 확인 |

---

## 4. Quality Gate 기준

### TRUST 5 프레임워크 적용

| 기준 | 요구사항 | 검증 방법 |
|------|----------|-----------|
| **Tested** | 스키마 변환 정확성 검증, seed 동작 확인 | pg_dump diff, seed 실행, 데이터 비교 |
| **Readable** | 도메인별 스키마 파일 분리, 명확한 네이밍 | 코드 리뷰, 파일 구조 확인 |
| **Unified** | 일관된 Drizzle 패턴 사용, 코딩 컨벤션 준수 | ESLint/prettier 검증 |
| **Secured** | 환경 변수를 통한 DB 연결, 하드코딩 금지 | 코드 스캔 |
| **Trackable** | Git 커밋 이력, SPEC 참조 | 커밋 메시지 검증 |

### 완료 기준 체크리스트 (Definition of Done)

- [ ] Huni 도메인 26개 모델 모두 Drizzle 스키마로 변환 완료
- [ ] Huni 도메인 30+ 관계 모두 정확하게 정의됨
- [ ] Huni 도메인 40+ 인덱스 모두 정확하게 재현됨
- [ ] JSON 필드 타입 매핑 완료
- [ ] Decimal 타입 정밀도 보존 확인 (30+ Huni 필드)
- [ ] 자기참조 관계 정상 동작 확인 (HuniCategory)
- [ ] Huni Seed 스크립트 Drizzle 변환 완료 및 정상 동작
- [ ] WowPress 10개 테이블 DROP 완료
- [ ] WowPress 관련 파일 정리 완료 (seed.ts, tests) - ref/wowpress/는 유지
- [ ] SPEC-DATA-001 archived 처리 완료
- [ ] `@prisma/client`, `prisma` 의존성 완전 제거
- [ ] Turborepo 전체 빌드 성공 (`turbo build`)
- [ ] TypeScript 컴파일 오류 0건 (`tsc --noEmit`)
- [ ] Huni 도메인 데이터베이스 스키마 보존 확인 (pg_dump diff)
- [ ] 기존 Huni 데이터 무결성 확인 (zero data loss)
- [ ] WowPress 모델 참조 코드 부재 확인
- [ ] `drizzle-kit generate` 정상 동작
- [ ] `drizzle-kit studio` 정상 동작

---

## 5. 검증 도구 및 명령어

### 스키마 비교 검증

```bash
# 마이그레이션 전 스키마 백업
pg_dump --schema-only -d huni_builder > schema_before.sql

# 마이그레이션 후 스키마 추출
pg_dump --schema-only -d huni_builder > schema_after.sql

# 스키마 비교
diff schema_before.sql schema_after.sql
```

### 데이터 무결성 검증

```bash
# 테이블별 레코드 수 비교
psql -d huni_builder -c "
SELECT schemaname, relname, n_tup_ins
FROM pg_stat_user_tables
ORDER BY relname;
"
```

### 인덱스 검증

```bash
# 인덱스 목록 조회
psql -d huni_builder -c "
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
"
```

### Prisma 잔존 검출

```bash
# 코드베이스에서 Prisma import 검색
grep -r "import.*@prisma/client" --include="*.ts" --include="*.tsx" .
grep -r "from.*@prisma" --include="*.ts" --include="*.tsx" .

# package.json에서 Prisma 의존성 확인
grep -r "prisma" package.json packages/*/package.json
```

### 빌드 검증

```bash
# TypeScript 컴파일 검증
npx tsc --noEmit

# Turborepo 전체 빌드
npx turbo build

# Drizzle Kit 동작 확인
npx drizzle-kit generate
npx drizzle-kit studio
```
