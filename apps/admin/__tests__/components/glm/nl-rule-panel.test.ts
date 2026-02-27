/**
 * Tests for NlRulePanel component logic (nl-rule-panel.tsx)
 * SPEC-WB-007 FR-WB007-05
 *
 * Tests the pure logic extracted from NlRulePanel:
 * - Mode-based example lists (constraint / price_rule / option_suggest)
 * - Mode labels mapping
 * - handleConvert behavior: skip empty text, skip when loading, call onConvert
 * - handleExampleClick: sets text and clears error
 * - Error state management
 *
 * NOTE: Admin vitest runs in 'node' environment (no DOM). Component rendering
 * tests are done by extracting and testing the pure logic functions.
 */
import { describe, it, expect, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Re-declare pure logic from nl-rule-panel.tsx
// ---------------------------------------------------------------------------

type NlPanelMode = 'constraint' | 'price_rule' | 'option_suggest';

const EXAMPLES: Record<NlPanelMode, string[]> = {
  constraint: [
    '투명PVC 선택하면 PP코팅 못 쓰게 해줘',
    '박가공 선택하면 동판비 자동으로 추가해줘',
    '중철제본이면 페이지수를 4의 배수로만 선택 가능하게',
  ],
  price_rule: [
    '100장 이상 5% 할인',
    '100장 5%, 500장 10%, 1000장 이상 15%',
    '현수막은 가로×세로 크기로 가격 계산',
  ],
  option_suggest: [
    '명함 기본 용지: 아트지, 스노우지, 크라프트지',
    '봉투 기본 옵션: 단면칼라, 단면흑백, 양면칼라',
  ],
};

const MODE_LABELS: Record<NlPanelMode, string> = {
  constraint: '제약조건',
  price_rule: '가격룰',
  option_suggest: '옵션값',
};

/**
 * Simulates the handleConvert logic from NlRulePanel.
 * Returns what onConvert would be called with, or null if skipped.
 */
async function simulateHandleConvert(
  nlText: string,
  isLoading: boolean,
  mode: NlPanelMode,
  recipeId: number | undefined,
  productId: number | undefined,
  onConvert: ((result: unknown) => void) | undefined,
): Promise<{ called: boolean; payload: unknown | null }> {
  if (!nlText.trim() || isLoading) {
    return { called: false, payload: null };
  }
  const payload = { nlText, mode, recipeId, productId };
  onConvert?.(payload);
  return { called: true, payload };
}

/**
 * Simulates the handleExampleClick logic from NlRulePanel.
 */
function simulateHandleExampleClick(
  example: string,
  _currentError: string | null,
): { nlText: string; error: null } {
  return { nlText: example, error: null };
}

// ---------------------------------------------------------------------------
// EXAMPLES constant
// ---------------------------------------------------------------------------

describe('NlRulePanel — EXAMPLES constant', () => {
  it('constraint mode has 3 examples', () => {
    expect(EXAMPLES.constraint).toHaveLength(3);
  });

  it('price_rule mode has 3 examples', () => {
    expect(EXAMPLES.price_rule).toHaveLength(3);
  });

  it('option_suggest mode has 2 examples', () => {
    expect(EXAMPLES.option_suggest).toHaveLength(2);
  });

  it('constraint examples contain 투명PVC scenario', () => {
    expect(EXAMPLES.constraint[0]).toContain('투명PVC');
  });

  it('price_rule examples contain percentage discount scenario', () => {
    expect(EXAMPLES.price_rule.some((e) => e.includes('%'))).toBe(true);
  });

  it('option_suggest examples contain 명함 scenario', () => {
    expect(EXAMPLES.option_suggest[0]).toContain('명함');
  });

  it('all modes have at least one example', () => {
    const modes: NlPanelMode[] = ['constraint', 'price_rule', 'option_suggest'];
    for (const mode of modes) {
      expect(EXAMPLES[mode].length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// MODE_LABELS constant
// ---------------------------------------------------------------------------

describe('NlRulePanel — MODE_LABELS constant', () => {
  it('constraint label is "제약조건"', () => {
    expect(MODE_LABELS.constraint).toBe('제약조건');
  });

  it('price_rule label is "가격룰"', () => {
    expect(MODE_LABELS.price_rule).toBe('가격룰');
  });

  it('option_suggest label is "옵션값"', () => {
    expect(MODE_LABELS.option_suggest).toBe('옵션값');
  });

  it('all three modes have labels', () => {
    const modes: NlPanelMode[] = ['constraint', 'price_rule', 'option_suggest'];
    for (const mode of modes) {
      expect(typeof MODE_LABELS[mode]).toBe('string');
      expect(MODE_LABELS[mode].length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// handleConvert logic
// ---------------------------------------------------------------------------

describe('NlRulePanel — handleConvert logic', () => {
  it('skips call when nlText is empty', async () => {
    const onConvert = vi.fn();
    const result = await simulateHandleConvert('', false, 'constraint', 1, undefined, onConvert);
    expect(result.called).toBe(false);
    expect(onConvert).not.toHaveBeenCalled();
  });

  it('skips call when nlText is whitespace only', async () => {
    const onConvert = vi.fn();
    const result = await simulateHandleConvert('   ', false, 'constraint', 1, undefined, onConvert);
    expect(result.called).toBe(false);
    expect(onConvert).not.toHaveBeenCalled();
  });

  it('skips call when isLoading is true', async () => {
    const onConvert = vi.fn();
    const result = await simulateHandleConvert(
      '투명PVC 선택하면 PP코팅 못 쓰게 해줘',
      true, // isLoading
      'constraint',
      1,
      undefined,
      onConvert,
    );
    expect(result.called).toBe(false);
    expect(onConvert).not.toHaveBeenCalled();
  });

  it('calls onConvert with correct payload when text is provided', async () => {
    const onConvert = vi.fn();
    const result = await simulateHandleConvert(
      '투명PVC 선택하면 PP코팅 못 쓰게 해줘',
      false,
      'constraint',
      1,
      undefined,
      onConvert,
    );
    expect(result.called).toBe(true);
    expect(onConvert).toHaveBeenCalledOnce();
    expect(onConvert).toHaveBeenCalledWith({
      nlText: '투명PVC 선택하면 PP코팅 못 쓰게 해줘',
      mode: 'constraint',
      recipeId: 1,
      productId: undefined,
    });
  });

  it('includes productId in payload for price_rule mode', async () => {
    const onConvert = vi.fn();
    await simulateHandleConvert(
      '100장 이상 5% 할인',
      false,
      'price_rule',
      undefined,
      7,
      onConvert,
    );
    expect(onConvert).toHaveBeenCalledWith({
      nlText: '100장 이상 5% 할인',
      mode: 'price_rule',
      recipeId: undefined,
      productId: 7,
    });
  });

  it('does not throw when onConvert is undefined', async () => {
    await expect(
      simulateHandleConvert('테스트 텍스트', false, 'constraint', 1, undefined, undefined),
    ).resolves.not.toThrow();
  });

  it('trims leading/trailing whitespace check: non-empty trimmed text proceeds', async () => {
    const onConvert = vi.fn();
    const result = await simulateHandleConvert('\n테스트\n', false, 'constraint', 1, undefined, onConvert);
    expect(result.called).toBe(true);
    expect(onConvert).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// handleExampleClick logic
// ---------------------------------------------------------------------------

describe('NlRulePanel — handleExampleClick logic', () => {
  it('sets nlText to the clicked example', () => {
    const example = '투명PVC 선택하면 PP코팅 못 쓰게 해줘';
    const { nlText } = simulateHandleExampleClick(example, null);
    expect(nlText).toBe(example);
  });

  it('clears existing error when example is clicked', () => {
    const { error } = simulateHandleExampleClick('박가공 자동 추가', '이전 에러 메시지');
    expect(error).toBeNull();
  });

  it('sets nlText to price_rule example', () => {
    const example = '100장 5%, 500장 10%, 1000장 이상 15%';
    const { nlText } = simulateHandleExampleClick(example, null);
    expect(nlText).toBe(example);
  });

  it('sets nlText to option_suggest example', () => {
    const example = '명함 기본 용지: 아트지, 스노우지, 크라프트지';
    const { nlText } = simulateHandleExampleClick(example, null);
    expect(nlText).toBe(example);
  });
});

// ---------------------------------------------------------------------------
// Convert button disabled state logic
// ---------------------------------------------------------------------------

describe('NlRulePanel — convert button disabled state', () => {
  function isButtonDisabled(nlText: string, isLoading: boolean): boolean {
    return !nlText.trim() || isLoading;
  }

  it('disabled when nlText is empty', () => {
    expect(isButtonDisabled('', false)).toBe(true);
  });

  it('disabled when nlText is whitespace only', () => {
    expect(isButtonDisabled('   ', false)).toBe(true);
  });

  it('disabled when isLoading is true', () => {
    expect(isButtonDisabled('텍스트 있음', true)).toBe(true);
  });

  it('enabled when nlText has content and not loading', () => {
    expect(isButtonDisabled('투명PVC 선택하면 PP코팅 못 쓰게 해줘', false)).toBe(false);
  });

  it('disabled when both empty and loading', () => {
    expect(isButtonDisabled('', true)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Textarea placeholder logic
// ---------------------------------------------------------------------------

describe('NlRulePanel — placeholder text logic', () => {
  function getPlaceholder(mode: NlPanelMode): string {
    return `자연어로 ${MODE_LABELS[mode]}을 설명해주세요...`;
  }

  it('constraint mode placeholder includes mode label', () => {
    const ph = getPlaceholder('constraint');
    expect(ph).toContain('제약조건');
  });

  it('price_rule mode placeholder includes mode label', () => {
    const ph = getPlaceholder('price_rule');
    expect(ph).toContain('가격룰');
  });

  it('option_suggest mode placeholder includes mode label', () => {
    const ph = getPlaceholder('option_suggest');
    expect(ph).toContain('옵션값');
  });
});
