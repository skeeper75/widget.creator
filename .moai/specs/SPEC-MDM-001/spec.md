# SPEC-MDM-001: Master Data Management Admin Pages

**SPEC ID**: SPEC-MDM-001
**Title**: Master Data Management Admin Pages
**Created**: 2026-02-28
**Status**: Planned
**Priority**: High
**Assigned**: manager-ddd

---

## 1. Environment

### 1.1 Project Context

- **Application**: Widget Creator Admin (`apps/admin`)
- **Framework**: Next.js 15 App Router, TypeScript 5.9+, tRPC, Drizzle ORM
- **Design System**: Tailwind v4, shadcn/ui, Korean UI
- **Primary Color**: #5538B6 (violet)
- **DB**: PostgreSQL 16 via `@widget-creator/db` (widget builder tables) and `@widget-creator/shared` (huni legacy tables)

### 1.2 Existing Patterns

- **Reference Page**: `apps/admin/src/app/(dashboard)/widget-builder/elements/page.tsx` (DataTable + Dialog + ConfirmDialog + tRPC)
- **Widget Builder Router Pattern**: `apps/admin/src/lib/trpc/routers/widget-builder/element-types.ts` (AnyArg cast workaround for dual drizzle-orm instances)
- **Shared Router Pattern**: `apps/admin/src/lib/trpc/routers/print-modes.ts` (direct `@widget-creator/shared/db/schema` import)

### 1.3 Database Tables

| Table | Schema Package | Router Status | Key Columns |
|-------|---------------|---------------|-------------|
| `product_categories` | `@widget-creator/db` | NEW | id, categoryKey (unique), categoryNameKo, categoryNameEn, displayOrder, isActive, description |
| `wb_products` | `@widget-creator/db` | NEW | id, productKey (unique), productNameKo, categoryId (FK), productType, isPremium, hasEditor, hasUpload, fileSpec (jsonb), isActive, isVisible |
| `printModes` | `@widget-creator/shared` | EXISTING | id, code, name, sides, colorType, priceCode, displayOrder, isActive |
| `postProcesses` | `@widget-creator/shared` | EXISTING | id, code, name, processType, description, priceCode, displayOrder, isActive |

---

## 2. Assumptions

- A-001: The existing tRPC router pattern with AnyArg cast workaround is stable and should be replicated for new widget builder routers.
- A-002: The `printModes` and `postProcesses` existing routers have all needed CRUD procedures (list, getById, create, update, delete).
- A-003: The 4 master data pages share identical UI patterns (DataTable + EditModal + ConfirmDialog) with the elements page.
- A-004: Sidebar navigation structure supports nested `children` arrays as shown in existing nav groups.
- A-005: The `isActive` field follows soft-delete pattern; no hard delete is implemented.
- A-006: Korean UI labels are used for all user-facing text; internal code uses English.

---

## 3. Requirements

### 3.1 Functional Requirements (EARS Format)

#### FR-MDM-001: Product Categories tRPC Router

**WHEN** the admin navigates to the categories page, **THEN** the system **shall** fetch all product categories ordered by displayOrder via the `productCategories.list` procedure.

**WHEN** the admin submits the category creation form with valid data, **THEN** the system **shall** insert a new record into `product_categories` and return the created entity.

**WHEN** the admin submits the category update form, **THEN** the system **shall** update the matching record and set `updatedAt` to the current timestamp.

**WHEN** the admin confirms category deactivation, **THEN** the system **shall** set `isActive = false` on the target record.

**IF** a category with the same `categoryKey` already exists, **THEN** the system **shall** return a CONFLICT error with message "Category key already exists".

#### FR-MDM-002: Widget Products tRPC Router

**WHEN** the admin navigates to the wb-products page, **THEN** the system **shall** fetch all widget products with their associated category names, ordered by displayOrder.

**WHEN** the admin submits the product creation form with valid data, **THEN** the system **shall** insert a new record into `wb_products` and return the created entity.

**WHEN** the admin submits the product update form, **THEN** the system **shall** update the matching record and set `updatedAt` to the current timestamp.

**WHEN** the admin confirms product deactivation, **THEN** the system **shall** set `isActive = false` on the target record.

**IF** a product with the same `productKey` already exists, **THEN** the system **shall** return a CONFLICT error.

**WHEN** the admin lists products, **THEN** the system **shall** include the category name (categoryNameKo) for each product via a join with `product_categories`.

#### FR-MDM-003: Sidebar Navigation

The system **shall** display a "master data" navigation group in the sidebar with icon `Database` and label "master data" (Korean).

**WHEN** the sidebar renders, **THEN** the system **shall** display 4 child navigation links:
1. "category management" -> `/admin/master-data/categories`
2. "widget product management" -> `/admin/master-data/wb-products`
3. "print mode management" -> `/admin/master-data/print-modes`
4. "post-process management" -> `/admin/master-data/post-processes`

**WHILE** any child page is active, **THEN** the parent group **shall** display active state styling (`bg-primary/10 text-primary`).

#### FR-MDM-004: Category Management Page

**WHEN** the admin opens `/admin/master-data/categories`, **THEN** the system **shall** render a DataTable with columns: ID, Category Key, Name (KO), Display Order, Status, Actions.

**WHEN** the admin clicks "Add Category" button, **THEN** the system **shall** open a modal dialog with fields: categoryKey, categoryNameKo, categoryNameEn, displayOrder, description.

**WHEN** the admin clicks "Edit" in the row actions menu, **THEN** the system **shall** open the edit modal pre-populated with existing data.

**WHEN** the admin clicks "Deactivate" in the row actions menu, **THEN** the system **shall** show a confirmation dialog before calling the deactivate procedure.

#### FR-MDM-005: Widget Products Management Page

**WHEN** the admin opens `/admin/master-data/wb-products`, **THEN** the system **shall** render a DataTable with columns: ID, Product Key, Name (KO), Category, Product Type, Premium, Editor, Upload, Display Order, Status, Actions.

**WHEN** the admin clicks "Add Product" button, **THEN** the system **shall** open a modal dialog with fields: productKey, productNameKo, productNameEn, categoryId (select from categories), subcategory, productType, isPremium, hasEditor, hasUpload, fileSpec (JSON editor), thumbnailUrl, displayOrder.

**WHEN** the categoryId select renders, **THEN** the system **shall** fetch active categories from the productCategories.list procedure and display them as options.

#### FR-MDM-006: Print Modes Mirror Page

**WHEN** the admin opens `/admin/master-data/print-modes`, **THEN** the system **shall** render a DataTable mirroring the existing `/processes/print-modes` page using the same `printModes` tRPC router.

**WHEN** the admin performs CRUD operations, **THEN** the system **shall** use the existing `printModes` router procedures (list, getById, create, update, delete).

#### FR-MDM-007: Post-Processes Mirror Page

**WHEN** the admin opens `/admin/master-data/post-processes`, **THEN** the system **shall** render a DataTable mirroring the existing `/processes/post-processes` page using the same `postProcesses` tRPC router.

**WHEN** the admin performs CRUD operations, **THEN** the system **shall** use the existing `postProcesses` router procedures.

### 3.2 Non-Functional Requirements

#### NFR-MDM-001: Performance

- DataTable initial load **shall** complete within 500ms for up to 200 records.
- tRPC query invalidation after mutations **shall** refresh data without full page reload.

#### NFR-MDM-002: Consistency

- All 4 pages **shall** follow the identical UI pattern established in `elements/page.tsx`.
- All toast notifications **shall** use `sonner` toast API.
- All form validation **shall** use Zod schemas consistent with DB constraints.

#### NFR-MDM-003: Accessibility

- All modal dialogs **shall** trap focus and support keyboard navigation.
- All DataTable columns with sorting **shall** use `DataTableColumnHeader` component.

#### NFR-MDM-004: Error Handling

- **IF** a tRPC mutation fails, **THEN** the system **shall** display an error toast with the error message.
- **IF** a unique constraint violation occurs, **THEN** the system **shall** display a user-friendly conflict message.

---

## 4. Specifications

### 4.1 File Structure

```
NEW FILES:
apps/admin/src/app/(dashboard)/master-data/
  categories/page.tsx                        -- Category management page
  wb-products/page.tsx                       -- Widget products management page
  print-modes/page.tsx                       -- Print modes mirror page
  post-processes/page.tsx                    -- Post-processes mirror page

apps/admin/src/lib/trpc/routers/widget-builder/
  product-categories.ts                      -- NEW tRPC router
  wb-products.ts                             -- NEW tRPC router

apps/admin/src/components/widget-builder/
  product-category-edit-modal.tsx            -- Category edit modal
  wb-product-edit-modal.tsx                  -- Product edit modal

MODIFIED FILES:
apps/admin/src/components/layout/sidebar.tsx -- Add "master data" nav group
apps/admin/src/lib/trpc/routers/index.ts     -- Register 2 new routers
```

### 4.2 tRPC Router Design

#### product-categories.ts

```
Procedures:
- list(input: { isActive?: boolean }) -> ProductCategory[]
- getById(input: { id: number }) -> ProductCategory
- create(input: CreateCategorySchema) -> ProductCategory
- update(input: { id: number, data: UpdateCategorySchema }) -> ProductCategory
- deactivate(input: { id: number }) -> { success: true }
```

Schema imports: `productCategories` from `@widget-creator/db`
Pattern: AnyArg cast workaround (same as element-types.ts)

#### wb-products.ts

```
Procedures:
- list(input: { isActive?: boolean, categoryId?: number }) -> WbProductWithCategory[]
- getById(input: { id: number }) -> WbProduct
- create(input: CreateProductSchema) -> WbProduct
- update(input: { id: number, data: UpdateProductSchema }) -> WbProduct
- deactivate(input: { id: number }) -> { success: true }
```

Schema imports: `wbProducts`, `productCategories` from `@widget-creator/db`
Join: Left join `product_categories` for category name in list procedure.

### 4.3 Router Registration

Add to `apps/admin/src/lib/trpc/routers/index.ts`:

```
// Master Data Management (SPEC-MDM-001)
productCategories: productCategoriesRouter,
wbProducts: wbProductsRouter,
```

### 4.4 Navigation Structure

Position in sidebar: After "Process Management" group, before "Price Management".

```typescript
{
  label: "master data",      // Korean: "마스터 데이터"
  href: "/admin/master-data",
  icon: Database,
  children: [
    { label: "카테고리 관리", href: "/admin/master-data/categories" },
    { label: "위젯 상품 관리", href: "/admin/master-data/wb-products" },
    { label: "인쇄방식 관리", href: "/admin/master-data/print-modes" },
    { label: "후가공 관리", href: "/admin/master-data/post-processes" },
  ],
}
```

### 4.5 UI Design Reference

Full wireframes, column definitions, modal layouts, and Korean UX copy are documented in:
`.moai/specs/SPEC-MDM-001/ui-design.md`

### 4.6 Implementation Notes

1. **Dual Drizzle-ORM Workaround**: New widget builder routers MUST use the AnyArg cast pattern from `element-types.ts` to resolve type conflicts between `@widget-creator/db` (postgres dialect) and `@widget-creator/shared` (libsql dialect).

2. **Print Modes / Post-Processes Pages**: These pages reuse EXISTING routers (`printModes`, `postProcesses`). No new backend code is needed. Only new page components that mirror the existing `/processes/*` pages.

3. **Category Select in Products Page**: The wb-products edit modal needs a category selector. Fetch active categories via `trpc.productCategories.list.useQuery({ isActive: true })`.

4. **Soft Delete Pattern**: All entities use `isActive` boolean for soft delete. The deactivate action sets `isActive = false`. No hard delete procedure is exposed.

---

## 5. Expert Consultation Recommendations

- **expert-frontend**: Recommended for DataTable column configuration, modal component patterns, and shadcn/ui integration review.
- **expert-backend**: Recommended for tRPC router design review, particularly the join pattern in wb-products list procedure.

---

## 6. Traceability

| Requirement | Plan Reference | Acceptance Reference |
|-------------|---------------|---------------------|
| FR-MDM-001 | Phase 1 | AC-001, AC-002 |
| FR-MDM-002 | Phase 1 | AC-003, AC-004 |
| FR-MDM-003 | Phase 2 | AC-005 |
| FR-MDM-004 | Phase 3 | AC-006, AC-007 |
| FR-MDM-005 | Phase 3 | AC-008, AC-009 |
| FR-MDM-006 | Phase 3 | AC-010 |
| FR-MDM-007 | Phase 3 | AC-011 |
| NFR-MDM-001..004 | All Phases | AC-012..AC-015 |
