// Simulation engine — cartesian product + constraint/price evaluation
// SPEC-WB-005 FR-WB005-03, FR-WB005-04

import type { SimulationCaseResult, SimulationResult, TooLargeResult } from './types.js';

export const SIMULATION_MAX_CASES = 10_000;

// ─── Input types ──────────────────────────────────────────────────────────────

export interface SimOptionChoice {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
}

export interface OptionType {
  id: number;
  key: string;
  name: string;
  choices: SimOptionChoice[];
}

export interface SimulationConstraint {
  id: number;
  productId: number;
  constraintType: string;
  sourceField: string;
  sourceValue: string;
  targetField: string;
  targetValue: string;
  action: 'error' | 'warn' | 'show' | 'hide';
  message: string;
  isActive: boolean;
}

export interface SimulationPriceConfig {
  pricingModel: string;
  basePrice: number;
}

export interface SimulationInput {
  productId: number;
  optionTypes: OptionType[];
  constraints: SimulationConstraint[];
  priceConfig: SimulationPriceConfig;
}

export interface SimulationOptions {
  sample?: boolean;
  forceRun?: boolean;
  onProgress?: (current: number, total: number) => void;
}

// ─── Cartesian product generation ─────────────────────────────────────────────

/**
 * Generate all combinations of option choices.
 * Returns array of {typeKey: choiceCode} maps.
 * Returns empty array if no option types provided.
 */
export function generateCombinations(optionTypes: OptionType[]): Record<string, string>[] {
  if (optionTypes.length === 0) return [];

  const first = optionTypes[0];
  if (first === undefined) return [];

  const activeChoices = first.choices.filter((c) => c.isActive);
  if (activeChoices.length === 0) return [];

  const rest = optionTypes.slice(1);
  const restCombinations = rest.length > 0 ? generateCombinations(rest) : [{}];

  const result: Record<string, string>[] = [];
  for (const choice of activeChoices) {
    if (restCombinations.length === 0) {
      result.push({ [first.key]: choice.code });
    } else {
      for (const combination of restCombinations) {
        result.push({ [first.key]: choice.code, ...combination });
      }
    }
  }
  return result;
}

// ─── Constraint evaluation ────────────────────────────────────────────────────

interface ConstraintCheckResult {
  violated: boolean;
  action: 'error' | 'warn' | null;
  message: string | null;
}

function evaluateCombinationConstraints(
  selections: Record<string, string>,
  constraints: SimulationConstraint[],
): ConstraintCheckResult {
  let hasError = false;
  let hasWarn = false;
  let errorMessage: string | null = null;
  let warnMessage: string | null = null;

  for (const constraint of constraints) {
    if (!constraint.isActive) continue;

    const sourceValue = selections[constraint.sourceField];
    if (sourceValue !== constraint.sourceValue) continue;

    const targetValue = selections[constraint.targetField];
    if (targetValue === constraint.targetValue) {
      if (constraint.action === 'error') {
        hasError = true;
        errorMessage = constraint.message;
      } else if (constraint.action === 'warn') {
        hasWarn = true;
        warnMessage = constraint.message;
      }
    }
  }

  if (hasError) return { violated: true, action: 'error', message: errorMessage };
  if (hasWarn) return { violated: false, action: 'warn', message: warnMessage };
  return { violated: false, action: null, message: null };
}

// ─── Price calculation ────────────────────────────────────────────────────────

function calculateSimulationPrice(priceConfig: SimulationPriceConfig): number {
  // Use basePrice as the simulation price for fixed_unit and similar models
  return priceConfig.basePrice;
}

// ─── Core simulation loop ─────────────────────────────────────────────────────

// @MX:ANCHOR: [AUTO] runSimulation — async simulation entry point; processes all option combinations
// @MX:REASON: fan_in >= 3: engine.test.ts, widget-admin tRPC startSimulation, future batch job runner
// @MX:SPEC: SPEC-WB-005 FR-WB005-03, FR-WB005-04
// @MX:WARN: [AUTO] Synchronous execution for up to 10K iterations in calling thread — no async job queue
// @MX:REASON: Acceptable for current scale (< 5 sec per 10K cases); monitor for tRPC timeout issues if workload increases
export async function runSimulation(
  input: SimulationInput,
  options?: SimulationOptions,
): Promise<SimulationResult | TooLargeResult> {
  const allCombinations = generateCombinations(input.optionTypes);
  const total = allCombinations.length;

  // 10K threshold check
  if (total > SIMULATION_MAX_CASES && options?.forceRun !== true) {
    if (options?.sample === true) {
      // Sample 10K combinations and proceed
      const sampled = sampleN(allCombinations, SIMULATION_MAX_CASES);
      return runSimulationCombinations(sampled, input, options);
    }
    return { tooLarge: true, total, sampleSize: SIMULATION_MAX_CASES };
  }

  return runSimulationCombinations(allCombinations, input, options);
}

function runSimulationCombinations(
  combinations: Record<string, string>[],
  input: SimulationInput,
  options?: SimulationOptions,
): SimulationResult {
  const cases: SimulationCaseResult[] = [];
  let passed = 0;
  let warned = 0;
  let errored = 0;

  const PROGRESS_INTERVAL = 100;

  for (let i = 0; i < combinations.length; i++) {
    const combo = combinations[i];
    if (combo === undefined) continue;

    const constraintResult = evaluateCombinationConstraints(combo, input.constraints);

    let resultStatus: 'pass' | 'warn' | 'error';
    let totalPrice: number | null;
    let message: string | null;
    let constraintViolations: unknown[] | null = null;

    if (constraintResult.violated) {
      resultStatus = 'error';
      totalPrice = null;
      message = constraintResult.message;
      constraintViolations = [{ message: constraintResult.message }];
    } else if (constraintResult.action === 'warn') {
      resultStatus = 'warn';
      totalPrice = calculateSimulationPrice(input.priceConfig);
      message = constraintResult.message;
    } else {
      resultStatus = 'pass';
      totalPrice = calculateSimulationPrice(input.priceConfig);
      message = null;
    }

    cases.push({
      selections: combo,
      resultStatus,
      totalPrice,
      constraintViolations,
      priceBreakdown: totalPrice !== null ? { basePrice: totalPrice } : null,
      message,
    });

    if (resultStatus === 'pass') passed++;
    else if (resultStatus === 'warn') warned++;
    else errored++;

    if (options?.onProgress !== undefined && (i + 1) % PROGRESS_INTERVAL === 0) {
      options.onProgress(i + 1, combinations.length);
    }
  }

  return { total: combinations.length, passed, warned, errored, cases };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function sampleN<T>(items: readonly T[], n: number): T[] {
  if (n >= items.length) return [...items];
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = shuffled[i];
    const swp = shuffled[j];
    if (tmp !== undefined && swp !== undefined) {
      shuffled[i] = swp;
      shuffled[j] = tmp;
    }
  }
  return shuffled.slice(0, n);
}

// Legacy exports kept for tRPC router compatibility
export { sampleN };

export interface OptionChoiceSet {
  typeKey: string;
  choices: string[];
}

export interface CaseEvaluator {
  evaluate: (selections: Record<string, string>) => SimulationCaseResult;
}

// @MX:ANCHOR: [AUTO] cartesianProduct — low-level combination generator; called from tRPC router, runSimulation, engine.test.ts
// @MX:REASON: fan_in >= 3: widget-admin tRPC router startSimulation, engine.test.ts, resolveSimulationCombinations
// @MX:SPEC: SPEC-WB-005 FR-WB005-03
/**
 * Low-level cartesian product for OptionChoiceSet (used in tRPC router)
 */
export function cartesianProduct(optionSets: OptionChoiceSet[]): Record<string, string>[] {
  if (optionSets.length === 0) return [{}];

  const first = optionSets[0];
  if (first === undefined) return [{}];

  const rest = optionSets.slice(1);
  const restProduct = cartesianProduct(rest);

  const result: Record<string, string>[] = [];
  for (const choice of first.choices) {
    for (const combination of restProduct) {
      result.push({ [first.typeKey]: choice, ...combination });
    }
  }
  return result;
}

/**
 * Determine if a simulation run should be limited based on combination count.
 */
export function resolveSimulationCombinations(
  allCombinations: Record<string, string>[],
  options?: { sample?: boolean; forceRun?: boolean },
): { tooLarge: false; combinations: Record<string, string>[] } | TooLargeResult {
  const total = allCombinations.length;

  if (total > SIMULATION_MAX_CASES && options?.forceRun !== true) {
    if (options?.sample === true) {
      return { tooLarge: false, combinations: sampleN(allCombinations, SIMULATION_MAX_CASES) };
    }
    return { tooLarge: true, total, sampleSize: SIMULATION_MAX_CASES };
  }

  return { tooLarge: false, combinations: allCombinations };
}

/**
 * Low-level simulation case runner (used in tRPC router with custom evaluator)
 */
export function runSimulationCases(
  combinations: Record<string, string>[],
  evaluator: CaseEvaluator,
  options?: SimulationOptions,
): SimulationResult {
  const cases: SimulationCaseResult[] = [];
  let passed = 0;
  let warned = 0;
  let errored = 0;

  const PROGRESS_INTERVAL = 100;

  for (let i = 0; i < combinations.length; i++) {
    const combo = combinations[i];
    if (combo === undefined) continue;

    const result = evaluator.evaluate(combo);
    cases.push(result);

    if (result.resultStatus === 'pass') passed++;
    else if (result.resultStatus === 'warn') warned++;
    else errored++;

    if (options?.onProgress !== undefined && (i + 1) % PROGRESS_INTERVAL === 0) {
      options.onProgress(i + 1, combinations.length);
    }
  }

  return { total: combinations.length, passed, warned, errored, cases };
}
