# SPEC-MDM-001: Master Data Management UI Design

## Project Context

**Project**: Widget Creator Admin (apps/admin)
**Framework**: Next.js 15, shadcn/ui, Tailwind v4, TanStack React Table v8
**Design System**: Violet/Purple primary (#5538B6), Noto Sans, -0.05em tracking
**Language**: Korean UI (한국어)
**Pattern Reference**: `apps/admin/src/app/(dashboard)/widget-builder/elements/page.tsx`

---

## 1. Sidebar Navigation Design

### New Section: 마스터 데이터

Add a new `navItems` entry in `/home/innojini/dev/widget.creator/apps/admin/src/components/layout/sidebar.tsx`:

```
Position: After "Process Management" group, before "Price Management"

Icon: Database (from lucide-react)
Label: 마스터 데이터
href: /admin/master-data
```

### ASCII Sidebar Structure

```
+---------------------------+
|  Admin              [<]  |
+---------------------------+
|                           |
| [D] Dashboard             |
|                           |
| [P] Product Management  > |
|     Categories            |
|     Products              |
|                           |
| [L] Material Management > |
|     Papers                |
|     Materials             |
|     Paper-Product Mapping |
|                           |
| [S] Process Management  > |
|     Print Modes           |
|     Post Processes        |
|     Bindings              |
|     Imposition Rules      |
|                           |
| [DB] 마스터 데이터     v  | <-- NEW (expanded)
| |   카테고리 관리          |
| |   위젯 상품 관리         |
| |   인쇄방식 관리          |
| |   후가공 관리            |
|                           |
| [$] Price Management    > |
| [O] Option Management   > |
| ...                       |
+---------------------------+
```

### NavItem Definition (TypeScript reference)

```typescript
{
  label: "마스터 데이터",
  href: "/admin/master-data",
  icon: Database,  // import from lucide-react
  children: [
    { label: "카테고리 관리", href: "/admin/master-data/categories" },
    { label: "위젯 상품 관리", href: "/admin/master-data/wb-products" },
    { label: "인쇄방식 관리", href: "/admin/master-data/print-modes" },
    { label: "후가공 관리", href: "/admin/master-data/post-processes" },
  ],
}
```

### Active State Behavior

- Parent group button: `bg-primary/10 text-primary` when any child is active
- Child link: `font-medium text-primary` when exact path matches
- Inactive: `text-muted-foreground hover:bg-muted hover:text-foreground`
- Collapsed mode: Show `Database` icon only with Tooltip on hover

---

## 2. Page 1: 카테고리 관리 (Category Management)

**URL**: `/admin/master-data/categories`
**Table**: `product_categories`
**File**: `apps/admin/src/app/(dashboard)/master-data/categories/page.tsx`

### 2.1 Page Layout Wireframe

```
+================================================================+
|                                                                |
|  카테고리 관리                          [+ 카테고리 추가]       |
|  상품 카테고리를 관리합니다                                     |
|                                                                |
+================================================================+
|                                                                |
|  [검색: 카테고리명 검색...          ] [상태: All v] [초기화]   |
|                                                                |
+----+------------+----------+----------+--------+-------+------+
| ID | 카테고리키  | 한국어명 | 영문명   | 정렬순서 | 상태 | 작업 |
+----+------------+----------+----------+--------+-------+------+
|  1 | business   | 명함     | Business |   10   | Active|  [:]  |
|  2 | flyer      | 전단지   | Flyer    |   20   | Active|  [:]  |
|  3 | poster     | 포스터   | Poster   |   30   | Active|  [:]  |
|  4 | book       | 책자     | Book     |   40   |Inactive| [:]  |
+----+------------+----------+----------+--------+-------+------+
|                                              총 11개 항목      |
+================================================================+
```

### 2.2 Column Specifications

| Column | Type | Width | Description |
|--------|------|-------|-------------|
| ID | number | 60px | Serial ID, `font-mono text-xs` |
| 카테고리키 | string | 140px | `categoryKey`, `font-mono text-xs bg-muted px-1.5 py-0.5 rounded` |
| 한국어명 | string | auto | `categoryNameKo`, `font-medium` |
| 영문명 | string | auto | `categoryNameEn`, `text-muted-foreground` |
| 정렬순서 | number | 80px | `displayOrder`, `tabular-nums text-center` |
| 상태 | boolean | 80px | Badge: Active=`default`, Inactive=`secondary` |
| 작업 | actions | 50px | DropdownMenu trigger `[:]` icon |

### 2.3 Filter Bar

```
[검색 입력창: placeholder="카테고리명 또는 키 검색..."]
[상태 필터: "모든 상태" | "활성" | "비활성"]
[초기화 버튼: ghost variant, only show when filters active]
```

- Search: Client-side filter on `categoryKey`, `categoryNameKo`, `categoryNameEn`
- Status filter: `columnId: "isActive"`, options `[{label: "활성", value: "true"}, {label: "비활성", value: "false"}]`

### 2.4 Actions Dropdown

```
DropdownMenu (align="end"):
+------------------+
| [Pencil] 수정    |
+------------------+
| [Power] 비활성화 |  <-- only when isActive=true (text-destructive)
| [Power] 활성화   |  <-- only when isActive=false
+------------------+
```

### 2.5 Add/Edit Dialog Wireframe

```
+================================================+
|  카테고리 추가               [X]               |
+================================================+
|                                                |
|  카테고리 키 *                                 |
|  [                                         ]  |
|  영문 소문자, 하이픈 허용 (예: business-card)  |
|                                                |
|  한국어명 *                                    |
|  [                                         ]  |
|                                                |
|  영문명                                        |
|  [                                         ]  |
|                                                |
|  정렬 순서                                     |
|  [   0                                      ] |
|                                                |
|  설명 (선택)                                   |
|  [                                         ]  |
|  [                                         ]  |
|                                                |
|  활성화                                        |
|  [O---] 활성                                  |
|                                                |
+------------------------------------------------+
|               [취소]    [저장]                 |
+================================================+
```

### 2.6 Form Validation Rules

```typescript
const categoryFormSchema = z.object({
  categoryKey: z.string()
    .min(1, "카테고리 키는 필수입니다")
    .max(50, "최대 50자까지 입력 가능합니다")
    .regex(/^[a-z0-9-]+$/, "영문 소문자, 숫자, 하이픈만 사용 가능합니다"),
  categoryNameKo: z.string()
    .min(1, "한국어명은 필수입니다")
    .max(100, "최대 100자까지 입력 가능합니다"),
  categoryNameEn: z.string()
    .max(100, "최대 100자까지 입력 가능합니다")
    .optional(),
  displayOrder: z.coerce.number().int().default(0),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});
```

### 2.7 Empty State

```
+================================================+
|                                                |
|              [Database icon, 48px]             |
|                                                |
|           카테고리가 없습니다                   |
|    첫 번째 카테고리를 추가해 보세요            |
|                                                |
|          [+ 카테고리 추가]                     |
|                                                |
+================================================+
```

### 2.8 Loading State

- DataTable rows show `Skeleton` animation (3 animated rows)
- Button disabled with `opacity-50`

---

## 3. Page 2: 위젯 상품 관리 (WB Product Master)

**URL**: `/admin/master-data/wb-products`
**Table**: `wb_products`
**File**: `apps/admin/src/app/(dashboard)/master-data/wb-products/page.tsx`

### 3.1 Page Layout Wireframe

```
+====================================================================+
|                                                                    |
|  위젯 상품 관리                         [+ 상품 추가]              |
|  위젯 빌더 상품 마스터를 관리합니다                                 |
|                                                                    |
+====================================================================+
|                                                                    |
| [검색: 상품명 또는 키 검색...] [카테고리: All v] [상태: All v]     |
|                                                                    |
+----+------------+----------+----------+-------+--------+------+---+
| ID | 상품키     | 한국어명 | 카테고리  | 상태  | 위젯설정| 작업|   |
+----+------------+----------+----------+-------+--------+------+---+
|  1 | business.. | 명함     | [명함]    |[활성] |  [->]  |  [:] |  |
|  2 | flyer-a4   | A4 전단지| [전단지]  |[초안] |  [->]  |  [:] |  |
|  3 | poster-b2  | B2 포스터| [포스터]  |[비활성]| [->]  |  [:] |  |
+----+------------+----------+----------+-------+--------+------+---+
|                                                총 43개 항목       |
+====================================================================+
```

### 3.2 Column Specifications

| Column | Type | Width | Description |
|--------|------|-------|-------------|
| ID | number | 60px | Serial ID, `font-mono text-xs` |
| 상품키 | string | 160px | `productKey`, `font-mono text-xs` |
| 한국어명 | string | auto | `productNameKo`, `font-medium` |
| 카테고리 | Badge | 120px | Category name, `Badge variant="outline"` with `bg-primary-50 text-primary` |
| 상태 | Badge | 90px | draft/active/inactive with color mapping |
| 위젯설정 | link | 80px | Icon button `ExternalLink`, navigate to `/admin/widget-admin/{id}` |
| 작업 | actions | 50px | DropdownMenu |

### 3.3 Status Badge Color Mapping

```
draft    → Badge variant="secondary"  bg-gray-100    text-gray-700
           Label: 초안
active   → Badge variant="default"    bg-primary      text-white
           Label: 활성
inactive → Badge variant="destructive" bg-error/10   text-error
           Label: 비활성
```

Implementation:
```typescript
const STATUS_BADGE: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
  active:   { label: "활성",   variant: "default" },
  draft:    { label: "초안",   variant: "secondary" },
  inactive: { label: "비활성", variant: "destructive" },
};
```

### 3.4 Filter Bar

```
[검색 입력창: placeholder="상품명 또는 상품키 검색..."]
[카테고리 필터: 전체 | 명함 | 전단지 | 포스터 | ... (dynamic from DB)]
[상태 필터: 전체 | 활성 | 초안 | 비활성]
[초기화 버튼: ghost, conditional]
```

### 3.5 Quick Link to Widget Config

The `위젯설정` column shows an `ExternalLink` icon button:
```
<Button variant="ghost" size="icon" asChild>
  <Link href={`/admin/widget-admin/${row.original.id}`} target="_blank">
    <ExternalLink className="h-4 w-4" />
  </Link>
</Button>
```

### 3.6 Actions Dropdown

```
DropdownMenu (align="end"):
+---------------------+
| [Pencil]   수정      |
| [Link]  위젯 설정   |  (opens /admin/widget-admin/{id})
+---------------------+
| [Power]  비활성화   |  text-destructive (when active)
| [Power]  활성화     |  (when inactive or draft)
+---------------------+
```

### 3.7 Add/Edit Dialog Wireframe

```
+==================================================+
|  상품 추가                           [X]         |
+==================================================+
|                                                  |
|  상품 키 *                                       |
|  [                                           ]  |
|  영문 소문자, 숫자, 하이픈 (예: business-card)   |
|                                                  |
|  한국어명 *                                      |
|  [                                           ]  |
|                                                  |
|  영문명                                          |
|  [                                           ]  |
|                                                  |
|  카테고리 *                                      |
|  [카테고리 선택...                          v]  |
|                                                  |
|  설명                                            |
|  [                                           ]  |
|  [                                           ]  |
|  [                                           ]  |
|                                                  |
|  상태 *                                         |
|  [상태 선택...                              v]  |
|   초안 / 활성 / 비활성                          |
|                                                  |
|  옵션                                            |
|  [ ] 프리미엄 상품                              |
|  [O] 파일 업로드 지원                           |
|  [ ] 에디터 지원 (Edicus)                       |
|                                                  |
+--------------------------------------------------+
|                    [취소]   [저장]               |
+==================================================+
```

### 3.8 Form Validation Rules

```typescript
const wbProductFormSchema = z.object({
  productKey: z.string()
    .min(1, "상품 키는 필수입니다")
    .max(100)
    .regex(/^[a-z0-9-_]+$/, "영문 소문자, 숫자, 하이픈, 언더스코어만 허용됩니다"),
  productNameKo: z.string().min(1, "한국어명은 필수입니다").max(200),
  productNameEn: z.string().max(200).optional(),
  categoryId: z.number({ required_error: "카테고리를 선택해 주세요" }),
  description: z.string().optional(),
  status: z.enum(["draft", "active", "inactive"]).default("draft"),
  isPremium: z.boolean().default(false),
  hasUpload: z.boolean().default(true),
  hasEditor: z.boolean().default(false),
});
```

### 3.9 Empty State

```
+====================================================+
|                                                    |
|           [Package icon, 48px]                     |
|                                                    |
|         상품이 없습니다                            |
|   첫 번째 위젯 상품을 추가해 보세요               |
|                                                    |
|            [+ 상품 추가]                           |
|                                                    |
+====================================================+
```

---

## 4. Page 3: 인쇄방식 관리 (Print Mode Management)

**URL**: `/admin/master-data/print-modes`
**Table**: Referenced from `apps/admin/src/app/(dashboard)/processes/print-modes/page.tsx`
**Note**: This is a MIRROR/ALIAS of the existing `/admin/processes/print-modes` page.
**File**: `apps/admin/src/app/(dashboard)/master-data/print-modes/page.tsx`

**Design Decision**: The master data section provides a unified access point. The implementation should either:
1. Redirect to `/admin/processes/print-modes`, OR
2. Be a standalone copy using the same tRPC endpoints (`trpc.printModes.*`)

Recommended: Option 2 (standalone) for cohesion, using identical component pattern.

### 4.1 Page Layout Wireframe

```
+====================================================================+
|                                                                    |
|  인쇄방식 관리                          [+ 인쇄방식 추가]          |
|  인쇄방식(인쇄면, 색도)을 관리합니다                               |
|                                                                    |
+====================================================================+
|                                                                    |
| [검색: 코드 또는 이름 검색...] [인쇄면: All v] [색도: All v]       |
|                                                                    |
+----+------------------+----------+--------+---------+------+------+
| ID | 코드             | 이름     | 인쇄면  | 색도   | 순서 | 활성 |
+----+------------------+----------+--------+---------+------+------+
|  1 | DIGITAL_4C_BOTH  | 디지털양면 | 양면  | 컬러   |  10  | [O] |
|  2 | DIGITAL_4C_SINGLE| 디지털단면 | 단면  | 컬러   |  20  | [O] |
|  3 | OFFSET_1C_BOTH   | 옵셋 1도 양 | 양면 | 1도   |  30  | [O] |
+----+------------------+----------+--------+---------+------+------+
|                                               총 12개 항목        |
+====================================================================+
```

### 4.2 Column Specifications

| Column | Type | Width | Description |
|--------|------|-------|-------------|
| ID | number | 60px | `font-mono text-xs` |
| 코드 | string | 180px | `code`, `font-mono text-xs` |
| 이름 | string | auto | `name`, `font-medium` |
| 인쇄면 | Badge | 80px | `sides`: single=단면, both=양면, `Badge variant="outline"` |
| 색도 | Badge | 80px | `colorType`: mono=흑백, color=컬러, spot=별색, `Badge variant="secondary"` |
| 순서 | number | 70px | `displayOrder`, `tabular-nums` |
| 활성 | Switch | 70px | `isActive`, inline toggle |
| 작업 | actions | 50px | Edit / Delete |

### 4.3 Filter Bar

```
[검색 입력창: placeholder="코드 또는 이름 검색..."]
[인쇄면 필터: 전체 | 단면 | 양면]
[색도 필터: 전체 | 흑백 | 컬러 | 별색]
```

### 4.4 Add/Edit Dialog Wireframe

```
+================================================+
|  인쇄방식 추가                     [X]         |
+================================================+
|                                                |
|  코드 *                                        |
|  [                                         ]  |
|  예: DIGITAL_4C_BOTH                          |
|                                                |
|  이름 *                                        |
|  [                                         ]  |
|  예: 디지털 4도 양면                          |
|                                                |
|  인쇄면 *         색도 *                      |
|  [단면/양면 v]    [흑백/컬러/별색 v]          |
|                                                |
|  가격코드         정렬 순서                    |
|  [  0         ]   [  0         ]              |
|                                                |
|  활성화                                        |
|  [O---] 활성                                  |
|                                                |
+------------------------------------------------+
|               [취소]    [저장]                 |
+================================================+
```

### 4.5 Form Validation Rules

```typescript
const printModeFormSchema = z.object({
  code: z.string().min(1, "코드는 필수입니다").max(50),
  name: z.string().min(1, "이름은 필수입니다").max(100),
  sides: z.enum(["single", "both"], { required_error: "인쇄면을 선택해 주세요" }),
  colorType: z.enum(["mono", "color", "spot"], { required_error: "색도를 선택해 주세요" }),
  priceCode: z.coerce.number().int().default(0),
  displayOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});
```

### 4.6 Sides/ColorType Korean Labels

```typescript
const SIDES_LABELS: Record<string, string> = {
  single: "단면",
  both: "양면",
};

const COLOR_TYPE_LABELS: Record<string, string> = {
  mono: "흑백",
  color: "컬러",
  spot: "별색",
};
```

---

## 5. Page 4: 후가공 관리 (Post-Process Management)

**URL**: `/admin/master-data/post-processes`
**Table**: `post_processes` (from `trpc.postProcesses.*`)
**Reference**: `apps/admin/src/app/(dashboard)/processes/post-processes/page.tsx`
**File**: `apps/admin/src/app/(dashboard)/master-data/post-processes/page.tsx`

### 5.1 Page Layout Wireframe

```
+====================================================================+
|                                                                    |
|  후가공 관리                            [+ 후가공 추가]            |
|  후가공 종류를 관리합니다                                          |
|                                                                    |
+====================================================================+
|                                                                    |
| [검색: 코드 또는 이름 검색...] [유형: All v] [활성: All v]         |
|                                                                    |
+----+------------+------------+--------+------+------+------+------+
| ID | 코드       | 이름       | 유형   |  순서 | 활성 | 작업 |      |
+----+------------+------------+--------+------+------+------+------+
|  1 | LAMINATION | 코팅(라미) | 표면처리|  10  | [O]  |  [:]  |     |
|  2 | EMBOSSING  | 엠보싱     | 특수효과|  20  | [O]  |  [:]  |     |
|  3 | FOIL       | 박(포일)   | 특수인쇄|  30  | [O]  |  [:]  |     |
+----+------------+------------+--------+------+------+------+------+
|                                               총 18개 항목        |
+====================================================================+
```

### 5.2 Column Specifications

| Column | Type | Width | Description |
|--------|------|-------|-------------|
| ID | number | 60px | `font-mono text-xs` |
| 코드 | string | 160px | `code`, `font-mono text-xs` |
| 이름 | string | auto | `name`, `font-medium` |
| 유형 | Badge | 100px | `processType` or `category`, `Badge variant="outline"` |
| 순서 | number | 70px | `displayOrder`, `tabular-nums` |
| 활성 | Switch | 70px | `isActive`, inline toggle |
| 작업 | actions | 50px | Edit / Delete |

### 5.3 Filter Bar

```
[검색 입력창: placeholder="코드 또는 이름 검색..."]
[유형 필터: 전체 | 표면처리 | 특수효과 | 특수인쇄 | ... (dynamic)]
[활성 필터: 전체 | 활성 | 비활성]
```

### 5.4 Add/Edit Dialog Wireframe

```
+================================================+
|  후가공 추가                       [X]         |
+================================================+
|                                                |
|  코드 *                                        |
|  [                                         ]  |
|  예: LAMINATION_GLOSSY                        |
|                                                |
|  이름 *                                        |
|  [                                         ]  |
|  예: 광택 코팅(라미네이팅)                    |
|                                                |
|  유형 *                                        |
|  [유형 선택...                           v]   |
|                                                |
|  설명                                          |
|  [                                         ]  |
|  [                                         ]  |
|                                                |
|  가격코드         정렬 순서                    |
|  [  0         ]   [  0         ]              |
|                                                |
|  활성화                                        |
|  [O---] 활성                                  |
|                                                |
+------------------------------------------------+
|               [취소]    [저장]                 |
+================================================+
```

### 5.5 Form Validation Rules

```typescript
const postProcessFormSchema = z.object({
  code: z.string().min(1, "코드는 필수입니다").max(50),
  name: z.string().min(1, "이름은 필수입니다").max(100),
  processType: z.string().min(1, "유형을 선택해 주세요"),
  description: z.string().optional(),
  priceCode: z.coerce.number().int().default(0),
  displayOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});
```

---

## 6. Component Map (shadcn/ui per UI Element)

### Page Level Components

| UI Element | shadcn Component | Props / Notes |
|------------|-----------------|---------------|
| Page header | `div` with flex | Custom layout |
| Page title | `h1` | `text-2xl font-semibold` |
| Page description | `p` | `text-sm text-muted-foreground` |
| Add button | `Button` | `variant="default"` (primary violet) |
| DataTable wrapper | `DataTable` | Custom: `components/data-table/data-table.tsx` |
| Search input | `Input` | Inside DataTable's toolbar |
| Filter facet | `Button` + `Popover` | `DataTableFacetedFilter` pattern |
| Reset button | `Button` | `variant="ghost"` |

### Table Components

| UI Element | shadcn Component | Props / Notes |
|------------|-----------------|---------------|
| Column header | `DataTableColumnHeader` | Custom sort/filter header |
| Status badge (active) | `Badge` | `variant="default"` |
| Status badge (inactive) | `Badge` | `variant="secondary"` |
| Status badge (destructive) | `Badge` | `variant="destructive"` |
| Code cell | `span` | `font-mono text-xs bg-muted rounded px-1.5` |
| Active toggle (inline) | `Switch` | Direct `onCheckedChange` mutation |
| Actions trigger | `Button` | `variant="ghost" size="icon" h-7 w-7` |
| Actions menu | `DropdownMenu` + `DropdownMenuContent` | `align="end"` |
| Edit action | `DropdownMenuItem` | With `Pencil` icon |
| Deactivate action | `DropdownMenuItem` | `className="text-destructive"`, with `PowerOff` icon |

### Dialog Components

| UI Element | shadcn Component | Props / Notes |
|------------|-----------------|---------------|
| Modal container | `Dialog` | Controlled with `open` / `onOpenChange` |
| Modal header | `DialogHeader` + `DialogTitle` | Title changes based on add/edit |
| Form wrapper | `Form` | `react-hook-form` + `zodResolver` |
| Text input | `FormField` + `Input` | With `FormItem`, `FormLabel`, `FormMessage` |
| Number input | `FormField` + `Input` | `type="number"` |
| Textarea | `FormField` + `Textarea` | For description fields |
| Select dropdown | `FormField` + `Select` | With `SelectTrigger`, `SelectContent`, `SelectItem` |
| Boolean toggle | `FormField` + `Switch` | Inline with label |
| Checkbox | `FormField` + `Checkbox` | For boolean flags (isPremium, etc.) |
| Form actions | `div` with `flex justify-end gap-2` | Cancel + Submit buttons |
| Cancel button | `Button` | `variant="outline"` |
| Submit button | `Button` | `variant="default"`, disabled when `isPending` |

### Confirm Dialog Components

| UI Element | shadcn Component | Props / Notes |
|------------|-----------------|---------------|
| Confirm modal | `ConfirmDialog` | Custom: `components/common/confirm-dialog.tsx` |
| Destructive confirm | `ConfirmDialog` | `destructive={true}` prop |

---

## 7. Korean UX Copy Reference

### 7.1 Page Titles and Descriptions

| Page | Title (h1) | Description (p) |
|------|-----------|-----------------|
| 카테고리 관리 | 카테고리 관리 | 상품 카테고리를 관리합니다 |
| 위젯 상품 관리 | 위젯 상품 관리 | 위젯 빌더 상품 마스터를 관리합니다 |
| 인쇄방식 관리 | 인쇄방식 관리 | 인쇄방식(인쇄면, 색도)을 관리합니다 |
| 후가공 관리 | 후가공 관리 | 후가공 종류를 관리합니다 |

### 7.2 Button Labels

| Context | Korean |
|---------|--------|
| Add category | + 카테고리 추가 |
| Add product | + 상품 추가 |
| Add print mode | + 인쇄방식 추가 |
| Add post-process | + 후가공 추가 |
| Save | 저장 |
| Cancel | 취소 |
| Edit | 수정 |
| Deactivate | 비활성화 |
| Activate | 활성화 |
| Delete | 삭제 |
| Confirm | 확인 |
| Reset filters | 초기화 |
| Saving (loading) | 저장 중... |

### 7.3 Form Field Labels

#### 카테고리 관리

| Field | Label | Placeholder | Helper Text |
|-------|-------|-------------|-------------|
| categoryKey | 카테고리 키 * | 예: business-card | 영문 소문자, 숫자, 하이픈만 허용 |
| categoryNameKo | 한국어명 * | 예: 명함 | |
| categoryNameEn | 영문명 | 예: Business Card | |
| displayOrder | 정렬 순서 | 0 | 숫자가 작을수록 앞에 표시됩니다 |
| description | 설명 | 카테고리 설명 (선택) | |
| isActive | 활성화 | | |

#### 위젯 상품 관리

| Field | Label | Placeholder | Helper Text |
|-------|-------|-------------|-------------|
| productKey | 상품 키 * | 예: business-card-standard | 영문 소문자, 숫자, 하이픈, 언더스코어 |
| productNameKo | 한국어명 * | 예: 명함 (기본) | |
| productNameEn | 영문명 | 예: Business Card Standard | |
| categoryId | 카테고리 * | 카테고리 선택... | |
| description | 설명 | 상품 설명 (선택) | |
| status | 상태 * | 상태 선택... | 초안: 비공개, 활성: 공개 |
| isPremium | 프리미엄 상품 | | |
| hasUpload | 파일 업로드 지원 | | |
| hasEditor | 에디터 지원 (Edicus) | | |

#### 인쇄방식 관리

| Field | Label | Placeholder | Helper Text |
|-------|-------|-------------|-------------|
| code | 코드 * | 예: DIGITAL_4C_BOTH | 대문자, 숫자, 언더스코어 권장 |
| name | 이름 * | 예: 디지털 4도 양면 | |
| sides | 인쇄면 * | 인쇄면 선택... | 단면 / 양면 |
| colorType | 색도 * | 색도 선택... | 흑백 / 컬러 / 별색 |
| priceCode | 가격코드 | 0 | |
| displayOrder | 정렬 순서 | 0 | |
| isActive | 활성화 | | |

#### 후가공 관리

| Field | Label | Placeholder | Helper Text |
|-------|-------|-------------|-------------|
| code | 코드 * | 예: LAMINATION_GLOSSY | |
| name | 이름 * | 예: 광택 코팅 | |
| processType | 유형 * | 유형 선택... | |
| description | 설명 | 후가공 설명 (선택) | |
| priceCode | 가격코드 | 0 | |
| displayOrder | 정렬 순서 | 0 | |
| isActive | 활성화 | | |

### 7.4 Error Messages

| Scenario | Korean Error Message |
|----------|---------------------|
| Required field empty | `{필드명}은(는) 필수입니다` |
| Duplicate key | `이미 사용 중인 키입니다` |
| Max length exceeded | `최대 {N}자까지 입력 가능합니다` |
| Invalid format (categoryKey) | `영문 소문자, 숫자, 하이픈만 사용 가능합니다` |
| Invalid format (code) | `영문, 숫자, 언더스코어만 사용 가능합니다` |
| Network error | `저장에 실패했습니다. 다시 시도해 주세요` |
| Not found | `항목을 찾을 수 없습니다` |
| Generic error | `오류가 발생했습니다: {message}` |

### 7.5 Empty State Messages

| Page | Title | Description |
|------|-------|-------------|
| 카테고리 없음 | 카테고리가 없습니다 | 첫 번째 카테고리를 추가해 보세요 |
| 상품 없음 | 상품이 없습니다 | 첫 번째 위젯 상품을 추가해 보세요 |
| 인쇄방식 없음 | 인쇄방식이 없습니다 | 첫 번째 인쇄방식을 추가해 보세요 |
| 후가공 없음 | 후가공이 없습니다 | 첫 번째 후가공을 추가해 보세요 |
| 검색 결과 없음 | 검색 결과가 없습니다 | 다른 검색어나 필터를 사용해 보세요 |

### 7.6 Toast Notification Messages (Sonner)

| Action | Success Message | Error Message |
|--------|----------------|---------------|
| Create category | 카테고리가 추가되었습니다 | 카테고리 추가에 실패했습니다 |
| Update category | 카테고리가 수정되었습니다 | 카테고리 수정에 실패했습니다 |
| Deactivate category | 카테고리가 비활성화되었습니다 | 비활성화에 실패했습니다 |
| Create product | 상품이 추가되었습니다 | 상품 추가에 실패했습니다 |
| Update product | 상품이 수정되었습니다 | 상품 수정에 실패했습니다 |
| Create print mode | 인쇄방식이 추가되었습니다 | 인쇄방식 추가에 실패했습니다 |
| Update print mode | 인쇄방식이 수정되었습니다 | 인쇄방식 수정에 실패했습니다 |
| Create post-process | 후가공이 추가되었습니다 | 후가공 추가에 실패했습니다 |
| Update post-process | 후가공이 수정되었습니다 | 후가공 수정에 실패했습니다 |

### 7.7 Confirm Dialog Copy

#### Deactivate Category

```
Title:   카테고리 비활성화
Body:    "{categoryNameKo}" 카테고리를 비활성화하시겠습니까?
         비활성화된 카테고리는 새 상품 등록 시 선택할 수 없습니다.
Confirm: 비활성화
Cancel:  취소
```

#### Deactivate Product

```
Title:   상품 비활성화
Body:    "{productNameKo}" 상품을 비활성화하시겠습니까?
         비활성화된 상품은 위젯에서 사용할 수 없습니다.
Confirm: 비활성화
Cancel:  취소
```

#### Delete Print Mode

```
Title:   인쇄방식 비활성화
Body:    "{name}" 인쇄방식을 비활성화하시겠습니까?
Confirm: 비활성화
Cancel:  취소
```

#### Delete Post-Process

```
Title:   후가공 비활성화
Body:    "{name}" 후가공을 비활성화하시겠습니까?
Confirm: 비활성화
Cancel:  취소
```

### 7.8 Filter Labels

| Filter | Korean Label | Options |
|--------|-------------|---------|
| Status filter | 상태 | 모든 상태 / 활성 / 비활성 |
| Category filter | 카테고리 | 전체 / [카테고리명...] |
| Sides filter | 인쇄면 | 전체 / 단면 / 양면 |
| Color type filter | 색도 | 전체 / 흑백 / 컬러 / 별색 |
| Search placeholder | (per page) | See 7.3 |

---

## 8. CSS Token Usage Guide

### 8.1 Color Token Reference

| Use Case | Tailwind Class | CSS Variable | Value |
|----------|---------------|-------------|-------|
| Primary action button | `bg-primary text-primary-foreground` | `--primary` | #5538B6 |
| Primary hover | `hover:bg-primary-dark` | `--primary-dark` | #351D87 |
| Category badge bg | `bg-primary-50 text-primary` | `--primary-50` | #EEEBF9 |
| Active badge | `bg-primary text-white` | `--primary` | #5538B6 |
| Draft badge | `bg-gray-100 text-gray-700` | `--gray-50/700` | |
| Inactive badge | `text-error` with `bg-error/10` | `--error` | #C7000B |
| Page background | `bg-background` | `--background` | #FFFFFF |
| Card/DataTable | `bg-card` | `--card` | #FFFFFF |
| Border | `border-border` | `--border` | #CACACA |
| Input border | `border-input` | `--input` | #CACACA |
| Muted text | `text-muted-foreground` | `--muted-foreground` | #979797 |
| Body text | `text-foreground` | `--foreground` | #424242 |
| Destructive red | `text-destructive` | `--destructive` | #C7000B |
| Success teal | `text-success` | `--success` | #7AC8C4 |
| Warning amber | `text-warning` | `--warning` | #E6B93F |
| Code bg | `bg-muted` | `--muted` | #F6F6F6 |
| Focus ring | `ring-1 ring-ring` | `--ring` | #5538B6 |

### 8.2 Typography Tokens

| Use Case | Tailwind Class | Notes |
|----------|---------------|-------|
| Page title | `text-2xl font-semibold` | h1 element |
| Section title | `text-lg font-semibold` | h2 element |
| Body text (global) | `text-sm` (14px default) | Set in body CSS |
| Letter spacing | `tracking-[-0.05em]` | Applied globally |
| Monospace code | `font-mono text-xs` | For keys/codes |
| Muted description | `text-sm text-muted-foreground` | Subheader text |
| Table header | `text-xs text-muted-foreground font-medium` | Column headers |
| Input text | Default (inherits body) | |

### 8.3 Spacing Tokens

| Use Case | Tailwind Class | CSS Variable | Value |
|----------|---------------|-------------|-------|
| Page padding | `p-6` | | 24px |
| Section gap | `space-y-6` or `gap-6` | | 24px |
| Header row | `flex items-center justify-between` | | |
| Card padding | `p-4` | | 16px |
| Button icon gap | `gap-2` | | 8px |
| Form field gap | `space-y-4` | | 16px |
| Grid gap | `gap-4` | | 16px |

### 8.4 Border Radius Tokens

| Element | Tailwind Class | CSS Variable | Value |
|---------|---------------|-------------|-------|
| Buttons, inputs | `rounded-[5px]` | `--radius-md` | 5px |
| Small badges | `rounded-full` | `--radius-pill` | 20px |
| Cards/dialogs | `rounded-md` (8px) | shadcn default | 8px |
| Code inline | `rounded` | `--radius` | 4px |

### 8.5 Focus Ring Standard

All interactive elements MUST use:
```
focus:ring-1 focus:ring-ring focus-visible:ring-1
```
Never use `ring-2`. This is a project-wide design token standard.

### 8.6 Status Badge Implementation Pattern

```typescript
// Reusable status badge mapping for all 4 pages
const getStatusBadgeVariant = (isActive: boolean): "default" | "secondary" => {
  return isActive ? "default" : "secondary";
};

// For wb_products status field:
const getProductStatusBadge = (status: "draft" | "active" | "inactive") => {
  const map = {
    active:   { variant: "default" as const,      label: "활성" },
    draft:    { variant: "secondary" as const,     label: "초안" },
    inactive: { variant: "destructive" as const,   label: "비활성" },
  };
  return map[status] ?? map.draft;
};
```

### 8.7 DataTable Wrapper Pattern

Reference pattern from `elements/page.tsx`:

```
Page wrapper:     <div className="flex flex-col gap-4 p-6">
Header row:       <div className="flex items-center justify-between">
Title block:      <div> + <h1 text-2xl font-semibold> + <p text-sm text-muted-foreground>
Add button:       <Button> with <Plus className="h-4 w-4 mr-2" />
DataTable:        <DataTable columns={} data={} isLoading={} filters={} searchPlaceholder="" />
Dialog:           <Dialog open={} onOpenChange={}>
ConfirmDialog:    <ConfirmDialog open={} onOpenChange={} title={} description={} />
```

---

## 9. Mobile Responsive Considerations

### 9.1 Breakpoint Strategy

| Breakpoint | Layout Change |
|------------|---------------|
| < 768px (mobile) | Sidebar collapses to icon-only mode |
| < 768px | DataTable: hide non-essential columns (categoryNameEn, displayOrder) |
| < 768px | Dialog: full-width with `sm:max-w-[425px]` override |
| < 640px | Grid layouts (2-col forms) become single column |
| > 1024px (desktop) | Full sidebar + wide DataTable |

### 9.2 Hidden Columns on Mobile

| Page | Hidden on Mobile (< 768px) |
|------|---------------------------|
| 카테고리 | 영문명(categoryNameEn), 설명 |
| 위젯 상품 | 영문명(productNameEn), 에디터/업로드 flags |
| 인쇄방식 | 가격코드(priceCode), 정렬순서 |
| 후가공 | 가격코드, 정렬순서 |

### 9.3 Dialog Responsive

All dialogs use:
```
<DialogContent className="sm:max-w-[500px]">
```
On mobile: full-width with bottom sheet behavior (shadcn Dialog default on small screens).

---

## 10. File Structure

### New Files to Create

```
apps/admin/src/app/(dashboard)/master-data/
├── layout.tsx                           (optional, inherits from parent)
├── categories/
│   └── page.tsx                         (Page 1: 카테고리 관리)
├── wb-products/
│   └── page.tsx                         (Page 2: 위젯 상품 관리)
├── print-modes/
│   └── page.tsx                         (Page 3: 인쇄방식 관리)
└── post-processes/
    └── page.tsx                         (Page 4: 후가공 관리)
```

### Modified Files

```
apps/admin/src/components/layout/sidebar.tsx
  → Add "마스터 데이터" navItem with 4 children
  → Import Database icon from lucide-react
```

### tRPC Router Dependencies

| Page | tRPC Namespace | Procedures Needed |
|------|---------------|-------------------|
| 카테고리 | `trpc.productCategories.*` | `list`, `create`, `update`, `toggleActive` |
| 위젯 상품 | `trpc.wbProducts.*` | `list`, `create`, `update`, `toggleActive` |
| 인쇄방식 | `trpc.printModes.*` | `list`, `create`, `update`, `delete` |
| 후가공 | `trpc.postProcesses.*` | `list`, `create`, `update`, `delete` |

---

## 11. Implementation Priority Order

1. **Sidebar navigation update** (sidebar.tsx) - 1 file, low risk
2. **카테고리 관리 page** - Highest priority, foundational for all other pages
3. **위젯 상품 관리 page** - Depends on categories (Select dropdown)
4. **인쇄방식 관리 page** - Mirror of existing `/processes/print-modes`
5. **후가공 관리 page** - Mirror of existing `/processes/post-processes`

---

## 12. Design Consistency Checklist

Before implementation, verify each page meets these standards:

- [ ] `tracking-[-0.05em]` applied to all text-bearing components
- [ ] Focus ring is `ring-1` (not `ring-2`)
- [ ] Border radius for buttons/inputs is `rounded-[5px]`
- [ ] Primary color uses `bg-primary` (#5538B6), not hardcoded hex
- [ ] Badge status colors use design tokens (`bg-error/10`, `text-error`)
- [ ] Table action button: `h-7 w-7` ghost icon button
- [ ] Dialog footer: `flex justify-end gap-2` with cancel + submit
- [ ] Cancel button: `variant="outline"`
- [ ] Submit button: disabled during `isPending` with loading text
- [ ] Toast uses `sonner` (`toast.success`, `toast.error`)
- [ ] Form uses `react-hook-form` + `zodResolver`
- [ ] Empty state includes icon + title + description + CTA button
- [ ] Search placeholder in Korean (see 7.3)
- [ ] Filter labels in Korean (see 7.8)

---

*Generated: 2026-02-28*
*SPEC-MDM-001 UI Design Document v1.0*
