# SPEC-DB-005: Implementation Plan

**SPEC ID**: SPEC-DB-005
**Title**: HuniPrinting Excel Import Design - Color Semantic Mapping & Product-Option Pipeline
**Status**: Planned

---

## Milestones

### Primary Goal: Schema Extension & Core Mapping Logic

**Scope**: Add `source_color` columns and implement the color semantic mapping function.

**Tasks**:
1. Add `source_color` varchar(10) nullable column to `option_element_types` table
2. Add `source_color` varchar(10) nullable column to `recipe_option_bindings` table
3. Generate Drizzle migration via `drizzle-kit generate`
4. Implement `COLOR_SEMANTIC_MAP` constant with the 6-color mapping
5. Implement `resolveColorSemantics(hexColor: string)` utility function
6. Create `scripts/import/lib/toon-parser.ts` by extracting shared parser logic from `import-mes-items.ts`
7. Write unit tests for color semantic mapping (all 6 colors + unknown + null)
8. Write unit tests for TOON parser extraction

**Files Modified**:
- `packages/db/src/schema/widget/01-element-types.ts` (add source_color)
- `packages/db/src/schema/widget/02-recipe-option-bindings.ts` (add source_color)
- `drizzle/` (new migration file)
- `scripts/import/lib/toon-parser.ts` (NEW)
- `scripts/import/lib/color-semantics.ts` (NEW)
- `scripts/import/import-mes-items.ts` (refactor to use shared parser)

**Risks**:
- Migration may require coordination if other SPECs are modifying the same tables concurrently
- Extracting the TOON parser must not break existing `import-mes-items.ts` functionality

**Mitigation**:
- Run existing import tests after parser extraction to verify no regression
- Use nullable column additions to ensure backward compatibility

---

### Secondary Goal: Product-Option Import Script

**Scope**: Build the core import pipeline that reads product-master.toon and populates Widget Builder tables.

**Tasks**:
1. Create `scripts/import/import-product-options.ts`
2. Implement MAP sheet parsing for category hierarchy
3. Implement column header analysis (extract `_clr` values, classify by color)
4. Implement column name normalization (Korean headers to English type_keys)
5. Implement `option_element_types` upsert logic with source_color
6. Implement `option_element_choices` upsert logic for distinct option values
7. Implement `wb_products` upsert logic for product rows
8. Implement `recipe_option_bindings` creation with color-derived visibility flags
9. Store gray-column data in `wb_products.file_spec` JSONB
10. Register new step in `scripts/import/index.ts`
11. Write integration tests with test TOON fixtures

**Files Modified**:
- `scripts/import/import-product-options.ts` (NEW - main script)
- `scripts/import/index.ts` (add new step)
- `scripts/import/__tests__/import-product-options.test.ts` (NEW)

**Risks**:
- Column name variations across sheets may cause missed option types
- Product identification (which columns uniquely identify a product) may be ambiguous

**Mitigation**:
- Build a column name normalization map covering all known sheets
- Use `MES ITEM_CD` as primary product identifier with `ID` as fallback

---

### Final Goal: Yellow Policy Configuration & Validation

**Scope**: Implement configurable yellow column policy and end-to-end validation.

**Tasks**:
1. Implement yellow policy configuration (environment variable or config file)
2. Add import summary report (counts by color, products created, options mapped)
3. Add `--dry-run` support (consistent with existing import scripts)
4. Add `--validate-only` support (parse and classify without DB writes)
5. End-to-end integration test with actual product-master.toon
6. Document the import pipeline in project documentation

**Files Modified**:
- `scripts/import/lib/color-semantics.ts` (add yellow policy config)
- `scripts/import/import-product-options.ts` (add dry-run, validate-only, summary)
- `scripts/import/__tests__/color-semantics.test.ts` (NEW)

**Risks**:
- Yellow policy may need revision after stakeholder review
- Large TOON files may have import performance issues

**Mitigation**:
- Default yellow to visible+optional (safest default)
- Use batch upserts (Drizzle `insert().values([...]).onConflictDoUpdate()`) for performance

---

## Technical Approach

### Architecture

```
scripts/import/
  lib/
    toon-parser.ts          # Shared TOON file parser (extracted from import-mes-items.ts)
    color-semantics.ts      # COLOR_SEMANTIC_MAP + resolveColorSemantics()
  import-mes-items.ts       # Existing (refactored to use lib/toon-parser)
  import-papers.ts          # Existing (unchanged)
  import-product-options.ts # NEW - main import script for product-master.toon
  index.ts                  # Updated with new step
  __tests__/
    color-semantics.test.ts # NEW
    import-product-options.test.ts # NEW
```

### Key Design Decisions

1. **Widget Builder schema as primary target**: The import writes to `packages/db/src/schema/widget/` tables (`option_element_types`, `option_element_choices`, `wb_products`, `recipe_option_bindings`), not the legacy `huni-options.schema.ts` tables.

2. **TOON parser extraction**: The `parseToon()` function is shared infrastructure. Extracting it to `lib/toon-parser.ts` reduces duplication and enables consistent parsing across all import scripts.

3. **Color stored at binding level**: Since the same option type (e.g., "size") may be red (required) in one product category but orange (optional) in another, the `source_color` is tracked on `recipe_option_bindings` as well as `option_element_types`.

4. **Batch upserts**: For performance with potentially hundreds of product rows across 12 sheets, the import uses Drizzle batch upsert patterns.

5. **Column name normalization**: A mapping table converts Korean column headers to stable English `type_key` values, enabling cross-sheet deduplication of option types.

### Technology Stack

- **Runtime**: Node.js 22.x + tsx
- **ORM**: Drizzle ORM ^0.45.1 with postgres.js driver
- **Migration**: drizzle-kit
- **Testing**: Vitest 3.x
- **TOON parser**: Shared library (extracted from existing code)

---

## Dependencies

| Dependency | Status | Impact |
|-----------|--------|--------|
| SPEC-DB-001 (Product domain core) | Implemented | Provides `option_element_types`, `option_element_choices` schema |
| SPEC-DB-002 (Recipe & constraints) | Implemented | Provides `recipe_option_bindings`, `product_recipes` schema |
| SPEC-WB-002 (Product Category & Recipe System) | Implemented | Provides `wb_products`, `product_categories` schema |
| product-master.toon | Available | Source data file at `ref/huni/toon/` |
| scripts/import/import-mes-items.ts | Available | Reference implementation for TOON parser pattern |

---

**Document Version**: 1.0.0
**Created**: 2026-02-27
