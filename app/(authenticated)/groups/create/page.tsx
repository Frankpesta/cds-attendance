"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multiselect";
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/utils";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "";
const client = new ConvexHttpClient(convexUrl);

export default function CreateGroupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { push } = useToast();

  const [form, setForm] = useState({
    name: "",
    meeting_days: ["Monday", "Wednesday", "Friday"],
    meeting_time: "14:00",
    meeting_duration: 60,
    venue_name: "",
  });

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
      const res = await client.mutation(api.cds_groups.create, {
        name: form.name,
        meeting_days: form.meeting_days,
        meeting_time: form.meeting_time,
        meeting_duration: Number(form.meeting_duration),
        venue_name: form.venue_name,
      });
      
      push({ variant: "success", title: "Group created", description: "CDS group has been created successfully" });
      router.push("/groups");
    } catch (e: any) {
      push({ variant: "error", title: "Create failed", description: extractErrorMessage(e, "Failed to create group") });
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-3xl font-bold tracking-tight">Create CDS Group</h1>
          <p className="text-muted-foreground">Add a new Community Development Service group</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <h2 className="text-xl font-semibold">Group Details</h2>
          <p className="text-sm text-muted-foreground">Fill in the group information below</p>
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
                Create Group
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

