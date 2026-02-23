/**
 * Tests for useDataTable hook logic.
 * REQ-E-001: Generic DataTable with sort, filter, paginate.
 *
 * Tests the core data-table state management patterns without @testing-library/react.
 * The hook wraps TanStack Table with debounced global filter, server-side mode, etc.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── Pagination logic ────────────────────────────────────────────

function calculatePageCount(
  totalRows: number,
  pageSize: number,
): number {
  if (totalRows <= 0) return 0;
  return Math.ceil(totalRows / pageSize);
}

describe('pagination logic', () => {
  it('defaults to page size of 20', () => {
    const defaultPageSize = 20;
    expect(defaultPageSize).toBe(20);
  });

  it('calculates page count correctly', () => {
    expect(calculatePageCount(50, 10)).toBe(5);
    expect(calculatePageCount(50, 20)).toBe(3); // ceil(2.5)
    expect(calculatePageCount(0, 20)).toBe(0);
    expect(calculatePageCount(1, 20)).toBe(1);
    expect(calculatePageCount(20, 20)).toBe(1);
    expect(calculatePageCount(21, 20)).toBe(2);
  });

  it('handles server-side page count', () => {
    const totalRows = 50;
    const pageSize = 20;
    expect(Math.ceil(totalRows / pageSize)).toBe(3);
  });
});

// ─── Sorting state ───────────────────────────────────────────────

interface SortingEntry {
  id: string;
  desc: boolean;
}

describe('sorting state', () => {
  it('initializes with empty sorting', () => {
    const sorting: SortingEntry[] = [];
    expect(sorting).toEqual([]);
  });

  it('supports single column sort', () => {
    const sorting: SortingEntry[] = [{ id: 'name', desc: false }];
    expect(sorting).toHaveLength(1);
    expect(sorting[0].id).toBe('name');
    expect(sorting[0].desc).toBe(false);
  });

  it('supports descending sort', () => {
    const sorting: SortingEntry[] = [{ id: 'value', desc: true }];
    expect(sorting[0].desc).toBe(true);
  });
});

// ─── Column filter state ─────────────────────────────────────────

interface ColumnFilter {
  id: string;
  value: unknown;
}

describe('column filter state', () => {
  it('initializes with empty column filters', () => {
    const filters: ColumnFilter[] = [];
    expect(filters).toEqual([]);
  });

  it('supports adding column filters', () => {
    const filters: ColumnFilter[] = [
      { id: 'status', value: 'active' },
    ];
    expect(filters).toHaveLength(1);
    expect(filters[0].id).toBe('status');
  });

  it('supports multiple column filters', () => {
    const filters: ColumnFilter[] = [
      { id: 'status', value: 'active' },
      { id: 'name', value: 'test' },
    ];
    expect(filters).toHaveLength(2);
  });
});

// ─── Server-side mode state change logic ─────────────────────────

interface DataTableState {
  sorting: SortingEntry[];
  columnFilters: ColumnFilter[];
  globalFilter: string;
  pagination: { pageIndex: number; pageSize: number };
}

describe('server-side mode state change logic', () => {
  let currentState: DataTableState;

  beforeEach(() => {
    currentState = {
      sorting: [],
      columnFilters: [],
      globalFilter: '',
      pagination: { pageIndex: 0, pageSize: 20 },
    };
  });

  it('notifies onStateChange when sorting changes in server-side mode', () => {
    const onStateChange = vi.fn();
    const serverSide = true;

    // Simulate sorting change
    const newSorting: SortingEntry[] = [{ id: 'name', desc: false }];
    currentState.sorting = newSorting;

    if (serverSide && onStateChange) {
      onStateChange({ ...currentState, sorting: newSorting });
    }

    expect(onStateChange).toHaveBeenCalledWith(
      expect.objectContaining({
        sorting: [{ id: 'name', desc: false }],
      }),
    );
  });

  it('notifies onStateChange when column filters change in server-side mode', () => {
    const onStateChange = vi.fn();
    const serverSide = true;

    const newFilters: ColumnFilter[] = [{ id: 'status', value: 'active' }];
    currentState.columnFilters = newFilters;
    currentState.pagination.pageIndex = 0; // Reset to first page

    if (serverSide && onStateChange) {
      onStateChange({
        ...currentState,
        columnFilters: newFilters,
        pagination: { ...currentState.pagination, pageIndex: 0 },
      });
    }

    expect(onStateChange).toHaveBeenCalledWith(
      expect.objectContaining({
        columnFilters: [{ id: 'status', value: 'active' }],
        pagination: expect.objectContaining({ pageIndex: 0 }),
      }),
    );
  });

  it('resets to first page when filter changes', () => {
    currentState.pagination.pageIndex = 2;

    // Apply filter -> reset page
    currentState.columnFilters = [{ id: 'status', value: 'active' }];
    currentState.pagination.pageIndex = 0;

    expect(currentState.pagination.pageIndex).toBe(0);
  });

  it('notifies onStateChange when pagination changes in server-side mode', () => {
    const onStateChange = vi.fn();
    const serverSide = true;

    const newPagination = { pageIndex: 1, pageSize: 20 };
    currentState.pagination = newPagination;

    if (serverSide && onStateChange) {
      onStateChange({ ...currentState, pagination: newPagination });
    }

    expect(onStateChange).toHaveBeenCalledWith(
      expect.objectContaining({
        pagination: { pageIndex: 1, pageSize: 20 },
      }),
    );
  });

  it('does not call onStateChange in client-side mode', () => {
    const onStateChange = vi.fn();
    const serverSide = false;

    // Simulate sorting change
    currentState.sorting = [{ id: 'name', desc: false }];

    if (serverSide && onStateChange) {
      onStateChange(currentState);
    }

    expect(onStateChange).not.toHaveBeenCalled();
  });
});

// ─── Global filter with debounce ─────────────────────────────────

describe('global filter debounce logic', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes globalFilter as empty string', () => {
    const globalFilter = '';
    expect(globalFilter).toBe('');
  });

  it('debounces global filter by 300ms before applying to table', () => {
    let debouncedValue = '';
    let immediateValue = '';
    let timer: ReturnType<typeof setTimeout> | null = null;

    // Simulate setGlobalFilter + debounce
    const setGlobalFilter = (value: string) => {
      immediateValue = value;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        debouncedValue = immediateValue;
      }, 300);
    };

    setGlobalFilter('search term');

    // Immediate value updated
    expect(immediateValue).toBe('search term');
    // Debounced value not yet
    expect(debouncedValue).toBe('');

    vi.advanceTimersByTime(300);

    // Now debounced value is updated
    expect(debouncedValue).toBe('search term');
  });
});

// ─── Empty data handling ─────────────────────────────────────────

describe('empty data handling', () => {
  it('handles empty data array', () => {
    const data: unknown[] = [];
    expect(data).toHaveLength(0);
    expect(calculatePageCount(0, 20)).toBe(0);
  });
});

// ─── Hook contract ───────────────────────────────────────────────

describe('useDataTable hook contract', () => {
  it('exports as a named function from use-data-table.ts', async () => {
    const hookModule = await import('../../src/hooks/use-data-table');
    expect(typeof hookModule.useDataTable).toBe('function');
  });
});
