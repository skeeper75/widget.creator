# Expert Refactoring Agent Memory

## Project: widget.creator

### Key Patterns

#### @MX Tag Language Setting
- `language.yaml` in this project has `conversation_language: ko` but NO `code_comments` field
- When `code_comments` is absent, default to English (en) per protocol
- All @MX tag descriptions must be in English

#### CSS File Comment Syntax
- globals.css uses `/* */` style comments, NOT `//`
- @MX tags in CSS files must use: `/* @MX:TAG: description */`

#### TypeScript/TSX Files
- @MX tags use `//` prefix per protocol

#### [AUTO] Prefix Rule
- All agent-generated @MX tags MUST include `[AUTO]` prefix in the description
- Format: `// @MX:NOTE: [AUTO] Description here`

#### Fan-in Identification in Frontend
- `navItems` array in sidebar.tsx: consumed by isActive, isGroupActive, expandedGroups init, render loop = fan_in >= 3 -> ANCHOR
- `Sidebar()` component: rendered in root layout wrapping ALL admin routes = fan_in >= 10 -> ANCHOR
- CSS `:root` and `@theme inline` blocks: consumed by 20+ components = ANCHOR

#### WARN Triggers in E2E Tests
- `waitForTimeout` with hardcoded ms = timing-sensitive -> WARN
- `waitForFunction` polling DOM by CSS class substring = fragile -> WARN
- `captureScreenshot` with no internal wait = caller-dependent -> WARN

### File Paths Encountered
- `/home/innojini/dev/widget.creator/apps/admin/__tests__/e2e/screenshot-capture.test.ts`
- `/home/innojini/dev/widget.creator/apps/admin/src/styles/globals.css`
- `/home/innojini/dev/widget.creator/apps/admin/src/components/layout/sidebar.tsx`
