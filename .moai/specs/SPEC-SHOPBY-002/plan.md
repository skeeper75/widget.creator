# SPEC-SHOPBY-002 구현 계획: Shopby 상품 등록 및 옵션 연동

---

## 메타데이터

| 항목 | 값 |
|------|------|
| SPEC ID | SPEC-SHOPBY-002 |
| 단계 | Phase 1 - 분석 및 설계 |
| 일정 | Day 4-7 |
| 의존성 | SPEC-DATA-001 (완료), SPEC-SHOPBY-001 (Day 1-3) |
| 산출물 | 상품 등록 자동화 도구, 옵션 매퍼, 가격 매퍼, 카테고리 설정 |

---

## 마일스톤

### M1: 상품-옵션 매퍼 구현 (Day 4-5) - Priority Critical

**목표**: Widget Creator 데이터 모델 -> Shopby mallProduct 변환 모듈 구현

**작업 목록**:
1. Shopby mallProduct 등록 요청 스키마 정의 (Zod)
   - 상품 기본 정보 변환기
   - COMBINATION 옵션 변환기 (규격 x 용지 x 수량)
   - REQUIRED/STANDARD 옵션 변환기 (도수, 양면, 후가공)
2. Widget Creator PrintProduct → Shopby mallProduct 매퍼 구현
3. 옵션 조합 수 제한 처리 로직 구현
   - 대표 조합 선택 알고리즘
   - 전체 조합 중 상위 N개 자동 선택
4. 단위 테스트 작성 (최소 5개 인쇄 상품 유형별 변환 검증)

**완료 기준**:
- 명함, 스티커, 전단, 책자 4개 카테고리 상품의 변환이 정상 동작
- Shopby 옵션 조합 한도 초과 시 대표 조합 자동 선택 동작 확인
- 변환 단위 테스트 커버리지 85% 이상

### M2: 가격 매핑 및 extraJson 설정 (Day 5-6) - Priority High

**목표**: 가격 엔진 결과 -> Shopby addPrice 매핑 및 위젯 설정 저장

**작업 목록**:
1. 가격 매핑 모듈 구현
   - 기본 판매가(salePrice) = 최소 옵션 조합 가격 계산
   - 각 조합별 addPrice = 조합 가격 - 기본 판매가 계산
   - 가격 정합성 검증 로직 (10% 이내 차이 검증)
2. extraJson 스키마 구현 (위젯 설정 데이터)
   - WidgetCreatorExtraJson Zod 스키마
   - extraJson 생성기 (productId, widgetId, optionEngineConfig 등)
3. 구매자작성형 입력 옵션(optionInputs) 설정 모듈
   - 디자인 파일 URL, 인쇄 사양 JSON, 특수 요청 등
4. 단위 테스트 작성

**의존성**: M1 (옵션 매퍼 완성 후 가격 매핑 가능)

**완료 기준**:
- 옵션 조합별 addPrice가 가격 엔진 결과와 정합
- extraJson 스키마 검증 통과
- optionInputs 설정이 4개 입력 항목을 포함

### M3: 배치 등록 도구 및 카테고리 설정 (Day 6-7) - Priority High

**목표**: Shopby Admin API를 통한 상품 일괄 등록 도구 구현

**작업 목록**:
1. Shopby Admin API 클라이언트 구현
   - 인증 처리 (Admin Token)
   - Rate Limit 대응 (요청 간격 조절)
   - 에러 핸들링 및 재시도 로직 (최대 3회)
2. 카테고리 체계 설정 (Shopby product-sections)
   - 1depth: 인쇄물
   - 2depth: 명함, 스티커/라벨, 전단/리플렛, 책자/카탈로그 등
3. 배치 등록 워크플로우 구현
   - 등록 대상 선택 → 변환 → API 호출 → 결과 저장 → 리포트
4. Shopby productNo ↔ WC productId 매핑 테이블 관리
5. 통합 테스트 (Sandbox 환경 대상)
6. 등록 결과 리포트 생성기

**의존성**: M1, M2

**완료 기준**:
- 최소 5개 인쇄 상품이 Shopby Sandbox에 정상 등록됨
- Shopby productNo와 WC productId 매핑이 DB에 저장됨
- 등록 실패 건에 대한 재시도 및 에러 리포트 동작 확인

---

## 기술적 접근

### 옵션 조합 전략

인쇄 상품의 옵션 조합 수가 매우 클 수 있으므로(수만 건), 단계적 접근:

1. **소규모 조합 상품** (조합 수 < Shopby 한도):
   - 모든 조합을 COMBINATION 옵션으로 등록
   - 각 조합에 정확한 addPrice 설정

2. **대규모 조합 상품** (조합 수 >= Shopby 한도):
   - 대표 조합(인기 규격 x 인기 용지 x 주요 수량)만 COMBINATION 등록
   - 나머지 조합은 위젯에서만 선택 가능
   - 위젯 선택 결과는 optionInputs로 전달

3. **위젯 전용 상품** (모든 옵션을 위젯에서 처리):
   - Shopby에 기본 상품만 등록 (최소 옵션)
   - 전체 옵션 선택은 위젯이 담당
   - 주문 시 optionInputs에 전체 사양 포함

### 모듈 구조 (예상)

```
apps/api/src/
  services/
    shopby-product.service.ts      # 상품 등록 서비스
    shopby-category.service.ts     # 카테고리 관리
    shopby-price-mapper.service.ts # 가격 매핑
  mappers/
    product-mapper.ts              # PrintProduct → mallProduct
    option-mapper.ts               # 옵션 체인 → COMBINATION
    extra-json-mapper.ts           # 위젯 설정 → extraJson
    option-input-mapper.ts         # optionInputs 생성
  clients/
    shopby-admin.client.ts         # Shopby Admin API 클라이언트
```

---

## 위험 및 대응

| 위험 | 대응 |
|---|---|
| Shopby COMBINATION 옵션 조합 한도 초과 | 대표 조합 선택 알고리즘 + 위젯 전용 옵션 |
| Admin API Rate Limit으로 배치 등록 지연 | 큐 기반 비동기 처리 + 지수 백오프 재시도 |
| 가격 엔진 결과와 addPrice 불일치 | 정기 동기화 스케줄러 + 가격 변동 알림 |
| Sandbox 환경과 프로덕션 환경 API 차이 | Sandbox 검증 후 프로덕션 전환 시 재검증 |

---

문서 버전: 1.0.0
