# UI/UX Design Specification: Widget Builder Admin Pages

**SPEC:** SPEC-WIDGET-ADMIN-001
**Date:** 2026-02-28
**Author:** team-analyst
**Status:** Complete

---

## Design System Foundation

### HuniPrinting Design Tokens (Confirmed from badge.tsx / button.tsx)

```
Primary:         bg-primary (#5538B6)  text-primary-foreground (#FFFFFF)
Primary Dark:    hover:bg-primary-dark (#351D87)
Primary Light:   bg-primary-50 (#EEEBF9)  hover:bg-primary-100
Warning:         bg-warning (#E6B93F)  text-warning-foreground
Success:         bg-success (#7AC8C4)  text-success-foreground
Destructive:     bg-destructive (#C7000B) text-destructive-foreground
Secondary:       bg-secondary  text-secondary-foreground
Border:          border-border (--gray-200 #CACACA)
Body Text:       text-foreground (--gray-700 #424242)
Muted/Disabled:  bg-gray-50 (#F6F6F6)
Placeholder:     text-muted-foreground (--gray-400 #979797)
```

### shadcn Component Variants Available

**Badge variants:** `default` | `warning` | `success` | `destructive` | `outline` | `secondary`
**Button variants:** `default` | `destructive` | `outline` | `secondary` | `ghost` | `neutral` | `link`
**Button sizes:** `default` (h-10) | `sm` (h-8) | `lg` (h-[50px]) | `icon` (h-10 w-10)

### Design Principles (Toss-inspired, applied to this SPEC)

- **P1 Minimum Feature**: Each page shows only what is needed for the specific management task
- **P2 Data Density**: Key counts (total records, active count) shown in page header subtitle
- **P3 Clear Action Hierarchy**: One primary `Button variant="default"` per page; secondary actions use `outline` or `ghost`
- **P4 Contextual Navigation**: Breadcrumb for all pages (`Widget Builder > {Page}`)
- **P5 Efficient Data Management**: Inline edits via sheet/dialog; avoid full-page navigation for simple edits

---

## Shared Layout Shell

All 7 pages share the existing dashboard layout:

```
+================================================================+
| [Sidebar w-64]  [Topbar: breadcrumb]                           |
|                                                                  |
|   Widget Builder > {Page Title}                                 |
|                                                                  |
|   [Page Header]                                                  |
|   [Page Content]                                                 |
+================================================================+
```

**Sidebar addition** (under Widget Management group, `sidebar.tsx`):
```
Widget Builder  (new sub-group header, icon: Blocks from lucide-react)
  Element Types     /admin/widget-builder/elements
  Element Choices   /admin/widget-builder/choices
  Recipes           /admin/widget-builder/recipes
  Constraints       /admin/widget-builder/constraint-templates
  Addon Groups      /admin/widget-builder/addons
  Pricing           /admin/widget-builder/pricing
  Orders            /admin/widget-builder/orders
```

---

## Page 1: Element Types

**Route:** `/admin/widget-builder/elements`
**DB Table:** `option_element_types`
**Pattern:** CRUD DataTable

### 1.1 ASCII Wireframe

```
+================================================================+
| Widget Builder > Element Types                                   |
|                                                                  |
| Element Types                          [+ Add Element Type]     |
| Manage option type vocabulary (12 active types)                  |
+================================================================+
|                                                                  |
| [Search type key or name...]  [Category v]  [All | Active | Inactive]
|                                                                  |
| +------+------------+------------+----------+---------+---+----+|
| | ID   | Type Key   | Name (KO)  | Category | UI Ctrl |Ord|    ||
| +------+------------+------------+----------+---------+---+----+|
| |  1   | paper      | 용지       | material | toggle  | 1 | .. ||
| |      |            |            |          | [group] |   |    ||
| +------+------------+------------+----------+---------+---+----+|
| |  2   | size       | 사이즈     | spec     | select  | 2 | .. ||
| |      | [active]   |            |          |         |   |    ||
| +------+------------+------------+----------+---------+---+----+|
| |  3   | quantity   | 수량       | quantity | stepper | 3 | .. ||
| |      | [active]   |            |          |         |   |    ||
| +------+------------+------------+----------+---------+---+----+|
| |  4   | coating    | 코팅       | process  | toggle  | 4 | .. ||
| |      |            |            |          | [group] |   |    ||
| +------+------------+------------+----------+---------+---+----+|
| |  5   | binding    | 제본       | process  | select  | 5 | .. ||
| |      | [inactive] |            |          |         |   |    ||
| +------+------------+------------+----------+---------+---+----+|
|                                                                  |
| Showing 1-10 of 12    [< Prev]  1  2  [Next >]  [10 per page v]|
+================================================================+
```

**Status badge positioning:** Inline in ID cell below the ID number (not a separate column).

### 1.2 Component List with Tailwind Classes

**Page header:**
```tsx
<div className="flex items-center justify-between mb-6">
  <div>
    <h1 className="text-2xl font-semibold tracking-tight text-foreground">
      Element Types
    </h1>
    <p className="text-sm text-muted-foreground mt-1">
      Manage option type vocabulary ({activeCount} active types)
    </p>
  </div>
  <Button variant="default" size="default">
    <Plus className="mr-2 h-4 w-4" />
    Add Element Type
  </Button>
</div>
```

**Toolbar (DataTableToolbar pattern):**
```tsx
<div className="flex items-center gap-2 mb-4">
  <Input
    placeholder="Search type key or name..."
    className="h-8 w-[200px] lg:w-[250px]"
  />
  <DataTableFacetedFilter
    column={table.getColumn("category")}
    title="Category"
    options={categoryOptions}  // material | process | spec | quantity | group
  />
  <ActiveToggle value={activeFilter} onChange={setActiveFilter} />
</div>
```

**Table columns (`useElementTypeColumns` hook):**
```
Column: ID
  - Width: w-16
  - Content: <span>{row.id}</span>
  - Below ID: <Badge variant={row.isActive ? "default" : "secondary"}>{row.isActive ? "Active" : "Inactive"}</Badge>

Column: Type Key
  - Width: flex-1
  - Content: <code className="font-mono text-xs bg-gray-50 border border-border rounded px-1.5 py-0.5">{row.typeKey}</code>

Column: Name (KO)
  - Width: w-36
  - Content: <span className="text-foreground">{row.typeNameKo}</span>

Column: Category
  - Width: w-28
  - Content: <Badge variant="outline" className="capitalize">{row.optionCategory}</Badge>

Column: UI Control
  - Width: w-28
  - Content: <code className="text-xs font-mono text-muted-foreground">{row.uiControl}</code>

Column: Order
  - Width: w-16
  - Content: <span className="text-center text-muted-foreground tabular-nums">{row.displayOrder}</span>

Column: Actions (...)
  - Width: w-10
  - Content: DropdownMenu with: Edit, View Choices, Toggle Active, Delete (disabled if has choices)
```

**Status badge mapping:**
- `isActive = true` → `<Badge variant="default">Active</Badge>` (bg-primary)
- `isActive = false` → `<Badge variant="secondary">Inactive</Badge>` (bg-secondary)

### 1.3 State Management

**Loading state:**
```tsx
// Skeleton rows: 5 rows x column widths
<TableRow>
  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
  ...
</TableRow>
```

**Empty state (no results):**
```tsx
<EmptyState
  icon={<Tag className="h-8 w-8 text-muted-foreground" />}
  title="No element types found"
  description="Create the first element type to start building widget options."
  action={<Button variant="default">Add Element Type</Button>}
/>
```

**Error state:** Toast `sonner` error notification + `<Alert variant="destructive">` inline.

**Delete blocked state:** When user clicks Delete on a type that has choices:
```tsx
<Alert className="border-warning bg-warning/10">
  <AlertTriangle className="h-4 w-4 text-warning" />
  <AlertDescription>
    Cannot delete: {choiceCount} choices reference this element type.
    Deactivate all choices first.
  </AlertDescription>
</Alert>
```

### 1.4 Interaction Patterns

**Add/Edit (Sheet pattern):**
```
Click "+ Add Element Type" → Sheet opens from right (w-96)
  Form fields:
    - Type Key (Input, required, validates /^[a-z_]+$/, immutable after save)
    - Name KO (Input, required)
    - Name EN (Input, required)
    - Category (Select: material | process | spec | quantity | group)
    - UI Control (Select: toggle-group | select | stepper | number-input)
    - Display Order (Input type=number, min=1)
    - Allows Custom (Switch)
  Footer: [Cancel] [Save Element Type]
```

**Row actions DropdownMenu:**
```
Edit        → opens Sheet (same as Add but pre-filled, type_key disabled)
View Choices → navigates to /admin/widget-builder/choices?elementTypeId={id}
Toggle Active → ConfirmDialog → Switch isActive via mutation
Delete       → ConfirmDialog (disabled/grayed if choiceCount > 0, tooltip explains why)
```

**Hover state:** `hover:bg-primary-50` on table rows (TableRow className).

### 1.5 Accessibility

- Table has `role="table"`, `aria-label="Element types management table"`
- Sort buttons: `aria-sort="ascending|descending|none"`
- Action menu trigger: `aria-label="Actions for {typeKey}"`
- Add button: `aria-label="Add new element type"`
- Status badge: `aria-label="{typeKey} is {active/inactive}"`
- Keyboard nav: Tab → Search → Filters → Table rows (arrow keys) → Row actions (Enter)
- Delete button when disabled: `aria-disabled="true"` + `title="Cannot delete: has choices"`

---

## Page 2: Element Choices

**Route:** `/admin/widget-builder/choices`
**DB Table:** `option_element_choices`
**Pattern:** CRUD DataTable with required parent filter

### 2.1 ASCII Wireframe

```
+================================================================+
| Widget Builder > Element Choices                                 |
|                                                                  |
| Element Choices                        [+ Add Choice]           |
| Manage choices for each element type                             |
+================================================================+
|                                                                  |
| [Element Type: paper (용지) v] (REQUIRED)  [Search code/name..]|
| [All | Active | Inactive]                                        |
|                                                                  |
| +-----+-----------+-----------+----------+-------+------+------+|
| | ID  | Choice Key| Name (KO) | MES Code | Order | Used | ...  ||
| +-----+-----------+-----------+----------+-------+------+------+|
| |  1  | ART250    | 아트 250g | MAT001   |   1   |  12  | ..   ||
| |     | [active]  |           |          |       |      |      ||
| +-----+-----------+-----------+----------+-------+------+------+|
| |  2  | ART300    | 아트 300g | MAT002   |   2   |   8  | ..   ||
| |     | [active]  |           |          |       |      |      ||
| +-----+-----------+-----------+----------+-------+------+------+|
| |  3  | SNOW250   | 스노우250 | MAT003   |   3   |   3  | ..   ||
| |     | [warning] |           |          |       |      |      ||
| |     | Used in 3 active bindings                              ||
| +-----+-----------+-----------+----------+-------+------+------+|
| |  4  | OPP       | OPP 필름  | MAT004   |   4   |   0  | ..   ||
| |     | [inactive]|           |          |       |      |      ||
| +-----+-----------+-----------+----------+-------+------+------+|
|                                                                  |
| Showing 1-4 of 4    [< Prev]  1  [Next >]  [10 per page v]     |
+================================================================+
```

**Special row state:** When a choice is inactive but referenced in recipe bindings, show a warning sub-row.

### 2.2 Component List with Tailwind Classes

**Required filter banner (shown when no element type selected):**
```tsx
<div className="flex items-center gap-3 p-4 border border-border rounded-lg bg-gray-50 mb-4">
  <Info className="h-4 w-4 text-muted-foreground flex-shrink-0" />
  <span className="text-sm text-muted-foreground">
    Select an element type above to view its choices.
  </span>
</div>
```

**Toolbar:**
```tsx
<div className="flex items-center gap-2 mb-4 flex-wrap">
  {/* Required: Element Type selector */}
  <Select value={elementTypeId} onValueChange={setElementTypeId}>
    <SelectTrigger className="h-8 w-[220px]">
      <SelectValue placeholder="Select element type..." />
    </SelectTrigger>
    <SelectContent>
      {elementTypes.map(et => (
        <SelectItem key={et.id} value={String(et.id)}>
          {et.typeKey} ({et.typeNameKo})
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
  <Separator orientation="vertical" className="h-6" />
  <Input placeholder="Search code or name..." className="h-8 w-[180px]" />
  <ActiveToggle value={activeFilter} onChange={setActiveFilter} />
</div>
```

**Table columns (`useElementChoiceColumns` hook):**
```
Column: ID
  - Content: ID + Badge (active/inactive/warning)
  - Warning badge: Badge variant="warning" when isActive=false AND usageCount > 0

Column: Choice Key
  - Content: <code className="font-mono text-xs bg-gray-50 border border-border rounded px-1.5 py-0.5">

Column: Name (KO)
  - Standard text

Column: MES Code
  - Content: <code className="font-mono text-xs text-muted-foreground">
  - Empty: <span className="text-muted-foreground italic text-xs">—</span>

Column: Order
  - Numeric, right-aligned, tabular-nums

Column: Used (recipe binding count)
  - Content: number badge
  - 0 usages: <span className="text-muted-foreground">0</span>
  - >0 usages: <Badge variant="outline">{count}</Badge>

Column: Actions
  - DropdownMenu: Edit, Toggle Active, Delete (disabled if usageCount > 0)
```

**Warning inline row (when isActive=false AND usageCount > 0):**
```tsx
<TableRow className="bg-warning/5 border-l-2 border-l-warning">
  <TableCell colSpan={7}>
    <div className="flex items-center gap-2 py-1 pl-2">
      <AlertTriangle className="h-3.5 w-3.5 text-warning" />
      <span className="text-xs text-warning-foreground">
        This inactive choice is referenced in {usageCount} active recipe binding(s).
        Deactivating may affect active products.
      </span>
    </div>
  </TableCell>
</TableRow>
```

### 2.3 State Management

**Initial state (no element type selected):**
- Table hidden
- EmptyState banner prompting element type selection

**Loading (element type selected, fetching):**
- TableSkeleton with 5 rows

**Empty (element type selected, no choices):**
```tsx
<EmptyState
  icon={<ListChecks className="h-8 w-8 text-muted-foreground" />}
  title="No choices for this element type"
  description="Add the first choice to define available options for {typeName}."
  action={<Button variant="default">Add Choice</Button>}
/>
```

### 2.4 Interaction Patterns

**Add/Edit Sheet:**
```
Fields:
  - Choice Key (Input, required, immutable after save, /^[A-Z0-9_]+$/)
  - Name KO (Input, required)
  - Name EN (Input)
  - MES Code (Input, maps to MES system)
  - Display Order (Input type=number)
  - Active (Switch, default=true)
Footer: [Cancel] [Save Choice]
```

**Deactivate with usage warning:**
```
ConfirmDialog content when usageCount > 0:
  Title: "Deactivate choice with active bindings?"
  Description: "This choice is used in {count} recipe binding(s).
                Deactivating will not remove the bindings but may cause
                validation errors when customers configure orders."
  Confirm button: Button variant="destructive" "Deactivate Anyway"
  Cancel: Button variant="outline" "Cancel"
```

### 2.5 Accessibility

- Element type selector: `aria-label="Filter by element type (required)"` + `aria-required="true"`
- Warning rows: `role="status"` `aria-live="polite"`
- Delete disabled: `aria-disabled="true"` + tooltip "Cannot delete: used in {count} recipe bindings"

---

## Page 3: Recipes

**Route:** `/admin/widget-builder/recipes`
**DB Tables:** `product_recipes`, `recipe_option_bindings`
**Pattern:** Split panel (list left + detail right)

### 3.1 ASCII Wireframe

```
+================================================================+
| Widget Builder > Recipes                                         |
|                                                                  |
| Recipes                               [+ New Recipe]            |
| Manage product recipes and option bindings                       |
+================================================================+
|                      |                                           |
| RECIPE LIST (w-80)   | RECIPE DETAIL (flex-1)                   |
|                      |                                           |
| [Search recipes...]  | Recipe: 일반명함 기본                    |
|                      | +-----------------------------------------+
| [Product: All v]     | | Recipe Info                             |
| [All | Active | Arch]| | Name: 일반명함 기본 레시피              |
|                      | | Product: 일반명함                       |
| > 일반명함 기본  v2  | | Version: [v2] [Default] [Active]        |
|   [default] [active] | +-----------------------------------------+
|                      |                                           |
| > 일반명함 기본  v1  | Bound Elements            [+ Bind Element]|
|   [archived]         | +------+--------+-------+-------+---+---+ |
|                      | | =    | Type   | Req   | Def   |Ord|[x]| |
| > 고급명함 프리미엄  | | ---  | paper  | Yes   |ART250 | 1 |[x]| |
|   [default] [active] | | =    | size   | Yes   |90x50  | 2 |[x]| |
|                      | | =    | qty    | Yes   | 100   | 3 |[x]| |
| > 스티커 기본    v1  | | =    | coating| No    | None  | 4 |[x]| |
|   [default] [active] | +------+--------+-------+-------+---+---+ |
|                      |                                           |
|                      | [Save Recipe]    [Archive Recipe]         |
+================================================================+
```

### 3.2 Component List with Tailwind Classes

**Split panel container:**
```tsx
<ResizablePanelGroup direction="horizontal" className="h-full">
  <ResizablePanel defaultSize={28} minSize={22} maxSize={40}>
    {/* Recipe list */}
  </ResizablePanel>
  <ResizableHandle />
  <ResizablePanel defaultSize={72}>
    {/* Recipe detail */}
  </ResizablePanel>
</ResizablePanelGroup>
```

**Recipe list item:**
```tsx
<button
  className={cn(
    "w-full text-left px-4 py-3 border-b border-border hover:bg-primary-50 transition-colors",
    selected && "bg-primary-50 border-l-2 border-l-primary"
  )}
>
  <div className="flex items-center justify-between mb-1">
    <span className="text-sm font-medium text-foreground truncate">{recipe.recipeName}</span>
    <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
      v{recipe.recipeVersion}
    </Badge>
  </div>
  <div className="flex items-center gap-1.5 flex-wrap">
    {recipe.isDefault && <Badge variant="default" className="text-xs">Default</Badge>}
    {recipe.isArchived
      ? <Badge variant="secondary" className="text-xs">보관됨</Badge>
      : <Badge variant="success" className="text-xs">Active</Badge>
    }
  </div>
</button>
```

**Element binding table with drag-and-drop (`@dnd-kit/sortable`):**
```tsx
<DndContext sensors={sensors} onDragEnd={handleDragEnd}>
  <SortableContext items={bindings.map(b => b.id)}>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8" /> {/* drag handle */}
          <TableHead>Element Type</TableHead>
          <TableHead className="w-20">Required</TableHead>
          <TableHead className="w-32">Default Value</TableHead>
          <TableHead className="w-16">Order</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {bindings.map(binding => (
          <SortableBindingRow key={binding.id} binding={binding} />
        ))}
      </TableBody>
    </Table>
  </SortableContext>
</DndContext>
```

**Archive badge:**
```tsx
<Badge variant="secondary">보관됨</Badge>   // isArchived = true
<Badge variant="outline">v{version}</Badge>  // version indicator
```

**Archived recipe overlay (read-only state):**
```tsx
{recipe.isArchived && (
  <div className="absolute inset-0 bg-gray-50/70 flex items-center justify-center z-10 rounded-md">
    <div className="text-center">
      <Badge variant="secondary" className="text-sm mb-2">보관된 레시피</Badge>
      <p className="text-xs text-muted-foreground">이 레시피는 읽기 전용입니다.</p>
    </div>
  </div>
)}
```

**Action buttons (bottom of detail panel):**
```tsx
<div className="flex items-center gap-3 pt-4 border-t border-border">
  <Button variant="default" onClick={handleSave} disabled={recipe.isArchived}>
    Save Recipe
  </Button>
  <Button
    variant="ghost"
    onClick={handleArchive}
    disabled={recipe.isArchived}
    className="text-muted-foreground"
  >
    Archive Recipe
  </Button>
</div>
```

### 3.3 State Management

**No recipe selected:**
```tsx
<div className="flex-1 flex items-center justify-center bg-gray-50">
  <EmptyState
    icon={<BookOpen className="h-8 w-8 text-muted-foreground" />}
    title="Select a recipe"
    description="Choose a recipe from the list to view and edit its option bindings."
  />
</div>
```

**Archive confirmation dialog:**
```tsx
<ConfirmDialog
  title="Archive this recipe?"
  description={`Recipe v${recipe.recipeVersion} will be archived. A new recipe version will be created for future edits. Existing orders using this recipe will not be affected.`}
  confirmLabel="Archive"
  confirmVariant="destructive"
/>
```

**Unsaved changes warning:**
- Use existing `useUnsavedChanges` hook
- Shows browser beforeunload + in-app dialog when navigating away

### 3.4 Interaction Patterns

**New recipe flow:**
```
Click "+ New Recipe" → Sheet opens
  Fields:
    - Product (Select, required)
    - Recipe Name (Input, required)
    - Set as Default (Switch)
  Footer: [Cancel] [Create Recipe]
  After create: Detail panel shows new empty recipe
```

**Bind Element flow:**
```
Click "+ Bind Element" → Dialog opens
  Fields:
    - Element Type (Select, shows unbound types only)
    - Required (Switch, default=true)
    - Default Value (Input or Select based on element type's choices)
    - Display Order (auto-incremented, editable)
  Footer: [Cancel] [Bind]
```

**Drag-and-drop sort:**
- Drag handle icon (GripVertical) at start of each row
- `cursor-grab` while idle, `cursor-grabbing` while dragging
- Visual indicator: row opacity 0.5 while dragging, dashed border on drop target
- Auto-saves sort order via `recipe_option_bindings.sortOrder` mutation on drop

### 3.5 Accessibility

- Recipe list: `role="listbox"` `aria-label="Recipe list"`
- Each recipe item: `role="option"` `aria-selected={selected}`
- Drag handles: `aria-label="Drag to reorder {elementType}"` `aria-roledescription="drag handle"`
- Archived recipe: `aria-disabled="true"` on Save/Archive buttons
- Keyboard sort alternative: Up/Down arrow buttons on each row when drag is not available

---

## Page 4: Constraint Templates

**Route:** `/admin/widget-builder/constraint-templates`
**DB Table:** `constraint_templates`
**Pattern:** CRUD DataTable + Detail Sheet

### 4.1 ASCII Wireframe

```
+================================================================+
| Widget Builder > Constraint Templates                            |
|                                                                  |
| Constraint Templates                  [+ Create Template]        |
| Reusable ECA rule templates (18 templates, 4 system)            |
+================================================================+
|                                                                  |
| [Search templates...]  [Category: All v]  [System | Custom | All]
|                                                                  |
| +-----+------------------+-----------+--------+-------+---------+
| | ID  | Template Name    | Category  | Trigger| Usage | Actions |
| +-----+------------------+-----------+--------+-------+---------+
| |  1  | 용지→코팅 제한   | material  | paper  |  12   | [view]  |
| |     | [system]         |           |        |       | -- --   |
| +-----+------------------+-----------+--------+-------+---------+
| |  2  | 사이즈→후가공    | spec      | size   |   8   | [edit]  |
| |     | [custom]         |           |        |       | [delete]|
| +-----+------------------+-----------+--------+-------+---------+
| |  3  | 수량→가격단계    | quantity  | qty    |  22   | [view]  |
| |     | [system]         |           |        |       | -- --   |
| +-----+------------------+-----------+--------+-------+---------+
|                                                                  |
| Showing 1-10 of 18    [< Prev]  1  2  [Next >]                  |
+================================================================+
```

### 4.2 Component List with Tailwind Classes

**System vs Custom badge:**
```tsx
// System template (is_system = true)
<Badge variant="secondary" className="text-xs">시스템</Badge>

// Custom template (is_system = false)
<Badge variant="outline" className="text-xs">커스텀</Badge>
```

**Table columns (`useConstraintTemplateColumns` hook):**
```
Column: ID + Type Badge
  - ID number
  - Below: Badge variant="secondary" "시스템" OR Badge variant="outline" "커스텀"

Column: Template Name
  - Bold name text
  - Category tag below: Badge variant="outline" className="text-xs capitalize"

Column: Trigger Element
  - <code className="font-mono text-xs bg-gray-50 border border-border rounded px-1.5 py-0.5">

Column: Usage Count
  - <Badge variant="outline">{count}</Badge>
  - 0: <span className="text-muted-foreground">0</span>

Column: Actions
  - System templates:
    [View] Button variant="ghost" size="sm"  → opens read-only detail sheet
    Edit and Delete buttons: disabled with aria-disabled="true"
    Tooltip on disabled: "System templates cannot be modified"
  - Custom templates:
    [Edit] Button variant="ghost" size="sm" icon=Pencil
    [Delete] Button variant="ghost" size="sm" icon=Trash2 className="text-destructive"
              Disabled if usageCount > 0
```

**ECA visualization in detail sheet:**
```tsx
// Trigger section
<div className="space-y-3">
  <div className="flex items-center gap-2 flex-wrap">
    <Badge variant="outline" className="font-mono">TRIGGER</Badge>
    <span>When</span>
    <code className="bg-gray-50 border border-border rounded px-1.5 py-0.5 text-xs">
      {triggerOptionType}
    </code>
    <Badge variant="secondary">{triggerOperator}</Badge>
    <div className="flex gap-1 flex-wrap">
      {triggerValues.map(v => (
        <code key={v} className="bg-primary-50 text-primary border border-primary/20 rounded px-1.5 py-0.5 text-xs">
          {v}
        </code>
      ))}
    </div>
  </div>

  {/* Actions */}
  <div className="pl-4 border-l-2 border-border space-y-2">
    <Badge variant="outline" className="font-mono">ACTIONS</Badge>
    {actions.map((action, i) => (
      <div key={i} className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">{i + 1}.</span>
        <Badge variant="secondary">{action.type}</Badge>
        <code className="text-xs">{action.targetOption}</code>
        <span>→</span>
        <span>{action.value}</span>
      </div>
    ))}
  </div>
</div>
```

### 4.3 State Management

**Read-only system template sheet:**
```tsx
<Sheet>
  <SheetHeader>
    <SheetTitle className="flex items-center gap-2">
      {template.name}
      <Badge variant="secondary">시스템</Badge>
    </SheetTitle>
    <SheetDescription>
      This is a system template and cannot be modified.
    </SheetDescription>
  </SheetHeader>
  <SheetContent>{/* ECA visualization, read-only */}</SheetContent>
</Sheet>
```

**Custom template edit sheet:**
- Reuses existing `ConstraintBuilder` component adapted for template editing
- Two-pane: left = ECA builder, right = preview

### 4.4 Interaction Patterns

**Create template flow:**
```
Click "+ Create Template" → Sheet opens (full-width sheet)
  Left pane: ConstraintBuilder (existing component, reused)
    - Template Name (Input)
    - Category (Select)
    - TRIGGER section (existing builder UI)
    - CONDITIONS section (optional)
    - ACTIONS section (existing builder UI)
  Right pane: ECA preview (read-only visualization)
Footer: [Cancel] [Save Template]
```

**Delete custom template:**
```
ConfirmDialog when usageCount = 0:
  Title: "Delete template?"
  Description: "This template will be permanently deleted."
  Confirm: Button variant="destructive" "Delete"

Disabled when usageCount > 0:
  Tooltip: "Cannot delete: used in {count} recipe constraint(s)"
```

### 4.5 Accessibility

- System template actions: wrapped in `<Tooltip>` explaining why disabled
- Template detail sheet: `aria-label="Template details for {name}"`
- ECA visualization: TRIGGER/ACTIONS regions have `role="region"` with aria-labels

---

## Page 5: Addon Groups

**Route:** `/admin/widget-builder/addons`
**DB Tables:** `addon_groups`, `addon_group_items`, `wb_products`
**Pattern:** Accordion list with inline editing

### 5.1 ASCII Wireframe

```
+================================================================+
| Widget Builder > Addon Groups                                    |
|                                                                  |
| Addon Groups                           [+ Add Addon Group]      |
| Manage addon product groups and their items                      |
+================================================================+
|                                                                  |
| [Search groups...]                                               |
|                                                                  |
| v  양면인쇄 그룹                            [Edit] [Delete]      |
| |  Description: 양면 인쇄 관련 옵션                              |
| |                                                                 |
| |  Items (3):                            [+ Add Item]           |
| |  +------+------------------------------+-------+--------------+|
| |  | =    | Product                      | Price | Remove       ||
| |  +------+------------------------------+-------+--------------+|
| |  | GV   | 양면인쇄 기본               |  free | [x]          ||
| |  | GV   | 양면인쇄 고급               |  free | [x]          ||
| |  | GV   | 양면인쇄 프리미엄           |  free | [x]          ||
| |  +------+------------------------------+-------+--------------+|
|                                                                  |
| > 무선제본 그룹 (2 items)                  [Edit] [Delete]      |
| > 스프링제본 그룹 (5 items)                [Edit] [Delete]      |
| > 코팅 옵션 그룹 (4 items)                 [Edit] [Delete]      |
|                                                                  |
+================================================================+
```

### 5.2 Component List with Tailwind Classes

**Accordion container:**
```tsx
<Accordion type="multiple" className="space-y-2">
  {addonGroups.map(group => (
    <AccordionItem
      key={group.id}
      value={String(group.id)}
      className="border border-border rounded-lg overflow-hidden"
    >
      <AccordionTrigger className="px-4 py-3 hover:bg-primary-50 hover:no-underline">
        <div className="flex items-center justify-between w-full pr-2">
          <div className="flex items-center gap-3">
            <span className="font-medium text-foreground">{group.name}</span>
            <Badge variant="outline" className="text-xs">
              {group.items.length} items
            </Badge>
          </div>
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            <Button variant="ghost" size="sm">
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-4 pb-4">
        {/* Items table */}
      </AccordionContent>
    </AccordionItem>
  ))}
</Accordion>
```

**Item row with drag-and-drop:**
```tsx
<TableRow className="hover:bg-primary-50">
  <TableCell className="w-8">
    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
  </TableCell>
  <TableCell>
    <div className="flex items-center gap-2">
      <Avatar className="h-6 w-6 bg-primary-50">
        <AvatarFallback className="text-xs text-primary">{initials}</AvatarFallback>
      </Avatar>
      <span className="text-sm">{item.product.name}</span>
    </div>
  </TableCell>
  <TableCell className="w-20 text-right text-xs text-muted-foreground">free</TableCell>
  <TableCell className="w-12 text-right">
    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive">
      <X className="h-3.5 w-3.5" />
    </Button>
  </TableCell>
</TableRow>
```

**Add Item button:**
```tsx
<Button variant="outline" size="sm" className="mt-3">
  <Plus className="mr-1.5 h-3.5 w-3.5" />
  Add Item
</Button>
```

### 5.3 State Management

**Loading:** Skeleton accordions (3 collapsed items).

**Empty groups list:**
```tsx
<EmptyState
  icon={<Layers className="h-8 w-8 text-muted-foreground" />}
  title="No addon groups"
  description="Create an addon group to bundle related product add-ons."
  action={<Button variant="default">Add Addon Group</Button>}
/>
```

**Empty group items:**
```tsx
<div className="py-6 text-center text-sm text-muted-foreground">
  No items in this group.
  <Button variant="link" size="sm" className="ml-1">Add the first item</Button>
</div>
```

### 5.4 Interaction Patterns

**Add Item (product picker dialog):**
```
Click "+ Add Item" → Dialog opens
  Title: "Add Product to {groupName}"
  Search: Input "Search products..."
  List: Scrollable wb_products list (excluding already-added items)
    Each row: checkbox + product name + product type badge
  Footer: [Cancel] [Add Selected ({n})]
```

**Edit group name (inline):**
```
Click [Edit] → Group name becomes Input field inline
[Save] [Cancel] buttons appear
Escape key cancels, Enter saves
```

**Delete group:**
```
ConfirmDialog:
  Title: "Delete addon group?"
  Description: "This group and its {n} items will be deleted. Products will not be affected."
  Confirm: Button variant="destructive"
```

### 5.5 Accessibility

- Accordion triggers: `aria-expanded` managed by Radix
- Drag handles: `aria-label="Drag to reorder {productName}"`
- Remove item button: `aria-label="Remove {productName} from group"`
- Product picker dialog: `aria-label="Add products to {groupName}"` `role="dialog"`

---

## Page 6: Pricing

**Route:** `/admin/widget-builder/pricing`
**DB Tables:** `product_price_configs`, `print_cost_base`, `postprocess_cost`, `qty_discount`
**Pattern:** Tab layout + SpreadsheetEditor

### 6.1 ASCII Wireframe

```
+================================================================+
| Widget Builder > Pricing                                         |
|                                                                  |
| Price Configuration                                              |
| Product: [일반명함 v]  [Global Prices toggle]                   |
+================================================================+
|                                                                  |
| [기본인쇄단가] [후가공단가] [수량할인] [애드온가격]              |
| ───────────────(active underline)                               |
|                                                                  |
| [Tab: 기본인쇄단가]                                              |
|                                                                  |
| +--------+----------+----------+----------+----------+----------+|
| | Size   |  100장   |  200장   |  300장   |  500장   | 1,000장 ||
| +--------+----------+----------+----------+----------+----------+|
| | 90x50  |  12,000  |  15,000  |  18,000  |  22,000  |  35,000 ||
| | 90x55  |  13,000  |  16,000  |  19,000  |  23,000  |  37,000 ||
| | 86x54  |  12,500  |  15,500  |  18,500  |  22,500  |  36,000 ||
| | ...    |  ...     |  ...     |  ...     |  ...     |  ...    ||
| +--------+----------+----------+----------+----------+----------+|
|                                                                  |
| [Undo] [Redo]           [% Bulk Adjust]    [Save Changes]       |
+================================================================+
```

### 6.2 Component List with Tailwind Classes

**Product selector + global toggle:**
```tsx
<div className="flex items-center gap-4 mb-6">
  <Select value={productId} onValueChange={setProductId}>
    <SelectTrigger className="w-[240px]">
      <SelectValue placeholder="Select product..." />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="__global__">
        <span className="flex items-center gap-2">
          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
          Global Prices (all products)
        </span>
      </SelectItem>
      {products.map(p => (
        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
      ))}
    </SelectContent>
  </Select>

  {/* Global price indicator */}
  {isGlobal && (
    <Badge variant="outline" className="flex items-center gap-1">
      <Globe className="h-3 w-3" />
      Global
    </Badge>
  )}
</div>
```

**Tab navigation:**
```tsx
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList className="border-b border-border w-full justify-start rounded-none h-auto bg-transparent p-0">
    {[
      { value: "base", label: "기본인쇄단가" },
      { value: "postprocess", label: "후가공단가" },
      { value: "qty-discount", label: "수량할인" },
      { value: "addon", label: "애드온가격" },
    ].map(tab => (
      <TabsTrigger
        key={tab.value}
        value={tab.value}
        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-medium pb-2 px-4"
      >
        {tab.label}
      </TabsTrigger>
    ))}
  </TabsList>

  <TabsContent value="base" className="mt-4">
    <SpreadsheetEditor ... />
  </TabsContent>
  ...
</Tabs>
```

**SpreadsheetEditor integration (existing component):**
```tsx
<SpreadsheetEditor
  data={priceMatrix}
  rowHeaders={sizes}      // ["90x50", "90x55", ...]
  colHeaders={quantities}  // [100, 200, 300, 500, 1000]
  onChange={setPriceMatrix}
  formatCell={(val) => val?.toLocaleString('ko-KR') ?? ''}
  className="border border-border rounded-lg overflow-hidden"
/>
```

**Action bar:**
```tsx
<div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
  <div className="flex items-center gap-2">
    <Button variant="ghost" size="sm" onClick={undo} disabled={!canUndo}>
      <Undo2 className="h-3.5 w-3.5 mr-1" />
      Undo
    </Button>
    <Button variant="ghost" size="sm" onClick={redo} disabled={!canRedo}>
      <Redo2 className="h-3.5 w-3.5 mr-1" />
      Redo
    </Button>
  </div>
  <div className="flex items-center gap-2">
    <Button variant="outline" size="sm" onClick={openBulkAdjust}>
      % Bulk Adjust
    </Button>
    <Button variant="default" size="default" onClick={handleSave} disabled={!isDirty}>
      Save Changes
    </Button>
  </div>
</div>
```

**Global price distinction:**
```tsx
// When product_price_configs.product_id IS NULL → global price row
<TableRow className="bg-primary-50/30">
  <TableCell>
    <div className="flex items-center gap-1.5">
      <Globe className="h-3 w-3 text-primary" />
      <span className="text-primary text-xs font-medium">Global Default</span>
    </div>
  </TableCell>
  ...
</TableRow>
```

### 6.3 State Management

**Unsaved changes guard:**
- `useUnsavedChanges` hook (existing)
- isDirty tracked via `useReducer` for undo/redo history
- Warning: "You have unsaved price changes. Save or discard before navigating away."

**Tab switching with unsaved changes:**
```tsx
// Prompt if switching tabs with dirty state
const handleTabChange = (newTab: string) => {
  if (isDirty) {
    setTabSwitchTarget(newTab)
    setShowTabSwitchWarning(true)
  } else {
    setActiveTab(newTab)
  }
}
```

**Loading per-tab:**
- Each TabsContent shows `<LoadingSkeleton />` while fetching

**Save states:**
- Default: `<Button variant="default">Save Changes</Button>`
- Saving: `<Button variant="default" disabled><Loader2 className="animate-spin" /> Saving...</Button>`
- Saved: Brief toast `sonner.success("Price configuration saved")`

### 6.4 Interaction Patterns

**Bulk adjust dialog:**
```
Dialog: "Bulk Adjust Prices"
  Adjustment type: Radio [Increase %] [Decrease %] [Set Flat]
  Amount: Input type=number placeholder="e.g. 10"
  Apply to: Checkboxes [All sizes] [Selected sizes only]
  Preview: Shows sample row before/after
Footer: [Cancel] [Apply]
```

**Cell editing (SpreadsheetEditor):**
- Click cell → becomes Input, type number, Tab moves to next, Enter confirms
- Escape cancels edit
- Negative values highlighted: `className="text-destructive"`

### 6.5 Accessibility

- Tabs: `role="tablist"` `aria-label="Price configuration sections"`
- SpreadsheetEditor cells: `role="gridcell"` `aria-label="{size} × {quantity} price"`
- Undo/Redo: `aria-label="Undo last change"` / `aria-label="Redo last change"` with `aria-disabled`

---

## Page 7: Orders

**Route:** `/admin/widget-builder/orders`
**DB Table:** `orders`
**Pattern:** DataTable with status filters + detail drawer

### 7.1 ASCII Wireframe

```
+================================================================+
| Widget Builder > Orders                                          |
|                                                                  |
| Widget Builder Orders                                            |
| Manage and monitor Widget Builder customer orders (148 total)    |
+================================================================+
|                                                                  |
| [Search order ID / customer...]  [Status: All v]  [Product: Allv]
| [Date range: Last 30 days v]                                     |
|                                                                  |
| [All] [Created:12] [Paid:34] [In Production:45] [Completed:51] [Cancelled:6]
|       [secondary]  [warning] [default/primary]   [success]      [destructive]
|                                                                  |
| +------+----------+-----------+-------+----------+-------+-----+|
| | ID   | Product  | Status    | MES   | Amount   | Date  | ... ||
| +------+----------+-----------+-------+----------+-------+-----+|
| |#1234 | 일반명함 | [paid]    | [N/A] | 17,100원 |2/28  | [>] ||
| |#1235 | 스티커   |[in_prod]  | [OK]  | 32,000원 |2/28  | [>] ||
| |#1236 | 고급명함 |[completed]| [OK]  | 24,500원 |2/27  | [>] ||
| |#1237 | 전단지   |[created]  | [N/A] |  8,900원 |2/27  | [>] ||
| |#1238 | 명함     |[cancelled]| [ERR] | ------   |2/26  | [>] ||
| +------+----------+-----------+-------+----------+-------+-----+|
|                                                                  |
| Showing 1-10 of 148  [< Prev] 1 2 3 ... 15 [Next >]            |
+================================================================+
```

### 7.2 Component List with Tailwind Classes

**Status filter chips (tab-like, above table):**
```tsx
<div className="flex items-center gap-2 flex-wrap mb-3">
  {statusOptions.map(s => (
    <button
      key={s.value}
      onClick={() => setStatusFilter(s.value)}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
        activeStatus === s.value
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-transparent text-foreground hover:bg-primary-50"
      )}
    >
      {s.label}
      <span className="tabular-nums">{s.count}</span>
    </button>
  ))}
</div>
```

**Order status badge mapping:**
```tsx
const statusBadge = {
  created:       <Badge variant="secondary">Created</Badge>,
  paid:          <Badge variant="warning">Paid</Badge>,
  in_production: <Badge variant="default">In Production</Badge>,   // bg-primary
  completed:     <Badge variant="success">Completed</Badge>,
  cancelled:     <Badge variant="destructive">Cancelled</Badge>,
}
```

**MES status badge:**
```tsx
const mesBadge = {
  na:      <span className="text-xs text-muted-foreground">—</span>,
  ok:      <Badge variant="outline" className="text-xs text-success border-success/50">OK</Badge>,
  error:   <Badge variant="destructive" className="text-xs">ERR</Badge>,
  pending: <Badge variant="warning" className="text-xs">Pending</Badge>,
}
```

**Table columns (`useOrderColumns` hook):**
```
Column: Order ID
  - <span className="font-mono text-sm">#{row.id}</span>

Column: Product
  - Product name (truncated, max 20 chars)
  - Below: recipe version badge "v{n}"

Column: Status
  - Status badge (mapped above)

Column: MES Status
  - MES badge
  - If error: + [Retry] Button variant="outline" size="sm" inline

Column: Amount
  - <span className="tabular-nums font-medium">{amount.toLocaleString('ko-KR')}원</span>
  - Cancelled orders: <span className="line-through text-muted-foreground">

Column: Date
  - Relative or absolute date: "2/28" or "어제"

Column: Actions
  - [>] Button variant="ghost" size="icon" → opens detail drawer
```

**MES retry button:**
```tsx
<Button
  variant="outline"
  size="sm"
  onClick={() => handleMesRetry(order.id)}
  disabled={isRetrying}
  className="ml-2 h-6 text-xs"
>
  {isRetrying ? <Loader2 className="h-3 w-3 animate-spin" /> : "Retry MES"}
</Button>
```

**Order detail drawer (Sheet from right, w-[640px]):**
```tsx
<Sheet>
  <SheetContent className="w-[640px] sm:max-w-[640px] overflow-y-auto">
    <SheetHeader>
      <SheetTitle>Order #{order.id}</SheetTitle>
      <SheetDescription>
        <Badge>{statusBadge[order.status]}</Badge>
        <span className="ml-2 text-muted-foreground">{formattedDate}</span>
      </SheetDescription>
    </SheetHeader>

    {/* Selections section */}
    <section className="mt-6">
      <h3 className="text-sm font-semibold mb-3">Selected Options</h3>
      <div className="space-y-2">
        {Object.entries(order.selections).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground capitalize">{key}</span>
            <code className="font-mono text-xs bg-gray-50 border border-border rounded px-1.5">{String(value)}</code>
          </div>
        ))}
      </div>
    </section>

    {/* Price breakdown section */}
    <section className="mt-6">
      <h3 className="text-sm font-semibold mb-3">Price Breakdown</h3>
      <div className="space-y-1.5 text-sm">
        {order.priceBreakdown.items.map(item => (
          <div key={item.label} className="flex justify-between">
            <span className="text-muted-foreground">{item.label}</span>
            <span className="tabular-nums">{item.amount.toLocaleString('ko-KR')}원</span>
          </div>
        ))}
        <Separator className="my-2" />
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span className="text-primary tabular-nums">{order.totalAmount.toLocaleString('ko-KR')}원</span>
        </div>
      </div>
    </section>

    {/* Constraint history section */}
    <section className="mt-6">
      <h3 className="text-sm font-semibold mb-3">Constraint Log</h3>
      <div className="space-y-2">
        {order.constraintHistory.map((entry, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <Badge variant="outline" className="shrink-0 mt-0.5">{entry.constraintName}</Badge>
            <span className="text-muted-foreground">{entry.result}</span>
          </div>
        ))}
      </div>
    </section>

    {/* MES section */}
    {order.mesStatus === 'error' && (
      <section className="mt-6">
        <Alert className="border-destructive/50 bg-destructive/5">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertDescription className="text-sm">
            MES submission failed. Click retry to resubmit.
          </AlertDescription>
        </Alert>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => handleMesRetry(order.id)}
        >
          Retry MES Submission
        </Button>
      </section>
    )}
  </SheetContent>
</Sheet>
```

### 7.3 State Management

**Status filter counts:** Fetched via aggregation query on load, not client-side filtering.

**MES retry state:**
```tsx
const [retryingId, setRetryingId] = useState<number | null>(null)
// Show Loader2 spinner in MES retry button while retrying
// On success: toast success + refetch order list
// On failure: toast error + show error in detail drawer
```

**Pagination:** Server-side pagination via tRPC `orders.list({ page, limit, status, productId })`.

**Loading:** TableSkeleton (8 rows).

**Empty state:**
```tsx
<EmptyState
  icon={<ShoppingCart className="h-8 w-8 text-muted-foreground" />}
  title="No orders found"
  description={statusFilter !== 'all'
    ? `No ${statusFilter} orders match your filters.`
    : "No Widget Builder orders have been placed yet."}
/>
```

### 7.4 Interaction Patterns

**Row click → detail drawer:**
- Clicking anywhere on the row (except action buttons) opens the detail drawer
- `cursor-pointer` on TableRow

**Status filter interaction:**
- Status chips are immediate (no search button)
- URL state: `?status=paid` for bookmarkability
- `useSearchParams` + `router.replace` for navigation without page reload

**Date range filter:**
```tsx
<Select value={dateRange} onValueChange={setDateRange}>
  <SelectTrigger className="h-8 w-[160px]">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="7d">Last 7 days</SelectItem>
    <SelectItem value="30d">Last 30 days</SelectItem>
    <SelectItem value="90d">Last 90 days</SelectItem>
    <SelectItem value="all">All time</SelectItem>
  </SelectContent>
</Select>
```

### 7.5 Accessibility

- Status filter chips: `role="radio"` in `role="radiogroup"` `aria-label="Filter by order status"`
- Detail drawer: `role="dialog"` `aria-labelledby="order-detail-title"`
- MES retry: `aria-label="Retry MES submission for order #{id}"` `aria-busy={isRetrying}`
- Table rows: `aria-label="Order #{id}, status: {status}"` `tabindex="0"` for keyboard access
- Amount display: `aria-label="{amount} Korean Won"`

---

## Cross-Page Patterns Summary

### Navigation Breadcrumb (all pages)

```tsx
<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/admin/dashboard">Admin</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>Widget Builder</BreadcrumbPage>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>{currentPageTitle}</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

### Toast Notifications (all pages)

```tsx
// Success
toast.success("Saved successfully", { description: "Changes have been applied." })

// Error
toast.error("Failed to save", { description: error.message })

// Warning (destructive action confirmation)
toast.warning("Action required", { description: "This change affects active products." })
```

### Keyboard Navigation Pattern (all DataTable pages)

1. `Tab` → page header actions
2. `Tab` → toolbar (search, filters)
3. `Tab` → table header (sortable columns)
4. `Arrow keys` → navigate rows
5. `Enter` → open row actions
6. `Escape` → close any open drawer/sheet/dialog

### Loading States (all pages)

```tsx
// Page-level Suspense boundary
<Suspense fallback={<LoadingSkeleton rows={8} columns={6} />}>
  <DataTable ... />
</Suspense>
```

### Mobile Responsive (all pages)

- Sidebar collapses to icon-only on `<lg` viewport
- DataTable: horizontal scroll with `overflow-x-auto`
- Split panel (Recipes): collapses to single panel with back button on `<md`
- Detail drawers: full-screen `w-full` on mobile, `w-[640px]` on desktop
- Action buttons: icon-only on `<sm`

---

## User Story Acceptance Criteria (EARS Format)

### US-1: Element Type Vocabulary Management
- WHEN admin navigates to `/admin/widget-builder/elements` THEN all element types display in paginated DataTable with ID, type key (monospace), name, category badge, UI control, display order, and status badge
- WHEN admin clicks "Add Element Type" THEN a Sheet opens from the right with required fields (typeKey, nameKo, nameEn, category, uiControl, displayOrder)
- WHILE element type has associated choices THEN the Delete action is disabled with tooltip explaining the constraint
- WHEN admin toggles Active/Inactive on a type THEN a ConfirmDialog appears before mutation executes
- WHERE category filter is applied THEN table shows only matching element types

### US-2: Element Choice Management
- WHEN admin arrives at choices page without selecting element type THEN table is hidden and a selection prompt is shown
- WHEN admin selects an element type from the required dropdown THEN choices for that type load immediately
- WHILE an inactive choice is referenced by active recipe bindings THEN a warning sub-row displays below that choice row
- IF admin deactivates a choice with active bindings THEN ConfirmDialog explains the impact before proceeding

### US-3: Recipe Composition
- WHEN admin selects a recipe from the left panel THEN detail panel loads with element bindings table
- WHILE recipe is archived THEN form fields are read-only, Save/Archive buttons are disabled with aria-disabled
- WHEN admin drags an element binding row THEN sort order updates optimistically and persists on drop
- WHEN admin clicks Archive Recipe THEN ConfirmDialog explains versioning immutability before proceeding

### US-4: Constraint Template Authoring
- WHEN admin views a system template (is_system=true) THEN Edit and Delete buttons are disabled with explanatory tooltip
- WHEN admin creates a custom template THEN existing ConstraintBuilder component renders in a Sheet
- WHERE template has 0 usage count THEN Delete action is enabled; WHERE usage > 0 THEN Delete is disabled with tooltip

### US-5: Addon Group Management
- WHEN admin expands an accordion group THEN item list shows with drag handles and remove buttons
- WHEN admin clicks "+ Add Item" THEN product picker dialog opens showing unassigned wb_products
- WHEN admin removes an item from a group THEN removal is immediate with undo toast

### US-6: Price Configuration
- WHEN admin selects a product THEN all 4 price tabs load data for that product
- WHERE product_price_configs.product_id IS NULL THEN row displays with Globe icon indicating global price
- WHILE admin has unsaved changes THEN tab switching shows confirmation dialog
- WHEN admin saves THEN batch upsert executes and success toast confirms

### US-7: Order Management
- WHEN admin selects status filter chip THEN table filters immediately and URL updates with status param
- WHEN admin clicks a table row THEN detail drawer opens showing selections JSON, price breakdown, constraint log
- WHERE order.mesStatus = 'error' THEN "Retry MES" button is visible in table row and detail drawer
- WHEN admin clicks "Retry MES" THEN button shows loading spinner, then success/error toast

---

## Risk Notes

| Risk | Impact | Mitigation |
|------|--------|------------|
| SpreadsheetEditor cell performance with 100+ rows | UI lag | Existing virtualization (tanstack-virtual) in SpreadsheetEditor already handles this |
| Recipe drag-and-drop UX on touch devices | Accessibility gap | Provide up/down arrow button alternative via keyboard-accessible button set |
| Order detail drawer JSON rendering for large selections | Performance | Virtualize constraint log if >50 entries; use JSON.stringify formatting |
| Status filter counts going stale | UX confusion | Refetch counts on tab focus + after each status change mutation |
| Constraint template ECA visualization complexity | Developer complexity | Reuse existing ConstraintBuilder's read-only render mode (if available) or write dedicated EcaDisplay component |
