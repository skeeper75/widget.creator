"use client";

// @MX:NOTE: [AUTO] Simulation Page — Step 5 of admin wizard; runs bulk option-combination validation
// @MX:SPEC: SPEC-WB-005 FR-WB005-03, FR-WB005-04, FR-WB005-05, FR-WB005-06

import { useCallback, useEffect, useState } from "react";
import { use } from "react";
import { toast } from "sonner";
import { Play, Download, AlertTriangle, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc/client";
import {
  SimulationProgress,
  type SimulationRunStatus,
} from "@/components/widget-admin/simulation-progress";
import {
  SimulationResultsTable,
  type SimulationCaseRow,
} from "@/components/widget-admin/simulation-results-table";

const PAGE_SIZE = 20;
const POLL_INTERVAL_MS = 2000;

// @MX:WARN: [AUTO] Polling via refetchInterval — must be disabled when run is no longer 'running'
// @MX:REASON: Leaving polling active on completed run wastes server resources
// @MX:SPEC: SPEC-WB-005 FR-WB005-03

interface PageProps {
  params: Promise<{ productId: string }>;
}

// tooLarge is surfaced via PRECONDITION_FAILED error; parse totalCases from error message
function parseTotalCasesFromError(message: string): number {
  const match = /\(([0-9,]+)\)/.exec(message);
  if (match) return parseInt(match[1].replace(/,/g, ""), 10);
  return 0;
}

export default function SimulatePage({ params }: PageProps) {
  const { productId: productIdStr } = use(params);
  const productId = parseInt(productIdStr, 10);

  const [activeRunId, setActiveRunId] = useState<number | null>(null);
  const [showSamplingDialog, setShowSamplingDialog] = useState(false);
  const [pendingTotalCases, setPendingTotalCases] = useState(0);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "pass" | "warn" | "error"
  >("all");
  const [casesPage, setCasesPage] = useState(1);
  const [singleSelections, setSingleSelections] = useState<
    Record<string, string>
  >({});
  const [singleResult, setSingleResult] = useState<{
    resultStatus: "pass" | "warn" | "error";
    totalPrice: number | null;
    message: string | null;
  } | null>(null);

  const utils = trpc.useUtils();

  // simulationStatus polling — enabled only when there is an active run
  const statusQuery = trpc.widgetAdmin.simulationStatus.useQuery(
    { runId: activeRunId ?? 0 },
    {
      enabled: activeRunId !== null,
      refetchInterval: (query) => {
        const data = query.state.data as SimulationRunStatus | undefined;
        if (!data) return POLL_INTERVAL_MS;
        return data.status === "running" ? POLL_INTERVAL_MS : false;
      },
    }
  );

  const runStatus = statusQuery.data as SimulationRunStatus | undefined;

  // Cases query — only when run is completed
  // simulationCases returns { data, total, page, pageSize }
  const casesQuery = trpc.widgetAdmin.simulationCases.useQuery(
    {
      runId: activeRunId ?? 0,
      page: casesPage,
      pageSize: PAGE_SIZE,
      statusFilter:
        statusFilter === "all"
          ? undefined
          : (statusFilter as "pass" | "warn" | "error"),
    },
    {
      enabled: activeRunId !== null && runStatus?.status === "completed",
    }
  );

  const casesData = casesQuery.data;
  const cases: SimulationCaseRow[] = (casesData?.data ?? []).map((c) => ({
    id: c.id,
    selections: c.selections as Record<string, string>,
    resultStatus: c.resultStatus as "pass" | "warn" | "error",
    totalPrice: c.totalPrice != null ? Number(c.totalPrice) : null,
    message: c.message,
  }));
  const casesTotalCount: number = casesData?.total ?? 0;

  // Start simulation — tooLarge throws PRECONDITION_FAILED, handled in onError
  const startMutation = trpc.widgetAdmin.startSimulation.useMutation({
    onSuccess: (data) => {
      setActiveRunId(data.runId);
      toast.success("시뮬레이션이 시작되었습니다.");
    },
    onError: (err) => {
      if (err.data?.code === "PRECONDITION_FAILED") {
        const total = parseTotalCasesFromError(err.message);
        setPendingTotalCases(total);
        setShowSamplingDialog(true);
      } else {
        toast.error(`시뮬레이션 시작 실패: ${err.message}`);
      }
    },
  });

  // Re-used for sample=true and forceRun=true variants
  const startWithOptionsMutation = trpc.widgetAdmin.startSimulation.useMutation({
    onSuccess: (data) => {
      setActiveRunId(data.runId);
      setShowSamplingDialog(false);
      toast.success("시뮬레이션이 시작되었습니다.");
    },
    onError: (err) => {
      toast.error(`시뮬레이션 시작 실패: ${err.message}`);
    },
  });

  const handleStartSimulation = useCallback(() => {
    startMutation.mutate({ productId });
  }, [productId, startMutation]);

  const handleConfirmSampling = useCallback(() => {
    startWithOptionsMutation.mutate({ productId, sample: true });
  }, [productId, startWithOptionsMutation]);

  const handleForceRun = useCallback(() => {
    startWithOptionsMutation.mutate({ productId, forceRun: true });
    setShowSamplingDialog(false);
  }, [productId, startWithOptionsMutation]);

  // Export CSV — use utils.fetch to call a query imperatively
  const handleExportCSV = useCallback(async () => {
    if (!activeRunId) return;
    try {
      const result = await utils.widgetAdmin.exportSimulation.fetch({
        runId: activeRunId,
      });
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `simulation-${activeRunId}-${Date.now()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("CSV 내보내기 실패");
    }
  }, [activeRunId]);

  // Single test
  const singleTestMutation = trpc.widgetAdmin.singleTest.useMutation({
    onSuccess: (data) => {
      setSingleResult({
        resultStatus: data.resultStatus,
        totalPrice: data.totalPrice,
        message: data.message,
      });
    },
    onError: (err) => {
      toast.error(`단일 테스트 실패: ${err.message}`);
    },
  });

  // Reset cases page when filter changes
  useEffect(() => {
    setCasesPage(1);
  }, [statusFilter]);

  const isStarting =
    startMutation.isPending || startWithOptionsMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            자동견적 시뮬레이션
          </h1>
          <p className="text-muted-foreground">상품 ID: {productId}</p>
        </div>
        <div className="flex items-center gap-2">
          {activeRunId && runStatus?.status === "completed" && (
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-1" />
              CSV 다운로드
            </Button>
          )}
          <Button
            onClick={handleStartSimulation}
            disabled={isStarting || runStatus?.status === "running"}
          >
            <Play className="h-4 w-4 mr-1" />
            {isStarting ? "시작 중..." : "시뮬레이션 실행"}
          </Button>
        </div>
      </div>

      {/* Progress */}
      {activeRunId && runStatus && <SimulationProgress run={runStatus} />}

      {/* Results table — show when completed */}
      {activeRunId && runStatus?.status === "completed" && (
        <div>
          <h2 className="text-lg font-semibold mb-3">시뮬레이션 결과</h2>
          <SimulationResultsTable
            cases={cases}
            isLoading={casesQuery.isFetching}
            totalCount={casesTotalCount}
            page={casesPage}
            pageSize={PAGE_SIZE}
            statusFilter={statusFilter}
            onPageChange={setCasesPage}
            onStatusFilterChange={setStatusFilter}
          />
        </div>
      )}

      {/* Single case test section */}
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4" />
          <h2 className="text-base font-semibold">단일 케이스 테스트</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          특정 옵션 조합을 직접 지정하여 제약조건 평가와 가격 계산 결과를
          확인합니다.
        </p>

        {/* Raw JSON input for selections */}
        <div className="space-y-1">
          <label className="text-sm font-medium" htmlFor="single-selections">
            옵션 조합 (JSON)
          </label>
          <textarea
            id="single-selections"
            className="w-full h-20 px-3 py-2 text-sm font-mono border rounded bg-muted/30 resize-none"
            placeholder='{"SIZE": "90x50mm", "PAPER": "아트지"}'
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value) as Record<
                  string,
                  string
                >;
                setSingleSelections(parsed);
              } catch {
                // invalid JSON — ignore until valid
              }
            }}
          />
        </div>

        <Button
          size="sm"
          disabled={
            singleTestMutation.isPending ||
            Object.keys(singleSelections).length === 0
          }
          onClick={() =>
            singleTestMutation.mutate({
              productId,
              selections: singleSelections,
            })
          }
        >
          테스트 실행
        </Button>

        {singleResult && (
          <div className="mt-3 p-3 border rounded bg-muted/30 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">결과:</span>
              <span
                className={
                  singleResult.resultStatus === "pass"
                    ? "text-green-600 font-semibold"
                    : singleResult.resultStatus === "warn"
                      ? "text-yellow-600 font-semibold"
                      : "text-red-600 font-semibold"
                }
              >
                {singleResult.resultStatus === "pass"
                  ? "통과"
                  : singleResult.resultStatus === "warn"
                    ? "경고"
                    : "오류"}
              </span>
            </div>
            {singleResult.totalPrice != null && (
              <p className="text-sm">
                견적가:{" "}
                <span className="font-mono font-medium">
                  {Number(singleResult.totalPrice).toLocaleString()}원
                </span>
              </p>
            )}
            {singleResult.message && (
              <p className="text-sm text-muted-foreground">
                {singleResult.message}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Sampling warning dialog */}
      <Dialog open={showSamplingDialog} onOpenChange={setShowSamplingDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              조합 수 초과 경고
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm">
              총{" "}
              <span className="font-bold text-orange-600">
                {pendingTotalCases > 0
                  ? pendingTotalCases.toLocaleString()
                  : "10,000"}
                개 이상
              </span>
              의 옵션 조합이 생성됩니다. 전체 실행에 시간이 오래 걸릴 수
              있습니다.
            </p>
            <p className="text-sm text-muted-foreground">
              샘플링을 선택하면 최대 10,000개를 무작위로 추출하여 빠르게
              검증합니다.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowSamplingDialog(false)}
            >
              취소
            </Button>
            <Button
              variant="outline"
              onClick={handleConfirmSampling}
              disabled={startWithOptionsMutation.isPending}
            >
              샘플링 실행 (최대 10,000건)
            </Button>
            <Button
              onClick={handleForceRun}
              disabled={startWithOptionsMutation.isPending}
            >
              전체 실행
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
