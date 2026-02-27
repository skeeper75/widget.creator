import { sql, eq } from 'drizzle-orm';
import {
  products,
  widgets,
  optionConstraints,
  productMesMappings,
  optionChoiceMesMappings,
} from '@widget-creator/shared/db/schema';
import { router, protectedProcedure } from '../server';

export const dashboardRouter = router({
  stats: protectedProcedure.query(async ({ ctx }) => {
    const [
      totalProducts,
      activeProducts,
      totalWidgets,
      activeWidgets,
      constraintCount,
      totalMesMappings,
      completedMesMappings,
    ] = await Promise.all([
      ctx.db.select({ count: sql<number>`count(*)` }).from(products),
      ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(products)
        .where(eq(products.isActive, true)),
      ctx.db.select({ count: sql<number>`count(*)` }).from(widgets),
      ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(widgets)
        .where(eq(widgets.isActive, true)),
      ctx.db.select({ count: sql<number>`count(*)` }).from(optionConstraints),
      ctx.db.select({ count: sql<number>`count(*)` }).from(optionChoiceMesMappings),
      ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(optionChoiceMesMappings)
        .where(
          sql`${optionChoiceMesMappings.mappingStatus} IN ('mapped', 'verified')`,
        ),
    ]);

    const totalMes = Number(totalMesMappings[0]?.count ?? 0);
    const completedMes = Number(completedMesMappings[0]?.count ?? 0);
    const mesMappingRate = totalMes > 0 ? Math.round((completedMes / totalMes) * 100) : 0;

    return {
      totalProducts: Number(totalProducts[0]?.count ?? 0),
      activeProducts: Number(activeProducts[0]?.count ?? 0),
      totalWidgets: Number(totalWidgets[0]?.count ?? 0),
      activeWidgets: Number(activeWidgets[0]?.count ?? 0),
      constraintCount: Number(constraintCount[0]?.count ?? 0),
      mesMappingRate,
    };
  }),

  recentActivity: protectedProcedure.query(async ({ ctx }) => {
    // Return most recently updated products as activity feed
    const recent = await ctx.db
      .select({
        id: products.id,
        name: products.name,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .orderBy(sql`${products.updatedAt} DESC`)
      .limit(10);

    return recent.map((item) => ({
      id: item.id,
      description: `Product "${item.name}" updated`,
      timestamp: item.updatedAt,
    }));
  }),
});
