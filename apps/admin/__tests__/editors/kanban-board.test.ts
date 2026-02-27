/**
 * Tests for KanbanBoard pure logic functions.
 * REQ-E-604: 3-column Kanban board for MES mapping workflow.
 * REQ-C-003: Status transition validation.
 *
 * Tests card filtering, status transition rules, and mapping dialog logic
 * re-implemented from kanban-board.tsx.
 */
import { describe, it, expect } from 'vitest';

// --- Types (same as kanban-board.tsx) ---

type MappingStatus = 'pending' | 'mapped' | 'verified';

interface KanbanCard {
  id: number;
  optionChoiceId: number;
  optionChoiceName: string | null;
  mesItemId: number | null;
  mesCode: string | null;
  mappingType: string;
  mappingStatus: MappingStatus;
  mappedBy: string | null;
  mappedAt: Date | string | null;
  notes: string | null;
  isActive: boolean;
}

interface KanbanData {
  pending: KanbanCard[];
  mapped: KanbanCard[];
  verified: KanbanCard[];
}

// COLUMN_CONFIG (same as kanban-board.tsx)
const COLUMN_CONFIG: { key: MappingStatus; label: string; color: string }[] = [
  { key: 'pending', label: 'Pending', color: 'bg-yellow-100 border-yellow-300' },
  { key: 'mapped', label: 'Mapped', color: 'bg-blue-100 border-blue-300' },
  { key: 'verified', label: 'Verified', color: 'bg-green-100 border-green-300' },
];

// --- Re-implement filterCards (same as KanbanBoard filterCards callback) ---
function filterCards(
  cards: KanbanCard[],
  mappingTypeFilter: string | null,
  search: string,
): KanbanCard[] {
  let filtered = cards;
  if (mappingTypeFilter) {
    filtered = filtered.filter((c) => c.mappingType === mappingTypeFilter);
  }
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.optionChoiceName?.toLowerCase().includes(q) ||
        c.mesCode?.toLowerCase().includes(q) ||
        String(c.optionChoiceId).includes(q),
    );
  }
  return filtered;
}

// --- Re-implement status transition logic (same as handleDragEnd) ---
type TransitionResult =
  | { action: 'dialog'; dialogType: 'mapping'; cardId: number }
  | { action: 'dialog'; dialogType: 'verify'; cardId: number }
  | { action: 'direct'; cardId: number; targetStatus: MappingStatus }
  | { action: 'noop' };

function resolveTransition(
  currentStatus: MappingStatus,
  targetStatus: MappingStatus,
  cardId: number,
): TransitionResult {
  if (currentStatus === targetStatus) return { action: 'noop' };

  // Pending -> Mapped: show mapping dialog for mesItemId + mesCode
  if (currentStatus === 'pending' && targetStatus === 'mapped') {
    return { action: 'dialog', dialogType: 'mapping', cardId };
  }

  // Mapped -> Verified: show confirm dialog
  if (currentStatus === 'mapped' && targetStatus === 'verified') {
    return { action: 'dialog', dialogType: 'verify', cardId };
  }

  // Other transitions: direct update (backward moves)
  return { action: 'direct', cardId, targetStatus };
}

// --- Re-implement mapping confirm builder (same as handleMappingConfirm) ---
function buildMappingExtra(mesItemId: string, mesCode: string) {
  return {
    mesItemId: mesItemId ? Number(mesItemId) : undefined,
    mesCode: mesCode || undefined,
    mappedBy: 'admin',
  };
}

// --- Card display name fallback (same as KanbanCardView) ---
function getCardDisplayName(card: KanbanCard): string {
  return card.optionChoiceName ?? `Choice ${card.optionChoiceId}`;
}

// --- Test data factory ---
function createCard(overrides: Partial<KanbanCard> = {}): KanbanCard {
  return {
    id: 1,
    optionChoiceId: 100,
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

// ===================================================================
// Tests
// ===================================================================

describe('COLUMN_CONFIG', () => {
  it('has 3 columns', () => {
    expect(COLUMN_CONFIG).toHaveLength(3);
  });

  it('has columns in correct order: pending, mapped, verified', () => {
    expect(COLUMN_CONFIG.map((c) => c.key)).toEqual(['pending', 'mapped', 'verified']);
  });

  it('each column has label and color', () => {
    for (const col of COLUMN_CONFIG) {
      expect(col.label).toBeTruthy();
      expect(col.color).toBeTruthy();
    }
  });
});

describe('filterCards', () => {
  describe('mappingType filter', () => {
    it('returns all cards when filter is null', () => {
      const cards = [
        createCard({ id: 1, mappingType: 'direct' }),
        createCard({ id: 2, mappingType: 'composite' }),
      ];
      expect(filterCards(cards, null, '')).toHaveLength(2);
    });

    it('filters by mappingType', () => {
      const cards = [
        createCard({ id: 1, mappingType: 'direct' }),
        createCard({ id: 2, mappingType: 'composite' }),
        createCard({ id: 3, mappingType: 'direct' }),
      ];
      const result = filterCards(cards, 'direct', '');
      expect(result).toHaveLength(2);
      expect(result.every((c) => c.mappingType === 'direct')).toBe(true);
    });

    it('returns empty when no match', () => {
      const cards = [createCard({ mappingType: 'direct' })];
      expect(filterCards(cards, 'composite', '')).toHaveLength(0);
    });
  });

  describe('search filter', () => {
    it('searches by optionChoiceName (case insensitive)', () => {
      const cards = [
        createCard({ id: 1, optionChoiceName: 'Premium Paper' }),
        createCard({ id: 2, optionChoiceName: 'Standard Paper' }),
        createCard({ id: 3, optionChoiceName: 'Glossy Finish' }),
      ];
      const result = filterCards(cards, null, 'paper');
      expect(result).toHaveLength(2);
    });

    it('searches by mesCode', () => {
      const cards = [
        createCard({ id: 1, mesCode: 'MES-001' }),
        createCard({ id: 2, mesCode: 'MES-002' }),
        createCard({ id: 3, mesCode: null }),
      ];
      const result = filterCards(cards, null, 'MES-001');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('searches by optionChoiceId', () => {
      const cards = [
        createCard({ id: 1, optionChoiceId: 100 }),
        createCard({ id: 2, optionChoiceId: 200 }),
        createCard({ id: 3, optionChoiceId: 1001 }),
      ];
      const result = filterCards(cards, null, '100');
      expect(result).toHaveLength(2); // 100 and 1001
    });

    it('returns all when search is empty', () => {
      const cards = [createCard({ id: 1 }), createCard({ id: 2 })];
      expect(filterCards(cards, null, '')).toHaveLength(2);
    });

    it('handles null optionChoiceName', () => {
      const cards = [createCard({ id: 1, optionChoiceName: null })];
      expect(filterCards(cards, null, 'paper')).toHaveLength(0);
    });
  });

  describe('combined filters', () => {
    it('applies both mappingType and search', () => {
      const cards = [
        createCard({ id: 1, mappingType: 'direct', optionChoiceName: 'Paper A' }),
        createCard({ id: 2, mappingType: 'composite', optionChoiceName: 'Paper B' }),
        createCard({ id: 3, mappingType: 'direct', optionChoiceName: 'Finish C' }),
      ];
      const result = filterCards(cards, 'direct', 'paper');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });
  });
});

describe('resolveTransition', () => {
  it('returns noop when same status', () => {
    expect(resolveTransition('pending', 'pending', 1)).toEqual({ action: 'noop' });
    expect(resolveTransition('mapped', 'mapped', 1)).toEqual({ action: 'noop' });
    expect(resolveTransition('verified', 'verified', 1)).toEqual({ action: 'noop' });
  });

  it('returns mapping dialog for pending -> mapped', () => {
    const result = resolveTransition('pending', 'mapped', 42);
    expect(result).toEqual({
      action: 'dialog',
      dialogType: 'mapping',
      cardId: 42,
    });
  });

  it('returns verify dialog for mapped -> verified', () => {
    const result = resolveTransition('mapped', 'verified', 99);
    expect(result).toEqual({
      action: 'dialog',
      dialogType: 'verify',
      cardId: 99,
    });
  });

  it('returns direct update for backward transition: mapped -> pending', () => {
    const result = resolveTransition('mapped', 'pending', 10);
    expect(result).toEqual({
      action: 'direct',
      cardId: 10,
      targetStatus: 'pending',
    });
  });

  it('returns direct update for backward transition: verified -> mapped', () => {
    const result = resolveTransition('verified', 'mapped', 20);
    expect(result).toEqual({
      action: 'direct',
      cardId: 20,
      targetStatus: 'mapped',
    });
  });

  it('returns direct update for skip backward: verified -> pending', () => {
    const result = resolveTransition('verified', 'pending', 30);
    expect(result).toEqual({
      action: 'direct',
      cardId: 30,
      targetStatus: 'pending',
    });
  });

  it('returns direct update for skip forward: pending -> verified', () => {
    const result = resolveTransition('pending', 'verified', 40);
    expect(result).toEqual({
      action: 'direct',
      cardId: 40,
      targetStatus: 'verified',
    });
  });
});

describe('buildMappingExtra', () => {
  it('converts mesItemId string to number', () => {
    const result = buildMappingExtra('42', 'MES-001');
    expect(result.mesItemId).toBe(42);
  });

  it('sets mesItemId undefined for empty string', () => {
    const result = buildMappingExtra('', 'MES-001');
    expect(result.mesItemId).toBeUndefined();
  });

  it('sets mesCode when provided', () => {
    const result = buildMappingExtra('1', 'MES-ABC');
    expect(result.mesCode).toBe('MES-ABC');
  });

  it('sets mesCode undefined for empty string', () => {
    const result = buildMappingExtra('1', '');
    expect(result.mesCode).toBeUndefined();
  });

  it('always sets mappedBy to admin', () => {
    const result = buildMappingExtra('1', 'code');
    expect(result.mappedBy).toBe('admin');
  });
});

describe('getCardDisplayName', () => {
  it('returns optionChoiceName when available', () => {
    const card = createCard({ optionChoiceName: 'Premium Paper' });
    expect(getCardDisplayName(card)).toBe('Premium Paper');
  });

  it('returns fallback when optionChoiceName is null', () => {
    const card = createCard({ optionChoiceName: null, optionChoiceId: 42 });
    expect(getCardDisplayName(card)).toBe('Choice 42');
  });
});

describe('kanban data structure', () => {
  it('supports empty data', () => {
    const data: KanbanData = { pending: [], mapped: [], verified: [] };
    expect(data.pending).toHaveLength(0);
    expect(data.mapped).toHaveLength(0);
    expect(data.verified).toHaveLength(0);
  });

  it('each column holds correct status cards', () => {
    const data: KanbanData = {
      pending: [createCard({ id: 1, mappingStatus: 'pending' })],
      mapped: [createCard({ id: 2, mappingStatus: 'mapped' })],
      verified: [createCard({ id: 3, mappingStatus: 'verified' })],
    };
    expect(data.pending[0].mappingStatus).toBe('pending');
    expect(data.mapped[0].mappingStatus).toBe('mapped');
    expect(data.verified[0].mappingStatus).toBe('verified');
  });
});

describe('column statistics', () => {
  function getColumnCounts(data: KanbanData): Record<MappingStatus, number> {
    return {
      pending: data.pending.length,
      mapped: data.mapped.length,
      verified: data.verified.length,
    };
  }

  it('counts cards per column', () => {
    const data: KanbanData = {
      pending: [createCard({ id: 1 }), createCard({ id: 2 })],
      mapped: [createCard({ id: 3 })],
      verified: [],
    };
    const counts = getColumnCounts(data);
    expect(counts.pending).toBe(2);
    expect(counts.mapped).toBe(1);
    expect(counts.verified).toBe(0);
  });

  it('returns all zeros for empty board', () => {
    const counts = getColumnCounts({ pending: [], mapped: [], verified: [] });
    expect(counts.pending).toBe(0);
    expect(counts.mapped).toBe(0);
    expect(counts.verified).toBe(0);
  });
});
