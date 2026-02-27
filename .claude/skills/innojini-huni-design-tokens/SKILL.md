---
name: innojini-huni-design-tokens
description: >
  HuniPrinting Widget Admin design token reference for the violet-based design system.
  Provides complete CSS custom properties, Tailwind v4 utility mappings, component variant
  specifications, and accessibility guidance sourced from globals.css and Pencil MCP Color
  Palette frame FM2Gq. Use when building or styling any Widget Admin component, applying
  color tokens, selecting typography scales, or implementing button/badge/input/select/tabs
  variants consistent with the Huni design system.
license: Apache-2.0
compatibility: Designed for Claude Code - Widget Admin (Next.js + Tailwind v4 + shadcn/ui)
allowed-tools: Read, Grep, Glob
user-invocable: false
metadata:
  version: "1.0.0"
  category: "design"
  status: "active"
  updated: "2026-02-27"
  modularized: "false"
  tags: "design-tokens, tailwind, css-variables, huni, widget-admin, colors, typography"
  related-skills: "innojini-widget-admin-design, innojini-printly-design-system"
  context: "Pencil MCP Color Palette frame FM2Gq - source of truth for all color values"
  argument-hint: "[component-name or token-category]"

# MoAI Extension: Progressive Disclosure
progressive_disclosure:
  enabled: true
  level1_tokens: 100
  level2_tokens: 4800

# MoAI Extension: Triggers
triggers:
  keywords:
    - "design token"
    - "color palette"
    - "primary color"
    - "button variant"
    - "badge variant"
    - "input style"
    - "select style"
    - "tabs style"
    - "typography"
    - "border radius"
    - "spacing"
    - "huni design"
    - "widget admin"
    - "tailwind class"
    - "css variable"
    - "bg-primary"
    - "text-primary"
    - "brand-accent"
  agents:
    - "expert-frontend"
    - "team-designer"
    - "team-frontend-dev"
  phases:
    - "run"
---

# HuniPrinting Widget Admin Design Tokens

Source of truth: `apps/admin/src/styles/globals.css` + Pencil MCP Color Palette frame **FM2Gq**

All tokens are defined as CSS custom properties in `:root` and exposed as Tailwind v4 utilities
via `@theme inline`. Never hardcode hex values — always use the token name.

---

## Quick Reference

### Primary Color Scale (Violet)

| Token (CSS var)    | Tailwind Class          | Hex       | Usage                              |
|--------------------|-------------------------|-----------|------------------------------------|
| `--primary`        | `bg-primary`            | `#5538B6` | Primary actions, active states     |
| `--primary-dark`   | `bg-primary-dark`       | `#351D87` | Hover state for primary buttons    |
| `--primary-medium` | `bg-primary-medium`     | `#7B68C8` | Secondary emphasis                 |
| `--primary-light`  | `bg-primary-light`      | `#9580D9` | Decorative, icon fills             |
| `--primary-200`    | `bg-primary-200`        | `#C9C2DF` | Disabled primary, subtle borders   |
| `--primary-100`    | `bg-primary-100`        | `#DED7F4` | Hover on secondary button          |
| `--primary-50`     | `bg-primary-50`         | `#EEEBF9` | Accent/hover surface, secondary bg |
| `--primary-25`     | `bg-primary-25`         | `#F4F0FF` | Lightest tint, very subtle surface |
| `--primary-foreground` | `text-primary-foreground` | `#FFFFFF` | Text on primary bg             |

### Semantic Colors

| Token              | Tailwind                    | Hex       | Foreground | Usage              |
|--------------------|-----------------------------|-----------|------------|--------------------|
| `--warning`        | `bg-warning`                | `#E6B93F` | `#424242`  | Warnings, cautions |
| `--success`        | `bg-success`                | `#7AC8C4` | `#424242`  | Success states     |
| `--error`          | `bg-error`                  | `#C7000B` | `#FFFFFF`  | Errors, critical   |
| `--brand-accent`   | `bg-brand-accent`           | `#DF7939` | `#FFFFFF`  | Highlights, CTAs   |
| `--destructive`    | `bg-destructive`            | `#C7000B` | `#FFFFFF`  | shadcn destructive |

### Grayscale (6-Step)

| Token        | Tailwind       | Hex       | Usage                            |
|--------------|----------------|-----------|----------------------------------|
| `--gray-50`  | `bg-gray-50`   | `#F6F6F6` | Disabled bg, secondary surface   |
| `--gray-100` | `bg-gray-100`  | `#E9E9E9` | Subtle borders, tab divider      |
| `--gray-200` | `bg-gray-200`  | `#CACACA` | Border color, input border       |
| `--gray-400` | `bg-gray-400`  | `#979797` | Muted/placeholder text           |
| `--gray-600` | `bg-gray-600`  | `#565656` | Secondary text                   |
| `--gray-700` | `bg-gray-700`  | `#424242` | Default foreground, body text    |

### shadcn Semantic Tokens

| Token                   | Tailwind                    | Value              |
|-------------------------|-----------------------------|--------------------|
| `--background`          | `bg-background`             | `#FFFFFF`          |
| `--foreground`          | `text-foreground`           | `#424242`          |
| `--border`              | `border-border`             | `#CACACA`          |
| `--input`               | `border-input`              | `#CACACA`          |
| `--ring`                | `ring-ring`                 | `#5538B6`          |
| `--accent`              | `bg-accent`                 | `#EEEBF9`          |
| `--accent-foreground`   | `text-accent-foreground`    | `#5538B6`          |
| `--muted`               | `bg-muted`                  | `#F6F6F6`          |
| `--muted-foreground`    | `text-muted-foreground`     | `#979797`          |
| `--secondary`           | `bg-secondary`              | `#F6F6F6`          |
| `--secondary-foreground`| `text-secondary-foreground` | `#424242`          |

---

## Implementation Guide

### Typography

- **Font family**: `Noto Sans` — apply via `font-sans` or body default
- **Base size**: `14px` (body default set in `globals.css`)
- **Letter spacing**: `-0.05em` — apply `tracking-[-0.05em]` or `tracking-tight`
- **Font weights**: `400` (regular), `500` (medium), `600` (semibold)
- All text components include `tracking-[-0.05em]` by default — do not omit

### Spacing System

- **Base unit**: `4px` (`--spacing: 4px`)
- Use standard Tailwind spacing: `p-1`=4px, `p-2`=8px, `p-4`=16px, `p-6`=24px
- Component inner padding standard: `px-4 py-2` for default, `px-3` for compact

### Border Radius Scale

| Token          | Tailwind        | Value  | Usage                         |
|----------------|-----------------|--------|-------------------------------|
| `--radius-sm`  | `rounded-sm`    | `3px`  | Badge (radius-[4px]), chips   |
| `--radius`     | `rounded-lg`    | `4px`  | Badge default                 |
| `--radius-md`  | `rounded-md`    | `5px`  | Button, Input, Select default |
| `--radius-pill`| `rounded-pill`  | `20px` | Pill badges, chips            |

Note: Components use `rounded-[5px]` (radius-md) as the primary interactive element radius.

---

### Button Component Variants

File: `apps/admin/src/components/ui/button.tsx`

Base classes (always present): `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[5px] text-sm font-medium tracking-[-0.05em] transition-colors focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50`

| Variant       | Background          | Text                    | Border              | Hover                      |
|---------------|---------------------|-------------------------|---------------------|----------------------------|
| `default`     | `bg-primary`        | `text-primary-foreground` | none              | `hover:bg-primary-dark`    |
| `destructive` | `bg-destructive`    | `text-destructive-foreground` | none          | `hover:bg-destructive/90`  |
| `outline`     | `bg-background`     | `text-primary`          | `border-primary`    | `hover:bg-primary-50`      |
| `secondary`   | `bg-primary-50`     | `text-primary`          | none                | `hover:bg-primary-100`     |
| `ghost`       | `bg-transparent`    | `text-gray-700`         | `border-gray-200`   | `hover:bg-gray-50`         |
| `neutral`     | `bg-gray-200`       | `text-gray-700`         | none                | `hover:bg-gray-100`        |
| `link`        | none                | `text-primary`          | none                | `hover:underline`          |

Button Sizes:

| Size      | Classes             |
|-----------|---------------------|
| `default` | `h-10 px-4 py-2`    |
| `sm`      | `h-8 px-3 text-xs`  |
| `lg`      | `h-[50px] px-6`     |
| `icon`    | `h-10 w-10`         |

---

### Badge Component Variants

File: `apps/admin/src/components/ui/badge.tsx`

Base classes: `inline-flex items-center rounded-[4px] border px-2 py-0.5 text-xs font-medium tracking-[-0.05em]`

| Variant       | Background        | Text                        | Border              |
|---------------|-------------------|-----------------------------|---------------------|
| `default`     | `bg-primary`      | `text-primary-foreground`   | `border-transparent`|
| `warning`     | `bg-warning`      | `text-warning-foreground`   | `border-transparent`|
| `success`     | `bg-success`      | `text-success-foreground`   | `border-transparent`|
| `destructive` | `bg-destructive`  | `text-destructive-foreground`| `border-transparent`|
| `outline`     | none              | `text-foreground`           | `border-border`     |
| `secondary`   | `bg-secondary`    | `text-secondary-foreground` | `border-transparent`|

---

### Input Component

File: `apps/admin/src/components/ui/input.tsx`

Classes: `flex h-10 w-full rounded-[5px] border border-input bg-transparent px-3 py-1 text-sm tracking-[-0.05em] placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring disabled:bg-gray-50 disabled:opacity-50`

Key tokens used:
- Border: `border-input` → `#CACACA`
- Focus ring: `ring-ring` → `#5538B6`
- Placeholder: `text-muted-foreground` → `#979797`
- Disabled bg: `bg-gray-50` → `#F6F6F6`

---

### Select Component

File: `apps/admin/src/components/ui/select.tsx`

Trigger classes (same as Input): `flex h-10 w-full rounded-[5px] border border-input bg-transparent px-3 py-2 text-sm tracking-[-0.05em] focus:ring-1 focus:ring-ring disabled:bg-gray-50 disabled:opacity-50`

Dropdown item hover: `focus:bg-accent focus:text-accent-foreground`
- Accent: `#EEEBF9` (primary-50) with `#5538B6` text

---

### Tabs Component

File: `apps/admin/src/components/ui/tabs.tsx`

Pattern: Underline-style tabs (Pencil frame NWKZz), NOT box-style

TabsList: `inline-flex items-end border-b border-gray-100`

TabsTrigger states:
- Default: `text-muted-foreground border-b-2 border-transparent`
- Hover: `hover:text-foreground`
- Active: `data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:font-medium`

Active tab uses `border-primary` (`#5538B6`) underline + `text-primary` (`#5538B6`)

---

### Sidebar Tokens

| Token                          | Value     | Usage                      |
|-------------------------------|-----------|----------------------------|
| `--sidebar-background`         | `#FAFAFA` | Slightly off-white (vs `#FFFFFF` page bg) |
| `--sidebar-foreground`         | `#424242` | Sidebar text               |
| `--sidebar-primary`            | `#5538B6` | Active nav item            |
| `--sidebar-primary-foreground` | `#FFFFFF` | Active nav text            |
| `--sidebar-accent`             | `#F6F6F6` | Hover surface in sidebar   |
| `--sidebar-border`             | `#CACACA` | Sidebar divider            |

---

## Advanced Patterns

### Accessibility — Contrast Ratios

| Combination                          | Ratio  | WCAG   |
|--------------------------------------|--------|--------|
| `#FFFFFF` on `#5538B6` (primary)     | 7.2:1  | AAA    |
| `#424242` on `#E6B93F` (warning)     | 5.1:1  | AA     |
| `#424242` on `#7AC8C4` (success)     | 4.8:1  | AA     |
| `#FFFFFF` on `#C7000B` (error)       | 5.9:1  | AA     |
| `#FFFFFF` on `#DF7939` (brand-accent)| 3.2:1  | AA Large only |
| `#424242` on `#FFFFFF` (body text)   | 9.7:1  | AAA    |
| `#979797` on `#FFFFFF` (muted text)  | 3.9:1  | AA Large only — use sparingly |

Brand-accent (`#DF7939`) on white does not meet AA for small text. Use only for large text or
decorative elements. For interactive labels, prefer primary (`#5538B6`).

### Token Naming Convention

CSS custom properties follow three patterns:
1. **Scale tokens**: `--primary`, `--primary-50` through `--primary-dark`
2. **Semantic tokens**: `--warning`, `--success`, `--error`, `--brand-accent` (with `-foreground` pairs)
3. **shadcn alias tokens**: `--background`, `--foreground`, `--border`, `--input`, `--ring`, `--accent`

Always prefer semantic tokens in component code. Use scale tokens only when the semantic
token does not cover the required shade.

### Common Patterns

Status badge selection:
- Pending/Draft → `variant="secondary"` (gray)
- Active/Published → `variant="default"` (primary violet)
- Warning/Review → `variant="warning"` (gold)
- Success/Complete → `variant="success"` (teal)
- Error/Failed → `variant="destructive"` (red)

Button hierarchy:
- Primary CTA → `variant="default" size="lg"` (h-50px, violet)
- Secondary CTA → `variant="outline"` or `variant="secondary"`
- Cancel/Neutral → `variant="ghost"` or `variant="neutral"`
- Dangerous action → `variant="destructive"`

Form field standard pattern:
- Input + label: `space-y-1.5`, label `text-sm font-medium text-foreground`
- Error state: add `border-destructive` class to Input, error msg in `text-destructive text-xs`
- Disabled state: `disabled` prop auto-applies `bg-gray-50 opacity-50`

---

## Works Well With

- `innojini-widget-admin-design` — Widget Admin layout and page patterns
- `innojini-printly-design-system` — Extended design system guidelines
- Pencil MCP — Read/write `.pen` files for visual design sync (frame FM2Gq = Color Palette)
- `expert-frontend` — Component implementation using these tokens
- `team-designer` — Design token validation and Pencil sync
