'use client';

// @MX:NOTE: [AUTO] ConstraintSheet — side sheet showing constraints for a specific option; SPEC-WA-001 FR-WA001-09
// @MX:SPEC: SPEC-WA-001 FR-WA001-09

import Link from 'next/link';
import { ExternalLink, Loader2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { trpc } from '@/lib/trpc/client';

interface ConstraintSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: number;
  optionDefinitionId: number;
  optionName: string;
}

export function ConstraintSheet({
  open,
  onOpenChange,
  productId,
  optionDefinitionId,
  optionName,
}: ConstraintSheetProps) {
  // Fetch constraints for this product + option definition
  const { data: constraints, isLoading } = trpc.optionConstraints.listByProduct.useQuery(
    { productId },
    { enabled: open, staleTime: 5_000 },
  );

  // Filter to constraints relevant to this option definition
  const relevantConstraints = (constraints ?? []).filter(
    (c) =>
      (c.sourceOptionId === optionDefinitionId || c.targetOptionId === optionDefinitionId) &&
      c.isActive,
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[420px] sm:max-w-[420px]">
        <SheetHeader>
          <SheetTitle>제약조건 — {optionName}</SheetTitle>
          <SheetDescription>
            이 옵션과 관련된 UI 제약조건 목록입니다.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-3 overflow-y-auto max-h-[calc(100vh-12rem)]">
          {isLoading && (
            <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">로딩 중...</span>
            </div>
          )}

          {!isLoading && relevantConstraints.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">아직 제약조건이 없습니다.</p>
              <p className="text-xs text-muted-foreground mt-1">
                아래 버튼을 눌러 제약조건 관리 페이지로 이동하세요.
              </p>
            </div>
          )}

          {!isLoading &&
            relevantConstraints.map((constraint) => (
              <div
                key={constraint.id}
                className="border rounded-md p-3 space-y-2"
              >
                {/* Constraint type badge */}
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs">
                    {constraint.constraintType}
                  </Badge>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">
                      {constraint.isActive ? '활성' : '비활성'}
                    </span>
                    <Switch
                      checked={constraint.isActive}
                      disabled
                      className="h-4 w-7"
                    />
                  </div>
                </div>

                {/* IF condition */}
                <div className="text-xs space-y-1">
                  <div className="flex items-start gap-1">
                    <span className="font-semibold text-blue-600 shrink-0">IF</span>
                    <span className="text-muted-foreground">
                      {constraint.sourceField} {constraint.operator}{' '}
                      {constraint.value ?? `[${constraint.valueMin} ~ ${constraint.valueMax}]`}
                    </span>
                  </div>
                  <div className="flex items-start gap-1">
                    <span className="font-semibold text-amber-600 shrink-0">THEN</span>
                    <span className="text-muted-foreground">
                      {constraint.targetField} → {constraint.targetAction}
                      {constraint.targetValue ? ` (${constraint.targetValue})` : ''}
                    </span>
                  </div>
                </div>

                {/* Description */}
                {constraint.description && (
                  <p className="text-xs text-muted-foreground border-t pt-2">
                    {constraint.description}
                  </p>
                )}
              </div>
            ))}
        </div>

        {/* Navigate to constraints page */}
        <div className="mt-4 pt-4 border-t">
          <Button variant="outline" className="w-full gap-2" asChild>
            <Link href={`/widget-admin/${productId}/constraints`}>
              <ExternalLink className="h-4 w-4" />
              규칙 추가 / 제약조건 관리
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
