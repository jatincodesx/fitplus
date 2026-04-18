import { StyleSheet, Text } from "react-native";
import { Redirect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { useAuth } from "@/lib/auth";
import { mobileApi } from "@/lib/api";
import { getPostAuthPath } from "@/lib/navigation";
import { colors } from "@/lib/theme";

export default function BillingScreen() {
  const { isBootstrapping, token, user } = useAuth();

  if (isBootstrapping) {
    return null;
  }

  if (!user) {
    return <Redirect href="/sign-in" />;
  }

  const postAuthPath = getPostAuthPath(user);
  if (postAuthPath !== "/(tabs)") {
    return <Redirect href={postAuthPath} />;
  }

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: () => mobileApi.getProfile(token!),
    enabled: Boolean(token),
  });

  const subscription = profileQuery.data?.subscription;
  const billingProfile = profileQuery.data?.billingProfile;

  return (
    <Screen
      title="Plans and billing"
      subtitle="This mirrors the current web billing readiness state without inventing mobile-only billing logic."
    >
      <Card>
        <Text style={styles.sectionTitle}>Current plan</Text>
        <Text style={styles.copy}>Plan: {subscription?.plan ?? "Starter"}</Text>
        <Text style={styles.copy}>Status: {subscription?.status ?? "TRIALING"}</Text>
        <Text style={styles.copy}>Tier: {subscription?.planTier ?? "STARTER"}</Text>
        <Text style={styles.copy}>
          Auto-renew: {subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toDateString() : "—"}
        </Text>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Billing profile</Text>
        <Text style={styles.copy}>Provider: {billingProfile?.provider ?? subscription?.provider ?? "NONE"}</Text>
        <Text style={styles.copy}>Billing email: {billingProfile?.billingEmail ?? profileQuery.data?.user.email ?? "—"}</Text>
        <Text style={styles.copy}>Country: {billingProfile?.countryCode ?? "—"}</Text>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Mobile scope</Text>
        <Text style={styles.copy}>
          Subscription state is visible here. Upgrade flows and payment-method changes stay web-first until the platform adds a dedicated mobile billing path.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    color: colors.foreground,
    fontSize: 18,
    fontWeight: "700",
  },
  copy: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
  },
});
