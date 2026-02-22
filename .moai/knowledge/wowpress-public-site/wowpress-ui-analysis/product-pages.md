# WowPress Product Order Pages Analysis

## Products Analyzed

| # | Category | Product | ProdNo | URL |
|---|---|---|---|---|
| 1 | 명함 (Business Cards) | 일반명함 (Standard) | 40073 | `/ordr/prod/dets?ProdNo=40073` |
| 2 | 스티커 (Stickers) | 사각스티커 (Rectangle) | 40133 | `/ordr/prod/dets?ProdNo=40133` |
| 3 | 전단 (Flyers) | 합판전단 (Offset) | 40026 | `/ordr/prod/dets?ProdNo=40026` |
| 4 | 책자 (Booklets) | 무선책자 (Perfect Bind) | 40196 | `/ordr/prod/dets?ProdNo=40196` |
| 5 | 사인제품 (Signage) | 현수막 (Banner) | 40154 | `/ordr/prod/dets?ProdNo=40154` |

---

## Product 1: 일반명함 (Standard Business Card) - ProdNo 40073

### Option Structure

**28 select dropdowns**, 1 radio group, 14 checkboxes, 8 text inputs, 399 hidden fields

#### Primary Options

| Option | Korean | Field | Values |
|---|---|---|---|
| Category 1 | 카테고리 | `category1` | 23 product categories |
| Category 2 | 하위카테고리 | `category2` | 8 sub-products (일반명함, 특수지, 디지털, 프리미엄, 후가공, 핫딜, 당일출고, 복권) |
| Size | 규격 | `SizeNo` | 90x50, 50x90, 86x52, 비규격(custom) |
| Color/Ink | 인쇄도수 | `ColorNo` | 단면 칼라4도 (single-side 4-color), 양면 칼라8도 (double-side 8-color) |
| Paper Type | 용지 | `sPaper0` | 스노우지(무광코팅), 스노우지(무코팅) |
| Paper Weight | 평량 | `sPaper0` | 219g, 250g |
| Quantity | 수량 | `spdata_00_ordqty` | 500매 ~ 100,000매 (29 options) |
| Count | 건수 | `OrdCnt` | 1건 ~ 50건 |

#### Post-Processing Options (후가공)

| Post-Process | Count Options | Detail Options |
|---|---|---|
| 오시 (Creasing) | 1줄, 2줄, 3줄 | 가로, 가로중앙, 세로, 세로중앙 |
| 미싱 (Perforation) | 1줄, 2줄, 3줄 | 가로, 가로중앙, 세로, 세로중앙 |
| 타공 (Hole Punch) | 1개, 2개, 3개 | 3mm, 4mm, 5mm, 6mm, 7mm, 8mm |
| 라운딩 (Rounding) | - | 부분라운딩, 전체라운딩 |
| 넘버링 (Numbering) | - | 1개, 2개 |
| 박(앞면) (Foil Front) | 금박유광, 금박무광, 은박유광, 은박무광, 적박 +4 more | 15mm이하, 30mm이하, 70mm이하, 90mm미만 |
| 박(뒷면) (Foil Back) | Same material options | Same size options |
| 형압 (Embossing) | - | 15mm이하, 30mm이하, 70mm이하, 90mm미만 |

#### Accessories (부자재)

3 accessory product groups with size + quantity selectors:
- 명함케이스 시크걸/젠틀맨 (500매용)
- 명함케이스 200매용/100매용
- 명함케이스 200매용/100매용 (duplicate set)

#### Self-Design Template Sizes
`SelfCNoSize`: 90x50, 50x90, 86x52, 88x53

#### Pricing (Default)

| Item | Amount |
|---|---|
| 인쇄비 (Print) | 3,300 원 |
| 부자재비 (Accessories) | 0 원 |
| 후가공비 (Post-process) | 0 원 |
| 디자인비 (Design) | 0 원 |
| 할인 (Discount) | 0 원 |
| 부가세 (VAT) | 330 원 |
| **총 결제금액** | **3,630 원** |

#### Shipping Info
- 예상출고일: 2026-02-24 (1박2일)
- 접수마감시간: 월~목 18:30 / 금 20:00

#### Key AJAX Calls
1. `POST /self/dsgn/getproduct` - Get product template data
2. `POST /ordr/prod/mdm/detail/Size` - Size-dependent options
3. `POST /ordr/prod/mdm/detail/Paper` - Paper-dependent options
4. `POST /ord/calc/jobqty0` - Quantity pricing
5. `POST /ord/calc/jobcost0` - Cost calculation

---

## Product 2: 사각스티커 (Rectangle Sticker) - ProdNo 40133

### Option Structure

**4 select dropdowns**, 0 radio groups, 14 checkboxes, 4 text inputs, 98 hidden fields

This is a **landing page** product that redirects to sub-products. The page has:

#### Category Selects

| Level | Field | Options |
|---|---|---|
| Category 1 | `category1` | 23 main categories |
| Category 2 | `category2` | 9 sticker sub-types (사각, 도무송, 주차, 판, 배달, 롤, 팬시, 핫딜 +1) |
| Category 3 | `category3` | 13 sub-variants (가성비, 소량, 탈부착, 강접, 방수, 유포지, 크라프트... ) |

#### Self-Design Template Sizes
`SelfCNoSize`: 90x55, 90x70, 90x80, 90x90, 90x100, 100x100, 110x110, 90x120

**Note**: The sticker product page uses a 3-level category hierarchy (unlike business cards which use 2 levels). The actual order form loads after selecting the final sub-variant (Category 3).

#### Pricing (Default)
- 총 결제금액: 0 원 (no variant selected yet)

---

## Product 3: 합판전단 (Offset Flyer) - ProdNo 40026

### Option Structure

**13 select dropdowns**, 1 radio group, 14 checkboxes, 8 text inputs, 412 hidden fields

#### Primary Options

| Option | Field | Values |
|---|---|---|
| Size | `SizeNo` | A4(국8절), A2(국2절), A3(국4절), A5(국16절), 4절(B3), 8절(B4), 16절(B5), 대4절, 대8절, 대16절, 합판전단2절, 합판전단DM, 대전단, 비규격 |
| Color/Ink | `ColorNo` | 단면 칼라4도, 양면 칼라8도 |
| Paper Type | `sPaper0` | 아트지 |
| Paper Weight | `sPaper0` | 100g, 150g |
| Quantity | `spdata_00_ordqty` | 0.5연 ~ 200연 (201 options!) |
| Count | `OrdCnt` | 1건 ~ 20건 |

#### Post-Processing Options

| Post-Process | Options |
|---|---|
| 재단 (Cutting) | 2등분~7등분재단, 비규격재단 |
| 접지 (Folding) | 2단접지, 3단접지, 4단접지, N접지 |
| 미싱 (Perforation) | 1줄/2줄/3줄; 가로/세로 |

**Key difference from business cards**: Flyers use "연" (ream) for quantity instead of "매" (sheets), and have cutting/folding options instead of foil/embossing.

#### Pricing (Default - 0.5연 A4)

| Item | Amount |
|---|---|
| 인쇄비 | 28,000 원 |
| 할인 | 3,000 원 |
| 부가세 | 2,500 원 |
| **총 결제금액** | **27,500 원** |

#### Shipping Info

| Quantity | Shipping Date |
|---|---|
| 1~10연 | 1박2일 |
| 11~40연 | 2박3일 |
| 40연 이상 | 문의바람 (Contact required) |

---

## Product 4: 무선책자 (Perfect Binding Booklet) - ProdNo 40196

### Option Structure

Expected to have additional options for:
- Cover paper type and weight
- Interior paper type and weight
- Page count (multiple of 4)
- Binding type
- Lamination options

The booklet product uses `pjoin=1` (indicating multi-component assembly) and unit type `부` (copies) instead of `매` (sheets).

From the API spec, booklets have:
- `coverinfo [3]` - 3 cover configuration options
- `ordqty [17]` - 17 quantity tiers
- `paperinfo [3]` - 3 paper type groups
- `colorinfo [3]` - 3 color/ink configurations
- `prsjobinfo [5]` - 5 print job information blocks

---

## Product 5: 현수막 (Banner/Signage) - ProdNo 40154

### Expected Differences

Signage products differ significantly from print products:
- Custom size input (width x height in cm/mm)
- Material selection (vinyl, mesh, fabric)
- Finishing options (grommets, hemming, pole pockets)
- Single-sided vs double-sided
- No paper/ink options -- replaced by printing method (solvent, UV, eco-solvent)

---

## Cross-Product UI Pattern Comparison

### Common Elements (All Products)

| Element | Description |
|---|---|
| Category breadcrumb | 2-3 level category selects at top |
| 예상출고일 | Expected shipping date display |
| 접수마감시간 | Order cutoff time |
| 유의사항 | Production notes in red |
| 이지템플릿 | Self-design template access |
| File upload | PDF/AI/EPS upload section |
| Price summary | Right-side sticky panel |
| Delivery tables | 6 delivery method tables |
| Order buttons | Cart + Order |

### Variable Elements by Product

| Element | Business Card | Sticker | Flyer | Booklet | Banner |
|---|---|---|---|---|---|
| Category levels | 2 | 3 | 2 | 2-3 | 2 |
| Unit type | 매 (sheets) | 매 | 연 (reams) | 부 (copies) | m/개 |
| Size selects | 4 options | 8 options | 14 options | Variable | Custom input |
| Paper selects | 2 type + 2 weight | Variable | 1 type + 2 weight | Cover+Interior | Material |
| Post-processing | 8 types | Variable | 3 types | Lamination | Finishing |
| Accessories | 3 groups | Variable | Few/none | Few/none | Stands/poles |
| Quantity range | 500~100,000 | Variable | 0.5~200연 | 10~5,000 | 1~100 |
| Select count | 28 | 4 (landing) | 13 | ~15-20 | ~10-15 |
| Hidden fields | 399 | 98 (landing) | 412 | ~300-400 | ~200-300 |

### Price Update Trigger Chain

```
User changes option
  -> onchange handler fires (chgMdmData / chgSelBoxJob / reqMdmDetail)
  -> AJAX POST to /ordr/prod/mdm/detail/{Type}
  -> Server returns updated dependent options
  -> JS updates dependent select dropdowns
  -> fnOrdSummary() called
  -> AJAX POST to /ord/calc/jobcost0
  -> Server returns price breakdown
  -> JS updates price display elements (od_00_prscost, od_00_awkcost, etc.)
  -> Total recalculated and displayed in od_00_totalcost
```

### Form Submission Flow

```
User clicks "주문하기"
  -> preFlightFileForm('ordr', 'Y') called
  -> isValidParamsOrd() validates all selections
  -> addCompCheck() checks completeness
  -> firstOrderCheck() verifies first-time order conditions
  -> File validation (if uploaded)
  -> processFileStep() processes file
  -> Form submitted with all hidden fields + select values
  -> Redirect to payment/checkout page (requires login)
```

---

## Screenshots Reference

| File | Description |
|---|---|
| `clean-main-page.png` | WowPress main page (popup dismissed) |
| `clean-1-일반명함-top.png` | Business card page - top section |
| `clean-1-일반명함-form.png` | Business card page - order form area |
| `clean-1-일반명함-options.png` | Business card page - option details |
| `clean-1-일반명함-price.png` | Business card page - price/post-processing |
| `clean-1-일반명함-delivery.png` | Business card page - delivery options |
| `clean-1-일반명함-upload.png` | Business card page - file upload |
| `clean-1-일반명함-full.png` | Business card page - full page |
| `clean-2-사각스티커-*.png` | Sticker page screenshots |
| `clean-3-합판전단-*.png` | Flyer page screenshots |
| `clean-4-무선책자-*.png` | Booklet page screenshots |
| `clean-5-현수막-*.png` | Banner page screenshots |
| `clean-cat-01~06-*.png` | Category listing pages |
| `10-wowpress-main-*.png` | Main page (with popup) |
| `12-product-2.png` | New products listing grid |

---

## Data Files Reference

| File | Description |
|---|---|
| `landing-products.json` | Complete product catalog (17 categories, 110+ products) |
| `product-grid.json` | Product grid onclick handlers (654 entries) |
| `prod-N-NAME-detail.json` | Detailed form extraction per product |
| `prod-N-NAME.html` | Full HTML source per product page |
| `prod-N-xhr.json` | AJAX calls captured per product |
| `all-product-xhr.json` | Complete XHR log |
| `wowpress-main-data.json` | Main page structure data |
| `category-product-structure.json` | Category page HTML structure |
| `mega-menu.json` | Navigation menu data |
| `wowpress-api-document.txt` | Full API documentation (ref/) |
| `products_spec_v1.0.pdf` | Product spec document (ref/) |
| `price_order_spec_v1.01.pdf` | Price/order spec document (ref/) |
