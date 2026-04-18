import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { useAuth } from "@/lib/auth";
import { mobileApi } from "@/lib/api";
import { getPostAuthPath } from "@/lib/navigation";
import { colors, spacing } from "@/lib/theme";

export default function CoachScreen() {
  const { isBootstrapping, token, user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

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

  const coachQuery = useQuery({
    queryKey: ["coach-feed"],
    queryFn: () => mobileApi.getCoachFeed(token!),
    enabled: Boolean(token),
  });

  async function send() {
    if (!message.trim()) return;

    try {
      setSending(true);
      await mobileApi.sendCoachMessage(token!, message.trim());
      setMessage("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["coach-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen
      title="Coach chat"
      subtitle="Mobile chat uses the same backend context, memory, and AI route as the web product."
    >
      <Card>
        {coachQuery.data?.messages.length ? (
          coachQuery.data.messages.map((entry) => (
            <View key={entry.id} style={styles.message}>
              <Text style={styles.role}>{entry.role === "ASSISTANT" ? "Coach" : "You"}</Text>
              <Text style={styles.copy}>{entry.content}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.copy}>Your coaching conversation will appear here once you send the first message.</Text>
        )}
      </Card>

      <Card>
        <Input value={message} onChangeText={setMessage} placeholder="Ask for a swap, progression change, or nutrition adjustment" multiline />
        <Button onPress={() => void send()} loading={sending}>Send</Button>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  message: {
    gap: 4,
    paddingVertical: spacing.xs,
  },
  role: {
    color: colors.foreground,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  copy: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
  },
});
