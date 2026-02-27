# Widget Creator - Architecture Documentation (Codemaps)

**Last Updated:** 2026-02-27

## Overview

This directory contains comprehensive architecture documentation (Codemaps) for the Widget Creator project. All documents are in **English** and designed for engineers at all levels to understand the complete system.

---

## Documentation Files

### 1. 📋 overview.md — Architecture Overview (5 minutes)

**Purpose:** High-level understanding of the entire system

**Contains:**
- Project mission and tech stack
- System architecture diagram (Client → API → Core → DB)
- Core design patterns (6 key patterns)
- Key entry points
- Data flow highlights
- Technology decisions
- Quality assurance approach
- Recent enhancements (Feb 2026)
- Next steps for new engineers

**Audience:** Project newcomers, architects

**Read Time:** 10-15 minutes

---

### 2. 🏗️ modules.md — Module Inventory (30 minutes)

**Purpose:** Detailed description of each module's responsibility

**Contains:**
- **@widget-creator/core** (41 files) - Pure business logic
  - Pricing engine (7 models)
  - Options state machine
  - Constraints ECA evaluator
  - Quote management
  - Simulation engine

- **@widget-creator/db** (21 schema files) - Database layer
  - 6-layer schema architecture (26 tables)
  - Layer 01: Element types
  - Layer 02: Product composition
  - Layer 03: Business rules
  - Layer 04: Pricing configuration
  - Layer 05: Workflows
  - Layer 06: Transactions

- **@widget-creator/shared** (40+ files) - Data access + integrations
  - Drizzle ORM integration
  - MES adapter (manufacturing)
  - ShopBy adapter (ecommerce)
  - Edicus adapter (design editor)
  - Type definitions and schemas

- **@widget-creator/pricing-engine** (20+ files)
  - Widget-specific orchestration
  - Constraint and option evaluation
  - Real-time pricing

- **apps/web** (50+ files) - Main API server
  - 9 REST API endpoints
  - 32 tRPC routers
  - Authentication & middleware
  - Widget hosting

- **apps/admin** (60+ files) - Admin dashboard
  - 15+ page routes for CRUD
  - Forms with Zod validation
  - tRPC client integration
  - Multi-step wizard (SPEC-WA-001)

- **packages/widget** (50+ files) - Embeddable SDK
  - 10 UI components
  - Reactive state management (@preact/signals)
  - Shadow DOM isolation
  - IIFE bundle delivery

**Audience:** Developers, architects

**Read Time:** 30-40 minutes

---

### 3. 🔗 dependencies.md — Dependency Graph (25 minutes)

**Purpose:** Understand module dependencies and external integrations

**Contains:**
- Module dependency diagram (Mermaid)
- 5-layer dependency architecture
- Detailed analysis of each layer
- External system integrations (Shopby, MES, Edicus, OpenAI)
- Version compatibility
- Circular dependency prevention rules
- Import rules by package
- Dependency optimization strategies
- Security checklist
- Error resolution

**Audience:** Senior developers, DevOps, architects

**Read Time:** 25-30 minutes

---

### 4. 🎯 entry-points.md — API and Entry Points (20 minutes)

**Purpose:** See all ways to interact with the system

**Contains:**
- REST API endpoints (9 total)
  - POST /api/v1/pricing/quote (unified quote calculation)
  - POST /api/v1/orders (order creation)
  - GET /api/v1/catalog/* (product catalog)
  - GET /api/widget/* (widget configuration)
  - Integration endpoints (Shopby, MES, Edicus)

- tRPC Routers (32 total)
  - Product, Category, Option routers
  - Material, Paper routers
  - Pricing routers (5)
  - Constraint, Dependency routers
  - Order router
  - Dashboard router
  - Widget admin router (SPEC-WA-001)
  - GLM router (Natural language rule builder)

- Client entry points
  - Admin dashboard (http://localhost:3001)
  - Widget SDK initialization
  - CLI commands

- Security
  - Authentication & authorization
  - Rate limiting
  - Response codes

**Audience:** API integrators, frontend developers

**Read Time:** 20-30 minutes

---

### 5. 📊 data-flow.md — Data Flows and Processes (40 minutes)

**Purpose:** Trace how data moves through the system

**Contains:**
- 5 core data flows:
  1. **Unified Quote Pipeline** (300ms SLA)
     - Client-side constraint evaluation
     - Server-side validation
     - Real-time pricing
     - Redis caching

  2. **Order Creation Pipeline** (1-2s)
     - Quote validation
     - Price snapshot immutability
     - MES dispatch
     - Shopby synchronization

  3. **Widget Initialization Pipeline** (2-3s)
     - embed.js download
     - Shadow DOM setup
     - Configuration loading
     - Default quote rendering

  4. **Admin CRUD Pipeline** (1-2s)
     - tRPC routing
     - Database querying
     - UI updates

  5. **Data Synchronization Pipeline**
     - Shopby category/product sync
     - MES order dispatch & tracking
     - Edicus thumbnail rendering

- Database schema (table relationships)
- Caching strategies (Redis)
- Error handling & retry logic
- Circuit breaker pattern
- Data validation layers

**Audience:** Full-stack developers, system designers

**Read Time:** 40-50 minutes

---

## Quick Start Guide

### For New Developers (1 hour)
1. Read **overview.md** (10 min) - Get the big picture
2. Read **modules.md** (30 min) - Learn each module
3. Skim **entry-points.md** (15 min) - See the APIs
4. Start coding in `/packages/core/` (pure logic, no external dependencies)

### For API Integrators (45 minutes)
1. Quick scan **overview.md** (5 min)
2. Deep read **entry-points.md** (30 min) - Focus on REST APIs
3. Skim **data-flow.md** (10 min) - Understand the unified quote flow

### For System Architects (1.5 hours)
1. Read **overview.md** (15 min)
2. Deep read **dependencies.md** (30 min) - Understand architecture
3. Deep read **data-flow.md** (40 min) - System flows
4. Skim **modules.md** (15 min) - Module details

### For DevOps / Infrastructure (1 hour)
1. Skim **overview.md** (5 min)
2. Read **entry-points.md** section "Environment-Specific URLs" (5 min)
3. Read **dependencies.md** section "Dependency Versions" (10 min)
4. Read **data-flow.md** section "Caching Strategies" (10 min)
5. Review CLI commands in **entry-points.md** (5 min)

---

## Search Index

### Concepts
- **Constraints:** See modules.md (constraints/) + data-flow.md (ECA pattern)
- **Pricing:** See modules.md (pricing/) + entry-points.md (pricing routers)
- **Options:** See modules.md (options/) + data-flow.md
- **Orders:** See entry-points.md (order router) + data-flow.md (order creation)
- **Widget:** See modules.md (packages/widget) + data-flow.md (widget init)

### Technologies
- **Drizzle ORM:** dependencies.md (Layer 1)
- **tRPC:** entry-points.md (tRPC API Routers)
- **NextAuth:** dependencies.md (External System Integrations)
- **Preact:** modules.md (packages/widget)
- **TypeScript:** dependencies.md (Dependency Versions)

### APIs
- **Quote API:** entry-points.md (Quote Calculation API)
- **Order API:** entry-points.md (Order Creation API)
- **Widget Config:** entry-points.md (Widget Configuration API)
- **tRPC Routers:** entry-points.md (tRPC API Routers section)

### Integrations
- **Shopby:** modules.md (@widget-creator/shared) + dependencies.md
- **MES:** entry-points.md (Integration APIs) + data-flow.md
- **Edicus:** modules.md (@widget-creator/shared)
- **OpenAI:** dependencies.md (External System Integrations)

---

## Key Statistics

| Metric | Value |
|--------|-------|
| Total TypeScript Files | ~282 |
| Total Functions | 575+ |
| Total Types | 456+ |
| Total Tests | 450+ |
| Database Tables | 26 |
| REST Endpoints | 9 |
| tRPC Routers | 32 |
| UI Components | 10+ (widget) + 20+ (admin) |
| Test Coverage | 85%+ |

---

## Recent Updates (Feb 2026)

Seven major SPECs implemented:
- **SPEC-WB-002:** Product Category & Recipe System
- **SPEC-WB-003:** Constraint System (ECA Pattern)
- **SPEC-WB-004:** Pricing Rules & Calculation Engine
- **SPEC-WB-005:** Simulation Engine & Publish Workflow
- **SPEC-WB-006:** Runtime Auto-Quote Engine
- **SPEC-WB-007:** GLM Natural Language Rule Builder
- **SPEC-WA-001:** Widget Admin Dashboard (5-step wizard)

---

## Documentation Maintenance

### When to Update

Update these documents when:
1. New API endpoints added
2. New tRPC routers added
3. Database schema changes (tables, columns)
4. New external system integrations
5. Major version updates to dependencies
6. Data flow changes

### Update Process

1. Identify which document(s) need updates
2. Make changes following the existing structure
3. Update the "Last Updated" timestamp
4. For major changes, update multiple related documents
5. Submit PR with documentation changes

### Document Ownership

- **overview.md** - Architecture leads
- **modules.md** - Package maintainers
- **dependencies.md** - Technical leads
- **entry-points.md** - API owners
- **data-flow.md** - Full-stack team

---

## Additional Resources

### Project Documentation
- `.moai/project/structure.md` — Directory structure
- `.moai/project/product.md` — Production readiness status
- `README.md` (root) — Getting started guide

### Technical Documents
- `CLAUDE.md` — MoAI development methodology
- `.claude/rules/` — Coding standards and language rules
- `.moai/specs/SPEC-*` — Implementation specifications

### Code References
- `packages/core/src/index.ts` — Core API
- `apps/web/app/api/trpc/router.ts` — tRPC entry point
- `packages/widget/src/index.tsx` — Widget initialization

---

## FAQ

**Q: Where should I start if I'm new?**
A: Read overview.md first, then modules.md. Start coding in packages/core.

**Q: How do I understand the quote calculation?**
A: Read modules.md (pricing/) and data-flow.md (Unified Quote Pipeline section).

**Q: How do I integrate with Shopby?**
A: Read modules.md (@widget-creator/shared) and entry-points.md (Integration APIs).

**Q: What's the performance target for quote API?**
A: 300ms (99th percentile). See data-flow.md or overview.md.

**Q: How many database tables are there?**
A: 26 tables across 6 layers. See modules.md (@widget-creator/db).

**Q: Is the widget compatible with React?**
A: No, it uses Preact (3KB) for smaller bundle size. See modules.md (packages/widget).

---

## Feedback and Questions

Have questions about the architecture?

1. Check if the answer is in these codemaps (use Ctrl+F)
2. Review relevant .moai/specs/ documents
3. Ask your team lead or architect
4. Create an issue on GitHub (label: `docs`)

---

## Navigation

- [Overview](overview.md) - System architecture
- [Modules](modules.md) - Package descriptions
- [Dependencies](dependencies.md) - Dependency graph
- [Entry Points](entry-points.md) - APIs and routes
- [Data Flow](data-flow.md) - System processes

---

**Document Version:** 1.0

**Generated:** 2026-02-27

**Status:** Production Ready

**All documentation is in English.**
