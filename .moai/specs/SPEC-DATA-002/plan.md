---
id: SPEC-DATA-002
version: 1.1.0
status: Draft
created: 2026-02-22
updated: 2026-02-22
author: MoAI
priority: High
---

# SPEC-DATA-002: 구현 계획 (Implementation Plan)

## 1. 구현 전략

### 1.1 PostgreSQL 데이터베이스 선택 이유

- **JSONB 지원**: `template_config` 등 반정형 데이터를 네이티브로 저장하며, 에디터 설정/확장 옵션에 유연하게 대응
- **확장성**: 26개 테이블, 약 17,000+ 행의 초기 데이터를 안정적으로 처리하며, 향후 상품/가격 확장에 대비
- **트랜잭션 안정성**: 가격 데이터의 ACID 보장이 필수적이며, 견적 계산 시 일관성 있는 데이터 조회 보장
- **고급 인덱싱**: 복합 인덱스, 부분 인덱스를 활용한 견적 조회 최적화 (`idx_price_tiers_lookup` 등)
- **풍부한 타입 시스템**: NUMERIC(12,2)로 정밀한 가격 계산, TIMESTAMPTZ로 시간대 안전한 감사 추적

### 1.2 TypeScript + Drizzle ORM

- **타입 안전성**: 26개 테이블 스키마가 TypeScript 타입으로 자동 추론되어 컴파일 타임에 오류 방지
- **마이그레이션 관리**: Drizzle Kit을 통한 선언적 스키마 변경 및 버전 관리
- **SQL 친화적**: 7가지 가격 모델의 복잡한 조인/서브쿼리를 SQL에 가깝게 표현 가능
- **경량**: 런타임 오버헤드가 적어 견적 API 응답 속도에 유리

### 1.3 4종 코드 체계

본 시스템은 4종의 외부 식별자를 관리한다:

- **huni_code** (VARCHAR(10)): 위젯빌더 자체 상품코드. 모든 내/외부 매핑의 **중추 키**. 숫자 5자리 (기존 14529~22953, 신규 90001~)
- **edicus_code** (VARCHAR(15)): "HU_" + huni_code. 에디쿠스 파생 코드 (자동 생성)
- **shopby_id** (INTEGER): Shopby 플랫폼 ID. 추후 Shopby 등록 시 설정 (TODO: 별도 설계 필요)
- **MES ITEM_CD** (VARCHAR(20)): MES 품목코드 "NNN-NNNN" 형식. 원본 보존

### 1.4 마이그레이션 우선 접근법

```
엑셀 원본 → 파서 → JSON/CSV 중간 형식 → DB Seed → API 계층 → UI 연동
```

- 데이터 정합성 확인이 가장 중요하므로, DB 스키마와 데이터 마이그레이션을 최우선으로 완료
- API와 UI는 검증된 데이터 위에 구축하여 "쓰레기 입력, 쓰레기 출력" 문제를 원천 방지
- 각 Phase 종료 시 교차 검증을 수행하여 누적 오류 방지

---

## 2. 태스크 분해 (Task Decomposition)

### Phase 1: DB Schema & Migration (기초)

| Task | 설명 | 산출물 | 검증 기준 |
|------|------|--------|----------|
| 1.1 | PostgreSQL DDL 스키마 생성 (26개 테이블) | `schema.sql`, 인덱스, 제약조건 | 모든 FK/UNIQUE 제약 정상 동작 |
| 1.2 | Drizzle ORM 스키마 정의 | `src/db/schema/*.ts` | TypeScript 컴파일 통과, 타입 추론 정상 |
| 1.3 | Seed 데이터 파서 구현 (엑셀 -> JSON -> DB) | 파서 모듈, 중간 JSON 스키마 | 파서 단위 테스트 통과 |

### Phase 2: 기초 마스터 데이터 마이그레이션

| Task | 설명 | 예상 행수 | 검증 기준 |
|------|------|----------|----------|
| 2.1 | categories, papers, materials 마이그레이션 | ~30 + ~55 + ~30 | 카테고리 트리 구조 정합, 용지 55개 완전 이관 |
| 2.2 | print_modes, post_processes, bindings 마이그레이션 | ~12 + ~40 + ~4 | 인쇄 코드 12개 매핑, 후가공 8섹션 분리, 제본 4유형 |
| 2.3 | imposition_rules 마이그레이션 | ~30 | 재단사이즈-판걸이수 매핑 정확도 100% |

### Phase 3: 상품 및 옵션 데이터

| Task | 설명 | 예상 행수 | 검증 기준 |
|------|------|----------|----------|
| 3.1 | products, product_sizes 마이그레이션 (시트별 개별 파서) | ~221 + ~500 | 221개 상품 완전 이관, 시트별 컬럼 구조 대응 |
| 3.2 | option_definitions, product_options 마이그레이션 | ~30 + ~2,000 | 30개 옵션키 정의, 색상코딩 기반 필수/선택/숨김 매핑 |
| 3.3 | option_choices (1,198개) 마이그레이션 | ~1,198 | MES v5 JSON 기준 1,198개 일치, ref FK 정상 조인 |
| 3.4 | option_constraints (129개 ★ 조건) 파싱 및 마이그레이션 | ~129 | 3가지 유형(A/B/C) 패턴 정확 분류, 원문 보존 |

### Phase 4: 가격 데이터

| Task | 설명 | 예상 행수 | 검증 기준 |
|------|------|----------|----------|
| 4.1 | price_tables, price_tiers (출력비 A3/T3 판매가+원가) | ~4 + ~12,000 | 253행 x 12열 x 4테이블 정확 파싱 |
| 4.2 | 후가공 8섹션 price_tiers | ~2,000 | PP001~PP008 섹션별 수량구간 단가 일치 |
| 4.3 | fixed_prices (명함/아크릴/실사/굿즈) | ~300 | 이중 가격(원가/판매가) 정확, base_qty 올바름 |
| 4.4 | package_prices (엽서북) | ~200 | 사이즈 x 인쇄 x 페이지수 x 수량 조합 완전 |
| 4.5 | foil_prices (박/형압) | ~150 | 동판비+일반박+명함전용 매트릭스 정확 |
| 4.6 | 제본 price_tiers | ~200 | 4유형 x 수량구간 단가 일치 |

### Phase 5: 연동 매핑

| Task | 설명 | 예상 행수 | 검증 기준 |
|------|------|----------|----------|
| 5.1 | mes_items, mes_item_options (260개) | ~260 + ~800 | 품목코드 원본 보존, Option01~10 파싱 |
| 5.2 | product_mes_mapping (매칭율 70% 기반) | ~250 | 양방향 조회 가능, 책자 내지/표지 분리 |
| 5.3 | product_editor_mapping (111개 에디터 상품) | ~111 | editor="O" 기준 111개 일치 |
| 5.4 | option_choice_mes_mapping 초기 생성 | ~2,000 (pending) | mapping_type 자동 판별(자재/공정), 전건 pending 상태로 생성 |

### Phase 6: API 레이어

| Task | 설명 | 엔드포인트 수 | 검증 기준 |
|------|------|-------------|----------|
| 6.1 | CRUD REST API (상품, 자재, 공정) | ~15 | CRUD 정상 동작, 소프트 삭제 지원 |
| 6.2 | 견적 계산 API (7가지 가격 모델) | ~3 | 각 모델별 정확한 견적 산출 |
| 6.3 | UI 옵션 API (옵션 구성, 의존성, 제약조건) | ~5 | 옵션 트리 정확, 제약조건 동적 적용 |
| 6.4 | MES 옵션 매핑 관리 API | ~5 | 관리자가 옵션 선택지 -> MES 자재/공정 수동 매핑 |

### Phase 7: 검증

| Task | 설명 | 검증 기준 |
|------|------|----------|
| 7.1 | 교차 검증 (엑셀 원본 vs DB 데이터) | 건수 일치: 221/1198/129/260/111 |
| 7.2 | 견적 계산 검증 (수동 계산 vs API 결과) | 7가지 모델별 최소 1종, 오차 +-1원 이내 |

---

## 3. 기술 스택

| 구분 | 기술 | 버전 | 선택 이유 |
|------|------|------|----------|
| Database | PostgreSQL | 16 | JSONB, 고급 인덱싱, ACID 트랜잭션 |
| ORM | Drizzle ORM | latest stable | 타입 안전, SQL 친화적, 경량 |
| Runtime | Bun / Node.js | Bun 1.x / Node 22 | 빠른 시작 시간, TypeScript 네이티브 |
| Language | TypeScript | 5.x | 26개 테이블 스키마의 정적 타입 검증 |
| UI Components | shadcn/ui (Radix UI) | latest stable | 7종 프리미티브 + 10종 후니 도메인 컴포넌트 이중 레이어 |
| Migration | Drizzle Kit | latest stable | 선언적 마이그레이션, diff 기반 |
| Testing | Vitest | latest stable | 빠른 테스트 실행, TypeScript 네이티브 |
| Excel Parser | xlsx (SheetJS) 또는 openpyxl (Python) | latest stable | 시트별 파싱, 색상코딩 읽기 지원 |

---

## 4. 리스크 분석

| 리스크 | 심각도 | 대응 전략 |
|--------|--------|----------|
| 시트별 다른 컬럼 구조 -> 개별 파서 필요 | 높음 | 기본 파서 인터페이스를 정의하고, 시트별 어댑터 패턴으로 구현. 디지털인쇄 시트를 레퍼런스로 먼저 완성 후 나머지 시트에 확장 |
| ★ 제약조건 패턴 파싱 정확도 | 중간 | 3가지 유형(A/B/C) 정규식을 정의하고, 파싱 실패 시 원문을 description에 보존. 수동 검토 목록 생성 |
| MES 매핑 70% -> 30% 수동 매핑 필요 | 중간 | 자동 매핑 가능한 70%를 먼저 처리하고, 미매핑 30%는 관리 UI에서 수동 매핑할 수 있도록 `mapping_status` 필드 추가 고려 |
| 가격 데이터 검증 복잡성 | 높음 | 7가지 모델별 샘플 상품을 선정하고, 엑셀 수동 계산 결과를 golden test로 작성. 회귀 테스트로 유지 |
| 엑셀 셀 색상코딩 읽기 실패 | 중간 | openpyxl(Python)은 색상 정보 접근이 안정적. xlsx(JS)로 불가능할 경우 Python 파서로 전환 |
| 판걸이수 데이터 불완전 | 낮음 | imposition_rules에 약 30개 기본값을 seed하고, 누락 시 수동 입력 가능하도록 관리 API 제공 |
| huni_code 임시 코드(9만번대) 관리 | 낮음 | 90001부터 순차 부여. huni_code_source='temporary' 플래그로 추후 정식 코드 전환 시 식별 가능 |
| shopby_id 체계 미확정 | 중간 | shopby_id 컬럼은 NULL 허용. Shopby 등록 후 별도 매핑 정책 결정 필요 (TODO) |

---

## 5. 의존성

### 데이터 소스 (필수)

| 소스 | 경로 | 용도 |
|------|------|------|
| 상품마스터 엑셀 (260209) | `ref/huni/` | 상품 정의, 옵션, 제약조건 (13개 시트) |
| 인쇄상품 가격표 (260214) | `ref/huni/` | 가격 테이블, 판걸이, 후가공 단가 (16개 시트) |
| 품목관리 엑셀 | `ref/huni/` | MES 품목코드, 그룹, 옵션 (2개 시트) |
| MES v5 JSON | `data/exports/` | 상품 메타, 옵션 키, 선택지, 에디터 매핑 |

### 참조 자료

| 소스 | 경로 | 용도 |
|------|------|------|
| Figma 디자인 | `ref/figma/` | UI 섹션 매핑, 옵션 배치 순서 참조 |
| MES v5 JSON (priceKeys) | `data/exports/` | 86개 priceKey 매핑 참조 |

### 기술 의존성

| 라이브러리 | 용도 |
|-----------|------|
| PostgreSQL 16 | 데이터베이스 서버 |
| drizzle-orm | ORM 및 쿼리 빌더 |
| drizzle-kit | 마이그레이션 도구 |
| vitest | 테스트 프레임워크 |
| xlsx 또는 openpyxl | 엑셀 파싱 |

---

## 6. 마일스톤 (우선순위 기반)

### Primary Goal (최우선 목표)

- Phase 1 완료: DB 스키마 26개 테이블 생성 + Drizzle 스키마 정의
- Phase 2 완료: 기초 마스터 데이터 7개 테이블 마이그레이션
- 검증: 마스터 데이터 건수 일치 확인

### Secondary Goal (2차 목표)

- Phase 3 완료: 221개 상품 + 1,198개 선택지 + 129개 제약조건 마이그레이션
- Phase 4 완료: 모든 가격 데이터 마이그레이션 (출력비, 후가공, 고정가, 패키지, 박)
- 검증: 교차 검증 통과 (엑셀 원본 vs DB)

### Tertiary Goal (3차 목표)

- Phase 5 완료: MES 260개 품목 매핑 + 에디터 111개 매핑
- Phase 6 완료: CRUD API + 견적 계산 API + UI 옵션 API
- 검증: 7가지 견적 모델 계산 정확도 확인 (오차 +-1원 이내)

### Optional Goal (선택 목표)

- 관리 UI 프로토타입 (상품/자재/가격 CRUD 화면)
- 수량할인율 구조 추가 분석 및 반영
- 판걸이/임포지션 자동 계산 알고리즘 구현
