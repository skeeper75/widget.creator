# WowPress Print Order UI Analysis

## Site Overview

- **Main site**: https://wowpress.co.kr/
- **Dev shop admin**: https://devshop.wowpress.co.kr/maint (requires authentication)
- **API endpoint**: https://api.wowpress.co.kr/
- **File upload**: https://file.wowpress.co.kr/
- **Tech stack**: jQuery 3.6.0, Bootstrap 5.1.3, Spring-based backend (JSESSIONID), server-rendered HTML with AJAX interactions
- **Authentication**: JWT token-based for API, session-based for web

---

## 1. Site Architecture

### URL Structure

| URL Pattern | Purpose |
|---|---|
| `/ordr/prod/list?cateno=XX` | Category product listing (mega menu, JS-rendered) |
| `/ordr/prod/dets?ProdNo=XXXXX` | Product detail/order page (main order form) |
| `/ordr/prod/newest` | New products listing |
| `/ordr/cart/main` | Shopping cart (requires login) |
| `/mpag/ordm/list` | Order delivery tracking |
| `/self/dsgn/Rslt` | Self-design result page |
| `/cust/lgin/form` | Login page |

### Navigation Structure

The main navigation uses a mega menu triggered by JavaScript hover events. Top-level categories visible in the header bar:

1. **상업인쇄소** (Commercial Print Shop)
2. **힙지로디지털** (Hip-jiro Digital)
3. **책공방** (Book Workshop)
4. **가게용품** (Store Supplies)
5. **문구점** (Stationery Shop)
6. **어패럴** (Apparel)
7. **이벤트** (Events)
8. **신제품** (New Products)

Additional header tools: 이지템플릿 (EasyTemplate), 제작가이드 (Production Guide), 통합주문 (Unified Order), 무료직배송신청 (Free Direct Delivery)

### Product Catalog Structure (from `landingJson`)

17 product categories with 110+ sub-products:

| Category | Product Count | Examples |
|---|---|---|
| 명함 (Business Cards) | 8 | 일반명함, 특수지명함, 디지털명함, 프리미엄명함, 후가공명함 |
| 봉투 (Envelopes) | 3 | 칼라봉투, 마스타봉투, 소량봉투 |
| 스티커 (Stickers) | 10 | 사각스티커, 도무송스티커, 롤스티커, 팬시스티커 |
| 전단 (Flyers) | 3 | 합판전단, 독판전단, 문고리전단 |
| 책자 (Booklets) | 6 | 무선책자, 중철책자, 특가책자, PVC커버노트 |
| 사인제품 (Signage) | 8 | 현수막, 배너, 사각보드, 시트지, 입간판 |
| 홍보물 (Promotional) | 4 | 테이블세팅지, 패키지, 스탠드POP |
| 판촉물 (Novelties) | 24 | 캘린더, 부채, 명찰, 사원증, 떡메모지, 에코백 |
| 포토/액자 (Photo/Frame) | 6 | 캔버스액자, 노프레임액자 |
| 홀더 (Holders) | 5 | 종이홀더, PP홀더 |
| 행택/쿠폰/안내장 | 5 | 행택, 쿠폰, 상품권, 청첩장 |
| 서식류 (Forms) | 10 | 양식지, 영수증, NCR |
| 자석제품 (Magnet) | 4 | 종이자석광고지, 자석스티커 |
| 굿즈/다꾸 (Goods) | 2 | 굿즈, 다꾸 |
| 선거홍보물 (Election) | 8 | 선거공보, 선거벽보, 현수막 |
| 와우기획상품 (Special) | 4 | 인쇄레시피, 명함샘플팩 |
| 부자재 (Accessories) | 0 | (add-on items only) |

---

## 2. Product Order Page Layout

### Overall Page Structure (top to bottom)

1. **Header**: Logo, search bar, login/register, cart, top navigation bar
2. **Breadcrumb**: Home > Category > Sub-category (dropdown selectors: `category1`, `category2`, `category3`)
3. **Product Gallery**: Left side - product image carousel; Right side - product name, description, thumbnail variants
4. **Expected Shipping Date**: Color-coded date display (예상출고일)
5. **Submission Deadline**: Order cutoff times (접수마감시간)
6. **Notices/Warnings**: Important production notes (유의사항)
7. **Easy Template Section**: "이지템플릿" - built-in design template selector
8. **Order Options Table**: Main order configuration form (규격/도수/용지/수량/후가공)
9. **Post-Processing Section**: Expandable sections for each post-processing option
10. **Accessories Section**: Optional add-on products (부자재)
11. **Price Summary Panel**: Real-time price breakdown (fixed position on right side)
12. **File Upload Section**: PDF/AI/EPS file upload area
13. **Delivery Options**: Multiple delivery method tables
14. **Order Buttons**: Cart / Order buttons
15. **Product Detail Content**: Marketing content, production guides, file guides
16. **Reviews Section**: User reviews (이용후기)

### Right-Side Sticky Price Panel

A fixed-position summary panel that stays visible during scrolling:

```
인쇄비 (Print cost):     3,300 원
부자재비 (Accessories):    0 원
후가공비 (Post-process):   0 원
디자인비 (Design):         0 원
할인 (Discount):           0 원
부가세 (VAT):            330 원
─────────────────────────
총 결제금액:           3,630 원
```

Includes "장바구니" (Cart) and "주문하기" (Order) buttons.

---

## 3. Option Selection UI Patterns

### Selection Flow

The order options follow a **cascading dependency** model where each selection affects subsequent available options:

```
Category -> Sub-product -> Size -> Color (도수) -> Paper -> Paper Weight -> Quantity -> Count -> Post-processing
```

### Form Element Types

#### SELECT Dropdowns (Primary UI Pattern)

All major options use `<select>` dropdowns with `onchange` handlers that trigger AJAX calls:

| Option | Field Name | onchange Handler | Example Values |
|---|---|---|---|
| Category 1 | `category1` | Page navigation | 명함, 스티커, 책자, 전단... (23 options) |
| Category 2 | `category2` | Page navigation | Sub-products per category |
| Category 3 | `category3` | Page navigation | Further sub-categories (when applicable) |
| Size | `SizeNo` | `reqMdmDetail('Size',...)` | 90x50, 50x90, 86x52, 비규격 |
| Color/Ink | `ColorNo` | `chgMdmData(this)` | 단면 칼라4도, 양면 칼라8도 |
| Paper Type | `sPaper0` | `chgSelBoxJob(this,...,'Paper',...)` | 스노우지(무광코팅), 아트지 |
| Paper Weight | `sPaper0` | `chgSelBoxJob(this,...,'Paper',...)` | 219g, 250g |
| Quantity | `spdata_00_ordqty` | `fnOrdSummary()` | 500매, 1000매, 2000매... |
| Count | `OrdCnt` | `fnOrdSummary()` | 1건, 2건, 3건... |

#### Post-Processing Selects (후가공)

Each post-processing type has TWO linked dropdowns -- one for type/count and one for detail:

| Post-Process | Field | Options |
|---|---|---|
| 오시 (Creasing) | `sJob0` | Count: 1줄/2줄/3줄; Direction: 가로/가로중앙/세로/세로중앙 |
| 미싱 (Perforation) | `sJob0` | Count: 1줄/2줄/3줄; Direction: 가로/가로중앙/세로/세로중앙 |
| 타공 (Hole punch) | `sJob0` | Count: 1개/2개/3개; Size: 3mm/4mm/5mm/6mm/7mm/8mm |
| 라운딩 (Rounding) | `sJob0` | 부분라운딩/전체라운딩 |
| 넘버링 (Numbering) | `sJob0` | 1개/2개 |
| 박(앞면) (Foil front) | `sJob0` | Material: 금박유광/금박무광/은박유광/은박무광/적박...; Size: 15mm이하/30mm이하/70mm이하/90mm미만 |
| 박(뒷면) (Foil back) | `sJob0` | Same as front foil |
| 형압 (Embossing) | `sJob0` | 15mm이하/30mm이하/70mm이하/90mm미만 |
| 재단 (Cutting) | `sJob0` | 2등분~7등분재단, 비규격재단 |
| 접지 (Folding) | `sJob0` | 2단접지/3단접지/4단접지/N접지 |

#### Radio Buttons

Limited use -- primarily for "인쇄선택" (Print selection preset) with a single `preset` radio group.

#### Hidden Fields (Critical for Order Submission)

Each product page contains 100-400+ hidden fields that encode the complete order state:

- `ProdNo` - Product number
- `ordType` - Order type (e.g., "selfDsn")
- `hdata_00_sizeno` - Selected size internal ID
- `pdata_00_paperno` - Selected paper internal ID
- `pdata_00_awk*` - Post-processing selection IDs
- `_csrf` - CSRF token
- `partner`, `domain` - Partner identification

### Conditional Option Behavior

Options cascade through AJAX calls:

1. **Size change** -> triggers `reqMdmDetail('Size', value, '0', 'hdata_00_sizeno')` -> AJAX to `/ordr/prod/mdm/detail/Size` -> updates Paper and other dependent options
2. **Color change** -> triggers `chgMdmData(this)` -> updates paper options
3. **Paper change** -> triggers `chgSelBoxJob(this, ..., 'Paper', ...)` -> AJAX to `/ordr/prod/mdm/detail/Paper` -> updates post-processing options and recalculates price
4. **Quantity/Count change** -> triggers `fnOrdSummary()` -> recalculates total price
5. **Post-processing change** -> triggers `chgSelBoxJob(this, ..., 'Job', ...)` -> updates price

### Constraint Visualization

- **Disabled options**: `<option disabled>` in select dropdowns
- **Hidden sections**: Post-processing sections shown/hidden via display toggling based on product capabilities
- **Warning messages**: Red text notices for production constraints
- **Dynamic validation**: JS functions like `isValidParams()`, `isAwk()`, `func_awkvalid()` validate selections before order submission

---

## 4. Price Update Mechanism

### Real-Time Price Calculation

Price updates happen **automatically** via AJAX whenever relevant options change:

**AJAX Endpoints for Pricing:**

| Endpoint | Method | Purpose |
|---|---|---|
| `/ord/calc/jobcost0` | POST | Calculate job cost based on current selections |
| `/ord/calc/jobqty0` | POST | Calculate quantity-based pricing |
| `/ordr/prod/mdm/detail/Size` | POST | Get size-dependent data |
| `/ordr/prod/mdm/detail/Paper` | POST | Get paper-dependent data |
| `/self/dsgn/getproduct` | POST | Get product configuration data |

**Price Breakdown Display (CSS Classes):**

| Element | CSS Class/ID | Content |
|---|---|---|
| Print cost | `od_00_prscost` | Base printing fee |
| Accessories | `od_00_prodaddcost` | Add-on product fees |
| Post-processing | `od_00_awkcost` | Post-processing fees |
| Design fee | `od_00_dsgncost` | Template/design fees |
| Discount | `od_00_dccost` | Applied discounts |
| VAT | `od_00_taxcost` | Tax amount |
| Total | `od_00_totalcost` | Final total |

**Key JS Functions:**
- `fnOrdSummary()` - Main price recalculation trigger
- `getJobCost()` - Fetch job cost from server
- `getCalcVSJobCost()` - Calculate variant/size-based cost
- `calcParams()` - Build calculation parameters
- `chkcalcParams()` - Validate calculation inputs

---

## 5. File Upload Interface

### Upload Methods

1. **PDF File Upload**: Primary method via `fileForm('next')` button
2. **Self-Design (이지템플릿)**: Built-in template editor accessed via `getTemplateBtn()`
3. **Pre-flight Check**: `preFlightFileForm('ordr','Y')` validates files before ordering

### Upload UI Components (CSS Classes)

| Class | Purpose |
|---|---|
| `file_uc_box` | Main upload container |
| `file_uc_left` / `file_uc_right` | Two-column layout |
| `file_uc_pdf_info` | PDF file information display |
| `file_uc_pdf_images` | PDF page preview thumbnails |
| `file_uc_pdf_info_sizenm` | Detected page size |
| `file_uc_pdf_info_pages` | Page count |
| `file_uc_comt_succ` | Success message |
| `file_uc_comt_fail` | Failure message |
| `file_uc_errlog_info` | Error log details |
| `file_uct_check_result` | File check results |
| `file_uct_select` | File type selection |

### File Workflow Buttons

- **PDF파일 업로드**: `fileForm('next')` - Upload PDF
- **장바구니**: `preFlightFileForm('cart','Y')` or `fileForm('cart')` - Add to cart
- **주문하기**: `preFlightFileForm('ordr','Y')` or `fileForm('ordr')` - Place order
- **재업로드 및 초기화**: `preflightInit()` - Reset upload
- **견적서출력**: `callEstimate()` - Print estimate

Hidden fields related to file upload:
- `jpgFront` / `jpgBack` - Front/back page indicators
- `side` - Number of sides
- `pdf` - PDF file reference
- `imageList` - Uploaded image list
- `ordType` = `selfDsn` - Self-design order type

---

## 6. Delivery Options Display

Delivery options are displayed as a series of separate tables, each with the same 3-column structure:

| Delivery Type | Korean | Fee Column | Notes Column |
|---|---|---|---|
| 배쑝와쑝 | Bundle delivery | Varies | Special WowPress bundle shipping |
| 택배송 | Standard parcel | Varies | Standard courier delivery |
| 대리배송 | Agent delivery | Varies | Third-party delivery |
| 방문수령 | Store pickup | Free | Pick up at WowPress |
| 퀵배송 | Express courier | Premium | Same-day express |
| 기타배송 | Other | Varies | Special arrangements |

Each table has 3 rows with headers: [Delivery Type] | 배송비 (Fee) | 유의사항 (Notes)

CSS class: `delivery_info`

---

## 7. Responsive Design Patterns

### Fixed Width Layout

The site uses a **fixed-width layout at 1400px** with horizontal scrolling fallback:
```javascript
if(window_width < 1400){
    var val_body = (1400 - window_width) / 2 + 160;
    $('html, body').animate({scrollLeft : val_body}, 300);
}
```

### Mobile Considerations

- Separate mobile detection via cookies (`setCookieMobile`, `getCookieMobile`)
- Device type tracking: `W` (Homepage), `M` (Mobile), `B` (Application)
- The site is NOT fully responsive - it relies on a fixed desktop layout with mobile-specific redirects

### Sticky Elements

- Top notification banner (pink bar with promotion)
- Right-side utility buttons (WOW멤버십, 배송서비스, 전화번호안내, 함께캠페인, 쿠폰, 핵심가치)
- AI chatbot widget (bottom-right)
- YouTube video embed (sticky/floating)

---

## 8. Key JavaScript Functions Reference

### Product Page Core Functions

| Function | Purpose |
|---|---|
| `chgCtgr()` | Change category navigation |
| `chgMdmData(this)` | Update master data on option change |
| `reqMdmDetail(type, value, idx, target)` | Request master data detail via AJAX |
| `chgSelBoxJob(el, target, type, idx, level)` | Change select box for job options |
| `fnOrdSummary()` | Recalculate and display order summary |
| `getJobCost()` | Fetch job cost from server |
| `calcParams()` | Build calculation parameters |
| `isValidParams()` | Validate all form parameters |
| `isValidParamsOrd()` | Validate order parameters |
| `fileForm(action)` | Handle file upload form submission |
| `preFlightFileForm(action, flag)` | Pre-flight file validation |
| `preflightInit()` | Reset pre-flight state |
| `callEstimate()` | Generate price estimate |
| `processFileStep()` | Process file upload step |
| `getNonStdSize()` | Handle non-standard size input |
| `getSelfDsgnSize()` | Get self-design template sizes |
| `selfDsgnColor()` | Handle self-design color options |
| `initProdAdd()` | Initialize accessory products |
| `fun_prodadd_option(idx, el)` | Handle accessory option changes |
| `fun_prodadd_qty()` | Handle accessory quantity changes |
| `chgExitDay()` | Update expected shipping date |
| `setAwk31000()` | Set special post-processing options |
| `func_awkvalid()` | Validate post-processing selections |
| `movePage(url, target)` | Navigate to page |

### AJAX Communication Pattern

All AJAX calls use jQuery with CSRF token:
```
$.ajaxSetup({
    beforeSend: function(xhr) {
        xhr.setRequestHeader('X-CSRF-TOKEN', csrfToken);
    }
});
```

---

## 9. API Integration Points

### Internal AJAX Endpoints (wowpress.co.kr)

| Endpoint | Method | Purpose |
|---|---|---|
| `/self/dsgn/getproduct` | POST | Get product template data |
| `/ordr/prod/mdm/detail/Size` | POST | Get size-dependent options |
| `/ordr/prod/mdm/detail/Paper` | POST | Get paper-dependent options |
| `/ord/calc/jobcost0` | POST | Calculate order cost |
| `/ord/calc/jobqty0` | POST | Calculate quantity pricing |
| `/main/notc` | POST | Get notifications |
| `/api/chatbot/key` | POST | Chatbot authentication |
| `/userloginajx` | POST | Login (devshop) |

### External Open API (api.wowpress.co.kr)

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/login/issue` | POST | JWT token issuance |
| `/api/v1/std/prodlist` | GET | Product list |
| `/api/v1/std/prod_info/{prodno}` | GET | Product detail info |
| `/api/v1/std/prod` | GET | Product basic info |
| `/api/v1/std/size` | GET | Product sizes |
| `/api/v1/std/color` | GET | Product colors |
| `/api/v1/std/paper` | GET | Product paper types |
| `/api/v1/std/qty` | GET | Product quantities |
| `/api/v1/std/cnt` | GET | Product counts |
| `/api/v1/ord/cjson_jobcost` | POST | Price calculation |
| `/api/v1/ord/cjson_order` | POST | Place order |
| `/api/v1/file/upload` | POST | File upload |
| `/api/v1/ord/ord_list` | GET | Order list |

---

## 10. Key Observations for Widget Creator

### Design Patterns to Replicate

1. **Cascading select dropdowns**: Every option change triggers dependent option updates via AJAX
2. **Real-time pricing**: Price recalculates automatically on any option change
3. **Two-level post-processing selects**: Each post-processing type has count + detail selections
4. **Sticky price summary**: Always-visible price breakdown on the right side
5. **File upload with pre-flight check**: Validate files before allowing order submission
6. **Multiple delivery option tables**: Each displayed in its own section

### Technical Constraints

1. The site uses **server-side rendering** with jQuery AJAX for dynamic updates
2. **No SPA framework** -- traditional form-based with progressive enhancement
3. **Hidden fields carry state** -- hundreds of hidden inputs maintain selection state
4. **CSRF protection** required on all POST requests
5. **Option constraints** (req_* and rst_*) in the product spec JSON control which combinations are valid

### Data Model (from API Spec)

Product detail JSON contains these key info blocks:
- `coverinfo` - Cover configuration (front/back pages)
- `ordqty` - Available order quantities
- `sizeinfo` - Available sizes with constraints
- `paperinfo` - Available paper types with constraints
- `colorinfo` - Available ink/color options with constraints
- `optioninfo` - Additional options
- `prsjobinfo` - Print job information
- `awkjobinfo` - Post-processing information with multi-level selection types
- `deliverinfo` - Delivery options
- `prodaddinfo` - Accessory/add-on products

### Constraint System

The spec defines two constraint types per option:
- `req_*` (required): Defines prerequisite selections that MUST exist
- `rst_*` (restricted): Defines combinations that are PROHIBITED

Display types for option UI:
- `radio (must 1)`: Exactly one must be selected
- `check (N > 0)`: Zero or more can be selected
- `select (N <= 1)`: At most one can be selected
