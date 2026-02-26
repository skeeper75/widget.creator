"use client";

// @MX:NOTE: [AUTO] PublishDialog — confirmation dialog before product publish, shows completeness summary
// @MX:SPEC: SPEC-WB-005 FR-WB005-07

import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { type CompletenessItem } from "./completeness-bar";
import { cn } from "@/lib/utils";

interface PublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productName: string;
  completenessItems: CompletenessItem[];
  publishable: boolean;
  onConfirm: () => void;
  isPending: boolean;
}

// @MX:ANCHOR: [AUTO] PublishDialog — guards the publish action; called from publish page and wizard
// @MX:REASON: fan_in >= 3: publish page, wizard summary step, unpublish confirmation reuse pattern
// @MX:SPEC: SPEC-WB-005 FR-WB005-07
export function PublishDialog({
  open,
  onOpenChange,
  productName,
  completenessItems,
  publishable,
  onConfirm,
  isPending,
}: PublishDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>상품 발행 확인</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{productName}</span>{" "}
            상품을 고객 주문 화면에 노출합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <p className="text-sm font-medium">완성도 체크리스트</p>
          <div className="space-y-2">
            {completenessItems.map((item) => (
              <div
                key={item.key}
                className={cn(
                  "flex items-start gap-2 p-2 rounded border text-sm",
                  item.completed
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                )}
              >
                {item.completed ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p
                    className={cn(
                      "font-medium",
                      item.completed ? "text-green-800" : "text-red-800"
                    )}
                  >
                    {item.label}
                  </p>
                  {item.detail && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.detail}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {!publishable && (
            <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
              <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" />
              <span className="text-yellow-800">
                미완료 항목이 있어 발행할 수 없습니다. 모든 항목을 완료한 후
                다시 시도하세요.
              </span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            취소
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!publishable || isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {isPending ? "발행 중..." : "발행 확인"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
