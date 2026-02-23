# Expert Backend Agent Memory

## Project: widget.creator

### TypeScript Environment
- Project uses `NodeNext` module system (tsconfig.base.json)
- Seed scripts use `tsx` runner (supports __dirname natively in CJS mode)
- DO NOT use `import.meta.url` in prisma/*.ts files - NodeNext CJS does not allow it
- Correct pattern: use `__dirname` directly (tsx injects it)

### Data File Paths
- Pricing data: `data/pricing/` (paper.json, digital-print.json, finishing.json, binding.json, imposition.json)
- Export data: `data/exports/MES_자재공정매핑_v5.json` (categories + products)

### Key Data Mappings (SPEC-DATA-002)
- Finishing types JSON keys: perforation, scoring, folding, variableText, variableImage, cornerRounding, lamination, lamination3Section
- These map to group codes: PP001-PP008
- Binding codes: 중철제본=BIND_SADDLE_STITCH, 무선제본=BIND_PERFECT, 트윈링제본=BIND_TWIN_RING, PUR제본=BIND_PUR
- Print mode codes: 0=NONE, 1=SINGLE_MONO, 2=DOUBLE_MONO, 4=SINGLE_COLOR, 8=DOUBLE_COLOR, etc.

### Prisma Huni* Model Notes
- HuniCategory: @@map("categories") - uses autoincrement Int id
- HuniProduct: huniCode @unique, edicusCode @unique, slug @unique
- HuniProductMesMapping: unique on (productId, mesItemId, coverType) - coverType can be null
- HuniLossQuantityConfig: unique on (scopeType, scopeId) - scopeId can be null
- HuniImpositionRule: unique on (cutWidth, cutHeight, sheetStandard)

### Seed Script Location
- `prisma/seed-normalized.ts` - SPEC-DATA-002 Huni* model seeding
- `prisma/seed.ts` - original catalog seeding (PrintProduct, ProductCategory, etc.)
