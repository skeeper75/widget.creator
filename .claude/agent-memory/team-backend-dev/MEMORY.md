# Backend Dev Agent Memory

## Project Structure
- Monorepo with pnpm workspaces
- `packages/core` (@widget-creator/core): Pricing engine, option engine, constraint evaluator, quote calculator
- `packages/shared` (@widget-creator/shared): Drizzle ORM schemas (26 Huni tables), DB connection
- `apps/web` (@widget-creator/web): Next.js 16 App Router, REST API + tRPC

## Key Patterns
- DB connection: `import { db } from '@widget-creator/shared/db'`
- Schemas: `import { products } from '@widget-creator/shared/db/schema'`
- Core engine: `import { calculatePrice, assembleQuote } from '@widget-creator/core'`
- API responses use snake_case via `toSnakeCase()` from `_lib/utils/transform.ts`
- Response helpers: `successResponse()`, `collectionResponse()` from `_lib/utils/response.ts`
- Pagination: `paginate()` from `_lib/utils/pagination.ts`

## Middleware HOF Pattern (CRITICAL)
- ALL REST routes MUST use `withMiddleware` HOF from `_lib/middleware/with-middleware.ts`
- Never use inline try/catch in route handlers - error handling is built into withMiddleware
- Middleware order: `withCors('widget') -> withRateLimit('widget-token') -> withWidgetAuth() -> withValidation(schema, source)`
- Handler receives `(req, ctx)` with `ctx.validatedQuery`, `ctx.validatedBody`, `ctx.params`
- GET with query params: `withValidation(schema, 'query')` -> `ctx.validatedQuery`
- POST with body: `withValidation(schema, 'body')` -> `ctx.validatedBody`
- Route params accessed via `ctx.params.id` (string), use `Number()` to convert
- Domain-specific errors (PricingError, ConstraintError) still need try/catch inside handler, re-thrown as ApiError

## Drizzle ORM Notes
- Numeric columns return strings from postgres.js - always use `Number()` to convert
- Schema files use camelCase (e.g., `categoryId`) but API responses need snake_case
- Relations defined in `relations.ts`, useful for Drizzle relational queries

## Testing
- Vitest with `apps/web/vitest.config.ts`
- Setup file: `__tests__/setup.ts` provides mock DB (Proxy-based), mock JWT, assertion helpers
- DB mock is global via `vi.mock('@widget-creator/shared/db')` in setup
- Path aliases: `@/` maps to `app/`, workspace packages resolved via aliases
- Root vitest.config only includes `packages/*/src/**/*.test.ts` - apps/web has separate config

## Admin App (apps/admin)
- `apps/admin` (@widget-creator/admin): Next.js 15 App Router, tRPC v11 API layer, port 3001
- tRPC server: `apps/admin/src/lib/trpc/server.ts` - createContext (session + db), protectedProcedure
- tRPC client: `apps/admin/src/lib/trpc/client.ts` - createTRPCReact
- 27 routers in `apps/admin/src/lib/trpc/routers/*.ts` covering all 26 DB tables + dashboard + settings
- Validation schemas: `apps/admin/src/lib/validations/schemas.ts` using drizzle-zod createInsertSchema/createSelectSchema
- Auth: NextAuth.js v5 with Credentials provider, middleware protects all routes except /login
- Router naming: camelCase (e.g., `trpc.paperProductMappings.getMatrix`, `trpc.optionChoiceMesMappings.listKanban`)
- drizzle-zod peer warning: zod 3.24 vs drizzle-zod wanting 3.25+ - works fine at runtime

## Team Rules
- Test files exclusively owned by tester agent - never create test files
- Route/schema files for catalog/pricing owned by backend-dev
- Coordinate API contracts with frontend/tester via SendMessage
- Wait for infra-layer (TASK-001) before implementing routes that depend on middleware
