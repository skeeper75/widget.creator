# SPEC-DATA-001: 구현 계획

---

## 메타데이터

| 항목 | 값 |
|------|------|
| SPEC ID | SPEC-DATA-001 |
| 생성일 | 2026-02-22 |
| 관련 SPEC | `.moai/specs/SPEC-DATA-001/spec.md` |

---

## 1. 마일스톤 (우선순위 기반)

### Primary Goal: 인쇄 지식 DB 스키마 및 데이터 수집

**목표**: 인쇄 도메인의 핵심 데이터 모델을 정의하고, WowPress 카탈로그 데이터를 수집하여 초기 데이터를 적재한다.

**작업 항목**:

1. **Prisma 스키마 정의** [TAG-DB-SCHEMA]
   - ProductCategory 모델 (계층형 카테고리)
   - PrintProduct 모델 (상품 마스터 + JSONB 필드)
   - ProductSize, ProductPaper, ProductColor 모델 (기준정보)
   - ProductPrintMethod, ProductPostProcess 모델 (작업정보)
   - ProductOrderQty 모델 (수량정보)
   - PricingTable 모델 (가격표)
   - DeliveryInfo 모델 (배송정보)
   - 인덱스 및 제약 조건 설정

2. **WowPress 데이터 수집 스크립트** [TAG-API-SYNC]
   - JWT 토큰 발급 모듈
   - 제품 목록 조회 (GET /api/v1/std/prodlist)
   - 제품 상세 조회 (GET /api/v1/std/prod_info/{prodno})
   - JSON -> Prisma 모델 변환 로직
   - 카탈로그 JSON 파일(ref/wowpress/catalog/) 파싱 및 DB 적재

3. **공유 타입 정의** (packages/shared/src/types/)
   - print-product.ts: 인쇄 상품 관련 TypeScript 타입
   - option-types.ts: 옵션 시스템 타입 (covercd, pagecd, req_*/rst_* 등)
   - pricing-types.ts: 가격 관련 타입
   - constraint-types.ts: 제약 조건 타입

**완료 조건**:
- Prisma 마이그레이션 성공
- 카탈로그 47개 카테고리 데이터 적재 완료
- 최소 5개 제품의 전체 옵션 데이터 적재 완료
- TypeScript 타입 정의 완료 (strict 모드 에러 0)

---

### Secondary Goal: 제약 조건 검증 엔진

**목표**: 기준정보 간의 req_*/rst_* 제약 조건을 평가하는 엔진을 구현한다.

**작업 항목**:

1. **제약 조건 파서** [TAG-OPT-ENGINE]
   - req_* 파서: 요구사항 조건 추출 및 구조화
   - rst_* 파서: 제약사항 조건 추출 및 구조화
   - 조건 타입별 평가기: width/height 범위, 후가공 목록, 인쇄방식 목록 등

2. **옵션 필터링 엔진** [TAG-OPT-ENGINE]
   - 기준정보 우선순위 체인 구현
   - 상위 선택 -> 하위 옵션 필터링 로직
   - 공통형/조합형 수량 결정 로직
   - 비규격 옵션 처리 (req_width/req_height 범위 검증)

3. **커버 구성 처리기** [TAG-OPT-ENGINE]
   - covercd별 독립 옵션 트리 관리
   - 표지/내지/간지 분리 처리
   - 페이지수(pagecnt) 범위 검증

4. **후가공 제약 평가기** [TAG-OPT-ENGINE]
   - 후가공 4종 요구사항 평가 (req_joboption, req_jobsize, req_jobqty, req_awkjob)
   - 후가공 6종 제약사항 평가 (rst_jobqty, rst_cutcnt, rst_size, rst_paper, rst_color, rst_awkjob)
   - 후가공 간 상호 제약 처리

**완료 조건**:
- 제약 조건 평가 단위 테스트 통과 (85%+ 커버리지)
- 주요 제품 5종의 옵션 선택 시나리오 통합 테스트 통과
- 잘못된 옵션 조합에 대한 ConstraintViolation 정확 반환

---

### Tertiary Goal: 가격 계산 서비스

**목표**: 기준정보 조합별 가격을 계산하고 배송비를 산출하는 서비스를 구현한다.

**작업 항목**:

1. **가격 조회 서비스** [TAG-PRC-CALC]
   - 기준정보 조합 -> 가격표 조회 로직
   - 수량별 비선형 단가 계산
   - 후가공 추가 비용 계산
   - 총 견적가 합산

2. **배송비 계산 서비스** [TAG-PRC-CALC]
   - 배송방법별 기본 배송비
   - 지역(시도)별 추가 배송비
   - 회원등급별 무료배송 조건 평가

3. **가격 API 엔드포인트** [TAG-PRC-CALC]
   - POST /api/pricing/calculate: 견적 계산
   - GET /api/pricing/delivery-cost: 배송비 조회

**완료 조건**:
- 가격 계산 단위 테스트 통과 (100% 커버리지 목표)
- WowPress API 가격 조회 결과와 비교 검증 테스트 통과
- 배송비 계산 정확도 100%

---

### Optional Goal: 위젯 설정 API

**목표**: 관리자가 위젯에 상품과 옵션을 연결하고 설정하는 API를 구현한다.

**작업 항목**:

1. **위젯 설정 API** [TAG-WDG-CONFIG]
   - POST /api/widgets/{id}/products: 위젯에 상품 연결
   - PUT /api/widgets/{id}/options: 옵션 노출 설정
   - GET /api/widgets/{id}/config: 위젯 전체 설정 조회

2. **위젯 데이터 직렬화** [TAG-WDG-CONFIG]
   - 위젯 SDK에서 사용할 경량 JSON 생성
   - 옵션 트리 직렬화 (필요한 데이터만 추출)
   - 가격 규칙 직렬화

**완료 조건**:
- 위젯 설정 CRUD API 통합 테스트 통과
- 위젯 설정 JSON이 50KB 미만 (경량화)

---

## 2. 기술적 접근 (Technical Approach)

### 2.1 JSONB 활용 전략

인쇄 옵션의 깊은 중첩 구조(특히 awkjobinfo)는 관계형 테이블로 정규화하면 수십 개의 조인이 필요해진다. 핵심 전략:

- **정규화 대상**: 카테고리, 상품 마스터, 기준정보 최상위 레벨 (sizeno, paperno, colorno 등)
- **JSONB 대상**: 제약 조건(req_*/rst_*), 후가공 상세 계층(jobgrouplist -> awkjoblist), 배송 상세
- **하이브리드**: 상위 검색/필터링은 정규화된 컬럼으로, 상세 제약 조건 평가는 JSONB 파싱으로

### 2.2 옵션 엔진 아키텍처

```
packages/pricing-engine/
  src/
    constraints/
      constraint-evaluator.ts    # 제약 조건 평가 총괄
      requirement-parser.ts      # req_* 파싱
      restriction-parser.ts      # rst_* 파싱
      size-constraint.ts         # 규격 관련 제약
      paper-constraint.ts        # 지류 관련 제약
      color-constraint.ts        # 도수 관련 제약
      print-method-constraint.ts # 인쇄방식 관련 제약
      post-process-constraint.ts # 후가공 관련 제약 (가장 복잡)
    option-engine.ts             # 옵션 필터링 메인 엔진
    cover-handler.ts             # 커버 구성 처리
    quantity-resolver.ts         # 수량 결정 (공통형/조합형)
    calculator.ts                # 가격 계산기
    delivery-calculator.ts       # 배송비 계산기
```

### 2.3 데이터 동기화 전략

- **초기 적재**: ref/wowpress/catalog/ JSON 파일을 파싱하여 DB에 벌크 삽입
- **정기 동기화**: WowPress API의 timestamp 비교 후 변경분만 갱신
- **충돌 처리**: 로컬 수정과 원격 갱신이 충돌하면 원격 우선 (원본 보존)

### 2.4 성능 고려사항

- **옵션 계산**: 클라이언트 사이드에서 실행 가능하도록 packages/pricing-engine을 순수 TypeScript로 구현 (Node.js/브라우저 양립)
- **가격 조회**: 자주 조회되는 기준정보 조합의 가격을 메모리 캐시
- **데이터 크기**: 단일 제품의 옵션 데이터가 수백KB에 달할 수 있으므로, 위젯 SDK에는 필수 데이터만 전달

---

## 3. 리스크 및 대응 계획

### Risk 1: 후가공 제약 조건의 복잡도

- **설명**: awkjobinfo의 4종 요구사항 + 6종 제약사항이 조합되면 수백 가지 경우의 수가 발생
- **대응**: 제약 조건 평가를 단위 테스트 우선으로 구현 (TDD). 실제 WowPress 제품 데이터로 통합 테스트 수행

### Risk 2: 가격 데이터의 정확성

- **설명**: WowPress 가격 API와 로컬 가격 계산 결과가 불일치할 수 있음
- **대응**: WowPress API 가격 조회 결과를 레퍼런스로 사용하여 자동 비교 테스트 구현

### Risk 3: 데이터 모델 변경

- **설명**: WowPress API 구조가 변경될 수 있음 (timestamp 기반 변경감지)
- **대응**: rawData(JSONB)에 원본 JSON 전체를 보존하여 구조 변경 시 재파싱 가능하도록 설계

### Risk 4: JSONB 쿼리 성능

- **설명**: 복잡한 JSONB 쿼리가 느릴 수 있음
- **대응**: GIN 인덱스 추가, 자주 조회되는 필드는 정규화된 컬럼으로 추출

---

## 4. 의존성

| 의존 대상 | 유형 | 설명 |
|---------|------|------|
| Prisma 스키마 | 내부 | 데이터베이스 마이그레이션 선행 필요 |
| packages/shared | 내부 | 공유 타입 정의 선행 필요 |
| WowPress API 접근 | 외부 | API 키 및 네트워크 접근 필요 |
| ref/wowpress/catalog/ | 내부 | 카탈로그 JSON 파일 (이미 존재) |

---

## 5. 전문가 자문 권장

### 5.1 expert-backend 자문 권장

이 SPEC은 복잡한 데이터 모델링과 비즈니스 로직을 포함하므로, 다음 항목에 대해 expert-backend 자문을 권장한다:

- Prisma 스키마의 JSONB vs 정규화 전략 검토
- 옵션 엔진의 알고리즘 효율성 검토
- 가격 계산 서비스의 정확성 보장 방안

### 5.2 expert-performance 자문 권장 (Optional)

- 대량 옵션 데이터(수만 건 조합)의 클라이언트 사이드 계산 성능
- JSONB 인덱싱 전략 및 쿼리 최적화

---

문서 버전: 1.0.0
작성일: 2026-02-22
