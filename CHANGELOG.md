# CHANGELOG

이 프로젝트의 모든 주요 변경사항은 이 파일에 기록된다.

형식은 [Keep a Changelog](https://keepachangelog.com/ko/1.0.0/)를 따르며,
이 프로젝트는 [Semantic Versioning](https://semver.org/lang/ko/)을 준수한다.

## [Unreleased]

### Added
- **SPEC-WIDGET-ADMIN-001**: Widget Builder Admin Pages & Components
  - 7 new admin pages for Widget Builder management: elements, choices, recipes, addons, constraint-templates, pricing, orders
  - 9 new React components for widget builder CRUD: ElementTypeEditModal, ChoiceEditModal, ElementBindingTable, ChoiceRestrictionMatrix, TemplateDetailPanel, AddonGroupEditor, MesStatusBadge, PriceConfigTabs, OrderDetailPanel
  - 7 new tRPC routers for widget-builder domain with protected procedures and Zod validation
  - Navigation integration: sidebar updated with widget-builder menu items
  - Full CRUD functionality for: element types (attribute types, UI controls, categories), element choices, recipes with element bindings and choice restrictions, constraint templates with ECA triggers, addon groups, pricing configuration, orders management
  - Ready for deployment; 4 deferred low-priority components (NlConstraintInput, WidgetPreview, SimulationResultPanel, CoverageSummaryCard) planned for follow-up SPEC

- **SPEC-IM-004**: HuniPrinting Data Code Normalization, Product-MES Mapping, Empty Table Import
  - M0: Schema Foundation — huni_code NOT NULL removal, legacy_huni_id and excel_mes_code columns for migration traceability
  - M1: Post-Process Code Normalization — 8 process types mapped to PP_* format (PP_PERFORATION, PP_CREASING, PP_FOLDING, PP_VARIABLE_TEXT, PP_VARIABLE_IMAGE, PP_ROUNDED_CORNER, PP_COATING_A3, PP_COATING_T3)
  - M2: huni_code Normalization — MES code format cleanup (no NNN-NNNN in huni_code), NULL support for products without HuniPrinting IDs
  - M3: Product-MES Mapping Import — Step 4.5 import script (import-product-mes-mapping.ts) with bidirectional lookup support, booklet cover_type distinction
  - M4: Empty Table Fixes — paper_product_mapping, fixed_prices, package_prices name matching improvements, shared code generator utilities
  - M5: mesRegistered Normalization — PostgreSQL trigger or subquery-based synchronization with product_mes_mapping
  - Full 15-step import pipeline completion: 210 products, 411 paper mappings, 1394 price tiers, 260 MES items
  - Utility scripts: cleanup-import-data.ts (safe TRUNCATE with CASCADE), check-db-state.ts (diagnostic tool)
  - 1542 vitest tests passing (48 test files), zero connection leaks, all import scripts follow reference pattern

- **SPEC-IM-003**: HuniPrinting Master Data Import & Price Draft Generation Pipeline
  - 14-step comprehensive data import workflow (M0~M4 phases)
  - M0: Foundation Layer — MES Items (toon), Papers, Options, Product Options
  - M1: Catalog Layer — Categories (48 roots + subs), Products (221 total), Product Sizes (~1,200)
  - M2: Manufacturing Layer — Print Modes (12), Post-Processes (8), Bindings (5), Imposition Rules (from gaprice), Paper Mappings
  - M3: Pricing Layer — Price Tiers (from 디지털출력비 sheet), Fixed Prices (from 명함 sheet), Package Prices (from 옵션결합상품 sheet), Foil Prices (from 후가공_박 sheet)
  - M4: Configuration Layer — Loss Config (default lossRate=1.3, editable)
  - UPSERT batch processing (BATCH_SIZE=50) with onConflictDoUpdate pattern for idempotent re-execution
  - FK dependency ordering: categories → products; processes → imposition_rules; papers → paper_product_mapping; price_tables → price_tiers
  - Data sources: 상품마스터_extracted.json (products), 가격표_extracted.json (pricing), 출력소재관리_extracted.json (papers), hardcoded static definitions
  - --dry-run and --validate-only flags for safe pre-execution verification
  - 14 import scripts + 12 test files with 335 passing tests (~85%+ coverage)
  - @MX:ANCHOR tags on main import functions (fan_in >= 3: categories, products, processes, foil prices)
  - @MX:NOTE tags on complex business logic (batch processing, UPSERT patterns, FK resolution, parser logic)
  - Implementation decisions documented: 출력소재관리.xlsx as primary papers source, 디지털출력비 sheet only (skip 가수정), 랑데뷰 단가 from 상품마스터
  - Annotation Cycle complete: all P0 issues resolved per .moai/specs/SPEC-IM-003/questions.md

- **SPEC-IM-002**: HuniPrinting Product Option Data Import Pipeline
  - 5단계 순차 임포트 파이프라인 구현 (Phase 1~5)
  - Phase 1: Master Lookup (option_definitions 59개, option_choices ~1,198개)
  - Phase 2: Core Product Import (products 221개, product_sizes ~1,200개)
  - Phase 3: Process Definition (print_modes 12개, post_processes ~40개, bindings 4개)
  - Phase 4: Structural Relationships (product_options ~2,000개)
  - Phase 5: Tacit Knowledge (option_constraints 129개, option_dependencies ~300개, MES mappings ~250개)
  - 각 Phase 트랜잭션 롤백 지원 (FK violation 시 전체 롤백)
  - 멱등성 UPSERT 패턴 (재실행 시 중복 없음)
  - `huni-options.schema.ts` 신규 DB 스키마 (5 tables)
  - Phase 1~4 구현 완료, Phase 5 구조 설계 완료

- **SPEC-WB-007**: GLM Natural Language Rule Builder
  - z.ai (GLM-5.0/4.7) API integration with OpenAI-compatible SDK
  - 3-second timeout and JSON Schema structured output enforcement
  - 4 tRPC endpoints: convertConstraint, confirmConstraint, convertPriceRule, confirmPriceRule
  - `price_nl_history` audit log table for NL input tracking and model performance analysis
  - Admin UI NL panel with real-time confidence scoring (≥85% auto-apply, <85% manual review)
  - Constraint transformer: NL → ECA rule conversion (8 action types: exclude_options, filter_options, show_addon_list, auto_add, require_option, show_message, change_price_mode, set_default)
  - Price rule transformer: NL → qty_discount tier extraction with decimal formatting
  - Transaction-wrapped DB operations ensuring atomic constraint + audit log insertion
  - Zod schema validation for all GLM outputs (single_constraint, composite_constraints, qty_discount, mixed_rules)
  - @MX:ANCHOR tags on glm.service.ts and glm.router.ts (public API boundaries)
  - 74 comprehensive tests (25 service layer + 18 constraint transformer + 15 price transformer + 16 UI/hook tests)
  - innojini-huni-nlp-builder skill reference for domain expertise

- **SPEC-WB-006**: Runtime Auto-Quote Engine
  - POST /api/widget/quote: Real-time constraint evaluation + pricing calculation (unified API)
  - GET /api/widget/products/:productKey/init: Widget initialization with default quote and constraint rules
  - POST /api/widget/orders: Server-side re-quote validation + order creation + fire-and-forget MES dispatch
  - GET /api/widget/orders/:orderCode: Order status retrieval
  - `wbOrders` table: Order snapshot storage with MES status tracking
  - `wbQuoteLogs` table: Async quote logging for analytics and debugging
  - QuoteService: Parallel constraint + pricing evaluation
  - OrderService: Server-side re-quote validation, price discrepancy detection
  - MesClient: HTTP client with 3-retry exponential backoff
  - 48 comprehensive tests (13 quote API + 9 init API + 19 orders API + 7 MES client unit tests)
  - @MX:ANCHOR tags on public API boundaries (quote endpoint, orders endpoint)
  - @MX:NOTE tags on complex business logic (constraint evaluation, pricing calculation, MES dispatch)

### Fixed
- **SPEC-SEED-001**: Fix seed data correctness bugs in `scripts/seed.ts`
  - Fix `isActive`: internal-only products now correctly set to `is_active=false`
  - Fix `mesRegistered`: use `!!product.MesItemCd` instead of `product.shopbyId !== null`
  - Fix `edicusCode`: now applied to ALL products (not just those with shopbyId)
  - Fix slug: use `MesItemCd.toLowerCase()` for URL-safe unique slugs
  - Rewrite `seedCategories` with 2-level SHEET_CATEGORY_MAP hierarchy
  - Fix 4-priority category lookup in `seedProductsAndMes`
  - All 5 acceptance criteria verified: 221 products, shopby_id=NULL, 5 inactive, correct edicus_code format, depth=1 categories

### Added
- **SPEC-WB-002**: Product Category & Recipe System
  - `product_categories` table: 11 Figma-based categories for 후니프린팅 (digital-print, sticker, book, photobook, calendar, design-calendar, sign-poster, acrylic, goods, apparel, packaging)
  - `products` table: Product master with edicus_code IMMUTABLE constraint, huni_code isolation, MES/Shopby/Edicus external code support
  - `product_recipes` table: Recipe versioning system with version_status (draft/active/archived)
  - `recipe_option_bindings` table: Dual display_order + processing_order design for UI layout vs. MES/price processing
  - `recipe_choice_restrictions` table: allow_only/exclude restriction modes with choice_ids JSONB array
  - Category seed data: 11 standard categories matched to Figma specification (not legacy catalog.json 12 categories)
  - @MX:ANCHOR tags added: productCategories (fan_in >= 3), wbProducts (fan_in >= 3)
  - @MX:NOTE tags added: edicus_code immutability rule, huni_code isolation principle, dual-order design rationale, category seed data origin
  - 181 unit tests passing (schema, seed, recipes, bindings, choice restrictions)
  - TypeScript strict mode compliance, full type safety via Drizzle ORM
- **SPEC-SEED-002**: Comprehensive DB Seeding Pipeline - Zod validation and transaction safety
  - New `scripts/lib/schemas.ts`: Zod schemas for all seed JSON inputs (PaperJsonSchema, GoodsJsonSchema, OptionConstraintsJsonSchema, DigitalPrintJsonSchema, BindingJsonSchema, FinishingJsonSchema) with generic `loadAndValidate<T>()` helper
  - `scripts/seed.ts` - `seedGoodsFixedPrices()`: Zod validation on goods.json load, price=0 skip logic with warning counter, transaction-wrapped DELETE+INSERT
  - Drizzle `__drizzle_migrations` tracking synced (migrations 0001-0003 registered); `drizzle-kit migrate` runs cleanly
  - 57 new unit tests across 3 files: `seed-goods-prices.test.ts` (21), `seed-transactions.test.ts` (11), `seed-schemas.test.ts` (25)
- **SPEC-DATA-003**: Integrated Data Pipeline and Version Management Strategy (`scripts/import/`)
  - MES v5 JSON import pipeline: option_definitions (30 records), option_choices (deduplicated), product_options (723 records), product_editor_mapping (111 records), option_dependencies (~300 records)
  - Version management: SHA-256 source file checksums, `data_import_log` table for import history tracking, idempotent re-run support
  - Base importer pattern with `INSERT ... ON CONFLICT ... DO UPDATE` for all tables
  - Cross-reference validator and count validator for data integrity verification
