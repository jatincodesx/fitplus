import { useQuery } from "@tanstack/react-query";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MetricCard } from "@/components/ui/metric-card";
import { Screen } from "@/components/ui/screen";
import { useAuth } from "@/lib/auth";
import { mobileApi } from "@/lib/api";
import { colors, spacing } from "@/lib/theme";

export default function DashboardScreen() {
  const { token, user } = useAuth();
  const dashboardQuery = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => mobileApi.getDashboard(token!),
    enabled: Boolean(token),
  });

  const data = dashboardQuery.data;

  return (
    <Screen
      title={`Welcome back${user?.name ? `, ${user.name.split(" ")[0]}` : ""}`}
      subtitle={data?.quickInsight ?? "Your training, nutrition, and progress stay synced with the main platform."}
      action={<Pressable onPress={() => router.push("/coach")}><Text style={styles.link}>Coach</Text></Pressable>}
    >
      <View style={styles.metricGrid}>
        <MetricCard
          label="Goal"
          value={data?.currentGoal ?? "Loading"}
          subtext={data?.coachInsight ?? "Pulling your current training context"}
        />
        <MetricCard
          label="Completion"
          value={`${data?.weeklyCompletionPercent ?? 0}%`}
          subtext={`${data?.completedDays ?? 0}/${data?.totalDays ?? 0} sessions complete`}
        />
      </View>

      <Card>
        <Text style={styles.sectionTitle}>Next workout</Text>
        {data?.nextWorkout ? (
          <Pressable onPress={() => router.push(`/workouts/${data.nextWorkout!.id}`)}>
            <Text style={styles.workoutTitle}>{data.nextWorkout.name}</Text>
            <Text style={styles.copy}>{data.nextWorkout.focus ?? "Open the workout to execute your next session."}</Text>
            <Text style={styles.link}>{data.nextWorkout.status === "in_progress" ? "Resume session" : "Open workout"}</Text>
          </Pressable>
        ) : (
          <EmptyState title="No workout block yet" description="Generate a plan on web or through a coach session, then mobile execution will pick it up here." />
        )}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Nutrition target</Text>
        <Text style={styles.workoutTitle}>
          {data?.nutritionTarget
            ? `${data.nutritionTarget.calories} kcal`
            : "No active target"}
        </Text>
        <Text style={styles.copy}>
          {data?.nutritionTarget
            ? `${data.nutritionTarget.protein}p / ${data.nutritionTarget.carbs}c / ${data.nutritionTarget.fat}f`
            : "Your latest nutrition plan will surface here once generated."}
        </Text>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Recent coach messages</Text>
        {data?.recentMessages.length ? (
          data.recentMessages.map((message) => (
            <View key={message.id} style={styles.message}>
              <Text style={styles.messageRole}>{message.role === "ASSISTANT" ? "Coach" : "You"}</Text>
              <Text style={styles.copy}>{message.content}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.copy}>Coach chat history appears here once you start using the coaching thread.</Text>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  metricGrid: {
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.muted,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  workoutTitle: {
    color: colors.foreground,
    fontSize: 22,
    fontFamily: "SpaceGrotesk_700Bold",
  },
  copy: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
  },
  link: {
    color: colors.accent2,
    fontSize: 15,
    fontWeight: "700",
  },
  message: {
    gap: 4,
    paddingTop: spacing.sm,
  },
  messageRole: {
    color: colors.foreground,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
});
