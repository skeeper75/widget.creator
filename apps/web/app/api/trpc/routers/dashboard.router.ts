import { z } from 'zod';
import { sql, eq, gte, and } from 'drizzle-orm';
import { products, orders, widgets } from '@widget-creator/shared/db';
import { router, protectedProcedure } from '../trpc.js';

export const dashboardRouter = router({
  /**
   * Dashboard statistics: total orders, revenue, pending orders, active widgets, active products.
   * REQ-042: dashboard.stats
   */
  stats: protectedProcedure.query(async ({ ctx }) => {
    // Active products count
    const [productCount] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(eq(products.isActive, true));

    // Total orders count
    const [orderCount] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders);

    // Orders today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const [ordersToday] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(gte(orders.createdAt, todayStart));

    // Revenue today
    const [revenueToday] = await ctx.db
      .select({ total: sql<number>`coalesce(sum(total_price::numeric), 0)::int` })
      .from(orders)
      .where(gte(orders.createdAt, todayStart));

    // Revenue this month
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const [revenueMonth] = await ctx.db
      .select({ total: sql<number>`coalesce(sum(total_price::numeric), 0)::int` })
      .from(orders)
      .where(gte(orders.createdAt, monthStart));

    // Pending orders (unpaid + paid + production_waiting)
    const [pendingCount] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(orders)
      .where(
        sql`${orders.status} IN ('unpaid', 'paid', 'production_waiting')`,
      );

    // Active widgets count
    const [widgetCount] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(widgets)
      .where(eq(widgets.status, 'active'));

    return {
      total_orders: orderCount?.count ?? 0,
      orders_today: ordersToday?.count ?? 0,
      revenue_today: revenueToday?.total ?? 0,
      revenue_month: revenueMonth?.total ?? 0,
      pending_orders: pendingCount?.count ?? 0,
      active_widgets: widgetCount?.count ?? 0,
      active_products: productCount?.count ?? 0,
    };
  }),

  /**
   * Activity feed: recent changes across the system.
   * REQ-042: dashboard.activityFeed
   */
  activityFeed: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(20) }))
    .query(async ({ ctx, input }) => {
      // Recent products as activity feed entries
      const recentProducts = await ctx.db
        .select({
          id: products.id,
          name: products.name,
          updatedAt: products.updatedAt,
        })
        .from(products)
        .orderBy(sql`${products.updatedAt} DESC`)
        .limit(input.limit);

      return recentProducts.map((p: { id: number; name: string; updatedAt: Date }) => ({
        type: 'product_updated' as const,
        resource_id: p.id,
        resource_name: p.name,
        timestamp: p.updatedAt.toISOString(),
      }));
    }),
});
