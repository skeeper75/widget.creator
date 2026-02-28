"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

// @MX:NOTE: [AUTO] RecipeChoiceRestriction mirrors recipeChoiceRestrictions DB table
interface RecipeChoiceRestriction {
  id: number;
  recipeBindingId: number;
  choiceId: number;
  restrictionMode: string;
}

interface ElementChoice {
  id: number;
  choiceKey: string;
  displayName: string;
  isActive: boolean;
}

// @MX:NOTE: [AUTO] ChoiceRestrictionMatrixProps defines the contract for the restriction editor
export interface ChoiceRestrictionMatrixProps {
  bindingId: number;
  elementTypeId: number;
  currentRestrictions: RecipeChoiceRestriction[];
  onSave: () => void;
}

type RestrictionMode = "allow_only" | "exclude";

// @MX:ANCHOR: [AUTO] ChoiceRestrictionMatrix — choice restriction editor for recipe bindings
// @MX:REASON: Fan_in >= 3: used by recipes page, binding row expander, and restriction save handler
export function ChoiceRestrictionMatrix({
  bindingId,
  elementTypeId,
  currentRestrictions,
  onSave,
}: ChoiceRestrictionMatrixProps) {
  const existingMode =
    currentRestrictions.length > 0
      ? (currentRestrictions[0].restrictionMode as RestrictionMode)
      : "allow_only";

  const existingChoiceIds = new Set(currentRestrictions.map((r) => r.choiceId));

  const [mode, setMode] = useState<RestrictionMode>(existingMode);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(existingChoiceIds);

  const { data: choices, isLoading } = trpc.elementChoices.list.useQuery({
    elementTypeId,
    isActive: true,
  });

  const setRestrictions = trpc.recipes.setChoiceRestrictions.useMutation({
    onSuccess: () => {
      toast.success("Restrictions saved");
      onSave();
    },
    onError: (err) => {
      toast.error(`Failed to save restrictions: ${err.message}`);
    },
  });

  function handleToggle(choiceId: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(choiceId)) {
        next.delete(choiceId);
      } else {
        next.add(choiceId);
      }
      return next;
    });
  }

  function handleSelectAll() {
    if (!choices) return;
    setSelectedIds(new Set(choices.map((c) => c.id)));
  }

  function handleClearAll() {
    setSelectedIds(new Set());
  }

  function handleSave() {
    setRestrictions.mutate({
      bindingId,
      choiceIds: Array.from(selectedIds),
      mode,
    });
  }

  if (isLoading) {
    return (
      <div className="py-4 text-center text-sm text-muted-foreground">
        Loading choices...
      </div>
    );
  }

  if (!choices || choices.length === 0) {
    return (
      <div className="rounded-md border p-4 text-center text-sm text-muted-foreground">
        No choices available for this element type.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-md border p-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Label htmlFor="restriction-mode">Restriction Mode</Label>
          <Select
            value={mode}
            onValueChange={(val) => setMode(val as RestrictionMode)}
          >
            <SelectTrigger id="restriction-mode" className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="allow_only">Allow Only</SelectItem>
              <SelectItem value="exclude">Exclude</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSelectAll}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={handleClearAll}>
            Clear All
          </Button>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        {mode === "allow_only"
          ? "Only the selected choices will be available to customers."
          : "The selected choices will be hidden from customers."}
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {choices.map((choice) => {
          const choiceWithKey = choice as ElementChoice;
          return (
            <div key={choice.id} className="flex items-center gap-2">
              <Checkbox
                id={`choice-${choice.id}`}
                checked={selectedIds.has(choice.id)}
                onCheckedChange={() => handleToggle(choice.id)}
                aria-label={choice.displayName}
              />
              <Label
                htmlFor={`choice-${choice.id}`}
                className="cursor-pointer text-sm"
              >
                <span className="font-medium">{choice.displayName}</span>
                {choiceWithKey.choiceKey && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    ({choiceWithKey.choiceKey})
                  </span>
                )}
              </Label>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t pt-3">
        <span className="text-sm text-muted-foreground">
          {selectedIds.size} of {choices.length} choices selected
        </span>
        <Button onClick={handleSave} disabled={setRestrictions.isPending}>
          {setRestrictions.isPending ? "Saving..." : "Save Restrictions"}
        </Button>
      </div>
    </div>
  );
}
