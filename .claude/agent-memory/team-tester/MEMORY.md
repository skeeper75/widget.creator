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

### Coverage Status (as of 2026-02-22)
- 341 tests across 26 files, all passing
- Statements: 93.97%, Branches: 85.6%, Functions: 95.23%, Lines: 93.97%
- tRPC routers excluded from coverage (drizzle-zod incompatible with stub approach)
- auth.ts verifyAdminSession untestable (imports non-existent auth.js)

### Admin App Test Infrastructure
- Config: `/home/innojini/dev/widget.creator/apps/admin/vitest.config.ts`
- Setup: `/home/innojini/dev/widget.creator/apps/admin/__tests__/setup.ts`
- Run: `cd apps/admin && npx vitest run`
- Environment: `node` (not jsdom - @testing-library/react and jsdom not installed)
- Coverage scope: `src/lib/validations/**/*.ts` (excluding schemas.ts)
- All 27 stub tables defined matching SPEC schema
- Pure logic test pattern: re-implement component logic in tests (no direct component import)

### Admin Coverage Status (as of 2026-02-23)
- 278 tests across 16 files, all passing
- circular-check.ts: 100% coverage (directly imported)
- React component .tsx files: untestable without jsdom + @testing-library/react
- tRPC routers excluded (drizzle-zod incompatible with stub approach)

### Known Limitations
- tRPC routers use `drizzle-zod`'s `createInsertSchema()` which needs real Drizzle table objects
- tRPC excluded via `**/trpc/**` in vitest.config.ts coverage.exclude
- Admin routes mock `withAdminAuth` because `auth.js` (NextAuth v5) doesn't exist yet
- Admin app missing jsdom, @testing-library/react, @testing-library/jest-dom devDependencies
- Node environment: `globalThis.confirm` doesn't exist - use injected mock function pattern instead of `vi.spyOn(globalThis, 'confirm')`
