import { describe, it, expect } from 'vitest';
import { CONSTRAINT_TEMPLATES } from '../../src/seed/constraint-templates';

const EXPECTED_TEMPLATE_KEYS = [
  'SIZE_RANGE',
  'PAPER_COATING_COMPAT',
  'PRINT_METHOD_DEP',
  'BINDING_STRUCT',
  'QUANTITY_RANGE',
  'FINISHING_DEP',
  'PRICE_CALC_SWITCH',
  'ADDON_PRODUCT',
  'DELIVERY_IMPACT',
  'COLOR_MODE_EXCL',
  'COMPOUND_AND_OR',
  'FILE_DATA_GUIDE',
] as const;

describe('CONSTRAINT_TEMPLATES seed data', () => {
  it('has exactly 12 entries', () => {
    expect(CONSTRAINT_TEMPLATES).toHaveLength(12);
  });

  it('contains all expected template_keys', () => {
    const actualKeys = CONSTRAINT_TEMPLATES.map((t) => t.templateKey);
    for (const expected of EXPECTED_TEMPLATE_KEYS) {
      expect(actualKeys).toContain(expected);
    }
  });

  it('has unique template_keys (no duplicates)', () => {
    const keys = CONSTRAINT_TEMPLATES.map((t) => t.templateKey);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  it('all templates have is_system: true', () => {
    for (const template of CONSTRAINT_TEMPLATES) {
      expect(template.isSystem).toBe(true);
    }
  });

  it('all templates have is_active: true', () => {
    for (const template of CONSTRAINT_TEMPLATES) {
      expect(template.isActive).toBe(true);
    }
  });

  it.each(CONSTRAINT_TEMPLATES as unknown as Array<(typeof CONSTRAINT_TEMPLATES)[number]>)(
    '$templateKey has template_key and template_name_ko',
    (template) => {
      expect(template.templateKey).toBeTruthy();
      expect(template.templateNameKo).toBeTruthy();
    },
  );

  it.each(CONSTRAINT_TEMPLATES as unknown as Array<(typeof CONSTRAINT_TEMPLATES)[number]>)(
    '$templateKey has actions_pattern with at least 1 action',
    (template) => {
      expect(Array.isArray(template.actionsPattern)).toBe(true);
      expect((template.actionsPattern as unknown[]).length).toBeGreaterThanOrEqual(1);
    },
  );

  it.each(CONSTRAINT_TEMPLATES as unknown as Array<(typeof CONSTRAINT_TEMPLATES)[number]>)(
    '$templateKey each action has a valid type field',
    (template) => {
      for (const action of template.actionsPattern as Array<{ type: string }>) {
        expect(typeof action.type).toBe('string');
        expect(action.type).toBeTruthy();
      }
    },
  );

  describe('specific template validations', () => {
    it('SIZE_RANGE uses SIZE trigger and filter_options action', () => {
      const tpl = CONSTRAINT_TEMPLATES.find((t) => t.templateKey === 'SIZE_RANGE');
      expect(tpl).toBeDefined();
      expect(tpl!.triggerOptionType).toBe('SIZE');
      const actions = tpl!.actionsPattern as Array<{ type: string }>;
      expect(actions[0]!.type).toBe('filter_options');
    });

    it('BINDING_STRUCT has 2 actions (show_message + require_option)', () => {
      const tpl = CONSTRAINT_TEMPLATES.find((t) => t.templateKey === 'BINDING_STRUCT');
      expect(tpl).toBeDefined();
      expect((tpl!.actionsPattern as unknown[]).length).toBe(2);
    });

    it('COMPOUND_AND_OR has extraConditionsPattern with combinator', () => {
      const tpl = CONSTRAINT_TEMPLATES.find((t) => t.templateKey === 'COMPOUND_AND_OR');
      expect(tpl).toBeDefined();
      const extra = tpl!.extraConditionsPattern as { combinator: string; conditions: unknown[] };
      expect(extra).not.toBeNull();
      expect(extra.combinator).toBe('AND');
      expect(extra.conditions.length).toBeGreaterThan(0);
    });

    it('ADDON_PRODUCT uses show_addon_list action', () => {
      const tpl = CONSTRAINT_TEMPLATES.find((t) => t.templateKey === 'ADDON_PRODUCT');
      expect(tpl).toBeDefined();
      const actions = tpl!.actionsPattern as Array<{ type: string }>;
      expect(actions[0]!.type).toBe('show_addon_list');
    });
  });
});
