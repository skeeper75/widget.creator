"use client";

import { useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Pencil, PowerOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { ProductCategoryEditModal } from "@/components/widget-builder/product-category-edit-modal";
import { trpc } from "@/lib/trpc/client";

interface ProductCategory {
  id: number;
  categoryKey: string;
  categoryNameKo: string;
  categoryNameEn: string | null;
  displayOrder: number;
  isActive: boolean;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const STATUS_FILTER_OPTIONS = [
  { label: "활성", value: "true" },
  { label: "비활성", value: "false" },
];

const TABLE_FILTERS = [
  { columnId: "isActive", title: "상태", options: STATUS_FILTER_OPTIONS },
];

// @MX:NOTE: [AUTO] Product Categories page — CRUD admin for product_categories table (SPEC-MDM-001)
export default function ProductCategoriesPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<ProductCategory | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<ProductCategory | null>(null);

  const utils = trpc.useUtils();
  const listQuery = trpc.productCategories.list.useQuery({});

  const deactivateMutation = trpc.productCategories.deactivate.useMutation({
    onSuccess: () => {
      utils.productCategories.list.invalidate();
      setDeactivateTarget(null);
      toast.success("카테고리가 비활성화되었습니다");
    },
    onError: (err) => {
      setDeactivateTarget(null);
      toast.error(err.message);
    },
  });

  const columns: ColumnDef<ProductCategory, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "id",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="ID" />
        ),
        size: 60,
      },
      {
        accessorKey: "categoryKey",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="카테고리 키" />
        ),
        cell: ({ row }) => (
          <span className="font-mono text-sm">{row.getValue("categoryKey")}</span>
        ),
      },
      {
        accessorKey: "categoryNameKo",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="한국어 이름" />
        ),
        cell: ({ row }) => (
          <span className="font-medium">{row.getValue("categoryNameKo")}</span>
        ),
      },
      {
        accessorKey: "displayOrder",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="표시 순서" />
        ),
        cell: ({ row }) => (
          <span className="text-xs tabular-nums">{row.original.displayOrder}</span>
        ),
        size: 90,
      },
      {
        accessorKey: "isActive",
        header: "상태",
        cell: ({ row }) => {
          const active: boolean = row.getValue("isActive");
          return (
            <Badge variant={active ? "default" : "secondary"} className="text-xs">
              {active ? "활성" : "비활성"}
            </Badge>
          );
        },
        filterFn: (row, id, filterValues: string[]) =>
          filterValues.includes(String(row.getValue(id))),
      },
      {
        id: "actions",
        header: "",
        size: 50,
        cell: ({ row }) => {
          const item = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setEditItem(item);
                    setModalOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  수정
                </DropdownMenuItem>
                {item.isActive && (
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setDeactivateTarget(item)}
                  >
                    <PowerOff className="h-4 w-4 mr-2" />
                    비활성화
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [],
  );

  const data = (listQuery.data ?? []) as ProductCategory[];

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">카테고리 관리</h1>
          <p className="text-sm text-muted-foreground">
            위젯 상품 카테고리 마스터 데이터를 관리합니다
          </p>
        </div>
        <Button
          onClick={() => {
            setEditItem(null);
            setModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          카테고리 추가
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data}
        isLoading={listQuery.isLoading}
        filters={TABLE_FILTERS}
        searchPlaceholder="카테고리 검색..."
      />

      <ProductCategoryEditModal
        open={modalOpen}
        onOpenChange={(open) => {
          setModalOpen(open);
          if (!open) setEditItem(null);
        }}
        editItem={editItem}
      />

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        onOpenChange={(open) => {
          if (!open) setDeactivateTarget(null);
        }}
        title="카테고리 비활성화"
        description={`"${deactivateTarget?.categoryNameKo}" 카테고리를 비활성화하시겠습니까?`}
        confirmLabel="비활성화"
        destructive
        isLoading={deactivateMutation.isPending}
        onConfirm={() => {
          if (deactivateTarget) {
            deactivateMutation.mutate({ id: deactivateTarget.id });
          }
        }}
      />
    </div>
  );
}
