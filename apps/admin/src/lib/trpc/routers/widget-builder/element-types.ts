import { z } from 'zod';
import { eq as _eq, asc as _asc, and as _and } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { optionElementTypes, optionElementChoices } from '@widget-creator/db';
import { router, protectedProcedure } from '../../server';

// pnpm resolves two drizzle-orm instances (postgres + libsql), causing SQL<unknown> type conflicts.
// Cast helpers to any-accepting variants to bypass structural incompatibility at type level.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyArg = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const eq = _eq as (a: AnyArg, b: AnyArg) => any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asc = _asc as (col: AnyArg) => any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const and = _and as (...conditions: AnyArg[]) => any;

// @MX:NOTE: [AUTO] UiControl and OptionCategory enums mirror DB schema 01-element-types.ts
const UiControlEnum = z.enum([
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
]);

const OptionCategoryEnum = z.enum([
  'material',
  'process',
  'spec',
  'quantity',
  'group',
]);

const CreateElementTypeSchema = z.object({
  typeKey: z.string().min(1).max(50),
  typeNameKo: z.string().min(1).max(100),
  typeNameEn: z.string().min(1).max(100),
  uiControl: UiControlEnum,
  optionCategory: OptionCategoryEnum.default('spec'),
  allowsCustom: z.boolean().default(false),
  displayOrder: z.number().int().min(0).default(0),
  description: z.string().nullable().optional(),
});

const UpdateElementTypeSchema = z.object({
  id: z.number().int().positive(),
  data: z.object({
    typeKey: z.string().min(1).max(50).optional(),
    typeNameKo: z.string().min(1).max(100).optional(),
    typeNameEn: z.string().min(1).max(100).optional(),
    uiControl: UiControlEnum.optional(),
    optionCategory: OptionCategoryEnum.optional(),
    allowsCustom: z.boolean().optional(),
    displayOrder: z.number().int().min(0).optional(),
    description: z.string().nullable().optional(),
  }),
});

// @MX:ANCHOR: [AUTO] elementTypesRouter — core SPEC-WIDGET-ADMIN-001 router for element type CRUD
// @MX:REASON: Fan_in >= 3: used by index router, element choices router, and page components
export const elementTypesRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        category: OptionCategoryEnum.optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];
      if (input.category !== undefined) {
        conditions.push(eq(optionElementTypes.optionCategory, input.category));
      }
      if (input.isActive !== undefined) {
        conditions.push(eq(optionElementTypes.isActive, input.isActive));
      }
      return ctx.db
        .select()
        .from(optionElementTypes)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(optionElementTypes.displayOrder), asc(optionElementTypes.id));
    }),

  create: protectedProcedure
    .input(CreateElementTypeSchema)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(optionElementTypes)
        .values({
          typeKey: input.typeKey,
          typeNameKo: input.typeNameKo,
          typeNameEn: input.typeNameEn,
          uiControl: input.uiControl,
          optionCategory: input.optionCategory,
          allowsCustom: input.allowsCustom,
          displayOrder: input.displayOrder,
          description: input.description ?? null,
        })
        .returning();
      return row;
    }),

  update: protectedProcedure
    .input(UpdateElementTypeSchema)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(optionElementTypes)
        .set({
          ...input.data,
          updatedAt: new Date(),
        })
        .where(eq(optionElementTypes.id, input.id))
        .returning();
      if (!row) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Element type not found' });
      }
      return row;
    }),

  // @MX:NOTE: [AUTO] deactivate checks for existing choices before soft-delete
  // @MX:NOTE: Returns CONFLICT (409) if element_choices exist for this type
  deactivate: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      // Guard: check if any active choices reference this element type
      const choices = await ctx.db
        .select({ id: optionElementChoices.id })
        .from(optionElementChoices)
        .where(eq(optionElementChoices.typeId, input.id));

      if (choices.length > 0) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Cannot deactivate: ${choices.length} choice(s) exist for this element type`,
        });
      }

      const [row] = await ctx.db
        .update(optionElementTypes)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(optionElementTypes.id, input.id))
        .returning();

      if (!row) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Element type not found' });
      }
      return row;
    }),
});
