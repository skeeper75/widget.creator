# SPEC-DATA-002: 인쇄 자동견적 데이터 정규화

> Version: 1.0.0-draft
> Created: 2026-02-22
> Status: Draft (사용자 검토 대기)
> Priority: High

---

## 1. 개요

### 1.1 목적

후니프린팅의 3개 엑셀 파일(상품마스터, 인쇄상품 가격표, 품목관리)에 담긴 비정형 데이터를
관계형 데이터베이스로 정규화하여 다음 목적을 달성한다:

1. **자동견적 엔진**: 7가지 가격 산정 모델에 따른 실시간 가격 계산
2. **자재/공정/가격 관리**: CRUD 기반 독립 관리 (추가/수정/삭제 가능)
3. **MES 매핑**: 품목관리 시스템과의 양방향 매핑
4. **UI 옵션 관리**: 주문 화면의 옵션 배치순서, 의존성, 제약조건 관리
5. **확장성**: PDF 파일주문, 에디터 모드 등 주문방식 확장 지원

### 1.2 데이터 출처

| 파일 | 시트 수 | 역할 |
|------|---------|------|
| 상품마스터 (260209) | 13 | 상품 정의, 옵션, 제약조건 |
| 인쇄상품 가격표 (260214) | 16 | 가격 테이블, 판걸이, 후가공 단가 |
| 품목관리 | 2 | MES 품목코드, 그룹, 옵션 |

### 1.3 코드 체계 원칙

본 시스템은 4종의 외부 식별자를 관리한다:

| 코드 | 소유 시스템 | 타입 | 형식 | 예시 | 역할 |
|------|----------|------|------|------|------|
| **huni_code** | 위젯빌더 | VARCHAR(10) | 숫자 5자리 | `14567`, `90001` | **중추적 상품 식별자**. 모든 내/외부 매핑의 기준점 |
| **edicus_code** | 에디쿠스 (디자인 에디터) | VARCHAR(15) | `HU_` + huni_code | `HU_14567` | 에디쿠스 등록 디자인 코드. huni_code에서 자동 파생 |
| **shopby_id** | Shopby (쇼핑몰 플랫폼) | INTEGER | 숫자 | 미정 | Shopby 상품 등록 후 부여. **추후 별도 설계 필요 (TODO)** |
| **MES ITEM_CD** | MES (제조실행시스템) | VARCHAR(20) | `NNN-NNNN` | `001-0001` | MES 품목코드. 보존 |

**코드 관계**:
- huni_code가 중추 키. edicus_code = "HU_" + huni_code (파생 관계)
- shopby_id는 Shopby 플랫폼 등록 시 별도 부여 (현시점 미정)
- MES ITEM_CD는 MES 시스템 고유 코드, product_mes_mapping을 통해 연결

**신규 상품 코드 부여 규칙**:
- 기존 상품 (164개): 기존 숫자 그대로 사용 (14529~22953)
- 신규 상품 (57개): 90001부터 순차 부여 (임시). 추후 정식 코드로 변경 가능
- 9번대는 임시 등록 구간으로 예약

**설계 미확정 사항 (TODO)**:
- shopby_id 체계: Shopby 상품 등록 후 ID 매핑 방식 결정 필요
- huni_code <-> shopby_id 동기화 정책 결정 필요

---

## 2. 발견된 데이터 구조

### 2.1 상품마스터 시트별 컬럼 구조 차이

각 카테고리 시트마다 컬럼 헤더 구조가 다름 (동일 위치에 다른 의미):

| 영역 | 디지털인쇄 | 스티커 | 책자 | 실사 | 아크릴 |
|------|----------|--------|------|------|--------|
| 기본정보 | A~D (구분/ID/MES/상품명) | 동일 | 동일 | 동일 | 동일 |
| 사이즈 | E (사이즈) | E (사이즈) | E (사이즈) | E+F (사이즈+비규격) | E+F (사이즈+비규격) |
| 파일사양 | G~M (회색/내부) | G~M (회색) | F~L 내지 + R~W 표지 | H~N (회색) | I~O (회색) |
| 용지 | P (종이) | P (종이) | M 내지 + X 표지 | Q (소재) | R (소재) |
| 인쇄 | Q (인쇄) | Q (인쇄) | N 내지 + Y 표지 | - | S (인쇄사양) |
| 별색 | R~V (화이트/클리어/핑크/금/은) | R~V | - | T (화이트) | - |
| 후가공 | AD~AH | AC~AD | Z 코팅 + AB 박 | U 코팅 + W 가공 | U 가공 |
| 수량 | Z~AC | Z~AB | AJ~AL | AA~AC | Y~AA |
| 가격 | - | - | - | R~S (고정가) | H (고정가) |

### 2.2 컬럼 색상 코딩 (작성자 범례, 행 259)

| 헤더 색상 | 의미 | 정규화 대상 |
|----------|------|------------|
| #FFE06666 (빨강) | 필수 항목 | required=true |
| #FFF6B26B (주황) | 옵션 항목 | required=false |
| #FFD9D9D9 (회색) | 내부 전용 (고객 비노출) | internal=true |
| #FFC4BD97 (베이지) | 기본 식별 정보 | 상품 기본 필드 |

| 데이터 색상 | 의미 | 처리 |
|------------|------|------|
| 빨간 글씨 + ★ | 제약조건 | constraints 테이블로 분리 |
| 회색 글씨 | 내부 전용 텍스트 | internal 플래그 |
| 오렌지 글씨 | 작성자 메모 | 무시 (마이그레이션 제외) |
| 노랑 배경 | 신규상품 (MES 미등록) | mes_registered=false |

### 2.3 ★ 제약조건 유형 (3가지)

| 유형 | 패턴 | 예시 | 정규화 방식 |
|------|------|------|-----------|
| A: 부속품 조건 | ★사이즈선택 : {size} | 엽서봉투 ★사이즈선택 : 100x150 | if(size==100x150) show(봉투옵션) |
| B: 가공 크기 제한 | ★최소 {min} / 최대 {max} | ★최소 30x30 / 최대 125x125 | constraint(min_w=30, min_h=30, max_w=125, max_h=125) |
| C: 용지 조건 | ★{조건} : {값} | ★종이두께선택시 : 180g이상 코팅가능 | if(paper.weight>=180) enable(coating) |

---

## 3. 7가지 가격 산정 모델

### Model 1: 공식 기반 (디지털인쇄 일반)

**대상 상품**: 엽서, 카드, 전단지, 리플렛, 상품권, 배경지, 헤더택

**공식** (행 256에서 발견):
```
총가 = 출력비 + 별색비 + 지대(용지비) + 코팅비 + 가공비 + 후가공비
```

**세부 계산**:
- 필요판수 = ceil(주문수량 / 판걸이수)
- 출력비 = lookup(디지털출력비[인쇄방식], 필요판수) × 필요판수
- 별색비 = lookup(디지털출력비[별색유형], 필요판수) × 필요판수
- 지대 = (용지단가_국4절 / 판걸이수 × (주문수량 + 로스량))
- 코팅비 = lookup(후가공.코팅[코팅방식], 필요판수) × 필요판수
- 가공비 = lookup(후가공[가공유형], 주문수량) × 주문수량
- 후가공비 = SUM(각 후가공 lookup × 주문수량)

**기준판형**: A3(316×467) 또는 T3(330×660) - 상품마스터 J열(출력용지규격)로 결정

### Model 2: 공식 + 커팅가공비 (스티커)

**대상**: 반칼/규격/자유형 스티커

**공식**: Model 1 공식 + 커팅가공비(사이즈×커팅방식별 수량구간 단가)

### Model 3: 고정 단가 (명함/포토카드)

**대상**: 명함류, 포토카드, 투명포토카드

**공식**: 상품단가(용지, 단면/양면) × (주문수량 / 100)

### Model 4: 패키지 가격 (옵션결합상품)

**대상**: 엽서북

**공식**: lookup(사이즈 × 인쇄 × 페이지수, 주문수량)

### Model 5: 구성품 합산 (책자)

**대상**: 중철/무선/PUR/트윈링/하드커버 책자

**공식**: 내지가격 + 표지가격 + 제본비 + 표지코팅비 + 박/형압비 + 개별포장비
- 내지: 용지비 × 페이지수 + 출력비 × 페이지판수
- 표지: 용지비 + 출력비 + 코팅비

### Model 6: 사이즈별 고정가 (실사/포스터)

**대상**: 아트프린트포스터, 방수포스터, 현수막, 패브릭

**공식**: 사이즈별단가 + 코팅옵션가 + 가공옵션가

### Model 7: 개당 고정가 + 수량할인 (아크릴/굿즈)

**대상**: 아크릴키링, 뱃지, 머그컵, 코스터 등

**공식**: (사이즈별단가 + 가공옵션가 + 추가상품가) × 수량 × 수량할인율

---

## 3.5 UI 컴포넌트 타입 정의

> Figma 디자인(ref/figma/OVERVIEW.png + 01~11.png)과 SVG 분석 결과를 기반으로 정의한다.
> 컴포넌트 명칭은 **shadcn/ui(Radix UI) 표준 프리미티브** 위에 **후니 도메인 컴포넌트**를 구성하는 이중 레이어 구조를 따른다.

### 3.5.1 디자인 토큰 (SVG 직접 추출)

**컬러 시스템**:

| 토큰명 | 값 | 용도 |
|--------|-----|------|
| primary | #5538B6 | 선택 상태, CTA 버튼, 강조 |
| secondary | #4B3F96 | 보조 강조 |
| accent | #F0831E | 액센트 |
| text-primary | #424242 | 본문 텍스트 |
| text-secondary | #979797 | 힌트/플레이스홀더 |
| text-tertiary | #A5A5A5 | 약한 강조 |
| border | #CACACA | 입력필드/버튼 테두리 |
| disabled | #D9D9D9 | 비활성 상태 |
| surface | #F6F6F6 | 미묘한 배경 |
| background | #F5F6F8 | 페이지 배경 |

**타이포그래피**: Noto Sans (400/500/600/700), 기본 14px/400, 범위 8~36px
**간격**: 4px 기반 그리드 (Tailwind 기본과 일치)
**Border Radius**: 기본 4px, 칩 20px, 작은요소 3px
**색상 칩 크기**: 직경 50px (선택 시 52px with ring)

### 3.5.2 프리미티브 레이어 (shadcn/ui 기반)

총 7종의 기본 프리미티브로 모든 UI를 구성한다.

| # | shadcn/ui 프리미티브 | Radix Primitive | 설명 | 변형(Variant) |
|---|---------------------|-----------------|------|-------------|
| 1 | **ToggleGroup** | `@radix-ui/react-toggle-group` | 다중 버튼 단일 선택 | `default` (그리드 래핑), `compact` (인라인) |
| 2 | **Select** | `@radix-ui/react-select` | 드롭다운 선택 | `default`, `with-chip` (인라인 컬러칩 포함) |
| 3 | **RadioGroup** | `@radix-ui/react-radio-group` | 라디오 선택 | `color-chip` (원형 컬러), `image-chip` (이미지+텍스트) |
| 4 | **Collapsible** | `@radix-ui/react-collapsible` | 접이식 섹션 | `title-bar` (열기/닫기 토글 헤더) |
| 5 | **Input** | (HTML native) | 텍스트/숫자 입력 | `number` (-/+ 스테퍼), `dual` (가로x세로) |
| 6 | **Slider** | `@radix-ui/react-slider` | 범위 선택 | `tier-display` (비연속 스텝 + 가격 오버레이) |
| 7 | **Button** | (HTML native) | 액션 버튼 | `primary`, `secondary`, `outline`, `upload`, `editor` |

**shadcn/ui 커버리지**:
- 직접 사용: Collapsible, Button (2/7)
- 확장 필요: ToggleGroup, Select (2/7)
- 커스텀 빌드: Input(number/dual), RadioGroup(chip), Slider(tier) (3/7)

### 3.5.3 도메인 레이어 (후니프린팅 전용)

프리미티브를 조합하여 인쇄 주문 도메인에 특화된 10종 컴포넌트를 구성한다.

| # | 후니 컴포넌트 | 프리미티브 조합 | Figma 원본명 | 데이터 소스 |
|---|-------------|--------------|-------------|-----------|
| 1 | **SizeSelector** | ToggleGroup(default) | button-group | `product_sizes` |
| 2 | **PaperSelect** | Select(with-chip) | select-box | `papers` + `paper_product_mapping` |
| 3 | **NumberInput** | Input(number) | count-input | `product_options` (min/max/step) |
| 4 | **ColorChipGroup** | RadioGroup(color-chip) | color-chip | `option_choices` (ref_*) |
| 5 | **ImageChipGroup** | RadioGroup(image-chip) | image-chip | `option_choices` (ref_*) |
| 6 | **FinishSection** | Collapsible(title-bar) + 하위 컴포넌트 | finish-title-bar | `post_processes` + `option_dependencies` |
| 7 | **DualInput** | Input(dual) | finish-input | `option_constraints` (min/max) |
| 8 | **QuantitySlider** | Slider(tier-display) | quantity-range | `price_tiers` 또는 `quantity_discount_rules` |
| 9 | **PriceSummary** | 커스텀 리스트 | summary | 견적 계산 엔진 결과 |
| 10 | **UploadActions** | Button 조합 | upload | `products.order_method` + `product_editor_mapping` |

### 3.5.3.1 UI 컴포넌트 아스키 와이어프레임

각 도메인 컴포넌트의 시각적 구조를 아스키 와이어프레임으로 정의한다. Figma 디자인(ref/figma/OVERVIEW.png)을 기준으로 한다.

**1. SizeSelector** (ToggleGroup)
```
사이즈
┌──────────┐ ┌──────────┐ ┌══════════╗ ┌──────────┐
│ 73x98 mm │ │ 98x98 mm │ ║100x150mm ║ │135x135mm │
└──────────┘ └──────────┘ ╚══════════╝ └──────────┘
┌──────────┐ ┌──────────┐ ┌──────────┐
│ 95x210mm │ │110x170mm │ │148x210mm │
└──────────┘ └──────────┘ └──────────┘
              ╔══╗ = 선택 상태 (border: primary #5538B6)
```

**2. PaperSelect** (Select with chip)
```
종이
┌────────────────────────────────────┐
│ 몽블랑 190g  ▓▓                 ▼ │
└────────────────────────────────────┘
                ▓▓ = 컬러칩 (기본 용지 그룹 색상)

[드롭다운 펼침 상태]
┌────────────────────────────────────┐
│ 몽블랑 190g  ▓▓                 ▲ │
├────────────────────────────────────┤
│ 랑데뷰 울트라화이트 240g           │
│ 몽블랑 240g                       │
│ 아코팩(웜화이트) 250g              │
│ 리사이클러스 240g                  │
└────────────────────────────────────┘
```

**3. NumberInput** (Input:number)
```
제작수량
┌────┐ ┌──────┐ ┌────┐
│ −  │ │  20  │ │ +  │
└────┘ └──────┘ └────┘
```

**4. ColorChipGroup** (RadioGroup:color-chip)
```
박(앞면) 칼라                    확인/고르기
                                ┌────────┐
  ●    ●    ●    ●    ●    ●    │확인/고르기│
 금색  은색  검정  빨강  핑크  파랑  └────────┘
  ◉ = 선택 상태 (ring: primary + scale 1.04)
  ● = 비선택 (직경 50px)

[선택 시]
  ●    ●    ●    ●    ◉    ●    ┌────────┐
 금색  은색  검정  빨강  핑크  파랑  │확인/고르기│
                                └────────┘
```

**5. ImageChipGroup** (RadioGroup:image-chip)
```
링칼라                          링사양
┌══════════╗ ┌──────────┐     ┌══════════╗ ┌──────────┐ ┌──────────┐
║ ┌──────┐ ║ │ ┌──────┐ │     ║ ┌──────┐ ║ │ ┌──────┐ │ │ ┌──────┐ │
║ │ 이미지 │ ║ │ │ 이미지 │ │     ║ │ 이미지 │ ║ │ │ 이미지 │ │ │ │ 이미지 │ │
║ └──────┘ ║ │ └──────┘ │     ║ └──────┘ ║ │ └──────┘ │ │ └──────┘ │
║  블랙    ║ │  실버    │     ║ 트윈링   ║ │ 스프링(단) │ │ 스프링(이중)│
╚══════════╝ └──────────┘     ╚══════════╝ └──────────┘ └──────────┘
```

**6. FinishSection** (Collapsible)
```
[접힌 상태]
┌────────────────────────────────────────┐
│ 후가공                          열기 → │
└────────────────────────────────────────┘

[펼친 상태]
┌────────────────────────────────────────┐
│ 후가공                          닫기 → │
├────────────────────────────────────────┤
│                                        │
│ 귀돌이 :                               │
│ ┌══════════╗ ┌──────────┐              │
│ ║ 직각모서리 ║ │ 둥근모서리 │              │
│ ╚══════════╝ └──────────┘              │
│                                        │
│ 오시 :                                 │
│ ┌══════╗ ┌────┐ ┌────┐ ┌────┐         │
│ ║ 없음  ║ │ 1줄 │ │ 2줄 │ │ 3줄 │         │
│ ╚══════╝ └────┘ └────┘ └────┘         │
│                                        │
│ 미싱 :                                 │
│ ┌══════╗ ┌────┐ ┌────┐ ┌────┐         │
│ ║ 없음  ║ │ 1줄 │ │ 2줄 │ │ 3줄 │         │
│ ╚══════╝ └────┘ └────┘ └────┘         │
│                                        │
└────────────────────────────────────────┘
```

**7. DualInput** (Input:dual)
```
박(앞면) 크기 직접입력
┌────────────┐     ┌────────────┐
│  가로 크기   │  ×  │  세로 크기   │
└────────────┘     └────────────┘
  가로 30 ~ 125 mm × 세로 30 ~ 170 mm
  (min/max 힌트 텍스트, color: text-secondary)
```

**8. QuantitySlider** (Slider:tier-display)
```
제작수량별 구간할인
┌──────────────────────────────────────┐
│  ●━━━━━━━○─────────○─────────○─────○ │
│  1      30       100       500  1000 │
│                                      │
│  현재단가: 3,260 원/개                  │
│  제작수량에 따라 할인이 적용됩니다        │
└──────────────────────────────────────┘
  ● = 현재 위치 (primary color)
  ○ = 구간 경계점
  ━ = 활성 구간, ─ = 비활성 구간
```

**9. PriceSummary** (Summary)
```
┌──────────────────────────────────────┐
│ 사이즈 : 100 x 150 mm, 몽블랑 190...  50,000│
│ 후가공 : 미싱(1줄)+무광코팅(양면)...   25,000│
│ 추가상품: OPP접착봉투 110x160...       1,100│
│──────────────────────────────────────│
│ 합계금액  상품 1 개/2벌/장 부가세 미포함       │
│                              82,500  │
└──────────────────────────────────────┘
  합계금액: font-size 24px, weight 600, color primary
```

**10. UploadActions** (Upload/Cart)
```
[full 변형 - 인쇄/굿즈]
┌──────────────────────────────────────┐
│   (↑) PDF파일 작업 올리기              │
│   ○ 디자인파일(.ai, 등 파일만되어요, 시안으로)  │
└──────────────────────────────────────┘
┌══════════════════════════════════════╗
║   (✎) 테마로 디자인하기               ║  ← primary bg
║   ○ 테마는 시안없이도 만들수            ║
╚══════════════════════════════════════╝
┌══════════════════════════════════════╗
║          장바구니담기                  ║  ← primary bg
╚══════════════════════════════════════╝

[editor-only 변형 - 포토북/디자인캘린더/아크릴]
┌══════════════════════════════════════╗
║   (✎) 테마로 디자인하기               ║
╚══════════════════════════════════════╝

[upload-only 변형 - 캘린더/실사]
┌──────────────────────────────────────┐
│   (↑) PDF파일 작업 올리기              │
└──────────────────────────────────────┘

[cart-only 변형 - 액세서리]
┌══════════════════════════════════════╗
║          장바구니담기                  ║
╚══════════════════════════════════════╝
```

### 3.5.4 주문 UI 변형 (UploadActions 4가지)

| 변형 | 구성 | 적용 화면 |
|------|------|----------|
| **full** | PDF업로드 + 테마에디터 + 장바구니 | 01(인쇄), 09(굿즈), 10(문구) |
| **editor-only** | 테마에디터 only | 04(포토북), 06(디자인캘린더), 08(아크릴) |
| **upload-only** | PDF업로드 only | 05(캘린더), 07(실사) |
| **cart-only** | 장바구니 only | 11(액세서리) |

결정 로직: `products.order_method` (upload/editor/both) + `product_editor_mapping` 존재 여부

### 3.5.5 11개 Figma 화면별 컴포넌트 매핑

**01. PRODUCT_PRINT_OPTION (디지털인쇄)**:
- SizeSelector(사이즈) + PaperSelect(종이) + ToggleGroup(인쇄,별색x5,코팅,컬러) + NumberInput(건수,수량)
- FinishSection{ToggleGroup(귀돌이,오시,미싱,가변x2)}
- FinishSection{ToggleGroup(박유무) + DualInput(박크기) + ColorChipGroup(박칼라) + ToggleGroup(형압) + DualInput(형압크기)}
- Select(엽서봉투) + PriceSummary + UploadActions(full)

**02. PRODUCT_STICKER_OPTION (스티커)**:
- SizeSelector + PaperSelect + ToggleGroup(인쇄,별색,커팅) + Select(조각수) + NumberInput(수량)
- FinishSection + PriceSummary + UploadActions(full)

**03. PRODUCT_BOOK_OPTION (책자)**:
- SizeSelector + ToggleGroup(제본,제본방향) + ImageChipGroup(링칼라,링사양) + ToggleGroup(방식) + NumberInput(수량)
- PaperSelect(내지종이) + ToggleGroup(내지인쇄) + NumberInput(내지페이지)
- PaperSelect(표지종이) + ToggleGroup(표지인쇄,표지코팅,투명카바)
- FinishSection{ToggleGroup(박,형압) + DualInput(크기) + ColorChipGroup(칼라)}
- Select(개별포장) + PriceSummary + UploadActions(full)

**04. PRODUCT_PHOTOBOOK_OPTION (포토북)**:
- SizeSelector + ToggleGroup(커버타입) + NumberInput(수량)
- PriceSummary + UploadActions(editor-only)

**05. PRODUCT_CALENDAR_OPTION (캘린더)**:
- SizeSelector + PaperSelect + ToggleGroup(인쇄) + Select(장수)
- ColorChipGroup(삼각대) + ToggleGroup(캘린더가공) + ColorChipGroup(링) + NumberInput(수량)
- Select(개별포장,캘린더봉투) + PriceSummary + UploadActions(upload-only)

**06. PRODUCT_DESIGN_CALENDAR_OPTION (디자인캘린더)**:
- SizeSelector + PaperSelect + Select(레이저) + NumberInput(수량)
- Select(캘린더봉투) + PriceSummary + UploadActions(editor-only)

**07. PRODUCT_SIGN_POSTER_OPTION (실사/사인)**:
- SizeSelector + DualInput(직접입력) + PaperSelect(소재) + ToggleGroup(별색) + NumberInput(수량)
- PriceSummary + UploadActions(upload-only)

**08. PRODUCT_ARRYLIC_OPTION (아크릴)**:
- SizeSelector + DualInput(크기직접입력) + ToggleGroup(소재,가공) + Select(조각수) + NumberInput(수량)
- QuantitySlider(구간할인) + Select(물먹인) + PriceSummary + UploadActions(editor-only)

**09. PRODUCT_GOODS_OPTION (굿즈/파우치)**:
- SizeSelector + ColorChipGroup(옵션컬러) + ToggleGroup(가공) + NumberInput(수량)
- QuantitySlider(구간할인) + Select(물먹인) + PriceSummary + UploadActions(full)

**10. PRODUCT_STAITIONERY_OPTION (문구)**:
- SizeSelector + ToggleGroup(내지) + PaperSelect(종이) + ToggleGroup(제본옵션) + ColorChipGroup(링칼라) + NumberInput(수량)
- QuantitySlider(구간할인) + Select(개별포장) + PriceSummary + UploadActions(full)

**11. PRODUCT_ACCESSORIES_OPTION (액세서리)**:
- SizeSelector + NumberInput(수량)
- PriceSummary + UploadActions(cart-only)

### 3.5.6 QuantitySlider 데이터 소스 주의사항

`QuantitySlider` (프리미티브: Slider(tier-display))는 Figma 화면 08(아크릴), 09(굿즈), 10(문구)에서 새로 발견되었으나, MES v5 JSON 및 OVERVIEW 디자인에는 포함되어 있지 않다. 이 컴포넌트는 수량 구간별 할인율(예: 1~29개, 30~99개, 100~499개, 500~999개, 1000개~)을 시각적으로 표시하며, 해당 데이터 소스(`price_tiers` 또는 가격 산정 모델 Model 7의 `quantity_discount_rules`)와의 매핑이 추가로 필요하다.

> **리서치 필요**: QuantitySlider UI에 대응하는 수량할인 데이터 구조 확정 (Section 6 리서치 항목 참조)

---

## 4. 정규화 엔티티 설계 (상세)

> 26개 테이블, 6개 도메인. 모든 테이블은 공통 컬럼을 포함한다:
> `id SERIAL PRIMARY KEY`, `is_active BOOLEAN NOT NULL DEFAULT true`,
> `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
>
> **이중 가격 원칙**: 판매가(selling_price)와 원가(cost_price)를 항상 병행 저장한다.
> **코드 체계 원칙**: huni_code(위젯빌더 상품코드)는 모든 내/외부 시스템 매핑의 중추적 식별자이다. edicus_code는 huni_code에서 자동 파생('HU_' + huni_code)한다. shopby_id(Shopby 쇼핑몰 ID)는 추후 설계 필요하며, mes_items.item_code(MES 품목코드)는 원본 보존한다.
> **신규 코드 원칙**: 나머지 모든 식별 코드는 서술적 네이밍으로 새로 설계한다.

---

### Domain 1: Product Catalog (상품 카탈로그) -- 3 tables

#### 4.1.1 categories (상품 카테고리)

계층적 카테고리 트리. MAP 시트의 12개 대분류 + 하위분류를 표현한다.

| 컬럼 | 타입 | 제약조건 | 기본값 | 설명 |
|------|------|---------|--------|------|
| id | SERIAL | PK | auto | |
| code | VARCHAR(50) | UNIQUE, NOT NULL | | 카테고리 코드 (예: `CAT_DIGITAL_PRINT`, `CAT_STICKER`) |
| name | VARCHAR(100) | NOT NULL | | 카테고리명 (예: "디지털인쇄", "스티커") |
| parent_id | INTEGER | FK(categories.id), NULL | NULL | 상위 카테고리. NULL이면 최상위 |
| depth | SMALLINT | NOT NULL | 0 | 계층 깊이 (0=대분류, 1=중분류, 2=소분류) |
| display_order | SMALLINT | NOT NULL | 0 | MAP 시트 기준 정렬 순서 |
| icon_url | VARCHAR(500) | NULL | NULL | 카테고리 아이콘 URL |
| is_active | BOOLEAN | NOT NULL | true | 소프트 삭제 |
| created_at | TIMESTAMPTZ | NOT NULL | now() | |
| updated_at | TIMESTAMPTZ | NOT NULL | now() | |

**인덱스**:
- `idx_categories_parent_id` ON (parent_id)
- `idx_categories_code` ON (code) -- UNIQUE 제약에 의한 자동 인덱스

**데이터 소스 매핑**:
- 상품마스터 > MAP 시트 > 12개 대분류 행 → code, name, display_order
- MAP 시트 > 하위분류 열 → parent_id 참조하여 중분류/소분류 생성
- depth는 MAP 시트의 들여쓰기 레벨에 대응

---

#### 4.1.2 products (상품)

221개 상품 마스터. 모든 카테고리 시트의 상품 행을 통합한다.

| 컬럼 | 타입 | 제약조건 | 기본값 | 설명 |
|------|------|---------|--------|------|
| id | SERIAL | PK | auto | |
| category_id | INTEGER | FK(categories.id), NOT NULL | | 소속 카테고리 |
| huni_code | VARCHAR(10) | UNIQUE, NOT NULL | | 위젯빌더 상품코드. 중추적 식별자. 기존 상품은 에디쿠스 숫자부(14529~22953), 신규 상품은 90001부터 순차 부여 |
| edicus_code | VARCHAR(15) | UNIQUE, NULL | NULL | 에디쿠스 디자인코드. `HU_` + huni_code. 에디쿠스 미등록 시 NULL |
| shopby_id | INTEGER | UNIQUE, NULL | NULL | Shopby 쇼핑몰 상품 ID. **추후 Shopby 등록 시 설정 (TODO: 별도 설계 필요)** |
| name | VARCHAR(200) | NOT NULL | | 상품명 (예: "프리미엄엽서") |
| slug | VARCHAR(200) | UNIQUE, NOT NULL | | URL-safe 식별자 |
| product_type | VARCHAR(30) | NOT NULL | | 상품 유형. `digital-print`, `sticker`, `booklet`, `large-format`, `acrylic`, `goods`, `stationery`, `pouch` |
| pricing_model | VARCHAR(30) | NOT NULL | | 가격 산정 모델. `formula`(Model1), `formula_cutting`(Model2), `fixed_unit`(Model3), `package`(Model4), `component`(Model5), `fixed_size`(Model6), `fixed_per_unit`(Model7) |
| sheet_standard | VARCHAR(5) | NULL | NULL | 기준판형 `A3`, `T3`, NULL |
| figma_section | VARCHAR(50) | NULL | NULL | Figma 디자인 섹션 참조 (11개 섹션 중 하나, Section 3.5.3 참조) |
| order_method | VARCHAR(20) | NOT NULL | 'upload' | 주문방식. `upload`, `editor`, `both` |
| editor_enabled | BOOLEAN | NOT NULL | false | 에디커스 에디터 사용 여부 (111개 상품 = true) |
| description | TEXT | NULL | NULL | 상품 설명 |
| is_active | BOOLEAN | NOT NULL | true | 소프트 삭제 |
| mes_registered | BOOLEAN | NOT NULL | true | MES 등록 여부 (노란배경 = false) |
| created_at | TIMESTAMPTZ | NOT NULL | now() | |
| updated_at | TIMESTAMPTZ | NOT NULL | now() | |

**인덱스**:
- `idx_products_category_id` ON (category_id)
- `idx_products_product_type` ON (product_type)
- `idx_products_pricing_model` ON (pricing_model)
- `idx_products_huni_code` ON (huni_code) -- UNIQUE
- `idx_products_edicus_code` ON (edicus_code) -- UNIQUE, partial (WHERE edicus_code IS NOT NULL)
- `idx_products_shopby_id` ON (shopby_id) -- UNIQUE, partial (WHERE shopby_id IS NOT NULL)

**데이터 소스 매핑**:
- 상품마스터 > 각 시트(디지털인쇄, 스티커, 책자, ...) > A열(구분) → category_id 매핑
- huni_code: 기존 상품은 에디쿠스 코드(HU_XXXXX)에서 숫자부 추출, 신규 상품은 90001부터 순차
- edicus_code: huni_code에 'HU_' 접두사 추가. 에디쿠스 미등록 상품은 NULL
- shopby_id: 현시점 NULL. 추후 Shopby 상품 등록 시 설정
- 각 시트 > D열(상품명) → name
- 각 시트 > N열(주문방법) → order_method (`upload`/`editor`/`both`)
- MES v5 JSON > editor="O" → editor_enabled=true (111개)
- MES v5 JSON > product type 분류 → product_type
- 각 시트 > 행 256 가격공식 참조 → pricing_model
- 각 시트 > J열(출력용지규격) → sheet_standard
- MES v5 JSON > figma section → figma_section

---

#### 4.1.3 product_sizes (상품별 사이즈)

상품별 사이즈 정의. 판걸이 정보와 비규격 범위를 포함한다.

| 컬럼 | 타입 | 제약조건 | 기본값 | 설명 |
|------|------|---------|--------|------|
| id | SERIAL | PK | auto | |
| product_id | INTEGER | FK(products.id), NOT NULL | | 소속 상품 |
| code | VARCHAR(50) | NOT NULL | | 사이즈 코드 (예: `SIZE_73X98`, `SIZE_A5`, `SIZE_CUSTOM`) |
| display_name | VARCHAR(100) | NOT NULL | | 표시명 (예: "73 x 98 mm", "A5 (148 x 210)") |
| cut_width | NUMERIC(8,2) | NULL | NULL | 재단 너비 (mm) |
| cut_height | NUMERIC(8,2) | NULL | NULL | 재단 높이 (mm) |
| work_width | NUMERIC(8,2) | NULL | NULL | 작업 너비 (mm) |
| work_height | NUMERIC(8,2) | NULL | NULL | 작업 높이 (mm) |
| bleed | NUMERIC(5,2) | NULL | 3.0 | 블리드 (mm) |
| imposition_count | SMALLINT | NULL | NULL | 판걸이수 |
| sheet_standard | VARCHAR(5) | NULL | NULL | 이 사이즈의 기준판형 (A3/T3) |
| display_order | SMALLINT | NOT NULL | 0 | UI 정렬 순서 |
| is_custom | BOOLEAN | NOT NULL | false | 비규격(사용자 입력) 사이즈 여부 |
| custom_min_w | NUMERIC(8,2) | NULL | NULL | 비규격 최소 너비 |
| custom_min_h | NUMERIC(8,2) | NULL | NULL | 비규격 최소 높이 |
| custom_max_w | NUMERIC(8,2) | NULL | NULL | 비규격 최대 너비 |
| custom_max_h | NUMERIC(8,2) | NULL | NULL | 비규격 최대 높이 |
| is_active | BOOLEAN | NOT NULL | true | |
| created_at | TIMESTAMPTZ | NOT NULL | now() | |
| updated_at | TIMESTAMPTZ | NOT NULL | now() | |

**인덱스**:
- `idx_product_sizes_product_id` ON (product_id)
- `uq_product_sizes_product_code` UNIQUE ON (product_id, code)

**데이터 소스 매핑**:
- 상품마스터 > 각 시트 > E열(사이즈) → code, display_name, cut_width, cut_height
- 실사/아크릴 시트 > F열(비규격:가로/세로) → is_custom=true, custom_min/max 범위
- 가격표 > 사이즈별 판걸이수 시트 → imposition_count, work_width, work_height, sheet_standard
  - 약 30개 재단사이즈별 판걸이수 데이터와 조인

---

### Domain 2: Materials (자재) -- 3 tables

#### 4.2.1 papers (용지)

55개 용지 마스터. 이중 가격(원가/판매가)을 포함한다.

| 컬럼 | 타입 | 제약조건 | 기본값 | 설명 |
|------|------|---------|--------|------|
| id | SERIAL | PK | auto | |
| code | VARCHAR(50) | UNIQUE, NOT NULL | | 용지 코드 (예: `PAPER_ART_250`, `PAPER_SNOW_300`) |
| name | VARCHAR(100) | NOT NULL | | 용지명 (예: "아트지 250g") |
| abbreviation | VARCHAR(20) | NULL | NULL | 파일명 약어 (예: "아트") |
| weight | SMALLINT | NULL | NULL | 평량 (g) |
| sheet_size | VARCHAR(50) | NULL | NULL | 전지 규격 (예: "국전(939*636)") |
| cost_per_ream | NUMERIC(12,2) | NULL | NULL | 연당 원가 (원) |
| selling_per_ream | NUMERIC(12,2) | NULL | NULL | 연당 판매가 (원) |
| cost_per_4cut | NUMERIC(10,2) | NULL | NULL | 국4절 원가 단가 (원) |
| selling_per_4cut | NUMERIC(10,2) | NULL | NULL | 국4절 판매 단가 (원) |
| display_order | SMALLINT | NOT NULL | 0 | 정렬 순서 |
| is_active | BOOLEAN | NOT NULL | true | |
| created_at | TIMESTAMPTZ | NOT NULL | now() | |
| updated_at | TIMESTAMPTZ | NOT NULL | now() | |

**인덱스**:
- `idx_papers_code` ON (code) -- UNIQUE 자동
- `idx_papers_weight` ON (weight)

**데이터 소스 매핑**:
- 상품마스터 > !디지털인쇄용지 시트 > 55개 행
  - 종이명 → name
  - 파일약어 → abbreviation
  - 전지규격 → sheet_size
  - 평량 → weight (이름에서 파싱, 예: "아트지 250g" → 250)
  - 연당가 → cost_per_ream (원가 기준)
  - 국4절단가 → cost_per_4cut
  - selling_per_ream / selling_per_4cut → 가격표에서 매핑 또는 마진률 적용

---

#### 4.2.2 materials (비인쇄 소재)

아크릴, 패브릭, 필름 등 비인쇄 상품용 소재.

| 컬럼 | 타입 | 제약조건 | 기본값 | 설명 |
|------|------|---------|--------|------|
| id | SERIAL | PK | auto | |
| code | VARCHAR(50) | UNIQUE, NOT NULL | | 소재 코드 (예: `MAT_CLEAR_ACRYLIC_3MM`) |
| name | VARCHAR(100) | NOT NULL | | 소재명 (예: "투명아크릴 3mm") |
| material_type | VARCHAR(30) | NOT NULL | | 소재 유형: `acrylic`, `fabric`, `film`, `vinyl`, `metal`, `wood` |
| thickness | VARCHAR(20) | NULL | NULL | 두께 (예: "3mm", "5mm") |
| description | TEXT | NULL | NULL | 소재 설명 |
| is_active | BOOLEAN | NOT NULL | true | |
| created_at | TIMESTAMPTZ | NOT NULL | now() | |
| updated_at | TIMESTAMPTZ | NOT NULL | now() | |

**인덱스**:
- `idx_materials_material_type` ON (material_type)

**데이터 소스 매핑**:
- 상품마스터 > 아크릴 시트 > 소재 열 → material_type='acrylic', thickness 추출
- 상품마스터 > 실사 시트 > 소재(Q열) → material_type='vinyl'/'fabric'
- 상품마스터 > 굿즈 시트 > 소재 정보 → 상품별 소재 정의

---

#### 4.2.3 paper_product_mapping (용지-상품 매핑)

용지와 상품의 다대다 매핑. 디지털용지 시트의 45+ 상품 열(● 표시)을 정규화.
책자의 경우 내지/표지 구분 포함.

| 컬럼 | 타입 | 제약조건 | 기본값 | 설명 |
|------|------|---------|--------|------|
| id | SERIAL | PK | auto | |
| paper_id | INTEGER | FK(papers.id), NOT NULL | | 용지 |
| product_id | INTEGER | FK(products.id), NOT NULL | | 상품 |
| cover_type | VARCHAR(10) | NULL | NULL | 책자 구분: `inner`(내지), `cover`(표지), NULL(일반) |
| is_default | BOOLEAN | NOT NULL | false | 기본 매핑 여부 (● 표시) |
| is_active | BOOLEAN | NOT NULL | true | |
| created_at | TIMESTAMPTZ | NOT NULL | now() | |
| updated_at | TIMESTAMPTZ | NOT NULL | now() | |

**인덱스**:
- `idx_ppm_paper_id` ON (paper_id)
- `idx_ppm_product_id` ON (product_id)
- `uq_ppm_paper_product_cover` UNIQUE ON (paper_id, product_id, cover_type)

**데이터 소스 매핑**:
- 가격표 > 디지털용지 시트 > 45+ 상품 열
  - 행: 용지(구분, 종이명, 평량, 코드, 가격) → paper_id
  - 열: 상품명 헤더 → product_id
  - 셀 값: ●(사용가능), 빈칸(사용불가) → 행 생성 여부
  - 책자 상품은 "내지"/"표지" 접미어로 구분 → cover_type
- 상품마스터 > !디지털인쇄용지 시트 > 상품-용지 ● 매핑도 교차 검증

---

### Domain 3: Processes (공정) -- 3 tables

#### 4.3.1 print_modes (인쇄방식)

12개 인쇄방식. 디지털출력비 시트의 열 코드 체계(0,1,2,4,8,11,12,21,22,31,32)에 대응.

| 컬럼 | 타입 | 제약조건 | 기본값 | 설명 |
|------|------|---------|--------|------|
| id | SERIAL | PK | auto | |
| code | VARCHAR(50) | UNIQUE, NOT NULL | | 인쇄 코드 (예: `PRINT_SINGLE_COLOR`, `PRINT_DOUBLE_COLOR`) |
| name | VARCHAR(100) | NOT NULL | | 인쇄방식명 (예: "단면칼라", "양면칼라") |
| sides | VARCHAR(10) | NOT NULL | | 면수: `single`, `double` |
| color_type | VARCHAR(20) | NOT NULL | | 색상유형: `color`, `mono`, `white`, `clear`, `pink`, `gold`, `silver` |
| price_code | SMALLINT | NOT NULL | | 디지털출력비 테이블의 열 코드 (0,1,2,4,8,11,12,21,22,31,32) |
| display_order | SMALLINT | NOT NULL | 0 | UI 정렬 순서 |
| is_active | BOOLEAN | NOT NULL | true | |
| created_at | TIMESTAMPTZ | NOT NULL | now() | |
| updated_at | TIMESTAMPTZ | NOT NULL | now() | |

**인덱스**:
- `idx_print_modes_price_code` ON (price_code)
- `uq_print_modes_code` ON (code) -- UNIQUE 자동

**데이터 소스 매핑**:
- 가격표 > 디지털출력비 시트 > 열 헤더 (코드 0,1,2,4,8,11,12,21,22,31,32)
  - 코드 0 → 기본(무인쇄)
  - 코드 1 → 단면1도
  - 코드 2 → 양면1도
  - 코드 4 → 단면칼라
  - 코드 8 → 양면칼라
  - 코드 11 → 단면 화이트(1도)
  - 코드 12 → 양면 화이트
  - 코드 21 → 단면 클리어
  - 코드 22 → 양면 클리어
  - 코드 31 → 단면 핑크
  - 코드 32 → 양면 핑크
- 상품마스터 > 각 시트 > Q열(인쇄), R~V열(별색) → 해당 print_mode 참조
- MES v5 JSON > priceKeys (86개) > printType 코드와 대응

---

#### 4.3.2 post_processes (후가공)

8개 후가공 그룹(Postprocess001~008), 각 그룹 내 하위 옵션을 행으로 표현.

| 컬럼 | 타입 | 제약조건 | 기본값 | 설명 |
|------|------|---------|--------|------|
| id | SERIAL | PK | auto | |
| group_code | VARCHAR(20) | NOT NULL | | 후가공 그룹 코드 (예: `PP001`~`PP008`) |
| code | VARCHAR(50) | UNIQUE, NOT NULL | | 후가공 코드 (예: `PP_PERFORATION_1LINE`, `PP_COATING_MATTE_SINGLE`) |
| name | VARCHAR(100) | NOT NULL | | 후가공명 (예: "미싱 1줄", "무광코팅(단면)") |
| process_type | VARCHAR(30) | NOT NULL | | 공정 유형: `perforation`, `creasing`, `folding`, `vdp_text`, `vdp_image`, `corner`, `coating`, `cutting` |
| sub_option_code | SMALLINT | NULL | NULL | 원본 코드 (예: 미싱1줄=10, 2줄=20, 3줄=30, 5줄=50) |
| sub_option_name | VARCHAR(50) | NULL | NULL | 하위 옵션명 (예: "1줄", "2줄") |
| price_basis | VARCHAR(15) | NOT NULL | 'per_unit' | 가격 기준: `per_sheet`(판당-코팅), `per_unit`(매당-나머지) |
| sheet_standard | VARCHAR(5) | NULL | NULL | 판형 기준: `A3`, `T3`, NULL(공통) |
| display_order | SMALLINT | NOT NULL | 0 | |
| is_active | BOOLEAN | NOT NULL | true | |
| created_at | TIMESTAMPTZ | NOT NULL | now() | |
| updated_at | TIMESTAMPTZ | NOT NULL | now() | |

**인덱스**:
- `idx_post_processes_group_code` ON (group_code)
- `idx_post_processes_process_type` ON (process_type)

**데이터 소스 매핑**:
- 가격표 > 후가공 시트 > 8개 섹션:
  - Postprocess001(미싱): 없음/1줄(10)/2줄(20)/3줄(30)/5줄(50) → group_code=PP001
  - Postprocess002(오시): 동일 구조 → group_code=PP002
  - Postprocess003(접지+오시): 2단(10)/3단(20)/N접지(30)/병풍(40)/대문(50)/오시접지(60)/미싱접지(70) → group_code=PP003
  - Postprocess004(가변TEXT): 0개(1)/1개(10,11)/2개(20,21)/3개(30,31) → group_code=PP004
  - Postprocess005(가변IMAGE): 동일 구조 → group_code=PP005
  - Postprocess006(모서리): 직각(1)/둥근(10,11) → group_code=PP006
  - Postprocess007(코팅): 무광단면(10)/무광양면(20)/유광단면(30)/유광양면(40) → group_code=PP007, price_basis=per_sheet
  - Postprocess008(코팅3절): 동일 코드, T3 기준 단가 → group_code=PP008, sheet_standard=T3

---

#### 4.3.3 bindings (제본 유형)

4개 제본 유형. 페이지수 제약조건을 포함한다.

| 컬럼 | 타입 | 제약조건 | 기본값 | 설명 |
|------|------|---------|--------|------|
| id | SERIAL | PK | auto | |
| code | VARCHAR(50) | UNIQUE, NOT NULL | | 제본 코드 (예: `BIND_SADDLE_STITCH`, `BIND_PERFECT`) |
| name | VARCHAR(50) | NOT NULL | | 제본명 (예: "중철제본", "무선제본") |
| min_pages | SMALLINT | NULL | NULL | 최소 페이지수 |
| max_pages | SMALLINT | NULL | NULL | 최대 페이지수 |
| page_step | SMALLINT | NULL | NULL | 페이지 증감 단위 (예: 4, 2) |
| display_order | SMALLINT | NOT NULL | 0 | |
| is_active | BOOLEAN | NOT NULL | true | |
| created_at | TIMESTAMPTZ | NOT NULL | now() | |
| updated_at | TIMESTAMPTZ | NOT NULL | now() | |

**인덱스**:
- `uq_bindings_code` ON (code) -- UNIQUE 자동

**데이터 소스 매핑**:
- 가격표 > 제본 시트 > 4개 유형:
  - 중철(BIND_SADDLE_STITCH): min/max/step 페이지 제약
  - 무선(BIND_PERFECT): min/max/step 페이지 제약
  - 트윈링(BIND_TWIN_RING): min/max/step
  - PUR(BIND_PUR): min/max/step
- 상품마스터 > 책자 시트 > AE열(제본) → 각 상품의 제본 옵션 참조
- 상품마스터 > 책자 시트 > O열(내지페이지 min/max/step) → min_pages, max_pages, page_step

---

### Domain 4: Pricing (가격) -- 7 tables

#### 4.4.1 price_tables (가격 테이블 정의)

가격 데이터의 메타 정의. 판매가/원가 구분, A3/T3 판형 구분.

| 컬럼 | 타입 | 제약조건 | 기본값 | 설명 |
|------|------|---------|--------|------|
| id | SERIAL | PK | auto | |
| code | VARCHAR(50) | UNIQUE, NOT NULL | | 테이블 코드 (예: `PT_OUTPUT_SELL_A3`, `PT_OUTPUT_COST_A3`) |
| name | VARCHAR(100) | NOT NULL | | 테이블명 (예: "디지털출력비 판매가 A3") |
| price_type | VARCHAR(10) | NOT NULL | | 가격 유형: `selling`(판매가), `cost`(원가) |
| quantity_basis | VARCHAR(20) | NOT NULL | | 수량 기준: `sheet_count`(판수), `production_qty`(생산수량) |
| sheet_standard | VARCHAR(5) | NULL | NULL | 판형: `A3`, `T3`, NULL(공통) |
| description | TEXT | NULL | NULL | 테이블 설명 |
| is_active | BOOLEAN | NOT NULL | true | |
| created_at | TIMESTAMPTZ | NOT NULL | now() | |
| updated_at | TIMESTAMPTZ | NOT NULL | now() | |

**인덱스**:
- `idx_price_tables_price_type` ON (price_type)
- `idx_price_tables_sheet_standard` ON (sheet_standard)

**데이터 소스 매핑**:
- 가격표 > 디지털출력비 시트 → PT_OUTPUT_SELL_A3 (A3 판매가, 253 수량행 x 12 열)
- 가격표 > 디지털출력비 시트 Row 32~ → PT_OUTPUT_SELL_T3 (T3 판매가)
- 가격표 > 디지털출력비가수정 시트 → PT_OUTPUT_COST_A3 (A3 원가)
- 가격표 > 디지털출력비가수정 시트 Row 61~ → PT_OUTPUT_COST_T3 (T3 원가)
- 가격표 > 후가공 각 섹션 → PT_PP001_SELL ~ PT_PP008_SELL
- 가격표 > 제본 → PT_BINDING_SELL
- 총 약 15~20개 price_table 레코드 생성

---

#### 4.4.2 price_tiers (수량 구간별 단가)

수량 기반 구간별 가격. 출력비, 후가공비, 제본비 등 모든 수량 구간 가격을 통합.

| 컬럼 | 타입 | 제약조건 | 기본값 | 설명 |
|------|------|---------|--------|------|
| id | SERIAL | PK | auto | |
| price_table_id | INTEGER | FK(price_tables.id), NOT NULL | | 소속 가격 테이블 |
| option_code | VARCHAR(50) | NOT NULL | | 옵션 코드. 출력비→print_mode.code, 후가공→post_process.code, 제본→binding.code |
| min_qty | INTEGER | NOT NULL | | 구간 시작 수량 |
| max_qty | INTEGER | NOT NULL | 999999 | 구간 종료 수량 (999999=무한) |
| unit_price | NUMERIC(12,2) | NOT NULL | | 단가 (원/판 또는 원/매) |
| is_active | BOOLEAN | NOT NULL | true | |
| created_at | TIMESTAMPTZ | NOT NULL | now() | |
| updated_at | TIMESTAMPTZ | NOT NULL | now() | |

**인덱스**:
- `idx_price_tiers_table_id` ON (price_table_id)
- `idx_price_tiers_option_code` ON (option_code)
- `idx_price_tiers_lookup` ON (price_table_id, option_code, min_qty) -- 견적 조회 최적화

**데이터 소스 매핑**:
- 가격표 > 디지털출력비 시트:
  - 행: 수량 구간 (253개 행) → min_qty, max_qty (인접 행 값으로 구간 산출)
  - 열: 인쇄방식 코드 (0,1,2,4,8,11,12,21,22,31,32) → option_code = print_mode.code
  - 셀 값: 판당 단가 → unit_price
  - price_table_id → PT_OUTPUT_SELL_A3 또는 PT_OUTPUT_COST_A3
- 가격표 > 후가공 시트 > 각 섹션의 수량별 단가:
  - Postprocess001~008 각 sub_option별 수량 구간 → option_code = post_process.code
- 가격표 > 제본 시트 > 4개 유형 x 수량 구간:
  - option_code = binding.code, 수량별 제본비 → unit_price

---

#### 4.4.3 fixed_prices (고정 단가 상품)

명함, 아크릴, 실사, 사인, 굿즈, 문구 등 고정 단가 상품. 이중 가격 포함.

| 컬럼 | 타입 | 제약조건 | 기본값 | 설명 |
|------|------|---------|--------|------|
| id | SERIAL | PK | auto | |
| product_id | INTEGER | FK(products.id), NOT NULL | | 상품 |
| size_id | INTEGER | FK(product_sizes.id), NULL | NULL | 사이즈 (사이즈별 가격이 있는 경우) |
| paper_id | INTEGER | FK(papers.id), NULL | NULL | 용지 (명함 등 용지별 가격) |
| material_id | INTEGER | FK(materials.id), NULL | NULL | 소재 (아크릴 등) |
| print_mode_id | INTEGER | FK(print_modes.id), NULL | NULL | 인쇄방식 (단면/양면) |
| option_label | VARCHAR(100) | NULL | NULL | 추가 구분 라벨 (복합 조건용) |
| base_qty | INTEGER | NOT NULL | 1 | 기준 수량 (명함=100, 일반=1) |
| selling_price | NUMERIC(12,2) | NOT NULL | | 판매 단가 |
| cost_price | NUMERIC(12,2) | NULL | NULL | 원가 단가 |
| vat_included | BOOLEAN | NOT NULL | false | VAT 포함 여부 |
| is_active | BOOLEAN | NOT NULL | true | |
| created_at | TIMESTAMPTZ | NOT NULL | now() | |
| updated_at | TIMESTAMPTZ | NOT NULL | now() | |

**인덱스**:
- `idx_fixed_prices_product_id` ON (product_id)
- `idx_fixed_prices_size_id` ON (size_id)
- `idx_fixed_prices_lookup` ON (product_id, size_id, paper_id, print_mode_id) -- 견적 조회

**데이터 소스 매핑**:
- 가격표 > 명함 시트:
  - 행(25개): 용지 × 면수(단면/양면) → paper_id + print_mode_id
  - 고정가격 → selling_price, base_qty=100
- 가격표 > 아크릴 시트:
  - 너비 x 높이 사이즈 매트릭스 → size_id
  - 셀 값 → selling_price
- 가격표 > 포스터(실사) 시트:
  - 사이즈별 고정가 → size_id + selling_price
  - 최소사이즈 규칙 포함
- 가격표 > 사인 시트:
  - 배너 사이즈별 → size_id + selling_price
- 상품마스터 > 실사 시트 > R열(price), S열(vat포함price):
  - R열 → selling_price, S열 → vat_included=true
- 상품마스터 > 아크릴 시트 > H열(가격):
  - H열 → selling_price
- 상품마스터 > 굿즈 시트 > 가격 열:
  - 가격 → selling_price
- 상품마스터 > 문구(노트) 시트 > AC열(가격):
  - AC열 → selling_price
- 상품마스터 > 상품악세사리 시트 > 가격 열:
  - 가격 → selling_price

---

#### 4.4.4 package_prices (패키지 가격)

옵션 결합 상품(엽서북) 전용. 사이즈 x 인쇄 x 페이지수 x 수량구간 조합 가격.

| 컬럼 | 타입 | 제약조건 | 기본값 | 설명 |
|------|------|---------|--------|------|
| id | SERIAL | PK | auto | |
| product_id | INTEGER | FK(products.id), NOT NULL | | 상품 (엽서북) |
| size_id | INTEGER | FK(product_sizes.id), NOT NULL | | 사이즈 |
| print_mode_id | INTEGER | FK(print_modes.id), NOT NULL | | 인쇄방식 |
| page_count | SMALLINT | NOT NULL | | 페이지수 |
| min_qty | INTEGER | NOT NULL | | 수량 구간 시작 |
| max_qty | INTEGER | NOT NULL | 999999 | 수량 구간 종료 |
| selling_price | NUMERIC(12,2) | NOT NULL | | 판매 단가 |
| cost_price | NUMERIC(12,2) | NULL | NULL | 원가 단가 |
| is_active | BOOLEAN | NOT NULL | true | |
| created_at | TIMESTAMPTZ | NOT NULL | now() | |
| updated_at | TIMESTAMPTZ | NOT NULL | now() | |

**인덱스**:
- `idx_package_prices_product_id` ON (product_id)
- `idx_package_prices_lookup` ON (product_id, size_id, print_mode_id, page_count, min_qty)

**데이터 소스 매핑**:
- 가격표 > 옵션결합상품 시트:
  - 엽서북 패키지 가격 매트릭스
  - 행: 사이즈 x 인쇄 x 페이지수 조합
  - 열: 수량 구간별 단가
  - 각 셀 → (size_id, print_mode_id, page_count, min_qty, max_qty, selling_price) 레코드

---

#### 4.4.5 foil_prices (박/형압 가격)

동판비(아연판) + 일반박 사이즈 매트릭스. 명함전용 박 동판비 포함.

| 컬럼 | 타입 | 제약조건 | 기본값 | 설명 |
|------|------|---------|--------|------|
| id | SERIAL | PK | auto | |
| foil_type | VARCHAR(30) | NOT NULL | | 유형: `copper_plate`(동판/아연판), `basic_foil`(일반박), `premium_foil`(고급박), `emboss`(형압) |
| foil_color | VARCHAR(30) | NULL | NULL | 박 색상 (금, 은, 홀로그램 등). 동판비는 NULL |
| plate_material | VARCHAR(20) | NULL | NULL | 판재 재질: `zinc`(아연판), `copper`(동판). 박 유형에서만 사용 |
| target_product_type | VARCHAR(30) | NULL | NULL | 대상 상품유형. `namecard`(명함전용) 또는 NULL(일반) |
| width | NUMERIC(8,2) | NOT NULL | | 가공 너비 (mm) |
| height | NUMERIC(8,2) | NOT NULL | | 가공 높이 (mm) |
| selling_price | NUMERIC(12,2) | NOT NULL | | 판매가 |
| cost_price | NUMERIC(12,2) | NULL | NULL | 원가 |
| display_order | SMALLINT | NOT NULL | 0 | |
| is_active | BOOLEAN | NOT NULL | true | |
| created_at | TIMESTAMPTZ | NOT NULL | now() | |
| updated_at | TIMESTAMPTZ | NOT NULL | now() | |

**인덱스**:
- `idx_foil_prices_type` ON (foil_type)
- `idx_foil_prices_lookup` ON (foil_type, width, height)
- `idx_foil_prices_target` ON (target_product_type)

**데이터 소스 매핑**:
- 가격표 > 후가공_박 시트:
  - 동판비(아연판) 사이즈 매트릭스 → foil_type='copper_plate', plate_material='zinc'
  - 일반박 사이즈 매트릭스 → foil_type='basic_foil'
  - 행/열: 너비 x 높이 조합, 셀 값: 가격
- 가격표 > 후가공_박명함 시트:
  - 명함전용 박 동판비 → target_product_type='namecard'
- 상품마스터 > 각 시트 > AI~AK열(박/형압) → 박 옵션이 있는 상품 식별

---

#### 4.4.6 imposition_rules (판걸이 규칙)

재단사이즈 → 작업사이즈 → 판걸이수 → 기준판형 매핑. 약 30개 엔트리.

| 컬럼 | 타입 | 제약조건 | 기본값 | 설명 |
|------|------|---------|--------|------|
| id | SERIAL | PK | auto | |
| cut_size_code | VARCHAR(30) | NOT NULL | | 재단사이즈 코드 (예: `CUT_90X50`, `CUT_A4`) |
| cut_width | NUMERIC(8,2) | NOT NULL | | 재단 너비 (mm) |
| cut_height | NUMERIC(8,2) | NOT NULL | | 재단 높이 (mm) |
| work_width | NUMERIC(8,2) | NOT NULL | | 작업 너비 (mm) |
| work_height | NUMERIC(8,2) | NOT NULL | | 작업 높이 (mm) |
| imposition_count | SMALLINT | NOT NULL | | 판걸이수 (1장에 몇 개 배치) |
| sheet_standard | VARCHAR(5) | NOT NULL | | 기준판형: `A3`(316x467), `T3`(330x660) |
| description | VARCHAR(200) | NULL | NULL | 설명 (예: "명함 A3 8업") |
| is_active | BOOLEAN | NOT NULL | true | |
| created_at | TIMESTAMPTZ | NOT NULL | now() | |
| updated_at | TIMESTAMPTZ | NOT NULL | now() | |

**인덱스**:
- `uq_imposition_cut_size` UNIQUE ON (cut_width, cut_height, sheet_standard)
- `idx_imposition_sheet_standard` ON (sheet_standard)

**데이터 소스 매핑**:
- 가격표 > 사이즈별 판걸이수 시트:
  - 약 30개 행: cut_size(재단사이즈) → cut_width, cut_height
  - work_size(작업사이즈) → work_width, work_height
  - imposition_count(판걸이수) → imposition_count
  - sheet_standard(기준판형): A3/T3/3절 → sheet_standard
- product_sizes.imposition_count는 이 테이블에서 참조/복사

---

#### 4.4.7 loss_quantity_config (로스량 설정)

로스량(여분) 비율 설정. 글로벌/카테고리/상품 레벨로 확장 가능.

| 컬럼 | 타입 | 제약조건 | 기본값 | 설명 |
|------|------|---------|--------|------|
| id | SERIAL | PK | auto | |
| scope_type | VARCHAR(20) | NOT NULL | | 적용 범위: `global`, `category`, `product` |
| scope_id | INTEGER | NULL | NULL | 범위 대상 ID. global이면 NULL, category면 category_id, product면 product_id |
| loss_rate | NUMERIC(5,4) | NOT NULL | 0.0 | 로스 비율 (0.05 = 5%) |
| min_loss_qty | INTEGER | NOT NULL | 0 | 최소 로스 수량 (매수) |
| description | VARCHAR(200) | NULL | NULL | 설명 |
| is_active | BOOLEAN | NOT NULL | true | |
| created_at | TIMESTAMPTZ | NOT NULL | now() | |
| updated_at | TIMESTAMPTZ | NOT NULL | now() | |

**인덱스**:
- `uq_loss_config_scope` UNIQUE ON (scope_type, scope_id)
- `idx_loss_config_scope_type` ON (scope_type)

**데이터 소스 매핑**:
- 현재 엑셀에 명시적 로스량 데이터 없음
- 초기값은 업계 표준 기반으로 seed:
  - global: loss_rate=0.03 (3%), min_loss_qty=10
  - 추후 카테고리/상품별 커스터마이징을 위한 확장 구조
- 가격 공식(행 256): `지대 = 용지단가 / 판걸이수 x (주문수량 + 로스량)` 에서 로스량 참조

---

### Domain 5: Options & UI (옵션 및 UI) -- 5 tables

#### 4.5.1 option_definitions (옵션 정의)

30개 옵션 키. MES v5 JSON의 option key + class/type/UI 메타데이터.

| 컬럼 | 타입 | 제약조건 | 기본값 | 설명 |
|------|------|---------|--------|------|
| id | SERIAL | PK | auto | |
| key | VARCHAR(50) | UNIQUE, NOT NULL | | 옵션 키 (예: `paperType`, `printType`, `coating`, `cutting`) |
| name | VARCHAR(100) | NOT NULL | | 옵션명 (예: "종이", "인쇄", "코팅", "커팅") |
| option_class | VARCHAR(20) | NOT NULL | | 옵션 분류: `material`(자재/5종), `process`(공정/18종), `setting`(설정/7종) |
| option_type | VARCHAR(30) | NOT NULL | | 옵션 세부유형: `paper`, `print`, `special_color`, `coating`, `postprocess`, `binding`, `size`, `quantity`, `accessory` |
| ui_component | VARCHAR(30) | NOT NULL | | 기본 UI 컴포넌트 (shadcn/ui 7종 프리미티브, Section 3.5.2 참조): `toggle-group`, `select`, `radio-group`, `collapsible`, `input`, `slider`, `button`. 변형 접미어 가능: `radio-group:color-chip`, `radio-group:image-chip`, `input:number`, `input:dual`, `slider:tier-display` |
| description | VARCHAR(500) | NULL | NULL | 옵션 설명 |
| display_order | SMALLINT | NOT NULL | 0 | 글로벌 기본 정렬 순서 |
| is_active | BOOLEAN | NOT NULL | true | |
| created_at | TIMESTAMPTZ | NOT NULL | now() | |
| updated_at | TIMESTAMPTZ | NOT NULL | now() | |

**인덱스**:
- `uq_option_definitions_key` ON (key) -- UNIQUE 자동
- `idx_option_definitions_class` ON (option_class)

**데이터 소스 매핑**:
- MES v5 JSON > 30 option keys:
  - material 클래스 (5종): paperType, material, fabric, etc.
  - process 클래스 (18종): printType, coating, cutting, folding, perforation, creasing, vdpText, vdpImage, corner, foil, emboss, binding, lamination, etc.
  - setting 클래스 (7종): size, quantity, pageCount, direction, etc.
- Figma 분석 > shadcn/ui 7종 프리미티브 (Section 3.5.2 참조) → ui_component
  - `toggle-group`, `select`, `radio-group`, `collapsible`, `input`, `slider`, `button` + 변형 접미어
- 상품마스터 > 각 시트 > 열 헤더(P:종이, Q:인쇄, W:코팅 등) → 옵션 키 대응 확인

---

#### 4.5.2 product_options (상품별 옵션 구성)

상품마다 어떤 옵션을 어떤 순서로, 필수/선택/숨김 여부로 표시할지 정의.

| 컬럼 | 타입 | 제약조건 | 기본값 | 설명 |
|------|------|---------|--------|------|
| id | SERIAL | PK | auto | |
| product_id | INTEGER | FK(products.id), NOT NULL | | 상품 |
| option_definition_id | INTEGER | FK(option_definitions.id), NOT NULL | | 옵션 정의 |
| display_order | SMALLINT | NOT NULL | 0 | 이 상품에서의 옵션 표시 순서 |
| is_required | BOOLEAN | NOT NULL | false | 필수 여부 (빨강 헤더 → true) |
| is_visible | BOOLEAN | NOT NULL | true | 고객 노출 여부 (회색 헤더 → false) |
| is_internal | BOOLEAN | NOT NULL | false | 내부 전용 (파일사양 등 고객 비노출) |
| ui_component_override | VARCHAR(30) | NULL | NULL | UI 컴포넌트 오버라이드 (상품별 커스텀, shadcn/ui 7종 프리미티브+변형 접미어 중 선택. Section 3.5.2 참조). 예: `radio-group:color-chip`, `input:dual`, `slider:tier-display` |
| default_choice_id | INTEGER | FK(option_choices.id), NULL | NULL | 기본 선택값 |
| is_active | BOOLEAN | NOT NULL | true | |
| created_at | TIMESTAMPTZ | NOT NULL | now() | |
| updated_at | TIMESTAMPTZ | NOT NULL | now() | |

**인덱스**:
- `idx_product_options_product_id` ON (product_id)
- `uq_product_options_product_option` UNIQUE ON (product_id, option_definition_id)
- `idx_product_options_visible` ON (product_id, is_visible, display_order)

**데이터 소스 매핑**:
- 상품마스터 > 각 시트 > 열 존재 여부 → 해당 옵션 레코드 생성
  - P열(종이) 존재 → option_key='paperType' 레코드 생성
  - Q열(인쇄) 존재 → option_key='printType'
  - display_order: 엑셀 열 순서 (P=1, Q=2, R=3, ...)
- 색상 코딩 → 플래그 매핑:
  - #FFE06666 (빨강) → is_required=true
  - #FFF6B26B (주황) → is_required=false
  - #FFD9D9D9 (회색) → is_visible=false, is_internal=true
  - #FFCCCCCC (연회색) → is_internal=true (포토북/캘린더/문구)
  - #FFF4CCCC (연분홍) → editor-only 표시 (editor_enabled과 연동)
- 시트별 열 구조 차이에 따라 동일 옵션이 다른 열 위치에 존재

---

#### 4.5.3 option_choices (옵션 선택지)

1198개 선택지. 각 옵션 정의에 대한 구체적 선택 항목들.

| 컬럼 | 타입 | 제약조건 | 기본값 | 설명 |
|------|------|---------|--------|------|
| id | SERIAL | PK | auto | |
| option_definition_id | INTEGER | FK(option_definitions.id), NOT NULL | | 소속 옵션 정의 |
| code | VARCHAR(50) | NOT NULL | | 선택지 코드 (예: `PAPER_ART_250`, `PRINT_SINGLE_COLOR`) |
| name | VARCHAR(100) | NOT NULL | | 선택지 표시명 (예: "아트지 250g", "단면칼라") |
| price_key | VARCHAR(50) | NULL | NULL | 가격 키 (86개 priceKey 중 하나) |
| ref_paper_id | INTEGER | FK(papers.id), NULL | NULL | 참조 용지 (paperType 선택지) |
| ref_material_id | INTEGER | FK(materials.id), NULL | NULL | 참조 소재 (material 선택지) |
| ref_print_mode_id | INTEGER | FK(print_modes.id), NULL | NULL | 참조 인쇄방식 (printType 선택지) |
| ref_post_process_id | INTEGER | FK(post_processes.id), NULL | NULL | 참조 후가공 (postprocess 선택지) |
| ref_binding_id | INTEGER | FK(bindings.id), NULL | NULL | 참조 제본 (binding 선택지) |
| display_order | SMALLINT | NOT NULL | 0 | 정렬 순서 |
| is_active | BOOLEAN | NOT NULL | true | |
| created_at | TIMESTAMPTZ | NOT NULL | now() | |
| updated_at | TIMESTAMPTZ | NOT NULL | now() | |

**인덱스**:
- `idx_option_choices_definition_id` ON (option_definition_id)
- `uq_option_choices_def_code` UNIQUE ON (option_definition_id, code)
- `idx_option_choices_price_key` ON (price_key)
- `idx_option_choices_ref_paper` ON (ref_paper_id)
- `idx_option_choices_ref_print` ON (ref_print_mode_id)

**데이터 소스 매핑**:
- MES v5 JSON > 1198 choices → 각 choice 레코드
  - option key → option_definition_id
  - choice code/name → code, name
  - priceKey → price_key (91개 entries with codes)
- 참조 FK 매핑:
  - paperType 선택지 → ref_paper_id (papers 테이블 조인)
  - printType 선택지 → ref_print_mode_id (print_modes 조인)
  - coating/postprocess 선택지 → ref_post_process_id
  - binding 선택지 → ref_binding_id
- 상품마스터 > 각 시트 > 셀 내 드롭다운 값들과 교차 검증

---

#### 4.5.4 option_constraints (옵션 제약조건)

129개 ★ 제약조건. 3가지 유형(A: size_show, B: size_range, C: paper_condition).

| 컬럼 | 타입 | 제약조건 | 기본값 | 설명 |
|------|------|---------|--------|------|
| id | SERIAL | PK | auto | |
| product_id | INTEGER | FK(products.id), NOT NULL | | 대상 상품 |
| constraint_type | VARCHAR(20) | NOT NULL | | 제약 유형: `size_show`(A), `size_range`(B), `paper_condition`(C) |
| source_option_id | INTEGER | FK(option_definitions.id), NULL | NULL | 조건 옵션 (예: 사이즈선택 옵션) |
| source_field | VARCHAR(50) | NOT NULL | | 조건 필드: `size`, `paper_weight`, `paper_type`, `quantity` |
| operator | VARCHAR(10) | NOT NULL | | 연산자: `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `between`, `in` |
| value | VARCHAR(200) | NULL | NULL | 조건 값 (단일값: "100x150", "180") |
| value_min | VARCHAR(100) | NULL | NULL | 범위 최소값 (between용: "30x30") |
| value_max | VARCHAR(100) | NULL | NULL | 범위 최대값 (between용: "90x140") |
| target_option_id | INTEGER | FK(option_definitions.id), NULL | NULL | 대상 옵션 |
| target_field | VARCHAR(50) | NOT NULL | | 대상 필드: `accessory`, `coating`, `foil_size`, `visibility` |
| target_action | VARCHAR(20) | NOT NULL | | 동작: `show`, `hide`, `enable`, `disable`, `limit_range` |
| target_value | VARCHAR(200) | NULL | NULL | 대상 값/범위 (limit_range시 허용 범위) |
| description | VARCHAR(500) | NULL | NULL | 원문 ★ 텍스트 보존 |
| priority | SMALLINT | NOT NULL | 0 | 제약 우선순위 (복수 제약 시) |
| is_active | BOOLEAN | NOT NULL | true | |
| created_at | TIMESTAMPTZ | NOT NULL | now() | |
| updated_at | TIMESTAMPTZ | NOT NULL | now() | |

**인덱스**:
- `idx_constraints_product_id` ON (product_id)
- `idx_constraints_type` ON (constraint_type)
- `idx_constraints_source_option` ON (source_option_id)
- `idx_constraints_target_option` ON (target_option_id)

**데이터 소스 매핑**:
- 상품마스터 > 각 시트 > ★ 마크 + 빨간 글씨 텍스트 (129개):
  - Type A (`size_show`): `엽서봉투 ★사이즈선택 : 100x150`
    → source_field='size', operator='eq', value='100x150', target_field='accessory', target_action='show'
  - Type B (`size_range`): `★사이즈선택 : 최소 30x30 / 최대 90x140`
    → source_field='size', operator='between', value_min='30x30', value_max='90x140', target_field='foil_size', target_action='limit_range'
  - Type C (`paper_condition`): `★종이두께선택시 : 180g이상 코팅가능`
    → source_field='paper_weight', operator='gte', value='180', target_field='coating', target_action='enable'
  - description에 원문 ★ 텍스트 그대로 보존

---

#### 4.5.5 option_dependencies (옵션 간 의존성)

★ 제약 이외의 옵션 간 연쇄 의존성. 부모 옵션 선택에 따른 자식 옵션 활성화/비활성화.

| 컬럼 | 타입 | 제약조건 | 기본값 | 설명 |
|------|------|---------|--------|------|
| id | SERIAL | PK | auto | |
| product_id | INTEGER | FK(products.id), NOT NULL | | 상품 |
| parent_option_id | INTEGER | FK(option_definitions.id), NOT NULL | | 부모 옵션 |
| parent_choice_id | INTEGER | FK(option_choices.id), NULL | NULL | 부모 선택지 (NULL이면 아무 선택이나) |
| child_option_id | INTEGER | FK(option_definitions.id), NOT NULL | | 자식 옵션 |
| dependency_type | VARCHAR(20) | NOT NULL | 'visibility' | 의존 유형: `visibility`(표시여부), `choices`(선택지 필터), `value`(값 연동) |
| is_active | BOOLEAN | NOT NULL | true | |
| created_at | TIMESTAMPTZ | NOT NULL | now() | |
| updated_at | TIMESTAMPTZ | NOT NULL | now() | |

**인덱스**:
- `idx_dependencies_product_id` ON (product_id)
- `idx_dependencies_parent` ON (parent_option_id, parent_choice_id)
- `idx_dependencies_child` ON (child_option_id)

**데이터 소스 매핑**:
- 상품마스터 > 각 시트 > 옵션 간 암묵적 의존성:
  - 종이 선택 → 인쇄방식 필터링 (특정 용지에서만 가능한 인쇄)
  - 사이즈 선택 → 수량 구간 변경
  - 인쇄방식 선택 → 별색 옵션 활성화/비활성화
  - 제본 선택 → 페이지수 범위 변경
- MES v5 JSON > option dependencies (옵션 간 연동 관계) 참조

---

### Domain 6: Integration (통합) -- 5 tables

#### 4.6.1 mes_items (MES 품목)

260개 MES 품목. 품목코드를 원본 그대로 보존한다.

| 컬럼 | 타입 | 제약조건 | 기본값 | 설명 |
|------|------|---------|--------|------|
| id | SERIAL | PK | auto | |
| item_code | VARCHAR(20) | UNIQUE, NOT NULL | | MES 품목코드 보존 (예: "001-0001") |
| group_code | VARCHAR(20) | NULL | NULL | 품목그룹 코드 (예: "0010010000") |
| name | VARCHAR(200) | NOT NULL | | 품목명 |
| abbreviation | VARCHAR(50) | NULL | NULL | 약어명 |
| item_type | VARCHAR(20) | NOT NULL | | 품목유형: `finished`(완제품), `semi_finished`(반제품), `service`(서비스), `standard`(기성품) |
| unit | VARCHAR(10) | NOT NULL | 'EA' | 단위: `EA`, `sheet`(연), `ream`(매), `set`(권), `pack`, `bundle` |
| is_active | BOOLEAN | NOT NULL | true | |
| created_at | TIMESTAMPTZ | NOT NULL | now() | |
| updated_at | TIMESTAMPTZ | NOT NULL | now() | |

**인덱스**:
- `uq_mes_items_item_code` ON (item_code) -- UNIQUE 자동
- `idx_mes_items_group_code` ON (group_code)
- `idx_mes_items_item_type` ON (item_type)

**데이터 소스 매핑**:
- 품목관리 > Sheet 시트 > 260개 행:
  - 품목코드 열 → item_code (원본 보존)
  - 품목그룹 열 → group_code
  - 품목명 열 → name
  - 약어명 열 → abbreviation
  - 품목유형 열 → item_type (완제품→finished, 반제품→semi_finished, 서비스→service, 기성품→standard)
  - 단위 열 → unit (EA/연/매/권 등)

---

#### 4.6.2 mes_item_options (MES 품목 옵션)

MES 품목당 최대 10개 옵션. Option01~Option10 열에 대응.

| 컬럼 | 타입 | 제약조건 | 기본값 | 설명 |
|------|------|---------|--------|------|
| id | SERIAL | PK | auto | |
| mes_item_id | INTEGER | FK(mes_items.id), NOT NULL | | 소속 MES 품목 |
| option_number | SMALLINT | NOT NULL | | 옵션 번호 (1~10) |
| option_value | VARCHAR(200) | NULL | NULL | 옵션 값 (예: "스티커 옵션없음", "아트지 250g") |
| is_active | BOOLEAN | NOT NULL | true | |
| created_at | TIMESTAMPTZ | NOT NULL | now() | |
| updated_at | TIMESTAMPTZ | NOT NULL | now() | |

**인덱스**:
- `idx_mes_item_options_item_id` ON (mes_item_id)
- `uq_mes_item_options_item_num` UNIQUE ON (mes_item_id, option_number)

**데이터 소스 매핑**:
- 품목관리 > Sheet 시트 > Option01~Option10 열:
  - 각 열의 값이 존재하면 → option_number=1~10, option_value=셀값
  - 빈 셀은 레코드 미생성
- 품목관리 > Sheet2 시트 > 드롭다운 참조값:
  - 품목유형, 단위 등의 허용값 목록 (검증용, 직접 마이그레이션 대상 아님)

---

#### 4.6.3 product_mes_mapping (상품-MES 매핑)

상품과 MES 품목의 양방향 매핑. 책자의 경우 내지/표지 분리 매핑.

| 컬럼 | 타입 | 제약조건 | 기본값 | 설명 |
|------|------|---------|--------|------|
| id | SERIAL | PK | auto | |
| product_id | INTEGER | FK(products.id), NOT NULL | | 상품 |
| mes_item_id | INTEGER | FK(mes_items.id), NOT NULL | | MES 품목 |
| cover_type | VARCHAR(10) | NULL | NULL | 책자 구분: `inner`(내지), `cover`(표지), NULL(일반/통합) |
| is_active | BOOLEAN | NOT NULL | true | |
| created_at | TIMESTAMPTZ | NOT NULL | now() | |
| updated_at | TIMESTAMPTZ | NOT NULL | now() | |

**인덱스**:
- `idx_pmm_product_id` ON (product_id)
- `idx_pmm_mes_item_id` ON (mes_item_id)
- `uq_pmm_product_mes_cover` UNIQUE ON (product_id, mes_item_id, cover_type)

**데이터 소스 매핑**:
- 상품마스터 > 각 시트 > C열(MES ITEM_CD):
  - 일반 상품: 1개 MES ITEM_CD → cover_type=NULL
  - 책자 상품: 내지 MES ITEM_CD + 표지 MES ITEM_CD → cover_type='inner'/'cover'
  - B열(shopby_id) 또는 huni_code로 products 테이블 조인 → product_id
  - C열(MES ITEM_CD)로 mes_items 테이블 조인 → mes_item_id
- 양방향 조회: product_id → mes_item_id (생산 지시용), mes_item_id → product_id (품목 역추적)

---

#### 4.6.4 product_editor_mapping (에디터 매핑)

111개 에디커스 에디터 지원 상품. 에디터 유형과 템플릿 정보.

| 컬럼 | 타입 | 제약조건 | 기본값 | 설명 |
|------|------|---------|--------|------|
| id | SERIAL | PK | auto | |
| product_id | INTEGER | FK(products.id), UNIQUE, NOT NULL | | 상품 (1:1 관계) |
| editor_type | VARCHAR(30) | NOT NULL | 'edicus' | 에디터 유형: `edicus`, `custom` |
| template_id | VARCHAR(100) | NULL | NULL | 에디터 템플릿 ID |
| template_config | JSONB | NULL | NULL | 에디터 설정 (템플릿별 커스텀 설정) |
| is_active | BOOLEAN | NOT NULL | true | |
| created_at | TIMESTAMPTZ | NOT NULL | now() | |
| updated_at | TIMESTAMPTZ | NOT NULL | now() | |

**인덱스**:
- `uq_editor_mapping_product` ON (product_id) -- UNIQUE 자동
- `idx_editor_mapping_editor_type` ON (editor_type)

**데이터 소스 매핑**:
- MES v5 JSON > editor="O" 인 111개 상품:
  - product_id → products 테이블 조인
  - editor_type → 'edicus' (현재 단일 에디터)
  - template_id → MES JSON의 template 참조
- 상품마스터 > 연분홍(#FFF4CCCC) 배경 시트: 포토북, 디자인캘린더 → editor-only 상품
- 상품마스터 > 각 시트 > N열(주문방법)에서 editor 표시 → editor_enabled=true 교차 검증
- template_config: 향후 에디터 통합 시 확장

---

#### 4.6.5 option_choice_mes_mapping (옵션선택지-MES 자재/공정 매핑)

주문 옵션의 개별 선택지를 MES에 등록된 자재/공정 코드와 매핑한다.
관리페이지에서 관리자가 수동으로 매핑 작업을 수행한다.

| 컬럼 | 타입 | 제약조건 | 기본값 | 설명 |
|------|------|---------|--------|------|
| id | SERIAL | PK | auto | |
| option_choice_id | INTEGER | FK(option_choices.id), NOT NULL | | 위젯빌더 옵션 선택지 |
| mes_item_id | INTEGER | FK(mes_items.id), NULL | NULL | 매핑된 MES 품목 (자재/공정) |
| mes_code | VARCHAR(50) | NULL | NULL | MES 코드 (mes_items에 없는 경우 직접 입력) |
| mapping_type | VARCHAR(20) | NOT NULL | | 매핑 유형. `material`(자재), `process`(공정), `service`(서비스) |
| mapping_status | VARCHAR(20) | NOT NULL | 'pending' | 매핑 상태. `pending`(미매핑), `mapped`(매핑완료), `verified`(검증완료) |
| mapped_by | VARCHAR(100) | NULL | NULL | 매핑 작업자 |
| mapped_at | TIMESTAMPTZ | NULL | NULL | 매핑 일시 |
| notes | TEXT | NULL | NULL | 매핑 메모 (관리자 참고용) |
| is_active | BOOLEAN | NOT NULL | true | 소프트 삭제 |
| created_at | TIMESTAMPTZ | NOT NULL | now() | |
| updated_at | TIMESTAMPTZ | NOT NULL | now() | |

**인덱스**:
- `idx_ocmm_choice_id` ON (option_choice_id)
- `idx_ocmm_mes_item_id` ON (mes_item_id)
- `idx_ocmm_mapping_status` ON (mapping_status) -- 미매핑 건 조회용
- UNIQUE(option_choice_id, mapping_type) -- 하나의 선택지에 타입별 하나의 MES 매핑

**데이터 소스 매핑**:
- 관리페이지에서 수동 입력 (마이그레이션 자동화 대상 아님)
- mapping_status = 'pending'으로 초기 생성 후, 관리자가 MES 코드를 선택하여 'mapped'로 전환
- 검증 절차 후 'verified'로 최종 확정

**매핑 예시**:
| option_choice (선택지) | mapping_type | MES 매핑 |
|----------------------|-------------|---------|
| 아트지 250g (용지) | material | MES 자재코드 -> mes_items |
| 무광코팅(단면) (후가공) | process | MES 공정코드 -> mes_items |
| 단면칼라 (인쇄방식) | process | MES 공정코드 -> mes_items |
| 투명아크릴 3mm (소재) | material | MES 자재코드 -> mes_items |

**관리 시나리오**:
1. 상품 등록 시 옵션 선택지가 생성되면 option_choice_mes_mapping에 pending 상태로 자동 생성
2. 관리자가 관리페이지에서 각 선택지에 MES 자재/공정 코드를 수동 매핑
3. MES 연동 시 매핑된 코드를 사용하여 자재 출고/공정 지시서 생성

---

### 테이블 요약

| 도메인 | 테이블명 | 예상 행수 | 주요 데이터 소스 |
|--------|---------|----------|----------------|
| **Product Catalog** | categories | ~30 | 상품마스터 > MAP |
| | products | ~221 | 상품마스터 > 각 시트 |
| | product_sizes | ~500 | 상품마스터 > E열 + 가격표 > 판걸이 |
| **Materials** | papers | ~55 | 상품마스터 > !디지털인쇄용지 |
| | materials | ~30 | 상품마스터 > 아크릴/실사/굿즈 |
| | paper_product_mapping | ~1,500 | 가격표 > 디지털용지 (45+ 열 x 55행) |
| **Processes** | print_modes | ~12 | 가격표 > 디지털출력비 열 |
| | post_processes | ~40 | 가격표 > 후가공 8섹션 |
| | bindings | ~4 | 가격표 > 제본 |
| **Pricing** | price_tables | ~20 | 가격표 > 각 시트 메타 |
| | price_tiers | ~10,000 | 가격표 > 출력비/후가공/제본 수량구간 |
| | fixed_prices | ~300 | 가격표 > 명함/아크릴/실사/사인 |
| | package_prices | ~200 | 가격표 > 옵션결합상품 |
| | foil_prices | ~150 | 가격표 > 후가공_박/박명함 |
| | imposition_rules | ~30 | 가격표 > 사이즈별 판걸이수 |
| | loss_quantity_config | ~5 | 초기 seed (확장 대비) |
| **Options & UI** | option_definitions | ~30 | MES v5 JSON > option keys |
| | product_options | ~2,000 | 상품마스터 > 열 존재 + 색상코딩 |
| | option_choices | ~1,198 | MES v5 JSON > choices |
| | option_constraints | ~129 | 상품마스터 > ★ 텍스트 |
| | option_dependencies | ~300 | 옵션 간 암묵적 의존성 분석 |
| **Integration** | mes_items | ~260 | 품목관리 > Sheet |
| | mes_item_options | ~800 | 품목관리 > Option01~10 |
| | product_mes_mapping | ~250 | 상품마스터 > C열(MES ITEM_CD) |
| | product_editor_mapping | ~111 | MES v5 JSON > editor="O" |
| | option_choice_mes_mapping | ~1,198 (pending) | 관리페이지 수동 입력 |

---

## 5. 마이그레이션 계획 (검증된 데이터 매핑 기반)

### Phase 1: 기초 마스터 데이터 (의존성 없는 테이블)

**1-1. categories** (상품 카테고리)
- Source: 상품마스터 > MAP 시트
- 매핑: 12개 대분류 행 → 최상위 categories (depth=0)
- 매핑: 하위분류 → parent_id 참조 (depth=1,2)
- 검증: 트리 구조 정합성 확인

**1-2. papers** (용지 마스터)
- Source: 상품마스터 > !디지털인쇄용지 시트 (55개 행)
- 매핑: 종이명 → name, 파일약어 → abbreviation, 전지규격 → sheet_size
- 매핑: 연당가 → cost_per_ream, 국4절단가 → cost_per_4cut
- 산출: weight는 name에서 파싱 (예: "아트지 250g" → 250)
- 검증: 가격표 > 디지털용지 시트의 용지 목록과 교차 검증

**1-3. materials** (비인쇄 소재)
- Source: 상품마스터 > 아크릴/실사/굿즈 시트의 소재 열
- 매핑: 소재명 → name, 유형 → material_type, 두께 → thickness

**1-4. print_modes** (인쇄방식)
- Source: 가격표 > 디지털출력비 시트 열 헤더 (12개 코드)
- 매핑: 코드 0,1,2,4,8,11,12,21,22,31,32 → price_code
- 산출: sides, color_type은 코드 의미에서 파생

**1-5. post_processes** (후가공)
- Source: 가격표 > 후가공 시트 (8개 섹션 Postprocess001~008)
- 매핑: 섹션별 하위 옵션 → group_code, sub_option_code, sub_option_name
- 특이: 코팅(PP007/PP008) → price_basis='per_sheet', 나머지 → 'per_unit'

**1-6. bindings** (제본 유형)
- Source: 가격표 > 제본 시트 (4개 유형)
- 매핑: 중철/무선/트윈링/PUR → code, name
- 산출: 페이지 제약 → 상품마스터 책자시트 O열(min/max/step)과 교차

**1-7. imposition_rules** (판걸이 규칙)
- Source: 가격표 > 사이즈별 판걸이수 시트 (~30개 행)
- 매핑: 재단사이즈 → cut_width/height, 작업사이즈 → work_width/height
- 매핑: 판걸이수 → imposition_count, 기준판형(A3/T3) → sheet_standard

### Phase 2: 상품 및 옵션 정의

**2-1. option_definitions** (옵션 정의)
- Source: MES v5 JSON > 30 option keys
- 매핑: key/name → key, name, class → option_class, UI component → ui_component

**2-2. option_choices** (옵션 선택지)
- Source: MES v5 JSON > 1198 choices
- 매핑: choice code/name → code, name, priceKey → price_key
- FK 매핑: ref_paper_id, ref_print_mode_id 등은 Phase 1 데이터 조인

**2-3. products** (상품)
- Source: 상품마스터 > 각 시트 (디지털인쇄, 스티커, 책자, ...)
- 매핑: B열(ID) → shopby_id (Shopby 상품 ID), huni_code는 규칙 기반 신규 생성, D열(상품명) → name, A열(구분) → category_id
- 매핑: N열(주문방법) → order_method, J열(출력용지규격) → sheet_standard
- 시트별 개별 파서 필요 (열 구조가 다름)

**2-4. product_sizes** (상품별 사이즈)
- Source: 상품마스터 > 각 시트 E열(사이즈) + 실사/아크릴 F열(비규격)
- 매핑: 사이즈값 → cut_width/height, 비규격범위 → custom_min/max
- 조인: imposition_rules에서 판걸이수 참조 → imposition_count

**2-5. loss_quantity_config** (로스량 설정)
- Source: 초기 seed (업계 표준 기반)
- 매핑: global scope → loss_rate=0.03, min_loss_qty=10

### Phase 3: 옵션 구성 및 제약조건

**3-1. product_options** (상품별 옵션 구성)
- Source: 상품마스터 > 각 시트 > 열 존재 + 헤더 색상코딩
- 매핑: 열 존재 → 레코드 생성, 열 순서 → display_order
- 매핑: 빨강=#FFE06666 → is_required=true, 주황=#FFF6B26B → is_required=false
- 매핑: 회색=#FFD9D9D9 → is_visible=false, is_internal=true

**3-2. option_constraints** (129개 ★ 제약조건)
- Source: 상품마스터 > 각 시트 > ★ 마크 + 빨간 글씨
- 매핑: 패턴 파싱 → constraint_type(A/B/C), source/target 필드 분리
- 원문 보존: description에 ★ 텍스트 그대로 저장

**3-3. option_dependencies** (옵션 의존성)
- Source: 상품마스터 + MES v5 JSON > 옵션 간 연동 관계 분석
- 매핑: 부모-자식 옵션 관계 → parent/child_option_id

### Phase 4: 가격 데이터

**4-1. price_tables + price_tiers** (출력비)
- Source: 가격표 > 디지털출력비(판매가) + 디지털출력비가수정(원가)
- A3 판매가: 253 수량행 x 12 인쇄코드 열 → price_tiers (type=selling)
- A3 원가: 동일 구조 → price_tiers (type=cost)
- T3: 각각 Row 32~/Row 61~ 시작

**4-2. price_tiers** (후가공 가격)
- Source: 가격표 > 후가공 시트 > 8개 섹션
- 매핑: 각 sub_option별 수량 구간 단가 → price_tiers

**4-3. price_tiers** (제본 가격)
- Source: 가격표 > 제본 시트 > 4개 유형 x 수량구간
- 매핑: 제본유형 x 수량구간별 단가 → price_tiers

**4-4. fixed_prices** (고정 단가 상품)
- Source: 가격표 > 명함(25행), 아크릴(사이즈 매트릭스), 포스터(실사), 사인
- Source: 상품마스터 > 실사 R/S열, 아크릴 H열, 굿즈 가격열, 문구 AC열
- 매핑: 용지x면수 → paper_id+print_mode_id+selling_price (명함)
- 매핑: 너비x높이 → size_id+selling_price (아크릴)

**4-5. package_prices** (패키지 가격)
- Source: 가격표 > 옵션결합상품 시트 (엽서북)
- 매핑: 사이즈 x 인쇄 x 페이지수 x 수량구간 → 조합별 레코드

**4-6. foil_prices** (박/형압 가격)
- Source: 가격표 > 후가공_박(동판비+일반박 매트릭스) + 후가공_박명함
- 매핑: 사이즈 매트릭스 셀 → foil_type+width+height+selling_price

**4-7. paper_product_mapping** (용지-상품 매핑)
- Source: 가격표 > 디지털용지 시트 (45+ 상품 열 x 55 용지행)
- 매핑: ● 표시 셀 → paper_id+product_id 레코드
- 특이: 책자 상품은 내지/표지 별도 열 → cover_type='inner'/'cover'

### Phase 5: MES 통합

**5-1. mes_items + mes_item_options** (MES 품목)
- Source: 품목관리 > Sheet 시트 (260개 행) + Option01~10 열
- 매핑: 품목코드 → item_code(보존), 품목그룹 → group_code
- 매핑: 품목유형(완제품/반제품/서비스/기성품) → item_type
- 매핑: Option01~10 비어있지 않은 값 → mes_item_options 레코드

**5-2. product_mes_mapping** (상품-MES 양방향 매핑)
- Source: 상품마스터 > 각 시트 > C열(MES ITEM_CD)
- 매핑: B열(shopby_id) 또는 huni_code → product_id, C열 → mes_item_id
- 특이: 책자 시트는 내지/표지 각각 별도 MES ITEM_CD → cover_type

**5-3. product_editor_mapping** (에디터 매핑)
- Source: MES v5 JSON > editor="O" (111개 상품)
- 매핑: product_id → products 조인, editor_type='edicus'
- 참조: 상품마스터 > 연분홍 배경 시트(포토북, 디자인캘린더) → editor-only 확인

**5-4. option_choice_mes_mapping 초기 생성**
- Source: 없음 (관리페이지에서 수동 입력)
- 초기 처리: 모든 option_choices에 대해 mapping_status='pending' 레코드 자동 생성
- mapping_type 자동 판별: option_definitions.option_class 기반 (자재 -> material, 공정 -> process, 설정 -> 제외)
- 관리자 작업 큐: pending 상태 건 목록을 관리페이지에 표시

### Phase 6: 검증 및 정합성 확인

**6-1. 교차 검증**
- paper_product_mapping: !디지털인쇄용지 시트의 ● 매핑 vs 가격표 디지털용지 시트의 열 매핑 일치 확인
- product_mes_mapping: 상품마스터 C열 vs 품목관리 품목코드 일치 확인
- option_choices: MES v5 JSON choices vs 상품마스터 셀 내 드롭다운 값 일치 확인

**6-2. 건수 검증**
- products: 221개 (MES v5 JSON 기준)
- option_choices: 1,198개
- option_constraints: 129개
- mes_items: 260개
- editor 상품: 111개

**6-3. 가격 검증**
- 샘플 상품 5종에 대해 엑셀 수동 계산 결과 vs DB 기반 자동 계산 결과 일치 확인
- Model 1~7 각 유형별 최소 1개 상품 검증

---

## 6. 리서치 필요 항목

| 항목 | 필요 이유 | 상태 |
|------|----------|------|
| 판걸이/임포지션 표준 | 추후 자동 계산 시 네스팅/조판 알고리즘 | 리서치 필요 |
| 기본로스량 | 용지비 계산에 필요한 로스 비율 | 확장형 설계 (추후 설정) |
| 건수 vs 수량 | 디지털인쇄 주문 단위 정의 | 리서치 필요 |
| 책자 견적 표준 | 내지/표지 분리 계산 구조 | 리서치 필요 |
| 수량할인율 | 아크릴/굿즈 수량 할인 구조. QuantitySlider(Slider:tier-display) 컴포넌트(Section 3.5.6)의 데이터 소스 확정 필요 | 엑셀 추가 분석 필요 |
| shopby_id 코드 체계 | Shopby 상품 등록 후 ID 매핑 정책. huni_code <-> shopby_id 동기화 방식 결정 필요 | 추후 설계 필요 (TODO) |

---

## 7. 제외 사항

- AN열 (작성자 메모, 무시 지시)
- 오렌지 글씨 텍스트 (작성자 개인 코멘트)
- (임시)포카가격비교 시트 (미확정 임시 데이터)
- Figma 디자인의 상세 스타일/레이아웃 구현 (별도 UI 설계 단계에서 처리, 단 UI 컴포넌트 타입 정의는 Section 3.5에 포함)

---

## 8. 인수 조건

1. 모든 상품마스터 데이터가 정규화된 테이블로 변환됨
2. 모든 가격표 데이터가 price_tiers/fixed_prices/package_prices로 변환됨
3. 7가지 가격 산정 모델이 동일한 엔티티 구조로 표현 가능함
4. ★ 제약조건이 option_constraints 테이블로 완전 분리됨
5. MES 품목코드 매핑이 양방향으로 조회 가능함
6. UI 옵션 배치순서와 의존성이 DB에서 관리 가능함
7. 용지/공정/가격에 대한 CRUD 작업이 독립적으로 가능함
8. 관리자가 관리페이지에서 옵션 선택지 -> MES 자재/공정 매핑을 수동으로 수행할 수 있음
9. huni_code가 위젯빌더의 중추적 상품 식별자로서 에디쿠스/MES/Shopby 간 매핑 허브 역할을 수행함
10. edicus_code는 huni_code에서 자동 파생('HU_' + huni_code)되어 에디쿠스와 연동 가능함

---

Sources:
- [인쇄물 기준 요금 2025 - 한국교육과정평가원](https://www.g2b.go.kr)
- [Prepress: Imposition and Nesting - Caldera](https://www.caldera.com/all-you-need-to-know-about-imposition-and-nesting/)
- [Sheet Offset Print Calculation - Dataline](https://dataline.eu/en/multipress/calculation/production-technology-calculation/sheet-offset-print-calculation)
- [북토리 무선제본 계산기](https://booktory.com/make-guide/pg1-10t1.asp)
- [제본공장 무선제본](https://jebonfactory.com/page/?pid=binding2_new)
