# Manager-Spec Agent Memory

## Project: Widget Creator (Huni Printing Widget Builder)

### Tech Stack
- Drizzle ORM with PostgreSQL 16
- TypeScript 5.9+ monorepo (pnpm)
- Schema files at: `packages/shared/src/db/schema/huni-*.schema.ts`
- Migration output: `drizzle/` directory
- Config: `drizzle.config.ts` at project root

### SPEC Patterns
- Project mode: personal (3-file structure: spec.md, plan.md, acceptance.md)
- Documentation language: English (per language.yaml) -- but spec content in Korean (conversation_language)
- Conversation language: Korean (per language.yaml)

### Widget DB Schema SPECs (SPEC-DB-001~004)
- SPEC-DB-001: Product domain core (4 tables: option_element_types, option_element_choices, product_categories, wb_products)
- SPEC-DB-002: Recipe & constraints (8 tables: product_recipes, recipe_option_bindings, recipe_choice_restrictions, constraint_templates, addon_groups, recipe_constraints, addon_group_items, constraint_nl_history)
- SPEC-DB-003: Pricing (4 tables: product_price_configs, print_cost_base, postprocess_cost, qty_discount)
- SPEC-DB-004: Operations & orders (5 tables: simulation_runs, simulation_cases, publish_history, orders/wbOrders, quote_logs/wbQuoteLogs)
- Schema files at: `packages/db/src/schema/widget/` (01- through 06- prefixed files)
- These are retroactive documentation SPECs (schema already implemented)

### SPEC-DB-005: Excel Import Design (Color Semantic Mapping)
- Adds `source_color` varchar(10) to `option_element_types` and `recipe_option_bindings`
- COLOR_SEMANTIC_MAP: E06666=red/required, F6B26B=orange/optional, FFFF00=yellow/conditional, C4BD97/D9D9D9/empty=internal
- New script: `scripts/import/import-product-options.ts` (reads product-master.toon)
- Shared TOON parser extracted to `scripts/import/lib/toon-parser.ts`
- Targets Widget Builder schema (packages/db/src/schema/widget/), not legacy huni schema

### Key Conventions
- Drizzle uses callback syntax for cross-file FK references: `() => table.id`
- Self-referencing FKs require `AnyPgColumn` type from `drizzle-orm/pg-core`
- Schema file dependency order is acyclic: catalog -> materials -> processes -> pricing/options -> integration -> orders
- Polymorphic FK patterns cannot use `.references()` - document with @MX:WARN
