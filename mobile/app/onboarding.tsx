import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Redirect, router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { MobileOnboardingInput } from "@fitplus/contracts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { mobileApi } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { getPostAuthPath } from "@/lib/navigation";
import { colors, spacing } from "@/lib/theme";

type FormState = {
  age: string;
  sex: string;
  heightCm: string;
  weightKg: string;
  goalType: string;
  currentGoal: string;
  experienceLevel: string;
  trainingLocation: string;
  availableEquipment: string;
  injuries: string;
  trainingDaysPerWeek: string;
  sessionDurationMins: string;
  dietaryPreference: string;
};

const emptyForm: FormState = {
  age: "",
  sex: "",
  heightCm: "",
  weightKg: "",
  goalType: "",
  currentGoal: "",
  experienceLevel: "",
  trainingLocation: "",
  availableEquipment: "",
  injuries: "",
  trainingDaysPerWeek: "",
  sessionDurationMins: "",
  dietaryPreference: "",
};

function toFormState(profile: NonNullable<Awaited<ReturnType<typeof mobileApi.getProfile>>["profile"]>): FormState {
  return {
    age: profile?.age?.toString() ?? "",
    sex: profile?.sex ?? "",
    heightCm: profile?.heightCm?.toString() ?? "",
    weightKg: profile?.weightKg?.toString() ?? "",
    goalType: profile?.goalType ?? "",
    currentGoal: profile?.currentGoal ?? "",
    experienceLevel: profile?.experienceLevel ?? "",
    trainingLocation: profile?.trainingLocation ?? "",
    availableEquipment: profile?.availableEquipment ?? "",
    injuries: profile?.injuries ?? "",
    trainingDaysPerWeek: profile?.trainingDaysPerWeek?.toString() ?? "",
    sessionDurationMins: profile?.sessionDurationMins?.toString() ?? "",
    dietaryPreference: profile?.dietaryPreference ?? "",
  };
}

export default function OnboardingScreen() {
  const { isBootstrapping, token, user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isBootstrapping) {
    return null;
  }

  if (!user) {
    return <Redirect href="/sign-in" />;
  }

  if (user.role === "ADMIN") {
    return <Redirect href="/ops" />;
  }

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: () => mobileApi.getProfile(token!),
    enabled: Boolean(token),
  });

  useEffect(() => {
    if (profileQuery.data?.profile) {
      setForm(toFormState(profileQuery.data.profile));
    }
  }, [profileQuery.data?.profile]);

  function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save() {
    try {
      setSaving(true);
      setError(null);

      const payload: MobileOnboardingInput = {
        age: Number(form.age),
        sex: form.sex.trim(),
        heightCm: Number(form.heightCm),
        weightKg: Number(form.weightKg),
        goalType: form.goalType.trim(),
        currentGoal: form.currentGoal.trim() || undefined,
        experienceLevel: form.experienceLevel.trim(),
        trainingLocation: form.trainingLocation.trim(),
        availableEquipment: form.availableEquipment.trim() || undefined,
        injuries: form.injuries.trim() || undefined,
        trainingDaysPerWeek: Number(form.trainingDaysPerWeek),
        sessionDurationMins: Number(form.sessionDurationMins),
        dietaryPreference: form.dietaryPreference.trim() || undefined,
      };

      await mobileApi.saveOnboarding(token!, payload);
      updateUser({ onboardingCompletedAt: new Date().toISOString() });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["workouts"] }),
        queryClient.invalidateQueries({ queryKey: ["nutrition"] }),
      ]);

      if (user) {
        router.replace(getPostAuthPath({ ...user, onboardingCompletedAt: new Date().toISOString() }));
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not save onboarding.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      title="Personalize your training"
      subtitle="Use the same onboarding model as the web app so workouts, nutrition, and coaching all stay aligned."
    >
      <Card>
        <View style={styles.grid}>
          <Input value={form.age} onChangeText={(value) => updateField("age", value)} placeholder="Age" keyboardType="number-pad" />
          <Input value={form.sex} onChangeText={(value) => updateField("sex", value)} placeholder="Sex" />
          <Input value={form.heightCm} onChangeText={(value) => updateField("heightCm", value)} placeholder="Height (cm)" keyboardType="decimal-pad" />
          <Input value={form.weightKg} onChangeText={(value) => updateField("weightKg", value)} placeholder="Weight (kg)" keyboardType="decimal-pad" />
          <Input value={form.goalType} onChangeText={(value) => updateField("goalType", value)} placeholder="Goal type" />
          <Input value={form.currentGoal} onChangeText={(value) => updateField("currentGoal", value)} placeholder="Current goal" />
          <Input value={form.experienceLevel} onChangeText={(value) => updateField("experienceLevel", value)} placeholder="Experience level" />
          <Input value={form.trainingLocation} onChangeText={(value) => updateField("trainingLocation", value)} placeholder="Training location" />
          <Input value={form.availableEquipment} onChangeText={(value) => updateField("availableEquipment", value)} placeholder="Available equipment" />
          <Input value={form.injuries} onChangeText={(value) => updateField("injuries", value)} placeholder="Injuries or limitations" />
          <Input value={form.trainingDaysPerWeek} onChangeText={(value) => updateField("trainingDaysPerWeek", value)} placeholder="Training days per week" keyboardType="number-pad" />
          <Input value={form.sessionDurationMins} onChangeText={(value) => updateField("sessionDurationMins", value)} placeholder="Session duration (mins)" keyboardType="number-pad" />
          <Input value={form.dietaryPreference} onChangeText={(value) => updateField("dietaryPreference", value)} placeholder="Dietary preference" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button onPress={() => void save()} loading={saving}>Save onboarding</Button>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: spacing.md,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
});
