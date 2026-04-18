import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Screen } from "@/components/ui/screen";
import { useAuth } from "@/lib/auth";
import { mobileApi } from "@/lib/api";
import { colors, spacing } from "@/lib/theme";

export default function WorkoutsScreen() {
  const { token } = useAuth();
  const workoutsQuery = useQuery({
    queryKey: ["workouts"],
    queryFn: () => mobileApi.getWorkouts(token!),
    enabled: Boolean(token),
  });

  const data = workoutsQuery.data;

  return (
    <Screen
      title="Weekly training plan"
      subtitle={data?.plan?.summary ?? "Your current workout block, synced directly from the main platform."}
    >
      {data?.plan ? (
        <>
          <Card>
            <Text style={styles.planTitle}>{data.plan.title}</Text>
            <Text style={styles.copy}>{data.plan.split ?? "Structured weekly split"}</Text>
            <Text style={styles.copy}>
              {data.completedDays}/{data.totalDays} days complete · {data.weeklyCompletionPercent}% weekly completion
            </Text>
          </Card>
          <View style={styles.list}>
            {data.plan.days.map((day) => (
              <Pressable key={day.id} style={styles.dayCard} onPress={() => router.push(`/workouts/${day.id}`)}>
                <View style={styles.row}>
                  <Text style={styles.dayName}>{day.name}</Text>
                  <Text style={styles.badge}>{day.status.replace("_", " ")}</Text>
                </View>
                <Text style={styles.copy}>{day.focus ?? "Open to view today’s exercise list and session state."}</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${day.completionPercent}%` }]} />
                </View>
                <Text style={styles.copy}>{day.completedExercises}/{day.totalExercises} exercises complete</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <EmptyState
          title="No workout plan yet"
          description="Generate a plan from the existing web product or by running a coach session, then mobile execution will become available here."
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.md,
  },
  dayCard: {
    backgroundColor: "rgba(11,13,20,0.92)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  planTitle: {
    color: colors.foreground,
    fontSize: 24,
    fontFamily: "SpaceGrotesk_700Bold",
  },
  dayName: {
    color: colors.foreground,
    fontSize: 18,
    fontFamily: "SpaceGrotesk_700Bold",
    flex: 1,
  },
  badge: {
    color: colors.accent2,
    textTransform: "uppercase",
    fontSize: 12,
    fontWeight: "700",
  },
  copy: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.accent2,
    borderRadius: 999,
  },
});
