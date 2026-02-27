/**
 * WidgetShell - Root Preact component with layout and theme
 * @see SPEC-WIDGET-SDK-001 Section 4.1
 */

import { FunctionalComponent } from 'preact';
import { useEffect, useErrorBoundary } from 'preact/hooks';
import { ScreenRenderer } from './screens';
import {
  isLoading,
  hasError,
  setWidgetStatus,
} from './state';
import { widgetEvents } from './utils';

/**
 * WidgetShell Props
 */
export interface WidgetShellProps {
  /** Widget configuration */
  config: {
    widgetId: string;
    productId: number;
    screenType: import('./types').ScreenType;
  };
  /** Product data */
  productData: {
    sizes: import('./types').ProductSize[];
    papers: import('./types').PaperOption[];
    postProcessGroups: import('./types').PostProcessGroup[];
  } | null;
  /** Selection handlers */
  handlers: {
    onSizeSelect: (id: number) => void;
    onPaperSelect: (id: number) => void;
    onQuantityChange: (qty: number) => void;
    onPostProcessChange: (groupKey: string, code: string) => void;
    onUpload: () => void;
    onEditor: () => void;
    onAddToCart: () => void;
    onOrder: () => void;
  };
  /** Current selections */
  selections: {
    sizeId: number | null;
    paperId: number | null;
    quantity: number;
  };
  /** Price state */
  price: {
    breakdown: { label: string; amount: number }[];
    total: number;
    vatAmount: number;
    isCalculating: boolean;
  };
  /** Is complete (all required selections made) */
  isComplete: boolean;
}

/**
 * Loading Skeleton Component
 */
const LoadingSkeleton: FunctionalComponent = () => (
  <div class="widget-skeleton">
    <div class="skeleton-item skeleton-item--title" />
    <div class="skeleton-item skeleton-item--row" />
    <div class="skeleton-item skeleton-item--row" />
    <div class="skeleton-item skeleton-item--row" />
    <div class="skeleton-item skeleton-item--box" />
  </div>
);

/**
 * Error Display Component
 */
const ErrorDisplay: FunctionalComponent<{ message: string; onRetry?: () => void }> = ({
  message,
  onRetry,
}) => (
  <div class="widget-error">
    <div class="widget-error__icon">⚠️</div>
    <div class="widget-error__message">{message}</div>
    {onRetry && (
      <button class="widget-error__retry" onClick={onRetry}>
        다시 시도
      </button>
    )}
  </div>
);

/**
 * WidgetShell - Root component with error handling and loading states
 */
export const WidgetShell: FunctionalComponent<WidgetShellProps> = ({
  config,
  productData,
  handlers,
  selections,
  price,
  isComplete,
}) => {
  const [error, resetError] = useErrorBoundary();

  // Dispatch loaded event on mount
  useEffect(() => {
    widgetEvents.loaded({
      widgetId: config.widgetId,
      productId: config.productId,
      screenType: config.screenType,
    });

    setWidgetStatus('ready');
  }, [config]);

  // Handle error boundary
  if (error) {
    console.error('[HuniWidget] Render error:', error);
    return (
      <ErrorDisplay
        message="위젯 로딩 중 오류가 발생했습니다."
        onRetry={() => {
          resetError();
          setWidgetStatus('loading');
        }}
      />
    );
  }

  // Loading state
  if (isLoading.value || !productData) {
    return <LoadingSkeleton />;
  }

  // Error state
  if (hasError.value) {
    return (
      <ErrorDisplay
        message="상품 정보를 불러올 수 없습니다."
        onRetry={() => setWidgetStatus('loading')}
      />
    );
  }

  // Render screen
  return (
    <div class="widget-shell">
      <div class="widget-shell__header">
        <h2 class="widget-shell__title">견적 옵션 선택</h2>
      </div>
      <div class="widget-shell__content">
        <ScreenRenderer
          screenType={config.screenType}
          sizes={productData.sizes}
          papers={productData.papers}
          selectedSizeId={selections.sizeId}
          selectedPaperId={selections.paperId}
          printType={null}
          quantity={selections.quantity}
          postProcessGroups={productData.postProcessGroups}
          envelopeType={null}
          priceBreakdown={price.breakdown}
          priceTotal={price.total}
          priceVat={price.vatAmount}
          isCalculating={price.isCalculating}
          isComplete={isComplete}
          onSizeSelect={handlers.onSizeSelect}
          onPaperSelect={handlers.onPaperSelect}
          onPrintTypeChange={() => {}}
          onQuantityChange={handlers.onQuantityChange}
          onPostProcessChange={handlers.onPostProcessChange}
          onEnvelopeChange={() => {}}
          onUpload={handlers.onUpload}
          onEditor={handlers.onEditor}
          onAddToCart={handlers.onAddToCart}
          onOrder={handlers.onOrder}
        />
      </div>
    </div>
  );
};

export default WidgetShell;
