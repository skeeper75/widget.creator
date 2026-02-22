// Constraint Evaluator types (REQ-CONST-001)

import type { SelectedOption, OptionConstraint, OptionDependency, OptionChoice, DisabledReason, ConstraintViolation } from '../options/types.js';

// Input for constraint evaluation
export interface ConstraintEvalInput {
  productId: number;
  currentSelections: Map<string, SelectedOption>;
  constraints: OptionConstraint[];
  dependencies: OptionDependency[];
  allChoices: OptionChoice[];
  papers?: Paper[];
}

// Result from constraint evaluation
export interface ConstraintEvalResult {
  availableOptions: Map<string, string[]>;
  disabledOptions: Map<string, DisabledReason>;
  violations: ConstraintViolation[];
  evaluationTimeMs: number;
}

// Result from a single constraint evaluation
export interface SingleConstraintResult {
  action: 'show' | 'hide' | 'disable' | 'enable' | 'limit_range';
  violated: boolean;
  values?: string[];
  min?: { width: number; height: number };
  max?: { width: number; height: number };
}

// Implicit constraint from WowPress legacy
export interface ImplicitConstraint {
  key: string;
  sourceField: string;
  targetField: string;
  productId: number;
  operator: string;
  value: string | null;
  priority: number;
  isActive: boolean;
}

// Merged constraint from dual-layer evaluation
export interface ResolvedConstraint {
  source: 'implicit' | 'star';
  key?: string;
  sourceField: string;
  targetField: string;
  productId: number;
  operator: string;
  value: string | null;
  priority: number;
  isActive: boolean;
}

// Merged constraint set
export interface MergedConstraintSet {
  constraints: ResolvedConstraint[];
}

// Paper type for paper condition evaluation
export interface Paper {
  id: number;
  name: string;
  weight: number | null;
  costPer4Cut: number;
  sellingPer4Cut: number;
}
