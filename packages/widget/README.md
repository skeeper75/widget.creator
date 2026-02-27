# @widget-creator/widget

Embeddable Widget SDK for Widget Creator platform.

## Features

- **Lightweight**: < 50KB gzipped (target: ~34KB)
- **Isolated**: Shadow DOM for CSS/DOM isolation
- **Reactive**: Preact Signals for state management
- **Themed**: CSS Custom Properties for theming
- **Typed**: Full TypeScript support

## Installation

```bash
pnpm install
```

## Usage

### Embed Script

```html
<script
  src="https://widget.huni.co.kr/embed.js"
  data-widget-id="wgt_xxxxx"
  data-product-id="42"
  data-theme-primary="#5538B6"
  data-theme-radius="4px"
  async
></script>
```

### Events

```javascript
document.addEventListener('widget:loaded', (e) => {
  console.log('Widget loaded:', e.detail);
});

document.addEventListener('widget:quote-calculated', (e) => {
  console.log('Quote:', e.detail);
});

document.addEventListener('widget:add-to-cart', (e) => {
  console.log('Add to cart:', e.detail);
});
```

## Development

```bash
# Start dev server
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Check bundle size
pnpm bundle:size
```

## Architecture

```
packages/widget/
├── src/
│   ├── index.ts           # Entry point
│   ├── embed.ts           # Script tag parser
│   ├── app.tsx            # Root component
│   ├── primitives/        # 7 Primitive Components
│   ├── components/        # 10 Domain Components
│   ├── screens/           # 11 Screen Configurations
│   ├── state/             # Preact Signals state
│   ├── engine/            # Option & Price engines
│   ├── api/               # API client
│   ├── styles/            # CSS
│   ├── utils/             # Utilities
│   └── types/             # TypeScript types
└── __tests__/             # Test files
```

## Bundle Budget

| Component | Target (gzipped) |
|-----------|-----------------|
| Preact runtime | ~3KB |
| Preact Signals | ~1KB |
| Core engine | ~8KB |
| Primitives | ~5KB |
| Domain components | ~8KB |
| Active screen | ~3KB |
| State + API | ~4KB |
| Styles | ~2KB |
| **Total** | **~34KB** |

## License

Apache-2.0
