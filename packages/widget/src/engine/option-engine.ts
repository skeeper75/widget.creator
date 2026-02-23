/**
 * Option Engine - Constraint resolver
 * @see SPEC-WIDGET-SDK-001 Section 4.9
 */

import type {
  Selections,
  ConstraintRule,
  DependencyRule,
  OptionDefinition,
  OptionTree,
  ConstraintViolation,
} from '../types';

/**
 * Resolved options result
 */
export interface ResolvedOptions {
  /** Available option definitions after applying constraints */
  available: Map<string, OptionDefinition>;
  /** Constraint violations */
  violations: ConstraintViolation[];
  /** Disabled option codes by option key */
  disabledOptions: Map<string, Set<string>>;
  /** Warning messages */
  warnings: string[];
}

/**
 * Option Engine - Applies constraints and dependencies to options
 */
export class OptionEngine {
  private optionTree: OptionTree;
  private constraints: ConstraintRule[];
  private dependencies: DependencyRule[];

  constructor(
    optionTree: OptionTree,
    constraints: ConstraintRule[],
    dependencies: DependencyRule[]
  ) {
    this.optionTree = optionTree;
    this.constraints = [...constraints].sort((a, b) => a.priority - b.priority);
    this.dependencies = dependencies;
  }

  /**
   * Resolve available options given current selections
   */
  resolve(selections: Selections): ResolvedOptions {
    const available = new Map(this.optionTree.definitions);
    const violations: ConstraintViolation[] = [];
    const disabledOptions = new Map<string, Set<string>>();
    const warnings: string[] = [];

    // Apply visibility dependencies
    for (const dep of this.dependencies) {
      const parentOption = this.findOptionById(dep.parentOptionId);
      const childOption = this.findOptionById(dep.childOptionId);

      if (!parentOption || !childOption) continue;

      const parentValue = this.getSelectionValue(selections, parentOption.key);
      const isParentMatch = dep.parentChoiceId === null ||
        this.isChoiceSelected(selections, parentOption.key, dep.parentChoiceId);

      if (dep.dependencyType === 'visibility' && !isParentMatch) {
        // Hide child option when parent condition not met
        available.delete(childOption.key);
      } else if (dep.dependencyType === 'filter' && isParentMatch) {
        // Filter child option choices based on parent
        const filtered = this.filterOptionChoices(childOption, parentValue);
        available.set(childOption.key, filtered);
      } else if (dep.dependencyType === 'reset' && !isParentMatch) {
        // Reset child selection when parent changes
        // This is handled by the component layer
      }
    }

    // Apply constraints
    for (const constraint of this.constraints) {
      const sourceOption = this.findOptionById(constraint.sourceOptionId);
      const targetOption = this.findOptionById(constraint.targetOptionId);

      if (!sourceOption || !targetOption) continue;

      const sourceValue = this.getSelectionValue(selections, sourceOption.key);

      if (this.evaluateConstraint(sourceValue, constraint)) {
        // Apply target action
        switch (constraint.targetAction) {
          case 'show':
            // Ensure target is visible (already in available)
            break;
          case 'hide':
            available.delete(targetOption.key);
            break;
          case 'enable':
            // Target is enabled by default
            break;
          case 'disable': {
            // Add target to disabled set
            const key = targetOption.key;
            if (!disabledOptions.has(key)) {
              disabledOptions.set(key, new Set());
            }
            if (constraint.targetValue) {
              disabledOptions.get(key)?.add(constraint.targetValue);
            }
            break;
          }
          case 'set_value': {
            // Validate that current value matches constraint
            const targetValue = this.getSelectionValue(selections, targetOption.key);
            if (targetValue !== constraint.targetValue) {
              violations.push({
                optionKey: targetOption.key,
                message: `${targetOption.label}의 값이 ${constraint.targetValue}이어야 합니다.`,
                ruleId: constraint.id,
                currentValue: targetValue,
                expectedConstraint: constraint.targetValue,
              });
            }
            break;
          }
          case 'set_range': {
            // Validate range constraints
            const targetValue = this.getNumberValue(selections, targetOption.key);
            const min = constraint.valueMin ? parseFloat(constraint.valueMin) : undefined;
            const max = constraint.valueMax ? parseFloat(constraint.valueMax) : undefined;

            if (min !== undefined && targetValue < min) {
              violations.push({
                optionKey: targetOption.key,
                message: `${targetOption.label}의 최소값은 ${min}입니다.`,
                ruleId: constraint.id,
                currentValue: targetValue,
                expectedConstraint: `>= ${min}`,
              });
            }
            if (max !== undefined && targetValue > max) {
              violations.push({
                optionKey: targetOption.key,
                message: `${targetOption.label}의 최대값은 ${max}입니다.`,
                ruleId: constraint.id,
                currentValue: targetValue,
                expectedConstraint: `<= ${max}`,
              });
            }
            break;
          }
        }
      }
    }

    // Check for required options
    for (const [key, def] of this.optionTree.definitions) {
      if (def.required && available.has(key)) {
        const value = this.getSelectionValue(selections, key);
        if (value === null || value === '') {
          warnings.push(`${def.label}을(를) 선택해주세요.`);
        }
      }
    }

    return {
      available,
      violations,
      disabledOptions,
      warnings,
    };
  }

  /**
   * Find option definition by ID
   */
  private findOptionById(id: number): OptionDefinition | undefined {
    for (const def of this.optionTree.definitions.values()) {
      if (def.id === id) return def;
    }
    return undefined;
  }

  /**
   * Get selection value for option key
   */
  private getSelectionValue(selections: Selections, optionKey: string): string | null {
    // Check special fields
    if (optionKey === 'size') return selections.sizeId ? String(selections.sizeId) : null;
    if (optionKey === 'paper') return selections.paperId ? String(selections.paperId) : null;
    if (optionKey === 'quantity') return String(selections.quantity);

    // Check options map
    return selections.options.get(optionKey) ?? null;
  }

  /**
   * Get numeric selection value
   */
  private getNumberValue(selections: Selections, optionKey: string): number {
    const value = this.getSelectionValue(selections, optionKey);
    return value ? parseFloat(value) : 0;
  }

  /**
   * Check if a specific choice is selected
   */
  private isChoiceSelected(selections: Selections, optionKey: string, choiceId: number): boolean {
    // This would need access to choice codes
    // Simplified: check if any value is selected
    return this.getSelectionValue(selections, optionKey) !== null;
  }

  /**
   * Filter option choices based on parent value
   */
  private filterOptionChoices(option: OptionDefinition, parentValue: string | null): OptionDefinition {
    // In a full implementation, this would filter choices based on dependencies
    // For now, return the option as-is
    return option;
  }

  /**
   * Evaluate a constraint against a source value
   */
  private evaluateConstraint(sourceValue: string | null, constraint: ConstraintRule): boolean {
    if (sourceValue === null) return false;

    const numValue = parseFloat(sourceValue);

    switch (constraint.operator) {
      case 'eq':
        return sourceValue === constraint.value;
      case 'ne':
        return sourceValue !== constraint.value;
      case 'gt':
        return numValue > parseFloat(constraint.value ?? '0');
      case 'lt':
        return numValue < parseFloat(constraint.value ?? '0');
      case 'gte':
        return numValue >= parseFloat(constraint.value ?? '0');
      case 'lte':
        return numValue <= parseFloat(constraint.value ?? '0');
      case 'in':
        return (constraint.value?.split(',').includes(sourceValue)) ?? false;
      case 'between': {
        const min = constraint.valueMin ? parseFloat(constraint.valueMin) : -Infinity;
        const max = constraint.valueMax ? parseFloat(constraint.valueMax) : Infinity;
        return numValue >= min && numValue <= max;
      }
      default:
        return false;
    }
  }
}

/**
 * Create option engine instance
 */
export function createOptionEngine(
  optionTree: OptionTree,
  constraints: ConstraintRule[],
  dependencies: DependencyRule[]
): OptionEngine {
  return new OptionEngine(optionTree, constraints, dependencies);
}
