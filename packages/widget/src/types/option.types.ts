/**
 * Option Types - Option choice, constraint, and dependency types
 * @see SPEC-WIDGET-SDK-001 Section 4.4, 4.9
 */

/**
 * Base option choice structure
 */
export interface OptionChoice {
  /** Unique choice ID */
  id: number;
  /** Option definition key this choice belongs to */
  optionKey: string;
  /** Choice code (used in selections) */
  code: string;
  /** Display name */
  name: string;
  /** Display order */
  sortOrder: number;
  /** Whether this choice is disabled */
  disabled?: boolean;
  /** Reference to paper ID (for paper-based choices) */
  refPaperId?: number;
  /** Reference to material ID */
  refMaterialId?: number;
  /** Color hex value for color chips */
  color?: string;
  /** Image URL for image chips */
  imageUrl?: string;
}

/**
 * Option definition structure
 */
export interface OptionDefinition {
  /** Unique option ID */
  id: number;
  /** Option key (used as identifier) */
  key: string;
  /** Display label */
  label: string;
  /** UI component to render */
  uiComponent: 'toggle-group' | 'select' | 'radio-group' | 'input' | 'slider' | 'collapsible';
  /** Option class category */
  optionClass: 'primary' | 'secondary' | 'post_process' | 'accessory';
  /** Whether selection is required */
  required: boolean;
  /** Available choices */
  choices: OptionChoice[];
}

/**
 * Constraint types for options
 */
export type ConstraintType = 'visibility' | 'range' | 'required' | 'disabled';

/**
 * Constraint operators
 */
export type ConstraintOperator = 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'between';

/**
 * Target actions for constraints
 */
export type TargetAction = 'show' | 'hide' | 'enable' | 'disable' | 'set_value' | 'set_range';

/**
 * Constraint rule from database
 */
export interface ConstraintRule {
  /** Rule ID */
  id: number;
  /** Constraint type */
  constraintType: ConstraintType;
  /** Source option ID */
  sourceOptionId: number;
  /** Source field to check */
  sourceField: string;
  /** Comparison operator */
  operator: ConstraintOperator;
  /** Single value for comparison */
  value?: string;
  /** Minimum value for 'between' operator */
  valueMin?: string;
  /** Maximum value for 'between' operator */
  valueMax?: string;
  /** Target option ID */
  targetOptionId: number;
  /** Target field to modify */
  targetField: string;
  /** Action to take on target */
  targetAction: TargetAction;
  /** Value to set (for 'set_value' action) */
  targetValue?: string;
  /** Priority for rule application */
  priority: number;
}

/**
 * Dependency types
 */
export type DependencyType = 'visibility' | 'filter' | 'reset';

/**
 * Dependency rule from database
 */
export interface DependencyRule {
  /** Rule ID */
  id: number;
  /** Parent option ID */
  parentOptionId: number;
  /** Parent choice ID (null = any choice) */
  parentChoiceId: number | null;
  /** Child option ID that depends on parent */
  childOptionId: number;
  /** Dependency type */
  dependencyType: DependencyType;
}

/**
 * Constraint violation
 */
export interface ConstraintViolation {
  /** Option key where violation occurred */
  optionKey: string;
  /** Violation message */
  message: string;
  /** Rule that caused the violation */
  ruleId: number;
  /** Current value that violates */
  currentValue: unknown;
  /** Expected constraint */
  expectedConstraint: string;
}

/**
 * Post-process group for FinishSection
 */
export interface PostProcessGroup {
  /** Group key (박, 형압, 오시, 미싱, 가변, 귀돌이) */
  key: string;
  /** Display label */
  label: string;
  /** Available options in this group */
  options: OptionChoice[];
  /** Currently selected code */
  selectedCode: string | null;
}
