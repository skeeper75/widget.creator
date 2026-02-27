# SPEC-IM-002: Figma PNG 실측 분석 (구간별 크롭 방법론 적용)

> 작성 방법: 2240×5584px PNG를 ffmpeg로 우측 패널(x=1050, w=1190) 구간 분할 크롭 후 읽기
> 색상 권위: `ref/figma/FIGMA_COMPARISON_REPORT.md` 디자인토큰 참조
> 텍스트 권위: TOON 파일 → 옵션 key/코드값, Figma PNG → display_name/ui_component

## 색상 디자인 토큰 참조

| 역할 | 토큰명 | Hex |
|------|--------|-----|
| Primary (선택 상태, CTA) | `--color-primary` | `#5538B6` |
| Accent (추천 뱃지) | `--color-accent` | `#f0831e` |
| Secondary | `--color-secondary` | `#4b3f96` |
| 추천 뱃지 배경 | accent 계열 | `#f0831e` |
| 선택된 chip/radio | primary border | `#5538B6` |
| 가격 강조 | primary | `#5538B6` 또는 `#E84C4F` (빨간) |

---

## 01. 디지털인쇄 (PRINT)

**파일**: `01. PRODUCT_PRINT_OPTION.png` → 4구간 크롭

### 기본 옵션

| 순서 | UI 레이블 | option_key (제안) | ui_component | 선택지 | 비고 |
|------|-----------|-------------------|--------------|--------|------|
| 1 | 사이즈 | `size` | chip_group | 73×98, 98×98, 100×150(추천), 95×210, 110×170, 148×210, 135×135 mm | 100×150 = 기본선택 |
| 2 | 종이 | `paper_type` | select | 몽블랑 190g (추천) | dropdown |
| 3 | 인쇄 | `print_side` | chip_group | 단면, 양면 | |
| 4 | 별색인쇄 (화이트) | `special_color_white` | chip_group | 화이트인쇄(없음), 화이트인쇄(단면), 화이트인쇄(양면) | 독립 섹션 |
| 5 | 별색인쇄 (클리어) | `special_color_clear` | chip_group | 클리어인쇄(없음), 클리어인쇄(단면), 클리어인쇄(양면) | 독립 섹션 |
| 6 | 별색인쇄 (핑크) | `special_color_pink` | chip_group | 핑크인쇄(없음), 핑크인쇄(단면), 핑크인쇄(양면) | 독립 섹션 |
| 7 | 별색인쇄 (금색) | `special_color_gold` | chip_group | 금색인쇄(없음), 금색인쇄(단면), 금색인쇄(양면) | 독립 섹션 |
| 8 | 별색인쇄 (은색) | `special_color_silver` | chip_group | 은색인쇄(없음), 은색인쇄(단면), 은색인쇄(양면) | 독립 섹션 |
| 9 | 코팅 | `coating` | chip_group | 코팅없음, 무광코팅(단면), 무광코팅(양면), 유광코팅(양면), 유광코팅(단면) | |
| 10 | 커팅 | `cutting` | chip_group | 한쪽라운딩, 나뭇잎, 큰라운딩, 클래식 | |
| 11 | 접지 | `folding` | chip_group | 2단 가로접지, 2단 세로접지, 3단 가로접지 | |
| 12 | 건수 | `print_run` | stepper | 숫자 입력 (기본: 1) | |
| 13 | 제작수량 | `quantity` | stepper | 숫자 입력 (기본: 20) | |

### 후가공 섹션 (collapsible, 기본 접힘)

| 순서 | UI 레이블 | option_key (제안) | ui_component | 선택지 |
|------|-----------|-------------------|--------------|--------|
| 1 | 귀돌이 | `rounded_corner` | chip_group | 직각모서리, 둥근모서리 |
| 2 | 오시 | `scoring` | chip_group | 없음, 1개, 2개, 3개 |
| 3 | 미싱 | `perforation` | chip_group | 없음, 1개, 2개, 3개 |
| 4 | 가변인쇄(텍스트) | `variable_print_text` | chip_group | 없음, 1개, 2개, 3개 |
| 5 | 가변인쇄(이미지) | `variable_print_image` | chip_group | 없음, 1개, 2개, 3개 |

### 박,형압 가공 섹션 (collapsible)

| 순서 | UI 레이블 | option_key (제안) | ui_component | 선택지/제약 |
|------|-----------|-------------------|--------------|------------|
| 1 | 박(앞면) | `foil_front` | chip_group | 박있음, 박없음 |
| 2 | 박(앞면) 크기 직접입력 | `foil_front_size` | dual_input | 가로 30~125mm / 세로 30~170mm |
| 3 | 박(앞면) 칼라 | `foil_front_color` | color_chip | 금박, 은박, 먹유광, 브론즈, 빨간색, 파란색, 홀로그램, 홀로그램박 |
| 4 | 박(뒷면) | `foil_back` | chip_group | 박있음, 박없음 |
| 5 | 박(뒷면) 크기 직접입력 | `foil_back_size` | dual_input | 가로 30~80mm / 세로 30~40mm |
| 6 | 박(뒷면) 칼라 | `foil_back_color` | color_chip | 금박, 은박, 먹유광, 브론즈, 빨간색, 파란색, 홀로그램, 홀로그램박 |
| 7 | 형압 | `emboss` | chip_group | 없음, 양각, 음각 |
| 8 | 형압크기 직접입력 | `emboss_size` | dual_input | 가로 30~125mm / 세로 30~170mm |

### 엽서봉투 추가상품 (upsell dropdown)

| 선택지 | 가격 |
|--------|------|
| 없음 | - |
| OPP비접착봉투 110×160mm 50장 | +1,100원 |
| OPP비접착봉투 150×150mm 50장 | +1,150원 |
| 카드봉투 화이트 165×115mm 10장 | +1,100원 |
| 카드봉투 블랙 165×115mm 10장 | +1,100원 |

### 버튼
- PDF파일 직접 올리기 (outline)
- 에디터로 디자인하기 (filled, primary)

---

## 02. 스티커 (STICKER)

**파일**: `02. PRODUCT_STICKER_OPTION.png` → 2구간 크롭

### 기본 옵션

| 순서 | UI 레이블 | option_key (제안) | ui_component | 선택지 | 비고 |
|------|-----------|-------------------|--------------|--------|------|
| 1 | 사이즈 | `size` | chip_group | A6 (105×148 mm), A5 (148×210 mm), A4 (210×297 mm) | A4 = 기본선택 |
| 2 | 종이 | `paper_type` | select | 유포스티커 (추천) | dropdown |
| 3 | 인쇄 | `print_side` | chip_group | 단면 | 단면만 존재 |
| 4 | 별색인쇄 (화이트) | `special_color_white` | chip_group | 화이트인쇄(단면) | 단면만 존재 |
| 5 | 커팅 | `cutting` | chip_group | 20×278mm (8ea), 30×278mm (5ea), 40×278mm (4ea), 50×278mm (3ea) | 조각수 포함 표시 |
| 6 | 조각수 | `piece_count` | select | 5조각 | dropdown |
| 7 | 제작수량 | `quantity` | stepper | 숫자 입력 (기본: 20) | |

### 후가공 섹션 (collapsible)
- 후가공 있음 (하단 가격요약에 노출)

### 버튼
- PDF파일 직접 올리기 (outline)
- 에디터로 디자인하기 (filled, primary)

---

## 03. 책자 (BOOK)

**파일**: `03. PRODUCT_BOOK_OPTION.png` → 2구간 크롭

> **주의**: 이 Figma 디자인은 링제본 책자 UI임. 무선제본/중철은 별도 flow로 추정.

### 기본 옵션

| 순서 | UI 레이블 | option_key (제안) | ui_component | 선택지 | 비고 |
|------|-----------|-------------------|--------------|--------|------|
| 1 | 사이즈 | `size` | chip_group | A5 (148×210 mm), A4 (210×297 mm) | |
| 2 | 제본 | `binding_type` | chip_group | 무선제본 | 단일 선택지 표시 |
| 3 | 제본방향 | `binding_direction` | chip_group | 좌철, 상철 | |
| 4 | 링컬러 | `ring_color` | image_chip | (블랙, 실버링, 제3컬러) | 이미지 chip 3종 |
| 5 | 링선택 | `ring_size` | image_chip | D링(31mm) badge, 이미지 chip 3종 | D링(31mm) 기본 |
| 6 | 면지 | `endpaper` | chip_group | 화이트, 그레이, 블랙, 인쇄 | |
| 7 | 제작수량 | `quantity` | stepper | 숫자 입력 (기본: 20) | |

### 내지 옵션

| 순서 | UI 레이블 | option_key (제안) | ui_component | 선택지 | 비고 |
|------|-----------|-------------------|--------------|--------|------|
| 1 | 내지종이 | `inner_paper` | select | 몽블랑 190g (추천) | dropdown |
| 2 | 내지인쇄 | `inner_print_side` | chip_group | 단면, 양면 | |
| 3 | 내지 페이지 | `page_count` | stepper | 숫자 입력 (기본: 8) | 최소 24P ~ 최대 300P |

### 표지 옵션

| 순서 | UI 레이블 | option_key (제안) | ui_component | 선택지 | 비고 |
|------|-----------|-------------------|--------------|--------|------|
| 1 | 표지종이 | `cover_paper` | select | 몽블랑 190g | dropdown |
| 2 | 표지인쇄 | `cover_print_side` | chip_group | 단면, 양면 | |
| 3 | 표지코팅 | `cover_coating` | chip_group | 코팅없음, 무광코팅(단면), 유광코팅(단면) | |
| 4 | 투명커버 | `clear_cover` | chip_group | 투명커버없음, 유광투명커버, 무광투명커버 | |

### 박,형압 가공 섹션 (collapsible, 현재 열림 = "닫기" 버튼 표시)

| 순서 | UI 레이블 | option_key (제안) | ui_component | 선택지/제약 |
|------|-----------|-------------------|--------------|------------|
| 1 | 박(표지) | `foil_cover` | chip_group | 박있음, 박없음 |
| 2 | 박(표지) 크기 직접입력 | `foil_cover_size` | dual_input | 가로 30~125mm / 세로 30~170mm |
| 3 | 박(표지) 칼라 | `foil_cover_color` | color_chip | 금박, 은박, 먹유광, 브론즈, 빨간색, 파란색, 홀로그램, 홀로그램박 |
| 4 | 형압 | `emboss` | chip_group | 없음, 양각, 음각 |
| 5 | 형압 크기 직접입력 | `emboss_size` | dual_input | 가로 30~125mm / 세로 30~170mm |

---

## 04. 포토북 (PHOTOBOOK)

**파일**: `04. PRODUCT_PHOTOBOOK_OPTION.png` → 2구간 크롭 (s2 비어있음)

### 기본 옵션

| 순서 | UI 레이블 | option_key (제안) | ui_component | 선택지 | 비고 |
|------|-----------|-------------------|--------------|--------|------|
| 1 | 사이즈 | `size` | chip_group | A5 (148×210 mm), A4 (210×297 mm), 8x8 (200×200 mm), 10x10 (250×250 mm) | 8x8 = 기본선택 |
| 2 | 커버타입 | `cover_type` | chip_group | 하드커버, 소프트커버, 레더하드커버 | 하드커버 = 기본 |
| 3 | 제작수량 | `quantity` | stepper | 숫자 입력 (기본: 20) | |

### 버튼
- 에디터로 디자인하기 (filled, primary) **전용** — PDF 업로드 없음

---

## 05. 캘린더 (CALENDAR)

**파일**: `05. PRODUCT_CALENDAR_OPTION.png` → 2구간 크롭

### 기본 옵션

| 순서 | UI 레이블 | option_key (제안) | ui_component | 선택지 | 비고 |
|------|-----------|-------------------|--------------|--------|------|
| 1 | 사이즈 | `size` | chip_group | 220×145 mm, 130×220 mm | 130×220 = 기본선택 |
| 2 | 종이 | `paper_type` | select | 스노우 200g (추천) | dropdown |
| 3 | 인쇄 | `print_side` | chip_group | 단면, 양면 | |
| 4 | 장수 | `sheet_count` | select | 13장 | dropdown |
| 5 | 삼각대 컬러 | `stand_color` | color_chip | 블랙(기본), 실버 | |
| 6 | 캘린더 가공 | `calendar_finishing` | chip_group | 가공없음(재단만), 고리형트윈링제본, 2구타공+끈 | |
| 7 | 링컬러 | `ring_color` | color_chip | 블랙, 실버, 화이트 | 고리형트윈링제본 선택 시 표시 |
| 8 | 제작수량 | `quantity` | stepper | 숫자 입력 (기본: 20) | |

### 추가상품 옵션

| 순서 | UI 레이블 | option_key (제안) | ui_component | 선택지 |
|------|-----------|-------------------|--------------|--------|
| 1 | 개별포장 | `individual_packaging` | select | 개별포장없음, 수축포장 (500원) |
| 2 | 캘린더봉투 | `calendar_envelope` | select | 없음, 캘린더봉투 240×230 mm 10장 (+3,000원) |
| 3 | 수량 | `envelope_quantity` | select | 수량 dropdown (캘린더봉투 선택 시) |

### 버튼
- PDF파일 직접 올리기 (outline)

---

## 06. 디자인캘린더 (DESIGN_CALENDAR)

**파일**: `06. PRODUCT_DESIGN_CALENDAR_OPTION.png` → 2구간 크롭 (s2 비어있음)

### 기본 옵션

| 순서 | UI 레이블 | option_key (제안) | ui_component | 선택지 | 비고 |
|------|-----------|-------------------|--------------|--------|------|
| 1 | 사이즈 | `size` | chip_group | 220×145 mm, 130×220 mm | 130×220 = 기본선택 |
| 2 | 종이 | `paper_type` | select | 스노우 200g (추천) | dropdown |
| 3 | 페이지 | `page_count` | select | 30P (13개월) | dropdown |
| 4 | 제작수량 | `quantity` | stepper | 숫자 입력 (기본: 20) | |

### 추가상품

| 순서 | UI 레이블 | option_key (제안) | ui_component | 선택지 |
|------|-----------|-------------------|--------------|--------|
| 1 | 캘린더봉투 | `calendar_envelope` | select | 없음, 캘린더봉투 240×230 mm 10장 (+3,000원) |
| 2 | 수량 | `envelope_quantity` | select | 수량 dropdown |

### 버튼
- 에디터로 디자인하기 (filled, primary) **전용** — PDF 업로드 없음

---

## 07. 실사/사인 (SIGN)

**파일**: `07. PRODUCT_SIGN_OPTION.png` → 2구간 크롭

### 기본 옵션

| 순서 | UI 레이블 | option_key (제안) | ui_component | 선택지/제약 | 비고 |
|------|-----------|-------------------|--------------|------------|------|
| 1 | 사이즈 | `size` | chip_group | A3 (297×420 mm), A2 (420×594 mm), A1 (594×841 mm), 직접입력 | A1 = 기본선택 |
| 2 | 직접입력 | `custom_size` | dual_input | 가로 200~1200 mm / 세로 200~3000 mm | 직접입력 선택 시 |
| 3 | 소재 | `material` | select | 스노우 200g (추천) | dropdown |
| 4 | 별색인쇄 (화이트) | `special_color_white` | chip_group | 화이트인쇄(없음), 화이트인쇄(단면) | |
| 5 | 제작수량 | `quantity` | stepper | 숫자 입력 (기본: 20) | |

### 버튼
- PDF파일 직접 올리기 (outline) **전용** — 에디터 없음

---

## 08. 아크릴 (ACRYLIC)

**파일**: `08. PRODUCT_ACRYLIC_OPTION.png` → 2구간 크롭

### 기본 옵션

| 순서 | UI 레이블 | option_key (제안) | ui_component | 선택지/제약 | 비고 |
|------|-----------|-------------------|--------------|------------|------|
| 1 | 사이즈 | `size` | chip_group | 20×30, 30×30, 30×40(기본), 95×210, 110×170, 148×210, 135×135 mm | 7종 |
| 2 | 크기 직접입력 | `custom_size` | dual_input | 가로 30~125 mm / 세로 30~170 mm | |
| 3 | 소재 | `material` | chip_group | 투명아크릴 3mm | 단일 옵션 |
| 4 | 조각수 | `piece_count` | select | 5조각 | dropdown |
| 5 | 가공 | `hook_type` | chip_group | 고리없음, 은색고리, 금색고리 | |
| 6 | 제작수량 | `quantity` | stepper | 숫자 입력 (기본: 20) | |

### 구간할인

| 구간 | 수량 |
|------|------|
| 슬라이더 | 1 / 10 / 50 / 100 / 500 / 1000+ |
| 예시 | 할인적용단가: 3,200 (6%off) |

### 추가상품 (upsell)

| 순서 | UI 레이블 | option_key (제안) | ui_component | 선택지 |
|------|-----------|-------------------|--------------|--------|
| 1 | 불체인 | `ball_chain` | select | 없음, 볼체인 오렌지 3개1팩 |
| 2 | 수량 | `ball_chain_qty` | select | 수량 dropdown |

### 버튼
- 에디터로 디자인하기 (filled, primary)

---

## 09. 굿즈/파우치 (GOODS)

**파일**: `09. PRODUCT_GOODS_OPTION.png` → 2구간 크롭

### 기본 옵션

| 순서 | UI 레이블 | option_key (제안) | ui_component | 선택지 | 비고 |
|------|-----------|-------------------|--------------|--------|------|
| 1 | 사이즈 | `size` | chip_group | 73×98 mm, 98×98 mm, 100×150 mm | 100×150 = 기본선택 |
| 2 | 옵션 (컬러) | `pouch_color` | color_chip | 화이트, 그레이, 블랙(기본), 퍼플, 레드, 블랙(dark), 스카이블루, 그린, 핑크, 옐로우 | 10색 |
| 3 | 가공 | `label` | chip_group | 라벨없음, 라벨부착 | |
| 4 | 제작수량 | `quantity` | stepper | 숫자 입력 (기본: 20) | |

### 구간할인
- 슬라이더: 1 / 10 / 50 / 100 / 500 / 1000+

### 추가상품 (upsell)

| 순서 | UI 레이블 | option_key (제안) | ui_component | 선택지 |
|------|-----------|-------------------|--------------|--------|
| 1 | 불체인 | `ball_chain` | select | 선택안함, 불체인 (오렌지) 3개 1팩 (+1,000원) |
| 2 | 수량 | `ball_chain_qty` | select | 수량 dropdown |

### 버튼
- PDF파일 직접 올리기 (outline)
- 에디터로 디자인하기 (filled, primary)

---

## 10. 문구 (NOTE)

**파일**: `10. PRODUCT_NOTE_OPTION.png` → 2구간 크롭

### 기본 옵션

| 순서 | UI 레이블 | option_key (제안) | ui_component | 선택지 | 비고 |
|------|-----------|-------------------|--------------|--------|------|
| 1 | 사이즈 | `size` | chip_group | 130×190 mm | 단일 사이즈 |
| 2 | 내지 | `inner_type` | chip_group | 무지내지 | 단일 옵션 |
| 3 | 종이 | `paper_type` | select | 백모조 120g | dropdown |
| 4 | 제본옵션 | `binding_option` | chip_group | 50장 1권, 100장 1권 | |
| 5 | 링컬러 | `ring_color` | color_chip | 블랙(기본), 실버, 화이트 | |
| 6 | 제작수량 | `quantity` | stepper | 숫자 입력 (기본: 20) | |

### 구간할인
- 슬라이더: 1 / 10 / 50 / 100 / 500 / 1000+

### 추가상품

| 순서 | UI 레이블 | option_key (제안) | ui_component | 선택지 |
|------|-----------|-------------------|--------------|--------|
| 1 | 개별포장 | `individual_packaging` | select | 개별포장없음, 수축포장 (500원) |

### 버튼
- PDF파일 직접 올리기 (outline)
- 에디터로 디자인하기 (filled, primary)

---

## 11. 액세서리 (ACCESSORY)

**파일**: `11. PRODUCT_ACCESSORY_OPTION.png` → 2구간 크롭 (s2 비어있음)

### 기본 옵션

| 순서 | UI 레이블 | option_key (제안) | ui_component | 선택지 | 비고 |
|------|-----------|-------------------|--------------|--------|------|
| 1 | 사이즈 | `size` | chip_group | 70×200 mm (50장), 80×100 mm (50장) | 80×100 = 기본선택 |
| 2 | 수량 | `quantity` | stepper | 숫자 입력 (기본: 20) | |

### 버튼
- 장바구니 담기 (filled, primary) **전용** — PDF/에디터 없음

---

## 공통 패턴 요약

### UI 컴포넌트 분류

| 컴포넌트 | 설명 | 사용처 |
|----------|------|--------|
| `chip_group` | 텍스트 칩 선택 | 사이즈(텍스트형), 인쇄, 코팅 등 |
| `image_chip` | 이미지 포함 칩 | 링컬러, 커버타입 등 |
| `color_chip` | 색상 원형 칩 | 박칼라, 삼각대컬러, 링컬러 등 |
| `select` | dropdown | 종이, 장수, 조각수 등 |
| `stepper` | +/- 숫자 입력 | 제작수량, 건수, 내지 페이지 |
| `dual_input` | 가로 X 세로 입력 | 박크기, 형압크기, 직접입력 |
| `slider` | 구간할인 슬라이더 | 아크릴, 굿즈, 문구 |
| `upsell_dropdown` | 추가상품 선택 | 엽서봉투, 캘린더봉투, 불체인 |
| `collapsible` | 접힘/펼침 섹션 | 후가공, 박,형압 가공 |

### 버튼 패턴별 분류

| 제품 | PDF 업로드 | 에디터 | 장바구니 |
|------|-----------|--------|---------|
| 01 디지털인쇄 | O | O | - |
| 02 스티커 | O | O | - |
| 03 책자 | - | - | - (?) |
| 04 포토북 | - | O | - |
| 05 캘린더 | O | - | - |
| 06 디자인캘린더 | - | O | - |
| 07 실사/사인 | O | - | - |
| 08 아크릴 | - | O | - |
| 09 굿즈/파우치 | O | O | - |
| 10 문구 | O | O | - |
| 11 액세서리 | - | - | O |

### 별색인쇄 UI 패턴 (중요 정정)

> TOON 데이터에서 "별색인쇄(옵션)"은 1개 컬럼이지만,
> Figma UI에서는 **화이트/클리어/핑크/금색/은색 5개 독립 섹션**으로 구현됨.
> 각 섹션은 없음/단면/양면 3개 chip_group을 가짐.

### 구간할인 슬라이더 (아크릴/굿즈/문구)

- 수량 구간: 1 / 10 / 50 / 100 / 500 / 1000+
- 현재 선택 수량에 따른 할인율 자동 표시 (예: 3,200원 6%off)

---

## TOON vs Figma 매핑 테이블 (option_key 기준)

| TOON 컬럼명 | Figma 레이블 | option_key (제안) | ui_component |
|------------|-------------|-------------------|--------------|
| 규격/사이즈 | 사이즈 | `size` | chip_group or image_chip |
| 지질 | 종이/소재 | `paper_type` / `material` | select |
| 도수 | 인쇄 | `print_side` | chip_group |
| 별색인쇄(옵션) | 별색인쇄 (화이트~은색) | `special_color_*` | chip_group ×5 |
| 코팅(옵션) | 코팅 | `coating` | chip_group |
| 커팅 | 커팅 | `cutting` | chip_group |
| 접지 | 접지 | `folding` | chip_group |
| 제작수량 | 제작수량 | `quantity` | stepper |
| 제본방식 | 제본/커버타입 | `binding_type` / `cover_type` | chip_group |
| 박(옵션) | 박,형압 가공 섹션 | `foil_*` + `emboss` | collapsible group |
| 가공 | 후가공 섹션 | `rounded_corner`, `scoring`, etc. | collapsible group |

---

Version: 1.0.0
Date: 2026-02-27
Source: 11개 PNG 구간별 크롭 실측 (ffmpeg crop=1190:1600:1050:Y)
Method: 디자인토큰=Figma API, 텍스트=TOON/JSON, UI구조=PNG구간분할
