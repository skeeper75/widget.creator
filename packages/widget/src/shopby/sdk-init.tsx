/**
 * Widget SDK Initialization Module
 *
 * Provides the window.WidgetCreator global API for Aurora Skin embedding.
 * Implements init(), destroy(), and getState() methods with Shadow DOM isolation.
 *
 * @see SPEC-SHOPBY-003 Section 4.1
 * @MX:ANCHOR: Main SDK entry point - Aurora Skin calls window.WidgetCreator.init()
 * @MX:SPEC: SPEC-SHOPBY-003
 */

import { render } from 'preact';
import { ShopbyAuthConnector } from './auth-connector';
import { EventEmitter, connectCallbacks } from './event-emitter';
import { ShopbyBridge } from './shopby-bridge';
import { PriceSyncManager, type PriceBreakdown } from './price-sync';
import { loadShopbyProduct, extractWidgetConfig } from './product-loader';
import {
  type ShopbyWidgetInitConfig,
  type ShopbyWidgetError,
  type WidgetLifecycleState as WidgetLifecycleStateType,
  type ShopbyProductData,
  type PriceSyncResult,
  type WidgetToShopbyPayload,
  validateInitConfig,
  WidgetLifecycleState,
  ShopbyWidgetErrorCode,
} from './types';
import { WidgetShell } from '../app';
import { selections, resetSelections, hasRequiredSelections } from '../state/selections.state';
import type { ScreenType, ProductSize, PaperOption, PostProcessGroup } from '../types';

// =============================================================================
// SECTION 1: Widget State Types
// =============================================================================

/**
 * Current widget state exposed via getState()
 */
export interface WidgetState {
  /** Current lifecycle state */
  state: WidgetLifecycleStateType;
  /** Shopby product number */
  shopbyProductNo: number | null;
  /** Whether user is authenticated */
  isAuthenticated: boolean;
  /** Current price breakdown (null if not calculated) */
  price: PriceBreakdown | null;
  /** Current user selections */
  selections: {
    sizeId: number | null;
    paperId: number | null;
    quantity: number;
  };
  /** Error state (null if no error) */
  error: ShopbyWidgetError | null;
}

// =============================================================================
// SECTION 2: SDK Instance Class
// =============================================================================

/**
 * Manages a single widget instance lifecycle.
 * Handles initialization, state management, and cleanup.
 */
class WidgetSDKInstance {
  private config: ShopbyWidgetInitConfig | null = null;
  private lifecycleState: WidgetLifecycleStateType = WidgetLifecycleState.IDLE;
  private containerElement: HTMLElement | null = null;
  private shadowContainer: HTMLDivElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private mountPoint: HTMLDivElement | null = null;
  private authConnector: ShopbyAuthConnector | null = null;
  private eventEmitter: EventEmitter | null = null;
  private shopbyBridge: ShopbyBridge | null = null;
  private priceSyncManager: PriceSyncManager | null = null;
  private productData: ShopbyProductData | null = null;
  private currentError: ShopbyWidgetError | null = null;
  private cleanupCallbacks: (() => void) | null = null;

  /**
   * Initialize the widget with configuration.
   */
  async init(inputConfig: unknown): Promise<void> {
    // Validate configuration
    const validation = validateInitConfig(inputConfig);
    if (!validation.success) {
      const error: ShopbyWidgetError = {
        code: ShopbyWidgetErrorCode.INVALID_CONFIG,
        message: validation.errors?.map((e) => `${e.field}: ${e.message}`).join('; ') ?? 'Invalid configuration',
      };
      this.handleError(error);
      throw error;
    }

    const config = validation.data!;
    this.config = config;

    // Check for double initialization
    if (this.lifecycleState !== WidgetLifecycleState.IDLE) {
      const error: ShopbyWidgetError = {
        code: ShopbyWidgetErrorCode.ALREADY_INITIALIZED,
        message: 'Widget is already initialized. Call destroy() first.',
      };
      this.handleError(error);
      throw error;
    }

    // Resolve container element
    this.containerElement = this.resolveContainer(config.container);
    if (!this.containerElement) {
      const error: ShopbyWidgetError = {
        code: ShopbyWidgetErrorCode.CONTAINER_NOT_FOUND,
        message: `Container not found: ${config.container}`,
      };
      this.handleError(error);
      throw error;
    }

    // Set loading state
    this.setState(WidgetLifecycleState.LOADING);

    try {
      // Create Shadow DOM for style isolation
      this.createShadowDOM();

      // Initialize auth connector
      this.authConnector = new ShopbyAuthConnector(
        config.shopbyAccessToken,
        config.apiBaseUrl,
      );

      // Initialize event emitter
      this.eventEmitter = new EventEmitter();

      // Initialize price sync manager with callback
      this.priceSyncManager = new PriceSyncManager(0.1, (priceResult: PriceSyncResult) => {
        this.eventEmitter?.emit('priceChange', priceResult);
      });

      // Initialize Shopby bridge
      this.shopbyBridge = new ShopbyBridge(
        this.authConnector,
        this.eventEmitter,
        config.apiBaseUrl,
      );

      // Connect callbacks from config
      if (config.callbacks) {
        this.cleanupCallbacks = connectCallbacks(this.eventEmitter, config.callbacks);
      }

      // Load product data from Shopby
      this.productData = await loadShopbyProduct(
        config.shopbyProductNo,
        config.apiBaseUrl,
      );

      // Extract widget config and render
      const widgetConfig = extractWidgetConfig(this.productData.extraJson);
      this.injectStyles(config.theme);
      this.renderWidget(widgetConfig);

      // Set ready state
      this.setState(WidgetLifecycleState.READY);
      this.eventEmitter.emit('ready', { state: WidgetLifecycleState.READY });

    } catch (err) {
      const error = this.classifyError(err);
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Destroy the widget and clean up all resources.
   */
  destroy(): void {
    if (this.lifecycleState === WidgetLifecycleState.DESTROYED) {
      return;
    }

    // Clean up callbacks
    if (this.cleanupCallbacks) {
      this.cleanupCallbacks();
      this.cleanupCallbacks = null;
    }

    // Remove all event listeners
    if (this.eventEmitter) {
      this.eventEmitter.removeAllListeners();
      this.eventEmitter = null;
    }

    // Clear auth state
    if (this.authConnector) {
      this.authConnector.clear();
      this.authConnector = null;
    }

    // Unmount Preact app
    if (this.mountPoint) {
      render(null, this.mountPoint);
      this.mountPoint = null;
    }

    // Remove Shadow DOM
    if (this.shadowContainer && this.shadowContainer.parentNode) {
      this.shadowContainer.parentNode.removeChild(this.shadowContainer);
    }
    this.shadowContainer = null;
    this.shadowRoot = null;

    // Reset state
    resetSelections();
    this.config = null;
    this.containerElement = null;
    this.shopbyBridge = null;
    this.priceSyncManager = null;
    this.productData = null;
    this.currentError = null;

    this.setState(WidgetLifecycleState.DESTROYED);
  }

  /**
   * Get current widget state.
   */
  getState(): WidgetState {
    const s = selections.value;
    let price: PriceBreakdown | null = null;

    if (this.priceSyncManager && hasRequiredSelections.value) {
      // Calculate current price breakdown
      price = {
        basePrice: this.productData?.salePrice ?? 0,
        optionPrice: 0,
        postProcessPrice: 0,
        deliveryPrice: 0,
        totalPrice: this.productData?.salePrice ?? 0,
      };
    }

    return {
      state: this.lifecycleState,
      shopbyProductNo: this.config?.shopbyProductNo ?? null,
      isAuthenticated: this.authConnector?.isAuthenticated() ?? false,
      price,
      selections: {
        sizeId: s.sizeId,
        paperId: s.paperId,
        quantity: s.quantity,
      },
      error: this.currentError,
    };
  }

  // =========================================================================
  // Private Methods
  // =========================================================================

  /**
   * Resolve container from string selector or HTMLElement.
   */
  private resolveContainer(container: string | HTMLElement): HTMLElement | null {
    if (typeof container === 'string') {
      return document.querySelector(container);
    }
    return container;
  }

  /**
   * Create Shadow DOM for style isolation.
   */
  private createShadowDOM(): void {
    // Create shadow container
    this.shadowContainer = document.createElement('div');
    this.shadowContainer.id = 'widget-creator-shadow-container';
    this.shadowContainer.style.cssText = 'width: 100%; min-height: 200px;';

    // Attach shadow root
    this.shadowRoot = this.shadowContainer.attachShadow({ mode: 'open' });

    // Create mount point
    this.mountPoint = document.createElement('div');
    this.mountPoint.id = 'widget-mount';
    this.shadowRoot.appendChild(this.mountPoint);

    // Append to container
    this.containerElement!.appendChild(this.shadowContainer);
  }

  /**
   * Inject base styles and theme into Shadow DOM.
   */
  private injectStyles(theme: ShopbyWidgetInitConfig['theme']): void {
    if (!this.shadowRoot) return;

    const styleElement = document.createElement('style');
    const primaryColor = theme?.primaryColor ?? '#FF6B00';
    const fontFamily = theme?.fontFamily ?? "'Noto Sans KR', sans-serif";
    const borderRadius = theme?.borderRadius ?? '8px';

    styleElement.textContent = `
      :host {
        all: initial;
        font-family: ${fontFamily};
        font-size: 14px;
        color: #333;
        box-sizing: border-box;
        display: block;
        width: 100%;
      }

      :host *,
      :host *::before,
      :host *::after {
        box-sizing: inherit;
      }

      :host {
        --widget-color-primary: ${primaryColor};
        --widget-color-secondary: #6c757d;
        --widget-color-accent: #ffc107;
        --widget-color-text-primary: #212529;
        --widget-color-text-secondary: #6c757d;
        --widget-color-border: #dee2e6;
        --widget-color-surface: #ffffff;
        --widget-color-background: #f8f9fa;
        --widget-color-disabled: #e9ecef;
        --widget-radius-default: ${borderRadius};
        --widget-spacing-unit: 8px;
      }

      .widget-shell {
        background: var(--widget-color-surface);
        border: 1px solid var(--widget-color-border);
        border-radius: var(--widget-radius-default);
        padding: calc(var(--widget-spacing-unit) * 2);
      }

      .widget-shell__header {
        margin-bottom: calc(var(--widget-spacing-unit) * 2);
        padding-bottom: var(--widget-spacing-unit);
        border-bottom: 1px solid var(--widget-color-border);
      }

      .widget-shell__title {
        font-size: 18px;
        font-weight: 600;
        margin: 0;
        color: var(--widget-color-text-primary);
      }

      .widget-skeleton {
        padding: var(--widget-spacing-unit);
      }

      .skeleton-item {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: skeleton-loading 1.5s infinite;
        border-radius: 4px;
        margin-bottom: var(--widget-spacing-unit);
      }

      .skeleton-item--title {
        height: 24px;
        width: 60%;
      }

      .skeleton-item--row {
        height: 40px;
        width: 100%;
      }

      .skeleton-item--box {
        height: 100px;
        width: 100%;
      }

      @keyframes skeleton-loading {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }

      .widget-error {
        padding: calc(var(--widget-spacing-unit) * 2);
        text-align: center;
        color: #dc3545;
      }

      .widget-error__icon {
        font-size: 32px;
        margin-bottom: var(--widget-spacing-unit);
      }

      .widget-error__message {
        margin-bottom: var(--widget-spacing-unit);
      }

      .widget-error__retry {
        background: var(--widget-color-primary);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: var(--widget-radius-default);
        cursor: pointer;
      }

      .widget-error__retry:hover {
        opacity: 0.9;
      }

      /* ========================================
       * RESPONSIVE LAYOUT (R-WDG-005)
       * ======================================== */

      /* Mobile: ~767px - Single column, vertical scroll */
      .widget-shell__content {
        display: flex;
        flex-direction: column;
        gap: calc(var(--widget-spacing-unit) * 2);
      }

      .widget-layout {
        display: flex;
        flex-direction: column;
        gap: calc(var(--widget-spacing-unit) * 2);
      }

      .widget-layout__options {
        flex: 1;
        min-width: 0;
      }

      .widget-layout__preview {
        display: none;
      }

      .widget-layout__price {
        flex: 0 0 auto;
      }

      /* Mobile-specific: Bottom sheet style for option selectors */
      .widget-option-group {
        width: 100%;
      }

      /* Tablet: 768px - 1279px - 2-column layout */
      @media (min-width: 768px) {
        .widget-shell {
          max-width: 720px;
          margin: 0 auto;
        }

        .widget-layout {
          flex-direction: row;
          flex-wrap: wrap;
        }

        .widget-layout__options {
          flex: 1 1 60%;
          min-width: 300px;
        }

        .widget-layout__preview {
          display: none;
        }

        .widget-layout__price {
          flex: 1 1 35%;
          min-width: 250px;
        }
      }

      /* Desktop: 1280px+ - 3-column layout */
      @media (min-width: 1280px) {
        .widget-shell {
          max-width: 960px;
          margin: 0 auto;
        }

        .widget-layout {
          flex-direction: row;
          flex-wrap: nowrap;
        }

        .widget-layout__options {
          flex: 1 1 40%;
          min-width: 280px;
        }

        .widget-layout__preview {
          display: flex;
          flex: 1 1 25%;
          min-width: 200px;
          align-items: center;
          justify-content: center;
          background: var(--widget-color-background);
          border-radius: var(--widget-radius-default);
          min-height: 200px;
        }

        .widget-layout__price {
          flex: 1 1 30%;
          min-width: 240px;
        }
      }

      /* Touch interaction enhancements */
      @media (hover: none) and (pointer: coarse) {
        /* Larger touch targets for mobile */
        .widget-option-group button,
        .widget-option-group select,
        .widget-option-group input {
          min-height: 44px;
        }

        /* Add touch scroll momentum */
        .widget-shell__content {
          -webkit-overflow-scrolling: touch;
          overflow-y: auto;
        }
      }
    `;

    this.shadowRoot.insertBefore(styleElement, this.mountPoint);
  }

  /**
   * Render the Preact widget into Shadow DOM.
   */
  private renderWidget(_widgetConfig: ReturnType<typeof extractWidgetConfig>): void {
    if (!this.mountPoint || !this.productData) return;

    // Determine screen type based on product config
    const screenType: ScreenType = 'PRINT_OPTION';

    // Mock product data for now (would come from widgetConfig in production)
    const mockProductData = {
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
      ] as PostProcessGroup[],
    };

    // Selection handlers
    const handlers = {
      onSizeSelect: (id: number) => {
        const oldValue = selections.value.sizeId;
        selections.value = { ...selections.value, sizeId: id };
        if (oldValue !== id) {
          this.dispatchOptionChange('size', oldValue, id);
        }
      },
      onPaperSelect: (id: number) => {
        const oldValue = selections.value.paperId;
        selections.value = { ...selections.value, paperId: id };
        if (oldValue !== id) {
          this.dispatchOptionChange('paper', oldValue, id);
        }
      },
      onQuantityChange: (qty: number) => {
        const oldValue = selections.value.quantity;
        selections.value = { ...selections.value, quantity: qty };
        if (oldValue !== qty) {
          this.dispatchOptionChange('quantity', oldValue, qty);
        }
      },
      onPostProcessChange: (groupKey: string, code: string) => {
        const oldProcesses = selections.value.postProcesses;
        const oldValue = oldProcesses.get(groupKey) ?? null;
        const newProcesses = new Map(oldProcesses);
        if (code === '') {
          newProcesses.delete(groupKey);
        } else {
          newProcesses.set(groupKey, code);
        }
        selections.value = { ...selections.value, postProcesses: newProcesses };
        if (oldValue !== code) {
          this.dispatchOptionChange(`postProcess_${groupKey}`, oldValue, code);
        }
      },
      onUpload: () => {
        this.eventEmitter?.emit('addToCart', this.buildPayload());
      },
      onEditor: () => {
        window.open('https://editor.huni.co.kr', '_blank');
      },
      onAddToCart: async () => {
        if (!this.shopbyBridge) return;
        const payload = this.buildPayload();
        await this.shopbyBridge.addToCart(payload);
      },
      onOrder: async () => {
        if (!this.shopbyBridge) return;
        const payload = this.buildPayload();
        await this.shopbyBridge.buyNow(payload);
      },
    };

    // Render widget shell
    render(
      <WidgetShell
        config={{
          widgetId: `shopby-${this.config?.shopbyProductNo ?? 0}`,
          productId: this.productData.productNo,
          screenType,
        }}
        productData={mockProductData}
        handlers={handlers}
        selections={{
          sizeId: selections.value.sizeId,
          paperId: selections.value.paperId,
          quantity: selections.value.quantity,
        }}
        price={{
          breakdown: [],
          total: this.productData.salePrice,
          vatAmount: 0,
          isCalculating: false,
        }}
        isComplete={hasRequiredSelections.value}
      />,
      this.mountPoint
    );
  }

  /**
   * Build payload for cart/order operations.
   */
  private buildPayload(): WidgetToShopbyPayload {
    const s = selections.value;
    return {
      productNo: this.config?.shopbyProductNo ?? 0,
      optionNo: 0, // Would be determined from option mapping
      orderCnt: s.quantity,
      optionInputs: {
        designFileUrl: '',
        printSpec: JSON.stringify({
          sizeId: s.sizeId,
          paperId: s.paperId,
          quantity: s.quantity,
        }),
      },
      widgetPrice: {
        basePrice: this.productData?.salePrice ?? 0,
        optionPrice: 0,
        postProcessPrice: 0,
        deliveryPrice: 0,
        totalPrice: this.productData?.salePrice ?? 0,
      },
    };
  }

  /**
   * Dispatch option change event.
   */
  private dispatchOptionChange(_optionKey: string, _oldValue: unknown, _newValue: unknown): void {
    // Trigger price recalculation
    if (this.priceSyncManager && this.productData) {
      this.priceSyncManager.comparePrices(
        this.productData.salePrice,
        this.productData.salePrice,
      );
    }
  }

  /**
   * Set lifecycle state and emit state change event.
   */
  private setState(newState: WidgetLifecycleStateType): void {
    const oldState = this.lifecycleState;
    this.lifecycleState = newState;
    if (this.eventEmitter && oldState !== newState) {
      this.eventEmitter.emit('stateChange', { from: oldState, to: newState });
    }
  }

  /**
   * Handle error - set state and emit error event.
   */
  private handleError(error: ShopbyWidgetError): void {
    this.currentError = error;
    this.setState(WidgetLifecycleState.ERROR);
    this.eventEmitter?.emit('error', error);
  }

  /**
   * Classify unknown error into ShopbyWidgetError.
   */
  private classifyError(err: unknown): ShopbyWidgetError {
    if (
      err !== null &&
      typeof err === 'object' &&
      'code' in err &&
      'message' in err
    ) {
      return err as ShopbyWidgetError;
    }

    return {
      code: ShopbyWidgetErrorCode.API_ERROR,
      message: err instanceof Error ? err.message : 'Unknown error occurred',
      cause: err,
    };
  }
}

// =============================================================================
// SECTION 3: Global API
// =============================================================================

/** Singleton SDK instance */
let sdkInstance: WidgetSDKInstance | null = null;

/**
 * Initialize the widget with configuration.
 * Creates a new widget instance and mounts it in the specified container.
 */
function init(config: ShopbyWidgetInitConfig): void {
  if (sdkInstance) {
    sdkInstance.destroy();
  }
  sdkInstance = new WidgetSDKInstance();
  sdkInstance.init(config).catch((err) => {
    console.error('[WidgetCreator] Initialization failed:', err);
  });
}

/**
 * Destroy the widget and clean up all resources.
 * Safe to call multiple times.
 */
function destroy(): void {
  if (sdkInstance) {
    sdkInstance.destroy();
    sdkInstance = null;
  }
}

/**
 * Get current widget state.
 * Returns null if widget is not initialized.
 */
function getState(): WidgetState | null {
  if (!sdkInstance) {
    return {
      state: WidgetLifecycleState.IDLE,
      shopbyProductNo: null,
      isAuthenticated: false,
      price: null,
      selections: {
        sizeId: null,
        paperId: null,
        quantity: 1,
      },
      error: null,
    };
  }
  return sdkInstance.getState();
}

/**
 * WidgetCreator global API interface
 */
export interface WidgetCreatorAPI {
  init: (config: ShopbyWidgetInitConfig) => void;
  destroy: () => void;
  getState: () => WidgetState | null;
}

/**
 * Create the WidgetCreator API object
 */
export function createWidgetCreatorAPI(): WidgetCreatorAPI {
  return {
    init,
    destroy,
    getState,
  };
}

/**
 * Register WidgetCreator on window global object.
 * This is called automatically when the script loads.
 */
export function registerGlobal(): void {
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).WidgetCreator = createWidgetCreatorAPI();
  }
}

// Auto-register on load in browser environment
if (typeof window !== 'undefined') {
  // Defer registration to allow DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerGlobal);
  } else {
    registerGlobal();
  }
}

// Export for module usage
export { init, destroy, getState };

