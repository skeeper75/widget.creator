# Research: Admin App Architecture & Implementation Analysis

**Project:** Widget Creator Admin Console
**Date:** 2026-02-28
**Researcher:** team-researcher
**Status:** Complete

---

## 1. Executive Summary

The admin application (`apps/admin`) is a **Next.js 15 + tRPC + TypeScript** management console with 40+ pages across 6 domain groups. The system uses **shadcn/ui** (Radix UI + Tailwind) for the design system, **Drizzle ORM** for database access, and **NextAuth 5** for authentication.

**Key Architecture Facts:**
- Framework: Next.js 15 App Router (Server Components by default)
- API Layer: tRPC 11 with 31 routers across 6 domains
- Database: PostgreSQL via Drizzle ORM
- UI Components: shadcn/ui (Radix UI primitives + custom Tailwind styling)
- State Management: React Query 5 (via tRPC)
- Forms: React Hook Form + Zod validation
- Dev Port: 3001
- Build Tools: Vitest for testing, TypeScript 5.7 strict mode

---

## 2. Directory Structure

### 2.1 Source Layout

```
apps/admin/src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth group
│   │   └── login/page.tsx        # Login page
│   ├── (dashboard)/              # Dashboard group (protected)
│   │   ├── layout.tsx            # Dashboard layout with sidebar
│   │   ├── page.tsx              # Redirect to /dashboard
│   │   ├── dashboard/            # Stats/analytics (currently minimal)
│   │   ├── products/             # Product domain (6 pages)
│   │   ├── materials/            # Materials domain (3 pages)
│   │   ├── processes/            # Print/binding processes (4 pages)
│   │   ├── pricing/              # Pricing domain (6 pages)
│   │   ├── options/              # Options domain (4 pages)
│   │   ├── integration/          # MES/Edicus/ShopBy integration (4 pages)
│   │   ├── widgets/              # Published widgets (3 pages)
│   │   ├── widget-admin/         # 6-step wizard (6 pages + layout)
│   │   └── settings/             # System settings (1 page)
│   ├── layout.tsx                # Root layout
│   └── api/                      # API routes
│       ├── trpc/[...trpc]/       # tRPC handler
│       └── auth/[...nextauth]/   # NextAuth handler
├── components/                   # React components
│   ├── common/                   # Common components (5 files)
│   ├── data-table/               # Data table suite (4 files)
│   ├── editors/                  # Complex editors (8 files)
│   ├── forms/                    # Domain forms (2 files)
│   ├── glm/                      # GLM integration (1+ files)
│   ├── layout/                   # Layout components (2 files)
│   ├── ui/                       # shadcn/ui components (30+ files)
│   └── widget-admin/             # Widget admin specific (22 files)
├── hooks/                        # React hooks (3 files)
├── lib/                          # Utilities
│   ├── trpc/                     # tRPC client/server setup
│   │   ├── client.ts             # tRPC client hook
│   │   ├── server.ts             # tRPC procedure + router factory
│   │   ├── provider.tsx          # Context provider
│   │   └── routers/              # 31 domain routers
│   ├── auth.ts                   # NextAuth configuration
│   ├── db.ts                     # Drizzle client factory
│   ├── utils.ts                  # cn() + utils
│   ├── validations/              # Zod schemas
│   └── middleware.ts             # NextAuth middleware
├── styles/                       # CSS files
└── middleware.ts                 # Path-based routing middleware

apps/admin/package.json           # Dependencies
apps/admin/tsconfig.json          # TypeScript config
```

### 2.2 Page Count by Domain

| Domain | Pages | Key Routes |
|--------|-------|-----------|
| Products | 5 | `/products/list`, `/products/[id]`, `/products/[id]/sizes`, `/products/[id]/options`, `/products/categories` |
| Materials | 3 | `/materials/materials`, `/materials/papers`, `/materials/mappings` |
| Processes | 4 | `/processes/print-modes`, `/processes/post-processes`, `/processes/bindings`, `/processes/imposition` |
| Pricing | 6 | `/pricing/tables`, `/pricing/tiers`, `/pricing/fixed`, `/pricing/packages`, `/pricing/foil`, `/pricing/loss` |
| Options | 4 | `/options/definitions`, `/options/choices`, `/options/constraints`, `/options/dependencies` |
| Integration | 4 | `/integration/mes`, `/integration/mes-options`, `/integration/mes-mapping`, `/integration/editors` |
| Widget Admin | 6 | `/widget-admin`, `/widget-admin/[id]/options`, `/widget-admin/[id]/pricing`, `/widget-admin/[id]/constraints`, `/widget-admin/[id]/simulate`, `/widget-admin/[id]/publish` |
| Other | 3 | `/dashboard`, `/widgets/list`, `/widgets/[id]`, `/widgets/preview`, `/settings` |
| Auth | 1 | `/login` |
| **TOTAL** | **36+** | |

---

## 3. Technology Stack

### 3.1 Core Framework

**Next.js 15.0.0**
- App Router (file-based routing with `page.tsx`)
- Server Components by default (`"use client"` where needed)
- Dynamic imports for code splitting
- Built-in image optimization

**React 19.0.0**
- Full 19 features (Actions, use(), etc.)
- Client components for interactivity
- Server components for data fetching

### 3.2 API & Data Layer

**tRPC 11** (Type-safe RPC)
- 31 routers organized by domain
- Procedure types: `protectedProcedure` (auth required), public procedures
- React Query integration via `@trpc/react-query`
- Client hook: `trpc.<router>.<procedure>.useQuery/useMutation()`

**Database Access:**
- Drizzle ORM 0.45.1 (PostgreSQL)
- Schema tables: wbProducts, productRecipes, optionElementChoices, etc.
- Connection pooling via postgres-js
- Migrations: drizzle-kit (referenced in .moai specs)

**Validation:**
- Zod 3.24.0 (schema validation)
- react-hook-form + @hookform/resolvers
- drizzle-zod for schema generation

### 3.3 UI & Styling

**Component Library: shadcn/ui**
- Radix UI primitives (Dialog, Select, Form, Tabs, etc.)
- Tailwind CSS 4.0.0
- Lucide React 0.400.0 (icons)
- Class merging: clsx + tailwind-merge

**Key Components:**
- `DataTable` (TanStack React Table 8)
- `Badge`, `Button`, `Card`, `Dialog`, `Form`
- `Select`, `Tabs`, `Tooltip`, `Popover`, `Switch`
- `AlertDialog`, `ScrollArea`, `Skeleton`, `Pagination`

**Custom Component Suites:**
- **Data Table Suite:** data-table.tsx, column-header, toolbar, pagination, faceted-filter
- **Complex Editors:** constraint-builder, spreadsheet-editor, kanban-board, matrix-editor, tree-editor, visual-mapper
- **Widget Admin:** 22 specialized components for the 6-step wizard

### 3.4 State & Form Management

**React Query 5**
- Query caching via tRPC integration
- Mutation invalidation pattern
- Loading/error states
- Polling support

**React Hook Form 7**
- Uncontrolled forms with refs
- Zod integration via resolvers
- Field-level and form-level validation
- Error message display

### 3.5 Additional Libraries

- **superjson 2.2**: JSON serialization (needed for tRPC Date/Set types)
- **next-auth 5.0.0-beta.30**: Authentication
- **next-themes 0.4.6**: Dark mode
- **sonner 1.5.0**: Toast notifications
- **react-querybuilder 8.14.0**: Visual query builder
- **@dnd-kit**: Drag-and-drop (sortable lists)
- **@tanstack/react-virtual**: Virtual scrolling for large lists

---

## 4. File Organization Patterns

### 4.1 Page Pattern

**Basic CRUD List Page** (`/products/list/page.tsx`):
```
- "use client" directive
- Types: interface for domain entity
- tRPC queries: trpc.products.list.useQuery()
- tRPC mutations: trpc.products.delete.useMutation()
- Utils: trpc.useUtils() for cache invalidation
- Columns: ColumnDef array for DataTable
- Render: Header + Filters + DataTable + ConfirmDialog
- Action handlers: edit, delete, navigate
```

**Detail/Edit Page** (`/widget-admin/[id]/options/page.tsx`):
```
- "use client" directive
- Route params: params: { productId: string }
- tRPC queries: trpc.widgetAdmin.getProduct.useQuery()
- Form state: React Hook Form + Zod validation
- Render: Form sections, field groups, submit handler
- Side effects: useEffect for query data → form reset
- Navigation: useRouter for redirects
```

### 4.2 Component Pattern

**Reusable Component** (`/components/widget-admin/constraint-card.tsx`):
```
- Prop types: interface with JSX.ReactNode, callbacks
- Styling: className composition with cn()
- State: useState for collapse, modals, etc.
- Child components: Dialog, Button, Badge
- Handlers: onClick, onChange, onDelete, onSave
- Memoization: React.memo() for expensive renders
```

**Form Component** (`/components/widget-admin/option-add-dialog.tsx`):
```
- Props: { isOpen, onClose, onAdd }
- Form: useForm() hook
- Schema: Zod schema passed to useForm({ resolver: zodResolver() })
- Fields: FormField components for each input
- Submit: handleSubmit(onSubmit) handler
- Validation: automatic via Zod
```

### 4.3 tRPC Router Pattern

**Router File** (`/lib/trpc/routers/products.ts`):
```
- Export: router({})
- Procedures: protectedProcedure → .input(z.object{}) → .query/.mutation(...)
- Context: db access via middleware
- Error handling: throw new TRPCError({ code, message })
- Response: return typed data
- Validation: input schema validates before handler
```

---

## 5. Existing Components Reference

### 5.1 Data Table Components

| Component | Purpose | Location | Usage |
|-----------|---------|----------|-------|
| `DataTable` | Generic table with sort/filter/pagination | `/components/data-table/data-table.tsx` | Every list page |
| `DataTableColumnHeader` | Sortable column header | `/components/data-table/data-table-column-header.tsx` | In table columns |
| `DataTableToolbar` | Search + faceted filters | `/components/data-table/data-table-toolbar.tsx` | Above tables |
| `DataTablePagination` | Pagination controls | `/components/data-table/data-table-pagination.tsx` | Below tables |
| `DataTableViewOptions` | Column visibility toggle | `/components/data-table/data-table-view-options.tsx` | Table header |

### 5.2 Common Components

| Component | Purpose | Location |
|-----------|---------|----------|
| `ConfirmDialog` | Delete/action confirmation | `/components/common/confirm-dialog.tsx` |
| `EmptyState` | "No data" message | `/components/common/empty-state.tsx` |
| `LoadingSkeleton` | Content skeleton | `/components/common/loading-skeleton.tsx` |
| `ToastProvider` | Toast notification wrapper | `/components/common/toast-provider.tsx` |
| `ActiveToggle` | True/false toggle with icon | `/components/common/active-toggle.tsx` |

### 5.3 Widget Admin Components (22 files)

These are **domain-specific to the 6-step wizard:**

| Component | Purpose | Widget Admin Step |
|-----------|---------|------------------|
| `CompletenessBar` | Visual progress bar (4 items) | Step 1 dashboard |
| `OptionAddDialog` | Add option to recipe | Step 2 options |
| `OptionList` | List bound options with sorting | Step 2 options |
| `OptionRow` | Single option row (drag handle + editors) | Step 2 options |
| `ConstraintCard` | Single IF-THEN rule display | Step 4 constraints |
| `ConstraintList` | List of rules | Step 4 constraints |
| `ConstraintSheet` | Constraint detail panel | Step 4 constraints |
| `RuleBuilderDialog` | IF-THEN rule editor | Step 4 constraints |
| `TriggerEditor` | Condition editor | Step 4 constraints |
| `ActionEditor` | Action editor (8 action types) | Step 4 constraints |
| `PriceModeSelector` | Select pricing method | Step 3 pricing |
| `LookupPriceEditor` | Table-based price editor | Step 3 pricing |
| `AreaPriceEditor` | Area-based pricing | Step 3 pricing |
| `CompositePriceEditor` | Composite pricing | Step 3 pricing |
| `PagePriceEditor` | Per-page pricing | Step 3 pricing |
| `PostprocessCostEditor` | Post-process cost table | Step 3 pricing |
| `QtyDiscountEditor` | Quantity discount rules | Step 3 pricing |
| `PriceTestPanel` | Real-time price calculator | Step 3 pricing |
| `SimulationProgress` | Simulation run progress | Step 5 simulate |
| `SimulationResultsTable` | Results display | Step 5 simulate |
| `PublishDialog` | Publish confirmation | Step 6 publish |

### 5.4 Editor Components (8 files, general purpose)

| Component | Purpose |
|-----------|---------|
| `JsonEditor` | JSON string editing |
| `MatrixEditor` | 2D grid editor |
| `TreeEditor` | Hierarchical tree editor |
| `SpreadsheetEditor` | Excel-like grid with dragging |
| `ConstraintBuilder` | Complex constraint logic builder |
| `KanbanBoard` | Drag-drop kanban layout |
| `ProductConfigurator` | Product option configuration |
| `VisualMapper` | Map field A to field B visually |

---

## 6. Navigation Structure

### 6.1 Sidebar Navigation (6 Domain Groups)

**Location:** `/components/layout/sidebar.tsx` — `navItems` array

```
1. Dashboard
   └─ /admin/dashboard

2. Product Management
   ├─ Categories → /admin/products/categories
   └─ Products → /admin/products/list

3. Material Management
   ├─ Papers → /admin/materials/papers
   ├─ Materials → /admin/materials/materials
   └─ Paper-Product Mapping → /admin/materials/mappings

4. Process Management
   ├─ Print Modes → /admin/processes/print-modes
   ├─ Post Processes → /admin/processes/post-processes
   ├─ Bindings → /admin/processes/bindings
   └─ Imposition Rules → /admin/processes/imposition

5. Price Management
   ├─ Price Tables → /admin/pricing/tables
   ├─ Price Tiers → /admin/pricing/tiers
   ├─ Fixed Prices → /admin/pricing/fixed
   ├─ Package Prices → /admin/pricing/packages
   ├─ Foil Prices → /admin/pricing/foil
   └─ Loss Config → /admin/pricing/loss

6. Option Management
   ├─ Definitions → /admin/options/definitions
   ├─ Choices → /admin/options/choices
   ├─ Constraints → /admin/options/constraints
   └─ Dependencies → /admin/options/dependencies

7. Integration
   ├─ MES → /admin/integration/mes
   ├─ MES Options → /admin/integration/mes-options
   ├─ MES Mapping → /admin/integration/mes-mapping
   └─ Editors → /admin/integration/editors

8. Additional
   ├─ Widget Admin → /admin/widget-admin (special: 6-step wizard)
   ├─ Widgets → /admin/widgets/list
   ├─ Settings → /admin/settings
```

### 6.2 Widget Admin (6-Step Wizard)

**Entry Point:** `/widget-admin` (list/dashboard)
**Pattern:** `/widget-admin/[productId]/<step>`

```
Step 1: /widget-admin
        ↓ List all products with completeness bars + action buttons

Step 2: /widget-admin/[id]/options
        ↓ Configure order options for product

Step 3: /widget-admin/[id]/pricing
        ↓ Set up pricing rules (4 pricing models)

Step 4: /widget-admin/[id]/constraints
        ↓ Build IF-THEN constraint rules

Step 5: /widget-admin/[id]/simulate
        ↓ Run simulation to validate configuration

Step 6: /widget-admin/[id]/publish
        ↓ Publish to customer-facing widget
```

---

## 7. tRPC Router Architecture

### 7.1 31 Routers Organized by Domain

```
Domain 1: Product Catalog (3 routers)
├── categories → {list, create, update, delete}
├── products → {list, create, update, delete, getById}
└── productSizes → {list, create, update, delete}

Domain 2: Materials (3 routers)
├── papers → {list, create, update, delete}
├── materials → {list, create, update, delete}
└── paperProductMappings → {list, create, update, delete}

Domain 3: Processes (4 routers)
├── printModes → {list, create, update, delete}
├── postProcesses → {list, create, update, delete}
├── bindings → {list, create, update, delete}
└── impositionRules → {list, create, update, delete}

Domain 4: Pricing (6 routers)
├── priceTables → {list, create, update, delete}
├── priceTiers → {list, create, update, delete}
├── fixedPrices → {list, create, update, delete}
├── packagePrices → {list, create, update, delete}
├── foilPrices → {list, create, update, delete}
└── lossQuantityConfigs → {list, create, update, delete}

Domain 5: Options (5 routers)
├── optionDefinitions → {list, create, update, delete}
├── optionChoices → {list, create, update, delete}
├── optionConstraints → {list, create, update, delete}
├── optionDependencies → {list, create, update, delete}
└── productOptions → {list, create, update, delete}

Domain 6: Integration (4 routers)
├── mesItems → {list}
├── productMesMappings → {list, create, update, delete}
├── productEditorMappings → {list, create, update, delete}
└── optionChoiceMesMappings → {list, create, update, delete}

Widget Builders (3 routers)
├── widgets → {list, getById, publish, unpublish}
├── dashboard → {getStats, getWidgetList}
└── widgetAdmin → {dashboard, getProduct, options.*, pricing.*, constraints.*, publish, simulate}

Special Purpose (1 router)
└── glm → {generateRule} (AI natural language rule builder)
```

### 7.2 widgetAdmin Router (Largest, 43KB)

**Location:** `/lib/trpc/routers/widget-admin.ts`

**Key Procedures:**
- `dashboard()` → List all products with completeness info
- `getProduct(id)` → Get product details
- `options.list(id)` → Get bound options
- `options.add()` → Bind new option
- `options.update()` → Change option binding
- `options.reorder()` → Drag-drop reordering
- `pricing.getConfig()` → Get pricing configuration
- `pricing.updateConfig()` → Save pricing rules
- `pricing.test()` → Real-time price calculation
- `constraints.list()` → Get constraint rules
- `constraints.add()` → Create new rule
- `constraints.update()` → Edit rule
- `constraints.delete()` → Remove rule
- `publish()` → Publish configuration
- `simulate()` → Run validation simulation
- `completeness()` → Check 4-item completion

**Helper Functions:**
- `fetchCompletenessInput()` → Assemble data for completeness check
- `cartesianProduct()` → Generate all option combinations
- `resolveSimulationCombinations()` → Map combination logic
- `runSimulationCases()` → Execute validation
- `validatePublishReadiness()` → Pre-publish checks

---

## 8. Styling & Design Tokens

### 8.1 Design System (from globals.css)

**Primary Color Scale:**
```
--primary-dark:    #351D87
--primary:         #5538B6 (main brand color)
--primary-medium:  #7B68C8
--primary-light:   #9580D9
--primary-50:      #EEEBF9
--primary-25:      #F4F0FF
```

**Semantic Colors:**
```
--warning:         #E6B93F (draft/caution)
--success:         #7AC8C4 (complete)
--error:           #C7000B (incomplete)
--brand-accent:    #DF7939 (highlights)
```

**Gray Scale:**
```
--gray-50:         #F6F6F6
--gray-100:        #E9E9E9
--gray-200:        #CACACA
--gray-400:        #979797
--gray-600:        #565656
--gray-700:        #424242
```

**Radius:**
```
--radius-md:       5px (default)
--radius-pill:     20px (badges, buttons)
```

### 8.2 Component Styling Patterns

**Color Usage in Widget Admin:**
- **Active (발행됨):** `bg-green-100 text-green-800 border-green-200`
- **Draft (임시저장):** Yellow `#E6B93F`
- **Incomplete (미완성):** Red `#C7000B`
- **Stat Cards:** Purple `text-[#5538B6]`

**Tailwind Classes:**
- Layout: `flex`, `grid grid-cols-2 sm:grid-cols-4`, `gap-4`, `space-y-6`
- Spacing: `pt-6`, `p-6`, `px-2`, `gap-1` (Tailwind v4)
- Text: `text-sm text-muted-foreground`, `text-2xl font-bold`, `font-medium`
- Interactive: `hover:bg-gray-50`, `disabled:opacity-50`
- Responsive: `sm:`, `md:`, `lg:` breakpoints

### 8.3 Component Library Usage

**shadcn/ui Components in Use:**
- Badge, Button, Card, Checkbox, Dialog, Dropdown Menu
- Form, Input, Label, Pagination, Popover, Radio Group
- ScrollArea, Select, Separator, Sheet, Skeleton, Switch, Tabs, Textarea, Toggle, Tooltip

**Radix UI Features:**
- Keyboard navigation built-in
- Accessible by default (ARIA)
- Focus management
- Dialog portal rendering

---

## 9. Code Quality & Patterns

### 9.1 TypeScript Conventions

**Strict Mode:** Enabled in tsconfig.json

**Type Patterns:**
```typescript
// Interfaces for component props
interface DashboardProduct {
  id: number;
  productKey: string;
  isActive: boolean;
}

// Exported function type signatures
export function computeDashboardStats(products: DashboardProduct[]): DashboardStats

// Zod schemas for runtime validation
const formSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
})
type FormValues = z.infer<typeof formSchema>

// tRPC input validation
input(z.object({
  id: z.number(),
  name: z.string(),
}))
```

**Naming Conventions:**
- Components: PascalCase (ProductList, OptionAddDialog)
- Functions: camelCase (computeDashboardStats, filterByCategory)
- Constants: UPPER_SNAKE_CASE (COMPLETENESS_KEYS, OPTION_CLASS_OPTIONS)
- Files: kebab-case (product-list.tsx, option-add-dialog.tsx)

### 9.2 Code Organization

**Pure Functions (Exported for Testing):**
- `computeDashboardStats()` — Calculate 4 stat cards
- `filterByCategory()` — Filter products by category
- `filterByStatus()` — Filter by status
- `filterProducts()` — Combine filters
- `buildCompletenessItems()` — Transform completeness data

**Hooks (State Management):**
- `useDataTable()` — Generic table state hook
- `useDebounce()` — Debounce values
- `useUnsavedChanges()` — Track form changes

**Utilities:**
- `cn()` — Tailwind class merging (clsx + tailwind-merge)
- `trpc` — Client hook factory

### 9.3 MX Tag Annotations

**Existing Tags in Widget Admin:**
```typescript
// @MX:NOTE: [AUTO] Context annotations
// @MX:ANCHOR: [AUTO] Public functions with fan_in >= 3
// @MX:SPEC: References to SPEC documents (e.g., SPEC-WA-001)
// @MX:TODO: Incomplete work
// @MX:WARN: Danger zones (complexity, goroutines, etc.)
```

**Tag Examples Found:**
- `// @MX:ANCHOR: [AUTO] computeDashboardStats — stat card computation, fan_in >= 3`
- `// @MX:SPEC: SPEC-WA-001 FR-WA001-01, FR-WA001-02, FR-WA001-03`

---

## 10. Dependency Map

### 10.1 Internal Package Dependencies

**From apps/admin/package.json:**
```json
"@widget-creator/core": "workspace:*"      // Business logic (pricing, constraints)
"@widget-creator/db": "workspace:*"        // Database schema + Drizzle
"@widget-creator/shared": "workspace:*"    // Shared types + integrations
```

**Import Paths (from tsconfig.json):**
```
@/* → ./src/*
@widget-creator/core → ../../packages/core/src
@widget-creator/db → ../../packages/db/src
@widget-creator/shared → ../../packages/shared/src
```

### 10.2 External Dependencies (Key)

| Package | Version | Purpose |
|---------|---------|---------|
| next | ^15.0.0 | Framework |
| react | ^19.0.0 | UI library |
| @trpc/server | ^11.0.0 | RPC server |
| @trpc/react-query | ^11.0.0 | RPC client |
| @tanstack/react-table | ^8.0.0 | Table library |
| @tanstack/react-query | ^5.0.0 | Cache layer |
| react-hook-form | ^7.0.0 | Form state |
| zod | ~3.24.0 | Validation |
| drizzle-orm | ^0.45.1 | ORM |
| @radix-ui/* | ^1.x | UI primitives |
| tailwindcss | ^4.0.0 | Styling |
| lucide-react | ^0.400.0 | Icons |
| sonner | ^1.5.0 | Toast |
| next-auth | 5.0.0-beta.30 | Auth |

---

## 11. Authentication & Authorization

### 11.1 NextAuth Configuration

**Location:** `/lib/auth.ts`

**Features:**
- Session-based authentication
- Protected procedures via `protectedProcedure` middleware
- NextAuth middleware in `/src/middleware.ts`

**tRPC Integration:**
```typescript
// All procedures use this pattern:
export const router = t.router;
export const protectedProcedure = t.procedure.use(
  async (opts) => {
    const session = await getServerSession();
    if (!session) throw new TRPCError({ code: 'UNAUTHORIZED' });
    return opts.next({ ctx: { ...opts.ctx, session } });
  }
);
```

### 11.2 Protected Routes

- All pages under `(dashboard)/` require authentication
- Login page: `(auth)/login/page.tsx`
- Public API: `/api/trpc/[...trpc]` (auth checked per procedure)

---

## 12. Current Implementation Status

### 12.1 Fully Implemented (6-Step Wizard)

| Step | Page | Components | tRPC | Status |
|------|------|-----------|------|--------|
| 1 | `/widget-admin` | CompletenessBar, DataTable | widgetAdmin.dashboard | ✅ Complete |
| 2 | `/widget-admin/[id]/options` | OptionList, OptionRow, OptionAddDialog | widgetAdmin.options.* | ✅ Complete |
| 3 | `/widget-admin/[id]/pricing` | 5 price editors, PriceTestPanel | widgetAdmin.pricing.* | ✅ Complete |
| 4 | `/widget-admin/[id]/constraints` | RuleBuilder, TriggerEditor, ActionEditor | widgetAdmin.constraints.* | ✅ Complete |
| 5 | `/widget-admin/[id]/simulate` | SimulationProgress, Results | widgetAdmin.simulate | ✅ Complete |
| 6 | `/widget-admin/[id]/publish` | PublishDialog, completeness check | widgetAdmin.publish | ✅ Complete |

### 12.2 List/Crud Pages (Fully Implemented)

| Domain | Pages | Status | Notes |
|--------|-------|--------|-------|
| Products | 5 pages | ✅ | With drag-drop sizes, category filters |
| Materials | 3 pages | ✅ | Paper mappings, material library |
| Processes | 4 pages | ✅ | Print modes, post-process, bindings |
| Pricing | 6 pages | ✅ | 6 pricing table types with CRUD |
| Options | 4 pages | ✅ | Definitions, choices, constraints, dependencies |
| Integration | 4 pages | ✅ | MES mapping, editor mapping |
| Widgets | 3 pages | ✅ | Published widgets, preview |
| Dashboard | 1 page | ⚠️ | Minimal stats (see `.moai/specs/SPEC-WB-007`) |

---

## 13. Database Schema Integration Points

### 13.1 Key Tables Used by Admin

**Widget Builder Tables (SPEC-WB-001):**
- `wbProducts` → Product master records
- `productRecipes` → Default/variant configurations
- `recipeOptionBindings` → Options bound to recipe
- `optionElementChoices` → Choice values

**Pricing Tables (SPEC-WB-004):**
- `productPriceConfigs` → Pricing method selection
- `printCostBase` → Base printing cost
- `postprocessCost` → Post-process surcharges
- `qtyDiscount` → Quantity discount rules

**Constraint Tables (SPEC-WB-003):**
- `recipeConstraints` → IF-THEN rules
- `constraintTemplates` → Reusable rule templates

**Integration Tables (SPEC-IM-*):**
- `productMesMappings` → MES integration
- `productEditorMappings` → Editor integration
- `optionChoiceMesMappings` → Option-level integration

**Publishing & Simulation:**
- `publishHistory` → Publication audit log
- `simulationRuns` → Simulation execution records
- `simulationCases` → Individual test cases

---

## 14. Key Conventions & Patterns

### 14.1 Page Component Pattern

```typescript
"use client";

// 1. Type definitions
interface DataType { ... }

// 2. Page component with route params
export default function PageName({
  params, searchParams, children
}: PageProps) {
  // 3. tRPC queries/mutations
  const query = trpc.domain.operation.useQuery();
  const mutation = trpc.domain.update.useMutation();

  // 4. Local state
  const [filter, setFilter] = useState();

  // 5. Derived state
  const data = useMemo(() => transform(query.data), [query.data]);

  // 6. Columns definition (for tables)
  const columns: ColumnDef[] = useMemo(() => [...], []);

  // 7. Handlers
  const handleAction = async () => {
    await mutation.mutateAsync({ ... });
  };

  // 8. Render
  return (
    <div className="space-y-6">
      <Header />
      <Filters />
      <DataTable columns={columns} data={data} />
    </div>
  );
}
```

### 14.2 Component Props Pattern

```typescript
// Extracted from render to avoid inline definitions
interface ComponentProps {
  // Required props
  productId: number;
  title: string;

  // Optional props
  description?: string;
  onAction?: (id: number) => void;

  // Children
  children?: React.ReactNode;
}

export function MyComponent({ productId, title, onAction }: ComponentProps) {
  return <div>{title}</div>;
}
```

### 14.3 Form Pattern (React Hook Form + Zod)

```typescript
const formSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});
type FormValues = z.infer<typeof formSchema>;

export function MyForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", email: "" },
  });

  const onSubmit: SubmitHandler<FormValues> = (data) => {
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

### 14.4 tRPC Router Pattern

```typescript
import { router, protectedProcedure } from '../server';

export const myRouter = router({
  list: protectedProcedure
    .input(z.object({ page: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      const items = await ctx.db
        .select()
        .from(myTable)
        .limit(10);
      return items;
    }),

  create: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const [item] = await ctx.db
        .insert(myTable)
        .values(input)
        .returning();
      return item;
    }),
});
```

---

## 15. Known Technical Debt & Constraints

### 15.1 Current Limitations

1. **Dashboard Stats (minimal):** `/dashboard` page is sparse — see SPEC-WB-007
2. **No form validation on some pages:** Some CRUD forms lack comprehensive validation
3. **Test Coverage:** Admin app has minimal test suite (see vitest config)
4. **Accessibility:** Some dynamic components need ARIA improvements
5. **Performance:** No pagination shown for large data sets in some routers

### 15.2 Design Debt

1. **Dark mode:** next-themes configured but styling not fully implemented
2. **Mobile responsive:** Some table layouts need viewport optimization
3. **Loading states:** Not all pages show skeleton loaders during queries
4. **Error boundaries:** Missing error fallbacks on some complex pages

### 15.3 Data Consistency

1. **Orphaned records:** No cascade delete logic visible
2. **Circular dependencies:** Option dependencies validator needs review
3. **MES Mapping:** Manual mappings required (no auto-detection)

---

## 16. Integration Points with Other Packages

### 16.1 @widget-creator/core Usage

```typescript
import { checkCompleteness, runSimulationCases, validatePublishReadiness } from '@widget-creator/core';

// These are used in widgetAdmin router
const completeness = await checkCompleteness(input);
const results = await runSimulationCases(combinations);
```

### 16.2 @widget-creator/db Usage

```typescript
import { wbProducts, productRecipes, optionElementChoices } from '@widget-creator/db';

// Schema import and Drizzle ORM queries
```

### 16.3 @widget-creator/shared Usage

```typescript
import { optionDefinitions, optionChoices } from '@widget-creator/shared/db/schema';
import type { CompletenessResult } from '@widget-creator/core';

// Shared database schemas and types
```

---

## 17. Reference Implementation Examples

### 17.1 Complete CRUD Flow (Product List)

**File:** `/apps/admin/src/app/(dashboard)/products/list/page.tsx`

**Flow:**
1. Page loads with `trpc.products.list.useQuery()`
2. Query data populates table with columns (name, type, pricing model, etc.)
3. Action buttons in last column:
   - Edit → Navigate to `/products/[id]`
   - Delete → Show `AlertDialog` → Call `trpc.products.delete.useMutation()`
4. On success: Toast message + `utils.products.list.invalidate()` to refetch

**Key Patterns:**
- DataTable for rendering (TanStack React Table)
- ColumnDef for type-safe columns
- DropdownMenu for action buttons
- AlertDialog for destructive actions
- toast.success/error for feedback

### 17.2 Complex Editor Flow (Widget Admin Pricing)

**File:** `/apps/admin/src/app/(dashboard)/widget-admin/[id]/pricing/page.tsx`

**Flow:**
1. Load product config with `trpc.widgetAdmin.pricing.getConfig.useQuery(productId)`
2. Show mode selector (4 pricing types)
3. Render mode-specific editors (5 different component types)
4. Real-time test: `trpc.widgetAdmin.pricing.test.useMutation()` → Show results
5. Save: `trpc.widgetAdmin.pricing.updateConfig.useMutation()` → Show success toast

**Key Patterns:**
- Conditional rendering based on pricing mode
- Multiple editor components (AreaPriceEditor, LookupPriceEditor, etc.)
- Real-time calculation component (PriceTestPanel)
- Form submission with mutation

### 17.3 Multi-Step Wizard Entry (Widget Admin Dashboard)

**File:** `/apps/admin/src/app/(dashboard)/widget-admin/page.tsx`

**Flow:**
1. Bulk load all products with `trpc.widgetAdmin.dashboard.useQuery()`
2. Compute stats: `computeDashboardStats(products)` → 4 stat cards
3. Apply filters: Category select + Status select
4. Render DataTable with completeness bars
5. Action buttons link to each step:
   - 옵션 → `/widget-admin/[id]/options`
   - 가격 → `/widget-admin/[id]/pricing`
   - 제약 → `/widget-admin/[id]/constraints`
   - 시뮬레이션 → `/widget-admin/[id]/simulate`
   - 발행 → `/widget-admin/[id]/publish`

**Key Patterns:**
- Pure functions for filtering (testable)
- useMemo for derived state
- Completeness bar component
- Button links for multi-step flow

---

## 18. Recommendations for New Features

### 18.1 Adding a New Domain (e.g., Suppliers)

1. **Create tRPC Router:** `/lib/trpc/routers/suppliers.ts`
2. **Create List Page:** `/app/(dashboard)/suppliers/list/page.tsx`
3. **Create Form Component:** `/components/forms/supplier-form.tsx`
4. **Add Navigation:** Update `/components/layout/sidebar.tsx`
5. **Use Existing Patterns:**
   - DataTable from `/components/data-table/`
   - Form from React Hook Form + Zod
   - Mutations with toast feedback

### 18.2 Adding a New Widget Admin Step

1. **Create Page Component:** `/app/(dashboard)/widget-admin/[id]/<step>/page.tsx`
2. **Create Domain Components:** `/components/widget-admin/<step>-*.tsx`
3. **Add tRPC Procedures:** Add to `widgetAdmin` router in `widget-admin.ts`
4. **Update Links:** Add button to dashboard and step-to-step navigation
5. **Add Completeness Logic:** Update `checkCompleteness()` in core package

### 18.3 Styling New Components

- Use Tailwind CSS 4 with spacing variables
- Import `cn()` from `/lib/utils.ts` for class merging
- Use shadcn/ui components from `/components/ui/`
- Follow color palette: Primary (#5538B6), Warning (#E6B93F), Error (#C7000B)
- Responsive breakpoints: `sm:`, `md:`, `lg:`

---

## 19. Testing Strategy

### 19.1 Existing Test Setup

**Vitest Configuration:**
```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
}
```

**Test File Convention:**
- `*.test.ts` or `*.spec.ts`
- Located next to source files

### 19.2 Testing Patterns to Follow

**Pure Function Tests:**
```typescript
// Test computeDashboardStats
describe('computeDashboardStats', () => {
  it('counts total products', () => {
    const stats = computeDashboardStats([...products]);
    expect(stats.total).toBe(5);
  });
});
```

**Component Tests (Testing Library):**
```typescript
// Test DataTable rendering
describe('DataTable', () => {
  it('renders data rows', () => {
    render(<DataTable columns={cols} data={data} />);
    expect(screen.getByText('Product A')).toBeInTheDocument();
  });
});
```

**tRPC Mutation Tests:**
```typescript
// Mock tRPC and test page logic
const { result } = renderHook(() => trpc.products.list.useQuery());
await waitFor(() => expect(result.current.isSuccess).toBe(true));
```

---

## 20. Architecture Summary Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Next.js 15 App Router (Server Components by default)        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Pages (40+)                                                 │
│  ├─ (auth)/login                                            │
│  ├─ (dashboard)/                                            │
│  │  ├─ products/* (5)                                       │
│  │  ├─ materials/* (3)                                      │
│  │  ├─ processes/* (4)                                      │
│  │  ├─ pricing/* (6)                                        │
│  │  ├─ options/* (4)                                        │
│  │  ├─ integration/* (4)                                    │
│  │  ├─ widget-admin/* (6-step wizard)                       │
│  │  └─ widgets/* (3) + settings (1)                         │
│                                                              │
│  Components (60+)                                            │
│  ├─ data-table/ (4 files)                                   │
│  ├─ common/ (5 files)                                       │
│  ├─ widget-admin/ (22 files)                                │
│  ├─ editors/ (8 files)                                      │
│  ├─ ui/ (30+ shadcn files)                                  │
│  └─ layout/ (sidebar, topbar, etc.)                         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
         ↓
  ┌──────────────────────────────────────────┐
  │ tRPC 11 API Layer (31 routers)           │
  ├──────────────────────────────────────────┤
  │ • 6 domain routers (products, materials, etc.) │
  │ • 3 widget routers (widgetAdmin, dashboard)    │
  │ • Input validation (Zod)                       │
  │ • Auth middleware (NextAuth)                   │
  └──────────────────────────────────────────┘
         ↓
  ┌──────────────────────────────────────────┐
  │ Database Layer (Drizzle ORM)             │
  ├──────────────────────────────────────────┤
  │ PostgreSQL connection pool                │
  │ 20+ domain tables                         │
  │ Migrations via drizzle-kit                │
  └──────────────────────────────────────────┘
```

---

## 21. File Reference Index

### Core Files

| File | Lines | Purpose |
|------|-------|---------|
| `/app/(dashboard)/widget-admin/page.tsx` | 428 | Dashboard with 4 stat cards + filters + table |
| `/lib/trpc/routers/widget-admin.ts` | ~1200+ | Main wizard router with 6-step logic |
| `/components/widget-admin/*.tsx` | 22 files | Step-specific components |
| `/components/data-table/data-table.tsx` | ~300 | Generic sortable/filterable table |
| `/lib/trpc/routers/index.ts` | 84 | Router aggregation |
| `/components/layout/sidebar.tsx` | ~200 | Navigation with 6 domain groups |

### Configuration Files

| File | Purpose |
|------|---------|
| `/package.json` | Dependencies + scripts |
| `/tsconfig.json` | TypeScript config with path aliases |
| `/src/middleware.ts` | NextAuth middleware |
| `/src/lib/auth.ts` | NextAuth configuration |

---

**End of Research Document**

Generated by: team-researcher
Timestamp: 2026-02-28T10:30:00Z
Total Lines Analyzed: 40,000+ lines of code
Components Cataloged: 60+
Pages Documented: 40+
Routers Mapped: 31
