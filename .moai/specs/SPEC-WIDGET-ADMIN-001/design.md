# SPEC-WIDGET-ADMIN-001: Widget Builder Admin UI/UX Architecture Design

## 1. Architecture Overview

### Tech Stack (Existing)
- **Framework**: Next.js 14 (App Router, Server Components)
- **UI Library**: shadcn/ui + Tailwind CSS v4
- **State/Data**: tRPC (client/server) + React Query
- **Design Tokens**: Violet primary palette (Toss-inspired), SEED 4px grid
- **Tables**: TanStack Table v8 via shared `<DataTable>` component
- **Tree**: @dnd-kit for drag-and-drop tree editing
- **Pricing**: Custom `<SpreadsheetEditor>` with virtualized rows

### Layout Shell (Implemented)
```
apps/admin/src/app/(dashboard)/layout.tsx
  --> Sidebar (w-64 / w-16 collapsed, 9 nav groups)
  --> Topbar (breadcrumb)
  --> Main Content (flex-1, overflow-y-auto, p-6)
```

### Data Model Layers
```
Layer 0: option_element_types (vocabulary)
Layer 1: option_element_choices (choices per type)
Layer 2: product_categories, wb_products (catalog)
Layer 3: product_recipes, recipe_option_bindings (recipe composition)
Layer 4: recipe_constraints, constraint_templates (ECA rules)
Layer 5: product_price_configs, print_cost_base, postprocess_cost, qty_discount
Layer 6: addon_groups, addon_group_items
Layer 7: simulation_runs, publish_history, orders
```

---

## 2. Information Architecture (Site Map)

### Current Navigation Structure (sidebar.tsx navItems)

```
Dashboard ........................ /admin/dashboard
Product Management
  Categories .................... /admin/products/categories
  Products ...................... /admin/products/list
  Product Detail [id] ........... /admin/products/[id]
    Sizes ....................... /admin/products/[id]/sizes
    Options ..................... /admin/products/[id]/options
Material Management
  Papers ........................ /admin/materials/papers (NOT YET IMPLEMENTED)
  Materials ..................... /admin/materials/materials
  Paper-Product Mapping ......... /admin/materials/mappings (NOT YET IMPLEMENTED)
Process Management
  Print Modes ................... /admin/processes/print-modes
  Post Processes ................ /admin/processes/post-processes
  Bindings ...................... /admin/processes/bindings
  Imposition Rules .............. /admin/processes/imposition
Price Management
  Price Tables .................. /admin/pricing/tables
  Price Tiers ................... /admin/pricing/tiers
  Fixed Prices .................. /admin/pricing/fixed
  Package Prices ................ /admin/pricing/packages
  Foil Prices ................... /admin/pricing/foil
  Loss Config ................... /admin/pricing/loss
Option Management
  Definitions ................... /admin/options/definitions
  Choices ....................... /admin/options/choices
  Constraints ................... /admin/options/constraints
  Dependencies .................. /admin/options/dependencies
System Integration
  MES Items ..................... /admin/integration/mes
  MES Mapping ................... /admin/integration/mes-mapping
  Editor Mapping ................ /admin/integration/editors
  MES Options ................... /admin/integration/mes-options
Widget Management
  Widgets ....................... /admin/widgets/list
  Preview ....................... /admin/widgets/preview
Settings ........................ /admin/settings
```

### Proposed Additions (New Widget Builder Admin Pages)

```
Widget Builder (NEW GROUP or expand existing "Widget Management")
  Element Types ................. /admin/widget-builder/elements
  Element Choices ............... /admin/widget-builder/choices
  Recipe Builder ................ /admin/widget-builder/recipes
  Constraint Templates .......... /admin/widget-builder/constraint-templates
  Recipe Constraints (ECA) ...... /admin/widget-builder/constraints
  Addon Groups .................. /admin/widget-builder/addons
  Price Configuration ........... /admin/widget-builder/pricing
  Simulation .................... /admin/widget-builder/simulation
  Publish ....................... /admin/widget-builder/publish
```

### Key User Flows

**Flow 1: Product Configuration (End-to-End)**
```
Categories --> Create Product --> Define Sizes
  --> Assign Recipe --> Bind Elements to Recipe
  --> Set Constraints --> Configure Pricing
  --> Simulate --> Publish
```

**Flow 2: Constraint Authoring**
```
Browse Constraint Templates --> Apply Template to Recipe
  OR Create Custom Constraint (ECA builder)
  OR Use Natural Language (GLM) --> Review Generated ECA
  --> Test in Simulation
```

**Flow 3: Pricing Setup**
```
Select Product --> Choose Price Config Type
  --> Enter Base Costs (Print / PostProcess)
  --> Set Qty Discounts --> Validate with Simulation
```

---

## 3. Page Wireframes

### 3a. Dashboard (Existing - Enhanced)

```
+================================================================+
| Dashboard                                        [Refresh]      |
| Widget Builder Admin Overview                                   |
+================================================================+
|                                                                  |
| +-------------+ +-------------+ +-------------+ +-------------+ |
| | Products    | | Widgets     | | Constraints | | MES Mapping | |
| |    42       | |     8       | |    156      | |    87%      | |
| | 50 total    | | 10 total    | | ECA rules   | | Completion  | |
| +-------------+ +-------------+ +-------------+ +-------------+ |
|                                                                  |
| +---------------------------------+ +---------------------------+|
| | Recent Activity                 | | Coverage Summary          ||
| | - Product X updated     2m ago  | | Elements: 12 types        ||
| | - Constraint added      5m ago  | | Choices:  89 active       ||
| | - Widget published      1h ago  | | Recipes:  34 (3 archived) ||
| |                                 | | Templates: 18 active      ||
| +---------------------------------+ +---------------------------+|
+==================================================================+
```

**Components**: `StatCard`, `ActivityList`, `CoverageSummaryCard`

### 3b. Element Type Management

```
+================================================================+
| Element Types                          [+ Add Element Type]     |
| Manage option type vocabulary (12 types)                        |
+================================================================+
|                                                                  |
| [Search...                ] [Category: All v] [Active v]        |
|                                                                  |
| +------+----------+----------+----------+--------+------+-----+ |
| | ID   | Type Key | Name(KO) | Category | UI Ctrl| Order| ... | |
| +------+----------+----------+----------+--------+------+-----+ |
| | 1    | paper    | 용지     | material |toggle  | 1    | ... | |
| | 2    | size     | 사이즈   | spec     |select  | 2    | ... | |
| | 3    | quantity | 수량     | quantity |stepper | 3    | ... | |
| | ...  | ...      | ...      | ...      | ...    | ...  | ... | |
| +------+----------+----------+----------+--------+------+-----+ |
|                                                                  |
| [< 1 2 3 >]                                   20 per page       |
+==================================================================+
```

**Pattern**: Standard CRUD DataTable
**Components**: `DataTable`, `DataTableColumnHeader`, `DataTableFacetedFilter`
**Actions per row**: Edit (modal), Deactivate (confirm dialog)

### 3c. Element Choices Management

```
+================================================================+
| Element Choices                          [+ Add Choice]         |
| Manage choices for each element type                            |
+================================================================+
|                                                                  |
| [Search...         ] [Element Type: paper v] [Active v]         |
|                                                                  |
| +------+----------+----------+----------+--------+------+-----+ |
| | ID   | Type     | Code     | Name(KO) | MES CD | Order| ... | |
| +------+----------+----------+----------+--------+------+-----+ |
| | 1    | paper    | ART250   | 아트250g | MAT001 | 1    | ... | |
| | 2    | paper    | ART300   | 아트300g | MAT002 | 2    | ... | |
| | 3    | paper    | SNOW250  | 스노우250| MAT003 | 3    | ... | |
| +------+----------+----------+----------+--------+------+-----+ |
|                                                                  |
+==================================================================+
```

**Pattern**: Standard CRUD DataTable with parent filter (element type)
**Linked from**: Element Types row action "View Choices"

### 3d. Product Management (3-Panel Layout)

```
+==================================================================+
| Products                                                          |
+=============+========================+===========================+
| Categories  | Product List           | Product Detail             |
| (w-56)      | (flex-1)               | (w-96, tabbed)             |
|             |                        |                            |
| [+ Add]     | [Search...   ] [Type v]| Tabs: Info | Recipe | ...  |
|             |                        |                            |
| > 명함      | ID | Name    | Type   | [Tab: Info]                |
|   > 일반명함| 1  | 일반명함| digital| Name: 일반명함             |
|   > 고급명함| 2  | 고급명함| offset | Category: 명함 > 일반명함  |
| > 스티커    | 3  | 스티커  | digital| Type: digital_print        |
|   > 원형    |    |         |        | MES: MAT001                |
|   > 사각    |    |         |        | Edicus: ED001              |
| > 전단지   |    |         |        | [Save] [Deactivate]        |
|             |    |         |        |                            |
+=============+========================+===========================+
```

**Pattern**: 3-Panel Layout (from design skill)
**Left**: `TreeEditor` (existing, drag-and-drop categories)
**Center**: `DataTable` (filtered by selected category)
**Right**: Tabbed detail panel with tabs:
  1. Basic Info (`ProductForm`)
  2. Recipes (`RecipeList` + `RecipeEditor`)
  3. Sizes (`SizeTable`)
  4. Options (`ProductConfigurator` - existing)
  5. Constraints (`ConstraintBuilder` - existing)
  6. Pricing (`PriceConfigPanel`)
  7. MES Integration (`MesMappingPanel`)

### 3e. Recipe Builder

```
+================================================================+
| Recipe Builder                                                   |
| Product: 일반명함 (Recipe v2 - Default)          [+ New Recipe] |
+================================================================+
|                                                                  |
| Recipe Info                                                      |
| Name: [일반명함 기본 레시피    ] Version: 2  [x] Default        |
|                                                                  |
| +------------------------------------------------------------+  |
| | Bound Elements                            [+ Bind Element] |  |
| | +----------+-----------+-----------+---------+-----+------+ |  |
| | | Element  | Required  | Default   | UI Ctrl | Ord | Act  | |  |
| | +----------+-----------+-----------+---------+-----+------+ |  |
| | | paper    | Yes       | ART250    | toggle  | 1   | [x]  | |  |
| | | size     | Yes       | 90x50     | select  | 2   | [x]  | |  |
| | | quantity | Yes       | 100       | stepper | 3   | [x]  | |  |
| | | coating  | No        | None      | toggle  | 4   | [x]  | |  |
| | | corners  | No        | Square    | toggle  | 5   | [x]  | |  |
| | +----------+-----------+-----------+---------+-----+------+ |  |
| +------------------------------------------------------------+  |
|                                                                  |
| Choice Restrictions (per element)                                |
| Element: [paper v]                                               |
| +------+----------+-----------+                                  |
| | Code | Name     | Allowed   |                                  |
| +------+----------+-----------+                                  |
| | ART250 | 아트250 | [x]      |                                  |
| | ART300 | 아트300 | [x]      |                                  |
| | SNOW250| 스노우  | [ ]      |                                  |
| +------+----------+-----------+                                  |
|                                                                  |
| [Save Recipe] [Archive Recipe]                                   |
+==================================================================+
```

**Pattern**: Form + nested DataTable
**Components**: `RecipeInfoForm`, `ElementBindingTable`, `ChoiceRestrictionMatrix`
**Key interaction**: Drag-and-drop element ordering, checkbox matrix for restrictions

### 3f. Constraint Template Editor

```
+================================================================+
| Constraint Templates                   [+ Create Template]      |
| Reusable ECA rule templates (18 templates)                      |
+================================================================+
|                                                                  |
| [Search...        ] [Category: All v]                           |
|                                                                  |
| +------+-----------------+----------+--------+--------+-------+ |
| | ID   | Template Name   | Category | Trigger| Actions| Usage | |
| +------+-----------------+----------+--------+--------+-------+ |
| | 1    | 용지→코팅 제한  | material | paper  | 2      | 12    | |
| | 2    | 사이즈→후가공   | spec     | size   | 3      | 8     | |
| | 3    | 수량→가격단계   | quantity | qty    | 1      | 22    | |
| +------+-----------------+----------+--------+--------+-------+ |
|                                                                  |
| [Template Detail - Expanded/Modal]                               |
| +--------------------------------------------------------------+|
| | Template: 용지→코팅 제한                                     ||
| |                                                                ||
| | TRIGGER: When [paper] [IN] [투명PVC, OPP]                    ||
| | CONDITION: AND [size] [<=] [A4]                               ||
| | ACTIONS:                                                       ||
| |   1. [coating] -> HIDE choices [유광코팅, 무광코팅]          ||
| |   2. [coating] -> SET default [없음]                          ||
| |                                                                ||
| | [Save Template] [Delete]                                       ||
| +--------------------------------------------------------------+|
+==================================================================+
```

**Pattern**: CRUD DataTable + Detail Modal/Panel
**Components**: `ConstraintBuilder` (existing), `TemplateDetailModal`
**Reuses**: Existing `ConstraintBuilder` component adapted for templates

### 3g. Recipe Constraints (ECA) Page

```
+================================================================+
| Recipe Constraints                                               |
| Product: [일반명함 v]  Recipe: [v2 Default v]    [+ Add Rule]   |
+================================================================+
|                                                                  |
| [Natural Language Input]                                         |
| "용지가 투명PVC일 때 코팅 옵션을 숨겨주세요"   [Generate ECA]  |
|                                                                  |
| Active Constraints (Priority Order)                              |
| +----+-----+-----------+-----------+-----------+--------+------+ |
| | #  | Pri | Trigger   | Condition | Actions   | Mode   | Act  | |
| +----+-----+-----------+-----------+-----------+--------+------+ |
| | 1  | 10  | paper IN  | size<=A4  | HIDE coat | manual | [x]  | |
| |    |     | [PVC,OPP] |           | SET def   |        |      | |
| +----+-----+-----------+-----------+-----------+--------+------+ |
| | 2  | 20  | qty >= 500| -         | APPLY     | nl     | [x]  | |
| |    |     |           |           | discount  |        |      | |
| +----+-----+-----------+-----------+-----------+--------+------+ |
| | 3  | 30  | size IN   | -         | SHOW bind | tmpl   | [x]  | |
| |    |     | [A3, B4]  |           | options   |        |      | |
| +----+-----+-----------+-----------+-----------+--------+------+ |
|                                                                  |
| [Apply Template] [Test in Simulation]                            |
+==================================================================+
```

**Pattern**: Sortable list (drag-and-drop priority) + NL input
**Components**: `ConstraintBuilder` (existing), `NlConstraintInput`, `ConstraintRow`
**Key**: Priority ordering via drag, expandable rows for full ECA detail

### 3h. Pricing Configuration

```
+================================================================+
| Price Configuration                                              |
| Product: [일반명함 v]                                           |
+================================================================+
|                                                                  |
| Tabs: [Base Cost] [PostProcess] [Qty Discount] [Addon Pricing]  |
|                                                                  |
| [Tab: Base Cost - Spreadsheet]                                   |
| +------+---------+---------+---------+---------+---------+      |
| | Size | 100장   | 200장   | 300장   | 500장   | 1000장  |      |
| +------+---------+---------+---------+---------+---------+      |
| | 90x50| 12,000  | 15,000  | 18,000  | 22,000  | 35,000  |      |
| | 90x55| 13,000  | 16,000  | 19,000  | 23,000  | 37,000  |      |
| | 86x54| 12,500  | 15,500  | 18,500  | 22,500  | 36,000  |      |
| +------+---------+---------+---------+---------+---------+      |
|                                                                  |
| [Undo] [Redo] [Save] [% Bulk Adjust]                           |
+==================================================================+
```

**Pattern**: Spreadsheet with virtualized cells
**Components**: `SpreadsheetEditor` (existing), `PriceConfigTabs`
**Tabs**:
  1. Base Print Cost (size x qty matrix)
  2. PostProcess Cost (per-process pricing)
  3. Qty Discount (tier-based discounts)
  4. Addon Pricing (addon group item prices)

### 3i. Simulation / Preview

```
+================================================================+
| Simulation                                                       |
| Product: [일반명함 v]  Recipe: [v2 Default v]                   |
+================================================================+
|                                                                  |
| +---------------------------+  +-------------------------------+ |
| | Widget Preview            |  | Simulation Results            | |
| |                           |  |                               | |
| | [Paper: toggle-group]     |  | Selected:                     | |
| |  아트250 | 아트300 | ...  |  |   Paper: 아트250g             | |
| |                           |  |   Size: 90x50mm               | |
| | [Size: select]            |  |   Qty: 200                    | |
| |  90x50mm                  |  |   Coating: 유광               | |
| |                           |  |                               | |
| | [Quantity: stepper]       |  | Price Breakdown:              | |
| |  [- 200 +]               |  |   Base:     15,000 KRW        | |
| |                           |  |   Coating:   3,000 KRW        | |
| | [Coating: toggle-group]   |  |   Discount:    -5%            | |
| |  없음 | 유광 | 무광      |  |   Total:    17,100 KRW        | |
| |                           |  |                               | |
| |                           |  | Constraints Applied:          | |
| |                           |  |   - paper→coating: OK         | |
| |                           |  |   - qty→discount: Applied     | |
| +---------------------------+  +-------------------------------+ |
|                                                                  |
| [Run Full Simulation] [Save Snapshot] [Publish Widget]           |
+==================================================================+
```

**Pattern**: Split view (preview + results)
**Components**: `WidgetPreview`, `SimulationResultPanel`, `PriceBreakdown`, `ConstraintLog`

---

## 4. Component Architecture

### 4.1 Component Naming Conventions

| Type | Pattern | Example |
|------|---------|---------|
| Page (route) | `{Domain}{Action}Page` | `ElementTypeListPage`, `RecipeBuilderPage` |
| Container | `{Domain}{Feature}Container` | `ProductDetailContainer` |
| Form | `{Domain}Form` | `ElementTypeForm`, `RecipeForm` |
| Table column def | `use{Domain}Columns` | `useElementTypeColumns()` |
| Editor (complex) | `{Domain}Editor` / `{Domain}Builder` | `ConstraintBuilder`, `RecipeBuilder` |
| Detail panel | `{Domain}DetailPanel` | `ProductDetailPanel` |
| Modal | `{Domain}{Action}Modal` | `ElementTypeEditModal` |
| Shared/Presentational | `{Feature}` | `StatusBadge`, `ActiveToggle`, `EmptyState` |

### 4.2 Existing Reusable Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `DataTable` | `components/data-table/data-table.tsx` | Generic CRUD table with search, filters, pagination |
| `DataTableColumnHeader` | `components/data-table/data-table-column-header.tsx` | Sortable column header |
| `DataTableFacetedFilter` | `components/data-table/data-table-faceted-filter.tsx` | Multi-select faceted filter |
| `DataTablePagination` | `components/data-table/data-table-pagination.tsx` | Page controls |
| `DataTableToolbar` | `components/data-table/data-table-toolbar.tsx` | Search + filters bar |
| `DataTableViewOptions` | `components/data-table/data-table-view-options.tsx` | Column visibility toggle |
| `TreeEditor` | `components/editors/tree-editor.tsx` | Drag-and-drop tree (categories) |
| `SpreadsheetEditor` | `components/editors/spreadsheet-editor.tsx` | Virtualized price grid |
| `ConstraintBuilder` | `components/editors/constraint-builder.tsx` | ECA constraint editor |
| `MatrixEditor` | `components/editors/matrix-editor.tsx` | 2D matrix editing |
| `ProductConfigurator` | `components/editors/product-configurator.tsx` | Option assignment UI |
| `JsonEditor` | `components/editors/json-editor.tsx` | JSON field editor |
| `KanbanBoard` | `components/editors/kanban-board.tsx` | Kanban-style board |
| `VisualMapper` | `components/editors/visual-mapper.tsx` | Visual relationship mapper |
| `EmptyState` | `components/common/empty-state.tsx` | Empty state with action |
| `ConfirmDialog` | `components/common/confirm-dialog.tsx` | Destructive action confirm |
| `LoadingSkeleton` | `components/common/loading-skeleton.tsx` | Loading placeholder |
| `ActiveToggle` | `components/common/active-toggle.tsx` | Active/inactive switch |
| `ToastProvider` | `components/common/toast-provider.tsx` | Sonner toast wrapper |

### 4.3 New Components Needed

| Component | Type | Purpose |
|-----------|------|---------|
| `RecipeBuilder` | Editor | Recipe composition: element binding + choice restrictions |
| `ElementBindingTable` | Table | Sortable table of bound elements within recipe |
| `ChoiceRestrictionMatrix` | Matrix | Checkbox matrix: element choices allowed per recipe |
| `NlConstraintInput` | Input | Natural language constraint input (GLM integration) |
| `ConstraintRow` | Row | Expandable constraint row showing full ECA detail |
| `PriceConfigTabs` | Tabs | Tabbed pricing configuration (base/postprocess/qty/addon) |
| `WidgetPreview` | Preview | Live widget preview with option selection |
| `SimulationResultPanel` | Panel | Price breakdown + constraint evaluation results |
| `PriceBreakdown` | Display | Itemized price calculation display |
| `ConstraintLog` | Display | Constraint evaluation trace log |
| `CoverageSummaryCard` | Card | Dashboard coverage statistics |
| `AddonGroupEditor` | Editor | Addon group + items management |
| `PublishHistoryTable` | Table | Publish history with version comparison |

### 4.4 Reusable Patterns

**Pattern 1: CRUD Table Page**
Used by: Element Types, Element Choices, Constraint Templates, Addon Groups, Publish History
```
PageHeader (title + primary action button)
  DataTable
    columns (via useXxxColumns hook)
    data (via trpc.xxx.list.useQuery)
    filters (faceted)
    search
    pagination
  EditModal (create/edit form)
  ConfirmDialog (delete/deactivate)
```

**Pattern 2: 3-Panel Layout**
Used by: Product Management (categories + products + detail)
```
ResizablePanelGroup (horizontal)
  Panel 1: TreeEditor or FilterList (w-56)
  Panel 2: DataTable (flex-1)
  Panel 3: Tabbed DetailPanel (w-96)
```

**Pattern 3: Form Builder**
Used by: Product Form, Recipe Form, Element Type Form, Constraint Template Form
```
Form (react-hook-form + zod validation)
  FormFields (based on schema)
  FormActions (Save + Cancel)
  UnsavedChanges hook (existing use-unsaved-changes.ts)
```

**Pattern 4: Spreadsheet / Price Matrix**
Used by: Print Cost Base, PostProcess Cost, Qty Discount
```
SpreadsheetEditor
  VirtualizedGrid (tanstack-virtual)
  Undo/Redo (useReducer)
  BulkAdjust (percentage modal)
  Save (mutation batch)
```

---

## 5. Approach Comparison

### Approach A: Extend Existing Navigation (Recommended)

Add new Widget Builder pages under existing "Widget Management" group in sidebar, expanding it.

**Pros**:
- Zero refactoring of existing sidebar structure
- Users already familiar with navigation
- All 26 tRPC routers already exist and map to nav items
- Incremental delivery possible

**Cons**:
- Widget Management group becomes large (9+ items)
- May need sub-grouping within the group

### Approach B: Separate Widget Builder Section

Create a completely separate "Widget Builder" top-level nav group alongside existing "Widget Management".

**Pros**:
- Clear separation of concerns
- Widget Builder as distinct domain

**Cons**:
- Navigation becomes 10 groups (was 9)
- Overlap with existing pages (duplication risk)
- Users may be confused about Widget Management vs Widget Builder

### Recommendation: Approach A with Sub-Grouping

Expand the existing "Widget Management" group with logical sub-sections:

```
Widget Management
  > Configuration
    Element Types
    Element Choices
    Recipes
    Constraint Templates
  > Operations
    Widgets
    Simulation
    Publish
  > Preview
```

---

## 6. Implementation Order (Dependency-Aware)

### Phase 1: Foundation (No dependencies)
1. Element Type CRUD page (`/admin/widget-builder/elements`)
2. Element Choice CRUD page (`/admin/widget-builder/choices`)
3. Constraint Template CRUD page (`/admin/widget-builder/constraint-templates`)

### Phase 2: Recipe System (Depends on Phase 1)
4. Recipe Builder page (`/admin/widget-builder/recipes`)
5. Element Binding management (within Recipe Builder)
6. Choice Restriction matrix (within Recipe Builder)

### Phase 3: Constraints (Depends on Phase 2)
7. Recipe Constraints page with ECA builder (existing `ConstraintBuilder` extended)
8. NL Constraint Input integration (GLM router exists)

### Phase 4: Pricing (Depends on Phase 2)
9. Price Configuration tabs (extends existing `SpreadsheetEditor`)
10. Addon Group management

### Phase 5: Simulation & Publish (Depends on Phase 3, 4)
11. Simulation page (widget preview + result panel)
12. Publish management page

### Phase 6: Dashboard Enhancement
13. Enhanced dashboard with Widget Builder coverage stats

---

## 7. Testing Strategy

| Code Type | Methodology | Approach |
|-----------|-------------|----------|
| New page components | TDD | Write component tests first (Testing Library) |
| New tRPC routers (if any) | TDD | Write API tests first (Vitest + supertest) |
| Modified components (DataTable, Sidebar) | DDD | Characterization tests for existing behavior, then modify |
| Existing editors (ConstraintBuilder, SpreadsheetEditor) | DDD | Snapshot existing behavior before extending |
| Shared hooks (useDataTable, useDebounce) | DDD | Preserve existing behavior |

Coverage Target: 85% for new code, preserve existing coverage for modified code.

---

## 8. Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Sidebar becomes overcrowded | UX confusion | Sub-grouping with collapsible sections |
| Recipe Builder complexity | Long development time | Reuse existing TreeEditor + MatrixEditor patterns |
| ECA constraint authoring UX | User confusion | Keep existing ConstraintBuilder, add NL input as alternative |
| Spreadsheet performance with large price tables | UI lag | Already mitigated via tanstack-virtual in SpreadsheetEditor |
| Recipe versioning state management | Data integrity bugs | Immutable version pattern (archive + create new) |
| 3-Panel layout on small screens | Responsive issues | Collapse to single panel with drawer (documented in design skill) |

---

## 9. Interface Contracts (Key Data Shapes)

### tRPC Routers Needed (New or Extended)

Most tRPC routers already exist in `/home/innojini/dev/widget.creator/apps/admin/src/lib/trpc/routers/`. The following may need additions:

| Router | Exists | New Procedures Needed |
|--------|--------|-----------------------|
| `categories` | Yes | None |
| `products` | Yes | None |
| `optionDefinitions` | Yes | Map to element types |
| `optionChoices` | Yes | Map to element choices |
| `productOptions` | Yes | Map to recipe bindings |
| `optionConstraints` | Yes | Template application |
| `widgets` | Yes | Simulation run, publish |
| `widgetAdmin` | Yes | Element types CRUD, recipes CRUD |
| `glm` | Yes | NL constraint generation |
| `dashboard` | Yes | Coverage stats extension |

### Key Type Interfaces (from DB schema)

```typescript
// Element Type (option_element_types)
interface ElementType {
  id: number;
  typeKey: string;           // unique, e.g. "paper", "size"
  typeNameKo: string;
  typeNameEn: string;
  uiControl: UiControl;     // 'toggle-group' | 'select' | ...
  optionCategory: string;   // 'material' | 'process' | 'spec' | 'quantity' | 'group'
  allowsCustom: boolean;
  displayOrder: number;
  isActive: boolean;
}

// Recipe (product_recipes)
interface Recipe {
  id: number;
  productId: number;
  recipeName: string;
  recipeVersion: number;
  isDefault: boolean;
  isArchived: boolean;
}

// Recipe Constraint ECA (recipe_constraints)
interface RecipeConstraint {
  id: number;
  recipeId: number;
  constraintName: string;
  triggerOptionType: string;
  triggerOperator: string;
  triggerValues: unknown[];    // JSONB
  extraConditions: unknown;   // JSONB
  actions: unknown[];          // JSONB
  priority: number;
  isActive: boolean;
  inputMode: 'manual' | 'template' | 'nl';
  templateId: number | null;
}
```

---

## 10. File Impact Analysis

### New Files

| File | Purpose |
|------|---------|
| `apps/admin/src/app/(dashboard)/widget-builder/elements/page.tsx` | Element Types CRUD |
| `apps/admin/src/app/(dashboard)/widget-builder/choices/page.tsx` | Element Choices CRUD |
| `apps/admin/src/app/(dashboard)/widget-builder/recipes/page.tsx` | Recipe Builder |
| `apps/admin/src/app/(dashboard)/widget-builder/constraint-templates/page.tsx` | Constraint Templates |
| `apps/admin/src/app/(dashboard)/widget-builder/constraints/page.tsx` | Recipe Constraints (ECA) |
| `apps/admin/src/app/(dashboard)/widget-builder/addons/page.tsx` | Addon Groups |
| `apps/admin/src/app/(dashboard)/widget-builder/pricing/page.tsx` | Price Configuration |
| `apps/admin/src/app/(dashboard)/widget-builder/simulation/page.tsx` | Simulation/Preview |
| `apps/admin/src/app/(dashboard)/widget-builder/publish/page.tsx` | Publish Management |
| `apps/admin/src/components/editors/recipe-builder.tsx` | Recipe composition editor |
| `apps/admin/src/components/editors/nl-constraint-input.tsx` | NL constraint input |
| `apps/admin/src/components/simulation/widget-preview.tsx` | Live widget preview |
| `apps/admin/src/components/simulation/simulation-result.tsx` | Simulation results panel |
| `apps/admin/src/components/simulation/price-breakdown.tsx` | Price breakdown display |

### Modified Files

| File | Change |
|------|--------|
| `apps/admin/src/components/layout/sidebar.tsx` | Add Widget Builder nav group |
| `apps/admin/src/lib/trpc/routers/widget-admin.ts` | Add element types, recipes, simulation procedures |
| `apps/admin/src/lib/trpc/routers/dashboard.ts` | Add coverage stats |

### No Files Deleted

All existing pages remain. New Widget Builder pages are additive.
