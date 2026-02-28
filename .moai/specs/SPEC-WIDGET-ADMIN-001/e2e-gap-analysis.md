# E2E Test Gap Analysis & Component Reusability Assessment

**Status**: Research Complete
**Date**: 2026-02-28
**Researcher**: team-researcher

---

## 1. Executive Summary

### E2E Coverage Gap

**SPEC-WIDGET-ADMIN-001** defines **7 NEW pages** for Widget Builder management:

| Page | Route | Status | E2E Tests |
|------|-------|--------|-----------|
| Element Types | `/admin/widget-builder/elements` | Not Implemented | ❌ 0 tests |
| Element Choices | `/admin/widget-builder/choices` | Not Implemented | ❌ 0 tests |
| Recipe Builder | `/admin/widget-builder/recipes` | Not Implemented | ❌ 0 tests |
| Constraint Templates | `/admin/widget-builder/constraint-templates` | Not Implemented | ❌ 0 tests |
| Addon Groups | `/admin/widget-builder/addons` | Not Implemented | ❌ 0 tests |
| Price Configuration | `/admin/widget-builder/pricing` | Not Implemented | ❌ 0 tests |
| Widget Orders | `/admin/widget-builder/orders` | Not Implemented | ❌ 0 tests |

### E2E Test Coverage (Existing)

**SPEC-WA-001** (Widget Admin 6-Step Wizard) has comprehensive E2E coverage:

- **spec-wa-001-admin.test.ts**: 34 test cases covering 6 wizard steps
  - Step 1 Dashboard: 4 tests
  - Step 2 Options: 3 tests
  - Step 3 Constraints: 3 tests
  - Step 4 Pricing: 2 tests
  - Step 5 Simulation: 2 tests
  - Step 6 Publish: 5 tests
  - tRPC API Integration: 4 tests
  - Database Mapping: 3 tests
  - Navigation Flow: 5 tests

- **screenshot-capture.test.ts**: 7 screenshot tests (dashboard + 6 wizard steps)
- **db-schema-screenshots.ts**: Referenced in task context (21 admin pages)

**Total Existing E2E Tests**: ~41 tests covering 6 existing wizard pages

### Gap Analysis Summary

- **✅ Covered Pages**: 6 pages (widget-admin/{productId}/{step})
- **❌ Uncovered Pages**: 7 pages (NEW widget-builder/* pages from SPEC-WIDGET-ADMIN-001)
- **Gap**: 100% of NEW pages require E2E tests

---

## 2. Reusable Components Analysis

### 2.1 Verified Reusable Components

#### Data Table Components
```
📁 apps/admin/src/components/data-table/
├── data-table.tsx ........................ Main table component (TanStack React Table v8)
├── data-table-pagination.tsx ............. Pagination controls
├── data-table-toolbar.tsx ............... Filter toolbar + search
├── data-table-faceted-filter.tsx ........ Multi-select filters
├── data-table-column-header.tsx ......... Sortable column headers
└── data-table-view-options.tsx .......... Column visibility toggle
```

**Reusability**: ⭐⭐⭐⭐⭐ HIGHLY REUSABLE
- Used in existing admin pages (Products, Materials, Options, Pricing)
- Generic `<DataTable<TData>>` with typed columns
- Supports filtering, sorting, pagination out-of-the-box
- **Recommended for**: Elements, Choices, Orders pages

#### Editors & Builders
```
📁 apps/admin/src/components/editors/
├── constraint-builder.tsx ............... ECA rule builder (IF-THEN logic)
├── spreadsheet-editor.tsx ............... Matrix data entry (virtualizable)
├── tree-editor.tsx ...................... Hierarchical data editing
├── matrix-editor.tsx .................... 2D grid editing
├── json-editor.tsx ...................... JSON visualization
└── product-configurator.tsx ............ Complex form workflows
```

**Reusability**: ⭐⭐⭐⭐☆ HIGH REUSABILITY
- `constraint-builder.tsx` directly maps to FR-WBADMIN-004 requirement
- `spreadsheet-editor.tsx` perfect for FR-WBADMIN-006 (Price Configuration)
- All editors follow consistent Input/Output patterns
- **Recommended for**: Recipe Builder, Constraint Templates, Price Configuration

#### Common UI Components
```
📁 apps/admin/src/components/common/
├── confirm-dialog.tsx ................... Deletion/action confirmations
├── active-toggle.tsx .................... Boolean status toggle
├── empty-state.tsx ...................... No data placeholder
├── loading-skeleton.tsx ................. Skeleton loader
└── toast-provider.tsx ................... Toast notifications
```

**Reusability**: ⭐⭐⭐⭐⭐ HIGHLY REUSABLE
- Used across all admin pages
- Simple, composable interfaces
- **Recommended for**: All 7 new pages

#### Widget Admin Domain Components
```
📁 apps/admin/src/components/widget-admin/
├── constraint-card.tsx .................. Constraint display card
├── constraint-list.tsx .................. Constraint list container
├── constraint-sheet.tsx ................. Constraint detail sheet
├── rule-builder-dialog.tsx .............. Rule builder dialog wrapper
├── option-list.tsx ...................... Option selection list
├── option-row.tsx ....................... Single option row
├── option-add-dialog.tsx ................ Add option dialog
├── option-value-editor.tsx .............. Option value inline editor
├── price-mode-selector.tsx .............. Pricing strategy selector
├── qty-discount-editor.tsx .............. Quantity discount matrix
├── postprocess-cost-editor.tsx .......... Post-process cost editor
└── publish-dialog.tsx ................... Publish confirmation dialog
```

**Reusability**: ⭐⭐⭐☆☆ MODERATE REUSABILITY
- Specific to widget-admin 6-step wizard domain
- Can be adapted for Recipe Builder and Constraint Templates
- **Recommended for**: Recipes, Constraints (with minor adaptation)

#### Layout & Navigation
```
📁 apps/admin/src/components/layout/
├── sidebar.tsx .......................... Navigation menu (collapsible groups)
├── topbar.tsx ........................... Page header
└── breadcrumb.tsx ....................... Breadcrumb navigation
```

**Reusability**: ⭐⭐⭐⭐☆ HIGH REUSABILITY
- Sidebar already has "Widget Management" group at line 116-121
- Can extend with new "Widget Builder" submenu
- **Recommended for**: Navigation structure

#### Form & Validation Components
```
📁 apps/admin/src/components/forms/
├── product-form.tsx .................... Product CRUD form
├── category-form.tsx ................... Category form
└── paper-form.tsx ...................... Paper configuration form
```

**Reusability**: ⭐⭐☆☆☆ LIMITED REUSABILITY
- Domain-specific to product/category/material management
- Patterns are reusable (React Hook Form + Zod), not components themselves

---

### 2.2 Component Reusability Matrix

| Component | Elements | Choices | Recipes | Constraints | Addons | Pricing | Orders |
|-----------|----------|---------|---------|-------------|--------|---------|--------|
| DataTable | ✅ Yes | ✅ Yes | ⚠️ Partial | ❌ No | ❌ No | ❌ No | ✅ Yes |
| constraint-builder | ❌ No | ❌ No | ✅ Yes | ✅ Yes | ❌ No | ❌ No | ❌ No |
| spreadsheet-editor | ❌ No | ❌ No | ⚠️ Partial | ❌ No | ⚠️ Partial | ✅ Yes | ❌ No |
| confirm-dialog | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| active-toggle | ✅ Yes | ✅ Yes | ⚠️ Partial | ❌ No | ✅ Yes | ❌ No | ❌ No |
| ConstraintCard | ❌ No | ❌ No | ❌ No | ✅ Yes | ❌ No | ❌ No | ❌ No |
| option-list | ❌ No | ✅ Yes | ✅ Yes | ❌ No | ❌ No | ❌ No | ❌ No |

---

## 3. Component Gaps (NEW Components Needed)

### 3.1 Components to Create

| Component | Use Cases | Estimated LOC | Complexity |
|-----------|-----------|---------------|------------|
| **ElementTypeForm** | Add/edit element types (FR-WBADMIN-001) | 150 | Medium |
| **ElementChoiceFilter** | Filter choices by element type (FR-WBADMIN-002) | 80 | Low |
| **RecipeBindingDragDrop** | D&D reordering of recipe bindings (FR-WBADMIN-003) | 200 | High |
| **RecipeVersionBadge** | Version/archive status badge (FR-WBADMIN-003) | 40 | Low |
| **ConstraintTemplateSelector** | Template selection dialog (FR-WBADMIN-004) | 120 | Medium |
| **AddonGroupInlineEditor** | Inline D&D group membership (FR-WBADMIN-005) | 180 | High |
| **PriceConfigTabs** | Tabbed pricing editor wrapper (FR-WBADMIN-006) | 100 | Medium |
| **OrderDetailSheet** | Order detail side panel (FR-WBADMIN-007) | 150 | Medium |
| **MESStatusBadge** | MES sync status indicator (FR-WBADMIN-007) | 50 | Low |
| **MESRetryButton** | MES retry action button (FR-WBADMIN-007) | 80 | Low |

**Total New Components**: 10
**Estimated Total LOC**: ~1,150 lines

---

## 4. E2E Test Cases for NEW Pages

### 4.1 Element Types Page (`/admin/widget-builder/elements`)

**Dependent on**: FR-WBADMIN-001

```typescript
// Test Suite: Widget Builder - Element Types Management

test('FR-WBADMIN-001: Elements page loads with DataTable')
test('FR-WBADMIN-001: Element type columns display correctly')
  // Verify columns: key, name (KO), ui_control_type, category, display_order
test('FR-WBADMIN-001: Add Element Type button opens form dialog')
test('FR-WBADMIN-001: Create new element type (green path)')
  // Create form, submit, verify table updates
test('FR-WBADMIN-001: Edit existing element type')
test('FR-WBADMIN-001: Prevent deletion of element type with choices')
test('FR-WBADMIN-001: Verify edicus_code is immutable (read-only after creation)')
test('FR-WBADMIN-001: Filter/search element types by name')
test('FR-WBADMIN-001: Sort element types by column headers')
```

**Total Cases**: 9 tests

---

### 4.2 Element Choices Page (`/admin/widget-builder/choices`)

**Dependent on**: FR-WBADMIN-002

```typescript
// Test Suite: Widget Builder - Element Choices Management

test('FR-WBADMIN-002: Choices page loads with DataTable and filters')
test('FR-WBADMIN-002: Element Type filter dropdown visible')
test('FR-WBADMIN-002: Filter choices by element type')
test('FR-WBADMIN-002: Display choice columns: element_type, mes_code, display_name, sort_order')
test('FR-WBADMIN-002: Edit choice - update mes_code')
test('FR-WBADMIN-002: Edit choice - update display_name (KO)')
test('FR-WBADMIN-002: Edit choice - update sort_order')
test('FR-WBADMIN-002: Disable choice - verify warning badge appears')
test('FR-WBADMIN-002: Warn when disabled choice is referenced in recipes')
test('FR-WBADMIN-002: Search choices by display_name or mes_code')
```

**Total Cases**: 10 tests

---

### 4.3 Recipe Builder Page (`/admin/widget-builder/recipes`)

**Dependent on**: FR-WBADMIN-003

```typescript
// Test Suite: Widget Builder - Recipe Management

test('FR-WBADMIN-003: Recipes page loads with recipe list')
test('FR-WBADMIN-003: Display recipe columns: product_id, key, version, status (archived badge), created_at')
test('FR-WBADMIN-003: Click recipe to open Recipe Builder sheet')
test('FR-WBADMIN-003: Recipe Builder displays bindings list with element types')
test('FR-WBADMIN-003: Drag-and-drop reorder bindings in Recipe Builder')
test('FR-WBADMIN-003: Add binding to recipe - element choice selector')
test('FR-WBADMIN-003: Remove binding from recipe - confirm dialog')
test('FR-WBADMIN-003: Save recipe creates new version (archived old recipe)')
test('FR-WBADMIN-003: Archived recipes show [Archived] badge and are read-only')
test('FR-WBADMIN-003: Create new recipe from blank template')
test('FR-WBADMIN-003: Recipe version history shows past versions')
test('FR-WBADMIN-003: Verify recipe immutability - hard delete prevented')
```

**Total Cases**: 12 tests

---

### 4.4 Constraint Templates Page (`/admin/widget-builder/constraint-templates`)

**Dependent on**: FR-WBADMIN-004

```typescript
// Test Suite: Widget Builder - Constraint Template Management

test('FR-WBADMIN-004: Constraint Templates page loads with list')
test('FR-WBADMIN-004: Display template columns: name, is_system, created_by, constraint_type')
test('FR-WBADMIN-004: System templates (is_system=true) are read-only')
test('FR-WBADMIN-004: System templates edit/delete buttons are disabled')
test('FR-WBADMIN-004: Click "Create Custom Template" opens ConstraintBuilder')
test('FR-WBADMIN-004: ConstraintBuilder accepts ECA pattern definition')
test('FR-WBADMIN-004: Save custom template - verify table updates')
test('FR-WBADMIN-004: Edit custom template - reopen ConstraintBuilder')
test('FR-WBADMIN-004: Delete custom template - confirm dialog')
test('FR-WBADMIN-004: Template selector dialog for applying to recipes')
```

**Total Cases**: 10 tests

---

### 4.5 Addon Groups Page (`/admin/widget-builder/addons`)

**Dependent on**: FR-WBADMIN-005

```typescript
// Test Suite: Widget Builder - Addon Group Management

test('FR-WBADMIN-005: Addon Groups page loads with list')
test('FR-WBADMIN-005: Display addon group columns: group_name, product_count, created_at')
test('FR-WBADMIN-005: Click group to edit - opens inline editor sheet')
test('FR-WBADMIN-005: Addon Group inline editor shows current products')
test('FR-WBADMIN-005: Add product to addon group - product selector')
test('FR-WBADMIN-005: Drag-and-drop reorder products in addon group')
test('FR-WBADMIN-005: Remove product from addon group')
test('FR-WBADMIN-005: Save addon group changes')
test('FR-WBADMIN-005: Create new addon group - input group_name')
test('FR-WBADMIN-005: Delete addon group - confirm dialog')
```

**Total Cases**: 10 tests

---

### 4.6 Price Configuration Page (`/admin/widget-builder/pricing`)

**Dependent on**: FR-WBADMIN-006

```typescript
// Test Suite: Widget Builder - Price Configuration

test('FR-WBADMIN-006: Price Config page loads with product tabs')
test('FR-WBADMIN-006: Display tabs: Base Print Cost, Post-Process Cost, Qty Discount, Addon Pricing')
test('FR-WBADMIN-006: Base Print Cost spreadsheet editor loads')
test('FR-WBADMIN-006: Spreadsheet supports inline cell editing')
test('FR-WBADMIN-006: Global price (product_id=NULL) row is labeled "Global"')
test('FR-WBADMIN-006: Post-Process Cost tab shows cost by process')
test('FR-WBADMIN-006: Qty Discount tab shows tier-based discounts')
test('FR-WBADMIN-006: Addon Pricing tab shows addon item costs')
test('FR-WBADMIN-006: Save prices via batch upsert - verify data persists')
test('FR-WBADMIN-006: Price validation - prevent invalid entries')
test('FR-WBADMIN-006: Spreadsheet virtualization - large datasets scroll smoothly')
```

**Total Cases**: 11 tests

---

### 4.7 Widget Orders Page (`/admin/widget-builder/orders`)

**Dependent on**: FR-WBADMIN-007

```typescript
// Test Suite: Widget Builder - Order Management

test('FR-WBADMIN-007: Orders page loads with DataTable')
test('FR-WBADMIN-007: Display order columns: order_id, product_id, customer, status, mes_status, created_at')
test('FR-WBADMIN-007: Status filter - filter by created/paid/in_production/completed')
test('FR-WBADMIN-007: MES Status filter - filter by sync_pending/synced/failed')
test('FR-WBADMIN-007: Product filter - filter by product name')
test('FR-WBADMIN-007: Click order row - opens order detail side panel')
test('FR-WBADMIN-007: Order detail shows selections (JSON)')
test('FR-WBADMIN-007: Order detail shows price breakdown (JSON)')
test('FR-WBADMIN-007: Order detail shows constraint application history')
test('FR-WBADMIN-007: MES Retry button visible for failed orders')
test('FR-WBADMIN-007: Click MES Retry - resend to MES and verify status updates')
test('FR-WBADMIN-007: Verify MES retry action shows loading state and confirmation')
test('FR-WBADMIN-007: Search orders by order_id or customer name')
test('FR-WBADMIN-007: Sort orders by status, mes_status, created_at')
```

**Total Cases**: 14 tests

---

## 5. E2E Test Implementation Priority

### Phase 1: Foundation (Weeks 1-2)
1. Element Types (DataTable-based) ...................... 9 tests
2. Element Choices (DataTable + filter) ................. 10 tests
   - Subtotal: 19 tests

### Phase 2: Complex Editors (Weeks 2-3)
3. Constraint Templates (ConstraintBuilder wrapper) ...... 10 tests
4. Price Configuration (SpreadsheetEditor wrapper) ....... 11 tests
   - Subtotal: 21 tests

### Phase 3: Advanced Features (Weeks 3-4)
5. Recipe Builder (D&D + versioning) .................... 12 tests
6. Addon Groups (Inline D&D editor) ..................... 10 tests
7. Widget Orders (Detail sheets + MES integration) ....... 14 tests
   - Subtotal: 36 tests

### Grand Total: 76 NEW E2E Tests

---

## 6. Recommended Test File Structure

```
apps/admin/__tests__/e2e/
├── widget-builder/
│   ├── elements.test.ts ..................... 9 tests
│   ├── choices.test.ts ..................... 10 tests
│   ├── recipes.test.ts ..................... 12 tests
│   ├── constraint-templates.test.ts ........ 10 tests
│   ├── addons.test.ts ..................... 10 tests
│   ├── pricing.test.ts ..................... 11 tests
│   └── orders.test.ts ..................... 14 tests
├── shared/
│   ├── auth-helpers.ts ..................... Shared login utilities
│   ├── product-helpers.ts .................. Test data creation
│   └── waiters.ts ......................... Custom Playwright waiters
└── spec-wa-001-admin.test.ts ............... Existing (keep)
```

---

## 7. Test Data Requirements

### Seed Data Needed for E2E Tests

| Table | Records | Purpose |
|-------|---------|---------|
| option_element_types | 5-10 | Elements page, Recipe builder |
| option_element_choices | 20-30 | Choices page, Recipe bindings |
| product_recipes | 3-5 | Recipe builder tests, version history |
| recipe_option_bindings | 10-15 | Recipe builder D&D tests |
| constraint_templates | 5 (sys), 2 (custom) | Constraint templates page |
| addon_groups | 3 | Addon groups page |
| addon_group_items | 10-15 | Addon group membership tests |
| product_price_configs | 10-20 | Price configuration tests |
| orders | 20-30 | Orders page, filters, detail view |

**Total seed records**: ~100-130 records
**Seed file**: `apps/admin/__tests__/e2e/fixtures/widget-builder-seed.ts`

---

## 8. Navigation Sidebar Update Required

### Current Sidebar Structure (Line 116-121)

```typescript
{
  label: "Widget Management",
  href: "/admin/widgets",
  icon: Package,
  children: [
    { label: "Widgets", href: "/admin/widgets/list" },
    { label: "Preview", href: "/admin/widgets/preview" },
  ],
},
```

### Proposed New Structure

```typescript
{
  label: "Widget Management",
  href: "/admin/widgets",
  icon: Package,
  children: [
    { label: "Widgets", href: "/admin/widgets/list" },
    { label: "Preview", href: "/admin/widgets/preview" },
  ],
},
{
  label: "Widget Builder",
  href: "/admin/widget-builder",
  icon: Wrench,  // or SmartWidget or BuildingBlocks icon
  children: [
    { label: "Element Types", href: "/admin/widget-builder/elements" },
    { label: "Element Choices", href: "/admin/widget-builder/choices" },
    { label: "Recipe Builder", href: "/admin/widget-builder/recipes" },
    { label: "Constraint Templates", href: "/admin/widget-builder/constraint-templates" },
    { label: "Addon Groups", href: "/admin/widget-builder/addons" },
    { label: "Price Config", href: "/admin/widget-builder/pricing" },
    { label: "Orders", href: "/admin/widget-builder/orders" },
  ],
},
```

---

## 9. Existing Components to Extend

### Data Table Enhancements

Current `<DataTable>` supports:
- ✅ Sorting by column
- ✅ Pagination (10/25/50/100 rows)
- ✅ Toolbar with search
- ✅ Faceted filters
- ✅ Column visibility toggle

**For SPEC-WIDGET-ADMIN-001 pages, enhancement needs**:
- ⚠️ Row-level drag-and-drop (Recipe bindings, Addon groups)
- ⚠️ Inline cell editing (Choices, Pricing)
- ⚠️ Batch operations (Multi-select delete/archive)

### ConstraintBuilder Reuse

The existing `constraint-builder.tsx` component:
- ✅ Already implements ECA (Event-Condition-Action) pattern
- ✅ Used by Step 3 (Constraints) in widget-admin 6-step wizard
- ✅ Can be directly reused for FR-WBADMIN-004 (Constraint Templates)

**Minimal changes needed**:
- Wrap in dialog/sheet for modal presentation
- Add template save/load functionality
- Add system template read-only mode

---

## 10. Summary

### Component Reusability Score

- **DataTable**: 4/7 pages (57%) - HIGH REUSE
- **ConstraintBuilder**: 2/7 pages (29%) - MODERATE REUSE
- **SpreadsheetEditor**: 1/7 pages (14%) - LIMITED REUSE
- **Common UI** (dialog, toggle, etc.): 7/7 pages (100%) - UNIVERSAL REUSE

### E2E Test Coverage

| Category | Existing | Needed | Total |
|----------|----------|--------|-------|
| SPEC-WA-001 Wizard | 34 tests | 0 | 34 tests |
| Screenshots | 7 tests | 0 | 7 tests |
| SPEC-WIDGET-ADMIN-001 | 0 tests | 76 | 76 tests |
| **TOTAL** | **41 tests** | **76 tests** | **117 tests** |

### Development Recommendations

1. **Page Implementation Order**: Elements → Choices → Pricing → Recipes → Constraints → Addons → Orders
2. **Component Creation Priority**: DataTable enhancements first (Elements, Choices, Orders), then editors (Pricing, Constraints)
3. **Parallel Work**: E2E tests can be written in parallel with implementation using stubs
4. **Leverage Existing**: Reuse `constraint-builder.tsx` and `spreadsheet-editor.tsx` heavily

---

## References

- **SPEC**: SPEC-WIDGET-ADMIN-001 (.moai/specs/SPEC-WIDGET-ADMIN-001/spec.md)
- **Existing Tests**:
  - spec-wa-001-admin.test.ts (6-step wizard tests)
  - screenshot-capture.test.ts (visual regression baselines)
- **Component Library**:
  - DataTable: apps/admin/src/components/data-table/
  - Editors: apps/admin/src/components/editors/
  - Common: apps/admin/src/components/common/
- **Sidebar**: apps/admin/src/components/layout/sidebar.tsx (line 116-121)

