# SPEC-DATA-001: 인수 기준

---

## 메타데이터

| 항목 | 값 |
|------|------|
| SPEC ID | SPEC-DATA-001 |
| 생성일 | 2026-02-22 |
| 관련 SPEC | `.moai/specs/SPEC-DATA-001/spec.md` |

---

## 1. 데이터베이스 스키마 (R-DB-001~003)

### Scenario 1: 카테고리 계층 저장 및 조회

```gherkin
Given 47개의 WowPress 카테고리 데이터가 존재할 때
When 카탈로그 데이터를 데이터베이스에 적재하면
Then 모든 카테고리가 ProductCategory 테이블에 저장되고
And 상위-하위 관계가 parentId로 올바르게 연결되고
And "스티커 > 사각스티커"와 같은 2단계 카테고리가 level=2로 저장된다
```

### Scenario 2: 상품 상세 JSONB 저장

```gherkin
Given 가성비스티커(사각) (prodno: 40007) 제품 데이터가 존재할 때
When 제품 상세 JSON을 데이터베이스에 적재하면
Then PrintProduct.coverInfo에 covercd=0(통합), pagecd=0(양면) 정보가 JSONB로 저장되고
And PrintProduct.rawData에 WowPress 원본 JSON 전체가 보존되고
And ProductSize 테이블에 규격 목록(90x100, 90x50 등)이 저장되고
And ProductOrderQty 테이블에 수량 목록(500~100,000)이 기준정보 공통형으로 저장된다
```

### Scenario 3: 제약 조건 데이터 저장

```gherkin
Given 무선책자(prodno: 40196) 제품 데이터가 존재할 때
When 제품 상세 JSON을 파싱하여 저장하면
Then ProductPostProcess 테이블에 후가공 그룹(오시, 박, 형압, 라운딩, 제본, 코팅)이 저장되고
And 각 후가공의 rst_paper(지류 제약) 정보가 JSONB에 포함되고
And ProductColor 테이블에 도수별 req_prsjob(인쇄방식 요구) 정보가 저장된다
```

---

## 2. WowPress API 연동 (R-API-001~004)

### Scenario 4: 데이터 동기화 실행

```gherkin
Given WowPress API에 인증 토큰이 유효할 때
When 관리자가 데이터 동기화를 실행하면
Then 제품 목록 API를 호출하여 전체 제품 목록을 조회하고
And 각 제품의 상세 API를 호출하여 최신 데이터를 수집하고
And 변환된 데이터를 데이터베이스에 Upsert 한다
```

### Scenario 5: timestamp 기반 증분 동기화

```gherkin
Given 제품 40007의 로컬 syncedAt이 "2025-10-14"이고
And WowPress API의 timestamp가 "2025-11-01"일 때
When 증분 동기화를 실행하면
Then 해당 제품의 데이터를 최신 버전으로 갱신하고
And syncedAt을 "2025-11-01"로 업데이트한다
```

### Scenario 6: API 토큰 보안

```gherkin
Given WowPress API 인증 정보가 필요할 때
When 시스템이 API 호출을 수행하면
Then 인증 정보는 환경변수(WOWPRESS_AUTH_UID, WOWPRESS_AUTH_PW)에서 로드되고
And 소스 코드 어디에도 인증 정보가 하드코딩되어 있지 않다
```

---

## 3. 옵션 엔진 - 기준정보 필터링 (R-OPT-001~008)

### Scenario 7: 기준정보 우선순위에 따른 옵션 필터링

```gherkin
Given 합판전단(prodno: 40026) 제품이 로드되었을 때
When 사용자가 규격 sizeno=5603을 선택하면
Then 해당 규격에서 사용 가능한 지류 목록이 반환되고 (paperno: 20690, 20692 등)
And 해당 규격에서 사용 가능한 수량 목록이 반환된다
And paperno=20690 선택 시 0.5~100연, paperno=20692 선택 시 0.5~10연이 반환된다
```

### Scenario 8: 상위 기준정보 변경 시 하위 옵션 재계산

```gherkin
Given 사용자가 규격 A와 지류 B를 선택한 상태에서
When 사용자가 규격을 C로 변경하면
Then 지류 선택이 초기화되고
And 규격 C에서 사용 가능한 새로운 지류 목록이 반환되고
And 수량 목록도 재계산된다
```

### Scenario 9: 제약 조건 요구사항(req_*) 평가

```gherkin
Given 제품의 지류 정보에 req_awkjob (지류+후가공 요구사항)이 정의되어 있을 때
When 사용자가 해당 지류를 선택하면
Then req_awkjob에 정의된 후가공 옵션이 필수 활성화 상태로 표시되고
And 해당 후가공의 기본 선택값이 제안된다
```

### Scenario 10: 제약 조건 제약사항(rst_*) 평가

```gherkin
Given 후가공 "박(양면)"의 rst_paper에 35종의 지류가 제약 목록에 있을 때
When 사용자가 "박(양면)" 후가공을 선택하면
Then 35종의 지류가 선택 불가 상태로 변경되고
And 사용자에게 "해당 후가공은 일부 지류에서 사용할 수 없습니다" 제약 정보가 반환된다
```

### Scenario 11: 커버 구성별 독립 옵션 트리

```gherkin
Given 중철책자 제품(pjoin=1)이 coverinfo에 표지(covercd=1), 내지(covercd=2), 간지(covercd=3)를 포함할 때
When 사용자가 옵션 선택을 시작하면
Then 표지, 내지, 간지에 대해 각각 독립된 지류/도수 선택이 가능하고
And 규격은 모든 커버에서 동일하게 적용되고
And 각 커버의 후가공은 독립적으로 선택 가능하다
```

### Scenario 12: 비규격 처리

```gherkin
Given 제품의 규격 목록에 non_standard=true인 "비규격" 옵션이 있고
And req_width={type:"range", min:50, max:900, interval:1}이고
And req_height={type:"range", min:50, max:640, interval:1}일 때
When 사용자가 "비규격"을 선택하고 width=200, height=300을 입력하면
Then 입력값이 min~max 범위 내인지 검증하고
And 유효하면 해당 크기를 기준으로 후속 옵션을 필터링한다
```

### Scenario 13: 비규격 범위 초과

```gherkin
Given 비규격의 req_width.max가 900mm일 때
When 사용자가 width=1000을 입력하면
Then ConstraintViolation이 반환되고
And 메시지는 "가로 크기는 50~900mm 범위 내여야 합니다"이다
```

### Scenario 14: 수량 공통형 vs 조합형 구분

```gherkin
Given 가성비스티커(사각)의 ordqty가 기준정보 공통형(모든 필드 null)일 때
When 어떤 규격/지류/도수를 선택하든
Then 동일한 수량 목록(500~100,000매)이 반환된다

Given 합판전단의 ordqty가 기준정보 조합형(sizeno+paperno 지정)일 때
When 규격 5603 + 지류 20690을 선택하면
Then 0.5~100연 수량 목록이 반환되고
When 규격 5603 + 지류 20692를 선택하면
Then 0.5~10연 수량 목록이 반환된다
```

### Scenario 15: 역방향 옵션 선택 차단

```gherkin
Given 기준정보 우선순위가 jobpresetno -> sizeno -> paperno -> optno -> colorno일 때
When 사용자가 규격을 선택하지 않고 지류를 먼저 선택하려 하면
Then 에러가 반환되고
And 메시지는 "규격을 먼저 선택해주세요"이다
```

---

## 4. 후가공 제약 조건 (R-OPT-007)

### Scenario 16: 후가공 작업옵션 요구사항 (req_joboption)

```gherkin
Given 후가공 항목에 req_joboption={type:"select", min:1, max:3, optionlist:[...]}이 정의될 때
When 사용자가 해당 후가공을 선택하면
Then 최소 1개 ~ 최대 3개의 작업옵션을 선택하도록 요구하고
And optionlist에 정의된 옵션 목록을 표시한다
```

### Scenario 17: 후가공 작업규격 요구사항 (req_jobsize)

```gherkin
Given 형압 후가공에 req_jobsize={min_width:10, max_width:200, min_height:10, max_height:200}이 정의될 때
When 사용자가 형압을 선택하면
Then 작업규격(너비/높이) 입력을 요구하고
And 입력값이 10~200mm 범위 내인지 검증한다
```

### Scenario 18: 후가공 간 상호 제약 (rst_awkjob)

```gherkin
Given 후가공 A의 rst_awkjob에 후가공 B가 포함되어 있을 때
When 사용자가 후가공 A를 선택한 상태에서 후가공 B를 선택하려 하면
Then 후가공 B는 선택 불가 상태로 표시되고
And ConstraintViolation에 "후가공 A와 후가공 B는 동시 선택이 불가합니다" 정보가 포함된다
```

### Scenario 19: 후가공+추가후가공 요구사항 (req_awkjob)

```gherkin
Given 형압 후가공의 req_awkjob에 "형압칼라" 후가공이 요구사항으로 정의될 때
When 사용자가 형압을 선택하면
Then "형압칼라" 후가공이 자동으로 필수 활성화되고
And 사용자에게 형압칼라 선택을 안내한다
```

### Scenario 20: 제본 특수 규칙 (책자)

```gherkin
Given 무선책자 제품에서 제본(jobgroupno: 25000)이 후가공 그룹에 존재할 때
When 시스템이 단가 요청 JSON을 구성하면
Then 제본 후가공은 반드시 covercd=1(표지) 하위로 포함되고
And 화면상 표시 위치와 무관하게 API 요청은 covercd=1로 전송된다
```

---

## 5. 가격 계산 (R-PRC-001~005)

### Scenario 21: 기본 가격 계산

```gherkin
Given 가성비스티커(사각) 제품에서
And 규격 90x100, 지류 아트지, 도수 양면4도, 수량 1000매를 선택했을 때
When 가격 계산을 요청하면
Then 기준정보 조합에 해당하는 단가가 반환되고
And 총 가격 = 단가 x 수량이 정확히 계산된다
```

### Scenario 22: 수량별 비선형 단가

```gherkin
Given 동일 제품/규격/지류/도수 조건에서
When 수량 500매의 단가가 50원이고
And 수량 1000매의 단가가 35원일 때
Then 500매 총가 = 25,000원이고
And 1000매 총가 = 35,000원이다
And 수량 증가에 따라 단가가 감소하는 비선형 구조를 반영한다
```

### Scenario 23: 후가공 추가 비용

```gherkin
Given 기본 인쇄 가격이 30,000원이고
When 코팅(무광) 후가공을 추가 선택하면
Then 코팅 비용이 별도 계산되어 추가되고
And 총 견적가 = 기본가 + 코팅비용이 반환된다
```

### Scenario 24: 가격 미등록 조합 처리

```gherkin
Given 특정 규격+지류+도수 조합의 가격이 PricingTable에 등록되지 않았을 때
When 해당 조합으로 가격 조회를 요청하면
Then 0원이 아닌 명시적 에러가 반환되고
And 에러 메시지는 "해당 옵션 조합의 가격 정보가 없습니다"이다
```

### Scenario 25: 배송비 계산

```gherkin
Given 선불택배(dlvymcd=4, 기본배송비 2,700원)를 선택하고
And 배송지가 제주특별자치도(추가배송비 3,000원)일 때
When 배송비를 계산하면
Then 총 배송비 = 2,700 + 3,000 = 5,700원이 반환된다

Given 동일 조건에서 주문 총액이 30,000원 이상이고
And 회원등급이 Gold(무료배송 기준 30,000원)일 때
When 배송비를 계산하면
Then 무료배송이 적용되어 배송비 = 0원이 반환된다
```

---

## 6. 위젯 설정 (R-WDG-001~003)

### Scenario 26: 위젯에 상품 연결

```gherkin
Given 관리자가 위젯을 생성한 상태에서
When 위젯에 "가성비스티커(사각)" 상품을 연결하면
Then 해당 상품의 전체 옵션 트리가 위젯 설정에 포함되고
And 위젯 API를 통해 해당 상품의 옵션을 조회할 수 있다
```

### Scenario 27: 위젯 설정 경량화

```gherkin
Given 위젯에 3개 상품이 연결되어 있을 때
When 위젯 SDK용 설정 JSON을 생성하면
Then JSON 크기가 50KB 미만이고
And 옵션 선택에 필요한 최소 데이터만 포함된다
```

---

## 7. 품질 게이트 기준 (Quality Gate)

### 테스트 커버리지

| 대상 | 목표 커버리지 |
|------|-----------|
| packages/pricing-engine/src/constraints/ | 90%+ |
| packages/pricing-engine/src/calculator.ts | 100% |
| packages/pricing-engine/src/option-engine.ts | 85%+ |
| apps/api/src/services/wowpress-sync.service.ts | 80%+ |

### Definition of Done

- [ ] Prisma 스키마가 정의되고 마이그레이션이 성공한다
- [ ] 카탈로그 데이터(47개 카테고리)가 DB에 적재된다
- [ ] 최소 5개 제품의 전체 옵션 데이터가 DB에 적재된다
- [ ] 옵션 엔진이 기준정보 우선순위에 따라 필터링한다
- [ ] req_*/rst_* 제약 조건이 정확히 평가된다
- [ ] 후가공 4종 요구사항 + 6종 제약사항이 모두 처리된다
- [ ] 가격 계산이 수량별 비선형 구조를 지원한다
- [ ] 배송비 계산이 방법/지역/회원등급을 반영한다
- [ ] TypeScript strict 모드에서 타입 에러 0개
- [ ] ESLint 에러 0개
- [ ] 단위 테스트 커버리지 85% 이상
- [ ] 통합 테스트 주요 시나리오 통과

---

문서 버전: 1.0.0
작성일: 2026-02-22
