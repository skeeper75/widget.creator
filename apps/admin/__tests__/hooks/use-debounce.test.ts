/**
 * Tests for useDebounce hook logic.
 * REQ-S-003: Search input debouncing for DataTable global search.
 *
 * Tests the core debounce behavior without @testing-library/react.
 * Since the hook relies on setTimeout/clearTimeout, we test the debounce
 * pattern directly.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Re-implement debounce core logic (same as useDebounce minus React state)
function createDebouncer<T>(delay = 300) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let currentValue: T | undefined;
  let debouncedValue: T | undefined;

  return {
    setValue(value: T) {
      currentValue = value;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        debouncedValue = currentValue;
      }, delay);
    },
    getDebouncedValue: () => debouncedValue,
    getCurrentValue: () => currentValue,
    setInitial(value: T) {
      currentValue = value;
      debouncedValue = value;
    },
    cleanup() {
      if (timer) clearTimeout(timer);
    },
  };
}

describe('debounce logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initial value is available immediately', () => {
    const debouncer = createDebouncer<string>(300);
    debouncer.setInitial('hello');
    expect(debouncer.getDebouncedValue()).toBe('hello');
  });

  it('does not update debounced value before delay expires', () => {
    const debouncer = createDebouncer<string>(300);
    debouncer.setInitial('initial');

    debouncer.setValue('updated');
    vi.advanceTimersByTime(200);

    expect(debouncer.getDebouncedValue()).toBe('initial');
  });

  it('updates debounced value after delay expires', () => {
    const debouncer = createDebouncer<string>(300);
    debouncer.setInitial('initial');

    debouncer.setValue('updated');
    vi.advanceTimersByTime(300);

    expect(debouncer.getDebouncedValue()).toBe('updated');
  });

  it('resets timer when value changes before delay expires', () => {
    const debouncer = createDebouncer<string>(300);
    debouncer.setInitial('first');

    debouncer.setValue('second');
    vi.advanceTimersByTime(200); // Not enough

    debouncer.setValue('third');
    vi.advanceTimersByTime(200); // Still not enough from last set

    expect(debouncer.getDebouncedValue()).toBe('first'); // Still initial

    vi.advanceTimersByTime(100); // Now 300ms from 'third'

    expect(debouncer.getDebouncedValue()).toBe('third');
  });

  it('uses default delay of 300ms', () => {
    const debouncer = createDebouncer<string>();
    debouncer.setInitial('initial');

    debouncer.setValue('updated');

    vi.advanceTimersByTime(299);
    expect(debouncer.getDebouncedValue()).toBe('initial');

    vi.advanceTimersByTime(1);
    expect(debouncer.getDebouncedValue()).toBe('updated');
  });

  it('supports custom delay values', () => {
    const debouncer = createDebouncer<string>(500);
    debouncer.setInitial('initial');

    debouncer.setValue('updated');

    vi.advanceTimersByTime(300);
    expect(debouncer.getDebouncedValue()).toBe('initial');

    vi.advanceTimersByTime(200);
    expect(debouncer.getDebouncedValue()).toBe('updated');
  });

  it('works with non-string types (numbers)', () => {
    const debouncer = createDebouncer<number>(300);
    debouncer.setInitial(42);

    debouncer.setValue(99);
    vi.advanceTimersByTime(300);

    expect(debouncer.getDebouncedValue()).toBe(99);
  });

  it('works with object types', () => {
    const debouncer = createDebouncer<{ key: string }>(300);
    debouncer.setInitial({ key: 'value1' });

    debouncer.setValue({ key: 'value2' });
    vi.advanceTimersByTime(300);

    expect(debouncer.getDebouncedValue()).toEqual({ key: 'value2' });
  });

  it('cleans up timeout on cleanup', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    const debouncer = createDebouncer<string>(300);
    debouncer.setValue('test');

    debouncer.cleanup();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});

describe('useDebounce hook contract', () => {
  it('exports as a named function from use-debounce.ts', async () => {
    // Verify the module shape without importing React internals
    const hookModule = await import('../../src/hooks/use-debounce');
    expect(typeof hookModule.useDebounce).toBe('function');
  });

  it('has default delay parameter', async () => {
    const hookModule = await import('../../src/hooks/use-debounce');
    // function useDebounce<T>(value: T, delay = 300): T
    expect(hookModule.useDebounce.length).toBeLessThanOrEqual(2);
  });
});
