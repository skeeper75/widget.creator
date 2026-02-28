import { z } from 'zod';
import { eq as _eq, asc as _asc, and as _and } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import { addonGroups, addonGroupItems, wbProducts } from '@widget-creator/db';
import { router, protectedProcedure } from '../../server';

// pnpm resolves two drizzle-orm instances (postgres + libsql), causing SQL<unknown> type conflicts
// between @widget-creator/db table columns (libsql instance) and admin app drizzle helpers (postgres
// instance). Cast helpers to any-accepting variants to bypass structural incompatibility at type
// level while preserving runtime correctness.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyArg = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const eq = _eq as (a: AnyArg, b: AnyArg) => any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const asc = _asc as (col: AnyArg) => any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const and = _and as (...conditions: AnyArg[]) => any;

// ─── Display mode enum ────────────────────────────────────────────────────────

const DisplayModeEnum = z.enum(['list', 'grid', 'carousel']);

// ─── Input schemas ────────────────────────────────────────────────────────────

const CreateAddonGroupSchema = z.object({
  groupName: z.string().min(1).max(100),
  groupLabel: z.string().max(100).nullable().optional(),
  displayMode: DisplayModeEnum.default('list'),
  isRequired: z.boolean().default(false),
  displayOrder: z.number().int().min(0).default(0),
  description: z.string().nullable().optional(),
});

const UpdateAddonGroupSchema = z.object({
  id: z.number().int().positive(),
  data: z.object({
    groupName: z.string().min(1).max(100).optional(),
    groupLabel: z.string().max(100).nullable().optional(),
    displayMode: DisplayModeEnum.optional(),
    isRequired: z.boolean().optional(),
    displayOrder: z.number().int().min(0).optional(),
    description: z.string().nullable().optional(),
  }),
});

const AddItemSchema = z.object({
  groupId: z.number().int().positive(),
  productId: z.number().int().positive(),
  labelOverride: z.string().max(100).nullable().optional(),
  isDefault: z.boolean().default(false),
  displayOrder: z.number().int().min(0).default(0),
  priceOverride: z.number().int().nullable().optional(),
});

const ItemOrderSchema = z.object({
  id: z.number().int().positive(),
  displayOrder: z.number().int().min(0),
});

// @MX:ANCHOR: [AUTO] addonGroupsRouter — SPEC-WIDGET-ADMIN-001 Phase 3 router for addon group management
// @MX:REASON: Fan_in >= 3: used by index router, addons page, and AddonGroupEditor component
// @MX:SPEC: SPEC-WIDGET-ADMIN-001 FR-WBADMIN-005
export const addonGroupsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = ctx.db as unknown as AnyDb;
    return db
      .select()
      .from(addonGroups)
      .where(eq(addonGroups.isActive, true))
      .orderBy(asc(addonGroups.displayOrder), asc(addonGroups.id));
  }),

  getWithItems: protectedProcedure
    .input(z.object({ groupId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = ctx.db as unknown as AnyDb;
      const [group] = await db
        .select()
        .from(addonGroups)
        .where(eq(addonGroups.id, input.groupId));

      if (!group) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Addon group not found' });
      }

      const items = await db
        .select({
          id: addonGroupItems.id,
          groupId: addonGroupItems.groupId,
          productId: addonGroupItems.productId,
          productName: wbProducts.productNameKo,
          labelOverride: addonGroupItems.labelOverride,
          isDefault: addonGroupItems.isDefault,
          displayOrder: addonGroupItems.displayOrder,
          priceOverride: addonGroupItems.priceOverride,
        })
        .from(addonGroupItems)
        .innerJoin(wbProducts, eq(addonGroupItems.productId, wbProducts.id))
        .where(eq(addonGroupItems.groupId, input.groupId))
        .orderBy(asc(addonGroupItems.displayOrder), asc(addonGroupItems.id));

      return { ...group, items };
    }),

  create: protectedProcedure
    .input(CreateAddonGroupSchema)
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db as unknown as AnyDb;
      const [row] = await db
        .insert(addonGroups)
        .values({
          groupName: input.groupName,
          groupLabel: input.groupLabel ?? null,
          displayMode: input.displayMode,
          isRequired: input.isRequired,
          displayOrder: input.displayOrder,
          description: input.description ?? null,
          isActive: true,
        })
        .returning();
      return row;
    }),

  update: protectedProcedure
    .input(UpdateAddonGroupSchema)
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db as unknown as AnyDb;
      const [row] = await db
        .update(addonGroups)
        .set({
          ...input.data,
          updatedAt: new Date(),
        })
        .where(eq(addonGroups.id, input.id))
        .returning();

      if (!row) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Addon group not found' });
      }
      return row;
    }),

  deactivate: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db as unknown as AnyDb;
      const [row] = await db
        .update(addonGroups)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(addonGroups.id, input.id))
        .returning();

      if (!row) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Addon group not found' });
      }
      return row;
    }),

  // @MX:NOTE: [AUTO] addItem guards against duplicate (groupId, productId) via DB unique constraint
  // @MX:REASON: uq_agi unique index on (group_id, product_id) prevents duplicate products in same group
  // @MX:SPEC: SPEC-WIDGET-ADMIN-001 FR-WBADMIN-005
  addItem: protectedProcedure
    .input(AddItemSchema)
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db as unknown as AnyDb;
      // Check for duplicate product in this group
      const [existing] = await db
        .select({ id: addonGroupItems.id })
        .from(addonGroupItems)
        .where(
          and(
            eq(addonGroupItems.groupId, input.groupId),
            eq(addonGroupItems.productId, input.productId),
          ),
        );

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'This product is already in the addon group',
        });
      }

      const [row] = await db
        .insert(addonGroupItems)
        .values({
          groupId: input.groupId,
          productId: input.productId,
          labelOverride: input.labelOverride ?? null,
          isDefault: input.isDefault,
          displayOrder: input.displayOrder,
          priceOverride: input.priceOverride ?? null,
        })
        .returning();
      return row;
    }),

  removeItem: protectedProcedure
    .input(z.object({ itemId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db as unknown as AnyDb;
      const [row] = await db
        .delete(addonGroupItems)
        .where(eq(addonGroupItems.id, input.itemId))
        .returning();

      if (!row) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Addon group item not found' });
      }
      return row;
    }),

  updateItemOrder: protectedProcedure
    .input(
      z.object({
        groupId: z.number().int().positive(),
        items: z.array(ItemOrderSchema).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db as unknown as AnyDb;
      // Batch update display order for each item in the group
      await Promise.all(
        input.items.map((item) =>
          db
            .update(addonGroupItems)
            .set({ displayOrder: item.displayOrder })
            .where(eq(addonGroupItems.id, item.id)),
        ),
      );

      // Return updated items with product names
      return db
        .select({
          id: addonGroupItems.id,
          groupId: addonGroupItems.groupId,
          productId: addonGroupItems.productId,
          productName: wbProducts.productNameKo,
          labelOverride: addonGroupItems.labelOverride,
          isDefault: addonGroupItems.isDefault,
          displayOrder: addonGroupItems.displayOrder,
          priceOverride: addonGroupItems.priceOverride,
        })
        .from(addonGroupItems)
        .innerJoin(wbProducts, eq(addonGroupItems.productId, wbProducts.id))
        .where(eq(addonGroupItems.groupId, input.groupId))
        .orderBy(asc(addonGroupItems.displayOrder), asc(addonGroupItems.id));
    }),
});
