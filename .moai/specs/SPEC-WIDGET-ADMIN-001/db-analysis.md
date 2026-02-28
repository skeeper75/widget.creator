# DB Schema Analysis — SPEC-WIDGET-ADMIN-001

**Analyst:** team-analyst
**Date:** 2026-02-28
**Scope:** Widget Builder Admin Page Requirements

---

## 1. Schema Overview

The project has two distinct schema namespaces:

| Namespace | Package | Purpose |
|-----------|---------|---------|
| Widget Builder (WB) | `packages/db` | Widget-specific product config, recipes, pricing, simulation |
| Huni Shared | `packages/shared/src/db` | Catalog data, materials, processes, pricing tables, integration mappings |

---

## 2. Widget Builder Tables (`packages/db/src/schema/widget/`)

### 2.1 Layer 1: Foundation

#### `option_element_types` (01-element-types.ts)
- **Purpose:** Vocabulary of UI option types (e.g., SIZE, PAPER, FINISHING)
- **Key columns:** id, type_key (unique), type_name_ko, type_name_en, ui_control (toggle-group|select|number-stepper|etc.), option_category (material|process|spec|quantity|group), allows_custom, display_order, is_active
- **Relationships:** Referenced by option_element_choices (FK), recipe_option_bindings (FK)
- **Data source:** Seeded (`packages/db/src/seed/widget-types.ts`)
- **CRUD needed:** Yes — admin can add/edit/reorder types; cannot delete if choices exist
- **Priority:** HIGH (foundation of entire WB domain)

#### `option_element_choices` (02-element-choices.ts)
- **Purpose:** Choice library per element type (e.g., SIZE choices: 90x50mm, 100x148mm)
- **Key columns:** id, type_id (FK→element_types), choice_key, display_name, value, mes_code, display_order, is_active, width_mm, height_mm, bleed_mm (SIZE), basis_weight_gsm (PAPER), finish_category (FINISHING), thumbnail_url, color_hex, price_key, metadata (JSONB)
- **Relationships:** Parent: option_element_types; Referenced by: recipe_option_bindings (default_choice), recipe_choice_restrictions (choice)
- **Data source:** Imported from Huni data via import pipeline (SPEC-IM-003/004)
- **CRUD needed:** Yes — list by type, create/edit/delete choices; bulk import support
- **Priority:** HIGH

### 2.2 Layer 2: Product Configuration

#### `product_categories` (02-product-categories.ts)
- **Purpose:** Category hierarchy for WB products (11 categories per Figma design)
- **Key columns:** id, category_key (unique), category_name_ko, category_name_en, display_order, is_active, description
- **Relationships:** Referenced by wb_products (FK)
- **Data source:** Seeded (`packages/db/src/seed/seed-product-categories.ts`)
- **CRUD needed:** Yes — list/edit/reorder; create/delete with caution (may break products)
- **Priority:** HIGH

#### `wb_products` (02-products.ts)
- **Purpose:** Product master — core entity for WB product configuration
- **Key columns:** id, mes_item_cd (unique, nullable), edicus_code (IMMUTABLE once set), edicus_ps_code, shopby_product_no, product_key (unique), product_name_ko, product_name_en, category_id (FK), subcategory, product_type, is_premium, has_editor, has_upload, file_spec (JSONB), thumbnail_url, display_order, is_active, is_visible
- **Relationships:** Category FK; Referenced by all downstream WB tables
- **Data source:** Manually entered by admin
- **CRUD needed:** Full CRUD — list/search by category, create, edit (with edicus_code immutability guard), soft-delete via is_active
- **Priority:** HIGH (anchor entity)
- **Special constraint:** edicus_code is IMMUTABLE once set — UI must enforce this

#### `product_recipes` (02-product-recipes.ts)
- **Purpose:** Recipe versioning per product (multiple versions, immutable history)
- **Key columns:** id, product_id (FK→wb_products), recipe_name, recipe_version, is_default, is_archived, description
- **Relationships:** Parent: wb_products; Referenced by: recipe_option_bindings, recipe_constraints, orders, constraint_nl_history
- **Data source:** Created by admin via wizard
- **CRUD needed:** Create/list/archive — no hard delete (order history integrity); version increment on modify
- **Priority:** HIGH
- **Special constraint:** Modify = archive old + create new (immutable recipe versioning)

#### `recipe_option_bindings` (02-recipe-option-bindings.ts)
- **Purpose:** Links product recipes to option types with ordering
- **Key columns:** id, recipe_id (FK), type_id (FK→element_types), display_order, processing_order, is_required, default_choice_id (FK→element_choices), is_active
- **Relationships:** Parent: product_recipes; References: element_types, element_choices
- **Data source:** Admin configuration via options wizard step
- **CRUD needed:** Create/edit/reorder/delete (within recipe context); inline management via recipe UI
- **Priority:** HIGH (managed via Options wizard step)

#### `recipe_choice_restrictions` (02-recipe-choice-restrictions.ts)
- **Purpose:** Allow/exclude specific choices for a recipe-option binding
- **Key columns:** id, recipe_binding_id (FK→recipe_option_bindings), choice_id (FK→element_choices), restriction_mode (allow_only|exclude)
- **Relationships:** Parent: recipe_option_bindings, element_choices
- **Data source:** Admin configuration
- **CRUD needed:** Inline management within binding editor
- **Priority:** MEDIUM (sub-feature of options step)

### 2.3 Layer 3: Constraints & Add-ons

#### `constraint_templates` (03-constraint-templates.ts)
- **Purpose:** System-provided ECA constraint Quick Pick templates
- **Key columns:** id, template_key (unique), template_name_ko, category, trigger_option_type, trigger_operator, trigger_values_pattern (JSONB), extra_conditions_pattern (JSONB), actions_pattern (JSONB, required), is_system, is_active
- **Relationships:** Referenced by recipe_constraints (FK)
- **Data source:** Seeded (`packages/db/src/seed/constraint-templates.ts`); admins can add custom templates
- **CRUD needed:** List/create/edit for custom templates; system templates are read-only
- **Priority:** MEDIUM

#### `recipe_constraints` (03-recipe-constraints.ts)
- **Purpose:** ECA constraint rules per product recipe (core constraint domain)
- **Key columns:** id, recipe_id (FK), constraint_name, trigger_option_type, trigger_operator, trigger_values (JSONB), extra_conditions (JSONB), actions (JSONB), priority, is_active, input_mode (manual|template|nl), template_id (FK→constraint_templates), comment, created_by
- **Relationships:** Parent: product_recipes; Reference: constraint_templates
- **Data source:** Admin via Constraints wizard step (manual, template quick pick, or NL input via GLM)
- **CRUD needed:** Full CRUD; reorder by priority; test/evaluate; NL-to-constraint via GLM
- **Priority:** HIGH (managed via Constraints wizard step)

#### `constraint_nl_history` (03-constraint-nl-history.ts)
- **Purpose:** Audit log for NL-to-constraint AI interpretation sessions
- **Key columns:** id, constraint_id (FK, nullable), recipe_id (FK), nl_input_text, nl_interpretation (JSONB), ai_model_version, interpretation_score, is_approved, approved_by, approved_at, deviation_note, created_by
- **Relationships:** Parent: recipe_constraints (nullable), product_recipes
- **Data source:** System-generated during NL constraint input
- **CRUD needed:** Read-only list; approve/reject actions; no create/delete from admin
- **Priority:** LOW (audit/monitoring only)

#### `addon_groups` (03-addon-groups.ts)
- **Purpose:** Add-on product group definitions for ECA show_addon_list action
- **Key columns:** id, group_name, group_label, display_mode (list|grid|carousel), is_required, display_order, description, is_active
- **Relationships:** Referenced by addon_group_items
- **Data source:** Admin-created
- **CRUD needed:** Full CRUD
- **Priority:** MEDIUM

#### `addon_group_items` (03-addon-group-items.ts)
- **Purpose:** Product members within an addon group
- **Key columns:** id, group_id (FK→addon_groups), product_id (FK→wb_products), label_override, is_default, display_order, price_override
- **Relationships:** Parent: addon_groups, wb_products
- **Data source:** Admin-created inline within addon group editor
- **CRUD needed:** Inline management within addon group editor
- **Priority:** MEDIUM

### 2.4 Layer 4: Pricing

#### `product_price_configs` (04-product-price-configs.ts)
- **Purpose:** Price mode configuration per product (LOOKUP|AREA|PAGE|COMPOSITE)
- **Key columns:** id, product_id (unique FK), price_mode, formula_text, unit_price_sqm (AREA), min_area_sqm (AREA), imposition (PAGE), cover_price (PAGE), binding_cost (PAGE), base_cost (COMPOSITE), is_active
- **Relationships:** Parent: wb_products (1:1); Referenced by print_cost_base, price_nl_history
- **Data source:** Admin via Pricing wizard step
- **CRUD needed:** Create/update (1 per product); mode selector drives which sub-fields appear
- **Priority:** HIGH (managed via Pricing wizard step)

#### `print_cost_base` (04-print-cost-base.ts)
- **Purpose:** LOOKUP mode price table — lookup by (plate_type, print_mode, qty_tier)
- **Key columns:** id, product_id (FK), plate_type (size code), print_mode (print method), qty_min, qty_max, unit_price, is_active
- **Relationships:** Parent: wb_products
- **Data source:** Admin-entered; may be imported from Huni price sheets
- **CRUD needed:** Spreadsheet-style bulk edit; import from CSV/Excel; list/create/edit/delete rows
- **Priority:** HIGH (for LOOKUP mode products)

#### `postprocess_cost` (04-postprocess-cost.ts)
- **Purpose:** Post-processing (후가공) cost table; product-scoped or global (NULL product_id)
- **Key columns:** id, product_id (nullable FK), process_code, process_name_ko, qty_min, qty_max, unit_price, price_type (fixed|per_unit|per_sqm), is_active
- **Relationships:** Optional parent: wb_products
- **Data source:** Admin-entered
- **CRUD needed:** List (with global + product-specific filter), create/edit/delete
- **Priority:** HIGH (managed via Pricing wizard step)

#### `qty_discount` (04-qty-discount.ts)
- **Purpose:** Quantity-based discount tier table; product-scoped or global
- **Key columns:** id, product_id (nullable FK), qty_min, qty_max, discount_rate, discount_label, display_order, is_active
- **Relationships:** Optional parent: wb_products
- **Data source:** Admin-entered
- **CRUD needed:** List/create/edit/delete tiers (spreadsheet-style)
- **Priority:** HIGH (managed via Pricing wizard step)

#### `price_nl_history` (04-price-nl-history.ts)
- **Purpose:** Audit log for NL-to-price-rule AI interpretation sessions
- **Key columns:** id, product_id (FK), price_config_id (FK, nullable), rule_type, nl_input_text, nl_interpretation (JSONB), ai_model_version, interpretation_score, is_approved, approved_by, applied_tiers (JSONB), deviation_note, created_by
- **Relationships:** Parent: wb_products, product_price_configs
- **Data source:** System-generated during NL pricing input
- **CRUD needed:** Read-only list; approve/reject actions
- **Priority:** LOW (audit/monitoring only)

### 2.5 Layer 5: Simulation & Publish

#### `simulation_runs` (05-simulation-runs.ts)
- **Purpose:** Tracks bulk simulation execution per product
- **Key columns:** id, product_id (FK), total_cases, passed_count, warned_count, errored_count, status (running|completed|failed|cancelled), started_at, completed_at, created_by
- **Relationships:** Parent: wb_products; Referenced by: simulation_cases, publish_history
- **Data source:** System-generated on simulation trigger
- **CRUD needed:** Read-only list with status/cancel; trigger simulation via action
- **Priority:** MEDIUM (managed via Simulation wizard step)

#### `simulation_cases` (within 05-simulation-runs.ts)
- **Purpose:** Individual combination results within a simulation run
- **Key columns:** id, run_id (FK→simulation_runs), selections (JSONB), result_status (pass|warn|error), total_price, constraint_violations (JSONB), price_breakdown (JSONB), message
- **Relationships:** Parent: simulation_runs
- **Data source:** System-generated
- **CRUD needed:** Read-only; filterable by result_status; expandable detail view
- **Priority:** MEDIUM

#### `publish_history` (05-publish-history.ts)
- **Purpose:** Immutable audit trail for publish/unpublish actions
- **Key columns:** id, product_id (FK), action (publish|unpublish), completeness (JSONB snapshot), simulation_run_id (FK, nullable), created_by, created_at
- **Relationships:** Parent: wb_products; Reference: simulation_runs
- **Data source:** System-generated on publish/unpublish action
- **CRUD needed:** Read-only list per product
- **Priority:** LOW (audit/monitoring only)

### 2.6 Layer 6: Orders

#### `orders` (06-orders.ts)
- **Purpose:** Widget Builder order snapshots with MES status tracking
- **Key columns:** id, order_code (unique), product_id (FK), recipe_id (FK), recipe_version, selections (JSONB), price_breakdown (JSONB), total_price, applied_constraints (JSONB), addon_items (JSONB), shopby_order_no, mes_order_id, mes_status (pending|sent|confirmed|failed|not_linked), status (created|paid|in_production|shipped|completed|cancelled), customer info
- **Relationships:** Parent: wb_products, product_recipes
- **Data source:** System-generated when customer orders
- **CRUD needed:** List/search/filter; read-only detail; status update (admin manual override); MES resend action
- **Priority:** HIGH (order management is critical)

#### `quote_logs` (within 06-orders.ts)
- **Purpose:** Quote calculation audit log for debugging and analytics
- **Key columns:** id, product_id (FK), selections (JSONB), quote_result (JSONB), source (client|server|simulation), response_ms, created_at
- **Relationships:** Parent: wb_products
- **Data source:** System-generated
- **CRUD needed:** Read-only list; analytics view
- **Priority:** LOW (debugging/analytics)

---

## 3. Huni Shared Tables (`packages/shared/src/db/schema/`)

### 3.1 Catalog

#### `categories` (huni-catalog.schema.ts)
- **Purpose:** Hierarchical Huni product categories (self-referencing)
- **Key columns:** id, code (unique), name, parent_id (self-FK), depth, display_order, sheet_name, icon_url, is_active
- **Admin status:** ✅ EXISTS — `/products/categories` page
- **CRUD needed:** Existing implementation covers this

#### `products` (huni-catalog.schema.ts)
- **Purpose:** Huni product master record (source of truth for Huni system)
- **Key columns:** id, category_id (FK), huni_code (unique), edicus_code (unique), shopby_id (unique), name, slug, product_type, pricing_model, order_method, editor_enabled, is_active, mes_registered
- **Admin status:** ✅ EXISTS — `/products/list` and `/products/[id]` pages
- **CRUD needed:** Existing implementation covers this

#### `product_sizes` (huni-catalog.schema.ts)
- **Purpose:** Size specs per Huni product (cut/work dimensions, custom size bounds)
- **Admin status:** ✅ EXISTS — `/products/[id]/sizes` page
- **CRUD needed:** Existing implementation covers this

### 3.2 Materials

#### `papers` (huni-materials.schema.ts)
- **Purpose:** Paper specifications (weight, pricing per ream/4-cut)
- **Admin status:** ✅ EXISTS — `/materials/papers` page
- **CRUD needed:** Existing

#### `materials` (huni-materials.schema.ts)
- **Purpose:** Non-paper material specifications
- **Admin status:** ✅ EXISTS — `/materials/materials` page
- **CRUD needed:** Existing

#### `paper_product_mapping` (huni-materials.schema.ts)
- **Purpose:** Paper-to-product associations with cover_type support
- **Admin status:** ✅ EXISTS — `/materials/mappings` page
- **CRUD needed:** Existing

### 3.3 Processes

#### `print_modes` (huni-processes.schema.ts)
- **Purpose:** Print mode specifications (sides, color type, price code)
- **Admin status:** ✅ EXISTS — `/processes/print-modes` page
- **CRUD needed:** Existing

#### `post_processes` (huni-processes.schema.ts)
- **Purpose:** Post-processing (후가공) specifications
- **Admin status:** ✅ EXISTS — `/processes/post-processes` page
- **CRUD needed:** Existing

#### `bindings` (huni-processes.schema.ts)
- **Purpose:** Binding specifications for booklets
- **Admin status:** ✅ EXISTS — `/processes/bindings` page
- **CRUD needed:** Existing

#### `imposition_rules` (huni-processes.schema.ts)
- **Purpose:** Sheet imposition calculation rules
- **Admin status:** ✅ EXISTS — `/processes/imposition` page
- **CRUD needed:** Existing

### 3.4 Options

#### `option_definitions` (huni-options.schema.ts)
- **Purpose:** Master option type definitions with UI metadata (section, layout, chip columns)
- **Admin status:** ✅ EXISTS — `/options/definitions` page
- **CRUD needed:** Existing

#### `option_choices` (huni-options.schema.ts)
- **Purpose:** Available choices per option definition with rich UI metadata
- **Admin status:** ✅ EXISTS — `/options/choices` page
- **CRUD needed:** Existing

#### `product_options` (huni-options.schema.ts)
- **Purpose:** Product-specific option configs (overrides, visibility, stepper constraints)
- **Admin status:** ✅ EXISTS — `/products/[id]/options` page
- **CRUD needed:** Existing

#### `option_constraints` (huni-options.schema.ts)
- **Purpose:** UI visibility and value constraint rules per product
- **Admin status:** ✅ EXISTS — `/options/constraints` page
- **CRUD needed:** Existing

#### `option_dependencies` (huni-options.schema.ts)
- **Purpose:** Parent-child option dependency rules
- **Admin status:** ✅ EXISTS — `/options/dependencies` page
- **CRUD needed:** Existing

### 3.5 Pricing

#### `price_tables` (huni-pricing.schema.ts)
- **Purpose:** Price table headers (per print type, quantity basis)
- **Admin status:** ✅ EXISTS — `/pricing/tables` page
- **CRUD needed:** Existing

#### `price_tiers` (huni-pricing.schema.ts)
- **Purpose:** Price tier entries per table
- **Admin status:** ✅ EXISTS — `/pricing/tiers` page
- **CRUD needed:** Existing

#### `fixed_prices` (huni-pricing.schema.ts)
- **Purpose:** Fixed unit prices for specific product/size/paper/print configurations
- **Admin status:** ✅ EXISTS — `/pricing/fixed` page
- **CRUD needed:** Existing

#### `package_prices` (huni-pricing.schema.ts)
- **Purpose:** Package-based pricing for booklets
- **Admin status:** ✅ EXISTS — `/pricing/packages` page
- **CRUD needed:** Existing

#### `foil_prices` (huni-pricing.schema.ts)
- **Purpose:** Foil stamping price table
- **Admin status:** ✅ EXISTS — `/pricing/foil` page
- **CRUD needed:** Existing

#### `loss_quantity_config` (huni-pricing.schema.ts)
- **Purpose:** Production loss rate configuration (polymorphic scope)
- **Admin status:** ✅ EXISTS — `/pricing/loss` page
- **CRUD needed:** Existing

### 3.6 Integration

#### `mes_items` (huni-integration.schema.ts)
- **Purpose:** MES system item master
- **Admin status:** ✅ EXISTS — `/integration/mes` page
- **CRUD needed:** Existing

#### `mes_item_options` (huni-integration.schema.ts)
- **Purpose:** MES item option values (up to 10 per item)
- **Admin status:** ✅ EXISTS (managed via `/integration/mes-options` page)
- **CRUD needed:** Existing

#### `product_mes_mapping` (huni-integration.schema.ts)
- **Purpose:** Product-to-MES item mapping with cover_type support
- **Admin status:** ✅ EXISTS — `/integration/mes-mapping` page
- **CRUD needed:** Existing

#### `product_editor_mapping` (huni-integration.schema.ts)
- **Purpose:** Product-to-editor (Edicus) 1:1 mapping
- **Admin status:** ✅ EXISTS — `/integration/editors` page
- **CRUD needed:** Existing

#### `option_choice_mes_mapping` (huni-integration.schema.ts)
- **Purpose:** Option choice to MES item mapping with mapping status workflow
- **Admin status:** ✅ EXISTS (managed via integration pages)
- **CRUD needed:** Existing

#### `integration_dead_letters` (huni-integration.schema.ts)
- **Purpose:** Dead letter queue for failed integration events
- **Admin status:** ❌ MISSING — no admin page exists
- **CRUD needed:** Read-only list; retry/replay action; filter by status/adapter
- **Priority:** MEDIUM

### 3.7 Orders

#### `huni_orders` (huni-orders.schema.ts)
- **Purpose:** Huni order master record (distinct from WB orders)
- **Admin status:** ❌ MISSING — no admin page exists
- **CRUD needed:** List/search, read detail, status management
- **Priority:** HIGH

#### `order_status_history` (huni-orders.schema.ts)
- **Purpose:** Audit trail for Huni order status changes
- **Admin status:** ❌ MISSING (would be sub-view within order detail)
- **CRUD needed:** Read-only list within order detail
- **Priority:** HIGH (part of order management)

#### `order_design_files` (huni-orders.schema.ts)
- **Purpose:** Design file records attached to Huni orders
- **Admin status:** ❌ MISSING (would be sub-view within order detail)
- **CRUD needed:** List per order, view file link, manage status
- **Priority:** HIGH (part of order management)

### 3.8 Widgets

#### `widgets` (huni-widgets.schema.ts)
- **Purpose:** Widget configuration for embeddable ordering interface
- **Admin status:** ✅ EXISTS — `/widgets/list` and `/widgets/[id]` pages
- **CRUD needed:** Existing

### 3.9 Import Log

#### `data_import_log` (huni-import-log.schema.ts)
- **Purpose:** Import pipeline execution tracking
- **Admin status:** ❌ MISSING — no admin page exists
- **CRUD needed:** Read-only list; filter by table/status; view error details
- **Priority:** LOW (operations/debugging)

---

## 4. Admin Page Matrix — Widget Builder Tables

| Table | Admin Page | Status | Priority | CRUD Operations Needed |
|-------|-----------|--------|----------|------------------------|
| option_element_types | `/widget-admin/element-types` | ❌ MISSING | HIGH | List, Create, Edit, Soft-delete, Reorder |
| option_element_choices | `/widget-admin/element-choices` | ❌ MISSING | HIGH | List by type, Create, Edit, Soft-delete, Bulk Import |
| product_categories | `/widget-admin/product-categories` | ❌ MISSING | HIGH | List, Create, Edit, Reorder, Soft-delete |
| wb_products | `/widget-admin/products` | ❌ MISSING | HIGH | List/Search/Filter, Create, Edit (edicus immutability), Soft-delete |
| product_recipes | (sub-view of product) | ❌ MISSING | HIGH | List per product, Create, Archive (no hard delete) |
| recipe_option_bindings | (wizard step 2) | ✅ EXISTS | HIGH | Inline CRUD via options page |
| recipe_choice_restrictions | (sub-view of binding) | ✅ EXISTS | MEDIUM | Inline management |
| constraint_templates | `/widget-admin/constraint-templates` | ❌ MISSING | MEDIUM | List, Create custom, Edit, Deactivate; system templates read-only |
| recipe_constraints | (wizard step 3) | ✅ EXISTS | HIGH | Full CRUD via constraints page |
| constraint_nl_history | (sub-view of constraints) | ⚠️ PARTIAL | LOW | Read-only + approve/reject |
| addon_groups | `/widget-admin/addon-groups` | ❌ MISSING | MEDIUM | Full CRUD with member management |
| addon_group_items | (inline in addon_groups) | ❌ MISSING | MEDIUM | Inline CRUD |
| product_price_configs | (wizard step 4) | ✅ EXISTS | HIGH | Create/update via pricing page |
| print_cost_base | (sub-view of pricing) | ✅ EXISTS | HIGH | Spreadsheet editor |
| postprocess_cost | (sub-view of pricing) | ✅ EXISTS | HIGH | List/CRUD with global vs product filter |
| qty_discount | (sub-view of pricing) | ✅ EXISTS | HIGH | Tier CRUD |
| price_nl_history | (audit log) | ⚠️ PARTIAL | LOW | Read-only + approve/reject |
| simulation_runs | (wizard step 5) | ✅ EXISTS | MEDIUM | Trigger + read-only status |
| simulation_cases | (sub-view of simulation) | ✅ EXISTS | MEDIUM | Read-only filtered list |
| publish_history | (sub-view of publish) | ✅ EXISTS | LOW | Read-only list |
| orders (WB) | `/widget-admin/orders` | ❌ MISSING | HIGH | List/Search, Detail, Status update, MES resend |
| quote_logs | (analytics) | ❌ MISSING | LOW | Read-only analytics |

---

## 5. Admin Page Matrix — Huni Shared Tables

| Table | Admin Page | Status | Priority |
|-------|-----------|--------|----------|
| categories | `/products/categories` | ✅ EXISTS | — |
| products | `/products/list`, `/products/[id]` | ✅ EXISTS | — |
| product_sizes | `/products/[id]/sizes` | ✅ EXISTS | — |
| papers | `/materials/papers` | ✅ EXISTS | — |
| materials | `/materials/materials` | ✅ EXISTS | — |
| paper_product_mapping | `/materials/mappings` | ✅ EXISTS | — |
| print_modes | `/processes/print-modes` | ✅ EXISTS | — |
| post_processes | `/processes/post-processes` | ✅ EXISTS | — |
| bindings | `/processes/bindings` | ✅ EXISTS | — |
| imposition_rules | `/processes/imposition` | ✅ EXISTS | — |
| option_definitions | `/options/definitions` | ✅ EXISTS | — |
| option_choices | `/options/choices` | ✅ EXISTS | — |
| product_options | `/products/[id]/options` | ✅ EXISTS | — |
| option_constraints | `/options/constraints` | ✅ EXISTS | — |
| option_dependencies | `/options/dependencies` | ✅ EXISTS | — |
| price_tables | `/pricing/tables` | ✅ EXISTS | — |
| price_tiers | `/pricing/tiers` | ✅ EXISTS | — |
| fixed_prices | `/pricing/fixed` | ✅ EXISTS | — |
| package_prices | `/pricing/packages` | ✅ EXISTS | — |
| foil_prices | `/pricing/foil` | ✅ EXISTS | — |
| loss_quantity_config | `/pricing/loss` | ✅ EXISTS | — |
| mes_items | `/integration/mes` | ✅ EXISTS | — |
| mes_item_options | `/integration/mes-options` | ✅ EXISTS | — |
| product_mes_mapping | `/integration/mes-mapping` | ✅ EXISTS | — |
| product_editor_mapping | `/integration/editors` | ✅ EXISTS | — |
| option_choice_mes_mapping | (integration pages) | ✅ EXISTS | — |
| integration_dead_letters | (none) | ❌ MISSING | MEDIUM |
| huni_orders | (none) | ❌ MISSING | HIGH |
| order_status_history | (none, sub-view) | ❌ MISSING | HIGH |
| order_design_files | (none, sub-view) | ❌ MISSING | HIGH |
| widgets | `/widgets/list`, `/widgets/[id]` | ✅ EXISTS | — |
| data_import_log | (none) | ❌ MISSING | LOW |

---

## 6. Summary: Missing Admin Pages for SPEC-WIDGET-ADMIN-001

### HIGH Priority — Must Build

| Page | Tables Managed | Notes |
|------|---------------|-------|
| `/widget-admin/products` | wb_products | Master list with create/edit; edicus_code immutability |
| `/widget-admin/products/new` | wb_products | Create form |
| `/widget-admin/[productId]` (basic settings) | wb_products, product_recipes | Step 1 of wizard — currently no page exists at [productId] |
| `/widget-admin/element-types` | option_element_types | Foundation vocabulary management |
| `/widget-admin/element-choices` | option_element_choices | Choice library management by type |
| `/widget-admin/product-categories` | product_categories | WB category management |
| `/widget-admin/orders` | orders (WB) | Order list + detail + MES status |
| Huni orders section | huni_orders, order_status_history, order_design_files | Full order management |

### MEDIUM Priority — Should Build

| Page | Tables Managed | Notes |
|------|---------------|-------|
| `/widget-admin/addon-groups` | addon_groups, addon_group_items | Addon group + member management |
| `/widget-admin/constraint-templates` | constraint_templates | System templates read-only; custom templates CRUD |
| `/integration/dead-letters` | integration_dead_letters | Failed event monitoring + retry |

### LOW Priority — Nice to Have

| Page | Tables Managed | Notes |
|------|---------------|-------|
| `/widget-admin/orders/[id]/quotes` | quote_logs | Quote analytics/debugging |
| `/admin/import-log` | data_import_log | Import pipeline monitoring |

---

## 7. Widget Builder Wizard — Current Implementation Status

The 6-step wizard at `/widget-admin/[productId]/` currently has:

| Step | Path | Status | Tables |
|------|------|--------|--------|
| 1. Basic Settings | `/widget-admin/[productId]` | ❌ MISSING (404) | wb_products, product_recipes |
| 2. Options | `/widget-admin/[productId]/options` | ✅ EXISTS | recipe_option_bindings, recipe_choice_restrictions |
| 3. Constraints | `/widget-admin/[productId]/constraints` | ✅ EXISTS | recipe_constraints, constraint_nl_history |
| 4. Pricing | `/widget-admin/[productId]/pricing` | ✅ EXISTS | product_price_configs, print_cost_base, postprocess_cost, qty_discount |
| 5. Simulation | `/widget-admin/[productId]/simulate` | ✅ EXISTS | simulation_runs, simulation_cases |
| 6. Publish | `/widget-admin/[productId]/publish` | ✅ EXISTS | publish_history |

**Critical Gap:** Step 1 basic settings page is missing. Users cannot:
- Create new WB products
- Edit product basic info (name, category, edicus_code, mes_item_cd, file_spec)
- Manage product recipes (create, archive, set default)

---

## 8. Key Constraints for Admin Page Design

1. **edicus_code Immutability:** Once set on wb_products, edicus_code must never change. UI must show it as read-only after first save, with clear warning.

2. **Recipe Versioning:** Modifying a recipe must archive the old version and create a new one (version+1). Cannot hard-delete recipes referenced by orders.

3. **Cascading Relationships:** Deleting option_element_types cascades to option_element_choices. Admin must warn about cascade impact.

4. **Global vs Product-Scoped Pricing:** postprocess_cost and qty_discount support NULL product_id (global). Admin UI must clearly distinguish global vs product-specific entries.

5. **Seeded vs Admin-Managed Data:** option_element_types and constraint_templates are initially seeded. Admin can add custom entries but cannot delete seeded ones (or needs soft-delete with care).

6. **NL History Audit:** constraint_nl_history and price_nl_history are system-generated. Admin can only view and approve/reject — no create/delete.

7. **tRPC Router:** All Widget Builder admin operations route through `widgetAdmin` tRPC router (`apps/admin/src/lib/trpc/routers/widget-admin.ts`). New procedures must be added there.
