import { describe, it, expect } from 'vitest';
import { createOptionState, transitionState } from '../../src/options/state-machine.js';
import { OptionError } from '../../src/errors.js';
import type { OptionAction } from '../../src/options/types.js';

describe('createOptionState', () => {
  it('creates an idle state with empty collections', () => {
    const state = createOptionState();
    expect(state.status).toBe('idle');
    expect(state.productId).toBeNull();
    expect(state.selections.size).toBe(0);
    expect(state.availableOptions.size).toBe(0);
    expect(state.disabledOptions.size).toBe(0);
    expect(state.violations).toEqual([]);
    expect(state.errors).toEqual([]);
  });
});

describe('transitionState', () => {
  it('transitions from idle to loading on LOAD_PRODUCT', () => {
    const state = createOptionState();
    const action: OptionAction = { type: 'LOAD_PRODUCT', productId: 42 };
    const next = transitionState(state, action);
    expect(next.status).toBe('loading');
    expect(next.productId).toBe(42);
  });

  it('transitions from loading to ready on PRODUCT_LOADED', () => {
    const state = { ...createOptionState(), status: 'loading' as const };
    const action: OptionAction = {
      type: 'PRODUCT_LOADED',
      data: {
        productId: 42,
        productOptions: [],
        optionChoices: [],
        dependencies: [],
        constraints: [],
      },
    };
    const next = transitionState(state, action);
    expect(next.status).toBe('ready');
    expect(next.productId).toBe(42);
  });

  it('transitions from ready to selecting on SELECT_OPTION', () => {
    const state = { ...createOptionState(), status: 'ready' as const };
    const action: OptionAction = { type: 'SELECT_OPTION', optionKey: 'size', choiceCode: 'A4' };
    const next = transitionState(state, action);
    expect(next.status).toBe('selecting');
    expect(next.selections.get('size')).toEqual({
      optionKey: 'size',
      choiceCode: 'A4',
    });
  });

  it('transitions from selecting to selecting on another SELECT_OPTION', () => {
    let state = { ...createOptionState(), status: 'selecting' as const };
    state = transitionState(state, { type: 'SELECT_OPTION', optionKey: 'paper', choiceCode: 'ART250' });
    expect(state.status).toBe('selecting');
    expect(state.selections.get('paper')).toEqual({
      optionKey: 'paper',
      choiceCode: 'ART250',
    });
  });

  it('transitions from selecting to validating on VALIDATE', () => {
    const state = { ...createOptionState(), status: 'selecting' as const };
    const next = transitionState(state, { type: 'VALIDATE' });
    expect(next.status).toBe('validating');
  });

  it('DESELECT_OPTION removes the selection', () => {
    let state = { ...createOptionState(), status: 'selecting' as const };
    state.selections.set('size', { optionKey: 'size', choiceCode: 'A4' });
    const next = transitionState(state, { type: 'DESELECT_OPTION', optionKey: 'size' });
    expect(next.selections.has('size')).toBe(false);
    expect(next.status).toBe('selecting');
  });

  it('RESET returns to idle state', () => {
    const state = {
      ...createOptionState(),
      status: 'complete' as const,
      productId: 42,
    };
    const next = transitionState(state, { type: 'RESET' });
    expect(next.status).toBe('idle');
    expect(next.productId).toBeNull();
  });

  it('ERROR transitions to error and records the error', () => {
    const state = { ...createOptionState(), status: 'selecting' as const };
    const err = new Error('test error');
    const next = transitionState(state, { type: 'ERROR', error: err });
    expect(next.status).toBe('error');
    expect(next.errors).toContain(err);
  });

  it('throws OptionError on invalid transition', () => {
    const state = createOptionState(); // idle
    expect(() =>
      transitionState(state, { type: 'SELECT_OPTION', optionKey: 'size', choiceCode: 'A4' }),
    ).toThrow(OptionError);
  });

  it('throws OptionError with correct code on invalid transition', () => {
    const state = createOptionState(); // idle
    try {
      transitionState(state, { type: 'VALIDATE' });
    } catch (e) {
      expect(e).toBeInstanceOf(OptionError);
      expect((e as OptionError).code).toBe('INVALID_TRANSITION');
    }
  });

  it('allows error recovery: error -> idle (RESET)', () => {
    const state = { ...createOptionState(), status: 'error' as const };
    const next = transitionState(state, { type: 'RESET' });
    expect(next.status).toBe('idle');
  });

  it('allows error recovery: error -> loading (LOAD_PRODUCT)', () => {
    const state = { ...createOptionState(), status: 'error' as const };
    const next = transitionState(state, { type: 'LOAD_PRODUCT', productId: 1 });
    expect(next.status).toBe('loading');
  });

  it('allows error recovery: error -> ready (PRODUCT_LOADED)', () => {
    const state = { ...createOptionState(), status: 'error' as const };
    const next = transitionState(state, {
      type: 'PRODUCT_LOADED',
      data: { productId: 1, productOptions: [], optionChoices: [], dependencies: [], constraints: [] },
    });
    expect(next.status).toBe('ready');
  });

  it('complete -> selecting (SELECT_OPTION)', () => {
    const state = { ...createOptionState(), status: 'complete' as const };
    const next = transitionState(state, { type: 'SELECT_OPTION', optionKey: 'color', choiceCode: 'CMYK' });
    expect(next.status).toBe('selecting');
  });

  it('complete -> idle (RESET)', () => {
    const state = { ...createOptionState(), status: 'complete' as const };
    const next = transitionState(state, { type: 'RESET' });
    expect(next.status).toBe('idle');
  });
});
