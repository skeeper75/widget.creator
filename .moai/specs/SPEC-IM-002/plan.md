# SPEC-IM-002: Implementation Plan

## SPEC Reference

- **SPEC ID**: SPEC-IM-002
- **Title**: HuniPrinting Product Option Data Import Specification
- **Related**: SPEC-IM-001, SPEC-DB-005, SPEC-INFRA-001

---

## Milestones

### Primary Goal: Phase 1-3 Import Pipeline

- Implement import scripts for master lookup data (Phase 1)
- Implement import scripts for core product structure (Phase 2)
- Implement import scripts for process definitions (Phase 3)
- Execute Phase 3 back-fill for option_choices.ref_* columns
- Validate all FK references and unique constraints per phase

### Secondary Goal: Phase 4 Structural Relationships

- Implement product_options import (product -> option mapping)
- Implement price table imports (price_tables, price_tiers, fixed_prices, package_prices)
- Implement foil_prices and loss_quantity_config import
- Validate price_key consistency between option_choices and price_tiers

### Tertiary Goal: Phase 5 Tacit Knowledge Data

- Create option_constraints manual entry template
- Create option_dependencies manual entry template
- Implement MES mapping import (product_mes_mapping, option_choice_mes_mapping)
- Implement product_editor_mapping import
- Generate tacit knowledge verification report

### Optional Goal: Validation & Tooling

- Implement dry-run mode for all import phases
- Add import validation dashboard to SPEC-IM-001 admin page
- Create import progress tracking with data_import_log
- Build Phase 5 tacit knowledge report generator

---

## Technical Approach

### Architecture

- **Entry Point**: `scripts/import/index.ts` -- orchestrates all 5 phases
- **Phase Runners**: `scripts/import/phases/phase-{1..5}.ts` -- individual phase logic
- **Parsers**: `scripts/import/lib/` -- TOON parser, Excel parser, JSON parser
- **Validators**: `scripts/import/validators/` -- per-phase validation SQL
- **Config**: `scripts/import/config.ts` -- file paths, DB connection, options

### Technology

- **Runtime**: tsx (TypeScript execution)
- **Database**: Drizzle ORM with PostgreSQL 16
- **Excel Parsing**: xlsx or exceljs library
- **JSON Parsing**: Native Node.js
- **TOON Parsing**: Custom parser (`scripts/import/lib/toon-parser.ts`)
- **Validation**: Zod schemas + SQL validation queries
- **Logging**: `data_import_log` table + console output

### Import Pattern

Each phase follows the same pattern:
1. Parse source data (Excel/JSON/TOON)
2. Transform to Drizzle insert schema
3. Validate FK references
4. Execute UPSERT (INSERT ON CONFLICT UPDATE)
5. Run validation SQL queries
6. Log results to data_import_log
7. Report summary

### Transaction Strategy

- Each phase runs in a single database transaction
- On critical error: rollback entire phase
- On non-critical warning: log and continue
- Phase N+1 only starts after Phase N validation passes

---

## Risks and Mitigation

| Risk                                           | Severity | Mitigation                                          |
|------------------------------------------------|----------|-----------------------------------------------------|
| price_key soft FK mismatch                     | High     | Validation SQL after Phase 4 + manual review report |
| Incorrect product_type enum values             | High     | Zod enum validation before insert                   |
| Missing imposition_rules for custom sizes      | Medium   | Default to imposition_count=1 for unknown sizes     |
| Phase 5 tacit knowledge data quality           | High     | Generate verification report + manual review cycle  |
| option_choices.ref_* back-fill failures        | Medium   | Log unmatched references, review manually            |
| Large dataset (20K+ records) performance       | Low      | Batch inserts (100 records per batch)               |

---

Document Version: 1.0.0
Created: 2026-02-27
