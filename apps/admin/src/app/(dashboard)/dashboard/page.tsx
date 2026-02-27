"use client";

import { Package, Layers, Link2, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  isLoading?: boolean;
}

function StatCard({ title, value, subtitle, icon, isLoading }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface ActivityItem {
  id: number;
  description: string;
  timestamp: string | Date | null;
}

export default function DashboardPage() {
  // dashboard.stats returns { totalProducts, activeProducts, totalWidgets, activeWidgets, constraintCount, mesMappingRate }
  const statsQuery = trpc.dashboard.stats.useQuery();
  // dashboard.recentActivity returns array of { id, description, timestamp }
  const activityQuery = trpc.dashboard.recentActivity.useQuery();

  const stats = statsQuery.data;
  const isLoading = statsQuery.isLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Widget Builder Admin Overview
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Products"
          value={stats?.activeProducts ?? 0}
          subtitle={`${stats?.totalProducts ?? 0} total`}
          icon={<Package className="h-4 w-4" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Active Widgets"
          value={stats?.activeWidgets ?? 0}
          subtitle={`${stats?.totalWidgets ?? 0} total`}
          icon={<Layers className="h-4 w-4" />}
          isLoading={isLoading}
        />
        <StatCard
          title="Constraints"
          value={stats?.constraintCount ?? 0}
          subtitle="Option constraints"
          icon={<Link2 className="h-4 w-4" />}
          isLoading={isLoading}
        />
        <StatCard
          title="MES Mapping"
          value={`${stats?.mesMappingRate ?? 0}%`}
          subtitle="Completion rate"
          icon={<Activity className="h-4 w-4" />}
          isLoading={isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activityQuery.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (activityQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No recent activity
            </p>
          ) : (
            <div className="space-y-3">
              {(activityQuery.data ?? []).map((item: ActivityItem) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between border-b pb-2 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {item.description}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.timestamp
                      ? new Date(item.timestamp).toLocaleString("ko-KR")
                      : "-"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
