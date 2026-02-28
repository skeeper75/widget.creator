"use client";

import { useState } from "react";
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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

// @MX:NOTE: [AUTO] BindingWithType represents a joined result of recipeOptionBindings + optionElementTypes
interface BindingWithType {
  id: number;
  recipeId: number;
  typeId: number;
  displayOrder: number;
  processingOrder: number;
  isRequired: boolean;
  defaultChoiceId: number | null;
  isActive: boolean;
  typeName: string;
  typeNameEn: string;
  typeKey: string;
  uiControl: string;
}

interface ChoiceOption {
  id: number;
  displayName: string;
}

// @MX:NOTE: [AUTO] ElementBindingTableProps defines the contract for Recipe Builder binding list
export interface ElementBindingTableProps {
  recipeId: number;
  bindings: BindingWithType[];
  choicesByTypeId: Record<number, ChoiceOption[]>;
  onBindingsChange: () => void;
}

interface SortableRowProps {
  binding: BindingWithType;
  choices: ChoiceOption[];
  onRequiredChange: (bindingId: number, checked: boolean) => void;
  onDefaultChoiceChange: (bindingId: number, choiceId: number | null) => void;
  onRemove: (bindingId: number) => void;
}

function SortableRow({
  binding,
  choices,
  onRequiredChange,
  onDefaultChoiceChange,
  onRemove,
}: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: binding.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <button
          type="button"
          className="cursor-grab text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </TableCell>
      <TableCell className="font-medium">
        <div className="flex flex-col">
          <span>{binding.typeName}</span>
          <span className="text-xs text-muted-foreground">{binding.typeKey}</span>
        </div>
      </TableCell>
      <TableCell>
        <Checkbox
          checked={binding.isRequired}
          onCheckedChange={(checked) => onRequiredChange(binding.id, checked === true)}
          aria-label={`Required: ${binding.typeName}`}
        />
      </TableCell>
      <TableCell>
        <Select
          value={binding.defaultChoiceId?.toString() ?? "none"}
          onValueChange={(val) =>
            onDefaultChoiceChange(binding.id, val === "none" ? null : parseInt(val, 10))
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="No default" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No default</SelectItem>
            {choices.map((choice) => (
              <SelectItem key={choice.id} value={choice.id.toString()}>
                {choice.displayName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <span className="rounded bg-muted px-2 py-1 text-xs font-mono">{binding.uiControl}</span>
      </TableCell>
      <TableCell className="text-center text-sm text-muted-foreground">
        {binding.displayOrder}
      </TableCell>
      <TableCell>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onRemove(binding.id)}
          aria-label={`Remove ${binding.typeName}`}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

// @MX:ANCHOR: [AUTO] ElementBindingTable — core Recipe Builder binding management component
// @MX:REASON: Fan_in >= 3: used by recipes page, recipe edit modal, and recipe save handler
export function ElementBindingTable({
  recipeId,
  bindings,
  choicesByTypeId,
  onBindingsChange,
}: ElementBindingTableProps) {
  const [localBindings, setLocalBindings] = useState(bindings);
  const [isDirty, setIsDirty] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const updateBindingOrder = trpc.recipes.updateBindingOrder.useMutation({
    onSuccess: () => {
      toast.success("Binding order saved");
      setIsDirty(false);
      onBindingsChange();
    },
    onError: (err) => {
      toast.error(`Failed to save order: ${err.message}`);
    },
  });

  const removeBinding = trpc.recipes.removeBinding.useMutation({
    onSuccess: () => {
      toast.success("Binding removed");
      onBindingsChange();
    },
    onError: (err) => {
      toast.error(`Failed to remove binding: ${err.message}`);
    },
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setLocalBindings((prev) => {
      const oldIndex = prev.findIndex((b) => b.id === active.id);
      const newIndex = prev.findIndex((b) => b.id === over.id);
      const reordered = arrayMove(prev, oldIndex, newIndex);
      return reordered.map((b, idx) => ({ ...b, displayOrder: idx, processingOrder: idx }));
    });
    setIsDirty(true);
  }

  function handleRequiredChange(bindingId: number, checked: boolean) {
    setLocalBindings((prev) =>
      prev.map((b) => (b.id === bindingId ? { ...b, isRequired: checked } : b)),
    );
    setIsDirty(true);
  }

  function handleDefaultChoiceChange(bindingId: number, choiceId: number | null) {
    setLocalBindings((prev) =>
      prev.map((b) => (b.id === bindingId ? { ...b, defaultChoiceId: choiceId } : b)),
    );
    setIsDirty(true);
  }

  function handleRemove(bindingId: number) {
    if (!confirm("Remove this binding from the recipe?")) return;
    removeBinding.mutate({ bindingId });
  }

  function handleSave() {
    updateBindingOrder.mutate({
      recipeId,
      bindings: localBindings.map((b) => ({
        id: b.id,
        displayOrder: b.displayOrder,
        processingOrder: b.processingOrder,
      })),
    });
  }

  if (localBindings.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
        No bindings yet. Add element types to this recipe.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={localBindings.map((b) => b.id)}
          strategy={verticalListSortingStrategy}
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Element Type</TableHead>
                <TableHead className="w-24">Required</TableHead>
                <TableHead>Default Choice</TableHead>
                <TableHead>UI Control</TableHead>
                <TableHead className="w-24 text-center">Display Order</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {localBindings.map((binding) => (
                <SortableRow
                  key={binding.id}
                  binding={binding}
                  choices={choicesByTypeId[binding.typeId] ?? []}
                  onRequiredChange={handleRequiredChange}
                  onDefaultChoiceChange={handleDefaultChoiceChange}
                  onRemove={handleRemove}
                />
              ))}
            </TableBody>
          </Table>
        </SortableContext>
      </DndContext>

      {isDirty && (
        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={updateBindingOrder.isPending}
          >
            {updateBindingOrder.isPending ? "Saving..." : "Save Order"}
          </Button>
        </div>
      )}
    </div>
  );
}
