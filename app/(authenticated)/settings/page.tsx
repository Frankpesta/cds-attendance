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
  const [defaultCount, setDefaultCount] = useState<number | null>(null);
  const [batchA, setBatchA] = useState<number | null>(null);
  const [batchB, setBatchB] = useState<number | null>(null);
  const [batchC, setBatchC] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  
  const batchSettings = useQuery(api.settings.getBatchAttendanceSettings, {});
  const setBatchRequirements = useMutation(api.settings.setBatchAttendanceRequirements);
  
  // Initialize values when settings are loaded
  useEffect(() => {
    if (batchSettings && defaultCount === null) {
      setDefaultCount(batchSettings.default);
      setBatchA(batchSettings.batchA ?? null);
      setBatchB(batchSettings.batchB ?? null);
      setBatchC(batchSettings.batchC ?? null);
    }
  }, [batchSettings, defaultCount]);

  const handleSave = async () => {
    if (!sessionToken || defaultCount === null || defaultCount < 1) {
      push({ variant: "error", title: "Invalid Input", description: "Please enter a valid default number (at least 1)" });
      return;
    }
    
    // Validate batch values if provided
    if (batchA !== null && batchA < 1) {
      push({ variant: "error", title: "Invalid Input", description: "Batch A must be at least 1" });
      return;
    }
    if (batchB !== null && batchB < 1) {
      push({ variant: "error", title: "Invalid Input", description: "Batch B must be at least 1" });
      return;
    }
    if (batchC !== null && batchC < 1) {
      push({ variant: "error", title: "Invalid Input", description: "Batch C must be at least 1" });
      return;
    }
    
    setSaving(true);
    try {
      await setBatchRequirements({ 
        sessionToken, 
        default: defaultCount,
        batchA: batchA ?? undefined,
        batchB: batchB ?? undefined,
        batchC: batchC ?? undefined,
      });
      push({ variant: "success", title: "Settings Updated", description: "Batch attendance requirements updated successfully" });
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
        <CardContent className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Default Required Attendance per Month *
            </label>
            <Input
              type="number"
              min="1"
              value={defaultCount ?? batchSettings?.default ?? 3}
              onChange={(e) => setDefaultCount(parseInt(e.target.value, 10) || 1)}
              className="max-w-xs"
            />
            <p className="text-sm text-muted-foreground mt-2">
              This is the minimum number of attendances required for all corps members to print their monthly clearance certificate, unless overridden by batch-specific settings below.
            </p>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-lg font-semibold mb-4">Batch-Specific Overrides (Optional)</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Set different requirements for specific batches. Leave blank to use the default value. Batch is extracted from state code (e.g., OD/25A/2412 → Batch A).
            </p>
            
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Batch A
                </label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Use default"
                  value={batchA ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBatchA(val === "" ? null : parseInt(val, 10) || null);
                  }}
                  className="max-w-xs"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Batch B
                </label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Use default"
                  value={batchB ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBatchB(val === "" ? null : parseInt(val, 10) || null);
                  }}
                  className="max-w-xs"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Batch C
                </label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Use default"
                  value={batchC ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBatchC(val === "" ? null : parseInt(val, 10) || null);
                  }}
                  className="max-w-xs"
                />
              </div>
            </div>
          </div>
          
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Note:</p>
              <p>Batch-specific settings override the default. If a batch doesn't have a specific setting, it will use the default value. Use this to handle edge cases where different batches have different CDS session schedules.</p>
            </div>
          </div>

          <Button onClick={handleSave} loading={saving} disabled={defaultCount === null || defaultCount < 1}>
            <Save className="w-4 h-4 mr-2" />
            Save Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

