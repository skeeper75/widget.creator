/**
 * State Layer - Barrel exports
 */

// Widget state
export {
  widgetConfig,
  widgetState,
  isReady,
  isLoading,
  hasError,
  initWidgetState,
  setWidgetStatus,
  setScreenType,
} from './widget.state';

// Selections state
export {
  selections,
  selectionsAsObject,
  hasRequiredSelections,
  setSizeId,
  setPaperId,
  setPaperCoverId,
  setQuantity,
  setCustomDimensions,
  setOption,
  setPostProcess,
  setAccessory,
  resetSelections,
  type Selections,
} from './selections.state';

// Price state
export {
  price,
  priceTiers,
  grandTotal,
  currentUnitPrice,
  lineTotal,
  setPriceCalculating,
  updatePrice,
  setPriceTiers,
  calculatePrice,
} from './price.state';
