"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Shield, Pencil, Zap, ChevronRight } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

// @MX:NOTE: [AUTO] ConstraintTemplate type mirrors constraintTemplates DB schema
interface ConstraintTemplate {
  id: number;
  templateKey: string;
  templateNameKo: string;
  description: string | null;
  category: string | null;
  triggerOptionType: string | null;
  triggerOperator: string | null;
  triggerValuesPattern: unknown;
  extraConditionsPattern: unknown;
  actionsPattern: unknown;
  isSystem: boolean;
  isActive: boolean;
  createdAt: Date;
}

export interface TemplateDetailPanelProps {
  template: ConstraintTemplate | null;
  onEdit?: (template: ConstraintTemplate) => void;
}

// ─── Helper: render trigger values as chips ───────────────────────────────────

function TriggerValueChips({ values }: { values: unknown }) {
  if (!values) return <span className="text-muted-foreground text-sm">—</span>;

  const items = Array.isArray(values) ? values : [values];
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((v, i) => (
        <Badge key={i} variant="outline" className="font-mono text-xs">
          {String(v)}
        </Badge>
      ))}
    </div>
  );
}

// ─── Helper: render actions list ─────────────────────────────────────────────

function ActionsList({ actions }: { actions: unknown }) {
  if (!actions || !Array.isArray(actions) || actions.length === 0) {
    return <span className="text-muted-foreground text-sm">No actions defined</span>;
  }

  return (
    <ol className="space-y-1">
      {actions.map((action, i) => {
        const a = action as Record<string, unknown>;
        const type = String(a.type ?? "unknown");
        const target = a.target ? String(a.target) : null;
        const value = a.value !== undefined ? String(a.value) : null;

        return (
          <li key={i} className="flex items-center gap-2 text-sm">
            <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
            <Badge variant="secondary" className="font-mono text-xs capitalize">
              {type}
            </Badge>
            {target && (
              <>
                <span className="text-muted-foreground">→</span>
                <span className="font-medium">{target}</span>
              </>
            )}
            {value !== null && (
              <>
                <span className="text-muted-foreground">=</span>
                <span className="font-mono text-xs">{value}</span>
              </>
            )}
          </li>
        );
      })}
    </ol>
  );
}

// ─── TemplateDetailPanel ──────────────────────────────────────────────────────

// @MX:NOTE: [AUTO] Read-only display for system templates; edit enabled for custom templates
// @MX:REASON: System templates (isSystem=true) are protected per FR-WBADMIN-004
export function TemplateDetailPanel({ template, onEdit }: TemplateDetailPanelProps) {
  if (!template) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-center h-32 text-muted-foreground text-sm">
          Select a template to view details
        </CardContent>
      </Card>
    );
  }

  const isReadOnly = template.isSystem;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-base truncate">{template.templateNameKo}</CardTitle>
              {isReadOnly ? (
                <Badge variant="secondary" className="shrink-0 gap-1">
                  <Shield className="h-3 w-3" />
                  System
                </Badge>
              ) : (
                <Badge variant="outline" className="shrink-0">
                  Custom
                </Badge>
              )}
              {!template.isActive && (
                <Badge variant="destructive" className="shrink-0">
                  Inactive
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground font-mono">{template.templateKey}</p>
          </div>
          {!isReadOnly && onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onEdit(template)}
              className="shrink-0 gap-1"
            >
              <Pencil className="h-3 w-3" />
              Edit
            </Button>
          )}
        </div>
        {template.description && (
          <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
        )}
      </CardHeader>

      <Separator />

      <CardContent className="pt-4 space-y-4">
        {/* Category */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
              Category
            </p>
            {template.category ? (
              <Badge variant="outline">{template.category}</Badge>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </div>

        <Separator />

        {/* Trigger (ECA — Event/Condition) */}
        <div>
          <div className="flex items-center gap-1 mb-3">
            <Zap className="h-4 w-4 text-amber-500" />
            <p className="text-sm font-semibold">Trigger</p>
          </div>
          <div className="space-y-2 pl-5">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Option Type</p>
                {template.triggerOptionType ? (
                  <Badge variant="outline" className="font-mono text-xs">
                    {template.triggerOptionType}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Operator</p>
                {template.triggerOperator ? (
                  <Badge variant="outline" className="font-mono text-xs">
                    {template.triggerOperator}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground text-sm">—</span>
                )}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Values</p>
              <TriggerValueChips values={template.triggerValuesPattern} />
            </div>
          </div>
        </div>

        <Separator />

        {/* Actions (ECA — Action) */}
        <div>
          <div className="flex items-center gap-1 mb-3">
            <ChevronRight className="h-4 w-4 text-blue-500" />
            <p className="text-sm font-semibold">Actions</p>
          </div>
          <div className="pl-5">
            <ActionsList actions={template.actionsPattern} />
          </div>
        </div>

        {isReadOnly && (
          <>
            <Separator />
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2">
              <Shield className="h-3 w-3 shrink-0" />
              <span>System template — read-only. Cannot be edited or deactivated.</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
