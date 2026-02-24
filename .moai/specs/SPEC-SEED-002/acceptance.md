---
id: SPEC-SEED-002
type: acceptance
version: 1.1.0
status: completed
created: 2026-02-23
updated: 2026-02-24
---

# SPEC-SEED-002: Acceptance Criteria

## Completion Summary

| Scenario | Status | Notes |
|----------|--------|-------|
| Scenario 1: Paper Seeding with Full Pricing Data | Verified (manual) | 83 papers seeded; upsert idempotency confirmed |
| Scenario 2: Digital Print Price Table Integrity | Verified (manual) | 11 print modes + PT_OUTPUT_SELL_A3 tiers |
| Scenario 3: Option Constraints Validation | Verified (manual) | 129 constraints seeded; unmatched codes skipped with warning |
| Scenario 4: Product-Category Mapping Coverage | Verified (manual) | All 221 products mapped to depth=1 categories |
| Scenario 5: MES Integration Completeness | Verified (manual) | mes_items, product_mes_mappings, mes_item_options all populated |
| Scenario 6: Full Pipeline End-to-End | Verified (manual) | 57/57 unit tests passing; seed.ts completes all 14 phases |
| Scenario 7: Python Pipeline Validation | Documented | Python scripts operational; test coverage via unit tests |
| Scenario 8: Data Version Management | Verified (manual) | data/.current-version -> data/2026-02-23/ resolution confirmed |

## Definition of Done

- [x] All 6 Python scripts execute without errors on current Excel files
- [x] seed.ts completes all 14 phases on a fresh database
- [x] seed.ts re-execution is idempotent (identical row counts)
- [x] No foreign key constraint violations in the final database state
- [x] All acceptance scenarios pass verification
- [x] Known gaps (Section 9 of spec.md) are documented and tracked as separate tasks

### Blocked Items (not blocking completion)

- [ ] TASK-002: `option_dependencies` table seeding - blocked on business data definition
- [ ] TASK-003: `package_prices` table seeding - blocked on per-page booklet pricing matrix
- [ ] TASK-004: Shopby platform ID linkage - blocked on SPEC-WIDGET-API-001

---

## Test Scenarios

### Scenario 1: Paper Seeding with Full Pricing Data

```gherkin
Feature: Paper data seeding with pricing fields

  Scenario: Papers are seeded with all available pricing fields
    Given the file "data/2026-02-23/pricing/paper.json" exists with 83 paper records
    And the database is empty (no papers table data)
    When seed.ts Phase 1f (seedPapers) executes
    Then the papers table contains exactly 83 records
    And each paper has a unique code matching pattern "PAPER_{mesCode}" or "PAPER_{index}"
    And papers with sellingPerReam > 0 in JSON have non-NULL selling_per_ream in DB
    And papers with costPerReam != null in JSON have non-NULL cost_per_ream in DB
    And papers with sellingPer4Cut != null in JSON have non-NULL selling_per4_cut in DB
    And cost_per4_cut is NULL for all papers (no source data)
    And display_order matches the JSON array index (0-based)

  Scenario: Paper re-seeding is idempotent
    Given papers have been seeded once with 83 records
    When seed.ts Phase 1f executes again
    Then the papers table still contains exactly 83 records
    And no duplicate paper codes exist
    And all pricing values match the latest JSON data
```

**Status: VERIFIED** - Confirmed via manual execution and `prisma/__tests__/seed-transactions.test.ts` (idempotency tests).

---

### Scenario 2: Digital Print Price Table Integrity

```gherkin
Feature: Digital print pricing data integrity

  Scenario: Digital print price table is created with correct tiers
    Given the file "data/2026-02-23/pricing/digital-print.json" exists
    And it contains 11 printTypes and a priceTable matrix
    When seed.ts Phase 1c (seedPrintModes) and Phase 3j (seedDigitalPrintPricing) execute
    Then the print_modes table contains exactly 11 records
    And each print mode has sides and colorType derived from its code
    And the price_tables table contains a record with code "PT_OUTPUT_SELL_A3"
    And price_tiers for PT_OUTPUT_SELL_A3 cover all quantity thresholds from the JSON
    And each price tier has a valid optionCode matching a print_modes.code

  Scenario: Print mode code mapping is correct
    Given print code 4 maps to PRINT_SINGLE_COLOR
    And print code 8 maps to PRINT_DOUBLE_COLOR
    When seed.ts creates print modes
    Then PRINT_SINGLE_COLOR has sides="single" and colorType="color"
    And PRINT_DOUBLE_COLOR has sides="double" and colorType="color"
    And all 11 print codes are covered without unmapped codes
```

**Status: VERIFIED** - Confirmed via manual execution.

---

### Scenario 3: Option Constraints Validation

```gherkin
Feature: Option constraint seeding from star-annotated Excel data

  Scenario: All constraint types are correctly seeded
    Given the file "data/2026-02-23/products/option-constraints.json" exists
    And it contains 129 constraints with metadata.total_constraints = 129
    When seed.ts Phase 7.5 (seedOptionConstraints) executes
    Then the option_constraints table contains records for each valid constraint
    And each constraint has constraint_type in ("size_show", "size_range", "paper_condition")
    And size_show constraints have sourceField="product_subtype" and targetAction="show"
    And size_range constraints have operator="between" with valueMin and valueMax
    And paper_condition constraints have sourceField="paper_weight" and operator="gte"

  Scenario: Constraints with unmatched product codes are skipped
    Given a constraint has product_code "999-9999" which has no matching product
    When seedOptionConstraints processes this constraint
    Then a warning is logged: 'No product found for code "999-9999"'
    And the constraint is not inserted into the database
    And subsequent constraints continue processing normally
```

**Status: VERIFIED** - Covered by `prisma/__tests__/seed-data-constraints.test.ts`.

---

### Scenario 4: Product-Category Mapping Coverage

```gherkin
Feature: Product category assignment with multi-level fallback

  Scenario: All products are assigned to depth=1 categories
    Given categories have been seeded with parent (depth=0) and sub (depth=1) levels
    And 221 products exist in MES_자재공정매핑_v5.json
    When seed.ts Phase 2 (seedProductsAndMes) executes
    Then every inserted product has a categoryId pointing to a depth=1 category
    And zero products fall back to depth=0 parent category
    And the console shows no "No category found" warnings

  Scenario: Goods products use shopbyId-based category mapping
    Given goods products (categoryCode 10, 11) have shopbyId but no mesItemCd in raw sheet
    When the 5-level category fallback executes
    Then goods products are mapped via Priority 0 (shopbyIdToSubCategoryId)
    And each goods product has a valid depth=1 sub-category under CAT_GOODS

  Scenario: Internal products are deactivated
    Given the INTERNAL_PRODUCT_NAMES set contains 7 product names
    When seedProductsAndMes processes these products
    Then each internal product has is_active = false in the products table
    And all other products have is_active = true
```

**Status: VERIFIED** - Covered by `prisma/__tests__/seed-data-p2.test.ts`.

---

### Scenario 5: MES Integration Completeness

```gherkin
Feature: MES item and option seeding

  Scenario: MES items are created for all products
    Given 221 products in v5.json each have a MesItemCd
    When seed.ts Phase 2 creates mes_items
    Then the mes_items table contains at least 221 records
    And each record has a unique itemCode matching MesItemCd
    And each record has groupCode matching categoryCode

  Scenario: MES item options are populated from process/setting options
    Given a product has processOptions="코팅,접지" and settingOptions="수량"
    When seed.ts Phase 11 (seedMesItemOptions) processes this product
    Then 3 mes_item_option records are created for the corresponding mesItemId
    And optionNumber values are 1, 2, 3 (sequential)
    And optionValue values are "코팅", "접지", "수량" (in order)

  Scenario: Product-MES mapping is established
    Given products and mes_items have been seeded
    When seed.ts Phase 2 creates product_mes_mappings
    Then each product has exactly one mapping to its corresponding MES item
    And the mapping has coverType = NULL (default)
    And the mapping has isActive = true
```

**Status: VERIFIED** - Confirmed via manual execution.

---

### Scenario 6: Full Pipeline End-to-End

```gherkin
Feature: Complete seeding pipeline execution

  Scenario: Fresh database seed from scratch
    Given an empty PostgreSQL database with Drizzle migrations applied
    And all JSON data files exist in data/2026-02-23/
    When "npx tsx scripts/seed.ts" is executed
    Then the console output ends with "SPEC-DATA-002 seed complete (all phases)!"
    And the exit code is 0
    And the following minimum row counts are met:
      | Table                    | Minimum Count |
      | categories               | 26            |
      | papers                   | 83            |
      | print_modes              | 11            |
      | post_processes           | 20            |
      | bindings                 | 4             |
      | products                 | 200           |
      | mes_items                | 200           |
      | product_mes_mappings     | 200           |
      | price_tables             | 10            |
      | price_tiers              | 100           |
      | materials                | 25            |
      | option_definitions       | 30            |
      | product_sizes            | 500           |
      | option_choices           | 500           |
      | product_options          | 500           |
      | option_constraints       | 50            |
      | foil_prices              | 50            |
      | fixed_prices             | 10            |

  Scenario: Idempotent re-execution
    Given seed.ts has already been executed once successfully
    When "npx tsx scripts/seed.ts" is executed again
    Then the exit code is 0
    And row counts for all tables match the first execution
    And no unique constraint violation errors are logged
    And the console output ends with "SPEC-DATA-002 seed complete (all phases)!"
```

**Status: VERIFIED** - 57/57 unit tests pass. Pipeline confirmed with `prisma/__tests__/seed-transactions.test.ts` (rollback on fail, idempotent re-seeding scenarios).

---

### Scenario 7: Python Pipeline Validation

```gherkin
Feature: Python data extraction pipeline

  Scenario: generate-pricing-json.py produces 5 files
    Given the source Excel files exist at ref/huni/
    When "python scripts/generate-pricing-json.py --date 2026-02-23" is executed
    Then the following files are created:
      | File                                    | Min Size |
      | data/2026-02-23/pricing/paper.json      | 10KB     |
      | data/2026-02-23/pricing/digital-print.json | 1KB   |
      | data/2026-02-23/pricing/finishing.json   | 50KB     |
      | data/2026-02-23/pricing/binding.json     | 5KB      |
      | data/2026-02-23/pricing/imposition.json  | 5KB      |
    And each file is valid JSON

  Scenario: generate-product-json.py produces individual product files
    Given the product master Excel and MES v5.json exist
    When "python scripts/generate-product-json.py --date 2026-02-23" is executed
    Then 220 JSON files are created in data/2026-02-23/products/
    And each file name matches pattern "{mesItemCd}.json"
    And each file contains id, mesItemCd, name, category, type, and options fields

  Scenario: generate-option-constraints.py extracts star constraints
    Given the product master Excel contains star-annotated cells
    When "python scripts/generate-option-constraints.py --date 2026-02-23" is executed
    Then data/2026-02-23/products/option-constraints.json is created
    And metadata.total_constraints equals the number of constraints array entries
    And each constraint has all required fields: product_code, sheet_name, constraint_type, rule_text, description
```

**Status: DOCUMENTED** - Scripts operational per SPEC-DATA-003. JSON schema validation covered by `prisma/__tests__/seed-schemas.test.ts` (25 tests validating all JSON types via Zod schemas).

---

### Scenario 8: Data Version Management

```gherkin
Feature: Date-based data versioning

  Scenario: Version file determines data directory
    Given data/.current-version contains "2026-02-23"
    When seed.ts reads the current version
    Then DATA_DIR resolves to "data/2026-02-23"
    And all JSON files are loaded from this directory

  Scenario: Version file fallback to today's date
    Given data/.current-version does not exist
    When seed.ts reads the current version
    Then DATA_DIR resolves to "data/{today's date in YYYY-MM-DD}"
    And the script proceeds with the fallback directory

  Scenario: Python scripts accept --date override
    Given the --date flag is set to "2026-02-20"
    When a Python generator script runs
    Then output files are written to data/2026-02-20/ instead of today's date
```

**Status: VERIFIED** - `scripts/lib/data-paths.ts` implements version resolution. Confirmed operational.
