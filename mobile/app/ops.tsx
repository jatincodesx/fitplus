import { StyleSheet, Text } from "react-native";
import { Redirect } from "expo-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { useAuth } from "@/lib/auth";
import { getPostAuthPath } from "@/lib/navigation";
import { colors } from "@/lib/theme";

export default function OpsScreen() {
  const { isBootstrapping, user, signOut } = useAuth();

  if (isBootstrapping) {
    return null;
  }

  if (!user) {
    return <Redirect href="/sign-in" />;
  }

  if (user.role === "USER") {
    return <Redirect href={getPostAuthPath(user)} />;
  }

  return (
    <Screen
      title="Operations access"
      subtitle="Internal dashboards stay web-first for now. Mobile access is intentionally limited to account-at-a-glance use."
    >
      <Card>
        <Text style={styles.role}>{user.role}</Text>
        <Text style={styles.copy}>{user.email}</Text>
        <Text style={styles.copy}>
          Use the web app for admin and superadmin workflows that require dense controls, audit history, and bulk actions.
        </Text>
      </Card>
      <Button variant="secondary" onPress={() => void signOut()}>Sign out</Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  role: {
    color: colors.foreground,
    fontSize: 26,
    fontFamily: "SpaceGrotesk_700Bold",
  },
  copy: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
  },
});
