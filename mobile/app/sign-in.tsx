import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Link, router } from "expo-router";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { useAuth } from "@/lib/auth";
import { getPostAuthPath } from "@/lib/navigation";
import { colors, spacing } from "@/lib/theme";

export default function SignInScreen() {
  const { authError, clearAuthError, signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    try {
      setLoading(true);
      setError(null);
      const session = await signIn({ email: email.trim(), password });
      router.replace(getPostAuthPath(session.user));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen
      title="Mobile coaching, built for execution"
      subtitle="Use the existing FitPlus account system. The web app remains the source of truth."
    >
      <Card>
        <View style={styles.fields}>
          <Input
            value={email}
            onChangeText={(value) => {
              clearAuthError();
              setEmail(value);
            }}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Email"
            keyboardType="email-address"
          />
          <Input
            value={password}
            onChangeText={(value) => {
              clearAuthError();
              setPassword(value);
            }}
            secureTextEntry
            placeholder="Password"
          />
          {error || authError ? <Text style={styles.error}>{error ?? authError}</Text> : null}
          <Button onPress={() => void submit()} loading={loading}>Sign in</Button>
        </View>
      </Card>
      <Link href="/sign-up" style={styles.link}>
        Need an account? Sign up
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  fields: {
    gap: spacing.md,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
  link: {
    color: colors.accent2,
    fontSize: 15,
    fontWeight: "700",
  },
});
