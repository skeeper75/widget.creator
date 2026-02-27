/**
 * Type Definitions - Barrel exports
 * @see SPEC-WIDGET-SDK-001 Section 4.2.1
 */

// Widget types
export type {
  WidgetStatus,
  WidgetState,
  WidgetConfig,
  DesignTokens,
} from './widget.types';

export { DEFAULT_DESIGN_TOKENS } from './widget.types';

// Option types
export type {
  OptionChoice,
  OptionDefinition,
  ConstraintType,
  ConstraintOperator,
  TargetAction,
  ConstraintRule,
  DependencyType,
  DependencyRule,
  ConstraintViolation,
  PostProcessGroup,
} from './option.types';

// Selection types (defined in state layer)
export type { Selections } from '../state/selections.state';

// Price types
export type {
  PriceBreakdownItem,
  PriceTier,
  PriceState,
  QuotePayload,
  QuoteResponse,
  PriceTableData,
  FixedPriceData,
} from './price.types';

// Screen types
export type {
  ScreenType,
  UploadVariant,
  ComponentConfig,
  ComponentType,
  ScreenConfig,
  ProductSize,
  PaperOption,
  OptionTree,
} from './screen.types';
