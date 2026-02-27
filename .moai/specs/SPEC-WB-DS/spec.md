# SPEC-WB-DS: Widget Design System & Design Tokens

**Version:** 1.1.0
**Date:** 2026-02-26
**Status:** ACTIVE
**Scope:** All SPEC-WB-* UI implementation

**Changelog:**
- v1.1.0 (2026-02-26): Pencil MCP live design analysis — Primary palette expansion, Noto Sans confirmed, Semantic color values updated, component tokens added

---

## Purpose

This document is the **single source of truth** for all design tokens used across the Widget Builder system. All UI implementations MUST reference this document.

Two separate design systems coexist in this project:

| System | Where Used | Theme | Primary Color |
|--------|-----------|-------|--------------|
| **Widget Design System** | Customer-facing widget (SPEC-WB-006) | Light | `#5538B6` (Violet) |
| **Admin Design System** | Admin Console (SPEC-WB-005) | Industrial Dark | `#F59E0B` (Amber) |

---

## 1. Widget Design System (Customer UI)

Sources:
- `ref/figma/OVERVIEW.svg` (Figma export, initial extraction)
- `pencil-new.pen` (Pencil MCP live analysis, 2026-02-26) — **verified source**

### 1.1 Color Tokens

#### Brand / Primary Palette

Full purple scale verified via Pencil MCP (`pencil-new.pen` Color Palette frame):

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-primary-dark` | `#351d87` | Hover state for primary buttons, pressed state |
| `--color-primary` | `#5538b6` | CTA buttons, active borders, links, selected states |
| `--color-primary-light` | `#9580d9` | Hover surfaces, secondary indicators |
| `--color-primary-200` | `#c9c2df` | Dividers within primary context |
| `--color-primary-100` | `#ded7f4` | Light primary tint surfaces |
| `--color-primary-50` | `#eeebf9` | Primary tinted backgrounds, chip backgrounds |
| `--color-primary-25` | `#f4f0ff` | Faintest primary tint, hover background on white |

#### Accent Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-accent` | `#ee00ce` | Highlights, badges, promotional elements, price emphasis |
| `--color-accent-orange` | `#df7939` | Secondary actions, warm emphasis states |

#### Semantic Colors

Pencil MCP verified values (updated from Figma estimates):

| Token | Hex | Previous Estimate | Usage |
|-------|-----|------------------|-------|
| `--color-error` | `#c7000b` | `#EF4444` | Error states, validation messages |
| `--color-warning` | `#e6b93f` | `#F59E0B` | Warning messages, caution states |
| `--color-success` | `#7ac8c4` | `#22C55E` | Success states, confirmation |
| `--color-info` | `#3b82f6` | `#3B82F6` | Info messages (unchanged) |

#### Neutral Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-background` | `#ffffff` | Widget container background |
| `--color-surface-muted` | `#f6f6f6` | Page background, card backgrounds |
| `--color-border-light` | `#e9e9e9` | Subtle dividers, inner borders |
| `--color-border-default` | `#cacaca` | Default input/card borders |
| `--color-text-secondary` | `#979797` | Placeholder, hint text, helper text |
| `--color-text-medium` | `#565656` | Secondary body text |
| `--color-text-primary` | `#424242` | Body text, labels |
| `--color-overlay` | `#0000001a` | Modal/tooltip overlays (10% black) |
| `--color-text-inverse` | `#ffffff` | Text on primary/filled buttons |

---

### 1.2 Typography

Font family confirmed via Pencil MCP (Noto Sans detected on all text elements):

| Token | Value | Usage |
|-------|-------|-------|
| `--font-family-sans` | `'Noto Sans', -apple-system, sans-serif` | All UI text |
| `--font-size-xs` | `12px` | Badge labels, captions (assumed) |
| `--font-size-sm` | `14px` | Helper text, metadata |
| `--font-size-base` | `16px` | Body, input text |
| `--font-size-lg` | `20px` | Subheadings, section labels |
| `--font-size-xl` | `24px` | Page headings |
| `--font-size-2xl` | `36px` | Display headings, hero text |
| `--font-weight-regular` | `normal (400)` | Body text |
| `--font-weight-medium` | `500` | Labels, button text |
| `--font-weight-semibold` | `600` | Subheadings |
| `--font-weight-bold` | `700` | Price values, emphasized headings |
| `--line-height-normal` | `1.5` | Body text |
| `--line-height-tight` | `1.25` | Headings |

#### Typographic Scale

| Name | Size | Weight | Use Case |
|------|------|--------|----------|
| Display | 36px | 700 | Hero sections, price totals |
| Heading | 24px | 700 | Page titles |
| Title | 20px | 600 | Section headers |
| Body | 16px | 500 | Default body text |
| Caption | 14px | normal | Metadata, helper text |
| Label XS | 12px | normal | Badge text (assumed) |

---

### 1.3 Spacing & Sizing Tokens

#### Component Heights (from Figma SVG)

| Token | Value | Component |
|-------|-------|-----------|
| `--size-input-height` | `50px` | Text inputs, select boxes |
| `--size-button-filled-height` | `50px` | Primary (filled) buttons |
| `--size-button-outlined-height` | `49px` | Secondary (outlined) buttons |
| `--size-badge-height` | `20px` | Status badges, tags |
| `--size-table-row-height` | `46–51px` | Table / option list rows |
| `--size-icon-sm` | `14px` | Inline icons within badges |

#### Border Radius (Pencil MCP verified)

| Token | Value | Component |
|-------|-------|-----------|
| `--radius-sm` | `2px` | Small chips, inner elements |
| `--radius-default` | `4px` | Default (inputs, cards, badges) |
| `--radius-lg` | `5px` | Primary (filled) buttons |
| `--radius-button-outlined` | `4.5px` | Outlined (secondary) buttons |

#### Border Width (Pencil MCP verified)

| Token | Value | State |
|-------|-------|-------|
| `--border-default` | `1px` | Default border |
| `--border-active` | `2px` | Active / focused state |
| `--border-emphasis` | `7px` | Strong emphasis (e.g., callout left border) |

---

### 1.4 CSS Custom Properties (Implementation)

Add the following to the widget's Shadow DOM root:

```css
/* packages/widget/src/styles/tokens.css */
:host {
  /* === Primary / Brand === */
  --color-primary-dark:  #351d87;
  --color-primary:       #5538b6;
  --color-primary-light: #9580d9;
  --color-primary-200:   #c9c2df;
  --color-primary-100:   #ded7f4;
  --color-primary-50:    #eeebf9;
  --color-primary-25:    #f4f0ff;

  /* === Accent === */
  --color-accent:        #ee00ce;
  --color-accent-orange: #df7939;

  /* === Semantic === */
  --color-error:   #c7000b;
  --color-warning: #e6b93f;
  --color-success: #7ac8c4;
  --color-info:    #3b82f6;

  /* === Neutral === */
  --color-background:     #ffffff;
  --color-surface-muted:  #f6f6f6;
  --color-border-light:   #e9e9e9;
  --color-border-default: #cacaca;
  --color-text-secondary: #979797;
  --color-text-medium:    #565656;
  --color-text-primary:   #424242;
  --color-overlay:        #0000001a;
  --color-text-inverse:   #ffffff;

  /* === Typography === */
  --font-family-sans: 'Noto Sans', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-size-xs:   12px;
  --font-size-sm:   14px;
  --font-size-base: 16px;
  --font-size-lg:   20px;
  --font-size-xl:   24px;
  --font-size-2xl:  36px;
  --font-weight-regular:  400;
  --font-weight-medium:   500;
  --font-weight-semibold: 600;
  --font-weight-bold:     700;
  --line-height-normal: 1.5;
  --line-height-tight:  1.25;

  /* === Sizing === */
  --size-input-height:           50px;
  --size-button-filled-height:   50px;
  --size-button-outlined-height: 49px;
  --size-badge-height:           20px;
  --size-icon-sm:                14px;

  /* === Border Radius === */
  --radius-sm:               2px;
  --radius-default:          4px;
  --radius-lg:               5px;
  --radius-button-outlined:  4.5px;

  /* === Border Width === */
  --border-default:  1px;
  --border-active:   2px;
  --border-emphasis: 7px;
}
```

---

### 1.5 Tailwind Config Mapping

```js
// tailwind.config.widget.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#5538b6',
          dark:    '#351d87',
          light:   '#9580d9',
          200:     '#c9c2df',
          100:     '#ded7f4',
          50:      '#eeebf9',
          25:      '#f4f0ff',
        },
        accent: {
          DEFAULT: '#ee00ce',
          orange:  '#df7939',
        },
        error:   '#c7000b',
        warning: '#e6b93f',
        success: '#7ac8c4',
        info:    '#3b82f6',
        'text-primary':   '#424242',
        'text-medium':    '#565656',
        'text-secondary': '#979797',
        'text-inverse':   '#ffffff',
        'border-light':   '#e9e9e9',
        'border-default': '#cacaca',
        'surface-muted':  '#f6f6f6',
      },
      fontFamily: {
        sans: ['Noto Sans', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      fontSize: {
        xs:   '12px',
        sm:   '14px',
        base: '16px',
        lg:   '20px',
        xl:   '24px',
        '2xl': '36px',
      },
      borderRadius: {
        sm:          '2px',
        DEFAULT:     '4px',
        lg:          '5px',
        'btn-outline': '4.5px',
      },
      height: {
        input:  '50px',
        btn:    '50px',
        badge:  '20px',
      },
    },
  },
}
```

---

## 2. Admin Design System (Admin Console)

Maintained separately in **SPEC-WB-005 Section 0**. Summary reproduced here for cross-reference.

### 2.1 Admin Color Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Primary | `#F59E0B` (`amber-500`) | Action buttons, active states, highlights |
| Background | `#0a0a0a` | Page background |
| Surface | `#1a1a1a` | Card background |
| Surface 2 | `#262626` | Nested elements |
| Border | `#404040` | Card and input borders |
| Text | `#fafafa` | Primary text |
| Text secondary | `#a3a3a3` | Secondary / helper text |

### 2.2 Admin CSS Variables

```css
/* apps/admin/src/styles/globals.css */
:root {
  --background:  0 0% 4%;    /* #0a0a0a */
  --foreground:  0 0% 98%;   /* #fafafa */
  --primary:     38 92% 50%; /* #F59E0B amber-500 */
  --card:        0 0% 10%;   /* #1a1a1a */
  --border:      0 0% 25%;   /* #404040 */
  --muted:       0 0% 15%;   /* #262626 */
  --muted-foreground: 0 0% 64%; /* #a3a3a3 */
}
```

> **Full admin design system:** See SPEC-WB-005 Section 0.

---

## 3. Component Patterns

### 3.1 Widget Input Field

```
Default:
┌─────────────────────────────────────┐  ← border: 1px #cacaca, radius: 4px
│  Placeholder text (#979797)         │  ← height: 50px
└─────────────────────────────────────┘

Focus state:
┌═════════════════════════════════════┐  ← border: 2px #5538b6
│  Input value (#424242)              │
└═════════════════════════════════════┘
```

### 3.2 Widget Buttons

```
Primary (Filled):
┌─────────────────────────────────────┐  ← bg: #5538b6, radius: 5px
│  Button Text (#ffffff, weight:500)  │  ← height: 50px
└─────────────────────────────────────┘

  Hover: bg: #351d87

Secondary (Outlined):
┌─────────────────────────────────────┐  ← border: 1px #cacaca, radius: 4.5px
│  Button Text (#424242, weight:500)  │  ← height: 49px
└─────────────────────────────────────┘
```

### 3.3 Widget Badge / Chip

```
┌──────────┐  ← border: 1px solid, radius: 4px, height: 20px
│  Label   │  ← font-size: 14px, padding: 0 8px
└──────────┘
  Active:   border-color: #5538b6, text: #5538b6, bg: #eeebf9
  Default:  border-color: #cacaca, text: #979797
  Accent:   bg: #ee00ce, text: #ffffff
```

### 3.4 Callout / Alert

```
┌──────────────────────────────────────┐
┃  ← left border: 7px #5538b6 (emphasis)
│  Callout text (#424242)              │  ← bg: #eeebf9 or #f4f0ff
└──────────────────────────────────────┘

  Warning callout: left border: #e6b93f, bg: #fff8e1 (estimated)
  Error callout:   left border: #c7000b, bg: #fff0f0 (estimated)
```

---

## 4. Design System Governance

### 4.1 Which SPEC References Which Design System

| SPEC | UI Target | Design System to Use |
|------|-----------|---------------------|
| SPEC-WB-001 | Data/Schema only | — |
| SPEC-WB-002 | Data/Schema only | — |
| SPEC-WB-003 | Data/Schema only | — |
| SPEC-WB-004 | Data/Schema only | — |
| **SPEC-WB-005** | Admin Console | **Admin Design System** (Section 2 above) |
| **SPEC-WB-006** | Customer Widget | **Widget Design System** (Section 1 above) |

### 4.2 Source of Truth

| System | Primary Source | Secondary Source |
|--------|---------------|-----------------|
| Widget | `pencil-new.pen` (Pencil MCP, verified 2026-02-26) | `ref/figma/OVERVIEW.svg` (Figma export) |
| Admin | SPEC-WB-005 Section 0 | Industrial dark theme |

### 4.3 Update Policy

- Widget tokens are updated by re-running Pencil MCP `get_variables` + `search_all_unique_properties` on the active `.pen` file
- Admin design tokens MUST be updated when SPEC-WB-005 Section 0 changes
- Both systems are maintained independently — do NOT mix tokens between systems
- When adding new tokens, update this document first, then reference from the implementation

---

## 5. EARS Requirements

### FR-WB-DS-01: Widget CSS Variables

**[THE WIDGET SHALL]** expose all color and sizing tokens as CSS custom properties on the `:host` element in the Shadow DOM root, using the names defined in Section 1.4.

### FR-WB-DS-02: Tailwind Configuration

**[THE WIDGET BUILD SYSTEM SHALL]** map design tokens to Tailwind theme extensions as defined in Section 1.5, so component authors can use utility classes (e.g., `text-primary`, `bg-primary`, `h-input`).

### FR-WB-DS-03: Token Consistency

**[THE SYSTEM SHALL]** never use hardcoded hex values in component source code. All color references MUST use the CSS custom property or Tailwind token name from this document.

### FR-WB-DS-04: Focus State

**[ALL INTERACTIVE ELEMENTS SHALL]** use `--color-border-active` (`#5538b6`) with `--border-active` (`2px`) width when focused or in active/selected state.

### FR-WB-DS-05: Font Family

**[THE WIDGET SHALL]** load and apply `Noto Sans` as the primary font via `--font-family-sans`, with system font fallbacks for offline resilience.

### FR-WB-DS-06: Primary Palette Availability

**[THE SYSTEM SHALL]** expose the full 7-step primary purple scale (`--color-primary-25` through `--color-primary-dark`) so component authors can implement hover, active, and surface states without hardcoding values.

---

## 6. Acceptance Criteria

- [ ] **AC-WB-DS-01**: All CSS variables from Section 1.4 are defined in Shadow DOM `:host`
- [ ] **AC-WB-DS-02**: No hardcoded hex color values in `packages/widget/src/**/*.tsx`
- [ ] **AC-WB-DS-03**: Input height renders at exactly 50px on all browsers (Chrome, Safari, Firefox)
- [ ] **AC-WB-DS-04**: Primary button renders at 50px height with 5px border radius
- [ ] **AC-WB-DS-05**: Focused inputs show 2px `#5538b6` border
- [ ] **AC-WB-DS-06**: Badge renders at 20px height with 4px border radius
- [ ] **AC-WB-DS-07**: Noto Sans is applied to all widget text elements
- [ ] **AC-WB-DS-08**: Full primary palette (7 steps) is accessible via CSS custom properties

---

*SPEC-WB-DS v1.1.0 — Tokens verified via Pencil MCP live analysis (2026-02-26)*
*Widget tokens: purple light theme (#5538b6) | Admin tokens: amber dark theme (#F59E0B)*
