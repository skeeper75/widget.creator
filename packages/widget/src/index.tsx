/**
 * Widget Entry Point - Bootstrap and mount Preact app
 * @see SPEC-WIDGET-SDK-001 Section 4.2.2
 */

import { render } from 'preact';
import { WidgetShell } from './app';
import { parseScriptAttributes, getProductConfigUrl } from './embed';
import {
  createShadowContainer,
  generateCSSVariables,
  injectBaseStyles,
  createMountPoint,
  widgetEvents,
} from './utils';
import {
  initWidgetState,
  setWidgetStatus,
  setSizeId,
  setPaperId,
  setQuantity,
  setPostProcess,
  selections,
  price,
  hasRequiredSelections,
} from './state';
import type { ScreenType, ProductSize, PaperOption, PostProcessGroup } from './types';

/**
 * Mock product data for development
 */
function getMockProductData(_screenType: ScreenType) {
  return {
    sizes: [
      { id: 1, name: 'A4', width: 210, height: 297, isCustom: false },
      { id: 2, name: 'A3', width: 297, height: 420, isCustom: false },
      { id: 3, name: 'B5', width: 176, height: 250, isCustom: false },
    ] as ProductSize[],
    papers: [
      { id: 1, name: '모조지 80g', color: '#FFFFFF', coverType: null },
      { id: 2, name: '모조지 100g', color: '#FFFFF0', coverType: null },
      { id: 3, name: '아트지 150g', color: '#F5F5F5', coverType: null },
    ] as PaperOption[],
    postProcessGroups: [
      {
        key: 'foil',
        label: '박',
        options: [
          { id: 1, code: 'gold', name: '금박', optionKey: 'foil', sortOrder: 1 },
          { id: 2, code: 'silver', name: '은박', optionKey: 'foil', sortOrder: 2 },
        ],
        selectedCode: null,
      },
      {
        key: 'emboss',
        label: '형압',
        options: [
          { id: 3, code: 'emboss', name: '형압', optionKey: 'emboss', sortOrder: 1 },
        ],
        selectedCode: null,
      },
    ] as PostProcessGroup[],
  };
}

/**
 * Main bootstrap function
 */
async function bootstrap(): Promise<void> {
  // Parse configuration from script tag
  const config = parseScriptAttributes();

  if (!config) {
    console.error('[HuniWidget] Failed to parse widget configuration');
    return;
  }

  // Create Shadow DOM container
  const { shadowRoot } = createShadowContainer(config);

  // Inject base styles with CSS variables
  const cssVariables = generateCSSVariables(config);
  injectBaseStyles(shadowRoot, cssVariables);

  // Create mount point
  const mountPoint = createMountPoint(shadowRoot);

  // Determine screen type (default to PRINT_OPTION for now)
  const screenType: ScreenType = 'PRINT_OPTION';

  // Initialize state
  initWidgetState(config, screenType);
  setWidgetStatus('loading');

  // Fetch product configuration
  let productData: {
    sizes: ProductSize[];
    papers: PaperOption[];
    postProcessGroups: PostProcessGroup[];
  } | null = null;

  try {
    // In development, use mock data
    const useMockData = true; // Set to false when API is ready

    if (useMockData) {
      productData = getMockProductData(screenType);
    } else {
      const response = await fetch(getProductConfigUrl(config));
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json();
      productData = data;
    }

    setWidgetStatus('ready');
  } catch (error) {
    console.error('[HuniWidget] Failed to fetch product config:', error);
    setWidgetStatus('error');
  }

  // Selection handlers
  const handlers = {
    onSizeSelect: (id: number) => setSizeId(id),
    onPaperSelect: (id: number) => setPaperId(id),
    onQuantityChange: (qty: number) => setQuantity(qty),
    onPostProcessChange: (groupKey: string, code: string) => setPostProcess(groupKey, code),
    onUpload: () => {
      widgetEvents.fileUploaded({
        fileName: 'design.pdf',
        fileSize: 1024,
        fileType: 'application/pdf',
        uploadId: `upload-${Date.now()}`,
      });
    },
    onEditor: () => {
      window.open('https://editor.huni.co.kr', '_blank');
    },
    onAddToCart: () => {
      const s = selections.value;
      widgetEvents.addToCart({
        productId: config.productId,
        productName: '상품명',
        selections: {
          sizeId: String(s.sizeId),
          paperId: String(s.paperId),
          quantity: String(s.quantity),
        },
        quantity: s.quantity,
        unitPrice: price.value.subtotal / s.quantity,
        totalPrice: price.value.subtotal + price.value.vatAmount,
      });
    },
    onOrder: () => {
      widgetEvents.orderSubmitted({
        quoteId: `quote-${Date.now()}`,
        selections: {},
        totalPrice: price.value.subtotal + price.value.vatAmount,
      });
    },
  };

  // Reactive render function
  function renderWidget(): void {
    render(
      <WidgetShell
        config={{
          widgetId: config?.widgetId ?? '',
          productId: config?.productId ?? 0,
          screenType,
        }}
        productData={productData}
        handlers={handlers}
        selections={{
          sizeId: selections.value.sizeId,
          paperId: selections.value.paperId,
          quantity: selections.value.quantity,
        }}
        price={{
          breakdown: price.value.breakdown,
          total: price.value.total,
          vatAmount: price.value.vatAmount,
          isCalculating: price.value.isCalculating,
        }}
        isComplete={hasRequiredSelections.value}
      />,
      mountPoint
    );
  }

  // Initial render
  renderWidget();

  // Re-render on state changes (simplified - in production, use Preact signals properly)
  // Note: In a real implementation, the components would subscribe to signals directly
}

// Auto-bootstrap when script loads
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
}

// Export for external access
export { bootstrap };
export { WidgetShell } from './app';
export * from './types';
export * from './utils';
export * from './state';
