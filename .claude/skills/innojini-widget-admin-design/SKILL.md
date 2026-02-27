---
name: innojini-widget-admin-design
description: >
  HuniPrinting Widget Admin design system skill. Provides project-specific design tokens,
  Toss/SEED-inspired admin UI principles, and layout patterns for the printing data management
  admin pages (apps/admin).

  Triggers: admin UI, 관리 페이지, design system, 디자인 토큰, 레이아웃, shadcn, globals.css,
  admin dashboard, 3-panel, 계층 탐색, category tree, 가격표, 옵션 관리
license: Apache-2.0
compatibility: Designed for Claude Code — innojini/widget.creator project
user-invocable: false
metadata:
  version: "1.0.0"
  category: "domain"
  status: "active"
  updated: "2026-02-27"
  tags: "admin, design-system, huni, printing, shadcn, tailwind, toss, seed"
  agent: "expert-frontend"

# MoAI Extension: Progressive Disclosure
progressive_disclosure:
  enabled: true
  level1_tokens: 120
  level2_tokens: 1800

# MoAI Extension: Triggers
triggers:
  keywords: ["admin", "관리 페이지", "design", "디자인", "레이아웃", "shadcn", "globals", "token", "토큰", "탭", "패널", "sidebar", "사이드바", "카테고리 트리", "계층"]
  agents: ["expert-frontend", "team-frontend-dev", "team-designer"]
  phases: ["run", "sync"]
---

# innojini Widget Admin Design System

**Project**: `apps/admin` (Next.js 14 + shadcn/ui + Tailwind v4)
**Source**: `apps/admin/src/styles/globals.css` — Pencil MCP Color Palette FM2Gq

---

## 1. Design Tokens (globals.css)

### Primary Palette (Violet — Toss-inspired trust color)
```
--primary-dark:    #351D87   (hover, pressed)
--primary:         #5538B6   (default, ring, sidebar-primary)
--primary-medium:  #7B68C8   (secondary actions)
--primary-light:   #9580D9   (tertiary)
--primary-200:     #C9C2DF
--primary-100:     #DED7F4
--primary-50:      #EEEBF9   (hover surface = --accent)
--primary-25:      #F4F0FF   (lightest tint)
--primary-foreground: #FFFFFF
```

### Semantic Colors
```
--warning:      #E6B93F   (foreground: #424242)
--success:      #7AC8C4   (foreground: #424242)
--error:        #C7000B   (foreground: #FFFFFF)
--brand-accent: #DF7939   (orange accent for highlight)
```

### Gray Scale (6-step)
```
--gray-50:  #F6F6F6   (background, muted, sidebar-accent)
--gray-100: #E9E9E9
--gray-200: #CACACA   (border, input)
--gray-400: #979797   (muted-foreground, placeholder)
--gray-600: #565656
--gray-700: #424242   (default foreground)
```

### Spacing & Radius (SEED-aligned 4px base)
```
--spacing:     4px   (base unit — all spacing in multiples of 4)
--radius-sm:   3px
--radius:      4px
--radius-md:   5px
--radius-pill: 20px
```

### Typography
```
font: 'Noto Sans', sans-serif
base-size: 14px
letter-spacing: -0.05em (tight Korean text)
```

---

## 2. Toss-Inspired Admin Principles

Five principles adapted from Toss Design System for the admin context:

### P1: Minimum Feature
- Show only what's needed for the current task
- No decorative elements — every pixel has purpose
- Default state = most common task visible immediately

### P2: Trust through Data Density
- Numbers prominently sized (larger than labels)
- Status badges use semantic colors (success/warning/error)
- Empty states must explain why and what to do next

### P3: Clear Action Hierarchy
- Primary action: 1 per screen (violet `--primary` fill button)
- Secondary action: ghost or outline variant
- Destructive: always `--error` color, always confirm dialog

### P4: Contextual Navigation
- Active route: `bg-primary/10 text-primary` (already in sidebar.tsx)
- Breadcrumb for 3-level hierarchy (카테고리 > 상품 > 속성)
- Auto-expand sidebar group on active child route

### P5: Efficient Data Management
- Inline edits preferred over modal dialogs for single-field changes
- Bulk actions visible only when rows selected
- Import/export always available in header actions

---

## 3. Admin Layout Patterns

### Standard Page Layout
```
┌─────────────────────────────────────────────┐
│ Header: title + primary action + breadcrumb │
├──────────────────────────────────┬──────────┤
│ Main Content Area (flex-1)       │ Optional │
│                                  │ Detail   │
│                                  │ Panel    │
└──────────────────────────────────┴──────────┘
```

### 3-Panel Layout (for hierarchy data — Category > Product > Detail)
```
┌──────────────┬──────────────────┬────────────┐
│ Category     │ Product List     │ Tab Detail │
│ Tree (w-56)  │ (flex-1)         │ (w-96)     │
│              │                  │            │
│ [카테고리]   │ 상품명 | 사이즈  │ Tab: 소재  │
│  └ [상품A]   │ ─────────────── │ Tab: 가격  │
│  └ [상품B]   │ 상품A  | 88×54  │ Tab: 옵션  │
│ [스티커]     │ 상품B  | 100×70 │ Tab: 제약  │
└──────────────┴──────────────────┴────────────┘
```

**Implementation:**
- Left panel: `w-56 border-r overflow-y-auto` — category tree with collapsible nodes
- Center panel: `flex-1 overflow-auto` — sortable/filterable product table
- Right panel: `w-96 border-l` — tabbed detail for selected product
- On mobile (`lg:hidden`): center panel full-width, right panel as drawer

### Tab Navigation (within detail panel)
Use shadcn `<Tabs>` for tabbed detail. Tab order for printing products:
1. **기본정보** (name, sizes, category, order method)
2. **소재·공정** (papers, print modes, post-processes, bindings)
3. **가격표** (fixed / package / foil / qty-discount)
4. **옵션·선택지** (option definitions, choices, display order)
5. **제약·의존성** (constraints, dependencies)
6. **MES 연동** (product mapping, choice mapping)

---

## 4. Data Table Patterns

### Coverage Status Badge
Use consistent status badges across all management pages:
```tsx
// Import coverage: 18/26 tables
<Badge variant="outline" className="text-success border-success">완료</Badge>
<Badge variant="outline" className="text-warning border-warning">일부</Badge>
<Badge variant="outline" className="text-destructive border-destructive">누락</Badge>
```

### Editable Cell (inline editing)
- Default: plain text display
- On hover: show pencil icon (opacity-0 group-hover:opacity-100)
- On click: `<Input>` replaces text, Escape cancels, Enter/blur saves
- Error state: `border-destructive focus-visible:ring-destructive`

---

## 5. Component Conventions

### Buttons
```tsx
// Primary — one per section
<Button>저장</Button>  // default = violet fill

// Secondary
<Button variant="outline">취소</Button>

// Destructive — always with confirmation
<Button variant="destructive">삭제</Button>
```

### Active State (sidebar/tabs)
```tsx
// Consistent with existing sidebar pattern
className="bg-primary/10 text-primary"    // active
className="text-muted-foreground hover:text-foreground"  // inactive
```

### Empty State
```tsx
<div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
  <Icon className="h-10 w-10 mb-3 opacity-40" />
  <p className="font-medium">데이터 없음</p>
  <p className="text-sm">엑셀을 가져오거나 직접 추가해주세요</p>
  <Button variant="outline" className="mt-4">추가하기</Button>
</div>
```

---

## Sources

- [Toss Design Conference](https://blog.toss.im/article/toss-design-conference)
- [SEED Design System GitHub](https://github.com/daangn/seed-design)
- [B2B Dashboard Best Practices 2025](https://uxdesign.cc/design-thoughtful-dashboards-for-b2b-saas-ff484385960d)
- Project tokens: `apps/admin/src/styles/globals.css`
- Sidebar: `apps/admin/src/components/layout/sidebar.tsx`
