"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { trpc } from "@/lib/trpc/client";
import { ExternalLink, RefreshCw } from "lucide-react";

/**
 * Widget Preview page.
 * REQ-E-703: iframe rendering current widget configuration.
 */
export default function WidgetPreviewPage() {
  const searchParams = useSearchParams();
  const initialWidgetId = searchParams.get("widgetId");

  const [selectedWidgetId, setSelectedWidgetId] = useState<string>(
    initialWidgetId ?? "",
  );
  const [iframeKey, setIframeKey] = useState(0);

  const widgetsQuery = trpc.widgets.list.useQuery();
  const widgets = widgetsQuery.data ?? [];

  const selectedWidget = widgets.find(
    (w) => String(w.id) === selectedWidgetId,
  );

  const previewUrl = selectedWidget
    ? `/api/widget/config/${selectedWidget.widgetId}`
    : null;

  if (widgetsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Widget Preview</h1>
          <p className="text-muted-foreground">
            Preview your widget configuration in an iframe
          </p>
        </div>
        <LoadingSkeleton variant="form" rows={2} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Widget Preview</h1>
        <p className="text-muted-foreground">
          Preview your widget configuration in an iframe
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select Widget</CardTitle>
          <CardDescription>
            Choose a widget to preview its rendering.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="space-y-2 flex-1">
              <Label>Widget</Label>
              <Select
                value={selectedWidgetId}
                onValueChange={setSelectedWidgetId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a widget..." />
                </SelectTrigger>
                <SelectContent>
                  {widgets.map((w) => (
                    <SelectItem key={w.id} value={String(w.id)}>
                      {w.name} ({w.widgetId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              onClick={() => setIframeKey((k) => k + 1)}
              disabled={!selectedWidget}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Reload
            </Button>
            {previewUrl && (
              <Button
                variant="outline"
                onClick={() => window.open(previewUrl, "_blank")}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                Open
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview iframe */}
      {selectedWidget ? (
        <Card>
          <CardHeader>
            <CardTitle>Preview: {selectedWidget.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border bg-white overflow-hidden">
              <iframe
                key={iframeKey}
                src={previewUrl!}
                className="w-full border-0"
                style={{ minHeight: "600px" }}
                title={`Widget Preview - ${selectedWidget.name}`}
                sandbox="allow-scripts allow-same-origin"
              />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Select a widget above to preview it.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
