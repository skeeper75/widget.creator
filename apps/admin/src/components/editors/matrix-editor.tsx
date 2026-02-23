"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export interface Paper {
  id: number;
  code: string;
  name: string;
  weight: number | null;
}

export interface Product {
  id: number;
  name: string;
  categoryId: number;
}

export interface Category {
  id: number;
  name: string;
}

export interface PaperProductMapping {
  id: number;
  paperId: number;
  productId: number;
  coverType: string | null;
  isActive: boolean;
}

export interface MatrixEditorProps {
  rows: Paper[];
  columns: Product[];
  categories: Category[];
  mappings: PaperProductMapping[];
  coverType: "body" | "cover";
  onCoverTypeChange: (type: "body" | "cover") => void;
  onToggle: (paperId: number, productId: number, active: boolean) => void;
  isLoading?: boolean;
}

interface GroupedProducts {
  category: Category;
  products: Product[];
}

function groupProductsByCategory(
  products: Product[],
  categories: Category[]
): GroupedProducts[] {
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const groups = new Map<number, GroupedProducts>();

  for (const product of products) {
    const cat = catMap.get(product.categoryId);
    if (!cat) continue;
    if (!groups.has(cat.id)) {
      groups.set(cat.id, { category: cat, products: [] });
    }
    groups.get(cat.id)!.products.push(product);
  }

  return Array.from(groups.values());
}

export function MatrixEditor({
  rows,
  columns: products,
  categories,
  mappings,
  coverType,
  onCoverTypeChange,
  onToggle,
  isLoading = false,
}: MatrixEditorProps) {
  const [rowFilter, setRowFilter] = useState("");
  const [colFilter, setColFilter] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Build a lookup set for quick mapping checks
  const mappingSet = useMemo(() => {
    const set = new Set<string>();
    for (const m of mappings) {
      if (m.isActive) {
        set.add(`${m.paperId}-${m.productId}`);
      }
    }
    return set;
  }, [mappings]);

  const isMapped = useCallback(
    (paperId: number, productId: number) =>
      mappingSet.has(`${paperId}-${productId}`),
    [mappingSet]
  );

  // Filter rows
  const filteredRows = useMemo(
    () =>
      rows.filter(
        (r) =>
          !rowFilter ||
          r.name.toLowerCase().includes(rowFilter.toLowerCase()) ||
          r.code.toLowerCase().includes(rowFilter.toLowerCase())
      ),
    [rows, rowFilter]
  );

  // Filter and group products
  const filteredProducts = useMemo(
    () =>
      products.filter(
        (p) =>
          !colFilter ||
          p.name.toLowerCase().includes(colFilter.toLowerCase())
      ),
    [products, colFilter]
  );

  const groupedProducts = useMemo(
    () => groupProductsByCategory(filteredProducts, categories),
    [filteredProducts, categories]
  );

  // Total columns count
  const totalCols = filteredProducts.length;

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-4">
        <Select
          value={coverType}
          onValueChange={(v) => onCoverTypeChange(v as "body" | "cover")}
        >
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="body">Body (inner)</SelectItem>
            <SelectItem value="cover">Cover</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Filter papers..."
          value={rowFilter}
          onChange={(e) => setRowFilter(e.target.value)}
          className="w-48"
        />

        <Input
          placeholder="Filter products..."
          value={colFilter}
          onChange={(e) => setColFilter(e.target.value)}
          className="w-48"
        />

        <div className="text-sm text-muted-foreground ml-auto">
          {filteredRows.length} papers x {totalCols} products |{" "}
          {mappings.filter((m) => m.isActive).length} active mappings
        </div>
      </div>

      {/* Matrix Grid */}
      <div
        ref={scrollRef}
        className="overflow-auto border rounded-md max-h-[600px]"
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: `180px repeat(${totalCols}, 40px)`,
            minWidth: `${180 + totalCols * 40}px`,
          }}
        >
          {/* Category group headers */}
          <div className="sticky left-0 top-0 z-30 bg-muted border-b border-r p-2 font-medium text-xs">
            Paper / Product
          </div>
          {groupedProducts.map((group) => (
            <div
              key={group.category.id}
              className="sticky top-0 z-20 bg-muted border-b text-center text-xs font-medium p-1 truncate"
              style={{
                gridColumn: `span ${group.products.length}`,
              }}
            >
              {group.category.name}
            </div>
          ))}

          {/* Product name headers (second row) */}
          <div className="sticky left-0 top-[33px] z-30 bg-muted border-b border-r p-1" />
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="sticky top-[33px] z-20 bg-muted border-b text-center"
              title={product.name}
            >
              <div className="text-[10px] leading-tight p-1 -rotate-45 origin-center whitespace-nowrap overflow-hidden max-w-[40px]">
                {product.name.slice(0, 6)}
              </div>
            </div>
          ))}

          {/* Data rows */}
          {filteredRows.map((paper) => (
            <>
              {/* Row header (sticky) */}
              <div
                key={`header-${paper.id}`}
                className="sticky left-0 z-10 bg-background border-b border-r p-1 text-xs truncate flex items-center"
                title={`${paper.name} (${paper.weight ?? "-"}g)`}
              >
                <span className="truncate">{paper.name}</span>
                {paper.weight && (
                  <span className="ml-1 text-muted-foreground shrink-0">
                    {paper.weight}g
                  </span>
                )}
              </div>

              {/* Cells */}
              {filteredProducts.map((product) => {
                const mapped = isMapped(paper.id, product.id);
                return (
                  <button
                    key={`${paper.id}-${product.id}`}
                    className={cn(
                      "border-b border-r h-8 flex items-center justify-center hover:bg-muted/50 transition-colors",
                      mapped && "bg-primary/10"
                    )}
                    onClick={() => onToggle(paper.id, product.id, !mapped)}
                    title={`${paper.name} x ${product.name}: ${mapped ? "Mapped" : "Not mapped"}`}
                  >
                    {mapped ? (
                      <span className="text-primary text-sm font-bold">
                        &#x25CF;
                      </span>
                    ) : (
                      <span className="text-muted-foreground/30 text-sm">
                        &#x25CB;
                      </span>
                    )}
                  </button>
                );
              })}
            </>
          ))}
        </div>
      </div>
    </div>
  );
}
