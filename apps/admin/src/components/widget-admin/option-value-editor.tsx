'use client';

// @MX:NOTE: [AUTO] OptionValueEditor — inline choice editing for a product option; SPEC-WA-001 FR-WA001-07
// @MX:SPEC: SPEC-WA-001 FR-WA001-07

import { useState } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc/client';

interface OptionValueEditorProps {
  productOptionId: number;
  optionDefinitionId: number;
}

export function OptionValueEditor({ productOptionId, optionDefinitionId }: OptionValueEditorProps) {
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');

  const utils = trpc.useUtils();

  // Fetch current choices for this option definition
  const { data: choices, isLoading } = trpc.optionChoices.listByDefinition.useQuery(
    { optionDefinitionId },
    { staleTime: 5_000 },
  );

  const updateMutation = trpc.widgetAdmin.productOptions.updateValues.useMutation({
    onSuccess: () => {
      toast.success('옵션값이 업데이트되었습니다.');
      void utils.optionChoices.listByDefinition.invalidate({ optionDefinitionId });
      setNewCode('');
      setNewName('');
    },
    onError: (err) => {
      toast.error(`업데이트 실패: ${err.message}`);
    },
  });

  const handleAddChoice = () => {
    const code = newCode.trim();
    const name = newName.trim();
    if (!code || !name) {
      toast.error('코드와 이름을 모두 입력해주세요.');
      return;
    }

    updateMutation.mutate({
      productOptionId,
      values: {
        add: [{ code, name }],
      },
    });
  };

  const handleRemoveChoice = (choiceId: number) => {
    updateMutation.mutate({
      productOptionId,
      values: {
        remove: [choiceId],
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        선택지 로딩 중...
      </div>
    );
  }

  const activeChoices = (choices ?? []).filter((c) => c.isActive);

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        선택지 관리
      </p>

      {/* Existing choices as removable chips */}
      {activeChoices.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {activeChoices.map((choice) => (
            <span
              key={choice.id}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-secondary text-secondary-foreground rounded-full text-xs"
            >
              <span className="font-mono text-[10px] text-muted-foreground">{choice.code}</span>
              <span>{choice.name}</span>
              <button
                className="ml-0.5 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => handleRemoveChoice(choice.id)}
                disabled={updateMutation.isPending}
                aria-label={`${choice.name} 제거`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">선택지가 없습니다.</p>
      )}

      {/* Add new choice */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="코드 (예: ART100)"
          value={newCode}
          onChange={(e) => setNewCode(e.target.value)}
          className="h-8 text-xs w-28"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddChoice();
          }}
        />
        <Input
          placeholder="이름 (예: 아트지 100g)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="h-8 text-xs flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddChoice();
          }}
        />
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1 text-xs"
          onClick={handleAddChoice}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Plus className="h-3 w-3" />
          )}
          추가
        </Button>
      </div>
    </div>
  );
}
