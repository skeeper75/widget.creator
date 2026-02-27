"use client";

// @MX:NOTE: [AUTO] SimulationProgress — real-time progress display during bulk simulation run
// @MX:SPEC: SPEC-WB-005 FR-WB005-03

import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SimulationRunStatus {
  id: number;
  status: "running" | "completed" | "failed" | "cancelled";
  totalCases: number;
  passedCount: number;
  warnedCount: number;
  erroredCount: number;
  startedAt: string;
  completedAt?: string;
}

interface SimulationProgressProps {
  run: SimulationRunStatus;
  className?: string;
}

function formatDuration(startedAt: string, completedAt?: string): string {
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const seconds = Math.floor((end - start) / 1000);
  if (seconds < 60) return `${seconds}초`;
  return `${Math.floor(seconds / 60)}분 ${seconds % 60}초`;
}

export function SimulationProgress({ run, className }: SimulationProgressProps) {
  const processedCount = run.passedCount + run.warnedCount + run.erroredCount;
  const progressPercent =
    run.totalCases > 0 ? (processedCount / run.totalCases) * 100 : 0;
  const isRunning = run.status === "running";
  const isCompleted = run.status === "completed";
  const isFailed = run.status === "failed";

  return (
    <div className={cn("space-y-4 p-4 border rounded-lg", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isRunning && (
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          )}
          {isCompleted && (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )}
          {isFailed && <XCircle className="h-4 w-4 text-red-500" />}
          <span className="font-medium text-sm">
            {isRunning && "시뮬레이션 실행 중..."}
            {isCompleted && "시뮬레이션 완료"}
            {isFailed && "시뮬레이션 실패"}
            {run.status === "cancelled" && "시뮬레이션 취소됨"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            소요 시간: {formatDuration(run.startedAt, run.completedAt)}
          </span>
          {isRunning && (
            <Badge variant="outline" className="text-blue-600 border-blue-300">
              {Math.round(progressPercent)}%
            </Badge>
          )}
        </div>
      </div>

      <Progress value={progressPercent} className="h-2" />

      <div className="grid grid-cols-4 gap-3 text-center">
        <div className="space-y-1">
          <p className="text-2xl font-bold">{run.totalCases.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">전체 케이스</p>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold text-green-600">
            {run.passedCount.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">
            통과
            {isCompleted && run.totalCases > 0 && (
              <span className="ml-1">
                ({Math.round((run.passedCount / run.totalCases) * 100)}%)
              </span>
            )}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold text-yellow-600">
            {run.warnedCount.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">
            경고
            {isCompleted && run.totalCases > 0 && (
              <span className="ml-1">
                ({Math.round((run.warnedCount / run.totalCases) * 100)}%)
              </span>
            )}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-2xl font-bold text-red-600">
            {run.erroredCount.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">
            오류
            {isCompleted && run.totalCases > 0 && (
              <span className="ml-1">
                ({Math.round((run.erroredCount / run.totalCases) * 100)}%)
              </span>
            )}
          </p>
        </div>
      </div>

      {isCompleted && run.warnedCount + run.erroredCount > 0 && (
        <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
          <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" />
          <span className="text-yellow-800">
            {run.erroredCount > 0 &&
              `${run.erroredCount.toLocaleString()}개 오류 케이스가 발견되었습니다. `}
            {run.warnedCount > 0 &&
              `${run.warnedCount.toLocaleString()}개 경고 케이스를 확인하세요.`}
          </span>
        </div>
      )}

      {isCompleted &&
        run.erroredCount === 0 &&
        run.warnedCount === 0 &&
        run.passedCount > 0 && (
          <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            <span className="text-green-800">
              모든 케이스가 정상입니다. 상품을 발행할 수 있습니다.
            </span>
          </div>
        )}
    </div>
  );
}
