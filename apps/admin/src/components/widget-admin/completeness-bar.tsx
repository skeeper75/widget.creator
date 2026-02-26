"use client";

// @MX:NOTE: [AUTO] CompletenessBar — visual indicator for the 4-item product completeness checklist
// @MX:SPEC: SPEC-WB-005 FR-WB005-01, FR-WB005-02

import { cn } from "@/lib/utils";

export interface CompletenessItem {
  key: "options" | "pricing" | "constraints" | "mesMapping";
  label: string;
  completed: boolean;
  detail?: string;
}

interface CompletenessBarProps {
  items: CompletenessItem[];
  completedCount: number;
  totalCount: number;
  className?: string;
}

// @MX:ANCHOR: [AUTO] CompletenessBar — rendered on every row of the dashboard DataTable (fan_in >= 3)
// @MX:REASON: Called from dashboard page row, publish page, and completeness detail panel
// @MX:SPEC: SPEC-WB-005 FR-WB005-01
export function CompletenessBar({
  items,
  completedCount,
  totalCount,
  className,
}: CompletenessBarProps) {
  const percentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-center gap-1">
        {items.map((item) => (
          <div
            key={item.key}
            title={`${item.label}: ${item.completed ? "완료" : "미완료"}${item.detail ? ` — ${item.detail}` : ""}`}
            className={cn(
              "h-2 flex-1 rounded-sm transition-colors",
              item.completed ? "bg-green-500" : "bg-gray-200"
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {completedCount}/{totalCount} 완료
        {percentage === 100 && (
          <span className="ml-1 text-green-600 font-medium">• 발행 가능</span>
        )}
      </p>
    </div>
  );
}

export const COMPLETENESS_ITEM_LABELS: Record<CompletenessItem["key"], string> =
  {
    options: "주문옵션",
    pricing: "가격 계산식",
    constraints: "제약조건",
    mesMapping: "MES 매핑",
  };
