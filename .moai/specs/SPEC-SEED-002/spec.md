---
id: SPEC-SEED-002
title: Comprehensive DB Seeding Pipeline Documentation
version: 1.0.0
status: completed
created: 2026-02-23
updated: 2026-02-24
author: manager-spec
priority: High
depends_on: [SPEC-SEED-001, SPEC-DATA-002, SPEC-DATA-003]
tags: [seeding, pipeline, data, pricing, products, MES]
---

# SPEC-SEED-002: Comprehensive DB Seeding Pipeline

## 1. Overview

This SPEC documents the complete database seeding pipeline for the Huni Printing Widget Creator project. The pipeline transforms raw Excel source files into structured JSON intermediaries, then loads them into a PostgreSQL 16 database via Drizzle ORM.

The pipeline has two stages:
1. **Python Data Extraction** (6 scripts): Excel -> JSON
2. **TypeScript DB Seeder** (1 script, 14 phases): JSON -> PostgreSQL

### 1.1 History

| Date | Change |
|------|--------|
| 2026-02-23 | Initial creation - full pipeline documentation |
| 2026-02-24 | Sync phase completed - implementation notes added |

### 1.2 Related SPECs

| SPEC | Scope | Status |
|------|-------|--------|
| SPEC-SEED-001 | Product seeding bugs (huni_code assignment, goods subcategory mapping) | Completed |
| SPEC-DATA-002 | Data normalization architecture (26 tables, code system) | Draft |
| SPEC-DATA-003 | Data pipeline and version management | Completed |

---

## 2. Data Sources

### 2.1 Excel Source Files

All source Excel files are stored in `ref/huni/` (not version-controlled in data/):

| File | Description | Sheets Used |
|------|-------------|-------------|
| `!후니프린팅_상품마스터_260209_updated.xlsx` | Product master with all 11 product sheets | 디지털인쇄, 스티커, 책자, 포토북, 캘린더, 디자인캘린더, 실사, 아크릴, 굿즈, 문구(노트), 상품악세사리 |
| `!후니프린팅_인쇄상품_가격표_260214.xlsx` | Pricing data | 디지털용지, 디지털출력, 후가공, 제본, 부수표, 후가공_박, 명함, 아크릴 |
| `품목관리.xlsx` | MES item management (260 items) | Sheet |

### 2.2 Reference JSON (Non-versioned)

| File | Location | Description |
|------|----------|-------------|
| `MES_자재공정매핑_v5.json` | `data/exports/` | 221 products with MES codes, categories, options |

---

## 3. Python Data Extraction Pipeline

### 3.1 Script Overview

All Python scripts share a common library `scripts/lib/data_paths.py` for date-based version resolution.

| # | Script | Input | Output | Records |
|---|--------|-------|--------|---------|
| 1 | `generate-pricing-json.py` | Master Excel + Pricing Excel | 5 JSON files in `pricing/` | ~230 records |
| 2 | `generate-remaining-pricing.py` | Pricing Excel + v5.json | 4 JSON files in `pricing/` + `pricing/products/` | ~100+ records |
| 3 | `generate-option-constraints.py` | Master Excel | `products/option-constraints.json` | 129 constraints |
| 4 | `generate-product-json.py` | Master Excel + v5.json | 220 individual product JSONs in `products/` | 220 files |
| 5 | `generate-product-master-raw.py` | Master Excel | `_raw/product-master-raw.json` | All products by sheet |
| 6 | `generate-mes-items.py` | 품목관리.xlsx | `integration/mes-items.json` | 260 items |

### 3.2 Script Details

#### 3.2.1 generate-pricing-json.py

**Source Excel Sheets:**
- `디지털용지` from Pricing Excel (paper pricing: costPerReam, sellingPerReam, sellingPer4Cut)
- `디지털출력` from Pricing Excel (digital print price tiers)
- `후가공` from Pricing Excel (finishing/post-process pricing PP001-PP008)
- `제본` from Pricing Excel (binding pricing: 4 types)
- `부수표` from Pricing Excel (imposition lookup table)
- `용지정보` from Master Excel (paper catalog: name, abbreviation, gramWeight, fullSheetSize)

**Output Files:**

| File | Path | Description |
|------|------|-------------|
| `paper.json` | `pricing/paper.json` | 83 paper records with pricing fields |
| `digital-print.json` | `pricing/digital-print.json` | 11 print types with priceTable matrix |
| `finishing.json` | `pricing/finishing.json` | 8 finishing sections (PP001-PP008) with subOptions and priceTiers |
| `binding.json` | `pricing/binding.json` | 4 binding types with priceTiers |
| `imposition.json` | `pricing/imposition.json` | ~47 rows trimSize/workSize/impositionCount |

**Key Logic:**
- Paper pricing cross-references Master Excel (paper catalog) with Pricing Excel (cost/selling prices)
- Duplicate paper names: first occurrence with actual price data wins
- Digital print priceTable keyed by quantity threshold -> print code -> unit price
- Finishing priceTiers keyed by quantity -> option name -> price

#### 3.2.2 generate-remaining-pricing.py

**Source:** `!후니프린팅_인쇄상품_가격표_260214.xlsx`

**Output Files:**

| File | Path | Source Sheet | Description |
|------|------|-------------|-------------|
| `foil.json` | `pricing/foil.json` | 후가공_박 | Copper plate (아연판) prices + basic foil + special foil stamp pricing |
| `business-card.json` | `pricing/products/business-card.json` | 명함 | Business card fixed prices by paper/side |
| `acrylic.json` | `pricing/products/acrylic.json` | 아크릴 | Acrylic size grid pricing (width x height -> price) |
| `goods.json` | `pricing/products/goods.json` | N/A (from v5.json) | Goods products placeholder structure |

**Key Logic:**
- foil.json has 3 sections: copperPlate (zinc plate cost matrix), basicFoil (size-based price table), specialFoil (premium foil pricing)
- business-card.json: product names are inherited from merged cells (current_product pattern)
- acrylic.json: 2D grid with widths as columns, heights as rows
- goods.json: placeholder with `cost: 0, sellingPrice: 0` -- prices not in Excel

#### 3.2.3 generate-option-constraints.py

**Source:** `!후니프린팅_상품마스터_260209_updated.xlsx` (all 11 product sheets)

**Output:** `products/option-constraints.json` (129 constraints as of 2026-02-23)

**Constraint Types:**

| Type | Description | Detection Pattern |
|------|-------------|-------------------|
| `size_show` | Which sizes are visible for specific options | Contains "사이즈선택" or "선택시" |
| `size_range` | Valid size ranges for foil/custom options | Contains "최소...최대" pattern |
| `paper_condition` | Paper requirements for specific sizes | Contains "종이두께" or "g이상" |

**Key Logic:**
- Scans all cells for star character (U+2605)
- Classifies star-annotated text into 3 constraint types
- Skips product name markers (star at end of column 4/5/19)
- Each constraint record includes: product_code, sheet_name, constraint_type, rule_text, description, row, col, product_name

#### 3.2.4 generate-product-json.py

**Source:** Master Excel (11 product sheets) + `MES_자재공정매핑_v5.json`

**Output:** 220 individual JSON files at `products/{mesItemCd}.json`

**Per-Product JSON Structure:**
```
{
  "id": string,
  "mesItemCd": string,
  "name": string,
  "category": string,
  "type": string,  // digital-print, sticker, booklet, large-format, acrylic, goods, stationery
  "options": {
    "size": { type, required, choices: [{ label, value, specs }] },
    "paper": { type, required, choices: [{ label, value, priceKey }] },
    "printType": { type, required, choices: [{ label, value, code }] },
    "coating": { ... },
    "cuttingType": { ... },
    "quantity": { type: "number", min, max, step },
    "material": { ... }  // renamed from paper for sticker/실사/acrylic
  }
}
```

**Key Logic:**
- Parses Excel column by column: A=category, B=ID, C=MES code, D=name, E=size...
- Size specs include trimSize, workSize, bleed, imposition parsed from dedicated columns
- For sticker/large-format/acrylic products, `paper` option is renamed to `material`
- Product type inferred from MES v5 data or sheet name fallback

#### 3.2.5 generate-product-master-raw.py

**Source:** Master Excel (11 product sheets)

**Output:** `_raw/product-master-raw.json`

**Structure:**
```
{
  "sheets": {
    "디지털인쇄": {
      "products": [
        { "id": 14529, "mesItemCd": "001-0001", "name": "프리미엄엽서", "category": "엽서" }
      ]
    }
  }
}
```

**Key Logic:**
- This is the authoritative source for category hierarchy building in seed.ts
- The `id` field corresponds to Excel column B (= shopbyId = huni_code)
- The `category` field from column A provides depth=1 sub-category names
- Used by Phase 1 of seed.ts for mesItemCd -> subCategoryId mapping

#### 3.2.6 generate-mes-items.py

**Source:** `품목관리.xlsx` (Sheet tab)

**Output:** `integration/mes-items.json` (260 MES items)

**Per-Item Structure:**
```
{
  "groupCode": string,
  "itemCode": string,
  "itemName": string,
  "abbrName": string | null,
  "itemType": string,
  "unit": string,
  "modelCount": number | null,
  "setCount": number | null,
  "isActive": boolean,
  "options": [{ "optionNumber": number, "optionValue": string }]
}
```

**Key Logic:**
- Parses Option01-Option10 columns (J through S)
- isActive derived from column I ("Y" = true)

---

## 4. Data Version Management

### 4.1 Version Resolution

The versioning system uses date-based directories under `data/`:

```
data/
  .current-version     # Contains "2026-02-23"
  2026-02-23/          # Current version directory
    _raw/
    pricing/
    products/
    integration/
  exports/             # Non-versioned reference data (MES_자재공정매핑_v5.json)
```

### 4.2 Libraries

| Language | File | Key Functions |
|----------|------|---------------|
| Python | `scripts/lib/data_paths.py` | `get_current_version()`, `get_output_dir(date_str)`, `resolve_date()`, `add_date_argument()` |
| TypeScript | `scripts/lib/data-paths.ts` | `getCurrentVersion()`, `getVersionDir(dateStr)`, `getDataPath(relativePath)`, `listVersions()` |

Both read from `data/.current-version`, falling back to today's date if the file does not exist.

---

## 5. Generated Data Catalog (data/2026-02-23/)

### 5.1 Directory Structure

```
data/2026-02-23/
  _raw/
    product-master-raw.json        # Raw Excel product data for category building
  pricing/
    paper.json                     # 83 papers with pricing
    digital-print.json             # 11 print types + price matrix
    finishing.json                 # 8 post-process sections (PP001-PP008)
    binding.json                   # 4 binding types with tiers
    imposition.json                # ~47 cut-size imposition rules
    foil.json                      # Copper plate + basic/special foil pricing
    products/
      business-card.json           # Business card fixed prices
      acrylic.json                 # Acrylic size grid pricing
      goods.json                   # Goods placeholder pricing
  products/
    001-0001.json ... 012-0018.json  # 220 individual product JSONs
    option-constraints.json          # 129 star constraints
  integration/
    mes-items.json                   # 260 MES items with options
```

### 5.2 JSON Schema Details

#### paper.json (83 records)

| Field | Type | Coverage | Description |
|-------|------|----------|-------------|
| name | string | 83/83 | Paper name (e.g., "아트지150g") |
| abbreviation | string\|null | varies | Short name |
| gramWeight | number\|null | varies | Paper weight in grams |
| fullSheetSize | string\|null | varies | Full sheet dimensions |
| sellingPerReam | number | 55/83 | Selling price per ream (1 ream = 500 sheets) |
| costPerReam | number\|null | 23/83 | Purchase cost per ream |
| sellingPer4Cut | number\|null | 53/83 | Selling price per 4-cut sheet |
| mesCode | string | varies | MES code for the paper |
| applicableProducts | string[] | varies | Product names this paper applies to |

**Known Gaps:**
- 28/83 papers missing sellingPerReam (no price data in Excel)
- 60/83 papers missing costPerReam (purchase cost not available)
- 30/83 papers missing sellingPer4Cut
- costPer4Cut always NULL (no source data column in Excel)

#### digital-print.json

| Field | Type | Description |
|-------|------|-------------|
| printTypes | array[11] | Print mode definitions with name, code, label |
| priceTable | object | Nested: quantity -> printCode -> unitPrice |

**Print Codes:** 0 (none), 1 (single-mono), 2 (double-mono), 4 (single-color), 8 (double-color), 11 (single-white), 12 (double-white), 21 (single-clear), 22 (double-clear), 31 (single-pink), 32 (double-pink)

#### finishing.json (8 sections)

| Section Code | Name | Process Type | Sub-Options | Price Basis |
|-------------|------|--------------|-------------|-------------|
| PP001 | 미싱 (Perforation) | perforation | Per subOption | per_unit |
| PP002 | 오시 (Creasing) | creasing | Per subOption | per_unit |
| PP003 | 접지 (Folding) | folding | Per subOption | per_unit |
| PP004 | 가변텍스트 (VDP Text) | vdp_text | Per subOption | per_unit |
| PP005 | 가변이미지 (VDP Image) | vdp_image | Per subOption | per_unit |
| PP006 | 모따기 (Corner Rounding) | corner | Per subOption | per_unit |
| PP007 | 코팅 (Coating) | coating | Per subOption | per_sheet |
| PP008 | 코팅 T3 (Coating T3) | coating | Per subOption | per_sheet (T3) |

Each section contains `subOptions` (name + code) and `priceTiers` (quantity -> option -> price).

#### binding.json (4 types)

| Binding | Code | Description |
|---------|------|-------------|
| 중철제본 | BIND_SADDLE_STITCH | Saddle stitch binding |
| 무선제본 | BIND_PERFECT | Perfect binding |
| 트윈링제본 | BIND_TWIN_RING | Twin ring binding |
| PUR제본 | BIND_PUR | PUR binding |

Each binding type has `priceTiers` with quantity -> unitPrice.

#### foil.json

| Section | Description |
|---------|-------------|
| copperPlate | Zinc plate prices by width x height grid (widths: 30-170mm range) |
| basicFoil | Basic foil stamp pricing by size + quantity tiers |
| specialFoil | Special/premium foil stamp pricing (same structure as basicFoil) |

#### option-constraints.json (129 records)

```
{
  "metadata": { "source": "...", "generated_at": "...", "total_constraints": 129 },
  "constraints": [
    {
      "product_code": "001-0001",
      "sheet_name": "디지털인쇄",
      "constraint_type": "size_show" | "size_range" | "paper_condition",
      "rule_text": "original star-annotated text",
      "description": "human-readable description",
      "row": 5,
      "col": 23,
      "product_name": "프리미엄엽서"
    }
  ]
}
```

---

## 6. seed.ts Phase Architecture

### 6.1 Execution Overview

**File:** `scripts/seed.ts` (2384 lines)
**Runtime:** `npx tsx scripts/seed.ts`
**Database:** PostgreSQL 16 via Drizzle ORM (connection from `DATABASE_URL` env)

### 6.2 Phase Execution Order

| Phase | Function | Source Data | Target DB Tables | Record Estimate |
|-------|----------|-------------|------------------|-----------------|
| 1a | `seedCategories()` | product-master-raw.json + v5.json | categories | 8 depth=0 + ~18 depth=1 = ~26 |
| 1b | `seedImpositionRules()` | imposition.json | imposition_rules | ~47 |
| 1c | `seedPrintModes()` | digital-print.json | print_modes | 11 |
| 1d | `seedPostProcesses()` | finishing.json | post_processes | ~30 (8 groups x subOptions) |
| 1e | `seedBindings()` | binding.json | bindings | 4 |
| 1f | `seedPapers()` | paper.json | papers, paper_product_mapping (DELETE first) | 83 |
| 1g | `seedLossQuantityConfig()` | hardcoded | loss_quantity_config | 1 (global 3%) |
| 2 | `seedProductsAndMes()` | v5.json + category maps | products, mes_items, product_mes_mappings | ~221 products |
| 3 | `seedPricingData()` | digital-print.json, finishing.json, binding.json | price_tables, price_tiers | ~10 tables + ~500 tiers |
| 4 | `seedMaterials()` | hardcoded MATERIAL_TYPE_MAP | materials | ~27 |
| 5 | `seedOptionDefinitions()` | hardcoded OPTION_DEFINITION_MAP | option_definitions | 30 (9 material + 14 process + 7 setting) |
| 6 | `seedProductSizes()` | products/*.json | product_sizes | ~600-800 |
| 7 | `seedOptionChoicesAndProductOptions()` | products/*.json + DB lookups | option_choices, product_options | ~1000+ choices, ~800+ product options |
| 7.5 | `seedOptionConstraints()` | option-constraints.json | option_constraints | ~129 (some skipped if product not found) |
| 8 | `seedPaperProductMapping()` | paper.json + DB product lookup | paper_product_mapping | varies |
| 9 | `seedProductEditorMapping()` | v5.json | product_editor_mappings | ~20-30 (editor='O') |
| 10 | `seedFoilPrices()` | foil.json | foil_prices (DELETE first) | ~100+ |
| 11 | `seedMesItemOptions()` | v5.json | mes_item_options | ~300+ |
| 12 | `seedGoodsFixedPrices()` | goods.json | fixed_prices (DELETE first) | varies |
| 13 | `seedBusinessCardFixedPrices()` | business-card.json | fixed_prices (appended) | varies |
| 14 | `seedAcrylicFixedPrices()` | acrylic.json | fixed_prices (appended) | varies |

### 6.3 Phase Details

#### Phase 1a: Categories (seedCategories)

**Source:** `_raw/product-master-raw.json` + SHEET_CATEGORY_MAP constant

**Logic:**
1. Creates 8 depth=0 parent categories from SHEET_CATEGORY_MAP:
   - CAT_DIGITAL_PRINT (디지털인쇄), CAT_STICKER (스티커), CAT_BOOKLET (책자), CAT_PHOTEBOOK (포토북), CAT_CALENDAR (캘린더), CAT_SILSA (실사), CAT_ACRYLIC (아크릴), CAT_GOODS (굿즈)
   - Additional: CAT_STATIONERY (문구), CAT_ACCESSORIES (상품악세사리) -- total 10 parent codes in map but some share MES categories
2. For each parent, scans raw sheet data to derive unique sub-category names (from Excel column A)
3. Creates depth=1 sub-categories with parent-child relationship
4. Builds 5 lookup maps for subsequent product seeding:
   - `subCategoryMap`: mesCode:subName -> categoryId
   - `mesCategoryToParentMap`: mesCode -> parentId
   - `mesItemCdToSubCategoryId`: mesItemCd -> subCategoryId (most accurate)
   - `shopbyIdToSubCategoryId`: shopbyId -> subCategoryId (for goods with no MES code in raw data)
   - `mesCategoryToFirstSubCatId`: mesCode -> first subCategoryId (fallback)

**Upsert Strategy:** `onConflictDoUpdate` on `categories.code`

#### Phase 2: Products and MES (seedProductsAndMes)

**Source:** `MES_자재공정매핑_v5.json` (221 products)

**Category Assignment Priority (5-level fallback):**
1. Priority 0: shopbyId -> subCategoryId (for goods)
2. Priority 1: mesItemCd -> subCategoryId from raw sheet data
3. Priority 2: mesCode:subCategory -> depth=1 sub-category
4. Priority 3: mesCode:categoryName as fallback
5. Priority 4: First depth=1 sub-category of parent
6. Final: depth=0 parent category (last resort)

**huni_code Assignment:**
- If product has shopbyId: uses shopbyId as huniCode
- Otherwise: assigns sequential ID starting from 90001

**Internal Products:** 7 products are set to `is_active=false`: 링바인더, 아이스머그컵, 슬림하드 폰케이스, 블랙젤리, 임팩트 젤하드, 에어팟케이스, 버즈케이스

**Upsert Strategy:** `onConflictDoUpdate` on `products.huniCode`, `mesItems.itemCode`, `productMesMappings.[productId, mesItemId, coverType]`

#### Phase 3: Pricing (seedPricingData)

**3 sub-phases:**
- **3j - Digital Print:** Creates price table `PT_OUTPUT_SELL_A3` with quantity-based tiers per print mode code
- **3k - Post-Process:** Creates 8 price tables (`PT_PP001_SELL` through `PT_PP008_SELL`) with per-option tiers
- **3l - Binding:** Creates price table `PT_BINDING_SELL` with quantity-based tiers per binding type

**Strategy:** Deletes existing tiers before re-seeding for clean state.

#### Phase 5: Option Definitions (seedOptionDefinitions)

**Source:** Hardcoded `OPTION_DEFINITION_MAP` (30 entries)

| Class | Count | Examples |
|-------|-------|---------|
| material (자재) | 9 | size, paper, material, innerPaper, coverPaper, ringColor, transparentCover, endpaper, standColor |
| process (공정) | 14 | printType, finishing, coating, specialPrint, folding, foilStamp, cuttingType, processing, binding, coverCoating, bindingDirection, calendarProcess, bindingOption, bindingSpec |
| setting (설정) | 7 | quantity, additionalProduct, pieceCount, pageCount, packaging, innerType, selection |

#### Phase 7: Option Choices + Product Options

**Source:** 220 product JSONs from `products/*.json`

**Logic:**
1. Builds lookup maps: paperName->id, printModeCode->id, postProcessName->id, bindingName->id
2. For each product JSON, iterates options:
   - Creates `option_choices` with FK references (refPaperId, refMaterialId, refPrintModeId, refPostProcessId, refBindingId)
   - Creates `product_options` linking product to option definition
3. Uses `seenChoices` map to prevent duplicate choice insertion (same optionDefinitionId + code)

---

## 7. DB Schema Mapping

### 7.1 Table Summary (Tables Seeded by seed.ts)

| DB Table | Schema File | Seeded In Phase | Primary Key | Unique Constraint |
|----------|-------------|-----------------|-------------|-------------------|
| categories | huni-catalog.schema.ts | 1a | id (serial) | code |
| imposition_rules | huni-processes.schema.ts | 1b | id (serial) | [cutWidth, cutHeight, sheetStandard] |
| print_modes | huni-processes.schema.ts | 1c | id (serial) | code |
| post_processes | huni-processes.schema.ts | 1d | id (serial) | code |
| bindings | huni-processes.schema.ts | 1e | id (serial) | code |
| papers | huni-materials.schema.ts | 1f | id (serial) | code |
| loss_quantity_config | huni-pricing.schema.ts | 1g | id (serial) | [scopeType, scopeId] |
| products | huni-catalog.schema.ts | 2 | id (serial) | huniCode |
| mes_items | huni-integration.schema.ts | 2 | id (serial) | itemCode |
| product_mes_mappings | huni-integration.schema.ts | 2 | id (serial) | [productId, mesItemId, coverType] |
| price_tables | huni-pricing.schema.ts | 3 | id (serial) | code |
| price_tiers | huni-pricing.schema.ts | 3 | id (serial) | N/A (bulk insert) |
| materials | huni-materials.schema.ts | 4 | id (serial) | code |
| option_definitions | huni-options.schema.ts | 5 | id (serial) | key |
| product_sizes | huni-catalog.schema.ts | 6 | id (serial) | [productId, code] |
| option_choices | huni-options.schema.ts | 7 | id (serial) | [optionDefinitionId, code] |
| product_options | huni-options.schema.ts | 7 | id (serial) | [productId, optionDefinitionId] |
| option_constraints | huni-options.schema.ts | 7.5 | id (serial) | N/A |
| paper_product_mapping | huni-materials.schema.ts | 8 | id (serial) | [paperId, productId, coverType] |
| product_editor_mappings | huni-integration.schema.ts | 9 | id (serial) | productId |
| foil_prices | huni-pricing.schema.ts | 10 | id (serial) | N/A (DELETE + bulk insert) |
| mes_item_options | huni-integration.schema.ts | 11 | id (serial) | [mesItemId, optionNumber] |
| fixed_prices | huni-pricing.schema.ts | 12-14 | id (serial) | N/A (DELETE + bulk insert) |

### 7.2 Tables NOT Seeded

| DB Table | Schema File | Reason |
|----------|-------------|--------|
| option_dependencies | huni-options.schema.ts | No source data -- dependency rules not yet defined |
| package_prices | huni-pricing.schema.ts | Booklet pricing not yet implemented in pipeline |
| orders, order_items | huni-orders.schema.ts | Runtime data, not seeded |

---

## 8. EARS Requirements

### 8.1 Python Pipeline Requirements

**REQ-PY-001 (Ubiquitous):** The Python extraction pipeline SHALL produce valid UTF-8 encoded JSON files with `ensure_ascii=False` and `indent=2` formatting.

**REQ-PY-002 (Event-Driven):** WHEN `generate-pricing-json.py` runs, THEN the system SHALL produce exactly 5 JSON files (paper.json, digital-print.json, finishing.json, binding.json, imposition.json) in the versioned `pricing/` directory.

**REQ-PY-003 (Event-Driven):** WHEN `generate-remaining-pricing.py` runs, THEN the system SHALL produce foil.json in `pricing/`, and business-card.json, acrylic.json, goods.json in `pricing/products/`.

**REQ-PY-004 (Event-Driven):** WHEN `generate-option-constraints.py` runs, THEN the system SHALL produce `option-constraints.json` with all star-annotated constraints classified into size_show, size_range, or paper_condition types.

**REQ-PY-005 (Event-Driven):** WHEN `generate-product-json.py` runs, THEN the system SHALL produce one JSON file per product with MES code, each containing complete option definitions with choices.

**REQ-PY-006 (Event-Driven):** WHEN `generate-mes-items.py` runs, THEN the system SHALL produce `mes-items.json` with all MES items and their Option01-Option10 values.

**REQ-PY-007 (Unwanted):** IF the source Excel file has duplicate paper names, THEN the system SHALL take the first occurrence with actual price data and skip subsequent duplicates.

**REQ-PY-008 (State-Driven):** WHILE `--date` argument is provided, the system SHALL use the specified date for the output directory instead of today's date.

### 8.2 TypeScript Seeder Requirements

**REQ-TS-001 (Ubiquitous):** The seed script SHALL use `onConflictDoUpdate` (upsert) for all tables with unique constraints to ensure idempotent execution.

**REQ-TS-002 (Event-Driven):** WHEN `seed.ts` runs, THEN the system SHALL execute all 14 phases in strict dependency order without user intervention.

**REQ-TS-003 (Event-Driven):** WHEN a product has no matching category through the 5-level priority fallback, THEN the system SHALL log a warning and skip that product.

**REQ-TS-004 (State-Driven):** WHILE papers are being re-seeded, the system SHALL first DELETE all paper_product_mappings and then DELETE all papers to satisfy foreign key constraints before re-insertion.

**REQ-TS-005 (State-Driven):** WHILE foil_prices, fixed_prices are being re-seeded, the system SHALL DELETE all existing records before bulk insertion (no unique constraint, full replacement).

**REQ-TS-006 (Event-Driven):** WHEN option choices are created, THEN the system SHALL resolve FK references (refPaperId, refMaterialId, refPrintModeId, refPostProcessId, refBindingId) by name lookup against previously seeded master data.

**REQ-TS-007 (Unwanted):** The system SHALL NOT seed the `option_dependencies` table until dependency rule data is defined.

**REQ-TS-008 (Event-Driven):** WHEN a product name is in the INTERNAL_PRODUCT_NAMES set, THEN the system SHALL set `is_active = false` on that product.

**REQ-TS-009 (Event-Driven):** WHEN a product has no shopbyId in v5.json, THEN the system SHALL assign a sequential huniCode starting from 90001.

---

## 9. Known Gaps and TODO Items

### 9.1 Data Coverage Gaps

| Gap | Impact | Severity |
|-----|--------|----------|
| Paper pricing: 28/83 papers missing sellingPerReam | Affected papers cannot be priced in widget | Medium |
| Paper pricing: 60/83 papers missing costPerReam | Profit margin calculation impossible | Low |
| Paper pricing: costPer4Cut always NULL | No source column in Excel | Low |
| goods.json: all sellingPrice = 0 | Goods products have no pricing in widget | High |
| option_dependencies table not seeded | Option cascading rules not functional | Medium |
| package_prices table not seeded | Booklet per-page pricing not available | Medium |
| shopbyId always NULL in products table | Shopby platform linkage not yet established | Medium |

### 9.2 Pending Migrations

| Migration | Description | Status |
|-----------|-------------|--------|
| `drizzle/0003_rename_cost_per_ream.sql` | Rename column for cost_per_ream | Needs application |

### 9.3 Architecture Concerns

| Concern | Description | Recommendation |
|---------|-------------|----------------|
| seed.ts size | 2384 lines in a single file | Consider splitting into phase modules |
| DELETE + INSERT pattern | foil_prices, fixed_prices use full table delete | Add transaction wrapping for atomicity |
| No validation layer | No runtime type validation on loaded JSON | Add Zod schemas for JSON validation |
| Sequential DB operations | Most inserts are sequential (not batched) | Phase 7 already uses seenChoices dedup; extend batch patterns |

---

## 10. Acceptance Criteria

### AC-1: Python Pipeline Produces Valid JSON
GIVEN the source Excel files exist at `ref/huni/`
WHEN all 6 Python scripts run in sequence
THEN the `data/YYYY-MM-DD/` directory contains all expected subdirectories and JSON files
AND every JSON file is valid UTF-8 with correct structure

### AC-2: seed.ts Completes All 14 Phases
GIVEN valid JSON data exists in `data/YYYY-MM-DD/`
WHEN `npx tsx scripts/seed.ts` is executed
THEN all 14 phases complete without fatal errors
AND the console shows "SPEC-DATA-002 seed complete (all phases)!"

### AC-3: Category Hierarchy Integrity
GIVEN seed.ts Phase 1a has completed
THEN the categories table contains exactly the expected parent and sub-category structure
AND every depth=1 category has a valid parentId pointing to a depth=0 category
AND no orphan categories exist

### AC-4: Product-Category Mapping Coverage
GIVEN seed.ts Phase 2 has completed
THEN every product in v5.json is mapped to a depth=1 (not depth=0) category
AND the warning log contains zero "No category found" messages (ideal)

### AC-5: Pricing Data Integrity
GIVEN seed.ts Phase 3 has completed
THEN digital print price tiers cover all 11 print modes
AND post-process price tables exist for all 8 finishing groups (PP001-PP008)
AND binding price table has tiers for all 4 binding types

### AC-6: Option Chain Integrity
GIVEN seed.ts Phases 5-7 have completed
THEN every option_choice has a valid optionDefinitionId reference
AND every product_option has valid productId and optionDefinitionId references
AND FK references (refPaperId, refPrintModeId, etc.) point to existing records or are NULL

### AC-7: Idempotent Re-execution
GIVEN seed.ts has been executed once
WHEN seed.ts is executed again
THEN the database state is identical to the first run (no duplicates, no data loss)
AND record counts match between runs

---

## 11. Implementation Notes (SPEC-SEED-002 Sync)

### 11.1 Implemented Items

| Item | Status | Notes |
|------|--------|-------|
| `scripts/lib/schemas.ts` - Zod validation schemas | Completed | PaperJsonSchema, GoodsJsonSchema, OptionConstraintsJsonSchema, DigitalPrintJsonSchema, BindingJsonSchema, FinishingJsonSchema + `loadAndValidate<T>()` helper |
| `scripts/seed.ts` - `loadAndValidate` import | Completed | Applied to goods.json loading via GoodsJsonSchema |
| `scripts/seed.ts` - price=0 skip logic | Completed | Counter + warnings in `seedGoodsFixedPrices()` |
| `scripts/seed.ts` - transaction wrapping | Completed | DELETE+INSERT in `seedGoodsFixedPrices()` wrapped atomically |
| Drizzle migrations sync | Completed | `__drizzle_migrations` tracking table synced (migrations 0001-0003 registered) |
| `prisma/__tests__/seed-goods-prices.test.ts` | Completed | 21 tests: price=0 skip logic, valid insertion, mixed data |
| `prisma/__tests__/seed-transactions.test.ts` | Completed | 11 tests: rollback on INSERT fail, DELETE fail prevention, idempotent re-seeding |
| `prisma/__tests__/seed-schemas.test.ts` | Completed | 25 tests: all JSON types, invalid data rejection, loadAndValidate helper |
| **Total tests** | **57/57 passing** | All test suites green |

### 11.2 Blocked Items (Require Business Data)

| TASK | Blocked By | Notes |
|------|-----------|-------|
| TASK-002: `option_dependencies` table seeding | Business data not yet defined | Parent-child cascading rules not provided |
| TASK-003: `package_prices` table seeding | Business data not yet defined | Per-page booklet pricing matrix not available |
| TASK-004: Shopby platform ID linkage | SPEC-WIDGET-API-001 | shopby_id remains NULL until integration SPEC is implemented |

### 11.3 Structural Divergence

- Test files were placed under `prisma/__tests__/` (existing test directory) rather than `scripts/__tests__/` as the team was already using Vitest from that location with shared setup infrastructure.
- The `loadAndValidate<T>()` helper in `scripts/lib/schemas.ts` acts as a general-purpose JSON loader, not tied to specific phases - this differs from the SPEC's original assumption of per-phase validation only.
