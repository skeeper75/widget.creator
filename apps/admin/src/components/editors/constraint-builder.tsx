"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  AlertTriangle,
  GripVertical,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { trpc } from "@/lib/trpc/client";

interface OptionDefinition {
  id: number;
  key: string;
  name: string;
}

interface OptionConstraint {
  id: number;
  productId: number;
  constraintType: string;
  sourceOptionId: number | null;
  sourceField: string;
  operator: string;
  value: string | null;
  valueMin: string | null;
  valueMax: string | null;
  targetOptionId: number | null;
  targetField: string;
  targetAction: string;
  targetValue: string | null;
  description: string | null;
  priority: number;
  isActive: boolean;
}

const OPERATORS = [
  { label: "equals", value: "eq" },
  { label: "not equals", value: "neq" },
  { label: "greater than", value: "gt" },
  { label: "less than", value: "lt" },
  { label: "in", value: "in" },
  { label: "between", value: "between" },
];

const ACTIONS = [
  { label: "Show", value: "show" },
  { label: "Hide", value: "hide" },
  { label: "Set Value", value: "set_value" },
  { label: "Filter Choices", value: "filter_choices" },
  { label: "Require", value: "require" },
];

const CONSTRAINT_TYPES = ["visibility", "value", "filter"] as const;

interface ConstraintBuilderProps {
  productId: number;
  optionDefinitions: OptionDefinition[];
}

function ConstraintCard({
  constraint,
  optionDefinitions,
  onUpdate,
  onDelete,
  isCircularWarning,
}: {
  constraint: OptionConstraint;
  optionDefinitions: OptionDefinition[];
  onUpdate: (id: number, data: Partial<OptionConstraint>) => void;
  onDelete: (id: number) => void;
  isCircularWarning: boolean;
}) {
  const sourceName =
    optionDefinitions.find((d) => d.id === constraint.sourceOptionId)?.name ??
    "Unknown";
  const targetName =
    optionDefinitions.find((d) => d.id === constraint.targetOptionId)?.name ??
    "Unknown";

  return (
    <Card
      className={`relative ${
        isCircularWarning ? "border-orange-400 bg-orange-50" : ""
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
            <Badge variant="outline" className="text-xs">
              Priority: {constraint.priority}
            </Badge>
            <Badge variant="secondary" className="text-xs capitalize">
              {constraint.constraintType}
            </Badge>
            {isCircularWarning && (
              <span className="flex items-center gap-1 text-orange-600 text-xs">
                <AlertTriangle className="h-3 w-3" />
                Circular dependency risk
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive"
            onClick={() => onDelete(constraint.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* IF condition */}
          <Badge className="bg-blue-100 text-blue-800 font-semibold">IF</Badge>
          <Select
            value={constraint.sourceOptionId?.toString() ?? ""}
            onValueChange={(val) =>
              onUpdate(constraint.id, {
                sourceOptionId: val ? Number(val) : null,
              })
            }
          >
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Source option" />
            </SelectTrigger>
            <SelectContent>
              {optionDefinitions.map((def) => (
                <SelectItem key={def.id} value={def.id.toString()}>
                  {def.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            className="w-[100px] h-8 text-xs"
            placeholder="field"
            value={constraint.sourceField}
            onChange={(e) =>
              onUpdate(constraint.id, { sourceField: e.target.value })
            }
          />

          <Select
            value={constraint.operator}
            onValueChange={(val) =>
              onUpdate(constraint.id, { operator: val })
            }
          >
            <SelectTrigger className="w-[120px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPERATORS.map((op) => (
                <SelectItem key={op.value} value={op.value}>
                  {op.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {constraint.operator === "between" ? (
            <>
              <Input
                className="w-[80px] h-8 text-xs"
                placeholder="min"
                value={constraint.valueMin ?? ""}
                onChange={(e) =>
                  onUpdate(constraint.id, {
                    valueMin: e.target.value || null,
                  })
                }
              />
              <span className="text-xs text-muted-foreground">-</span>
              <Input
                className="w-[80px] h-8 text-xs"
                placeholder="max"
                value={constraint.valueMax ?? ""}
                onChange={(e) =>
                  onUpdate(constraint.id, {
                    valueMax: e.target.value || null,
                  })
                }
              />
            </>
          ) : (
            <Input
              className="w-[120px] h-8 text-xs"
              placeholder="value"
              value={constraint.value ?? ""}
              onChange={(e) =>
                onUpdate(constraint.id, { value: e.target.value || null })
              }
            />
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* THEN action */}
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
          <Badge className="bg-green-100 text-green-800 font-semibold">
            THEN
          </Badge>
          <Select
            value={constraint.targetOptionId?.toString() ?? ""}
            onValueChange={(val) =>
              onUpdate(constraint.id, {
                targetOptionId: val ? Number(val) : null,
              })
            }
          >
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Target option" />
            </SelectTrigger>
            <SelectContent>
              {optionDefinitions.map((def) => (
                <SelectItem key={def.id} value={def.id.toString()}>
                  {def.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            className="w-[100px] h-8 text-xs"
            placeholder="field"
            value={constraint.targetField}
            onChange={(e) =>
              onUpdate(constraint.id, { targetField: e.target.value })
            }
          />

          <Select
            value={constraint.targetAction}
            onValueChange={(val) =>
              onUpdate(constraint.id, { targetAction: val })
            }
          >
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTIONS.map((act) => (
                <SelectItem key={act.value} value={act.value}>
                  {act.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            className="w-[120px] h-8 text-xs"
            placeholder="target value"
            value={constraint.targetValue ?? ""}
            onChange={(e) =>
              onUpdate(constraint.id, {
                targetValue: e.target.value || null,
              })
            }
          />
        </div>

        {constraint.description && (
          <p className="text-xs text-muted-foreground mt-1">
            {constraint.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function ConstraintBuilder({
  productId,
  optionDefinitions,
}: ConstraintBuilderProps) {
  const [activeTab, setActiveTab] = useState<string>("visibility");
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const constraintsQuery = trpc.optionConstraints.listByProduct.useQuery({
    productId,
  });

  const createMutation = trpc.optionConstraints.create.useMutation({
    onSuccess: () => {
      utils.optionConstraints.listByProduct.invalidate({ productId });
      toast.success("Constraint created");
    },
    onError: (err) => {
      toast.error(`Failed to create: ${err.message}`);
    },
  });

  const updateMutation = trpc.optionConstraints.update.useMutation({
    onSuccess: () => {
      utils.optionConstraints.listByProduct.invalidate({ productId });
    },
    onError: (err) => {
      toast.error(`Failed to update: ${err.message}`);
    },
  });

  const deleteMutation = trpc.optionConstraints.delete.useMutation({
    onSuccess: () => {
      utils.optionConstraints.listByProduct.invalidate({ productId });
      setDeleteTarget(null);
      toast.success("Constraint deleted");
    },
    onError: (err) => {
      toast.error(`Failed to delete: ${err.message}`);
    },
  });

  const constraints = (constraintsQuery.data ?? []) as OptionConstraint[];

  const handleUpdate = useCallback(
    (id: number, data: Partial<OptionConstraint>) => {
      updateMutation.mutate({ id, data });
    },
    [updateMutation],
  );

  const handleAddConstraint = () => {
    createMutation.mutate({
      productId,
      constraintType: activeTab,
      sourceOptionId: null,
      sourceField: "value",
      operator: "eq",
      value: null,
      valueMin: null,
      valueMax: null,
      targetOptionId: null,
      targetField: "visibility",
      targetAction: "show",
      targetValue: null,
      description: null,
      priority: constraints.length,
      isActive: true,
    });
  };

  // Check for circular dependencies on current constraints
  const circularWarnings = new Set<number>();
  for (const c of constraints) {
    if (c.sourceOptionId != null && c.targetOptionId != null) {
      // Simple check: if target -> source path exists in other constraints
      const reverseExists = constraints.some(
        (other) =>
          other.id !== c.id &&
          other.sourceOptionId === c.targetOptionId &&
          other.targetOptionId === c.sourceOptionId,
      );
      if (reverseExists) {
        circularWarnings.add(c.id);
      }
    }
  }

  const filteredConstraints = constraints.filter(
    (c) => c.constraintType === activeTab,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            {CONSTRAINT_TYPES.map((type) => (
              <TabsTrigger key={type} value={type} className="capitalize">
                {type}
                <Badge variant="secondary" className="ml-1.5 text-xs">
                  {constraints.filter((c) => c.constraintType === type).length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <Button size="sm" onClick={handleAddConstraint}>
          <Plus className="h-4 w-4 mr-1" />
          Add Rule
        </Button>
      </div>

      <div className="space-y-3">
        {filteredConstraints.length === 0 ? (
          <div className="flex items-center justify-center h-32 rounded-md border border-dashed">
            <p className="text-muted-foreground text-sm">
              No {activeTab} constraints. Click "Add Rule" to create one.
            </p>
          </div>
        ) : (
          filteredConstraints
            .sort((a, b) => a.priority - b.priority)
            .map((constraint) => (
              <ConstraintCard
                key={constraint.id}
                constraint={constraint}
                optionDefinitions={optionDefinitions}
                onUpdate={handleUpdate}
                onDelete={setDeleteTarget}
                isCircularWarning={circularWarnings.has(constraint.id)}
              />
            ))
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Constraint"
        description="Are you sure you want to delete this constraint rule? This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteTarget != null) deleteMutation.mutate({ id: deleteTarget });
        }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
