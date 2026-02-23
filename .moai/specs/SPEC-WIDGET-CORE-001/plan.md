---
id: SPEC-WIDGET-CORE-001
version: 1.0.0
status: draft
created: 2026-02-22
updated: 2026-02-22
author: MoAI
priority: P0
---

# SPEC-WIDGET-CORE-001: 구현 계획 (Implementation Plan)

## 1. 구현 전략

### 1.1 Pure TypeScript Core Engine

packages/core/는 프로젝트 전체의 **비즈니스 로직 심장부**로, 다음 원칙을 엄격히 준수한다:

- **Pure Functions Only**: 모든 계산 함수는 동일 입력에 동일 출력을 보장하며, 외부 상태를 변경하지 않는다
- **Zero Side Effects**: DOM, localStorage, network, console 접근 금지. `"sideEffects": false` 설정으로 tree-shaking 보장
- **Isomorphic**: browser(apps/widget) + Node.js(apps/api) + SSR(apps/admin) 모두에서 동일하게 동작
- **Dependency Injection**: DB 접근 없이, 모든 데이터는 caller가 `CoreLookupData` 인터페이스로 주입
- **Integer Arithmetic**: 가격 계산은 정수 연산. 부동소수점 오차 방지. 최종 가격만 `Math.floor()` 적용

### 1.2 Strategy Pattern 기반 Pricing Engine

7가지 가격 모델을 Strategy Pattern으로 구현하여 Open-Closed Principle을 준수한다:

- 각 모델은 독립 모듈(`models/*.ts`)에 구현
- `pricingRegistry`에 등록만 하면 신규 모델 추가 가능
- 모델 간 공유 로직(`lookupTier`, `resolveLossConfig`)은 공통 모듈로 분리

### 1.3 LCE (Layered Constraint Evaluation) 알고리즘

329개 제약조건(129 star + ~200 implicit)을 4-Phase로 평가:

- Phase 1: 해당 상품의 활성 제약조건 필터링
- Phase 2: 우선순위순 정렬 후 순차 평가 (show/hide/disable/limit_range)
- Phase 3: 후처리 (size, paper, quantity, cutting 특수 제약)
- Phase 4: 결과 통합 반환

Star constraints가 implicit constraints를 override하는 dual-layer 구조.

### 1.4 State Machine 기반 Option Engine

8-state 유한 상태 머신으로 옵션 선택 흐름을 관리:

```
idle -> loading -> ready -> selecting <-> validating -> constrained | complete | error
```

Priority chain(`jobPreset -> size -> paper -> option -> color -> additionalColor`)에 따른 cascade reset으로 상위 옵션 변경 시 하위 옵션 자동 초기화.

---

## 2. 태스크 분해 (Task Decomposition)

### Phase 1: 기초 타입 및 에러 시스템

| Task | 설명 | 산출물 | 검증 기준 |
|------|------|--------|----------|
| 1.1 | 프로젝트 스캐폴딩 (package.json, tsconfig.json, vitest.config.ts) | packages/core/ 디렉토리 구조 | `tsc --noEmit` 통과, `vitest run` 실행 가능 |
| 1.2 | Core 에러 클래스 구현 (CoreError, PricingError, ConstraintError, OptionError) | src/errors.ts | REQ-CROSS-001 충족, 모든 에러 코드 타입 정의 |
| 1.3 | 공유 타입 정의 (PricingInput/Result, OptionState, ConstraintEvalInput/Result, QuoteInput/Result) | src/pricing/types.ts, src/options/types.ts, src/constraints/types.ts, src/quote/types.ts | TypeScript strict mode 컴파일 통과 |
| 1.4 | 입력 검증 유틸리티 (validatePricingInput 등) | src/validation.ts | REQ-CROSS-002 충족 |
| 1.5 | Isomorphic SHA-256 래퍼 | src/crypto.ts | browser + Node.js 환경 모두 동작 |

### Phase 2: Pricing Engine 핵심

| Task | 설명 | 산출물 | 검증 기준 |
|------|------|--------|----------|
| 2.1 | lookupTier() 구현 (수량구간 단가 조회) | src/pricing/lookup.ts | REQ-PRICE-009 충족, 경계값 테스트 통과 |
| 2.2 | lookupImposition() 구현 (판걸이수 조회) | src/pricing/lookup.ts | REQ-PRICE-010 충족, 오차 허용(0.5mm) 동작 확인 |
| 2.3 | resolveLossConfig() 구현 (product > category > global 우선순위) | src/pricing/loss.ts | REQ-PRICE-012 충족, 3단계 폴백 테스트 |
| 2.4 | assemblePricingResult() 및 유틸리티 함수 | src/pricing/utils.ts | VAT 계산, 단가 계산, 사이즈 파싱 정확 |
| 2.5 | Strategy Registry 구현 | src/pricing/registry.ts, src/pricing/engine.ts | REQ-PRICE-001, REQ-PRICE-011 충족 |

### Phase 3: 7개 가격 모델 구현

| Task | 설명 | 산출물 | 검증 기준 |
|------|------|--------|----------|
| 3.1 | Model 1: formula (디지털인쇄 일반) | src/pricing/models/formula.ts | REQ-PRICE-002 golden test 통과 |
| 3.2 | Model 2: formula_cutting (스티커) | src/pricing/models/formula-cutting.ts | REQ-PRICE-003 golden test 통과 |
| 3.3 | Model 3: fixed_unit (명함/포토카드) | src/pricing/models/fixed-unit.ts | REQ-PRICE-004 golden test 통과 |
| 3.4 | Model 4: package (엽서북) | src/pricing/models/package.ts | REQ-PRICE-005 golden test 통과 |
| 3.5 | Model 5: component (책자) | src/pricing/models/component.ts | REQ-PRICE-006 golden test 통과 |
| 3.6 | Model 6: fixed_size (실사/포스터) | src/pricing/models/fixed-size.ts | REQ-PRICE-007 golden test 통과 |
| 3.7 | Model 7: fixed_per_unit (아크릴/굿즈) | src/pricing/models/fixed-per-unit.ts | REQ-PRICE-008 golden test 통과 |

### Phase 4: Option Engine

| Task | 설명 | 산출물 | 검증 기준 |
|------|------|--------|----------|
| 4.1 | Priority Chain 정의 및 phase 매핑 | src/options/chain.ts | REQ-OPT-001 6-phase 체인 동작 |
| 4.2 | Dependency Evaluation 구현 | src/options/dependencies.ts | REQ-OPT-002 visibility/choices/value 3종 처리 |
| 4.3 | State Machine 구현 (8 states, transitions) | src/options/state-machine.ts | REQ-OPT-003 모든 유효/무효 transition 테스트 |
| 4.4 | Cascade Reset 구현 | src/options/cascade.ts | REQ-OPT-004 상위 옵션 변경 시 하위 초기화 |
| 4.5 | resolveOptions() 통합 엔진 | src/options/engine.ts | REQ-OPT-001 전체 옵션 해석 결과 정확 |

### Phase 5: Constraint Evaluator

| Task | 설명 | 산출물 | 검증 기준 |
|------|------|--------|----------|
| 5.1 | Type A (size_show) 핸들러 | src/constraints/handlers/size-show.ts | REQ-CONST-002 사이즈 조건부 표시 동작 |
| 5.2 | Type B (size_range) 핸들러 | src/constraints/handlers/size-range.ts | REQ-CONST-003 min/max 범위 제한 동작 |
| 5.3 | Type C (paper_condition) 핸들러 | src/constraints/handlers/paper-condition.ts | REQ-CONST-004 용지 조건 enable/disable 동작 |
| 5.4 | Dual-Layer Merger (star + implicit) | src/constraints/merger.ts | REQ-CONST-005 star override 동작 |
| 5.5 | LCE 4-Phase Evaluator 통합 | src/constraints/evaluator.ts | REQ-CONST-001 329개 제약조건 정상 평가 |
| 5.6 | Evaluation Cache (50ms timeout) | src/constraints/cache.ts | REQ-CONST-006 timeout 초과 시 캐시 반환 |
| 5.7 | Circular Dependency Detector (Kahn's Algorithm) | src/constraints/cycle-detector.ts | REQ-CROSS-005 순환 참조 감지 |

### Phase 6: Quote Calculator

| Task | 설명 | 산출물 | 검증 기준 |
|------|------|--------|----------|
| 6.1 | assembleQuote() 구현 (line items, VAT, summary) | src/quote/calculator.ts | REQ-QUOTE-001 견적서 생성 정확 |
| 6.2 | computeSnapshotHash() 구현 (SHA-256 audit trail) | src/quote/snapshot.ts | REQ-QUOTE-002 동일 입력 동일 해시 |
| 6.3 | isQuoteValid() 구현 (30분 만료) | src/quote/expiry.ts | REQ-QUOTE-003 만료 판단 정확 |

### Phase 7: 통합 및 최적화

| Task | 설명 | 산출물 | 검증 기준 |
|------|------|--------|----------|
| 7.1 | Public API Surface (index.ts barrel exports) | src/index.ts | 모든 public 함수/타입 export 확인 |
| 7.2 | Golden Test Suite 완성 (7개 모델 x 3+ 시나리오) | __tests__/fixtures/golden-tests.ts | 모든 golden test 통과 |
| 7.3 | Bundle Size 최적화 (tree-shaking 검증) | tsup build output | < 15KB gzipped |
| 7.4 | Performance Benchmark (constraint 50ms, pricing 100ms) | benchmark scripts | 모든 성능 기준 충족 |
| 7.5 | 테스트 커버리지 95%+ 달성 | coverage report | 95% line/branch/function coverage |

---

## 3. 기술 스택

| 구분 | 기술 | 버전 | 선택 이유 |
|------|------|------|----------|
| Language | TypeScript | 5.7+ | strict mode, noUncheckedIndexedAccess로 런타임 안전성 보장 |
| Build | tsup | 8.x | ESM 빌드, dts 생성, tree-shaking 최적화 |
| Test | Vitest | 3.x | TypeScript 네이티브, 빠른 실행, coverage 내장 |
| Coverage | @vitest/coverage-v8 | 3.x | V8 기반 정밀 커버리지 |
| Target | ES2020 | - | browser + Node.js 호환, BigInt/Optional Chaining 지원 |
| Module | ESM | - | tree-shakeable, sideEffects: false |
| Crypto | SubtleCrypto / node:crypto | built-in | SHA-256 해시, isomorphic 래퍼로 통합 |
| UUID | crypto.randomUUID() | built-in | 외부 의존성 없이 UUID v4 생성 |

### 외부 의존성: ZERO

packages/core/는 **런타임 의존성 0개**를 목표로 한다:

- 가격 계산: 순수 산술 연산 (Math.ceil, Math.floor)
- SHA-256: 내장 SubtleCrypto / node:crypto
- UUID: crypto.randomUUID()
- 타입 정의: devDependencies의 TypeScript만 필요

---

## 4. 아키텍처 설계 방향

### 4.1 모듈 의존성 그래프

```
index.ts (Public API)
├── pricing/engine.ts
│   ├── pricing/registry.ts -> models/*.ts (7 strategies)
│   ├── pricing/lookup.ts
│   ├── pricing/loss.ts
│   └── pricing/utils.ts
├── options/engine.ts
│   ├── options/chain.ts
│   ├── options/state-machine.ts
│   ├── options/cascade.ts
│   ├── options/dependencies.ts
│   └── options/filters.ts
├── constraints/evaluator.ts
│   ├── constraints/handlers/*.ts (3 type handlers)
│   ├── constraints/merger.ts
│   ├── constraints/cache.ts
│   └── constraints/cycle-detector.ts
├── quote/calculator.ts
│   ├── quote/snapshot.ts (-> crypto.ts)
│   └── quote/expiry.ts
├── errors.ts
└── validation.ts
```

### 4.2 데이터 흐름 (Pipeline)

```
[Caller: apps/api or apps/widget]
    |
    v
CoreLookupData (주입)
    |
    v
[1] resolveOptions(ctx) --> OptionResolutionResult
    |                           |
    v                           v
[2] evaluateConstraints()   availableOptions + disabledOptions
    |
    v
ConstraintEvalResult (violations, filtered options)
    |
    v
[3] calculatePrice(input) --> PricingResult (총가, 내역)
    |
    v
[4] assembleQuote(input) --> QuoteResult (견적서, 해시)
```

### 4.3 Consumer 통합 패턴

**apps/widget (Browser)**:
- core engine을 직접 import하여 클라이언트 사이드 실시간 견적 계산
- Option Engine state machine을 React/Zustand state와 동기화
- 50KB 번들 내에서 필요한 모듈만 tree-shake

**apps/api (Node.js)**:
- DB에서 CoreLookupData를 로드하여 core engine에 주입
- 클라이언트 계산 결과와 서버 재계산 결과를 비교 검증
- Quote snapshot을 DB에 저장하여 audit trail 보장

**apps/admin (SSR)**:
- 관리자 가격 시뮬레이션에 core engine 활용
- 제약조건 변경 시 실시간 영향도 분석

---

## 5. 리스크 분석

| 리스크 | 심각도 | 대응 전략 |
|--------|--------|----------|
| 7개 가격 모델 간 공식 불일치 | 높음 | 각 모델별 golden test를 엑셀 수동 계산 결과와 대조. 최소 3개 시나리오/모델. `__tests__/fixtures/golden-tests.ts`에 기대값 고정 |
| 329개 제약조건 평가 성능 | 높음 | LCE 4-Phase 알고리즘으로 불필요한 평가 건너뛰기. 50ms 초과 시 캐시 반환(REQ-CONST-006). Benchmark 테스트로 지속 모니터링 |
| 옵션 의존성 순환 참조 | 중간 | Kahn's Algorithm으로 초기 로딩 시 순환 감지(REQ-CROSS-005). 순환 발견 시 즉시 에러 throw하여 데이터 무결성 강제 |
| Browser/Node.js isomorphic 호환 | 중간 | SHA-256 래퍼(`src/crypto.ts`)로 SubtleCrypto / node:crypto 분기 처리. CI에서 browser(playwright) + Node.js 듀얼 테스트 |
| Bundle Size 15KB 초과 | 중간 | tsup의 tree-shaking 활용, `sideEffects: false` 설정. 빌드 후 size 검증 스크립트 추가. 필요시 pricing models를 lazy import |
| Model 5 (component) 복잡성 | 중간 | 내지/표지/제본/코팅/박/포장 6개 하위 계산을 독립 함수로 분리. 각 하위 함수별 단위 테스트 작성 |
| implicit constraints 200개 정확성 | 중간 | WowPress 레거시 데이터에서 자동 추출. 추출 결과를 star constraints와 교차 검증. dual-layer merge에서 star가 항상 우선 |
| PricingLookupData 스키마 변경 | 낮음 | SPEC-DATA-002의 Drizzle 스키마를 참조 타입으로 정의. 스키마 변경 시 TypeScript 컴파일 에러로 조기 감지 |

---

## 6. 마일스톤 (우선순위 기반)

### Primary Goal (최우선 목표)

- Phase 1 완료: 프로젝트 스캐폴딩 + 에러/타입 시스템 + 검증 유틸리티
- Phase 2 완료: lookupTier, lookupImposition, resolveLossConfig, Strategy Registry
- Phase 3 완료: 7개 가격 모델 구현 + 모델별 golden test 통과
- 검증 기준: 7개 모델 모두 golden test 통과, 오차 +-1원 이내

### Secondary Goal (2차 목표)

- Phase 4 완료: Option Engine (priority chain + dependency + state machine + cascade)
- Phase 5 완료: Constraint Evaluator (3 type handlers + LCE + dual-layer merger + cache)
- 검증 기준: 329개 제약조건 정상 평가, 50ms 이내 완료

### Tertiary Goal (3차 목표)

- Phase 6 완료: Quote Calculator (assembly + snapshot + expiry)
- Phase 7 완료: 통합 테스트 + Public API Surface + Bundle 최적화
- 검증 기준: 95%+ 테스트 커버리지, 15KB gzipped 이내 번들 사이즈

### Optional Goal (선택 목표)

- Performance benchmark 자동화 (CI 통합)
- 모든 pricing model에 대한 boundary value analysis 테스트
- Mutation testing 도입 (테스트 품질 검증)
- apps/widget 통합 시 real-world 데이터로 E2E 검증

---

## 7. 의존성

### 데이터 의존성 (SPEC-DATA-002)

| 데이터 | 테이블 | 핵심 필드 |
|--------|--------|----------|
| 상품 마스터 | products, product_sizes | pricingModel, impositionCount, cutWidth/Height |
| 가격 테이블 | price_tables, price_tiers | optionCode, minQty, maxQty, unitPrice |
| 고정가 | fixed_prices | sellingPrice, costPrice, baseQty |
| 패키지가 | package_prices | size+print+pages+qty 조합 가격 |
| 박/형압가 | foil_prices | foilType, width, height, sellingPrice |
| 용지 | papers | sellingPer4Cut, costPer4Cut |
| 인쇄방식 | print_modes | priceCode, sides, colorType |
| 후가공 | post_processes | priceBasis, sheetStandard |
| 제본 | bindings | minPages, maxPages, pageStep |
| 판걸이 | imposition_rules | cutWidth, cutHeight -> impositionCount |
| 로스량 | loss_quantity_config | scopeType, lossRate, minLossQty |
| 옵션 정의 | option_definitions, product_options | optionClass, uiComponent, isRequired |
| 선택지 | option_choices | code, priceKey, ref_*_id |
| 제약조건 | option_constraints | constraintType, source/target, operator |
| 옵션 의존성 | option_dependencies | parent/child, dependencyType |

### 기술 의존성

| 라이브러리 | 용도 | 범위 |
|-----------|------|------|
| TypeScript 5.7+ | 언어 | devDependency |
| tsup 8.x | ESM 빌드 + dts | devDependency |
| Vitest 3.x | 테스트 | devDependency |
| @vitest/coverage-v8 3.x | 커버리지 | devDependency |

**런타임 의존성: 0개** (zero external dependencies)

### SPEC 의존성

| SPEC | 관계 | 의존 방향 |
|------|------|----------|
| SPEC-INFRA-001 | Drizzle ORM 스키마 정의 | core -> 참조 (타입만) |
| SPEC-DATA-002 | 데이터 정규화 및 시딩 | core -> 데이터 소비 |
| SPEC-WIDGET-UI-001 (planned) | Widget UI에서 core 사용 | UI -> core 호출 |
| SPEC-API-001 (planned) | API에서 core 사용 | API -> core 호출 |

---

## 8. 테스트 전략

### 8.1 테스트 레이어

| 레이어 | 대상 | 기법 | 커버리지 목표 |
|--------|------|------|-------------|
| Unit Tests | 개별 함수 (lookupTier, evaluateSizeShow 등) | 단위 테스트, boundary value analysis | 95%+ |
| Golden Tests | 7개 가격 모델 | 엑셀 수동 계산값과 대조 | 모델당 3+ 시나리오 |
| Integration Tests | 옵션 선택 -> 제약 평가 -> 가격 계산 파이프라인 | 통합 테스트 | 주요 플로우 커버 |
| Performance Tests | LCE 329개 제약, 7개 모델 계산 | Benchmark | 50ms / 100ms 임계값 |

### 8.2 테스트 픽스처

```
__tests__/fixtures/
├── products.ts          # 7개 모델 대표 상품 mock
├── price-tiers.ts       # 수량구간 단가 mock
├── constraints.ts       # 129개 star constraint mock
├── dependencies.ts      # 옵션 의존성 mock
└── golden-tests.ts      # 7개 모델 x 3+ 시나리오 기대값
```

### 8.3 Characterization Test (DDD 모드)

기존 packages/pricing-engine/이 존재하므로, DDD 모드(ANALYZE-PRESERVE-IMPROVE)로 접근:

1. **ANALYZE**: 기존 pricing-engine의 동작 패턴 분석
2. **PRESERVE**: 기존 로직의 characterization test 작성 (기존 계산 결과 스냅샷)
3. **IMPROVE**: packages/core/에 새 구현 작성, characterization test와 golden test 모두 통과 확인

---

## 9. Expert Consultation 권장사항

### expert-backend 상담 권장

- PricingLookupData를 DB에서 효율적으로 로드하는 repository pattern 설계
- 서버 사이드 가격 재검증 (클라이언트 계산 vs 서버 계산 비교)
- Quote snapshot DB 저장 스키마 및 audit trail 조회 최적화

### expert-frontend 상담 권장

- Option Engine state machine과 React/Zustand state 동기화 패턴
- 50KB widget bundle 내 core engine tree-shaking 검증 방법
- ConstraintEvalResult를 SizeSelector, PaperSelect 등 UI 컴포넌트에 반영하는 패턴

### expert-performance 상담 권장

- 329개 제약조건 평가 50ms 이내 최적화 전략
- PriceTier 10,000건 lookup 성능 최적화 (pre-sorted array vs Map vs binary search)
- Memory footprint 2MB 이내 유지 전략 (mobile)

---

## 10. Traceability

| Phase | Tasks | Requirements Covered |
|-------|-------|---------------------|
| Phase 1 | 1.1~1.5 | REQ-CROSS-001, REQ-CROSS-002, REQ-CROSS-004 |
| Phase 2 | 2.1~2.5 | REQ-PRICE-001, REQ-PRICE-009, REQ-PRICE-010, REQ-PRICE-011, REQ-PRICE-012 |
| Phase 3 | 3.1~3.7 | REQ-PRICE-002 ~ REQ-PRICE-008 |
| Phase 4 | 4.1~4.5 | REQ-OPT-001, REQ-OPT-002, REQ-OPT-003, REQ-OPT-004 |
| Phase 5 | 5.1~5.7 | REQ-CONST-001 ~ REQ-CONST-006, REQ-CROSS-005 |
| Phase 6 | 6.1~6.3 | REQ-QUOTE-001, REQ-QUOTE-002, REQ-QUOTE-003 |
| Phase 7 | 7.1~7.5 | REQ-CROSS-003 (immutability 전체 검증), 성능 기준 충족 |

---

Version: 1.0.0
Last Updated: 2026-02-22
Total Tasks: 32 (Phase 1~7)
