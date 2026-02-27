/**
 * Tests for SPEC-WA-001 Step 4 — constraints procedures input schema validation.
 *
 * Tests tRPC procedure input schemas for:
 * - constraints.list
 * - constraints.create
 * - constraints.update
 * - constraints.delete
 * - constraints.toggle
 *
 * Follows the established pattern: re-declare schemas inline rather than importing
 * from the router, since tRPC routers use drizzle-zod which is incompatible with
 * the vitest stub approach.
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// ─── Schema mirrors (same as constraints sub-router) ─────────────────────────

const triggerOperatorSchema = z.enum([
  'equals',
  'in',
  'not_in',
  'contains',
  'beginsWith',
  'endsWith',
]);

const actionTypeSchema = z.enum([
  'show_addon_list',
  'filter_options',
  'exclude_options',
  'auto_add',
  'require_option',
  'show_message',
  'change_price_mode',
  'set_default',
]);

const actionSchema = z.object({ type: actionTypeSchema }).passthrough();

const listInputSchema = z.object({
  productId: z.number().int().positive(),
});

const createInputSchema = z.object({
  productId: z.number().int().positive(),
  name: z.string().min(1).max(100),
  triggerOptionKey: z.string().min(1).max(50),
  triggerOperator: triggerOperatorSchema,
  triggerValues: z.array(z.string()).min(1),
  extraConditions: z.record(z.unknown()).nullable().optional(),
  actions: z.array(actionSchema).min(1),
  priority: z.number().int().default(0),
  comment: z.string().max(500).optional(),
});

const updateInputSchema = z.object({
  id: z.number().int().positive(),
  productId: z.number().int().positive(),
  name: z.string().min(1).max(100).optional(),
  triggerOptionKey: z.string().min(1).max(50).optional(),
  triggerOperator: triggerOperatorSchema.optional(),
  triggerValues: z.array(z.string()).min(1).optional(),
  extraConditions: z.record(z.unknown()).nullable().optional(),
  actions: z.array(actionSchema).min(1).optional(),
  priority: z.number().int().optional(),
  comment: z.string().max(500).optional(),
});

const deleteInputSchema = z.object({
  id: z.number().int().positive(),
  productId: z.number().int().positive(),
});

const toggleInputSchema = z.object({
  id: z.number().int().positive(),
  productId: z.number().int().positive(),
  isActive: z.boolean(),
});

// ─── constraints.list ────────────────────────────────────────────────────────

describe('constraints.list', () => {
  it('accepts valid productId', () => {
    expect(listInputSchema.safeParse({ productId: 1 }).success).toBe(true);
  });

  it('accepts large productId', () => {
    expect(listInputSchema.safeParse({ productId: 99999 }).success).toBe(true);
  });

  it('rejects zero productId', () => {
    expect(listInputSchema.safeParse({ productId: 0 }).success).toBe(false);
  });

  it('rejects negative productId', () => {
    expect(listInputSchema.safeParse({ productId: -1 }).success).toBe(false);
  });

  it('rejects string productId', () => {
    expect(listInputSchema.safeParse({ productId: '1' }).success).toBe(false);
  });

  it('rejects missing productId', () => {
    expect(listInputSchema.safeParse({}).success).toBe(false);
  });
});

// ─── constraints.create ──────────────────────────────────────────────────────

describe('constraints.create', () => {
  const validPayload = {
    productId: 1,
    name: '투명PVC → PP코팅 제외',
    triggerOptionKey: 'paper',
    triggerOperator: 'in' as const,
    triggerValues: ['투명PVC', 'OPP'],
    actions: [
      {
        type: 'exclude_options' as const,
        targetOptionKey: 'coating',
        excludedValues: ['무광PP'],
      },
    ],
    priority: 0,
  };

  it('accepts valid payload', () => {
    expect(createInputSchema.safeParse(validPayload).success).toBe(true);
  });

  it('rejects empty name', () => {
    expect(createInputSchema.safeParse({ ...validPayload, name: '' }).success).toBe(false);
  });

  it('rejects name over 100 chars', () => {
    expect(
      createInputSchema.safeParse({ ...validPayload, name: 'a'.repeat(101) }).success,
    ).toBe(false);
  });

  it('accepts name exactly 100 chars', () => {
    expect(
      createInputSchema.safeParse({ ...validPayload, name: 'a'.repeat(100) }).success,
    ).toBe(true);
  });

  it('rejects empty triggerOptionKey', () => {
    expect(
      createInputSchema.safeParse({ ...validPayload, triggerOptionKey: '' }).success,
    ).toBe(false);
  });

  it('rejects triggerOptionKey over 50 chars', () => {
    expect(
      createInputSchema.safeParse({
        ...validPayload,
        triggerOptionKey: 'k'.repeat(51),
      }).success,
    ).toBe(false);
  });

  it('rejects empty triggerValues', () => {
    expect(
      createInputSchema.safeParse({ ...validPayload, triggerValues: [] }).success,
    ).toBe(false);
  });

  it('accepts multiple triggerValues', () => {
    expect(
      createInputSchema.safeParse({
        ...validPayload,
        triggerValues: ['val1', 'val2', 'val3'],
      }).success,
    ).toBe(true);
  });

  it('rejects empty actions array', () => {
    expect(createInputSchema.safeParse({ ...validPayload, actions: [] }).success).toBe(false);
  });

  it('rejects invalid triggerOperator', () => {
    expect(
      createInputSchema.safeParse({ ...validPayload, triggerOperator: 'between' }).success,
    ).toBe(false);
  });

  it('accepts all valid triggerOperators', () => {
    const operators = ['equals', 'in', 'not_in', 'contains', 'beginsWith', 'endsWith'];
    for (const op of operators) {
      expect(
        createInputSchema.safeParse({ ...validPayload, triggerOperator: op }).success,
      ).toBe(true);
    }
  });

  it('accepts all 8 action types', () => {
    const actionTypes = [
      'show_addon_list',
      'filter_options',
      'exclude_options',
      'auto_add',
      'require_option',
      'show_message',
      'change_price_mode',
      'set_default',
    ];
    for (const type of actionTypes) {
      const payload = { ...validPayload, actions: [{ type }] };
      expect(createInputSchema.safeParse(payload).success).toBe(true);
    }
  });

  it('rejects invalid action type', () => {
    expect(
      createInputSchema.safeParse({
        ...validPayload,
        actions: [{ type: 'invalid_action' }],
      }).success,
    ).toBe(false);
  });

  it('accepts optional extraConditions object', () => {
    expect(
      createInputSchema.safeParse({
        ...validPayload,
        extraConditions: { combinator: 'and', rules: [] },
      }).success,
    ).toBe(true);
  });

  it('accepts null extraConditions', () => {
    expect(
      createInputSchema.safeParse({ ...validPayload, extraConditions: null }).success,
    ).toBe(true);
  });

  it('accepts omitted extraConditions (undefined)', () => {
    const { ...rest } = validPayload;
    expect(createInputSchema.safeParse(rest).success).toBe(true);
  });

  it('accepts optional comment', () => {
    expect(
      createInputSchema.safeParse({ ...validPayload, comment: '테스트 코멘트' }).success,
    ).toBe(true);
  });

  it('rejects comment over 500 chars', () => {
    expect(
      createInputSchema.safeParse({ ...validPayload, comment: 'x'.repeat(501) }).success,
    ).toBe(false);
  });

  it('accepts comment exactly 500 chars', () => {
    expect(
      createInputSchema.safeParse({ ...validPayload, comment: 'x'.repeat(500) }).success,
    ).toBe(true);
  });

  it('accepts priority 0 (default)', () => {
    expect(createInputSchema.safeParse({ ...validPayload, priority: 0 }).success).toBe(true);
  });

  it('accepts positive priority', () => {
    expect(createInputSchema.safeParse({ ...validPayload, priority: 10 }).success).toBe(true);
  });

  it('rejects float priority', () => {
    expect(createInputSchema.safeParse({ ...validPayload, priority: 1.5 }).success).toBe(false);
  });
});

// ─── constraints.update ──────────────────────────────────────────────────────

describe('constraints.update', () => {
  const validUpdate = {
    id: 1,
    productId: 1,
    name: '수정된 규칙',
  };

  it('accepts minimal update with id and productId only', () => {
    expect(updateInputSchema.safeParse({ id: 1, productId: 1 }).success).toBe(true);
  });

  it('accepts valid update payload', () => {
    expect(updateInputSchema.safeParse(validUpdate).success).toBe(true);
  });

  it('rejects zero id', () => {
    expect(updateInputSchema.safeParse({ ...validUpdate, id: 0 }).success).toBe(false);
  });

  it('rejects negative id', () => {
    expect(updateInputSchema.safeParse({ ...validUpdate, id: -1 }).success).toBe(false);
  });

  it('accepts partial update with actions only', () => {
    expect(
      updateInputSchema.safeParse({
        id: 1,
        productId: 1,
        actions: [{ type: 'filter_options', targetOptionKey: 'size', allowedValues: ['A4'] }],
      }).success,
    ).toBe(true);
  });

  it('rejects update name as empty string', () => {
    expect(
      updateInputSchema.safeParse({ id: 1, productId: 1, name: '' }).success,
    ).toBe(false);
  });

  it('rejects update with empty actions array', () => {
    expect(
      updateInputSchema.safeParse({ id: 1, productId: 1, actions: [] }).success,
    ).toBe(false);
  });
});

// ─── constraints.delete ──────────────────────────────────────────────────────

describe('constraints.delete', () => {
  it('accepts valid delete input', () => {
    expect(deleteInputSchema.safeParse({ id: 1, productId: 1 }).success).toBe(true);
  });

  it('rejects zero id', () => {
    expect(deleteInputSchema.safeParse({ id: 0, productId: 1 }).success).toBe(false);
  });

  it('rejects zero productId', () => {
    expect(deleteInputSchema.safeParse({ id: 1, productId: 0 }).success).toBe(false);
  });

  it('rejects missing id', () => {
    expect(deleteInputSchema.safeParse({ productId: 1 }).success).toBe(false);
  });

  it('rejects missing productId', () => {
    expect(deleteInputSchema.safeParse({ id: 1 }).success).toBe(false);
  });
});

// ─── constraints.toggle ──────────────────────────────────────────────────────

describe('constraints.toggle', () => {
  it('accepts valid toggle active', () => {
    expect(
      toggleInputSchema.safeParse({ id: 1, productId: 1, isActive: true }).success,
    ).toBe(true);
  });

  it('accepts valid toggle inactive', () => {
    expect(
      toggleInputSchema.safeParse({ id: 1, productId: 1, isActive: false }).success,
    ).toBe(true);
  });

  it('rejects missing isActive', () => {
    expect(toggleInputSchema.safeParse({ id: 1, productId: 1 }).success).toBe(false);
  });

  it('rejects zero id', () => {
    expect(
      toggleInputSchema.safeParse({ id: 0, productId: 1, isActive: true }).success,
    ).toBe(false);
  });

  it('rejects string isActive', () => {
    expect(
      toggleInputSchema.safeParse({ id: 1, productId: 1, isActive: 'true' }).success,
    ).toBe(false);
  });
});

// ─── action type schemas ──────────────────────────────────────────────────────

describe('action type schemas', () => {
  it('accepts filter_options with allowedValues', () => {
    const a = { type: 'filter_options', targetOptionKey: 'coating', allowedValues: ['무광', '유광'] };
    expect(actionSchema.safeParse(a).success).toBe(true);
  });

  it('accepts exclude_options with excludedValues', () => {
    const a = { type: 'exclude_options', targetOptionKey: 'coating', excludedValues: ['무광PP'] };
    expect(actionSchema.safeParse(a).success).toBe(true);
  });

  it('accepts show_message with level info', () => {
    const a = { type: 'show_message', message: '주의하세요', level: 'info' };
    expect(actionSchema.safeParse(a).success).toBe(true);
  });

  it('accepts show_message with level warning', () => {
    const a = { type: 'show_message', message: '주의하세요', level: 'warning' };
    expect(actionSchema.safeParse(a).success).toBe(true);
  });

  it('accepts show_message with level error', () => {
    const a = { type: 'show_message', message: '오류', level: 'error' };
    expect(actionSchema.safeParse(a).success).toBe(true);
  });

  it('accepts set_default with targetOptionKey and defaultValue', () => {
    const a = { type: 'set_default', targetOptionKey: 'size', defaultValue: 'A4' };
    expect(actionSchema.safeParse(a).success).toBe(true);
  });

  it('accepts auto_add with addonItemId and quantity', () => {
    const a = { type: 'auto_add', addonItemId: 5, quantity: 2 };
    expect(actionSchema.safeParse(a).success).toBe(true);
  });

  it('accepts auto_add without optional quantity', () => {
    const a = { type: 'auto_add', addonItemId: 5 };
    expect(actionSchema.safeParse(a).success).toBe(true);
  });

  it('accepts show_addon_list with addonGroupId', () => {
    const a = { type: 'show_addon_list', addonGroupId: 3 };
    expect(actionSchema.safeParse(a).success).toBe(true);
  });

  it('accepts require_option with targetOptionKey', () => {
    const a = { type: 'require_option', targetOptionKey: 'finish' };
    expect(actionSchema.safeParse(a).success).toBe(true);
  });

  it('accepts change_price_mode with priceModeId', () => {
    const a = { type: 'change_price_mode', priceModeId: 2 };
    expect(actionSchema.safeParse(a).success).toBe(true);
  });

  it('rejects unknown action type', () => {
    const a = { type: 'unknown_action' };
    expect(actionSchema.safeParse(a).success).toBe(false);
  });

  it('accepts action with extra passthrough fields', () => {
    const a = { type: 'filter_options', someExtraField: 'value', anotherField: 123 };
    expect(actionSchema.safeParse(a).success).toBe(true);
  });
});
