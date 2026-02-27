---
name: innojini-huni-data-import
description: >
  HuniPrinting master data Excel-to-DB import workflow using ExcelJS + TOON format.
  Extracts Excel with full formatting metadata (cell colors, fonts, merged cells) for
  tacit knowledge preservation, then converts to TOON format for 93% token savings.
  Supports product master, pricing tables, and MES item management data.
  Use when importing huni seed data, analyzing 상품마스터 or 가격표, working with xlsx
  files, running excel extract/convert scripts, or mapping toon files to DB tables.
license: Apache-2.0
compatibility: Designed for Claude Code - widget.creator project
user-invocable: true
metadata:
  version: "1.0.0"
  category: "domain"
  status: "active"
  updated: "2026-02-27"
  tags: "excel, import, toon, huni, data, seed, token-optimization"
  argument-hint: "[extract|convert|analyze|import|status]"

progressive_disclosure:
  enabled: true
  level1_tokens: 150
  level2_tokens: 3000

triggers:
  keywords: ["excel", "import", "huni", "seed", "상품마스터", "가격표", "품목관리", "toon", "xlsx"]
  agents: ["expert-backend", "manager-ddd"]
  phases: ["run"]
---

# HuniPrinting Data Import Workflow

Pipeline: Excel (.xlsx) → JSON (ExcelJS, with colors) → TOON (93% smaller) → DB inserts

## Quick Start

```bash
# Step 1: Extract Excel → JSON (run once, ~30s)
pnpm tsx scripts/excel-extract.ts

# Step 2: Convert JSON → TOON (fast, deterministic)
pnpm tsx scripts/excel-to-toon.ts

# Step 3: Analyze structure (AI reads TOON, NOT JSON)
# Read ref/huni/toon/product-master.toon   (224KB, ~1,287 lines)
# Read ref/huni/toon/price-table.toon      (127KB, ~1,557 lines)
# Read ref/huni/toon/item-management.toon  ( 25KB, ~284 lines)

# Step 4: Update mappings if needed
# Edit ref/huni/mappings/*.yaml

# Step 5: Run import scripts
pnpm tsx scripts/import/import-products.ts
pnpm tsx scripts/import/import-papers.ts
pnpm tsx scripts/import/import-prices.ts
```

## File Size Reference

| File | Format | Size | Est. Tokens | Use When |
|------|--------|------|-------------|----------|
| 후니프린팅_상품마스터_260209.xlsx | xlsx | 1.1MB | never read | source only |
| 후니프린팅_인쇄상품_가격표_260214.xlsx | xlsx | 250KB | never read | source only |
| 품목관리.xlsx | xlsx | 25KB | never read | source only |
| extracted/상품마스터_extracted.json | JSON | 3.0MB | ~150K | color analysis only |
| extracted/가격표_extracted.json | JSON | 2.3MB | ~115K | color analysis only |
| extracted/품목관리_extracted.json | JSON | 340KB | ~17K | color analysis only |
| toon/product-master.toon | TOON | 224KB | ~11K | standard analysis |
| toon/price-table.toon | TOON | 127KB | ~6K | standard analysis |
| toon/item-management.toon | TOON | 25KB | ~1.2K | standard analysis |

**Rule**: Always use TOON for analysis. Use JSON only when cell color metadata is required.

## 5-Phase Workflow

### Phase 1: Extract Once
Run `pnpm tsx scripts/excel-extract.ts`

- Reads all three .xlsx files using ExcelJS
- Preserves: cell background colors, fonts (bold/italic), merged cell ranges, formulas
- Output: `ref/huni/extracted/*.json` (full formatting metadata)
- Run only when source Excel files change

### Phase 2: Convert to TOON
Run `pnpm tsx scripts/excel-to-toon.ts`

- Input: extracted JSON files
- Output: `ref/huni/toon/*.toon` (pipe-delimited compact format)
- TOON format: `sheet|row|col|value|colorCode` per line
- 93% token reduction: 5,592KB JSON → 377KB TOON

### Phase 3: Analyze Structure
AI reads TOON files to understand data layout:

- Identify column headers (usually row 1-3, check for bold+color)
- Find data start row (first non-header, non-merged row)
- Map color codes to semantics (see Color Legend below)
- Identify optional vs required fields via color
- Document findings in `ref/huni/extracted/ANALYSIS.md`

### Phase 4: Design Mappings
Create or update YAML files in `ref/huni/mappings/`:

- `product-master-mapping.yaml` → wb_products, papers tables
- `price-table-mapping.yaml` → print_cost_base, postprocess_cost tables
- `item-management-mapping.yaml` → mes_items table

Each mapping file declares: sheet name, header row, data start row, column-to-field mappings, type transformations, skip conditions.

### Phase 5: Import to DB
Run import scripts (to be created in `scripts/import/`):

- `import-products.ts` → reads product-master.toon + mapping → wb_products
- `import-papers.ts` → reads product-master.toon (sheet: !디지털인쇄용지) → papers
- `import-prices.ts` → reads price-table.toon → print_cost_base + postprocess_cost
- `import-mes-items.ts` → reads item-management.toon → mes_items

## Color Legend

| Hex Code | Color Name | Meaning | DB Action |
|----------|-----------|---------|-----------|
| F6B26B | Orange | 필수옵션 (Required option) | must_have = true |
| FFFF00 | Yellow | 검토필요 (Needs review) | flag for manual check |
| E06666 | Red | 오류 (Error/Invalid) | skip row, log warning |
| CFE2F3 | Light blue | 표준데이터 (Standard data) | import normally |
| (none) | White/null | Normal data | import normally |

## DB Table Mapping

| TOON File | Sheet Name | Target Table | Notes |
|-----------|-----------|--------------|-------|
| product-master.toon | (12 category sheets) | wb_products | product_type per sheet |
| product-master.toon | !디지털인쇄용지 | papers | paper specs |
| price-table.toon | 디지털출력비 | print_cost_base | base print pricing |
| price-table.toon | 후가공 | postprocess_cost | finishing costs |
| item-management.toon | (all sheets) | mes_items | 261 MES items total |

## Excel Tacit Knowledge

### Structural Patterns

| Excel Feature | Interpretation | Handling |
|---------------|---------------|----------|
| Bold row | Section header or category boundary | skip or use as grouping key |
| Merged cells | Hierarchical data, parent applies to children | propagate first cell value downward |
| Empty cell in merged range | Inherits value from top-left of merge | use `mergeInfo` from JSON if needed |
| Row with all empty cells | Separator or end of section | skip row |
| ✓ / ✗ in cell | Boolean true/false | parse as boolean |
| `-` in cell | null or N/A | store as NULL |
| `*` prefix | Required field marker | set required = true |
| `/` separator | Multi-value list | split and store as array |

### Data Type Rules

- Numbers stored as strings: use `Number(value)` — check for NaN after
- Korean text: ensure UTF-8 in DB connection string (`charset=utf8mb4` or `encoding: utf8`)
- Excel serial dates (e.g., 45678): ExcelJS returns as JS Date object from JSON; TOON stores as ISO string
- Percentage values (e.g., `15%`): strip `%`, divide by 100
- Currency (e.g., `₩1,200`): strip `₩` and `,`, parse as integer

## Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| TOON shows garbled Korean | UTF-8 BOM missing | `fs.writeFileSync(path, content, 'utf8')` |
| Merged cell value empty | Reading child cells | Use JSON `mergeInfo` or propagate from parent |
| Color not detected | Cell uses theme color not hex | Check JSON `style.fill.fgColor` for tint values |
| Row count mismatch | Hidden rows in Excel | ExcelJS includes hidden rows by default |
| Number parsed as NaN | Cell stores text not number | `Number(val.replace(/[^0-9.-]/g, ''))` |
| Sheet not found | Sheet name has trailing space | `sheet.name.trim()` when matching |

## File Structure Reference

```
ref/huni/
  ├── *.xlsx                        # Original Excel (never read directly for analysis)
  ├── extracted/
  │   ├── 상품마스터_extracted.json  # Full JSON with color metadata (3.0MB)
  │   ├── 가격표_extracted.json      # Full JSON with color metadata (2.3MB)
  │   ├── 품목관리_extracted.json    # Full JSON with color metadata (340KB)
  │   ├── structure-analysis.json   # Sheet structure summary
  │   └── ANALYSIS.md               # Human-readable data analysis
  ├── toon/
  │   ├── product-master.toon       # Compact format, 224KB (~11K tokens)
  │   ├── price-table.toon          # Compact format, 127KB (~6K tokens)
  │   └── item-management.toon     # Compact format, 25KB (~1.2K tokens)
  └── mappings/
      ├── product-master-mapping.yaml
      ├── price-table-mapping.yaml
      └── item-management-mapping.yaml

scripts/
  ├── excel-extract.ts              # xlsx → JSON (ExcelJS, preserves formatting)
  ├── excel-to-toon.ts              # JSON → TOON (pipe-delimited, 93% reduction)
  └── import/
      ├── import-products.ts        # → wb_products
      ├── import-papers.ts          # → papers
      ├── import-prices.ts          # → print_cost_base, postprocess_cost
      └── import-mes-items.ts       # → mes_items
```

## Token Optimization Summary

Never load JSON or xlsx for routine analysis. The TOON format was specifically designed to fit all three datasets into a single context window (total ~18K tokens).

When color semantics are needed and TOON color column is insufficient, load only the specific sheet from the JSON file using targeted reads:

```
Grep pattern="sheetName" path="ref/huni/extracted/상품마스터_extracted.json"
```

Then use offset/limit to read only the relevant section.
