import { describe, it, expect, vi, afterEach } from 'vitest';
import { evaluateWithTimeout, buildCacheKey } from '../../src/constraints/cache.js';
import type { ConstraintEvalInput, ConstraintEvalResult } from '../../src/constraints/types.js';
import type { SelectedOption } from '../../src/options/types.js';

// Mock the evaluator module
vi.mock('../../src/constraints/evaluator.js', () => ({
  evaluateConstraints: vi.fn(),
}));

import { evaluateConstraints } from '../../src/constraints/evaluator.js';
const mockEvaluateConstraints = vi.mocked(evaluateConstraints);

function createEvalInput(overrides?: Partial<ConstraintEvalInput>): ConstraintEvalInput {
  const selections = new Map<string, SelectedOption>();
  selections.set('size', { optionKey: 'size', choiceCode: '100x150' });
  selections.set('paper', { optionKey: 'paper', choiceCode: 'art_250' });

  return {
    productId: 1,
    currentSelections: selections,
    constraints: [],
    dependencies: [],
    allChoices: [],
    ...overrides,
  };
}

function createEvalResult(overrides?: Partial<ConstraintEvalResult>): ConstraintEvalResult {
  return {
    availableOptions: new Map(),
    disabledOptions: new Map(),
    violations: [],
    evaluationTimeMs: 5,
    ...overrides,
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('buildCacheKey', () => {
  it('should produce a deterministic key from input', () => {
    const input = createEvalInput();
    const key1 = buildCacheKey(input);
    const key2 = buildCacheKey(input);
    expect(key1).toBe(key2);
  });

  it('should include productId in the key', () => {
    const input1 = createEvalInput({ productId: 1 });
    const input2 = createEvalInput({ productId: 2 });
    expect(buildCacheKey(input1)).not.toBe(buildCacheKey(input2));
  });

  it('should include sorted selection entries in the key', () => {
    const key = buildCacheKey(createEvalInput());
    // Selections are sorted alphabetically: paper, size
    expect(key).toContain('paper=art_250');
    expect(key).toContain('size=100x150');
  });

  it('should produce different keys for different selections', () => {
    const selections1 = new Map<string, SelectedOption>();
    selections1.set('size', { optionKey: 'size', choiceCode: '100x150' });

    const selections2 = new Map<string, SelectedOption>();
    selections2.set('size', { optionKey: 'size', choiceCode: '200x300' });

    const key1 = buildCacheKey(createEvalInput({ currentSelections: selections1 }));
    const key2 = buildCacheKey(createEvalInput({ currentSelections: selections2 }));
    expect(key1).not.toBe(key2);
  });

  it('should handle empty selections', () => {
    const emptySelections = new Map<string, SelectedOption>();
    const key = buildCacheKey(createEvalInput({ currentSelections: emptySelections }));
    expect(key).toBe('1:');
  });

  it('should sort selections for consistent keys regardless of insertion order', () => {
    const sel1 = new Map<string, SelectedOption>();
    sel1.set('paper', { optionKey: 'paper', choiceCode: 'art_250' });
    sel1.set('size', { optionKey: 'size', choiceCode: '100x150' });

    const sel2 = new Map<string, SelectedOption>();
    sel2.set('size', { optionKey: 'size', choiceCode: '100x150' });
    sel2.set('paper', { optionKey: 'paper', choiceCode: 'art_250' });

    const key1 = buildCacheKey(createEvalInput({ currentSelections: sel1 }));
    const key2 = buildCacheKey(createEvalInput({ currentSelections: sel2 }));
    expect(key1).toBe(key2);
  });
});

describe('evaluateWithTimeout', () => {
  it('should return evaluation result for fast evaluation', () => {
    const input = createEvalInput();
    const cache = new Map<string, ConstraintEvalResult>();
    const expected = createEvalResult({ evaluationTimeMs: 5 });
    mockEvaluateConstraints.mockReturnValue(expected);

    const result = evaluateWithTimeout(input, cache);

    expect(result).toBe(expected);
    expect(mockEvaluateConstraints).toHaveBeenCalledWith(input);
  });

  it('should store result in cache after evaluation', () => {
    const input = createEvalInput();
    const cache = new Map<string, ConstraintEvalResult>();
    const expected = createEvalResult({ evaluationTimeMs: 10 });
    mockEvaluateConstraints.mockReturnValue(expected);

    evaluateWithTimeout(input, cache);

    const cacheKey = buildCacheKey(input);
    expect(cache.has(cacheKey)).toBe(true);
    expect(cache.get(cacheKey)).toBe(expected);
  });

  it('should return cached result when evaluation exceeds timeout and cache exists', () => {
    const input = createEvalInput();
    const cache = new Map<string, ConstraintEvalResult>();
    const cachedResult = createEvalResult({ evaluationTimeMs: 3 });
    const cacheKey = buildCacheKey(input);
    cache.set(cacheKey, cachedResult);

    const slowResult = createEvalResult({ evaluationTimeMs: 100 });
    mockEvaluateConstraints.mockReturnValue(slowResult);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = evaluateWithTimeout(input, cache);
    warnSpy.mockRestore();

    expect(result).toBe(cachedResult);
  });

  it('should warn when evaluation exceeds timeout', () => {
    const input = createEvalInput();
    const cache = new Map<string, ConstraintEvalResult>();
    const slowResult = createEvalResult({ evaluationTimeMs: 100 });
    mockEvaluateConstraints.mockReturnValue(slowResult);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    evaluateWithTimeout(input, cache);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('exceeded 50ms'),
    );
    warnSpy.mockRestore();
  });

  it('should return slow result and cache it when no cached value exists', () => {
    const input = createEvalInput();
    const cache = new Map<string, ConstraintEvalResult>();
    const slowResult = createEvalResult({ evaluationTimeMs: 100 });
    mockEvaluateConstraints.mockReturnValue(slowResult);

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = evaluateWithTimeout(input, cache);
    warnSpy.mockRestore();

    expect(result).toBe(slowResult);
    expect(cache.get(buildCacheKey(input))).toBe(slowResult);
  });
});
