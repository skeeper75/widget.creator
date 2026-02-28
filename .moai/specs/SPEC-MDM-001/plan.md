# SPEC-MDM-001: Implementation Plan

**SPEC ID**: SPEC-MDM-001
**Title**: Master Data Management Admin Pages

---

## Phase Overview

| Phase | Scope | Priority | Files |
|-------|-------|----------|-------|
| Phase 1 | New tRPC Routers | Primary Goal | 2 new files |
| Phase 2 | Sidebar Navigation Update | Primary Goal | 1 modified file |
| Phase 3 | Page Components (4 pages) | Primary Goal | 4 new files |
| Phase 4 | Edit Modal Components | Primary Goal | 2 new files |
| Phase 5 | tRPC Router Registration | Primary Goal | 1 modified file |

**Total**: 8 new files, 2 modified files

---

## Phase 1: New tRPC Routers

**Priority**: Primary Goal
**Dependency**: None (can start immediately)

### Task 1.1: Product Categories Router

**File**: `apps/admin/src/lib/trpc/routers/widget-builder/product-categories.ts`

Implementation approach:
1. Mirror structure from `element-types.ts` (same AnyArg cast pattern)
2. Import `productCategories` from `@widget-creator/db`
3. Define Zod schemas:
   - `CreateCategorySchema`: categoryKey (string, 1-50), categoryNameKo (string, 1-100), categoryNameEn (string, optional), displayOrder (int, default 0), description (string, nullable)
   - `UpdateCategorySchema`: All fields optional except id
4. Implement procedures: list, getById, create, update, deactivate
5. List procedure: order by displayOrder ascending, optional isActive filter
6. Create procedure: check for duplicate categoryKey, throw CONFLICT if exists
7. Deactivate procedure: set isActive = false, updatedAt = now

### Task 1.2: Widget Products Router

**File**: `apps/admin/src/lib/trpc/routers/widget-builder/wb-products.ts`

Implementation approach:
1. Mirror structure from `element-types.ts`
2. Import `wbProducts`, `productCategories` from `@widget-creator/db`
3. Define Zod schemas:
   - `CreateProductSchema`: productKey, productNameKo, productNameEn (optional), categoryId, subcategory (optional), productType (optional), isPremium, hasEditor, hasUpload, fileSpec (json, optional), thumbnailUrl (optional), displayOrder
   - `UpdateProductSchema`: All fields optional except id
4. List procedure: left join with product_categories to include categoryNameKo, order by displayOrder
5. Create procedure: check duplicate productKey, validate categoryId exists
6. Deactivate procedure: set isActive = false

### Technical Notes for Phase 1

- Use `sql` template tag from `drizzle-orm` for updatedAt: `updatedAt: sql`\`now()\``
- Apply the AnyArg cast workaround for `eq`, `asc`, `and`, `sql` operators
- Follow error handling pattern: TRPCError with 'NOT_FOUND' and 'CONFLICT' codes

---

## Phase 2: Sidebar Navigation Update

**Priority**: Primary Goal
**Dependency**: None (can run parallel with Phase 1)

### Task 2.1: Add Master Data Navigation Group

**File**: `apps/admin/src/components/layout/sidebar.tsx`

Implementation approach:
1. Import `Database` icon from `lucide-react`
2. Add new nav group object in the `navItems` array after "Process Management" group
3. Define 4 children links with Korean labels
4. Position before "Price Management" group

```
{
  label: "마스터 데이터",
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

---

## Phase 3: Page Components

**Priority**: Primary Goal
**Dependency**: Phase 1 (routers must exist for tRPC hooks), Phase 2 (navigation)

### Task 3.1: Categories Page

**File**: `apps/admin/src/app/(dashboard)/master-data/categories/page.tsx`

Implementation approach:
1. Mirror `elements/page.tsx` structure exactly
2. "use client" directive
3. Define `ProductCategory` interface matching DB schema
4. Define column definitions: ID, Category Key (mono font), Name KO (font-medium), Display Order, Status (Badge), Actions (DropdownMenu)
5. Use `trpc.productCategories.list.useQuery({})` for data
6. Use `trpc.productCategories.deactivate.useMutation()` for deactivation
7. Render: header with title/subtitle + "Add Category" button, DataTable, EditModal, ConfirmDialog
8. Korean labels: title "카테고리 관리", subtitle "상품 카테고리를 관리합니다"

### Task 3.2: Widget Products Page

**File**: `apps/admin/src/app/(dashboard)/master-data/wb-products/page.tsx`

Implementation approach:
1. Mirror `elements/page.tsx` structure
2. Define `WbProductWithCategory` interface (includes categoryNameKo from join)
3. Column definitions: ID, Product Key, Name KO, Category (badge), Product Type, Premium (boolean badge), Editor (boolean badge), Upload (boolean badge), Display Order, Status, Actions
4. Use `trpc.wbProducts.list.useQuery({})` for data
5. Add filters: Category (from categories list), Status (Active/Inactive), Product Type
6. Korean labels: title "위젯 상품 관리", subtitle "위젯 빌더 상품을 관리합니다"

### Task 3.3: Print Modes Mirror Page

**File**: `apps/admin/src/app/(dashboard)/master-data/print-modes/page.tsx`

Implementation approach:
1. Mirror the existing `apps/admin/src/app/(dashboard)/processes/print-modes/page.tsx`
2. Reuse same `printModes` tRPC router (no new router needed)
3. Identical columns: ID, Code, Name, Sides, Color Type, Price Code, Display Order, Status, Actions
4. Korean labels: title "인쇄방식 관리", subtitle "인쇄방식 마스터 데이터를 관리합니다"

### Task 3.4: Post-Processes Mirror Page

**File**: `apps/admin/src/app/(dashboard)/master-data/post-processes/page.tsx`

Implementation approach:
1. Mirror the existing `apps/admin/src/app/(dashboard)/processes/post-processes/page.tsx`
2. Reuse same `postProcesses` tRPC router
3. Identical columns: ID, Code, Name, Process Type, Description, Price Code, Display Order, Status, Actions
4. Korean labels: title "후가공 관리", subtitle "후가공 마스터 데이터를 관리합니다"

---

## Phase 4: Edit Modal Components

**Priority**: Primary Goal
**Dependency**: Phase 1 (routers), Phase 3 (pages use modals)

### Task 4.1: Category Edit Modal

**File**: `apps/admin/src/components/widget-builder/product-category-edit-modal.tsx`

Implementation approach:
1. Mirror `element-type-edit-modal.tsx` structure
2. Props: open, onOpenChange, editItem (ProductCategory | null)
3. Form fields using shadcn/ui:
   - categoryKey: Input (disabled when editing existing)
   - categoryNameKo: Input (required)
   - categoryNameEn: Input (optional)
   - displayOrder: Input type="number"
   - description: Textarea
4. Use `trpc.productCategories.create.useMutation()` and `trpc.productCategories.update.useMutation()`
5. Invalidate `productCategories.list` on success
6. Toast success/error messages

### Task 4.2: Widget Product Edit Modal

**File**: `apps/admin/src/components/widget-builder/wb-product-edit-modal.tsx`

Implementation approach:
1. Mirror `element-type-edit-modal.tsx` structure
2. Props: open, onOpenChange, editItem (WbProduct | null)
3. Form fields:
   - productKey: Input (disabled when editing)
   - productNameKo: Input (required)
   - productNameEn: Input (optional)
   - categoryId: Select (fetch from productCategories.list)
   - subcategory: Input (optional)
   - productType: Input (optional)
   - isPremium: Switch
   - hasEditor: Switch
   - hasUpload: Switch (default true)
   - fileSpec: Textarea for JSON (optional)
   - thumbnailUrl: Input (optional)
   - displayOrder: Input type="number"
4. Category select populated via `trpc.productCategories.list.useQuery({ isActive: true })`
5. Invalidate `wbProducts.list` on success

---

## Phase 5: tRPC Router Registration

**Priority**: Primary Goal
**Dependency**: Phase 1 (routers must be created first)

### Task 5.1: Register New Routers

**File**: `apps/admin/src/lib/trpc/routers/index.ts`

Implementation approach:
1. Add imports for `productCategoriesRouter` and `wbProductsRouter`
2. Add to `appRouter` object under a new "Master Data Management (SPEC-MDM-001)" comment section
3. Keys: `productCategories` and `wbProducts`

---

## Risks and Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Dual drizzle-orm type conflict | Router compilation fails | Apply proven AnyArg cast workaround from element-types.ts |
| Category FK constraint on product deletion | Cannot deactivate category with active products | Show warning in UI; deactivate only sets isActive=false |
| Mirror page divergence from original | Inconsistent behavior between /processes/* and /master-data/* | Share tRPC router; only UI layer is duplicated |
| Large product list performance | Slow initial load | Use server-side filtering via isActive and categoryId params |

---

## Architecture Notes

```
apps/admin/
  src/
    app/(dashboard)/
      master-data/
        categories/page.tsx      -- uses productCategories router (NEW)
        wb-products/page.tsx     -- uses wbProducts router (NEW)
        print-modes/page.tsx     -- uses printModes router (EXISTING)
        post-processes/page.tsx  -- uses postProcesses router (EXISTING)
    components/widget-builder/
      product-category-edit-modal.tsx  -- NEW
      wb-product-edit-modal.tsx        -- NEW
    lib/trpc/routers/
      widget-builder/
        product-categories.ts    -- NEW (imports from @widget-creator/db)
        wb-products.ts           -- NEW (imports from @widget-creator/db)
      index.ts                   -- MODIFIED (register 2 new routers)
    components/layout/
      sidebar.tsx                -- MODIFIED (add nav group)
```

---

## Definition of Done

- [ ] 2 new tRPC routers with full CRUD procedures
- [ ] 4 new admin pages rendering DataTables with correct columns
- [ ] 2 new edit modal components
- [ ] Sidebar shows "마스터 데이터" group with 4 children
- [ ] All routers registered in index.ts
- [ ] No TypeScript compilation errors
- [ ] Consistent UI pattern with elements/page.tsx
- [ ] All toast notifications working for CRUD operations
- [ ] Deactivation confirmation dialogs functioning
