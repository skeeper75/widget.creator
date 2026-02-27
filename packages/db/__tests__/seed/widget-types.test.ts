import { describe, it, expect } from 'vitest';
import { STANDARD_OPTION_TYPES } from '../../src/seed/widget-types';

const VALID_UI_CONTROLS = [
  'toggle-group',
  'toggle-multi',
  'select',
  'number-stepper',
  'slider',
  'checkbox',
  'collapsible',
  'color-swatch',
  'image-toggle',
  'text-input',
] as const;

const VALID_CATEGORIES = ['material', 'process', 'spec', 'quantity', 'group'] as const;

const EXPECTED_TYPE_KEYS = [
  'SIZE',
  'PAPER',
  'PRINT_TYPE',
  'FINISHING',
  'COATING',
  'BINDING',
  'QUANTITY',
  'PAGE_COUNT',
  'ADD_ON',
  'COVER_PAPER',
  'INNER_PAPER',
  'FOIL_STAMP',
];

describe('STANDARD_OPTION_TYPES seed data', () => {
  it('contains exactly 12 standard option types', () => {
    expect(STANDARD_OPTION_TYPES).toHaveLength(12);
  });

  it('contains all expected type_keys', () => {
    const actualKeys = STANDARD_OPTION_TYPES.map((t) => t.typeKey);
    for (const expected of EXPECTED_TYPE_KEYS) {
      expect(actualKeys).toContain(expected);
    }
  });

  it('has unique type_keys (no duplicates)', () => {
    const keys = STANDARD_OPTION_TYPES.map((t) => t.typeKey);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  it.each(STANDARD_OPTION_TYPES)('$typeKey has required fields', (type) => {
    expect(type.typeKey).toBeTruthy();
    expect(type.typeNameKo).toBeTruthy();
    expect(type.typeNameEn).toBeTruthy();
    expect(type.uiControl).toBeTruthy();
    expect(type.optionCategory).toBeTruthy();
    expect(typeof type.allowsCustom).toBe('boolean');
  });

  it.each(STANDARD_OPTION_TYPES)('$typeKey has valid ui_control value', (type) => {
    expect(VALID_UI_CONTROLS).toContain(type.uiControl);
  });

  it.each(STANDARD_OPTION_TYPES)('$typeKey has valid option_category value', (type) => {
    expect(VALID_CATEGORIES).toContain(type.optionCategory);
  });

  it('only SIZE and QUANTITY have allows_custom = true', () => {
    const customTypes = STANDARD_OPTION_TYPES.filter((t) => t.allowsCustom === true);
    const customKeys = customTypes.map((t) => t.typeKey).sort();
    expect(customKeys).toEqual(['QUANTITY', 'SIZE'].sort());
  });

  describe('specific type validations', () => {
    it('SIZE uses toggle-group and spec category', () => {
      const size = STANDARD_OPTION_TYPES.find((t) => t.typeKey === 'SIZE');
      expect(size?.uiControl).toBe('toggle-group');
      expect(size?.optionCategory).toBe('spec');
      expect(size?.allowsCustom).toBe(true);
    });

    it('FOIL_STAMP uses collapsible and group category', () => {
      const foil = STANDARD_OPTION_TYPES.find((t) => t.typeKey === 'FOIL_STAMP');
      expect(foil?.uiControl).toBe('collapsible');
      expect(foil?.optionCategory).toBe('group');
    });

    it('FINISHING uses toggle-multi', () => {
      const finishing = STANDARD_OPTION_TYPES.find((t) => t.typeKey === 'FINISHING');
      expect(finishing?.uiControl).toBe('toggle-multi');
    });

    it('QUANTITY uses number-stepper and quantity category', () => {
      const quantity = STANDARD_OPTION_TYPES.find((t) => t.typeKey === 'QUANTITY');
      expect(quantity?.uiControl).toBe('number-stepper');
      expect(quantity?.optionCategory).toBe('quantity');
    });
  });
});
