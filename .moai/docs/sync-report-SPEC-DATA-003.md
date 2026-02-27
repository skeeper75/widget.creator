# Sync Report: SPEC-DATA-003

## Summary

| Field | Value |
|-------|-------|
| SPEC | SPEC-DATA-003 |
| Title | Integrated Data Pipeline and Version Management Strategy |
| Sync Date | 2026-02-23 |
| Status | Completed |
| Tests | 61 / 61 passing |
| Branch | feature/SPEC-WIDGET-ADMIN-001 |

---

## Files Added (New)

### Import Pipeline Core

| File | Description |
|------|-------------|
| `scripts/import/index.ts` | Import orchestrator entry point with CLI argument parsing |
| `scripts/import/config.ts` | Environment-based path configuration (DATA_DIR, REF_DIR) |
| `scripts/import/version-manager.ts` | SHA-256 versioning and data_import_log integration |

### Parsers

| File | Description |
|------|-------------|
| `scripts/import/parsers/mes-json-parser.ts` | MES v5 JSON parser - products, options, choices extraction |
| `scripts/import/parsers/excel-master-parser.ts` | Scaffolded - future Excel parser (상품마스터) |
| `scripts/import/parsers/excel-pricing-parser.ts` | Scaffolded - future Excel parser (가격표) |
| `scripts/import/parsers/excel-items-parser.ts` | Scaffolded - future Excel parser (품목관리) |

### Importers

| File | Description |
|------|-------------|
| `scripts/import/importers/base-importer.ts` | Abstract base with INSERT ON CONFLICT DO UPDATE pattern |
| `scripts/import/importers/option-definitions.ts` | option_definitions importer (30 records) |
| `scripts/import/importers/option-choices.ts` | option_choices importer with (optionKey, choiceValue) deduplication |
| `scripts/import/importers/product-options.ts` | product_options importer (723 records) |
| `scripts/import/importers/product-editor-mapping.ts` | product_editor_mapping importer (111 records, editor="O") |
| `scripts/import/importers/option-dependencies.ts` | option_dependencies generator (~300 records) |

### Validators

| File | Description |
|------|-------------|
| `scripts/import/validators/cross-reference.ts` | Excel vs MES JSON cross-reference validator |
| `scripts/import/validators/count-validator.ts` | Row count verification per table |

### Schema

| File | Description |
|------|-------------|
| `packages/shared/src/db/schema/huni-import-log.schema.ts` | data_import_log Drizzle schema |

### Tests

| File | Tests |
|------|-------|
| `scripts/import/__tests__/config.test.ts` | Configuration and path resolution |
| `scripts/import/__tests__/mes-json-parser.test.ts` | MES JSON parsing and extraction |
| `scripts/import/__tests__/version-manager.test.ts` | SHA-256 versioning and change detection |
| `scripts/import/__tests__/option-definitions.test.ts` | option_definitions import and deduplication |
| `scripts/import/__tests__/option-choices.test.ts` | option_choices import and FK resolution |
| `scripts/import/__tests__/product-options.test.ts` | product_options import and product_id lookup |
| `scripts/import/__tests__/product-editor-mapping.test.ts` | product_editor_mapping import |
| `scripts/import/__tests__/option-dependencies.test.ts` | option_dependencies domain rule generation |
| `scripts/import/__tests__/cross-reference.test.ts` | Cross-reference validation |

---

## Files Modified

| File | Change |
|------|--------|
| `packages/shared/src/db/schema/index.ts` | Added dataImportLog export |
| `package.json` | Added import script commands and ExcelJS dependency |

---

## Documentation Updated

| File | Change |
|------|--------|
| `.moai/specs/SPEC-DATA-003/spec.md` | Status changed from Draft to completed; Section 13 Implementation Notes appended |
| `README.md` | Added import pipeline usage commands to "데이터베이스 설정" section |
| `CHANGELOG.md` | Added SPEC-DATA-003 entry to [Unreleased] > Added section |

---

## Test Results

- **Total tests**: 61
- **Passing**: 61
- **Failing**: 0
- **Test location**: `scripts/import/__tests__/`

**Note on pre-existing failures**: 12 tests in `prisma/__tests__/seed-normalized.test.ts` remain failing due to missing `data/pricing/imposition.json`. This is an unrelated SPEC-DATA-002 issue and was present before this implementation.

---

## Data Coverage Delivered

| Table | Records | Source | Method |
|-------|---------|--------|--------|
| option_definitions | 30 | MES v5 JSON options[] | Deduplicate by optionKey |
| option_choices | varies | MES v5 JSON choices[] | Deduplicate by (optionKey, choiceValue) |
| product_options | 723 | MES v5 JSON options[] | Product ID lookup via huni_code |
| product_editor_mapping | 111 | MES v5 JSON products[] where editor="O" | editor_type='edicus' |
| option_dependencies | ~300 | Domain rules (SPEC-DATA-002 Section 4.5.5) | Rule-based generation |
| data_import_log | n/a | Auto-generated per import run | Version tracking |

---

## Key Design Decisions

1. **Idempotency**: All importers use `INSERT ... ON CONFLICT ... DO UPDATE` - no DELETE operations. Safe to re-run at any time.
2. **Version detection**: SHA-256 checksums compared against `data_import_log.source_hash`. Unchanged sources are skipped automatically.
3. **Configurable paths**: `DATA_DIR` and `REF_DIR` environment variables control all source paths. `data(사용금지)/` directory is never referenced (per REQ-N-001).
4. **Transaction isolation**: Each importer runs in a single DB transaction. Partial failures roll back cleanly.
5. **Schema extension**: `huni-import-log.schema.ts` follows existing naming convention and is re-exported from `schema/index.ts`.

---

## Known Limitations

- **Excel parsers**: Scaffolded only. Full row-parsing logic for 18 Excel-covered tables is deferred to a future iteration pending Excel structure confirmation.
- **product_mes_mapping**: Existing seed.ts continues to own this table. Cross-validation is conceptual rather than automated.
- **option_choice_mes_mapping**: Pending admin UI SPEC (out of scope per Section 1.3).

---

## CLI Usage

```bash
# Full import (respects version checks)
npx tsx scripts/import/index.ts

# Domain-specific import
npx tsx scripts/import/index.ts --domain options

# Force re-import (bypass version check)
npx tsx scripts/import/index.ts --force

# Specific table
npx tsx scripts/import/index.ts --table option_definitions --force

# Dry run (parse and validate, no DB writes)
npx tsx scripts/import/index.ts --dry-run

# Validate only (cross-reference checks)
npx tsx scripts/import/index.ts --validate-only
```
