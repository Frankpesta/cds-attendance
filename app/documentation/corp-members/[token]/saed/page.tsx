"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { SAED_SKILLS, getTrainersForSkill, type SAEDTrainer } from "@/lib/saed-constants";
import { User, Building2, Phone, Mail, MapPin, Users } from "lucide-react";
import { extractErrorMessage } from "@/lib/utils";

export default function SAEDSelectionPage({ params }: { params: { token: string } }) {
  const router = useRouter();
  const { push } = useToast();
  const [form, setForm] = useState({
    personal_skill: "",
    saed_camp_skill: "",
    proposed_post_camp_saed_skill: "",
    selected_trainer: null as SAEDTrainer | null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const corpMemberDoc = useQuery(api.documentation.getCorpMemberByLinkToken, {
    linkToken: params.token,
  });

  const saveSAEDData = useMutation(api.documentation.saveSAEDData);

  // Get available trainers for selected skill
  const availableTrainers = useMemo(() => {
    if (!form.proposed_post_camp_saed_skill) return [];
    return getTrainersForSkill(form.proposed_post_camp_saed_skill);
  }, [form.proposed_post_camp_saed_skill]);

  // Track if user has manually interacted with the form
  const userHasInteracted = useRef(false);
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false);

  // Load existing data ONLY ONCE when corpMemberDoc first becomes available (before user interaction)
  useEffect(() => {
    if (corpMemberDoc && !hasLoadedInitialData && !userHasInteracted.current) {
      setForm({
        personal_skill: corpMemberDoc.personal_skill || "",
        saed_camp_skill: corpMemberDoc.saed_camp_skill || "",
        proposed_post_camp_saed_skill: corpMemberDoc.proposed_post_camp_saed_skill || "",
        selected_trainer: null,
      });
      setHasLoadedInitialData(true);
    }
  }, [corpMemberDoc, hasLoadedInitialData]);

  // Restore trainer only once when trainers become available for saved skill
  const trainerRestoredRef = useRef(false);
  useEffect(() => {
    if (
      corpMemberDoc && 
      hasLoadedInitialData && 
      !trainerRestoredRef.current &&
      corpMemberDoc.selected_trainer_name &&
      availableTrainers.length > 0 &&
      form.proposed_post_camp_saed_skill === corpMemberDoc.proposed_post_camp_saed_skill &&
      !form.selected_trainer
    ) {
      const trainer = availableTrainers.find(
        (t) => t.name === corpMemberDoc.selected_trainer_name && 
               t.phone === corpMemberDoc.selected_trainer_phone
      );
      if (trainer) {
        setForm((prev) => ({ ...prev, selected_trainer: trainer }));
        trainerRestoredRef.current = true;
      }
    }
  }, [availableTrainers, corpMemberDoc, hasLoadedInitialData, form.proposed_post_camp_saed_skill, form.selected_trainer]);

  const handleSubmit = async () => {
    if (!form.personal_skill.trim()) {
      push({ variant: "error", title: "Validation Error", description: "Personal Skill is required" });
      return;
    }
    if (!form.saed_camp_skill.trim()) {
      push({ variant: "error", title: "Validation Error", description: "SAED Camp Skill is required" });
      return;
    }
    if (!form.proposed_post_camp_saed_skill.trim()) {
      push({ variant: "error", title: "Validation Error", description: "Proposed Post Camp SAED Skill is required" });
      return;
    }

    // Check if trainers are available and selection is required
    if (availableTrainers.length > 0 && !form.selected_trainer) {
      push({ variant: "error", title: "Validation Error", description: "Please select a trainer for this skill" });
      return;
    }

    setSubmitting(true);
    try {
      await saveSAEDData({
        linkToken: params.token,
        personalSkill: form.personal_skill.trim(),
        saedCampSkill: form.saed_camp_skill.trim(),
        proposedPostCampSAEDSkill: form.proposed_post_camp_saed_skill.trim(),
        selectedTrainerName: form.selected_trainer?.name,
        selectedTrainerBusiness: form.selected_trainer?.business,
        selectedTrainerPhone: form.selected_trainer?.phone,
        selectedTrainerEmail: form.selected_trainer?.email,
      });
      setSubmitted(true);
      push({ variant: "success", title: "SAED information saved successfully" });
      
      // Redirect to success page after a short delay
      setTimeout(() => {
        router.push(`/documentation/corp-members/${params.token}/success`);
      }, 2000);
    } catch (error: any) {
      push({ variant: "error", title: "Submission failed", description: extractErrorMessage(error, "Failed to save SAED information") });
    } finally {
      setSubmitting(false);
    }
  };

  if (corpMemberDoc === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (corpMemberDoc === null) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="max-w-lg">
          <CardHeader>
            <h1 className="text-2xl font-semibold">Record not found</h1>
            <p className="text-sm text-muted-foreground">
              We couldn't find your documentation record. Please contact the CDS admin for assistance.
            </p>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="max-w-xl text-center">
          <CardHeader>
            <h1 className="text-3xl font-bold">Thank you!</h1>
            <p className="text-muted-foreground">
              Your SAED information has been submitted successfully. Redirecting...
            </p>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const skillOptions = [
    { value: "", label: "Select a skill" },
    ...SAED_SKILLS.map((skill) => ({ value: skill, label: skill })),
  ];

  const requiresTrainerSelection = availableTrainers.length > 0;

  return (
    <div className="min-h-screen bg-muted/40 py-10">
      <div className="mx-auto max-w-4xl px-4">
        <Card>
          <CardHeader>
            <h1 className="text-3xl font-bold tracking-tight">Out of Camp SAED Selection</h1>
            <p className="text-muted-foreground">
              Please provide information about your skills and proposed post-camp SAED activities.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Personal Skill *
                </label>
                <Input
                  placeholder="Enter the skill you already have"
                  value={form.personal_skill}
                  onChange={(e) => {
                    userHasInteracted.current = true;
                    setForm((prev) => ({
                      ...prev,
                      personal_skill: e.target.value,
                    }));
                  }}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Describe any skill or expertise you already possess before joining NYSC.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  SAED Camp Skill *
                </label>
                <Input
                  placeholder="Enter the skill you learned in camp"
                  value={form.saed_camp_skill}
                  onChange={(e) => {
                    userHasInteracted.current = true;
                    setForm((prev) => ({
                      ...prev,
                      saed_camp_skill: e.target.value,
                    }));
                  }}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  The SAED (Skill Acquisition and Entrepreneurship Development) skill you learned during orientation camp.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Proposed Post Camp SAED Skill *
                </label>
                <Select
                  value={form.proposed_post_camp_saed_skill}
                  onChange={(e) => {
                    userHasInteracted.current = true;
                    setForm((prev) => ({
                      ...prev,
                      proposed_post_camp_saed_skill: e.target.value,
                      selected_trainer: null, // Reset trainer when skill changes
                    }));
                  }}
                  options={skillOptions}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Select the SAED skill you would like to pursue after orientation camp.
                </p>
              </div>
            </div>

            {/* Trainer Selection Section */}
            {form.proposed_post_camp_saed_skill && (
              <div className="space-y-4 border-t pt-6">
                {requiresTrainerSelection ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Users className="h-5 w-5 text-primary" />
                      <h3 className="text-lg font-semibold">Available Trainers</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Please select a trainer for <strong>{form.proposed_post_camp_saed_skill}</strong>. 
                      {availableTrainers.length > 1 && ` ${availableTrainers.length} trainers available.`}
                    </p>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      {availableTrainers.map((trainer) => (
                        <Card
                          key={`${trainer.name}-${trainer.phone}`}
                          className={`cursor-pointer transition-all hover:shadow-lg ${
                            form.selected_trainer?.name === trainer.name && form.selected_trainer?.phone === trainer.phone
                              ? "ring-2 ring-primary border-primary"
                              : "hover:border-primary/50"
                          }`}
                          onClick={() => setForm((prev) => ({ ...prev, selected_trainer: trainer }))}
                        >
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <User className="h-4 w-4 text-primary" />
                                  <h4 className="font-semibold text-sm">{trainer.name}</h4>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                                  <Building2 className="h-3 w-3" />
                                  <span>{trainer.business}</span>
                                </div>
                              </div>
                              {form.selected_trainer?.name === trainer.name && form.selected_trainer?.phone === trainer.phone && (
                                <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                                  <div className="h-2 w-2 rounded-full bg-white" />
                                </div>
                              )}
                            </div>
                            
                            <div className="space-y-1.5 text-xs">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                <span>{trainer.phone}</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                <span className="truncate">{trainer.email}</span>
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span className="truncate">{trainer.address}</span>
                              </div>
                              <div className="text-muted-foreground mt-1">
                                <span className="font-medium">LGA:</span> {trainer.lga}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    
                    {form.selected_trainer && (
                      <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                        <p className="text-sm font-medium text-primary mb-1">
                          Selected Trainer: {form.selected_trainer.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {form.selected_trainer.business} • {form.selected_trainer.phone}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                    <p className="text-sm text-blue-800">
                      No trainers are currently available for <strong>{form.proposed_post_camp_saed_skill}</strong>. 
                      You can still proceed with your selection.
                    </p>
                  </div>
                )}
              </div>
            )}

            <Button
              className="w-full"
              disabled={
                !form.personal_skill.trim() ||
                !form.saed_camp_skill.trim() ||
                !form.proposed_post_camp_saed_skill.trim() ||
                (requiresTrainerSelection && !form.selected_trainer) ||
                submitting
              }
              onClick={handleSubmit}
            >
              {submitting ? "Submitting..." : "Submit SAED Information"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
