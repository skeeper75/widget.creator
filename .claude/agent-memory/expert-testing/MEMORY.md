# Expert Testing Agent Memory

## Project: widget-creator

### Key Findings

#### Next.js + TypeScript ESM Package Build Issue (Fixed 2026-02-26)
- **Problem**: `packages/core` uses `moduleResolution: bundler` with `.js` extension imports in TypeScript files
- **Symptom**: Next.js webpack throws `Module not found: Can't resolve './pricing/engine.js'`
- **Fix**: Add `extensionAlias` to `apps/admin/next.config.ts` webpack config:
  ```ts
  webpack: (config) => {
    if (config.resolve) {
      config.resolve.extensionAlias = {
        '.js': ['.ts', '.tsx', '.js', '.jsx'],
        '.jsx': ['.tsx', '.jsx'],
      };
    }
    return config;
  }
  ```
- **Location**: `/home/innojini/dev/widget.creator/apps/admin/next.config.ts`

#### E2E Test Setup
- **Playwright config**: `/home/innojini/dev/widget.creator/playwright.config.ts`
- **Test dir**: `apps/admin/__tests__/e2e/`
- **App URL**: `http://192.168.45.19:3001` (remote SSH environment)
- **Run command**: `PLAYWRIGHT_BASE_URL=http://192.168.45.19:3001 node_modules/.bin/playwright test`
- **DB**: Docker container `huni-postgres` on port 5432, database `huni_builder`
- **Auth**: `admin@huniprinting.com` / `admin123!`

#### shadcn UI Test Selectors
- shadcn `CardContent` renders with Tailwind classes (e.g., `pt-6`), NOT CSS module class names
- Do NOT use `[class*="CardContent"]` selector - it won't find elements
- Use text-based selectors with `.first()` to handle duplicate text in DOM
- Example: `page.locator('text=전체 상품').first()` instead of `page.locator('text=전체 상품')`

#### Test Data
- Test product `e2e-test-business-card` (id=2) and `e2e-test-sticker` (id=3) are seeded in `wb_products`
- 5 product categories: BUSINESS_CARD, STICKER, FLYER, POSTER, BANNER
- 6 option element types: SIZE, PAPER, PRINT_TYPE, FINISHING, COATING, QTY

### Test Results (2026-02-26)
- **spec-wa-001-admin.test.ts**: 33/33 passed
