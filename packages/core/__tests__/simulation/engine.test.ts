/**
 * Tests for Simulation Engine.
 * SPEC-WB-005 FR-WB005-03, FR-WB005-04, AC-WB005-03, AC-WB005-04
 *
 * Tests:
 *   - cartesianProduct: combinatorics correctness
 *   - resolveSimulationCombinations: 10K threshold and sampling
 *   - runSimulationCases: result classification and aggregate counts
 *   - Performance: 1000 cases in < 30 seconds (AC-WB005-03)
 */
import { describe, it, expect, vi } from 'vitest';
import {
  cartesianProduct,
  resolveSimulationCombinations,
  runSimulationCases,
  sampleN,
  SIMULATION_MAX_CASES,
} from '../../src/simulation/engine.js';
import type { OptionChoiceSet, CaseEvaluator } from '../../src/simulation/engine.js';
import type { SimulationCaseResult, SimulationOptions } from '../../src/simulation/types.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeOptionSets(defs: { typeKey: string; count: number }[]): OptionChoiceSet[] {
  return defs.map(({ typeKey, count }) => ({
    typeKey,
    choices: Array.from({ length: count }, (_, i) => `${typeKey}_${i + 1}`),
  }));
}

/** Simple evaluator that always returns pass with fixed price */
function makePassEvaluator(price = 10000): CaseEvaluator {
  return {
    evaluate: (selections) => ({
      selections,
      resultStatus: 'pass',
      totalPrice: price,
      constraintViolations: null,
      priceBreakdown: null,
      message: null,
    }),
  };
}

/** Evaluator that returns error for specific combination */
function makeConditionalEvaluator(
  errorKey: string,
  errorValue: string,
  warnKey?: string,
  warnValue?: string,
): CaseEvaluator {
  return {
    evaluate: (selections): SimulationCaseResult => {
      if (selections[errorKey] === errorValue) {
        return {
          selections,
          resultStatus: 'error',
          totalPrice: null,
          constraintViolations: [{ type: 'forbidden', field: errorKey }],
          priceBreakdown: null,
          message: `${errorKey}=${errorValue} is forbidden`,
        };
      }
      if (warnKey && warnValue && selections[warnKey] === warnValue) {
        return {
          selections,
          resultStatus: 'warn',
          totalPrice: 12000,
          constraintViolations: null,
          priceBreakdown: null,
          message: `${warnKey}=${warnValue} has warnings`,
        };
      }
      return {
        selections,
        resultStatus: 'pass',
        totalPrice: 10000,
        constraintViolations: null,
        priceBreakdown: null,
        message: null,
      };
    },
  };
}

// ─── cartesianProduct ─────────────────────────────────────────────────────────

describe('cartesianProduct', () => {
  it('generates correct number of combinations for 2x2 options', () => {
    const optionSets = makeOptionSets([
      { typeKey: 'size', count: 2 },
      { typeKey: 'paper', count: 2 },
    ]);
    const combinations = cartesianProduct(optionSets);

    expect(combinations).toHaveLength(4); // 2 × 2
  });

  it('generates correct number of combinations for 3x3x2 options', () => {
    const optionSets = makeOptionSets([
      { typeKey: 'size', count: 3 },
      { typeKey: 'paper', count: 3 },
      { typeKey: 'print', count: 2 },
    ]);
    const combinations = cartesianProduct(optionSets);

    expect(combinations).toHaveLength(18); // 3 × 3 × 2
  });

  it('handles single option type with multiple choices', () => {
    const optionSets = makeOptionSets([{ typeKey: 'size', count: 4 }]);
    const combinations = cartesianProduct(optionSets);

    expect(combinations).toHaveLength(4);
  });

  it('returns array with empty object when no option sets provided', () => {
    const combinations = cartesianProduct([]);

    // Cartesian product of nothing is one empty combination
    expect(combinations).toHaveLength(1);
    expect(combinations[0]).toEqual({});
  });

  it('returns single combination when each option type has 1 choice', () => {
    const optionSets = makeOptionSets([
      { typeKey: 'size', count: 1 },
      { typeKey: 'paper', count: 1 },
      { typeKey: 'print', count: 1 },
    ]);
    const combinations = cartesianProduct(optionSets);

    expect(combinations).toHaveLength(1);
  });

  it('each combination includes all typeKeys', () => {
    const optionSets = makeOptionSets([
      { typeKey: 'size', count: 2 },
      { typeKey: 'paper', count: 2 },
    ]);
    const combinations = cartesianProduct(optionSets);

    combinations.forEach((combo) => {
      expect(combo).toHaveProperty('size');
      expect(combo).toHaveProperty('paper');
    });
  });

  it('produces all unique combinations', () => {
    const optionSets = makeOptionSets([
      { typeKey: 'size', count: 2 },
      { typeKey: 'paper', count: 2 },
    ]);
    const combinations = cartesianProduct(optionSets);

    const serialized = combinations.map((c) => JSON.stringify(c));
    const unique = new Set(serialized);
    expect(unique.size).toBe(combinations.length);
  });

  it('5x4x3 produces correct count', () => {
    const optionSets = makeOptionSets([
      { typeKey: 'size', count: 5 },
      { typeKey: 'paper', count: 4 },
      { typeKey: 'print', count: 3 },
    ]);
    const combinations = cartesianProduct(optionSets);

    expect(combinations).toHaveLength(60); // 5 × 4 × 3
  });
});

// ─── sampleN ──────────────────────────────────────────────────────────────────

describe('sampleN', () => {
  it('returns exactly N items when N < array length', () => {
    const items = Array.from({ length: 100 }, (_, i) => i);
    const sampled = sampleN(items, 10);

    expect(sampled).toHaveLength(10);
  });

  it('returns full array when N >= array length', () => {
    const items = [1, 2, 3, 4, 5];
    const sampled = sampleN(items, 10);

    expect(sampled).toHaveLength(5);
  });

  it('returns full array when N equals array length', () => {
    const items = [1, 2, 3];
    const sampled = sampleN(items, 3);

    expect(sampled).toHaveLength(3);
  });

  it('sampled items are a subset of original', () => {
    const items = Array.from({ length: 50 }, (_, i) => i);
    const sampled = sampleN(items, 20);

    sampled.forEach((item) => {
      expect(items).toContain(item);
    });
  });
});

// ─── resolveSimulationCombinations (10K threshold) ───────────────────────────

describe('resolveSimulationCombinations — 10K threshold', () => {
  it('returns tooLarge=true when combinations exceed 10000', () => {
    const many = Array.from({ length: 10001 }, (_, i) => ({ idx: `${i}` }));

    const result = resolveSimulationCombinations(many);

    expect(result.tooLarge).toBe(true);
    if (result.tooLarge) {
      expect(result.total).toBe(10001);
      expect(result.sampleSize).toBe(SIMULATION_MAX_CASES);
    }
  });

  it('samples 10000 when sample=true option is passed', () => {
    const many = Array.from({ length: 10001 }, (_, i) => ({ idx: `${i}` }));
    const options: SimulationOptions = { sample: true };

    const result = resolveSimulationCombinations(many, options);

    expect(result.tooLarge).toBe(false);
    if (!result.tooLarge) {
      expect(result.combinations).toHaveLength(SIMULATION_MAX_CASES);
    }
  });

  it('proceeds normally when combinations <= 10000', () => {
    const exactly10k = Array.from({ length: 1000 }, (_, i) => ({ idx: `${i}` }));

    const result = resolveSimulationCombinations(exactly10k);

    expect(result.tooLarge).toBe(false);
    if (!result.tooLarge) {
      expect(result.combinations).toHaveLength(1000);
    }
  });

  it('boundary: exactly 10000 combinations proceeds normally', () => {
    const exactly10k = Array.from({ length: 10000 }, (_, i) => ({ idx: `${i}` }));

    const result = resolveSimulationCombinations(exactly10k);

    expect(result.tooLarge).toBe(false);
    if (!result.tooLarge) {
      expect(result.combinations).toHaveLength(10000);
    }
  });

  it('forceRun=true bypasses threshold', () => {
    const many = Array.from({ length: 15000 }, (_, i) => ({ idx: `${i}` }));
    const options: SimulationOptions = { forceRun: true };

    const result = resolveSimulationCombinations(many, options);

    expect(result.tooLarge).toBe(false);
    if (!result.tooLarge) {
      expect(result.combinations).toHaveLength(15000);
    }
  });
});

// ─── runSimulationCases — result classification ────────────────────────────

describe('runSimulationCases — result classification', () => {
  it('classifies as pass when evaluator returns pass and price calculated', () => {
    const combos = cartesianProduct(makeOptionSets([
      { typeKey: 'size', count: 2 },
      { typeKey: 'paper', count: 2 },
    ]));
    const evaluator = makePassEvaluator(15000);

    const result = runSimulationCases(combos, evaluator);

    expect(result.passed).toBe(4);
    expect(result.warned).toBe(0);
    expect(result.errored).toBe(0);
    result.cases.forEach((c) => {
      expect(c.resultStatus).toBe('pass');
      expect(c.totalPrice).toBe(15000);
    });
  });

  it('classifies as error when constraint violation occurs', () => {
    const combos = cartesianProduct(makeOptionSets([
      { typeKey: 'size', count: 2 },
    ]));
    // size_1 always errors, size_2 passes
    const evaluator = makeConditionalEvaluator('size', 'size_1');

    const result = runSimulationCases(combos, evaluator);

    expect(result.errored).toBe(1);
    expect(result.passed).toBe(1);

    const errorCase = result.cases.find((c) => c.resultStatus === 'error');
    expect(errorCase?.totalPrice).toBeNull();
    expect(errorCase?.message).toBeTruthy();
  });

  it('classifies as warn when advisory constraint triggered', () => {
    const combos = cartesianProduct(makeOptionSets([
      { typeKey: 'paper', count: 3 },
    ]));
    // paper_2 gets a warning
    const evaluator = makeConditionalEvaluator('paper', 'NONE', 'paper', 'paper_2');

    const result = runSimulationCases(combos, evaluator);

    expect(result.warned).toBe(1);
    expect(result.passed).toBe(2);

    const warnCase = result.cases.find((c) => c.resultStatus === 'warn');
    expect(warnCase?.message).toBeTruthy();
  });

  it('sets totalPrice=null for error cases', () => {
    const combos = [{ size: 'S1' }]; // Single combo that will error
    const evaluator = makeConditionalEvaluator('size', 'S1');

    const result = runSimulationCases(combos, evaluator);

    const errorCases = result.cases.filter((c) => c.resultStatus === 'error');
    errorCases.forEach((c) => {
      expect(c.totalPrice).toBeNull();
    });
  });

  it('totalPrice is set for warn cases', () => {
    const combos = [{ paper: 'paper_2' }];
    const evaluator = makeConditionalEvaluator('paper', 'NONE', 'paper', 'paper_2');

    const result = runSimulationCases(combos, evaluator);

    const warnCases = result.cases.filter((c) => c.resultStatus === 'warn');
    warnCases.forEach((c) => {
      expect(c.totalPrice).not.toBeNull();
    });
  });
});

// ─── runSimulationCases — aggregate counts ────────────────────────────────────

describe('runSimulationCases — aggregate counts', () => {
  it('correctly counts total as sum of passed + warned + errored', () => {
    const combos = cartesianProduct(makeOptionSets([
      { typeKey: 'size', count: 3 },
      { typeKey: 'paper', count: 3 },
    ]));
    const evaluator = makePassEvaluator();

    const result = runSimulationCases(combos, evaluator);

    expect(result.total).toBe(result.passed + result.warned + result.errored);
    expect(result.total).toBe(9); // 3 × 3
  });

  it('all cases are represented in the cases array', () => {
    const combos = cartesianProduct(makeOptionSets([
      { typeKey: 'size', count: 2 },
      { typeKey: 'paper', count: 3 },
    ]));
    const evaluator = makePassEvaluator();

    const result = runSimulationCases(combos, evaluator);

    expect(result.cases).toHaveLength(result.total);
    expect(result.total).toBe(6); // 2 × 3
  });

  it('each case has required fields', () => {
    const combos = cartesianProduct(makeOptionSets([
      { typeKey: 'size', count: 2 },
    ]));
    const evaluator = makePassEvaluator();

    const result = runSimulationCases(combos, evaluator);

    result.cases.forEach((c) => {
      expect(c).toHaveProperty('selections');
      expect(c).toHaveProperty('resultStatus');
      expect(['pass', 'warn', 'error']).toContain(c.resultStatus);
    });
  });

  it('mixed results: aggregate counts match case array', () => {
    // size has 3 choices: size_1 errors, size_2 warns, size_3 passes
    const combos = cartesianProduct(makeOptionSets([
      { typeKey: 'size', count: 3 },
    ]));
    const evaluator = makeConditionalEvaluator('size', 'size_1', 'size', 'size_2');

    const result = runSimulationCases(combos, evaluator);

    expect(result.errored).toBe(1);
    expect(result.warned).toBe(1);
    expect(result.passed).toBe(1);
    expect(result.total).toBe(3);
  });
});

// ─── runSimulationCases — onProgress callback ─────────────────────────────────

describe('runSimulationCases — onProgress callback', () => {
  it('calls onProgress during simulation', () => {
    const progressCallbacks: number[] = [];
    // Create 500 combinations (> 100 to trigger progress)
    const combos = Array.from({ length: 500 }, (_, i) => ({ idx: `${i}` }));
    const evaluator = makePassEvaluator();
    const options: SimulationOptions = {
      onProgress: (current, _total) => {
        progressCallbacks.push(current);
      },
    };

    runSimulationCases(combos, evaluator, options);

    // Should have been called at least once (every 100 items = 5 times)
    expect(progressCallbacks.length).toBeGreaterThan(0);
  });

  it('progress values are monotonically increasing', () => {
    const progressCallbacks: number[] = [];
    const combos = Array.from({ length: 300 }, (_, i) => ({ idx: `${i}` }));
    const evaluator = makePassEvaluator();
    const options: SimulationOptions = {
      onProgress: (current) => {
        progressCallbacks.push(current);
      },
    };

    runSimulationCases(combos, evaluator, options);

    for (let i = 1; i < progressCallbacks.length; i++) {
      expect(progressCallbacks[i]).toBeGreaterThanOrEqual(progressCallbacks[i - 1]);
    }
  });

  it('does not throw when onProgress is not provided', () => {
    const combos = cartesianProduct(makeOptionSets([{ typeKey: 'size', count: 2 }]));
    const evaluator = makePassEvaluator();

    expect(() => runSimulationCases(combos, evaluator)).not.toThrow();
  });
});

// ─── Performance (AC-WB005-03) ────────────────────────────────────────────────

describe('runSimulationCases — performance', () => {
  // AC-WB005-03: 1000 cases within 30 seconds
  it('processes 1000 cases within 30 seconds', () => {
    const combos = Array.from({ length: 1000 }, (_, i) => ({ idx: `${i}` }));
    const evaluator = makePassEvaluator();

    const start = Date.now();
    const result = runSimulationCases(combos, evaluator);
    const elapsed = Date.now() - start;

    expect(result.total).toBe(1000);
    expect(elapsed).toBeLessThan(30_000); // 30 seconds
  }, 35_000); // vitest timeout: 35 seconds
});
