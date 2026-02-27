/**
 * Tests for Publish Service (validatePublishReadiness, PublishError).
 * SPEC-WB-005 FR-WB005-07, FR-WB005-08, AC-WB005-05
 *
 * The publish service in packages/core is a pure function layer:
 * - validatePublishReadiness: throws PublishError if not publishable, returns CompletenessResult otherwise
 * - PublishError: contains missingItems list and completeness snapshot
 *
 * The actual DB writes (isVisible=true, isActive=true, publish_history insert)
 * are done in the tRPC router (apps/admin/src/lib/trpc/routers/widget-admin.ts).
 * Those are tested via the admin router test file.
 */
import { describe, it, expect } from 'vitest';
import { validatePublishReadiness, PublishError } from '../../src/simulation/publish.js';
import type { CompletenessInput } from '../../src/simulation/completeness.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeCompleteInput(overrides: Partial<CompletenessInput> = {}): CompletenessInput {
  return {
    hasDefaultRecipe: true,
    optionTypeCount: 2,
    minChoiceCount: 3,
    hasRequiredOption: true,
    hasPricingConfig: true,
    isPricingActive: true,
    constraintCount: 2,
    edicusCode: 'EDC001',
    mesItemCd: null,
    ...overrides,
  };
}

function makeIncompleteInput(overrides: Partial<CompletenessInput> = {}): CompletenessInput {
  return makeCompleteInput({
    hasPricingConfig: false,  // pricing fails
    isPricingActive: false,
    edicusCode: null,         // mesMapping fails
    mesItemCd: null,
    ...overrides,
  });
}

// ─── validatePublishReadiness ─────────────────────────────────────────────────

describe('validatePublishReadiness', () => {
  it('succeeds when all 4 completeness items pass', () => {
    const input = makeCompleteInput();

    const result = validatePublishReadiness(input);

    expect(result.publishable).toBe(true);
    expect(result.completedCount).toBe(4);
    expect(result.totalCount).toBe(4);
  });

  it('returns CompletenessResult with items on success', () => {
    const input = makeCompleteInput();

    const result = validatePublishReadiness(input);

    expect(result.items).toHaveLength(4);
    result.items.forEach((item) => {
      expect(item.completed).toBe(true);
    });
  });

  it('throws PublishError when completeness check fails', () => {
    const input = makeIncompleteInput();

    expect(() => validatePublishReadiness(input)).toThrow(PublishError);
  });

  it('throws Error (not generic) — is a PublishError instance', () => {
    const input = makeIncompleteInput();

    try {
      validatePublishReadiness(input);
      expect.fail('Should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(PublishError);
      expect(e).toBeInstanceOf(Error);
    }
  });

  it('error message includes missing items', () => {
    const input = makeIncompleteInput();

    try {
      validatePublishReadiness(input);
      expect.fail('Should have thrown');
    } catch (e) {
      if (e instanceof PublishError) {
        expect(e.message).toContain('pricing');
        expect(e.message).toContain('mesMapping');
      } else {
        expect.fail('Expected PublishError');
      }
    }
  });

  it('error contains list of missing items', () => {
    const input = makeIncompleteInput();

    try {
      validatePublishReadiness(input);
      expect.fail('Should have thrown');
    } catch (e) {
      if (e instanceof PublishError) {
        expect(e.missingItems).toContain('pricing');
        expect(e.missingItems).toContain('mesMapping');
        expect(Array.isArray(e.missingItems)).toBe(true);
      } else {
        expect.fail('Expected PublishError');
      }
    }
  });

  it('error contains completeness snapshot', () => {
    const input = makeIncompleteInput();

    try {
      validatePublishReadiness(input);
      expect.fail('Should have thrown');
    } catch (e) {
      if (e instanceof PublishError) {
        expect(e.completeness).toBeDefined();
        expect(e.completeness.publishable).toBe(false);
        expect(e.completeness.items).toHaveLength(4);
      } else {
        expect.fail('Expected PublishError');
      }
    }
  });

  it('error name is PublishError', () => {
    const input = makeIncompleteInput();

    try {
      validatePublishReadiness(input);
      expect.fail('Should have thrown');
    } catch (e) {
      if (e instanceof PublishError) {
        expect(e.name).toBe('PublishError');
      } else {
        expect.fail('Expected PublishError');
      }
    }
  });

  it('missingItems list only contains actually failed items', () => {
    // Only mesMapping fails
    const input = makeCompleteInput({ edicusCode: null, mesItemCd: null });

    try {
      validatePublishReadiness(input);
      expect.fail('Should have thrown');
    } catch (e) {
      if (e instanceof PublishError) {
        expect(e.missingItems).toHaveLength(1);
        expect(e.missingItems[0]).toBe('mesMapping');
      } else {
        expect.fail('Expected PublishError');
      }
    }
  });

  it('succeeds with 0 constraints (constraints never blocks)', () => {
    const input = makeCompleteInput({ constraintCount: 0 });

    // Should NOT throw — 0 constraints is allowed
    const result = validatePublishReadiness(input);
    expect(result.publishable).toBe(true);
  });

  it('does not affect existing orders (pure function - no DB calls)', () => {
    // validatePublishReadiness is pure — no DB interaction
    // Calling it multiple times yields same result
    const input = makeCompleteInput();
    const result1 = validatePublishReadiness(input);
    const result2 = validatePublishReadiness(input);

    expect(result1.publishable).toBe(result2.publishable);
    expect(result1.completedCount).toBe(result2.completedCount);
  });
});

// ─── PublishError ─────────────────────────────────────────────────────────────

describe('PublishError', () => {
  it('is an instance of Error', () => {
    const err = new PublishError(
      ['pricing', 'mesMapping'],
      { items: [], publishable: false, completedCount: 2, totalCount: 4 },
    );
    expect(err).toBeInstanceOf(Error);
  });

  it('has correct name', () => {
    const err = new PublishError(
      ['pricing'],
      { items: [], publishable: false, completedCount: 3, totalCount: 4 },
    );
    expect(err.name).toBe('PublishError');
  });

  it('stores missingItems array', () => {
    const err = new PublishError(
      ['pricing', 'mesMapping'],
      { items: [], publishable: false, completedCount: 2, totalCount: 4 },
    );
    expect(err.missingItems).toEqual(['pricing', 'mesMapping']);
  });

  it('stores completeness snapshot', () => {
    const completeness = {
      items: [{ item: 'pricing' as const, completed: false, message: 'No config' }],
      publishable: false,
      completedCount: 0,
      totalCount: 4,
    };
    const err = new PublishError(['pricing'], completeness);
    expect(err.completeness).toBe(completeness);
  });

  it('message includes missing items', () => {
    const err = new PublishError(
      ['options', 'pricing'],
      { items: [], publishable: false, completedCount: 2, totalCount: 4 },
    );
    expect(err.message).toContain('options');
    expect(err.message).toContain('pricing');
  });

  it('message reflects single missing item', () => {
    const err = new PublishError(
      ['mesMapping'],
      { items: [], publishable: false, completedCount: 3, totalCount: 4 },
    );
    expect(err.message).toContain('mesMapping');
  });
});
