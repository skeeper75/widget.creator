# SPEC-IM-002: Acceptance Criteria

## SPEC Reference

- **SPEC ID**: SPEC-IM-002
- **Title**: HuniPrinting Product Option Data Import Specification
- **Related**: SPEC-IM-001, SPEC-DB-005, SPEC-INFRA-001

---

## Test Scenarios

### Scenario 1: Phase 1 Master Lookup Import

**Given** the Excel master file and MES JSON export are available
**When** Phase 1 import runs
**Then**:
- 38 category records are inserted with valid parent_id hierarchy
- 55 paper records are inserted with unique codes
- ~20 material records are inserted
- 256 MES items are inserted from JSON
- ~50 option_definitions are inserted with unique keys
- ~1198 option_choices are inserted with valid option_definition_id references
- No orphan categories exist (parent_id references are valid)
- All option_choices have unique (option_definition_id, code) combinations
- data_import_log records Phase 1 completion

### Scenario 2: Phase 2 Core Product Import

**Given** Phase 1 has completed successfully
**When** Phase 2 import runs
**Then**:
- 221 product records are inserted with valid category_id references
- ~1200 product_sizes are inserted with valid product_id references
- ~2500 paper_product_mapping records are inserted
- All products have a valid product_type value
- All products have a valid pricing_model value (LOOKUP/AREA/PAGE/COMPOSITE)
- data_import_log records Phase 2 completion

### Scenario 3: Phase 3 Process Definition Import

**Given** Phase 2 has completed successfully
**When** Phase 3 import runs
**Then**:
- 12 print_modes are inserted with unique codes
- ~40 post_processes are inserted with unique codes
- 4 bindings are inserted
- ~30 imposition_rules are inserted
- Back-fill updates option_choices.ref_print_mode_id for print_mode choices
- Back-fill updates option_choices.ref_post_process_id for post-process choices
- Back-fill updates option_choices.ref_binding_id for binding choices
- data_import_log records Phase 3 completion

### Scenario 4: Phase 4 Structural Relationships Import

**Given** Phases 1-3 have completed successfully
**When** Phase 4 import runs
**Then**:
- 15-20 price_tables are inserted
- ~10K price_tiers are inserted with valid price_table_id references
- ~500 fixed_prices are inserted with valid FK references
- ~200 package_prices are inserted with valid FK references
- ~2000 product_options are inserted with unique (product_id, option_definition_id) pairs
- price_key consistency check reports any mismatches
- data_import_log records Phase 4 completion

### Scenario 5: Phase 5 Tacit Knowledge Import

**Given** Phases 1-4 have completed successfully
**When** Phase 5 import runs
**Then**:
- 129 option_constraints are inserted with valid FK references
- ~300 option_dependencies are inserted with valid FK references
- ~250 product_mes_mapping records are inserted
- option_choice_mes_mapping records are inserted with mapping_status = 'pending'
- 111 product_editor_mapping records are inserted for editor-enabled products
- All MES-registered products have at least one MES mapping
- All editor-enabled products have an editor mapping
- Tacit knowledge verification report is generated
- data_import_log records Phase 5 completion

### Scenario 6: Transaction Rollback on Error

**Given** any phase is in progress
**When** a critical error occurs (e.g., FK violation)
**Then**:
- The entire phase transaction is rolled back
- No partial data is committed
- Error is logged to data_import_log with error details
- Import does not proceed to next phase

### Scenario 7: Duplicate Prevention (Idempotent Import)

**Given** Phase N has already been imported successfully
**When** Phase N import is run again
**Then**:
- Existing records are updated (UPSERT pattern)
- No duplicate records are created
- Unique constraints are maintained
- Record counts remain consistent

### Scenario 8: Validation SQL Queries Pass

**Given** all 5 phases have completed
**When** the full validation suite runs
**Then**:
- 0 orphan categories (parent_id references valid)
- 0 orphan option_choices (option_definition_id valid)
- 0 orphan products (category_id valid)
- 0 orphan product_sizes (product_id valid)
- 0 orphan fixed_prices (product_id, size_id, paper_id, print_mode_id valid)
- 0 duplicate product_options per (product_id, option_definition_id)
- All MES-registered products have MES mappings
- All editor-enabled products have editor mappings

---

## Quality Gate Criteria

| Gate                              | Target                                                     |
|-----------------------------------|------------------------------------------------------------|
| FK Reference Integrity            | 0 orphan records across all 26 tables                      |
| Unique Constraint Compliance      | 0 duplicate violations                                     |
| price_key Consistency             | 100% of non-null price_keys resolve to valid price records |
| MES Mapping Coverage              | 100% of MES-registered products have mappings              |
| Editor Mapping Coverage           | 100% of editor-enabled products have mappings              |
| Import Idempotency                | Re-run produces identical record counts                    |
| Phase Transaction Isolation       | Failed phase = 0 committed records for that phase          |
| Import Log Completeness           | All phases logged to data_import_log                       |

---

## Definition of Done

- [ ] All 5 phases execute without critical errors
- [ ] Validation SQL queries pass with 0 orphan/duplicate records
- [ ] price_key consistency report shows no unresolved mismatches
- [ ] data_import_log contains entries for all phases
- [ ] Phase 5 tacit knowledge report generated for manual review
- [ ] Import is idempotent (re-runnable without data corruption)
- [ ] Transaction rollback confirmed for error scenarios

---

Document Version: 1.0.0
Created: 2026-02-27
