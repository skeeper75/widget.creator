---
id: SPEC-DB-004
phase: plan
version: 1.0.0
---

## 1. 구현 전략

### 1.1 파일 구조

SPEC-DB-004 대상 파일은 05-/06- 접두사 그룹에 속한다.

| 파일명                   | 테이블                         | 접두사 |
| ------------------------ | ------------------------------ | ------ |
| 05-simulation-runs.ts    | simulation_runs, simulation_cases | 05- |
| 05-publish-history.ts    | publish_history                | 05-    |
| 06-orders.ts             | orders (wbOrders), quote_logs (wbQuoteLogs) | 06- |

**참고**: simulation_runs와 simulation_cases는 동일 파일에 정의되어 있으며, orders와 quote_logs도 동일 파일에 정의되어 있다. 도메인 응집도가 높은 테이블들을 파일 단위로 묶은 설계이다.

### 1.2 Drizzle 테이블명과 TypeScript 변수명 매핑

| Drizzle 테이블명    | TypeScript export 변수명 | 설명             |
| ------------------- | ------------------------ | ---------------- |
| orders              | wbOrders                 | wb 접두사 구분   |
| quote_logs          | wbQuoteLogs              | wb 접두사 구분   |
| simulation_runs     | simulationRuns           | 표준 camelCase   |
| simulation_cases    | simulationCases          | 표준 camelCase   |
| publish_history     | publishHistory           | 표준 camelCase   |

---

## 2. 마이그레이션 전략

### 2.1 현재 상태

5개 테이블 모두 이미 구현 완료 상태이다. 이 SPEC은 소급적 문서화이다.

### 2.2 미적용 마이그레이션 항목

- CHECK 제약 6건 (status, resultStatus, action, status, mesStatus, source) -- 마이그레이션 SQL 필요
- orders.productId ON DELETE RESTRICT 검토 (현재 미지정)
- orders.recipeId ON DELETE RESTRICT 검토 (현재 미지정)

---

## 3. 시드 데이터 계획

### 3.1 시드 데이터 불필요

이 SPEC의 테이블들은 런타임 데이터(시뮬레이션, 퍼블리시, 주문, 견적)를 저장하므로 시드 데이터가 필요하지 않다.

### 3.2 테스트 데이터

E2E 테스트를 위한 테스트 주문/시뮬레이션 데이터:
- 시뮬레이션 실행 1건 + 케이스 10건 (pass 7, warn 2, error 1)
- 퍼블리시 이력 2건 (publish, unpublish)
- 주문 3건 (각 다른 status: created, paid, completed)
- 견적 로그 5건 (client 3, server 1, simulation 1)

---

## 4. CHECK 제약조건

### 4.1 필요한 CHECK 제약

```sql
-- simulation_runs.status
ALTER TABLE simulation_runs
ADD CONSTRAINT chk_sr_status
CHECK (status IN ('running', 'completed', 'failed', 'cancelled'));

-- simulation_cases.resultStatus
ALTER TABLE simulation_cases
ADD CONSTRAINT chk_sc_result_status
CHECK (result_status IN ('pass', 'warn', 'error'));

-- publish_history.action
ALTER TABLE publish_history
ADD CONSTRAINT chk_ph_action
CHECK (action IN ('publish', 'unpublish'));

-- orders.status
ALTER TABLE orders
ADD CONSTRAINT chk_ord_status
CHECK (status IN ('created', 'paid', 'in_production', 'shipped', 'completed', 'cancelled'));

-- orders.mesStatus
ALTER TABLE orders
ADD CONSTRAINT chk_ord_mes_status
CHECK (mes_status IN ('pending', 'sent', 'confirmed', 'failed', 'not_linked'));

-- quote_logs.source
ALTER TABLE quote_logs
ADD CONSTRAINT chk_ql_source
CHECK (source IN ('client', 'server', 'simulation'));
```

### 4.2 적용 우선순위

- Primary Goal: orders.status, orders.mesStatus CHECK 제약 (주문 데이터 무결성)
- Secondary Goal: simulation_runs.status, simulation_cases.resultStatus CHECK 제약
- Optional Goal: publish_history.action, quote_logs.source CHECK 제약

---

## 5. DB 트리거 필요 사항

### 5.1 주문 상태 전이 보호 트리거 (선택적)

주문 상태가 잘못된 방향으로 전이되는 것을 방지하는 트리거.

```sql
CREATE OR REPLACE FUNCTION validate_order_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  valid_transitions jsonb := '{
    "created": ["paid", "cancelled"],
    "paid": ["in_production", "cancelled"],
    "in_production": ["shipped"],
    "shipped": ["completed"],
    "completed": [],
    "cancelled": []
  }'::jsonb;
  allowed_next jsonb;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  allowed_next := valid_transitions -> OLD.status;

  IF allowed_next IS NULL OR NOT allowed_next ? NEW.status THEN
    RAISE EXCEPTION 'Invalid order status transition: % -> %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**우선순위**: Secondary Goal -- 애플리케이션 레이어에서 이미 처리 중이나, DB 레벨 보호 추가 검토

### 5.2 시뮬레이션 카운트 자동 업데이트 트리거 (선택적)

simulation_cases INSERT 시 simulation_runs의 passedCount/warnedCount/erroredCount를 자동 업데이트하는 트리거.

**우선순위**: Optional Goal -- 현재 애플리케이션 레이어에서 배치 업데이트 수행

---

## 6. 인덱스 최적화 계획

### 6.1 현재 인덱스 상태

모든 주요 인덱스가 Drizzle 스키마에 정의되어 있다.

### 6.2 추가 검토 인덱스

- `idx_ord_recipe`: orders.recipeId 인덱스 (레시피별 주문 조회 빈도에 따라)
- `idx_ord_created_status`: (createdAt, status) 복합 인덱스 (기간+상태 복합 조회)
- `idx_ql_source`: quote_logs.source 인덱스 (소스별 통계 빈도에 따라)
- `idx_ph_action`: publish_history.action 인덱스 (publish/unpublish 필터링)

### 6.3 simulation_cases 대용량 최적화

시뮬레이션 실행 시 수백~수천 개의 케이스가 생성될 수 있다.
- `idx_sc_run` B-tree 인덱스로 실행별 벌크 조회 최적화
- `idx_sc_status` 복합 인덱스로 에러 케이스 빠른 필터링
- 대규모 시뮬레이션(10,000+ 케이스) 시 배치 INSERT 필요

---

## 7. 성능 고려사항

### 7.1 시뮬레이션 케이스 대용량 처리

상품의 옵션 조합 수에 따라 시뮬레이션 케이스가 기하급수적으로 증가할 수 있다.

**예시**: 5 사이즈 x 10 용지 x 4 후가공 x 5 수량 = 1,000 케이스

**최적화 전략**:
- 배치 INSERT: 100건 단위 벌크 INSERT
- 스트리밍 결과: 진행 상황 실시간 업데이트
- 조기 종료: 에러 비율이 임계치 초과 시 시뮬레이션 중단

### 7.2 quote_logs 데이터 증가

위젯에서 옵션 변경마다 견적 요청이 발생하므로 데이터가 빠르게 증가한다.

**최적화 전략**:
- 보존 기간 정책: 3개월 이후 아카이브 또는 삭제
- createdAt 인덱스로 기간별 정리 최적화
- 성능 통계는 집계 테이블로 분리 검토

### 7.3 주문 조회 성능

주문 목록 조회 시 최신순 정렬과 상태 필터링이 빈번하다.
- `idx_ord_created`로 최신순 정렬 최적화
- `idx_ord_status`로 상태 필터링 최적화
- 페이지네이션: keyset pagination (id 기반) 권장

---

## 8. 위험 요소 및 완화 전략

### 8.1 주문 데이터 삭제 방지

- **위험**: wb_products 삭제 시 주문 데이터 손실 (ON DELETE CASCADE인 경우)
- **영향**: 주문 이력, 매출 데이터 영구 삭제
- **완화**: orders.productId FK에 ON DELETE RESTRICT 적용. 주문이 있는 상품은 소프트 삭제(isActive=false)만 가능하도록.

### 8.2 시뮬레이션 무한 증가

- **위험**: 반복 시뮬레이션으로 simulation_runs/cases 데이터 무한 증가
- **영향**: 스토리지, 조회 성능 저하
- **완화**: 상품당 최근 N개 시뮬레이션만 보존하는 정리 정책. 오래된 시뮬레이션 케이스는 결과 요약만 보존.

### 8.3 quote_logs 폭발적 증가

- **위험**: 위젯 사용자가 옵션 변경할 때마다 견적 로그 생성
- **영향**: 일 수만~수십만 건 누적
- **완화**: 클라이언트 디바운싱(300ms), 서버측 중복 필터링, 보존 기간 정책(3개월)

### 8.4 상태 전이 무결성 위반

- **위험**: API 버그로 잘못된 상태 전이 (예: completed -> created)
- **영향**: 주문 데이터 불일치, 운영 혼란
- **완화**: 애플리케이션 레벨 상태 머신 검증 + 선택적 DB 트리거 (5.1절)

### 8.5 불변 스냅샷 위반

- **위험**: 실수로 orders.selections 또는 orders.priceBreakdown을 UPDATE
- **영향**: 주문 감사 이력 훼손
- **완화**: 애플리케이션 레벨에서 update 쿼리에서 해당 필드 제외. 필요 시 DB 트리거로 불변 필드 UPDATE 방지.

### 8.6 MES 상태와 주문 상태 불일치

- **위험**: mesStatus='confirmed'인데 status='created' (결제 전 MES 확인)
- **영향**: 운영 혼란, MES 재작업
- **완화**: mesStatus 전이를 status에 의존하도록 비즈니스 규칙 정의. MES 디스패치는 status='paid' 이후에만 허용.
