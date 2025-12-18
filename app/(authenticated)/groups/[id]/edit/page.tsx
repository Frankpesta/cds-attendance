"use client";
import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { extractErrorMessage } from "@/lib/utils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multiselect";
import { useToast } from "@/components/ui/toast";
import { ConvexHttpClient } from "convex/browser";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "";
const client = new ConvexHttpClient(convexUrl);

export default function EditGroupPage() {
  const params = useParams();
  const groupId = params.id as string;
  const [loading, setLoading] = useState(false);
  const { push } = useToast();

  // Fetch group data
  const group = useQuery(api.cds_groups.get, { id: groupId as any });

  const [form, setForm] = useState({
    name: "",
    meeting_days: ["Monday", "Wednesday", "Friday"],
    meeting_time: "14:00",
    meeting_duration: 60,
    venue_name: "",
  });

  useEffect(() => {
    if (group) {
      setForm({
        name: group.name || "",
        meeting_days: group.meeting_days || ["Monday", "Wednesday", "Friday"],
        meeting_time: group.meeting_time || "14:00",
        meeting_duration: group.meeting_duration || 60,
        venue_name: group.venue_name || "",
      });
    }
  }, [group]);

  const dayOptions = [
    { value: "Monday", label: "Monday" },
    { value: "Tuesday", label: "Tuesday" },
    { value: "Wednesday", label: "Wednesday" },
    { value: "Thursday", label: "Thursday" },
    { value: "Friday", label: "Friday" },
    { value: "Saturday", label: "Saturday" },
    { value: "Sunday", label: "Sunday" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name.trim()) {
      push({ variant: "error", title: "Validation Error", description: "Group name is required" });
      return;
    }
    if (form.meeting_days.length === 0) {
      push({ variant: "error", title: "Validation Error", description: "Please select at least one meeting day" });
      return;
    }
    if (!form.venue_name.trim()) {
      push({ variant: "error", title: "Validation Error", description: "Venue name is required" });
      return;
    }

    setLoading(true);
    try {
      const res = await client.mutation(api.cds_groups.update, {
        id: groupId as any,
        name: form.name,
        meeting_days: form.meeting_days,
        meeting_time: form.meeting_time,
        meeting_duration: Number(form.meeting_duration),
        venue_name: form.venue_name,
      });
      
      push({ variant: "success", title: "Group updated", description: "CDS group has been updated successfully" });
      window.location.href = "/groups";
    } catch (e: any) {
      push({ variant: "error", title: "Update failed", description: extractErrorMessage(e, "Failed to update group") });
    } finally {
      setLoading(false);
    }
  };

  if (!group) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/groups">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Groups
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit CDS Group</h1>
          <p className="text-muted-foreground">Update group information</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <h2 className="text-xl font-semibold">Group Details</h2>
          <p className="text-sm text-muted-foreground">Update the group information below</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Group Name *</label>
              <Input 
                placeholder="e.g., Health Education CDS" 
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })} 
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Meeting Days *</label>
              <MultiSelect
                options={dayOptions}
                value={form.meeting_days}
                onChange={(days) => setForm({ ...form, meeting_days: days })}
                placeholder="Select meeting days..."
              />
            </div>
            
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Meeting Time</label>
                <Input 
                  type="time"
                  value={form.meeting_time} 
                  onChange={(e) => setForm({ ...form, meeting_time: e.target.value })} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Duration (minutes)</label>
                <Input 
                  type="number" 
                  min="30" 
                  max="180"
                  value={form.meeting_duration} 
                  onChange={(e) => setForm({ ...form, meeting_duration: Number(e.target.value) })} 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Venue Name *</label>
              <Input 
                placeholder="e.g., Akure South LGA Secretariat" 
                value={form.venue_name} 
                onChange={(e) => setForm({ ...form, venue_name: e.target.value })} 
                required
              />
            </div>


            <div className="flex gap-3 pt-4">
              <Button type="submit" loading={loading}>
                <Save className="w-4 h-4 mr-2" />
                Update Group
              </Button>
              <Link href="/groups">
                <Button variant="secondary">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

