"use client";

// @MX:NOTE: [AUTO] Widget Admin Dashboard — Step 1 of 6-step product setup wizard
// @MX:NOTE: [AUTO] Stat cards (FR-WA001-01), category filter (FR-WA001-02), status filter (FR-WA001-03)
// @MX:SPEC: SPEC-WB-005 FR-WB005-01, SPEC-WA-001 FR-WA001-01, FR-WA001-02, FR-WA001-03

import { useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Settings, Layers, DollarSign, Shield, Play, Rocket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import {
  CompletenessBar,
  COMPLETENESS_ITEM_LABELS,
  type CompletenessItem,
} from "@/components/widget-admin/completeness-bar";
import { trpc } from "@/lib/trpc/client";
import type { CompletenessResult } from "@widget-creator/core";

// Dashboard row type — matches widgetAdmin.dashboard tRPC response
// dashboard returns: { id, productKey, productNameKo, isActive, isVisible, edicusCode, mesItemCd, categoryId, categoryNameKo, completeness }[]
interface DashboardProduct {
  id: number;
  productKey: string;
  productNameKo: string;
  isActive: boolean;
  isVisible: boolean;
  edicusCode: string | null;
  mesItemCd: string | null;
  categoryId: number;
  categoryNameKo: string;
  completeness: CompletenessResult;
}

// ─── Exported interfaces for testability ─────────────────────────────────────

export interface DashboardStats {
  total: number;
  active: number;
  draft: number;
  incomplete: number;
}

// ─── Pure functions (exported for unit tests) ─────────────────────────────────

// @MX:ANCHOR: [AUTO] computeDashboardStats — stat card computation, fan_in >= 3 (page, tests, future)
// @MX:REASON: Public pure function used by stat cards and tests
// @MX:SPEC: SPEC-WA-001 FR-WA001-01
function computeDashboardStats(products: DashboardProduct[]): DashboardStats {
  const total = products.length;
  const active = products.filter((p) => p.isVisible === true).length;
  const draft = products.filter(
    (p) => p.isVisible === false && p.completeness.publishable === true
  ).length;
  const incomplete = products.filter(
    (p) => p.completeness.publishable === false
  ).length;
  return { total, active, draft, incomplete };
}

// @MX:NOTE: [AUTO] filterByCategory — returns all when categoryId is null
// @MX:SPEC: SPEC-WA-001 FR-WA001-02
function filterByCategory(
  products: DashboardProduct[],
  categoryId: number | null
): DashboardProduct[] {
  if (categoryId === null) return products;
  return products.filter((p) => p.categoryId === categoryId);
}

// @MX:NOTE: [AUTO] filterByStatus — filters by '활성', '임시저장', '미완성', or 'all'
// @MX:SPEC: SPEC-WA-001 FR-WA001-03
function filterByStatus(
  products: DashboardProduct[],
  status: string
): DashboardProduct[] {
  if (status === 'all') return products;
  if (status === '활성') return products.filter((p) => p.isVisible === true);
  if (status === '임시저장')
    return products.filter(
      (p) => p.isVisible === false && p.completeness.publishable === true
    );
  if (status === '미완성')
    return products.filter((p) => p.completeness.publishable === false);
  return products;
}

// @MX:NOTE: [AUTO] filterProducts — combines category and status filters
// @MX:SPEC: SPEC-WA-001 FR-WA001-02, FR-WA001-03
function filterProducts(
  products: DashboardProduct[],
  categoryId: number | null,
  status: string
): DashboardProduct[] {
  return filterByStatus(filterByCategory(products, categoryId), status);
}

// ─── Completeness helpers ─────────────────────────────────────────────────────

// Completeness item ordering for consistent display
const COMPLETENESS_KEYS: Array<CompletenessItem["key"]> = [
  "options",
  "pricing",
  "constraints",
  "mesMapping",
];

// CompletenessResult.items uses { item, completed, message } — map to CompletenessItem shape
function buildCompletenessItems(
  completeness: CompletenessResult
): CompletenessItem[] {
  return COMPLETENESS_KEYS.map((key) => {
    const found = completeness.items.find((i) => i.item === key);
    return {
      key,
      label: COMPLETENESS_ITEM_LABELS[key],
      completed: found?.completed ?? false,
      detail: found?.message,
    };
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function WidgetAdminPage() {
  // @MX:NOTE: [AUTO] widgetAdmin.dashboard — bulk query returning all products with completeness info
  // @MX:SPEC: SPEC-WB-005 FR-WB005-01
  const dashboardQuery = trpc.widgetAdmin.dashboard.useQuery();

  const products: DashboardProduct[] = dashboardQuery.data ?? [];

  // Filter state — FR-WA001-02, FR-WA001-03
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Derived data
  const stats = useMemo(() => computeDashboardStats(products), [products]);
  const filteredProducts = useMemo(
    () => filterProducts(products, categoryFilter, statusFilter),
    [products, categoryFilter, statusFilter]
  );

  // Unique categories from products (for filter dropdown)
  const categories = useMemo(() => {
    const seen = new Map<number, string>();
    products.forEach((p) => {
      if (!seen.has(p.categoryId)) {
        seen.set(p.categoryId, p.categoryNameKo);
      }
    });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [products]);

  const columns: ColumnDef<DashboardProduct, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "productNameKo",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="상품명" />
        ),
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.productNameKo}</p>
            <p className="text-xs text-muted-foreground font-mono">
              {row.original.productKey}
            </p>
          </div>
        ),
      },
      {
        id: "completeness",
        header: "완성도",
        cell: ({ row }) => {
          const { completeness } = row.original;
          const items = buildCompletenessItems(completeness);
          return (
            <CompletenessBar
              items={items}
              completedCount={completeness.completedCount}
              totalCount={completeness.totalCount}
              className="w-36"
            />
          );
        },
        size: 180,
      },
      {
        id: "status",
        header: "상태",
        cell: ({ row }) => {
          const { isVisible, completeness } = row.original;
          if (isVisible) {
            return (
              <Badge className="bg-green-100 text-green-800 border-green-200">
                발행됨
              </Badge>
            );
          }
          if (completeness.publishable) {
            return (
              <Badge variant="outline" className="text-blue-600 border-blue-300">
                발행 준비
              </Badge>
            );
          }
          return <Badge variant="secondary">미완성</Badge>;
        },
        size: 100,
      },
      {
        id: "actions",
        header: "관리",
        cell: ({ row }) => {
          const id = row.original.id;
          return (
            <div className="flex items-center gap-1 flex-wrap">
              <Link href={`/widget-admin/${id}/options`}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1"
                >
                  <Settings className="h-3 w-3" />
                  옵션
                </Button>
              </Link>
              <Link href={`/widget-admin/${id}/pricing`}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1"
                >
                  <DollarSign className="h-3 w-3" />
                  가격
                </Button>
              </Link>
              <Link href={`/widget-admin/${id}/constraints`}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1"
                >
                  <Shield className="h-3 w-3" />
                  제약
                </Button>
              </Link>
              <Link href={`/widget-admin/${id}/simulate`}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1"
                >
                  <Play className="h-3 w-3" />
                  시뮬레이션
                </Button>
              </Link>
              <Link href={`/widget-admin/${id}/publish`}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs gap-1"
                >
                  <Rocket className="h-3 w-3" />
                  발행
                </Button>
              </Link>
            </div>
          );
        },
        size: 260,
      },
    ],
    []
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            위젯빌더 상품 관리
          </h1>
          <p className="text-muted-foreground">
            상품별 완성도를 확인하고 6단계 설정을 완료하세요 ({products.length}
            개 상품)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {products.filter((p) => p.completeness.publishable).length}개 발행
            가능
          </span>
        </div>
      </div>

      {/* FR-WA001-01: Stat Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* 전체 상품 */}
        <Card>
          <CardContent className="pt-6">
            {dashboardQuery.isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <p className="text-sm text-muted-foreground">전체 상품</p>
                <p className="text-3xl font-bold mt-1">{stats.total}</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* 활성 판매 */}
        <Card>
          <CardContent className="pt-6">
            {dashboardQuery.isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <p className="text-sm text-muted-foreground">활성 판매</p>
                <p className="text-3xl font-bold mt-1 text-[#5538B6]">
                  {stats.active}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* 임시저장 */}
        <Card>
          <CardContent className="pt-6">
            {dashboardQuery.isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <p className="text-sm text-muted-foreground">임시저장</p>
                <p className="text-3xl font-bold mt-1 text-[#E6B93F]">
                  {stats.draft}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* 미완성 */}
        <Card>
          <CardContent className="pt-6">
            {dashboardQuery.isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <p className="text-sm text-muted-foreground">미완성</p>
                <p className="text-3xl font-bold mt-1 text-[#C7000B]">
                  {stats.incomplete}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* FR-WA001-02 & FR-WA001-03: Filter Row */}
      <div className="flex items-center gap-3">
        {/* Category Filter */}
        <Select
          value={categoryFilter === null ? 'all' : String(categoryFilter)}
          onValueChange={(val) =>
            setCategoryFilter(val === 'all' ? null : Number(val))
          }
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="카테고리" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 카테고리</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={String(cat.id)}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="활성">활성</SelectItem>
            <SelectItem value="임시저장">임시저장</SelectItem>
            <SelectItem value="미완성">미완성</SelectItem>
          </SelectContent>
        </Select>

        {/* Filter count indicator */}
        {(categoryFilter !== null || statusFilter !== 'all') && (
          <span className="text-sm text-muted-foreground">
            {filteredProducts.length}개 표시
          </span>
        )}
      </div>

      <DataTable
        columns={columns}
        data={filteredProducts}
        isLoading={dashboardQuery.isLoading}
        searchPlaceholder="상품명으로 검색..."
        emptyMessage="등록된 상품이 없습니다."
      />
    </div>
  );
}
