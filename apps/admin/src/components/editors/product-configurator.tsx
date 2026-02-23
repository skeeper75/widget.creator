"use client";

import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  GripVertical,
  Save,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";

interface OptionDefinition {
  id: number;
  key: string;
  name: string;
  optionClass: string;
  optionType: string;
  uiComponent: string;
  isActive: boolean;
}

interface ProductOption {
  id: number;
  productId: number;
  optionDefinitionId: number;
  displayOrder: number;
  isRequired: boolean;
  isVisible: boolean;
  isInternal: boolean;
  uiComponentOverride: string | null;
  defaultChoiceId: number | null;
  isActive: boolean;
  definition: OptionDefinition | null;
}

interface OptionChoice {
  id: number;
  optionDefinitionId: number;
  code: string;
  name: string;
}

const UI_COMPONENTS = ["dropdown", "radio", "checkbox", "slider", "input"];

interface ProductConfiguratorProps {
  productId: number;
}

export function ProductConfigurator({ productId }: ProductConfiguratorProps) {
  const [pendingAssignments, setPendingAssignments] = useState<Set<number>>(
    new Set(),
  );
  const [editedOptions, setEditedOptions] = useState<
    Map<number, Partial<ProductOption>>
  >(new Map());

  const utils = trpc.useUtils();

  const allDefsQuery = trpc.optionDefinitions.list.useQuery();
  const productOptionsQuery = trpc.productOptions.listByProduct.useQuery({
    productId,
  });

  const assignMutation = trpc.productOptions.assignToProduct.useMutation({
    onSuccess: () => {
      utils.productOptions.listByProduct.invalidate({ productId });
      toast.success("Option assigned");
    },
    onError: (err) => {
      toast.error(`Failed to assign: ${err.message}`);
    },
  });

  const updateMutation = trpc.productOptions.update.useMutation({
    onSuccess: () => {
      utils.productOptions.listByProduct.invalidate({ productId });
    },
  });

  const softDeleteMutation = trpc.productOptions.softDeleteChoice.useMutation({
    onSuccess: () => {
      utils.productOptions.listByProduct.invalidate({ productId });
      toast.success("Option removed");
    },
    onError: (err) => {
      toast.error(`Failed to remove: ${err.message}`);
    },
  });

  const allDefs = (allDefsQuery.data ?? []) as OptionDefinition[];
  const assignedOptions = (productOptionsQuery.data ?? []) as ProductOption[];
  const assignedDefIds = new Set(
    assignedOptions.map((o) => o.optionDefinitionId),
  );

  const availableDefs = useMemo(
    () =>
      allDefs.filter(
        (d) =>
          d.isActive &&
          !assignedDefIds.has(d.id) &&
          !pendingAssignments.has(d.id),
      ),
    [allDefs, assignedDefIds, pendingAssignments],
  );

  const handleAssign = (defId: number) => {
    setPendingAssignments((prev) => new Set([...prev, defId]));
    assignMutation.mutate(
      {
        productId,
        optionDefinitionId: defId,
        displayOrder: assignedOptions.length,
      },
      {
        onSettled: () => {
          setPendingAssignments((prev) => {
            const next = new Set(prev);
            next.delete(defId);
            return next;
          });
        },
      },
    );
  };

  const handleOptionChange = (
    optionId: number,
    field: string,
    value: unknown,
  ) => {
    setEditedOptions((prev) => {
      const next = new Map(prev);
      const existing = next.get(optionId) ?? {};
      next.set(optionId, { ...existing, [field]: value });
      return next;
    });
  };

  const handleSaveAll = () => {
    if (editedOptions.size === 0) return;

    const updates = Array.from(editedOptions.entries());
    Promise.all(
      updates.map(([id, data]) => updateMutation.mutateAsync({ id, data })),
    )
      .then(() => {
        setEditedOptions(new Map());
        toast.success(`${updates.length} option(s) updated`);
      })
      .catch((err) => {
        toast.error(`Failed to save: ${err.message}`);
      });
  };

  if (allDefsQuery.isLoading || productOptionsQuery.isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left panel: available definitions */}
      <div className="col-span-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Available Options ({availableDefs.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 max-h-[600px] overflow-y-auto">
            {availableDefs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                All options are already assigned.
              </p>
            ) : (
              availableDefs.map((def) => (
                <div
                  key={def.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer"
                  onClick={() => handleAssign(def.id)}
                >
                  <Checkbox checked={false} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{def.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {def.optionClass} / {def.optionType}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {def.uiComponent}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right panel: assigned options */}
      <div className="col-span-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium">
              Assigned Options ({assignedOptions.length})
            </CardTitle>
            {editedOptions.size > 0 && (
              <Button size="sm" onClick={handleSaveAll}>
                <Save className="h-4 w-4 mr-1" />
                Save Changes ({editedOptions.size})
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
            {assignedOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No options assigned. Select options from the left panel.
              </p>
            ) : (
              assignedOptions.map((opt) => {
                const edited = editedOptions.get(opt.id);
                const defName = opt.definition?.name ?? `Option #${opt.optionDefinitionId}`;

                return (
                  <div
                    key={opt.id}
                    className="flex items-center gap-3 p-3 rounded-md border bg-background"
                  >
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {defName}
                        </span>
                        {opt.definition && (
                          <Badge variant="outline" className="text-xs shrink-0">
                            {opt.definition.optionClass}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {/* isRequired */}
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          Required
                        </span>
                        <Switch
                          className="scale-75"
                          checked={
                            (edited?.isRequired as boolean | undefined) ??
                            opt.isRequired
                          }
                          onCheckedChange={(v) =>
                            handleOptionChange(opt.id, "isRequired", v)
                          }
                        />
                      </div>

                      {/* isVisible */}
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          Visible
                        </span>
                        <Switch
                          className="scale-75"
                          checked={
                            (edited?.isVisible as boolean | undefined) ??
                            opt.isVisible
                          }
                          onCheckedChange={(v) =>
                            handleOptionChange(opt.id, "isVisible", v)
                          }
                        />
                      </div>

                      {/* isInternal */}
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          Internal
                        </span>
                        <Switch
                          className="scale-75"
                          checked={
                            (edited?.isInternal as boolean | undefined) ??
                            opt.isInternal
                          }
                          onCheckedChange={(v) =>
                            handleOptionChange(opt.id, "isInternal", v)
                          }
                        />
                      </div>

                      {/* uiComponentOverride */}
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          UI Override
                        </span>
                        <Select
                          value={
                            (edited?.uiComponentOverride as string | undefined) ??
                            opt.uiComponentOverride ??
                            ""
                          }
                          onValueChange={(val) =>
                            handleOptionChange(
                              opt.id,
                              "uiComponentOverride",
                              val || null,
                            )
                          }
                        >
                          <SelectTrigger className="h-7 w-[100px] text-xs">
                            <SelectValue placeholder="Default" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Default</SelectItem>
                            {UI_COMPONENTS.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* defaultChoiceId */}
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          Default Choice
                        </span>
                        <ChoiceSelector
                          optionDefinitionId={opt.optionDefinitionId}
                          value={
                            (edited?.defaultChoiceId as number | null | undefined) ??
                            opt.defaultChoiceId
                          }
                          onChange={(val) =>
                            handleOptionChange(
                              opt.id,
                              "defaultChoiceId",
                              val,
                            )
                          }
                        />
                      </div>

                      {/* Remove */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() =>
                          softDeleteMutation.mutate({ id: opt.id })
                        }
                      >
                        <span className="text-xs">x</span>
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ChoiceSelector({
  optionDefinitionId,
  value,
  onChange,
}: {
  optionDefinitionId: number;
  value: number | null;
  onChange: (val: number | null) => void;
}) {
  const choicesQuery = trpc.optionChoices.listByDefinition.useQuery({
    optionDefinitionId,
  });
  const choices = (choicesQuery.data ?? []) as OptionChoice[];

  return (
    <Select
      value={value?.toString() ?? ""}
      onValueChange={(val) => onChange(val ? Number(val) : null)}
    >
      <SelectTrigger className="h-7 w-[120px] text-xs">
        <SelectValue placeholder="None" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">None</SelectItem>
        {choices.map((c) => (
          <SelectItem key={c.id} value={c.id.toString()}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
