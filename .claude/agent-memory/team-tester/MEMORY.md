# Team Tester Memory

## Project: widget.creator

### Test Infrastructure
- Test framework: vitest ~3.0.9 with V8 coverage provider
- Config: `/home/innojini/dev/widget.creator/apps/web/vitest.config.ts`
- Setup: `/home/innojini/dev/widget.creator/apps/web/__tests__/setup.ts`
- Run tests from: `cd apps/web && npx vitest run`
- Run with coverage: `cd apps/web && npx vitest run --coverage`

### Key Patterns
- **Mock DB**: Proxy-based chainable mock via `createMockDb()` in setup.ts
- **Table stubs**: `createStubTable(name, columns)` creates objects with Symbol column refs
- **Dual module mock**: Both `@widget-creator/shared/db` and `@widget-creator/shared/db/schema` mocked via shared `allStubs` map
- **Sequential DB calls**: Use `let selectCall = 0` counter with `mockImplementation()` for routes making multiple queries
- **Admin auth bypass**: Mock `withAdminAuth` at module level to inject default admin session (auth.js doesn't exist yet)
- **Widget token**: HS256 JWT signed with 'widget-token-secret-change-in-production', issuer 'widget.huni.co.kr'
- **API key**: Must be >= 32 chars, tested with UUID format (36 chars)
- **Route context**: `{ params: Promise.resolve(params) }` for Next.js App Router route handlers

### Coverage Status (as of 2026-02-26)
- 396 tests across 30 files, 393 passing (3 pre-existing failures in pricing/orders routes)
- New SPEC-WB-006 widget tests: 60 tests across 5 files, all passing
  - quote-api.test.ts: 18 (AREA pricing, NOT_IN/NOT_EQUALS operators, auto_add/show_addon_list)
  - init-api.test.ts: 9
  - orders-api.test.ts: 21 (collision retry, addon items)
  - mes-client.test.ts: 7 (retry backoff, success/failure DB updates, no-op when MES_API_URL unset)
  - widget-routes.test.ts: 5 (pre-existing)
- tRPC routers excluded from coverage (drizzle-zod incompatible with stub approach)
- auth.ts verifyAdminSession untestable (imports non-existent auth.js)

### SPEC-WB-006 Widget API Test Patterns (apps/web/__tests__/widget/)
- **Widget auth mock**: `vi.mock('../../app/api/_lib/middleware/auth.js', async (importOriginal))` to bypass `withWidgetAuth()`
  - Inject `ctx.widgetToken = { sub, iss, allowed_origins }` in the mock
  - Required because `auth.ts` throws at module level if `WIDGET_TOKEN_SECRET` not set
- **WIDGET_TOKEN_SECRET env var**: Added to `apps/web/vitest.config.ts` `test.env` section
  - Value: `'widget-token-secret-change-in-production'` (same as setup.ts constant)
- **@widget-creator/db alias**: Added to `apps/web/vitest.config.ts` resolve.alias
  - `'@widget-creator/db': path.resolve(__dirname, '../../packages/db/src/index.ts')`
- **vi.clearAllMocks() vs vi.restoreAllMocks()**: Use `clearAllMocks()` in beforeEach for routes that use
  `db.insert` — `restoreAllMocks()` reverts spy state and breaks insert mocks in subsequent tests
- **dispatchToMes mock**: `vi.mock('../../app/api/_lib/services/mes-client.js', () => ({ dispatchToMes: vi.fn().mockResolvedValue({ success: true }) }))`
- **insert mock returns array**: `db.insert().values().returning()` must resolve to `[insertedOrder]` not `{ id }` directly
- **Promise.all + .then() chain**: For routes using `.limit(1).then((rows) => rows[0])` inside Promise.all,
  mock as: `limit: vi.fn().mockReturnValue({ then: vi.fn((resolve) => Promise.resolve(resolve([row]))) })`

### Admin App Test Infrastructure
- Config: `/home/innojini/dev/widget.creator/apps/admin/vitest.config.ts`
- Setup: `/home/innojini/dev/widget.creator/apps/admin/__tests__/setup.ts`
- Run: `cd apps/admin && npx vitest run`
- Environment: `node` (not jsdom - @testing-library/react and jsdom not installed)
- Coverage scope: `src/lib/validations/**/*.ts` (excluding schemas.ts)
- All 27 stub tables defined matching SPEC schema
- Pure logic test pattern: re-implement component logic in tests (no direct component import)

### Admin Coverage Status (as of 2026-02-23)
- 727 tests across 28 files, all passing (449 new tests added for M3-M5)
- circular-check.ts: 100% coverage (directly imported)
- React component .tsx files: untestable without jsdom + @testing-library/react
- tRPC routers excluded (drizzle-zod incompatible with stub approach)
- New M3-M5 test files (9 files, 449 tests):
  - editors/spreadsheet-editor.test.ts (54 tests) - reducer, validation, ratio, selection
  - editors/constraint-builder.test.ts (45 tests) - operators, circular detection, filtering
  - editors/kanban-board.test.ts (30 tests) - status transitions, filtering, column config
  - editors/visual-mapper.test.ts (34 tests) - grouping, filtering, click interaction, SVG
  - lib/processes-schemas.test.ts (55 tests) - binding/imposition/printMode/postProcess schemas
  - lib/pricing-schemas.test.ts (45 tests) - REQ-N-003 negative blocking, all price schemas
  - lib/integration-schemas.test.ts (42 tests) - mapping status, editor mapping, JSON editor
  - lib/widget-config.test.ts (37 tests) - widget CRUD, embed code, status badges
  - lib/product-options-router.test.ts (42 tests) - input validation, dedup, unassigned logic

### Test Gotchas
- `Number('')` returns 0, not NaN - empty string passes `>= 0` validation
- filterProducts matches both name AND categoryName - test data must use distinct category names

### packages/db Test Infrastructure (SPEC-WB-001)
- Config: `/home/innojini/dev/widget.creator/packages/db/vitest.config.ts`
- Setup: `/home/innojini/dev/widget.creator/packages/db/__tests__/setup.ts` (minimal, no DB)
- Run: `cd packages/db && npx vitest run`
- Test dirs: `__tests__/schema/`, `__tests__/seed/`
- **Drizzle table name**: Use `getTableName(table)` from `drizzle-orm`, NOT `table._.name`
  - `._` is TypeScript-only phantom type, does NOT exist at runtime in drizzle-orm v0.45
  - The real table name lives under `Symbol.for("drizzle:TableName")`
- **Schema tests**: Use `getTableColumns(table)` to inspect column definitions without DB
- **Seed tests**: Import seed arrays directly and validate shape/values (no DB needed)
- vitest.config.ts excludes `src/seed/**` from coverage

### Known Limitations
- tRPC routers use `drizzle-zod`'s `createInsertSchema()` which needs real Drizzle table objects
- tRPC excluded via `**/trpc/**` in vitest.config.ts coverage.exclude
- Admin routes mock `withAdminAuth` because `auth.js` (NextAuth v5) doesn't exist yet
- Admin app missing jsdom, @testing-library/react, @testing-library/jest-dom devDependencies
- Node environment: `globalThis.confirm` doesn't exist - use injected mock function pattern instead of `vi.spyOn(globalThis, 'confirm')`
