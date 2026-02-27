'use client';

// @MX:NOTE: [AUTO] OptionAddDialog — dialog to add global option definitions to a product; SPEC-WA-001 FR-WA001-08
// @MX:SPEC: SPEC-WA-001 FR-WA001-08

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc/client';

interface OptionAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: number;
  alreadyAddedDefinitionIds: number[];
}

export function OptionAddDialog({
  open,
  onOpenChange,
  productId,
  alreadyAddedDefinitionIds,
}: OptionAddDialogProps) {
  const [selectedDefinitionId, setSelectedDefinitionId] = useState<number | null>(null);

  const utils = trpc.useUtils();

  // Fetch all global option definitions
  const { data: definitions, isLoading } = trpc.widgetAdmin.optionDefs.list.useQuery(
    undefined,
    { enabled: open, staleTime: 10_000 },
  );

  const addMutation = trpc.widgetAdmin.productOptions.addToProduct.useMutation({
    onSuccess: () => {
      toast.success('옵션이 추가되었습니다.');
      void utils.widgetAdmin.productOptions.list.invalidate({ productId });
      onOpenChange(false);
      setSelectedDefinitionId(null);
    },
    onError: (err) => {
      toast.error(`옵션 추가 실패: ${err.message}`);
    },
  });

  const handleConfirm = () => {
    if (!selectedDefinitionId) return;
    addMutation.mutate({ productId, optionDefinitionId: selectedDefinitionId });
  };

  const handleClose = () => {
    if (addMutation.isPending) return;
    onOpenChange(false);
    setSelectedDefinitionId(null);
  };

  const alreadyAddedSet = new Set(alreadyAddedDefinitionIds);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>옵션 추가</DialogTitle>
          <DialogDescription>
            전역 옵션 라이브러리에서 상품에 추가할 옵션을 선택하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1 max-h-72 overflow-y-auto py-1 -mx-1 px-1">
          {isLoading && (
            <div className="flex items-center justify-center py-6 text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">옵션 목록 로딩 중...</span>
            </div>
          )}

          {!isLoading && definitions?.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-6">
              사용 가능한 옵션 정의가 없습니다.
            </p>
          )}

          {!isLoading &&
            definitions?.map((def) => {
              const isAlreadyAdded = alreadyAddedSet.has(def.id);
              const isSelected = selectedDefinitionId === def.id;

              return (
                <button
                  key={def.id}
                  className={[
                    'w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors',
                    isAlreadyAdded
                      ? 'opacity-50 cursor-not-allowed bg-muted'
                      : isSelected
                        ? 'bg-primary/10 border border-primary'
                        : 'hover:bg-accent border border-transparent',
                  ].join(' ')}
                  onClick={() => {
                    if (!isAlreadyAdded) {
                      setSelectedDefinitionId(isSelected ? null : def.id);
                    }
                  }}
                  disabled={isAlreadyAdded}
                  aria-pressed={isSelected}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{def.name}</span>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px]">
                        {def.optionClass}
                      </Badge>
                      {isAlreadyAdded && (
                        <Badge variant="secondary" className="text-[10px]">
                          추가됨
                        </Badge>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{def.key}</p>
                </button>
              );
            })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={addMutation.isPending}>
            취소
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedDefinitionId || addMutation.isPending}
          >
            {addMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                추가 중...
              </>
            ) : (
              '옵션 추가'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
