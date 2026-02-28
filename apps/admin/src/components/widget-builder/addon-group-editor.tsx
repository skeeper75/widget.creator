"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  Plus,
  Trash2,
  X,
  Save,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AddonGroupItem {
  id: number;
  groupId: number;
  productId: number;
  productName: string;
  labelOverride: string | null;
  isDefault: boolean;
  displayOrder: number;
  priceOverride: number | null;
}

export interface AddonGroupEditorProps {
  groupId: number;
  onClose: () => void;
}

// ─── Sortable Item Row ────────────────────────────────────────────────────────

interface SortableItemRowProps {
  item: AddonGroupItem;
  onLabelChange: (id: number, value: string) => void;
  onDefaultChange: (id: number, checked: boolean) => void;
  onPriceChange: (id: number, value: string) => void;
  onRemove: (id: number) => void;
}

function SortableItemRow({
  item,
  onLabelChange,
  onDefaultChange,
  onPriceChange,
  onRemove,
}: SortableItemRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 rounded-md border bg-background hover:bg-muted/50 group"
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1 shrink-0"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Product name */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.productName}</p>
        <p className="text-xs text-muted-foreground">ID: {item.productId}</p>
      </div>

      {/* Label override */}
      <Input
        value={item.labelOverride ?? ""}
        onChange={(e) => onLabelChange(item.id, e.target.value)}
        placeholder="Label override"
        className="w-32 h-7 text-xs"
      />

      {/* Price override */}
      <Input
        type="number"
        value={item.priceOverride ?? ""}
        onChange={(e) => onPriceChange(item.id, e.target.value)}
        placeholder="Price"
        className="w-20 h-7 text-xs"
        min={0}
      />

      {/* Is default checkbox */}
      <div className="flex items-center gap-1 shrink-0">
        <Checkbox
          id={`default-${item.id}`}
          checked={item.isDefault}
          onCheckedChange={(checked) => onDefaultChange(item.id, Boolean(checked))}
        />
        <Label htmlFor={`default-${item.id}`} className="text-xs cursor-pointer">
          Default
        </Label>
      </div>

      {/* Remove */}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => onRemove(item.id)}
        aria-label={`Remove ${item.productName}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ─── Add Product Dialog ───────────────────────────────────────────────────────

interface AddProductDialogProps {
  open: boolean;
  onClose: () => void;
  existingProductIds: number[];
  onAdd: (productId: number) => void;
}

function AddProductDialog({ open, onClose, existingProductIds, onAdd }: AddProductDialogProps) {
  const [selectedProductId, setSelectedProductId] = useState<string>("");

  // Load wb products for selection using widget-admin dashboard query (pattern from recipes page)
  const { data: dashboardData, isLoading } = trpc.widgetAdmin.dashboard.useQuery(undefined, {
    enabled: open,
  });
  const wbProductList = dashboardData?.map(
    (p: { id: number; productKey: string; productNameKo: string }) => p,
  ) ?? [];

  const availableProducts = wbProductList.filter(
    (p: { id: number }) => !existingProductIds.includes(p.id),
  );

  const handleAdd = () => {
    const id = parseInt(selectedProductId, 10);
    if (!isNaN(id) && id > 0) {
      onAdd(id);
      setSelectedProductId("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Product to Group</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : availableProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No available products to add
            </p>
          ) : (
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a product..." />
              </SelectTrigger>
              <SelectContent>
                {availableProducts.map((p: { id: number; productNameKo: string }) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.productNameKo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleAdd} disabled={!selectedProductId}>
            Add Product
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── AddonGroupEditor ─────────────────────────────────────────────────────────

// @MX:NOTE: [AUTO] AddonGroupEditor manages inline item CRUD with dnd-kit sortable reordering
// @MX:REASON: Used on addons page for inline group item management; calls addonGroups tRPC procedures
export function AddonGroupEditor({ groupId, onClose }: AddonGroupEditorProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [localItems, setLocalItems] = useState<AddonGroupItem[] | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const utils = trpc.useUtils();

  // Load group with items
  const { data: groupData, isLoading } = trpc.addonGroups.getWithItems.useQuery({ groupId });

  // Sync server data to local state when not dirty
  if (groupData && !isDirty && !localItems) {
    setLocalItems(groupData.items as AddonGroupItem[]);
  }

  const items = localItems ?? (groupData?.items as AddonGroupItem[]) ?? [];

  // Mutations
  const addItemMutation = trpc.addonGroups.addItem.useMutation({
    onSuccess: () => {
      utils.addonGroups.getWithItems.invalidate({ groupId });
      toast.success("Product added to group");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const removeItemMutation = trpc.addonGroups.removeItem.useMutation({
    onSuccess: () => {
      utils.addonGroups.getWithItems.invalidate({ groupId });
      toast.success("Product removed from group");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const updateOrderMutation = trpc.addonGroups.updateItemOrder.useMutation({
    onSuccess: () => {
      utils.addonGroups.getWithItems.invalidate({ groupId });
      setIsDirty(false);
      toast.success("Display order saved");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // dnd-kit sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setLocalItems((prev) => {
      if (!prev) return prev;
      const oldIndex = prev.findIndex((i) => i.id === active.id);
      const newIndex = prev.findIndex((i) => i.id === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex).map((item, idx) => ({
        ...item,
        displayOrder: idx,
      }));
      setIsDirty(true);
      return reordered;
    });
  };

  const handleLabelChange = (id: number, value: string) => {
    setLocalItems((prev) =>
      prev ? prev.map((i) => (i.id === id ? { ...i, labelOverride: value || null } : i)) : prev,
    );
    setIsDirty(true);
  };

  const handleDefaultChange = (id: number, checked: boolean) => {
    setLocalItems((prev) =>
      prev ? prev.map((i) => (i.id === id ? { ...i, isDefault: checked } : i)) : prev,
    );
    setIsDirty(true);
  };

  const handlePriceChange = (id: number, value: string) => {
    const price = value ? parseInt(value, 10) : null;
    setLocalItems((prev) =>
      prev ? prev.map((i) => (i.id === id ? { ...i, priceOverride: price } : i)) : prev,
    );
    setIsDirty(true);
  };

  const handleRemove = (itemId: number) => {
    removeItemMutation.mutate({ itemId });
    setLocalItems((prev) => (prev ? prev.filter((i) => i.id !== itemId) : prev));
  };

  const handleAddProduct = (productId: number) => {
    addItemMutation.mutate({
      groupId,
      productId,
      displayOrder: items.length,
    });
  };

  const handleSaveOrder = () => {
    if (!localItems || localItems.length === 0) return;
    updateOrderMutation.mutate({
      groupId,
      items: localItems.map((item) => ({ id: item.id, displayOrder: item.displayOrder })),
    });
  };

  if (isLoading && !localItems) {
    return (
      <div className="flex items-center justify-center h-24">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">
            {groupData?.groupName ?? `Group #${groupId}`}
          </p>
          <p className="text-xs text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "items"}
            {groupData?.displayMode && (
              <Badge variant="outline" className="ml-2 text-xs">
                {groupData.displayMode}
              </Badge>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <Button
              size="sm"
              onClick={handleSaveOrder}
              disabled={updateOrderMutation.isPending}
              className="gap-1"
            >
              {updateOrderMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save Order
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddDialog(true)}
            className="gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Product
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Sortable item list */}
      {items.length === 0 ? (
        <div className="flex items-center justify-center h-20 border border-dashed rounded-md text-muted-foreground text-sm">
          No products in this group yet. Click &quot;Add Product&quot; to start.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-1">
              {items.map((item) => (
                <SortableItemRow
                  key={item.id}
                  item={item}
                  onLabelChange={handleLabelChange}
                  onDefaultChange={handleDefaultChange}
                  onPriceChange={handlePriceChange}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add Product Dialog */}
      <AddProductDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        existingProductIds={items.map((i) => i.productId)}
        onAdd={handleAddProduct}
      />
    </div>
  );
}
