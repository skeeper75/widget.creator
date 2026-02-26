"use client";

// @MX:NOTE: [AUTO] Widget Admin Dashboard — Step 1 of 6-step product setup wizard
// @MX:SPEC: SPEC-WB-005 FR-WB005-01

import { useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Settings, Layers, DollarSign, Shield, Play, Rocket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
// dashboard returns: { id, productKey, productNameKo, isActive, isVisible, edicusCode, mesItemCd, completeness: CompletenessResult }[]
interface DashboardProduct {
  id: number;
  productKey: string;
  productNameKo: string;
  isActive: boolean;
  isVisible: boolean;
  edicusCode: string | null;
  mesItemCd: string | null;
  completeness: CompletenessResult;
}

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

export default function WidgetAdminPage() {
  // @MX:NOTE: [AUTO] widgetAdmin.dashboard — bulk query returning all products with completeness info
  // @MX:SPEC: SPEC-WB-005 FR-WB005-01
  const dashboardQuery = trpc.widgetAdmin.dashboard.useQuery();

  const products: DashboardProduct[] = dashboardQuery.data ?? [];

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

      <DataTable
        columns={columns}
        data={products}
        isLoading={dashboardQuery.isLoading}
        searchPlaceholder="상품명으로 검색..."
        emptyMessage="등록된 상품이 없습니다."
      />
    </div>
  );
}
