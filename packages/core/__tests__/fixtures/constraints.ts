// Mock constraint and dependency data for testing

export interface MockOptionConstraint {
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

export interface MockOptionDependency {
  parentOptionId: number;
  childOptionId: number;
  productId: number;
  dependencyType: 'visibility' | 'choices' | 'value';
  parentChoiceId: number | null;
}

// Constraint: size_show - show envelope option when size is 100x150
export const CONSTRAINT_SIZE_SHOW: MockOptionConstraint = {
  id: 1,
  productId: 1,
  constraintType: 'size_show',
  sourceField: 'size',
  targetField: 'envelopeOption',
  operator: 'eq',
  value: '100x150',
  valueMin: null,
  valueMax: null,
  targetValue: 'envelope_standard',
  priority: 10,
  isActive: true,
  description: 'Show envelope option when size is 100x150',
};

// Constraint: size_show - hide envelope for non-matching size
export const CONSTRAINT_SIZE_SHOW_MISMATCH: MockOptionConstraint = {
  id: 2,
  productId: 1,
  constraintType: 'size_show',
  sourceField: 'size',
  targetField: 'envelopeOption',
  operator: 'eq',
  value: '200x300',
  valueMin: null,
  valueMax: null,
  targetValue: 'envelope_large',
  priority: 10,
  isActive: true,
  description: 'Show large envelope when size is 200x300',
};

// Constraint: size_range - min 30x30, max 125x125
export const CONSTRAINT_SIZE_RANGE: MockOptionConstraint = {
  id: 3,
  productId: 1,
  constraintType: 'size_range',
  sourceField: 'foilSize',
  targetField: 'foilOption',
  operator: 'between',
  value: null,
  valueMin: '30x30',
  valueMax: '125x125',
  priority: 20,
  isActive: true,
  description: 'Foil size range: min 30x30, max 125x125',
};

// Constraint: paper_condition - 180g or above enables coating
export const CONSTRAINT_PAPER_CONDITION: MockOptionConstraint = {
  id: 4,
  productId: 1,
  constraintType: 'paper_condition',
  sourceField: 'paperType',
  targetField: 'coatingOption',
  operator: 'gte',
  value: '180',
  valueMin: null,
  valueMax: null,
  targetValue: null,
  priority: 30,
  isActive: true,
  description: 'Paper weight >= 180g enables coating',
};

// Constraint: paper_condition - light paper disables embossing
export const CONSTRAINT_PAPER_LIGHT: MockOptionConstraint = {
  id: 5,
  productId: 1,
  constraintType: 'paper_condition',
  sourceField: 'paperType',
  targetField: 'embossOption',
  operator: 'gte',
  value: '250',
  valueMin: null,
  valueMax: null,
  targetValue: null,
  priority: 30,
  isActive: true,
  description: 'Paper weight >= 250g enables embossing',
};

// Inactive constraint (should be skipped)
export const CONSTRAINT_INACTIVE: MockOptionConstraint = {
  id: 6,
  productId: 1,
  constraintType: 'size_show',
  sourceField: 'size',
  targetField: 'specialOption',
  operator: 'eq',
  value: '100x150',
  valueMin: null,
  valueMax: null,
  targetValue: 'special_val',
  priority: 5,
  isActive: false,
  description: 'Inactive constraint',
};

// Constraint for different product (should be filtered out)
export const CONSTRAINT_OTHER_PRODUCT: MockOptionConstraint = {
  id: 7,
  productId: 999,
  constraintType: 'size_show',
  sourceField: 'size',
  targetField: 'otherOption',
  operator: 'eq',
  value: '100x150',
  valueMin: null,
  valueMax: null,
  targetValue: 'other_val',
  priority: 10,
  isActive: true,
  description: 'Constraint for different product',
};

export const ALL_MOCK_CONSTRAINTS: MockOptionConstraint[] = [
  CONSTRAINT_SIZE_SHOW,
  CONSTRAINT_SIZE_SHOW_MISMATCH,
  CONSTRAINT_SIZE_RANGE,
  CONSTRAINT_PAPER_CONDITION,
  CONSTRAINT_PAPER_LIGHT,
  CONSTRAINT_INACTIVE,
  CONSTRAINT_OTHER_PRODUCT,
];

// Dependencies for testing
export const MOCK_DEPENDENCIES: MockOptionDependency[] = [
  // Paper selection depends on size selection being visible
  {
    parentOptionId: 1, // size
    childOptionId: 2,  // paper
    productId: 1,
    dependencyType: 'visibility',
    parentChoiceId: null, // any size selection makes paper visible
  },
  // Color option depends on paper being a specific choice
  {
    parentOptionId: 2, // paper
    childOptionId: 3,  // color
    productId: 1,
    dependencyType: 'visibility',
    parentChoiceId: 10, // specific paper choice ID
  },
  // Coating choices filtered by paper selection
  {
    parentOptionId: 2, // paper
    childOptionId: 4,  // coating
    productId: 1,
    dependencyType: 'choices',
    parentChoiceId: null,
  },
];

// Dependencies with a cycle: A -> B -> C -> A
export const CYCLIC_DEPENDENCIES: MockOptionDependency[] = [
  { parentOptionId: 1, childOptionId: 2, productId: 1, dependencyType: 'visibility', parentChoiceId: null },
  { parentOptionId: 2, childOptionId: 3, productId: 1, dependencyType: 'visibility', parentChoiceId: null },
  { parentOptionId: 3, childOptionId: 1, productId: 1, dependencyType: 'visibility', parentChoiceId: null },
];

// Simple linear dependency chain (no cycles)
export const LINEAR_DEPENDENCIES: MockOptionDependency[] = [
  { parentOptionId: 1, childOptionId: 2, productId: 1, dependencyType: 'visibility', parentChoiceId: null },
  { parentOptionId: 2, childOptionId: 3, productId: 1, dependencyType: 'visibility', parentChoiceId: null },
  { parentOptionId: 3, childOptionId: 4, productId: 1, dependencyType: 'visibility', parentChoiceId: null },
];
