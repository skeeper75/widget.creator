---
id: SPEC-WIDGET-SDK-001
version: 1.0.0
status: Completed
created: 2026-02-22
updated: 2026-02-23
author: MoAI
priority: P0
---

# SPEC-WIDGET-SDK-001: 구현 계획 (Implementation Plan)

## 1. 구현 전략

### 1.1 Preact 선정 근거 (Preact vs React)

| 기준 | React 19 | Preact 10.x | 판정 |
|------|----------|-------------|------|
| 번들 사이즈 (gzipped) | ~42KB (react + react-dom) | ~4KB (preact + signals) | Preact 승 |
| API 호환성 | 기본 | preact/compat으로 99% 호환 | 동등 |
| Shadow DOM 지원 | 이벤트 버블링 이슈 | 네이티브 이벤트 모델, 호환 우수 | Preact 승 |
| 상태 관리 | useState/useReducer (~0KB) | Preact Signals (~1KB) | Preact 승 (세밀한 구독) |
| 50KB 예산 내 비중 | 런타임만 84% 점유 | 런타임 8% 점유, 비즈니스 로직에 92% 배분 | Preact 승 |
| 에코시스템 | 풍부 | 소규모, 위젯 수준에서 충분 | React 승 (불필요) |

**결론**: 50KB 번들 예산 제약 하에서 React는 런타임만으로 예산 대부분을 소진하여 비현실적이다. Preact는 ~4KB 런타임으로 비즈니스 로직 및 컴포넌트에 46KB를 할당할 수 있다.

### 1.2 Shadow DOM 격리 전략

- **CSS 격리**: Shadow DOM의 `mode: 'open'`으로 내부 스타일이 호스트 페이지와 완전 분리
- **테마 주입**: CSS Custom Properties(`--huni-primary`, `--huni-radius` 등)는 Shadow DOM 경계를 관통하므로 `data-theme-*` 속성으로 외부 커스터마이징 가능
- **폰트 로딩**: Shadow DOM 내부에서 폰트 선언은 적용되지 않으므로, 호스트 `document.head`에 `<link>` 태그 주입 필요 (Noto Sans KR)
- **이벤트 위임**: Shadow DOM 내 이벤트는 외부로 전파되지 않으므로, CustomEvent의 `composed: true` 설정 또는 호스트 `document`에 직접 dispatch

### 1.3 Preact Signals 기반 상태 관리

- **Signal 아키텍처**: 5개 핵심 Signal(`widgetState`, `selections`, `available`, `constraints`, `price`)로 전체 위젯 상태 관리
- **세밀한 구독**: Signal은 참조하는 컴포넌트만 리렌더링하여 React의 Context/useSelector 대비 불필요한 리렌더링 최소화
- **Computed Signal**: `isComplete`와 같은 파생 상태는 `computed()`로 자동 캐싱 및 의존성 추적
- **Batch Update**: 옵션 변경 -> 제약조건 평가 -> 가격 재계산 파이프라인을 `batch()`로 묶어 중간 렌더링 방지

### 1.4 번들 사이즈 관리 전략

- **Vite Library Mode**: IIFE 단일 번들로 빌드, `inlineDynamicImports: true`로 코드 스플리팅 없는 단일 파일
- **Tree-shaking**: `"sideEffects": false` 설정으로 미사용 코드 제거
- **CSS-in-Shadow**: CSS 파일을 JS 번들에 인라인 포함 (`cssCodeSplit: false`)
- **size-limit CI**: PR마다 번들 사이즈 체크, 50KB 초과 시 CI 실패
- **Target**: `es2020` 타겟으로 폴리필 없는 최소 번들

---

## 2. 태스크 분해 (Task Decomposition)

### Phase 1: 프로젝트 스캐폴딩 및 기초 인프라

**목표**: 빌드 파이프라인 구축, 타입 시스템 설정, Shadow DOM 마운트 확인

| Task | 설명 | 산출물 | 복잡도 |
|------|------|--------|--------|
| 1.1 | 프로젝트 초기화 (package.json, tsconfig.json, vite.config.ts) | `packages/widget/` 디렉토리 구조 | Low |
| 1.2 | Vite Library Mode 설정 (IIFE 빌드, terser 압축) | `vite.config.ts` | Medium |
| 1.3 | 타입 정의 (widget, option, price, screen types) | `src/types/*.ts` (5 files) | Medium |
| 1.4 | Embed 스크립트 구현 (script tag 파싱, Shadow DOM 컨테이너 생성) | `src/embed.ts`, `src/index.ts` | High |
| 1.5 | Shadow DOM 유틸리티 (스타일 주입, 폰트 로딩) | `src/utils/shadow-dom.ts` | Medium |
| 1.6 | CustomEvent 디스패치 헬퍼 | `src/utils/events.ts` | Low |
| 1.7 | 숫자/가격 포맷팅 유틸리티 (KRW) | `src/utils/formatting.ts` | Low |
| 1.8 | size-limit 설정 및 CI 통합 | `.size-limit.json`, CI config | Low |
| 1.9 | Vitest 설정 (preact/test-utils, jsdom) | `vitest.config.ts` | Low |

### Phase 2: Primitive Components (7)

**목표**: 재사용 가능한 UI 기본 요소 구현, Shadow DOM 내 렌더링 검증

| Task | 설명 | 산출물 | 복잡도 |
|------|------|--------|--------|
| 2.1 | Button 컴포넌트 (5 variants: primary, secondary, outline, upload, editor) | `src/primitives/Button.tsx` | Low |
| 2.2 | ToggleGroup 컴포넌트 (default, compact variants) | `src/primitives/ToggleGroup.tsx` | Medium |
| 2.3 | Select 컴포넌트 (default, with-chip variants) | `src/primitives/Select.tsx` | Medium |
| 2.4 | RadioGroup 컴포넌트 (color-chip, image-chip variants) | `src/primitives/RadioGroup.tsx` | Medium |
| 2.5 | Collapsible 컴포넌트 (title-bar variant, badge) | `src/primitives/Collapsible.tsx` | Low |
| 2.6 | Input 컴포넌트 (number, dual variants) | `src/primitives/Input.tsx` | Medium |
| 2.7 | Slider 컴포넌트 (tier-display variant, price overlay) | `src/primitives/Slider.tsx` | High |
| 2.8 | Primitives barrel export | `src/primitives/index.ts` | Low |
| 2.9 | Primitive 전체 CSS 스타일 | `src/styles/primitives.css` | Medium |

### Phase 3: State Management (Preact Signals)

**목표**: 전역 상태 Signal 정의, 상태 전이 로직 구현

| Task | 설명 | 산출물 | 복잡도 |
|------|------|--------|--------|
| 3.1 | Widget 핵심 상태 Signal (widgetState, status machine) | `src/state/widget.state.ts` | Medium |
| 3.2 | 사용자 선택 상태 Signal (selections) | `src/state/selections.state.ts` | Medium |
| 3.3 | 가격 상태 Signal + computed (price, isComplete) | `src/state/price.state.ts` | Medium |
| 3.4 | State barrel export | `src/state/index.ts` | Low |

### Phase 4: 엔진 통합 (Option Engine + Price Engine)

**목표**: SPEC-WIDGET-CORE-001의 Core Engine을 Widget 번들에 tree-shaken 형태로 통합

| Task | 설명 | 산출물 | 복잡도 |
|------|------|--------|--------|
| 4.1 | Option Engine 통합 (constraint resolver) | `src/engine/option-engine.ts` | High |
| 4.2 | Price Engine 통합 (client-side calculator) | `src/engine/price-engine.ts` | High |
| 4.3 | Engine barrel export | `src/engine/index.ts` | Low |

### Phase 5: Domain Components (10)

**목표**: Primitive 조합으로 비즈니스 도메인별 컴포넌트 구현, 데이터 바인딩

| Task | 설명 | 산출물 | 복잡도 |
|------|------|--------|--------|
| 5.1 | SizeSelector (ToggleGroup 래핑, product_sizes 바인딩) | `src/components/SizeSelector.tsx` | Medium |
| 5.2 | PaperSelect (Select with-chip 래핑, paper_product_mapping 바인딩) | `src/components/PaperSelect.tsx` | Medium |
| 5.3 | NumberInput (Input number 래핑, option_constraints 바인딩) | `src/components/NumberInput.tsx` | Low |
| 5.4 | ColorChipGroup (RadioGroup color-chip 래핑, ref_* 해상도) | `src/components/ColorChipGroup.tsx` | Medium |
| 5.5 | ImageChipGroup (RadioGroup image-chip 래핑) | `src/components/ImageChipGroup.tsx` | Low |
| 5.6 | FinishSection (Collapsible + nested ToggleGroup/Select) | `src/components/FinishSection.tsx` | High |
| 5.7 | DualInput (Input dual 래핑, custom size constraints) | `src/components/DualInput.tsx` | Medium |
| 5.8 | QuantitySlider (Slider tier-display 래핑, price_tiers 바인딩) | `src/components/QuantitySlider.tsx` | Medium |
| 5.9 | PriceSummary (가격 분해 리스트 + 합계/VAT 표시) | `src/components/PriceSummary.tsx` | Medium |
| 5.10 | UploadActions (Button 조합, 4 variants) | `src/components/UploadActions.tsx` | Low |
| 5.11 | Domain component CSS | `src/styles/components.css` | Medium |
| 5.12 | Domain components barrel export | `src/components/index.ts` | Low |

### Phase 6: Screen Configurations (11) + ScreenRenderer

**목표**: 상품별 Screen 레이아웃 조합, ScreenRenderer 라우터 구현

| Task | 설명 | 산출물 | 복잡도 |
|------|------|--------|--------|
| 6.1 | ScreenRenderer (screenType -> Screen 컴포넌트 매핑) | `src/screens/ScreenRenderer.tsx` | Medium |
| 6.2 | PrintOption (Screen 01: 가장 많은 옵션, 기준 구현) | `src/screens/PrintOption.tsx` | High |
| 6.3 | StickerOption (Screen 02) | `src/screens/StickerOption.tsx` | Medium |
| 6.4 | BookOption (Screen 03: 내지/표지 이중 PaperSelect) | `src/screens/BookOption.tsx` | High |
| 6.5 | PhotobookOption (Screen 04: editor-only) | `src/screens/PhotobookOption.tsx` | Low |
| 6.6 | CalendarOption (Screen 05) | `src/screens/CalendarOption.tsx` | Medium |
| 6.7 | DesignCalendarOption (Screen 06) | `src/screens/DesignCalendarOption.tsx` | Low |
| 6.8 | SignOption (Screen 07: DualInput 포함) | `src/screens/SignOption.tsx` | Medium |
| 6.9 | AcrylicOption (Screen 08: DualInput + QuantitySlider) | `src/screens/AcrylicOption.tsx` | Medium |
| 6.10 | GoodsOption (Screen 09: ColorChip + QuantitySlider) | `src/screens/GoodsOption.tsx` | Medium |
| 6.11 | StationeryOption (Screen 10) | `src/screens/StationeryOption.tsx` | Low |
| 6.12 | AccessoryOption (Screen 11: 최소 옵션, cart-only) | `src/screens/AccessoryOption.tsx` | Low |
| 6.13 | Screens barrel export | `src/screens/index.ts` | Low |

### Phase 7: API Client 및 Root App

**목표**: API 통신, Root Preact 앱 조립, 전체 부트스트랩 완성

| Task | 설명 | 산출물 | 복잡도 |
|------|------|--------|--------|
| 7.1 | API Client (fetch 기반, getProductConfig, submitQuote, getUploadUrl) | `src/api/client.ts` | Medium |
| 7.2 | API 응답 타입 정의 | `src/api/types.ts` | Low |
| 7.3 | Root App 컴포넌트 (WidgetShell: 레이아웃, 테마 프로바이더, 상태 초기화) | `src/app.tsx` | High |
| 7.4 | 베이스 CSS + 디자인 토큰 CSS Custom Properties | `src/styles/base.css`, `src/styles/tokens.css` | Medium |

### Phase 8: 통합 테스트 및 번들 최적화

**목표**: E2E 통합 검증, 번들 사이즈 최적화, 성능 벤치마크

| Task | 설명 | 산출물 | 복잡도 |
|------|------|--------|--------|
| 8.1 | Primitive 컴포넌트 단위 테스트 (7 files) | `__tests__/primitives/*.test.tsx` | Medium |
| 8.2 | Domain 컴포넌트 단위 테스트 (10 files) | `__tests__/components/*.test.tsx` | Medium |
| 8.3 | Option Engine 단위 테스트 | `__tests__/engine/option-engine.test.ts` | High |
| 8.4 | State Signal 단위 테스트 | `__tests__/state/*.test.ts` | Medium |
| 8.5 | 통합 테스트 (Embed -> Shadow DOM -> Screen 렌더링) | `__tests__/integration/*.test.ts` | High |
| 8.6 | Shadow DOM CSS 격리 테스트 | `__tests__/integration/isolation.test.ts` | Medium |
| 8.7 | CustomEvent dispatch/listen 통합 테스트 | `__tests__/integration/events.test.ts` | Medium |
| 8.8 | 번들 사이즈 최적화 (tree-shaking 검증, 불필요 코드 제거) | 빌드 보고서 | High |
| 8.9 | 성능 벤치마크 (초기 로드, 옵션 변경 응답 시간) | 벤치마크 리포트 | Medium |

---

## 3. 파일 생성 목록

### 소스 파일 (총 47 files)

```
packages/widget/
  src/
    index.ts                           # Entry point
    embed.ts                           # Embed script bootstrap
    app.tsx                            # Root WidgetShell component
    primitives/
      ToggleGroup.tsx                  # Primitive 1
      Select.tsx                       # Primitive 2
      RadioGroup.tsx                   # Primitive 3
      Collapsible.tsx                  # Primitive 4
      Input.tsx                        # Primitive 5
      Slider.tsx                       # Primitive 6
      Button.tsx                       # Primitive 7
      index.ts                         # Barrel export
    components/
      SizeSelector.tsx                 # Domain 1
      PaperSelect.tsx                  # Domain 2
      NumberInput.tsx                  # Domain 3
      ColorChipGroup.tsx               # Domain 4
      ImageChipGroup.tsx               # Domain 5
      FinishSection.tsx                # Domain 6
      DualInput.tsx                    # Domain 7
      QuantitySlider.tsx               # Domain 8
      PriceSummary.tsx                 # Domain 9
      UploadActions.tsx                # Domain 10
      index.ts                         # Barrel export
    screens/
      PrintOption.tsx                  # Screen 01
      StickerOption.tsx                # Screen 02
      BookOption.tsx                   # Screen 03
      PhotobookOption.tsx              # Screen 04
      CalendarOption.tsx               # Screen 05
      DesignCalendarOption.tsx         # Screen 06
      SignOption.tsx                   # Screen 07
      AcrylicOption.tsx                # Screen 08
      GoodsOption.tsx                  # Screen 09
      StationeryOption.tsx             # Screen 10
      AccessoryOption.tsx              # Screen 11
      ScreenRenderer.tsx               # Screen router
      index.ts                         # Barrel export
    state/
      widget.state.ts                  # Core widget state
      selections.state.ts              # User selections
      price.state.ts                   # Price computation
      index.ts                         # Barrel export
    engine/
      option-engine.ts                 # Constraint resolver
      price-engine.ts                  # Price calculator
      index.ts                         # Barrel export
    api/
      client.ts                        # API client
      types.ts                         # API response types
      index.ts                         # Barrel export
    styles/
      tokens.css                       # Design tokens
      primitives.css                   # Primitive styles
      components.css                   # Domain component styles
      base.css                         # Reset + base styles
    utils/
      events.ts                        # CustomEvent helpers
      shadow-dom.ts                    # Shadow DOM utilities
      formatting.ts                    # Price/number formatting
      index.ts                         # Barrel export
    types/
      widget.types.ts                  # Widget core types
      option.types.ts                  # Option system types
      price.types.ts                   # Price types
      screen.types.ts                  # Screen config types
      index.ts                         # Barrel export
```

### 설정 파일 (5 files)

```
packages/widget/
  package.json                         # Dependencies, scripts
  tsconfig.json                        # TypeScript config (strict)
  vite.config.ts                       # Vite Library Mode config
  vitest.config.ts                     # Test config
  .size-limit.json                     # Bundle size limits
```

### 테스트 파일 (예상 25+ files)

```
packages/widget/__tests__/
  primitives/
    Button.test.tsx
    ToggleGroup.test.tsx
    Select.test.tsx
    RadioGroup.test.tsx
    Collapsible.test.tsx
    Input.test.tsx
    Slider.test.tsx
  components/
    SizeSelector.test.tsx
    PaperSelect.test.tsx
    NumberInput.test.tsx
    ColorChipGroup.test.tsx
    ImageChipGroup.test.tsx
    FinishSection.test.tsx
    DualInput.test.tsx
    QuantitySlider.test.tsx
    PriceSummary.test.tsx
    UploadActions.test.tsx
  engine/
    option-engine.test.ts
    price-engine.test.ts
  state/
    widget.state.test.ts
    selections.state.test.ts
    price.state.test.ts
  integration/
    bootstrap.test.ts
    isolation.test.ts
    events.test.ts
    screen-routing.test.ts
```

---

## 4. 번들 사이즈 추적 전략

### 4.1 size-limit CI 통합

```json
// .size-limit.json
[
  {
    "path": "dist/embed.iife.js",
    "limit": "50 KB",
    "gzip": true,
    "name": "Total Widget Bundle"
  },
  {
    "path": "dist/embed.iife.js",
    "limit": "35 KB",
    "gzip": true,
    "name": "Target Budget (stretch goal)"
  }
]
```

### 4.2 사이즈 예산 분배 및 모니터링

| 카테고리 | 예산 (gzipped) | 모니터링 방법 |
|----------|----------------|--------------|
| Preact runtime + Signals | ~4KB | package.json 버전 고정 |
| Core engine (tree-shaken) | ~8KB | `vite-plugin-visualizer` |
| Primitives (7) | ~5KB | Per-component size 추적 |
| Domain components (10) | ~8KB | Per-component size 추적 |
| Active screen (1 of 11) | ~3KB | Lazy loading 검증 |
| State + API + embed | ~4KB | 모듈별 size 분석 |
| Styles (CSS-in-Shadow) | ~2KB | CSS 최소화 검증 |
| **총합** | **~34KB** | PR별 자동 체크 |

### 4.3 사이즈 초과 시 대응 전략

1. **경고 수준** (35-45KB): `vite-plugin-visualizer`로 병목 모듈 식별, 불필요 import 제거
2. **위험 수준** (45-50KB): Screen 단위 dynamic import 적용 (REQ-O-001), 공통 코드 추출
3. **차단 수준** (50KB+): CI 실패, PR 머지 차단, 근본적 아키텍처 재검토 필요

---

## 5. 기술 결정 사항

### 5.1 Preact Signals vs useState/useReducer

**선택: Preact Signals**

- 세밀한 구독으로 옵션 변경 시 관련 컴포넌트만 리렌더링 (17개 컴포넌트 중 1-2개만 업데이트)
- `batch()`를 통한 원자적 상태 업데이트 (옵션 변경 -> 제약조건 -> 가격이 단일 렌더링 사이클)
- `computed()`를 통한 파생 상태 자동 캐싱
- 번들 사이즈 ~1KB gzipped (React 대비 5KB+ 절감)

### 5.2 Shadow DOM mode: 'open' vs 'closed'

**선택: mode 'open'**

- 디버깅 용이성 (DevTools에서 Shadow Tree 탐색 가능)
- 호스트 페이지에서 `widget.shadowRoot.querySelector()` 가능 (테스트 및 자동화)
- 보안 의존 대상이 아님 (위젯 데이터는 공개 정보)

### 5.3 CSS 전략: CSS-in-JS vs CSS Files

**선택: 순수 CSS 파일 (Shadow DOM 내 인라인)**

- CSS-in-JS 런타임 오버헤드 제거 (번들 사이즈 절감)
- CSS Custom Properties로 테마 주입 (Shadow DOM 경계 관통)
- `cssCodeSplit: false`로 JS 번들에 CSS 인라인 포함
- Shadow DOM 격리로 전역 네임스페이스 충돌 불가

### 5.4 API 통신: fetch vs axios

**선택: Native fetch**

- 추가 라이브러리 불필요 (번들 사이즈 0KB)
- ES2020+ 타겟에서 폴리필 불필요
- 3개 엔드포인트(getProductConfig, submitQuote, getUploadUrl)에 axios 기능 불필요

---

## 6. 리스크 분석

### 6.1 번들 사이즈 초과 위험

| 리스크 | 확률 | 영향 | 대응 |
|--------|------|------|------|
| Core engine tree-shaking 실패로 불필요 코드 포함 | Medium | High | `vite-plugin-visualizer`로 빌드마다 모듈 분석, barrel export 대신 direct import |
| 11개 Screen 모두 번들에 포함되어 사이즈 팽창 | Medium | Medium | Screen별 lazy import 검토 (REQ-O-001), 공통 패턴 추출 |
| CSS 중복으로 인한 사이즈 증가 | Low | Low | 디자인 토큰 공유, CSS utility class 최소화 |

### 6.2 Shadow DOM CSS 제약

| 리스크 | 확률 | 영향 | 대응 |
|--------|------|------|------|
| Shadow DOM 내 웹폰트 로딩 불가 | High | Medium | 호스트 `document.head`에 `<link>` 태그 주입 |
| 호스트 CSS Reset이 Shadow DOM 내부로 침투 | Low | Low | Shadow DOM이 기본 차단, `all: initial` 방어 추가 |
| `::slotted()`, `::part()` 선택자 브라우저 호환성 | Low | Low | slot/part 미사용, 내부 CSS만 사용 |

### 6.3 크로스 브라우저 호환성

| 리스크 | 확률 | 영향 | 대응 |
|--------|------|------|------|
| Safari 14 Shadow DOM 이벤트 버블링 차이 | Medium | Medium | `composed: true` 설정, 크로스 브라우저 테스트 |
| ES2020 구문 미지원 브라우저 접근 | Low | High | A-1 가정(ES2020+ 모던 브라우저)으로 폴리필 제외 |
| Preact Signals IE 미지원 | None | None | IE 미지원 명시 (A-1) |

### 6.4 성능 위험

| 리스크 | 확률 | 영향 | 대응 |
|--------|------|------|------|
| 옵션 변경 시 제약조건 평가 + 가격 재계산 지연 | Medium | Medium | `requestIdleCallback` 또는 `queueMicrotask`로 비동기 처리, 100ms 타겟 |
| 대규모 옵션 트리(100+ choices)에서 렌더링 지연 | Low | Medium | 가상화(virtualization) 또는 페이지네이션 검토 |
| 초기 API 응답 지연으로 UX 저하 | Medium | Medium | 스켈레톤 UI + 점진적 렌더링 (REQ-S-001) |

---

## 7. 마일스톤

### Milestone 1: Primitives 완성 (Primary Goal)

**범위**: Phase 1 + Phase 2

- 프로젝트 스캐폴딩, Vite 빌드 파이프라인 구축
- 7개 Primitive Component 구현 및 Shadow DOM 내 렌더링 검증
- 디자인 토큰 CSS Custom Properties 적용
- 번들 사이즈 기초 측정 (런타임 + primitives)

**검증**: 독립 Storybook 또는 테스트 페이지에서 7개 Primitive 렌더링 확인

### Milestone 2: Domain Components + State (Secondary Goal)

**범위**: Phase 3 + Phase 4 + Phase 5

- Preact Signals 상태 시스템 구축
- Option Engine, Price Engine 통합
- 10개 Domain Component 구현 및 Signal 바인딩
- 제약조건 평가 -> 가격 재계산 파이프라인 동작 확인

**검증**: PrintOption (Screen 01) 기준으로 전체 옵션 선택 -> 가격 계산 E2E 동작

### Milestone 3: Screens + Embed (Tertiary Goal)

**범위**: Phase 6 + Phase 7

- 11개 Screen Configuration 구현
- ScreenRenderer 라우터 구현
- API Client 구현
- Root App (WidgetShell) 조립
- Embed 스크립트 부트스트랩 완성

**검증**: `<script>` 태그 삽입으로 위젯 로드 -> API 호출 -> Screen 렌더링 -> 옵션 선택 -> 가격 표시

### Milestone 4: Integration Testing + Optimization (Final Goal)

**범위**: Phase 8

- 전체 통합 테스트 (25+ test files)
- Shadow DOM CSS 격리 검증
- CustomEvent 호스트 통신 검증
- 번들 사이즈 최종 최적화 (34KB 타겟)
- 성능 벤치마크 (1s FMP, 100ms 옵션 변경)
- 크로스 브라우저 호환성 검증

**검증**: CI 파이프라인 전체 통과, 50KB 미만 번들, 85%+ 테스트 커버리지

---

## 8. 의존성 관계

```
Phase 1 (스캐폴딩)
  |
  +-- Phase 2 (Primitives) ----+
  |                             |
  +-- Phase 3 (State) ------+  |
  |                          |  |
  +-- Phase 4 (Engines) --+ |  |
                           | |  |
                           v v  v
                     Phase 5 (Domain Components)
                           |
                           v
                     Phase 6 (Screens)
                           |
                           v
                     Phase 7 (API + App)
                           |
                           v
                     Phase 8 (Integration)
```

- Phase 2, 3, 4는 Phase 1 완료 후 **병렬 진행** 가능
- Phase 5는 Phase 2 + 3 + 4 모두 완료 필요 (Primitive + State + Engine 조합)
- Phase 6은 Phase 5 완료 필요 (Domain Component 조합)
- Phase 7은 Phase 6과 부분 병렬 가능 (API Client 독립 구현)
- Phase 8은 Phase 7 완료 필요

---

## 9. 관련 SPEC 참조

| SPEC ID | 관계 | 내용 |
|---------|------|------|
| SPEC-INFRA-001 | 의존 | Drizzle ORM 스키마 (데이터 모델 참조) |
| SPEC-DATA-002 | 의존 | 인쇄 자동견적 데이터 정규화 스키마 |
| SPEC-WIDGET-CORE-001 | 의존 | Core Engine (Pricing + Option + Constraint) |
| SPEC-WIDGET-API-001 | 의존 | Widget API 서버 (REST API 엔드포인트) |
