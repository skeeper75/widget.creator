// Integration test: verify all public exports are accessible via main package entry
import { describe, it, expect } from 'vitest';
import {
  optionElementTypes,
  optionElementChoices,
  STANDARD_OPTION_TYPES,
} from '../src/index';
import { getTableName } from 'drizzle-orm';

describe('Package exports (barrel integration)', () => {
  it('exports optionElementTypes from main entry', () => {
    expect(optionElementTypes).toBeDefined();
    expect(getTableName(optionElementTypes)).toBe('option_element_types');
  });

  it('exports optionElementChoices from main entry', () => {
    expect(optionElementChoices).toBeDefined();
    expect(getTableName(optionElementChoices)).toBe('option_element_choices');
  });

  it('exports STANDARD_OPTION_TYPES from main entry', () => {
    expect(STANDARD_OPTION_TYPES).toBeDefined();
    expect(STANDARD_OPTION_TYPES).toHaveLength(12);
  });
});
