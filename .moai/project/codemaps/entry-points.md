# Widget Creator - Entry Points and API Reference

**Last Updated:** 2026-02-27

## REST API Endpoints

### Quote Calculation API

**Endpoint:** `POST /api/v1/pricing/quote`

**Location:** `apps/web/app/api/v1/pricing/quote/route.ts`

**Purpose:** Unified quote calculation with constraints + pricing

**Request:**
```json
{
  "productId": "prod-123",
  "widgetId": "widget-456",
  "selections": {
    "color": "red",
    "size": "A4",
    "quantity": 100
  },
  "quantity": 100,
  "unit": "piece"
}
```

**Response:**
```json
{
  "quoteId": "quote-789",
  "expiresAt": "2025-03-01T12:00:00Z",
  "pricing": {
    "baseCost": 10000,
    "unitPrice": 100,
    "totalPrice": 10000,
    "breakdown": {
      "base": 10000,
      "color_premium": 500,
      "finish": 1000
    }
  },
  "applicableConstraints": [
    {
      "id": "constraint-1",
      "description": "A4 size required minimum 100 units"
    }
  ],
  "validSelections": {
    "finish": ["lamination", "binding"],
    "color": ["red", "blue"]
  }
}
```

**SLA:** 300ms (99th percentile)

**Caching:** Redis, 1 hour TTL

**Auth:** Public

---

### Order Creation API

**Endpoint:** `POST /api/v1/orders`

**Location:** `apps/web/app/api/v1/orders/route.ts`

**Purpose:** Create order with price snapshot and MES dispatch

**Request:**
```json
{
  "quoteId": "quote-789",
  "productId": "prod-123",
  "selections": {
    "color": "red",
    "size": "A4",
    "finish": "lamination"
  },
  "quantity": 100,
  "designUrl": "https://cdn.example.com/design.pdf",
  "customerInfo": {
    "name": "Kim Min-jun",
    "email": "min@example.com",
    "phone": "+82-10-1234-5678"
  },
  "shippingAddress": {
    "street": "123 Gangnam-ro",
    "city": "Seoul",
    "postalCode": "06000"
  }
}
```

**Response:**
```json
{
  "orderId": "ord-abc123",
  "orderCode": "ORD-2026-001234",
  "status": "dispatched",
  "priceSnapshot": {
    "unitPrice": 100,
    "totalPrice": 10000,
    "appliedConstraints": [],
    "breakdown": {}
  },
  "estimatedDelivery": "2026-03-07T00:00:00Z",
  "mesOrderId": "MES-2026-001234"
}
```

**Features:**
- Quote validation
- Price immutability (snapshot at creation time)
- MES auto-dispatch
- ShopBy synchronization

**SLA:** 1-2 seconds

**Auth:** Public (but IP-based rate limiting)

---

### Product Catalog APIs

**Endpoint:** `GET /api/v1/catalog/products`

**Query Parameters:**
- `categoryId` (optional) - Filter by category
- `search` (optional) - Full-text search
- `limit` (optional, default: 20)
- `offset` (optional, default: 0)

**Response:**
```json
{
  "items": [
    {
      "id": "prod-123",
      "name": "Business Card",
      "imageUrl": "https://...",
      "basePrice": 10000,
      "minQuantity": 100,
      "category": { "id": "cat-1", "name": "Cards" }
    }
  ],
  "total": 156,
  "hasMore": true
}
```

**Sub-endpoints:**
- `GET /api/v1/catalog/products/:id` - Product detail
- `GET /api/v1/catalog/products/:id/options` - Available options
- `GET /api/v1/catalog/products/:id/constraints` - Business rules
- `GET /api/v1/catalog/products/:id/materials` - Available materials

**Cache:** 1 hour TTL

---

### Widget Configuration API

**Endpoint:** `GET /api/widget/config/:widgetId`

**Location:** `apps/web/app/api/widget/config/route.ts`

**Purpose:** Load widget customization (theme, options)

**Response:**
```json
{
  "id": "widget-123",
  "name": "Business Card Widget",
  "productId": "prod-456",
  "theme": {
    "primaryColor": "#FF0000",
    "backgroundColor": "#FFFFFF",
    "borderRadius": 8
  },
  "options": {
    "showQuantitySlider": true,
    "showPricePreview": true,
    "allowDesignUpload": true,
    "currencyCode": "KRW"
  }
}
```

**Cache:** 24 hour TTL

---

### Widget Embed Script

**Endpoint:** `GET /api/widget/embed.js`

**Location:** `apps/web/app/api/widget/embed.js/route.ts`

**Purpose:** Load embeddable widget bundle

**Response:** JavaScript IIFE (~50KB gzipped)

**Usage:**
```html
<script src="https://app.huni.kr/api/widget/embed.js"></script>
<script>
  window.WidgetCreator.init({
    widgetId: 'widget-123',
    containerId: 'huni-widget',
    productId: 'prod-456',
    onQuoteChange: (quote) => console.log(quote),
    onOrderCreate: (order) => console.log(order)
  });
</script>
```

---

### Integration APIs

#### Shopby Integration
- `GET /api/v1/integration/shopby/categories` - Category mapping
- `POST /api/v1/integration/shopby/products` - Product import
- `POST /api/v1/integration/shopby/orders` - Order webhook

#### MES Integration
- `GET /api/v1/integration/mes/items` - Item listing
- `POST /api/v1/integration/mes/orders/:id/dispatch` - Order dispatch
- `PUT /api/v1/integration/mes/orders/:id/status` - Status webhook

#### Edicus Integration
- `GET /api/v1/integration/edicus/designs/:id` - Render thumbnail
- `POST /api/v1/integration/edicus/products` - Product config

---

## tRPC API Routers (32 Total)

All tRPC routes require NextAuth authentication (except public marketplace queries).

### Product Router
**Location:** `apps/web/app/api/trpc/routers/product.router.ts`

Procedures:
- `list()` - Get all products (paginated)
- `get(id)` - Get product details
- `create(input)` - Create new product
- `update(id, input)` - Update product
- `delete(id)` - Soft delete
- `archive(id)` - Archive for hiding

**Usage in Admin:**
```typescript
const products = await trpc.product.list.useQuery({ limit: 20 });
```

---

### Category Router
**Location:** `apps/web/app/api/trpc/routers/category.router.ts`

Procedures:
- `list()` - Get all categories
- `get(id)` - Category detail
- `create(input)` - New category
- `update(id, input)` - Update
- `delete(id)` - Delete

---

### Option Router
**Location:** `apps/web/app/api/trpc/routers/option.router.ts`

Procedures:
- `listByProduct(productId)` - Options for product
- `create(input)` - New option (color, size, etc.)
- `addChoice(optionId, choice)` - Add choice value (red, blue, etc.)

**Example:**
- Option "Color" → Choices ["Red", "Blue", "Green"]
- Option "Size" → Choices ["A4", "A3", "B4"]

---

### Material & Paper Routers
**Material Router:** `apps/web/app/api/trpc/routers/material.router.ts`
- Paper types (coated, art, glossy)

**Paper Router:** `apps/web/app/api/trpc/routers/paper.router.ts`
- Individual paper specifications
- Uses PaperForm component for editing

---

### Pricing Routers (5 total)
- `priceTier.router.ts` - Volume discounts (1-10: 1000won, 11-50: 900won)
- `fixedPrice.router.ts` - Option surcharges (gold foil: +500won)
- `priceTable.router.ts` - Complex price matrices
- `packagePrice.router.ts` - Bundle pricing
- `foilPrice.router.ts` - Special material costs

---

### Constraint Routers
**Constraint Router:** `apps/web/app/api/trpc/routers/constraint.router.ts`
- `listByProduct(productId)`
- `create(input)` - Define business rules
- `update(id, input)`
- `delete(id)`

**Example Rule:** "If quantity > 100 AND size=A3, then paper >= 350g"

**Dependency Router:** `apps/web/app/api/trpc/routers/dependency.router.ts`
- Option interdependencies
- "Option A requires Option B"

---

### Order Router
**Location:** `apps/web/app/api/trpc/routers/order.router.ts`

Procedures:
- `list()` - Get orders with filters
- `get(id)` - Order detail
- `getTimeline(id)` - Status history (created → MES → completed)
- `cancel(id)` - Cancel order
- `updateStatus(id, status)` - Manual status change

---

### Dashboard Router
**Location:** `apps/web/app/api/trpc/routers/dashboard.router.ts`

Procedures:
- `getStats()` - KPIs (orders, revenue, top products)
- `getRecentOrders()` - Last 10 orders
- `getProductPerformance()` - Sales by product

---

### Widget Admin Router (SPEC-WA-001)
**Location:** `apps/web/app/api/trpc/routers/widget-admin.router.ts`

5-step configuration wizard:
1. Dashboard - Stats + filters
2. Widget editor - Configuration
3. Pricing rules - Rule builder
4. Constraint builder - Visual rule editor
5. Simulation & publish - Test + deploy

---

### GLM Router (SPEC-WB-007)
**Location:** `apps/web/app/api/trpc/routers/glm.router.ts`

Natural Language Rule Builder:
- `convertNLToConstraint(text)` - NL → constraint JSON
- `convertNLToPricing(text)` - NL → pricing rule
- `listHistory()` - Conversion history

**Integration:** OpenAI GPT-4

---

## Client Entry Points

### Admin Dashboard
**URL:** `http://localhost:3001`

**Routes:**
- `/products` - Product CRUD
- `/categories` - Category management
- `/materials/papers` - Paper management
- `/prices/price-tiers` - Pricing setup
- `/constraints` - Rule builder
- `/orders` - Order viewing
- `/widget-admin` - Widget configuration
- `/dashboard` - Statistics

**Authentication:** NextAuth (required)

---

### Widget SDK
**Entry Point:** `packages/widget/src/index.tsx`

**Initialization:**
```typescript
window.WidgetCreator.init({
  widgetId: string,
  containerId: string,
  productId: string,
  onQuoteChange?: (quote: Quote) => void,
  onOrderCreate?: (order: Order) => void
})
```

**Features:**
- Multi-step flow (options → finish → confirm)
- Real-time price updates
- File upload support
- Shadow DOM isolation

---

## CLI Entry Points

### Database Management
```bash
pnpm db:generate    # Schema → migrations
pnpm db:push       # Apply migrations
pnpm db:migrate    # Run migrations
pnpm db:studio     # Drizzle Studio (UI)
pnpm db:import     # Seed data
```

### Build and Development
```bash
pnpm dev           # Start dev servers
pnpm build         # Production build
pnpm test          # Run tests
pnpm lint          # Lint check
```

---

## Health Check Endpoints

**API Health:**
- `GET /health` - Server status
- `GET /health/db` - Database connectivity
- `GET /health/shopby` - Shopby API status

---

## Environment-Specific URLs

### Development (localhost)
- Main app: `http://localhost:3000`
- Admin: `http://localhost:3001`
- DB Studio: `http://localhost:5555`
- Widget (embedded): Via `embed.js`

### Production
- Domain: `https://app.huni.kr` (example)
- Widget CDN: `https://cdn.huni.kr/widget/embed.iife.js`
- API: `https://api.huni.kr/v1`

---

## Security and Rate Limiting

### Authentication
- All tRPC routes: NextAuth required
- Public REST endpoints: IP-based rate limiting
- Admin routes: Role-based access control

### Rate Limits
- Quote endpoint: 1000 req/min
- Standard endpoints: 100 req/min
- File upload: 10 files/min per user

---

## API Response Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request (validation error) |
| 401 | Unauthorized (auth required) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not found |
| 429 | Rate limit exceeded |
| 500 | Server error |
| 503 | Service unavailable |

---

**See Also:** [overview.md](overview.md), [data-flow.md](data-flow.md), [modules.md](modules.md)
