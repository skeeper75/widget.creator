// @MX:NOTE: [AUTO] React hook wrapping tRPC GLM mutation endpoints for NL rule conversion
// @MX:SPEC: SPEC-WB-007 FR-WB007-02 FR-WB007-03
'use client';

import { useState } from 'react';
import { trpc } from '@/lib/trpc/client';
import type { ConversionResult } from '@/components/glm/conversion-preview';

export function useGlmConvert() {
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const convertConstraintMutation = trpc.glm.convertConstraint.useMutation({
    onSuccess: (data) => {
      setResult(data.data as ConversionResult);
      setError(null);
    },
    onError: (err) => {
      setError(err.message);
      setResult(null);
    },
  });

  const confirmConstraintMutation = trpc.glm.confirmConstraint.useMutation({
    onError: (err) => setError(err.message),
  });

  const convertPriceRuleMutation = trpc.glm.convertPriceRule.useMutation({
    onSuccess: (data) => {
      setResult(data.data as ConversionResult);
      setError(null);
    },
    onError: (err) => {
      setError(err.message);
      setResult(null);
    },
  });

  const confirmPriceRuleMutation = trpc.glm.confirmPriceRule.useMutation({
    onError: (err) => setError(err.message),
  });

  const convertConstraint = (input: {
    productId: number;
    nlText: string;
    availableOptions?: string[];
  }) => {
    setError(null);
    return convertConstraintMutation.mutateAsync(input);
  };

  const confirmConstraint = (input: {
    productId: number;
    nlText: string;
    glmOutput: unknown;
  }) => {
    return confirmConstraintMutation.mutateAsync(input);
  };

  const convertPriceRule = (input: {
    productId: number;
    nlText: string;
    ruleType: 'qty_discount' | 'price_mode' | 'postprocess' | 'formula_hint';
  }) => {
    setError(null);
    return convertPriceRuleMutation.mutateAsync(input);
  };

  const confirmPriceRule = (input: {
    productId: number;
    priceConfigId?: number;
    nlText: string;
    ruleType: 'qty_discount' | 'price_mode' | 'postprocess' | 'formula_hint';
    glmOutput: unknown;
  }) => {
    return confirmPriceRuleMutation.mutateAsync(input);
  };

  const clearResult = () => {
    setResult(null);
    setError(null);
  };

  return {
    result,
    error,
    isConverting:
      convertConstraintMutation.isPending || convertPriceRuleMutation.isPending,
    isConfirming:
      confirmConstraintMutation.isPending || confirmPriceRuleMutation.isPending,
    convertConstraint,
    confirmConstraint,
    convertPriceRule,
    confirmPriceRule,
    clearResult,
  };
}
