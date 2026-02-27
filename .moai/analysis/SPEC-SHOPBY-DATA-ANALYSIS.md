# SPEC-SHOPBY Data Analysis Report

**Date:** 2026-02-23
**Status:** Analysis Complete
**Priority:** High

---

## Executive Summary

SPEC-SHOPBY-001~006 구현 전, Docker DB와 데이터 상태를 분석한 결과 **핵심 데이터가 누락**되어 있어 Shopby 연동이 불가능한 상태입니다.

---

## 1. Database Current State

### 1.1 Table Status (30 tables total)

| Table | Data Count | Expected | Status |
|-------|------------|----------|--------|
| products | 221 | ~221 | ✅ OK |
| categories | 50 | - | ✅ OK |
| papers | 83 | ~55 | ✅ OK (exceeded) |
| print_modes | 11 | ~12 | ✅ OK |
| post_processes | 48 | ~40 | ✅ OK |
| price_tiers | 1,577 | ~10,000 | ⚠️ 16% |
| mes_items | 221 | - | ✅ OK |
| **product_sizes** | **0** | ~500 | ❌ **MISSING** |
| **materials** | **0** | - | ❌ **MISSING** |
| **fixed_prices** | **0** | ~300 | ❌ **MISSING** |
| **option_definitions** | **0** | ~30 | ❌ **MISSING** |
| **product_options** | **0** | ~2,000 | ❌ **MISSING** |
| **option_choices** | **0** | ~1,198 | ❌ **MISSING** |
| **option_constraints** | **0** | ~129 | ❌ **MISSING** |
| **option_dependencies** | **0** | ~300 | ❌ **MISSING** |
| **package_prices** | **0** | ~200 | ❌ **MISSING** |
| **foil_prices** | **0** | ~150 | ❌ **MISSING** |

### 1.2 FK Constraints Status

- **Status:** ✅ Applied (SPEC-DB-001 completed)
- **FK Count:** 39 constraints
- **Cascade Rules:** CASCADE (8), RESTRICT (15), SET NULL (15)

---

## 2. SPEC-SHOPBY Document Issues

### 2.1 Incorrect SPEC References

All SPEC-SHOPBY documents reference wrong SPEC:

| SPEC | Current Reference | Should Be |
|------|------------------|-----------|
| SPEC-SHOPBY-001 | SPEC-DATA-001 | SPEC-DATA-002 |
| SPEC-SHOPBY-002 | SPEC-DATA-001 | SPEC-DATA-002 |
| SPEC-SHOPBY-003 | SPEC-DATA-001 | SPEC-DATA-002 |
| SPEC-SHOPBY-004 | SPEC-DATA-001 | SPEC-DATA-002 |
| SPEC-SHOPBY-005 | - | SPEC-DATA-002 |
| SPEC-SHOPBY-006 | - | SPEC-DATA-002 |

### 2.2 Data Model Mismatches

| SPEC Content | Actual DB | Correction |
|--------------|-----------|------------|
| "323 products" | 221 products | Update to 221 |
| "PrintProduct model" | products table | Use products |
| "ProductCategory" | categories table | Use categories |

---

## 3. Seed Script Analysis

### 3.1 Current Seed Coverage (scripts/seed.ts)

**Seeded Tables (11):**
- categories, products, mes_items, product_mes_mapping
- papers, print_modes, post_processes, bindings
- imposition_rules, price_tables, price_tiers, loss_quantity_config

**Missing Seed Logic (10):**
- product_sizes ❌
- materials ❌
- fixed_prices ❌
- option_definitions ❌
- product_options ❌
- option_choices ❌
- option_constraints ❌
- option_dependencies ❌
- package_prices ❌
- foil_prices ❌

### 3.2 Data Source Structure (data/ folder)

```
data/
├── _meta/              # Extraction metadata
├── _raw/               # Raw Excel parse results
├── categories/         # Per-category product data (12 files)
├── config/             # UI component config
├── exports/            # MES mapping exports
├── pricing/            # Price tables
│   ├── digital-print.json
│   ├── paper.json
│   ├── finishing.json
│   ├── binding.json
│   ├── foil.json
│   ├── imposition.json
│   └── products/       # Product-specific prices
├── products/           # Individual product files
└── scripts/            # Utility scripts
```

### 3.3 Data Folder Issues

1. **No version control**: Cannot determine data freshness
2. **Mixed raw/processed data**: `_raw/` and `categories/` coexist
3. **Stale data exists**: Old versions not removed
4. **Seed script incomplete**: Missing 10 table seeds

---

## 4. Shopby Integration Readiness

### 4.1 Ready Components

| Component | Status | Notes |
|-----------|--------|-------|
| shopby_id column | ✅ Ready | INTEGER nullable in products |
| MES integration tables | ✅ Ready | mes_items, product_mes_mapping |
| Order tables | ✅ Ready | orders, order_status_history, order_design_files |
| Widget tables | ✅ Ready | widgets |
| FK constraints | ✅ Ready | SPEC-DB-001 completed |

### 4.2 Missing Components

| Component | Priority | Impact |
|-----------|----------|--------|
| product_sizes data | **Critical** | Price calculation impossible |
| option system data | **Critical** | Widget option selection impossible |
| fixed_prices data | High | Direct-price products broken |
| materials data | Medium | Paper-only products work |
| package_prices data | Medium | Booklet pricing broken |
| foil_prices data | Low | Foil finishing optional |

---

## 5. Recommended Actions

### 5.1 Immediate (P0)

1. **Add seed logic for product_sizes**
   - Extract from data/products/*.json
   - Map size specs to product_sizes table

2. **Add seed logic for option system**
   - option_definitions from data/config/
   - product_options from data/products/*.json
   - option_choices from data/products/*.json

3. **Update SPEC-SHOPBY references**
   - SPEC-DATA-001 → SPEC-DATA-002
   - 323 → 221 products

### 5.2 Short-term (P1)

1. **Implement data versioning**
   - Add data/v1/, data/v2/ structure
   - Add manifest.json with version info

2. **Clean up data/ folder**
   - Archive old data to data/_archive/
   - Keep only latest validated data

3. **Add missing price tables**
   - fixed_prices seed logic
   - package_prices seed logic
   - foil_prices seed logic

### 5.3 Medium-term (P2)

1. **Add Shopby-specific tables**
   ```sql
   CREATE TABLE shopby_sync_log (
     id SERIAL PRIMARY KEY,
     entity_type VARCHAR(50) NOT NULL,
     entity_id INTEGER NOT NULL,
     shopby_id INTEGER,
     sync_status VARCHAR(20) NOT NULL,
     sync_at TIMESTAMPTZ DEFAULT NOW()
   );

   CREATE TABLE design_files (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     order_id INTEGER REFERENCES orders(id),
     original_name VARCHAR(500) NOT NULL,
     storage_type VARCHAR(10) NOT NULL,
     access_url TEXT NOT NULL,
     status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

---

## 6. Dependency Graph

```
SPEC-SHOPBY-001 (API Mapping)
    └── requires: SPEC-DATA-002 ✅

SPEC-SHOPBY-002 (Product Registration)
    └── requires: products ✅, product_sizes ❌, options ❌

SPEC-SHOPBY-003 (Widget SDK)
    └── requires: option_definitions ❌, product_options ❌

SPEC-SHOPBY-004 (Order/Payment)
    └── requires: orders ✅, products ✅

SPEC-SHOPBY-005 (File Management)
    └── requires: design_files (not created)

SPEC-SHOPBY-006 (Backoffice)
    └── requires: mes_items ✅, orders ✅
```

---

## 7. Blockers for SPEC-SHOPBY Implementation

| Blocker | Severity | SPEC Impact | Resolution |
|---------|----------|-------------|------------|
| product_sizes empty | **Critical** | 002, 003 | Add seed logic |
| option system empty | **Critical** | 002, 003 | Add seed logic |
| fixed_prices empty | High | 002 | Add seed logic |
| Wrong SPEC references | Medium | All | Update docs |
| No design_files table | Medium | 005 | Create table |

---

## 8. Conclusion

SPEC-SHOPBY-001~006 cannot be implemented until:

1. **product_sizes data is seeded** (Critical blocker)
2. **option system data is seeded** (Critical blocker)
3. **SPEC references are corrected** (Documentation fix)

Estimated effort to resolve blockers:
- Seed logic addition: 4-8 hours
- Data validation: 2-4 hours
- SPEC document updates: 1-2 hours

---

**Report Generated By:** MoAI
**Version:** 1.0.0
**Next Review:** After seed implementation
