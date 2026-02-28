import { z } from 'zod';
import { eq as _eq, asc as _asc, and as _and } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { optionElementChoices } from '@widget-creator/db';
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

const CreateElementChoiceSchema = z.object({
  typeId: z.number().int().positive(),
  choiceKey: z.string().min(1).max(100),
  displayName: z.string().min(1).max(200),
  value: z.string().max(100).nullable().optional(),
  mesCode: z.string().max(100).nullable().optional(),
  displayOrder: z.number().int().min(0).default(0),
  isDefault: z.boolean().default(false),
  // Size type fields
  widthMm: z.string().nullable().optional(), // decimal stored as string in drizzle
  heightMm: z.string().nullable().optional(),
  bleedMm: z.string().nullable().optional(),
  // Paper type field
  basisWeightGsm: z.number().int().positive().nullable().optional(),
  // Finishing type field
  finishCategory: z.string().max(50).nullable().optional(),
  // Visual UI metadata
  thumbnailUrl: z.string().max(500).nullable().optional(),
  colorHex: z.string().max(7).nullable().optional(),
  priceImpact: z.string().max(50).nullable().optional(),
  // Pricing linkage
  priceKey: z.string().max(200).nullable().optional(),
  metadata: z.record(z.unknown()).nullable().optional(),
});

const UpdateElementChoiceSchema = z.object({
  id: z.number().int().positive(),
  data: z.object({
    choiceKey: z.string().min(1).max(100).optional(),
    displayName: z.string().min(1).max(200).optional(),
    value: z.string().max(100).nullable().optional(),
    mesCode: z.string().max(100).nullable().optional(),
    displayOrder: z.number().int().min(0).optional(),
    isDefault: z.boolean().optional(),
    widthMm: z.string().nullable().optional(),
    heightMm: z.string().nullable().optional(),
    bleedMm: z.string().nullable().optional(),
    basisWeightGsm: z.number().int().positive().nullable().optional(),
    finishCategory: z.string().max(50).nullable().optional(),
    thumbnailUrl: z.string().max(500).nullable().optional(),
    colorHex: z.string().max(7).nullable().optional(),
    priceImpact: z.string().max(50).nullable().optional(),
    priceKey: z.string().max(200).nullable().optional(),
    metadata: z.record(z.unknown()).nullable().optional(),
  }),
});

// @MX:ANCHOR: [AUTO] elementChoicesRouter — SPEC-WIDGET-ADMIN-001 element choices CRUD
// @MX:REASON: Fan_in >= 3: used by index router, choices page, and choice edit modal
export const elementChoicesRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        elementTypeId: z.number().int().positive().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];
      if (input.elementTypeId !== undefined) {
        conditions.push(eq(optionElementChoices.typeId, input.elementTypeId));
      }
      if (input.isActive !== undefined) {
        conditions.push(eq(optionElementChoices.isActive, input.isActive));
      }
      return ctx.db
        .select()
        .from(optionElementChoices)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(asc(optionElementChoices.displayOrder), asc(optionElementChoices.id));
    }),

  create: protectedProcedure
    .input(CreateElementChoiceSchema)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(optionElementChoices)
        .values({
          typeId: input.typeId,
          choiceKey: input.choiceKey,
          displayName: input.displayName,
          value: input.value ?? null,
          mesCode: input.mesCode ?? null,
          displayOrder: input.displayOrder,
          isDefault: input.isDefault,
          widthMm: input.widthMm ?? null,
          heightMm: input.heightMm ?? null,
          bleedMm: input.bleedMm ?? null,
          basisWeightGsm: input.basisWeightGsm ?? null,
          finishCategory: input.finishCategory ?? null,
          thumbnailUrl: input.thumbnailUrl ?? null,
          colorHex: input.colorHex ?? null,
          priceImpact: input.priceImpact ?? null,
          priceKey: input.priceKey ?? null,
          metadata: input.metadata ?? null,
        })
        .returning();
      return row;
    }),

  update: protectedProcedure
    .input(UpdateElementChoiceSchema)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(optionElementChoices)
        .set({
          ...input.data,
          updatedAt: new Date(),
        })
        .where(eq(optionElementChoices.id, input.id))
        .returning();
      if (!row) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Element choice not found' });
      }
      return row;
    }),

  deactivate: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(optionElementChoices)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(optionElementChoices.id, input.id))
        .returning();
      if (!row) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Element choice not found' });
      }
      return row;
    }),
});
