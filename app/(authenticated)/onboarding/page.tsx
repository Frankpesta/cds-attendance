"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Select } from "@/components/ui/select";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { onboardCorpsMemberAction } from "@/app/actions/onboarding";

export default function OnboardingPage() {
  const { push } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", address: "", ppa: "", cds_group_id: "", stateCode: "" });
  
  // Fetch CDS groups for the select dropdown
  const cdsGroups = useQuery(api.cds_groups.list, {});

  const submit = async () => {
    if (!form.cds_group_id) {
      push({ variant: "error", title: "Validation Error", description: "Please select a CDS group" });
      return;
    }
    if (!form.stateCode.trim()) {
      push({ variant: "error", title: "Validation Error", description: "State code is required" });
      return;
    }
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.set("name", form.name);
      formData.set("email", form.email);
      formData.set("address", form.address);
      formData.set("ppa", form.ppa);
      formData.set("cds_group_id", form.cds_group_id);
      formData.set("stateCode", form.stateCode);

      const res = await onboardCorpsMemberAction(formData);
      if (!res.ok) {
        push({ variant: "error", title: "Failed", description: res.error });
        return;
      }
      
      push({ variant: "success", title: "User onboarded", description: "Credentials emailed" });
      setForm({ name: "", email: "", address: "", ppa: "", cds_group_id: "", stateCode: "" });
    } catch (e: any) {
      push({ variant: "error", title: "Failed", description: e?.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Onboard Corps Member</h1>
        <p className="text-muted-foreground">Add new corps members to the system</p>
      </div>
        <Card className="max-w-lg">
          <CardHeader>Details</CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <Input placeholder="Enter full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <Input placeholder="Enter email address" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Address</label>
              <Input placeholder="Enter residential address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">PPA (Place of Primary Assignment)</label>
              <Input placeholder="Enter PPA" value={form.ppa} onChange={(e) => setForm({ ...form, ppa: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">CDS Group</label>
              <Select
                value={form.cds_group_id}
                onChange={(e) => setForm({ ...form, cds_group_id: e.target.value })}
                options={cdsGroups?.map((group: any) => ({ value: group._id, label: group.name })) || []}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">State Code *</label>
              <Input 
                placeholder="e.g., AK/24A/1234" 
                value={form.stateCode} 
                onChange={(e) => setForm({ ...form, stateCode: e.target.value })} 
              />
              <p className="text-xs text-muted-foreground mt-1">Format: State/Batch/Number (e.g., AK/24A/1234)</p>
            </div>
            <Button onClick={submit} loading={loading} className="w-full">Onboard Corps Member</Button>
          </CardContent>
        </Card>
    </div>
  );
}


