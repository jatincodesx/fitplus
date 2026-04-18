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

export default function SignUpScreen() {
  const { authError, clearAuthError, signUp } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    try {
      setLoading(true);
      setError(null);
      const session = await signUp({ name: name.trim(), email: email.trim(), password });
      router.replace(getPostAuthPath(session.user));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not sign up.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen
      title="Create your FitPlus mobile account"
      subtitle="This uses the same backend, roles, and account model as the web product."
    >
      <Card>
        <View style={styles.fields}>
          <Input value={name} onChangeText={(value) => {
            clearAuthError();
            setName(value);
          }} placeholder="Name" />
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
          <Button onPress={() => void submit()} loading={loading}>Create account</Button>
        </View>
      </Card>
      <Link href="/sign-in" style={styles.link}>
        Already have an account? Sign in
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
