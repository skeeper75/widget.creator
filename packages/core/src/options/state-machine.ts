// Option Engine state machine (REQ-OPT-003)

import { OptionError } from '../errors.js';
import type { OptionState, OptionAction, OptionEngineState } from './types.js';
import { STATE_TRANSITIONS } from './types.js';

/** Create initial option state */
export function createOptionState(): OptionState {
  return {
    status: 'idle',
    productId: null,
    selections: new Map(),
    availableOptions: new Map(),
    disabledOptions: new Map(),
    violations: [],
    errors: [],
  };
}

/** Validate and execute a state transition */
export function transitionState(
  state: OptionState,
  action: OptionAction,
): OptionState {
  const targetStatus = getTargetStatus(action);
  const allowed = STATE_TRANSITIONS[state.status];

  if (!allowed.includes(targetStatus)) {
    throw new OptionError('INVALID_TRANSITION', {
      from: state.status,
      to: targetStatus,
      action: action.type,
    });
  }

  switch (action.type) {
    case 'LOAD_PRODUCT':
      return {
        ...state,
        status: 'loading',
        productId: action.productId,
        selections: new Map(),
        availableOptions: new Map(),
        disabledOptions: new Map(),
        violations: [],
        errors: [],
      };

    case 'PRODUCT_LOADED':
      return {
        ...state,
        status: 'ready',
        productId: action.data.productId,
      };

    case 'SELECT_OPTION':
      return {
        ...state,
        status: 'selecting',
        selections: new Map(state.selections).set(action.optionKey, {
          optionKey: action.optionKey,
          choiceCode: action.choiceCode,
        }),
      };

    case 'DESELECT_OPTION': {
      const newSelections = new Map(state.selections);
      newSelections.delete(action.optionKey);
      return {
        ...state,
        status: 'selecting',
        selections: newSelections,
      };
    }

    case 'VALIDATE':
      return {
        ...state,
        status: 'validating',
      };

    case 'RESET':
      return createOptionState();

    case 'ERROR':
      return {
        ...state,
        status: 'error',
        errors: [...state.errors, action.error],
      };
  }
}

/** Map an action to its target state */
function getTargetStatus(action: OptionAction): OptionEngineState {
  switch (action.type) {
    case 'LOAD_PRODUCT':
      return 'loading';
    case 'PRODUCT_LOADED':
      return 'ready';
    case 'SELECT_OPTION':
    case 'DESELECT_OPTION':
      return 'selecting';
    case 'VALIDATE':
      return 'validating';
    case 'RESET':
      return 'idle';
    case 'ERROR':
      return 'error';
  }
}
