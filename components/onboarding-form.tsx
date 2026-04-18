"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { onboardingSchema } from "@/lib/validators";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

type FormInput = z.input<typeof onboardingSchema>;
type FormValues = z.output<typeof onboardingSchema>;

export function OnboardingForm({ defaults }: { defaults?: Partial<FormValues> }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: defaults as Partial<FormInput> | undefined,
  });

  const onSubmit = async (values: FormValues) => {
    setMessage(null);
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      setMessage("Could not save your profile. Please try again.");
      return;
    }
    setMessage("Saved! Redirecting to your dashboard...");
    router.push("/dashboard");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="text-sm text-[var(--color-muted)]">Age</label>
          <Input type="number" {...register("age")} />
        </div>
        <div>
          <label className="text-sm text-[var(--color-muted)]">Sex</label>
          <Select {...register("sex")}>
            <option value="">Select</option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
            <option value="OTHER">Other</option>
          </Select>
        </div>
        <div>
          <label className="text-sm text-[var(--color-muted)]">Experience</label>
          <Select {...register("experienceLevel")}>
            <option value="">Choose</option>
            <option value="BEGINNER">Beginner</option>
            <option value="INTERMEDIATE">Intermediate</option>
            <option value="ADVANCED">Advanced</option>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm text-[var(--color-muted)]">Height (cm)</label>
          <Input type="number" {...register("heightCm")} />
        </div>
        <div>
          <label className="text-sm text-[var(--color-muted)]">Weight (kg)</label>
          <Input type="number" step="0.1" {...register("weightKg")} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm text-[var(--color-muted)]">Goal</label>
          <Select {...register("goalType")}>
            <option value="">Select</option>
            <option value="FAT_LOSS">Fat loss</option>
            <option value="MUSCLE_GAIN">Muscle gain</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="RECOMP">Recomp</option>
            <option value="GENERAL_FITNESS">General fitness</option>
          </Select>
        </div>
        <div>
          <label className="text-sm text-[var(--color-muted)]">Current goal details</label>
          <Input placeholder="e.g. Lean out without losing strength" {...register("currentGoal")} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm text-[var(--color-muted)]">Training location</label>
          <Select {...register("trainingLocation")}>
            <option value="">Choose</option>
            <option value="GYM">Gym</option>
            <option value="HOME">Home</option>
          </Select>
        </div>
        <div>
          <label className="text-sm text-[var(--color-muted)]">Training days / week</label>
          <Input type="number" {...register("trainingDaysPerWeek")} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div>
          <label className="text-sm text-[var(--color-muted)]">Session duration (mins)</label>
          <Input type="number" {...register("sessionDurationMins")} />
        </div>
        <div>
          <label className="text-sm text-[var(--color-muted)]">Equipment</label>
          <Input placeholder="e.g. dumbbells, cables, squat rack" {...register("availableEquipment")} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm text-[var(--color-muted)]">Dietary preference</label>
          <Input placeholder="Balanced, high-protein, vegan..." {...register("dietaryPreference")} />
        </div>
        <div>
          <label className="text-sm text-[var(--color-muted)]">Injuries / limitations</label>
          <Textarea rows={3} placeholder="e.g. shoulder impingement, lower back" {...register("injuries")} />
        </div>
      </div>
      {message && <p className="text-sm text-[var(--color-success)]">{message}</p>}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save & continue"}
      </Button>
    </form>
  );
}
