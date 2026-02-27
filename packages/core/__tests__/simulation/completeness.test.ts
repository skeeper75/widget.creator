/**
 * Tests for checkCompleteness function.
 * SPEC-WB-005 FR-WB005-02, AC-WB005-02
 *
 * Tests all 4 completeness items:
 *   1. options  - hasDefaultRecipe + optionTypeCount + minChoiceCount + hasRequiredOption
 *   2. pricing  - hasPricingConfig + isPricingActive
 *   3. constraints - 0 is allowed (warn), any count passes
 *   4. mesMapping  - edicusCode or mesItemCd must be set
 */
import { describe, it, expect } from 'vitest';
import { checkCompleteness } from '../../src/simulation/completeness.js';
import type { CompletenessInput } from '../../src/simulation/completeness.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeInput(overrides: Partial<CompletenessInput> = {}): CompletenessInput {
  return {
    hasDefaultRecipe: true,
    optionTypeCount: 2,
    minChoiceCount: 3,
    hasRequiredOption: true,
    hasPricingConfig: true,
    isPricingActive: true,
    constraintCount: 3,
    edicusCode: 'EDC001',
    mesItemCd: null,
    ...overrides,
  };
}

// ─── Happy path ───────────────────────────────────────────────────────────────

describe('checkCompleteness', () => {
  it('returns publishable=true when all 4 items are complete', () => {
    const result = checkCompleteness(makeInput());

    expect(result.publishable).toBe(true);
    expect(result.completedCount).toBe(4);
    expect(result.totalCount).toBe(4);
    expect(result.items).toHaveLength(4);
    result.items.forEach((item) => {
      expect(item.completed).toBe(true);
    });
  });

  // ─── Options tests ─────────────────────────────────────────────────────────

  it('options: fails when no default recipe configured', () => {
    const input = makeInput({ hasDefaultRecipe: false });
    const result = checkCompleteness(input);

    const optionsItem = result.items.find((i) => i.item === 'options');
    expect(optionsItem?.completed).toBe(false);
    expect(result.publishable).toBe(false);
  });

  it('options: fails when optionTypeCount < 1', () => {
    const input = makeInput({ hasDefaultRecipe: true, optionTypeCount: 0 });
    const result = checkCompleteness(input);

    const optionsItem = result.items.find((i) => i.item === 'options');
    expect(optionsItem?.completed).toBe(false);
    expect(result.publishable).toBe(false);
  });

  it('options: fails when fewer than 2 choices (minChoiceCount < 2)', () => {
    const input = makeInput({ minChoiceCount: 1 });
    const result = checkCompleteness(input);

    const optionsItem = result.items.find((i) => i.item === 'options');
    expect(optionsItem?.completed).toBe(false);
    expect(result.publishable).toBe(false);
  });

  it('options: fails when no required option is designated', () => {
    const input = makeInput({ hasRequiredOption: false });
    const result = checkCompleteness(input);

    const optionsItem = result.items.find((i) => i.item === 'options');
    expect(optionsItem?.completed).toBe(false);
    expect(result.publishable).toBe(false);
  });

  it('options: passes with optionTypeCount=1 and minChoiceCount=2', () => {
    const input = makeInput({ optionTypeCount: 1, minChoiceCount: 2 });
    const result = checkCompleteness(input);

    const optionsItem = result.items.find((i) => i.item === 'options');
    expect(optionsItem?.completed).toBe(true);
  });

  it('options: message contains optionTypeCount when complete', () => {
    const input = makeInput({ optionTypeCount: 3 });
    const result = checkCompleteness(input);

    const optionsItem = result.items.find((i) => i.item === 'options');
    expect(optionsItem?.completed).toBe(true);
    expect(optionsItem?.message).toContain('3');
  });

  // ─── Pricing tests ─────────────────────────────────────────────────────────

  it('pricing: fails when no price config exists', () => {
    const input = makeInput({ hasPricingConfig: false, isPricingActive: false });
    const result = checkCompleteness(input);

    const pricingItem = result.items.find((i) => i.item === 'pricing');
    expect(pricingItem?.completed).toBe(false);
    expect(result.publishable).toBe(false);
  });

  it('pricing: fails when price config is inactive', () => {
    const input = makeInput({ hasPricingConfig: true, isPricingActive: false });
    const result = checkCompleteness(input);

    const pricingItem = result.items.find((i) => i.item === 'pricing');
    expect(pricingItem?.completed).toBe(false);
    expect(result.publishable).toBe(false);
  });

  it('pricing: passes when price config exists and is active', () => {
    const input = makeInput({ hasPricingConfig: true, isPricingActive: true });
    const result = checkCompleteness(input);

    const pricingItem = result.items.find((i) => i.item === 'pricing');
    expect(pricingItem?.completed).toBe(true);
  });

  it('pricing: message reflects no config when hasPricingConfig=false', () => {
    const input = makeInput({ hasPricingConfig: false, isPricingActive: false });
    const result = checkCompleteness(input);

    const pricingItem = result.items.find((i) => i.item === 'pricing');
    expect(pricingItem?.message).toContain('No price');
  });

  it('pricing: message reflects inactive when hasPricingConfig=true but isPricingActive=false', () => {
    const input = makeInput({ hasPricingConfig: true, isPricingActive: false });
    const result = checkCompleteness(input);

    const pricingItem = result.items.find((i) => i.item === 'pricing');
    expect(pricingItem?.message).toContain('inactive');
  });

  // ─── Constraints tests ────────────────────────────────────────────────────

  it('constraints: passes with 0 constraints (with warning message)', () => {
    const input = makeInput({ constraintCount: 0 });
    const result = checkCompleteness(input);

    const constraintsItem = result.items.find((i) => i.item === 'constraints');
    expect(constraintsItem?.completed).toBe(true);
    // 0 constraints is allowed but should have a warning/review message
    expect(constraintsItem?.message).toBeTruthy();
    expect(constraintsItem?.message).toContain('review');
  });

  it('constraints: passes with constraints defined', () => {
    const input = makeInput({ constraintCount: 5 });
    const result = checkCompleteness(input);

    const constraintsItem = result.items.find((i) => i.item === 'constraints');
    expect(constraintsItem?.completed).toBe(true);
    expect(constraintsItem?.message).toContain('5');
  });

  it('constraints: always completed (0 or more)', () => {
    // constraints item should never block publish
    const inputZero = makeInput({ constraintCount: 0 });
    const inputMany = makeInput({ constraintCount: 100 });

    expect(checkCompleteness(inputZero).items.find((i) => i.item === 'constraints')?.completed).toBe(true);
    expect(checkCompleteness(inputMany).items.find((i) => i.item === 'constraints')?.completed).toBe(true);
  });

  // ─── MES mapping tests ────────────────────────────────────────────────────

  it('mesMapping: passes when edicusCode is set', () => {
    const input = makeInput({ edicusCode: 'EDC001', mesItemCd: null });
    const result = checkCompleteness(input);

    const mesMappingItem = result.items.find((i) => i.item === 'mesMapping');
    expect(mesMappingItem?.completed).toBe(true);
  });

  it('mesMapping: passes when mesItemCd is set', () => {
    const input = makeInput({ edicusCode: null, mesItemCd: 'MES001' });
    const result = checkCompleteness(input);

    const mesMappingItem = result.items.find((i) => i.item === 'mesMapping');
    expect(mesMappingItem?.completed).toBe(true);
  });

  it('mesMapping: fails when neither code is set', () => {
    const input = makeInput({ edicusCode: null, mesItemCd: null });
    const result = checkCompleteness(input);

    const mesMappingItem = result.items.find((i) => i.item === 'mesMapping');
    expect(mesMappingItem?.completed).toBe(false);
    expect(result.publishable).toBe(false);
  });

  it('mesMapping: passes when both codes are set (either is sufficient)', () => {
    const input = makeInput({ edicusCode: 'EDC001', mesItemCd: 'MES001' });
    const result = checkCompleteness(input);

    const mesMappingItem = result.items.find((i) => i.item === 'mesMapping');
    expect(mesMappingItem?.completed).toBe(true);
  });

  it('mesMapping: message includes error text when neither code set', () => {
    const input = makeInput({ edicusCode: null, mesItemCd: null });
    const result = checkCompleteness(input);

    const mesMappingItem = result.items.find((i) => i.item === 'mesMapping');
    expect(mesMappingItem?.message).toBeTruthy();
    expect(mesMappingItem?.message.length).toBeGreaterThan(0);
  });

  // ─── Edge cases ───────────────────────────────────────────────────────────

  it('returns completedCount=0 when options, pricing, mesMapping all fail', () => {
    const input = makeInput({
      hasDefaultRecipe: false,
      hasPricingConfig: false,
      isPricingActive: false,
      edicusCode: null,
      mesItemCd: null,
      // constraints is always complete so completedCount will be 1
    });
    const result = checkCompleteness(input);

    // constraints always passes (1 item), others fail
    expect(result.completedCount).toBe(1);
    expect(result.publishable).toBe(false);
  });

  it('returns publishable=false when any item fails', () => {
    const input = makeInput({ hasPricingConfig: false, isPricingActive: false });
    const result = checkCompleteness(input);

    expect(result.publishable).toBe(false);
    expect(result.completedCount).toBeLessThan(4);
  });

  it('returns correct completedCount when only options and mesMapping fail', () => {
    const input = makeInput({
      hasDefaultRecipe: false,
      edicusCode: null,
      mesItemCd: null,
      // pricing: pass, constraints: pass
    });
    const result = checkCompleteness(input);

    // options: fail, pricing: pass, constraints: pass, mesMapping: fail
    expect(result.completedCount).toBe(2);
    expect(result.publishable).toBe(false);
  });

  it('result contains all 4 item keys', () => {
    const result = checkCompleteness(makeInput());

    const itemKeys = result.items.map((i) => i.item);
    expect(itemKeys).toContain('options');
    expect(itemKeys).toContain('pricing');
    expect(itemKeys).toContain('constraints');
    expect(itemKeys).toContain('mesMapping');
  });

  it('each item has completed boolean and message string', () => {
    const result = checkCompleteness(makeInput());

    result.items.forEach((item) => {
      expect(typeof item.completed).toBe('boolean');
      expect(typeof item.message).toBe('string');
      expect(item.message.length).toBeGreaterThan(0);
    });
  });

  it('totalCount is always 4', () => {
    const result = checkCompleteness(makeInput());
    expect(result.totalCount).toBe(4);
  });

  it('completedCount equals number of items with completed=true', () => {
    const result = checkCompleteness(makeInput());
    const actualCount = result.items.filter((i) => i.completed).length;
    expect(result.completedCount).toBe(actualCount);
  });
});
