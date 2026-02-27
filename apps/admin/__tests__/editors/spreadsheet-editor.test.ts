/**
 * Tests for SpreadsheetEditor pure logic functions.
 * REQ-N-003: Block negative values for unitPrice.
 * REQ-C-002: Cost reference lookup.
 *
 * Tests the reducer, cellKey, bulk operations, and ratio calculations
 * re-implemented from spreadsheet-editor.tsx.
 */
import { describe, it, expect } from 'vitest';

// --- Types (same as spreadsheet-editor.tsx) ---

interface PriceTierRow {
  id?: number;
  optionCode: string;
  minQty: number;
  maxQty: number;
  unitPrice: string;
  isActive: boolean;
}

interface SpreadsheetState {
  rows: PriceTierRow[];
  past: PriceTierRow[][];
  future: PriceTierRow[][];
  modifiedCells: Set<string>;
}

type SpreadsheetAction =
  | { type: 'SET_DATA'; rows: PriceTierRow[] }
  | { type: 'UPDATE_CELL'; rowIndex: number; field: keyof PriceTierRow; value: string | number | boolean }
  | { type: 'BULK_UPDATE'; updates: { rowIndex: number; field: keyof PriceTierRow; value: string | number | boolean }[] }
  | { type: 'ADD_ROW'; row: PriceTierRow }
  | { type: 'DELETE_ROW'; rowIndex: number }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'CLEAR_MODIFICATIONS' };

// Re-implement cellKey (same as spreadsheet-editor.tsx)
function cellKey(rowIndex: number, field: string): string {
  return `${rowIndex}:${field}`;
}

// Re-implement reducer (same as spreadsheet-editor.tsx)
function spreadsheetReducer(state: SpreadsheetState, action: SpreadsheetAction): SpreadsheetState {
  switch (action.type) {
    case 'SET_DATA':
      return {
        rows: action.rows,
        past: [],
        future: [],
        modifiedCells: new Set(),
      };

    case 'UPDATE_CELL': {
      const newRows = state.rows.map((r, i) =>
        i === action.rowIndex ? { ...r, [action.field]: action.value } : r,
      );
      const newModified = new Set(state.modifiedCells);
      newModified.add(cellKey(action.rowIndex, action.field));
      return {
        rows: newRows,
        past: [...state.past, state.rows],
        future: [],
        modifiedCells: newModified,
      };
    }

    case 'BULK_UPDATE': {
      const newRows = [...state.rows];
      const newModified = new Set(state.modifiedCells);
      for (const upd of action.updates) {
        newRows[upd.rowIndex] = {
          ...newRows[upd.rowIndex],
          [upd.field]: upd.value,
        };
        newModified.add(cellKey(upd.rowIndex, upd.field));
      }
      return {
        rows: newRows,
        past: [...state.past, state.rows],
        future: [],
        modifiedCells: newModified,
      };
    }

    case 'ADD_ROW': {
      const newRows = [...state.rows, action.row];
      const newModified = new Set(state.modifiedCells);
      const idx = newRows.length - 1;
      newModified.add(cellKey(idx, 'optionCode'));
      newModified.add(cellKey(idx, 'unitPrice'));
      return {
        rows: newRows,
        past: [...state.past, state.rows],
        future: [],
        modifiedCells: newModified,
      };
    }

    case 'DELETE_ROW': {
      const newRows = state.rows.filter((_, i) => i !== action.rowIndex);
      return {
        rows: newRows,
        past: [...state.past, state.rows],
        future: [],
        modifiedCells: state.modifiedCells,
      };
    }

    case 'UNDO': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        rows: previous,
        past: state.past.slice(0, -1),
        future: [state.rows, ...state.future],
        modifiedCells: state.modifiedCells,
      };
    }

    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        rows: next,
        past: [...state.past, state.rows],
        future: state.future.slice(1),
        modifiedCells: state.modifiedCells,
      };
    }

    case 'CLEAR_MODIFICATIONS':
      return { ...state, modifiedCells: new Set(), past: [], future: [] };

    default:
      return state;
  }
}

// --- Helper: Negative price validation (same as confirmEdit logic) ---
function validateUnitPrice(value: string): { valid: boolean; error?: string } {
  const num = Number(value);
  if (isNaN(num) || num < 0) {
    return { valid: false, error: 'Unit price must not be negative' };
  }
  return { valid: true };
}

// --- Helper: Ratio adjustment calculation (same as handleBulkApply) ---
function applyRatioAdjustment(currentPrice: number, percent: number): string {
  const newPrice = Math.max(0, currentPrice * (1 + percent / 100));
  return newPrice.toFixed(2);
}

// --- Helper: Area selection (same as handleCellClick shift logic) ---
function calculateSelection(
  anchor: { row: number; col: number },
  target: { row: number; col: number },
  costColumnIndex: number | null,
): Set<string> {
  const selection = new Set<string>();
  const minRow = Math.min(anchor.row, target.row);
  const maxRow = Math.max(anchor.row, target.row);
  const minCol = Math.min(anchor.col, target.col);
  const maxCol = Math.max(anchor.col, target.col);
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      if (costColumnIndex !== null && c === costColumnIndex) continue;
      selection.add(`${r}:${c}`);
    }
  }
  return selection;
}

// --- Helper: Cost lookup (same as costLookup useMemo) ---
function buildCostLookup(costData: PriceTierRow[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of costData) {
    map.set(`${row.optionCode}:${row.minQty}:${row.maxQty}`, row.unitPrice);
  }
  return map;
}

// --- Test data factory ---
function createRow(overrides: Partial<PriceTierRow> = {}): PriceTierRow {
  return {
    id: 1,
    optionCode: 'OPT001',
    minQty: 1,
    maxQty: 100,
    unitPrice: '500.00',
    isActive: true,
    ...overrides,
  };
}

function emptyState(rows: PriceTierRow[] = []): SpreadsheetState {
  return {
    rows,
    past: [],
    future: [],
    modifiedCells: new Set(),
  };
}

// ===================================================================
// Tests
// ===================================================================

describe('cellKey', () => {
  it('formats rowIndex:field', () => {
    expect(cellKey(0, 'unitPrice')).toBe('0:unitPrice');
    expect(cellKey(5, 'optionCode')).toBe('5:optionCode');
  });
});

describe('spreadsheetReducer', () => {
  describe('SET_DATA', () => {
    it('replaces rows and clears history', () => {
      const rows = [createRow({ id: 1 }), createRow({ id: 2 })];
      const state = emptyState([createRow({ id: 99 })]);
      state.past.push([createRow({ id: 98 })]);
      state.modifiedCells.add('0:unitPrice');

      const result = spreadsheetReducer(state, { type: 'SET_DATA', rows });

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].id).toBe(1);
      expect(result.past).toHaveLength(0);
      expect(result.future).toHaveLength(0);
      expect(result.modifiedCells.size).toBe(0);
    });
  });

  describe('UPDATE_CELL', () => {
    it('updates cell value at rowIndex', () => {
      const state = emptyState([createRow({ unitPrice: '100.00' })]);

      const result = spreadsheetReducer(state, {
        type: 'UPDATE_CELL',
        rowIndex: 0,
        field: 'unitPrice',
        value: '200.00',
      });

      expect(result.rows[0].unitPrice).toBe('200.00');
    });

    it('pushes previous state to past (undo history)', () => {
      const state = emptyState([createRow()]);

      const result = spreadsheetReducer(state, {
        type: 'UPDATE_CELL',
        rowIndex: 0,
        field: 'unitPrice',
        value: '999',
      });

      expect(result.past).toHaveLength(1);
      expect(result.past[0][0].unitPrice).toBe('500.00');
    });

    it('clears future on new change', () => {
      const state = emptyState([createRow()]);
      state.future = [[createRow({ unitPrice: '999' })]];

      const result = spreadsheetReducer(state, {
        type: 'UPDATE_CELL',
        rowIndex: 0,
        field: 'optionCode',
        value: 'NEW',
      });

      expect(result.future).toHaveLength(0);
    });

    it('tracks modified cell in modifiedCells set', () => {
      const state = emptyState([createRow()]);

      const result = spreadsheetReducer(state, {
        type: 'UPDATE_CELL',
        rowIndex: 0,
        field: 'unitPrice',
        value: '200',
      });

      expect(result.modifiedCells.has('0:unitPrice')).toBe(true);
    });

    it('does not affect other rows', () => {
      const state = emptyState([
        createRow({ id: 1, unitPrice: '100' }),
        createRow({ id: 2, unitPrice: '200' }),
      ]);

      const result = spreadsheetReducer(state, {
        type: 'UPDATE_CELL',
        rowIndex: 0,
        field: 'unitPrice',
        value: '999',
      });

      expect(result.rows[1].unitPrice).toBe('200');
    });
  });

  describe('BULK_UPDATE', () => {
    it('updates multiple cells at once', () => {
      const state = emptyState([
        createRow({ id: 1, unitPrice: '100' }),
        createRow({ id: 2, unitPrice: '200' }),
        createRow({ id: 3, unitPrice: '300' }),
      ]);

      const result = spreadsheetReducer(state, {
        type: 'BULK_UPDATE',
        updates: [
          { rowIndex: 0, field: 'unitPrice', value: '500' },
          { rowIndex: 2, field: 'unitPrice', value: '600' },
        ],
      });

      expect(result.rows[0].unitPrice).toBe('500');
      expect(result.rows[1].unitPrice).toBe('200');
      expect(result.rows[2].unitPrice).toBe('600');
    });

    it('tracks all modified cells', () => {
      const state = emptyState([createRow(), createRow({ id: 2 })]);

      const result = spreadsheetReducer(state, {
        type: 'BULK_UPDATE',
        updates: [
          { rowIndex: 0, field: 'unitPrice', value: '100' },
          { rowIndex: 1, field: 'unitPrice', value: '200' },
        ],
      });

      expect(result.modifiedCells.has('0:unitPrice')).toBe(true);
      expect(result.modifiedCells.has('1:unitPrice')).toBe(true);
    });

    it('pushes state to past', () => {
      const state = emptyState([createRow()]);

      const result = spreadsheetReducer(state, {
        type: 'BULK_UPDATE',
        updates: [{ rowIndex: 0, field: 'unitPrice', value: '100' }],
      });

      expect(result.past).toHaveLength(1);
    });
  });

  describe('ADD_ROW', () => {
    it('appends row to end', () => {
      const state = emptyState([createRow({ id: 1 })]);

      const newRow = createRow({ id: undefined, optionCode: 'NEW' });
      const result = spreadsheetReducer(state, { type: 'ADD_ROW', row: newRow });

      expect(result.rows).toHaveLength(2);
      expect(result.rows[1].optionCode).toBe('NEW');
    });

    it('marks new row optionCode and unitPrice as modified', () => {
      const state = emptyState([createRow()]);

      const newRow = createRow({ id: undefined });
      const result = spreadsheetReducer(state, { type: 'ADD_ROW', row: newRow });

      expect(result.modifiedCells.has('1:optionCode')).toBe(true);
      expect(result.modifiedCells.has('1:unitPrice')).toBe(true);
    });

    it('pushes state to past for undo', () => {
      const state = emptyState([]);

      const result = spreadsheetReducer(state, {
        type: 'ADD_ROW',
        row: createRow({ id: undefined }),
      });

      expect(result.past).toHaveLength(1);
    });
  });

  describe('DELETE_ROW', () => {
    it('removes row at specified index', () => {
      const state = emptyState([
        createRow({ id: 1, optionCode: 'A' }),
        createRow({ id: 2, optionCode: 'B' }),
        createRow({ id: 3, optionCode: 'C' }),
      ]);

      const result = spreadsheetReducer(state, { type: 'DELETE_ROW', rowIndex: 1 });

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].optionCode).toBe('A');
      expect(result.rows[1].optionCode).toBe('C');
    });

    it('pushes state to past for undo', () => {
      const state = emptyState([createRow()]);

      const result = spreadsheetReducer(state, { type: 'DELETE_ROW', rowIndex: 0 });

      expect(result.past).toHaveLength(1);
      expect(result.past[0]).toHaveLength(1);
    });

    it('preserves modifiedCells on delete', () => {
      const state = emptyState([createRow()]);
      state.modifiedCells.add('0:unitPrice');

      const result = spreadsheetReducer(state, { type: 'DELETE_ROW', rowIndex: 0 });

      expect(result.modifiedCells.has('0:unitPrice')).toBe(true);
    });
  });

  describe('UNDO', () => {
    it('restores previous state', () => {
      let state = emptyState([createRow({ unitPrice: '100' })]);
      state = spreadsheetReducer(state, {
        type: 'UPDATE_CELL',
        rowIndex: 0,
        field: 'unitPrice',
        value: '200',
      });

      const result = spreadsheetReducer(state, { type: 'UNDO' });

      expect(result.rows[0].unitPrice).toBe('100');
    });

    it('moves current state to future', () => {
      let state = emptyState([createRow({ unitPrice: '100' })]);
      state = spreadsheetReducer(state, {
        type: 'UPDATE_CELL',
        rowIndex: 0,
        field: 'unitPrice',
        value: '200',
      });

      const result = spreadsheetReducer(state, { type: 'UNDO' });

      expect(result.future).toHaveLength(1);
      expect(result.future[0][0].unitPrice).toBe('200');
    });

    it('returns same state when past is empty', () => {
      const state = emptyState([createRow()]);

      const result = spreadsheetReducer(state, { type: 'UNDO' });

      expect(result).toBe(state);
    });

    it('supports multiple undo steps', () => {
      let state = emptyState([createRow({ unitPrice: '100' })]);
      state = spreadsheetReducer(state, {
        type: 'UPDATE_CELL', rowIndex: 0, field: 'unitPrice', value: '200',
      });
      state = spreadsheetReducer(state, {
        type: 'UPDATE_CELL', rowIndex: 0, field: 'unitPrice', value: '300',
      });

      state = spreadsheetReducer(state, { type: 'UNDO' });
      expect(state.rows[0].unitPrice).toBe('200');

      state = spreadsheetReducer(state, { type: 'UNDO' });
      expect(state.rows[0].unitPrice).toBe('100');
    });
  });

  describe('REDO', () => {
    it('restores next state from future', () => {
      let state = emptyState([createRow({ unitPrice: '100' })]);
      state = spreadsheetReducer(state, {
        type: 'UPDATE_CELL',
        rowIndex: 0,
        field: 'unitPrice',
        value: '200',
      });
      state = spreadsheetReducer(state, { type: 'UNDO' });

      const result = spreadsheetReducer(state, { type: 'REDO' });

      expect(result.rows[0].unitPrice).toBe('200');
    });

    it('returns same state when future is empty', () => {
      const state = emptyState([createRow()]);

      const result = spreadsheetReducer(state, { type: 'REDO' });

      expect(result).toBe(state);
    });

    it('moves redone state to past', () => {
      let state = emptyState([createRow({ unitPrice: '100' })]);
      state = spreadsheetReducer(state, {
        type: 'UPDATE_CELL',
        rowIndex: 0,
        field: 'unitPrice',
        value: '200',
      });
      state = spreadsheetReducer(state, { type: 'UNDO' });

      const result = spreadsheetReducer(state, { type: 'REDO' });

      expect(result.past.length).toBeGreaterThan(0);
    });

    it('supports undo then redo cycle', () => {
      let state = emptyState([createRow({ unitPrice: '100' })]);
      state = spreadsheetReducer(state, {
        type: 'UPDATE_CELL', rowIndex: 0, field: 'unitPrice', value: '200',
      });
      state = spreadsheetReducer(state, {
        type: 'UPDATE_CELL', rowIndex: 0, field: 'unitPrice', value: '300',
      });

      state = spreadsheetReducer(state, { type: 'UNDO' });
      state = spreadsheetReducer(state, { type: 'UNDO' });
      state = spreadsheetReducer(state, { type: 'REDO' });

      expect(state.rows[0].unitPrice).toBe('200');
    });
  });

  describe('CLEAR_MODIFICATIONS', () => {
    it('clears modifiedCells and history', () => {
      let state = emptyState([createRow()]);
      state = spreadsheetReducer(state, {
        type: 'UPDATE_CELL',
        rowIndex: 0,
        field: 'unitPrice',
        value: '999',
      });

      const result = spreadsheetReducer(state, { type: 'CLEAR_MODIFICATIONS' });

      expect(result.modifiedCells.size).toBe(0);
      expect(result.past).toHaveLength(0);
      expect(result.future).toHaveLength(0);
    });

    it('preserves current rows', () => {
      let state = emptyState([createRow({ unitPrice: '999' })]);
      state = spreadsheetReducer(state, {
        type: 'UPDATE_CELL',
        rowIndex: 0,
        field: 'unitPrice',
        value: '1000',
      });

      const result = spreadsheetReducer(state, { type: 'CLEAR_MODIFICATIONS' });

      expect(result.rows[0].unitPrice).toBe('1000');
    });
  });

  describe('unknown action type', () => {
    it('returns same state for unknown action', () => {
      const state = emptyState([createRow()]);

      const result = spreadsheetReducer(state, { type: 'UNKNOWN' } as unknown as SpreadsheetAction);

      expect(result).toBe(state);
    });
  });
});

describe('validateUnitPrice (REQ-N-003)', () => {
  it('accepts zero', () => {
    expect(validateUnitPrice('0')).toEqual({ valid: true });
  });

  it('accepts positive values', () => {
    expect(validateUnitPrice('100')).toEqual({ valid: true });
    expect(validateUnitPrice('999.99')).toEqual({ valid: true });
  });

  it('rejects negative values', () => {
    const result = validateUnitPrice('-1');
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('rejects NaN strings', () => {
    const result = validateUnitPrice('abc');
    expect(result.valid).toBe(false);
  });

  it('accepts empty string (Number("") === 0, which is >= 0)', () => {
    const result = validateUnitPrice('');
    expect(result.valid).toBe(true);
  });

  it('accepts decimal values', () => {
    expect(validateUnitPrice('0.01')).toEqual({ valid: true });
    expect(validateUnitPrice('1234.56')).toEqual({ valid: true });
  });

  it('rejects negative decimals', () => {
    expect(validateUnitPrice('-0.01').valid).toBe(false);
  });
});

describe('applyRatioAdjustment', () => {
  it('increases by percentage', () => {
    expect(applyRatioAdjustment(100, 10)).toBe('110.00');
    expect(applyRatioAdjustment(200, 25)).toBe('250.00');
  });

  it('decreases by percentage', () => {
    expect(applyRatioAdjustment(100, -10)).toBe('90.00');
    expect(applyRatioAdjustment(200, -50)).toBe('100.00');
  });

  it('floors to 0 when decrease exceeds 100%', () => {
    expect(applyRatioAdjustment(100, -150)).toBe('0.00');
  });

  it('handles 0% adjustment', () => {
    expect(applyRatioAdjustment(500, 0)).toBe('500.00');
  });

  it('handles 0 price', () => {
    expect(applyRatioAdjustment(0, 50)).toBe('0.00');
  });

  it('handles large percentage increase', () => {
    expect(applyRatioAdjustment(100, 200)).toBe('300.00');
  });
});

describe('calculateSelection (shift+click area selection)', () => {
  it('selects single cell when anchor equals target', () => {
    const result = calculateSelection({ row: 2, col: 3 }, { row: 2, col: 3 }, null);
    expect(result.size).toBe(1);
    expect(result.has('2:3')).toBe(true);
  });

  it('selects row range', () => {
    const result = calculateSelection({ row: 1, col: 0 }, { row: 3, col: 0 }, null);
    expect(result.size).toBe(3);
    expect(result.has('1:0')).toBe(true);
    expect(result.has('2:0')).toBe(true);
    expect(result.has('3:0')).toBe(true);
  });

  it('selects column range', () => {
    const result = calculateSelection({ row: 0, col: 1 }, { row: 0, col: 3 }, null);
    expect(result.size).toBe(3);
    expect(result.has('0:1')).toBe(true);
    expect(result.has('0:2')).toBe(true);
    expect(result.has('0:3')).toBe(true);
  });

  it('selects 2D area', () => {
    const result = calculateSelection({ row: 0, col: 0 }, { row: 2, col: 2 }, null);
    expect(result.size).toBe(9);
  });

  it('handles reversed direction (target < anchor)', () => {
    const result = calculateSelection({ row: 3, col: 3 }, { row: 1, col: 1 }, null);
    expect(result.size).toBe(9);
    expect(result.has('1:1')).toBe(true);
    expect(result.has('3:3')).toBe(true);
  });

  it('excludes cost column from selection', () => {
    const result = calculateSelection({ row: 0, col: 0 }, { row: 0, col: 4 }, 4);
    expect(result.size).toBe(4);
    expect(result.has('0:4')).toBe(false);
  });

  it('excludes cost column in 2D area', () => {
    const result = calculateSelection({ row: 0, col: 3 }, { row: 1, col: 4 }, 4);
    // 2 rows x 1 col (col 3 only, col 4 excluded)
    expect(result.size).toBe(2);
    expect(result.has('0:3')).toBe(true);
    expect(result.has('1:3')).toBe(true);
    expect(result.has('0:4')).toBe(false);
  });
});

describe('buildCostLookup (REQ-C-002)', () => {
  it('builds empty map for empty data', () => {
    const map = buildCostLookup([]);
    expect(map.size).toBe(0);
  });

  it('builds lookup key from optionCode:minQty:maxQty', () => {
    const costData = [
      createRow({ optionCode: 'OPT1', minQty: 1, maxQty: 100, unitPrice: '50.00' }),
    ];
    const map = buildCostLookup(costData);
    expect(map.get('OPT1:1:100')).toBe('50.00');
  });

  it('handles multiple entries', () => {
    const costData = [
      createRow({ optionCode: 'A', minQty: 1, maxQty: 10, unitPrice: '10.00' }),
      createRow({ optionCode: 'A', minQty: 11, maxQty: 50, unitPrice: '8.00' }),
      createRow({ optionCode: 'B', minQty: 1, maxQty: 100, unitPrice: '20.00' }),
    ];
    const map = buildCostLookup(costData);
    expect(map.size).toBe(3);
    expect(map.get('A:1:10')).toBe('10.00');
    expect(map.get('A:11:50')).toBe('8.00');
    expect(map.get('B:1:100')).toBe('20.00');
  });

  it('returns undefined for non-existent key', () => {
    const costData = [createRow({ optionCode: 'A', minQty: 1, maxQty: 10, unitPrice: '10.00' })];
    const map = buildCostLookup(costData);
    expect(map.get('NONEXISTENT:1:10')).toBeUndefined();
  });
});

describe('modified row tracking for save', () => {
  // Re-implement save filter logic (same as handleSave)
  function getModifiedRowIndices(modifiedCells: Set<string>): Set<number> {
    const indices = new Set<number>();
    for (const key of modifiedCells) {
      const rowIdx = Number(key.split(':')[0]);
      indices.add(rowIdx);
    }
    return indices;
  }

  it('extracts row indices from modified cells', () => {
    const modified = new Set(['0:unitPrice', '0:optionCode', '2:unitPrice']);
    const indices = getModifiedRowIndices(modified);
    expect(indices.size).toBe(2);
    expect(indices.has(0)).toBe(true);
    expect(indices.has(2)).toBe(true);
  });

  it('returns empty set for no modifications', () => {
    const indices = getModifiedRowIndices(new Set());
    expect(indices.size).toBe(0);
  });

  it('deduplicates same row multiple fields', () => {
    const modified = new Set(['3:unitPrice', '3:optionCode', '3:minQty']);
    const indices = getModifiedRowIndices(modified);
    expect(indices.size).toBe(1);
    expect(indices.has(3)).toBe(true);
  });
});
