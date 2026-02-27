'use client';

// @MX:NOTE: [AUTO] Shared NL input panel for GLM-powered rule creation; used in Step 3 (pricing) and Step 4 (constraints)
// @MX:SPEC: SPEC-WB-007 FR-WB007-05

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

export type NlPanelMode = 'constraint' | 'price_rule' | 'option_suggest';

export interface NlRulePanelProps {
  mode: NlPanelMode;
  recipeId?: number;
  productId?: number;
  onConvert?: (result: unknown) => void;
}

const EXAMPLES: Record<NlPanelMode, string[]> = {
  constraint: [
    '투명PVC 선택하면 PP코팅 못 쓰게 해줘',
    '박가공 선택하면 동판비 자동으로 추가해줘',
    '중철제본이면 페이지수를 4의 배수로만 선택 가능하게',
  ],
  price_rule: [
    '100장 이상 5% 할인',
    '100장 5%, 500장 10%, 1000장 이상 15%',
    '현수막은 가로×세로 크기로 가격 계산',
  ],
  option_suggest: [
    '명함 기본 용지: 아트지, 스노우지, 크라프트지',
    '봉투 기본 옵션: 단면칼라, 단면흑백, 양면칼라',
  ],
};

const MODE_LABELS: Record<NlPanelMode, string> = {
  constraint: '제약조건',
  price_rule: '가격룰',
  option_suggest: '옵션값',
};

export function NlRulePanel({ mode, recipeId, productId, onConvert }: NlRulePanelProps) {
  const [nlText, setNlText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExampleClick = (example: string) => {
    setNlText(example);
    setError(null);
  };

  const handleConvert = async () => {
    if (!nlText.trim() || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      onConvert?.({ nlText, mode, recipeId, productId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'GLM 변환 중 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
          AI 자연어 {MODE_LABELS[mode]} 입력
        </span>
        <Badge variant="secondary" className="text-xs">GLM</Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {EXAMPLES[mode].map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => handleExampleClick(example)}
            className="text-xs px-2 py-1 rounded-full bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-colors cursor-pointer"
          >
            {example}
          </button>
        ))}
      </div>

      <Textarea
        value={nlText}
        onChange={(e) => setNlText(e.target.value)}
        placeholder={`자연어로 ${MODE_LABELS[mode]}을 설명해주세요...`}
        className="min-h-[80px] resize-none bg-white dark:bg-gray-900"
        disabled={isLoading}
      />

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <Button
        type="button"
        onClick={() => void handleConvert()}
        disabled={!nlText.trim() || isLoading}
        size="sm"
        className="bg-purple-600 hover:bg-purple-700 text-white"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            GLM 변환 중...
          </>
        ) : (
          'GLM 변환 실행'
        )}
      </Button>
    </div>
  );
}
