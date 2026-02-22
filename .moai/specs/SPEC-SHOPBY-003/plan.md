# SPEC-SHOPBY-003 구현 계획: 위젯 SDK 및 프론트엔드 임베딩

---

## 메타데이터

| 항목 | 값 |
|------|------|
| SPEC ID | SPEC-SHOPBY-003 |
| 단계 | Phase 2 - 핵심 연동 개발 |
| 일정 | Day 8-14 |
| 의존성 | SPEC-SHOPBY-001 (완료), SPEC-SHOPBY-002 (상품 등록 완료) |
| 산출물 | 위젯 SDK 번들, Aurora Skin 임베딩 코드, Shopby 브리지 모듈 |

---

## 마일스톤

### M1: 위젯 SDK 코어 구조 (Day 8-9) - Priority Critical

**목표**: 위젯 빌드 시스템 및 코어 프레임워크 구축

**작업 목록**:
1. Vite 6.x 라이브러리 모드 빌드 설정
   - 엔트리: packages/widget-sdk/src/index.ts
   - 출력: UMD + ES 모듈
   - gzip 크기 50KB 미만 검증 빌드 스크립트
2. 위젯 SDK 초기화 시스템 (window.WidgetCreator.init)
   - 설정 파라미터 검증 (Zod)
   - DOM 컨테이너 탐색 및 마운트
   - Shadow DOM 생성 및 스타일 격리
3. Shopby 상품 데이터 로더
   - productNo → extraJson 조회 (Shopby Shop API)
   - widgetCreator 설정 추출 및 검증
4. Widget Creator API 클라이언트
   - 옵션 트리 조회
   - 가격 계산 요청
5. 기본 위젯 셸 렌더링 (로딩 상태, 에러 상태)

**완료 기준**:
- window.WidgetCreator.init() 호출 시 위젯이 정상 마운트됨
- extraJson에서 위젯 설정이 로드됨
- 빌드 결과 gzip 크기 30KB 미만 (코어만)

### M2: 옵션 선택 UI 구현 (Day 10-11) - Priority Critical

**목표**: 인쇄 옵션 선택 인터페이스 구현

**작업 목록**:
1. 옵션 선택 폼 컴포넌트
   - 규격 선택 (드롭다운/카드)
   - 용지 선택 (드롭다운/카드, 용지 그룹 분류)
   - 수량 선택 (select형/input형 자동 감지)
   - 도수 선택 (양면/단면 라디오)
   - 후가공 선택 (체크박스 그룹)
2. 옵션 엔진 연동
   - 상위 옵션 변경 시 하위 옵션 재계산
   - 제약 조건(req_*/rst_*) 반영 (비활성화 표시)
   - 비규격 입력 (가로x세로 직접 입력)
3. 가격 표시 패널
   - 기본가, 옵션가, 후가공가, 배송비, 합계 실시간 표시
   - 수량별 단가 변화 안내
4. 반응형 레이아웃 (모바일/태블릿/데스크톱)

**의존성**: M1 (코어 프레임워크)

**완료 기준**:
- 옵션 선택 시 하위 옵션이 동적으로 업데이트됨
- 제약 조건에 의해 비활성화된 옵션이 정확히 표시됨
- 가격이 실시간으로 재계산됨
- 3가지 뷰포트(모바일/태블릿/데스크톱)에서 정상 렌더링

### M3: Shopby 브리지 및 장바구니 연동 (Day 12-13) - Priority High

**목표**: 위젯 → Shopby 장바구니/주문서 데이터 전달 구현

**작업 목록**:
1. Shopby 브리지 모듈 구현
   - 장바구니 추가: POST /cart 호출 (optionInputs 포함)
   - 즉시구매: POST /order-sheets 호출 (장바구니 우회)
   - 인증 토큰 전달 및 갱신 처리
2. 인쇄 사양 데이터 직렬화
   - OptionSelection → optionInputs JSON 변환
   - 가격 정보 포함 (서버 검증용)
3. 커스텀 이벤트 시스템
   - widgetCreator:addToCart, widgetCreator:buyNow 이벤트 발행
   - Aurora Skin 이벤트 수신 콜백 지원
4. 에러 핸들링
   - API 호출 실패 시 사용자 안내 메시지
   - 인증 만료 시 로그인 페이지 리다이렉트
   - 네트워크 에러 시 재시도 UI

**의존성**: M1, M2

**완료 기준**:
- 위젯에서 장바구니 담기 시 Shopby 장바구니에 정상 추가됨
- optionInputs에 인쇄 사양 데이터가 정확히 포함됨
- 즉시구매 시 주문서가 정상 생성됨

### M4: 통합 테스트 및 최적화 (Day 14) - Priority High

**목표**: Aurora Skin 실제 환경 통합 테스트 및 성능 최적화

**작업 목록**:
1. Aurora Skin 통합 테스트
   - 실제 상품 상세 페이지에서 위젯 로드 확인
   - CSS 충돌 검증 (Shadow DOM 격리)
   - 인증 연동 검증 (로그인/비로그인)
2. 성능 최적화
   - 번들 크기 분석 및 최적화 (50KB 미만 확인)
   - 초기 로딩 시간 측정 (FMP 2초 미만)
   - 레이지 로딩 적용 (비핵심 모듈)
3. 크로스 브라우저 테스트 (Chrome, Safari, Samsung Internet)
4. 접근성 기본 검증 (키보드 탐색, 스크린 리더)

**의존성**: M1, M2, M3

**완료 기준**:
- Aurora Skin에서 위젯이 정상 렌더링되고 옵션 선택 가능
- gzip 번들 크기 50KB 미만
- FMP 2초 미만
- 주요 3개 브라우저에서 정상 동작

---

## 기술적 접근

### 빌드 아키텍처

```
packages/widget-sdk/
  src/
    index.ts              # SDK 엔트리 (init, destroy, getState)
    core/
      initializer.ts      # 위젯 초기화 로직
      shadow-dom.ts       # Shadow DOM 관리
      state.ts            # 상태 관리
    ui/
      widget-shell.ts     # 위젯 셸 (로딩/에러/콘텐츠)
      option-form.ts      # 옵션 선택 폼
      price-panel.ts      # 가격 표시 패널
      responsive/         # 반응형 레이아웃
    bridge/
      shopby-bridge.ts    # Shopby API 통신
      auth-connector.ts   # 인증 연동
      event-emitter.ts    # 커스텀 이벤트
    api/
      wc-api-client.ts    # Widget Creator API
      option-loader.ts    # 옵션 트리 로더
      price-calculator.ts # 가격 계산 요청
    styles/
      base.css            # 기본 스타일
      responsive.css      # 반응형 스타일
  vite.config.ts          # 라이브러리 모드 빌드
  tsconfig.json
```

### Shadow DOM 격리 전략

- 위젯 루트 요소에 Shadow DOM 생성
- 위젯 CSS는 Shadow DOM 내부에만 적용
- 호스트 페이지 CSS 영향 완전 차단
- 커스텀 테마는 CSS Variables로 외부에서 주입

### 번들 크기 전략

- 코어: ~20KB (초기화, 상태, 기본 UI)
- 옵션 UI: ~15KB (동적 임포트)
- Shopby 브리지: ~5KB
- 스타일: ~5KB
- 총합 목표: ~45KB (gzip 후)

---

## 위험 및 대응

| 위험 | 대응 |
|---|---|
| Shadow DOM 미지원 브라우저 | CSS 네임스페이스 폴백 (.wc-widget 프리픽스) |
| Aurora Skin 업데이트로 위젯 깨짐 | 버전 잠금 + 호환성 테스트 자동화 |
| 번들 크기 50KB 초과 | Vanilla JS 전환, 동적 임포트 확대 |
| 모바일 성능 이슈 | 가상 스크롤, 이미지 지연 로딩, requestIdleCallback |

---

문서 버전: 1.0.0
