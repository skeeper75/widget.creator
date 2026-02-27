# DB 데이터 보호 가이드

**프로젝트**: widget.creator (인쇄 상품 카탈로그 시스템)
**작성일**: 2026-02-23
**대상**: 개발팀, 운영팀
**버전**: 1.0.0

---

## 1. 개요

이 문서는 widget.creator 프로젝트의 PostgreSQL 데이터베이스 데이터 보호 전략을 정의합니다. SPEC-DATA-002 마이그레이션 이후 발생한 시드 데이터 손실 사건을 계기로 작성되었으며, 재발 방지를 위한 기술적 절차와 운영 지침을 포함합니다.

### 기술 스택

| 항목 | 내용 |
|------|------|
| 데이터베이스 | PostgreSQL 16 (Docker, 컨테이너명: huni-postgres) |
| ORM | Drizzle ORM v0.45.1 |
| 마이그레이션 도구 | drizzle-kit |
| 시드 스크립트 | `scripts/seed.ts` (tsx 실행) |
| 패키지 매니저 | pnpm |

### 범위

- PostgreSQL 데이터베이스 내 26개 테이블 (SPEC-DATA-002 정의)
- 시드 데이터 관리 (`seed.ts`, 12개 Phase)
- `data/` 디렉토리 내 소스 데이터 파일 (6.4MB, 252개 파일)
- 마이그레이션 및 시드 파이프라인

---

## 2. 현황 분석

### 2.1 DB 테이블 상태 (26개 테이블)

#### 데이터 보유 테이블 (22개)

| 테이블명 | 레코드 수 | 도메인 | 비고 |
|----------|-----------|--------|------|
| categories | 50 | 상품 분류 | |
| products | 221 | 상품 | |
| papers | 83 | 소재 | |
| materials | 28 | 소재 | |
| option_definitions | 30 | 옵션 | |
| product_sizes | 483 | 상품 | |
| option_choices | 503 | 옵션 | |
| product_options | 723 | 옵션 | |
| paper_product_mapping | 203 | 매핑 | |
| product_editor_mapping | 111 | 매핑 | |
| foil_prices | 64 | 가격 | |
| mes_item_options | 607 | MES | |
| mes_items | 221 | MES | |
| fixed_prices | 44 | 가격 | |
| price_tables | 10 | 가격 | |
| price_tiers | 1,577 | 가격 | |
| print_modes | 11 | 인쇄 | |
| post_processes | 48 | 후가공 | |
| bindings | 4 | 제본 | |
| imposition_rules | 35 | 인쇄 | |
| loss_quantity_config | 1 | 설정 | |
| product_mes_mapping | 221 | 매핑 | |

#### 비어있는 테이블 (4개) - 별도 SPEC 또는 비즈니스 로직 필요

| 테이블명 | 사유 | 필요 조치 |
|----------|------|-----------|
| package_prices | 패키지 가격 정책 미정의 | 별도 SPEC 작성 필요 |
| option_constraints | 옵션 제약 비즈니스 규칙 미정의 | 별도 SPEC 작성 필요 |
| option_dependencies | 옵션 의존성 비즈니스 규칙 미정의 | 별도 SPEC 작성 필요 |
| option_choice_mes_mapping | MES-옵션 매핑 미구현 | 별도 SPEC 작성 필요 |

### 2.2 seed.ts 구조 (12개 Phase)

| Phase | 대상 테이블 | 실행 방식 | 비고 |
|-------|-------------|-----------|------|
| Phase 1 | categories, products | upsert | 안전 |
| Phase 2 | papers, materials, print_modes, post_processes, bindings | upsert | 안전 |
| Phase 3 | price_tables, price_tiers | DELETE + INSERT | price_tiers만 삭제 후 재삽입 |
| Phase 4 | option_definitions, option_choices | upsert | 안전 |
| Phase 5 | product_sizes | upsert | 안전 |
| Phase 6 | product_options | upsert | 안전 |
| Phase 7 | paper_product_mapping | upsert | 안전 |
| Phase 8 | product_editor_mapping | upsert | 안전 |
| Phase 9 | imposition_rules, loss_quantity_config | upsert | 안전 |
| Phase 10 | foil_prices | DELETE + INSERT | 전체 삭제 후 재삽입 |
| Phase 11 | mes_items, mes_item_options, product_mes_mapping | upsert | 안전 |
| Phase 12 | fixed_prices | DELETE + INSERT | 조건부 삭제 후 재삽입 |

### 2.3 data/ 디렉토리 현황

```
data/
- 총 252개 파일
- 총 용량: 6.4MB
- Git 추적 상태: Untracked (현재 버전 관리 제외)
```

> **주의**: `data/` 디렉토리가 버전 관리되지 않으므로 데이터 소스 손실 위험이 존재합니다.

---

## 3. SPEC-DATA-002 재실행 분석

### 3.1 재실행 안전성

**결론: 재실행 가능, 단 아래 주의사항 확인 필요**

대부분의 Phase는 `onConflictDoUpdate` (upsert) 방식을 사용하므로 재실행해도 데이터가 중복 삽입되지 않습니다. 단, DELETE를 수행하는 Phase는 삭제 직후 동일 데이터를 다시 삽입하므로 결과적으로 안전하지만, 순수한 누적(additive) 방식은 아닙니다.

### 3.2 DELETE 작동 위치 및 영향

| Phase | 삭제 대상 | 삭제 범위 | 영향 |
|-------|-----------|-----------|------|
| Phase 3 | price_tiers | 특정 price_table_id에 연결된 항목 | price_table 단위 부분 삭제 |
| Phase 10 | foil_prices | 전체 테이블 | 모든 foil 가격 데이터 삭제 |
| Phase 12 | fixed_prices | 조건부 필터 적용 | 조건에 해당하는 항목 삭제 |

### 3.3 영향받는 테이블 요약

| 테이블 | 재실행 시 동작 | 데이터 보존 여부 |
|--------|---------------|-----------------|
| categories | upsert | 보존 |
| products | upsert | 보존 |
| price_tiers | DELETE + INSERT (price_table 단위) | 보존 (재삽입) |
| foil_prices | 전체 DELETE + INSERT | 보존 (재삽입) |
| fixed_prices | 조건부 DELETE + INSERT | 보존 (재삽입) |
| 나머지 17개 | upsert | 보존 |

### 3.4 재실행 절차 (Step-by-step)

**사전 조건**: Docker 컨테이너 `huni-postgres` 실행 상태 확인

**Step 1: 백업 생성 (필수)**

```bash
docker exec huni-postgres pg_dump -U postgres huni_builder > backup_$(date +%Y%m%d_%H%M%S)_before_reseed.sql
```

백업 파일 생성 확인:

```bash
ls -lh backup_*.sql
```

**Step 2: 시드 실행**

```bash
pnpm db:seed
```

정상 완료 시 각 Phase별 완료 메시지가 출력됩니다.

**Step 3: 데이터 검증**

```bash
# 주요 테이블 레코드 수 확인
docker exec huni-postgres psql -U postgres huni_builder -c "
SELECT
  schemaname,
  tablename,
  n_live_tup AS row_count
FROM pg_stat_user_tables
ORDER BY tablename;
"
```

**Step 4: 예상 레코드 수와 비교**

| 테이블 | 예상 레코드 수 |
|--------|--------------|
| categories | ~50 |
| products | ~221 |
| product_sizes | ~483 |
| price_tiers | ~1,577 |
| mes_item_options | ~607 |
| product_options | ~723 |

---

## 4. 근본 원인 분석

### 4.1 사건 경위

마이그레이션 실행 후 데이터 손실이 발생했습니다. 원인을 분석한 결과 다음과 같은 구조적 문제가 확인되었습니다.

### 4.2 원인 목록

| 원인 | 설명 | 영향 |
|------|------|------|
| seed.ts 불완전성 | 초기 seed.ts는 Phase 1-3만 존재, 12개 테이블만 커버 | 14개 테이블 데이터 누락 |
| 사후 검증 부재 | 시드 실행 후 레코드 수 검증 프로세스 없음 | 누락 즉시 감지 불가 |
| 마이그레이션-시드 분리 | `db:migrate`와 `db:seed`가 독립 명령으로 분리 | 마이그레이션 후 시드 실행 누락 가능 |
| data/ 버전 관리 제외 | 데이터 소스 파일이 Git에 미포함 | 데이터 소스 손실 위험 |
| 누락 테이블 문서화 부재 | 어떤 테이블이 시드 대상인지 명시 없음 | 커버리지 파악 불가 |

### 4.3 수정 조치

Phase 4-12를 seed.ts에 추가하여 22/26 테이블 커버리지 달성. 나머지 4개 테이블은 비즈니스 로직 미정의로 보류.

---

## 5. 데이터 보호 전략

5개 레이어로 구성된 다층 보호 전략을 적용합니다.

### Layer 1: Seed 검증 스크립트

**목적**: 시드 실행 후 즉시 레코드 수를 검증하여 누락 감지

**파일명**: `scripts/seed-verify.ts`

**검증 로직 개요**:

```
각 테이블별 예상 최소 레코드 수 정의
  -> 실제 레코드 수 조회
  -> 예상 vs 실제 비교
  -> 미달 시 FAIL 출력 및 프로세스 종료 (exit code 1)
  -> 모두 통과 시 PASS 출력
```

**검증 대상 및 기준값**:

| 테이블 | 최소 레코드 수 |
|--------|--------------|
| categories | 1 |
| products | 1 |
| papers | 1 |
| materials | 1 |
| option_definitions | 1 |
| product_sizes | 1 |
| option_choices | 1 |
| product_options | 1 |
| price_tables | 1 |
| price_tiers | 1 |
| print_modes | 1 |
| post_processes | 1 |
| foil_prices | 1 |
| mes_items | 1 |
| mes_item_options | 1 |
| fixed_prices | 1 |
| imposition_rules | 1 |
| paper_product_mapping | 1 |
| product_editor_mapping | 1 |
| product_mes_mapping | 1 |
| loss_quantity_config | 1 |
| bindings | 1 |

**실행 방법**:

```bash
pnpm tsx scripts/seed-verify.ts
```

**출력 예시 (성공)**:

```
[VERIFY] categories: 50 rows ... PASS
[VERIFY] products: 221 rows ... PASS
...
[RESULT] 22/22 tables verified. Seed data is complete.
```

**출력 예시 (실패)**:

```
[VERIFY] foil_prices: 0 rows ... FAIL (expected >= 1)
[RESULT] 1/22 tables failed verification. Run: pnpm db:seed
```

### Layer 2: Migration-Seed 파이프라인

**목적**: 마이그레이션, 시드, 검증을 하나의 명령으로 연결

**`package.json`에 추가할 스크립트**:

```json
{
  "scripts": {
    "db:setup": "pnpm db:migrate && pnpm db:seed && pnpm tsx scripts/seed-verify.ts",
    "db:setup:fresh": "pnpm db:migrate && pnpm db:seed && pnpm tsx scripts/seed-verify.ts"
  }
}
```

**실행 흐름**:

```
db:setup
  1. drizzle-kit migrate    -- 스키마 마이그레이션
  2. tsx scripts/seed.ts    -- 데이터 시드 (12 Phases)
  3. tsx scripts/seed-verify.ts  -- 검증 (실패 시 파이프라인 중단)
```

**사전 자동 백업 통합** (권장):

```json
{
  "scripts": {
    "db:backup": "docker exec huni-postgres pg_dump -U postgres huni_builder > backup_$(date +%Y%m%d_%H%M%S)_auto.sql",
    "db:setup:safe": "pnpm db:backup && pnpm db:setup"
  }
}
```

### Layer 3: 데이터 소스 버전 관리

**현황**: `data/` 디렉토리 (6.4MB, 252개 파일)가 Git에 미포함

**권장 방안**: 프로젝트 규모(6.4MB < 10MB 임계값) 고려 시 Git 추적 권장

**Git 추적 활성화 방법**:

```bash
# .gitignore에서 data/ 제외 규칙 제거 또는 주석 처리
# 그 후 추적 시작
git add data/
git commit -m "chore(data): add seed data source files to version control"
```

**대안 방안: 체크섬 매니페스트**

Git 추적을 원하지 않는 경우 `data/index.json` 파일에 파일 목록과 체크섬을 기록하고, 이 파일만 버전 관리합니다.

```json
{
  "version": "1.0.0",
  "generated_at": "2026-02-23",
  "file_count": 252,
  "total_size_mb": 6.4,
  "files": [
    {
      "path": "data/categories.json",
      "checksum": "sha256:...",
      "rows": 50
    }
  ]
}
```

### Layer 4: 자동 백업

**백업 명명 규칙**:

```
backup_YYYYMMDD_HHMMSS_{사유}.sql
```

예시:
- `backup_20260223_143000_before_migration.sql`
- `backup_20260223_143500_after_seed.sql`
- `backup_20260223_150000_manual.sql`

**백업 저장 위치**:

`.backups/` 디렉토리를 프로젝트 루트에 생성하고 `.gitignore`에 추가합니다.

```bash
mkdir -p .backups
echo ".backups/" >> .gitignore
```

**백업 실행 명령**:

```bash
# 마이그레이션 전 백업 (필수)
docker exec huni-postgres pg_dump -U postgres huni_builder > .backups/backup_$(date +%Y%m%d_%H%M%S)_before_migration.sql

# 시드 전 백업 (권장)
docker exec huni-postgres pg_dump -U postgres huni_builder > .backups/backup_$(date +%Y%m%d_%H%M%S)_before_seed.sql

# 전체 덤프 (스키마 포함)
docker exec huni-postgres pg_dump -U postgres --schema-only huni_builder > .backups/schema_$(date +%Y%m%d).sql
```

**보존 정책**: 최근 7일분 유지 권장

```bash
# 7일 이전 백업 삭제
find .backups/ -name "backup_*.sql" -mtime +7 -delete
```

### Layer 5: CI/CD 통합

**목적**: 배포 파이프라인에서 시드 검증 실패 시 배포 차단

**GitHub Actions 예시**:

```yaml
- name: Verify DB seed data
  run: pnpm tsx scripts/seed-verify.ts
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

검증 스크립트가 exit code 1을 반환하면 GitHub Actions가 워크플로우를 자동으로 중단합니다.

---

## 6. 비상 복구 절차

### Procedure A: 백업에서 복구

데이터가 손실되고 백업 파일이 있는 경우에 사용합니다.

**Step 1**: 백업 파일 확인

```bash
ls -lh .backups/backup_*.sql
# 또는
ls -lh backup_*.sql
```

**Step 2**: 현재 DB 상태 확인

```bash
docker exec huni-postgres psql -U postgres huni_builder -c "\dt"
```

**Step 3**: 데이터베이스 복구

```bash
# 기존 데이터 초기화 후 복구
docker exec -i huni-postgres psql -U postgres huni_builder < .backups/backup_20260223_143000_before_migration.sql
```

**Step 4**: 복구 검증

```bash
pnpm tsx scripts/seed-verify.ts
```

---

### Procedure B: Seed 재실행으로 복구

백업이 없거나 최신 시드 데이터로 복구하는 경우에 사용합니다.

**Step 1**: 데이터 소스 파일 확인

```bash
ls data/ | wc -l
# 예상: 252개 파일
```

**Step 2**: 현재 상태 스냅샷 (선택사항)

```bash
docker exec huni-postgres pg_dump -U postgres huni_builder > .backups/backup_$(date +%Y%m%d_%H%M%S)_before_reseed.sql
```

**Step 3**: 시드 재실행

```bash
pnpm db:seed
```

**Step 4**: 검증

```bash
pnpm tsx scripts/seed-verify.ts
```

---

### Procedure C: 수동 데이터 복구

특정 테이블만 손실된 경우에 사용합니다.

**Step 1**: 손실 테이블 파악

```bash
docker exec huni-postgres psql -U postgres huni_builder -c "
SELECT tablename, n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY tablename;
"
```

**Step 2**: 해당 Phase만 선택적 실행

seed.ts에서 해당 Phase 함수만 직접 호출하는 임시 스크립트를 작성하거나, 해당 데이터를 SQL로 직접 삽입합니다.

**Step 3**: 검증

```bash
pnpm tsx scripts/seed-verify.ts
```

---

## 7. 미해결 사항

### 7.1 비어있는 4개 테이블

아래 테이블은 비즈니스 로직이 미정의되어 시드 데이터가 없습니다. 별도 SPEC이 필요합니다.

| 테이블 | 미해결 사항 | 우선순위 |
|--------|-------------|---------|
| package_prices | 패키지 가격 정책 및 구조 정의 필요 | 미정 |
| option_constraints | 옵션 간 제약 조건 비즈니스 규칙 정의 필요 | 미정 |
| option_dependencies | 옵션 간 의존성 비즈니스 규칙 정의 필요 | 미정 |
| option_choice_mes_mapping | MES 시스템과 옵션 매핑 규칙 정의 필요 | 미정 |

### 7.2 data/ 디렉토리 Git 추적 결정

현재 `data/` 디렉토리는 Git에 포함되지 않습니다. 팀 내에서 아래 방안 중 하나를 결정해야 합니다.

| 방안 | 장점 | 단점 |
|------|------|------|
| Git 추적 (권장) | 변경 이력 추적, 팀 공유 용이 | 저장소 크기 증가 (6.4MB) |
| 체크섬 매니페스트 | 저장소 경량 유지 | 실제 파일 별도 관리 필요 |
| 외부 스토리지 | 대용량 파일에 적합 | 추가 인프라 설정 필요 |

### 7.3 자동화 백업 스케줄링

현재 백업은 수동으로 실행해야 합니다. 정기 자동 백업 설정이 필요합니다.

---

## 8. 실행 계획

### P0 - 즉시 실행 (이번 주)

| 항목 | 담당 | 내용 |
|------|------|------|
| seed-verify.ts 생성 | 개발팀 | 22개 테이블 검증 스크립트 작성 |
| data/ Git 추적 결정 | 팀 리더 | 방안 결정 및 적용 |
| .backups/ 디렉토리 생성 | 개발팀 | .gitignore 등록 포함 |

### P1 - 1주 내 완료

| 항목 | 담당 | 내용 |
|------|------|------|
| db:setup 스크립트 생성 | 개발팀 | migrate + seed + verify 파이프라인 |
| 백업 자동화 | 개발팀 | db:setup:safe 스크립트 추가 |
| 팀 교육 | 팀 리더 | 본 가이드 공유 및 절차 숙지 |

### P2 - 2주 내 완료

| 항목 | 담당 | 내용 |
|------|------|------|
| CI/CD 통합 | DevOps | GitHub Actions에 검증 단계 추가 |
| 미해결 4개 테이블 SPEC 작성 | 기획/개발팀 | 비즈니스 규칙 정의 후 SPEC 작성 |
| 백업 보존 정책 자동화 | DevOps | 7일 이전 백업 자동 삭제 크론 설정 |

---

## 부록: 유용한 명령어 모음

### DB 상태 확인

```bash
# 모든 테이블 레코드 수 조회
docker exec huni-postgres psql -U postgres huni_builder -c "
SELECT tablename, n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
"

# 특정 테이블 확인
docker exec huni-postgres psql -U postgres huni_builder -c "SELECT COUNT(*) FROM foil_prices;"

# 빈 테이블 목록 조회
docker exec huni-postgres psql -U postgres huni_builder -c "
SELECT tablename
FROM pg_stat_user_tables
WHERE schemaname = 'public' AND n_live_tup = 0
ORDER BY tablename;
"
```

### 마이그레이션 및 시드

```bash
# 스키마 마이그레이션만
pnpm db:migrate

# 시드만
pnpm db:seed

# 전체 파이프라인 (migrate + seed + verify, 추가 후)
pnpm db:setup

# 스키마 생성 (Drizzle 스키마 -> SQL 마이그레이션 파일)
pnpm db:generate

# 스키마 직접 푸시 (마이그레이션 파일 없이)
pnpm db:push
```

### 백업 및 복구

```bash
# 전체 백업
docker exec huni-postgres pg_dump -U postgres huni_builder > .backups/backup_$(date +%Y%m%d_%H%M%S)_manual.sql

# 스키마만 백업
docker exec huni-postgres pg_dump -U postgres --schema-only huni_builder > .backups/schema_$(date +%Y%m%d).sql

# 데이터만 백업
docker exec huni-postgres pg_dump -U postgres --data-only huni_builder > .backups/data_$(date +%Y%m%d_%H%M%S).sql

# 복구
docker exec -i huni-postgres psql -U postgres huni_builder < .backups/backup_20260223_143000_before_migration.sql

# Docker 컨테이너 상태 확인
docker ps | grep huni-postgres
```

---

*이 문서는 실제 코드 분석(`scripts/seed.ts`)을 기반으로 작성되었습니다. 코드 변경 시 이 문서도 함께 업데이트하세요.*
