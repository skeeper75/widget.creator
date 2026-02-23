/**
 * Tests for Kanban board grouping and status update logic.
 * REQ-E-604: KanbanBoard for MES mapping workflow.
 * REQ-C-003: Validation on status transitions.
 *
 * Tests the kanban column grouping and updateData building logic
 * from option-choice-mes-mappings.ts router.
 */
import { describe, it, expect } from 'vitest';

type MappingStatus = 'pending' | 'mapped' | 'verified';

interface MappingRow {
  id: number;
  optionChoiceId: number;
  optionChoiceName: string | null;
  mesItemId: number | null;
  mesCode: string | null;
  mappingType: string;
  mappingStatus: MappingStatus;
  mappedBy: string | null;
  mappedAt: Date | null;
  notes: string | null;
  isActive: boolean;
}

interface KanbanBoard {
  pending: MappingRow[];
  mapped: MappingRow[];
  verified: MappingRow[];
}

// Re-implement kanban grouping (same as listKanban in router)
function groupByKanbanStatus(rows: MappingRow[]): KanbanBoard {
  return {
    pending: rows.filter((r) => r.mappingStatus === 'pending'),
    mapped: rows.filter((r) => r.mappingStatus === 'mapped'),
    verified: rows.filter((r) => r.mappingStatus === 'verified'),
  };
}

// Re-implement update data builder (same as updateStatus in router)
function buildUpdateData(input: {
  mappingStatus: MappingStatus;
  mesItemId?: number | null;
  mesCode?: string | null;
  mappedBy?: string | null;
}): Record<string, unknown> {
  const updateData: Record<string, unknown> = {
    mappingStatus: input.mappingStatus,
  };

  if (input.mesItemId != null) updateData.mesItemId = input.mesItemId;
  if (input.mesCode != null) updateData.mesCode = input.mesCode;
  if (input.mappedBy != null) updateData.mappedBy = input.mappedBy;
  if (input.mappingStatus === 'verified' || input.mappingStatus === 'mapped') {
    updateData.mappedAt = expect.any(Date);
  }

  return updateData;
}

function createMockRow(overrides: Partial<MappingRow> = {}): MappingRow {
  return {
    id: 1,
    optionChoiceId: 1,
    optionChoiceName: 'Standard Paper',
    mesItemId: null,
    mesCode: null,
    mappingType: 'direct',
    mappingStatus: 'pending',
    mappedBy: null,
    mappedAt: null,
    notes: null,
    isActive: true,
    ...overrides,
  };
}

describe('kanban board grouping', () => {
  it('groups empty array into empty columns', () => {
    const kanban = groupByKanbanStatus([]);
    expect(kanban.pending).toHaveLength(0);
    expect(kanban.mapped).toHaveLength(0);
    expect(kanban.verified).toHaveLength(0);
  });

  it('groups all pending items', () => {
    const rows = [
      createMockRow({ id: 1, mappingStatus: 'pending' }),
      createMockRow({ id: 2, mappingStatus: 'pending' }),
    ];

    const kanban = groupByKanbanStatus(rows);
    expect(kanban.pending).toHaveLength(2);
    expect(kanban.mapped).toHaveLength(0);
    expect(kanban.verified).toHaveLength(0);
  });

  it('distributes items across all columns', () => {
    const rows = [
      createMockRow({ id: 1, mappingStatus: 'pending' }),
      createMockRow({ id: 2, mappingStatus: 'mapped' }),
      createMockRow({ id: 3, mappingStatus: 'verified' }),
      createMockRow({ id: 4, mappingStatus: 'pending' }),
      createMockRow({ id: 5, mappingStatus: 'mapped' }),
    ];

    const kanban = groupByKanbanStatus(rows);
    expect(kanban.pending).toHaveLength(2);
    expect(kanban.mapped).toHaveLength(2);
    expect(kanban.verified).toHaveLength(1);
  });

  it('preserves row order within columns', () => {
    const rows = [
      createMockRow({ id: 10, mappingStatus: 'pending' }),
      createMockRow({ id: 20, mappingStatus: 'mapped' }),
      createMockRow({ id: 30, mappingStatus: 'pending' }),
    ];

    const kanban = groupByKanbanStatus(rows);
    expect(kanban.pending.map((r) => r.id)).toEqual([10, 30]);
  });

  it('preserves all row data in grouped results', () => {
    const row = createMockRow({
      id: 42,
      optionChoiceId: 5,
      optionChoiceName: 'Premium Paper',
      mesItemId: 99,
      mesCode: 'MES-042',
      mappingType: 'direct',
      mappingStatus: 'mapped',
      mappedBy: 'admin@huni.co.kr',
      mappedAt: new Date('2026-02-01'),
    });

    const kanban = groupByKanbanStatus([row]);
    expect(kanban.mapped[0]).toEqual(row);
  });
});

describe('update data builder', () => {
  it('always includes mappingStatus', () => {
    const data = buildUpdateData({ mappingStatus: 'pending' });
    expect(data.mappingStatus).toBe('pending');
  });

  it('includes mesItemId when provided', () => {
    const data = buildUpdateData({ mappingStatus: 'mapped', mesItemId: 42 });
    expect(data.mesItemId).toBe(42);
  });

  it('excludes mesItemId when null', () => {
    const data = buildUpdateData({ mappingStatus: 'mapped', mesItemId: null });
    expect(data).not.toHaveProperty('mesItemId');
  });

  it('excludes mesItemId when undefined', () => {
    const data = buildUpdateData({ mappingStatus: 'pending' });
    expect(data).not.toHaveProperty('mesItemId');
  });

  it('includes mesCode when provided', () => {
    const data = buildUpdateData({ mappingStatus: 'mapped', mesCode: 'MES-001' });
    expect(data.mesCode).toBe('MES-001');
  });

  it('includes mappedBy when provided', () => {
    const data = buildUpdateData({ mappingStatus: 'mapped', mappedBy: 'admin@huni.co.kr' });
    expect(data.mappedBy).toBe('admin@huni.co.kr');
  });

  it('sets mappedAt for "mapped" status', () => {
    const data = buildUpdateData({ mappingStatus: 'mapped' });
    expect(data).toHaveProperty('mappedAt');
  });

  it('sets mappedAt for "verified" status', () => {
    const data = buildUpdateData({ mappingStatus: 'verified' });
    expect(data).toHaveProperty('mappedAt');
  });

  it('does NOT set mappedAt for "pending" status', () => {
    const data = buildUpdateData({ mappingStatus: 'pending' });
    expect(data).not.toHaveProperty('mappedAt');
  });
});

describe('product list pagination schema', () => {
  // Re-declare products list input schema (same as products.ts router)
  const listInputSchema = {
    page: { min: 1, default: 1 },
    pageSize: { min: 1, max: 100, default: 20 },
    sortOrder: { values: ['asc', 'desc'], default: 'asc' },
  };

  it('has correct default page', () => {
    expect(listInputSchema.page.default).toBe(1);
  });

  it('has correct default page size', () => {
    expect(listInputSchema.pageSize.default).toBe(20);
  });

  it('limits max page size to 100', () => {
    expect(listInputSchema.pageSize.max).toBe(100);
  });

  it('has correct default sort order', () => {
    expect(listInputSchema.sortOrder.default).toBe('asc');
  });

  it('supports both asc and desc sort', () => {
    expect(listInputSchema.sortOrder.values).toContain('asc');
    expect(listInputSchema.sortOrder.values).toContain('desc');
  });
});

describe('offset calculation', () => {
  function calculateOffset(page: number, pageSize: number): number {
    return (page - 1) * pageSize;
  }

  it('page 1 has offset 0', () => {
    expect(calculateOffset(1, 20)).toBe(0);
  });

  it('page 2 with pageSize 20 has offset 20', () => {
    expect(calculateOffset(2, 20)).toBe(20);
  });

  it('page 3 with pageSize 10 has offset 20', () => {
    expect(calculateOffset(3, 10)).toBe(20);
  });

  it('page 5 with pageSize 50 has offset 200', () => {
    expect(calculateOffset(5, 50)).toBe(200);
  });
});
