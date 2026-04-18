import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { useAuth } from "@/lib/auth";
import { mobileApi } from "@/lib/api";
import { colors, spacing } from "@/lib/theme";

export default function ProfileScreen() {
  const { token, user, signOut, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const [name, setDraftName] = useState(user?.name ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: () => mobileApi.getProfile(token!),
    enabled: Boolean(token),
  });

  useEffect(() => {
    setDraftName(profileQuery.data?.user.name ?? user?.name ?? "");
  }, [profileQuery.data?.user.name, user?.name]);

  async function saveName() {
    try {
      setSaving(true);
      setError(null);
      const response = await mobileApi.updateProfile(token!, { name });
      updateUser({ name: response.user.name });
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not update your name.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      title="Profile"
      subtitle="Keep your mobile account details aligned with the main platform."
    >
      <Card>
        <Text style={styles.sectionTitle}>Account</Text>
        <Text style={styles.copy}>{profileQuery.data?.user.email}</Text>
        <Text style={styles.copy}>Role: {profileQuery.data?.user.role}</Text>
        <Text style={styles.copy}>
          Verification: {profileQuery.data?.user.emailVerified ? "Verified" : "Pending"}
        </Text>
        <Text style={styles.copy}>
          Onboarding: {profileQuery.data?.user.onboardingCompletedAt ? "Complete" : "Needs attention"}
        </Text>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Update name</Text>
        <Input value={name} onChangeText={setDraftName} placeholder="Name" />
        <Button onPress={() => void saveName()} loading={saving}>Save</Button>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Training profile</Text>
        <Text style={styles.copy}>Goal: {profileQuery.data?.profile?.currentGoal ?? profileQuery.data?.profile?.goalType ?? "Not set"}</Text>
        <Text style={styles.copy}>Experience: {profileQuery.data?.profile?.experienceLevel ?? "Not set"}</Text>
        <Text style={styles.copy}>Schedule: {profileQuery.data?.profile?.trainingDaysPerWeek ?? "—"} days / {profileQuery.data?.profile?.sessionDurationMins ?? "—"} min</Text>
        <Text style={styles.copy}>Body: {profileQuery.data?.profile?.heightCm ?? "—"} cm / {profileQuery.data?.profile?.weightKg ?? "—"} kg</Text>
        <View style={styles.actions}>
          <Button variant="secondary" onPress={() => router.push("/onboarding")}>Edit onboarding</Button>
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Subscription</Text>
        <Text style={styles.copy}>Plan: {profileQuery.data?.subscription?.plan ?? "Starter"}</Text>
        <Text style={styles.copy}>Status: {profileQuery.data?.subscription?.status ?? "TRIALING"}</Text>
        <Text style={styles.copy}>Tier: {profileQuery.data?.subscription?.planTier ?? "STARTER"}</Text>
        <View style={styles.actions}>
          <Button variant="secondary" onPress={() => router.push("/billing")}>Open billing</Button>
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Linked providers</Text>
        <Text style={styles.copy}>
          {profileQuery.data?.linkedProviders.length ? profileQuery.data.linkedProviders.join(", ") : "Email/password only"}
        </Text>
        {profileQuery.data?.adminNote ? <Text style={styles.note}>{profileQuery.data.adminNote}</Text> : null}
      </Card>

      <Button variant="secondary" onPress={() => void signOut()}>Sign out</Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: colors.foreground,
    fontSize: 18,
    fontFamily: "SpaceGrotesk_700Bold",
  },
  copy: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
  },
  note: {
    color: colors.accent2,
    fontSize: 14,
    lineHeight: 22,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
  actions: {
    gap: spacing.sm,
  },
});
