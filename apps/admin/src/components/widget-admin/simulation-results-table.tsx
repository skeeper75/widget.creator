"use client";

// @MX:NOTE: [AUTO] SimulationResultsTable — paginated table for viewing individual simulation case results
// @MX:SPEC: SPEC-WB-005 FR-WB005-04

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SimulationCaseRow {
  id: number;
  selections: Record<string, string>;
  resultStatus: "pass" | "warn" | "error";
  totalPrice?: number | null;
  message?: string | null;
}

interface SimulationResultsTableProps {
  cases: SimulationCaseRow[];
  isLoading?: boolean;
  totalCount: number;
  page: number;
  pageSize: number;
  statusFilter: "all" | "pass" | "warn" | "error";
  onPageChange: (page: number) => void;
  onStatusFilterChange: (filter: "all" | "pass" | "warn" | "error") => void;
  className?: string;
}

const STATUS_BADGE_MAP: Record<
  "pass" | "warn" | "error",
  { label: string; className: string }
> = {
  pass: { label: "통과", className: "bg-green-100 text-green-800 border-green-200" },
  warn: { label: "경고", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  error: { label: "오류", className: "bg-red-100 text-red-800 border-red-200" },
};

function SelectionsDisplay({
  selections,
}: {
  selections: Record<string, string>;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {Object.entries(selections).map(([key, value]) => (
        <span
          key={key}
          className="inline-flex items-center text-xs bg-muted px-1.5 py-0.5 rounded"
        >
          <span className="text-muted-foreground mr-1">{key}:</span>
          {value}
        </span>
      ))}
    </div>
  );
}

// @MX:ANCHOR: [AUTO] SimulationResultsTable — called from simulate page with filter/pagination state
// @MX:REASON: fan_in >= 3: simulate page, CSV export handler, single test result display
// @MX:SPEC: SPEC-WB-005 FR-WB005-04
export function SimulationResultsTable({
  cases,
  isLoading = false,
  totalCount,
  page,
  pageSize,
  statusFilter,
  onPageChange,
  onStatusFilterChange,
  className,
}: SimulationResultsTableProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startRow = (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, totalCount);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">상태 필터</span>
          <Select
            value={statusFilter}
            onValueChange={(v) =>
              onStatusFilterChange(v as "all" | "pass" | "warn" | "error")
            }
          >
            <SelectTrigger className="w-32 h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="pass">통과</SelectItem>
              <SelectItem value="warn">경고</SelectItem>
              <SelectItem value="error">오류</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <span className="text-sm text-muted-foreground">
          총 {totalCount.toLocaleString()}건
        </span>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>옵션 조합</TableHead>
              <TableHead className="w-28 text-right">견적가</TableHead>
              <TableHead className="w-20">상태</TableHead>
              <TableHead>메시지</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  <TableCell>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-20 ml-auto" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-12" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-4 w-40" />
                  </TableCell>
                </TableRow>
              ))
            ) : cases.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-24 text-center text-muted-foreground"
                >
                  결과가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              cases.map((c) => {
                const badge = STATUS_BADGE_MAP[c.resultStatus];
                return (
                  <TableRow key={c.id}>
                    <TableCell>
                      <SelectionsDisplay selections={c.selections} />
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {c.totalPrice != null
                        ? `${Number(c.totalPrice).toLocaleString()}원`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge className={badge.className}>{badge.label}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {c.message ?? "-"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {totalCount > 0 ? `${startRow}–${endRow} / ${totalCount.toLocaleString()}건` : "0건"}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm px-2">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || isLoading}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
