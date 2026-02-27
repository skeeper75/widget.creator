# Shopby API Mapping Documentation

| Field | Value |
|-------|-------|
| Document ID | SHOPBY-API-MAPPING |
| Version | 2.1.0 |
| Created | 2026-02-23 |
| Status | Active |
| Related SPEC | SPEC-SHOPBY-001, SPEC-SHOPBY-002 |

---

## 1. API Endpoint Mapping

### 1.1 Shop API Endpoints (Customer-Facing)

| Domain | Endpoint | Method | Purpose | Widget Creator Usage |
|--------|----------|--------|---------|---------------------|
| **Auth** | `/auth/token` | POST | OAuth 2.0 login | Customer authentication |
| | `/auth/token/refresh` | POST | Refresh access token | Auto-refresh (5 min before expiry) |
| | `/auth/social/{provider}` | GET | Social login (Naver, Kakao, Google, Apple) | Social login support |
| | `/auth/logout` | POST | Logout | Session termination |
| **Products** | `/products` | GET | Product list with pagination | Product catalog browsing |
| | `/products/{productNo}` | GET | Product detail + extraJson | Widget initialization data |
| | `/products/{productNo}/options` | GET | Option list (COMBINATION/REQUIRED/STANDARD) | Option mapping validation |
| | `/products/{productNo}/related` | GET | Related products | Cross-sell suggestions |
| | `/products/search` | GET | Product search | Search integration |
| **Categories** | `/product-sections` | GET | Category list | Category navigation |
| | `/product-sections/{sectionNo}` | GET | Category detail | Category page data |
| | `/product-sections/{sectionNo}/products` | GET | Products in category | Category product list |
| **Cart** | `/cart` | GET | Get cart contents | Cart display |
| | `/cart` | POST | Add item to cart | Add to cart with optionInputs |
| | `/cart/{cartNo}` | PUT | Update cart item | Quantity modification |
| | `/cart/{cartNo}` | DELETE | Remove from cart | Item removal |
| | `/cart/clear` | POST | Clear entire cart | Cart reset |
| **Orders** | `/order-sheets` | POST | Create order sheet | Immediate purchase flow |
| | `/order-sheets/{sheetNo}` | GET | Order sheet detail | Order review page |
| | `/order-sheets/{sheetNo}/calculate` | POST | Calculate final price | Price validation (coupon/discount) |
| | `/orders` | GET | Order history | Customer order list |
| | `/orders/{orderNo}` | GET | Order detail | Order tracking |
| **Payments** | `/payments/reserve` | POST | Reserve payment | PG integration start |
| | `/payments/confirm` | POST | Confirm payment | Payment completion |
| | `/payments/{paymentNo}/cancel` | POST | Cancel payment | Refund processing |
| **Storage** | `/storage/temporary-images` | POST | Image upload (max 12MB) | Design file upload |
| **Profile** | `/profile` | GET | Customer profile | User info display |
| | `/profile` | PUT | Update profile | User info update |
| | `/profile/addresses` | GET | Address list | Shipping addresses |

### 1.2 Admin API Endpoints (Management)

| Domain | Endpoint | Method | Purpose | Widget Creator Usage |
|--------|----------|--------|---------|---------------------|
| **Products** | `/products` | GET | Product list (admin) | Product management |
| | `/products` | POST | Create product | Product sync from Huni DB |
| | `/products/{productNo}` | GET | Product detail (admin) | Product verification |
| | `/products/{productNo}` | PUT | Update product | Product update sync |
| | `/products/{productNo}` | DELETE | Delete product | Product removal |
| | `/products/{productNo}/options` | GET | Get options | Option management |
| | `/products/{productNo}/options` | PUT | Update options | Option sync |
| **Orders** | `/orders` | GET | Order list (admin) | Order polling (1 min interval) |
| | `/orders/{orderNo}` | GET | Order detail (admin) | Order processing |
| | `/orders/{orderNo}/status` | PUT | Update order status | MES status sync |
| | `/orders/{orderNo}/delivery` | PUT | Register tracking | Shipping notification |
| | `/orders/{orderNo}/cancel` | POST | Cancel order | Order cancellation |
| **Claims** | `/claims` | GET | Claim list | Return/exchange management |
| | `/claims/{claimNo}` | GET | Claim detail | Claim processing |
| | `/claims` | POST | Create claim | Claim registration |
| **Members** | `/members` | GET | Member list | Customer management |
| | `/members/{memberNo}` | GET | Member detail | Customer info |
| | `/members/{memberNo}` | PUT | Update member | Customer update |
| **Delivery** | `/delivery-templates` | GET | Template list | Delivery policy sync |
| | `/delivery-templates/{templateNo}` | GET | Template detail | Policy verification |
| | `/delivery-templates` | POST | Create template | Policy setup |
| | `/delivery-templates/{templateNo}` | PUT | Update template | Policy update |
| **Categories** | `/categories` | GET | Category list | Category sync |
| | `/categories/{categoryNo}` | GET | Category detail | Category verification |
| | `/categories` | POST | Create category | Category setup |
| | `/categories/{categoryNo}` | PUT | Update category | Category update |
| **Dashboard** | `/dashboard/sales` | GET | Sales statistics | Analytics integration |
| | `/dashboard/orders` | GET | Order statistics | Order analytics |
| | `/dashboard/products` | GET | Product statistics | Product analytics |

### 1.3 Server API Endpoints (Server-to-Server)

| Domain | Endpoint | Method | Purpose | Widget Creator Usage |
|--------|----------|--------|---------|---------------------|
| **Auth** | `/auth/token` | POST | Server token | Backend authentication |
| | `/auth/validate` | POST | Validate token | Token verification |
| **Orders** | `/orders/sync` | POST | Bulk order sync | Batch order processing |
| | `/orders/status-callback` | POST | Status callback | Webhook alternative |
| **Products** | `/products/sync` | POST | Bulk product sync | Batch product registration |
| | `/products/bulk` | POST | Bulk operations | Mass updates |

---

## 2. Data Model Mapping

### 2.1 Core Entity Mapping (Huni DB ↔ Shopby)

| Huni DB Table | Shopby Entity | Mapping Direction | Key Fields |
|---------------|---------------|-------------------|------------|
| `products` | `mallProduct` | Bidirectional | name → productName, shopbyId ↔ mallProductNo |
| `categories` | `category` | Huni → Shopby | code → categoryNo (via mapping table) |
| `product_sizes` | `COMBINATION option 1` | Huni → Shopby | displayName → optionValue |
| `papers` | `COMBINATION option 2` | Huni → Shopby | name + weight → optionValue |
| `print_modes` | `REQUIRED option` | Huni → Shopby | name → optionValue |
| `post_processes` | `STANDARD option` | Huni → Shopby | name → optionValue |
| `fixed_prices` | `optionValue.addPrice` | Huni → Shopby | sellingPrice - basePrice → addPrice |

### 2.2 Option Type Mapping

| Widget Option | Shopby Type | Max Count | Example |
|---------------|-------------|-----------|---------|
| size (규격) | COMBINATION_1 | 1 | "100x150mm", "A4" |
| paper (용지) | COMBINATION_2 | 1 | "스노우지 250g" |
| quantity (수량) | COMBINATION_3 | 1 | "100매", "200매" |
| printType (인쇄방식) | REQUIRED | N | "양면컬러", "단면1도" |
| finishing (후가공) | STANDARD | N | "양면코팅", "오시1줄" |

### 2.3 extraJson Structure (Widget Creator Integration)

```json
{
  "widgetCreator": {
    "version": "1.0.0",
    "huniProductId": 14529,
    "huniCode": "001-0001",
    "productType": "digital-print",
    "pricingModel": "digital-print-calc",
    "orderMethod": "upload",
    "editorEnabled": false,
    "widgetConfig": {
      "options": [
        { "key": "size", "type": "select", "required": true, "shopbyMapping": "COMBINATION_1" },
        { "key": "paper", "type": "select", "required": true, "shopbyMapping": "COMBINATION_2" },
        { "key": "quantity", "type": "number", "required": true, "shopbyMapping": "COMBINATION_3" },
        { "key": "printType", "type": "select", "required": true, "shopbyMapping": "REQUIRED" },
        { "key": "finishing", "type": "multiselect", "required": false, "shopbyMapping": "STANDARD" }
      ],
      "pricing": { "source": "widget", "model": "digital-print-calc", "currency": "KRW", "vatIncluded": true }
    },
    "features": ["fileUpload", "dynamicPricing", "constraintEngine"],
    "mesMapping": { "itemCode": "001-0001", "hasOptions": true }
  }
}
```

### 2.4 optionInputs Structure (Order Data)

```json
[
  { "inputLabel": "디자인 파일 (PDF, AI, PSD)", "inputType": "TEXT", "required": true, "matchingType": "OPTION" },
  { "inputLabel": "인쇄 사양 (자동 입력)", "inputType": "TEXTAREA", "required": true, "matchingType": "OPTION" },
  { "inputLabel": "특수 요청사항", "inputType": "TEXTAREA", "required": false, "matchingType": "OPTION" }
]
```

---

## 3. Authentication Flow

### 3.1 OAuth 2.0 Flow (Shop API)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │     │   Shopby    │     │   Social    │
│  (Widget)   │     │    Auth     │     │   Provider  │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                    │                    │
       │ 1. Social Login    │                    │
       │───────────────────>│                    │
       │                    │ 2. OAuth Redirect  │
       │                    │───────────────────>│
       │                    │                    │
       │                    │ 3. User Authenticates
       │                    │<───────────────────│
       │ 4. Callback (code) │                    │
       │<───────────────────│                    │
       │                    │                    │
       │ 5. Exchange Code   │                    │
       │───────────────────>│                    │
       │                    │                    │
       │ 6. Access + Refresh Tokens               │
       │<───────────────────│                    │
       │                    │                    │
```

**Token Lifecycle:**
- Access Token: 30 minutes (1800 seconds)
- Refresh Token: 1 day (keepLogin=false) or 90 days (keepLogin=true)
- Auto-refresh: 5 minutes before expiry

### 3.2 Admin Token Flow (Admin API)

```
┌─────────────┐     ┌─────────────┐
│   Backend   │     │   Shopby    │
│   Service   │     │   Admin     │
└──────┬──────┘     └──────┬──────┘
       │                    │
       │ 1. Request Token   │
       │   (Partner Secret) │
       │───────────────────>│
       │                    │
       │ 2. Admin Token     │
       │<───────────────────│
       │                    │
       │ 3. API Calls       │
       │   (Bearer Token)   │
       │───────────────────>│
       │                    │
```

### 3.3 Implementation Reference

```typescript
// From auth.ts
const tokenManager = new TokenManager({
  storage: new InMemoryTokenStorage(),
  refreshTokens: async (refreshToken) => {
    const response = await fetch('/auth/token/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
    return response.json();
  },
  refreshBufferSeconds: 300, // 5 minutes
  onTokensRefreshed: (tokens) => console.log('Tokens refreshed'),
  onRefreshError: (error) => console.error('Refresh failed:', error),
});

// Get valid token (auto-refresh if needed)
const accessToken = await tokenManager.getValidToken();
```

---

## 4. API Limitations and Workarounds

### 4.1 Rate Limits

| API Category | TPS | RPM | RPH | Mitigation Strategy |
|--------------|-----|-----|-----|---------------------|
| Shop API | 50 | 1,000 | 30,000 | Client-side caching, lazy loading |
| Admin API | 20 | 500 | 10,000 | Batch operations, queue-based sync |
| Server API | 100 | 2,000 | 50,000 | Bulk endpoints preferred |

### 4.2 Technical Limitations

| Limitation | Impact | Workaround |
|------------|--------|------------|
| **No dynamic pricing** | Cannot calculate print costs in real-time | Widget calculates price, passes via optionInputs |
| **Static addPrice only** | Fixed price per option combination | Pre-calculate all combinations, use lowest as base |
| **No PDF upload** | Design files must go elsewhere | Use AWS S3 with Presigned URLs |
| **Image 12MB limit** | Large files unsupported | S3 for design files, Shopby for product images |
| **No webhook** | Must poll for order updates | 1-minute polling interval, Server API callbacks |
| **3 COMBINATION max** | Complex products exceed limit | Use optionInputs for additional data |

### 4.3 Price Synchronization Strategy

```
Widget Price (Dynamic)           Shopby Price (Static)
─────────────────────           ─────────────────────
Real-time calculation            Fixed addPrice values
Quantity-based tiers             Pre-defined quantity options
Complex finishing costs          Estimated addPrice
──────────────────────────────────────────────────────
Solution:
  1. salePrice = MIN(all combinations)
  2. addPrice = combination_price - salePrice
  3. Widget passes exact price in optionInputs.widgetPrice
  4. Backend validates price difference (< 100 KRW allowed)
```

---

## 5. Customization Points

### 5.1 Identified Customization Areas

| Area | Difficulty | Related SPEC | Description |
|------|------------|--------------|-------------|
| **Aurora Skin** | Medium | SPEC-SHOPBY-003 | React-based frontend customization |
| **External Scripts** | Low | SPEC-SHOPBY-003 | Widget SDK injection via script tags |
| **extraJson Storage** | Low | SPEC-SHOPBY-002 | Store widgetCreator config in mallProduct |
| **optionInputs** | Low | SPEC-SHOPBY-004 | Pass print specification JSON in orders |
| **Admin API** | Medium | SPEC-SHOPBY-006 | Custom order processing workflows |
| **Coupon System** | Medium | SPEC-SHOPBY-004 | Price difference compensation |
| **S3 Integration** | Medium | SPEC-SHOPBY-005 | Large file upload bypass |

### 5.2 Recommended Implementation Order

1. **Phase 1: Core Integration** (SPEC-SHOPBY-002)
   - Product sync with extraJson
   - Option mapping (COMBINATION/REQUIRED/STANDARD)
   - Category synchronization

2. **Phase 2: Widget Embedding** (SPEC-SHOPBY-003)
   - Aurora Skin customization
   - External script injection
   - Widget initialization flow

3. **Phase 3: Order Flow** (SPEC-SHOPBY-004)
   - Order creation with optionInputs
   - Price validation
   - Payment integration

4. **Phase 4: File Handling** (SPEC-SHOPBY-005)
   - S3 Presigned URL generation
   - File validation
   - MES file delivery

5. **Phase 5: Admin Integration** (SPEC-SHOPBY-006)
   - Order polling service
   - Status synchronization
   - MES workflow integration

---

## 6. Technology Direction for SPEC-002~006

### 6.1 SPEC-SHOPBY-002: Product Registration & Options

**Technology Stack:**
- Backend: Node.js + TypeScript + Drizzle ORM
- Validation: Zod schemas (schemas.ts)
- Transformation: mapper.ts functions
- API Client: REST with admin token

**Key Components:**
- `toMallProduct()` - Huni → Shopby transformation
- `buildCombinationOptions()` - Option matrix generation
- `buildExtraJson()` - Widget config serialization
- `buildDefaultOptionInputDefinitions()` - Order input setup

### 6.2 SPEC-SHOPBY-003: Widget SDK Embedding

**Technology Stack:**
- Frontend: React 19 + Shadow DOM
- Build: Vite with external bundle
- Communication: postMessage API

**Key Components:**
- Widget bundle served from CDN
- Aurora Skin script injection point
- extraJson parsing for configuration
- Option API client

### 6.3 SPEC-SHOPBY-004: Order/Payment Integration

**Technology Stack:**
- Backend: REST API + Price Engine
- Validation: Zod + Business rules
- Payment: Shopby PG integration

**Key Components:**
- `buildOptionInputValues()` - Order data preparation
- `parsePrintSpecFromOptionInputs()` - Order processing
- Price validation endpoint
- Order status mapping

### 6.4 SPEC-SHOPBY-005: File Upload

**Technology Stack:**
- Storage: AWS S3
- Security: Presigned URLs (5 min expiry)
- Validation: File type, size, resolution

**Key Components:**
- S3 client configuration
- Presigned URL generation
- File validation service
- MES file delivery

### 6.5 SPEC-SHOPBY-006: Order Processing/Admin

**Technology Stack:**
- Backend: Polling service (1 min interval)
- Integration: Admin API + MES REST
- Notifications: 알림톡 + Email

**Key Components:**
- Order polling service
- `ShopbyOrderStatusType` status mapping
- MES work order creation
- Status notification service

---

## 7. SPEC-SHOPBY-002: Product Registration Pipeline

### 7.1 Registration Flow

The `ProductRegistrationService` orchestrates a 7-step pipeline for each product:

```
┌──────────────────────────────────────────────────────────────┐
│                  ProductRegistrationService                   │
│                                                              │
│  Step 1: Validate Request                                    │
│    └─ Check required fields (huniCode, productName, etc.)    │
│    └─ Verify sizes, papers, quantities, prices are non-empty │
│                                                              │
│  Step 2: Map Category                                        │
│    └─ CategoryService.getCategoryNo(productType)             │
│    └─ Maps product type → category key → Shopby categoryNo   │
│                                                              │
│  Step 3: Generate Option Matrix                              │
│    └─ createPriceLookup(prices) → O(1) hash map              │
│    └─ buildOptionMatrix(sizes, papers, quantities, ...)      │
│    └─ selectRepresentativeCombos() if > 500 combos           │
│                                                              │
│  Step 4: Calculate Prices                                    │
│    └─ buildPriceMap(prices) → salePrice + addPrices          │
│    └─ roundKrwPrice(salePrice) → integer KRW                 │
│                                                              │
│  Step 5: Build mallProduct                                   │
│    └─ toMallProduct(huniProduct, categoryNo, widgetConfig)   │
│    └─ Includes extraJson with widget configuration           │
│                                                              │
│  Step 6: Create Product (Admin API)                          │
│    └─ ShopbyAdminClient.createProduct(mallProduct)           │
│    └─ Returns mallProductNo                                  │
│                                                              │
│  Step 7: Configure Options (Admin API)                       │
│    └─ ShopbyAdminClient.updateProductOptions(productNo, ...) │
│    └─ Sets COMBINATION + REQUIRED + STANDARD options         │
└──────────────────────────────────────────────────────────────┘
```

### 7.2 Option Combination Strategy

Shopby limits COMBINATION entries. The option-generator handles this with a two-phase approach:

**Phase 1: Full Cartesian Product**

```
Total combinations = |sizes| x |papers| x |quantities|

Example (small product):
  3 sizes x 4 papers x 5 quantities = 60 combinations  → All registered

Example (large product):
  8 sizes x 12 papers x 10 quantities = 960 combinations → Exceeds limit
```

**Phase 2: Representative Selection** (when total > 500)

```
┌─────────────────────────────────────────────────┐
│  selectRepresentativeCombos(entries, maxCount)   │
│                                                  │
│  1. Sort all entries by addPrice ascending       │
│     (cheapest first = most popular)              │
│                                                  │
│  2. First pass: Pick 1 entry per unique SIZE     │
│     └─ Ensures every size is represented         │
│                                                  │
│  3. Second pass: Pick 1 entry per unique PAPER   │
│     └─ Ensures every paper is represented        │
│                                                  │
│  4. Third pass: Fill remaining slots             │
│     └─ Cheapest unselected entries first         │
│                                                  │
│  Result: maxCount entries with full coverage     │
│  Default maxCount: 500 (DEFAULT_MAX_COMBINATIONS)│
└─────────────────────────────────────────────────┘
```

**OptionMatrix Output Structure:**

| Field | Type | Description |
|-------|------|-------------|
| `combinations` | `ShopbyCombinationOption[]` | Axis definitions (size, paper, quantity) |
| `combinationEntries` | `OptionCombinationEntry[]` | Flat list of registered combos with addPrice |
| `required` | `ShopbyRequiredOption[]` | Print mode, binding options |
| `standard` | `ShopbyStandardOption[]` | Post-processing options |
| `basePrice` | `number` | Minimum price across all combinations |
| `totalCombinationCount` | `number` | Total before selection |
| `registeredCombinationCount` | `number` | Actual registered count |
| `isRepresentativeSubset` | `boolean` | True if selection was applied |

### 7.3 Price Mapping Algorithm

**addPrice Calculation:**

```
Given: All combination prices from Huni DB pricing tables

Step 1: Find base price (salePrice)
  salePrice = MIN(all sellingPrices across all combinations)

Step 2: Calculate addPrice per combination
  addPrice = sellingPrice - salePrice
  (Always >= 0; the cheapest combination has addPrice = 0)

Step 3: Round to integer
  All prices are KRW (no decimals): roundKrwPrice(price)
```

**Example:**

```
Combinations:
  A4 + Snow 250g + 100qty = 15,000 KRW
  A4 + Snow 250g + 200qty = 22,000 KRW
  B5 + Art  200g + 100qty = 12,000 KRW  ← minimum

salePrice = 12,000 KRW

addPrices:
  A4|Snow250g|100 = 15,000 - 12,000 = 3,000
  A4|Snow250g|200 = 22,000 - 12,000 = 10,000
  B5|Art200g |100 = 12,000 - 12,000 = 0 (base)
```

**Dual Pricing Validation:**

Widget and Shopby calculate prices differently. Tolerance validation ensures consistency:

```
validatePriceTolerance(widgetPrice, shopbyPrice, tolerancePercent=10)

  difference = |widgetPrice - shopbyPrice|
  referencePrice = MAX(widgetPrice, shopbyPrice)
  differencePercent = (difference / referencePrice) * 100

  isValid = differencePercent <= tolerancePercent

  Result: PriceValidationResult {
    isValid, widgetPrice, shopbyPrice,
    difference, differencePercent, tolerancePercent
  }
```

### 7.4 Category Hierarchy

**2-Depth Structure:**

```
인쇄물 (root, depth=1)
├── 명함          (namecard)
├── 스티커/라벨    (sticker)
├── 전단/리플렛    (flyer)
├── 책자/카탈로그   (booklet)
├── 봉투/서류      (envelope)
└── 포스터/배너    (poster)
```

**Product Type → Category Key Mapping:**

| Product Type | Category Key | Shopby Category |
|-------------|-------------|-----------------|
| `namecard` | namecard | 명함 |
| `digital-print` | namecard | 명함 |
| `sticker` | sticker | 스티커/라벨 |
| `label` | sticker | 스티커/라벨 |
| `flyer` | flyer | 전단/리플렛 |
| `leaflet` | flyer | 전단/리플렛 |
| `booklet` | booklet | 책자/카탈로그 |
| `catalog` | booklet | 책자/카탈로그 |
| `envelope` | envelope | 봉투/서류 |
| `document` | envelope | 봉투/서류 |
| `poster` | poster | 포스터/배너 |
| `banner` | poster | 포스터/배너 |

**CategoryService.ensureCategories():**

Automatically creates missing categories in Shopby by:
1. Fetching all existing categories from Shopby Admin API
2. Finding or creating root category (인쇄물, depth=1) by name match
3. Finding or creating each child category by name + parentCategoryNo match
4. Populating the internal categoryMap for subsequent lookups

### 7.5 Batch Registration Process

```
batchRegister(requests[], options?)
│
├── For each request (sequential):
│   ├── Attempt 1: registerProduct(request)
│   │   ├── Success → record result, continue
│   │   └── Failure → retry
│   │
│   ├── Attempt 2: (after 1000ms delay)
│   │   └── registerProduct(request)
│   │
│   ├── Attempt 3: (after 2000ms delay)
│   │   └── registerProduct(request)
│   │
│   ├── Record final result (success or last failure)
│   ├── Call onProgress(completed, total, result) if provided
│   └── Sleep 200ms before next product (rate limiting)
│
└── Return BatchRegistrationResult {
      total, succeeded, failed,
      results[], startedAt, completedAt
    }
```

**Configuration:**

| Parameter | Default | Description |
|-----------|---------|-------------|
| `delayMs` | 200ms | Delay between products (rate limiting) |
| `maxRetries` | 3 | Max attempts per product |
| `continueOnError` | true | Continue batch on individual failures |
| `onProgress` | undefined | Callback for progress tracking |

**Retry Backoff:**

```
Attempt 1: immediate
Attempt 2: 1000ms delay (RETRY_DELAY_MS * 1)
Attempt 3: 2000ms delay (RETRY_DELAY_MS * 2)
```

### 7.6 Error Handling and Retry Strategy

**Three Layers of Resilience in ShopbyAdminClient:**

```
┌───────────────────────────────────────────────────┐
│  Layer 1: Circuit Breaker                         │
│  ├─ Threshold: 5 consecutive failures             │
│  ├─ Cooldown: 60 seconds                          │
│  └─ State: CLOSED → OPEN → HALF_OPEN → CLOSED    │
│                                                   │
│  Layer 2: Retry with Exponential Backoff          │
│  ├─ Max attempts: 3 (RETRY_CONFIGS.productSync)   │
│  ├─ Initial delay: 1000ms                         │
│  ├─ Max delay: 30000ms                            │
│  └─ Retries on: network errors, 5xx, timeout      │
│                                                   │
│  Layer 3: Rate Limiter                            │
│  ├─ Token bucket: 20 TPS                          │
│  ├─ Min interval: 50ms between requests           │
│  └─ 429 handling: Respects Retry-After header     │
└───────────────────────────────────────────────────┘
```

**Error Classification:**

| Error Type | HTTP Status | Action |
|-----------|-------------|--------|
| Rate limited | 429 | Wait Retry-After seconds, then retry |
| Server error | 500-599 | Retry with exponential backoff |
| Client error | 400-499 (not 429) | Fail immediately (no retry) |
| Network error | N/A | Retry with exponential backoff |
| Circuit open | N/A | Fail fast, wait for cooldown |

**ProductRegistrationService Error Handling:**

- Validation errors: Return failure result immediately (no API call)
- Category mapping miss: Return failure result with descriptive error
- API errors: Caught by try/catch, returned as failure result with error message
- Batch mode: Individual failures don't stop the batch (continueOnError=true)

---

## 8. Reference Implementation Files

### 8.1 SPEC-SHOPBY-001 (Foundation)

| File | Purpose | Lines |
|------|---------|-------|
| `types.ts` | TypeScript type definitions | ~780 |
| `schemas.ts` | Zod validation schemas | ~560 |
| `mapper.ts` | Data transformation functions | ~740 |
| `auth.ts` | Authentication token management | ~580 |
| `api-config.ts` | API endpoints and configuration | ~560 |
| `adapter.ts` | ShopbyAdapter with circuit breaker | ~380 |

### 8.2 SPEC-SHOPBY-002 (Product Registration & Options)

| File | Purpose | Key Exports |
|------|---------|-------------|
| `admin-client.ts` | Shopby Admin API client with rate limiting, circuit breaker, retry | `ShopbyAdminClient`, `ShopbyAdminApiError` |
| `option-generator.ts` | Option combination matrix generation with representative selection | `buildOptionMatrix()`, `generateCombinations()`, `selectRepresentativeCombos()`, `createPriceLookup()` |
| `price-mapper.ts` | Sale price calculation and tolerance validation | `calculateSalePrice()`, `validatePriceTolerance()`, `batchValidatePrices()`, `buildPriceMap()` |
| `category-service.ts` | 2-depth category hierarchy management | `CategoryService`, `PRINT_CATEGORY_HIERARCHY` |
| `product-registration.ts` | Full registration pipeline orchestrator | `ProductRegistrationService`, `BatchRegistrationOptions` |

### 8.3 Module Dependency Graph (SPEC-SHOPBY-002)

```
product-registration.ts
├── admin-client.ts
│   ├── auth.ts (AdminTokenManager)
│   ├── api-config.ts (ADMIN_API_ENDPOINTS, RATE_LIMITS)
│   ├── circuit-breaker.ts
│   └── retry.ts
├── option-generator.ts
│   └── mapper.ts (buildCombinationOptions, buildRequired/Standard)
├── price-mapper.ts
│   └── mapper.ts (calculateAddPrice, findMinSellingPrice)
├── category-service.ts
│   └── admin-client.ts (for ensureCategories)
├── mapper.ts (toMallProduct, buildWidgetOptionMapping)
└── types.ts (ProductRegistrationRequest, OptionMatrix, etc.)
```

### 8.4 SPEC-SHOPBY-002 Key Patterns

**Admin Client Resilience:**
- Rate limiter: Token-bucket at 20 TPS (Admin API limit)
- Circuit breaker: 5 failures, 60s cooldown
- Retry: 3 attempts with exponential backoff (1s-30s)
- 429 handling: Respects Retry-After header

**Option Combination Strategy:**
- Full cartesian product: sizes x papers x quantities
- Max 500 combinations (configurable via DEFAULT_MAX_COMBINATIONS)
- Representative selection: ensures coverage per size + paper, fills with cheapest
- addPrice = combinationPrice - basePrice (basePrice = MIN of all prices)

**Batch Registration:**
- Sequential processing with configurable delay (200ms default)
- Max 3 retries per product with linear backoff
- Continue-on-error support
- Progress callback for UI updates

**Category Hierarchy:**
- Root: 인쇄물 (depth 1)
- Children: 명함, 스티커/라벨, 전단/리플렛, 책자/카탈로그, 봉투/서류, 포스터/배너 (depth 2)
- Product type mapping: 12 product types -> 6 category keys

---

## 9. Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-23 | Initial documentation for SPEC-SHOPBY-001 |
| 2.0.0 | 2026-02-23 | Added SPEC-SHOPBY-002 modules: admin-client, option-generator, price-mapper, category-service, product-registration |
| 2.1.0 | 2026-02-23 | Added Section 7: SPEC-SHOPBY-002 operational documentation (registration flow, option strategy, price algorithm, categories, batch process, error handling) |

---

*Generated by MoAI backend-dev agent*
*Reference: SPEC-SHOPBY-001, SPEC-SHOPBY-INTEGRATION-DESIGN*
