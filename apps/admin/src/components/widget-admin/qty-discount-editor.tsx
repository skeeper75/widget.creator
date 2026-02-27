'use client';

// @MX:NOTE: [AUTO] QtyDiscountEditor — inline table editor for quantity discount tiers (discountRate stored as decimal)
// @MX:SPEC: SPEC-WA-001 FR-WA001-14

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Trash2, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { trpc } from '@/lib/trpc/client';

interface DiscountRow {
  id?: number;
  qtyMin: number;
  qtyMax: number;
  // Internal: displayed as percentage (e.g. 3.0 → stored as "0.0300")
  discountPct: string;
  discountLabel: string;
  displayOrder: number;
  isActive: boolean;
}

interface QtyDiscountEditorProps {
  productId: number;
}

export function QtyDiscountEditor({ productId }: QtyDiscountEditorProps) {
  const { data: serverRows, isLoading } = trpc.widgetAdmin.qtyDiscount.list.useQuery(
    { productId },
    { staleTime: 5_000 },
  );

  const [rows, setRows] = useState<DiscountRow[]>([]);

  useEffect(() => {
    if (serverRows) {
      setRows(
        serverRows.map((r, i) => ({
          id: r.id,
          qtyMin: r.qtyMin,
          qtyMax: r.qtyMax,
          // Convert stored decimal to display percentage
          discountPct: (parseFloat(r.discountRate) * 100).toFixed(1),
          discountLabel: r.discountLabel ?? '',
          displayOrder: r.displayOrder ?? i,
          isActive: r.isActive,
        })),
      );
    }
  }, [serverRows]);

  const upsertMutation = trpc.widgetAdmin.qtyDiscount.upsert.useMutation({
    onSuccess: ({ count }) => {
      toast.success(`${count}개 수량할인 구간이 저장되었습니다.`);
    },
    onError: (err) => {
      toast.error(`저장 실패: ${err.message}`);
    },
  });

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        qtyMin: 100,
        qtyMax: 999999,
        discountPct: '0.0',
        discountLabel: '',
        displayOrder: prev.length,
        isActive: true,
      },
    ]);
  };

  const handleDeleteRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleChange = <K extends keyof DiscountRow>(idx: number, key: K, value: DiscountRow[K]) => {
    setRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [key]: value } : row)),
    );
  };

  const handleSave = () => {
    upsertMutation.mutate({
      productId,
      rows: rows.map((r) => ({
        id: r.id,
        qtyMin: r.qtyMin,
        qtyMax: r.qtyMax,
        // Convert display percentage back to decimal string
        discountRate: (parseFloat(r.discountPct) / 100).toFixed(4),
        discountLabel: r.discountLabel || undefined,
        displayOrder: r.displayOrder,
        isActive: r.isActive,
      })),
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">수량할인 구간</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">수량할인 구간</CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleAddRow} className="gap-1">
            <Plus className="h-3.5 w-3.5" />
            행 추가
          </Button>
          <Button size="sm" onClick={handleSave} disabled={upsertMutation.isPending}>
            {upsertMutation.isPending ? '저장 중...' : '저장'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <p>할인 구간이 없습니다. &quot;행 추가&quot; 버튼으로 추가하세요.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[90px]">최소수량</TableHead>
                  <TableHead className="min-w-[90px]">최대수량</TableHead>
                  <TableHead className="min-w-[100px]">할인율 (%)</TableHead>
                  <TableHead className="min-w-[110px]">라벨</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.qtyMin}
                        onChange={(e) => handleChange(idx, 'qtyMin', parseInt(e.target.value) || 0)}
                        className="h-8 text-sm"
                        min={0}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.qtyMax}
                        onChange={(e) => handleChange(idx, 'qtyMax', parseInt(e.target.value) || 1)}
                        className="h-8 text-sm"
                        min={1}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          value={row.discountPct}
                          onChange={(e) => handleChange(idx, 'discountPct', e.target.value)}
                          className="h-8 text-sm"
                          min={0}
                          max={100}
                          step={0.1}
                        />
                        <span className="text-sm text-muted-foreground shrink-0">%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.discountLabel}
                        onChange={(e) => handleChange(idx, 'discountLabel', e.target.value)}
                        placeholder="예: 100부 이상"
                        className="h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteRow(idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
