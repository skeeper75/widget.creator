# Widget Creator - Module Inventory and Descriptions

**Last Updated:** 2026-02-27

## @widget-creator/core (41 TypeScript files)

**Role:** Pure business logic with zero external dependencies

**Characteristics:**
- No NPM dependencies except TypeScript compiler
- Pure functions, no side effects
- Portable across Node.js, Browser, and Workers

**Module Structure:**

### pricing/ (9 files)
- **pricing-engine.ts** - Main orchestrator for price calculations
- **fixed-unit.ts** - Simple unit price × quantity model
- **formula-cutting.ts** - Formula-based cutting costs (area × rate)
- **component.ts** - Sum of component-level pricing
- **stepped.ts** - Quantity-based step pricing
- **tiered.ts** - Volume-based tier pricing (1-10: 1000won, 11-50: 900won)
- **package.ts** - Pre-defined package pricing
- **cutting-loss.ts** - Waste calculation for cutting operations
- **types.ts** - PricingModel, PricingResult types

### options/ (6 files)
- **state-machine.ts** - Available → Selected → Configured → Locked
- **cascade-engine.ts** - Propagates selection changes through dependencies
- **dependency-resolver.ts** - Builds dependency graphs, detects cycles
- **option-evaluator.ts** - Checks option availability given current selections
- **validation.ts** - Validates option transitions
- **types.ts** - Option, State, Transition types

### constraints/ (8 files)
- **constraint-engine.ts** - ECA (Event-Condition-Action) pattern evaluator
- **eca-evaluator.ts** - Evaluates Event, Condition, Action clauses
- **handlers/** - Constraint handlers (size, paper, post-process)
- **restriction-parser.ts** - DSL parser for constraint expressions
- **cycle-detector.ts** - Prevents circular constraint definitions
- **merger.ts** - Combines multiple constraint results
- **types.ts** - Constraint, ConstraintResult, Event types

### quote/ (5 files)
- **quote-calculator.ts** - Assembles quotes from pricing + constraints
- **quote-expiration.ts** - Manages quote validity (24h default)
- **quote-snapshot.ts** - Captures immutable quote state
- **quote-hasher.ts** - Generates quote identifiers
- **types.ts** - Quote, QuoteRequest, QuoteResponse types

### simulation/ (5 files)
- **completeness-checker.ts** - Validates all required options set
- **multi-case-sampler.ts** - Generates test cases for pricing
- **publish-workflow.ts** - Manages simulation → production flow
- **simulator.ts** - Runs simulation scenarios
- **types.ts** - Simulation, Case, Result types

### errors.ts
Custom error classes:
- QuoteExpiredError
- ConstraintViolationError
- PricingCalculationError
- ValidationError
- OptionStateError

**Public API:** ~45 functions + 30 types exported via index.ts

**Test Coverage:** 85%+ (characterization + specification tests)

---

## @widget-creator/db (21 Schema Files)

**Role:** Database schema and migrations using Drizzle ORM

**Technology:** Drizzle ORM + PostgreSQL

**Layered Schema Architecture:**

### Layer 01: Element Types (Foundation)
- `element-types.ts` - Base option types (color, size, text, etc.)

### Layer 02: Product Composition
- `product-categories.ts` - Product categorization
- `products.ts` - Core product definitions
- `product-recipes.ts` - Product feature combinations
- `recipe-option-bindings.ts` - Links recipes to available options
- `recipe-choice-restrictions.ts` - Restricts choices within recipes
- `element-choices.ts` - Specific choice values (e.g., "Red", "Blue")

### Layer 03: Business Rules
- `constraint-templates.ts` - Reusable constraint definitions
- `recipe-constraints.ts` - Constraints applied to recipes
- `constraint-nl-history.ts` - Natural language rule conversion history
- `addon-groups.ts` - Optional add-on groupings
- `addon-group-items.ts` - Individual add-on items

### Layer 04: Pricing Configuration
- `product-price-configs.ts` - Pricing model assignments
- `print-cost-base.ts` - Base printing costs
- `postprocess-cost.ts` - Post-processing costs
- `qty-discount.ts` - Quantity-based discount rules
- `price-nl-history.ts` - Natural language pricing history

### Layer 05: Workflows
- `simulation-runs.ts` - Test simulation sessions
- `simulation-cases.ts` - Individual test cases
- `publish-history.ts` - Publication audit trail

### Layer 06: Transactions
- `orders.ts` - Order records

**Total Tables:** ~26 tables with full relationship definitions

**Entry Point:** `packages/db/src/index.ts` exports all tables + seed utilities

---

## @widget-creator/shared (40+ Files)

**Role:** Data access layer + external system adapters + shared types

**Technology:** Drizzle ORM, Zod, PostgreSQL driver

### db/ Directory
- **db/index.ts** - Database client initialization
- **db/schema/** - All schema files (imports from @widget-creator/db)

### integration/ Directory

#### MES Adapter
- **adapter.ts** - Main MES integration interface
- **api-client.ts** - HTTP client with circuit breaker
- **mapper.ts** - huni_orders → MES format conversion
- **dispatcher.ts** - Order transmission logic
- **types.ts** - MES request/response types
- **__tests__/** - Integration tests

#### ShopBy Adapter
- **adapter.ts** - Main ShopBy integration
- **admin-client.ts** - ShopBy Admin API client
- **api-config.ts** - API configuration (circuit breaker, retry)
- **mapper.ts** - huni schema ↔ ShopBy format conversion
- **category-service.ts** - Category synchronization
- **product-registration.ts** - Product creation/update
- **price-mapper.ts** - Price synchronization (±10% tolerance)
- **option-generator.ts** - Auto-generates ShopBy options from recipes
- **types.ts** - ShopBy API types
- **__tests__/** - Integration tests

#### Edicus Adapter
- **adapter.ts** - Edicus design editor integration
- **renderer.ts** - Thumbnail rendering orchestrator
- **types.ts** - Edicus API types
- **__tests__/** - Integration tests

### Additional Modules
- **events/** - Event emitter for async operations
- **parsers/** - Data parsers (ShopBy response parsing)
- **types/** - Shared type definitions across packages
- **schemas/** - Zod validation schemas

**Public API:** Adapter registry + type exports

---

## @widget-creator/pricing-engine (20+ Files)

**Role:** Widget-specific pricing orchestration

**Depends On:** @widget-creator/core, @widget-creator/shared

### Core Files
- **calculator.ts** - Main pricing computation entry point
- **constraints.ts** - Size, paper, print method constraint evaluators
- **restriction-parser.ts** - DSL parser for constraint expressions
- **option-engine.ts** - Option availability calculation
- **delivery-calculator.ts** - Shipping cost estimation

---

## apps/web (50+ Files)

**Role:** Main API server + Widget hosting + tRPC routes

**Technology:** Next.js 15, tRPC 11, NextAuth v5, Drizzle ORM

### API Routes (apps/web/app/api/)

#### v1 REST API
- **v1/pricing/quote/route.ts** - POST unified quote calculation
- **v1/pricing/products/[id]/fixed-prices/route.ts** - GET fixed pricing
- **v1/pricing/products/[id]/price-tiers/route.ts** - GET tier pricing
- **v1/orders/route.ts** - POST order creation
- **v1/catalog/categories/route.ts** - GET product categories
- **v1/catalog/products/route.ts** - GET product listings
- **v1/catalog/products/[id]/options/route.ts** - GET product options

#### Widget API
- **widget/config/[widgetId]/route.ts** - GET widget configuration
- **widget/embed.js/route.ts** - GET embed script (IIFE bundle)

#### Integration Routes
- **v1/integration/shopby/categories/route.ts** - Category sync
- **v1/integration/shopby/products/route.ts** - Product import
- **v1/integration/shopby/orders/route.ts** - Order webhook
- **v1/integration/mes/items/route.ts** - MES item listing
- **v1/integration/mes/orders/[id]/dispatch/route.ts** - Order dispatch
- **v1/integration/mes/orders/[id]/status/route.ts** - Status updates
- **v1/integration/edicus/designs/[id]/route.ts** - Design API

#### tRPC Handler
- **trpc/[...trpc]/route.ts** - tRPC handler entry point

### tRPC Routers (apps/web/app/api/trpc/routers/)

32 total routers organized by domain:

**Product Domain:**
- categories.router.ts
- products.router.ts
- materials.router.ts
- papers.router.ts

**Option Domain:**
- options.router.ts
- option-definitions.router.ts
- option-choices.router.ts
- option-constraints.router.ts
- option-dependencies.router.ts

**Pricing Domain:**
- price-tables.router.ts
- price-tiers.router.ts
- fixed-prices.router.ts
- package-prices.router.ts
- foil-prices.router.ts
- loss-quantity-configs.router.ts

**Constraint Domain:**
- constraints.router.ts
- dependencies.router.ts

**Process Domain:**
- print-modes.router.ts
- post-processes.router.ts
- bindings.router.ts

**Order Domain:**
- orders.router.ts

**Admin Domain:**
- widget-admin.router.ts
- dashboard.router.ts
- glm.router.ts (Natural Language Rule Builder)

**Integration Domain:**
- mes-items.router.ts
- product-mes-mappings.router.ts
- product-editor-mappings.router.ts
- option-choice-mes-mappings.router.ts
- imposition-rules.router.ts

### Infrastructure
- **app/auth.ts** - NextAuth v5 configuration
- **app/middleware.ts** - Authentication + validation middleware
- **app/api/_lib/middleware/rate-limit.ts** - Rate limiting
- **app/api/_lib/middleware/with-middleware.ts** - Middleware composition
- **app/api/trpc/context.ts** - tRPC context (user, db)
- **app/api/trpc/utils/create-crud-router.ts** - CRUD router factory

---

## apps/admin (60+ Files)

**Role:** Administration dashboard for staff

**Technology:** Next.js 15, React 19, Shadcn/ui, tRPC client

### Page Routes (apps/admin/src/app/(dashboard)/)
- **dashboard/** - Statistics and overview
- **products/** - Product CRUD
- **categories/** - Category management
- **materials/papers/** - Paper/material management
- **options/** - Option and choice management
- **prices/** - Pricing configuration
  - price-tiers/
  - fixed-prices/
  - price-tables/
- **constraints/** - Constraint builder
- **orders/** - Order viewing and management
- **widget-admin/** - Widget configuration (5-step wizard)

### Components (apps/admin/src/components/)
- **forms/** - Input form components
  - paper-form.tsx - Paper creation/editing with Zod validation
  - pricing-form.tsx
  - constraint-form.tsx
- **ui/** - Shadcn/ui component library (buttons, tables, dialogs)
- **layout/** - Sidebar, topbar, breadcrumbs
- **widget-admin/** - Multi-step wizard components
- **glm/** - Natural Language Rule Panel (NL → constraints/pricing)

### Tests (apps/admin/__tests__/)
- **lib/paper-form-schema.test.ts** - Form validation tests
- **e2e/** - End-to-end browser tests

---

## packages/widget (50+ Files)

**Role:** Embeddable cross-origin widget SDK

**Technology:** Preact 10, Vite, @preact/signals, Shadow DOM

### Core Files
- **src/index.tsx** - Widget export + initialization
- **src/embed.ts** - Shadow DOM embedding + lifecycle
- **src/app.tsx** - Root component

### Components (src/components/)
- **FinishSection.tsx** - Finishing options (lamination, binding)
- **SizeSelector.tsx** - Size/dimension selection
- **PaperSelect.tsx** - Paper/material dropdown
- **UploadActions.tsx** - Design file upload
- **QuantitySlider.tsx** - Quantity selection with slider
- **PriceSummary.tsx** - Real-time price display
- **ColorChipGroup.tsx** - Color chip selection group
- **ImageChipGroup.tsx** - Image/pattern selection
- **DualInput.tsx** - Width/height input pair
- **NumberInput.tsx** - Numeric input field

### Primitives (src/primitives/)
- **Button.tsx, Input.tsx, Select.tsx**
- **RadioGroup.tsx, ToggleGroup.tsx**
- **Slider.tsx, Collapsible.tsx**

### Screens (src/screens/)
- **ScreenRenderer.tsx** - Multi-step screen router
- **PrintOption.tsx** - Print method selection
- **AccessoryOption.tsx** - Accessory selection
- **StickerOption.tsx** - Sticker/decal options

### State Management (src/state/)
- **widget.state.ts** - Global widget configuration state
- **selections.state.ts** - User selections (Preact signals)
- **price.state.ts** - Real-time price state

### Engines (src/engine/)
- **option-engine.ts** - Evaluates option availability
- **price-engine.ts** - Real-time pricing calculation

### Types (src/types/)
- **widget.types.ts** - Widget configuration types
- **option.types.ts** - Option and choice types
- **price.types.ts** - Pricing types
- **screen.types.ts** - Screen and flow types

### Utilities (src/utils/)
- **events.ts** - Event emission and listening
- **formatting.ts** - Number and currency formatting
- **shadow-dom.ts** - Shadow DOM manipulation
- **test-utils.tsx** - Testing utilities

### ShopBy Integration (src/shopby/)
- **auth-bridge.ts** - OAuth token handling
- **lifecycle.ts** - Widget lifecycle hooks
- **types.ts** - ShopBy integration types

### Shopby Upload Module (src/upload/)
- **file-validator.ts** - Design file validation
- **uploader.ts** - File upload orchestrator
- **lifecycle-manager.ts** - Upload state management
- **s3-direct.ts** - AWS S3 direct upload
- **shopby-upload.ts** - ShopBy API upload
- **file-naming.ts** - Naming conventions
- **order-linking.ts** - Links files to orders

### Build Output (dist/)
- **widget.iife.js** - Widget bundle
- **embed.iife.js** - Embedding script

### Tests (__tests__/)
- Component tests using Vitest
- Snapshot tests for screens
- Shadow DOM tests
- Event system tests

---

## Module Dependencies Summary

| Package | Depends On | Purpose |
|---------|-----------|---------|
| @widget-creator/core | — | Pure business logic |
| @widget-creator/db | drizzle-orm | Schema definitions |
| @widget-creator/shared | core, drizzle-orm, zod, postgres | Data access + integrations |
| @widget-creator/pricing-engine | core, shared | Widget pricing |
| @widget-creator/widget | core | Embeddable UI |
| apps/web | core, shared, pricing-engine, widget, next, @trpc/server, next-auth | API server |
| apps/admin | core, shared, next, @trpc/react-query, react, shadcn-ui | Admin UI |
| packages/docs | nextra, next | Documentation |

---

## Module Statistics

| Module | TypeScript Files | Functions | Types | Tests |
|--------|------------------|-----------|-------|-------|
| core | 41 | 45+ | 30+ | 60+ |
| db | 21 | — | 26 tables | — |
| shared | 40+ | 50+ | 100+ | 80+ |
| pricing-engine | 20+ | 30+ | 20+ | 40+ |
| widget | 50+ | 200+ | 100+ | 100+ |
| apps/web | 50+ | 100+ | 80+ | 120+ |
| apps/admin | 60+ | 150+ | 90+ | 50+ |
| **Total** | **~282** | **~575+** | **~456+** | **~450+** |

---

**See Also:** [dependencies.md](dependencies.md), [entry-points.md](entry-points.md), [data-flow.md](data-flow.md)
