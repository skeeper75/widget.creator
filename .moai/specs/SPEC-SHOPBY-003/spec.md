# SPEC-SHOPBY-003: 위젯 SDK 및 프론트엔드 임베딩

---

## 메타데이터

| 항목 | 값 |
|------|------|
| SPEC ID | SPEC-SHOPBY-003 |
| 제목 | 위젯 SDK 및 프론트엔드 임베딩 |
| 생성일 | 2026-02-22 |
| 상태 | Planned |
| 우선순위 | Critical |
| 담당 | expert-frontend |
| 관련 SPEC | SPEC-DATA-001 (옵션/가격 엔진), SPEC-SHOPBY-001 (API 매핑), SPEC-SHOPBY-002 (상품 등록) |
| 단계 | Phase 2 - 핵심 연동 개발 |

---

## 1. 환경 (Environment)

### 1.1 프로젝트 컨텍스트

Widget Creator의 인쇄 옵션 선택 위젯을 Shopby Aurora Skin(React 기반 프론트엔드)에 임베딩한다. 위젯은 독립적인 JavaScript 번들로 배포되며, Aurora Skin의 상품 상세 페이지에서 로드되어 인쇄 옵션 선택, 실시간 가격 계산, 파일 업로드 인터페이스를 제공한다.

### 1.2 Aurora Skin 환경

- **프레임워크**: React 기반
- **커스터마이징**: 스킨 에디터를 통한 HTML/CSS/JS 수정
- **외부 스크립트**: 스크립트 주입을 통한 외부 위젯 임베딩 지원
- **반응형**: 데스크톱/태블릿/모바일 지원
- **통신**: Shopby Shop API와 직접 통신

### 1.3 위젯 기술 스택

- **빌드**: Vite 6.x (라이브러리 모드)
- **프레임워크**: Preact 또는 Vanilla JS (번들 크기 최소화)
- **상태 관리**: 내장 상태 (외부 의존 최소화)
- **스타일**: CSS-in-JS 또는 Shadow DOM (호스트 페이지 스타일 격리)
- **통신**: Widget Creator API (옵션/가격 엔진), Shopby Shop API (장바구니/주문)

---

## 2. 가정 (Assumptions)

### 2.1 기술적 가정

- A1: Aurora Skin은 외부 JavaScript 파일을 `<script>` 태그로 주입할 수 있다
- A2: 위젯은 Shadow DOM 또는 iframe을 통해 스타일을 격리할 수 있다
- A3: Shopby Shop API의 인증 토큰(Access Token)은 위젯에서 접근 가능하다
- A4: 위젯은 CDN을 통해 배포되며, 캐시 무효화를 위한 버전 관리가 가능하다

### 2.2 비즈니스 가정

- A5: 위젯의 첫 의미 있는 페인트(FMP)는 2초 이내여야 한다
- A6: 위젯 번들 크기는 gzip 후 50KB 미만이어야 사용자 경험에 영향을 주지 않는다
- A7: 모바일 사용자 비율이 60% 이상이므로 모바일 우선 설계가 필수이다

### 2.3 통합 가정

- A8: Aurora Skin의 상품 상세 페이지에서 Shopby productNo를 JavaScript로 접근할 수 있다
- A9: Shopby의 장바구니 추가 API는 위젯에서 직접 호출할 수 있다
- A10: 위젯에서 생성한 데이터를 Shopby optionInputs 형태로 전달할 수 있다

---

## 3. 요구사항 (Requirements)

### 3.1 Aurora Skin 위젯 임베딩

**R-WDG-001** [이벤트]: **WHEN** 고객이 인쇄 상품의 상세 페이지를 방문하면, **THEN** 시스템은 Aurora Skin 내에 Widget Creator 위젯을 자동으로 로드하고 렌더링해야 한다.

임베딩 방식:
- 상품 상세 페이지의 지정된 DOM 위치에 위젯 컨테이너 삽입
- Shopby productNo를 기반으로 extraJson에서 위젯 설정 로드
- 위젯 초기화: productId, optionEngineConfig 기반으로 옵션 트리 로드
- Shadow DOM을 통한 스타일 격리 (호스트 페이지 CSS 영향 차단)

### 3.2 장바구니/주문서 연동 인터페이스

**R-WDG-002** [이벤트]: **WHEN** 고객이 위젯에서 인쇄 옵션을 선택하고 "장바구니 담기" 또는 "바로 구매"를 클릭하면, **THEN** 시스템은 선택된 옵션 정보를 Shopby 장바구니 또는 주문서에 정확히 전달해야 한다.

연동 데이터:
- Shopby productNo
- 선택된 COMBINATION 옵션 (규격, 용지, 수량)
- optionInputs: 디자인 파일 URL, 인쇄 사양 JSON, 특수 요청
- 위젯 계산 가격 정보 (optionInputs에 포함)

연동 방식:
- 장바구니: POST /cart (Shopby Shop API) - 위젯이 직접 호출
- 즉시구매: POST /order-sheets (Shopby Shop API) - 장바구니 우회
- 커스텀 이벤트: `widgetCreator:addToCart`, `widgetCreator:buyNow` 이벤트 발행

### 3.3 Shopby 세션/인증 연동

**R-WDG-003** [상태]: **IF** 고객이 Shopby에 로그인한 상태이면, **THEN** 위젯은 해당 세션의 인증 정보를 활용하여 회원 등급별 가격, 할인 혜택을 반영해야 한다.

인증 연동:
- Shopby Access Token을 위젯 초기화 시 전달 (Aurora Skin에서 주입)
- 비로그인 상태: 비회원 가격으로 표시, 장바구니/주문 시 로그인 유도
- 토큰 만료 감지 및 갱신 요청 (Shopby 인증 흐름 위임)

### 3.4 가격 동기화

**R-WDG-004** [유비쿼터스]: 시스템은 **항상** 위젯에서 표시하는 동적 가격과 Shopby 옵션 가격이 일관되도록 동기화 메커니즘을 유지해야 한다.

동기화 전략:
- 위젯 초기화 시: Shopby 옵션 가격과 위젯 가격 엔진 결과 비교
- 옵션 변경 시: 위젯 가격 엔진이 실시간 재계산
- 주문 시: 위젯 계산 가격을 optionInputs에 포함 (서버 측 검증용)
- 불일치 감지: 10% 이상 차이 시 사용자에게 안내 + 관리자 알림

### 3.5 반응형 디자인

**R-WDG-005** [유비쿼터스]: 시스템은 **항상** 데스크톱(1280px+), 태블릿(768px-1279px), 모바일(~767px) 환경에서 위젯이 최적화된 레이아웃으로 렌더링되어야 한다.

반응형 요구사항:
- 모바일: 세로 스크롤 기반, 옵션 선택 드롭다운/바텀시트
- 태블릿: 2컬럼 레이아웃 (옵션 선택 + 가격 요약)
- 데스크톱: 3컬럼 레이아웃 (옵션 | 미리보기 | 가격 요약)
- 터치 인터랙션: 스와이프, 탭, 핀치 줌 지원

### 3.6 번들 크기 제한

**R-WDG-006** [비허용]: 위젯 JavaScript 번들의 gzip 압축 후 크기는 50KB를 **초과하지 않아야 한다**.

크기 최적화 전략:
- Preact (3KB gzip) 또는 Vanilla JS 사용 (React 사용 금지)
- Tree-shaking 적용
- 동적 임포트로 비핵심 모듈 지연 로딩
- 이미지/폰트 외부 CDN 활용
- CSS-in-JS 또는 최소 CSS 인라인

---

## 4. 사양 (Specifications)

### 4.1 위젯 SDK 초기화 인터페이스

```
// 위젯 초기화 (Aurora Skin에서 호출)
window.WidgetCreator.init({
  container: '#widget-creator-root',  // 마운트할 DOM 요소
  shopbyProductNo: 12345,             // Shopby 상품 번호
  shopbyAccessToken: 'eyJ...',        // Shopby 인증 토큰 (선택)
  theme: {
    primaryColor: '#FF6B00',          // 브랜드 컬러
    fontFamily: 'Noto Sans KR',
    borderRadius: '8px'
  },
  callbacks: {
    onAddToCart: (data) => {},         // 장바구니 추가 콜백
    onBuyNow: (data) => {},           // 즉시 구매 콜백
    onPriceChange: (price) => {},     // 가격 변경 콜백
    onError: (error) => {}            // 에러 콜백
  },
  locale: 'ko-KR'
});
```

### 4.2 위젯 → Shopby 데이터 전달 구조

```
// 장바구니/주문 시 전달되는 데이터
interface WidgetToShopbyPayload {
  productNo: number;
  optionNo: number;            // 선택된 COMBINATION 옵션 번호
  orderCnt: number;            // 주문 수량
  optionInputs: {
    designFileUrl: string;     // 디자인 파일 URL
    printSpec: string;         // JSON 문자열: 전체 인쇄 사양
    specialRequest?: string;   // 특수 요청
    proofRequired?: boolean;   // 시안 확인 여부
  };
  widgetPrice: {
    basePrice: number;         // 기본 가격
    optionPrice: number;       // 옵션 추가 가격
    postProcessPrice: number;  // 후가공 가격
    deliveryPrice: number;     // 배송비
    totalPrice: number;        // 최종 합계
  };
}
```

### 4.3 위젯 라이프사이클

```
1. Aurora Skin 페이지 로드
2. 위젯 스크립트 비동기 로드 (<script async src="widget.js">)
3. DOMContentLoaded 이벤트 후 위젯 자동 감지
   - data-wc-product 속성이 있는 DOM 요소 탐색
   - 또는 window.WidgetCreator.init() 수동 호출
4. Shopby productNo로 extraJson 조회 (GET /products/{productNo})
5. extraJson에서 widgetCreator 설정 추출
6. Widget Creator API에서 옵션 트리 로드
7. 위젯 UI 렌더링 (옵션 선택 폼 + 가격 표시)
8. 사용자 인터랙션 처리
   - 옵션 선택 → 가격 재계산 → UI 업데이트
   - 파일 업로드 → 업로드 진행률 표시
9. 장바구니/주문 → Shopby API 호출
```

### 4.4 위험 분석

| 위험 | 영향도 | 발생 확률 | 대응 전략 |
|---|---|---|---|
| Aurora Skin 스크립트 주입 제한 | Critical | Medium | iframe 폴백 방식 준비 |
| 위젯-호스트 CSS 충돌 | High | High | Shadow DOM 사용 |
| 위젯 로딩으로 페이지 성능 저하 | High | Medium | async 로딩 + 번들 분할 |
| 모바일 터치 인터랙션 이슈 | Medium | Medium | 모바일 전용 UI 컴포넌트 |
| Shopby 인증 토큰 접근 불가 | High | Low | 위젯 자체 인증 흐름 구현 |
| 번들 크기 50KB 초과 | Medium | Medium | Preact + 동적 임포트 + CDN |

---

## 5. 추적성 태그 (Traceability)

| TAG | 관련 요구사항 | 구현 위치 (예상) |
|---|---|---|
| TAG-WDG-EMBED | R-WDG-001 | packages/widget-sdk/src/init.ts |
| TAG-WDG-CART | R-WDG-002 | packages/widget-sdk/src/shopby-bridge.ts |
| TAG-WDG-AUTH | R-WDG-003 | packages/widget-sdk/src/auth-connector.ts |
| TAG-WDG-PRICE | R-WDG-004 | packages/widget-sdk/src/price-sync.ts |
| TAG-WDG-RESP | R-WDG-005 | packages/widget-sdk/src/ui/responsive/ |
| TAG-WDG-BUNDLE | R-WDG-006 | packages/widget-sdk/vite.config.ts |

---

문서 버전: 1.0.0
