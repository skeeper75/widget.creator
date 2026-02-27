# expert-frontend Agent Memory

## Project: Widget Admin (apps/admin)

### Design Token Skill
- Skill location: `.claude/skills/innojini-huni-design-tokens/SKILL.md`
- CSS source: `apps/admin/src/styles/globals.css`
- Primary: `#5538B6` (violet), hover: `#351D87`
- Focus ring standard: `ring-1` (NOT ring-2)
- Border radius for interactive elements: `rounded-[5px]` (5px = radius-md)
- Typography tracking: `tracking-[-0.05em]` on ALL text-bearing components

### UI Components Location
`apps/admin/src/components/ui/`

### Design Token Compliance Status (last reviewed 2026-02-27)

**Compliant (no changes needed):**
- `button.tsx` - all variants correct, ring-1, rounded-[5px], tracking applied
- `input.tsx` - correct border-input, ring-1, rounded-[5px], tracking
- `select.tsx` - correct trigger styling, ring-1, rounded-[5px], tracking
- `tabs.tsx` - underline-style tabs correct, ring-1 applied (fixed)

**Fixed in this session:**
- `badge.tsx` - changed focus:ring-2 -> focus:ring-1
- `tabs.tsx` (TabsContent) - changed focus-visible:ring-2 -> focus-visible:ring-1
- `alert.tsx` - added rounded-[5px], text-sm, tracking-[-0.05em]; removed dark: variants; AlertTitle tracking fixed
- `callout.tsx` - replaced hardcoded `bg-[#FDF8E7]` / `bg-[#FEF2F2]` / `text-[#7A6020]` with token-based `bg-warning/15`, `bg-error/10`, `text-warning-foreground`, `text-error`
- `dropdown-menu.tsx` - added tracking-[-0.05em] to SubTrigger, Item, CheckboxItem, RadioItem, Label
- `table.tsx` - added tracking-[-0.05em] to table base

### Common Patterns
- All menus/dropdowns use `focus:bg-accent focus:text-accent-foreground` (hover = primary-50 bg)
- Disabled state: `disabled:bg-gray-50 disabled:opacity-50`
- Shadows on dropdowns: `shadow-md` (dropdown) or `shadow-sm` (subtle)
- Callout warning icon: AlertTriangle; info/error icon: AlertCircle

### Key Token Mapping Notes
- `bg-muted` = `#F6F6F6` (gray-50 alias)
- `bg-accent` = `#EEEBF9` (primary-50 alias) with `text-accent-foreground` = `#5538B6`
- `border-border` = `border-input` = `#CACACA`
