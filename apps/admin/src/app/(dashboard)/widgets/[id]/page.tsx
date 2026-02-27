"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Save, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { JsonEditor } from "@/components/editors/json-editor";
import { trpc } from "@/lib/trpc/client";

interface WidgetTheme {
  primary_color?: string;
  secondary_color?: string;
  font_family?: string;
  border_radius?: string;
}

/**
 * Widget Detail page with tabs.
 * REQ-E-702: Tab 1 (Basic info), Tab 2 (Category selection), Tab 3 (Embed code).
 */
export default function WidgetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const widgetId = Number(params.id);

  const utils = trpc.useUtils();
  const widgetQuery = trpc.widgets.getById.useQuery({ id: widgetId });
  const embedQuery = trpc.widgets.generateEmbedCode.useQuery({ id: widgetId });

  const updateMutation = trpc.widgets.update.useMutation({
    onSuccess: () => {
      utils.widgets.getById.invalidate({ id: widgetId });
      toast.success("Widget updated");
    },
    onError: (err) => {
      toast.error(`Failed to update: ${err.message}`);
    },
  });

  // Local form state
  const [name, setName] = useState("");
  const [status, setStatus] = useState("active");
  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [allowedOrigins, setAllowedOrigins] = useState<unknown[]>([]);
  const [theme, setTheme] = useState<WidgetTheme>({});
  const [features, setFeatures] = useState<Record<string, unknown>>({});
  const [isActive, setIsActive] = useState(true);

  // Sync from server data
  useEffect(() => {
    const w = widgetQuery.data;
    if (!w) return;
    setName(w.name ?? "");
    setStatus(w.status ?? "active");
    setApiBaseUrl(w.apiBaseUrl ?? "");
    setAllowedOrigins((w.allowedOrigins as unknown[]) ?? []);
    setTheme((w.theme as WidgetTheme) ?? {});
    setFeatures((w.features as Record<string, unknown>) ?? {});
    setIsActive(w.isActive ?? true);
  }, [widgetQuery.data]);

  const handleSave = () => {
    updateMutation.mutate({
      id: widgetId,
      data: {
        name,
        status,
        apiBaseUrl: apiBaseUrl || null,
        allowedOrigins,
        theme,
        features,
        isActive,
      },
    });
  };

  if (widgetQuery.isLoading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="detail" rows={6} />
      </div>
    );
  }

  if (!widgetQuery.data) {
    return (
      <div className="space-y-6">
        <p className="text-muted-foreground">Widget not found.</p>
        <Button variant="outline" onClick={() => router.push("/widgets/list")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to List
        </Button>
      </div>
    );
  }

  const widget = widgetQuery.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/widgets/list")}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{widget.name}</h1>
            <p className="text-muted-foreground">
              Widget ID: <span className="font-mono">{widget.widgetId}</span>
            </p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          <Save className="h-4 w-4 mr-1" />
          {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <Tabs defaultValue="basic">
        <TabsList>
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="categories">Categories & Features</TabsTrigger>
          <TabsTrigger value="embed">Embed Code</TabsTrigger>
        </TabsList>

        {/* Tab 1: Basic Info */}
        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Configure widget name, status, and allowed origins.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Input
                    id="status"
                    value={status}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setStatus(e.target.value)}
                    placeholder="active, draft, disabled"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apiBaseUrl">API Base URL</Label>
                  <Input
                    id="apiBaseUrl"
                    value={apiBaseUrl}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiBaseUrl(e.target.value)}
                    placeholder="https://widget.huniprinting.com"
                  />
                </div>
                <div className="space-y-2 flex items-end gap-2">
                  <div className="flex items-center gap-2">
                    <Label>Active</Label>
                    <Switch
                      checked={isActive}
                      onCheckedChange={setIsActive}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Allowed Origins (JSON)</Label>
                <JsonEditor
                  value={allowedOrigins}
                  onChange={(v) => setAllowedOrigins((v as unknown[]) ?? [])}
                  minHeight="80px"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Theme Settings</CardTitle>
              <CardDescription>
                Customize widget appearance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={theme.primary_color ?? "#5538b6"}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setTheme((prev) => ({
                          ...prev,
                          primary_color: e.target.value,
                        }))
                      }
                      className="h-8 w-8 rounded border cursor-pointer"
                    />
                    <Input
                      id="primaryColor"
                      value={theme.primary_color ?? ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setTheme((prev) => ({
                          ...prev,
                          primary_color: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Secondary Color</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={theme.secondary_color ?? "#eeebf9"}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setTheme((prev) => ({
                          ...prev,
                          secondary_color: e.target.value,
                        }))
                      }
                      className="h-8 w-8 rounded border cursor-pointer"
                    />
                    <Input
                      id="secondaryColor"
                      value={theme.secondary_color ?? ""}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setTheme((prev) => ({
                          ...prev,
                          secondary_color: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fontFamily">Font Family</Label>
                  <Input
                    id="fontFamily"
                    value={theme.font_family ?? ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setTheme((prev) => ({
                        ...prev,
                        font_family: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="borderRadius">Border Radius</Label>
                  <Input
                    id="borderRadius"
                    value={theme.border_radius ?? ""}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setTheme((prev) => ({
                        ...prev,
                        border_radius: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Categories & Features */}
        <TabsContent value="categories" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Features</CardTitle>
              <CardDescription>
                Enable or disable widget features.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <JsonEditor
                value={features}
                onChange={(v) =>
                  setFeatures((v as Record<string, unknown>) ?? {})
                }
                minHeight="150px"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Embed Code */}
        <TabsContent value="embed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Embed Code</CardTitle>
              <CardDescription>
                Copy the embed code to integrate this widget on your website.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {embedQuery.data ? (
                <>
                  <pre className="rounded-md bg-muted p-4 text-sm font-mono overflow-auto">
                    {embedQuery.data.embedCode}
                  </pre>
                  <Button
                    onClick={() => {
                      navigator.clipboard
                        .writeText(embedQuery.data!.embedCode)
                        .then(() => toast.success("Embed code copied"));
                    }}
                  >
                    <Copy className="h-4 w-4 mr-1" />
                    Copy to Clipboard
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Loading embed code...
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
