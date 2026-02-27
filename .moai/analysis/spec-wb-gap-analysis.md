# SPEC-WB* Gap Analysis & Rebuild Decision
## Date: 2026-02-26

## Decision: Full Rebuild based on SPEC-WB*

User decision: Delete all Docker tables, rebuild from scratch using SPEC-WB* as foundation.
Schema location: `packages/db/` NEW package.
Rationale: huni-* schema and WB-* domain model are fundamentally different designs.

---

## 1. Core Path Discrepancy

| SPEC References | Actual Code Location |
|---|---|
| `packages/db/src/schema/widget/` | `packages/shared/src/db/schema/huni-*.ts` |
| `packages/widget-api/src/` | `packages/core/src/` + `apps/web/app/api/` |

Neither `packages/db` nor `packages/widget-api` exist. All SPEC-WB statuses "COMPLETED" but actual code is in different structure.

---

## 2. Implementation Completeness (Actual)

| Layer | Completeness | Key Gaps |
|---|---|---|
| DB Schema | 60% | product_recipes, constraint_rules, simulation tables missing |
| Core Library | 75% | ECA pattern mismatch, filterOptionChoices stub |
| Widget UI | 70% | 8/11 screens missing, ConstraintEngine NOT connected to UI |
| Shopby Integration | 85% | Comprehensive but price source discrepancy |
| Admin Console | 30% | SPEC-WB-005 not fully implemented |
| Quote API Integration | 50% | Server logic exists but widget doesn't call it |

---

## 3. Critical Issues

### [CRITICAL]
1. Widget ↔ ConstraintEngine disconnected (OptionEngine.resolve() not called from UI)
2. Widget ↔ Quote API not integrated (local price calc only, no server validation)

### [HIGH]
3. DB: product_recipes, constraint_rules, simulation_runs tables missing
4. SPEC-WB-003 ECA (json-rules-engine) vs current custom handler mismatch
5. OptionEngine.filterOptionChoices, isChoiceSelected are stubs (pass-through)

### [MEDIUM]
6. 8/11 screens not implemented (Book, Calendar, Sticker, etc.)
7. Admin Console 6-step wizard incomplete
8. Price source discrepancy (PriceEngine vs Shopby)

---

## 4. Reusable Assets (~80% of codebase)

| Asset | Lines | Action |
|---|---|---|
| packages/widget/src/shopby/ | 7,151 | 95% keep, API URL update only |
| packages/widget/src/upload/ | 3,023 | 100% keep |
| packages/widget/src/primitives/ | 822 | 100% keep |
| packages/widget/src/components/ | 711 | 80% keep, props type update |
| apps/admin/ UI components | ~15,000 | 70% keep, API calls update |
| Monorepo infrastructure | - | 100% keep |
| **Total reuse** | **~26,700** | ~80% |
| **New code** | **~8,000-12,000** | DB + API + Services |

---

## 5. Implementation Phases

### Phase 1: packages/db Setup (WB-001 → 006)
```
packages/db/
├── src/schema/widget/
│   ├── 01-element-types.ts      # option_element_types, option_element_choices
│   ├── 02-products.ts           # products, product_categories, product_recipes
│   ├── 02-recipe-bindings.ts    # recipe_option_bindings, recipe_choice_restrictions
│   ├── 03-constraints.ts        # constraint_rules (ECA/json-rules-engine)
│   ├── 04-pricing.ts            # print_cost_base, postprocess_cost, qty_discount
│   ├── 05-simulation.ts         # simulation_runs, simulation_cases, publish_history
│   ├── 06-orders.ts             # wb_orders, wb_quote_logs
│   └── index.ts
├── src/seed/
│   ├── seed-element-types.ts    # 12 standard types
│   ├── seed-categories.ts       # 11 Figma categories
│   └── seed-constraint-templates.ts
├── drizzle.config.ts
└── package.json
```

### Phase 2: packages/widget-api Setup
- ConstraintService (json-rules-engine ECA)
- PricingService (4 Strategy: LOOKUP/AREA/PAGE/COMPOSITE)
- QuoteService (300ms SLA)
- SimulationService (cartesian product)
- OrderService + MES dispatch

### Phase 3: Widget Connection
- engine/ → Quote API integration
- 11 screens implementation
- ConstraintEngine → UI disabled states

### Phase 4: Admin Console
- 6-step wizard (Products → Options → Pricing → Constraints → Simulation → Publish)
- react-querybuilder integration

---

## 6. SPEC-WB Schema Issues (from expert-backend)

| Issue | Recommendation |
|---|---|
| recipe_choice_restrictions JSONB array | Separate table for referential integrity |
| edicus_code IMMUTABLE not enforced | PostgreSQL trigger required |
| wb_orders missing indexes | Add shopby_order_id, mes_order_id indexes |
| wb_quote_logs.expires_at no index | Required for TTL cleanup job |
| event_type incomplete | Add quantity_changed event type |
| papers/materials not in WB-* | Needs separate review |

---

## 7. Table Creation Order (dependency)

```
Level 1 (independent): option_element_types, product_categories
Level 2: option_element_choices, wb_products
Level 3: product_recipes, print_cost_base
Level 4: recipe_option_bindings, recipe_choice_restrictions, constraint_rules,
         postprocess_cost, qty_discount
Level 5: simulation_runs, simulation_cases, publish_history, wb_orders, wb_quote_logs
```

---

## 8. DB Initialization Command
```bash
docker compose down -v  # Delete all tables
docker compose up -d    # Restart DB
cd packages/db
pnpm drizzle-kit push   # Apply new schemas
pnpm db:seed            # Insert seed data
```
