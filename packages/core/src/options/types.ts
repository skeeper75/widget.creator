// Option Engine types (REQ-OPT-001, REQ-OPT-003)

// State machine states
export type OptionEngineState =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'selecting'
  | 'validating'
  | 'constrained'
  | 'error'
  | 'complete';

// Valid state transitions
export const STATE_TRANSITIONS: Record<OptionEngineState, OptionEngineState[]> = {
  idle:        ['loading'],
  loading:     ['ready', 'error'],
  ready:       ['selecting'],
  selecting:   ['validating', 'selecting', 'error'],
  validating:  ['constrained', 'complete', 'selecting', 'error'],
  constrained: ['selecting', 'error'],
  error:       ['idle', 'loading', 'ready'],
  complete:    ['selecting', 'idle'],
};

// Action types for state machine
export type OptionAction =
  | { type: 'LOAD_PRODUCT'; productId: number }
  | { type: 'PRODUCT_LOADED'; data: ProductOptionData }
  | { type: 'SELECT_OPTION'; optionKey: string; choiceCode: string }
  | { type: 'DESELECT_OPTION'; optionKey: string }
  | { type: 'VALIDATE' }
  | { type: 'RESET' }
  | { type: 'ERROR'; error: Error };

// Product option data loaded after PRODUCT_LOADED action
export interface ProductOptionData {
  productId: number;
  productOptions: ProductOption[];
  optionChoices: OptionChoice[];
  dependencies: OptionDependency[];
  constraints: OptionConstraint[];
}

// Core state interface
export interface OptionState {
  status: OptionEngineState;
  productId: number | null;
  selections: Map<string, SelectedOption>;
  availableOptions: Map<string, AvailableOption>;
  disabledOptions: Map<string, DisabledReason>;
  violations: ConstraintViolation[];
  errors: Error[];
}

// Resolution context passed to resolveOptions
export interface OptionResolutionContext {
  productId: number;
  currentSelections: Map<string, SelectedOption>;
  productOptions: ProductOption[];
  optionChoices: OptionChoice[];
  constraints: OptionConstraint[];
  dependencies: OptionDependency[];
}

// Result of option resolution
export interface OptionResolutionResult {
  availableOptions: Map<string, AvailableOption>;
  disabledOptions: Map<string, DisabledReason>;
  defaultSelections: Map<string, string>;
  validationErrors: ValidationError[];
}

// Available option with choices
export interface AvailableOption {
  definition: ProductOption;
  choices: OptionChoice[];
  selected: SelectedOption | null;
  isRequired: boolean;
}

// User selection
export interface SelectedOption {
  optionKey: string;
  choiceCode: string;
  choiceId?: number;
  refPaperId?: number;
  cutWidth?: number;
  cutHeight?: number;
}

// Reason an option is disabled
export interface DisabledReason {
  type: 'PARENT_NOT_SELECTED' | 'PARENT_CHOICE_MISMATCH' | 'CONSTRAINT' | 'DEPENDENCY';
  parentOptionId?: number;
  expected?: number;
  constraintId?: number;
  description?: string;
}

// Constraint violation
export interface ConstraintViolation {
  constraintId: number;
  constraintType: string;
  message: string;
  sourceField: string;
  targetField: string;
}

// Validation error
export interface ValidationError {
  optionKey: string;
  code: string;
  message: string;
}

// Dependency evaluation result
export interface DependencyEvalResult {
  visible: boolean;
  reason?: DisabledReason;
  filteredChoices?: string[];
}

// Product option definition
export interface ProductOption {
  id: number;
  productId: number;
  optionDefinitionId: number;
  key: string;
  optionClass: string;
  label: string;
  isRequired: boolean;
  isVisible: boolean;
  isInternal: boolean;
  sortOrder: number;
}

// Option choice
export interface OptionChoice {
  id: number;
  optionDefinitionId: number;
  code: string;
  label: string;
  priceKey: string | null;
  refPaperId: number | null;
  refPrintModeId: number | null;
  refSizeId: number | null;
  isDefault: boolean;
  sortOrder: number;
}

// Option dependency
export interface OptionDependency {
  id: number;
  productId: number;
  parentOptionId: number;
  childOptionId: number;
  parentChoiceId: number | null;
  dependencyType: 'visibility' | 'choices' | 'value';
}

// Option constraint (from DB)
export interface OptionConstraint {
  id: number;
  productId: number;
  constraintType: string;
  sourceField: string;
  targetField: string;
  operator: string;
  value: string | null;
  valueMin: string | null;
  valueMax: string | null;
  targetValue: string | null;
  priority: number;
  isActive: boolean;
  description: string | null;
}
