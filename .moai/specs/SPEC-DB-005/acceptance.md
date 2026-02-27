# SPEC-DB-005: Acceptance Criteria

**SPEC ID**: SPEC-DB-005
**Title**: HuniPrinting Excel Import Design - Color Semantic Mapping & Product-Option Pipeline

---

## Test Scenarios (Given-When-Then Format)

### Scenario Group 1: Color Semantic Mapping (REQ-1)

#### Scenario 1.1: Red color maps to required customer option
```
Given a TOON column header with _clr value "E06666"
When the color semantic resolver processes this column
Then the result is { isVisible: true, isRequired: true, isInternal: false }
```

#### Scenario 1.2: Orange color maps to optional customer option
```
Given a TOON column header with _clr value "F6B26B"
When the color semantic resolver processes this column
Then the result is { isVisible: true, isRequired: false, isInternal: false }
```

#### Scenario 1.3: Yellow color maps to conditional customer option (default policy)
```
Given a TOON column header with _clr value "FFFF00"
And no yellow policy override is configured
When the color semantic resolver processes this column
Then the result is { isVisible: true, isRequired: false, isInternal: false }
```

#### Scenario 1.4: Brown color maps to internal metadata
```
Given a TOON column header with _clr value "C4BD97"
When the color semantic resolver processes this column
Then the result is { isVisible: false, isRequired: false, isInternal: true }
```

#### Scenario 1.5: Gray color maps to internal file specs
```
Given a TOON column header with _clr value "D9D9D9"
When the color semantic resolver processes this column
Then the result is { isVisible: false, isRequired: false, isInternal: true }
```

#### Scenario 1.6: Empty/null color maps to system internal
```
Given a TOON column header with empty or null _clr value
When the color semantic resolver processes this column
Then the result is { isVisible: false, isRequired: false, isInternal: true }
```

#### Scenario 1.7: Unknown color triggers warning and defaults to internal
```
Given a TOON column header with _clr value "ABCDEF" (not in mapping table)
When the color semantic resolver processes this column
Then a warning is logged with the unknown color code
And the result is { isVisible: false, isRequired: false, isInternal: true }
```

#### Scenario 1.8: Case-insensitive color matching
```
Given a TOON column header with _clr value "e06666" (lowercase)
When the color semantic resolver processes this column
Then the result matches the E06666 mapping (isVisible: true, isRequired: true)
```

---

### Scenario Group 2: Option Visibility Flag Population (REQ-2)

#### Scenario 2.1: Visibility flags set correctly for mixed-color sheet
```
Given a product sheet with:
  - 3 red columns (E06666)
  - 2 orange columns (F6B26B)
  - 1 yellow column (FFFF00)
  - 2 brown columns (C4BD97)
  - 1 gray column (D9D9D9)
When the import pipeline processes this sheet
Then 6 recipe_option_bindings records have isRequired or isVisible true
And 3 recipe_option_bindings records have isRequired=true
And 3 recipe_option_bindings records have isRequired=false and isVisible=true
And brown/gray columns are NOT in recipe_option_bindings (stored elsewhere)
```

#### Scenario 2.2: Re-import updates visibility flags
```
Given an existing product with option binding where source_color="E06666" (isRequired=true)
When the TOON file is updated and the same column now has _clr="F6B26B"
And the import pipeline is re-run
Then the recipe_option_binding record is updated to isRequired=false, isVisible=true
And source_color is updated to "F6B26B"
```

---

### Scenario Group 3: Color Traceability (REQ-3)

#### Scenario 3.1: Source color preserved on option_element_types
```
Given a TOON column "size(pilsu)" with _clr="E06666"
When the import creates an option_element_types record
Then the source_color field contains "E06666"
```

#### Scenario 3.2: Source color preserved on recipe_option_bindings
```
Given a product with option binding for "size" imported from a red column
When the import creates a recipe_option_bindings record
Then the source_color field contains "E06666"
```

#### Scenario 3.3: Query by source color
```
Given multiple option_element_types records with different source_colors
When querying WHERE source_color = 'E06666'
Then only red-coded option types are returned
```

---

### Scenario Group 4: Product-Option Import Pipeline (REQ-4)

#### Scenario 4.1: MAP sheet creates category hierarchy
```
Given product-master.toon contains a MAP sheet with category definitions
When the import processes the MAP sheet
Then product_categories records are created matching the hierarchy
```

#### Scenario 4.2: Product creation from data rows
```
Given a Digital Printing sheet with 50 data rows
When the import processes this sheet
Then wb_products records are created for each unique product (identified by ID/MES ITEM_CD)
And each product is linked to the correct product_category
```

#### Scenario 4.3: Option type deduplication across sheets
```
Given "size" appears as a column in both Digital Printing and Sticker sheets
When the import processes both sheets
Then only ONE option_element_types record exists for "size"
And recipe_option_bindings link "size" to products in both categories
```

#### Scenario 4.4: Option choices extracted from data values
```
Given a "paper" column in Digital Printing sheet with values "white-mojo-100g", "art-250g", "matt-150g"
When the import processes this sheet
Then option_element_choices contains 3 records under the "paper" option type
```

#### Scenario 4.5: Idempotent re-import
```
Given the import has been run once successfully
When the import is run again with the same TOON data
Then no duplicate records are created
And existing records are updated (not duplicated)
And the final record count matches the first import
```

#### Scenario 4.6: Import registered in orchestrator
```
Given scripts/import/index.ts contains the STEPS array
When the import orchestrator runs
Then import-product-options.ts is executed after import-papers.ts
```

---

### Scenario Group 5: Domain Data Separation (REQ-5)

#### Scenario 5.1: Customer options stored in option tables
```
Given a red column "size(pilsu)" with values "A4", "A3", "B5"
When the import processes this column
Then option_element_types contains "size" type
And option_element_choices contains "A4", "A3", "B5"
And NO entry in wb_products.file_spec references these values
```

#### Scenario 5.2: Internal metadata stored in JSONB
```
Given gray columns "file_spec" and "folder" with values "300dpi_CMYK" and "/digital/print/"
When the import processes these columns
Then wb_products.file_spec JSONB contains { "file_spec": "300dpi_CMYK", "folder": "/digital/print/" }
And NO option_element_types record exists for "file_spec" or "folder"
```

#### Scenario 5.3: Internal IDs stored in reference fields
```
Given brown column "MES ITEM_CD" with value "DIG-001"
When the import processes this column
Then wb_products.mes_item_cd = "DIG-001"
And NO option_element_types record exists for "MES ITEM_CD"
```

---

### Scenario Group 6: Yellow Column Policy (REQ-6)

#### Scenario 6.1: Default yellow policy
```
Given no YELLOW_POLICY environment variable is set
When a yellow column (FFFF00) is encountered
Then the column is treated as isVisible=true, isRequired=false, isInternal=false
```

#### Scenario 6.2: Overridden yellow policy
```
Given YELLOW_POLICY environment variable is set to "internal"
When a yellow column (FFFF00) is encountered
Then the column is treated as isVisible=false, isRequired=false, isInternal=true
```

---

### Scenario Group 7: Error Handling

#### Scenario 7.1: Missing TOON file
```
Given product-master.toon does not exist at the expected path
When the import script is executed
Then a clear error message is logged
And the script exits with non-zero status code
```

#### Scenario 7.2: Malformed TOON data
```
Given a TOON sheet with inconsistent column counts in data rows
When the import processes this sheet
Then the malformed rows are skipped with warning logs
And valid rows are still imported successfully
```

#### Scenario 7.3: Database connection failure
```
Given the database is not reachable
When the import script is executed
Then a clear error message about database connection is logged
And the script exits with non-zero status code
```

---

## Quality Gate Criteria

### Definition of Done

- [ ] All 6 REQ requirements have corresponding implementation
- [ ] `source_color` columns added to `option_element_types` and `recipe_option_bindings` with Drizzle migration
- [ ] `COLOR_SEMANTIC_MAP` covers all 6 color codes + default for unknown
- [ ] TOON parser extracted to shared `lib/toon-parser.ts`
- [ ] Import script `import-product-options.ts` creates products, option types, choices, and bindings
- [ ] `import-mes-items.ts` refactored to use shared TOON parser (no regression)
- [ ] Import registered in `scripts/import/index.ts`
- [ ] Unit tests for color semantic mapping (8+ test cases)
- [ ] Integration tests for import pipeline
- [ ] Idempotency verified (double-run produces same result)
- [ ] `--dry-run` and `--validate-only` flags functional
- [ ] All tests pass with 85%+ coverage on new code
- [ ] Zero TypeScript errors (`tsc --noEmit`)
- [ ] No ESLint warnings on new files

### Verification Methods

| Method | Scope | Tool |
|--------|-------|------|
| Unit test | Color semantic mapping | Vitest |
| Unit test | TOON parser shared library | Vitest |
| Integration test | Full import pipeline with test fixtures | Vitest |
| Idempotency test | Double-run verification | Vitest |
| Type check | TypeScript strict mode | tsc --noEmit |
| Lint | ESLint rules | eslint |
| Schema validation | Drizzle migration | drizzle-kit push |

---

**Document Version**: 1.0.0
**Created**: 2026-02-27
