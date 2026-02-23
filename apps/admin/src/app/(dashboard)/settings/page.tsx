"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/common/loading-skeleton";
import { trpc } from "@/lib/trpc/client";

/**
 * Settings page - Global application settings.
 * Simple form for siteName, defaultPageSize, enableAuditLog.
 */
export default function SettingsPage() {
  const utils = trpc.useUtils();
  const settingsQuery = trpc.settings.get.useQuery();

  const updateMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      utils.settings.get.invalidate();
      toast.success("Settings saved");
    },
    onError: (err) => {
      toast.error(`Failed to save: ${err.message}`);
    },
  });

  const [siteName, setSiteName] = useState("");
  const [defaultPageSize, setDefaultPageSize] = useState(20);
  const [enableAuditLog, setEnableAuditLog] = useState(false);

  // Sync from server
  useEffect(() => {
    const s = settingsQuery.data;
    if (!s) return;
    setSiteName(s.siteName ?? "");
    setDefaultPageSize(s.defaultPageSize ?? 20);
    setEnableAuditLog(s.enableAuditLog ?? false);
  }, [settingsQuery.data]);

  const handleSave = () => {
    updateMutation.mutate({
      siteName,
      defaultPageSize,
      enableAuditLog,
    });
  };

  if (settingsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Global application settings</p>
        </div>
        <LoadingSkeleton variant="form" rows={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Global application settings</p>
        </div>
        <Button onClick={handleSave} disabled={updateMutation.isPending}>
          <Save className="h-4 w-4 mr-1" />
          {updateMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>
            Configure basic application settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="siteName">Site Name</Label>
            <Input
              id="siteName"
              value={siteName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSiteName(e.target.value)}
              placeholder="HuniPrinting Admin"
            />
            <p className="text-xs text-muted-foreground">
              Displayed in the browser tab and header.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultPageSize">Default Page Size</Label>
            <Input
              id="defaultPageSize"
              type="number"
              min={10}
              max={100}
              value={defaultPageSize}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDefaultPageSize(Number(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Number of rows per page in data tables (10-100).
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Enable Audit Log</Label>
              <p className="text-xs text-muted-foreground">
                Track all data changes for compliance and debugging.
              </p>
            </div>
            <Switch
              checked={enableAuditLog}
              onCheckedChange={setEnableAuditLog}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
