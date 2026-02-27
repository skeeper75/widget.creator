# TDD Agent Memory

## Project Patterns

### Data Pipeline Architecture
- Excel source: `ref/huni/!후니프린팅_상품마스터_260209_updated.xlsx` (canonical)
- Python parsers: `scripts/generate-*.py` using openpyxl
- Python utility: `scripts/lib/data_paths.py` (date-based versioning)
- TypeScript utility: `scripts/lib/data-paths.ts` (mirrors Python)
- Version file: `data/.current-version` (currently `2026-02-23`)
- Versioned output: `data/YYYY-MM-DD/` structure

### Test Patterns
- Test framework: Vitest
- Test locations: `prisma/__tests__/*.test.ts`, `packages/*/src/**/*.test.ts`, `scripts/**/__tests__/*.test.ts`
- Pattern: Read JSON data files and validate structure/counts
- All tests are data-integrity tests (no DB required)

### Seed Pipeline (scripts/seed.ts)
- 14 phases, each with dedicated async function
- Uses `getCurrentVersion()` for versioned data paths
- `exports/` directory is non-versioned (reference data)
- fixedPrices table: goods, business-card, acrylic
- Product files: 219 individual JSON files in products/

### Star Constraints
- 129 total star cells in Excel (72 are actual option constraints)
- 54 are product name flags (ending with star), excluded from constraints
- 3 are meta description cells, excluded
- Classification: size_show (47), size_range (22), paper_condition (3)

### Key File Paths
- `scripts/seed.ts` (~2235 lines) - main seed pipeline
- `prisma/__tests__/seed-data-p2.test.ts` - P2 data tests
- `prisma/__tests__/seed-data-constraints.test.ts` - constraint tests
- `data/2026-02-23/products/option-constraints.json` - star constraints output
