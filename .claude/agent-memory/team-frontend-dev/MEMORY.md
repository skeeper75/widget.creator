# Frontend Dev Agent Memory

## Project: widget.creator (Admin Console)

### Key Patterns

- **tRPC client**: `import { trpc } from "@/lib/trpc/client"` — createTRPCReact, typed via AppRouter
- **DataTable**: `@/components/data-table/data-table` — accepts columns, data, filters, searchPlaceholder, isLoading
- **DataTableColumnHeader**: Use for sortable column headers
- **Page structure**: `"use client"` at top, export default function, `space-y-6` root div
- **shadcn/ui available**: badge, button, dialog, input, label, select, skeleton, switch, table, textarea, scroll-area, form, tooltip, etc.
- **Progress component**: NOT pre-installed. Created custom at `apps/admin/src/components/ui/progress.tsx` (no radix dependency)
- **Toast**: `import { toast } from "sonner"`

### File Conventions

- Admin pages: `apps/admin/src/app/(dashboard)/[route]/page.tsx`
- Components: `apps/admin/src/components/[domain]/component-name.tsx`
- tRPC routers: `apps/admin/src/lib/trpc/routers/[name].ts`
- Router index: `apps/admin/src/lib/trpc/routers/index.ts` (add new routers here)

### tRPC Type-Safe Pattern

- Direct typed usage (no cast): `trpc.widgetAdmin.dashboard.useQuery()`
- Imperative query call (e.g. CSV download): `const utils = trpc.useUtils(); await utils.widgetAdmin.exportSimulation.fetch(input)` — NOT `.query()`
- `trpc.useUtils()` is the correct way to call queries imperatively

### Real widgetAdmin API Shapes (SPEC-WB-005)

- `dashboard` → `{ id, productKey, productNameKo, isActive, isVisible, edicusCode, mesItemCd, completeness: CompletenessResult }[]`
- `completeness` → `CompletenessResult: { items: { item, completed, message }[], publishable, completedCount, totalCount }`
  - `items[].item` is the key: `'options'|'pricing'|'constraints'|'mesMapping'` (NOT `.key`)
- `startSimulation` input: `{ productId, sample?, forceRun? }` — tooLarge throws PRECONDITION_FAILED error
- `startSimulation` output: `{ runId }` only (no totalCases)
- `simulationCases` → `{ data: SimulationCase[], total, page, pageSize }` (key is `data`, NOT `cases`)
- `simulationStatus` → DB row (SimulationRun with camelCase Drizzle fields)
- `exportSimulation` → `{ csv: string, total: number }` — call via `utils.widgetAdmin.exportSimulation.fetch()`
- `singleTest` → `SimulationCaseResult: { selections, resultStatus, totalPrice, constraintViolations, priceBreakdown, message }`
- `publishHistory` → `PublishHistory[]` DB rows ordered by createdAt desc (first row = latest)
- `publish` → `{ success: true, completeness }` — throws PRECONDITION_FAILED if not publishable
- `unpublish` → `{ success: true }`

### Widget Admin Files Created (SPEC-WB-005)

- `apps/admin/src/components/widget-admin/completeness-bar.tsx`
- `apps/admin/src/components/widget-admin/simulation-progress.tsx`
- `apps/admin/src/components/widget-admin/simulation-results-table.tsx`
- `apps/admin/src/components/widget-admin/publish-dialog.tsx`
- `apps/admin/src/app/(dashboard)/widget-admin/page.tsx` (dashboard)
- `apps/admin/src/app/(dashboard)/widget-admin/[productId]/simulate/page.tsx`
- `apps/admin/src/app/(dashboard)/widget-admin/[productId]/publish/page.tsx`
- `apps/admin/src/components/ui/progress.tsx` (custom, no radix)

### Completeness Domain Knowledge

4-item completeness checklist (SPEC-WB-005):
1. options — 주문옵션 등록
2. pricing — 가격 계산식 연결
3. constraints — 인쇄 제약조건 검토 (0개도 완료)
4. mesMapping — MES 상품코드 매핑

### Available Lucide Icons

Used in widget-admin: Settings, Layers, DollarSign, Shield, Play, Rocket, PowerOff, CheckCircle2, XCircle, AlertTriangle, Download, FlaskConical, ArrowRight, ChevronLeft, ChevronRight, Loader2
