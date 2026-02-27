"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertTriangle, Link2, Search, Trash2 } from "lucide-react";

// -- Types --

export interface MapperProduct {
  id: number;
  name: string;
  categoryId: number;
  categoryName: string | null;
}

export interface MapperMesItem {
  id: number;
  itemCode: string;
  groupCode: string | null;
  name: string;
  abbreviation: string | null;
  itemType: string;
}

export interface MapperMapping {
  id: number;
  productId: number;
  mesItemId: number;
  coverType: string | null;
}

interface VisualMapperProps {
  products: MapperProduct[];
  mesItems: MapperMesItem[];
  mappings: MapperMapping[];
  onCreateMapping: (productId: number, mesItemId: number) => void;
  onDeleteMapping: (mappingId: number) => void;
  isLoading?: boolean;
}

/**
 * Two-panel visual mapping editor for product-to-MES-item connections.
 * REQ-E-602: Left panel (products by category) <-> Right panel (MES items by groupCode).
 * SVG lines connect mapped pairs. Click to create/delete mappings.
 */
export function VisualMapper({
  products,
  mesItems,
  mappings,
  onCreateMapping,
  onDeleteMapping,
  isLoading = false,
}: VisualMapperProps) {
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [selectedMesItem, setSelectedMesItem] = useState<number | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [mesSearch, setMesSearch] = useState("");
  const [selectedLine, setSelectedLine] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const [linePositions, setLinePositions] = useState<
    { id: number; x1: number; y1: number; x2: number; y2: number }[]
  >([]);

  // Mapped product IDs for warning icon
  const mappedProductIds = useMemo(
    () => new Set(mappings.map((m) => m.productId)),
    [mappings],
  );

  // Filter products
  const filteredProducts = useMemo(() => {
    if (!productSearch) return products;
    const q = productSearch.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.categoryName?.toLowerCase().includes(q),
    );
  }, [products, productSearch]);

  // Filter MES items
  const filteredMesItems = useMemo(() => {
    if (!mesSearch) return mesItems;
    const q = mesSearch.toLowerCase();
    return mesItems.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.itemCode.toLowerCase().includes(q) ||
        m.groupCode?.toLowerCase().includes(q),
    );
  }, [mesItems, mesSearch]);

  // Group products by category
  const productGroups = useMemo(() => {
    const groups = new Map<string, MapperProduct[]>();
    for (const p of filteredProducts) {
      const key = p.categoryName ?? "Uncategorized";
      const existing = groups.get(key) ?? [];
      existing.push(p);
      groups.set(key, existing);
    }
    return Array.from(groups.entries());
  }, [filteredProducts]);

  // Group MES items by groupCode
  const mesGroups = useMemo(() => {
    const groups = new Map<string, MapperMesItem[]>();
    for (const m of filteredMesItems) {
      const key = m.groupCode ?? "Ungrouped";
      const existing = groups.get(key) ?? [];
      existing.push(m);
      groups.set(key, existing);
    }
    return Array.from(groups.entries());
  }, [filteredMesItems]);

  // Handle product click: if MES item already selected, create mapping
  const handleProductClick = useCallback(
    (productId: number) => {
      if (selectedMesItem !== null) {
        onCreateMapping(productId, selectedMesItem);
        setSelectedProduct(null);
        setSelectedMesItem(null);
      } else {
        setSelectedProduct((prev) => (prev === productId ? null : productId));
      }
    },
    [selectedMesItem, onCreateMapping],
  );

  // Handle MES item click: if product already selected, create mapping
  const handleMesItemClick = useCallback(
    (mesItemId: number) => {
      if (selectedProduct !== null) {
        onCreateMapping(selectedProduct, mesItemId);
        setSelectedProduct(null);
        setSelectedMesItem(null);
      } else {
        setSelectedMesItem((prev) => (prev === mesItemId ? null : mesItemId));
      }
    },
    [selectedProduct, onCreateMapping],
  );

  // Calculate line positions for SVG connections
  const calculateLines = useCallback(() => {
    if (!containerRef.current || !leftPanelRef.current || !rightPanelRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const lines: typeof linePositions = [];

    for (const mapping of mappings) {
      const leftEl = leftPanelRef.current.querySelector(
        `[data-product-id="${mapping.productId}"]`,
      );
      const rightEl = rightPanelRef.current.querySelector(
        `[data-mes-id="${mapping.mesItemId}"]`,
      );
      if (!leftEl || !rightEl) continue;

      const leftRect = leftEl.getBoundingClientRect();
      const rightRect = rightEl.getBoundingClientRect();

      lines.push({
        id: mapping.id,
        x1: leftRect.right - containerRect.left,
        y1: leftRect.top + leftRect.height / 2 - containerRect.top,
        x2: rightRect.left - containerRect.left,
        y2: rightRect.top + rightRect.height / 2 - containerRect.top,
      });
    }

    setLinePositions(lines);
  }, [mappings]);

  useEffect(() => {
    calculateLines();
    // Recalculate on scroll
    const leftPanel = leftPanelRef.current;
    const rightPanel = rightPanelRef.current;
    const scrollHandler = () => calculateLines();
    leftPanel?.addEventListener("scroll", scrollHandler);
    rightPanel?.addEventListener("scroll", scrollHandler);
    window.addEventListener("resize", scrollHandler);
    return () => {
      leftPanel?.removeEventListener("scroll", scrollHandler);
      rightPanel?.removeEventListener("scroll", scrollHandler);
      window.removeEventListener("resize", scrollHandler);
    };
  }, [calculateLines]);

  return (
    <div className="space-y-4">
      {/* Selection status bar */}
      {(selectedProduct !== null || selectedMesItem !== null) && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
          <Link2 className="h-4 w-4" />
          {selectedProduct !== null && (
            <span>
              Product selected: {products.find((p) => p.id === selectedProduct)?.name}
            </span>
          )}
          {selectedMesItem !== null && (
            <span>
              MES item selected: {mesItems.find((m) => m.id === selectedMesItem)?.name}
            </span>
          )}
          <span className="text-muted-foreground">
            — Click on the other panel to create a mapping
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => {
              setSelectedProduct(null);
              setSelectedMesItem(null);
            }}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Delete selected line */}
      {selectedLine !== null && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/5 px-3 py-2 text-sm">
          <Trash2 className="h-4 w-4 text-destructive" />
          <span>Mapping selected</span>
          <Button
            variant="destructive"
            size="sm"
            className="ml-auto"
            onClick={() => {
              onDeleteMapping(selectedLine);
              setSelectedLine(null);
            }}
            disabled={isLoading}
          >
            Delete Mapping
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedLine(null)}
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Main mapper area */}
      <div ref={containerRef} className="relative flex gap-0 rounded-lg border">
        {/* Left Panel: Products */}
        <div className="w-[40%] border-r">
          <div className="sticky top-0 z-10 border-b bg-white p-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={productSearch}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setProductSearch(e.target.value)}
                className="h-8 pl-8 text-sm"
              />
            </div>
          </div>
          <ScrollArea className="h-[500px]">
            <div ref={leftPanelRef} className="p-2 space-y-3">
              {productGroups.map(([category, prods]) => (
                <div key={category}>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase px-2 mb-1">
                    {category}
                  </h4>
                  {prods.map((product) => (
                    <button
                      key={product.id}
                      data-product-id={product.id}
                      onClick={() => handleProductClick(product.id)}
                      className={cn(
                        "w-full text-left rounded-md px-2 py-1.5 text-sm transition-colors",
                        "hover:bg-accent/50",
                        selectedProduct === product.id && "bg-primary/10 ring-1 ring-primary",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {!mappedProductIds.has(product.id) && (
                          <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                        )}
                        <span className="truncate">{product.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Center: SVG connections */}
        <svg
          className="absolute inset-0 pointer-events-none z-[5]"
          style={{ width: "100%", height: "100%" }}
        >
          {linePositions.map((line) => (
            <line
              key={line.id}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={selectedLine === line.id ? "#ef4444" : "#5538B6"}
              strokeWidth={selectedLine === line.id ? 2.5 : 1.5}
              strokeOpacity={0.6}
              className="pointer-events-auto cursor-pointer"
              onClick={() =>
                setSelectedLine((prev) => (prev === line.id ? null : line.id))
              }
            />
          ))}
        </svg>

        {/* Right Panel: MES Items */}
        <div className="w-[40%] ml-auto">
          <div className="sticky top-0 z-10 border-b bg-white p-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search MES items..."
                value={mesSearch}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMesSearch(e.target.value)}
                className="h-8 pl-8 text-sm"
              />
            </div>
          </div>
          <ScrollArea className="h-[500px]">
            <div ref={rightPanelRef} className="p-2 space-y-3">
              {mesGroups.map(([groupCode, items]) => (
                <div key={groupCode}>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase px-2 mb-1">
                    {groupCode}
                  </h4>
                  {items.map((item) => (
                    <button
                      key={item.id}
                      data-mes-id={item.id}
                      onClick={() => handleMesItemClick(item.id)}
                      className={cn(
                        "w-full text-left rounded-md px-2 py-1.5 text-sm transition-colors",
                        "hover:bg-accent/50",
                        selectedMesItem === item.id && "bg-primary/10 ring-1 ring-primary",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground shrink-0">
                          {item.itemCode}
                        </span>
                        <span className="truncate">{item.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>Products: {products.length}</span>
        <span>MES Items: {mesItems.length}</span>
        <span>Mappings: {mappings.length}</span>
        <span className="text-amber-600">
          Unmapped: {products.filter((p) => !mappedProductIds.has(p.id)).length}
        </span>
      </div>
    </div>
  );
}
