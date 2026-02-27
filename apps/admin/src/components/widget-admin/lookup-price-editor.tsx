'use client';

// @MX:NOTE: [AUTO] LookupPriceEditor — inline table editor for LOOKUP mode print cost base (plateType × printMode × qty tier)
// @MX:SPEC: SPEC-WA-001 FR-WA001-11

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

interface LookupRow {
  id?: number;
  plateType: string;
  printMode: string;
  qtyMin: number;
  qtyMax: number;
  unitPrice: string;
}

interface LookupPriceEditorProps {
  productId: number;
}

export function LookupPriceEditor({ productId }: LookupPriceEditorProps) {
  const { data: serverRows, isLoading } = trpc.widgetAdmin.printCostBase.list.useQuery(
    { productId },
    { staleTime: 5_000 },
  );

  const [rows, setRows] = useState<LookupRow[]>([]);

  useEffect(() => {
    if (serverRows) {
      setRows(
        serverRows.map((r) => ({
          id: r.id,
          plateType: r.plateType,
          printMode: r.printMode,
          qtyMin: r.qtyMin,
          qtyMax: r.qtyMax,
          unitPrice: r.unitPrice,
        })),
      );
    }
  }, [serverRows]);

  const upsertMutation = trpc.widgetAdmin.printCostBase.upsert.useMutation({
    onSuccess: ({ count }) => {
      toast.success(`${count}개 행이 저장되었습니다.`);
    },
    onError: (err) => {
      toast.error(`저장 실패: ${err.message}`);
    },
  });

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      { plateType: '', printMode: '', qtyMin: 1, qtyMax: 999999, unitPrice: '0' },
    ]);
  };

  const handleDeleteRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleChange = <K extends keyof LookupRow>(idx: number, key: K, value: LookupRow[K]) => {
    setRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [key]: value } : row)),
    );
  };

  const handleSave = () => {
    upsertMutation.mutate({ productId, rows });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">단가표 (LOOKUP)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">단가표 (LOOKUP)</CardTitle>
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
          <div className="text-center py-8 text-muted-foreground text-sm">
            <p>단가 행이 없습니다. &quot;행 추가&quot; 버튼으로 추가하세요.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[100px]">판형</TableHead>
                  <TableHead className="min-w-[120px]">인쇄방식</TableHead>
                  <TableHead className="min-w-[90px]">최소수량</TableHead>
                  <TableHead className="min-w-[90px]">최대수량</TableHead>
                  <TableHead className="min-w-[110px]">단가(원)</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Input
                        value={row.plateType}
                        onChange={(e) => handleChange(idx, 'plateType', e.target.value)}
                        placeholder="예: 90x50"
                        className="h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.printMode}
                        onChange={(e) => handleChange(idx, 'printMode', e.target.value)}
                        placeholder="예: 단면칼라"
                        className="h-8 text-sm"
                      />
                    </TableCell>
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
                      <Input
                        value={row.unitPrice}
                        onChange={(e) => handleChange(idx, 'unitPrice', e.target.value)}
                        placeholder="0"
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
