# SPEC-DB-005: HuniPrinting Excel Import Design - Color Semantic Mapping & Product-Option Pipeline

**SPEC ID**: SPEC-DB-005
**Title**: HuniPrinting Excel Import Design - Color Semantic Mapping & Product-Option Pipeline
**Created**: 2026-02-27
**Status**: Planned
**Priority**: High
**Dependencies**: SPEC-DB-001 (Product domain core), SPEC-DB-002 (Recipe & constraints), SPEC-DB-003 (Pricing), SPEC-DB-004 (Operations & orders), SPEC-WB-002 (Product Category & Recipe System)

---

## 1. Problem Statement

### Domain Context

HuniPrinting manages its product catalog through a single Excel file called "Product Master" (sangpummaseuteo). This Excel was originally designed for Excel-based order intake (no website), so it mixes heterogeneous data domains into a single workbook:

- Basic catalog data (product names, IDs, MES codes)
- Customer-facing options (size, paper, finishing, printing)
- Internal metadata (folder paths, file specs)
- Price rule references
- Print constraint references

The Excel has been converted to TOON format (pipe-delimited with `_clr` suffix columns for cell background hex colors) and is available at `ref/huni/toon/product-master.toon`.

### Critical Business Rule: Column Color = Visibility

The Excel uses **background cell colors** to categorize columns into visibility tiers. This is the authoritative source for determining which options are shown to customers vs. used internally:

| Color | Hex Code | Semantic Meaning | Customer Visible | Required | Internal Use |
|-------|----------|------------------|------------------|----------|--------------|
| Red | E06666 | Required customer option | YES | YES | NO |
| Orange | F6B26B | Optional customer option | YES | NO | NO |
| Yellow | FFFF00 | Conditional/special option | YES | NO | Depends |
| Brown | C4BD97 | Internal IDs/metadata | NO | N/A | YES |
| Gray | D9D9D9 | Internal file specs | NO | N/A | YES |
| Empty/Black | (empty) | System internal column | NO | N/A | YES |

**Key business insight from stakeholder**:
- Black/empty-color columns are used internally in price rules, price calculation formulas, and print constraints -- but are NOT shown to customers.
- All colored columns (red, orange, yellow) must be shown in the customer ordering UI.

### Current Gap

1. **No import pipeline exists** for product-master.toon. Current import scripts (`scripts/import/`) only handle `item-management.toon` (MES items) and `import-papers.ts` (paper data). No script reads product-master.toon to populate product/option tables.
2. **No color traceability**: The existing DB schema (`packages/shared/src/db/schema/huni-options.schema.ts`) has `is_visible`, `is_internal`, and `is_required` boolean fields on `product_options`, but there is no mechanism to populate them from Excel color data, and no `source_color` field to trace the origin.
3. **Yellow (FFFF00) undefined**: Yellow-colored columns need a clear semantic policy since they represent conditional/special options.
4. **Dual schema layer**: The project has two schema layers -- `packages/shared/src/db/schema/huni-*.schema.ts` (legacy Huni domain) and `packages/db/src/schema/widget/*.ts` (Widget Builder domain). The import must correctly target the appropriate tables.

---

## 2. Environment

### Existing Infrastructure

- **TOON files**: `ref/huni/toon/product-master.toon`, `ref/huni/toon/price-table.toon`, `ref/huni/toon/item-management.toon`
- **TOON parser**: `scripts/import/import-mes-items.ts` contains a working `parseToon()` function that reads TOON format
- **TOON converter**: `scripts/excel-to-toon.ts` generates `_clr` suffix columns containing background color hex codes
- **DB**: PostgreSQL 16 with Drizzle ORM (`drizzle-orm ^0.45.1`)
- **Target tables (Huni legacy)**: `option_definitions`, `option_choices`, `product_options` in `packages/shared/src/db/schema/huni-options.schema.ts`
- **Target tables (Widget Builder)**: `option_element_types`, `option_element_choices`, `wb_products`, `product_categories` in `packages/db/src/schema/widget/`
- **Import orchestrator**: `scripts/import/index.ts` runs import steps sequentially via `tsx`

### Product Master TOON Structure

Each sheet in product-master.toon represents a product category (e.g., Digital Printing, Sticker, Booklet):

- **Row 1** (in TOON): Column headers with `_clr` suffix columns containing background color hex codes
- **Subsequent rows**: Product data rows
- **MAP sheet**: Category hierarchy definition

Column examples from the Digital Printing sheet:
- `gubun` (C4BD97 - brown, internal)
- `size(pilsu)` (E06666 - red, required customer option)
- `jumunbangbeob(pilsu)` (E06666 - red, required customer option)
- `jongi(pilsu)` (E06666 - red, required customer option)
- `hugagong(option)` (F6B26B - orange, optional customer option)
- `inswe(option)` (F6B26B - orange, optional customer option)
- `ID` (C4BD97 - brown, internal)
- `MES ITEM_CD` (C4BD97 - brown, internal)
- `filespec` (D9D9D9 - gray, internal)
- `folder` (D9D9D9 - gray, internal)

---

## 3. Assumptions

- **A1**: The TOON `_clr` suffix columns reliably represent the original Excel cell background colors. The conversion was performed by `scripts/excel-to-toon.ts` which extracts `bgColor` from the JSON extraction.
- **A2**: Color semantics are consistent across all sheets in product-master.toon (i.e., E06666 always means "required customer option" regardless of sheet).
- **A3**: The import pipeline is idempotent -- running it multiple times produces the same result (upsert semantics).
- **A4**: The Widget Builder schema (`packages/db/src/schema/widget/`) is the primary target for new product/option data. The legacy Huni schema (`packages/shared/src/db/schema/huni-*.schema.ts`) serves as a reference but may receive parallel writes for backward compatibility.
- **A5**: Yellow (FFFF00) columns default to customer-visible + optional behavior, but this policy should be configurable.
- **A6**: The product-master.toon structure is stable -- future Excel updates will follow the same color convention.

---

## 4. Requirements (EARS Format)

### REQ-1: Color Semantic Mapping

**When** importing data from TOON format, **the system shall** map `_clr` column values to database visibility flags using the following color semantic table:

| Color Hex | is_visible | is_required | is_internal |
|-----------|------------|-------------|-------------|
| E06666 (Red) | true | true | false |
| F6B26B (Orange) | true | false | false |
| FFFF00 (Yellow) | true | false | false |
| C4BD97 (Brown) | false | false | true |
| D9D9D9 (Gray) | false | false | true |
| (empty/null) | false | false | true |

**Acceptance Criteria**:
- AC-1.1: Given a TOON column with `_clr` value `E06666`, when the import pipeline processes this column, then the resulting `product_options` record has `is_visible=true`, `is_required=true`, `is_internal=false`.
- AC-1.2: Given a TOON column with `_clr` value `F6B26B`, when the import pipeline processes this column, then the resulting `product_options` record has `is_visible=true`, `is_required=false`, `is_internal=false`.
- AC-1.3: Given a TOON column with empty/null `_clr` value, when the import pipeline processes this column, then the resulting `product_options` record has `is_visible=false`, `is_internal=true`.
- AC-1.4: Given a TOON column with an unknown color hex not in the mapping table, when the import pipeline processes this column, then the system shall log a warning and apply the default mapping (`is_visible=false`, `is_internal=true`).

### REQ-2: Option Visibility Flag Population

**When** creating or updating `option_definitions` and `product_options` records from the product-master.toon Excel source, **the system shall** set the `is_visible`, `is_required`, and `is_internal` flags based on the color semantic mapping (REQ-1).

**Acceptance Criteria**:
- AC-2.1: Given a product sheet with 5 red columns, 3 orange columns, and 4 brown columns, when the import completes, then exactly 5 `product_options` records have `is_required=true` and 8 total records have `is_visible=true`.
- AC-2.2: Given an existing `product_options` record, when a re-import is executed with changed color values, then the visibility flags are updated to match the new color mapping.

### REQ-3: Color Traceability

**When** storing option definitions imported from the Excel source, **the system shall** preserve the source color code for audit and traceability purposes.

**Acceptance Criteria**:
- AC-3.1: Given an imported option, the `source_color` field (or equivalent metadata) stores the original hex color code (e.g., `E06666`).
- AC-3.2: Given a query for all options with source color `E06666`, the system returns all red-coded (required customer) options.
- AC-3.3: The `source_color` field is indexed for efficient querying.

### REQ-4: Product-Option Import Pipeline

**The system shall** provide an import script that reads `product-master.toon` and creates:

- Products in the `wb_products` table with category hierarchy derived from the MAP sheet
- `option_element_types` records for each unique option type found across all sheets
- `option_element_choices` records for distinct option values within each type
- `recipe_option_bindings` (or equivalent) linking products to their applicable options with visibility flags derived from color codes

**Acceptance Criteria**:
- AC-4.1: Given the product-master.toon with 12 sheets, when the import completes, then at least one product record exists for each non-MAP sheet.
- AC-4.2: Given the Digital Printing sheet with columns `size(pilsu)`, `paper(pilsu)`, `finishing(option)`, when the import completes, then `option_element_types` contains entries for `size`, `paper`, and `finishing`.
- AC-4.3: Given duplicate option type names across sheets (e.g., `size` in both Digital Printing and Sticker), the system creates a single `option_element_types` record and links it to both products via `recipe_option_bindings`.
- AC-4.4: The import script follows the existing pattern from `scripts/import/import-mes-items.ts` (idempotent upsert, TOON parser reuse, error logging).
- AC-4.5: The import script is registered in `scripts/import/index.ts` as a new step in the import pipeline.

### REQ-5: Domain Data Separation

**The import pipeline shall** separate the mixed Excel data into proper domain tables:

| Excel Domain | Target Table(s) | Source Columns |
|-------------|-----------------|----------------|
| Basic catalog | `wb_products`, `product_categories` | gubun, product name, MES ITEM_CD, ID |
| Customer options | `option_element_types`, `option_element_choices`, `recipe_option_bindings` | Red/Orange/Yellow colored columns |
| Internal metadata | `wb_products.file_spec` (JSONB) | file spec, folder (Gray columns) |
| Internal IDs | `wb_products.mes_item_cd`, etc. | ID, MES ITEM_CD (Brown columns) |
| Pricing data | Existing pricing tables (SPEC-DB-003) | Handled by separate price-table.toon import |

**Acceptance Criteria**:
- AC-5.1: Given a row with mixed column colors, when imported, then catalog data goes to `wb_products`, customer options go to `option_element_types`/`option_element_choices`, and internal metadata goes to `wb_products.file_spec` JSONB field.
- AC-5.2: Given gray-colored columns (`file_spec`, `folder`), the values are stored in the `wb_products.file_spec` JSONB column -- not in customer-visible option tables.
- AC-5.3: Given brown-colored ID columns, the values are stored in the appropriate reference fields (`wb_products.mes_item_cd`, etc.).

### REQ-6: Yellow Column Policy

**Where** the FFFF00 (yellow) color code is encountered, **the system shall** apply a configurable policy that defaults to customer-visible and optional.

**Acceptance Criteria**:
- AC-6.1: Given a yellow-colored column, the default behavior is `is_visible=true`, `is_required=false`, `is_internal=false`.
- AC-6.2: Given a configuration override setting yellow to `is_visible=false`, when the import runs, then yellow columns are treated as internal.
- AC-6.3: The yellow policy configuration is stored in a well-known location (e.g., import config file or environment variable).

---

## 5. Specifications

### 5.1 Schema Additions

#### 5.1.1 Add `source_color` to `option_element_types`

Add a `source_color` column to `option_element_types` in `packages/db/src/schema/widget/01-element-types.ts`:

```
source_color: varchar('source_color', { length: 10 })
```

Purpose: Stores the original Excel background color hex code (e.g., `E06666`) for traceability.

#### 5.1.2 Add `source_color` to `recipe_option_bindings`

Add a `source_color` column to `recipe_option_bindings` in `packages/db/src/schema/widget/02-recipe-option-bindings.ts`:

```
source_color: varchar('source_color', { length: 10 })
```

Purpose: Since the same option type (e.g., `size`) may be required in one product but optional in another, the color must be tracked at the product-option binding level.

#### 5.1.3 Color Semantic Mapping Configuration

Create a `COLOR_SEMANTIC_MAP` constant in the import module:

```typescript
const COLOR_SEMANTIC_MAP: Record<string, { isVisible: boolean; isRequired: boolean; isInternal: boolean }> = {
  'E06666': { isVisible: true,  isRequired: true,  isInternal: false },  // Red - required customer
  'F6B26B': { isVisible: true,  isRequired: false, isInternal: false },  // Orange - optional customer
  'FFFF00': { isVisible: true,  isRequired: false, isInternal: false },  // Yellow - conditional (configurable)
  'C4BD97': { isVisible: false, isRequired: false, isInternal: true  },  // Brown - internal IDs
  'D9D9D9': { isVisible: false, isRequired: false, isInternal: true  },  // Gray - internal file specs
};
// Default for empty/unknown: { isVisible: false, isRequired: false, isInternal: true }
```

### 5.2 Import Pipeline Architecture

#### 5.2.1 New Script: `scripts/import/import-product-options.ts`

Responsibilities:
1. Read `ref/huni/toon/product-master.toon`
2. Parse MAP sheet for category hierarchy
3. For each product sheet (non-MAP):
   a. Extract column headers and their `_clr` values
   b. Classify columns using `COLOR_SEMANTIC_MAP`
   c. Create/upsert `option_element_types` for each customer-visible column
   d. Create/upsert `option_element_choices` for distinct values in each option column
   e. Create/upsert `wb_products` for each unique product row (identified by `ID` or `MES ITEM_CD`)
   f. Create/upsert `recipe_option_bindings` linking products to option types with visibility flags
4. Store internal metadata in `wb_products.file_spec` JSONB field

#### 5.2.2 TOON Parser Reuse

Extract the existing `parseToon()` function from `scripts/import/import-mes-items.ts` into a shared utility at `scripts/import/lib/toon-parser.ts` for reuse across import scripts.

#### 5.2.3 Import Orchestrator Update

Add the new import step to `scripts/import/index.ts`:

```typescript
const STEPS: ImportStep[] = [
  { name: "MES Items (item-management.toon)", script: "import-mes-items.ts" },
  { name: "Papers (product-master.toon)", script: "import-papers.ts" },
  { name: "Product Options (product-master.toon)", script: "import-product-options.ts" },  // NEW
];
```

### 5.3 Data Flow

```
product-master.toon
    |
    +--[MAP sheet]---> product_categories (category hierarchy)
    |
    +--[Each product sheet]
        |
        +--[Header row + _clr columns]
        |   |
        |   +--[Red/Orange/Yellow _clr]---> option_element_types (typeKey, source_color)
        |   |                                  |
        |   |                                  +---> option_element_choices (distinct values)
        |   |
        |   +--[Brown _clr]---> wb_products (mes_item_cd, product_key, etc.)
        |   |
        |   +--[Gray _clr]---> wb_products.file_spec (JSONB)
        |
        +--[Data rows]
            |
            +---> wb_products (one per unique product)
            +---> recipe_option_bindings (product <-> option type, with color-derived flags)
```

---

## 6. Out of Scope

- **Price data import**: Price-table.toon import is handled separately (existing pricing tables per SPEC-DB-003).
- **Constraint import**: Print constraint rules derived from Excel are a separate concern (SPEC-WB-003 ECA pattern).
- **Legacy schema writes**: This SPEC targets the Widget Builder schema (`packages/db/src/schema/widget/`). Populating the legacy Huni schema (`packages/shared/src/db/schema/huni-*.schema.ts`) is a potential follow-up.
- **UI for color mapping management**: Admin UI to modify the color semantic mapping is out of scope.
- **Real-time Excel sync**: This is a one-time import pipeline, not a continuous sync.
- **TOON format changes**: The TOON converter (`scripts/excel-to-toon.ts`) is already implemented and is not modified by this SPEC.

---

## 7. Technical Design Notes

### 7.1 Dual Schema Consideration

The project has two schema layers:
- **Widget Builder** (`packages/db/src/schema/widget/`): `option_element_types`, `option_element_choices`, `wb_products`, `recipe_option_bindings` -- this is the primary target
- **Legacy Huni** (`packages/shared/src/db/schema/huni-options.schema.ts`): `option_definitions`, `option_choices`, `product_options` -- has existing `is_visible`, `is_required`, `is_internal` fields

The import pipeline targets the Widget Builder schema. A future migration task may bridge data to the legacy schema if backward compatibility is needed.

### 7.2 Idempotency Pattern

Following the established pattern from `import-mes-items.ts`:
- Use Drizzle ORM `onConflictDoUpdate` for upsert semantics
- Unique constraints on `type_key` (option_element_types), `uq_oec_type_choice` (option_element_choices), and product identifiers
- Re-running the import updates existing records rather than creating duplicates

### 7.3 Column Name Normalization

TOON header names may contain Korean text, parentheses, and special characters (e.g., `size(pilsu)`, `hugagong(option)`). The import pipeline must:
- Normalize column names to produce stable `type_key` values (e.g., `size`, `paper`, `finishing`)
- Map Korean column headers to English `type_key` identifiers
- Handle column name variations across sheets

### 7.4 Drizzle Migration

Adding `source_color` columns requires a new Drizzle migration:
- `drizzle-kit generate` to create the migration SQL
- Migration file added to `drizzle/` directory
- Backward compatible (nullable column addition)

---

## 8. Traceability

| Requirement | Target Tables | Test Coverage |
|-------------|---------------|---------------|
| REQ-1 | recipe_option_bindings, option_element_types | Unit: color mapping function |
| REQ-2 | product_options / recipe_option_bindings | Integration: import + query visibility |
| REQ-3 | option_element_types.source_color, recipe_option_bindings.source_color | Unit: field population, query |
| REQ-4 | wb_products, option_element_types, option_element_choices, recipe_option_bindings | Integration: full import pipeline |
| REQ-5 | wb_products, option_element_types, wb_products.file_spec | Integration: domain separation |
| REQ-6 | COLOR_SEMANTIC_MAP configuration | Unit: configurable policy |

---

## 9. Expert Consultation Recommendations

### Backend Expert (expert-backend)
This SPEC involves database schema changes, import pipeline architecture, and Drizzle ORM migration. Backend expert consultation is recommended for:
- Schema migration strategy (adding `source_color` columns)
- Upsert performance optimization for bulk imports
- TOON parser refactoring into shared utility

### Testing Expert (expert-testing)
Comprehensive test coverage is needed for:
- Color semantic mapping unit tests
- Import pipeline integration tests with test TOON fixtures
- Idempotency verification tests

---

**Document Version**: 1.0.0
**Created**: 2026-02-27
**Author**: manager-spec (MoAI-ADK)
