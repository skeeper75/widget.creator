'use client';

// @MX:NOTE: [AUTO] PostprocessCostEditor — inline table editor for post-processing costs (fixed/per_unit/per_sqm pricing)
// @MX:SPEC: SPEC-WA-001 FR-WA001-13

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Trash2, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { trpc } from '@/lib/trpc/client';

type PriceType = 'fixed' | 'per_unit' | 'per_sqm';

interface PostprocessRow {
  id?: number;
  processCode: string;
  processNameKo: string;
  qtyMin: number;
  qtyMax: number;
  unitPrice: string;
  priceType: PriceType;
  isActive: boolean;
}

const PRICE_TYPE_LABELS: Record<PriceType, string> = {
  fixed: '고정',
  per_unit: '매당',
  per_sqm: 'sqm당',
};

interface PostprocessCostEditorProps {
  productId: number;
}

export function PostprocessCostEditor({ productId }: PostprocessCostEditorProps) {
  const { data: serverRows, isLoading } = trpc.widgetAdmin.postprocessCost.list.useQuery(
    { productId },
    { staleTime: 5_000 },
  );

  const [rows, setRows] = useState<PostprocessRow[]>([]);

  useEffect(() => {
    if (serverRows) {
      setRows(
        serverRows.map((r) => ({
          id: r.id,
          processCode: r.processCode,
          processNameKo: r.processNameKo,
          qtyMin: r.qtyMin ?? 0,
          qtyMax: r.qtyMax ?? 999999,
          unitPrice: r.unitPrice,
          priceType: (r.priceType as PriceType) ?? 'fixed',
          isActive: r.isActive,
        })),
      );
    }
  }, [serverRows]);

  const upsertMutation = trpc.widgetAdmin.postprocessCost.upsert.useMutation({
    onSuccess: ({ count }) => {
      toast.success(`${count}개 후가공 행이 저장되었습니다.`);
    },
    onError: (err) => {
      toast.error(`저장 실패: ${err.message}`);
    },
  });

  const handleAddRow = () => {
    setRows((prev) => [
      ...prev,
      {
        processCode: '',
        processNameKo: '',
        qtyMin: 0,
        qtyMax: 999999,
        unitPrice: '0',
        priceType: 'fixed',
        isActive: true,
      },
    ]);
  };

  const handleDeleteRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleChange = <K extends keyof PostprocessRow>(idx: number, key: K, value: PostprocessRow[K]) => {
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
          <CardTitle className="text-base">후가공비</CardTitle>
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
        <CardTitle className="text-base">후가공비</CardTitle>
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
            <p>후가공비 항목이 없습니다. &quot;행 추가&quot; 버튼으로 추가하세요.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[90px]">코드</TableHead>
                  <TableHead className="min-w-[100px]">이름</TableHead>
                  <TableHead className="min-w-[80px]">최소수량</TableHead>
                  <TableHead className="min-w-[80px]">최대수량</TableHead>
                  <TableHead className="min-w-[90px]">단가</TableHead>
                  <TableHead className="min-w-[90px]">유형</TableHead>
                  <TableHead className="w-14 text-center">활성</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Input
                        value={row.processCode}
                        onChange={(e) => handleChange(idx, 'processCode', e.target.value)}
                        placeholder="예: LAMINATE"
                        className="h-8 text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.processNameKo}
                        onChange={(e) => handleChange(idx, 'processNameKo', e.target.value)}
                        placeholder="예: 라미네이팅"
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
                      <Select
                        value={row.priceType}
                        onValueChange={(val) => handleChange(idx, 'priceType', val as PriceType)}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(Object.keys(PRICE_TYPE_LABELS) as PriceType[]).map((type) => (
                            <SelectItem key={type} value={type}>
                              {PRICE_TYPE_LABELS[type]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={row.isActive}
                        onCheckedChange={(checked) => handleChange(idx, 'isActive', checked)}
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
