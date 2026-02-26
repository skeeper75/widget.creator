"use client";

// @MX:NOTE: [AUTO] Publish Page — Step 6 of admin wizard; 4-item completeness gate before product activation
// @MX:SPEC: SPEC-WB-005 FR-WB005-07, FR-WB005-08

import { use, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Rocket,
  PowerOff,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc/client";
import {
  COMPLETENESS_ITEM_LABELS,
  type CompletenessItem,
} from "@/components/widget-admin/completeness-bar";
import { PublishDialog } from "@/components/widget-admin/publish-dialog";
import { cn } from "@/lib/utils";
import type { CompletenessResult } from "@widget-creator/core";

const COMPLETENESS_KEYS: Array<CompletenessItem["key"]> = [
  "options",
  "pricing",
  "constraints",
  "mesMapping",
];

// Links for each completeness item to navigate to the fix page
const COMPLETENESS_FIX_LINKS: Record<CompletenessItem["key"], string> = {
  options: "options",
  pricing: "pricing",
  constraints: "constraints",
  mesMapping: "mes-mapping",
};

// Map CompletenessResult.items (item/completed/message) to CompletenessItem (key/label/completed/detail)
function toCompletenessItems(result: CompletenessResult): CompletenessItem[] {
  return COMPLETENESS_KEYS.map((key) => {
    const found = result.items.find((i) => i.item === key);
    return {
      key,
      label: COMPLETENESS_ITEM_LABELS[key],
      completed: found?.completed ?? false,
      detail: found?.message,
    };
  });
}

interface PageProps {
  params: Promise<{ productId: string }>;
}

export default function PublishPage({ params }: PageProps) {
  const { productId: productIdStr } = use(params);
  const productId = parseInt(productIdStr, 10);

  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [unpublishDialogOpen, setUnpublishDialogOpen] = useState(false);

  // completeness query returns CompletenessResult: { items, publishable, completedCount, totalCount }
  const completenessQuery = trpc.widgetAdmin.completeness.useQuery({ productId });

  // publishHistory query returns PublishHistory[] DB rows
  const historyQuery = trpc.widgetAdmin.publishHistory.useQuery({ productId });

  const publishMutation = trpc.widgetAdmin.publish.useMutation({
    onSuccess: () => {
      toast.success("상품이 발행되었습니다. 고객 주문 화면에 노출됩니다.");
      setPublishDialogOpen(false);
      void completenessQuery.refetch();
      void historyQuery.refetch();
    },
    onError: (err) => {
      toast.error(`발행 실패: ${err.message}`);
    },
  });

  const unpublishMutation = trpc.widgetAdmin.unpublish.useMutation({
    onSuccess: () => {
      toast.success("발행이 취소되었습니다. 고객 화면에서 즉시 제거됩니다.");
      setUnpublishDialogOpen(false);
      void completenessQuery.refetch();
      void historyQuery.refetch();
    },
    onError: (err) => {
      toast.error(`발행 취소 실패: ${err.message}`);
    },
  });

  const completenessData = completenessQuery.data;
  const publishable: boolean = completenessData?.publishable ?? false;
  const completedCount: number = completenessData?.completedCount ?? 0;

  // Build display items from the items array
  const completenessItems: CompletenessItem[] = completenessData
    ? toCompletenessItems(completenessData)
    : COMPLETENESS_KEYS.map((key) => ({
        key,
        label: COMPLETENESS_ITEM_LABELS[key],
        completed: false,
        detail: undefined,
      }));

  // publishHistory rows from DB (camelCase via Drizzle)
  const publishHistoryRows = historyQuery.data ?? [];

  // Derive isPublished from history: last action is 'publish'
  const lastAction = publishHistoryRows[0]?.action;
  const isPublished = lastAction === "publish";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">상품 발행</h1>
          <p className="text-muted-foreground">상품 ID: {productId}</p>
        </div>
        <div className="flex items-center gap-2">
          {isPublished && (
            <Badge className="bg-green-100 text-green-800 border-green-200 text-sm px-3 py-1">
              발행됨
            </Badge>
          )}
        </div>
      </div>

      {/* Completeness checklist */}
      <div className="border rounded-lg p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">완성도 체크리스트</h2>
          <span className="text-sm text-muted-foreground">
            {completedCount}/4 완료
          </span>
        </div>

        <div className="space-y-3">
          {completenessQuery.isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))
            : completenessItems.map((item) => (
                <div
                  key={item.key}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border",
                    item.completed
                      ? "bg-green-50 border-green-200"
                      : "bg-gray-50 border-gray-200"
                  )}
                >
                  {item.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "font-medium text-sm",
                        item.completed ? "text-green-800" : "text-gray-700"
                      )}
                    >
                      {item.label}
                    </p>
                    {item.detail && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.detail}
                      </p>
                    )}
                    {!item.completed && (
                      <Link
                        href={`/widget-admin/${productId}/${COMPLETENESS_FIX_LINKS[item.key]}`}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-1"
                      >
                        설정하러 가기
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
        </div>

        {!publishable && !completenessQuery.isLoading && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm">
            <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" />
            <span className="text-yellow-800">
              미완료 항목을 완성해야 발행할 수 있습니다.
            </span>
          </div>
        )}
      </div>

      {/* Publish / Unpublish actions */}
      <div className="flex items-center gap-3">
        {!isPublished ? (
          <Button
            onClick={() => setPublishDialogOpen(true)}
            disabled={!publishable || completenessQuery.isLoading}
            className="gap-2"
          >
            <Rocket className="h-4 w-4" />
            발행
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={() => setUnpublishDialogOpen(true)}
            disabled={unpublishMutation.isPending}
            className="gap-2 text-red-600 border-red-300 hover:bg-red-50"
          >
            <PowerOff className="h-4 w-4" />
            발행 취소
          </Button>
        )}
        {!publishable && !completenessQuery.isLoading && (
          <p className="text-sm text-muted-foreground">
            4개 항목 완료 후 발행 가능합니다.
          </p>
        )}
      </div>

      {/* Publish history */}
      {publishHistoryRows.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3">발행 이력</h2>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>일시</TableHead>
                  <TableHead>작업</TableHead>
                  <TableHead>처리자</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyQuery.isLoading
                  ? Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="h-4 w-32" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                      </TableRow>
                    ))
                  : publishHistoryRows.map((h) => (
                      <TableRow key={h.id}>
                        <TableCell className="text-sm">
                          {new Date(h.createdAt).toLocaleString("ko-KR", {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell>
                          {h.action === "publish" ? (
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              발행
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-red-600 border-red-300"
                            >
                              발행 취소
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {h.createdBy ?? "시스템"}
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Publish confirmation dialog */}
      <PublishDialog
        open={publishDialogOpen}
        onOpenChange={setPublishDialogOpen}
        productName={`상품 #${productId}`}
        completenessItems={completenessItems}
        publishable={publishable}
        onConfirm={() => publishMutation.mutate({ productId })}
        isPending={publishMutation.isPending}
      />

      {/* Unpublish confirmation dialog */}
      <PublishDialog
        open={unpublishDialogOpen}
        onOpenChange={setUnpublishDialogOpen}
        productName={`상품 #${productId}`}
        completenessItems={completenessItems}
        publishable={true}
        onConfirm={() => unpublishMutation.mutate({ productId })}
        isPending={unpublishMutation.isPending}
      />
    </div>
  );
}
