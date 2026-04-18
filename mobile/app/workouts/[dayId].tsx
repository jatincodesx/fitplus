import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Redirect, Stack, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Screen } from "@/components/ui/screen";
import { useAuth } from "@/lib/auth";
import { mobileApi } from "@/lib/api";
import { getPostAuthPath } from "@/lib/navigation";
import { colors, spacing } from "@/lib/theme";

export default function WorkoutDayScreen() {
  const { isBootstrapping, token, user } = useAuth();
  const { dayId } = useLocalSearchParams<{ dayId: string }>();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  const workoutDayQuery = useQuery({
    queryKey: ["workout-day", dayId],
    queryFn: () => mobileApi.getWorkoutDay(token!, dayId),
    enabled: Boolean(token && dayId),
  });

  const session = workoutDayQuery.data?.latestSession ?? null;
  const allDone = session?.status === "COMPLETED";
  const isWorking = busyId !== null;

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["workouts"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["progress"] }),
      queryClient.invalidateQueries({ queryKey: ["workout-day", dayId] }),
    ]);
  }

  async function startWorkout(forceNew = false) {
    try {
      setBusyId("start");
      setError(null);
      await mobileApi.startWorkoutSession(token!, dayId, forceNew);
      await refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not start workout.");
    } finally {
      setBusyId(null);
    }
  }

  async function updateSets(sessionExerciseId: string, nextCompletedSets: number) {
    if (!session?.id) return;

    try {
      setBusyId(sessionExerciseId);
      setError(null);
      await mobileApi.updateWorkoutSet(token!, session.id, sessionExerciseId, nextCompletedSets);
      await refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not update sets.");
    } finally {
      setBusyId(null);
    }
  }

  async function completeWorkout() {
    if (!session?.id) return;

    try {
      setBusyId("complete");
      setError(null);
      await mobileApi.completeWorkout(token!, session.id);
      await refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not complete workout.");
    } finally {
      setBusyId(null);
    }
  }

  const plannedExercises = workoutDayQuery.data?.day.exercises ?? [];
  const sessionMap = useMemo(
    () => new Map(session?.exercises.map((exercise) => [exercise.name, exercise]) ?? []),
    [session]
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <Screen
        title={workoutDayQuery.data?.day.name ?? "Workout"}
        subtitle={workoutDayQuery.data?.day.focus ?? "Execute the workout in order and sync completion back to the backend."}
      >
        <Card>
          <Text style={styles.copy}>{workoutDayQuery.data?.day.rationale ?? "Your coaching rationale will appear here."}</Text>
          <Text style={styles.tip}>{workoutDayQuery.data?.day.coachTip ?? "Move cleanly, keep rest honest, and chase execution quality."}</Text>
          {!session ? (
            <Button onPress={() => void startWorkout()} loading={busyId === "start"}>Start workout</Button>
          ) : allDone ? (
            <View style={styles.actions}>
              <Button onPress={() => void startWorkout(true)} loading={busyId === "start"}>Start again</Button>
            </View>
          ) : (
            <View style={styles.actions}>
              <Button onPress={() => void completeWorkout()} loading={busyId === "complete"}>Complete workout</Button>
            </View>
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </Card>

        {plannedExercises.map((exercise) => {
          const sessionExercise = sessionMap.get(exercise.name);
          const completedSets = sessionExercise?.completedSets ?? exercise.completedSets;
          const targetSets = sessionExercise?.setsTarget ?? exercise.sets;

          return (
            <Card key={exercise.id}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <Text style={styles.copy}>
                {exercise.muscleGroup} · {exercise.reps} reps · {exercise.restSeconds ?? 60}s rest
              </Text>
              {exercise.notes ? <Text style={styles.copy}>{exercise.notes}</Text> : null}
              <Text style={styles.progress}>{completedSets}/{targetSets} sets complete</Text>
              {!allDone ? (
                <View style={styles.setActions}>
                  <Button
                    variant="secondary"
                    onPress={() => void updateSets(sessionExercise?.id ?? "", Math.max(0, completedSets - 1))}
                    disabled={!sessionExercise?.id || completedSets === 0 || isWorking}
                  >
                    -1 set
                  </Button>
                  <Button
                    onPress={() => void updateSets(sessionExercise?.id ?? "", Math.min(targetSets, completedSets + 1))}
                    disabled={!sessionExercise?.id || completedSets >= targetSets || isWorking}
                    loading={busyId === sessionExercise?.id}
                  >
                    +1 set
                  </Button>
                </View>
              ) : null}
            </Card>
          );
        })}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.sm,
  },
  copy: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
  },
  tip: {
    color: colors.accent2,
    fontSize: 14,
    lineHeight: 22,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
  exerciseName: {
    color: colors.foreground,
    fontSize: 20,
    fontFamily: "SpaceGrotesk_700Bold",
  },
  progress: {
    color: colors.foreground,
    fontSize: 15,
    fontWeight: "700",
  },
  setActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
});
