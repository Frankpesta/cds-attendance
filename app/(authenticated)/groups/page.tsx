"use client";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { extractErrorMessage } from "@/lib/utils";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { MultiSelect } from "@/components/ui/multiselect";
import Link from "next/link";
import { Edit, Trash2, Plus } from "lucide-react";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || "";
const client = new ConvexHttpClient(convexUrl);

export default function GroupsPage() {
  const { push } = useToast();
  const [groups, setGroups] = useState<any[]>([]);
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

  const load = async () => {
    const res = await client.query(api.cds_groups.list, {}).catch(() => []);
    setGroups(res || []);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
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

    try {
      const id = await client.mutation(api.cds_groups.create, {
        name: form.name,
        meeting_days: form.meeting_days,
        meeting_time: form.meeting_time,
        meeting_duration: Number(form.meeting_duration),
        venue_name: form.venue_name,
      });
      push({ variant: "success", title: "Group created successfully" });
      setForm({ 
        name: "", 
        meeting_days: ["Monday", "Wednesday", "Friday"], 
        meeting_time: "14:00", 
        meeting_duration: 60, 
        venue_name: ""
      });
      load();
    } catch (e: any) {
      push({ variant: "error", title: "Create failed", description: extractErrorMessage(e, "Failed to create group") });
    }
  };

  return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">CDS Groups</h1>
            <p className="text-muted-foreground">Manage Community Development Service groups</p>
          </div>
          <Link href="/groups/create">
            <Button variant="primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Group
            </Button>
          </Link>
        </div>
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Create New CDS Group</h2>
          <p className="text-sm text-muted-foreground">Add a new Community Development Service group</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Group Name *</label>
              <Input 
                placeholder="e.g., Health Education CDS" 
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })} 
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
            />
          </div>


          <Button onClick={create} className="w-full sm:w-auto">Create CDS Group</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">CDS Groups</h3>
          <p className="text-sm text-muted-foreground">{groups.length} groups found</p>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((g) => (
              <div key={g._id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-lg">{g.name}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Days: {g.meeting_days.join(", ")}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Time: {g.meeting_time}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Venue: {g.venue_name}
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Link href={`/groups/${g._id}/edit`}>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={async () => {
                        if (confirm(`Are you sure you want to delete ${g.name}? This will also delete all associated attendance records and admin assignments.`)) {
                          try {
                            await client.mutation(api.cds_groups.deleteGroup, { id: g._id });
                            push({ variant: "success", title: "Group deleted", description: `${g.name} has been deleted successfully` });
                            load();
                          } catch (e: any) {
                            push({ variant: "error", title: "Delete failed", description: extractErrorMessage(e, "Could not delete group") });
                          }
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


