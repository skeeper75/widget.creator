# SPEC-MDM-001: Acceptance Criteria

**SPEC ID**: SPEC-MDM-001
**Title**: Master Data Management Admin Pages

---

## AC-001: Product Categories Router - List

**Given** the product_categories table has records
**When** the admin calls `productCategories.list` with no filters
**Then** all categories are returned ordered by displayOrder ascending

**Given** the product_categories table has active and inactive records
**When** the admin calls `productCategories.list` with `{ isActive: true }`
**Then** only active categories are returned

---

## AC-002: Product Categories Router - Create & Deactivate

**Given** no category with categoryKey "test-key" exists
**When** the admin calls `productCategories.create` with `{ categoryKey: "test-key", categoryNameKo: "test" }`
**Then** a new record is created and returned with id, createdAt, updatedAt set

**Given** a category with categoryKey "test-key" already exists
**When** the admin calls `productCategories.create` with `{ categoryKey: "test-key", categoryNameKo: "duplicate" }`
**Then** a CONFLICT TRPCError is thrown with message containing "already exists"

**Given** a category with id=1 exists and isActive=true
**When** the admin calls `productCategories.deactivate` with `{ id: 1 }`
**Then** the record is updated to isActive=false and updatedAt is refreshed

---

## AC-003: Widget Products Router - List with Join

**Given** wb_products has records with valid categoryId references
**When** the admin calls `wbProducts.list` with no filters
**Then** each product includes the `categoryNameKo` field from the joined product_categories table
**And** results are ordered by displayOrder ascending

**Given** products belong to different categories
**When** the admin calls `wbProducts.list` with `{ categoryId: 3 }`
**Then** only products with categoryId=3 are returned

---

## AC-004: Widget Products Router - Create & Deactivate

**Given** no product with productKey "widget-test" exists
**When** the admin calls `wbProducts.create` with valid data including `{ productKey: "widget-test", productNameKo: "test product", categoryId: 1 }`
**Then** a new record is created and returned

**Given** a product with productKey "widget-test" already exists
**When** the admin calls `wbProducts.create` with `{ productKey: "widget-test" }`
**Then** a CONFLICT TRPCError is thrown

**Given** a product with id=1 exists and isActive=true
**When** the admin calls `wbProducts.deactivate` with `{ id: 1 }`
**Then** the record is updated to isActive=false

---

## AC-005: Sidebar Navigation

**Given** the admin app sidebar renders
**When** the page loads
**Then** a "마스터 데이터" nav group appears with Database icon
**And** the group has 4 child links: "카테고리 관리", "위젯 상품 관리", "인쇄방식 관리", "후가공 관리"
**And** the group is positioned after "Process Management" and before "Price Management"

**Given** the admin navigates to `/admin/master-data/categories`
**When** the sidebar renders
**Then** the "마스터 데이터" parent group shows active styling (bg-primary/10 text-primary)
**And** the "카테고리 관리" child link shows active styling (font-medium text-primary)

---

## AC-006: Categories Page - DataTable Rendering

**Given** the admin navigates to `/admin/master-data/categories`
**When** the page loads
**Then** a DataTable renders with columns: ID, Category Key, Name (KO), Display Order, Status, Actions
**And** the page title shows "카테고리 관리"
**And** the subtitle shows "상품 카테고리를 관리합니다"
**And** a "카테고리 추가" button is visible in the header

---

## AC-007: Categories Page - CRUD Operations

**Given** the categories page is loaded
**When** the admin clicks "카테고리 추가"
**Then** a modal dialog opens with empty form fields: categoryKey, categoryNameKo, categoryNameEn, displayOrder, description

**Given** the edit modal is open with valid data
**When** the admin submits the form
**Then** a success toast "카테고리가 생성되었습니다" appears
**And** the DataTable refreshes to include the new record

**Given** a category row exists in the DataTable
**When** the admin clicks the actions menu and selects "Edit"
**Then** the edit modal opens with form fields pre-populated with existing data
**And** the categoryKey field is disabled

**Given** a category row with isActive=true exists
**When** the admin clicks the actions menu and selects "Deactivate"
**Then** a confirmation dialog appears with the category name
**And** confirming sets isActive=false and shows success toast

---

## AC-008: Widget Products Page - DataTable Rendering

**Given** the admin navigates to `/admin/master-data/wb-products`
**When** the page loads
**Then** a DataTable renders with columns: ID, Product Key, Name (KO), Category, Product Type, Premium, Editor, Upload, Display Order, Status, Actions
**And** the Category column shows categoryNameKo from the joined table
**And** boolean fields (Premium, Editor, Upload) render as badges

---

## AC-009: Widget Products Page - CRUD Operations

**Given** the wb-products page is loaded
**When** the admin clicks "상품 추가"
**Then** a modal dialog opens with form fields including a category dropdown populated from active categories

**Given** the product edit modal is open
**When** the admin selects a category from the dropdown
**Then** the categoryId is set to the selected category's id

**Given** the product edit modal is submitted with valid data
**When** the create mutation succeeds
**Then** a success toast appears and the DataTable refreshes

**Given** an existing product row
**When** the admin selects "Deactivate" from actions
**Then** a confirmation dialog shows the product name
**And** confirmation sets isActive=false with success toast

---

## AC-010: Print Modes Mirror Page

**Given** the admin navigates to `/admin/master-data/print-modes`
**When** the page loads
**Then** a DataTable renders using the existing `printModes` tRPC router
**And** columns match the existing `/processes/print-modes` page
**And** CRUD operations (create, edit, deactivate) work identically to the original page

---

## AC-011: Post-Processes Mirror Page

**Given** the admin navigates to `/admin/master-data/post-processes`
**When** the page loads
**Then** a DataTable renders using the existing `postProcesses` tRPC router
**And** columns match the existing `/processes/post-processes` page
**And** CRUD operations work identically to the original page

---

## AC-012: Performance (NFR)

**Given** the product_categories table has up to 200 records
**When** the categories page loads
**Then** the DataTable renders within 500ms

**Given** a mutation completes successfully
**When** tRPC query invalidation fires
**Then** the DataTable refreshes without a full page reload

---

## AC-013: Consistency (NFR)

**Given** any of the 4 master data pages
**When** inspecting the UI structure
**Then** the page follows the same pattern as `elements/page.tsx`:
- Header with title + subtitle + action button
- DataTable with column headers using DataTableColumnHeader
- Actions dropdown with Pencil (Edit) and PowerOff (Deactivate) icons
- Edit modal using Dialog component from shadcn/ui
- Confirmation dialog using ConfirmDialog component

---

## AC-014: Accessibility (NFR)

**Given** the edit modal is open
**When** the user presses Tab
**Then** focus cycles through form fields within the modal (focus trap)

**Given** the confirmation dialog is open
**When** the user presses Escape
**Then** the dialog closes without performing the action

---

## AC-015: Error Handling (NFR)

**Given** a tRPC mutation fails with a server error
**When** the error callback fires
**Then** an error toast displays with the error message from TRPCError

**Given** the admin tries to create a category with a duplicate categoryKey
**When** the server returns CONFLICT
**Then** the toast shows "이미 존재하는 카테고리 키입니다" (or similar conflict message)

---

## Quality Gate Criteria

| Gate | Criterion | Target |
|------|-----------|--------|
| TypeScript | Zero compilation errors | 0 errors |
| Lint | Zero ESLint errors | 0 errors |
| UI Pattern | Matches elements/page.tsx pattern | Visual parity |
| tRPC | All procedures callable from client | 100% |
| Navigation | All 4 pages reachable from sidebar | 100% |
| Soft Delete | isActive toggle works on all entities | 100% |

---

## Test Scenarios Summary

| Scenario | Type | Covers |
|----------|------|--------|
| Category CRUD procedures | Unit/Integration | FR-MDM-001 |
| Product CRUD procedures with join | Unit/Integration | FR-MDM-002 |
| Sidebar navigation rendering | Component | FR-MDM-003 |
| Category page DataTable + modal | Component | FR-MDM-004 |
| Product page DataTable + modal + category select | Component | FR-MDM-005 |
| Print modes mirror page | Component | FR-MDM-006 |
| Post-processes mirror page | Component | FR-MDM-007 |
| Duplicate key conflict handling | Integration | NFR-MDM-004 |
| Deactivation confirmation flow | E2E | FR-MDM-004..007 |
