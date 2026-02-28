import { z } from 'zod';
import { eq as _eq, and as _and } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { constraintTemplates } from '@widget-creator/db';
import { router, protectedProcedure } from '../../server';

// pnpm resolves two drizzle-orm instances (postgres + libsql), causing SQL<unknown> type conflicts.
// Cast helpers to any-accepting variants to bypass structural incompatibility at type level.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyArg = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const eq = _eq as (a: AnyArg, b: AnyArg) => any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const and = _and as (...conditions: AnyArg[]) => any;

// ─── Input schemas ────────────────────────────────────────────────────────────

const CreateConstraintTemplateSchema = z.object({
  templateKey: z.string().min(1).max(100),
  templateNameKo: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
  category: z.string().max(50).nullable().optional(),
  triggerOptionType: z.string().max(50).nullable().optional(),
  triggerOperator: z.string().max(20).nullable().optional(),
  triggerValuesPattern: z.unknown().nullable().optional(),
  extraConditionsPattern: z.unknown().nullable().optional(),
  actionsPattern: z.array(z.unknown()).min(1),
});

const UpdateConstraintTemplateSchema = z.object({
  id: z.number().int().positive(),
  data: z.object({
    templateNameKo: z.string().min(1).max(200).optional(),
    description: z.string().nullable().optional(),
    category: z.string().max(50).nullable().optional(),
    triggerOptionType: z.string().max(50).nullable().optional(),
    triggerOperator: z.string().max(20).nullable().optional(),
    triggerValuesPattern: z.unknown().nullable().optional(),
    extraConditionsPattern: z.unknown().nullable().optional(),
    actionsPattern: z.array(z.unknown()).min(1).optional(),
  }),
});

// @MX:ANCHOR: [AUTO] constraintTemplatesRouter — SPEC-WIDGET-ADMIN-001 Phase 3 router for ECA constraint templates
// @MX:REASON: Fan_in >= 3: used by index router, constraint-templates page, and TemplateDetailPanel component
// @MX:SPEC: SPEC-WIDGET-ADMIN-001 FR-WBADMIN-004
export const constraintTemplatesRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        category: z.string().optional(),
        isSystem: z.boolean().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [];
      if (input.category !== undefined) {
        conditions.push(eq(constraintTemplates.category, input.category));
      }
      if (input.isSystem !== undefined) {
        conditions.push(eq(constraintTemplates.isSystem, input.isSystem));
      }
      if (input.isActive !== undefined) {
        conditions.push(eq(constraintTemplates.isActive, input.isActive));
      }
      return ctx.db
        .select()
        .from(constraintTemplates)
        .where(conditions.length > 0 ? and(...conditions) : undefined);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(constraintTemplates)
        .where(eq(constraintTemplates.id, input.id));

      if (!row) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Constraint template not found' });
      }
      return row;
    }),

  // @MX:NOTE: [AUTO] create always enforces isSystem=false — custom templates only
  // @MX:REASON: System templates are seeded by migration, not created via admin UI
  // @MX:SPEC: SPEC-WIDGET-ADMIN-001 FR-WBADMIN-004
  create: protectedProcedure
    .input(CreateConstraintTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(constraintTemplates)
        .values({
          templateKey: input.templateKey,
          templateNameKo: input.templateNameKo,
          description: input.description ?? null,
          category: input.category ?? null,
          triggerOptionType: input.triggerOptionType ?? null,
          triggerOperator: input.triggerOperator ?? null,
          triggerValuesPattern: input.triggerValuesPattern ?? null,
          extraConditionsPattern: input.extraConditionsPattern ?? null,
          actionsPattern: input.actionsPattern,
          // isSystem is always false for user-created templates
          isSystem: false,
          isActive: true,
        })
        .returning();
      return row;
    }),

  // @MX:WARN: [AUTO] update/deactivate MUST check isSystem before mutating
  // @MX:REASON: System templates are read-only per FR-WBADMIN-004; mutation would corrupt seeded ECA rule library
  // @MX:SPEC: SPEC-WIDGET-ADMIN-001 FR-WBADMIN-004
  update: protectedProcedure
    .input(UpdateConstraintTemplateSchema)
    .mutation(async ({ ctx, input }) => {
      // Guard: system templates are read-only
      const [existing] = await ctx.db
        .select({ isSystem: constraintTemplates.isSystem })
        .from(constraintTemplates)
        .where(eq(constraintTemplates.id, input.id));

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Constraint template not found' });
      }

      if (existing.isSystem) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'System templates are read-only and cannot be modified',
        });
      }

      const [row] = await ctx.db
        .update(constraintTemplates)
        .set({ ...input.data })
        .where(eq(constraintTemplates.id, input.id))
        .returning();

      return row;
    }),

  deactivate: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      // Guard: system templates are read-only
      const [existing] = await ctx.db
        .select({ isSystem: constraintTemplates.isSystem })
        .from(constraintTemplates)
        .where(eq(constraintTemplates.id, input.id));

      if (!existing) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Constraint template not found' });
      }

      if (existing.isSystem) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'System templates are read-only and cannot be deactivated',
        });
      }

      const [row] = await ctx.db
        .update(constraintTemplates)
        .set({ isActive: false })
        .where(eq(constraintTemplates.id, input.id))
        .returning();

      return row;
    }),
});
