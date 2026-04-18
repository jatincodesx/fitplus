import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Screen } from "@/components/ui/screen";
import { useAuth } from "@/lib/auth";
import { mobileApi } from "@/lib/api";
import { colors, spacing } from "@/lib/theme";

export default function ProgressScreen() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [weightKg, setWeightKg] = useState("");
  const [saving, setSaving] = useState(false);

  const progressQuery = useQuery({
    queryKey: ["progress"],
    queryFn: () => mobileApi.getProgress(token!),
    enabled: Boolean(token),
  });

  async function logWeight() {
    try {
      setSaving(true);
      await mobileApi.logWeight(token!, {
        date: new Date().toISOString(),
        weightKg: Number(weightKg),
      });
      setWeightKg("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["progress"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen
      title="Progress"
      subtitle="Stay focused on trend quality, not daily noise."
    >
      <Card>
        <Text style={styles.metric}>{progressQuery.data?.adherencePercent ?? 0}%</Text>
        <Text style={styles.copy}>Adherence across your latest workout entries</Text>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Log weight</Text>
        <Input value={weightKg} onChangeText={setWeightKg} keyboardType="decimal-pad" placeholder="Weight in kg" />
        <Button onPress={() => void logWeight()} loading={saving}>Save weight</Button>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Trend</Text>
        {progressQuery.data?.weightSeries.map((entry) => (
          <View key={entry.label} style={styles.row}>
            <Text style={styles.copy}>{entry.label}</Text>
            <Text style={styles.rowValue}>{entry.value} kg</Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  metric: {
    color: colors.foreground,
    fontSize: 28,
    fontFamily: "SpaceGrotesk_700Bold",
  },
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  rowValue: {
    color: colors.foreground,
    fontSize: 14,
    fontWeight: "700",
  },
});
