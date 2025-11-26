"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useSessionToken } from "@/hooks/useSessionToken";
import { Settings, Save, Info } from "lucide-react";

export default function SettingsPage() {
  const sessionToken = useSessionToken();
  const { push } = useToast();
  const [count, setCount] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  
  const currentCount = useQuery(api.settings.getRequiredAttendanceCount, {});
  const setRequiredCount = useMutation(api.settings.setRequiredAttendanceCount);
  
  // Initialize count when currentCount is loaded
  useEffect(() => {
    if (currentCount !== undefined && count === null) {
      setCount(currentCount);
    }
  }, [currentCount, count]);

  const handleSave = async () => {
    if (!sessionToken || count === null || count < 1) {
      push({ variant: "error", title: "Invalid Input", description: "Please enter a valid number (at least 1)" });
      return;
    }
    
    setSaving(true);
    try {
      await setRequiredCount({ sessionToken, count });
      push({ variant: "success", title: "Settings Updated", description: `Required attendance count set to ${count}` });
    } catch (error: any) {
      push({ variant: "error", title: "Failed to Update", description: error?.message || "Could not update settings" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
        <p className="text-muted-foreground">Configure system-wide settings and requirements</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Attendance Requirements</h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Required Attendance per Month
            </label>
            <Input
              type="number"
              min="1"
              value={count ?? currentCount ?? 3}
              onChange={(e) => setCount(parseInt(e.target.value, 10) || 1)}
              className="max-w-xs"
            />
            <p className="text-sm text-muted-foreground mt-2">
              This is the minimum number of attendances required for corps members to print their monthly clearance certificate.
            </p>
          </div>
          
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Note:</p>
              <p>This setting affects all corps members. Use this to handle edge cases where only 2 CDS sessions or 1 session holds in a month. The default is 3 attendances per month.</p>
            </div>
          </div>

          <Button onClick={handleSave} loading={saving} disabled={count === null || count < 1}>
            <Save className="w-4 h-4 mr-2" />
            Save Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

